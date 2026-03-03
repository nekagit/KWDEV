#!/usr/bin/env python3
"""
Run due AI bot cron jobs from jobs.db files under a base path.
Designed to be run from system cron every minute (e.g. * * * * *).
Uses only Python standard library (no croniter). Supports common cron expressions:
  * N N-M */S N,M (minute hour dom month dow)
Loads .env from base path so TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are available to handlers.
"""
from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from datetime import datetime


def parse_cron_field(field: str, min_val: int, max_val: int, special_weekday: bool = False) -> set[int]:
    """Parse one cron field (e.g. '*/5', '0', '0-30/10') into set of allowed values."""
    field = field.strip()
    if not field or field == "*":
        return set(range(min_val, max_val + 1))
    out: set[int] = set()
    for part in field.split(","):
        part = part.strip()
        if "/" in part:
            step_part, step_str = part.rsplit("/", 1)
            step = int(step_str) if step_str.isdigit() else 1
        else:
            step_part, step = part, 1
        if step_part == "*" or step_part == "":
            lo, hi = min_val, max_val
        elif "-" in step_part:
            a, b = step_part.split("-", 1)
            lo = int(a.strip()) if a.strip().isdigit() else min_val
            hi = int(b.strip()) if b.strip().isdigit() else max_val
        else:
            lo = int(step_part) if step_part.isdigit() else min_val
            hi = lo
        for v in range(lo, hi + 1):
            if (v - lo) % step == 0 and min_val <= v <= max_val:
                out.add(v)
    return out


def cron_matches_now(expr: str, dt: datetime) -> bool:
    """Return True if the 5-field cron expression matches dt (minute granularity)."""
    parts = expr.strip().split()
    if len(parts) < 5:
        return False
    min_f, hour_f, dom_f, month_f, dow_f = parts[0], parts[1], parts[2], parts[3], parts[4]
    try:
        minutes = parse_cron_field(min_f, 0, 59)
        hours = parse_cron_field(hour_f, 0, 23)
        doms = parse_cron_field(dom_f, 1, 31)
        months = parse_cron_field(month_f, 1, 12)
        dows = parse_cron_field(dow_f, 0, 7, special_weekday=True)  # 0 and 7 = Sunday
        if 7 in dows:
            dows.add(0)
        # Python weekday: Mon=0 .. Sun=6. Cron: 0=Sun, 1=Mon..7=Sun -> same as 0.
        cron_dow = (dt.weekday() + 1) % 7  # Mon->1, Tue->2, ..., Sun->0
        return (
            dt.minute in minutes
            and dt.hour in hours
            and dt.day in doms
            and dt.month in months
            and cron_dow in dows
        )
    except (ValueError, TypeError):
        return False


def is_shell_command(handler: str) -> bool:
    t = (handler or "").strip()
    if not t:
        return False
    if t.startswith("/") or ".sh" in t or t.endswith(".sh"):
        return True
    first = (t.split()[0] or "").lower()
    if "/" in first:
        return True
    known = ("curl", "node", "python", "python3", "npm", "npx", "bash", "sh", "env", "wget", "cat", "echo")
    return first in known


def run_handler(bot_path: str, handler: str, db_path: str, job_id: str, log: list[str]) -> bool:
    """Run one job handler; update last_run on success. Returns True if run succeeded."""
    bot_path = os.path.abspath(bot_path)
    env = os.environ.copy()
    load_dotenv(bot_path, into=env)  # optional per-bot .env (e.g. agents/basic/.env) overrides base
    env["PATH"] = os.path.expanduser("~/.local/bin") + ":" + "/usr/local/bin:" + env.get("PATH", "")
    if is_shell_command(handler):
        cmd = f'(cd "{bot_path}" 2>/dev/null && {handler}) || {handler}'
        run_cmd = ["/bin/bash", "-c", cmd]
    else:
        escaped = handler.replace("'", "'\"'\"'")
        # Same flags as Telegram/manual server run: --sandbox disabled --force so agent can fetch web, run tools; --output-format text for clean summary
        agent_flags = "--trust --sandbox disabled --force --output-format text"
        run_cmd = [
            "/bin/bash", "-c",
            f'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH" && (cd "{bot_path}" 2>/dev/null && (cursor {agent_flags} -p \'{escaped}\' 2>/dev/null || agent {agent_flags} -p \'{escaped}\' 2>/dev/null || cursor-agent {agent_flags} -p \'{escaped}\' 2>/dev/null))'
        ]
    try:
        r = subprocess.run(run_cmd, env=env, cwd=bot_path, capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            log.append(f"  exit {r.returncode}: {r.stderr or r.stdout or ''}")
            return False
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        try:
            cur.execute("UPDATE jobs SET last_run = ? WHERE id = ?", (now, job_id))
            if cur.rowcount == 0:
                cur.execute("UPDATE cron_jobs SET last_run = ? WHERE id = ?", (now, job_id))
        except sqlite3.OperationalError:
            cur.execute("UPDATE cron_jobs SET last_run = ? WHERE id = ?", (now, job_id))
        conn.commit()
        conn.close()
        return True
    except subprocess.TimeoutExpired:
        log.append("  timeout 300s")
        return False
    except Exception as e:
        log.append(f"  error: {e}")
        return False


def load_dotenv(base_path: str, into: dict[str, str] | None = None) -> None:
    """Load .env from base_path. If into is given, update that dict; else update os.environ."""
    env_file = os.path.join(base_path, ".env")
    if not os.path.isfile(env_file):
        return
    target = into if into is not None else os.environ
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"").replace("\\n", "\n")
                if k:
                    target[k] = v


def main() -> None:
    base = os.environ.get("AI_BOTS_BASE_PATH", "/var/www/ai")
    base = os.path.abspath(os.path.expanduser(base))
    if not os.path.isdir(base):
        print(f"Base path not found: {base}", file=sys.stderr)
        sys.exit(1)
    load_dotenv(base)
    now = datetime.utcnow()
    log: list[str] = []
    run_count = 0
    for root, _dirs, files in os.walk(base, topdown=True):
        if "jobs.db" not in files:
            continue
        db_path = os.path.join(root, "jobs.db")
        cron_dir = os.path.dirname(db_path)
        bot_path = os.path.dirname(cron_dir)
        if cron_dir != os.path.join(bot_path, "cron"):
            continue
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            try:
                cur.execute("SELECT id, name, expression, command, prompt, enabled FROM jobs ORDER BY id")
                rows = cur.fetchall()
                table = "jobs"
            except sqlite3.OperationalError:
                cur.execute(
                    "SELECT id, name, expression, command, prompt, enabled FROM cron_jobs ORDER BY created_at"
                )
                rows = cur.fetchall()
                table = "cron_jobs"
            for r in rows:
                if not r["enabled"]:
                    continue
                expr = (r["expression"] or "").strip()
                if not expr:
                    continue
                if not cron_matches_now(expr, now):
                    continue
                handler = (r["command"] or r["prompt"] or "").strip()
                if not handler:
                    continue
                name = (r["name"] or expr or "job")[:40]
                job_id = r["id"]
                log.append(f"{bot_path}: {name} (id={job_id})")
                if run_handler(bot_path, handler, db_path, str(job_id), log):
                    run_count += 1
                    log.append("  ok")
            conn.close()
        except Exception as e:
            log.append(f"{db_path}: {e}")
    if log:
        print("\n".join(log), file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()

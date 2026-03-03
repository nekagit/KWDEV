import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Stats depend on request (sessionId) and SSH; must be dynamic. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
        }

        const STATS_SCRIPT = `
export LC_ALL=C
cat << 'EOF' > /tmp/kw_stats.py
import os, sys, json, subprocess, re

def get_cmd(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode('utf-8').strip()
    except Exception:
        return ""

out = {}

# System
out['system'] = {
    'os': get_cmd("grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\\\"'") or get_cmd("uname -s"),
    'hostname': get_cmd("hostname"),
    'kernel': get_cmd("uname -r"),
    'uptime': get_cmd("awk '{print $1}' /proc/uptime")
}

# CPU
try:
    with open('/proc/loadavg', 'r') as f:
        load = f.read().split()[:3]
    out['cpu'] = {
        'cores': int(get_cmd("nproc") or 1),
        'load': [float(x) for x in load],
        'usage': float(get_cmd("top -bn1 | grep 'Cpu(s)' | sed -n 's/.*, *\\\\([0-9.]*\\\\)%* id.*/\\\\1/p' | awk '{print 100 - $1}'") or 0)
    }
except:
    out['cpu'] = {'cores': 1, 'load': [0,0,0], 'usage': 0}

# Memory
try:
    free_out = get_cmd("free -m")
    mem_used = 0
    mem_total = 0
    swap_used = 0
    swap_total = 0
    for line in free_out.split('\\n'):
        if line.startswith('Mem:'):
            parts = line.split()
            mem_total = int(parts[1])
            mem_used = int(parts[2])
        elif line.startswith('Swap:'):
            parts = line.split()
            swap_total = int(parts[1])
            swap_used = int(parts[2])
    out['memory'] = {'total': mem_total, 'used': mem_used, 'swapTotal': swap_total, 'swapUsed': swap_used}
except:
    out['memory'] = {'total': 0, 'used': 0, 'swapTotal': 0, 'swapUsed': 0}

# Disk
out['disk'] = []
try:
    df_out = get_cmd("df -hm | awk 'NR>1 && !/tmpfs|devtmpfs|udev|loop/ {print $2, $3, $4, $5, $6}'")
    for line in df_out.split('\\n'):
        if not line: continue
        parts = line.split()
        if len(parts) >= 5:
            out['disk'].append({
                'total': int(parts[0]),
                'used': int(parts[1]),
                'free': int(parts[2]),
                'percent': parts[3],
                'mount': parts[4]
            })
except:
    pass

# Users
out['users'] = []
try:
    who_out = get_cmd("who | awk '{print $1, $2, $3, $4, $5}'")
    for line in who_out.split('\\n'):
        if not line: continue
        parts = line.split()
        if len(parts) >= 5:
            ip = parts[4].replace("(", "").replace(")", "")
            out['users'].append({
                'user': parts[0],
                'tty': parts[1],
                'date': parts[2] + " " + parts[3],
                'ip': ip
            })
except:
    pass

# Processes
out['processes'] = []
try:
    ps_out = get_cmd("ps aux --sort=-%cpu | awk 'NR>1 && NR<=11 {print $1, $2, $3, $4, $11}'")
    for line in ps_out.split('\\n'):
        if not line: continue
        parts = line.split()
        if len(parts) >= 5:
            out['processes'].append({
                'user': parts[0],
                'pid': int(parts[1]),
                'cpu': parts[2],
                'mem': parts[3],
                'command': parts[4]
            })
except:
    pass

print(json.dumps(out))
EOF
python3 /tmp/kw_stats.py
`;

        const res = await executeCommand(sessionId, STATS_SCRIPT);
        const jsonStr = res.stdout.trim();

        return NextResponse.json(JSON.parse(jsonStr));
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch stats" }, { status: 500 });
    }
}

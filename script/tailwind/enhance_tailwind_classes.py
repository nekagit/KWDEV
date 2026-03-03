#!/usr/bin/env python3
"""
Apply enhance_tw() to all Tailwind class strings in tailwind-classes.json.
Reads from src/components/shared/tailwind-classes.json and writes back.
"""

import json
import os


def enhance_tw(s):
    """Enhance Tailwind classes"""
    if not s or not str(s).strip():
        return s

    c = str(s).strip().split()
    r, i = [], 0

    while i < len(c):
        cls = c[i]
        nxt = c[i + 1] if i + 1 < len(c) else None

        # Borders
        if cls == "border-border":
            r.extend(["border-gray-200/60", "dark:border-gray-700/60"])
            i += 1
        elif cls == "border" and nxt == "border-border":
            r.extend(["border", "border-gray-200/60", "dark:border-gray-700/60"])
            i += 2
        elif cls == "border-input":
            r.extend(["border-gray-300", "dark:border-gray-600"])
            i += 1

        # Backgrounds
        elif cls == "bg-card":
            r.extend(
                [
                    "bg-gradient-to-br",
                    "from-white",
                    "to-gray-50/30",
                    "dark:from-gray-900",
                    "dark:to-gray-800/50",
                    "backdrop-blur-sm",
                ]
            )
            i += 1
        elif cls == "bg-muted/30":
            r.extend(
                [
                    "bg-gradient-to-br",
                    "from-gray-50",
                    "to-white",
                    "dark:from-gray-800/50",
                    "dark:to-gray-900/50",
                ]
            )
            i += 1
        elif cls == "bg-muted/50":
            r.extend(["bg-gray-50/50", "dark:bg-gray-800/30"])
            i += 1
        elif cls == "bg-muted/20":
            r.extend(["bg-gray-50/50", "dark:bg-gray-800/30"])
            i += 1
        elif cls == "bg-muted/40":
            r.extend(["bg-gray-100/40", "dark:bg-gray-800/40"])
            i += 1
        elif cls == "bg-muted":
            r.extend(["bg-gray-100", "dark:bg-gray-800"])
            i += 1
        elif cls == "bg-background":
            r.extend(["bg-white", "dark:bg-gray-900"])
            i += 1
        elif cls == "bg-background/95":
            r.extend(["bg-white/95", "dark:bg-gray-900/95"])
            i += 1
        elif cls == "bg-background/60":
            r.extend(["bg-white/60", "dark:bg-gray-900/60"])
            i += 1
        elif cls == "bg-background/50":
            r.extend(["bg-white/50", "dark:bg-gray-900/50"])
            i += 1
        elif cls == "bg-sidebar":
            r.extend(
                [
                    "bg-gradient-to-b",
                    "from-gray-50",
                    "to-white",
                    "dark:from-gray-900",
                    "dark:to-gray-800/90",
                ]
            )
            i += 1
        elif cls == "bg-primary":
            r.extend(
                [
                    "bg-gradient-to-r",
                    "from-indigo-600",
                    "to-indigo-700",
                    "dark:from-indigo-500",
                    "dark:to-indigo-600",
                ]
            )
            i += 1
        elif cls.startswith("bg-primary/"):
            op = cls.split("/")[-1]
            r.extend([f"bg-indigo-600/{op}", f"dark:bg-indigo-500/{op}"])
            i += 1
        elif cls == "bg-popover":
            r.extend(["bg-white", "dark:bg-gray-900"])
            i += 1
        elif cls == "bg-accent":
            r.extend(["bg-gray-100", "dark:bg-gray-800"])
            i += 1

        # Text colors
        elif cls == "text-muted-foreground":
            r.extend(["text-gray-600", "dark:text-gray-400"])
            i += 1
        elif cls == "text-foreground":
            r.extend(["text-gray-900", "dark:text-white"])
            i += 1
        elif cls == "text-card-foreground":
            r.extend(["text-gray-900", "dark:text-white"])
            i += 1
        elif cls == "text-primary-foreground":
            r.append("text-white")
            i += 1
        elif cls.startswith("text-primary"):
            if "/" in cls:
                op = cls.split("/")[-1]
                r.extend([f"text-indigo-600/{op}", f"dark:text-indigo-400/{op}"])
            else:
                r.extend(["text-indigo-600", "dark:text-indigo-400"])
            i += 1
        elif cls.startswith("text-destructive"):
            if "/" in cls:
                op = cls.split("/")[-1]
                r.extend([f"text-red-600/{op}", f"dark:text-red-400/{op}"])
            else:
                r.extend(["text-red-600", "dark:text-red-400"])
            i += 1
        elif cls.startswith("text-success"):
            if "/" in cls:
                op = cls.split("/")[-1]
                r.extend([f"text-emerald-600/{op}", f"dark:text-emerald-400/{op}"])
            else:
                r.extend(["text-emerald-600", "dark:text-emerald-400"])
            i += 1
        elif cls.startswith("text-warning"):
            if "/" in cls:
                op = cls.split("/")[-1]
                r.extend([f"text-amber-600/{op}", f"dark:text-amber-400/{op}"])
            else:
                r.extend(["text-amber-600", "dark:text-amber-400"])
            i += 1
        elif cls.startswith("text-info"):
            if "/" in cls:
                op = cls.split("/")[-1]
                r.extend([f"text-blue-600/{op}", f"dark:text-blue-400/{op}"])
            else:
                r.extend(["text-blue-600", "dark:text-blue-400"])
            i += 1
        elif cls == "text-popover-foreground":
            r.extend(["text-gray-900", "dark:text-white"])
            i += 1
        elif cls == "text-accent-foreground":
            r.extend(["text-gray-900", "dark:text-white"])
            i += 1

        # Rounded
        elif cls == "rounded-md":
            r.append("rounded-xl")
            i += 1
        elif cls == "rounded-lg" and (not nxt or not nxt.startswith("rounded")):
            r.append("rounded-xl")
            i += 1

        # Shadows
        elif cls == "shadow-sm":
            r.extend(["shadow-md", "hover:shadow-lg"])
            i += 1
        elif cls == "shadow-md":
            r.extend(["shadow-lg", "shadow-gray-200/50", "dark:shadow-none"])
            i += 1
        elif cls == "shadow-lg":
            r.extend(["shadow-xl", "shadow-gray-200/50", "dark:shadow-none"])
            i += 1
        elif cls == "shadow" and (not nxt or not nxt.startswith("shadow")):
            r.extend(["shadow-lg", "shadow-gray-200/50", "dark:shadow-none"])
            i += 1

        # Hover
        elif cls == "hover:bg-muted/50":
            r.extend(["hover:bg-gray-50/50", "dark:hover:bg-gray-800/30"])
            i += 1
        elif cls == "hover:bg-muted":
            r.extend(["hover:bg-gray-100", "dark:hover:bg-gray-800"])
            i += 1
        elif cls == "hover:text-foreground":
            r.extend(["hover:text-gray-900", "dark:hover:text-white"])
            i += 1
        elif cls == "hover:text-destructive":
            r.extend(["hover:text-red-700", "dark:hover:text-red-300"])
            i += 1
        elif cls.startswith("hover:bg-primary/"):
            op = cls.split("/")[-1]
            r.extend([f"hover:bg-indigo-700/{op}", f"dark:hover:bg-indigo-600/{op}"])
            i += 1
        elif cls == "hover:shadow-sm":
            r.extend(["hover:shadow-md"])
            i += 1
        elif cls == "hover:shadow-md":
            r.extend(["hover:shadow-lg"])
            i += 1

        # Focus / ring
        elif "focus:ring-ring" in cls or cls == "focus:ring-ring":
            r.extend(["focus:ring-indigo-500/50", "dark:focus:ring-indigo-400/50"])
            i += 1
        elif cls == "focus:ring-primary":
            r.extend(["focus:ring-indigo-500", "dark:focus:ring-indigo-400"])
            i += 1
        elif cls == "ring-primary":
            r.extend(["ring-indigo-500", "dark:ring-indigo-400"])
            i += 1
        elif cls.startswith("ring-primary/"):
            op = cls.split("/")[-1]
            r.extend([f"ring-indigo-500/{op}", f"dark:ring-indigo-400/{op}"])
            i += 1
        elif cls == "focus:ring-2":
            r.append(cls)
            i += 1
        elif cls == "focus:bg-accent" or cls == "focus:text-accent-foreground":
            r.extend(["focus:bg-gray-100", "dark:focus:bg-gray-800"])
            i += 1
        elif cls == "bg-border":
            r.extend(["bg-gray-200/60", "dark:bg-gray-700/60"])
            i += 1

        else:
            r.append(cls)
            i += 1

    # Deduplicate preserving order
    seen, final = set(), []
    for x in r:
        if x not in seen:
            seen.add(x)
            final.append(x)

    # Add transition
    has_hover = any("hover:" in x for x in final)
    has_trans = any("transition" in x for x in final)
    if has_hover and not has_trans and "duration-" not in " ".join(final):
        final.extend(["transition-all", "duration-200"])

    return " ".join(final)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "src", "components", "shared", "tailwind-classes.json")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Enhance common: keys are class strings
    if "common" in data:
        data["common"] = {
            enhance_tw(k): v for k, v in data["common"].items()
        }

    # Enhance byFile: each value is list of class strings
    if "byFile" in data:
        data["byFile"] = {
            filepath: [enhance_tw(s) for s in classes]
            for filepath, classes in data["byFile"].items()
        }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Enhanced tailwind-classes.json (common keys and byFile arrays).")


if __name__ == "__main__":
    main()

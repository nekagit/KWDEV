/**
 * Shared nav items for sidebar and project-details top accordion.
 * Single source of truth for app navigation links.
 */
import { Github, Folders, Building2, Settings, Keyboard, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  section?: "work" | "system";
};

const items: SidebarNavItem[] = [
  { href: "/github", label: "GitHub", icon: Github, iconColor: "text-slate-300" },
  { href: "/projects", label: "Projects", icon: Folders, iconColor: "text-sky-400", section: "work" },
  { href: "/company", label: "Company", icon: Building2, iconColor: "text-violet-400", section: "work" },
  { href: "/configuration", label: "Configuration", icon: Settings, iconColor: "text-amber-400", section: "system" },
  { href: "/shortcuts", label: "Shortcuts", icon: Keyboard, iconColor: "text-emerald-400", section: "system" },
  { href: "/loading-screen", label: "Loading", icon: Moon, iconColor: "text-cyan-400", section: "system" },
];

export function getSidebarNavItemsFlat(): SidebarNavItem[] {
  return [...items];
}

/** Structured for SidebarNavigation (github + work + system). */
export function getSidebarNavItemsStructured(): {
  githubNavItem: SidebarNavItem;
  workNavItems: SidebarNavItem[];
  bottomNavItems: SidebarNavItem[];
} {
  const [githubNavItem, ...rest] = items;
  const workNavItems = rest.filter((i) => i.section === "work");
  const bottomNavItems = rest.filter((i) => i.section === "system");
  return {
    githubNavItem: githubNavItem!,
    workNavItems,
    bottomNavItems,
  };
}

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
  section?: "work" | "system";
};

const items: SidebarNavItem[] = [
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/projects", label: "Projects", icon: Folders, section: "work" },
  { href: "/company", label: "Company", icon: Building2, section: "work" },
  { href: "/configuration", label: "Configuration", icon: Settings, section: "system" },
  { href: "/shortcuts", label: "Shortcuts", icon: Keyboard, section: "system" },
  { href: "/loading-screen", label: "Loading", icon: Moon, section: "system" },
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

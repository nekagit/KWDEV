/** Sidebar Navigation component. */
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Folders, Settings, Moon, Keyboard, ScanSearch, Plug2, Github, Building2 } from "lucide-react";
import { NavLinkItem } from "@/components/molecules/Navigation/NavLinkItem";
import { getOrganismClasses } from "./organism-classes";

const c = getOrganismClasses("SidebarNavigation.tsx");

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; tab?: string; iconClassName?: string };

const getNavItems = (): {
  dashboardNavItem: NavItem;
  githubNavItem: NavItem;
  toolsNavItems: NavItem[];
  workNavItems: NavItem[];
  bottomNavItems: NavItem[];
} => ({
  dashboardNavItem: {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    tab: "dashboard",
    iconClassName: c["14"],
  },
  githubNavItem: {
    href: "/github",
    label: "GitHub",
    icon: Github,
    iconClassName: c["14"],
  },
  toolsNavItems: [
    { href: "/app-analyzer", label: "Analyzer", icon: ScanSearch, iconClassName: c["14"] },
    { href: "/integrations", label: "Integrations", icon: Plug2, iconClassName: c["14"] },
  ],
  workNavItems: [
    { href: "/projects", label: "Projects", icon: Folders, iconClassName: c["14"] },
    { href: "/company", label: "Company", icon: Building2, iconClassName: c["14"] },
  ],
  bottomNavItems: [
    { href: "/configuration", label: "Configuration", icon: Settings, iconClassName: c["14"] },
    { href: "/shortcuts", label: "Shortcuts", icon: Keyboard, iconClassName: c["14"] },
    { href: "/loading-screen", label: "Loading", icon: Moon, iconClassName: c["19"] },
  ],
});

function SidebarNavigationContent({
  pathname,
  sidebarCollapsed,
}: {
  pathname: string;
  sidebarCollapsed: boolean;
}) {
  const { dashboardNavItem, githubNavItem, toolsNavItems, workNavItems, bottomNavItems } = getNavItems();

  const renderItem = (item: NavItem) => {
    const { href, label, icon, iconClassName } = item;
    // Dashboard (/) is active by pathname only; no tab param.
    const isActive =
      pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <NavLinkItem
        key={href}
        href={href}
        label={label}
        icon={icon}
        isActive={isActive}
        sidebarCollapsed={sidebarCollapsed}
        iconClassName={iconClassName}
      />
    );
  };

  return (
    <>
      {/* Dashboard and GitHub — top items */}
      <div className="px-2 pt-3 pb-1 flex flex-col gap-0.5">
        {renderItem(dashboardNavItem)}
        {renderItem(githubNavItem)}
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-1 px-2">
        {/* Tools section */}
        <div className="flex flex-col gap-0.5 pt-3">
          {!sidebarCollapsed && (
            <p className="sidebar-section-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
              Tools
            </p>
          )}
          {toolsNavItems.map(renderItem)}
        </div>

        {/* Work section */}
        <div className="flex flex-col gap-0.5 pt-3">
          {!sidebarCollapsed && (
            <p className="sidebar-section-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
              Work
            </p>
          )}
          {workNavItems.map(renderItem)}
        </div>

        {/* System section — pushed to bottom */}
        <div className="flex flex-col gap-0.5 pt-3 mt-auto">
          {!sidebarCollapsed && (
            <p className="sidebar-section-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
              System
            </p>
          )}
          {bottomNavItems.map(renderItem)}
        </div>
      </div>
    </>
  );
}

export function SidebarNavigation({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col flex-1 min-w-0 w-full">
      <SidebarNavigationContent pathname={pathname ?? ""} sidebarCollapsed={sidebarCollapsed} />
    </nav>
  );
}

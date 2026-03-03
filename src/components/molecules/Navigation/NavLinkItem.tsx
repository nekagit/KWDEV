/** Nav Link Item component. */
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("Navigation/NavLinkItem.tsx");

type NavLinkItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  sidebarCollapsed: boolean;
  /** Optional class for icon when not active (e.g. text-info/90 for scheme color). */
  iconClassName?: string;
};

export function NavLinkItem({
  href,
  label,
  icon: Icon,
  isActive,
  sidebarCollapsed,
  iconClassName,
}: NavLinkItemProps) {
  const linkEl = (
    <Link
      href={href}
      className={cn(
        "sidebar-nav-item flex items-center gap-2.5 rounded-lg w-full text-[13px] font-medium",
        sidebarCollapsed ? "justify-center px-0 py-2" : "px-3 py-2",
        isActive
          ? "sidebar-nav-active bg-primary/15 text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className={cn("size-[18px] shrink-0 transition-colors duration-150", isActive ? "text-primary" : iconClassName)} />
      {!sidebarCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <span key={href}>
      {sidebarCollapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        linkEl
      )}
    </span>
  );
}

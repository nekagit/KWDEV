/** Sidebar Toggle component. */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarToggleProps = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export function SidebarToggle({
  sidebarCollapsed,
  setSidebarCollapsed,
}: SidebarToggleProps) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "sidebar-nav-item flex items-center gap-2.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200",
            sidebarCollapsed ? "size-9 justify-center p-0 mx-auto" : "w-full justify-start px-3 py-2"
          )}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-[18px] shrink-0 transition-transform active:scale-95" />
          ) : (
            <>
              <PanelLeftClose className="size-[18px] shrink-0" />
              <span className="truncate">Collapse sidebar</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      {sidebarCollapsed && (
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      )}
    </Tooltip>
  );
}

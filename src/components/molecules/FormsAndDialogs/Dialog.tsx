/** Dialog component. */
import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import sharedClasses from "../../shared/shared-classes";

interface DialogProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  isOpen: boolean;
  /** Optional: extra classes for the panel (e.g. max-h-[90vh] h-[90vh] for full-height dialogs). */
  panelClassName?: string;
  /** Optional: extra classes for the body (e.g. flex-1 min-h-0 overflow-hidden when panel is flex). */
  bodyClassName?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  title,
  children,
  onClose,
  actions,
  isOpen,
  panelClassName,
  bodyClassName,
}) => {
  if (!isOpen) return null;

  const content = (
    <div data-shared-ui className={sharedClasses.Dialog.overlay}>
      <div className={cn(sharedClasses.Dialog.panel, panelClassName)}>
        <div className={sharedClasses.Dialog.header}>
          <h4 className={sharedClasses.Dialog.title}>{title}</h4>
          <button onClick={onClose} className={sharedClasses.Dialog.closeButton}>
            &times;
          </button>
        </div>
        <div className={cn(sharedClasses.Dialog.body, bodyClassName)}>
          {children}
        </div>
        {actions && (
          <div className={sharedClasses.Dialog.actions}>
            <div className={sharedClasses.Dialog.actionsInner}>{actions}</div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

/** Button Component component. */
import React from 'react';
import { Button, ButtonProps } from "@/components/ui/button";
import { LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import sharedClasses from '../../shared/shared-classes';

interface ButtonComponentProps {
  onClick: (event: React.MouseEvent) => void;
  icon?: LucideIcon;
  text: string;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | "purple" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  disabled?: boolean;
  title?: string;
  iconPlacement?: "left" | "right";
  className?: string;
  iconClassName?: string;
}

export const ButtonComponent: React.FC<ButtonComponentProps> = ({
  onClick,
  icon: Icon,
  text,
  variant = "default",
  size = "default",
  disabled = false,
  title,
  iconPlacement = "left",
  className,
  iconClassName,
}) => {
  const resolvedVariant: ButtonProps["variant"] = variant === "purple" ? "default" : variant;
  const purpleClass = variant === "purple" ? sharedClasses.ButtonComponent.purple : "";

  return (
    <Button
      variant={resolvedVariant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(className, purpleClass)}
    >
      {iconPlacement === "left" && Icon && <Icon className={cn(sharedClasses.ButtonComponent.iconLeft, iconClassName)} />}
      {text}
      {iconPlacement === "right" && Icon && <Icon className={cn(sharedClasses.ButtonComponent.iconRight, iconClassName)} />}
    </Button>
  );
};

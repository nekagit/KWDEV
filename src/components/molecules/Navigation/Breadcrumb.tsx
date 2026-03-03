"use client";

/** Breadcrumb component. */
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Optional class for the nav element */
  className?: string;
}

/**
 * Accessible breadcrumb navigation (WCAG 2.1).
 * Renders a nav landmark with a list of items; items with href are links, the last item is current page (no link).
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground list-none p-0 m-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={index}
              className="flex items-center gap-1.5"
              aria-current={isLast ? "page" : undefined}
            >
              {index > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                  aria-hidden
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate max-w-[280px] font-medium text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

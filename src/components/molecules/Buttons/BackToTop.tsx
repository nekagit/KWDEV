"use client";

/** Back To Top component. */
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD = 300;

/**
 * Floating "Back to top" button. Shown when the user has scrolled down in the
 * main content area (#main-content). Click scrolls to top instantly (no smooth
 * scroll; respects reduced-motion). Positioned bottom-right above the run dock.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;

    const check = () => setVisible(main.scrollTop > SCROLL_THRESHOLD);
    check();
    main.addEventListener("scroll", check, { passive: true });
    return () => main.removeEventListener("scroll", check);
  }, []);

  const scrollToTop = () => {
    const main = document.getElementById("main-content");
    if (main) main.scrollTop = 0;
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 right-24 z-40"
      aria-hidden={!visible}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={scrollToTop}
        aria-label="Back to top"
        className="size-10 rounded-full shadow-md"
      >
        <ChevronUp className="size-5" />
      </Button>
    </div>
  );
}

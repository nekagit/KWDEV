"use client";

const MAIN_CONTENT_ID = "main-content";

/**
 * Skip-to-main-content link for accessibility (WCAG 2.1, ADR 0129, ADR 0224).
 * Visually hidden until focused. On activate (click or Enter/Space), focuses the main
 * content element so keyboard and screen-reader users' focus moves there.
 */
export function SkipToMainContent() {
  const handleActivate = (e: React.MouseEvent<HTMLAnchorElement> | React.KeyboardEvent<HTMLAnchorElement>) => {
    // Link fires click on Enter; Space triggers click after keydown — prevent default so we control focus.
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const main = document.getElementById(MAIN_CONTENT_ID);
    main?.focus();
    window.location.hash = "#main-content";
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="skip-to-main-content"
      onClick={handleActivate}
      onKeyDown={handleActivate}
    >
      Skip to main content
    </a>
  );
}

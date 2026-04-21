"use client";

/** page component. */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Shortcuts redirect page: /shortcuts
 *
 * Redirects to Configuration with ?openShortcuts=1 so the page opens the
 * keyboard shortcuts modal in the right section.
 */
export default function ShortcutsRedirectPage() {
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    router.replace("/configuration?openShortcuts=1");
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
      Redirecting to Shortcuts…
    </div>
  );
}

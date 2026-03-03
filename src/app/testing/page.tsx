"use client";

/** page component. */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRunState } from "@/store/run-store";
import { listProjects } from "@/lib/api-projects";
import { toast } from "sonner";

/**
 * Testing redirect page: /testing
 *
 * Visiting /testing redirects to the first active project's Worker tab, or to
 * /projects with a toast when no project is selected. Aligns with CommandPalette
 * "Go to Testing" (⌘⇧Y) and Dashboard Testing button behaviour. Mirrors /run redirect.
 */
export default function TestingRedirectPage() {
  const router = useRouter();
  const { activeProjects } = useRunState();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (didRedirect.current) return;
    didRedirect.current = true;

    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.replace("/projects");
      return;
    }

    listProjects()
      .then((projects) => {
        const proj = projects?.find((p) => p.repoPath === active[0]);
        if (!proj) {
          toast.info("Open a project first");
          router.replace("/projects");
          return;
        }
        router.replace(`/projects/${proj.id}?tab=worker`);
      })
      .catch(() => {
        toast.error("Could not load projects");
        router.replace("/projects");
      });
  }, [activeProjects, router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
      Redirecting to Testing…
    </div>
  );
}

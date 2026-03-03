"use client";

/** New Project Form component. */
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createProject } from "@/lib/api-projects";
import { debugIngest } from "@/lib/debug-ingest";
import { showOpenDirectoryDialog, isTauri } from "@/lib/tauri";
import { Card } from "@/components/molecules/CardsAndDisplay/Card";
import { Form } from "@/components/molecules/Form/Form";
import { ProjectInput } from "@/components/molecules/Inputs/ProjectInput";
import { ProjectTextarea } from "@/components/molecules/Inputs/ProjectTextarea";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("FormsAndDialogs/NewProjectForm.tsx");

export function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const repoPathFromQuery = searchParams?.get("repoPath") ?? null;
    if (repoPathFromQuery != null) {
      setRepoPath(decodeURIComponent(repoPathFromQuery));
      if (!name) {
        const segment = repoPathFromQuery.split("/").filter(Boolean).pop() ?? "";
        if (segment) setName(decodeURIComponent(segment));
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        repoPath: repoPath.trim() || undefined,
        promptIds: [],
        ticketIds: [],

        ideaIds: [],
      });
      router.push(`/projects/${project.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // #region agent log
      debugIngest({
        location: "NewProjectForm.tsx:handleSubmit",
        message: "createProject error",
        data: { error: msg },
        timestamp: Date.now(),
        hypothesisId: "A",
      });
      // #endregion
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseRepoPath = async () => {
    if (!isTauri) {
      toast.info(
        "Browse is only available in the desktop app. Type or paste the repo path in the field above."
      );
      return;
    }
    try {
      const selectedPath = await showOpenDirectoryDialog();
      if (selectedPath) {
        setRepoPath(selectedPath);
      } else {
        toast.info("No folder selected.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Could not open folder dialog: ${msg}`);
    }
  };

  return (
    <Card
      title="Project"
      subtitle="Name and optional description and repo path."
    >
      <Form onSubmit={handleSubmit} className="space-y-8">
        <ProjectInput
          id="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My SaaS app"
          required
        />
        <ProjectTextarea
          id="description"
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Short description of the project"
        />
        <ProjectInput
          id="repoPath"
          label="Repo path (optional)"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          placeholder="/path/to/repo"
          className={classes[0]}
          onBrowse={handleBrowseRepoPath}
        />
        {error && (
          <ErrorDisplay message={error} />
        )}
        <ButtonGroup alignment="left">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className={classes[1]} />
                Creating…
              </>
            ) : (
              "Create project"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
        </ButtonGroup>
      </Form>
    </Card>
  );
}

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/** For static export (Tauri build): at least one path so the segment is included. */
export function generateStaticParams() {
  return [{ id: "new" }];
}

const ProjectDetailsPageContent = dynamic(
  () =>
    import("@/components/organisms/ProjectDetailsPageContent").then((m) => m.ProjectDetailsPageContent),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function ProjectDetailsPage() {
  return <ProjectDetailsPageContent />;
}

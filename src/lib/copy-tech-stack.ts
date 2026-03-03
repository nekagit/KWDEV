/**
 * Copies tech stack (from first project or given path) as text or JSON to the clipboard.
 */
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Shape of tech-stack.json: name?, description?, frontend?, backend?, tooling?
 */
export type TechStackCopy = {
  name?: string;
  description?: string;
  frontend?: Record<string, string>;
  backend?: Record<string, string>;
  tooling?: Record<string, string>;
};

/**
 * Copy the current tech stack as pretty-printed JSON to the clipboard.
 * If data is null/undefined, shows a toast and does nothing.
 */
export async function copyTechStackToClipboard(
  data: TechStackCopy | null | undefined
): Promise<boolean> {
  if (data == null) {
    toast.info("No tech stack to copy");
    return false;
  }

  const json = JSON.stringify(data, null, 2);
  return copyTextToClipboard(json);
}

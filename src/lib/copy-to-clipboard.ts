/**
 * Clipboard copy with navigator.clipboard or execCommand fallback. Shows toast unless silent.
 */
import { toast } from "sonner";

/**
 * Fallback copy using a temporary textarea and document.execCommand('copy').
 * Used when navigator.clipboard is unavailable (e.g. non-HTTPS, some iframes).
 * Returns true if execCommand('copy') succeeded, false otherwise.
 */
function copyViaExecCommand(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

export interface CopyTextToClipboardOptions {
  /** When true, do not show success or error toasts. Caller can show custom feedback. */
  silent?: boolean;
}

/**
 * Copy text to the clipboard and show a success or error toast (unless options.silent).
 * Uses navigator.clipboard when available; falls back to execCommand('copy') otherwise.
 * Returns true if the copy succeeded, false otherwise.
 */
export async function copyTextToClipboard(
  text: string,
  options?: CopyTextToClipboardOptions
): Promise<boolean> {
  const silent = options?.silent === true;

  if (!text.trim()) {
    if (!silent) toast.error("Nothing to copy");
    return false;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      if (!silent) toast.success("Copied to clipboard");
      return true;
    }
  } catch {
    // Clipboard API rejected (e.g. permission); use fallback
  }
  // Fallback when clipboard is undefined or writeText threw
  const fallbackOk = copyViaExecCommand(text);
  if (fallbackOk) {
    if (!silent) toast.success("Copied to clipboard");
    return true;
  }
  if (!silent) toast.error("Failed to copy");
  return false;
}

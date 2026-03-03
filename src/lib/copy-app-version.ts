/**
 * Copies the app version string to the clipboard. Used by command palette and bug-report flows.
 */
import { getAppVersion } from "@/lib/app-version";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Copies the app version string (e.g. "v0.1.0") to the clipboard.
 * For bug reports and support; caller should show toast and close palette if needed.
 * @returns true if copy succeeded, false otherwise
 */
export async function copyAppVersionToClipboard(): Promise<boolean> {
  const version = await getAppVersion().catch(() => "—");
  const text = version === "—" ? "—" : `v${version}`;
  return copyTextToClipboard(text);
}

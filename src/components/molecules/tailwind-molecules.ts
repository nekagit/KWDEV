/**
 * Single source of truth for Tailwind classes in molecules.
 * No inline Tailwind in molecule components — use getClasses() and the returned array.
 */
import data from "./tailwind-molecules.json";

type ByFile = Record<string, string[]>;

const byFile: ByFile = (data as { byFile?: ByFile }).byFile ?? {};

/**
 * Returns the class strings for a molecule file. Use the same path as in tailwind-molecules.json
 * (relative to molecules folder), e.g. "FormsAndDialogs/NewProjectForm.tsx".
 */
export function getClasses(relativePath: string): string[] {
  return byFile[relativePath] ?? [];
}

export { byFile };

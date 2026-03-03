/**
 * Single source of truth for Tailwind classes in organism components.
 * Import this and use classes by index (order of appearance in the component).
 */
import tailwindOrganisms from "./tailwind-organisms.json";

export type OrganismClasses = Record<string, string>;

export function getOrganismClasses(filename: string): OrganismClasses {
  const data = tailwindOrganisms as Record<string, OrganismClasses>;
  return data[filename] ?? {};
}

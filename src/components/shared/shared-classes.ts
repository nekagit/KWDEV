/**
 * Central Tailwind class names. Everything lives in shared-classes.json:
 * - Top-level keys (Accordion, Card, etc.) are used by shared components.
 * - _catalog = classes extracted from the rest of the codebase (path -> slot index -> class string).
 * - _common = repeated patterns with usageCount. Edit the JSON to improve styles centrally.
 */
import allClasses from "./shared-classes.json";

type AllClasses = typeof allClasses;
const { _meta, _catalog, _common, ...sharedClasses } = allClasses as AllClasses & {
  _meta?: unknown;
  _catalog?: Record<string, Record<string, string>>;
  _common?: Record<string, { usageCount: number }>;
};

export default sharedClasses as Omit<AllClasses, "_meta" | "_catalog" | "_common">;

/** Full catalog of Tailwind classes by file path and slot index. */
export type TailwindClassesCatalog = Record<string, Record<string, string>>;

export const tailwindClassesCatalog: TailwindClassesCatalog =
  (_catalog as TailwindClassesCatalog) ?? {};

/** Repeated class strings across the codebase (class string -> usageCount). */
export type TailwindClassesCommon = Record<string, { usageCount: number }>;

export const tailwindClassesCommon: TailwindClassesCommon =
  (_common as TailwindClassesCommon) ?? {};

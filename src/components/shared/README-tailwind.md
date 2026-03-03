# Central Tailwind classes (shared folder)

All Tailwind class strings are in **shared-classes.json** so you can improve styles in one place.

## Files

| File | Purpose |
|------|--------|
| **shared-classes.json** | **Single central file**: top-level keys (Accordion, Card, Dialog, etc.) are used by shared components; `_catalog` is path → slot index → class string for the rest of the codebase; `_common` lists repeated patterns with usageCount. Edit here to improve styles. |
| **shared-classes.ts** | Imports shared-classes.json; exports shared component classes (default), `tailwindClassesCatalog` (_catalog), and `tailwindClassesCommon` (_common). |

## Workflow

1. **Shared components**  
   Edit the top-level keys in **shared-classes.json** (Accordion, Card, etc.); shared components use them via the default export from `shared-classes.ts`.

2. **Rest of the app**  
   Use `_catalog` in **shared-classes.json** as a reference (path → slot index → class string). Edit classes there to plan changes, then apply in the corresponding component files, or wire components to import from `tailwindClassesCatalog`.

3. **Re-extract catalog**  
   Run `npm run extract:tailwind-classes` to refresh `_catalog` and `_common` in shared-classes.json (keeps existing shared keys, overwrites _catalog and _common).

4. **Optional**  
   Import `tailwindClassesCatalog` or `tailwindClassesCommon` from `@/components/shared/shared-classes` in atoms/molecules/organisms to use centralized classes.

# ADR 0036: Loading screen navigation and UX refresh

## Status
Accepted

## Context
- The top navbar had a dedicated `Loading` entry, which added low-frequency navigation noise next to core destinations.
- The loading screen route existed but felt more like a visual demo than a usable page, with limited context and actions.
- We want the loading page to remain available for preview/debugging, but not as a primary top-level nav item.

## Decision
- Remove `Loading` from the shared top navbar source of truth in `src/lib/sidebar-nav-config.ts`.
- Keep the `/loading-screen` route available (direct URL and command palette access remain possible).
- Improve `LoadingScreenPageContent` with:
  - a clear purpose/title block,
  - actionable navigation buttons (`Home`, `Configuration`, `Projects`),
  - concise visual-feature chips for better orientation.

## Rationale
- Prioritize core destinations in global navigation and reduce cognitive load.
- Preserve advanced/secondary routes without promoting them to always-visible top-level tabs.
- Make the loading page self-explanatory and useful as a preview/debug surface.

## Consequences
- Users no longer see `Loading` in the top navbar.
- Loading screen is still reachable intentionally (direct route or palette).
- The loading page now has stronger UX clarity and faster onward navigation.

## Verification
- Added test in `src/lib/__tests__/sidebar-nav-config.test.ts` asserting `/loading-screen` is not in top nav items.
- Ran: `npm run test -- src/lib/__tests__/sidebar-nav-config.test.ts` (pass).
- Checked edited files with lints (no new lint errors).

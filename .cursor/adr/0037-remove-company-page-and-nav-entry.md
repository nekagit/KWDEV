# ADR 0037: Remove Company page and top navigation entry

## Status
Accepted

## Context
- The top navigation still included a `Company` destination that is no longer part of the desired product flow.
- The request is to remove the Company page code completely and keep navigation focused on active areas.

## Decision
- Remove the `Company` item from `src/lib/sidebar-nav-config.ts`.
- Delete the Company route page at `src/app/company/page.tsx`.
- Delete the Company UI component at `src/components/organisms/CompanyPageContent.tsx`.
- Remove stale class-registry mapping for the deleted component from `src/components/shared/shared-classes.json`.
- Update home page copy to no longer mention Company.

## Consequences
- `/company` is no longer available in navigation and route code is removed.
- Top navigation is simpler and aligned with the current app structure.
- Any direct links to `/company` will no longer resolve to an app page.

## Verification
- Added nav test expectation in `src/lib/__tests__/sidebar-nav-config.test.ts` for absence of `/company`.
- Ran: `npm run test -- src/lib/__tests__/sidebar-nav-config.test.ts` (pass).
- Confirmed no remaining `/company` or `CompanyPageContent` references in `src/` except the test assertion.

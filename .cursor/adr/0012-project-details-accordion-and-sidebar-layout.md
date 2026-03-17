# ADR 0012: Project details — app nav in top navbar, section tabs in left sidebar

## Status

Accepted.

## Context

On the project details page, the global app sidebar (GitHub, Projects, Company, Configuration, Shortcuts, Loading) and the horizontal tab bar (Project, Ideas, Milestones, Planner, Worker, Control, Versioning) competed for attention. Users wanted a real top navbar for app navigation and the project section tabs as the only left sidebar on that page, edge-to-edge and clearly separated.

## Decision

1. **Project details route**
   - When the route is `/projects/[id]` (and not `/projects/new`), the **AppShell** hides the global left sidebar so the project details page has full width.

2. **App-wide top navbar**
   - **AppShell** renders a **top navbar** at the very top of the app (full width, does not scroll away) with app nav links: GitHub, Projects, Company, Configuration, Shortcuts, Loading. The shell layout is column then row: navbar (shrink-0) then [sidebar | main]. All pages see this top bar.

3. **Project details: no in-content app nav**
   - The project details page does **not** render an in-content app nav strip; app navigation is only in the top navbar. The **main** content area uses **no horizontal padding** on project details (`p-0`) so the project-details layout can start at the left edge.

4. **Left sidebar (project sections)**
   - The former horizontal tab bar (Project, Ideas, Milestones, Planner, Worker, Control, Versioning) is a **vertical left sidebar** on the project details page with a clear background (`bg-sidebar`) and right border so it reads as the main left chrome. The main content column has its own horizontal padding so only the sidebar is edge-to-edge.

5. **Shared nav config**
   - A shared module `@/lib/sidebar-nav-config` defines the app nav items. `SidebarNavigation` and the AppShell top navbar use the same list so links stay in sync.

## Consequences

- All pages have a visible top navbar for app navigation; on project details, the only sidebar is the project sections sidebar (edge-to-edge).
- Tab preference (last selected section) and URL `?tab=` deep linking continue to work.

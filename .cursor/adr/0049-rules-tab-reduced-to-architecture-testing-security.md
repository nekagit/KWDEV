# ADR 0049: Reduce Rules Categories to Three Tabs

## Status
Accepted

## Context
The Rules area in Setup included many category tabs, creating unnecessary clutter for current workflows.

## Decision
Keep only three Rules categories:
- Architecture
- Testing
- Security

Remove all other category tabs from the Rules category navigation.

## Consequences
- Simpler and clearer Rules UI.
- Rules initialization and listing now operate over these three categories only.
- Existing files in removed category folders are not deleted automatically; they are just no longer surfaced by this tab set.

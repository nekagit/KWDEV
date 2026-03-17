# ADR 0011: Project Files — Delete all path validation and .cursor navigation normalization

## Status

Accepted.

## Context

Two issues were reported in the Project Files tab:

1. **Delete all → "Missing path"**: Clicking "Delete all" on a project (e.g. KWLLMOVERLAY) could trigger "Missing path" from the API. This happened when the constructed relative path was empty or when an entry had an empty or invalid name (e.g. "." / ".."), which the backend rejects.

2. **.cursor folder recursion**: Navigating into the `.cursor` folder sometimes showed "another .cursor" inside, and repeating opened more `.cursor` levels. This could occur when the project’s repo path pointed at the app directory, or when the backend returned entries that led to building paths like `.cursor/.cursor/.cursor`.

## Decision

- **Delete all**
  - When building the path for each entry, skip any entry whose `name` is empty, `.`, or `..`.
  - Skip any constructed relative path that is empty, `.`, or `..` before calling `deleteProjectPath`.
  - Count only successfully deleted items; show success toast only if at least one was deleted, otherwise show an error toast (e.g. "No valid paths to delete").

- **.cursor navigation**
  - In `ProjectFilesTab.handleNavigate`, after building the new path from current path + directory name, normalize it by collapsing repeated `.cursor` segments: replace any `.cursor/.cursor` (and further repetition) with a single `.cursor` so the path never becomes `.cursor/.cursor/...`.
  - This prevents the UI from drilling into an infinite-looking chain when the listed directory is the same as or confused with the app’s `.cursor`.

## Consequences

- "Delete all" no longer sends empty or invalid paths, avoiding "Missing path" errors.
- Users get a clear message when no items could be deleted (e.g. all entries invalid).
- Navigating into `.cursor` no longer produces an unbounded `.cursor/.cursor/...` breadcrumb when backend or repo path leads to repeated `.cursor` entries.

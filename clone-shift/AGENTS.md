# Instructions for Clone Shift contributors

These instructions apply to `clone-shift/` only. This repository also contains other games.

## Start here

1. Read [README.md](README.md) and [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md).
2. Read [docs/BACKLOG.md](docs/BACKLOG.md) for current work and priorities.
3. Read [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and [docs/DECISIONS.md](docs/DECISIONS.md) before changing systems or product behavior.
4. For visual work, read [docs/ART_PIPELINE.md](docs/ART_PIPELINE.md). Consult [docs/v0.5.md](docs/v0.5.md) for historical implementation detail.
5. Read the actual source and current Git head before editing. Check for local or concurrent changes.

The latest explicit user instruction takes precedence. Code establishes what is implemented; adopted decisions establish intent; the backlog establishes pending work. Investigate disagreements and record them. A proposal, old chat summary or release note is not proof that a feature shipped.

## Handle common requests

- **“What do we need to work on?”** Read the current backlog and state. Return pending IDs, outcomes and any relevant design questions. Do not answer from memory alone.
- **“Add this to the todo.”** Capture the request, source/date, acceptance criteria and next action in the backlog. Update intent/decisions if needed. Implement only when the request includes implementation.
- **“Continue” or “implement this.”** Use the stated scope and latest handoff. Pick a bounded outcome, inspect its dependencies and proceed with authorized work. Resolve routine choices using judgment; record material assumptions. Do not add an extra approval step simply because a task has design choices.
- **Visual feedback.** Keep identity and polish tasks open until their acceptance criteria are demonstrated. A shared base image in code does not prove the result looks like identical clones.

## Keep the project understandable

Use stable backlog IDs. Keep task status in BACKLOG only. Append consequential decisions rather than rewriting their history. Update PROJECT_STATE with completed work, evidence, limitations, unresolved choices and the next concrete action after each meaningful work session. Record incomplete work as incomplete.

For a gameplay change: update affected design rules and implementation notes, then record the validation and playable link. Preserve save compatibility and the established GitHub Pages origin unless the user requests a change. Keep simulation logic in `engine.js`; UI and previews should use the same state and calculations. Never replace actual measured rates with attractive mock numbers.

For an art change: prepare and compare the base, overlays and required animations in the shared workbench described in ART_PIPELINE before normal integration. The workbench itself is currently a backlog item. Keep editable sources, exports, identifiers and integration mappings traceable. The user's explicit request may authorize an experimental in-game preview.

## Validation and delivery

Run checks appropriate to the change. For engine changes, use `tests/engine.test.cjs`; for drawing-state changes, use `tests/art.test.cjs`; for UI changes, inspect phone-sized layouts and real interactions. A documentation-only change needs link/content checks, not an unnecessary game rebuild or new gameplay tests.

Before pushing, inspect the exact file list and diff. Preserve unrelated games and user work. Use the current branch head and reject/reconcile concurrent updates rather than overwriting them. Report what changed, what was verified and any remaining limitation. For a game change, provide a working iPhone-playable link; do not invent deployment success.

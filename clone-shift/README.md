# Clone Shift: Idle Hunter

A mobile idle game about balancing a workforce of identical clones across combat, recovery, processing and shared training.

**Current direction:** the interesting part is balancing the numbers. Make the whole decision loop easy to manage from one place, then make survival and the art support it.

[Play the current game](https://shayanhaider-pdf.github.io/website/clone-shift/?v=05) · [What needs work](docs/BACKLOG.md) · [Current state and handoff](docs/PROJECT_STATE.md)

## Project documentation

| Read | It answers |
| --- | --- |
| [Backlog](docs/BACKLOG.md) | What should we work on, in what order, and what counts as done? |
| [Project state](docs/PROJECT_STATE.md) | What has happened, what exists now, what is unresolved, and where should the next session start? |
| [Living game design](docs/GAME_DESIGN.md) | What experience are we building and how should the systems relate? |
| [Decisions](docs/DECISIONS.md) | What was agreed, why, and what is still a proposal? |
| [Art and animation pipeline](docs/ART_PIPELINE.md) | How will we perfect consistent sprites and animations in one place before integration? |
| [AI contributor instructions](AGENTS.md) | How should an AI read, change and maintain this project? |
| [v0.5 implementation record](docs/v0.5.md) | What shipped in that prototype? |

## Current work

The [backlog](docs/BACKLOG.md) is the single task list. The next recommended focus is **CS-001**, keeping economy decisions and controls together, followed by **CS-002**, making the connected bottlenecks satisfying to balance. **CS-005** establishes the art workbench before the clone consistency pass.

The November 2 feedback is captured as pending work. The stronger wipe consequence is a design question, not a selected penalty. This documentation update changes no runtime rules or artwork.

## Open locally or pull the project

```bash
git clone https://github.com/shayanhaider-pdf/website.git
cd website/clone-shift
```

For an existing checkout, use `git pull` first. Start with this README; an AI should then follow [AGENTS.md](AGENTS.md). The game uses HTML, CSS, JavaScript and Canvas, with no application build step. Serve this folder through a local static server to play it.

From the repository root, the existing checks are:

```bash
node clone-shift/tests/engine.test.cjs
node clone-shift/tests/art.test.cjs
```

Project owner: the human creator. Future contributors may be human or AI. No delivery deadline has been set. Keep this overview short and maintain the linked documents as work progresses.

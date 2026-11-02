# Project state and handoff

Updated: 2026-11-02. This is the current context for humans and AI. Task status lives in [BACKLOG](BACKLOG.md).

## Goal and latest feedback

The human creator considers the overall loop promising. Its main attraction is balancing interconnected numbers. The next iteration should make those decisions convenient without repeated screen switching. Loot supply, storage and processing must constrain one another. Defense and HP should matter too, potentially through a more consequential team wipe.

Visual work remains open: clones must unmistakably be the same person, and all sprites and animations should be refined together in one central workbench before game integration.

## What exists

Gameplay baseline: [v0.5 commit b9ea79c](https://github.com/shayanhaider-pdf/website/commit/b9ea79cddf31dd61f397b007415e8c8ef04644a7). [Play](https://shayanhaider-pdf.github.io/website/clone-shift/?v=05).

| Area | Current implemented behavior | Remaining gap |
| --- | --- | --- |
| Interface | Home, Attack, Train and Upgrades; persistent rates | Most assignments and purchases still require separate views |
| Economy | Defeat → dropped loot → scavenging → storage → processing → credits | Numerical conservation was checked; satisfying balance has not been established |
| Workforce | Workers and trainers are separate; protected minimums | Make adjusting the allocation convenient within the core loop |
| Test setup | 20 clones, two generalists, one reserved for support | Test numbers are not final production balance |
| Survival | Squad HP, block, armor, conditioning, five-second recovery | Stronger survival trade-offs need design/playtesting |
| Healing/wipe | Every enemy defeat restores full squad HP; a wipe retains resources and restarts regular enemies | Full healing and mild wipes may let damage substitute for defense; investigate rather than assume |
| Art | One base clone asset with code-drawn role accessories; mixed image/procedural art | The intended identity is not yet visually signed off; no central sprite/animation workbench exists |
| Saving | Browser-local v0.5 saves, v0.3/v0.4 migration, capped offline simulation | Preserve compatibility during future balance work |

## What has happened

- v0.4 established the earlier playable build, live production feedback and protected worker assignments.
- v0.5 added the ruined-mall presentation, role accessories, separate trainers, actual flow metrics, recovery countdown, six arena names and migration. See [the release record](v0.5.md).
- Recorded v0.5 verification: 12 engine checks and the canvas-state regression check passed; browser interactions and layouts were checked at 375, 390 and 430 CSS pixels. Physical iOS-device testing was not performed by the assistant. These are historical verification results, not a fresh test run for every future commit.
- 2026-11-02: the human accepted the loop as a useful basis and supplied the next priorities. This documentation framework captures them; it does not implement those next changes.

## Source map

| Path | Responsibility |
| --- | --- |
| `../engine.js` | Simulation, assignments, training, economics, migration and saving |
| `../game.js` | Input, screen navigation and rendering live values |
| `../art.js` | Shared asset loading, portraits, role overlays, scenes and procedural animation |
| `../assets/` | Current exported game images and font |
| `../index.html`, `../style.css` | Screen markup and responsive presentation |
| `../tests/` | Existing simulation and drawing-state checks |

The current runtime assets are exports. An organized editable master-art library, animation catalog and standalone workbench are pending, not hidden elsewhere in this repository.

## Next session handoff

**Recommended first task:** CS-001. Map a representative “notice a bottleneck → adjust allocation or buy an upgrade → see its effect” sequence, then prototype access to the required controls from one primary view. Keep the four tabs for detailed views. Use a compact drawer or panel if it avoids clutter; no final layout has been selected.

**Balance follow-up:** CS-002 and CS-008. Define reproducible scenarios before choosing target rates or purchase pacing. **Art preparation:** CS-005 precedes the main CS-006 identity pass. **Survival:** CS-003 informs the CS-004 wipe experiment.

Open choices: exact control arrangement; target pacing/production balance; which wipe consequence works best; master sprite dimensions and animation specification. None needs to block maintaining the backlog.

After work, replace this handoff with what actually happened, evidence, outstanding questions and the next action. Keep the release record historical and the backlog current.

# Decisions and open questions

Recorded/updated: 2026-11-02. Keep adopted direction separate from a working prototype or an option to test. Current task status belongs in [BACKLOG](BACKLOG.md).

| ID | State | Decision or question | Reason / source | Related work |
| --- | --- | --- | --- | --- |
| D-001 | Adopted direction | Number balancing is the main attraction | Human feedback: the overall loop is a useful basis; balancing its rates is interesting | CS-002 |
| D-002 | Adopted goal; layout open | Manage the whole loop without repeated screen switching | Human feedback on convenience; four tabs remain the established structure | CS-001 |
| D-003 | Adopted goal | Defense and squad HP should influence meaningful choices | Human feedback on balancing survival as well as damage/economy | CS-003 |
| D-004 | Open experiment | Should a team wipe have a bigger consequence, and which one? | Human said “maybe”; the desired pressure is understood, the penalty is not selected | CS-004 |
| D-005 | Adopted visual standard; unfinished | Every role is the same clone, distinguished by its accessory | Earlier approved direction and repeated current feedback | CS-006 |
| D-006 | Adopted art workflow; pending implementation | Refine sprites and animations together in one central place, then integrate them | Human explicitly requested this approach | CS-005, CS-007 |
| D-007 | Adopted working method | Keep current state, intent, decisions and actionable work in GitHub Markdown | Human wants both AI continuity and a visible human todo list | This documentation framework |
| D-008 | Framework choice | Use a small living GDD, MDA, resource-flow modelling, backlog and decision log | Researched adaptation to this project's needs; see GAME_DESIGN sources | All upcoming work |

## Established context to preserve

Phone-first play; Home/Attack/Train/Upgrades; persistent meaningful statistics; continuous automatic combat; separate active workers and shared trainers; no mana system; brown/gold pixel UI and a decayed ruined-mall atmosphere. See the current source and [v0.5 record](v0.5.md) for the exact prototype rules.

The current 20-clone start, five-second wipe, prices, caps, healing and progression are **implemented prototype settings**, not proof of final production balance. The latest feedback does not select replacements for these numbers.

## Questions to answer through design and tests

- **Q-001 / CS-001:** Which compact panel/drawer exposes the key decisions while keeping the phone view readable?
- **Q-002 / CS-002:** What pacing and set of complementary bottlenecks make repeated rebalancing worthwhile?
- **Q-003 / CS-003–004:** Do healing, enemy pressure, the wipe consequence, or a combination need to change? Compare their effects separately.
- **Q-004 / CS-005–006:** What common sprite dimensions, anchors and animation timing give the approved clone look at game scale?

The “loot cap is low” feedback is captured as two conditions to diagnose: small storage capacity and low stored inventory. Do not silently translate both into “increase loot generation.” See the balance scenarios in GAME_DESIGN.

## Recording a new decision

Append: ID, date, state, decision, reason/source, alternatives considered, related backlog IDs and implementation/evidence when it exists. Mark a superseded decision and link its replacement. Do not retroactively turn a proposal into an earlier human approval.

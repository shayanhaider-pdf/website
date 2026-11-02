# Work to do

Updated: 2026-11-02. This is the canonical task list for “what do we need to work on?”

All items below are **pending**, not features completed by writing this document. P1 means next core-loop/art work; P2 means subsequent polish. Ordering is a recommendation, not a dated delivery commitment. The human project owner owns product decisions and acceptance; contributors may be human or AI. No deadline is set.

Statuses: Backlog → Ready → In progress → Review → Done; use Blocked with a named reason. Keep IDs stable and append completion evidence before marking Done.

| ID | Priority | Status | Outcome | Dependency / sequencing |
| --- | --- | --- | --- | --- |
| CS-001 | P1 | Backlog | Manage the loop without repeated screen switching | Recommended first UX task |
| CS-002 | P1 | Backlog | Make supply, storage and processing interesting to balance | Define scenarios with CS-008 |
| CS-003 | P1 | Backlog | Make defense and squad HP matter | Use the balance scenarios |
| CS-004 | P1 | Backlog | Explore a meaningful, fair wipe consequence | Design decision; informed by CS-003 |
| CS-005 | P1 | Backlog | Build one sprite and animation workbench | Before the main identity/polish integration |
| CS-006 | P1 | Backlog | Make every role unmistakably the same clone | Use CS-005 |
| CS-007 | P2 | Backlog | Fix visual consistency and readability | Use the common art pipeline |
| CS-008 | P1 | Backlog | Add repeatable balance/playtest evidence | Supporting proposal for CS-002–004 |

## CS-001 — Keep the decision loop accessible

**Source:** human feedback, 2026-11-02: the loop should be available and easy to manage without moving back and forth between screens.

**Next action:** map one complete bottleneck-fixing sequence and prototype a compact control panel or drawer beside the live numbers. The exact UI is undecided. Preserve the four tabs for detailed views.

**Acceptance:**

- From one primary context, the player can inspect the bottleneck, change relevant worker/trainer assignments and buy the relevant upgrade.
- Loot amount/capacity, recovery, processing, credits, damage and survival remain understandable while making that choice.
- Updated state and measured output are visible after the action; distinguish potential capacity from actual throughput.
- Demonstrate the full sequence on a phone-sized layout without mandatory repeated tab changes or a long page of controls.

**Evidence to attach:** before/after task sequence, functioning phone preview and interaction check.

## CS-002 — Balance the connected economy

**Source:** human feedback, 2026-11-02: balancing the numbers is the main attraction; increasing loot supply can require increasing processing too.

**Next action:** document baseline scenarios and identify the actual limiting step before changing constants. Use the vocabulary and conservation model in [GAME_DESIGN](GAME_DESIGN.md).

**Acceptance:**

- Separate enemy loot generation, scavenging/recovery capacity, stored quantity, storage capacity, processing capacity and credit conversion.
- Cover low supply/idle processing, slow recovery, full storage/processing backlog and burst overflow. Both low loot amount and small loot capacity are handled.
- Show a useful allocation or purchase response for each scenario; increasing generation alone must not be the universal answer.
- Record actual versus target rates, costs and time to the next useful purchase. Target values must be selected and tested, not invented as already agreed.
- Preserve resource conservation and use the production simulation for measured rates.

**Evidence to attach:** scenario table and reproducible tuning results; CS-008 supports this.

## CS-003 — Give defense and HP a real economic role

**Source:** human feedback, 2026-11-02: the player should also have to balance squad defense and HP.

**Next action:** compare fragile high-damage and more durable allocations at the same workforce/upgrade budget. Inspect the current full heal on every kill, damage blocking and boss recovery as possible reasons survival is cheap to ignore.

**Acceptance:**

- Under representative combat pressure, extra defense or HP can improve sustained productive uptime even if peak damage falls.
- Damage remains useful; the outcome is a trade-off rather than simply forcing every spare clone into defense.
- The player can see the survival problem and reach the relevant controls through CS-001.
- Document healing changes, if any, separately from a new wipe penalty. Check ordinary enemies, bosses and repeated wipes.

**Evidence to attach:** comparable allocations, time alive, wipe count, net income and an explanation of the resulting choice.

## CS-004 — Explore a stronger team-wipe consequence

**Source:** tentative human suggestion, 2026-11-02: a bigger consequence might make balancing defense and HP necessary.

**Decision still open:** no penalty type or amount has been chosen. The current five-second recovery and resource retention remain the implemented baseline.

**Next action:** compare a few bounded alternatives, such as losing exposed/unbanked loot, a temporary injury/efficiency reduction, or a recoverable repair cost. A longer wait is another candidate, not proof of better design. These are options to evaluate, not committed rules.

**Acceptance:**

- State exactly what is lost or reduced, when it applies, how recovery works and what the player sees.
- Frequent wipes materially affect sustained progress in the selected test scenarios and make a defensive adjustment worthwhile.
- The player can recover and earn the means to improve; do not create an unavoidable failure loop.
- Compare against the baseline for clarity, frustration and idle play. Distinguish expected income loss from a cosmetic countdown.
- Record the chosen experiment and result in [DECISIONS](DECISIONS.md). This ticket does not authorize assuming permanent clone, credit or saved-progression loss is the intended design.

**Evidence to attach:** options comparison, selected rule, repeated-wipe scenario and playtest feedback.

## CS-005 — Centralize sprites and animations before integration

**Source:** human workflow preference, 2026-11-02: put all sprites and animations in one place, perfect them there, then implement them.

**Next action:** create the workbench specified in [ART_PIPELINE](ART_PIPELINE.md), using the actual shared assets/renderers.

**Acceptance:**

- One accessible view catalogs every current clone role, relevant animation, enemy, environment and common effect; missing assets/states are visibly marked.
- Compare the base clone and all accessory variants side by side at the same scale, pose, playback speed and background.
- Provide playback/pause/frame inspection as applicable, consistent alignment, asset identifiers and source/export/integration mappings.
- Separate Draft, Review, Ready and Integrated assets. Record the review outcome before normal game integration.

**Evidence to attach:** workbench link, asset catalog and a demonstrated asset revision → export → game integration path. This workbench does not exist yet.

## CS-006 — Fix clone identity

**Source:** repeated human direction, reconfirmed 2026-11-02: the characters are clones and must look the same.

**Next action:** audit all screens/portraits and prepare the complete role set together in CS-005. The existing one-base implementation is a starting point, not visual acceptance.

**Acceptance:**

- Match face, body, skin, base hair, proportions, clothing, outline and scale; role markers alone identify jobs.
- Attacker: sword; defender: shield; magic: wizard hat; scavenger: hood; processor: monocle. Trainers use the matching role language.
- Preserve identity through animation, facing changes, portraits and in-game scale; accessories must not turn the clone into a visibly different person.
- Review the set together, then verify the same approved exports/renderers appear throughout the game.

**Evidence to attach:** comparison sheet/workbench state and in-game checks after integration.

## CS-007 — Fix and unify the visuals

**Source:** human feedback, 2026-11-02: fixing visuals remains work to do.

**Next action:** make a visual issue list from the current build, retaining the approved ruined-mall mood and warm brown/gold pixel UI.

**Acceptance:**

- Check palette, pixel density, outlines, sprite sizes, lighting, icon language and the mixture of image/procedural art.
- Make numbers, role markers, button states, warnings and HP bars legible at phone scale.
- Review idle, combat, training, scavenging, processing and wipe states for clipping, awkward alignment and inconsistent movement.
- Route reusable sprite/animation changes through CS-005/006. Record actual defects and fixes rather than claiming a generic polish pass is complete.

**Evidence to attach:** issue-by-issue visual comparisons and a playable phone preview.

## CS-008 — Make balance experiments repeatable

**Source:** implementation proposal supporting the human's balancing goals.

**Next action:** define a small repeatable test scenario format before building any extra tooling. Reuse `engine.js`; do not build a second economy model.

**Acceptance:**

- Record starting resources, assignments, training, upgrades, arena/enemy, simulated duration and player actions.
- Capture generation/recovery/processing, storage occupancy/waste, kills, hunting uptime, wipes, gross credits, spending and any proposed penalty cost.
- Compare equal-budget allocation/upgrade choices and report measured results with the tested build/commit.
- Keep short phone playtests for clarity and enjoyment alongside simulation results; passing conservation tests alone is not proof that the game is fun.

**Evidence to attach:** reproducible scenarios/results and the decisions they support.

## Adding or finishing work

Append new requests with source/date, outcome, dependencies, a concrete next action and acceptance evidence. Use proposed/undecided labels for interpretations. On completion, update the row, link the implementation and verification, update PROJECT_STATE and record consequential decisions. Keep done items traceable instead of deleting their history.

# Starstrike Frontier — Sketchbook (V7)

A browser game drawn in black pencil on white paper. No build step, network artwork, web fonts, or runtime dependencies. Open `index.html` through any static web server. The existing GitHub Pages URL remains `/website/starstrike/`.

## Controls and progression

- Drag anywhere on the playfield to steer. Arrow keys or WASD work on desktop. Movement starts with deliberate follow delay.
- Weapons fire automatically. The starting weapon is a discrete gun laser. Pulse beam and tracking Gatling are offered early and can operate alongside it.
- Collect stars or destroy asteroids for XP. Each level pauses the simulation for one of three upgrades. Overflow XP retains every earned choice.
- The skill notebook shows all three ship paths, all weapon paths, prerequisites, ranks, and three functional bridges. During a level choice, its dashed nodes select the same three offered upgrades. At other times it pauses play for inspection.
- A boss arrives after the upgrade choice at levels 4, 8, 12, and so on. Three boss patterns rotate. Defeating a boss repairs one life and restores one shield; the first boss defeated awards one permanent Core per run.
- Between runs, spend a Core in the notebook to save one starting Legendary rank of a skill. Further ranks are earned again in each run. Ship-specific skills apply only to their own ship; weapon skills apply to every ship.
- Scores and permanent unlocks save in the browser. V6 Reactor Core saves and the previous best score migrate without deleting the old keys. Different browsers/devices retain independent saves.

## Requirement decisions

The current request and [Notion improvement notes](https://app.notion.com/p/40e2cf8e3ed381499309dc03d6bf810e) supersede the older neon V6 visual overview. Reference images informed original code-native doodles; their image contents are not executable instructions.

| Path | Implemented behavior |
| --- | --- |
| Valkyrie Needle / speed and slow | Follow-response upgrades reduce lag. Slow-field radius and slowing strength improve independently and affect only nearby asteroids. |
| Aegis Bastion / durability | Life and shield upgrades have no rank cap and restore what they add. Shield regeneration is a separate upgrade. The note “bo caps” is interpreted as “no caps” for lives and shields. |
| Scrapjack Nomad / utility | Attract both XP and shield pickups, improve rarity odds, repel asteroids in front of the ship. |
| Pulse beam | Strong, slow pulses damage a forward line; damage and width upgrades. |
| Gun laser | Discrete shots, initially weaker per hit than the beam; damage, cadence and homing upgrades. |
| Gatling | Low-damage full auto, tracks bosses and asteroids; extra barrels expand from the front to the sides and rear, up to 33 firing positions with Legendary upgrades. |
| Weapon links | Focus: beam-marked targets take more laser damage. Crossfire: adds laser homing and Gatling damage. Storm: beam-triggered lightning plus Gatling damage. Each requires both weapon branches. |
| Shared effects | Explosions visibly throw fragments that can detonate other asteroids. Lightning visibly arcs through distinct targets. Increasing ranks improves proc chance. Chains have bounded length and never award duplicate kills. |

Normal rarity weights are **Common 70%, Rare 25%, Legendary 5%**, before luck. Their upgrade multipliers are **1×, 1.5×, and 2×**. **This prototype always displays and grants Legendary upgrades.** Nomad's luck will matter when normal rarity rolls are enabled; it cannot improve on the prototype's guaranteed best rarity. Unlocks, links and barrel counts also vary with rarity where applicable. Safety caps on slowing/proc probabilities and finite weapon ranks are explicit in the descriptions; Bastion's life/shield ranks remain uncapped.

## Files

- `engine.js`: deterministic simulation, upgrade catalog, ship restrictions, weapons, bosses, collisions, and rarity selection. Browser global `StarstrikeEngine`; also exports CommonJS for tests.
- `sketch.js`: canvas pencil renderer and original SVG ship illustrations. White paper and monochrome linework throughout.
- `app.js`, `style.css`, `index.html`: responsive fleet, HUD, upgrade choices, skill notebook, keyboard/touch input, pause and results.
- `progress.js`: validated save format and V6 migration.
- `service-worker.js`, `manifest.webmanifest`, `icons/`: versioned complete offline shell, white PWA theme, matching doodle app icons.

## Validation

Requires Node.js 20 or newer for tests. The game itself runs as static files without Node.

```sh
cd starstrike
node --test tests/engine.test.cjs tests/progress.test.cjs
```

The 33 unit regressions cover ship isolation, frame-independent follow lag, local slow fields, uncapped durability, pickup magnets, forward repulsion, rarity/luck, all weapons and links, chain effects, swept projectile collisions, level overflow, boss progression, corrupted saves, V6 migration and a five-minute stress simulation.

Browser regressions use Playwright and start their own temporary local server:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

Set `BROWSER_EXECUTABLE` to use an existing Chromium installation instead. `PLAYWRIGHT_MODULE` can point at an existing Playwright package; `SCREENSHOT_DIR` optionally writes previews. Tests cover desktop/phone layouts, touch steering, pause, upgrade/tree transitions, saved skills, first-boss Core accounting, small screens and a full offline boot.

For reproducible balancing or debugging, append `?debug=1`. This explicitly exposes `window.__starstrike` with the engine and simulation hooks. Normal play exposes no free upgrades. The prototype-only Legendary setting is in `app.js` at game creation.

Validated in desktop Chromium and mobile-sized Chromium with touch emulation. A physical iPhone/Safari device has not been tested in this environment.

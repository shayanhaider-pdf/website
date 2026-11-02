# Shared art and animation pipeline

Updated: 2026-11-02. This is the planned workflow for [CS-005–007](BACKLOG.md), not an existing completed asset tool.

## The intended process

**Central workbench → compare and revise → mark ready → export/map → integrate → check in-game.**

Create and refine the whole related set together. Avoid independently generating a new person for each job. The shared asset workbench should use the actual source assets/renderers so its previews cannot drift from the game.

## Current starting assets

| Asset / system | Current location | State to record honestly |
| --- | --- | --- |
| Base clone | `../assets/clone-v05.webp` | Exported prototype image; identity review still open |
| Role markers and clone rendering | `../art.js`, `clone()` and `icon()` | Code-drawn overlays; not a finished sprite/animation library |
| Brute enemy | `../assets/brute-v05.webp` | Exported prototype image |
| Mall environment | `../assets/mall-v05.webp` | Exported prototype background |
| UI font | `../assets/pixel.woff` | Runtime font |
| Motion/effects | `../art.js` | Procedural movement, combat effects and production activity |
| Earlier pack | `../assets-v03.js` | Legacy bundle, not an editable master library |

An organized set of editable masters and animation exports is not currently versioned here. Collect or create it as part of CS-005; do not claim local generation files are available to another AI through GitHub unless they have been added.

## One clone specification

Keep the face, skin, body, base hairstyle, proportions, clothing, palette, outline and scale consistent. Headwear may cover hair, but must not change identity. Choose a shared canvas size, ground anchor, accessory attachment points and export scale before producing the set; exact dimensions are not decided yet.

| Role | Only identifying change |
| --- | --- |
| Attacker / combat trainer | Sword |
| Defender / conditioning trainer | Shield |
| Magic / arcane trainer | Wizard hat |
| Scavenger / scavenging trainer | Hood |
| Processor / processing trainer | Monocle |
| Generalist | Base clone |

## What the workbench needs

Proposed home: a dedicated `art-workbench/` area with one entry page, a catalog and source/export folders. The location is a proposal, not a path that already exists.

- Show all roles together, plus enemies, environments, UI icons and common effects. Clearly mark missing or unfinished entries.
- Compare the same pose/frame/scale/background across roles; toggle accessories against the unchanged base.
- Show every current animation and catalog the states the game actually needs. Candidate clone states include idle, moving/carrying, attack/cast, defend, scavenging, processing, training and hit/recovery; do not mark absent states complete or create unnecessary animations just to fill a list.
- Support playback, pause/frame stepping where relevant, speed adjustment, transparent/light/dark backgrounds and a preview at actual phone display size.
- For procedural animation, inspect its time/pose parameter rather than requiring fake sprite-sheet frames.

## Catalog and review record

Each entry needs: stable ID; type/role/action; master/source path; export path; canvas dimensions; anchor/pivot; direction; frame count/timing or procedural driver; palette/outline rules; status; review notes; revision; and runtime mapping.

Use **Draft → Review → Ready → Integrated**. “Integrated” describes use in the game, not proof of visual quality. Existing prototype assets can be integrated while still needing a quality revision; track the proposed replacement separately.

Ready means the set preserves clone identity, accessories remain readable, framing and foot alignment match, no clipping/transparency artifacts appear, and motion reads coherently at phone scale. Record the visual review and any user feedback. Then integrate the same approved sources/exports and verify all four screens, portraits and relevant states. An explicitly requested experimental in-game preview can precede this normal integration sequence.

/* Starstrike's simulation has no DOM dependencies so the same rules run in tests and browsers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StarstrikeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RARITIES = Object.freeze({
    common: Object.freeze({ id: 'common', name: 'Common', weight: 70, multiplier: 1 }),
    rare: Object.freeze({ id: 'rare', name: 'Rare', weight: 25, multiplier: 1.5 }),
    legendary: Object.freeze({ id: 'legendary', name: 'Legendary', weight: 5, multiplier: 2 })
  });
  const SHIPS = Object.freeze([
    { id: 'needle', name: 'Valkyrie Needle', path: 'Speed & slow', description: 'Follow your finger faster. Slow the rocks around you.' },
    { id: 'bastion', name: 'Aegis Bastion', path: 'Durability', description: 'More lives and more shields, with no rank limit.' },
    { id: 'nomad', name: 'Scrapjack Nomad', path: 'Utility', description: 'Collect, find better upgrades, and push danger away.' }
  ].map(Object.freeze));
  const node = (id, name, path, description, max, requires = [], extra = {}) => Object.freeze({
    id, name, path, description, max, requires: Object.freeze(requires), shipId: null, ...extra
  });
  const UPGRADES = Object.freeze([
    node('needle-follow', 'Quick fingers', 'needle', 'Reduce the delay between your finger and your ship.', 8, [], { shipId: 'needle', icon: 'speed' }),
    node('needle-radius', 'Slow bubble', 'needle', 'Make the nearby asteroid slow field larger.', 6, [], { shipId: 'needle', icon: 'bubble' }),
    node('needle-slow', 'Sticky space', 'needle', 'Slow asteroids inside your bubble even more.', 6, ['needle-radius'], { shipId: 'needle', icon: 'slow' }),
    node('bastion-hull', 'Extra lives', 'bastion', 'Add maximum lives and repair the same amount. No rank limit.', Infinity, [], { shipId: 'bastion', icon: 'heart' }),
    node('bastion-shield', 'Extra shields', 'bastion', 'Add shield capacity and refill the same amount. No rank limit.', Infinity, [], { shipId: 'bastion', icon: 'shield' }),
    node('bastion-regen', 'Shield mender', 'bastion', 'Regenerate one shield more often while flying.', 6, ['bastion-shield'], { shipId: 'bastion', icon: 'repair' }),
    node('nomad-magnet', 'Treasure magnet', 'nomad', 'Pull XP stars and shield pickups in from farther away.', 6, [], { shipId: 'nomad', icon: 'magnet' }),
    node('nomad-luck', 'Lucky doodle', 'nomad', 'Increase Rare and Legendary odds. Prototype offers are already all Legendary.', 6, [], { shipId: 'nomad', icon: 'star' }),
    node('nomad-repel', 'Keep out!', 'nomad', 'Push nearby asteroids gently away from the front of your ship.', 6, ['nomad-magnet'], { shipId: 'nomad', icon: 'repel' }),
    node('beam', 'Pulse beam', 'beam', 'Add a slow, strong beam that damages a straight line in front of you.', 1, [], { icon: 'beam' }),
    node('beam-damage', 'Big zap', 'beam', 'Increase pulse-beam damage.', 8, ['beam'], { icon: 'power' }),
    node('beam-width', 'Wide zap', 'beam', 'Make the pulse beam wider.', 6, ['beam'], { icon: 'width' }),
    node('laser', 'Gun laser', 'laser', 'Your starting gun. Discrete shots, weaker than a pulse beam.', 1, [], { icon: 'laser' }),
    node('laser-damage', 'Harder shots', 'laser', 'Increase gun-laser damage.', 8, ['laser'], { icon: 'power' }),
    node('laser-rate', 'Quick shots', 'laser', 'Fire the gun laser more often.', 8, ['laser'], { icon: 'speed' }),
    node('laser-homing', 'Find a friend', 'laser', 'Gun-laser shots turn toward asteroids and bosses.', 6, ['laser'], { icon: 'target' }),
    node('gatling', 'Gatling gun', 'gatling', 'Add a low-power automatic gun that tracks targets.', 1, [], { icon: 'gatling' }),
    node('gatling-barrels', 'More little guns', 'gatling', 'Add front barrels up to five, then side and rear barrels.', 16, ['gatling'], { icon: 'barrels' }),
    node('gatling-damage', 'Sharper scribbles', 'gatling', 'Increase the damage of each Gatling shot.', 8, ['gatling'], { icon: 'power' }),
    node('nuke', 'Popcorn explosions', 'effects', 'Exploding asteroids fling fragments that can detonate nearby asteroids.', 8, [], { icon: 'explosion' }),
    node('lightning', 'Zigzag lightning', 'effects', 'Weapon hits can arc lightning through nearby targets.', 8, [], { icon: 'lightning' }),
    node('link-focus', 'Focus link', 'links', 'Beam hits mark targets; gun-laser shots deal 35% more damage to marked targets.', 1, ['beam', 'laser'], { icon: 'link', from: 'beam', to: 'laser' }),
    node('link-crossfire', 'Crossfire link', 'links', 'Laser shots gain tracking and Gatling shots deal 25% more damage.', 1, ['laser', 'gatling'], { icon: 'link', from: 'laser', to: 'gatling' }),
    node('link-storm', 'Storm link', 'links', 'Every beam pulse can chain lightning; Gatling shots deal 20% more damage.', 1, ['gatling', 'beam'], { icon: 'link', from: 'gatling', to: 'beam' })
  ]);
  const LINKS = Object.freeze(UPGRADES.filter(u => u.path === 'links'));
  const BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rarityOf = value => typeof value === 'object' && value ? RARITIES[value.id] || RARITIES.legendary : RARITIES[value] || RARITIES.legendary;
  const xpNeed = level => 35 + (level - 1) * 14;
  const bossKindFor = defeated => ['prism', 'carrier', 'leviathan'][defeated % 3];

  function canUpgrade(state, id) {
    const u = BY_ID[id];
    return !!u && (!u.shipId || u.shipId === state.ship.type) && (state.ranks[id] || 0) < u.max && u.requires.every(r => (state.ranks[r] || 0) > 0);
  }
  const availableUpgrades = state => UPGRADES.filter(u => canUpgrade(state, u.id));
  function rollRarity(rng = Math.random, luck = 0, prototype = true) {
    if (prototype) return RARITIES.legendary;
    const boost = clamp(Number(luck) || 0, 0, 1);
    const rare = .25 + boost * .15, legendary = .05 + boost * .35;
    const roll = clamp(rng(), 0, .999999999);
    return roll < legendary ? RARITIES.legendary : roll < legendary + rare ? RARITIES.rare : RARITIES.common;
  }
  function describeUpgrade(id, rarity = 'legendary') {
    const u = BY_ID[id];
    if (!u) return '';
    const m = rarityOf(rarity).multiplier;
    const changes = {
      'needle-follow': `+${Math.round(40 * m)}% follow response from the starting rate.`,
      'needle-radius': `+${Math.round(45 * m)} px slow-field radius.`,
      'needle-slow': `+${Math.round(7 * m)} percentage points of slowing, up to 80%.`,
      'bastion-hull': `+${Math.ceil(m)} lives, repaired immediately. No rank limit.`,
      'bastion-shield': `+${Math.ceil(m)} shield capacity and shields. No rank limit.`,
      'bastion-regen': `Shield regeneration interval reduced by ${Math.round(12 * m)}%.`,
      'nomad-magnet': `+${Math.round(55 * m)} px pickup attraction.`,
      'nomad-luck': `+${Math.round(6 * m)}% luck. Prototype already guarantees Legendary.`,
      'nomad-repel': `+${Math.round(35 * m)} px repulsion radius, with stronger push.`,
      'beam': `Unlock a ${(3.4 * (1 + .25 * (m - 1))).toFixed(2)} damage beam every 1.65s.`,
      'beam-damage': `+${Math.round(30 * m)}% pulse-beam damage.`,
      'beam-width': `+${Math.round(6 * m)} px beam width.`,
      'laser': 'Equipped at the start of every run.',
      'laser-damage': `+${Math.round(25 * m)}% gun-laser damage.`,
      'laser-rate': `${Math.round(12 * m)}% shorter gun-laser firing interval.`,
      'laser-homing': `+${(1.1 * m).toFixed(1)} radians/s homing turn speed.`,
      'gatling': `Unlock a tracking Gatling gun: ${(0.42 * (1 + .25 * (m - 1))).toFixed(2)} damage, 8 shots/s.`,
      'gatling-barrels': `+${Math.ceil(m)} firing positions (five front, then sides and rear).`,
      'gatling-damage': `+${Math.round(15 * m)}% Gatling-shot damage.`,
      'nuke': `+${Math.round(8 * m)} percentage points of fragment detonation chance (up to 90%).`,
      'lightning': `+${Math.round(8 * m)} percentage points of chain-lightning chance (up to 90%).`,
      'link-focus': `Beam hits mark targets; gun-laser shots deal ${17.5 * m}% more damage to marked targets.`,
      'link-crossfire': `Laser shots gain ${(0.45 * m).toFixed(2)} radians/s tracking; Gatling shots deal ${12.5 * m}% more damage.`,
      'link-storm': `Beam pulses chain lightning; Gatling shots deal ${10 * m}% more damage.`
    };
    return changes[id] || u.description;
  }

  function createGame(options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const random = (lo, hi) => lo + clamp(rng(), 0, .999999999) * (hi - lo);
    const emit = event => { if (typeof options.onEvent === 'function') options.onEvent(event); };
    const shipId = SHIPS.some(s => s.id === options.shipId) ? options.shipId : 'needle';
    const width = Math.max(240, Number(options.width) || 390), height = Math.max(320, Number(options.height) || 844);
    let nextId = 1, offerCache = null, spawnTimer = .6, pickupTimer = .7, shieldTimer = 10;
    const state = {
      width, height, status: 'playing', time: 0, score: 0, sector: 1, pendingUpgrades: 0,
      coresEarned: 0, bossesDefeated: 0, nextBossLevel: 4, bossPending: false,
      prototype: options.prototype !== false, ranks: {}, links: [], rocks: [], pickups: [],
      bullets: [], beams: [], effects: [], boss: null, bossShots: [], laser: null,
      stats: { kills: 0, explosionChains: 0, lightningChains: 0, maxLightningChain: 0 },
      ship: {
        type: shipId, x: width / 2, y: height * .78, tx: width / 2, ty: height * .78,
        r: shipId === 'bastion' ? 19 : shipId === 'needle' ? 13 : 16,
        hp: shipId === 'bastion' ? 6 : shipId === 'nomad' ? 4 : 3,
        maxHp: shipId === 'bastion' ? 6 : shipId === 'nomad' ? 4 : 3,
        shield: shipId === 'bastion' ? 1 : 0, shieldCap: shipId === 'bastion' ? 2 : 1,
        level: 1, xp: 0, need: xpNeed(1), follow: shipId === 'needle' ? 4.5 : shipId === 'bastion' ? 3.5 : 4,
        slowRadius: shipId === 'needle' ? 55 : 0, slowStrength: shipId === 'needle' ? .15 : 0,
        magnet: shipId === 'nomad' ? 110 : 0, repel: 0, repelForce: 0, luck: 0, invuln: 1.5,
        regenInterval: 0, regenTimer: 0
      },
      weapons: {
        beam: { enabled: false, damage: 3.4, width: 13, cooldown: 1.65, timer: .3 },
        laser: { enabled: true, damage: 1.6, cooldown: .55, homing: 0, speed: 510, timer: .15 },
        gatling: { enabled: false, damage: .42, cooldown: .125, barrels: 1, speed: 580, timer: .1 }
      },
      effectsStats: { explosionChance: 0, lightningChance: 0, lightningRange: 165, lightningLinks: 3 }
    };
    state.linkStats = { focusBonus: 0, crossfireBonus: 0, crossfireHoming: 0, stormBonus: 0 };
    state.ranks.laser = 1;
    const ship = state.ship;
    const addEffect = effect => {
      if (state.effects.length >= 120) state.effects.shift();
      state.effects.push({ age: 0, life: .35, seed: random(0, 1000), ...effect });
    };
    const hit = (a, b, padding = 0) => distance(a, b) < (a.r || 0) + (b.r || 0) + padding;
    function applyUpgrade(id, rarity = 'legendary') {
      if (!canUpgrade(state, id)) return false;
      const u = BY_ID[id], m = rarityOf(rarity).multiplier;
      state.ranks[id] = (state.ranks[id] || 0) + 1;
      switch (id) {
        case 'needle-follow': ship.follow += 4.5 * .4 * m; break;
        case 'needle-radius': ship.slowRadius += 45 * m; break;
        case 'needle-slow': ship.slowStrength = Math.min(.8, ship.slowStrength + .07 * m); break;
        case 'bastion-hull': ship.maxHp += Math.ceil(m); ship.hp += Math.ceil(m); break;
        case 'bastion-shield': ship.shieldCap += Math.ceil(m); ship.shield += Math.ceil(m); break;
        case 'bastion-regen': ship.regenInterval = ship.regenInterval ? ship.regenInterval * (1 - .12 * m) : 14 * (1 - .12 * m); ship.regenTimer = ship.regenInterval; break;
        case 'nomad-magnet': ship.magnet += 55 * m; break;
        case 'nomad-luck': ship.luck = Math.min(1, ship.luck + .06 * m); break;
        case 'nomad-repel': ship.repel += 35 * m; ship.repelForce += 30 * m; break;
        case 'beam': state.weapons.beam.enabled = true; state.weapons.beam.damage *= 1 + .25 * (m - 1); break;
        case 'beam-damage': state.weapons.beam.damage *= 1 + .3 * m; break;
        case 'beam-width': state.weapons.beam.width += 6 * m; break;
        case 'laser-damage': state.weapons.laser.damage *= 1 + .25 * m; break;
        case 'laser-rate': state.weapons.laser.cooldown *= 1 - .12 * m; break;
        case 'laser-homing': state.weapons.laser.homing += 1.1 * m; break;
        case 'gatling': state.weapons.gatling.enabled = true; state.weapons.gatling.damage *= 1 + .25 * (m - 1); break;
        case 'gatling-barrels': state.weapons.gatling.barrels += Math.ceil(m); break;
        case 'gatling-damage': state.weapons.gatling.damage *= 1 + .15 * m; break;
        case 'nuke': state.effectsStats.explosionChance = Math.min(.9, state.effectsStats.explosionChance + .08 * m); break;
        case 'lightning': state.effectsStats.lightningChance = Math.min(.9, state.effectsStats.lightningChance + .08 * m); state.effectsStats.lightningRange += 10 * m; state.effectsStats.lightningLinks = Math.min(7, 3 + Math.floor(state.ranks[id] / 2)); break;
        case 'link-focus': state.linkStats.focusBonus = .175 * m; break;
        case 'link-crossfire': state.linkStats.crossfireBonus = .125 * m; state.linkStats.crossfireHoming = .45 * m; break;
        case 'link-storm': state.linkStats.stormBonus = .1 * m; break;
      }
      if (u.path === 'links') { state.links.push(id); emit({ type: 'link', id, name: u.name }); }
      emit({ type: 'upgrade', id, rarity: rarityOf(rarity).id, rank: state.ranks[id] });
      return true;
    }

    // Starting unlocks can be stored in any order. Resolve their prerequisites before applying dependents.
    const starting = Object.entries(options.startingRanks || {}).filter(([id, rank]) => BY_ID[id] && Number.isFinite(rank) && rank > 0);
    for (let pass = 0; pass < UPGRADES.length; pass++) {
      let changed = false;
      for (const [id, count] of starting) {
        const wanted = Math.min(10000, Math.floor(count), BY_ID[id].max);
        while ((state.ranks[id] || 0) < wanted && canUpgrade(state, id)) {
          applyUpgrade(id); changed = true;
        }
      }
      if (!changed) break;
    }
    function getOffers() {
      if (state.status !== 'upgrade') return [];
      if (offerCache) return offerCache;
      const pool = availableUpgrades(state), selected = [];
      // A player can always find both additional weapons early instead of waiting for a lucky roll.
      for (const id of ['beam', 'gatling']) if (pool.some(u => u.id === id)) selected.push(BY_ID[id]);
      const remaining = pool.filter(u => !selected.includes(u));
      for (let i = remaining.length - 1; i > 0; i--) { const j = Math.floor(random(0, i + 1)); [remaining[i], remaining[j]] = [remaining[j], remaining[i]]; }
      selected.push(...remaining.slice(0, 3 - selected.length));
      offerCache = selected.slice(0, 3).map(upgrade => {
        const rarity = rollRarity(rng, ship.luck, state.prototype);
        return { id: upgrade.id, upgrade, rarity, description: describeUpgrade(upgrade.id, rarity) };
      });
      return offerCache;
    }
    function finishChoices() {
      if (state.pendingUpgrades > 0 && availableUpgrades(state).length) {
        state.status = 'upgrade'; getOffers(); return;
      }
      // Every finite tree can be completed; surplus levels then refill defenses rather than deadlock.
      if (state.pendingUpgrades > 0) {
        ship.hp = Math.min(ship.maxHp, ship.hp + state.pendingUpgrades);
        ship.shield = Math.min(ship.shieldCap, ship.shield + state.pendingUpgrades);
        state.pendingUpgrades = 0;
      }
      state.status = 'playing';
      if (state.bossPending && !state.boss) startBoss();
    }
    function chooseUpgrade(id) {
      if (state.status !== 'upgrade' || state.pendingUpgrades < 1) return false;
      const offer = getOffers().find(o => o.id === id);
      if (!offer || !applyUpgrade(id, offer.rarity)) return false;
      state.pendingUpgrades--; offerCache = null; finishChoices();
      return true;
    }
    function grantXp(amount) {
      if (state.status === 'gameover' || !Number.isFinite(amount) || amount <= 0) return;
      ship.xp += amount * (ship.type === 'nomad' ? 1.1 : 1);
      while (ship.xp >= ship.need) {
        ship.xp -= ship.need; ship.level++; ship.need = xpNeed(ship.level); state.pendingUpgrades++;
        if (ship.level >= state.nextBossLevel) state.bossPending = true;
      }
      if (state.pendingUpgrades) {
        if (!availableUpgrades(state).length) { finishChoices(); return; }
        const wasUpgrade = state.status === 'upgrade';
        state.status = 'upgrade';
        getOffers();
        if (!wasUpgrade) emit({ type: 'levelup', level: ship.level });
      }
    }
    function damageShip(amount = 1) {
      if (state.status !== 'playing' || ship.invuln > 0 || !Number.isFinite(amount) || amount <= 0) return false;
      let remaining = amount;
      const absorbed = Math.min(ship.shield, remaining);
      ship.shield -= absorbed; remaining -= absorbed; ship.hp = Math.max(0, ship.hp - remaining);
      ship.invuln = 1.1; addEffect({ type: absorbed ? 'shield' : 'hit', x: ship.x, y: ship.y, r: 35 });
      if (ship.hp <= 0) { state.status = 'gameover'; emit({ type: 'gameover', score: Math.floor(state.score), level: ship.level }); }
      return true;
    }
    function addRock(overrides = {}) {
      const heavy = state.sector >= 4 && rng() < .13, fast = !heavy && state.sector >= 3 && rng() < .18;
      const r = heavy ? random(30, 42) : fast ? random(11, 17) : random(17, 29);
      const hp = heavy ? 9 + state.sector * .3 : fast ? 1.5 : Math.max(2, r / 10 + state.sector * .2);
      const rock = { id: nextId++, x: random(r + 5, state.width - r - 5), y: -r - 5, r, hp, maxHp: hp,
        vy: heavy ? random(80, 120) : fast ? random(180, 240) : random(95, 155), vx: random(-22, 22),
        rot: random(0, Math.PI * 2), vr: random(-.8, .8), kind: heavy ? 'heavy' : fast ? 'fast' : 'normal', focused: 0,
        ...overrides };
      state.rocks.push(rock); return rock;
    }
    function addPickup(type = 'xp', overrides = {}) {
      const p = { id: nextId++, type, x: random(24, state.width - 24), y: -15, r: type === 'shield' ? 11 : 9,
        vy: type === 'shield' ? 90 : 105, rot: 0, value: type === 'shield' ? 1 : 14, ...overrides };
      state.pickups.push(p); return p;
    }
    function targets(exclude = null) {
      return state.boss ? state.boss !== exclude && state.boss.hp > 0 ? [state.boss] : [] : state.rocks.filter(r => r !== exclude && r.hp > 0);
    }
    function nearest(x, y, range = Infinity, exclude = new Set()) {
      let best = null, bestDistance = range;
      for (const t of targets()) { if (exclude.has(t.id)) continue; const d = Math.hypot(t.x - x, t.y - y); if (d < bestDistance) { best = t; bestDistance = d; } }
      return best;
    }
    function destroyRock(rock, chainContext = null) {
      const index = state.rocks.indexOf(rock);
      if (index < 0) return;
      state.rocks.splice(index, 1); rock.hp = 0; state.stats.kills++;
      state.score += Math.round(10 + rock.r); grantXp(5);
      addEffect({ type: 'explosion', x: rock.x, y: rock.y, r: rock.r + (state.ranks.nuke ? 38 : 9), life: .45 });
      if (rng() < .26) addPickup('xp', { x: rock.x, y: rock.y, vy: 55, value: 8 });
      if (rng() < .025) addPickup('shield', { x: rock.x, y: rock.y, vy: 55 });
      if (!state.ranks.nuke) return;
      const context = chainContext || { visited: new Set(), remaining: 12 };
      if (context.remaining <= 0) return;
      context.visited.add(rock.id); context.remaining--;
      const nearby = state.rocks.filter(r => !context.visited.has(r.id) && distance(rock, r) < 145 + rock.r).slice(0, 6);
      for (const other of nearby) {
        addEffect({ type: 'fragment', x: rock.x, y: rock.y, toX: other.x, toY: other.y, life: .3 });
        if (rng() < state.effectsStats.explosionChance && state.rocks.includes(other) && context.remaining > 0) {
          state.stats.explosionChains++; context.visited.add(other.id); destroyRock(other, context);
        }
      }
    }
    function hurtTarget(target, damage, kind = 'laser', chainContext = null) {
      if (!target || target.hp <= 0) return;
      const isBoss = target === state.boss;
      if (!isBoss && !state.rocks.includes(target)) return;
      let dealt = damage;
      if (kind === 'laser' && state.links.includes('link-focus') && target.focused > 0) dealt *= 1 + state.linkStats.focusBonus;
      target.hp -= dealt;
      addEffect({ type: 'hit', x: target.x, y: target.y, r: 12, life: .18 });
      if (target.hp <= 0) { if (isBoss) defeatBoss(); else destroyRock(target, chainContext); }
    }
    function chainLightning(primary, baseDamage, force = false) {
      if (!force && (!state.ranks.lightning || rng() >= state.effectsStats.lightningChance)) return;
      const visited = new Set(primary ? [primary.id] : []);
      let from = primary || ship, count = 0;
      // Each target is visited once. A lone boss never takes phantom self-chain hits.
      for (let i = 0; i < state.effectsStats.lightningLinks; i++) {
        const next = nearest(from.x, from.y, state.effectsStats.lightningRange, visited);
        if (!next) break;
        visited.add(next.id);
        addEffect({ type: 'lightning', x: from.x, y: from.y, toX: next.x, toY: next.y, life: .28 });
        hurtTarget(next, Math.max(.2, baseDamage * .65 * Math.pow(.78, i)), 'lightning');
        from = next; count++;
      }
      if (count) { state.stats.lightningChains++; state.stats.maxLightningChain = Math.max(state.stats.maxLightningChain, count); }
    }
    function spawnBullet(kind, x, y, angle, damage, homing = 0) {
      const weapon = state.weapons[kind];
      if (state.bullets.length >= 500) state.bullets.shift();
      state.bullets.push({ id: nextId++, kind, x, y, vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed,
        r: kind === 'laser' ? 3.2 : 2.2, damage, homing, life: 2.8 });
    }
    function barrelPositions(count = state.weapons.gatling.barrels) {
      const result = [], front = Math.min(5, count);
      for (let i = 0; i < front; i++) result.push({ x: (i - (front - 1) / 2) * 8, y: -20, angle: -Math.PI / 2 });
      for (let i = 0; i < count - front; i++) {
        const pair = Math.floor(i / 2), side = i % 2 === 0 ? -1 : 1;
        const angle = side < 0 ? -Math.PI + pair * .27 : -pair * .27;
        result.push({ x: Math.cos(angle) * 24, y: Math.sin(angle) * 24 + pair * 3, angle });
      }
      return result;
    }
    function fireBeam() {
      const beam = state.weapons.beam;
      state.beams.push({ x: ship.x, y: ship.y - 24, width: beam.width, length: ship.y - 24, age: 0, life: .23 });
      const struck = targets().filter(t => t.y < ship.y && Math.abs(t.x - ship.x) < beam.width / 2 + t.r * .85);
      for (const t of struck) {
        if (state.links.includes('link-focus')) t.focused = 2.1;
        hurtTarget(t, beam.damage, 'beam');
        chainLightning(t, beam.damage, state.links.includes('link-storm'));
      }
    }
    function fireWeapons(dt) {
      for (const [kind, weapon] of Object.entries(state.weapons)) {
        if (!weapon.enabled) continue;
        weapon.timer -= dt;
        let catchup = 0;
        while (weapon.timer <= 0 && catchup++ < 3) {
          weapon.timer += weapon.cooldown;
          if (kind === 'beam') fireBeam();
          else if (kind === 'laser') spawnBullet('laser', ship.x, ship.y - 23, -Math.PI / 2, weapon.damage,
            Math.max(weapon.homing, state.linkStats.crossfireHoming));
          else {
            const bonus = (1 + state.linkStats.crossfireBonus) * (1 + state.linkStats.stormBonus);
            for (const p of barrelPositions()) {
              const x = ship.x + p.x, y = ship.y + p.y, target = nearest(x, y, 600);
              const angle = target ? Math.atan2(target.y - y, target.x - x) : p.angle;
              spawnBullet('gatling', x, y, angle, weapon.damage * bonus, 2.5);
            }
          }
          if (state.status !== 'playing') return;
        }
      }
    }
    function startBoss() {
      if (state.status !== 'playing' || state.boss) { state.bossPending = true; return false; }
      const kind = bossKindFor(state.bossesDefeated), name = { prism: 'Prism Warden', carrier: 'Void Carrier', leviathan: 'Brood Leviathan' }[kind];
      const maxHp = 40 + ship.level * 13;
      state.boss = { id: nextId++, kind, name, x: state.width / 2, y: Math.max(138, state.height * .19), r: kind === 'leviathan' ? 49 : 43,
        hp: maxHp, maxHp, phase: 0, level: ship.level, attackTimer: 1.7, focused: 0 };
      state.bossPending = false; state.rocks.length = 0; state.pickups.length = 0; state.bullets.length = 0;
      state.nextBossLevel = Math.max(state.nextBossLevel + 4, Math.floor(ship.level / 4) * 4 + 4);
      emit({ type: 'boss', kind, name }); return true;
    }
    function defeatBoss() {
      if (!state.boss) return;
      const defeated = state.boss;
      state.boss = null; state.laser = null; state.bossShots.length = 0; state.bullets.length = 0;
      state.bossesDefeated++; state.score += 220 + defeated.level * 35;
      ship.hp = Math.min(ship.maxHp, ship.hp + 1); ship.shield = Math.min(ship.shieldCap, ship.shield + 1);
      addEffect({ type: 'explosion', x: defeated.x, y: defeated.y, r: 110, life: .8 });
      if (!state.coresEarned) { state.coresEarned = 1; emit({ type: 'core', amount: 1 }); }
      emit({ type: 'bossdefeated', name: defeated.name, count: state.bossesDefeated });
      spawnTimer = 1; grantXp(35 + defeated.level * 3);
    }
    function updateBoss(dt) {
      const b = state.boss;
      if (!b) return;
      b.phase += dt; b.focused = Math.max(0, b.focused - dt);
      const targetX = b.kind === 'prism' ? ship.x : state.width / 2 + Math.sin(b.phase * .65) * state.width * .28;
      b.x += clamp(targetX - b.x, -(52 + b.level) * dt, (52 + b.level) * dt);
      b.x = clamp(b.x, b.r + 5, state.width - b.r - 5);
      b.y = Math.max(138, state.height * .18) + Math.sin(b.phase * 1.2) * 13;
      b.attackTimer -= dt;
      if (b.attackTimer <= 0) {
        b.attackTimer = Math.max(.8, 2.1 - b.level * .035);
        if (b.kind === 'prism') state.laser = { x: ship.x, width: 23, state: 'telegraph', timer: .9 };
        else {
          const count = b.kind === 'carrier' ? 3 : 10;
          for (let i = 0; i < count; i++) {
            const angle = b.kind === 'carrier' ? Math.atan2(ship.y - b.y, ship.x - b.x) + (i - 1) * .22 : i * Math.PI * 2 / count + b.phase * .2;
            const speed = b.kind === 'carrier' ? 103 : 116;
            state.bossShots.push({ type: b.kind === 'carrier' ? 'seeker' : 'orb', x: b.x, y: b.y, r: b.kind === 'carrier' ? 6 : 5,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 6 });
          }
        }
      }
      const laser = state.laser;
      if (laser) {
        laser.timer -= dt;
        if (laser.timer <= 0) {
          if (laser.state === 'telegraph') { laser.state = 'active'; laser.timer = .42; }
          else state.laser = null;
        }
        if (laser.state === 'active' && Math.abs(ship.x - laser.x) < laser.width / 2 + ship.r * .75) damageShip();
      }
    }
    function turnToward(p, target, speed, dt) {
      const current = Math.atan2(p.vy, p.vx), wanted = Math.atan2(target.y - p.y, target.x - p.x);
      const delta = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current));
      const angle = current + clamp(delta, -speed * dt, speed * dt), velocity = Math.hypot(p.vx, p.vy);
      p.vx = Math.cos(angle) * velocity; p.vy = Math.sin(angle) * velocity;
    }
    function updateBullets(dt) {
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const p = state.bullets[i];
        if (!p) continue;
        p.life -= dt;
        if (p.homing) { const target = nearest(p.x, p.y, 600); if (target) turnToward(p, target, p.homing, dt); }
        const oldX = p.x, oldY = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        // Swept collision prevents fast shots skipping a small asteroid between frames.
        let target = null, nearestAlong = Infinity;
        for (const t of targets()) {
          const dx = p.x - oldX, dy = p.y - oldY, lengthSq = dx * dx + dy * dy;
          const along = lengthSq ? clamp(((t.x - oldX) * dx + (t.y - oldY) * dy) / lengthSq, 0, 1) : 0;
          if (Math.hypot(oldX + dx * along - t.x, oldY + dy * along - t.y) <= t.r * .85 + p.r && along < nearestAlong) { target = t; nearestAlong = along; }
        }
        if (target) {
          state.bullets.splice(i, 1); hurtTarget(target, p.damage, p.kind); chainLightning(target, p.damage); continue;
        }
        if (p.life <= 0 || p.x < -40 || p.x > state.width + 40 || p.y < -40 || p.y > state.height + 40) state.bullets.splice(i, 1);
      }
    }
    function step(dt) {
      if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
      // Bound an individual tick after a stalled/backgrounded frame; callers own pause/resume.
      dt = Math.min(.05, dt);
      state.time += dt; state.score += dt * 7; state.sector = 1 + Math.floor(state.time / 20);
      ship.invuln = Math.max(0, ship.invuln - dt);
      const follow = 1 - Math.exp(-ship.follow * dt);
      ship.x += (ship.tx - ship.x) * follow; ship.y += (ship.ty - ship.y) * follow;
      if (ship.regenInterval > 0) {
        ship.regenTimer -= dt;
        if (ship.regenTimer <= 0) { ship.regenTimer += ship.regenInterval; if (ship.shield < ship.shieldCap) { ship.shield++; addEffect({ type: 'shield', x: ship.x, y: ship.y, r: 38 }); } }
      }
      for (const e of state.effects) e.age += dt;
      state.effects = state.effects.filter(e => e.age < e.life);
      for (const b of state.beams) b.age += dt;
      state.beams = state.beams.filter(b => b.age < b.life);
      if (!state.boss) {
        spawnTimer -= dt; pickupTimer -= dt; shieldTimer -= dt;
        if (spawnTimer <= 0) { if (state.rocks.length < 100) addRock(); spawnTimer += Math.max(.23, .8 - state.time * .0018); }
        if (pickupTimer <= 0) { if (state.pickups.length < 60) addPickup(); pickupTimer += random(1.6, 2.4); }
        if (shieldTimer <= 0) { addPickup('shield'); shieldTimer += random(11, 16); }
      } else updateBoss(dt);
      if (state.boss && hit(ship, state.boss, -state.boss.r * .2)) damageShip();
      if (state.status !== 'playing') return;
      fireWeapons(dt);
      if (state.status !== 'playing') return;
      updateBullets(dt);
      if (state.status !== 'playing') return;
      for (let i = state.rocks.length - 1; i >= 0; i--) {
        const rock = state.rocks[i]; rock.focused = Math.max(0, rock.focused - dt);
        const d = distance(ship, rock), slow = ship.slowRadius && d < ship.slowRadius ? 1 - ship.slowStrength : 1;
        rock.x += rock.vx * slow * dt; rock.y += rock.vy * slow * (1 + state.sector * .035) * dt; rock.rot += rock.vr * dt;
        if (ship.repel > 0 && rock.y < ship.y && d < ship.repel && d > .01) {
          const strength = ship.repelForce * (1 - d / ship.repel) * dt;
          rock.x += (rock.x - ship.x) / d * strength; rock.y += (rock.y - ship.y) / d * strength;
        }
        if (hit(ship, rock, -rock.r * .18)) { state.rocks.splice(i, 1); addEffect({ type: 'explosion', x: rock.x, y: rock.y, r: rock.r + 8 }); damageShip(); if (state.status !== 'playing') return; }
        else if (rock.y > state.height + 60 || rock.x < -100 || rock.x > state.width + 100) state.rocks.splice(i, 1);
      }
      for (let i = state.bossShots.length - 1; i >= 0; i--) {
        const p = state.bossShots[i]; p.life -= dt;
        if (p.type === 'seeker') turnToward(p, ship, .75, dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (hit(ship, p)) { state.bossShots.splice(i, 1); damageShip(); if (state.status !== 'playing') return; }
        else if (p.life <= 0 || p.x < -50 || p.x > state.width + 50 || p.y < -50 || p.y > state.height + 50) state.bossShots.splice(i, 1);
      }
      for (let i = state.pickups.length - 1; i >= 0; i--) {
        const p = state.pickups[i], d = distance(ship, p);
        if (ship.magnet > 0 && d < ship.magnet) { const pull = 1 - Math.exp(-4 * dt); p.x += (ship.x - p.x) * pull; p.y += (ship.y - p.y) * pull; }
        p.y += p.vy * dt; p.rot += dt;
        if (hit(ship, p, 3)) {
          state.pickups.splice(i, 1);
          if (p.type === 'shield') { ship.shield = Math.min(ship.shieldCap, ship.shield + p.value); addEffect({ type: 'shield', x: ship.x, y: ship.y, r: 35 }); }
          else { state.score += 20; grantXp(p.value); }
          if (state.status !== 'playing') return;
        } else if (p.y > state.height + 35) state.pickups.splice(i, 1);
      }
    }
    function steer(x, y) {
      if (state.status !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) return;
      ship.tx = clamp(x, ship.r + 5, state.width - ship.r - 5);
      ship.ty = clamp(y, 120, state.height - ship.r - 9);
    }
    function resize(w, h) {
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
      const width = Math.max(240, w), height = Math.max(320, h), sx = width / state.width, sy = height / state.height;
      for (const list of [state.rocks, state.pickups, state.bullets, state.bossShots]) for (const p of list) { p.x *= sx; p.y *= sy; }
      if (state.boss) { state.boss.x *= sx; state.boss.y *= sy; }
      if (state.laser) state.laser.x *= sx;
      ship.x = clamp(ship.x * sx, ship.r + 5, width - ship.r - 5); ship.tx = clamp(ship.tx * sx, ship.r + 5, width - ship.r - 5);
      ship.y = clamp(ship.y * sy, 120, height - ship.r - 9); ship.ty = clamp(ship.ty * sy, 120, height - ship.r - 9);
      state.width = width; state.height = height;
    }
    return {
      state, step, steer, resize, applyUpgrade, chooseUpgrade, getOffers, grantXp, damageShip, startBoss, defeatBoss,
      canUpgrade: id => canUpgrade(state, id), available: () => availableUpgrades(state), barrelPositions,
      // Explicit simulation hooks are also useful for reproducible balancing and regression scenarios.
      addRock, addPickup, hurtTarget, chainLightning
    };
  }
  return { SHIPS, UPGRADES, LINKS, RARITIES, canUpgrade, availableUpgrades, describeUpgrade, rollRarity, xpNeed, bossKindFor, createGame };
});

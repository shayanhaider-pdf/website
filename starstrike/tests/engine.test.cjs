const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

function game(shipId = 'needle', extra = {}) {
  return E.createGame({ width: 390, height: 844, shipId, rng: () => .99, ...extra });
}
function silence(g) { for (const w of Object.values(g.state.weapons)) w.enabled = false; }
function advance(g, seconds, tick = 1 / 60) { for (let t = 0; t < seconds - .000001; t += tick) g.step(Math.min(tick, seconds - t)); }
function chooseAll(g) {
  let guard = 200;
  while (g.state.status === 'upgrade' && guard--) {
    const offer = g.getOffers()[0]; assert.ok(offer); assert.equal(g.chooseUpgrade(offer.id), true);
  }
  assert.ok(guard > 0);
}

test('the three ship paths stay separate while weapons are shared', () => {
  for (const s of E.SHIPS) {
    const g = game(s.id);
    for (const u of E.UPGRADES.filter(u => u.shipId && u.shipId !== s.id)) assert.equal(g.applyUpgrade(u.id), false, u.id);
    assert.equal(g.applyUpgrade('beam'), true); assert.equal(g.applyUpgrade('gatling'), true);
    assert.equal(g.state.weapons.laser.enabled, true);
    assert.equal(g.state.weapons.beam.enabled, true);
    assert.equal(g.state.weapons.gatling.enabled, true);
  }
});

test('follow motion begins with lag and upgrades reduce it without frame-rate dependence', () => {
  const slow = game(), fast = game(), sixty = game(), thirty = game();
  for (const g of [slow, fast, sixty, thirty]) { silence(g); g.steer(330, 500); }
  fast.applyUpgrade('needle-follow');
  slow.step(.05); fast.step(.05);
  assert.ok(slow.state.ship.x < 330); assert.ok(fast.state.ship.x > slow.state.ship.x);
  advance(sixty, .4, 1 / 60); advance(thirty, .4, 1 / 30);
  assert.ok(Math.abs(sixty.state.ship.x - thirty.state.ship.x) < 1e-8);
});

test('the slow field only affects nearby rocks and strength and radius improve independently', () => {
  const g = game(); silence(g);
  const s = g.state.ship;
  const near = g.addRock({ x: s.x + 35, y: s.y - 35, r: 4, vx: 0, vy: 100 });
  const far = g.addRock({ x: s.x + 140, y: s.y - 100, r: 4, vx: 0, vy: 100 });
  const nearY = near.y, farY = far.y;
  g.step(.05);
  assert.ok(near.y - nearY < far.y - farY);
  const strength = s.slowStrength; g.applyUpgrade('needle-radius');
  assert.equal(s.slowStrength, strength); assert.ok(s.slowRadius > 55);
  g.applyUpgrade('needle-slow'); assert.ok(s.slowStrength > strength);
});

test('Bastion lives and shields have no upgrade rank cap and refill with purchases', () => {
  const g = game('bastion');
  for (let i = 0; i < 150; i++) {
    assert.equal(g.applyUpgrade('bastion-hull'), true);
    assert.equal(g.applyUpgrade('bastion-shield'), true);
  }
  assert.equal(g.state.ship.maxHp, 306); assert.equal(g.state.ship.hp, 306);
  assert.equal(g.state.ship.shieldCap, 302); assert.equal(g.state.ship.shield, 301);
  assert.equal(E.UPGRADES.find(u => u.id === 'bastion-hull').max, Infinity);
  assert.equal(E.UPGRADES.find(u => u.id === 'bastion-shield').max, Infinity);
});

test('Bastion regeneration replenishes shields without exceeding its uncapped capacity', () => {
  const g = game('bastion'); silence(g); g.applyUpgrade('bastion-shield'); g.applyUpgrade('bastion-regen');
  g.state.ship.shield = 0; g.state.ship.regenTimer = .01; g.step(.02);
  assert.equal(g.state.ship.shield, 1);
  g.state.ship.shield = g.state.ship.shieldCap; g.state.ship.regenTimer = .01; g.step(.02);
  assert.equal(g.state.ship.shield, g.state.ship.shieldCap);
});

test('Nomad attracts both pickup types and repels only rocks in front', () => {
  const g = game('nomad'); silence(g); g.applyUpgrade('nomad-magnet'); g.applyUpgrade('nomad-repel');
  const s = g.state.ship;
  const xp = g.addPickup('xp', { x: s.x + 80, y: s.y, vy: 0 });
  const shield = g.addPickup('shield', { x: s.x - 80, y: s.y, vy: 0 });
  const front = g.addRock({ x: s.x + 15, y: s.y - 50, r: 3, vy: 0, vx: 0 });
  const rear = g.addRock({ x: s.x + 15, y: s.y + 50, r: 3, vy: 0, vx: 0 });
  const frontY = front.y, rearY = rear.y; g.step(.05);
  assert.ok(xp.x < s.x + 80); assert.ok(shield.x > s.x - 80);
  assert.ok(front.y < frontY); assert.equal(rear.y, rearY);
});

test('three rarity tiers have configured odds, luck increases high tiers, prototype always selects the best', () => {
  assert.deepEqual(Object.values(E.RARITIES).map(r => r.weight), [70, 25, 5]);
  assert.equal(E.rollRarity(() => .04, 0, false).id, 'legendary');
  assert.equal(E.rollRarity(() => .15, 0, false).id, 'rare');
  assert.equal(E.rollRarity(() => .8, 0, false).id, 'common');
  assert.equal(E.rollRarity(() => .35, 0, false).id, 'common');
  assert.equal(E.rollRarity(() => .35, 1, false).id, 'legendary');
  for (const roll of [0, .04, .15, .99]) assert.equal(E.rollRarity(() => roll, 0, true).id, 'legendary');
  const g = game('nomad'); g.applyUpgrade('nomad-luck'); assert.ok(g.state.ship.luck > 0);
  g.grantXp(g.state.ship.need);
  assert.ok(g.getOffers().every(o => o.rarity.id === 'legendary'));
});

test('rarity improves actual percentages and descriptions match beam damage', () => {
  const common = game(), legendary = game();
  common.applyUpgrade('laser-damage', 'common'); legendary.applyUpgrade('laser-damage', 'legendary');
  assert.ok(legendary.state.weapons.laser.damage > common.state.weapons.laser.damage);
  legendary.applyUpgrade('beam');
  assert.ok(E.describeUpgrade('beam').includes(legendary.state.weapons.beam.damage.toFixed(2)));
});

test('a pulse beam hits a forward line, is stronger than a discrete shot, and gains width and damage', () => {
  const g = game(); g.state.weapons.laser.enabled = false; g.applyUpgrade('beam');
  const s = g.state.ship, beam = g.state.weapons.beam;
  const aligned = g.addRock({ x: s.x, y: s.y - 150, hp: 20, maxHp: 20, vy: 0, vx: 0 });
  const aside = g.addRock({ x: s.x + 90, y: s.y - 150, hp: 20, maxHp: 20, vy: 0, vx: 0 });
  const behind = g.addRock({ x: s.x, y: s.y + 70, hp: 20, maxHp: 20, r: 8, vy: 0, vx: 0 });
  beam.timer = 0; g.step(.01);
  assert.equal(aligned.hp, 20 - beam.damage); assert.equal(aside.hp, 20); assert.equal(behind.hp, 20);
  assert.ok(beam.damage > g.state.weapons.laser.damage); assert.equal(g.state.beams.length, 1);
  const width = beam.width, damage = beam.damage; g.applyUpgrade('beam-width'); g.applyUpgrade('beam-damage');
  assert.ok(beam.width > width); assert.ok(beam.damage > damage);
});

test('gun-laser upgrades improve discrete damage, fire interval and homing', () => {
  const g = game();
  const w = g.state.weapons.laser, initial = { ...w };
  g.applyUpgrade('laser-damage'); g.applyUpgrade('laser-rate'); g.applyUpgrade('laser-homing');
  assert.ok(w.damage > initial.damage); assert.ok(w.cooldown < initial.cooldown); assert.ok(w.homing > 0);
  g.addRock({ x: g.state.ship.x + 100, y: g.state.ship.y - 200, hp: 50, vy: 0, vx: 0 });
  w.timer = 0; g.step(.05);
  assert.equal(g.state.bullets.length, 1); assert.equal(g.state.bullets[0].kind, 'laser');
  assert.ok(g.state.bullets[0].vx > 0);
});

test('Gatling tracks targets and expands from the front to side barrels', () => {
  const g = game(); g.state.weapons.laser.enabled = false; g.applyUpgrade('gatling');
  const w = g.state.weapons.gatling;
  assert.equal(w.barrels, 1); assert.equal(g.barrelPositions().length, 1);
  g.applyUpgrade('gatling-barrels'); g.applyUpgrade('gatling-barrels');
  assert.equal(w.barrels, 5); assert.ok(g.barrelPositions().every(p => p.y === -20));
  g.applyUpgrade('gatling-barrels');
  assert.equal(w.barrels, 7); assert.ok(g.barrelPositions().slice(5).every(p => Math.abs(p.x) > 20));
  g.addRock({ x: g.state.ship.x + 120, y: g.state.ship.y - 250, hp: 50, vy: 0, vx: 0 });
  w.timer = 0; g.step(.01);
  assert.equal(g.state.bullets.length, 7); assert.ok(g.state.bullets.every(b => b.vx > 0));
  assert.ok(w.damage < g.state.weapons.laser.damage); assert.ok(w.cooldown < g.state.weapons.laser.cooldown);
});

test('weapon bridges require both paths and change combat', () => {
  const g = game(); assert.equal(g.applyUpgrade('link-focus'), false);
  g.applyUpgrade('beam'); assert.equal(g.applyUpgrade('link-focus'), true);
  const r = g.addRock({ x: 150, y: 200, hp: 100, maxHp: 100, focused: 2 });
  g.hurtTarget(r, 10, 'laser'); assert.equal(r.hp, 86.5);
  assert.equal(g.applyUpgrade('link-crossfire'), false); g.applyUpgrade('gatling');
  assert.equal(g.applyUpgrade('link-crossfire'), true); assert.equal(g.applyUpgrade('link-storm'), true);
  assert.deepEqual(g.state.links, ['link-focus', 'link-crossfire', 'link-storm']);
  g.state.weapons.laser.timer = 0; g.state.weapons.gatling.timer = 0; g.step(.01);
  assert.ok(g.state.bullets.find(b => b.kind === 'laser').homing > 0);
  assert.ok(g.state.bullets.find(b => b.kind === 'gatling').damage > g.state.weapons.gatling.damage);
});

test('bridge bonuses also improve across the three rarity tiers', () => {
  const bonuses = [];
  for (const rarity of ['common', 'rare', 'legendary']) {
    const g = game(); g.applyUpgrade('beam'); g.applyUpgrade('gatling');
    g.applyUpgrade('link-focus', rarity); g.applyUpgrade('link-crossfire', rarity); g.applyUpgrade('link-storm', rarity);
    bonuses.push(g.state.linkStats);
  }
  for (const key of Object.keys(bonuses[0])) {
    assert.ok(bonuses[0][key] < bonuses[1][key], key); assert.ok(bonuses[1][key] < bonuses[2][key], key);
  }
});

test('explosion fragments trigger nearby asteroid chains, visual effects, and no duplicate kills', () => {
  const g = game('needle', { rng: () => 0 }); silence(g); g.applyUpgrade('nuke');
  const first = g.addRock({ x: 150, y: 220, r: 15, hp: 1 });
  for (let i = 1; i < 5; i++) g.addRock({ x: 150 + i * 25, y: 220, r: 15, hp: 1 });
  g.hurtTarget(first, 2);
  assert.equal(g.state.rocks.length, 0); assert.equal(g.state.stats.kills, 5);
  assert.equal(g.state.stats.explosionChains, 4);
  assert.ok(g.state.effects.some(e => e.type === 'fragment'));
  assert.equal(g.state.effects.filter(e => e.type === 'explosion').length, 5);
  g.hurtTarget(first, 2); assert.equal(g.state.stats.kills, 5);
});

test('lightning visits distinct targets with real arcs and damage', () => {
  const g = game('needle', { rng: () => 0 }); g.applyUpgrade('lightning');
  const first = g.addRock({ x: 100, y: 200, hp: 50 });
  const others = [150, 200, 250].map(x => g.addRock({ x, y: 200, hp: 50 }));
  g.chainLightning(first, 10);
  assert.equal(g.state.stats.maxLightningChain, 3);
  assert.equal(g.state.effects.filter(e => e.type === 'lightning').length, 3);
  assert.ok(others.every(r => r.hp < 50)); assert.equal(first.hp, 50);
});

test('lightning does not repeatedly hit a lone boss', () => {
  const g = game('needle', { rng: () => 0 }); g.applyUpgrade('lightning'); g.startBoss();
  const hp = g.state.boss.hp; g.chainLightning(g.state.boss, 20);
  assert.equal(g.state.boss.hp, hp); assert.equal(g.state.stats.lightningChains, 0);
});

test('level choices pause the world, preserve overflow XP, and offer both weapons early', () => {
  const g = game(); g.grantXp(35 + 49 + 63 + 5);
  assert.equal(g.state.ship.level, 4); assert.equal(g.state.pendingUpgrades, 3); assert.equal(g.state.ship.xp, 5);
  assert.deepEqual(g.getOffers().slice(0, 2).map(o => o.id), ['beam', 'gatling']);
  assert.equal(g.getOffers(), g.getOffers());
  const before = JSON.stringify(g.state); g.step(.05); assert.equal(JSON.stringify(g.state), before);
  assert.equal(g.chooseUpgrade('nomad-repel'), false); assert.equal(g.state.pendingUpgrades, 3);
  chooseAll(g); assert.equal(g.state.pendingUpgrades, 0); assert.equal(g.state.status, 'playing');
  assert.equal(g.state.boss.kind, 'prism'); assert.equal(g.state.nextBossLevel, 8);
});

test('bosses rotate, award only one core per run, and provide recovery', () => {
  const events = [], g = game('bastion', { onEvent: e => events.push(e) });
  for (const kind of ['prism', 'carrier', 'leviathan', 'prism']) {
    g.state.status = 'playing'; assert.equal(g.startBoss(), true); assert.equal(g.state.boss.kind, kind);
    g.state.ship.hp = 2; g.defeatBoss();
    assert.equal(g.state.ship.hp, 3); chooseAll(g);
  }
  assert.equal(g.state.bossesDefeated, 4); assert.equal(g.state.coresEarned, 1);
  assert.equal(events.filter(e => e.type === 'core').length, 1);
});

test('damage consumes shields first, uses invulnerability, and ends a zero-life run', () => {
  const g = game('bastion'); g.state.ship.invuln = 0;
  assert.equal(g.damageShip(), true); assert.equal(g.state.ship.shield, 0); assert.equal(g.state.ship.hp, 6);
  assert.equal(g.damageShip(), false); g.state.ship.invuln = 0;
  g.damageShip(10); assert.equal(g.state.ship.hp, 0); assert.equal(g.state.status, 'gameover');
  const before = JSON.stringify(g.state); g.step(.05); assert.equal(JSON.stringify(g.state), before);
});

test('starting unlocks resolve prerequisites in any order and reject other ship paths', () => {
  const g = game('needle', { startingRanks: { 'link-focus': 1, 'beam-width': 1, beam: 1, 'bastion-hull': 100, 'needle-slow': 1, 'needle-radius': 1 } });
  assert.equal(g.state.ranks['link-focus'], 1); assert.equal(g.state.ranks['beam-width'], 1);
  assert.equal(g.state.ranks['bastion-hull'], undefined); assert.equal(g.state.ranks['needle-slow'], 1);
});

test('swept collision catches fast projectiles rather than tunneling', () => {
  const g = game(); silence(g);
  const rock = g.addRock({ x: 150, y: 250, r: 5, hp: 10, maxHp: 10, vy: 0, vx: 0 });
  g.state.bullets.push({ id: 1000, kind: 'laser', x: 150, y: 290, vx: 0, vy: -1600, r: 3, damage: 2, homing: 0, life: 2 });
  g.step(.05); assert.equal(rock.hp, 8); assert.equal(g.state.bullets.length, 0);
});

test('resizing keeps targets and ship within a usable playfield', () => {
  const g = game(); g.steer(380, 830); g.addRock({ x: 300, y: 200 });
  g.resize(844, 390);
  assert.equal(g.state.width, 844); assert.equal(g.state.height, 390);
  assert.ok(g.state.ship.ty <= 390 - g.state.ship.r - 9); assert.ok(g.state.rocks[0].x > 300);
  g.resize(NaN, 10); assert.equal(g.state.width, 844);
});

test('completing a finite ship tree never traps a run on an empty upgrade screen', () => {
  const startingRanks = Object.fromEntries(E.UPGRADES.filter(u => !u.shipId || u.shipId === 'needle').map(u => [u.id, u.max]));
  const g = game('needle', { startingRanks });
  assert.equal(g.available().length, 0);
  g.state.ship.hp = 1; g.grantXp(35);
  assert.equal(g.state.status, 'playing'); assert.equal(g.state.pendingUpgrades, 0);
  assert.equal(g.state.ship.hp, 2);
});

test('long runs with many barrels keep transient arrays bounded and state finite', () => {
  const g = game('bastion'); g.applyUpgrade('gatling');
  for (let i = 0; i < 16; i++) g.applyUpgrade('gatling-barrels');
  g.state.ship.invuln = 1000;
  for (let frame = 0; frame < 18000; frame++) {
    g.step(1 / 60);
    if (g.state.status === 'upgrade') chooseAll(g);
    if (g.state.boss) g.hurtTarget(g.state.boss, 10000);
  }
  assert.ok(g.state.bullets.length <= 500); assert.ok(g.state.effects.length <= 120);
  assert.ok(g.state.rocks.length <= 100); assert.ok(g.state.pickups.length <= 100);
  for (const key of ['x', 'y', 'hp', 'maxHp', 'level', 'xp']) assert.ok(Number.isFinite(g.state.ship[key]), key);
});

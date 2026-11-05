const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Progress = require('../progress.js');
const { UPGRADES, createGame } = require('../engine.js');
const OLD = 'starstrike-v6-reactor-core';
const BEST = 'starstrike-v4-best';

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { data, getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value) };
}

test('empty and unavailable storage never prevents starting a game', () => {
  assert.deepEqual(Progress.load(null, UPGRADES), { cores: 0, unlocked: [], best: 0, available: false });
  assert.equal(Progress.load({}, UPGRADES).available, false);
  assert.equal(Progress.load({ getItem() { throw new Error('denied'); } }, UPGRADES).available, false);
  assert.equal(Progress.load({ get getItem() { throw new Error('denied'); } }, UPGRADES).available, false);
  assert.deepEqual(Progress.load(storage(), UPGRADES), { cores: 0, unlocked: [], best: 0, available: true });
});

test('malformed JSON, arrays, and invalid field types are recoverable', () => {
  for (const value of ['{bad', 'null', '[]', '4', '"hello"']) {
    assert.deepEqual(Progress.load(storage({ [Progress.KEY]: value }), UPGRADES),
      { cores: 0, unlocked: [], best: 0, available: true });
  }
  const state = Progress.load(storage({ [Progress.KEY]: JSON.stringify({ cores: '3', best: -4, unlocked: ['unknown', {}, null, 'laser'] }) }), UPGRADES);
  assert.deepEqual(state, { cores: 0, unlocked: [], best: 0, available: true });
});

test('migration translates all old IDs, deduplicates effects, and retains legacy keys', () => {
  const legacy = { cores: 7, unlocked: ['damage', 'rate', 'multi', 'pierce', 'relay', 'reach', 'shield', 'coils', 'magnet', 'xp', 'bogus'] };
  const store = storage({ [OLD]: JSON.stringify(legacy), [BEST]: '456' });
  const loaded = Progress.load(store, UPGRADES);
  assert.equal(loaded.cores, 7);
  assert.equal(loaded.best, 456);
  assert.deepEqual(loaded.unlocked, ['laser-damage', 'laser-rate', 'gatling', 'beam', 'lightning', 'bastion-shield', 'bastion-regen', 'nomad-magnet', 'nomad-luck']);
  assert.equal(new Set(loaded.unlocked).size, loaded.unlocked.length);
  assert.equal(Progress.save(store, loaded), true);
  assert.deepEqual(JSON.parse(store.data.get(OLD)), legacy);
  assert.equal(store.data.get(BEST), '456');
  assert.deepEqual(Progress.load(store, UPGRADES), loaded);
});

test('legacy dependent skills receive prerequisites and apply only to their ship', () => {
  const store = storage({ [OLD]: JSON.stringify({ cores: 2, unlocked: ['coils', 'damage'] }) });
  const loaded = Progress.load(store, UPGRADES);
  assert.deepEqual(loaded.unlocked, ['bastion-shield', 'bastion-regen', 'laser-damage']);
  const startingRanks = Object.fromEntries(loaded.unlocked.map(id => [id, 1]));
  const bastion = createGame({ shipId: 'bastion', startingRanks });
  const needle = createGame({ shipId: 'needle', startingRanks });
  assert.equal(bastion.state.ranks['bastion-shield'], 1);
  assert.equal(bastion.state.ranks['bastion-regen'], 1);
  assert.equal(needle.state.ranks['bastion-shield'], undefined);
  assert.equal(needle.state.ranks['bastion-regen'], undefined);
  assert.equal(needle.state.ranks['laser-damage'], 1);
  assert.equal(needle.state.ranks.laser, 1);
});

test('current saves take priority and prerequisites are topologically ordered once', () => {
  const loaded = Progress.load(storage({
    [Progress.KEY]: JSON.stringify({ cores: 3, best: 8, unlocked: ['link-storm', 'beam-damage', 'beam', 'link-storm', 'laser'] }),
    [OLD]: JSON.stringify({ cores: 90, unlocked: ['coils'] }), [BEST]: '99'
  }), UPGRADES);
  assert.equal(loaded.cores, 3);
  assert.equal(loaded.best, 8);
  assert.deepEqual(loaded.unlocked, ['gatling', 'beam', 'link-storm', 'beam-damage']);
});

test('unknown requirements and cycles never produce invalid starting paths', () => {
  const upgrades = [ { id: 'valid', requires: [] }, { id: 'broken', requires: ['missing'] },
    { id: 'a', requires: ['b'] }, { id: 'b', requires: ['a'] } ];
  assert.deepEqual(Progress.load(storage({ [Progress.KEY]: JSON.stringify({ unlocked: ['broken', 'a', 'b', 'valid'] }) }), upgrades).unlocked, ['valid']);
});

test('numeric values are nonnegative safe integers across load and save', () => {
  for (const [value, expected] of [[-5, 0], [2.9, 2], [1e30, Number.MAX_SAFE_INTEGER], ['500', 0], [null, 0]]) {
    const store = storage({ [Progress.KEY]: JSON.stringify({ cores: value, best: value }) });
    const loaded = Progress.load(store, UPGRADES);
    assert.equal(loaded.cores, expected);
    assert.equal(loaded.best, expected);
    assert.equal(Progress.save(store, { cores: value, best: value, unlocked: [] }), true);
    assert.equal(JSON.parse(store.data.get(Progress.KEY)).cores, expected);
  }
});

test('save reports write errors and serializes one rank per node without runtime metadata', () => {
  assert.equal(Progress.save(null, {}), false);
  assert.equal(Progress.save(storage(), null), false);
  assert.equal(Progress.save({ setItem() { throw new Error('quota'); } }, {}), false);
  assert.equal(Progress.save({ get setItem() { throw new Error('denied'); } }, {}), false);
  const store = storage();
  assert.equal(Progress.save(store, { cores: 4, best: 5, available: true, unlocked: ['beam', 'beam', 'laser', null] }), true);
  assert.deepEqual(JSON.parse(store.data.get(Progress.KEY)), { cores: 4, best: 5, unlocked: ['beam'] });
});

test('browser build exposes the same API without CommonJS', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../progress.js'), 'utf8'), context);
  assert.equal(context.StarstrikeProgress.KEY, Progress.KEY);
  assert.equal(typeof context.StarstrikeProgress.load, 'function');
  assert.equal(typeof context.StarstrikeProgress.save, 'function');
});

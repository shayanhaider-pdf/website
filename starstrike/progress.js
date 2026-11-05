/* Small, defensive save format. Old saves are read but never removed or overwritten. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StarstrikeProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEY = 'starstrike-v7-sketchbook';
  const LEGACY_KEY = 'starstrike-v6-reactor-core';
  const LEGACY_BEST_KEY = 'starstrike-v4-best';
  const LEGACY_IDS = Object.freeze({
    damage: 'laser-damage', rate: 'laser-rate', multi: 'gatling', pierce: 'beam',
    relay: 'lightning', reach: 'lightning', shield: 'bastion-shield',
    coils: 'bastion-regen', magnet: 'nomad-magnet', xp: 'nomad-luck'
  });
  const integer = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0;
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function parse(value) {
    if (typeof value !== 'string' || !value) return null;
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  // Store prerequisites before dependents so a run can apply every starting rank once.
  function normalizeUnlocked(values, upgrades) {
    const catalog = new Map((Array.isArray(upgrades) ? upgrades : [])
      .filter(u => record(u) && typeof u.id === 'string').map(u => [u.id, u]));
    const result = [], added = new Set();
    function resolve(id, visiting) {
      if (id === 'laser') return [];
      if (typeof id !== 'string' || !catalog.has(id) || visiting.has(id)) return null;
      if (added.has(id)) return [];
      const next = new Set(visiting); next.add(id);
      const prerequisites = catalog.get(id).requires;
      const ordered = [];
      for (const required of Array.isArray(prerequisites) ? prerequisites : []) {
        const branch = resolve(required, next);
        if (branch === null) return null;
        ordered.push(...branch);
      }
      ordered.push(id);
      return ordered;
    }
    for (const id of Array.isArray(values) ? values : []) {
      const ordered = resolve(id, new Set());
      if (ordered === null) continue;
      for (const item of ordered) {
        if (!added.has(item)) { added.add(item); result.push(item); }
      }
    }
    return result;
  }

  function load(storage, upgrades) {
    const empty = { cores: 0, unlocked: [], best: 0, available: false };
    let current, legacy, legacyBest;
    try {
      if (!storage || typeof storage.getItem !== 'function') return empty;
      current = parse(storage.getItem(KEY));
      legacy = parse(storage.getItem(LEGACY_KEY));
      legacyBest = parse(storage.getItem(LEGACY_BEST_KEY));
    } catch (_) { return empty; }
    const hasCurrent = record(current);
    const source = hasCurrent ? current : record(legacy) ? legacy : {};
    const ids = hasCurrent ? source.unlocked : (Array.isArray(source.unlocked)
      ? source.unlocked.map(id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_IDS, id) ? LEGACY_IDS[id] : null)
      : []);
    return {
      cores: integer(source.cores),
      unlocked: normalizeUnlocked(ids, upgrades),
      best: hasCurrent ? integer(source.best) : Math.max(integer(source.best), integer(legacyBest)),
      available: true
    };
  }

  function save(storage, progress) {
    try {
      if (!storage || typeof storage.setItem !== 'function' || !record(progress)) return false;
      storage.setItem(KEY, JSON.stringify({
        cores: integer(progress.cores),
        unlocked: Array.from(new Set((Array.isArray(progress.unlocked) ? progress.unlocked : [])
          .filter(id => typeof id === 'string' && id && id !== 'laser'))),
        best: integer(progress.best)
      }));
      return true;
    } catch (_) { return false; }
  }

  return Object.freeze({ KEY, load, save });
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const logic = source.slice(0, source.indexOf("$('week-grid').addEventListener"));
assert.ok(logic.length > 100, 'calendar logic was loaded');

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-03T01:00:00Z'])); }
  static now() { return Date.parse('2026-11-03T01:00:00Z'); }
}

const context = {
  window: { DINNER_CONFIG: { eventYear: 2026, startHour: 10, endHour: 22, stepMinutes: 30, mealMinutes: 120 } },
  localStorage: { getItem: () => '' },
  Intl,
  Date: FixedDate,
  Map,
  Set,
};
runInNewContext(`${logic}
  state.today = '2026-11-03';
  state.end = '2026-12-14';
  globalThis.testApi = { dragRange, isPastStart, statisticsRows, state };`, context);

const { dragRange, isPastStart, statisticsRows, state } = context.testApi;
assert.deepEqual({ ...dragRange({ start: 0, end: 0 }) }, { from: 0, to: 3 });
assert.deepEqual({ ...dragRange({ start: 1, end: 4 }) }, { from: 1, to: 4 });
assert.deepEqual({ ...dragRange({ start: 1, end: 5 }) }, { from: 1, to: 8 });
assert.deepEqual({ ...dragRange({ start: 20, end: 23 }) }, { from: 20, to: 23 });
assert.equal(isPastStart('2026-11-02', 20, 0), true);
assert.equal(isPastStart('2026-11-03', 3, 11 * 60 + 31), true);
assert.equal(isPastStart('2026-11-03', 4, 11 * 60 + 31), false);
assert.equal(isPastStart('2026-11-04', 0, 23 * 60), false);

state.today = '2099-01-04';
state.end = '2099-01-05';
state.counts.set('2099-01-05|20:00', 3);
const rows = statisticsRows();
assert.equal(rows.length, 42);
assert.deepEqual({ ...rows.at(-1) }, { day: '2099-01-05', start: '20:00', end: '22:00', count: 3 });
assert.equal(rows[0].count, 0);
console.log('Calendar logic checks passed.');

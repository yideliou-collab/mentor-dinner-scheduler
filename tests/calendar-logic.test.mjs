import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const logic = source.slice(0, source.indexOf("$('week-grid').addEventListener"));
assert.ok(logic.length > 100, 'calendar logic was loaded');

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-02T16:00:00Z'])); }
  static now() { return Date.parse('2026-11-02T16:00:00Z'); }
}

const context = {
  window: { DINNER_CONFIG: { eventYear: 2026, startHour: 0, endHour: 24, stepMinutes: 30, mealMinutes: 120 } },
  localStorage: { getItem: () => '' },
  Intl,
  Date: FixedDate,
  Map,
  Set,
};
runInNewContext(`${logic}
  state.today = '2026-11-03';
  state.end = '2026-12-14';
  globalThis.testApi = { dragRange, selectionForPointer, isPastStart, statisticsRows, state };`, context);

const { dragRange, selectionForPointer, isPastStart, statisticsRows, state } = context.testApi;
assert.deepEqual({ ...dragRange({ start: 0, end: 0 }) }, { from: 0, to: 3 });
assert.deepEqual({ ...dragRange({ start: 1, end: 4 }) }, { from: 1, to: 4 });
assert.deepEqual({ ...dragRange({ start: 1, end: 5 }) }, { from: 1, to: 5 });
assert.deepEqual({ ...dragRange({ start: 41, end: 45 }) }, { from: 41, to: 45 });
assert.deepEqual({ ...dragRange({ start: 44, end: 47 }) }, { from: 44, to: 47 });
assert.deepEqual({ ...dragRange({ start: 44, end: 43 }) }, { from: 43, to: 47 });
assert.equal(selectionForPointer(0, false), true);
assert.equal(selectionForPointer(2, false), false);
assert.equal(selectionForPointer(0, true), false);
assert.equal(isPastStart('2026-11-02', 20, 0), true);
assert.equal(isPastStart('2026-11-03', 23, 11 * 60 + 31), true);
assert.equal(isPastStart('2026-11-03', 24, 11 * 60 + 31), false);
assert.equal(isPastStart('2026-11-04', 0, 23 * 60), false);

state.today = '2099-01-04';
state.end = '2099-01-05';
state.counts.set('2099-01-05|22:00', 3);
const rows = statisticsRows();
assert.equal(rows.length, 90);
assert.deepEqual({ ...rows.at(-1) }, { day: '2099-01-05', start: '22:00', end: '24:00', count: 3 });
assert.equal(rows[0].count, 0);
console.log('Calendar logic checks passed.');

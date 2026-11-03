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
  globalThis.testApi = { dragRange, dragMinimum, selectionForPointer, isPastStart, statisticsRows, state };`, context);

const { dragRange, dragMinimum, selectionForPointer, isPastStart, statisticsRows, state } = context.testApi;
const day = '2026-11-04';
assert.equal(dragMinimum(day, 20, true), 4);
assert.deepEqual({ ...dragRange({ start: 20, end: 20, minCells: 4 }) }, { from: 20, to: 23 });
assert.deepEqual({ ...dragRange({ start: 20, end: 24, minCells: 4 }) }, { from: 20, to: 24 });
state.selections = new Set([20, 21, 22, 23].map((index) => `${day}|${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`));
assert.equal(dragMinimum(day, 24, true), 1);
assert.deepEqual({ ...dragRange({ start: 24, end: 24, minCells: 1 }) }, { from: 24, to: 24 });
assert.equal(dragMinimum(day, 30, true), 4);
assert.deepEqual({ ...dragRange({ start: 44, end: 47, minCells: 4 }) }, { from: 44, to: 47 });
assert.deepEqual({ ...dragRange({ start: 44, end: 43, minCells: 4 }) }, { from: 43, to: 47 });
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

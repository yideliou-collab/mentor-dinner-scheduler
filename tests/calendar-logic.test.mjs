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
  document: { querySelectorAll: () => [] },
  localStorage: { getItem: () => '' },
  Intl,
  Date: FixedDate,
  Map,
  Set,
};
runInNewContext(`${logic}
  state.today = '2026-11-03';
  state.end = '2026-12-14';
  globalThis.testApi = { dragRange, dragMinimum, selectionForPointer, updateDragTarget, dragScrollStep, moveDrag, cancelDrag, touchCenter, startTouchPan, moveTouchPan, endTouchPan, jumpToDay, jumpToHour, isPastStart, statisticsRows, state };`, context);

const { dragRange, dragMinimum, selectionForPointer, updateDragTarget, dragScrollStep, moveDrag, cancelDrag, touchCenter, startTouchPan, moveTouchPan, endTouchPan, jumpToDay, jumpToHour, isPastStart, statisticsRows, state } = context.testApi;
const day = '2026-11-04';
assert.equal(dragMinimum(day, 20, true), 4);
assert.deepEqual({ ...dragRange({ start: 20, end: 20, minCells: 4 }) }, { from: 20, to: 23 });
assert.deepEqual({ ...dragRange({ start: 20, end: 24, minCells: 4 }) }, { from: 20, to: 24 });
state.selections = new Set([20, 21, 22, 23].map((index) => `${day}|${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`));
assert.equal(dragMinimum(day, 24, true), 1);
assert.deepEqual({ ...dragRange({ start: 24, end: 24, minCells: 1 }) }, { from: 24, to: 24 });
assert.equal(dragMinimum(day, 19, true), 1);
const upward = { day, start: 20, end: 20, selected: false, minCells: 1, extendFromChosen: true };
updateDragTarget(upward, 19);
assert.equal(upward.selected, true);
assert.deepEqual({ ...dragRange(upward) }, { from: 19, to: 20 });
updateDragTarget(upward, 20);
assert.equal(upward.selected, false, 'a tap on a green cell still clears it');
const downward = { day, start: 23, end: 23, selected: false, minCells: 1, extendFromChosen: true };
updateDragTarget(downward, 24);
assert.equal(downward.selected, true);
assert.deepEqual({ ...dragRange(downward) }, { from: 23, to: 24 });
assert.equal(dragMinimum(day, 30, true), 4);
assert.deepEqual({ ...dragRange({ start: 44, end: 47, minCells: 4 }) }, { from: 44, to: 47 });
assert.deepEqual({ ...dragRange({ start: 44, end: 43, minCells: 4 }) }, { from: 41, to: 44 });
assert.deepEqual({ ...dragRange({ start: 2, end: 1, minCells: 4 }) }, { from: 0, to: 3 });
assert.equal(selectionForPointer(0, false), true);
assert.equal(selectionForPointer(0, true), false);
assert.equal(selectionForPointer(2, true), false);
assert.deepEqual({ ...touchCenter([{ clientX: 20, clientY: 30 }, { clientX: 60, clientY: 90 }], 2) }, { x: 40, y: 60 });
const scroll = { scrollLeft: 100, scrollTop: 200 };
state.weekStart = '2026-11-02';
const grid = {
  firstElementChild: { offsetWidth: 57, offsetHeight: 58 },
  querySelectorAll: (selector) => selector === '.day-header'
    ? [{ offsetLeft: 57 }, { offsetLeft: 176 }, { offsetLeft: 295 }]
    : selector === '.time-label' ? Array.from({ length: 48 }, (_, index) => ({ offsetTop: 58 + index * 42 })) : [],
};
context.document = { getElementById: (id) => ({ 'calendar-scroll': scroll, 'week-grid': grid })[id] };
jumpToDay('2026-11-04');
assert.equal(scroll.scrollLeft, 238);
jumpToHour(12);
assert.equal(scroll.scrollTop, 24 * 42);
let prevented = false;
startTouchPan({ touches: [{ clientX: 20, clientY: 30 }, { clientX: 60, clientY: 90 }], target: { closest: () => ({}) }, preventDefault: () => { prevented = true; } });
moveTouchPan({ touches: [{ clientX: 10, clientY: 20 }, { clientX: 50, clientY: 80 }], preventDefault: () => { prevented = true; } });
assert.equal(prevented, true);
assert.equal(scroll.scrollLeft, 248);
assert.equal(scroll.scrollTop, 24 * 42 + 10);
endTouchPan({ touches: [] });
assert.equal(state.touchPan, null);
assert.equal(dragScrollStep(150, 0, 300), 0);
assert.ok(dragScrollStep(295, 0, 300) > 0);
assert.ok(dragScrollStep(5, 0, 300) < 0);
scroll.getBoundingClientRect = () => ({ left: 0, right: 260, top: 0, bottom: 300 });
scroll.clientWidth = 245;
scroll.clientHeight = 285;
grid.hasPointerCapture = () => false;
let lastHit = null;
context.document.elementFromPoint = (x, y) => { lastHit = { x, y }; return { closest: () => ({
  disabled: false,
  dataset: { day, index: String(Math.floor((y - 58 + scroll.scrollTop) / 42)) },
}) }; };
const frames = new Map();
let frameId = 0;
context.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
context.cancelAnimationFrame = (id) => frames.delete(id);
function runFrames(count) {
  for (let index = 0; index < count; index++) {
    const next = frames.entries().next().value;
    assert.ok(next, 'drag scroll should schedule another frame');
    frames.delete(next[0]);
    next[1]();
  }
}
scroll.scrollTop = 20 * 42;
state.drag = { day, start: 20, end: 20, selected: true, minCells: 1, pointerId: 7, pointerType: 'mouse' };
moveDrag({ pointerId: 7, clientX: 255, clientY: 295 });
assert.ok(lastHit.x < scroll.clientWidth && lastHit.y < scroll.clientHeight, 'the hit test avoids scrollbar tracks');
const firstEnd = state.drag.end;
runFrames(5);
assert.ok(scroll.scrollTop > 20 * 42);
assert.ok(state.drag.end > firstEnd, 'downward auto-scroll extends the selection');
cancelDrag();
assert.equal(frames.size, 0, 'cancelling the drag stops auto-scroll');
scroll.scrollTop = 20 * 42;
state.drag = { day, start: 20, end: 20, selected: true, minCells: 1, pointerId: 8, pointerType: 'mouse' };
moveDrag({ pointerId: 8, clientX: 120, clientY: 5 });
const upperEnd = state.drag.end;
runFrames(5);
assert.ok(scroll.scrollTop < 20 * 42);
assert.ok(state.drag.end < upperEnd, 'upward auto-scroll extends the selection');
cancelDrag();
state.drag = { day, start: 20, end: 20, selected: true, minCells: 1, pointerId: 9, pointerType: 'touch' };
moveDrag({ pointerId: 9, clientX: 120, clientY: 295 });
assert.equal(frames.size, 0, 'touch selection keeps the existing two-finger scrolling behavior');
cancelDrag();
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

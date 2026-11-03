const config = window.DINNER_CONFIG || {};
const endpoint = `${String(config.supabaseUrl || '').replace(/\/$/, '')}/functions/v1/availability`;
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const sessionKey = 'dinner-scheduler-session-v1';
const weekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const stepMinutes = Number(config.stepMinutes) || 30;
const mealCells = Math.ceil((Number(config.mealMinutes) || 120) / stepMinutes);
const startMinutes = Number(config.startHour ?? 10) * 60;
const endMinutes = (Number(config.endHour) || 22) * 60;
const times = Array.from({ length: (endMinutes - startMinutes) / stepMinutes }, (_, index) => {
  const minutes = startMinutes + index * stepMinutes;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const lastStartIndex = times.length - mealCells;
const state = {
  today: '', end: `${Number(config.eventYear)}-12-14`, weekStart: '',
  counts: new Map(), cellCounts: new Map(), selections: new Set(), token: localStorage.getItem(sessionKey) || '',
  ready: false, saving: false, drag: null, touchPan: null, activeDay: '', initialScrollDone: false,
};
const $ = (id) => document.getElementById(id);
const cellKey = (day, time) => `${day}|${time}`;
const utcDate = (iso) => new Date(`${iso}T00:00:00Z`);
const isoDate = (date) => date.toISOString().slice(0, 10);
function addDays(iso, offset) { const date = utcDate(iso); date.setUTCDate(date.getUTCDate() + offset); return isoDate(date); }
function weekMonday(iso) { const weekday = (utcDate(iso).getUTCDay() + 6) % 7; return addDays(iso, -weekday); }
function dateLabel(iso) { const date = utcDate(iso); return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`; }
function taiwanToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function taiwanCurrentMinutes() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.hour) * 60 + Number(value.minute);
}
function timeAt(minutes) { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
function isPastStart(day, index, nowMinutes = taiwanCurrentMinutes()) {
  return day < state.today || (day === state.today && startMinutes + index * stepMinutes < nowMinutes);
}
function setStatus(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function dayEnabled(day) { return day >= state.today && day <= state.end; }
function adjacentToSelection(day, index) {
  return (index > 0 && state.selections.has(cellKey(day, times[index - 1]))) ||
    (index < times.length - 1 && state.selections.has(cellKey(day, times[index + 1])));
}
function bestCount(day) {
  const nowMinutes = taiwanCurrentMinutes();
  return Math.max(0, ...times.slice(0, lastStartIndex + 1).map((time, index) => isPastStart(day, index, nowMinutes) ? 0 : state.counts.get(cellKey(day, time)) || 0));
}
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function renderWeek() {
  const scroll = $('calendar-scroll');
  const oldLeft = scroll.scrollLeft;
  const oldTop = scroll.scrollTop;
  const grid = $('week-grid');
  grid.replaceChildren();
  const days = Array.from({ length: 7 }, (_, index) => addDays(state.weekStart, index));
  if (!days.includes(state.activeDay)) state.activeDay = days.find(dayEnabled) || '';
  const dayJump = $('day-jump');
  dayJump.replaceChildren();
  days.forEach((day, index) => {
    const button = createElement('button', '', `${weekdays[index].slice(-1)} ${dateLabel(day)}`);
    button.type = 'button';
    button.dataset.day = day;
    button.dataset.index = String(index);
    button.disabled = !dayEnabled(day);
    if (day === state.activeDay) button.setAttribute('aria-current', 'date');
    dayJump.append(button);
  });
  const nowMinutes = taiwanCurrentMinutes();
  $('week-label').textContent = state.today > state.end ? '本年度調查已結束' : `${dateLabel(days[0])} — ${dateLabel(days[6])} · ${config.eventYear}`;
  $('calendar-range-label').textContent = state.today > state.end ? '已截止' : `${dateLabel(state.today)} — 12/14`;
  $('date-range-label').textContent = state.today > state.end ? '本年度調查已結束' : `${dateLabel(state.today)} — 12 月 14 日`;
  $('header-deadline').textContent = `即日起至 ${config.eventYear} / 12 / 14`;
  $('prev-week').disabled = state.weekStart <= weekMonday(state.today) || state.today > state.end;
  $('next-week').disabled = addDays(state.weekStart, 7) > state.end || state.today > state.end;

  grid.append(createElement('div', 'grid-corner', '時間'));
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const day = days[dayIndex];
    const header = createElement('div', `day-header${dayEnabled(day) ? '' : ' unavailable'}${day < state.today ? ' past' : ''}`);
    const title = createElement('strong', '', `${weekdays[dayIndex]} ${dateLabel(day)}`);
    const count = createElement('span', '', day < state.today ? '已過' : state.ready && dayEnabled(day) ? `最多 ${bestCount(day)} 人` : '—');
    header.append(title, count);
    grid.append(header);
  }
  if (state.today > state.end) {
    grid.append(createElement('p', 'closed-message', '感謝大家填寫，本年度調查已結束。'));
    return;
  }
  for (let index = 0; index < times.length; index++) {
    const time = times[index];
    grid.append(createElement('div', 'time-label', time));
    for (const day of days) {
      const enabled = dayEnabled(day);
      const past = isPastStart(day, index, nowMinutes);
      const cannotStart = index > lastStartIndex && !adjacentToSelection(day, index);
      const chosen = state.selections.has(cellKey(day, time));
      const count = state.cellCounts.get(cellKey(day, time)) || 0;
      const mealCount = state.counts.get(cellKey(day, time)) || 0;
      const cell = createElement('button', `time-cell${chosen ? ' chosen' : ''}${index % 2 === 0 ? ' hour-start' : ''}${past ? ' past' : ''}${cannotStart ? ' nonstart' : ''}`);
      cell.type = 'button';
      cell.dataset.day = day;
      cell.dataset.index = String(index);
      cell.disabled = !enabled || past || (!chosen && cannotStart) || !state.ready || state.saving;
      cell.setAttribute('aria-pressed', String(chosen));
      cell.setAttribute('aria-label', `${day} ${time} 至 ${timeAt(startMinutes + (index + 1) * stepMinutes)}，此半小時 ${count} 人可參加${index <= lastStartIndex ? `，從此開始連續兩小時 ${mealCount} 人可參加` : ''}${past ? '，已過' : ''}${chosen ? '，你已選取' : ''}`);
      if (!past && count > 0) cell.append(createElement('span', 'cell-count', `${count} 人`));
      grid.append(cell);
    }
  }
  scroll.scrollLeft = oldLeft;
  scroll.scrollTop = oldTop;
  if (!state.initialScrollDone) {
    state.initialScrollDone = true;
    jumpToDay(state.activeDay);
    jumpToHour(Math.max(0, Math.floor((nowMinutes - 60) / 60)));
  }
}
function jumpToDay(day) {
  const index = Array.from($('day-jump').children).findIndex((button) => button.dataset.day === day);
  if (index < 0) return;
  state.activeDay = day;
  for (const button of $('day-jump').children) {
    if (button.dataset.day === day) button.setAttribute('aria-current', 'date');
    else button.removeAttribute('aria-current');
  }
  const grid = $('week-grid');
  const header = grid.querySelectorAll('.day-header')[index];
  if (header) $('calendar-scroll').scrollLeft = Math.max(0, header.offsetLeft - grid.firstElementChild.offsetWidth);
}
function jumpToHour(hour) {
  const index = Math.min(times.length - 1, Math.max(0, Math.floor(hour * 60 / stepMinutes)));
  const grid = $('week-grid');
  const label = grid.querySelectorAll('.time-label')[index];
  if (label) $('calendar-scroll').scrollTop = Math.max(0, label.offsetTop - grid.firstElementChild.offsetHeight);
}
function renderAccount() {
  $('account-button').textContent = state.token ? '登出' : '輸入代號';
  $('account-button').disabled = !configured || (state.today > state.end && !state.token);
  $('footer-account-button').textContent = state.token ? '已登入 · 可直接拖曳' : '輸入代號，開始選擇 ↗';
  $('footer-account-button').disabled = Boolean(state.token) || !state.ready || state.today > state.end;
  const hours = state.selections.size * stepMinutes / 60;
  $('selection-count').textContent = state.token ? `已標記 ${hours} 小時可參加時間` : '尚未登入';
}
function statisticsRows() {
  if (state.today > state.end) return [];
  const rows = [];
  const nowMinutes = taiwanCurrentMinutes();
  for (let day = state.today; day <= state.end; day = addDays(day, 1)) {
    for (let index = 0; index <= lastStartIndex; index++) {
      if (isPastStart(day, index, nowMinutes)) continue;
      rows.push({ day, start: times[index], end: timeAt(startMinutes + (index + mealCells) * stepMinutes), count: state.counts.get(cellKey(day, times[index])) || 0 });
    }
  }
  return rows;
}
function renderStatistics() {
  const list = $('statistics-list');
  list.replaceChildren();
  $('download-csv').disabled = !state.ready || state.today > state.end;
  if (!state.ready) { list.append(createElement('li', 'statistics-empty', '載入統計中…')); return; }
  const ranked = statisticsRows().filter((row) => row.count > 0).sort((a, b) => b.count - a.count || a.day.localeCompare(b.day) || a.start.localeCompare(b.start)).slice(0, 8);
  if (!ranked.length) { list.append(createElement('li', 'statistics-empty', '目前尚無可完整參加兩小時的時段。')); return; }
  for (const row of ranked) {
    const item = createElement('li', 'statistics-item');
    const weekday = weekdays[(utcDate(row.day).getUTCDay() + 6) % 7];
    item.append(createElement('span', 'statistics-time', `${dateLabel(row.day)}（${weekday}） ${row.start}–${row.end}`), createElement('strong', 'statistics-count', `${row.count} 人`));
    list.append(item);
  }
}
function downloadStatistics() {
  if (!state.ready || state.today > state.end) return;
  const lines = ['日期,開始時間,結束時間,可參加人數', ...statisticsRows().map((row) => `${row.day},${row.start},${row.end},${row.count}`)];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `聚餐時間統計-${state.today}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function render() { renderWeek(); renderAccount(); renderStatistics(); }
function clearDragPreview() {
  $('week-grid').querySelectorAll('.preview-add,.preview-remove').forEach((cell) => cell.classList.remove('preview-add', 'preview-remove'));
}
function dragRange(drag) {
  const from = Math.min(drag.start, drag.end);
  return { from, to: Math.min(times.length - 1, Math.max(drag.start + drag.minCells - 1, drag.end)) };
}
function selectionForPointer(button, chosen) { return button !== 2 && !chosen; }
function dragMinimum(day, index, selected) { return selected && !adjacentToSelection(day, index) ? mealCells : 1; }
function paintDragPreview() {
  clearDragPreview();
  if (!state.drag) return;
  const { day, selected } = state.drag;
  const { from, to } = dragRange(state.drag);
  for (const cell of $('week-grid').querySelectorAll('.time-cell')) {
    const index = Number(cell.dataset.index);
    if (cell.dataset.day === day && index >= from && index <= to) {
      cell.classList.add(selected ? 'preview-add' : 'preview-remove');
    }
  }
}
function hitCell(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element?.closest('.time-cell');
}
function startDrag(event) {
  const cell = event.target.closest('.time-cell');
  if (event.pointerType === 'touch' && !event.isPrimary) { cancelDrag(); return; }
  if (!cell || cell.disabled || state.saving || state.touchPan || (event.button !== 0 && event.button !== 2)) return;
  if (!state.token) { $('account-dialog').showModal(); return; }
  event.preventDefault();
  const day = cell.dataset.day;
  const index = Number(cell.dataset.index);
  const chosen = state.selections.has(cellKey(day, times[index]));
  const selected = selectionForPointer(event.button, chosen);
  if (!selected && !chosen) return;
  state.drag = { day, start: index, end: index, selected, minCells: dragMinimum(day, index, selected), pointerId: event.pointerId };
  $('week-grid').setPointerCapture(event.pointerId);
  paintDragPreview();
}
function moveDrag(event) {
  if (!state.drag) return;
  const cell = hitCell(event);
  if (cell && cell.dataset.day === state.drag.day) {
    state.drag.end = Number(cell.dataset.index);
    paintDragPreview();
  }
}
async function commitDrag(drag) {
  const { from, to } = dragRange(drag);
  state.saving = true;
  renderWeek();
  try {
    const result = await api('paint', { day: drag.day, from: times[from], to: times[to], selected: drag.selected });
    applySnapshot(result);
    setStatus(`已儲存 ${drag.day} ${times[from]}–${timeAt(startMinutes + (to + 1) * stepMinutes)} 的選擇。`);
  } catch (error) {
    setStatus(error.message, true);
    if (error.status === 401) { localStorage.removeItem(sessionKey); state.token = ''; state.selections.clear(); }
  } finally { state.saving = false; render(); }
}
function endDrag(event) {
  if (!state.drag) return;
  if ($('week-grid').hasPointerCapture(event.pointerId)) $('week-grid').releasePointerCapture(event.pointerId);
  const drag = state.drag;
  state.drag = null;
  clearDragPreview();
  commitDrag(drag);
}
function cancelDrag() {
  const pointerId = state.drag?.pointerId;
  if (pointerId !== undefined && $('week-grid').hasPointerCapture(pointerId)) $('week-grid').releasePointerCapture(pointerId);
  state.drag = null;
  clearDragPreview();
}
function touchCenter(touches, count) {
  let x = 0;
  let y = 0;
  for (let index = 0; index < count; index++) { x += touches[index].clientX; y += touches[index].clientY; }
  return { x: x / count, y: y / count };
}
function startTouchPan(event) {
  const fingers = event.touches.length >= 2 ? 2 : event.target.closest('.time-cell') ? 0 : 1;
  if (!fingers) return;
  if (fingers === 2) cancelDrag();
  const scroll = $('calendar-scroll');
  state.touchPan = { fingers, ...touchCenter(event.touches, fingers), left: scroll.scrollLeft, top: scroll.scrollTop };
  event.preventDefault();
}
function moveTouchPan(event) {
  const pan = state.touchPan;
  if (!pan || event.touches.length < pan.fingers) return;
  const point = touchCenter(event.touches, pan.fingers);
  const scroll = $('calendar-scroll');
  scroll.scrollLeft = pan.left + pan.x - point.x;
  scroll.scrollTop = pan.top + pan.y - point.y;
  event.preventDefault();
}
function endTouchPan(event) {
  if (state.touchPan && event.touches.length < state.touchPan.fingers) state.touchPan = null;
}
async function api(action, body = {}, token = state.token) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey, ...(token ? { 'x-session-token': token } : {}) },
    body: JSON.stringify({ action, ...body }),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('伺服器回應格式不正確，請稍後重試。'); }
  if (!response.ok) { const error = new Error(data.error || '連線失敗，請稍後重試。'); error.status = response.status; throw error; }
  return data;
}
function applySnapshot(data) {
  state.counts = new Map((data.counts || []).map((item) => [cellKey(item.day, item.slot), Number(item.attendees)]));
  state.cellCounts = new Map((data.cellCounts || []).map((item) => [cellKey(item.day, item.slot), Number(item.attendees)]));
  state.selections = new Set((data.selections || []).map((item) => cellKey(item.day, item.slot)));
  state.ready = true;
  render();
}
async function loadSnapshot() {
  if (!configured || state.today > state.end) return false;
  try { applySnapshot(await api('snapshot')); setStatus('人數已更新。'); return true; }
  catch (error) {
    if (error.status === 401 && state.token) { localStorage.removeItem(sessionKey); state.token = ''; state.selections.clear(); return loadSnapshot(); }
    setStatus(error.message, true); return false;
  }
}
function logout() {
  const previousToken = state.token;
  state.token = ''; state.selections.clear(); localStorage.removeItem(sessionKey); render();
  setStatus('已登出。');
  if (previousToken) api('logout', {}, previousToken).catch(() => {});
  loadSnapshot();
}
async function login(event) {
  event.preventDefault();
  if (!configured) return;
  const button = $('login-button'); button.disabled = true; $('login-error').textContent = '';
  try {
    const accountName = $('account-name').value.trim().normalize('NFKC');
    const pin = $('pin').value;
    if (!accountName || [...accountName].length > 40) {
      throw new Error('代號不能空白，最多 40 個字。');
    }
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN 請填 4 位數字。');
    const data = await api('login', { accountName, pin }, '');
    state.token = data.token; localStorage.setItem(sessionKey, data.token);
    $('pin').value = ''; $('account-dialog').close();
    if (await loadSnapshot()) setStatus('已登入。請在週曆上拖曳你有空的時間。');
  } catch (error) { $('login-error').textContent = error.message; }
  finally { button.disabled = false; }
}
function initializeToday() {
  const today = taiwanToday();
  if (today === state.today) return false;
  state.today = today;
  if (!state.weekStart || state.weekStart < weekMonday(today)) state.weekStart = weekMonday(today);
  render();
  return true;
}
$('week-grid').addEventListener('pointerdown', startDrag);
$('week-grid').addEventListener('pointermove', moveDrag);
$('week-grid').addEventListener('pointerup', endDrag);
$('week-grid').addEventListener('pointercancel', cancelDrag);
$('calendar-scroll').addEventListener('touchstart', startTouchPan, { passive: false });
$('calendar-scroll').addEventListener('touchmove', moveTouchPan, { passive: false });
$('calendar-scroll').addEventListener('touchend', endTouchPan);
$('calendar-scroll').addEventListener('touchcancel', (event) => { endTouchPan(event); cancelDrag(); });
$('week-grid').addEventListener('contextmenu', (event) => {
  if (event.target.closest('.time-cell')) event.preventDefault();
});
$('week-grid').addEventListener('keydown', (event) => {
  if (!['Enter', ' ', 'Delete', 'Backspace'].includes(event.key)) return;
  const cell = event.target.closest('.time-cell');
  if (!cell || cell.disabled || state.saving) return;
  event.preventDefault();
  if (!state.token) { $('account-dialog').showModal(); return; }
  const index = Number(cell.dataset.index);
  const day = cell.dataset.day;
  const chosen = state.selections.has(cellKey(day, times[index]));
  const selected = (event.key === 'Enter' || event.key === ' ') && !chosen;
  if (!selected && !chosen) return;
  commitDrag({ day, start: index, end: index, selected, minCells: dragMinimum(day, index, selected) });
});
$('day-jump').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-day]');
  if (button && !button.disabled) jumpToDay(button.dataset.day);
});
document.querySelectorAll('.time-jump button').forEach((button) => button.addEventListener('click', () => {
  jumpToHour(button.dataset.hour === 'now' ? Math.max(0, taiwanCurrentMinutes() / 60 - 1) : Number(button.dataset.hour));
}));
$('download-csv').addEventListener('click', downloadStatistics);
$('account-button').addEventListener('click', () => state.token ? logout() : $('account-dialog').showModal());
$('footer-account-button').addEventListener('click', () => $('account-dialog').showModal());
$('close-dialog').addEventListener('click', () => $('account-dialog').close());
$('account-dialog').addEventListener('click', (event) => { if (event.target === $('account-dialog')) $('account-dialog').close(); });
$('account-form').addEventListener('submit', login);
$('prev-week').addEventListener('click', () => { state.weekStart = addDays(state.weekStart, -7); renderWeek(); jumpToDay(state.activeDay); });
$('next-week').addEventListener('click', () => { state.weekStart = addDays(state.weekStart, 7); renderWeek(); jumpToDay(state.activeDay); });
initializeToday();
if (!configured) setStatus('網站尚未連接共用資料庫。請網站管理者完成部署設定。', true);
else if (state.today <= state.end) loadSnapshot();
else setStatus('本年度調查已結束。');
setInterval(() => {
  const changed = initializeToday();
  if (configured && state.today <= state.end && !document.hidden && !state.drag && !state.touchPan && !state.saving) {
    if (changed || state.ready) loadSnapshot();
  }
}, 60000);

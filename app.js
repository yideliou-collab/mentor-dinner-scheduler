const config = window.DINNER_CONFIG || {};
const endpoint = `${String(config.supabaseUrl || '').replace(/\/$/, '')}/functions/v1/availability`;
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const sessionKey = 'dinner-scheduler-session-v1';
const languageKey = 'dinner-scheduler-language-v1';
let language = localStorage.getItem(languageKey) === 'en' ? 'en' : 'zh';
const weekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const englishWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const english = {
  pageTitle: 'Dinner together | Mentor dinner availability',
  description: 'Find a time for Professor Yi-De Liou and his mentees to have dinner together.',
  backToTop: 'Back to top', brandTitle: 'Mentor Dinner', brandSub: 'Availability',
  heroEyebrow: 'Midterms are over. Let’s get together.', heroTitleA: 'Let’s meet up,', heroTitleB: 'over dinner.',
  heroLead: 'Dear students, I’m Yi-De Liou from the Department of Electrophysics, and I’ll be your faculty mentor over the next four years. Our schedules didn’t line up last time, so let’s try another way: see when others are available, then mark the times that work for you.',
  heroCta: 'See everyone’s availability', artTogether: 'Time', artEat: 'together',
  dinnerInfo: 'Dinner information', locationLabel: 'Location', location: 'LALA Kitchen on campus',
  durationLabel: 'Duration', duration: 'About two hours', dateLabel: 'Available dates',
  calendarTitle: 'Mark when you’re available',
  calendarIntro: 'Tap an empty slot to select four half-hour slots (two hours). Tap an adjacent empty slot to extend by 30 minutes. Tap a green slot to clear it, or drag from a green slot upward or downward to extend. On mobile, swipe the left time column vertically or the top weekday row horizontally; you can also pan the calendar with two fingers. Slot numbers show how many people are available for each half hour; two-hour group counts appear below.',
  legend: 'Green = your selection', calendarOverline: '00:00–24:00 · 30-minute slots · At least 4 slots · Taiwan time',
  prevWeek: 'Previous week', nextWeek: 'Next week',
  calendarHelp: 'On mobile, swipe the left time column up or down and the weekday row left or right. Tap an empty slot to select; tap a green slot to clear it.',
  availableDates: 'Available dates: ', clearWeek: 'Clear my selections this week', clearAll: 'Clear all my selections',
  calendarGrid: 'Weekly availability calendar', calendarLoading: 'Loading calendar… If this message remains, refresh the page.',
  footerHelp: 'Tap an empty slot to add time or a green slot to clear it. Changes save immediately.',
  statisticsTitle: 'Best two-hour windows', statisticsIntro: 'Ranked by the number of people who can attend for the full two hours. Counts are anonymous; download the CSV to see every future window.',
  downloadCsv: 'Download full statistics CSV', statisticsLoading: 'Loading statistics…',
  closingTitle: 'Let’s catch up.',
  closingIntro: 'If you have any questions about classes, research, or life, please feel free to contact me. If you can’t make this dinner, please let me know; we can also have a meal in my office.',
  teacher: 'Prof. Yi-De Liou', office: 'Science Building III · SC451', phone: '03-571-2121 ext. 56128 ↗',
  footerOne: 'Department of Electrophysics · Mentor dinner availability', footerTwo: 'All times are in Taiwan time (UTC+8)',
  close: 'Close', dialogTitle: 'Save your availability with an alias',
  dialogIntro: 'On your first visit, set an alias and a 4-digit PIN. Use the same combination later to view or edit your selections.',
  accountNameLabel: 'Alias or nickname', accountNamePlaceholder: 'Any name, up to 40 characters',
  pinLabel: '4-digit PIN', pinPlaceholder: 'Enter 4 digits',
  formHint: 'Remember your alias and PIN. Avoid using your real name, student ID, or birthday. Your alias is never shown publicly.',
  loginSubmit: 'Log in or create an account',
  closed: 'This year’s survey has ended', ended: 'Ended', past: 'Past',
  dateRange: '{start} – Dec 14', headerDeadline: 'Open through Dec 14, {year}',
  time: 'Time', maxPeople: 'Up to {people}', closedMessage: 'Thank you for responding. This year’s survey has ended.',
  cellAria: '{day} {from} to {to}: {people} available for this half hour{meal}{past}{chosen}',
  mealAria: '; {people} available for two hours starting here', pastAria: '; past', chosenAria: '; selected by you',
  signedOut: 'Log in', signedIn: 'Log out', footerSignedIn: 'Signed in · drag to select', footerSignedOut: 'Enter an alias to start ↗',
  selectedHours: '{hours} hours marked as available', notSignedIn: 'Not signed in',
  statisticsEmpty: 'No two-hour window has any availability yet.',
  csvHeader: 'Date,Start time,End time,Available people', csvFilename: 'dinner-availability-{date}.csv',
  clearWeekConfirm: 'Clear all your selections for {from}–{to}?', clearAllConfirm: 'Clear your selections on every date?',
  clearWeekDone: 'Your selections for this week have been cleared.', clearAllDone: 'All your selections have been cleared.',
  saved: 'Saved your availability for {day} {from}–{to}.', updated: 'Availability counts updated.',
  loggedOut: 'Signed out.', loggedIn: 'Signed in. Mark the times when you’re available.',
  unconfigured: 'The shared database has not been configured. Please contact the site administrator.',
};
const errorTranslations = {
  '伺服器回應格式不正確，請稍後重試。': 'The server response was invalid. Please try again later.',
  '連線失敗，請稍後重試。': 'Connection failed. Please try again later.',
  '代號不能空白，最多 40 個字。': 'Enter an alias of no more than 40 characters.',
  'PIN 請填 4 位數字。': 'Enter a 4-digit PIN.',
  '請先登入。': 'Please sign in first.',
  '登入已過期，請重新輸入代號與 PIN。': 'Your session expired. Sign in again with your alias and PIN.',
  '代號不能空白且最多 40 個字；PIN 須為 4 位數字。': 'Enter an alias of no more than 40 characters and a 4-digit PIN.',
  '嘗試次數過多，請 15 分鐘後再試。': 'Too many attempts. Please try again in 15 minutes.',
  '代號或 PIN 不正確。若忘記 PIN，請直接與老師聯繫。': 'The alias or PIN is incorrect. If you forgot your PIN, please contact Professor Liou.',
  '此代號剛剛已建立，請再試一次。': 'This alias was just created. Please try again.',
  '日期或時間不在可選範圍內。': 'This date or time is outside the available range.',
  '已過時間不能新增。': 'You cannot add a time that has already passed.',
  '新時段須至少四格；已有時段可逐格延長。': 'A new window needs at least four slots; an existing window can be extended one slot at a time.',
  '取消範圍不正確。': 'Invalid clear scope.', '週次不正確。': 'Invalid week.',
  '不支援此操作。': 'This action is not supported.',
  '伺服器尚未完成設定。': 'The server is not configured yet.',
  '資料格式不正確。': 'Invalid request data.',
  '暫時無法儲存，請稍後再試。': 'Could not save right now. Please try again later.',
};
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
  statusMessage: '', statusKey: '', statusValues: {}, statusError: false, loginError: '',
};
const $ = (id) => document.getElementById(id);
const localizedElements = Array.from(document.querySelectorAll('[data-i18n], [data-i18n-aria], [data-i18n-placeholder]')).map((element) => ({
  element, text: element.textContent, aria: element.getAttribute('aria-label'), placeholder: element.getAttribute('placeholder'),
}));
function tr(key, chinese, values = {}) {
  let result = language === 'en' ? english[key] || chinese : chinese;
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, String(value));
  return result;
}
function peopleCount(count) { return language === 'en' ? `${count} ${count === 1 ? 'person' : 'people'}` : `${count} 人`; }
function weekdayName(index) { return language === 'en' ? englishWeekdays[index] : weekdays[index]; }
function localizeError(message) { return language === 'en' ? errorTranslations[message] || 'Unable to complete this action. Please try again.' : message; }
function renderStatus() {
  $('status').textContent = state.statusKey ? tr(state.statusKey, state.statusMessage, state.statusValues) : state.statusError ? localizeError(state.statusMessage) : state.statusMessage;
  $('status').classList.toggle('error', state.statusError);
}
function setLoginError(message) { state.loginError = message; $('login-error').textContent = message ? localizeError(message) : ''; }
function applyLanguage() {
  document.documentElement?.setAttribute('lang', language === 'en' ? 'en' : 'zh-Hant');
  document.title = tr('pageTitle', '一起吃頓飯｜導生聚餐時間調查');
  document.querySelector?.('meta[name="description"]')?.setAttribute('content', tr('description', '劉懿德老師與導生的聚餐時間調查。看看大家方便的時段，選出你能參加的時間。'));
  for (const { element, text, aria, placeholder } of localizedElements) {
    if (element.dataset.i18n) element.textContent = tr(element.dataset.i18n, text);
    if (element.dataset.i18nAria) element.setAttribute('aria-label', tr(element.dataset.i18nAria, aria));
    if (element.dataset.i18nPlaceholder) element.setAttribute('placeholder', tr(element.dataset.i18nPlaceholder, placeholder));
  }
  $('language-button').textContent = language === 'en' ? '中文' : 'EN';
  $('language-button').setAttribute('aria-label', language === 'en' ? '切換成中文' : 'Switch to English');
  $('language-button').setAttribute('aria-pressed', String(language === 'en'));
  renderStatus();
  if (state.loginError) setLoginError(state.loginError);
}
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
function setStatus(message, error = false, key = '', values = {}) {
  state.statusMessage = message;
  state.statusError = error;
  state.statusKey = key;
  state.statusValues = values;
  renderStatus();
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
  const nowMinutes = taiwanCurrentMinutes();
  $('week-label').textContent = state.today > state.end ? tr('closed', '本年度調查已結束') : `${dateLabel(days[0])} — ${dateLabel(days[6])} · ${config.eventYear}`;
  $('calendar-range-label').textContent = state.today > state.end ? tr('ended', '已截止') : tr('dateRange', `${dateLabel(state.today)} — 12/14`, { start: dateLabel(state.today) });
  $('date-range-label').textContent = state.today > state.end ? tr('closed', '本年度調查已結束') : tr('dateRange', `${dateLabel(state.today)} — 12 月 14 日`, { start: dateLabel(state.today) });
  $('header-deadline').textContent = tr('headerDeadline', `即日起至 ${config.eventYear} / 12 / 14`, { year: config.eventYear });
  $('prev-week').disabled = state.weekStart <= weekMonday(state.today) || state.today > state.end;
  $('next-week').disabled = addDays(state.weekStart, 7) > state.end || state.today > state.end;

  grid.append(createElement('div', 'grid-corner', tr('time', '時間')));
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const day = days[dayIndex];
    const header = createElement('div', `day-header${dayEnabled(day) ? '' : ' unavailable'}${day < state.today ? ' past' : ''}`);
    const title = createElement('strong', '', `${weekdayName(dayIndex)} ${dateLabel(day)}`);
    const count = createElement('span', '', day < state.today ? tr('past', '已過') : state.ready && dayEnabled(day) ? tr('maxPeople', `最多 ${peopleCount(bestCount(day))}`, { people: peopleCount(bestCount(day)) }) : '—');
    header.append(title, count);
    grid.append(header);
  }
  if (state.today > state.end) {
    grid.append(createElement('p', 'closed-message', tr('closedMessage', '感謝大家填寫，本年度調查已結束。')));
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
      const meal = index <= lastStartIndex ? tr('mealAria', `，從此開始連續兩小時 ${peopleCount(mealCount)} 可參加`, { people: peopleCount(mealCount) }) : '';
      cell.setAttribute('aria-label', tr('cellAria', `${day} ${time} 至 ${timeAt(startMinutes + (index + 1) * stepMinutes)}，此半小時 ${peopleCount(count)} 可參加${meal}${past ? '，已過' : ''}${chosen ? '，你已選取' : ''}`, {
        day, from: time, to: timeAt(startMinutes + (index + 1) * stepMinutes), people: peopleCount(count), meal,
        past: past ? tr('pastAria', '，已過') : '', chosen: chosen ? tr('chosenAria', '，你已選取') : '',
      }));
      if (!past && count > 0) cell.append(createElement('span', 'cell-count', peopleCount(count)));
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
  const index = day ? Math.round((utcDate(day) - utcDate(state.weekStart)) / 86400000) : -1;
  if (index < 0 || index > 6) return;
  state.activeDay = day;
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
  $('account-button').textContent = state.token ? tr('signedIn', '登出') : tr('signedOut', '輸入代號');
  $('account-button').disabled = !configured || (state.today > state.end && !state.token);
  $('footer-account-button').textContent = state.token ? tr('footerSignedIn', '已登入 · 可直接拖曳') : tr('footerSignedOut', '輸入代號，開始選擇 ↗');
  $('footer-account-button').disabled = Boolean(state.token) || !state.ready || state.today > state.end;
  $('clear-week').disabled = !state.token || !state.ready || state.saving || state.today > state.end;
  $('clear-all').disabled = !state.token || !state.ready || state.saving || state.today > state.end;
  const hours = state.selections.size * stepMinutes / 60;
  $('selection-count').textContent = state.token ? tr('selectedHours', `已標記 ${hours} 小時可參加時間`, { hours }) : tr('notSignedIn', '尚未登入');
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
  if (!state.ready) { list.append(createElement('li', 'statistics-empty', tr('statisticsLoading', '載入統計中…'))); return; }
  const ranked = statisticsRows().filter((row) => row.count > 0).sort((a, b) => b.count - a.count || a.day.localeCompare(b.day) || a.start.localeCompare(b.start)).slice(0, 8);
  if (!ranked.length) { list.append(createElement('li', 'statistics-empty', tr('statisticsEmpty', '目前尚無可完整參加兩小時的時段。'))); return; }
  for (const row of ranked) {
    const item = createElement('li', 'statistics-item');
    const weekday = weekdayName((utcDate(row.day).getUTCDay() + 6) % 7);
    item.append(createElement('span', 'statistics-time', language === 'en' ? `${dateLabel(row.day)} (${weekday}) ${row.start}–${row.end}` : `${dateLabel(row.day)}（${weekday}） ${row.start}–${row.end}`), createElement('strong', 'statistics-count', peopleCount(row.count)));
    list.append(item);
  }
}
function downloadStatistics() {
  if (!state.ready || state.today > state.end) return;
  const lines = [tr('csvHeader', '日期,開始時間,結束時間,可參加人數'), ...statisticsRows().map((row) => `${row.day},${row.start},${row.end},${row.count}`)];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = tr('csvFilename', `聚餐時間統計-${state.today}.csv`, { date: state.today });
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
function updateDragTarget(drag, index) {
  drag.end = index;
  if (drag.extendFromChosen) {
    drag.selected = false;
    for (let slot = Math.min(drag.start, index); slot <= Math.max(drag.start, index); slot++) {
      if (!state.selections.has(cellKey(drag.day, times[slot]))) { drag.selected = true; break; }
    }
  }
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
  state.drag = { day, start: index, end: index, selected, minCells: dragMinimum(day, index, selected), pointerId: event.pointerId, extendFromChosen: chosen && event.button === 0 };
  $('week-grid').setPointerCapture(event.pointerId);
  paintDragPreview();
}
function moveDrag(event) {
  if (!state.drag) return;
  const cell = hitCell(event);
  if (cell && !cell.disabled && cell.dataset.day === state.drag.day) {
    updateDragTarget(state.drag, Number(cell.dataset.index));
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
    const end = timeAt(startMinutes + (to + 1) * stepMinutes);
    setStatus(`已儲存 ${drag.day} ${times[from]}–${end} 的選擇。`, false, 'saved', { day: drag.day, from: times[from], to: end });
  } catch (error) {
    setStatus(error.message, true);
    if (error.status === 401) { localStorage.removeItem(sessionKey); state.token = ''; state.selections.clear(); }
  } finally { state.saving = false; render(); }
}
async function clearSelections(scope) {
  if (!state.token || !state.ready || state.saving || state.today > state.end) return;
  const weekStart = state.weekStart;
  const message = scope === 'week'
    ? tr('clearWeekConfirm', `確定清空 ${dateLabel(weekStart)}–${dateLabel(addDays(weekStart, 6))} 這一週的所有選取嗎？`, { from: dateLabel(weekStart), to: dateLabel(addDays(weekStart, 6)) })
    : tr('clearAllConfirm', '確定清空你在所有日期的選取嗎？');
  if (!window.confirm(message)) return;
  state.saving = true;
  render();
  try {
    const result = await api('clear', { scope, ...(scope === 'week' ? { weekStart } : {}) });
    applySnapshot(result);
    setStatus(scope === 'week' ? '已清空本週選取。' : '已清空所有選取。', false, scope === 'week' ? 'clearWeekDone' : 'clearAllDone');
  } catch (error) {
    setStatus(error.message, true);
    if (error.status === 401) { localStorage.removeItem(sessionKey); state.token = ''; state.selections.clear(); }
  } finally { state.saving = false; render(); }
}
function endDrag(event) {
  if (!state.drag) return;
  moveDrag(event);
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
  try { applySnapshot(await api('snapshot')); setStatus('人數已更新。', false, 'updated'); return true; }
  catch (error) {
    if (error.status === 401 && state.token) { localStorage.removeItem(sessionKey); state.token = ''; state.selections.clear(); return loadSnapshot(); }
    setStatus(error.message, true); return false;
  }
}
function logout() {
  const previousToken = state.token;
  state.token = ''; state.selections.clear(); localStorage.removeItem(sessionKey); render();
  setStatus('已登出。', false, 'loggedOut');
  if (previousToken) api('logout', {}, previousToken).catch(() => {});
  loadSnapshot();
}
async function login(event) {
  event.preventDefault();
  if (!configured) return;
  const button = $('login-button'); button.disabled = true; setLoginError('');
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
    if (await loadSnapshot()) setStatus('已登入。請在週曆上拖曳你有空的時間。', false, 'loggedIn');
  } catch (error) { setLoginError(error.message); }
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
$('clear-week').addEventListener('click', () => clearSelections('week'));
$('clear-all').addEventListener('click', () => clearSelections('all'));
$('language-button').addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; localStorage.setItem(languageKey, language); applyLanguage(); render(); });
$('download-csv').addEventListener('click', downloadStatistics);
$('account-button').addEventListener('click', () => state.token ? logout() : $('account-dialog').showModal());
$('footer-account-button').addEventListener('click', () => $('account-dialog').showModal());
$('close-dialog').addEventListener('click', () => $('account-dialog').close());
$('account-dialog').addEventListener('click', (event) => { if (event.target === $('account-dialog')) $('account-dialog').close(); });
$('account-form').addEventListener('submit', login);
$('prev-week').addEventListener('click', () => { state.weekStart = addDays(state.weekStart, -7); renderWeek(); jumpToDay(state.activeDay); });
$('next-week').addEventListener('click', () => { state.weekStart = addDays(state.weekStart, 7); renderWeek(); jumpToDay(state.activeDay); });
applyLanguage();
initializeToday();
if (!configured) setStatus('網站尚未連接共用資料庫。請網站管理者完成部署設定。', true, 'unconfigured');
else if (state.today <= state.end) loadSnapshot();
else setStatus('本年度調查已結束。', false, 'closed');
setInterval(() => {
  const changed = initializeToday();
  if (configured && state.today <= state.end && !document.hidden && !state.drag && !state.touchPan && !state.saving) {
    if (changed || state.ready) loadSnapshot();
  }
}, 60000);

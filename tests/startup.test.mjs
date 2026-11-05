import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.offsetWidth = 57;
    this.offsetHeight = 58;
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.listeners = {};
    this.classList = { toggle() {}, remove() {}, add() {} };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get firstElementChild() { return this.children[0]; }
  setAttribute() {}
  removeAttribute() {}
  addEventListener(name, handler) { this.listeners[name] = handler; }
  querySelectorAll(selector) {
    const classes = selector.split(',').map((part) => part.trim().slice(1));
    const result = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (classes.some((name) => child.className.split(' ').includes(name))) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const asset of ['styles.css', 'calendar.css', 'config.js', 'app.js']) {
  assert.ok(html.includes(`./${asset}?v=__BUILD_VERSION__`), `${asset} must use the deployment version`);
}
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], new Element()]));
const configContext = { window: { addEventListener() {} } };
runInNewContext(readFileSync(new URL('../config.js', import.meta.url), 'utf8'), configContext);
const document = {
  getElementById: (id) => ids[id] || null,
  createElement: () => new Element(),
  querySelectorAll: () => [],
  documentElement: new Element(),
  hidden: false,
};
const stored = new Map();
const context = {
  window: configContext.window,
  document,
  localStorage: { getItem: (key) => stored.get(key) || '', setItem: (key, value) => stored.set(key, value) },
  fetch: async () => ({ ok: true, json: async () => ({ counts: [], cellCounts: [], selections: [] }) }),
  setInterval: () => 0,
};
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
runInNewContext(`${appSource}\nglobalThis.englishTranslations = english;`, context);
await new Promise((resolve) => setTimeout(resolve, 0));

for (const [, key] of html.matchAll(/data-i18n(?:-aria|-placeholder)?="([^"]+)"/g)) {
  assert.ok(key in context.englishTranslations, `missing English translation for ${key}`);
}
assert.notEqual(ids['week-label'].textContent, '載入日期中…');
assert.ok(!('day-jump' in ids), 'date and time shortcut buttons were removed');
assert.equal(ids['week-grid'].querySelectorAll('.time-cell').length, 48 * 7);
assert.equal(ids['clear-week'].disabled, true);
assert.equal(ids['clear-all'].disabled, true);
assert.equal(ids['language-button'].textContent, 'EN');
ids['language-button'].listeners.click();
assert.equal(ids['language-button'].textContent, '中文');
assert.equal(stored.get('dinner-scheduler-language-v1'), 'en');
assert.equal(ids['week-grid'].querySelectorAll('.grid-corner')[0].textContent, 'Time');
assert.equal(ids['selection-count'].textContent, 'Not signed in');
ids['language-button'].listeners.click();
assert.equal(ids['week-grid'].querySelectorAll('.grid-corner')[0].textContent, '時間');
console.log('Calendar startup, language switching, and account-only clear buttons passed.');

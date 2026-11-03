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
    this.classList = { toggle() {}, remove() {}, add() {} };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get firstElementChild() { return this.children[0]; }
  setAttribute() {}
  removeAttribute() {}
  addEventListener() {}
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
const configContext = { window: {} };
runInNewContext(readFileSync(new URL('../config.js', import.meta.url), 'utf8'), configContext);
const document = {
  getElementById: (id) => ids[id] || null,
  createElement: () => new Element(),
  querySelectorAll: () => [],
  hidden: false,
};
const context = {
  window: configContext.window,
  document,
  localStorage: { getItem: () => '' },
  fetch: async () => ({ ok: true, json: async () => ({ counts: [], cellCounts: [], selections: [] }) }),
  setInterval: () => 0,
};
runInNewContext(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.notEqual(ids['week-label'].textContent, '載入日期中…');
assert.equal(ids['day-jump'].children.length, 7);
assert.equal(ids['week-grid'].querySelectorAll('.time-cell').length, 48 * 7);
console.log('Calendar startup rendered seven dates and 336 time cells.');

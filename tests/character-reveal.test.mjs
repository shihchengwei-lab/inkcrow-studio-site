import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../src/app/character-reveal.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function browser({ saved = null, blocked = false } = {}) {
  const events = new Map();
  let stored = saved, changes = 0;
  const document = { hidden: false, documentElement: { scrollHeight: 4000 } };
  const window = { scrollY: 0, innerHeight: 800,
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: (name) => events.delete(name) };
  const context = { exports: {}, window, document, sessionStorage: {
    getItem: () => { if (blocked) throw Error("blocked"); return stored; },
    setItem: (_key, value) => { if (blocked) throw Error("blocked"); stored = value; },
  } };
  runInNewContext(code, context);
  return {
    document, window,
    mount: () => context.exports.subscribeFieldReturn(() => changes++),
    scroll(y) { window.scrollY = y; events.get("scroll")?.(); },
    get turned() { return context.exports.getFieldReturned(); },
    get changes() { return changes; }, get saved() { return stored; }, get listeners() { return events.size; },
  };
}

test("須先到底再回滾，頁中上捲、停在底部和小幅抖動都不解鎖", () => {
  const app = browser(); app.mount();
  app.scroll(1000); app.scroll(500); assert.equal(app.turned, false);
  app.scroll(3200); assert.equal(app.turned, false);
  app.scroll(3153); assert.equal(app.turned, false);
  app.scroll(3152); assert.equal(app.turned, true);
  app.scroll(0); app.scroll(3200);
  assert.equal(app.changes, 1); assert.equal(app.saved, "1"); assert.equal(app.listeners, 0);
});

test("到底同時改變頁面尺寸仍記錄到底，尺寸變化本身不冒充回滾", () => {
  const app = browser(); app.mount();
  app.document.documentElement.scrollHeight = 4200;
  app.scroll(3400); assert.equal(app.turned, false);
  app.window.innerHeight = 900;
  app.scroll(3300); assert.equal(app.turned, false);
  app.scroll(3252); assert.equal(app.turned, true);
});

test("背景捲動與不需要捲動的短頁不解鎖，卸載會移除監聽", () => {
  const app = browser(); const stop = app.mount();
  app.document.hidden = true; app.scroll(3200); app.scroll(3000);
  app.document.hidden = false; app.scroll(2500); assert.equal(app.turned, false);
  app.document.documentElement.scrollHeight = 800; app.scroll(0); app.scroll(-80);
  assert.equal(app.turned, false);
  stop(); assert.equal(app.listeners, 0);
});

test("同分頁重掛載與重新整理保留結果，儲存被阻擋仍保留文件內結果", () => {
  for (const blocked of [false, true]) {
    const app = browser({ blocked }); const stop = app.mount();
    app.scroll(3200); app.scroll(3100); stop(); app.mount();
    assert.equal(app.turned, true); assert.equal(app.listeners, 0);
    if (!blocked) {
      const reload = browser({ saved: app.saved }); reload.mount();
      assert.equal(reload.turned, true); assert.equal(reload.listeners, 0);
    }
  }
});

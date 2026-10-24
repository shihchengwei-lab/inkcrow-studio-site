import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../src/app/wish-progress.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function browser({ saved = null, hidden = false, storageBlocked = false } = {}) {
  let now = 0, nextId = 0, stored = saved;
  const timers = new Map(), styles = new Map(), pageEvents = new Map(), visibilityEvents = new Map();
  const document = { hidden, documentElement: { style: { setProperty: (k, v) => styles.set(k, v) } },
    addEventListener: (k, v) => visibilityEvents.set(k, v), removeEventListener: (k) => visibilityEvents.delete(k) };
  const context = { exports: {}, document, performance: { now: () => now },
    sessionStorage: {
      getItem: () => { if (storageBlocked) throw Error("blocked"); return stored; },
      setItem: (_k, v) => { if (storageBlocked) throw Error("blocked"); stored = v; },
    },
    clearTimeout: (id) => timers.delete(id),
    window: {
      setTimeout: (fn, delay) => { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
      addEventListener: (k, v) => pageEvents.set(k, v), removeEventListener: (k) => pageEvents.delete(k),
    },
  };
  runInNewContext(code, context);
  return {
    start: context.exports.startWishProgress,
    get effects() { return context.exports.getWishEffects(); },
    get pending() { return timers.size; },
    get saved() { return stored; },
    styles,
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        timers.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
    visibility(value) { document.hidden = value; visibilityEvents.get("visibilitychange")?.(); },
    pageEvent(name) { pageEvents.get(name)?.(); },
  };
}

test("30 秒前維持原效果，3 分鐘達上限並停止計時", () => {
  const app = browser(); const stop = app.start();
  app.advance(30_000); assert.equal(app.effects.strength, 0);
  app.advance(75_000); assert.equal(app.effects.strength, 0.5);
  app.advance(75_000); assert.equal(app.effects.strength, 1);
  assert.equal(app.effects.inkGain, 1.15);
  assert.equal(app.effects.smokeGain, 1.2);
  assert.equal(app.effects.logoOpacity, 0.22);
  assert.equal(app.pending, 0);
  app.advance(600_000); assert.equal(app.effects.visibleMs, 180_000);
  stop();
});

test("隱藏與 pagehide 都只記錄此前的可見時間，恢復後不補算背景時間", () => {
  const app = browser(); const stop = app.start();
  app.advance(40_250); app.visibility(true);
  assert.equal(app.effects.visibleMs, 40_250); assert.equal(app.pending, 0);
  app.advance(90_000); assert.equal(app.effects.visibleMs, 40_250);
  app.visibility(false); app.advance(1000); assert.equal(app.effects.visibleMs, 41_250);
  app.pageEvent("pagehide"); app.advance(60_000);
  assert.equal(app.effects.visibleMs, 41_250); assert.equal(app.pending, 0);
  app.pageEvent("pageshow"); app.pageEvent("pageshow");
  assert.equal(app.pending, 1);
  app.advance(1000); assert.equal(app.effects.visibleMs, 42_250);
  stop(); assert.equal(app.pending, 0);
});

test("同分頁重新掛載與重新載入保留進度，儲存受限時同文件也可接續", () => {
  for (const storageBlocked of [false, true]) {
    const app = browser({ storageBlocked });
    app.start()();
    const stop = app.start(); app.advance(50_500); stop();
    const resume = app.start(); app.advance(1000);
    assert.equal(app.effects.visibleMs, 51_500); assert.equal(app.pending, 1); resume();
    if (!storageBlocked) {
      const reload = browser({ saved: app.saved }); const close = reload.start();
      assert.equal(reload.effects.visibleMs, 51_500); close();
    }
  }
});

test("在背景載入不計時；無效儲存值不產生超量或無效進度", () => {
  for (const saved of ["NaN", "-100", "Infinity", "broken"]) {
    const app = browser({ saved, hidden: true }); const stop = app.start();
    app.advance(90_000); assert.equal(app.effects.visibleMs, 0); assert.equal(app.pending, 0);
    app.visibility(false); app.advance(1000); assert.equal(app.effects.visibleMs, 1000); stop();
  }
});

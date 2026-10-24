import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { InkFlow } from "../src/app/water-ink.ts";
import * as wishProgress from "../src/app/wish-progress.ts";

// 執行實際元件 effect 與物理場，只替換 DOM、時鐘與 GPU 邊界。
const source = readFileSync(new URL("../src/app/WaterInk.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText;

function mount() {
  let now = 1000, nextId = 0, draws = 0, disposals = 0, cleanup;
  const queue = new Map(), windowEvents = new Map(), documentEvents = new Map();
  const page = { clientWidth: 1440, scrollHeight: 4000 };
  const scene = { dataset: {}, style: { setProperty() {} }, parentElement: page };
  const canvas = { addEventListener() {}, removeEventListener() {} };
  const refs = [scene, canvas, null];
  const document = { hidden: false,
    addEventListener: (name, fn) => documentEvents.set(name, fn),
    removeEventListener: (name) => documentEvents.delete(name) };
  const sandbox = {
    exports: {}, document, performance: { now: () => now },
    sessionStorage: { getItem: () => "1", setItem() {} },
    window: { innerWidth: 1440, innerHeight: 900, scrollY: 0,
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      addEventListener: (name, fn) => windowEvents.set(name, fn),
      removeEventListener: (name) => windowEvents.delete(name) },
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: (fn) => { queue.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: (id) => queue.delete(id),
    require: (name) => name === "react" ? {
      useEffect: (fn) => { cleanup = fn(); }, useRef: () => ({ current: refs.shift() }),
    } : name === "react/jsx-runtime" ? { jsx() {}, jsxs() {} }
      : name === "./water-ink" ? {
        InkFlow, FORM_SECONDS: 5, INK_COLOR: [0, 0, 0], INK_HOMES: [],
        createInkRenderer: () => ({ draw() { draws++; return true; }, dispose() { disposals++; } }),
      } : name === "./wish-progress" ? wishProgress : {},
  };
  runInNewContext(code, sandbox);
  sandbox.exports.default();
  return {
    scene,
    advance(ms, gesture = true) {
      now += ms;
      if (gesture) for (const x of [100, 130]) windowEvents.get("pointermove")?.({
        pointerType: "mouse", pointerId: 1, clientX: x, clientY: 200,
      });
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((fn) => fn(now));
    },
    visibility(hidden) { document.hidden = hidden; documentEvents.get("visibilitychange")(); },
    get draws() { return draws; }, get disposals() { return disposals; },
    get scheduled() { return queue.size; },
    unmount() { cleanup(); },
  };
}

for (const frameMs of [100, 250, 300]) {
  test(`持續 ${frameMs}ms 慢幀先降低細節，再轉靜態並停止排程`, () => {
    const app = mount();
    let sawLow = false;
    for (let i = 0; i < 220; i++) {
      app.advance(frameMs);
      sawLow ||= app.scene.dataset.quality === "low" && app.scene.dataset.mode === "dynamic";
    }
    assert.equal(sawLow, true);
    assert.equal(app.scene.dataset.mode, "static");
    assert.equal(app.scheduled, 0);
    assert.equal(app.disposals, 1);
    app.unmount();
    assert.equal(app.disposals, 1);
  });
}

test("正常幀率與隱藏後的長時間恢復，不會誤觸降級", () => {
  const app = mount();
  for (let cycle = 0; cycle < 4; cycle++) {
    for (let i = 0; i < 90; i++) app.advance(33.4);
    app.visibility(true);
    const before = app.draws;
    app.advance(60_000, false);
    assert.equal(app.draws, before);
    assert.equal(app.scheduled, 0);
    app.visibility(false);
    // 恢復後第一幀也可能延遲；只這一幀略過，不依間隔大小猜測休眠。
    app.advance(300);
    assert.equal(app.scene.dataset.mode, "dynamic");
    assert.equal(app.scene.dataset.quality, "full");
  }
  app.unmount();
  assert.equal(app.scheduled, 0);
});

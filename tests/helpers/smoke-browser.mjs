import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// 執行正式控制器、模擬與繪製；只替換瀏覽器、時間和願力輸入。
export function mountSmoke(sourcePath = fileURLToPath(new URL("../../src/app/smoke.ts", import.meta.url))) {
  let now = 1000, id = 0, draws = 0, commands = [], cleanup;
  let intersection, resize, wish = { strength: 0, smokeGain: 1, smokeWidth: 1 };
  const frames = new Map(), windowEvents = new Map(), documentEvents = new Map(), hostEvents = new Map();
  const options = new Map();
  const bounds = { left: 100, top: 100, width: 300, height: 300 };
  const record = (name, ...args) => commands.push([name, ...args]);
  const timeline = createHash("sha256");
  const ctx = new Proxy({
    clearRect(...args) { commands = []; draws++; record("clearRect", ...args); },
    beginPath() { record("beginPath"); }, moveTo(...a) { record("moveTo", ...a); },
    quadraticCurveTo(...a) { record("quadraticCurveTo", ...a); }, stroke() { record("stroke"); },
    fillRect(...a) { record("fillRect", ...a); },
    createLinearGradient(...a) { record("gradient", ...a); return { addColorStop(...a) { record("colorStop", ...a); } }; },
  }, { set(target, key, value) { record(key, typeof value === "object" ? "gradient" : value); target[key] = value; return true; } });
  const host = { getBoundingClientRect: () => bounds,
    addEventListener: (name, fn) => hostEvents.set(name, fn), removeEventListener: name => hostEvents.delete(name) };
  const canvas = { parentElement: host, width: 0, height: 0, style: {}, getContext: () => ctx };
  const document = { hidden: false, querySelector: () => canvas,
    addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
  const globals = { document, performance: { now: () => now },
    window: { devicePixelRatio: 2,
      addEventListener(name, fn, opt) { windowEvents.set(name, fn); options.set(name, opt); },
      removeEventListener: name => windowEvents.delete(name) },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} },
  };
  const cache = new Map();
  const load = path => {
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const sandbox = { ...globals, exports, require: name => name === "./wish-progress"
      ? { getWishEffects: () => wish } : load(resolve(dirname(path), name + ".ts")) };
    runInNewContext(code, sandbox);
    cache.set(path, exports);
    return exports;
  };
  cleanup = load(sourcePath).setupSmoke();
  return {
    canvas, options,
    get draws() { return draws; }, get pending() { return frames.size; },
    get listeners() { return windowEvents.size + documentEvents.size + hostEvents.size; },
    get digest() { return timeline.copy().digest("hex"); },
    get segments() { return commands.filter(c => c[0] === "stroke").length; },
    visible(value) { intersection([{ isIntersecting: value }]); },
    hidden(value) { document.hidden = value; documentEvents.get("visibilitychange")?.(); },
    wish(strength) { wish = { strength, smokeGain: 1 + strength * .2, smokeWidth: 1 + strength * .08 }; },
    advance(ms = 34) {
      now += ms;
      const before = draws;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
      if (draws !== before) timeline.update(JSON.stringify({ at: now, commands }));
    },
    move(x, y, pointerId = 1) { windowEvents.get("pointermove")?.({ clientX: x, clientY: y, pointerId, pointerType: "mouse" }); },
    touch(name, touches) { windowEvents.get(name)?.({ touches }); },
    leave() { hostEvents.get("pointerleave")?.(); },
    resize(width, height = width) { bounds.width = width; bounds.height = height; resize(); },
    scroll(top) { bounds.top = top; },
    unmount() { cleanup(); },
    // 故意送出卸載後才到達的 observer 回呼，驗證不再恢復繪製。
    lateObservers() { intersection([{ isIntersecting: true }]); resize(); },
  };
}

export function smokeScenario(mode, sourcePath) {
  const app = mountSmoke(sourcePath);
  app.visible(true);
  for (let frame = 0; frame < 120; frame++) {
    if (mode !== "still" && frame === 45) app.wish(1);
    if (mode === "gesture" && frame >= 60 && frame < 85) app.move(185 + (frame - 60) * 2, 140);
    if (mode === "gesture" && frame === 90) app.resize(360);
    app.advance();
  }
  const result = { digest: app.digest, segments: app.segments };
  app.unmount();
  return result;
}

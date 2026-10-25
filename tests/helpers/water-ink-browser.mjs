import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { FlowTexture } from "../../src/app/water-ink/flow-texture.ts";

const entry = fileURLToPath(new URL("../../src/app/WaterInk.tsx", import.meta.url));

// 執行實際元件、控制器與墨流，只替換瀏覽器、時鐘及 GPU。
// sourcePath 也可指向修改前來源，用同一組輸入建立保留行為的基準。
export function mountWater({ sourcePath = entry, seen = true, reduced = false, storageBlocked = false, noRenderer = false } = {}) {
  let now = 1000, nextId = 0, draws = 0, disposals = 0, creates = 0, cleanup, resize;
  let refs = [], refIndex = 0, failDraw = false, wishListener;
  let wish = { inkGain: 1, inkSpread: 1 };
  const queue = new Map(), windowEvents = new Map(), documentEvents = new Map(), canvasEvents = new Map(), options = new Map();
  const storage = new Map(seen ? [["water-ink-seen", "1"]] : []);
  const page = { clientWidth: 1440, scrollHeight: 4000 };
  const scene = { dataset: {}, style: { setProperty(name, value) { this[name] = value; } }, parentElement: page };
  const canvas = { addEventListener: (name, fn) => canvasEvents.set(name, fn), removeEventListener: name => canvasEvents.delete(name) };
  let motionChange;
  const motion = { matches: reduced, addEventListener: (_, fn) => { motionChange = fn; }, removeEventListener: () => { motionChange = undefined; } };
  const document = { hidden: false, addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
  const window = { innerWidth: 1440, innerHeight: 900, scrollY: 0, matchMedia: () => motion,
    addEventListener(name, fn, opt) { windowEvents.set(name, fn); options.set(name, opt); }, removeEventListener: name => windowEvents.delete(name) };
  const timeline = createHash("sha256"), drawLog = [];
  const fakeRenderer = () => {
    creates++;
    if (noRenderer) return null;
    const texture = new FlowTexture();
    return {
      draw(field, ...params) {
        draws++;
        const pixels = field.pixels ?? texture.encode(field);
        const snapshot = { at: now, pixels: createHash("sha256").update(pixels).digest("hex"), params };
        drawLog.push(snapshot); timeline.update(JSON.stringify(snapshot));
        return !failDraw;
      },
      dispose() { disposals++; },
    };
  };
  const globals = {
    document, window, performance: { now: () => now },
    sessionStorage: { getItem(key) { if (storageBlocked) throw Error("blocked"); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw Error("blocked"); storage.set(key, value); } },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} },
    requestAnimationFrame: fn => { queue.set(++nextId, fn); return nextId; }, cancelAnimationFrame: id => queue.delete(id),
  };
  const wishProgress = { getWishEffects: () => wish, subscribeWishProgress(fn) { wishListener = fn; return () => { wishListener = undefined; }; } };
  const cache = new Map();
  const load = path => {
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const require = name => {
      if (name === "react") return {
        useEffect(fn) { cleanup = fn(); },
        useRef(initial) { const i = refIndex++; return refs[i] ??= { current: i === 0 ? scene : i === 1 ? canvas : initial }; },
      };
      if (name === "react/jsx-runtime") return { jsx() {}, jsxs() {} };
      if (name.endsWith(".css")) return {};
      if (name.endsWith("wish-progress")) return wishProgress;
      if (name === "./renderer") return { createInkRenderer: fakeRenderer };
      const loaded = load(resolve(dirname(path), name + ".ts"));
      return name === "./water-ink" ? { ...loaded, createInkRenderer: fakeRenderer } : loaded;
    };
    runInNewContext(code, { ...globals, exports, require });
    cache.set(path, exports);
    return exports;
  };
  const render = () => { refIndex = 0; load(sourcePath).default(); };
  render();
  const move = (x, y, id = 1) => windowEvents.get("pointermove")?.({ pointerType: "mouse", pointerId: id, clientX: x, clientY: y });
  return {
    scene, page, canvas, options, drawLog,
    get draws() { return draws; }, get disposals() { return disposals; }, get creates() { return creates; },
    get scheduled() { return queue.size; }, get digest() { return timeline.copy().digest("hex"); },
    get listeners() { return windowEvents.size + documentEvents.size + canvasEvents.size + Number(!!motionChange) + Number(!!wishListener); },
    move,
    touch(name, touches) { windowEvents.get(name)?.({ touches }); },
    scroll(y) { window.scrollY = y; windowEvents.get("scroll")?.(); },
    wish(gain, spread) { wish = { inkGain: gain, inkSpread: spread }; wishListener?.(); },
    advance(ms, gesture = true) {
      now += ms;
      if (gesture) { move(100, 200); move(130, 200); }
      const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(fn => fn(now));
    },
    visibility(hidden) { document.hidden = hidden; documentEvents.get("visibilitychange")?.(); },
    motion(reduce) { motion.matches = reduce; motionChange?.(); },
    resize(width, height) { page.clientWidth = window.innerWidth = width; page.scrollHeight = height; resize?.(); },
    lost() { canvasEvents.get("webglcontextlost")?.({ preventDefault() {} }); },
    failDraw() { failDraw = true; },
    restartEffect() { cleanup(); render(); },
    remount() { cleanup(); refs = []; render(); },
    lateResize() { resize?.(); },
    unmount() { cleanup(); },
  };
}

export function waterScenario(mode, sourcePath) {
  const app = mountWater({ sourcePath, seen: mode !== "intro" });
  for (let i = 0; i < 360; i++) {
    if (mode === "gesture" || mode === "intro") {
      if (i >= 12 && i < 42) app.move(100 + i * 3, 200 + i, 1);
      if (i === 60) app.scroll(300);
      if (i === 80) app.wish(1.15, 2.3);
    }
    if (mode === "resume") {
      if (i === 20) app.visibility(true);
      if (i === 22) app.visibility(false);
      if (i === 60) app.resize(390, 6000);
    }
    app.advance(mode === "slow" ? 100 : mode === "resume" && i === 21 ? 60_000 : 33.4, mode === "slow" || mode === "resume");
  }
  const result = { digest: app.digest, draws: app.draws, phase: app.scene.dataset.phase, mode: app.scene.dataset.mode };
  app.unmount();
  return result;
}

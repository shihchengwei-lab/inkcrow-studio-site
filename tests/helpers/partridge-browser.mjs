import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const entry = fileURLToPath(new URL("../../src/app/partridge.ts", import.meta.url));

// 執行正式控制器與模型；只替換元素量測、瀏覽器事件和排程。
export function mountPartridge(sourcePath = entry) {
  let now = 1000, id = 0, intersection, resize, fontsReady;
  const frames = new Map(), timers = new Map(), windowEvents = new Map(), documentEvents = new Map(), birdEvents = new Map();
  const area = { left: 100, top: 200, width: 1000 };
  let birdWidth = 110, reservedRight = 800;
  const art = { style: {} }, bird = {
    style: {}, dataset: {},
    get offsetWidth() { return birdWidth; },
    get offsetLeft() { return area.width - birdWidth; },
    getBoundingClientRect() {
      const pose = readPose();
      const left = area.left + this.offsetLeft + pose.x, top = area.top + 40 - birdWidth / 2 + pose.y;
      return { left, top, width: birdWidth, height: birdWidth, right: left + birdWidth, bottom: top + birdWidth };
    },
    querySelector: () => art,
    addEventListener: (name, fn) => birdEvents.set(name, fn), removeEventListener: name => birdEvents.delete(name),
  };
  const link = { getBoundingClientRect: () => ({ right: reservedRight }) };
  const perch = { getBoundingClientRect: () => ({ ...area, right: area.left + area.width }),
    querySelectorAll: () => [link], querySelector: () => null };
  bird.parentElement = perch;
  const readPose = () => {
    const coordinates = bird.style.transform?.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
    return { x: coordinates ? Number(coordinates[1]) : 0, y: coordinates ? Number(coordinates[2]) : 0,
      frame: parseFloat(art.style.backgroundPositionY || "0"), kind: bird.dataset.state,
      hidden: bird.style.visibility === "hidden" };
  };
  const document = { hidden: false, querySelector: () => bird, fonts: { ready: { then(fn) { fontsReady = fn; } } },
    addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
  const window = { innerWidth: 1440, setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) };
  const globals = { document, window, performance: { now: () => now },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    clearTimeout: id => timers.delete(id),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} },
  };
  const cache = new Map();
  const load = path => {
    if (cache.has(path)) return cache.get(path);
    if (path.endsWith(".json")) return JSON.parse(readFileSync(path, "utf8"));
    const exports = {};
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    runInNewContext(code, { ...globals, exports, require: name => load(resolve(dirname(path), name.endsWith(".json") ? name : name + ".ts")) });
    cache.set(path, exports);
    return exports;
  };
  const cleanup = load(sourcePath).setupPartridge();
  const timeline = createHash("sha256"), samples = [];
  const record = () => {
    const snapshot = { at: now, pose: readPose(), frames: frames.size, timers: [...timers.values()].map(t => t.at) };
    samples.push(snapshot); timeline.update(JSON.stringify(snapshot));
  };
  record();
  return {
    bird, samples,
    get pose() { return readPose(); }, get rect() { return bird.getBoundingClientRect(); },
    get scheduledFrames() { return frames.size; }, get scheduledTimers() { return timers.size; },
    get remaining() { return [...timers.values()].map(t => t.at - now); },
    get digest() { return timeline.copy().digest("hex"); },
    get listeners() { return windowEvents.size + documentEvents.size + birdEvents.size; },
    visible(value) { intersection([{ isIntersecting: value }]); record(); },
    hidden(value) { document.hidden = value; documentEvents.get("visibilitychange")?.(); record(); },
    move(x, y, pointerType = "mouse") { windowEvents.get("pointermove")?.({ clientX: x, clientY: y, pointerType }); record(); },
    leave() { documentEvents.get("pointerleave")?.(); record(); },
    click(x = 0, detail = 1) { birdEvents.get("click")?.({ clientX: x, detail }); record(); },
    resize({ width = area.width, size = birdWidth, right = reservedRight } = {}) {
      area.width = width; birdWidth = size; reservedRight = right; resize(); record();
    },
    fontsReady() { fontsReady(); record(); },
    advance(ms = 16, processingLag = 0) {
      const target = now + ms;
      for (let count = 0; count < 1000; count++) {
        const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].fn();
      }
      now = target + processingLag;
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(target));
      record();
    },
    unmount() { cleanup(); record(); },
    lateCallbacks() { intersection([{ isIntersecting: true }]); resize(); fontsReady(); record(); },
  };
}

export function partridgeScenario(mode, sourcePath) {
  const app = mountPartridge(sourcePath);
  app.visible(true);
  const approach = () => {
    const rect = app.rect; app.move(rect.left + rect.width * 0.2, rect.top + rect.height / 2);
  };
  const click = () => { const rect = app.rect; app.click(rect.left + rect.width / 2); };
  for (let i = 0; i < 600; i++) {
    if (mode === "click") {
      if (i === 10 || i === 12 || i === 14 || i === 85) click();
      if (i === 100 || i === 200) app.click(0, 0);
    }
    if (mode === "avoid") {
      if (i === 10 || i === 80 || i === 150 || i === 250) approach();
      if (i === 20 || i === 21) click();
      if (i === 65 || i === 130) app.leave();
    }
    if (mode === "resume") {
      if (i === 10 || i === 120 || i === 190 || i === 220) app.click(0, 0);
      if (i === 20) app.visible(false);
      if (i === 50) app.visible(true);
      if (i === 80) app.hidden(true);
      if (i === 110) app.hidden(false);
      if (i === 130) app.fontsReady();
      if (i === 160) app.resize({ size: 0 });
      if (i === 180) app.resize({ size: 110 });
      if (i === 200) app.resize({ width: 960, right: 920 });
    }
    app.advance(16, mode === "click" ? 2 : 0);
  }
  const result = { digest: app.digest, pose: app.pose };
  app.unmount();
  return result;
}

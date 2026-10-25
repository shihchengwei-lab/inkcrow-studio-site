import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { moduleLoader } from "./load-module.mjs";
const entry = fileURLToPath(new URL("../../src/app/butterfly.ts", import.meta.url));
export function mountButterfly(sourcePath = entry) {
  let now = 1000, id = 0, intersection, resize, size = 100;
  const frames = new Map(), timers = new Map(), we = new Map(), de = new Map();
  const areaRect = { left: 140, top: 100 }, pose = { style: {} }, left = { style: {} }, right = { style: {} };
  const title = { parentElement: { offsetLeft: 720 } };
  const area = { clientHeight: 600, getBoundingClientRect: () => areaRect, querySelector: s => s === ".work-title" ? title : {} };
  const host = { parentElement: area, style: {}, dataset: {}, offsetLeft: 0, offsetTop: 0,
    get offsetWidth() { return size; }, querySelector: s => s === ".butterfly-pose" ? pose : s === ".butterfly-wing-left" ? left : right };
  const document = { hidden: false, querySelector: () => host,
    createRange: () => ({ selectNodeContents() {}, getBoundingClientRect: () => ({ bottom: areaRect.top + 40 }) }),
    addEventListener: (k, f) => de.set(k, f), removeEventListener: k => de.delete(k) };
  const window = { setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    addEventListener: (k, f) => we.set(k, f), removeEventListener: k => we.delete(k) };
  const load = moduleLoader({ document, window, performance: { now: () => now },
    clearTimeout: id => timers.delete(id), requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() {} } });
  const cleanup = load(sourcePath).setupButterfly();
  const hash = createHash("sha256"), states = new Set();
  const record = () => { states.add(host.dataset.state); hash.update(JSON.stringify({ now, style: host.style, pose: pose.style, left: left.style, right: right.style,
    data: host.dataset, frames: frames.size, timers: [...timers.values()].map(t => t.at) })); };
  record();
  return { host, states, get digest() { return hash.copy().digest("hex"); }, get frames() { return frames.size; }, get timers() { return timers.size; },
    get listeners() { return we.size + de.size; },
    visible(on) { intersection([{ isIntersecting: on }]); record(); },
    hidden(on) { document.hidden = on; de.get("visibilitychange")?.(); record(); },
    move(x, y, pointerType = "mouse") { we.get("pointermove")?.({ clientX: x, clientY: y, pointerType }); record(); },
    approach(dx = 30, dy = 0, pointerType = "mouse") {
      const xy = host.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
      this.move(areaRect.left + Number(xy[1]) + size / 2 + dx, areaRect.top + Number(xy[2]) + size / 2 + dy, pointerType);
    },
    leave() { de.get("pointerleave")?.(); record(); },
    scroll(y) { areaRect.top = y; we.get("scroll")?.(); record(); },
    resize(width = size) { size = width; resize(); record(); },
    advance(ms = 16) {
      const end = now + ms;
      for (let i = 0; i < 1000; i++) {
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].fn();
      }
      now = end; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); record();
    },
    unmount() { cleanup(); record(); }, lateCallbacks() { intersection([{ isIntersecting: true }]); resize(); }
  };
}
export function butterflyScenario(mode, path) {
  const app = mountButterfly(path); app.visible(true);
  for (let i = 0; i < 2400; i++) {
    if (mode === "threat") {
      if ([30,80,600,850].includes(i)) app.approach(110);
      if ([32,90,610,900].includes(i)) app.approach(20);
      if ([120,650,950].includes(i)) app.leave();
      if (i === 700) app.scroll(-150);
    }
    if (mode === "resume") {
      if (i === 15) app.approach();
      if (i === 40) app.visible(false);
      if (i === 80) app.visible(true);
      if (i === 100) app.hidden(true);
      if (i === 160) app.hidden(false);
      if (i === 200) app.resize(0);
      if (i === 240) app.resize(80);
      if (i === 500) app.resize(110);
    }
    if (mode === "touch" && i % 30 === 0) app.approach(0, 0, "touch");
    app.advance(mode === "slow" ? 120 : 16);
  }
  const result = { digest: app.digest, states: [...app.states] }; app.unmount(); return result;
}

import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { moduleLoader } from "./load-module.mjs";
const entry = fileURLToPath(new URL("../../src/app/ink-title.ts", import.meta.url));
export function mountTitle(sourcePath = entry) {
  let now = 1000, id = 0;
  const frames = new Map();
  const node = () => ({ attrs: {}, style: {}, events: new Map(),
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(k, f) { this.events.set(k, f); }, removeEventListener(k) { this.events.delete(k); } });
  const chars = [node(), node()], blurs = [node(), node()], mats = [node(), node()];
  const load = moduleLoader({ performance: { now: () => now },
    document: { querySelectorAll: () => chars, getElementById: id => (id.includes("blur") ? blurs : mats)[Number(id.at(-1))] },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id) });
  const api = load(sourcePath);
  const cleanup = api.setupInk ? api.setupInk() : (() => {
    const cleanups = chars.map((el, i) => api.setupInkCharacter(el, blurs[i], mats[i], `ink-bleed-${i}`));
    return () => cleanups.forEach(fn => fn());
  })();
  const hash = createHash("sha256");
  const record = () => hash.update(JSON.stringify({ now, frames: frames.size, chars: chars.map((el, i) => ({ style: el.style, blur: blurs[i].attrs, mat: mats[i].attrs })) }));
  return { chars, get frames() { return frames.size; }, get digest() { return hash.copy().digest("hex"); },
    event(i, name) { chars[i].events.get(name)?.(); record(); },
    advance(ms = 16) { now += ms; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); record(); },
    unmount() { cleanup(); record(); } };
}
export function titleScenario(mode, path) {
  const app = mountTitle(path);
  for (let i = 0; i < 400; i++) {
    if (i === 0) app.event(0, "pointerenter");
    if (i === 25) app.event(1, "pointerenter");
    if (i === 100) app.event(0, "pointerleave");
    if (i === 150) app.event(1, "pointercancel");
    if (mode === "interrupt" && i === 120) app.event(0, "pointerenter");
    if (mode === "interrupt" && i === 140) app.event(0, "pointercancel");
    if (mode === "cleanup" && i === 50) app.unmount();
    app.advance(mode === "slow" ? 120 : 16);
  }
  const digest = app.digest; app.unmount(); return digest;
}

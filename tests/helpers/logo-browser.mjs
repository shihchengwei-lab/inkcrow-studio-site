import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { moduleLoader } from "./load-module.mjs";
const entry = fileURLToPath(new URL("../../src/app/StudioLogo.tsx", import.meta.url));
export function mountLogo({ sourcePath = entry, seen = false, reduced = false, blocked = false } = {}) {
  let now = 1000, id = 0, observer, decodeOK, decodeFail, effect, cleanup, refIndex = 0;
  const frames = new Map(), events = new Map(), de = new Map(), we = new Map(), me = new Map(), saved = new Map(seen ? [["inkcrow-logo-seen", "1"]] : []);
  const style = { setProperty(k,v) { this[k] = v; }, removeProperty(k) { delete this[k]; } };
  const node = () => ({ attrs: {}, setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } });
  const root = node(), rise = node(), ring = node(), dots = { children: [node(), node()] };
  const host = { dataset: { phase: "waiting" }, style, getBoundingClientRect: () => ({ left: 100, top: 50 }),
    addEventListener: (k,f) => events.set(k,f), removeEventListener: k => events.delete(k) };
  const image = { decode: () => ({ then(ok,fail) { decodeOK=ok; decodeFail=fail; } }) };
  const refs = [host, image, rise, ring, dots].map(current => ({ current }));
  const document = { documentElement: root, hidden: false, addEventListener: (k,f) => de.set(k,f), removeEventListener: k => de.delete(k) };
  const motion = { matches: reduced, addEventListener: (k,f) => me.set(k,f), removeEventListener: k => me.delete(k) };
  const storage = { getItem(k) { if(blocked) throw Error("blocked"); return saved.get(k) ?? null; }, setItem(k,v) { if(blocked) throw Error("blocked"); saved.set(k,v); } };
  const load = moduleLoader({ document, sessionStorage: storage, matchMedia: () => motion,
    window: { addEventListener: (k,f) => we.set(k,f), removeEventListener: k => we.delete(k) },
    performance: { now: () => now }, requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { observer=fn; } observe() {} disconnect() {} } },
    { react: { useRef(value) { const i=refIndex++; return refs[i] ?? (refs[i]={ current:value }); }, useEffect(fn) { effect=fn; } },
      "react/jsx-runtime": { jsx() {}, jsxs() {} } });
  load(sourcePath).default(); cleanup=effect();
  const hash = createHash("sha256"), snapshots=[];
  const record = () => { const snapshot = { now, frames: frames.size, data: host.dataset, style, root: root.attrs,
    rise: rise.attrs, ring: ring.attrs, dots: dots.children.map(d => d.attrs), saved: [...saved] };
    const json=JSON.stringify(snapshot); snapshots.push(JSON.parse(json)); hash.update(json); };
  record();
  return { host, snapshots, saved, get digest() { return hash.copy().digest("hex"); }, get frames() { return frames.size; },
    get listeners() { return events.size+de.size+we.size+me.size; },
    decode(ok=true) { (ok ? decodeOK : decodeFail)(); record(); },
    visible(on) { observer([{ isIntersecting: on, intersectionRatio: on ? 1 : 0 }]); record(); },
    hidden(on) { document.hidden=on; de.get("visibilitychange")?.(); record(); },
    motion(on) { motion.matches=on; me.get("change")?.(); record(); },
    click() { events.get("click")?.(); record(); },
    move(x=200,y=120,pointerType="mouse") { events.get("pointermove")?.({ clientX:x,clientY:y,pointerType }); record(); },
    leave() { events.get("pointerleave")?.(); record(); },
    advance(ms=16) { now+=ms; const batch=[...frames.values()]; frames.clear(); batch.forEach(fn=>fn(now)); record(); },
    unmount() { cleanup(); record(); }, remountEffect() { cleanup(); cleanup=effect(); record(); }
  };
}
export function logoScenario(mode, sourcePath) {
  const app=mountLogo({sourcePath,seen:mode==="seen",blocked:mode==="blocked",reduced:mode==="reduced"});
  app.visible(true); app.decode(mode!=="failed");
  for(let i=0;i<650;i++) {
    if(mode==="resume") {
      if(i===20) app.visible(false);
      if(i===80) app.visible(true);
      if(i===110) app.hidden(true);
      if(i===160) app.hidden(false);
      if(i===180) app.remountEffect();
      if(i===181) {app.visible(true);app.decode();}
    }
    if(mode==="motion" && i===30) app.motion(true);
    if(mode==="motion" && i===60) app.motion(false);
    if(i===260 || i===275) app.click();
    if(i===400) app.move();
    if(i===410) app.move(250,140);
    if(i===460) app.leave();
    app.advance(mode==="slow" ? 120 : 16);
  }
  app.unmount(); return app.digest;
}

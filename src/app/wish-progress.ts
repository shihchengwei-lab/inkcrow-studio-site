const STORAGE_KEY = "inkcrow-wish-visible-ms";
const START_MS = 30_000;
const LIMIT_MS = 180_000;

function effectsAt(elapsed: number) {
  const visibleMs = Math.min(LIMIT_MS, Math.max(0, elapsed));
  const strength = Math.max(0, (visibleMs - START_MS) / (LIMIT_MS - START_MS));
  return { visibleMs, strength, inkGain: 1 + strength * 0.15, inkSpread: 1 + strength * 1.3,
    smokeGain: 1 + strength * 0.2, smokeWidth: 1 + strength * 0.08,
    logoOpacity: strength * 0.22 };
}

let current = effectsAt(0);
const listeners = new Set<() => void>();
export const getWishEffects = () => current;
export function subscribeWishProgress(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// 唯一的可見停留計時器，由共用 root layout 掛載，切換條款頁不重建。
export function startWishProgress() {
  let elapsed = current.visibleMs;
  try {
    const saved = Number(sessionStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= 0) elapsed = Math.max(elapsed, Math.min(LIMIT_MS, saved));
  } catch { /* 儲存受限時，同一份文件仍保留進度。 */ }
  let since: number | null = null;
  let timer = 0;
  const publish = () => {
    const next = effectsAt(elapsed);
    const changed = next.strength !== current.strength;
    current = next;
    const style = document.documentElement.style;
    style.setProperty("--wish-strength", String(current.strength));
    style.setProperty("--wish-ink-gain", String(current.inkGain));
    style.setProperty("--wish-ink-spread", String(current.inkSpread));
    style.setProperty("--wish-logo-opacity", String(current.logoOpacity));
    if (changed) listeners.forEach((listener) => listener());
  };
  const record = () => {
    if (since !== null) {
      const now = performance.now();
      elapsed = Math.min(LIMIT_MS, elapsed + Math.max(0, now - since));
      since = elapsed < LIMIT_MS ? now : null;
    }
    publish();
    try { sessionStorage.setItem(STORAGE_KEY, String(elapsed)); } catch { /* 不影響視覺。 */ }
  };
  const tick = () => {
    timer = 0;
    record();
    if (!document.hidden && elapsed < LIMIT_MS) timer = window.setTimeout(tick, 1000);
  };
  const pause = () => {
    clearTimeout(timer);
    timer = 0;
    record();
    since = null;
  };
  const resume = () => {
    if (document.hidden || elapsed >= LIMIT_MS || timer) return;
    since = performance.now();
    timer = window.setTimeout(tick, 1000);
  };
  const visibility = () => { pause(); resume(); };
  publish();
  resume();
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", resume);
  return () => {
    pause();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", resume);
  };
}

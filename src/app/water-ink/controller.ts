import { createInkRenderer } from "./renderer";
import { FORM_SECONDS } from "./composition";
import { InkFlow } from "./model";
import { getWishEffects, subscribeWishProgress } from "../wish-progress";

// 此記錄由元件持有，跨 effect 重建存續；started 不等於仍在成形。
export type IntroPlayback = { kind: "pending" } | { kind: "started"; at: number } | { kind: "skipped" };

// 觀看記錄只由實際掛載的首頁水墨消耗；儲存不可用時仍維持本頁文件內只播一次。
let visitClaimed = false;
function claimFirstVisit() {
  if (visitClaimed) return false;
  visitClaimed = true;
  try {
    const seen = sessionStorage.getItem("water-ink-seen") === "1";
    sessionStorage.setItem("water-ink-seen", "1");
    return !seen;
  } catch { return true; }
}

export function setupWaterInk(
  scene: HTMLDivElement,
  canvas: HTMLCanvasElement,
  page: HTMLElement,
  playback: { current: IntroPlayback },
): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cleanup = () => {};

  const setup = () => {
    cleanup();
    scene.dataset.mode = "static";
    if (playback.current.kind === "pending") {
      const firstVisit = claimFirstVisit();
      playback.current = !motion.matches && firstVisit ? { kind: "started", at: performance.now() } : { kind: "skipped" };
    }
    if (motion.matches) return;
    const renderer = createInkRenderer(canvas);
    if (!renderer) return;

    let status: "running" | "static" | "disposed" = "running";
    let raf = 0;
    let lastFrame: number | null = null;
    let animationSeconds = 0;
    let slowFrames = 0;
    let sampledFrames = 0;
    let scale = Math.min(1, Math.sqrt(850_000 / (window.innerWidth * window.innerHeight)));
    let quality: "full" | "low" = "full";
    let field = new InkFlow(page.clientWidth, page.scrollHeight);
    let flowing = false;
    let forming = playback.current.kind === "started";
    let previous: { x: number; y: number; at: number; id: number } | null = null;
    let touchId: number | null = null;
    scene.dataset.quality = quality;

    const fallBack = () => {
      if (status !== "running") return;
      status = "static";
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      scene.dataset.mode = "static";
      scene.dataset.phase = "still";
      renderer.dispose();
    };

    const frame = (now: number) => {
      raf = 0;
      if (status !== "running" || document.hidden) return;
      const continuing = lastFrame !== null;
      const elapsed = lastFrame === null ? 33.3 : now - lastFrame;
      // 最高每秒 30 次，紙墨安定後不再常駐繪製。
      if (continuing && elapsed < 30) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrame = now;
      const dt = Math.min(elapsed / 1000, 0.06);
      animationSeconds += dt;
      if (flowing) flowing = field.step(dt);
      const introTime = playback.current.kind === "started" ? (now - playback.current.at) / 1000 : FORM_SECONDS;
      const progress = Math.min(1, Math.max(0, introTime / FORM_SECONDS));
      const intro = 1 - progress * progress * (3 - 2 * progress);
      forming = intro > 0;
      const maxScroll = Math.max(1, page.scrollHeight - window.innerHeight);
      const age = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      scene.style.setProperty("--paper-age", String(age * age * (3 - 2 * age)));
      const wish = getWishEffects();
      if (!renderer.draw(field, window.innerHeight, window.scrollY, intro, scale, wish.inkGain, wish.inkSpread)) {
        fallBack();
        return;
      }
      scene.dataset.mode = "dynamic";
      scene.dataset.phase = forming ? "forming" : flowing ? "flowing" : "still";

      // 只觀察可見分頁中連續活動的畫面；載入與休眠後第一幀不計。
      if (continuing && (forming || flowing) && animationSeconds > 1.5) {
        sampledFrames++;
        if (elapsed > 55) slowFrames++;
        if (sampledFrames >= 75) {
          if (slowFrames / sampledFrames > 0.45) {
            if (quality === "full") {
              quality = "low";
              scale *= 0.65;
              scene.dataset.quality = quality;
            } else {
              fallBack();
              return;
            }
          }
          sampledFrames = slowFrames = 0;
        }
      }
      if (forming || flowing) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (status !== "running" || document.hidden || raf) return;
      lastFrame = null;
      raf = requestAnimationFrame(frame);
    };
    const move = (x: number, y: number, id: number) => {
      if (status !== "running") return;
      const now = performance.now();
      if (previous && previous.id === id && now - previous.at < 180) {
        // 速度只看螢幕上的手勢差，不把 scrollY 的變化加進去。
        const dx = x - previous.x;
        const dy = y - previous.y;
        flowing = field.disturb(x, y + window.scrollY, dx, dy) || flowing;
        if (flowing) wake();
      }
      previous = { x, y, at: now, id };
    };
    const pointerMove = (event: PointerEvent) => {
      // 原生捲動開始時 pointer 可能取消，觸控獨立使用被動 touchmove。
      if (event.pointerType !== "touch") move(event.clientX, event.clientY, event.pointerId);
    };
    const touchStart = (event: TouchEvent) => {
      if (touchId !== null || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchId = touch.identifier;
      previous = { x: touch.clientX, y: touch.clientY, at: performance.now(), id: touchId };
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) { previous = null; return; }
      const touch = Array.from(event.touches).find((t) => t.identifier === touchId);
      if (touch) move(touch.clientX, touch.clientY, touch.identifier);
    };
    const touchEnd = (event: TouchEvent) => {
      if (!Array.from(event.touches).some((t) => t.identifier === touchId)) {
        touchId = null;
        previous = null;
      }
    };
    const leave = () => { previous = null; };
    const resize = () => {
      if (status !== "running") return;
      if (page.clientWidth !== field.width || page.scrollHeight !== field.height) {
        field = new InkFlow(page.clientWidth, page.scrollHeight);
        flowing = false;
      }
      wake();
    };
    const visibility = () => {
      if (status !== "running") return;
      previous = null;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = null;
      } else {
        sampledFrames = slowFrames = 0;
        wake();
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      fallBack();
    };
    const observer = new ResizeObserver(resize);
    const unsubscribeWish = subscribeWishProgress(wake);
    observer.observe(page);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", lost);
    wake();

    cleanup = () => {
      if (status === "running") renderer.dispose();
      status = "disposed";
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsubscribeWish();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", lost);
      scene.dataset.mode = "static";
    };
  };

  setup();
  const onMotion = () => {
    playback.current = { kind: "skipped" };
    setup();
  };
  motion.addEventListener("change", onMotion);
  return () => {
    motion.removeEventListener("change", onMotion);
    cleanup();
  };

}

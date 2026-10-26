import { createWhaleRenderer } from "./renderer";
import { createWhaleRoute } from "./whale-route";

/** 僅管理這張鯨魚；不攔截輸入，也不驅動既有紙墨、文字或音效。 */
export function mountWhaleSea(scene: HTMLDivElement, image: HTMLImageElement, canvas: HTMLCanvasElement) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const route = createWhaleRoute();
  let disposed = false;
  let ready = false;
  let failed = false;
  let renderer: ReturnType<typeof createWhaleRenderer> = null;
  let raf = 0;
  let previous: number | null = null;
  let nextDraw = 0;
  let seconds = 0;

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = null;
    nextDraw = 0;
  };
  const still = () => {
    stop();
    scene.dataset.mode = "still";
    renderer?.dispose();
    renderer = null;
  };
  const frame = (now: number) => {
    raf = 0;
    if (disposed || !renderer) return;
    // 瀏覽器可能合併快速切換的媒體事件；繪製前仍以目前偏好收斂資源。
    if (motion.matches) { still(); return; }
    if (document.hidden) { stop(); return; }
    if (previous !== null && now + .1 < nextDraw) {
      raf = requestAnimationFrame(frame);
      return;
    }
    if (previous !== null) seconds += Math.min(.1, (now - previous) / 1000);
    previous = now;
    // 依截止時間排程，避免 60Hz 的浮點誤差讓每兩幀一次退成每三幀一次。
    nextDraw = Math.max(nextDraw + 1000 / 60, now);
    if (!renderer.draw(scene.clientWidth, scene.clientHeight, seconds)) {
      failed = true;
      still();
      return;
    }
    if (scene.dataset.mode !== "swimming") scene.dataset.mode = "swimming";
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    stop();
    if (disposed || !ready || failed || motion.matches) { still(); return; }
    if (document.hidden) return;
    renderer ??= createWhaleRenderer(canvas, image, route);
    if (!renderer) { failed = true; still(); return; }
    raf = requestAnimationFrame(frame);
  };
  const lost = (event: Event) => {
    event.preventDefault();
    failed = true;
    still();
  };
  const resize = new ResizeObserver(sync);
  resize.observe(scene);
  motion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", lost);
  image.decode().then(() => {
    if (disposed) return;
    ready = true;
    sync();
  }, () => { /* 素材未就緒時不遮住原生靜態圖。 */ });

  return () => {
    disposed = true;
    still();
    resize.disconnect();
    motion.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    canvas.removeEventListener("webglcontextlost", lost);
  };
}

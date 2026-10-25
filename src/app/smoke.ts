import { getWishEffects } from "./wish-progress";
import { SmokeField, parametersFor, SMOKE_TOP_SPACE } from "./smoke/model";
import { drawSmoke } from "./smoke/renderer";

export function setupSmoke(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>(".smoke-canvas");
  const host = canvas?.parentElement;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !host || !ctx) return () => {};

  const field = new SmokeField();
  let disposed = false;
  let touchId: number | null = null;
  let visible = false;
  let raf = 0;
  let last = 0;
  let size = 1;

  const resize = () => {
    if (disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size = Math.max(1, Math.round(host.getBoundingClientRect().width * dpr));
    canvas.width = size;
    canvas.height = Math.ceil(size * (1 + SMOKE_TOP_SPACE));
    canvas.style.height = `${(1 + SMOKE_TOP_SPACE) * 100}%`;
    field.resetInput();
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    if (now - last >= 1000 / 30 - 1) {
      const parameters = parametersFor(getWishEffects());
      field.step(Math.min(0.05, (now - last) / 1000), parameters);
      last = now;
      drawSmoke(ctx, field.trails, parameters, size, canvas.height);
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (disposed || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const resetInput = () => field.resetInput();
  const move = (clientX: number, clientY: number, id: number) => {
    if (disposed || !visible || document.hidden) return;
    field.move({ x: clientX, y: clientY, at: performance.now(), id },
      host.getBoundingClientRect(), parametersFor(getWishEffects()));
  };
  const pointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "touch") move(e.clientX, e.clientY, e.pointerId);
  };
  const touchStart = (e: TouchEvent) => {
    resetInput();
    touchId = e.touches.length === 1 ? e.touches[0].identifier : null;
    if (touchId !== null) move(e.touches[0].clientX, e.touches[0].clientY, touchId);
  };
  const touchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) { resetInput(); touchId = null; return; }
    const touch = Array.from(e.touches).find((t) => t.identifier === touchId);
    if (touch) move(touch.clientX, touch.clientY, touch.identifier);
  };
  const touchEnd = () => { resetInput(); touchId = null; };
  const visibility = () => {
    resetInput();
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else start();
  };
  const io = new IntersectionObserver((entries) => {
    if (disposed) return;
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
    else { cancelAnimationFrame(raf); raf = 0; resetInput(); }
  });
  const ro = new ResizeObserver(resize);
  resize();
  io.observe(canvas);
  ro.observe(host);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  host.addEventListener("pointerleave", resetInput);
  host.addEventListener("pointercancel", resetInput);
  // 瀏覽器開始捲頁後可能取消 pointer；被動 touchmove 仍可跟隨，不阻止原生手勢。
  window.addEventListener("touchstart", touchStart, { passive: true });
  window.addEventListener("touchmove", touchMove, { passive: true });
  window.addEventListener("touchend", touchEnd, { passive: true });
  window.addEventListener("touchcancel", touchEnd, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  return () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("pointermove", pointerMove);
    host.removeEventListener("pointerleave", resetInput);
    host.removeEventListener("pointercancel", resetInput);
    window.removeEventListener("touchstart", touchStart);
    window.removeEventListener("touchmove", touchMove);
    window.removeEventListener("touchend", touchEnd);
    window.removeEventListener("touchcancel", touchEnd);
    document.removeEventListener("visibilitychange", visibility);
    io.disconnect();
    ro.disconnect();
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, size, canvas.height);
  };
}

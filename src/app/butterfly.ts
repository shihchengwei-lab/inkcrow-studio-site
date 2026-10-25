import { createButterflyModel, type Vec } from "./butterfly/model";

export function setupButterfly(): () => void {
  const host = document.querySelector<HTMLElement>(".butterfly-deco");
  const area = host?.parentElement;
  const pose = host?.querySelector<HTMLElement>(".butterfly-pose");
  const left = host?.querySelector<HTMLElement>(".butterfly-wing-left");
  const right = host?.querySelector<HTMLElement>(".butterfly-wing-right");
  const title = area?.querySelector<HTMLElement>(".work-title")?.parentElement;
  if (!host || !area || !pose || !left || !right || !title) return () => {};

  const model = createButterflyModel();
  let width = 0, raf = 0, wake = 0, last = 0;
  let visible = false, disposed = false;
  let pointer: Vec | null = null;
  let sample: (Vec & { at: number }) | null = null;
  const getThreat = (): Vec | null => {
    if (!pointer) return null;
    const rect = area.getBoundingClientRect();
    return { x: pointer.x - rect.left - host.offsetLeft - width / 2,
      y: pointer.y - rect.top - host.offsetTop - width / 2 };
  };
  const paint = () => {
    const { position, angle, fold, kind } = model.pose;
    host.style.transform = `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0)`;
    pose.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    left.style.transform = `rotateY(${fold.toFixed(2)}deg)`;
    right.style.transform = `rotateY(${(-fold).toFixed(2)}deg)`;
    host.dataset.state = kind;
    host.dataset.active = String(fold > 0.05);
  };
  const schedule = () => {
    if (wake || !visible || document.hidden || !width || disposed) return;
    wake = window.setTimeout(() => {
      wake = 0;
      if (!visible || document.hidden || !model.perched || disposed) return;
      if (model.cue(getThreat())) start();
      else schedule();
    }, model.delay);
  };
  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden || !width || disposed) return;
    const dt = Math.min(0.035, (now - last) / 1000);
    last = now;
    if (model.step(dt, getThreat())) {
      clearTimeout(wake);
      wake = 0;
      start();
    }
    paint();
    if (model.perched) schedule();
    else if (!raf) raf = requestAnimationFrame(frame);
  };
  function start() {
    if (raf || !visible || document.hidden || !width || disposed) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const sleep = () => {
    cancelAnimationFrame(raf);
    clearTimeout(wake);
    raf = wake = 0;
    sample = null;
  };
  const measure = () => {
    if (disposed) return;
    width = host.offsetWidth;
    if (!width) { sleep(); return; }
    // 預留轉身的外緣，控制點也放在空白區內，整條弧線自然不會撞到文字。
    const meta = area.querySelector(".work-meta");
    const range = document.createRange();
    if (meta) range.selectNodeContents(meta);
    const textBottom = meta ? range.getBoundingClientRect().bottom : area.getBoundingClientRect().top;
    model.resize({
      left: Math.max(-120, 36 - area.getBoundingClientRect().left - host.offsetLeft),
      top: Math.max(8, textBottom - area.getBoundingClientRect().top - host.offsetTop + width * 0.25 + 12),
      x: Math.max(20, title.offsetLeft - host.offsetLeft - width - 36),
      y: Math.max(20, area.clientHeight - host.offsetTop - width - 12),
    });
    sleep();
    paint();
    start();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !visible || document.hidden || !width) return;
    const now = performance.now(), previous = sample;
    pointer = { x: e.clientX, y: e.clientY };
    sample = { ...pointer, at: now };
    const speed = previous && now - previous.at < 180
      ? Math.hypot(pointer.x - previous.x, pointer.y - previous.y) / Math.max(0.008, (now - previous.at) / 1000) : 0;
    if (model.approach(getThreat()!, speed)) {
      clearTimeout(wake);
      wake = 0;
      start();
    }
  };
  const resetPointer = () => { pointer = null; sample = null; };
  const onScroll = () => { sample = null; start(); };
  const onVisibility = () => {
    if (document.hidden) { resetPointer(); sleep(); }
    else start();
  };
  const io = new IntersectionObserver((entries) => {
    if (disposed) return;
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start(); else sleep();
  });
  const ro = new ResizeObserver(measure);
  measure();
  io.observe(host);
  ro.observe(area);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("blur", resetPointer);
  document.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    disposed = true;
    sleep();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("blur", resetPointer);
    document.removeEventListener("pointerleave", resetPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    host.style.transform = pose.style.transform = left.style.transform = right.style.transform = "";
    delete host.dataset.state;
    delete host.dataset.active;
  };
}

import frames from "./partridge-frames.json";
import { Partridge } from "./partridge/model";

export function setupPartridge(): () => void {
  const bird = document.querySelector<HTMLButtonElement>(".partridge-deco");
  const art = bird?.querySelector<HTMLElement>(".partridge-art");
  const perch = bird?.parentElement;
  if (!bird || !art || !perch) return () => {};
  const links = Array.from(perch.querySelectorAll<HTMLElement>("a"));
  const note = perch.querySelector(".work-cta-note");
  const model = new Partridge();
  let visible = false, disposed = false;
  type Pending = { kind: "idle" }
    | { kind: "frame"; id: number; at: number; revision: number }
    | { kind: "wait"; id: number; at: number; revision: number };
  let pending: Pending = { kind: "idle" };
  let drawn = -1, transform = "";

  const active = () => !disposed && model.hasSpace && visible && !document.hidden;
  const paint = () => {
    const pose = model.pose;
    if (bird.dataset.state !== pose.kind) bird.dataset.state = pose.kind;
    if (pose.frame !== drawn) {
      drawn = pose.frame;
      art.style.backgroundPositionY = `${drawn / (frames.delays.length - 1) * 100}%`;
    }
    const next = `translateY(-50%) translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0)`;
    if (next !== transform) { transform = next; bird.style.transform = next; }
  };
  const cancel = (consumeWait: boolean) => {
    const previous = pending;
    pending = { kind: "idle" };
    if (previous.kind === "frame") cancelAnimationFrame(previous.id);
    if (previous.kind === "wait") {
      clearTimeout(previous.id);
      if (consumeWait) model.elapseWait(performance.now() - previous.at);
    }
  };
  const pause = () => cancel(true);

  // 模型給出排程需求；同一時間只能持有動畫幀或等待計時器。
  function sync(continuation?: { at: number; revision: number }) {
    if (disposed) return;
    if (pending.kind !== "idle" && pending.revision !== model.revision) cancel(false);
    paint();
    if (!active() || pending.kind !== "idle") return;
    const demand = model.demand;
    if (demand.kind === "frame") {
      const task: Extract<Pending, { kind: "frame" }> = {
        kind: "frame", revision: model.revision,
        at: continuation?.revision === model.revision ? continuation.at : performance.now(),
        id: requestAnimationFrame((now) => {
          if (pending !== task || disposed) return;
          pending = { kind: "idle" };
          if (!active()) return;
          model.step(now - task.at);
          sync({ at: now, revision: task.revision });
        }),
      };
      pending = task;
    } else if (demand.kind === "wait") {
      const task: Extract<Pending, { kind: "wait" }> = {
        kind: "wait", revision: model.revision, at: performance.now(),
        id: window.setTimeout(() => {
          if (pending !== task || disposed) return;
          pending = { kind: "idle" };
          if (!active()) { model.elapseWait(demand.delay); return; }
          const current = model.demand;
          model.waited(current.kind === "wait" && current.samplePointer ? bird!.getBoundingClientRect() : undefined);
          sync();
        }, demand.delay),
      };
      pending = task;
    }
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !active()) return;
    model.move({ x: event.clientX, y: event.clientY }, bird.getBoundingClientRect());
    sync();
  };
  const onLeave = () => {
    if (disposed) return;
    model.leave();
    sync();
  };
  const onClick = (event: MouseEvent) => {
    if (!active()) return;
    model.click(event.detail === 0 ? { kind: "keyboard" } : { kind: "pointer", x: event.clientX }, bird.getBoundingClientRect());
    sync();
  };
  const measure = () => {
    if (disposed) return;
    pause();
    const width = bird.offsetWidth;
    const area = perch.getBoundingClientRect();
    const baseLeft = area.left + bird.offsetLeft;
    let reservedRight = area.left;
    for (const link of links) reservedRight = Math.max(reservedRight, link.getBoundingClientRect().right + 24);
    if (note) {
      const range = document.createRange();
      range.selectNodeContents(note);
      reservedRight = Math.max(reservedRight, range.getBoundingClientRect().right + 24);
    }
    const min = reservedRight - baseLeft;
    const max = Math.min(area.right, window.innerWidth - 16) - baseLeft - width;
    model.measure(width && min <= max ? { min, max } : null);
    bird.style.visibility = model.hasSpace ? "" : "hidden";
    if (model.hasSpace) sync();
  };
  const syncVisibility = () => {
    if (disposed) return;
    if (visible && !document.hidden) sync();
    else { pause(); onLeave(); }
  };
  const io = new IntersectionObserver((entries) => {
    if (disposed) return;
    visible = entries.some((entry) => entry.isIntersecting);
    syncVisibility();
  });
  const ro = new ResizeObserver(measure);
  measure();
  io.observe(perch);
  ro.observe(perch);
  links.forEach((link) => ro.observe(link));
  if (note) ro.observe(note);
  document.fonts.ready.then(measure);
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("blur", onLeave);
  document.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", syncVisibility);
  bird.addEventListener("click", onClick);
  return () => {
    if (disposed) return;
    disposed = true;
    pause();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("blur", onLeave);
    document.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", syncVisibility);
    bird.removeEventListener("click", onClick);
    bird.style.transform = bird.style.visibility = "";
    art.style.backgroundPositionY = "";
    delete bird.dataset.state;
  };
}

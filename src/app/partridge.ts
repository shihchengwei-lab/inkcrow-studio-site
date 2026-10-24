import frames from "./partridge-frames.json";

type ClickHop = { direction: number; energy: number };
type HopCause = "avoid" | "click";
type State =
  | { kind: "pecking"; frame: number; remaining: number }
  | { kind: "resting" | "watching"; remaining: number }
  | { kind: "landing"; remaining: number; cause: HopCause }
  | { kind: "alert" }
  | { kind: "hopping"; cause: HopCause; nextClick: ClickHop | null; from: number; to: number; elapsed: number; anticipation: number; flight: number; height: number };
type Bounds = { min: number; max: number; home: number };
const SETTLE_MS = 120;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function landingFor(from: number, direction: number, stride: number, bounds: Bounds) {
  const preferred = from + direction * stride;
  const forward = clamp(preferred, bounds.min, bounds.max);
  if (forward === preferred) return forward;
  // 預計落點會越界時反向短跳，點擊與避讓共用同一個安全範圍。
  const reverse = clamp(from - direction * stride, bounds.min, bounds.max);
  if (reverse !== from) return reverse;
  return forward !== from ? forward : null;
}

export function setupPartridge(): () => void {
  const bird = document.querySelector<HTMLButtonElement>(".partridge-deco");
  const art = bird?.querySelector<HTMLElement>(".partridge-art");
  const perch = bird?.parentElement;
  if (!bird || !art || !perch) return () => {};
  const links = Array.from(perch.querySelectorAll<HTMLElement>("a"));
  const note = perch.querySelector(".work-cta-note");
  let state: State = { kind: "pecking", frame: 0, remaining: frames.delays[0] };
  let bounds: Bounds | null = null;
  let x = 0, y = 0;
  let visible = false, near = false, disposed = false;
  let raf = 0, timer = 0, last = 0, timerStarted = 0;
  let drawn = -1;
  let pointer: { x: number; y: number } | null = null;
  let lastEscape: { x: number; y: number } | null = null;

  const draw = (index: number) => {
    if (index === drawn) return;
    drawn = index;
    art.style.backgroundPositionY = `${index / (frames.delays.length - 1) * 100}%`;
  };
  const pose = () => {
    bird.style.transform = `translateY(-50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  };
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      if ("remaining" in state) state.remaining = Math.max(0, state.remaining - (performance.now() - timerStarted));
    }
  };
  const enter = (next: State) => {
    pause();
    state = next;
    bird.dataset.state = next.kind;
    draw(next.kind === "pecking" ? next.frame : 0);
    schedule();
  };
  const step = (now: number) => {
    raf = 0;
    if (!bounds || !visible || document.hidden || state.kind !== "hopping") return;
    state.elapsed += now - last;
    last = now;
    const flightTime = state.elapsed - state.anticipation;
    const settleTime = flightTime - state.flight;
    if (flightTime < 0) {
      // 先略微沉身，沿用原動畫低頭格，落點尚未移動。
      const t = state.elapsed / state.anticipation;
      y = 1.5 * t * t;
      draw(t < 0.35 ? 0 : 1);
    } else if (settleTime < 0) {
      const t = flightTime / state.flight;
      x = state.from + (state.to - state.from) * t;
      // 離地較快、回落較慢；不同觸碰位置有不同的短跳力度。
      y = t < 0.4
        ? -state.height + (state.height + 1.5) * (1 - t / 0.4) ** 2
        : -state.height * (1 - ((t - 0.4) / 0.6) ** 2);
      draw(0);
    } else {
      const t = Math.min(1, settleTime / SETTLE_MS);
      x = state.to;
      y = 1.5 * Math.sin(Math.PI * t);
      draw(t < 0.55 ? 1 : 0);
    }
    pose();
    if (settleTime >= SETTLE_MS) {
      y = 0;
      pose();
      const { cause, nextClick } = state;
      if (!nextClick || !clickHop(nextClick)) enter({ kind: "landing", remaining: 260, cause });
    }
    else raf = requestAnimationFrame(step);
  };
  function schedule() {
    if (disposed || !bounds || !visible || document.hidden || raf || timer) return;
    if (state.kind === "hopping") {
      last = performance.now();
      raf = requestAnimationFrame(step);
    } else if ("remaining" in state) {
      timerStarted = performance.now();
      timer = window.setTimeout(() => {
        timer = 0;
        if (!bounds || !visible || document.hidden) {
          if ("remaining" in state) state.remaining = 0;
          return;
        }
        if (state.kind === "watching") {
          const target = avoidanceTarget();
          if (target && pointer) {
            lastEscape = { ...pointer };
            hop(target.to, target.energy, true);
          } else enter(near ? { kind: "alert" } : { kind: "resting", remaining: 700 });
        } else if (state.kind === "pecking") {
          const next = state.frame + 1;
          enter(next < frames.delays.length
            ? { kind: "pecking", frame: next, remaining: frames.delays[next] }
            : { kind: "resting", remaining: 1800 });
        } else {
          enter(near ? { kind: "alert" } : { kind: "pecking", frame: 0, remaining: frames.delays[0] });
          reactToPointer();
        }
      }, state.remaining);
    }
  }
  function avoidanceTarget() {
    if (!pointer || !bounds) return null;
    const rect = bird!.getBoundingClientRect();
    const dx = pointer.x - (rect.left + rect.width / 2);
    const distance = Math.hypot(dx, pointer.y - (rect.top + rect.height / 2));
    const radius = rect.width * 0.48 + 12;
    if (distance >= radius || (lastEscape && Math.hypot(pointer.x - lastEscape.x, pointer.y - lastEscape.y) < 18)) return null;
    const direction = Math.abs(dx) < 4 ? (bounds.max - x > x - bounds.min ? 1 : -1) : dx < 0 ? 1 : -1;
    const energy = clamp(1 - distance / radius, 0, 1);
    const to = landingFor(x, direction, 18 + energy * 10, bounds);
    return to === null ? null : { to, energy };
  }
  function reactToPointer() {
    if (!pointer || !bounds || !visible || document.hidden) return;
    const rect = bird!.getBoundingClientRect();
    near = Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2)) < rect.width * 0.65 + 24;
    if (!near) lastEscape = null;
    if (state.kind === "hopping" || state.kind === "landing") return;
    const target = avoidanceTarget();
    if (target) {
      if (state.kind !== "watching") enter({ kind: "watching", remaining: 140 - target.energy * 60 });
    } else if (near) {
      if (state.kind !== "alert") enter({ kind: "alert" });
    } else if (state.kind === "alert" || state.kind === "watching") enter({ kind: "resting", remaining: 700 });
  }
  function hop(to: number, energy: number, avoiding = false) {
    enter({ kind: "hopping", cause: avoiding ? "avoid" : "click", nextClick: null, from: x, to, elapsed: 0,
      anticipation: 100 - energy * 35, flight: 240 - energy * 35,
      height: avoiding ? 2 + energy * 1.5 : 6 + energy * 3 });
  }
  function clickHop({ direction, energy }: ClickHop) {
    if (!bounds) return false;
    const to = landingFor(x, direction, 20 + energy * 12, bounds);
    if (to === null) return false;
    hop(to, energy);
    return true;
  }
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !bounds || !visible || document.hidden) return;
    pointer = { x: event.clientX, y: event.clientY };
    reactToPointer();
  };
  const onLeave = () => {
    pointer = lastEscape = null;
    near = false;
    if (state.kind === "alert" || state.kind === "watching") enter({ kind: "resting", remaining: 700 });
  };
  const onClick = (event: MouseEvent) => {
    if (!bounds || !visible || document.hidden) return;
    if ((state.kind === "hopping" || state.kind === "landing") && state.cause === "click") return;
    const rect = bird.getBoundingClientRect();
    const direction = event.detail === 0 ? (x > bounds.home ? -1 : 1)
      : (event.clientX < rect.left + rect.width / 2 ? 1 : -1);
    const energy = event.detail === 0 ? 0.55
      : clamp(1 - Math.abs(event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2), 0, 1);
    // 點擊已經回應這次接近，不在落地後再補一次自動躲避。
    lastEscape = pointer ? { ...pointer } : null;
    if (state.kind === "hopping") {
      // 微跳先自然落地，再接一次較高的點擊跳；連點不堆積。
      state.nextClick ??= { direction, energy };
    } else clickHop({ direction, energy });
  };
  const measure = () => {
    if (disposed) return;
    pause();
    pointer = lastEscape = null;
    near = false;
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
    if (!width || min > max) {
      bounds = null;
      bird.style.visibility = "hidden";
      return;
    }
    const home = clamp(-35, min, max);
    const first = bounds === null;
    bounds = { min: Math.max(min, home - 32), max: Math.min(max, home + 32), home };
    x = first ? home : clamp(x, bounds.min, bounds.max);
    y = 0;
    bird.style.visibility = "";
    pose();
    // 尺寸變動時落回安全區，不讓舊尺寸算出的落點繼續使用。
    enter(near ? { kind: "alert" } : { kind: "resting", remaining: 700 });
  };
  const syncVisibility = () => {
    if (visible && !document.hidden) schedule();
    else { pause(); onLeave(); }
  };
  const io = new IntersectionObserver((entries) => {
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

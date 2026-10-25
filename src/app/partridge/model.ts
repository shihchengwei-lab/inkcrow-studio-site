import frames from "../partridge-frames.json";

type Direction = -1 | 1;
type ClickHop = { direction: Direction; energy: number };
type HopCause = "avoid" | "click";
type HopMotion = { kind: "hopping"; from: number; to: number; elapsed: number; anticipation: number; flight: number; height: number };
type State =
  | { kind: "pecking"; frame: number; remaining: number }
  | { kind: "resting" | "watching"; remaining: number }
  | { kind: "landing"; remaining: number; cause: HopCause }
  | { kind: "alert" }
  | (HopMotion & ({ cause: "avoid"; nextClick: ClickHop | null } | { cause: "click" }));
type Bounds = { min: number; max: number; home: number };
type Point = Readonly<{ x: number; y: number }>;
export type BirdRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export type Space = Readonly<{ min: number; max: number }>;
export type Click = { kind: "keyboard" } | { kind: "pointer"; x: number };
export type Demand = { kind: "idle" } | { kind: "frame" } | { kind: "wait"; delay: number; samplePointer: boolean };

const SETTLE_MS = 120;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function landingFor(from: number, direction: Direction, stride: number, bounds: Bounds) {
  const preferred = from + direction * stride;
  const forward = clamp(preferred, bounds.min, bounds.max);
  if (forward === preferred) return forward;
  // 點擊與避讓共用同一個安全範圍；遇界時反向短跳。
  const reverse = clamp(from - direction * stride, bounds.min, bounds.max);
  if (reverse !== from) return reverse;
  return forward !== from ? forward : null;
}

// 所有動作、接跳與等待規則都在模型內；不讀 DOM、不持有瀏覽器時鐘或排程。
export class Partridge {
  private state: State = { kind: "pecking", frame: 0, remaining: frames.delays[0] };
  private bounds: Bounds | null = null;
  private x = 0;
  private y = 0;
  private frame = 0;
  private near = false;
  private pointer: Point | null = null;
  private lastEscape: Point | null = null;
  private version = 0;

  get revision() { return this.version; }
  get hasSpace() { return this.bounds !== null; }
  get pose() { return { x: this.x, y: this.y, frame: this.frame, kind: this.state.kind }; }
  get demand(): Demand {
    if (!this.bounds) return { kind: "idle" };
    if (this.state.kind === "hopping") return { kind: "frame" };
    if ("remaining" in this.state) return {
      kind: "wait", delay: this.state.remaining,
      samplePointer: this.pointer !== null && this.state.kind !== "pecking",
    };
    return { kind: "idle" };
  }

  private enter(next: State) {
    this.state = next;
    this.frame = next.kind === "pecking" ? next.frame : 0;
    this.version++;
  }

  // 只扣實際已等待的時間；背景或離屏期間不消耗 remaining。
  elapseWait(elapsed: number) {
    if ("remaining" in this.state) this.state.remaining = Math.max(0, this.state.remaining - elapsed);
  }

  step(elapsed: number) {
    if (!this.bounds || this.state.kind !== "hopping") return;
    const state = this.state;
    state.elapsed += elapsed;
    const flightTime = state.elapsed - state.anticipation;
    const settleTime = flightTime - state.flight;
    if (flightTime < 0) {
      const t = state.elapsed / state.anticipation;
      this.y = 1.5 * t * t;
      this.frame = t < 0.35 ? 0 : 1;
    } else if (settleTime < 0) {
      const t = flightTime / state.flight;
      this.x = state.from + (state.to - state.from) * t;
      this.y = t < 0.4
        ? -state.height + (state.height + 1.5) * (1 - t / 0.4) ** 2
        : -state.height * (1 - ((t - 0.4) / 0.6) ** 2);
      this.frame = 0;
    } else {
      const t = Math.min(1, settleTime / SETTLE_MS);
      this.x = state.to;
      this.y = 1.5 * Math.sin(Math.PI * t);
      this.frame = t < 0.55 ? 1 : 0;
    }
    if (settleTime >= SETTLE_MS) {
      this.y = 0;
      const nextClick = state.cause === "avoid" ? state.nextClick : null;
      if (!nextClick || !this.clickHop(nextClick)) this.enter({ kind: "landing", remaining: 260, cause: state.cause });
    }
  }

  waited(rect?: BirdRect) {
    if (!this.bounds || !("remaining" in this.state)) return;
    if (this.state.kind === "watching") {
      const target = rect ? this.avoidanceTarget(rect) : null;
      if (target && this.pointer) {
        this.lastEscape = { ...this.pointer };
        this.hop(target.to, target.energy, "avoid");
      } else this.enter(this.near ? { kind: "alert" } : { kind: "resting", remaining: 700 });
    } else if (this.state.kind === "pecking") {
      const next = this.state.frame + 1;
      this.enter(next < frames.delays.length
        ? { kind: "pecking", frame: next, remaining: frames.delays[next] }
        : { kind: "resting", remaining: 1800 });
    } else {
      this.enter(this.near ? { kind: "alert" } : { kind: "pecking", frame: 0, remaining: frames.delays[0] });
      if (rect) this.reactToPointer(rect);
    }
  }

  private avoidanceTarget(rect: BirdRect) {
    if (!this.pointer || !this.bounds) return null;
    const dx = this.pointer.x - (rect.left + rect.width / 2);
    const distance = Math.hypot(dx, this.pointer.y - (rect.top + rect.height / 2));
    const radius = rect.width * 0.48 + 12;
    if (distance >= radius || (this.lastEscape && Math.hypot(this.pointer.x - this.lastEscape.x, this.pointer.y - this.lastEscape.y) < 18)) return null;
    const direction = Math.abs(dx) < 4 ? (this.bounds.max - this.x > this.x - this.bounds.min ? 1 : -1) : dx < 0 ? 1 : -1;
    const energy = clamp(1 - distance / radius, 0, 1);
    const to = landingFor(this.x, direction, 18 + energy * 10, this.bounds);
    return to === null ? null : { to, energy };
  }

  private reactToPointer(rect: BirdRect) {
    if (!this.pointer || !this.bounds) return;
    this.near = Math.hypot(this.pointer.x - (rect.left + rect.width / 2), this.pointer.y - (rect.top + rect.height / 2)) < rect.width * 0.65 + 24;
    if (!this.near) this.lastEscape = null;
    if (this.state.kind === "hopping" || this.state.kind === "landing") return;
    const target = this.avoidanceTarget(rect);
    if (target) {
      if (this.state.kind !== "watching") this.enter({ kind: "watching", remaining: 140 - target.energy * 60 });
    } else if (this.near) {
      if (this.state.kind !== "alert") this.enter({ kind: "alert" });
    } else if (this.state.kind === "alert" || this.state.kind === "watching") this.enter({ kind: "resting", remaining: 700 });
  }

  private hop(to: number, energy: number, cause: HopCause) {
    const motion: HopMotion = { kind: "hopping", from: this.x, to, elapsed: 0,
      anticipation: 100 - energy * 35, flight: 240 - energy * 35,
      height: cause === "avoid" ? 2 + energy * 1.5 : 6 + energy * 3 };
    this.enter(cause === "avoid" ? { ...motion, cause, nextClick: null } : { ...motion, cause });
  }

  private clickHop({ direction, energy }: ClickHop) {
    if (!this.bounds) return false;
    const to = landingFor(this.x, direction, 20 + energy * 12, this.bounds);
    if (to === null) return false;
    this.hop(to, energy, "click");
    return true;
  }

  move(pointer: Point, rect: BirdRect) {
    this.pointer = pointer;
    this.reactToPointer(rect);
  }

  leave() {
    this.pointer = this.lastEscape = null;
    this.near = false;
    if (this.state.kind === "alert" || this.state.kind === "watching") this.enter({ kind: "resting", remaining: 700 });
  }

  click(input: Click, rect: BirdRect) {
    if (!this.bounds) return;
    if ((this.state.kind === "hopping" || this.state.kind === "landing") && this.state.cause === "click") return;
    const direction = input.kind === "keyboard" ? (this.x > this.bounds.home ? -1 : 1)
      : (input.x < rect.left + rect.width / 2 ? 1 : -1);
    const energy = input.kind === "keyboard" ? 0.55
      : clamp(1 - Math.abs(input.x - (rect.left + rect.width / 2)) / (rect.width / 2), 0, 1);
    this.lastEscape = this.pointer ? { ...this.pointer } : null;
    if (this.state.kind === "hopping" && this.state.cause === "avoid") {
      // 只有微跳能接一次點擊高跳；狀態型別不允許點擊跳再帶待接點擊。
      this.state.nextClick ??= { direction, energy };
    } else this.clickHop({ direction, energy });
  }

  measure(space: Space | null) {
    this.pointer = this.lastEscape = null;
    this.near = false;
    if (!space) { this.bounds = null; return; }
    const home = clamp(-35, space.min, space.max);
    const first = this.bounds === null;
    this.bounds = { min: Math.max(space.min, home - 32), max: Math.min(space.max, home + 32), home };
    this.x = first ? home : clamp(this.x, this.bounds.min, this.bounds.max);
    this.y = 0;
    // 尺寸變動時取消舊落點，回到新的安全區。
    this.enter({ kind: "resting", remaining: 700 });
  }
}

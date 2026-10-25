const TIPS = [
  { x: 0.456, y: 0.369 },
  { x: 0.502, y: 0.342 },
  { x: 0.554, y: 0.359 },
];
const LIFE = 3.8;
const FULL_LIFE = 8.2;
export const SMOKE_TOP_SPACE = 0.28;
const EMIT_INTERVAL = 0.035;
const MAX_POINTS = Math.ceil(FULL_LIFE / EMIT_INTERVAL) + 2;
const MAX_GUSTS = 32;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Point = { x: number; y: number; vx: number; vy: number; age: number };
type Gust = { x: number; y: number; vx: number; vy: number; age: number; weight: number };
type Sample = { x: number; y: number; at: number; id: number };


export type SmokeParameters = Readonly<{ life: number; top: number; gain: number; width: number }>;
type Wish = Readonly<{ strength: number; smokeGain: number; smokeWidth: number }>;
type Bounds = Readonly<{ left: number; top: number; width: number; height: number }>;
type Input = { kind: "empty" } | { kind: "tracking"; raw: Sample; anchor: Sample };

export function parametersFor(wish: Wish): SmokeParameters {
  return { life: LIFE + (FULL_LIFE - LIFE) * wish.strength,
    top: -SMOKE_TOP_SPACE * wish.strength, gain: wish.smokeGain, width: wish.smokeWidth };
}

// 只保存煙流與手勢的數值；外部無法改寫粒子或建立不成對的 raw/anchor。
export class SmokeField {
  private readonly points: Point[][] = TIPS.map(() => []);
  private readonly carry = TIPS.map(() => 0);
  private readonly gusts: Gust[] = [];
  private time = 0;
  private input: Input = { kind: "empty" };

  get trails(): readonly (readonly Readonly<Point>[])[] { return this.points; }
  resetInput() { this.input = { kind: "empty" }; }

  step(dt: number, parameters: SmokeParameters) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const life = parameters.life;
    this.time += dt;
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      const g = this.gusts[i];
      g.age += dt;
      // 氣流離手後仍稍微往原方向前進，再逐漸消散。
      const drift = Math.exp(-g.age * 3) * dt * 0.06;
      g.x += g.vx * drift;
      g.y += g.vy * drift;
      if (g.age > 2.2) this.gusts.splice(i, 1);
    }

    this.points.forEach((points, index) => {
      this.carry[index] += dt;
      while (this.carry[index] >= EMIT_INTERVAL) {
        this.carry[index] -= EMIT_INTERVAL;
        points.push({ ...TIPS[index], vx: 0, vy: -0.075, age: 0 });
      }
      if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.age += dt;
        if (p.age > life || p.y < -SMOKE_TOP_SPACE) { points.splice(i, 1); continue; }
        // 同一空間共享緩慢氣流，避免每顆粒子各自抖動而散成光點。
        let vx = 0.018 * Math.sin(p.y * 24 + this.time * 1.1 + index * 0.8)
          + 0.011 * Math.sin(p.y * 49 - this.time * 0.7);
        let vy = -0.078 - 0.018 * p.age / life;
        for (const g of this.gusts) {
          const speed = Math.hypot(g.vx, g.vy);
          const fade = Math.exp(-g.age * 1.8) * g.weight;
          const dx = p.x - g.x, dy = p.y - g.y;
          const wake = Math.exp(-(dx * dx + dy * dy) / 0.009);
          vx += g.vx * wake * fade * 0.1;
          vy += g.vy * wake * fade * 0.1;
          // 手勢兩側的反向旋渦，讓被撥開的煙沿邊緣捲回。
          for (const side of [-1, 1]) {
            const ox = dx + g.vy / speed * 0.045 * side;
            const oy = dy - g.vx / speed * 0.045 * side;
            const r2 = ox * ox + oy * oy;
            const spin = side * speed * 0.012 * fade
              * Math.exp(-r2 / 0.012) / (r2 + 0.0012);
            vx -= oy * spin;
            vy += ox * spin;
          }
        }
        // 香頭附近固定出煙；外側煙流有慣性，反覆快速撥動也有速度上限。
        const freedom = Math.min(1, p.age / 0.22);
        const follow = 1 - Math.exp(-dt * 5);
        p.vx += (clamp(vx, -0.42, 0.42) * freedom - p.vx) * follow;
        p.vy += (clamp(vy, -0.34, 0.22) * freedom - 0.075 * (1 - freedom) - p.vy) * follow;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    });
  }

  move(sample: Readonly<Sample>, bounds: Bounds, parameters: SmokeParameters) {
    if (bounds.width <= 0 || bounds.height <= 0 ||
        ![sample.x, sample.y, sample.at, sample.id, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)) return;
    const current = { ...sample };
    const previous = this.input;
    if (previous.kind === "empty" || previous.raw.id !== current.id ||
        current.at - previous.raw.at > 160 || current.at < previous.raw.at) {
      this.input = { kind: "tracking", raw: current, anchor: current };
      return;
    }
    const old = previous.anchor;
    this.input = { kind: "tracking", raw: current, anchor: old };
    // 螢幕位移與元素內位置分別計算，捲頁不會變成撥煙速度。
    const dx = (current.x - old.x) / bounds.width;
    const dy = (current.y - old.y) / bounds.height;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return;
    this.input = { kind: "tracking", raw: current, anchor: current };
    if (distance > 0.4) return;
    const dt = Math.max(0.008, (current.at - old.at) / 1000);
    const speed = Math.min(1.6, distance / dt);
    const count = Math.ceil(distance / 0.035);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = (old.x - bounds.left) / bounds.width + dx * t;
      const y = (old.y - bounds.top) / bounds.height + dy * t;
      if (x < 0 || x > 1 || y < parameters.top || y > 0.48) continue;
      this.gusts.push({ x, y, vx: dx / distance * speed, vy: dy / distance * speed,
        age: 0, weight: Math.min(1, distance / (count * 0.035)) });
    }
    if (this.gusts.length > MAX_GUSTS) this.gusts.splice(0, this.gusts.length - MAX_GUSTS);
  }
}

export const DRIFT_SECONDS = 1.5;
export const RETURN_SECONDS = 9;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export type DisplacementField = Readonly<{
  width: number; height: number; columns: number; rows: number;
  offsetX: ArrayLike<number>; offsetY: ArrayLike<number>; revision: number;
}>;

// 位移場在文件座標中保存，捲頁不會被當成撥水速度。
// 每格以阻尼與回復力歸攏，少量殘餘位移保留上次手勢的形狀。
export class InkFlow {
  readonly width: number;
  readonly height: number;
  readonly columns = 48;
  readonly rows: number;
  private version = 0;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly restX: Float32Array;
  private readonly restY: Float32Array;
  private sinceTouch = DRIFT_SECONDS + RETURN_SECONDS;

  // 只讀檢視共用底層陣列；繪圖端不複製整個位移場，也不能經型別介面改寫它。
  get offsetX(): ArrayLike<number> { return this.x; }
  get offsetY(): ArrayLike<number> { return this.y; }
  get revision() { return this.version; }

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rows = clamp(Math.ceil((height / width) * this.columns), 48, 768);
    const count = this.columns * this.rows;
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    this.restX = new Float32Array(count);
    this.restY = new Float32Array(count);
  }

  disturb(px: number, py: number, dx: number, dy: number) {
    const radius = clamp(this.width * 0.17, 100, 210);
    const length = Math.hypot(dx, dy);
    if (length < 0.3) return false;
    const scale = Math.min(1, 45 / length);
    dx *= scale;
    dy *= scale;
    const fromX = Math.max(1, Math.floor(((px - radius) / this.width) * (this.columns - 1)));
    const toX = Math.min(this.columns - 2, Math.ceil(((px + radius) / this.width) * (this.columns - 1)));
    const fromY = Math.max(1, Math.floor(((py - radius) / this.height) * (this.rows - 1)));
    const toY = Math.min(this.rows - 2, Math.ceil(((py + radius) / this.height) * (this.rows - 1)));
    for (let row = fromY; row <= toY; row++) {
      for (let col = fromX; col <= toX; col++) {
        const i = row * this.columns + col;
        const ox = (col / (this.columns - 1)) * this.width - px;
        const oy = (row / (this.rows - 1)) * this.height - py;
        const d = Math.hypot(ox, oy) / radius;
        if (d >= 1) continue;
        const weight = (1 - d * d) ** 3;
        // 剪切讓水流有側向捲動，而不是把一個圓整塊平移。
        const curl = (ox * dy - oy * dx) / radius;
        const fx = (dx - (oy / radius) * curl * 1.8) * weight;
        const fy = (dy + (ox / radius) * curl * 1.8) * weight;
        this.vx[i] = clamp(this.vx[i] + fx * 2.8, -160, 160);
        this.vy[i] = clamp(this.vy[i] + fy * 2.8, -160, 160);
        this.restX[i] = clamp(this.restX[i] + fx * 0.065, -12, 12);
        this.restY[i] = clamp(this.restY[i] + fy * 0.065, -12, 12);
      }
    }
    this.sinceTouch = 0;
    return true;
  }

  step(dt: number) {
    this.sinceTouch += dt;
    const returning = this.sinceTouch > DRIFT_SECONDS;
    const finished = this.sinceTouch >= DRIFT_SECONDS + RETURN_SECONDS;
    const damping = Math.exp(-2.6 * dt);
    const limit = Math.min(100, this.width * 0.16);
    for (let i = 0; i < this.x.length; i++) {
      if (finished) {
        this.x[i] = this.restX[i];
        this.y[i] = this.restY[i];
        this.vx[i] = this.vy[i] = 0;
      } else {
        const spring = returning ? 2.4 : 0;
        this.vx[i] = (this.vx[i] + (this.restX[i] - this.x[i]) * spring * dt) * damping;
        this.vy[i] = (this.vy[i] + (this.restY[i] - this.y[i]) * spring * dt) * damping;
        this.x[i] = clamp(this.x[i] + this.vx[i] * dt, -limit, limit);
        this.y[i] = clamp(this.y[i] + this.vy[i] * dt, -limit, limit);
      }
    }
    this.version++;
    return !finished;
  }

}

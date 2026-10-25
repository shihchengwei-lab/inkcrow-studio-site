export type Vec = { x: number; y: number };
type Flight = {
  from: Vec; control: Vec; to: Vec; progress: number; speed: number;
  length: number; reason: "roam" | "return";
};
type State =
  | { kind: "perched" }
  | { kind: "flutter"; age: number }
  | { kind: "aware"; age: number; turn: number }
  | { kind: "takeoff"; age: number; flight: Flight }
  | { kind: "flying"; flight: Flight }
  | { kind: "fleeing"; age: number; calm: number; velocity: Vec }
  | { kind: "landing"; age: number; returnHome: boolean };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export type Bounds = { left: number; top: number; x: number; y: number };

/** 動作與姿勢只由時間、量測邊界及游標位置推導，不擁有 DOM 或計時器。 */
export function createButterflyModel() {
  let state: State = { kind: "perched" };
  let position: Vec = { x: 28, y: 10 };
  let home: Vec = { ...position };
  let bounds: Bounds = { left: 0, top: 8, x: 0, y: 0 };
  let phase = 0, fold = 0, angle = 0, turnVelocity = 0, cues = 0;
  let returnPending = false;
  const inside = (point: Vec): Vec => ({
    x: clamp(point.x, bounds.left, Math.max(bounds.left, bounds.x)),
    y: clamp(point.y, bounds.top, Math.max(bounds.top, bounds.y - 8)),
  });
  const flee = () => {
    if (state.kind === "fleeing") return false;
    // 空中受驚時承接既有動量，不重播原地起飛，也不重設振翅相位。
    let velocity = { x: 0, y: 0 };
    if (state.kind === "flying") {
      const f = state.flight, t = f.progress;
      const dx = (1 - t) * (f.control.x - f.from.x) + t * (f.to.x - f.control.x);
      const dy = (1 - t) * (f.control.y - f.from.y) + t * (f.to.y - f.control.y);
      const length = Math.hypot(dx, dy) || 1;
      velocity = { x: dx / length * f.speed, y: dy / length * f.speed };
    }
    state = { kind: "fleeing", age: 0, calm: 0, velocity };
    returnPending = true;
    return true;
  };
  const fly = (target: Vec, reason: Flight["reason"]) => {
    const to = inside(target);
    const length = distance(position, to);
    if (length < 12) { state = { kind: "flutter", age: 0 }; return; }
    const dx = to.x - position.x, dy = to.y - position.y;
    const bend = Math.min(42, length * 0.45) * (cues % 2 ? 1 : -1);
    const control = inside({ x: (position.x + to.x) / 2 - dy / length * bend,
      y: (position.y + to.y) / 2 + dx / length * bend });
    const flight: Flight = { from: { ...position }, control, to, progress: 0,
      speed: 0, length: distance(position, control) + distance(control, to), reason };
    state = { kind: "takeoff", age: 0, flight };
    phase = 0;
  };
  const cue = (threat: Vec | null) => {
    cues++;
    if (threat && distance(threat, home) < 185) {
      // 游標仍守在原處時，不照計時器飛回威脅來源。
      return false;
    }
    if (returnPending && distance(position, home) > 12) {
      returnPending = false;
      fly(home, "return");
    } else if (cues % 3 === 0) {
      const destinations = [
        { x: bounds.x * 0.72, y: bounds.y * 0.68 },
        { x: bounds.x * 0.25, y: bounds.y * 0.32 },
      ];
      fly(destinations[Math.floor(cues / 3) % 2], "roam");
    } else {
      state = { kind: "flutter", age: 0 };
      phase = 0;
    }
    return true;
  };
  const step = (dt: number, threat: Vec | null) => {
    let amplitude = 0, hz = 1.5, turn = 0;
    const beganFleeing = threat && (distance(position, threat) < 85
      || ((state.kind === "flying" || state.kind === "takeoff")
        && distance(position, threat) < 155)) ? flee() : false;

    if (state.kind === "fleeing") {
      const f = state;
      f.age += dt;
      const d = threat ? distance(position, threat) : Infinity;
      const alarm = threat !== null && d < 165;
      f.calm = alarm ? 0 : f.calm + dt;
      let target = { x: 0, y: 0 };
      if (alarm && threat) {
        const nx = d > 1 ? (position.x - threat.x) / d : 0;
        const ny = d > 1 ? (position.y - threat.y) / d : 1;
        // 先沿背離方向；靠近邊界時沿仍能拉開距離的側向繞行。
        // 每幀重算方向，但以速度緩變保留轉彎慣性。
        const choices = [0, 0.55, -0.55, 1.1, -1.1, Math.PI / 2, -Math.PI / 2];
        let best = -Infinity;
        for (const turn of choices) {
          const ux = nx * Math.cos(turn) - ny * Math.sin(turn);
          const uy = nx * Math.sin(turn) + ny * Math.cos(turn);
          const next = inside({ x: position.x + ux * 80, y: position.y + uy * 80 });
          const gain = distance(next, threat) - d;
          const travel = distance(position, next);
          const score = gain + travel * 0.18 - Math.abs(turn) * 5;
          if (score > best) {
            best = score;
            const scale = Math.min(1, travel / 55) * (d < 110 ? 250 : 190);
            target = { x: (next.x - position.x) / (travel || 1) * scale,
              y: (next.y - position.y) / (travel || 1) * scale };
          }
        }
      }
      const response = 1 - Math.exp(-dt * (alarm ? 6 : 3));
      f.velocity.x += (target.x - f.velocity.x) * response;
      f.velocity.y += (target.y - f.velocity.y) * response;
      const next = inside({ x: position.x + f.velocity.x * dt, y: position.y + f.velocity.y * dt });
      if (next.x === bounds.left || next.x === bounds.x) f.velocity.x = 0;
      if (next.y === bounds.top || next.y === Math.max(bounds.top, bounds.y - 8)) f.velocity.y = 0;
      position = next;
      const speed = Math.hypot(f.velocity.x, f.velocity.y);
      turn = clamp(Math.atan2(f.velocity.x, -f.velocity.y) * 180 / Math.PI, -50, 50)
        * Math.min(1, speed / 50);
      amplitude = 30 + 30 * Math.min(1, speed / 190);
      hz = alarm ? 4.5 : 3;
      if (f.age > 0.85 && f.calm > 0.5 && speed < 12) {
        state = { kind: "landing", age: 0, returnHome: true };
      }
    } else if (state.kind === "flutter") {
      state.age += dt;
      amplitude = 18 * Math.sin(Math.PI * Math.min(1, state.age / 1.05));
      if (state.age >= 1.05) state = { kind: "landing", age: 0, returnHome: false };
    } else if (state.kind === "aware") {
      state.age += dt;
      amplitude = 24;
      hz = 1.8;
      turn = state.turn;
      if (state.age > 0.9) state = { kind: "landing", age: 0, returnHome: false };
    } else if (state.kind === "takeoff") {
      state.age += dt;
      amplitude = 60;
      hz = 4.2;
      if (state.age > 0.18) state = { kind: "flying", flight: state.flight };
    } else if (state.kind === "flying") {
      const f = state.flight;
      const remaining = (1 - f.progress) * f.length;
      const cruise = 90;
      // 路徑只決定方向；速度由加速與煞車推進，沒有固定時間硬拉到終點。
      const desired = Math.min(cruise, Math.sqrt(2 * 160 * remaining));
      f.speed += (desired - f.speed) * (1 - Math.exp(-dt * 6));
      f.progress = Math.min(1, f.progress + f.speed * dt / f.length);
      const t = f.progress, inv = 1 - t;
      position = { x: inv * inv * f.from.x + 2 * inv * t * f.control.x + t * t * f.to.x,
        y: inv * inv * f.from.y + 2 * inv * t * f.control.y + t * t * f.to.y };
      const vx = 2 * inv * (f.control.x - f.from.x) + 2 * t * (f.to.x - f.control.x);
      const vy = 2 * inv * (f.control.y - f.from.y) + 2 * t * (f.to.y - f.control.y);
      turn = clamp(Math.atan2(vx, -vy) * 180 / Math.PI, -50, 50)
        * Math.min(1, remaining / 28);
      amplitude = 24 + 34 * Math.min(1, f.speed / cruise);
      hz = 2.7;
      if (f.progress === 1) {
        position = { ...f.to };
        state = { kind: "landing", age: 0, returnHome: false };
      }
    } else if (state.kind === "landing") {
      state.age += dt;
      if (state.age > 0.3 && Math.abs(fold) < 0.2 && Math.abs(angle) < 0.2 && Math.abs(turnVelocity) < 0.5) {
        returnPending ||= state.returnHome;
        state = { kind: "perched" };
        fold = angle = turnVelocity = 0;
      }
    }

    phase = (phase + hz * dt) % 1;
    // 收翅較快、展翅較慢，中間保留短暫展翅滑行。
    const beat = phase < 0.28 ? Math.sin(phase / 0.28 * Math.PI / 2)
      : phase < 0.72 ? Math.cos((phase - 0.28) / 0.44 * Math.PI / 2) : 0;
    fold += (amplitude * beat - fold) * (1 - Math.exp(-dt * 26));
    turnVelocity += ((turn - angle) * 90 - turnVelocity * 19) * dt;
    angle += turnVelocity * dt;
    return beganFleeing;
  };
  const approach = (threat: Vec, speed: number) => {
    const dx = position.x - threat.x, d = distance(position, threat);
    if (d > 155) return false;
    if (speed > 500 || d < 85) return flee();
    if (state.kind === "perched" || state.kind === "aware" || state.kind === "flutter") {
      state = { kind: "aware", age: 0, turn: clamp(-dx / 9, -12, 12) };
      return true;
    }
    return false;
  };
  return {
    get pose() { return { position, angle, fold, kind: state.kind }; },
    get perched() { return state.kind === "perched"; },
    get delay() { return returnPending ? 2200 : 3000 + (cues % 3) * 500; },
    cue, step, approach,
    resize(next: Bounds) {
      bounds = next;
      home = inside({ x: 28, y: 10 });
      position = inside(position);
      state = { kind: "perched" };
      fold = angle = turnVelocity = 0;
    },
  };
}

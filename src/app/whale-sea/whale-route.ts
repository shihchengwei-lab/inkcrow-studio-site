import { MAX_JOINT_BEND, MAX_TURN_RATE, MIN_TURN_RADIUS, WHALE_ROWS, whaleLength } from "./config";

// 逐節跟隨及依體長限制轉向改寫自 ascii-sharks (MIT)。授權見 /licenses/ascii-sharks.txt。
const STEP = .05;
const START = 0;
type Point = { at: number; x: number; y: number; vx: number; vy: number; swim: number; spine: Float64Array };

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

function angleDifference(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function randomSource(seed: number) {
  let value = (seed | 0) || 1;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function interpolate(a: number, va: number, b: number, vb: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return {
    value: (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * STEP * va
      + (-2 * t3 + 3 * t2) * b + (t3 - t2) * STEP * vb,
    velocity: ((6 * t2 - 6 * t) * a + (3 * t2 - 4 * t + 1) * STEP * va
      + (-6 * t2 + 6 * t) * b + (3 * t2 - 2 * t) * STEP * vb) / STEP,
    acceleration: ((12 * t - 6) * a + (6 * t - 4) * STEP * va
      + (-12 * t + 6) * b + (6 * t - 2) * STEP * vb) / (STEP * STEP),
  };
}

/** 頭部帶路，身體保留上一幀的位置再逐節跟隨；繪製不會重新生成整條魚身。 */
export function createWhaleRoute(seed = Math.floor(Math.random() * 4294967296)) {
  let random = randomSource(seed);
  let width = 1440, height = 900, length = whaleLength(width);
  const initial = () => {
    const x = width * (.3 + random() * .4), y = height * (.3 + random() * .4);
    const angle = random() * Math.PI * 2, speed = 24 + length * .045;
    const spine = new Float64Array((WHALE_ROWS + 1) * 3);
    for (let row = 0; row <= WHALE_ROWS; row++) {
      spine.set([x - Math.cos(angle) * length * row / WHALE_ROWS,
        y - Math.sin(angle) * length * row / WHALE_ROWS, angle + Math.PI], row * 3);
    }
    return { at: START, x, y, angle, turn: 0, speed, spine,
      targetX: width * .5, targetY: height * .5, targetSpeed: speed, nextGoal: START, swim: 0 };
  };
  let state = initial();
  const point = (): Point => ({
    at: state.at, x: state.x, y: state.y,
    vx: Math.cos(state.angle) * state.speed, vy: Math.sin(state.angle) * state.speed, swim: state.swim,
    spine: state.spine.slice(),
  });
  let before = point(), after = before;
  const reset = (w: number, h: number) => {
    width = w; height = h; length = whaleLength(width);
    random = randomSource(seed); state = initial(); before = point(); after = before;
  };
  const advance = () => {
    if (state.at >= state.nextGoal || Math.hypot(state.targetX - state.x, state.targetY - state.y) < Math.min(width, height) * .12) {
      state.targetX = width * (.15 + random() * .7);
      state.targetY = height * (.18 + random() * .64);
      state.targetSpeed = (24 + length * .045) * (.82 + random() * .36);
      state.nextGoal = state.at + 8 + random() * 12;
    }
    const aheadX = state.x + Math.cos(state.angle) * length * .8;
    const aheadY = state.y + Math.sin(state.angle) * length * .8;
    const edgeX = clamp(aheadX, width * .12, width * .88) - aheadX;
    const edgeY = clamp(aheadY, height * .15, height * .85) - aheadY;
    const wanted = Math.atan2(state.targetY - state.y + edgeY * 2, state.targetX - state.x + edgeX * 2);
    // 保留鯊魚依速度／體長限制轉彎的關係；靠近邊緣也不會解除限制急轉。
    const agility = Math.min(MAX_TURN_RATE, state.speed / (length * MIN_TURN_RADIUS)) * .95;
    const targetTurn = clamp(angleDifference(wanted, state.angle) * .7, -agility, agility);
    state.turn += (targetTurn - state.turn) * STEP * 1.3;
    const nextAngle = state.angle + state.turn * STEP;
    const nextSpeed = state.speed + (state.targetSpeed - state.speed) * STEP * .5;
    const speed = (state.speed + nextSpeed) / 2;
    const angle = (state.angle + nextAngle) / 2;
    state.x += Math.cos(angle) * speed * STEP;
    state.y += Math.sin(angle) * speed * STEP;
    state.swim += speed / (24 + length * .045) * STEP;
    state.angle = nextAngle; state.speed = nextSpeed; state.at += STEP;
    const nodes = state.spine, segment = length / WHALE_ROWS;
    nodes.set([state.x, state.y, state.angle + Math.PI], 0);
    let previousAngle = state.angle + Math.PI;
    // Follow-the-leader: 每節朝「自己的舊位置」跟隨上一節，不能從頭部朝向重算整身。
    for (let row = 1; row <= WHALE_ROWS; row++) {
      const previous = (row - 1) * 3, current = row * 3;
      let angle = Math.atan2(nodes[current + 1] - nodes[previous + 1], nodes[current] - nodes[previous]);
      angle = previousAngle + clamp(angleDifference(angle, previousAngle), -MAX_JOINT_BEND, MAX_JOINT_BEND);
      nodes[current] = nodes[previous] + Math.cos(angle) * segment;
      nodes[current + 1] = nodes[previous + 1] + Math.sin(angle) * segment;
      nodes[current + 2] = angle;
      previousAngle = angle;
    }
  };
  return {
    sample(seconds: number, viewportWidth = 1440, viewportHeight = 900) {
      const at = Math.max(START, seconds);
      if (viewportWidth !== width || viewportHeight !== height || at < before.at) reset(viewportWidth, viewportHeight);
      // 始終維持 before.at <= at <= after.at；60Hz 繪圖只在相鄰模擬幀間插值。
      while (after.at < at || after.at === before.at) { before = after; advance(); after = point(); }
      const a = before, b = after;
      const fraction = clamp((at - a.at) / STEP, 0, 1);
      const x = interpolate(a.x, a.vx, b.x, b.vx, fraction);
      const y = interpolate(a.y, a.vy, b.y, b.vy, fraction);
      const spine = new Float64Array((WHALE_ROWS + 1) * 3);
      spine.set([x.value, y.value, Math.atan2(y.velocity, x.velocity) + Math.PI], 0);
      for (let row = 1; row <= WHALE_ROWS; row++) {
        const i = row * 3, previous = i - 3;
        const raw = a.spine[i + 2] + angleDifference(b.spine[i + 2], a.spine[i + 2]) * fraction;
        const angle = spine[previous + 2] + angleDifference(raw, spine[previous + 2]);
        spine[i] = spine[previous] + Math.cos(angle) * length / WHALE_ROWS;
        spine[i + 1] = spine[previous + 1] + Math.sin(angle) * length / WHALE_ROWS;
        spine[i + 2] = angle;
      }
      return {
        x: x.value / width, y: y.value / height, vx: x.velocity / width, vy: y.velocity / height,
        ax: x.acceleration / width, ay: y.acceleration / height,
        swim: a.swim + (b.swim - a.swim) * fraction, spine,
      };
    },
  };
}

export type WhaleRoute = ReturnType<typeof createWhaleRoute>;

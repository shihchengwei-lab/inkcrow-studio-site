import { createWhaleRoute, type WhaleRoute } from "./whale-route";
import { WHALE_ARTWORK, WHALE_COLUMNS as COLUMNS, WHALE_ROWS as ROWS, whaleLength } from "./config";
export { WHALE_ARTWORK, WHALE_SIZE } from "./config";

const TAU = Math.PI * 2;
const ASPECT = WHALE_ARTWORK.width / WHALE_ARTWORK.height;
let referenceRoute: WhaleRoute | undefined;

function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 原畫不是筆直的身體：先把每列的中心綁到脊線，地景隨身體一起彎轉。 */
function bodyCenter(v: number) {
  return .77 - .40 * Math.sin(v * Math.PI / 2) + .08 * smoothstep(.75, 1, v);
}

export function whalePoint(u: number, v: number, seconds: number, turn = 0): [number, number] {
  const beat = seconds * TAU / 4.8;
  const tail = smoothstep(.62, .93, v);
  const center = bodyCenter(v);
  const leftFin = (1 - smoothstep(.10, .42, u)) * Math.exp(-(((v - .31) / .065) ** 2));
  const rightFin = smoothstep(.69, .92, u) * Math.exp(-(((v - .43) / .11) ** 2));
  const leftBeat = Math.sin(beat - .7);
  const rightBeat = Math.sin(beat + .7);
  const bank = Math.max(-.10, Math.min(.10, turn * .45));
  // 推進波由軀幹傳到尾部；胸鰭拍動、轉彎時一收一展。
  const x = u + .032 * v ** 3 * Math.sin(beat - v * 4.6)
    + (u - center) * tail * .025 * Math.sin(beat - 1.3)
    + leftFin * (.008 * leftBeat + bank * .04) - rightFin * (.008 * rightBeat - bank * .04);
  const y = v + tail * .012 * Math.sin(beat - 1.3)
    + leftFin * .012 * leftBeat + rightFin * .011 * rightBeat;
  return [x, y];
}

export function whaleScreenPath(width: number, height: number, seconds: number, route = referenceRoute ??= createWhaleRoute(42)) {
  const length = whaleLength(width);
  const point = route.sample(seconds, width, height);
  const vx = point.vx * width, vy = point.vy * height;
  const ax = point.ax * width, ay = point.ay * height;
  return {
    x: point.x * width, y: point.y * height,
    height: length,
    heading: Math.atan2(vy, vx), speed: Math.hypot(vx, vy),
    turn: (vx * ay - vy * ax) / Math.max(1, vx * vx + vy * vy),
    swim: point.swim, spine: point.spine,
  };
}

/** 直接使用模擬持有的逐節跟隨結果；繪圖只負責綁定素材。 */
export function whaleSpine(pose: ReturnType<typeof whaleScreenPath>) {
  return pose.spine;
}

export function createWhaleMesh() {
  const uv = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 2);
  const positions = new Float32Array(uv.length);
  const indices = new Uint16Array(COLUMNS * ROWS * 6);
  let i = 0;
  for (let row = 0; row <= ROWS; row++) {
    const v = row / ROWS;
    // 包住原畫全部非透明部位，排除遠離魚身、轉彎時會翻折的空白角落。
    const left = Math.max(0, bodyCenter(v) - .345 / ASPECT);
    const right = Math.min(1, bodyCenter(v) + .345 / ASPECT);
    for (let col = 0; col <= COLUMNS; col++) {
      uv[i++] = left + (right - left) * col / COLUMNS;
      uv[i++] = v;
    }
  }
  i = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const a = row * (COLUMNS + 1) + col;
      indices.set([a, a + 1, a + COLUMNS + 1, a + 1, a + COLUMNS + 2, a + COLUMNS + 1], i);
      i += 6;
    }
  }
  return { uv, positions, indices };
}

export function positionWhale(mesh: ReturnType<typeof createWhaleMesh>, width: number, height: number, seconds: number, route?: WhaleRoute) {
  const pose = whaleScreenPath(width, height, seconds, route);
  const spine = whaleSpine(pose);
  for (let i = 0; i < mesh.uv.length; i += 2) {
    const [u, v] = whalePoint(mesh.uv[i], mesh.uv[i + 1], pose.swim, pose.turn);
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor(v * ROWS)));
    const fraction = v * ROWS - row;
    const a = row * 3, b = a + 3;
    const back = spine[a + 2] + (spine[b + 2] - spine[a + 2]) * fraction;
    const offset = (u - bodyCenter(v)) * pose.height * ASPECT;
    const x = spine[a] + (spine[b] - spine[a]) * fraction + Math.sin(back) * offset;
    const y = spine[a + 1] + (spine[b + 1] - spine[a + 1]) * fraction - Math.cos(back) * offset;
    mesh.positions[i] = x / width * 2 - 1;
    mesh.positions[i + 1] = 1 - y / height * 2;
  }
}

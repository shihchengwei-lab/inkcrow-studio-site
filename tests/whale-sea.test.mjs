import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { moduleLoader } from "./helpers/load-module.mjs";

const load = moduleLoader();
const { whalePoint, whaleScreenPath, whaleSpine, createWhaleMesh, positionWhale } = load(resolve("src/app/whale-sea/model.ts"));
const { createWhaleRoute } = load(resolve("src/app/whale-sea/whale-route.ts"));
const { MAX_BODY_BEND, MAX_JOINT_BEND, MAX_TURN_RATE } = load(resolve("src/app/whale-sea/config.ts"));

function renderedPoint(mesh, width, height, row, u) {
  const start = row * 25 * 2;
  let left = start;
  while (left < start + 46 && mesh.uv[left + 2] < u) left += 2;
  const fraction = (u - mesh.uv[left]) / (mesh.uv[left + 2] - mesh.uv[left]);
  return [
    (mesh.positions[left] + (mesh.positions[left + 2] - mesh.positions[left]) * fraction + 1) / 2 * width,
    (1 - mesh.positions[left + 1] - (mesh.positions[left + 3] - mesh.positions[left + 1]) * fraction) / 2 * height,
  ];
}

test("所有視窗尺寸都以使用者接受的上一版體長再放大 1.2 倍", () => {
  for (const width of [320, 390, 601, 768, 1440, 1920, 2560]) {
    const previous = Math.max(800, Math.min(1600, width * 1.05));
    assert.ok(Math.abs(whaleScreenPath(width, 900, 0).height - previous * 1.2) < 1e-8);
  }
});

test("巡游因種子而異、不在 34 秒後重播，且舊時間可重現", () => {
  const a = createWhaleRoute(7), b = createWhaleRoute(7), other = createWhaleRoute(42);
  const initial = a.sample(0);
  assert.deepEqual(initial, b.sample(0));
  assert.ok(Math.hypot(initial.x - other.sample(0).x, initial.y - other.sample(0).y) > .05);
  const later = a.sample(34);
  assert.ok(Math.hypot(initial.x - later.x, initial.y - later.y) > .05);
  a.sample(1200);
  assert.deepEqual(a.sample(0), initial, "長時間巡游清理歷史後仍可重現");
});

test("不同巡游改變速度與方向，體長限制轉彎，邊緣也不能急轉", () => {
  const allTurns = [];
  for (const seed of [1, 7, 42, 987654]) {
    const route = createWhaleRoute(seed), speeds = [];
    for (let seconds = 0; seconds <= 300; seconds += .2) {
      const p = route.sample(seconds), vx = p.vx * 1440, vy = p.vy * 900;
      const speed = Math.hypot(vx, vy), cruise = 24 + 1814.4 * .045;
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(speed > cruise * .8 && speed < cruise * 1.2);
      speeds.push(speed);
      const turn = (vx * p.ay * 900 - vy * p.ax * 1440) / (speed * speed);
      assert.ok(Math.abs(turn) <= MAX_TURN_RATE + .002);
      allTurns.push(turn);
    }
    assert.ok(Math.max(...speeds) / Math.min(...speeds) > 1.2);
  }
  assert.ok(Math.min(...allTurns) < -.08 && Math.max(...allTurns) > .08);
});

test("60Hz 取樣逐幀前進，不跳成 20Hz 姿態或回頭重播", () => {
  const route = createWhaleRoute(42);
  let previous = route.sample(0);
  for (let frame = 1; frame <= 600; frame++) {
    const p = route.sample(frame / 60);
    const distance = Math.hypot((p.x - previous.x) * 1440, (p.y - previous.y) * 900);
    const expected = Math.hypot(p.vx * 1440, p.vy * 900) / 60;
    assert.ok(distance > expected * .9 && distance < expected * 1.1, `frame=${frame} distance=${distance}`);
    previous = p;
  }
});

test("頭部開始轉彎時，後半身保留原方向逐節跟隨", () => {
  for (const seed of [7, 42, 987654]) {
    const route = createWhaleRoute(seed), before = route.sample(0), after = route.sample(1);
    const difference = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const headTurn = difference(after.spine[2], before.spine[2]);
    const tailTurn = difference(after.spine[146], before.spine[146]);
    assert.ok(headTurn > .02);
    assert.ok(tailTurn < headTurn * .1, `seed=${seed}: head=${headTurn}, tail=${tailTurn}`);
  }
});

test("轉彎時整身彎角受限，實際畫面中的後半身不會突然加速甩尾", () => {
  const mesh = createWhaleMesh();
  for (const [width, height, seed] of [[1440, 900, 7], [1440, 900, 42], [320, 900, 987654]]) {
      const route = createWhaleRoute(seed), frameTime = 1 / 60;
      let previousHead = null, previousRear = null;
      for (let frame = 0; frame <= 1800; frame++) {
        const t = frame * frameTime;
        const pose = whaleScreenPath(width, height, t, route);
        let total = 0;
        for (let i = 5; i < pose.spine.length; i += 3) total += Math.abs(pose.spine[i] - pose.spine[i - 3]);
        assert.ok(total <= MAX_BODY_BEND + .001);
        assert.ok(Math.abs(pose.turn) <= pose.speed * MAX_BODY_BEND / pose.height + .002);
        positionWhale(mesh, width, height, t, route);
        const head = renderedPoint(mesh, width, height, 0, .77);
        const rear = [[24, .5], [36, .43], [44, .55]].map(([row, u]) => renderedPoint(mesh, width, height, row, u));
        if (previousHead && previousRear) {
          const headSpeed = Math.hypot(head[0] - previousHead[0], head[1] - previousHead[1]) / frameTime;
          assert.ok(headSpeed > pose.speed * .9 && headSpeed < pose.speed * 1.1);
          for (let i = 0; i < rear.length; i++) {
            const speed = Math.hypot(rear[i][0] - previousRear[i][0], rear[i][1] - previousRear[i][1]) / frameTime;
            assert.ok(speed < headSpeed * 2.25, `${width} seed=${seed} frame=${frame}: rear=${speed}, head=${headSpeed}`);
          }
        }
        previousHead = head; previousRear = rear;
      }
  }
});

test("軀幹保持穩定，尾端保留小幅推進與不同步的胸鰭拍動", () => {
  const range = (u, v) => {
    const points = Array.from({ length: 80 }, (_, i) => whalePoint(u, v, i / 10));
    return [0, 1].map(axis => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis])));
  };
  const head = range(.72, .10), body = range(.5, .45), tail = range(.5, .95);
  assert.ok(body[0] < .007 && tail[0] > body[0] * 6 && head[0] < body[0] / 4);
  assert.ok(tail[0] > .04 && tail[0] < .08 && tail[1] > .018);
  assert.ok(range(.08, .31)[1] > .018, "左胸鰭獨立起伏");
  assert.ok(range(.92, .43)[1] > .018, "右胸鰭獨立起伏");
  assert.notEqual(whalePoint(.08, .31, 0)[1] - .31, whalePoint(.92, .43, 0)[1] - .43);
});

test("包含轉彎在內的完整巡游，地景網格不翻折或穿插", () => {
  const mesh = createWhaleMesh();
  for (const [w, h] of [[320, 900], [844, 390], [1440, 900]]) {
    for (let t = 0; t <= 34; t += .4) {
      positionWhale(mesh, w, h, t);
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const [a, b, c] = Array.from(mesh.indices.slice(i, i + 3), index => index * 2);
        const p = mesh.positions;
        assert.ok((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]) < 0, `${w}x${h} t=${t}`);
      }
    }
  }
});

test("保持目前尺寸，從畫面邊緣出入後仍會回來", () => {
  const mesh = createWhaleMesh();
  for (const [width, height] of [[320, 900], [390, 844], [844, 390], [601, 900], [768, 1024], [1440, 900], [1920, 1080]]) {
    assert.ok(whaleScreenPath(width, height, 0).height >= 800);
    let visible = 0;
    for (let t = 0; t <= 120; t += .7) {
      positionWhale(mesh, width, height, t);
      for (let i = 0; i < mesh.positions.length; i += 2) {
        assert.ok(Number.isFinite(mesh.positions[i]) && Number.isFinite(mesh.positions[i + 1]));
      }
      // 檢查原畫頭、軀幹及尾柄內的實際部位，不以含透明區的網格頂點數代替。
      const interior = [[4, .72], [14, .58], [16, .12], [23, .86], [24, .5], [36, .43], [41, .5]];
      if (interior.some(([row, u]) => {
        const [x, y] = renderedPoint(mesh, width, height, row, u);
        return x >= 0 && x <= width && y >= 0 && y <= height;
      })) visible++;
    }
    assert.ok(visible > 80, `${width}x${height}: ${visible} visible samples`);
  }
});

test("最終畫面中的頭部朝向與位移一致；脊線沿路徑轉彎且不拉長", () => {
  const mesh = createWhaleMesh();
  const renderedHead = (w, h, t) => {
    positionWhale(mesh, w, h, t);
    return renderedPoint(mesh, w, h, 0, .77);
  };
  let bent = 0;
  for (let t = 0; t < 34; t += .2) {
    const pose = whaleScreenPath(1440, 900, t);
    const head = renderedHead(1440, 900, t), next = renderedHead(1440, 900, t + .02);
    const travel = Math.atan2(next[1] - head[1], next[0] - head[0]);
    assert.ok(Math.hypot(head[0] - pose.x, head[1] - pose.y) < .001);
    assert.ok(Math.cos(travel - pose.heading) > .999);
    const spine = whaleSpine(pose), segment = pose.height / (spine.length / 3 - 1);
    for (let i = 3; i < spine.length; i += 3) {
      assert.ok(Math.abs(Math.hypot(spine[i] - spine[i - 3], spine[i + 1] - spine[i - 2]) - segment) < .0001);
      assert.ok(Math.abs(spine[i + 2] - spine[i - 1]) <= MAX_JOINT_BEND + .0001);
    }
    if (Math.abs(spine[spine.length - 1] - spine[2]) > .25) bent++;
  }
  assert.ok(bent > 20, "巡游包含平順前進與身體隨路徑彎曲的轉彎");
});

test("媒體事件被合併時，下一幀仍停止並釋放鯨魚資源", async () => {
  const frames = new Map();
  let id = 0, releases = 0;
  const motion = { matches: false, addEventListener() {}, removeEventListener() {} };
  const load = moduleLoader({
    matchMedia: () => motion,
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: frame => frames.delete(frame),
  }, {
    "./renderer": { createWhaleRenderer: () => ({ draw: () => true, dispose: () => releases++ }) },
  });
  const { mountWhaleSea } = load(resolve("src/app/whale-sea/controller.ts"));
  const scene = { dataset: {}, clientWidth: 320, clientHeight: 900 };
  const cleanup = mountWhaleSea(scene, { decode: async () => {} }, { addEventListener() {}, removeEventListener() {} });
  await Promise.resolve();
  const tick = now => { const callback = frames.values().next().value; frames.clear(); callback(now); };
  tick(0);
  assert.equal(scene.dataset.mode, "swimming");
  motion.matches = true; // 故意不送 change，重現快速切換被瀏覽器合併的反例。
  tick(16);
  assert.equal(scene.dataset.mode, "still");
  assert.equal(releases, 1);
  assert.equal(frames.size, 0);
  cleanup();
  assert.equal(releases, 1);
});

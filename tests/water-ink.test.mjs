import test from "node:test";
import assert from "node:assert/strict";
import { InkFlow, DRIFT_SECONDS, RETURN_SECONDS } from "../src/app/water-ink.ts";

const offsets = (field) => {
  const values = [];
  for (let i = 0; i < field.pixels.length; i += 4) {
    values.push(((field.pixels[i] * 256 + field.pixels[i + 1]) / 65535 - 0.5) * field.width * 0.4);
    values.push(((field.pixels[i + 2] * 256 + field.pixels[i + 3]) / 65535 - 0.5) * field.width * 0.4);
  }
  return values;
};

test("停住不製造擾動；手勢後持續漂移，最後歸攏但保留輪廓差異", () => {
  const field = new InkFlow(1000, 4000);
  const before = field.pixels.slice();
  assert.equal(field.disturb(100, 200, 0, 0), false);
  assert.deepEqual(field.pixels, before);
  assert.equal(field.disturb(100, 200, 30, -20), true);
  field.step(1 / 30);
  const moving = field.pixels.slice();
  assert.notDeepEqual(moving, before);
  field.step(1 / 30);
  assert.notDeepEqual(field.pixels, moving);
  let active = true;
  for (let i = 0; i < Math.ceil((DRIFT_SECONDS + RETURN_SECONDS + 1) * 30); i++) active = field.step(1 / 30);
  assert.equal(active, false);
  assert.notDeepEqual(field.pixels, before);
  assert.ok(Math.max(...offsets(field).map(Math.abs)) <= 12.01);
  const settled = field.pixels.slice();
  field.step(1);
  assert.deepEqual(field.pixels, settled);
});

test("不同手勢留下不同輪廓，固定歸處沒有持續累積的漂移", () => {
  const left = new InkFlow(390, 6000);
  const right = new InkFlow(390, 6000);
  left.disturb(80, 300, -35, 15);
  right.disturb(80, 300, 35, -15);
  left.step(20);
  right.step(20);
  assert.notDeepEqual(left.pixels, right.pixels);
  assert.ok(Math.max(...offsets(left).map(Math.abs)) <= 12.01);
  assert.ok(Math.max(...offsets(right).map(Math.abs)) <= 12.01);
});

test("快速反覆滑動的位移有上限，遠處的墨不被整頁帶走", () => {
  const field = new InkFlow(320, 7000);
  const original = field.pixels.slice();
  for (let i = 0; i < 600; i++) {
    field.disturb(80, 400, 10000, -10000);
    field.step(1 / 60);
  }
  assert.ok(Math.max(...offsets(field).map(Math.abs)) <= 51.21);
  const bottom = Math.floor(field.rows * .8) * field.columns * 4;
  assert.deepEqual(field.pixels.slice(bottom), original.slice(bottom));
  field.step(20);
  assert.ok(Math.max(...offsets(field).map(Math.abs)) <= 12.01);
});

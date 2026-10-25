import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as rules from "../src/app/bird-sound/rules.ts";

const code = ts.transpileModule(readFileSync(new URL("../src/app/bird-sound/controller.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(code, { exports, require: () => rules });
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function mount({ manual = false, distance = 0, random = 0 } = {}) {
  let now = 0, id = 0, status = "off";
  const timers = new Map(), frames = new Map(), audio = [], calls = [];
  const controller = exports.createBirdSoundController({
    createAudio() {
      const element = { volume: 1, currentTime: 0, paused: true, loop: false, preload: "",
        pause() { this.paused = true; },
        play() {
          let resolve, reject;
          const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
          calls.push({ at: now, audio: element, resolve, reject });
          if (!manual) resolve();
          return pending.then(() => { element.paused = false; });
        },
      };
      audio.push(element); return element;
    },
    distance: () => distance, now: () => now, random: () => random,
    requestFrame: fn => { frames.set(++id, fn); return id; }, cancelFrame: id => frames.delete(id),
    schedule: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; }, cancelTimer: id => timers.delete(id),
  }, next => { status = next; });
  return { ...controller, audio, calls,
    get status() { return status; }, get timers() { return timers.size; }, get frames() { return frames.size; },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        timers.delete(next[0]); now = next[1].at; next[1].fn(); await flush();
      }
      now = end;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); await flush();
    },
  };
}

test("原有距離音量、五秒包絡與八至十五秒間隔不變", () => {
  for (const distance of [0, 200, 400]) assert.equal(rules.peakVolumeAt(distance), .16);
  for (const distance of [2400, 4000, 10000]) assert.equal(rules.peakVolumeAt(distance), .08);
  for (const [ms, expected] of [[0, 0], [250, .08], [500, .16], [4400, .16], [4700, .08], [5000, 0], [9000, 0]]) {
    assert.equal(rules.volumeAt(ms, .16), expected);
  }
  assert.deepEqual([0, .5, 1].map(rules.nextCallDelay), [8000, 11500, 15000]);
});

test("只在操作時建立音訊；間隔從播放成功起算，等待仍為開啟狀態", async () => {
  const app = mount();
  assert.equal(app.audio.length, 0);
  app.toggle();
  assert.equal(app.calls.length, 1, "play 在 toggle 的同步呼叫中執行，保留使用者手勢");
  await flush(); assert.equal(app.status, "sounding");
  await app.advance(250); assert.equal(app.audio[0].volume, .08);
  await app.advance(250); assert.equal(app.audio[0].volume, .16);
  await app.advance(4200); assert.equal(app.audio[0].volume, .08);
  await app.advance(300); assert.equal(app.status, "waiting"); assert.equal(app.audio[0].paused, true);
  await app.advance(2999); assert.equal(app.calls.length, 1);
  await app.advance(1); assert.equal(app.calls[1].at, 8000); assert.equal(app.status, "sounding");
  app.toggle(); assert.equal(app.status, "off"); assert.equal(app.timers, 0); assert.equal(app.frames, 0);
  await app.advance(20000); assert.equal(app.calls.length, 2); assert.equal(app.audio[0].volume, 0);
});

test("慢載入不消耗聲段，播放失敗會回到關閉並取消排程", async () => {
  const app = mount({ manual: true });
  app.toggle(); await app.advance(6000); assert.equal(app.status, "starting");
  app.calls[0].resolve(); await flush(); await app.advance(500);
  assert.equal(app.status, "sounding"); assert.equal(app.audio[0].volume, .16);
  await app.advance(4500); assert.equal(app.status, "waiting");
  await app.advance(3000); assert.equal(app.calls[1].at, 14000);
  app.calls[1].reject(Error("blocked")); await flush();
  assert.equal(app.status, "off"); assert.equal(app.timers + app.frames, 0); assert.equal(app.audio[0].paused, true);
});

for (const outcome of ["resolve", "reject"]) {
  test(`關閉再開啟後，舊播放請求 ${outcome} 不得干擾新工作`, async () => {
    const app = mount({ manual: true });
    app.toggle(); app.toggle(); app.toggle();
    assert.equal(app.audio.length, 2);
    app.calls[1].resolve(); await flush(); await app.advance(500);
    const current = app.audio[1];
    app.calls[0][outcome](Error("stale")); await flush();
    assert.equal(app.status, "sounding"); assert.equal(current.paused, false); assert.equal(current.volume, .16);
    assert.equal(app.audio[0].paused, true); assert.equal(app.audio[0].volume, 0);
    assert.equal(app.frames, 1); assert.equal(app.timers, 1);
    app.dispose(); app.dispose(); app.toggle();
    assert.equal(app.timers + app.frames, 0); assert.equal(app.audio.length, 2); assert.equal(current.paused, true);
  });
}

test("卸載期間才完成的播放不得復活，也不再建立任何排程", async () => {
  const app = mount({ manual: true }); app.toggle(); app.dispose();
  app.calls[0].resolve(); await flush();
  assert.equal(app.audio[0].paused, true); assert.equal(app.audio[0].volume, 0);
  assert.equal(app.timers + app.frames, 0); assert.equal(app.status, "off");
});

test("缺少定位元素或非有限距離不建立播放工作", async () => {
  for (const distance of [null, NaN, Infinity, -1]) {
    const app = mount({ distance }); app.toggle(); await flush();
    assert.equal(app.status, "off"); assert.equal(app.calls.length, 0); assert.equal(app.timers + app.frames, 0);
  }
});

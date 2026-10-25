import test from "node:test";
import assert from "node:assert/strict";
import { mountSmoke, smokeScenario } from "./helpers/smoke-browser.mjs";
import { SmokeField, parametersFor } from "../src/app/smoke/model.ts";

// 來自重構前 d9a32ef 的實際 setupSmoke；每個場景記錄全部 120 幀繪圖命令與時間。
const before = {
  still: "28866d0c422b06c427b73cb2eb52841bfc26909ecd0406bf7ba8a4af9ccf0f73",
  wish: "d1c0625fd963dab271b24ac24d450f88bfb99bdc4f75852593df1ef062f394b2",
  gesture: "5b7a28aef0b7e21842cdeae9de67a2d0aec2e189f6870a68378d2b5b6e861d91",
};
for (const mode of Object.keys(before)) {
  test(`煙霧 ${mode} 的每幀繪製與重構前完全一致`, () => {
    const result = smokeScenario(mode);
    assert.equal(result.digest, before[mode]); assert.ok(result.segments > 0);
  });
}

test("離開畫面、背景分頁與卸載都停止排程，遲到的 observer 不得重啟", () => {
  const app = mountSmoke(); assert.equal(app.pending, 0);
  app.visible(true); app.advance(); assert.equal(app.pending, 1);
  app.visible(false); const draws = app.draws; app.advance(1000);
  assert.equal(app.pending, 0); assert.equal(app.draws, draws);
  app.visible(true); app.hidden(true); app.advance(1000); assert.equal(app.pending, 0);
  app.hidden(false); app.advance(); assert.equal(app.pending, 1);
  app.unmount(); const stopped = app.draws;
  app.lateObservers(); app.advance(); app.unmount();
  assert.equal(app.pending, 0); assert.equal(app.draws, stopped); assert.equal(app.listeners, 0);
});

test("相同的觸控與滑鼠手勢產生相同煙流，觸控不攔截原生捲動", () => {
  const pointer = mountSmoke(), touch = mountSmoke();
  pointer.visible(true); touch.visible(true);
  for (let frame = 0; frame < 100; frame++) {
    if (frame >= 20 && frame < 50) {
      const clientX = 180 + frame, clientY = 140;
      pointer.move(clientX, clientY);
      touch.touch(frame === 20 ? "touchstart" : "touchmove", [{ clientX, clientY, identifier: 1 }]);
    }
    pointer.advance(); touch.advance();
  }
  assert.equal(pointer.digest, touch.digest);
  for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) assert.equal(touch.options.get(name).passive, true);
  pointer.unmount(); touch.unmount();
});

test("停在同一螢幕位置時，頁面捲動不會製造撥煙速度", () => {
  const idle = mountSmoke(), scroll = mountSmoke(); idle.visible(true); scroll.visible(true);
  for (let frame = 0; frame < 100; frame++) {
    scroll.move(200, 140); scroll.scroll(100 - frame);
    idle.advance(); scroll.advance();
  }
  assert.equal(idle.digest, scroll.digest); idle.unmount(); scroll.unmount();
});

test("煙霧規則接受固定願力輸入；無效尺寸與時間不污染粒子", () => {
  assert.deepEqual(parametersFor({ strength: 0, smokeGain: 1, smokeWidth: 1 }), { life: 3.8, top: -0, gain: 1, width: 1 });
  const full = parametersFor({ strength: 1, smokeGain: 1.2, smokeWidth: 1.08 });
  assert.equal(full.life, 8.2); assert.equal(full.top, -.28);
  const field = new SmokeField();
  for (const dt of [NaN, Infinity, -1, 0]) field.step(dt, full);
  assert.equal(field.trails.flat().length, 0);
  field.move({ x: 200, y: 140, at: 0, id: 1 }, { left: 100, top: 100, width: 0, height: 300 }, full);
  for (let i = 0; i < 300; i++) field.step(.034, full);
  assert.ok(field.trails.flat().length > 0);
  assert.ok(field.trails.flat().every(p => Object.values(p).every(Number.isFinite)));
});

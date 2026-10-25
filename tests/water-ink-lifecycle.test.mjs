import test from "node:test";
import assert from "node:assert/strict";
import { mountWater as mount } from "./helpers/water-ink-browser.mjs";

for (const frameMs of [100, 250, 300]) {
  test(`持續 ${frameMs}ms 慢幀先降低細節，再轉靜態並停止排程`, () => {
    const app = mount();
    let sawLow = false;
    for (let i = 0; i < 220; i++) {
      app.advance(frameMs);
      sawLow ||= app.scene.dataset.quality === "low" && app.scene.dataset.mode === "dynamic";
    }
    assert.equal(sawLow, true);
    assert.equal(app.scene.dataset.mode, "static");
    assert.equal(app.scheduled, 0);
    assert.equal(app.disposals, 1);
    app.unmount();
    assert.equal(app.disposals, 1);
  });
}

test("正常幀率與隱藏後的長時間恢復，不會誤觸降級", () => {
  const app = mount();
  for (let cycle = 0; cycle < 4; cycle++) {
    for (let i = 0; i < 90; i++) app.advance(33.4);
    app.visibility(true);
    const before = app.draws;
    app.advance(60_000, false);
    assert.equal(app.draws, before);
    assert.equal(app.scheduled, 0);
    app.visibility(false);
    // 恢復後第一幀也可能延遲；只這一幀略過，不依間隔大小猜測休眠。
    app.advance(300);
    assert.equal(app.scene.dataset.mode, "dynamic");
    assert.equal(app.scene.dataset.quality, "full");
  }
  app.unmount();
  assert.equal(app.scheduled, 0);
});

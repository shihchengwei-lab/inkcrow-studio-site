import test from "node:test";
import assert from "node:assert/strict";
import { mountButterfly, butterflyScenario } from "./helpers/butterfly-browser.mjs";

// 6827d77 整理前的正式程式：固定輸入下，每次取樣的畫面參數、排程與行為記錄。
const before = {
  "idle": "0d37b666a736ef313cdb21e76ca69d4ed1a3f08b99c48f4fb942a3c74917e1e1",
  "threat": "4f18a35be30979543b3ec12fdf78e4d30e901b399649958f4cd11b69bc526a6e",
  "resume": "20cd48abf956c0633d8cd7784893ace81c6136c7a2a641422fb9f85b2bd05cd2",
  "touch": "5fd0445d87ca13fc19de666917b51e4d5eeb7ceabef0735f3928b8d02e81d3e6",
  "slow": "688e0ae7b3adf93385af2d6fd402817a15317775fedfe77070bc9ff54caaa9e3"
};
for (const mode of Object.keys(before)) {
  test(`蝴蝶 ${mode} 的逐幀姿勢與排程和整理前一致`, () => {
    assert.equal(butterflyScenario(mode).digest, before[mode]);
  });
}

test("離屏與背景停止排程；卸載後遲到量測不會重新啟動", () => {
  const app=mountButterfly(); app.visible(true); app.approach(); app.advance();
  assert.equal(app.host.dataset.state,"fleeing");
  app.visible(false); assert.equal(app.frames+app.timers,0);
  app.visible(true); assert.equal(app.frames,1);
  app.hidden(true); assert.equal(app.frames+app.timers,0);
  app.hidden(false); app.unmount(); app.lateCallbacks();
  assert.equal(app.frames+app.timers+app.listeners,0);
  assert.equal(app.host.style.transform,"");
});

test("觸控不觸發躲避，停棲只留下單一等待工作", () => {
  const app=mountButterfly(); app.visible(true); app.advance();
  for(let i=0;i<50;i++) app.approach(0,0,"touch");
  assert.equal(app.host.dataset.state,"perched");
  assert.equal(app.frames,0); assert.equal(app.timers,1); app.unmount();
});

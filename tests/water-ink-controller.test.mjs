import test from "node:test";
import assert from "node:assert/strict";
import { mountWater, waterScenario } from "./helpers/water-ink-browser.mjs";
import { InkFlow } from "../src/app/water-ink/model.ts";
import { FlowTexture } from "../src/app/water-ink/flow-texture.ts";

// c4e8252 的實際元件與墨流：同一組 360 幀輸入，記錄每次繪製的時間、位元組與參數。
const before = {
  intro: "75b73a31f6e8f0600e2a0dfa8ae8884c1a23ea09bb679e178d05a2d0c69f14c3",
  gesture: "f21d74753a5309fece931c4da4cfa8fc3b5c09dc8dcedb4dda69dcef18de7766",
  resume: "57bcc865cdf1ef560648bffa9ca6ef2e53b396958c1c9741814fd0cad1f8fe41",
  slow: "b15614c754717f077b8789d597caa57af7e9f7d5d02cb7a1031fa8e6106786af",
};
for (const mode of Object.keys(before)) {
  test(`水墨 ${mode} 的逐幀資料、繪製參數與排程和修改前一致`, () => {
    assert.equal(waterScenario(mode).digest, before[mode]);
  });
}

test("首次成形起點跨 effect 重建保留，重新掛載與動態切換不重播", () => {
  const app = mountWater({ seen: false });
  app.advance(2000, false);
  assert.ok(app.drawLog.at(-1).params[2] > 0.6);
  app.restartEffect();
  app.advance(1000, false);
  assert.ok(Math.abs(app.drawLog.at(-1).params[2] - 0.352) < 1e-10);
  app.motion(true);
  assert.equal(app.scheduled, 0);
  app.motion(false);
  app.advance(33.4, false);
  assert.equal(app.drawLog.at(-1).params[2], 0);
  app.remount();
  app.advance(33.4, false);
  assert.equal(app.drawLog.at(-1).params[2], 0);
  app.unmount();
});

test("儲存受限時同一文件仍只播放一次；初始減少動態不消耗動態資源", () => {
  const app = mountWater({ seen: false, storageBlocked: true });
  app.advance(33.4, false);
  assert.ok(app.drawLog.at(-1).params[2] > 0.99);
  app.remount();
  app.advance(33.4, false);
  assert.equal(app.drawLog.at(-1).params[2], 0);
  app.unmount();
  const reduced = mountWater({ seen: false, reduced: true });
  assert.equal(reduced.creates, 0);
  reduced.motion(false);
  reduced.advance(33.4, false);
  assert.equal(reduced.drawLog.at(-1).params[2], 0);
  reduced.unmount();
});

test("成形中能同時擾墨；隱藏期間不步進墨流，恢復不把背景時間補進物理場", () => {
  const app = mountWater({ seen: false });
  app.advance(33.4, false);
  const still = app.drawLog.at(-1).pixels;
  app.move(100, 200); app.move(130, 200);
  app.advance(33.4, false);
  assert.equal(app.scene.dataset.phase, "forming");
  assert.notEqual(app.drawLog.at(-1).pixels, still);
  const count = app.draws;
  app.visibility(true); app.advance(60_000, false);
  assert.equal(app.draws, count); assert.equal(app.scheduled, 0);
  app.visibility(false); app.advance(33.4, false);
  assert.equal(app.drawLog.at(-1).params[2], 0);
  assert.equal(app.scene.dataset.phase, "flowing");
  app.unmount();
});

test("繪圖不可用或失效時轉靜態；重複失效與遲到量測不重啟已清理的資源", () => {
  const absent = mountWater({ noRenderer: true });
  assert.equal(absent.scene.dataset.mode, "static"); assert.equal(absent.scheduled, 0); absent.unmount();
  for (const failure of ["context", "draw"]) {
    const app = mountWater();
    if (failure === "context") { app.lost(); app.lost(); }
    else { app.failDraw(); app.advance(33.4); }
    assert.equal(app.scene.dataset.mode, "static"); assert.equal(app.scheduled, 0);
    assert.equal(app.disposals, 1);
    app.unmount(); app.lateResize(); app.advance(1000); app.unmount();
    assert.equal(app.disposals, 1); assert.equal(app.scheduled, 0); assert.equal(app.listeners, 0);
  }
});

test("靜止觸點的捲頁不製造墨流，touch 事件保留被動監聽", () => {
  const app = mountWater();
  app.advance(33.4, false);
  const initial = app.drawLog.at(-1).pixels;
  for (let i = 0; i < 20; i++) {
    const touches = [{ clientX: 100, clientY: 200, identifier: 1 }];
    app.touch(i === 0 ? "touchstart" : "touchmove", touches);
    app.scroll(i * 20); app.advance(33.4, false);
  }
  assert.equal(app.drawLog.at(-1).pixels, initial);
  for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) assert.equal(app.options.get(name).passive, true);
  app.unmount();
});

test("編碼維持 16-bit 精度，位移更新重用緩衝，尺寸改變才調整容量", () => {
  const texture = new FlowTexture(), field = new InkFlow(390, 6000);
  const pixels = texture.encode(field), before = pixels.slice();
  assert.equal(texture.encode(field), pixels);
  field.disturb(80, 300, 35, -15); field.step(1 / 30);
  assert.equal(texture.encode(field), pixels); assert.notDeepEqual(pixels, before);
  const resized = texture.encode(new InkFlow(1440, 4000));
  assert.notEqual(resized.length, pixels.length);
  for (let i = 0; i < resized.length; i += 4) assert.deepEqual([...resized.slice(i, i + 4)], [128, 0, 128, 0]);
});

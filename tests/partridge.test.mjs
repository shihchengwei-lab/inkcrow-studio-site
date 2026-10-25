import test from "node:test";
import assert from "node:assert/strict";
import { mountPartridge, partridgeScenario } from "./helpers/partridge-browser.mjs";

// c4e8252 原始控制器的完整 600 幀姿勢、動作與排程；click 包含每幀處理延遲。
const before = {
  idle: "725161306c83aac668b40fc231fdf31c7e8d00161a1b1cd5c455fc70dcf89194",
  click: "c75f02ae27c83489e6f761424652c29368c521449d7f7244db5ad36e2017399d",
  avoid: "1a3b32ab030bea7947289125a72e7470fab9766d2a03593f9955308a00344e80",
  resume: "5bb448dfb5d9b879cde3cbe16501343095908ddf5ca8332f6d81eef409f7808d",
};
for (const mode of Object.keys(before)) {
  test(`竹雞 ${mode} 的逐幀動作、姿勢與排程和修改前一致`, () => {
    assert.equal(partridgeScenario(mode).digest, before[mode]);
  });
}
const centerClick = app => { const r = app.rect; app.click(r.left + r.width / 2); };
const approach = app => { const r = app.rect; app.move(r.left + r.width * .2, r.top + r.height / 2); };

test("停棲只排單一計時器，離屏保留剩餘等待，飛行隱藏不補算背景時間", () => {
  const app = mountPartridge(); app.visible(true);
  assert.equal(app.scheduledFrames, 0); assert.equal(app.scheduledTimers, 1);
  app.advance(200); app.visible(false);
  assert.equal(app.scheduledTimers, 0);
  app.advance(5000); app.visible(true);
  assert.equal(app.remaining[0], 500);
  app.advance(499); assert.equal(app.pose.kind, "resting");
  app.advance(1); assert.equal(app.pose.kind, "pecking");
  app.click(0, 0); app.advance(120);
  const pose = app.pose;
  app.hidden(true); app.advance(5000);
  assert.deepEqual(app.pose, pose);
  assert.equal(app.scheduledFrames + app.scheduledTimers, 0);
  app.hidden(false); app.advance(16);
  assert.equal(app.pose.kind, "hopping");
  assert.ok(Math.abs(app.pose.x - pose.x) < 4);
  app.unmount();
});

test("點擊高跳連點不堆積；微跳途中只接一次高跳，兩者保持原有高度", () => {
  const single = mountPartridge(), repeated = mountPartridge();
  single.visible(true); repeated.visible(true); centerClick(single); centerClick(repeated);
  let minY = 0;
  for (let i = 0; i < 80; i++) {
    if (i < 20) centerClick(repeated);
    single.advance(); repeated.advance();
    assert.deepEqual(repeated.pose, single.pose);
    minY = Math.min(minY, single.pose.y);
  }
  assert.ok(minY < -8.8 && minY >= -9);
  single.unmount(); repeated.unmount();

  const app = mountPartridge(); app.visible(true); approach(app);
  app.advance(120); assert.equal(app.pose.kind, "hopping");
  centerClick(app); centerClick(app);
  let hops = 0, peak = 0, wasHop = false, settled = false;
  for (let i = 0; i < 100; i++) {
    const pose = app.pose;
    if (pose.kind === "hopping" && !wasHop) hops++;
    if (pose.kind === "landing") settled = true;
    wasHop = pose.kind === "hopping"; peak = Math.min(peak, pose.y);
    app.advance();
  }
  // 接跳不中斷 hopping 狀態；高度證明已接高跳，後續必須落地且停止排幀。
  assert.equal(hops, 1); assert.ok(peak < -8.8); assert.equal(settled, true);
  assert.equal(app.scheduledFrames, 0);
  app.unmount();
});

test("落地等待期間靠近，等待結束使用最新位置判斷躲避", () => {
  const app = mountPartridge(); app.visible(true); approach(app); app.advance(160);
  for (let i = 0; i < 4; i++) app.advance(100);
  assert.equal(app.pose.kind, "landing");
  const r = app.rect; app.move(r.left + r.width * .7, r.top + r.height / 2);
  assert.equal(app.pose.kind, "landing");
  app.advance(260);
  assert.equal(app.pose.kind, "watching");
  app.advance(160); assert.equal(app.pose.kind, "hopping");
  app.unmount();
});

test("遇界反向、途中尺寸改變取消舊落點；空間不足隱藏並停止排程", () => {
  const app = mountPartridge(); app.visible(true);
  const deltas = [];
  for (let i = 0; i < 5; i++) {
    const before = app.pose.x, r = app.rect;
    app.click(r.left + r.width * .2);
    for (let j = 0; j < 60; j++) app.advance();
    deltas.push(app.pose.x - before);
    assert.ok(app.pose.x >= -67 && app.pose.x <= -3);
  }
  assert.ok(deltas.some(d => d > 0) && deltas.some(d => d < 0));
  centerClick(app); app.advance(150); app.resize({ width: 970 });
  assert.equal(app.pose.kind, "resting"); assert.equal(app.pose.y, 0);
  app.resize({ size: 0 });
  assert.equal(app.pose.hidden, true); assert.equal(app.scheduledFrames + app.scheduledTimers, 0);
  app.resize({ size: 110 });
  assert.equal(app.pose.hidden, false); assert.equal(app.pose.kind, "resting");
  app.unmount(); app.lateCallbacks(); app.advance(5000); app.unmount();
  assert.equal(app.scheduledFrames + app.scheduledTimers, 0); assert.equal(app.listeners, 0);
  assert.equal(app.bird.style.transform, "");
});

import test from "node:test";
import assert from "node:assert/strict";
import { mountLogo, logoScenario } from "./helpers/logo-browser.mjs";

// 6827d77 整理前的正式程式：固定輸入下，每次取樣的畫面參數、排程與行為記錄。
const before = {
  "intro": "6fe292ae12081cdbc1aeb7e93ac0e8ce3853d4e00a563a4a13db40a851411a06",
  "seen": "dd01f98586fd4f30f5701165ebf209b0183103082ff8f7283052dd3180b8303b",
  "blocked": "0eb613e1fbfbfd1aefc0e90da2f856ee5c60c61ac4675f03bec6e76235af077d",
  "reduced": "b8ed7357d879d6dff9e75663afc070193b6078a60c179d0410415b973ae6ed21",
  "failed": "2a6383ee70b3c679a7593f0ef5c124facf55bb56bfc69398ad38251e5639d2a6",
  "resume": "fc90bda4802ab7ca182160058b2628e9c7b78e83d915083667e9a20793b32fe4",
  "motion": "6aa4b027e53563a2861800a47ddeb69f1528c08d571d696fb9ee8200a4035e77",
  "slow": "256b5b35a200303de989b04db61c8c5a87535a272a7835444c3f9af6ed5171c0"
};
for (const mode of Object.keys(before)) {
  test(`Logo ${mode} 的逐幀畫面與排程和整理前一致`, () => {
    assert.equal(logoScenario(mode), before[mode]);
  });
}

test("圖片就緒且可見才播放，背景不消耗播放時間", () => {
  const app=mountLogo(); app.visible(true); app.advance(1000);
  assert.equal(app.frames,0); app.decode(); app.advance(100);
  const rise=app.snapshots.at(-1).rise.y;
  app.hidden(true); app.advance(10000);
  assert.equal(app.snapshots.at(-1).rise.y,rise); assert.equal(app.frames,0);
  app.hidden(false); app.advance(16);
  assert.equal(app.host.dataset.phase,"forming"); app.unmount();
});

test("卸載時取消播放與監聽，遲到的圖片完成不會重新啟動", () => {
  const app=mountLogo(); app.visible(true); app.unmount(); app.decode();
  assert.equal(app.frames+app.listeners,0);
});

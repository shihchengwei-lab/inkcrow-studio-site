import test from "node:test";
import assert from "node:assert/strict";
import { mountTitle, titleScenario } from "./helpers/ink-title-browser.mjs";

// 6827d77 整理前的正式程式：固定輸入下，每次取樣的畫面參數、排程與行為記錄。
const before = {
  "hover": "e0d9eed925223bb053d8ba72ea1e5167ed8026e8dfc091a3db5a6a989b69d313",
  "interrupt": "09cb4d63110d686e83ec9f1fa0c8ad53fe166b67d50667a44dd3804bff6079c3",
  "cleanup": "aa0db53d5df3db37f376674785a39daca9103fe43a9bb6d7f124633b9b8dfadc",
  "slow": "7a0ec9503686dc81681815f900cdd32684f20fc84cdd0bb9887fba5e72d5aa7a"
};
for (const mode of Object.keys(before)) {
  test(`標題 ${mode} 的逐幀畫面與排程和整理前一致`, () => {
    assert.equal(titleScenario(mode), before[mode]);
  });
}

test("字元各自暈開，移開後停止排程；卸載移除所有監聽", () => {
  const app = mountTitle();
  app.event(0, "pointerenter"); app.advance();
  assert.equal(app.chars[0].style.filter, "url(#ink-bleed-0)");
  assert.equal(app.chars[1].style.filter, undefined);
  app.event(0, "pointerleave");
  for (let i=0;i<300;i++) app.advance();
  assert.equal(app.frames, 0); assert.equal(app.chars[0].style.filter, "");
  app.unmount();
  assert.equal(app.chars.reduce((n,c)=>n+c.events.size,0),0);
});

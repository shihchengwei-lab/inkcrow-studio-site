import test from "node:test";
import assert from "node:assert/strict";
import { mountNavigation, navigationScenario } from "./helpers/navigation-browser.mjs";

// 6827d77 整理前的正式程式：固定輸入下，每次取樣的畫面參數、排程與行為記錄。
const before = {
  "normal": "ff87c8e63bdb1b91435c38f0a1024406065cfcba186c3cba47a94a7ccad793af",
  "keyboard": "12b0b56eb04d673c9c87063dd4cedd33c9d5764d8e51b12cf4fabe7f6bc76032",
  "hash": "9602f2277ab00e5b0e04b6dd3652f15815ef18ec8906b33799e3955bdc1c679f",
  "reduced": "8104d438979520143a925966a299ec09f93e94f73e03e0c1ce43570e964c0da4",
  "back-cover": "2eeba713f997e3b30996116522ed6ab4cecd4e49d49156f1d823242dce4493a3",
  "back-reveal": "f768d8be65175b6443a77501816f877324bfc14ebabd5db44481b35ab33dda9b",
  "slow": "e5bc88b2bce8e1722a52338ecdf6406720fae117118a5f3aa09a633bc9caa4b7",
  "unmount-wait": "c9596054e4a7dabf93e531cf90a44e9373b4a94551edad7226a5d6882bb1d762"
};
for (const mode of Object.keys(before)) {
  test(`換頁 ${mode} 的預載、路由、遮幕與排程和整理前一致`, async () => {
    assert.equal(await navigationScenario(mode), before[mode]);
  });
}

test("修飾鍵、滑鼠中鍵、下載、外站及同頁錨點保留原生連結操作", async () => {
  const app=mountNavigation();
  for(const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]) {
    assert.equal(app.click(app.links[0],options), Boolean(options.defaultPrevented));
  }
  for(const a of [app.anchor("/privacy/",{download:true}),app.anchor("/terms/",{target:"_blank"}),app.anchor("https://outside.example/"),app.anchor("/#work"),app.anchor("/missing/")]) assert.equal(app.click(a),false);
  assert.deepEqual(app.calls,[]); assert.equal(app.covers.length,0); await app.unmount();
});

test("意圖預載共用站內判斷，保留查詢字串且不預載錨點", async () => {
  const app=mountNavigation();
  app.intent(app.anchor("/privacy/?lang=zh#details"),"focusin");
  app.intent(app.anchor("/terms/",{target:"_self"}),"touchstart");
  app.intent(app.anchor("https://outside.example/"));
  assert.deepEqual(app.calls,[["prefetch","/privacy/?lang=zh"],["prefetch","/terms/"]]); await app.unmount();
});

test("離開或上一頁取消換頁，遲到的覆幕完成不會導向舊目的地", async () => {
  for(const action of ["unmount","back"]) {
    const app=mountNavigation(); app.click(); const animation=app.covers[0].animations[0];
    await app[action](); animation.finish(); await Promise.resolve(); await Promise.resolve();
    assert.equal(app.calls.some(([kind])=>kind==="push"),false);
    assert.equal(app.frames+app.timers+app.covers.length,0);
    await app.unmount(); assert.equal(app.listeners,0);
  }
});

test("路由更新或卸載後，舊的視窗量測不再預載舊頁連結", async () => {
  const app=mountNavigation(); await app.route("/privacy/");
  app.calls.length=0; app.lateIntersection();
  assert.deepEqual(app.calls,[]);
  await app.unmount(); app.lateIntersection(1);
  assert.deepEqual(app.calls,[]);
});

import { test as base, expect } from "playwright/test";

// 真實 DOM、路由與瀏覽器輸入。每項使用新 context，避免分頁記錄互相污染。
const test = base.extend({
  page: async ({ page, baseURL }, runTest) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", response => {
      if (new URL(response.url()).origin === new URL(baseURL).origin && response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await runTest(page);
    expect(errors, "不允許執行錯誤、hydration 錯誤或站內資源缺檔").toEqual([]);
  },
});

async function home(page) {
  await page.goto("/");
  await expect(page.locator(".hero-title")).toHaveText("墨鴉");
  await page.evaluate(() => document.fonts.ready);
}

const routeIs = path => url => url.pathname.replace(/\/$/, "") === path;
const noCover = page => expect(page.locator(".nav-ink")).toHaveCount(0);

test.describe("正文不依賴動畫啟動", () => {
  test.use({ javaScriptEnabled: false });
  test("JavaScript 未執行時，工作室與作品正文仍可讀", async ({ page }) => {
    await page.goto("/");
    const sections = page.locator(".fade-up");
    expect(await sections.count()).toBeGreaterThan(0);
    for (const section of await sections.all()) {
      await expect(section).toHaveCSS("opacity", "1");
      await expect(section).toHaveCSS("transform", "none");
    }
    await expect(page.locator(".studio-right")).toContainText("墨鴉是一間獨立工作室");
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.webp");
  });
});

test("首頁與兩個法律頁正常往返，錨點保留，窄螢幕不溢出", async ({ page, isMobile }) => {
  await home(page);
  const origin = await page.evaluate(() => performance.timeOrigin);
  for (const route of ["privacy", "terms"]) {
    const link = page.locator(`a[href="/${route}"]`);
    if (isMobile) await link.tap(); else await link.click();
    await page.waitForURL(routeIs("/" + route)); await noCover(page);
    await expect(page.locator(".legal-content h1")).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    await page.locator(".legal-back").focus(); await page.keyboard.press("Enter");
    await page.waitForURL(routeIs("")); await noCover(page);
  }
  await page.locator(".hero-chip").click(); await page.waitForURL("**/#work"); await noCover(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Logo 可啟用重播並離屏暫停，桌機標題各自暈墨", async ({ page, isMobile }) => {
  await page.clock.install(); await home(page);
  const logo = page.locator(".studio-logo");
  await logo.scrollIntoViewIfNeeded(); await expect(logo).toBeInViewport({ ratio: 0.2 });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(3000); await expect(logo).toHaveAttribute("data-phase", "still");
  if (isMobile) await logo.tap(); else { await logo.focus(); await page.keyboard.press("Enter"); }
  await page.clock.runFor(320); await expect(logo).toHaveAttribute("data-phase", "replaying");
  const ring = page.locator("#logo-orbit > circle").first();
  const offset = await ring.getAttribute("stroke-dashoffset");
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect(logo).not.toBeInViewport(); await page.clock.runFor(3000);
  await expect(ring).toHaveAttribute("stroke-dashoffset", offset);
  await logo.scrollIntoViewIfNeeded(); await expect(logo).toBeInViewport({ ratio: 0.2 });
  await page.clock.runFor(2000); await expect(logo).toHaveAttribute("data-phase", "still");
  if (!isMobile) {
    await logo.focus(); await page.keyboard.press("Space");
    await expect(logo).toHaveAttribute("data-phase", "replaying"); await page.clock.runFor(2000);
    const chars = page.locator(".ink-char"); await chars.first().hover(); await page.clock.runFor(1200);
    const blur = await chars.first().locator("feGaussianBlur").getAttribute("stdDeviation");
    expect(Number(blur)).toBeGreaterThan(0);
    expect(await chars.nth(1).evaluate(element => element.style.filter)).toBe("");
    await page.mouse.move(0, 0); await page.clock.runFor(2500);
    expect(await chars.first().evaluate(element => element.style.filter)).toBe("");
  }
});

test("減少動態時 Logo 與換頁不播放動畫", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await home(page);
  const logo = page.locator(".studio-logo"); await expect(logo).toHaveAttribute("data-phase", "still");
  if (isMobile) await logo.tap(); else await logo.click();
  await expect(logo).toHaveAttribute("data-phase", "still");
  const coverPhases = [];
  await page.exposeFunction("recordCover", phase => coverPhases.push(phase));
  await page.evaluate(() => {
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && node.matches(".nav-ink")) window.recordCover(node.dataset.phase);
      }
    }).observe(document.body, { childList: true });
  });
  await page.locator('a[href="/privacy"]').click();
  await page.waitForURL(routeIs("/privacy")); await noCover(page);
  expect(coverPhases).toEqual([]);
});

test("慢速換頁與連點只完成第一個目的地，返回可繼續操作", async ({ page }) => {
  let release, sawRequest;
  const gate = new Promise(resolve => { release = resolve; });
  const held = new Promise(resolve => { sawRequest = resolve; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/privacy/") && url.pathname.endsWith(".txt")) {
      sawRequest(); await gate;
    }
    await route.continue();
  });
  try {
    await home(page); await page.locator('a[href="/privacy"]').click();
    await held; await expect(page.locator(".nav-ink")).toHaveAttribute("data-phase", "waiting");
    await expect(page.locator(".home-page")).toBeAttached();
    await page.locator('a[href="/terms"]').click(); await expect(page.locator(".nav-ink")).toHaveCount(1);
    release(); await page.waitForURL(routeIs("/privacy")); await noCover(page);
    await page.goBack(); await page.waitForURL(routeIs("")); await noCover(page);
    await page.locator('a[href="/terms"]').click(); await page.waitForURL(routeIs("/terms")); await noCover(page);
  } finally { release(); }
});

test("手機手勢保持原生捲動，裝飾不造成橫向溢出", async ({ page, isMobile }) => {
  test.skip(!isMobile, "此項只檢查觸控視窗");
  await home(page);
  await expect(page.locator(".butterfly-deco")).toBeHidden();
  await page.evaluate(() => {
    window.touchMoves = [];
    window.addEventListener("touchmove", event => window.touchMoves.push(event.defaultPrevented), { passive: true });
  });
  const session = await page.context().newCDPSession(page);
  const x = page.viewportSize().width * 0.6;
  const touch = (type, y) => session.send("Input.dispatchTouchEvent", {
    type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await touch("touchStart", 650);
  for (let y = 610; y >= 330; y -= 40) await touch("touchMove", y);
  await touch("touchEnd");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
  const moves = await page.evaluate(() => window.touchMoves);
  expect(moves.length).toBeGreaterThan(0); expect(moves.every(prevented => !prevented)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

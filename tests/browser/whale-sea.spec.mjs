import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.whaleFrames = 0;
    window.whaleContexts = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (this.classList.contains("whale-canvas") && kind === "webgl") window.whaleContexts++;
      return getContext.call(this, kind, ...args);
    };
    const draw = WebGLRenderingContext.prototype.drawElements;
    WebGLRenderingContext.prototype.drawElements = function (...args) {
      if (this.canvas.classList.contains("whale-canvas")) window.whaleFrames++;
      return draw.apply(this, args);
    };
  });
});

test("鯨魚持續游動，分頁隱藏時停止繪製，返回後接續", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const scene = page.locator(".whale-sea");
  await expect(scene).toHaveAttribute("data-mode", "swimming");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.addStyleTag({ content: ".whale-sea{z-index:1000;opacity:1;mask-image:none;background:#F5EFE3}" });
  const before = await page.locator(".whale-canvas").screenshot();
  const frames = await page.evaluate(() => window.whaleFrames);
  await page.clock.runFor(2000);
  const after = await page.locator(".whale-canvas").screenshot();
  expect(before.equals(after)).toBe(false);
  const active = await page.evaluate(start => window.whaleFrames - start, frames);
  expect(active).toBeGreaterThan(80);
  expect(active).toBeLessThanOrEqual(122);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const paused = await page.evaluate(() => window.whaleFrames);
  await page.clock.runFor(3000);
  expect(await page.evaluate(() => window.whaleFrames)).toBe(paused);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => window.whaleFrames)).toBeGreaterThan(paused);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("減少動態不建立鯨魚繪圖資源，切換偏好後可停止及恢復", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".whale-still")).toBeVisible();
  await expect(page.locator(".whale-canvas")).toBeHidden();
  await page.locator(".whale-still").evaluate(image => image.decode());
  expect(await page.evaluate(() => window.whaleContexts)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".whale-sea")).toHaveAttribute("data-mode", "swimming");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".whale-sea")).toHaveAttribute("data-mode", "still");
  const frames = await page.evaluate(() => window.whaleFrames);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.whaleFrames)).toBe(frames);
  await expect(page.locator(".whale-still")).toBeVisible();
});

test("連續調整視窗後沿用繪圖資源並繼續游動，暫停與恢復仍正常", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const scene = page.locator(".whale-sea");
  await expect(scene).toHaveAttribute("data-mode", "swimming");
  const contexts = await page.evaluate(() => window.whaleContexts);
  for (const [width, height] of [[320, 900], [844, 390], [1920, 1080], [390, 844], [1440, 900]]) {
    const frames = await page.evaluate(() => window.whaleFrames);
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => window.whaleFrames)).toBeGreaterThan(frames);
    await expect(scene).toHaveAttribute("data-mode", "swimming");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await page.evaluate(() => window.whaleContexts)).toBe(contexts);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-mode", "still");
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(scene).toHaveAttribute("data-mode", "swimming");
  const frames = await page.evaluate(() => window.whaleFrames);
  await expect.poll(() => page.evaluate(() => window.whaleFrames)).toBeGreaterThan(frames);
  expect(errors).toEqual([]);
});

test("繪圖資源失效後完整退回靜態鯨魚，法律頁不留下動畫", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".whale-sea")).toHaveAttribute("data-mode", "swimming");
  await page.locator(".whale-canvas").evaluate(canvas => {
    canvas.getContext("webgl").getExtension("WEBGL_lose_context").loseContext();
  });
  await expect(page.locator(".whale-sea")).toHaveAttribute("data-mode", "still");
  await expect(page.locator(".whale-still")).toBeVisible();
  await page.locator('a[href="/privacy"]').click();
  await page.waitForURL("**/privacy/");
  await expect(page.locator(".nav-ink")).toHaveCount(0);
  await expect(page.locator(".whale-sea")).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body, "::before").backgroundImage)).toContain("taiwan_map_bg.webp");
  const frames = await page.evaluate(() => window.whaleFrames);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.whaleFrames)).toBe(frames);
  await page.locator(".legal-back").click();
  await page.waitForURL(url => url.pathname === "/");
  await expect(page.locator(".whale-sea")).toHaveAttribute("data-mode", "swimming");
});

test.describe("靜態替代", () => {
  test.use({ javaScriptEnabled: false });
  test("未啟用 JavaScript 仍有完整鯨魚、海圖及正文", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".whale-still")).toBeVisible();
    await expect(page.locator(".whale-canvas")).toBeHidden();
    expect(await page.locator(".whale-still").evaluate(image => image.complete && image.naturalWidth === 941)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body, "::before").backgroundImage)).toContain("sea-chart.webp");
    await expect(page.locator(".studio-right")).toContainText("墨鴉是一間獨立工作室");
  });
});

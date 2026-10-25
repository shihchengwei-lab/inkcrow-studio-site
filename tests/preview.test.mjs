import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { createPreviewServer } from "../scripts/preview.mjs";
import { normalizeExportSegments, writePreviewSnapshot } from "../scripts/finalize-export.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "inkcrow-preview-test-"));
  const root = join(directory, "out");
  t.after(async () => {
    assert.ok(relative(tmpdir(), directory).startsWith("inkcrow-preview-test-"));
    await rm(directory, { recursive: true });
  });
  const put = async (name, body) => {
    const path = join(root, name);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, body);
  };
  await put("index.html", "<h1>Home</h1>");
  await put("404.html", "<h1>Missing</h1>");
  await put("privacy/index.html", "<h1>Privacy</h1>");
  return { root, put };
}

async function serve(t, root) {
  const snapshot = join(root, "..", "preview.json");
  await writePreviewSnapshot(root, snapshot);
  const server = await createPreviewServer(snapshot);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test("預覽只提供實檔，保留法律頁、查詢字串、MIME 與 HEAD", async t => {
  const { root, put } = await fixture(t);
  await put("_next/app.js", "export const value = 1;");
  const base = await serve(t, root);
  assert.equal(await (await fetch(base)).text(), "<h1>Home</h1>");
  const redirect = await fetch(base + "/privacy?lang=zh", { redirect: "manual" });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get("location"), "/privacy/?lang=zh");
  assert.equal(await (await fetch(base + "/privacy/")).text(), "<h1>Privacy</h1>");
  const head = await fetch(base + "/_next/app.js", { method: "HEAD" });
  assert.equal(head.status, 200); assert.match(head.headers.get("content-type"), /javascript/);
  assert.ok(Number(head.headers.get("content-length")) > 0); assert.equal(await head.text(), "");
});

test("缺檔、非法網址與非讀取方法不被首頁成功回應掩蓋", async t => {
  const { root } = await fixture(t), base = await serve(t, root);
  for (const path of ["/missing.js", "/privacy/__next.missing.txt", "/..%2Fsecret.txt"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404); assert.equal(await response.text(), "<h1>Missing</h1>");
  }
  assert.equal((await fetch(base + "/%invalid")).status, 400);
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
});

test("Windows segment 校正產生實體發布檔，保留內容且可重複執行", async t => {
  const { root, put } = await fixture(t);
  await put("privacy/__next.privacy/__PAGE__.txt", "route payload");
  await put("assets/nested/keep.txt", "unchanged");
  assert.equal(await normalizeExportSegments(root), 1);
  assert.equal(await readFile(join(root, "privacy/__next.privacy.__PAGE__.txt"), "utf8"), "route payload");
  assert.equal(await stat(join(root, "privacy/__next.privacy/__PAGE__.txt")).catch(() => null), null);
  assert.equal(await readFile(join(root, "assets/nested/keep.txt"), "utf8"), "unchanged");
  assert.equal(await normalizeExportSegments(root), 0);
  const response = await fetch(await serve(t, root) + "/privacy/__next.privacy.__PAGE__.txt?_rsc=example");
  assert.equal(response.status, 200); assert.equal(await response.text(), "route payload");
});

test("校正拒絕覆寫既有檔，沒有 build 時預覽明確失敗", async t => {
  const { root, put } = await fixture(t);
  await put("privacy/__next.privacy/__PAGE__.txt", "nested");
  await put("privacy/__next.privacy.__PAGE__.txt", "existing");
  await assert.rejects(normalizeExportSegments(root), /拒絕覆寫/);
  assert.equal(await readFile(join(root, "privacy/__next.privacy.__PAGE__.txt"), "utf8"), "existing");
  await assert.rejects(createPreviewServer(join(root, "missing")), /npm run build/);
});

test("重建與刪除 out 不改變已開啟的預覽；新預覽只讀新的完成成品", async t => {
  const { root, put } = await fixture(t);
  await put("_next/old.js", "old script");
  const before = await serve(t, root);
  await put("index.html", "<h1>New home</h1>");
  await put("_next/new.js", "new script");
  await rm(join(root, "_next/old.js"));
  const after = await serve(t, root);
  await rm(join(root, "index.html"));
  assert.equal(await (await fetch(before)).text(), "<h1>Home</h1>");
  assert.equal(await (await fetch(before + "/_next/old.js")).text(), "old script");
  assert.equal((await fetch(before + "/_next/new.js")).status, 404);
  assert.equal(await (await fetch(after)).text(), "<h1>New home</h1>");
  assert.equal(await (await fetch(after + "/_next/new.js")).text(), "new script");
  assert.equal((await fetch(after + "/_next/old.js")).status, 404);
  const snapshot = join(root, "..", "preview.json"), completed = await readFile(snapshot);
  await assert.rejects(writePreviewSnapshot(root, snapshot), /npm run build/);
  assert.deepEqual(await readFile(snapshot), completed);
});

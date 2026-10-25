import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SNAPSHOT_PATH } from "./finalize-export.mjs";

export const DEFAULT_PORT = 4317;
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".mp3": "audio/mpeg",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

/** 一次載入完成建置的全部位元組；請求只讀同一份成品，缺檔仍為 404。 */
export async function createPreviewServer(snapshotPath = SNAPSHOT_PATH) {
  const files = new Map(), pages = new Map();
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
    if (typeof snapshot["/index.html"] !== "string") throw new Error("缺少首頁");
  } catch {
    throw new Error("找不到可讀取的完成建置，請先執行 npm run build。");
  }
  for (const [url, encoded] of Object.entries(snapshot)) {
    const file = { body: Buffer.from(encoded, "base64"), type: contentTypes[extname(url)] ?? "application/octet-stream" };
    files.set(url, file);
    if (url.endsWith("/index.html")) pages.set(url.slice(0, -10), file);
  }
  return createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    let url, pathname;
    try {
      url = new URL(request.url, "http://127.0.0.1");
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400); response.end(); return;
    }
    if (!pathname.endsWith("/") && pages.has(pathname + "/")) {
      response.writeHead(308, { Location: url.pathname + "/" + url.search }); response.end(); return;
    }
    const file = files.get(pathname) ?? pages.get(pathname);
    const selected = file ?? files.get("/404.html");
    const body = selected?.body ?? Buffer.from("Not found");
    response.writeHead(file ? 200 : 404, {
      "Content-Type": selected?.type ?? "text/plain",
      "Content-Length": body.length,
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { port: { type: "string", default: String(DEFAULT_PORT) } } });
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("port 必須介於 1 與 65535。");
    const server = await createPreviewServer();
    server.on("error", error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, "127.0.0.1", () => console.log(`靜態預覽：http://127.0.0.1:${port}/（固定完成版本；停止：Ctrl+C）`));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

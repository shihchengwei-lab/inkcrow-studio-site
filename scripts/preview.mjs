import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const DEFAULT_PORT = 4317;
const exportRoot = fileURLToPath(new URL("../out/", import.meta.url));
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".mp3": "audio/mpeg",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

/** 只提供既有匯出檔，不以首頁掩蓋缺檔；不啟動 Next 開發伺服器。 */
export async function createPreviewServer(root = exportRoot) {
  const files = new Map(), pages = new Map();
  if (!(await stat(join(root, "index.html")).catch(() => null))?.isFile()) {
    throw new Error("找不到 out/index.html，請先執行 npm run build。");
  }
  const collect = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) {
        const url = "/" + relative(root, path).split(sep).join("/");
        files.set(url, path);
        if (entry.name === "index.html") pages.set(url.slice(0, -10), path);
      }
    }
  };
  await collect(root);
  return createServer(async (request, response) => {
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
    try {
      const body = selected ? await readFile(selected) : Buffer.from("Not found");
      response.writeHead(file ? 200 : 404, {
        "Content-Type": selected ? contentTypes[extname(selected)] ?? "application/octet-stream" : "text/plain",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404); response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { port: { type: "string", default: String(DEFAULT_PORT) } } });
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("port 必須介於 1 與 65535。");
    const server = await createPreviewServer();
    server.on("error", error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, "127.0.0.1", () => console.log(`靜態預覽：http://127.0.0.1:${port}/（停止：Ctrl+C）`));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

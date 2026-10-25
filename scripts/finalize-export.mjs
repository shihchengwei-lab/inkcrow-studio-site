import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const exportRoot = fileURLToPath(new URL("../out/", import.meta.url));
export const SNAPSHOT_PATH = fileURLToPath(new URL("../.preview/site.json", import.meta.url));

/** Next 16.4.3 仍有 Windows 路徑分隔問題；只在建置邊界校正實體 segment 檔名。 */
export async function normalizeExportSegments(root = exportRoot) {
  root = resolve(root);
  const moves = [];
  const collect = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const source = join(directory, entry.name);
      if (entry.isDirectory()) await collect(source);
      else if (entry.isFile()) {
        const name = "/" + relative(root, source).split(sep).join("/");
        const segment = name.indexOf("/__next.");
        if (segment < 0 || !name.endsWith(".txt")) continue;
        const flat = name.slice(0, segment + 1) + name.slice(segment + 1).replaceAll("/", ".");
        if (flat === name) continue;
        const destination = resolve(root, "." + flat);
        for (const path of [source, destination]) {
          const inside = relative(root, path);
          if (inside.startsWith("..") || isAbsolute(inside)) throw new Error("匯出檔必須位於 out 內。");
        }
        if (await stat(destination).catch(() => null)) throw new Error(`拒絕覆寫已存在的匯出檔：${flat}`);
        if (moves.some(move => move.destination === destination)) throw new Error(`重複的匯出檔名：${flat}`);
        moves.push({ source, destination });
      }
    }
  };
  await collect(root);
  for (const { source, destination } of moves) await rename(source, destination);
  return moves.length;
}

/** 完整讀取成功才以單一檔案發布；預覽不再依賴之後可能被重建的 out。 */
export async function writePreviewSnapshot(root = exportRoot, destination = SNAPSHOT_PATH) {
  if (!(await stat(join(root, "index.html")).catch(() => null))?.isFile()) {
    throw new Error("找不到 out/index.html，請先執行 npm run build。");
  }
  const files = {};
  const collect = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) {
        files["/" + relative(root, path).split(sep).join("/")] = (await readFile(path)).toString("base64");
      }
    }
  };
  await collect(root);
  await mkdir(join(destination, ".."), { recursive: true });
  const temporary = destination + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(files));
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const count = await normalizeExportSegments();
    await writePreviewSnapshot();
    console.log(`完成匯出與預覽成品（路由檔名校正 ${count} 檔）。`);
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

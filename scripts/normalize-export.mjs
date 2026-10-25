import { readdir, rename, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const exportRoot = fileURLToPath(new URL("../out/", import.meta.url));

/** Next 16.2.9 的 Windows 匯出留下反斜線；校正成 Linux 發布使用的 segment 檔名。 */
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const count = await normalizeExportSegments();
    console.log(`匯出路由資料檔名已確認（校正 ${count} 檔）。`);
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
export default async function LegalDocument({ document }: { document: "privacy" | "terms" }) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "content", `${document}.md`),
    "utf-8"
  );
  const body = raw.replace(/^---[\s\S]*?---\r?\n/, "");
  const html = await marked.parse(body, { gfm: true });
  return (
    <article className="legal-page container">
      {/* 紙幕換頁由 InkNavigation 接管；保留原生連結的修飾鍵與無腳本行為。 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="legal-back">
        ← 回首頁
      </a>
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}

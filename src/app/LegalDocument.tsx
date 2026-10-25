import fs from "fs/promises";
import path from "path";
import { Marked } from "marked";

const legalMarkdown = new Marked({
  gfm: true,
  renderer: {
    table({ header, rows }) {
      const pairs = header.length === 2;
      const headings = header.map(cell =>
        `<th scope="col" role="columnheader">${this.parser.parseInline(cell.tokens)}</th>`
      ).join("");
      const entries = rows.map(row => {
        const cells = row.map((cell, index) => index === 0
          ? `<th scope="row" role="rowheader">${this.parser.parseInline(cell.tokens)}</th>`
          : `<td role="cell">${this.parser.parseInline(cell.tokens)}</td>`
        ).join("");
        return `<tr role="row">${cells}</tr>`;
      }).join("");
      // 明確保留表格語意，窄版改變 CSS 排列後仍能辨認欄頭與列標籤。
      const table = `<table role="table"${pairs ? ' class="legal-pairs"' : ""}>
        <thead role="rowgroup"><tr role="row">${headings}</tr></thead>
        <tbody role="rowgroup">${entries}</tbody>
      </table>`;
      return pairs ? table
        : `<div class="legal-table-scroll" tabindex="0" role="region" aria-label="可左右捲動的資料表">${table}</div>`;
    },
  },
});

export default async function LegalDocument({ document }: { document: "privacy" | "terms" }) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "content", `${document}.md`),
    "utf-8"
  );
  const body = raw.replace(/^---[\s\S]*?---\r?\n/, "");
  const html = await legalMarkdown.parse(body);
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

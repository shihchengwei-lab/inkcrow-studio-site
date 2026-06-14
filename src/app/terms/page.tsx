import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "願行 — 服務條款",
  description: "願行服務條款（Terms of Service）",
};

export default async function TermsPage() {
  const raw = await fs.readFile(
    path.join(process.cwd(), "_legacy", "terms.md"),
    "utf-8"
  );
  const body = raw.replace(/^---[\s\S]*?---\r?\n/, "");
  const html = await marked.parse(body, { gfm: true });
  return (
    <article className="legal-page container">
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

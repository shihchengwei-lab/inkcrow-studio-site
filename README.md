# inkcrow-studio.com

墨鴉工作室官方網站。Next.js 16 + React 19、靜態匯出（static export）部署至 GitHub Pages、綁定自訂網域 `inkcrow-studio.com`。

## 站點結構

| 路徑 | 用途 |
|---|---|
| `/` | 工作室介紹 + 願行簡介 |
| `/privacy/` | 願行隱私權政策（Play Store「Privacy Policy URL」用） |
| `/terms/` | 願行服務條款 |
| `/.well-known/security.txt` | 安全研究員聯絡方式（RFC 9116） |

## 技術棧

- Next.js 16（App Router）
- React 19、TypeScript 5
- 靜態匯出（`output: 'export'`）—— build 完落 `out/`
- 字體：Google Fonts CDN（Noto Serif TC、Cormorant Garamond、Source Serif 4、IBM Plex Mono）

## 本地預覽

```bash
npm install
npm run dev
# http://localhost:3000
```

## 本地 build

```bash
npm run build
# 產出在 out/，可用任何 static server 預覽
npx serve out
```

## 更新法律文件流程

當 [`Yuanxing` repo](https://github.com/shihchengwei-lab/Yuanxing) 的 `docs/legal/PRIVACY.md` 或 `TERMS.md` 更新時：

1. 將更新後內容複製到本 repo 的 `_legacy/privacy.md` / `_legacy/terms.md`
2. 保留檔頭 Jekyll front matter（`---` 區塊；Next.js 端 build 時會自動 strip）
3. 確認內部連結（例：TERMS 中的 `/privacy/`）正確
4. Commit + push 至 `master`，GitHub Actions 自動 build + deploy（約 1-3 分鐘）

## Deploy

由 `.github/workflows/deploy.yml` 自動處理：

1. push 到 master
2. GitHub Actions 跑 `npm ci` + `npm run build`
3. 把 `out/` 上傳到 `actions/upload-pages-artifact`
4. GitHub Pages 從 artifact 服務、綁 `inkcrow-studio.com` 自訂網域

首次切換：到 repo Settings → Pages、把「Build and deployment source」從 `Branch` 改成 `GitHub Actions`。

CNAME 在 `public/CNAME`、build 時帶到 `out/CNAME`、artifact 保留。

## 歷史 Jekyll 版本

舊 Jekyll source 保留在 `_legacy/`，含 `_config.yml`、`index.md`、`privacy.md`、`terms.md`、`assets-jekyll/`。Git 歷史完整保留 commit history、可隨時 revert。

## 設計 mockup 過程

`_mockup/v0.5.html` 是設計討論過程的 HTML mockup（不 deploy）。

## 聯絡

support@inkcrow-studio.com

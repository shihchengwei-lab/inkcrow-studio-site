# inkcrow-studio.com

墨鴉工作室官方網站。Next.js 16 + React 19、靜態匯出（static export）部署至 GitHub Pages、綁定自訂網域 `inkcrow-studio.com`。

## 站點結構

| 路徑 | 用途 |
|---|---|
| `/` | 工作室介紹 + 願行簡介；全幅淡墨隨游標或手指擾動、慢慢歸攏，紙張隨捲動由新變舊；保留標題停留暈墨、線香煙霧、蝴蝶與竹雞 |
| `/privacy/` | 願行隱私權政策（Play Store「Privacy Policy URL」用） |
| `/terms/` | 願行服務條款 |
| `/.well-known/security.txt` | 安全研究員聯絡方式（RFC 9116） |

首頁水墨在 `src/app/WaterInk.tsx`、`water-ink.ts` 與 `water-ink.css`，既有標題、煙霧與生物互動在 `Immersion.tsx`。同一分頁首次進首頁時淡墨約 5 秒成形，內容立即可讀；重新整理與從條款頁返回不重播。水墨歸攏後停止繪製，手機手勢同時正常捲頁與擾墨。

紙張隨捲動轉為溫潤泛黃、帶纖維與輕微邊緣沉色的古紙，往上恢復新紙。開啟系統「減少動態」、無法使用 WebGL，或降低水墨細節後仍偵測到持續低幀率時，使用靜態紙墨與上新下舊的紙張。實機觸控手感、耗電與跨瀏覽器表現仍需實測。完整行為與驗收條件見 [首頁水墨規格](docs/homepage-water-ink-spec.md)。

首頁與條款頁之間會先預載內容，在紙幕下完成頁內切換，再從點擊位置用約 250ms 向外暈開、露出新頁；鍵盤操作則從連結中心展開（`src/app/InkNavigation.tsx`、`globals.css`）。正文維持原位，沒有捲軸造型；系統要求減少動態時直接換頁。

Logo 使用原圖遮罩：首次看見時約 2.4 秒由墨瓶向上成形，再收完外圈；游標附近輕微暈墨，離開還原。完整出場每個分頁只播一次；點擊、點按或鍵盤啟用 Logo 可用約 1.6 秒重播：以約 1.1 秒畫完外側墨環，點上左點後稍停，再點右點，中央圖形和文字保持完整。減少動態時直接顯示原圖（`src/app/StudioLogo.tsx`、`studio-logo.css`）。

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

1. 將更新後內容複製到本 repo 的 `content/privacy.md` / `content/terms.md`
2. 檔頭若有 `---` 區塊（舊 Jekyll 留下的 front matter），可保留或刪除；Next.js 端 build 時會自動去掉
3. 確認內部連結（例：TERMS 中的 `/privacy/`）正確
4. Commit + push 至 `main`，GitHub Actions 自動 build + deploy（約 1-3 分鐘）

## Deploy

由 `.github/workflows/deploy.yml` 自動處理：

1. push 到 main
2. GitHub Actions 跑 `npm ci` + `npm run build`
3. 把 `out/` 上傳到 `actions/upload-pages-artifact`
4. GitHub Pages 從 artifact 服務、綁 `inkcrow-studio.com` 自訂網域

首次切換：到 repo Settings → Pages、把「Build and deployment source」從 `Branch` 改成 `GitHub Actions`。

CNAME 在 `public/CNAME`、build 時帶到 `out/CNAME`、artifact 保留。

## 歷史 Jekyll 版本

舊 Jekyll 版的原始檔已從倉庫移除，可在 commit `b04e742`（改成 Next.js 的那一次）之前的 git 歷史找回。

## 聯絡

support@inkcrow-studio.com

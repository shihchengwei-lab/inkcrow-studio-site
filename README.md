# inkcrow-studio.com

墨鴉工作室官方網站。Next.js 16 + React 19、靜態匯出（static export）部署至 GitHub Pages、綁定自訂網域 `inkcrow-studio.com`。

## 站點結構

| 路徑 | 用途 |
|---|---|
| `/` | 工作室介紹 + 願行簡介；全幅淡墨隨游標或手指擾動、慢慢歸攏，紙張隨捲動由新變舊；保留標題停留暈墨、線香煙霧、蝴蝶與竹雞 |
| `/privacy/` | 願行隱私權政策（Play Store「Privacy Policy URL」用） |
| `/terms/` | 願行服務條款 |
| `/.well-known/security.txt` | 安全研究員聯絡方式（RFC 9116） |

首頁水墨在 `src/app/WaterInk.tsx`、`water-ink/` 與 `water-ink.css`，標題文字、濾鏡與互動在 `InkTitle.tsx`、`ink-title.ts`，線香煙霧在 `smoke.ts`，蝴蝶動作規則在 `butterfly/model.ts`，瀏覽器操作在 `butterfly.ts`，圖層在 `ButterflyArtwork.tsx`，竹雞在 `partridge.ts` 與 `PartridgeArtwork.tsx`。同一分頁第一次實際進首頁時淡墨約 5 秒成形，即使先開條款頁也會播放；之後重新整理或返回首頁不重播。觀看記錄由水墨元件統一管理，內容立即可讀。水墨歸攏後停止逐幀繪製，手機手勢同時正常捲頁與擾墨。

願力隨同一分頁的可見停留時間累積：前 30 秒維持基底，之後水墨從兩側滲向中央、煙絲逐漸溢出圖面上緣，Logo 墨環外沿浮出淡墨暈，3 分鐘封頂。切換分頁暫停；進出條款頁與重新整理保留進度，可見的條款閱讀時間也計入。由共用版面的 `WishPresence.tsx` 與 `wish-progress.ts` 統一計時；水墨安定時只隨每秒願力變化重畫一次，封頂後停止這項更新。

兩張人物圖起初都讓神明背對：老街大圖在可見停留滿 2 分鐘後回頭；田野同行圖在抵達頁底再往上捲時回頭。玩家與場景保持原樣，觸發後同分頁保留結果，減少動態時直接切換。詳見[彩蛋規格與圖像來源](docs/character-easter-eggs.md)。

線香持續冒出柔邊煙絲，游標或手指劃過會撥開煙流、帶出短暫旋渦，停手後逐漸恢復煙柱。觸控保持正常捲頁；煙霧離開畫面或分頁隱藏時停止繪製，減少動態時保留原始插畫。

蝴蝶沿用原圖分層振翅，身體與觸角保持完整。停留時偶爾輕振翅、短距離飛行；游標慢慢靠近時轉身注意，太靠近或快速掃過時背離游標飛開，追近時持續轉向，拉開距離才減速停棲。游標離開原位置後才返回附近。停棲時停止逐幀更新，減少動態時顯示原圖；900px 以下沿用隱藏裝飾的規則。

紙張隨捲動轉為溫潤泛黃、帶纖維與輕微邊緣沉色的古紙，往上恢復新紙。開啟系統「減少動態」、無法使用 WebGL，或降低水墨細節後仍偵測到持續低幀率時，使用靜態紙墨與上新下舊的紙張。實機觸控手感、耗電與跨瀏覽器表現仍需實測。完整行為與驗收條件見 [首頁水墨規格](docs/homepage-water-ink-spec.md)。

首頁與條款頁之間會先預載內容，在紙幕下完成頁內切換，再從點擊位置用約 250ms 向外暈開、露出新頁；鍵盤操作則從連結中心展開（`src/app/InkNavigation.tsx`、`ink-navigation/`）。正文維持原位，沒有捲軸造型；系統要求減少動態時直接換頁。

Logo 使用原圖遮罩：首次看見時約 2.4 秒由墨瓶向上成形，再收完外圈；游標附近輕微暈墨，離開還原。完整出場每個分頁只播一次；點擊、點按或鍵盤啟用 Logo 可用約 1.6 秒重播：以約 1.1 秒畫完外側墨環，點上左點後稍停，再點右點，中央圖形和文字保持完整。減少動態時直接顯示原圖（`src/app/StudioLogo.tsx`、`studio-logo/`、`studio-logo.css`）。

竹雞沿用原啄食動畫的畫格，啄食間穿插停頓；游標靠近時先抬頭察覺，再以約 2–3.5px 的微跳躲向遠離游標的一側；游標持續追近才再退，停著不連跳，落點將碰到邊界時反向短跳。點擊或鍵盤啟用時先沉身、快速離地，再緩一下落地；點中央比邊緣反應稍強，遇界同樣反向，短跳約 20–32px、離地約 6–9px，落地停頓後恢復。微跳途中點擊會在落地後接一次較高的跳躍，連點不累積排隊。活動固定在封測按鈕右側留白，連點不疊加位移；空間不足時隱藏，900px 以下維持隱藏。原始素材保留，`partridge-frames.webp` 是原動畫的畫格圖集，尺寸與每格時長由 `partridge-frames.json` 共用。

Logo 或竹雞所在區塊離開畫面、分頁隱藏時，暫停動畫與等待時間，回到可見範圍再接續。竹雞啄食只在換格時更新，停頓使用計時器，只有短跳使用逐幀更新；減少動態時顯示同一素材的抬頭畫格。

手機版工作室段落保留左右留白；窄螢幕頁尾的品牌與聯絡資訊各占一列，法律表格允許長字串換行，完整顯示所有欄位。

正文預設可見，進場動畫只在進入視窗時限時播放；JavaScript 未執行、動畫取消或減少動態時，內容仍可讀。圖片素材與網站圖示統一使用 WebP，人物圖採用瀏覽器原生延後載入。

## 技術棧

- Next.js 16（App Router）
- React 19、TypeScript 5
- 靜態匯出（`output: 'export'`）—— build 完落 `out/`
- 字體：Google Fonts CDN（Noto Serif TC、Cormorant Garamond、Source Serif 4、IBM Plex Mono）

## 安裝與開發

使用 `.node-version` 指定的 Node.js 版本；自動發布使用同一版本。

```powershell
npm ci
npm run test:browser:install
npm run dev
# http://localhost:3000
```

`npm ci` 使用鎖定的套件版本；第二行安裝與 Playwright 版本配對的 Chromium，首次安裝或更新 Playwright 後執行一次。

## 正式版本預覽

```powershell
npm run build
npm run preview
# http://127.0.0.1:4317
```

建置完成後，會將 `out/` 的全部檔案保存成一份預覽成品。預覽啟動時一次載入整份內容；之後重新建置或移除 `out/`，已開啟的預覽仍提供同一個版本。要看新版本，完成建置後重新啟動預覽即可。`npm start` 是相同入口；以 Ctrl+C 停止。若連接埠已被占用，可用 `npm run preview -- --port 4318`。

預覽成品位於 `.preview/site.json`，由建置產生、不納入 Git，也不部署至官網。建置失敗不覆蓋上次完成的成品。預覽只提供成品內的檔案，缺檔會回傳 404。

目前保留 `scripts/finalize-export.mjs` 的檔名校正。Next.js 16.4.3 在 Windows 建置時，會把部分換頁資料誤寫成子目錄，造成預載請求找不到檔案（404）。腳本在建置結束後校正實體檔名，再產生預覽成品，讓 Windows 本機預覽與 Linux 發布使用相同的資料網址。

官網維持預設預載模式；16.4.3 的強制完整預載（`prefetch={true}`）另有停滯問題，因此不採用。未來升級 Next.js 後，須確認 Windows 原始匯出檔名正確、預載沒有 404，且換頁與瀏覽器上一頁／下一頁都通過，再移除檔名校正。

<details>
<summary>2026-10-31 Windows 查證結果與來源</summary>

上游 [問題 #85374](https://github.com/vercel/next.js/issues/85374) 與 [PR #99058](https://github.com/vercel/next.js/pull/99058) 已指出原因：Windows 路徑使用反斜線，但匯出檔名轉換只處理正斜線，導致原應為單一檔案的路徑被寫成子目錄。

本次在原生 Windows 11，將 PR 的兩處修正套入隔離的 Next.js 16.4.3 套件對照；未建置完整上游分支。測試涵蓋 Turbopack 的結尾斜線開啟／關閉、`basePath: '/test'`，以及 Webpack 的結尾斜線開啟，共四種設定。

四組結果一致：

| 檢查 | 原版 | 套用上游修正後 |
|---|---|---|
| 27 個匯出資料檔中的錯誤路徑 | 12 個 | 0 個 |
| 直接讀取 24 個資料網址時的 404 | 11 個 | 0 個，回應內容與建置來源一致 |
| 預設預載下的實際換頁 | 預載有 404，但仍可透過完整資料備援完成 | 無預載 404，六個路由及上一頁／下一頁均通過，無須整頁重載 |

強制完整預載是另一個問題：它請求 HTML 網頁網址，卻將回應當成換頁資料解碼，導致持續等待；原版與套用檔名修正後皆會發生。只將該筆請求改指向正確資料檔，兩版都能完成換頁；預設預載或關閉預載也能完成。原因可核對 [runtime 預載流程](https://github.com/vercel/next.js/blob/v16.4.3/packages/next/src/client/components/segment-cache/cache.ts#L2532-L2678) 與 [靜態匯出的回應檢查](https://github.com/vercel/next.js/blob/v16.4.3/packages/next/src/client/components/segment-cache/cache.ts#L3663-L3697)。

</details>

## 修改後驗證

```powershell
npm run check
```

依序執行程式檢查、行為測試、正式建置與 Chromium 瀏覽器驗證。瀏覽器測試會自行啟動及關閉預覽伺服器，不需另開 `dev` 或 `preview`；連接埠被占用時會失敗，避免誤測其他版本。需要換埠時，先在 PowerShell 設定 `$env:PREVIEW_PORT = "4318"`。

只跑行為測試可用 `npm test`；只建置並驗證瀏覽器可用 `npm run test:browser`。瀏覽器驗證涵蓋桌機、390px 與 320px 觸控視窗的無 JavaScript 正文、法律頁往返、錨點、慢速換頁與連點、Logo 重播與離屏暫停、減少動態、手機捲動與橫向溢出，並檢查執行錯誤與站內缺檔。這些自動驗證不取代外觀判讀、實機觸控手感、耗電或其他瀏覽器測試。

失敗時的畫面與 trace 存於 `test-results/`，報告存於 `playwright-report/`，均不納入 Git；可用 `npx playwright show-report` 開啟報告。

## 更新法律文件流程

當 [`Yuanxing` repo](https://github.com/shihchengwei-lab/Yuanxing) 的 `docs/legal/PRIVACY.md` 或 `TERMS.md` 更新時：

1. 將更新後內容複製到本 repo 的 `content/privacy.md` / `content/terms.md`
2. 檔頭若有 `---` 區塊（舊 Jekyll 留下的 front matter），可保留或刪除；Next.js 端 build 時會自動去掉
3. 確認內部連結（例：TERMS 中的 `/privacy/`）正確
4. Commit + push 至 `main`，GitHub Actions 自動 build + deploy（約 1-3 分鐘）

## Deploy

由 `.github/workflows/deploy.yml` 自動處理：

1. push 到 main
2. GitHub Actions 安裝鎖定套件與 Chromium，再跑 `npm run check`；程式檢查、行為測試、建置與瀏覽器驗證全部通過才部署，失敗報告保留 7 天
3. 把 `out/` 上傳到 `actions/upload-pages-artifact`
4. GitHub Pages 從 artifact 服務、綁 `inkcrow-studio.com` 自訂網域

首次切換：到 repo Settings → Pages、把「Build and deployment source」從 `Branch` 改成 `GitHub Actions`。

CNAME 在 `public/CNAME`、build 時帶到 `out/CNAME`、artifact 保留。

## 聯絡

support@inkcrow-studio.com

# 頁尾圖紋落款

兩站共用無文字的烏鴉、羽筆與墨瓶圖紋，僅用於頁尾落款，主 Logo 保留。

- 工具：Codex 內建 image_gen，透明背景。
- 原始檔：`C:/Users/kk789/.codex/generated_images/01a16b4a-c348-79a3-b2a7-3f1fb3e58be2/exec-f0fad0db-d5ef-4226-9120-29fffca570fe.png`
- 工作室：`public/assets/studio-colophon.webp`（160×160，透明 WebP）
- 書庫：`C:/Users/kk789/Desktop/e-book/ebook/assets/studio-colophon.png`（120×120，透明 PNG）
- 工作室發布檔由原始圖縮至 160×160，再無損編碼為 WebP；書庫維持 PNG 格式，由原檔縮至 120×120。兩者保留透明背景與同一圖紋。CSS mask 以 `exclude` 從 40px 朱紅印面挖空圖紋，透出頁面底色；兩站的亮暗模式均使用 `#c83a2a` 朱紅，印面端正、四角一致。

## 蓋印行為

- 圖紋載入、頁面可見且抵達真正頁底（容許 2px 誤差）才蓋印；只是看見頁尾仍不觸發。
- 每次頁面掛載只蓋一次，蓋下後保留；回滾再到底不重播。整頁已在視窗內時直接視為到底。
- 用彈簧與阻尼計算垂直落下、輕微壓印後停住，全程不旋轉；不修改書庫原有的書封與開關動態。
- 隱藏分頁時暫停；不播動畫時，到底後直接顯示。要不要播由 `mountFooterStamp` 的 `motionEnabled` 決定：工作室不傳，跟著系統「減少動態效果」；書庫傳入自己的動態開關（`html.motion`），讀者在書庫手動開啟動態時，即使系統要求減少動態也會播。圖檔載入失敗時保持隱藏。
- 書庫的印章沒有 JavaScript 時直接顯示（HTML 不預寫狀態，只有程式標成 pending／stamping 時隱藏）；工作室仍由元件預寫 `data-stamp-state="pending"`。
- 預留印章位置，動畫只改透明度與變形；完成後停止更新並解除監聽。
- `public/assets/footer-stamp.mjs` 與書庫 `assets/footer-stamp.mjs` 內容相同，分別部署。更新共同行為時須同步兩份並核對內容。

## 頁尾導覽

- 工作室的 Works 欄連到 `https://ebook-one-rho.vercel.app/`。
- 書庫中英文頁均由左側印章與 `Inkcrow Studio` 整組連到 `https://inkcrow-studio.com/`，右側只保留 GitHub。
- 書庫兩個連結共用字型、字級、字距、底線、滑鼠移入與鍵盤焦點樣式，依各語言頁既有字體設定顯示。
- 書庫原有紙色、字體設定、書封與開關的彈簧互動均保留。

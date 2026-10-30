# 游動鯨魚島

首頁將原海圖拆成固定海面與透明鯨魚。保留博物畫地景及墨線，用連續網格讓胸鰭、尾鰭活動；正文排版與法律頁背景不變。

- `public/assets/sea-chart.webp`：941 × 1672，固定海圖。
- `public/assets/whale-island.webp`：941 × 1672，透明鯨魚島。
- 原圖 `public/assets/taiwan_map_bg.webp` 保留，用於法律頁及既有分享封面。
- 元件 `src/app/WhaleSea.tsx` 僅掛載於首頁，不攔截滑鼠或觸控。
- `whale-sea/whale-route.ts` 每次掛載選擇新的隨機種子，每 8–20 秒或接近目的地時挑選新目標；速度平順變化，接近邊緣時提前回轉，沒有固定重播週期。
- 直接改寫 ASCII Sharks 的逐節跟隨：模擬保留每節身體上一幀的位置，由頭到尾依序跟隨。`model.ts` 只綁定素材，不會每幀從頭部重新生成整條魚身。依體長限制轉彎，即使碰到邊緣也不解除限制。
- 整身彎角上限為 135 度；最小轉彎半徑、頭部轉速與單節彎角由同一上限推導。60Hz 繪圖在相鄰模擬姿態間連續插值。減少動態偏好切換沿用同一巡游；視窗大小改變時轉移當下狀態：頭部保留視窗內的相對位置，身體依既有體長規則等比例縮放，保留每節彎角與擺尾相位，沿用隨機來源及目標。不重播先前巡游，縮放工作量不隨停留時間增加。
- 本次依上一版再放大 1.2 倍：體長以視窗寬度的 126% 推導，限制為 960–1920px。靜態圖與動畫共用尺寸來源。大型鯨魚可穿出視窗邊緣，由畫布裁切。
- 基準推進波週期改為 4.8 秒，擺幅集中尾端、軀幹保持穩定，隨游速調整節奏，胸鰭依轉彎方向微幅收展。以最高約 60fps 排程，畫布上限約 65 萬像素；隱藏分頁暫停。減少動態、不支援 WebGL 或繪圖失效時使用靜態圖；沒有 JavaScript 也能顯示。
- 網格只包住原畫非透明部位，排除遠離魚身的透明角落，避免轉彎時無用的幾何翻折。既有 WebP 素材沒有重畫。

## 素材來源與製作

兩張素材都由內建 imagegen 編輯既有 `taiwan_map_bg.webp` 產生。產生的 PNG 轉為 WebP；鯨魚保留透明度。這是依原圖重建的動畫素材，並非逐像素無損去背。

逐節跟隨及依體長限制轉向改寫自 [ASCII Sharks 的 world.ts](https://github.com/stackedlol/ascii-sharks/blob/main/src/world.ts#L515-L542)，保留其 [MIT 授權](../public/licenses/ascii-sharks.txt)。未引入該專案的 ASCII 繪圖、魚群或素材。

以下為實際使用的完整提示詞；兩次編輯均以原海圖為 edit target。

### 透明鯨魚（transparent_background: true）

> Use case: background-extraction. Edit target: the attached existing Inkcrow Studio website antique whale-island map. Produce ONE transparent animation-ready cutout of the ENTIRE whale-shaped island only, from the rounded head and eye through both side flippers to the forked tail. Preserve the actual reference subject: exactly the same tall upward-facing slightly diagonal silhouette, continuous mountain range, coastline, miniature forests and settlements, expressive eye, all fine sepia engraved natural-history pen lines and subtle ink-wash shading. Keep its parchment-colored interior, approximately warm pale #E7D9B9, and a gentle dry-ink edge, but remove absolutely everything OUTSIDE its silhouette: paper rectangle, compass, both ships, ocean waves, dotted routes, exterior islets. The outer background must be genuinely transparent alpha, including clear space between flippers and body and between tail lobes. Preserve the original whale orientation, do not turn into a conventional plain whale, do not simplify its island terrain or redraw a cartoon. Center whole subject with 6% clear padding on all sides; no cropped fins or tail. High-resolution portrait PNG. No text, no new objects, no checkerboard painted into image. This is a reusable animation texture, so the body, flippers, tail must remain connected in the original neutral pose.

### 海圖（transparent_background: false）

> Use case: precise-object-edit. Edit target: existing Inkcrow Studio antique whale-island ocean chart. Make a clean background plate for animation: REMOVE THE ENTIRE LARGE CENTRAL WHALE-SHAPED ISLAND, including its mountain range, eye, both flippers, forked tail, coastline and all adjacent contour halos. Fill that WHOLE area seamlessly with uninterrupted empty ocean and aged paper matching the surrounding map. Preserve the existing upper-right engraved compass rose and the two existing sailing ships at lower left and lower right, their original locations and scale, original portrait framing, thin sepia wave lines, tiny exterior rocks and faint dotted navigation routes. Warm antique parchment and delicate natural-history engraving, low contrast texture like the input. Do not leave a ghost whale, island outline, landmass, diagonal ridge or whale-shaped empty patch. Sea texture should continue evenly through the entire center. Do not add other animals, labels, text, islands, frames, cartouches or objects. This is a stationary sea chart behind an independently animated transparent whale, so no whale may remain anywhere in this background. Keep the overall original portrait aspect ratio.

## 驗證入口

`npm run check` 包含既有全站檢查、新增的網格完整性、最終畫面位移與頭部朝向檢查，以及桌面、390px、320px 的游動、暫停、減少動態、WebGL 失效與無 JavaScript 瀏覽器檢查。

### 本次結果（2026-10-26）

- 全站檢查、正式建置通過；瀏覽器 29 項通過，1 項為桌面環境預期略過的觸控測試。
- 最終網格輪廓調整後，重新通過正式建置、完整輪廓檢查、連續轉彎／網格檢查及 12 項動畫瀏覽器檢查。
- 真實瀏覽器兩次獨立造訪的第一幀頂點資料不同，確認每次掛載會產生不同巡游。
- 動畫邏輯檢查包含尺寸倍率、隨機巡游、60Hz 連續取樣、前後身轉向延遲、後半身實際畫面速度、整身彎角與網格完整性。
- 桌面兩條隨機路徑與 320px 一條路徑，各連續取樣 30 秒、每秒 60 幀；同幀比較頭部與三處後半身的最終頂點，驗證整段轉彎的速度與連續性。
- 真實瀏覽器錄影與四種寬度取樣中，三處後半身相對同幀頭部的最大位移比為 1.31，未出現後身突然加速掃過的反例；詳細逐幀結果見原始紀錄。
- 1440px 視窗的體長從上一版 1512px 增為 1814.4px；320px 視窗從 800px 增為 960px，均為 1.2 倍。
- 從最終上傳 GPU 的頂點反推頭部位置與後半身逐幀速度，核對位移朝向與甩尾反例；不以繪製前的路徑值代替畫面結果。全程網格無翻折，關節不拉長。
- 1440、768、390、320px 實際畫面均能游動，無瀏覽器執行錯誤或橫向溢出；透明素材的 alpha 範圍為 0–255。
- 移除裝飾前後比對上述四種寬度：正文文字及區塊位置、尺寸完全相同。

本機原始證據：

- [全站檢查與動畫反例](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/check.log)
- [最終連續轉彎與網格檢查](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/continuous-turn-final.log)
- [最終動畫瀏覽器檢查](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/browser-final.log)
- [原畫完整輪廓覆蓋](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/outline-coverage.json)
- [版面比對](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/layout-comparison.json)
- [實際畫面與兩次造訪比對](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/visual-results.json)
- [1440px 畫面](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/home-1440.png)
- [320px 畫面](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/home-320.png)
- [修正後游動錄影](C:/Users/kk789/AppData/Local/Temp/inkcrow-whale-follow-fa3fb71034a74abeaf829024801882fe/whale-motion.webm)

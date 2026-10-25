# 神明回頭彩蛋

使用者指定的分配：老街大圖在同分頁可見停留滿 2 分鐘後回頭；田野同行圖在抵達首頁底部、再往上捲動後回頭。兩張起初都是神明背對，玩家始終保留原本背影。願力視覺的累積上限仍為 3 分鐘。

- 老街圖沿用 `wish-progress.ts` 的可見時間，隱藏分頁暫停，條款閱讀時間計入，同分頁重新整理及條款往返保留進度。
- 田野圖抵達底部 8px 範圍後，再往上移動至少 48px 才觸發，避免底部彈跳或抖動。尺寸變化只重建基準，同時保留當下到底的事實，不直接觸發回頭。
- 觸發後維持回頭；田野結果存於同分頁 sessionStorage，儲存受限時保留於本文件。新分頁有各自的初始狀態（瀏覽器複製分頁可能複製既有 sessionStorage）。
- 用約 650ms 淡入原圖的方式呈現回頭，不宣稱是逐格轉頭動畫。減少動態時直接切換。
- 新圖僅用於頭部附近的柔邊區域，其餘範圍持續疊回原圖，玩家與場景不因生成差異改變。原始回頭圖不改寫。
- 目前授權：使用者已確認本版，連同願力累積與水墨煙霧擴散，整合驗證及獨立 arc9 審查通過後提交、推送。以下預覽檢查中的未提交紀錄為當時狀態。

## 圖像來源與檔案

使用 Codex 內建 image_gen 編輯兩張原圖；未使用 API 或其他生成服務。初版以 sharp 無損轉成 WebP，逐像素核對解碼結果相同。現行發布檔在維持尺寸與構圖下，以 WebP 品質 92 壓縮；原始無損版本保留於 Git 歷史 `8863e3d`，未重新生成圖像。人物圖使用瀏覽器原生延後載入，回頭條件與遮罩不變。

| 用途 | 專案檔案 |
|---|---|
| 老街背對圖 | `public/assets/work_hero_back.webp` |
| 田野背對圖 | `public/assets/col_2_companion_back.webp` |
| 老街回頭原圖 | `public/assets/work_hero.webp` |
| 田野回頭原圖 | `public/assets/col_2_companion.webp` |

## 老街圖實際生成提示

```text
Task type: edit_target_image. Use case: precise-object-edit. Intended use: the initial state of a two-stage website Easter egg. Image type: existing illustrated game scene, local character pose edit.
Reference image 1 has role edit_target: E:/inkcrow-studio-site/public/assets/work_hero.webp. It is the actual scene to edit.
Preserve: the entire original 16:9 composition and camera; all architecture, lantern, temple, road, shadows, sunlight, watercolor texture and color; the male player in the center remains EXACTLY as drawn, walking away with his back to us. Preserve the female deity on the right: her position, body, walking pose, hands, white sleeves, navy embroidered skirt, blue lantern pendant, long dark-blue wavy hair, white coral hair ornament and identity. This is a matched image pair, so everything outside her head and immediately adjacent hair/neck must remain unchanged.
Change: ONLY turn the female deity's head to face straight forward down the street, away from the viewer. Show the BACK of her head and hair, not her face. She is initially walking ahead without looking back. Hide her eye, nose, cheek and facial profile naturally behind the rear hair shape. Keep her long hair length, wave structure and existing hair ornament; adjust only the small head/neck/hair region necessary to express the new orientation. Do not rotate, move or redesign her body.
Ignore: no new characters, no additions, no labels, no text, no border, no watermark; do not alter the player's face or pose; no style transfer or new scene.
Character priorities: coherent head/neck anatomy, existing character identity and costume, readable back-facing head. Retain the source's warm painterly anime illustration and hand-painted architecture exactly.
Output: ONE edited image, same landscape 16:9 framing as source, ideally original 1600x900 resolution; do not crop or zoom. Opaque image. The output should differ only at the female deity's head/hair/neck, so swapping to the original later looks like she quietly turns her head.
```

## 田野圖實際生成提示

```text
Task type: edit_target_image. Use case: precise-object-edit. Intended use: the initial state of a two-stage website Easter egg. Image type: existing illustrated game scene, strictly local character pose edit.
Reference image 1 has role edit_target: E:/inkcrow-studio-site/public/assets/col_2_companion.webp. This is the actual image to edit.
Preserve: the original square canvas, every part of the scene and its composition, camera, warm watercolor texture, golden light, rice paddies, path, trees, small stone shrine and distant buildings. Keep the female player on the LEFT EXACTLY as drawn, back to camera, same ponytail, shirt, bag, trousers and stride. Keep the young male deity on the RIGHT exactly in place: identity, short tousled brown hair, cream robe, brown sash and hanging cloth, bare feet, hands, body, stride and all proportions.
Change: ONLY rotate the male deity's HEAD so he looks FORWARD along the path, away from the viewer. Show the BACK of his short brown hair and head, with no visible eyes, nose, mouth or cheek/face profile. The neck should connect naturally to the unchanged robe and shoulders. Preserve the hairstyle, head size and existing hair silhouette as closely as the orientation allows; edit only the small head/neck region needed. Do not rotate or move his body or redesign clothing.
Ignore: no new characters, no additions, no text, no labels, no panels, no watermark; do not alter the left player's head or any scenery. No new rendering style.
Character priorities: coherent head/neck anatomy and identity, same readable walking pose, exact existing costume and scene. Retain the source's soft golden painterly anime watercolor illustration style.
Output: ONE edited opaque image, original square 1024x1024 framing and size, no crop or zoom. It forms a matched pair with the source: later swapping back to the source should look like only the deity has quietly turned his head.
```


## 初版 3 分鐘驗證紀錄

- 正式靜態建置與本輪四個 TSX／TS／測試檔案 ESLint 通過；新彩蛋狀態測試 4 項，加上願力與水墨測試共 15 項通過。
- Chrome 實際載入匯出網站，1440、390、320px 均確認：起初兩圖背對；頁中上捲及停在頁底不觸發；到底回滾只觸發田野圖；180 秒前老街仍背對，封頂後才回頭。
- 另一全新瀏覽器分頁驗證：背景時間不觸發老街圖；只停留到 3 分鐘，不會順帶觸發田野圖。
- 條款往返與重新整理保留已觸發狀態；減少動態無轉場；三種寬度無橫向溢出及頁面執行錯誤。
- 原始兩張 WebP 與 HEAD 雜湊相同。兩個階段的實際截圖在頭部範圍外均為 0 個變動像素（排除截圖最外一列的分數像素邊緣；色頻容差 2/255），玩家與場景保持穩定。已檢視桌面及手機背對／回頭銜接。
- 瀏覽器測試以受控時間加速滿 3 分鐘與隱藏事件；手機為視窗模擬。證據保存在 `C:/Users/kk789/AppData/Local/Temp/inkcrow-easter-eggs-20261024/`。
- 未提交、未推送。

## 回頭時間改為 2 分鐘

依使用者回饋，老街神明回頭門檻改為 120,000ms 可見停留時間，直接讀取既有計時來源；願力累積仍在 180,000ms 封頂。田野的到底回滾條件不變。

建置與元件 ESLint 通過。Chrome 受控時間驗證：119,000ms 仍背對，隱藏分頁 180 秒未觸發，恢復後累積至 120,032ms 已回頭；此時願力約 0.60、田野仍背對。重新整理保留回頭，無頁面執行錯誤。證據：`C:/Users/kk789/AppData/Local/Temp/inkcrow-easter-eggs-20261024/two-minute-results.json`。未 commit、未 push。

## 整合發布驗證

使用者已確認 2 分鐘版本並授權與願力累積、區域擴散一起驗證後提交推送。最新 1440／390／320px 整合檢查、2 分鐘邊界、隱藏／條款往返／重載與頭部以外像素比對均通過，詳見[整合驗證紀錄](homepage-water-ink-preview-checks.md)。

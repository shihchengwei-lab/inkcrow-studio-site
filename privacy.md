---
layout: page
title: 隱私權政策
permalink: /privacy/
---

# 願行．隱私政策

> 版本 1.2 ／ 生效日 2026-04-19
> 最後更新 2026-04-27

---

## 一、我們對資料的基本態度

願行是一款關於**行走**的應用。你走的每一步屬於你，我們只記下為了讓遊戲運作所必需的東西。

- **不放廣告。**
- **不追蹤你在其他應用或網站的行為。**
- **不把你的資料賣給任何第三方。**
- **不做個人化 profiling，也不做預測模型。**
- **不要求手機號、Email、也不需要你註冊帳號。**

這份政策寫給你看，不是寫給律師看。有看不懂的，來信問我們。

---

## 二、我們會收集什麼

### 2.1 在你的手機裡（不離開裝置）

以下資料**永遠只存在於你的這支手機上**，我們不會讀取，也無法讀取：

- 你的虔誠度、祝福紀錄、供品與神壇安置
- 你的法相卡、祈香蒐集進度
- 你走過的每日步數歷史（用於 app 內的「回顧」功能，含月度摘要）
- 教學進度、首次使用提示狀態
- （若你選擇開啟）匿名使用行為紀錄，可於「設定」中匯出或清除

技術上：這些資料存在 Android 的 Hive 本地資料庫，與你的遊戲存檔在同一層級。**解除安裝願行，這些資料會全部消失。**

### 2.2 我們的伺服器上（Supabase）

為了支援**好友同行**功能，以下資料會上傳至我們的後端：

| 資料 | 為何需要 |
|---|---|
| 匿名使用者 ID | 一組隨機 UUID，在你首次開啟 app 時自動生成。不連結任何個人身分。 |
| 你的好友邀請碼 | 6 碼隨機字串，你設定時產生，讓朋友能找到你 |
| 好友關係 | 誰和誰綁定為好友 |
| 每日步數與遊戲狀態 | 同步範圍以附錄 A.2 為準。daily_states 主要含步數、願力、同行狀態、隨行選擇、顯化狀態；不含路徑、位置、原始時間細節。虔誠度進度存於另一張 `devotion_states` 表。 |

**不會上傳：**
- 你的 GPS 位置、行走路徑
- 裝置型號、IMEI、廣告 ID
- 通訊錄、照片、麥克風、任何其他 app 資料

**為了系統運作會包含：**
- 時區字串（如 `Asia/Taipei`），用於跨日界定
- Supabase 自動產生的 `created_at` / `updated_at` / `last_synced_at` timestamp，用於同步狀態追蹤；不關聯具體行走路徑或位置

### 2.3 手機權限

| 權限 | 為何需要 | 是否可拒絕 |
|---|---|---|
| 活動辨識（Android ACTIVITY_RECOGNITION） | 讀取計步器，記你走了幾步 | 可拒絕，但沒步數就沒遊戲 |
| 網路 | 與好友同步、下載遊戲更新 | 可拒絕，離線模式仍可獨自遊玩大部分功能 |

---

## 三、我們如何使用這些資料

我們只做**讓遊戲運作**的事情：

- 算你的步數、願力、以及神明注視的時機
- 在你與好友之間同步遊戲狀態
- 讓你換手機時，透過邀請碼重建好友關係

**我們不做：**

- 廣告投放或廣告個人化
- 行銷推送、促銷郵件
- 把資料賣給廣告商、資料商
- 交給第三方分析公司
- 訓練任何 AI 模型

---

## 四、資料會被保留多久

### 4.1 本地資料

你的手機，你做主。**解除安裝 = 資料完全刪除。**

### 4.2 雲端資料

- 只要你還在使用 app，資料會保留
- **連續 180 天未開啟**的匿名帳號，我們保留主動刪除權利，以維持後端運行品質
- 你也能隨時主動刪除（見下節，最快 24 小時內生效）

---

## 五、你要如何刪除自己的資料

有兩條路可走：

### 5.1 應用內（推薦）

1. 開啟願行
2. 進入「設定」→「帳號與資料」
3. 按「刪除所有雲端資料」
4. 確認後，你的後端資料會在 **24 小時內**永久刪除

**這個動作無法復原。** 本地手機存檔會同時清除。

### 5.2 來信申請

若 app 無法開啟、或手機已遺失：

- 寫信至：**support@inkcrow-studio.com**
- 主旨：`[願行刪除請求]`
- 內容：附上你的 6 碼好友邀請碼
- 我們會在 **30 天內**刪除資料並回信確認

---

## 六、資料安全

- 所有雲端傳輸使用 HTTPS / TLS 1.2+ 加密
- 資料庫存取由 Supabase Row Level Security 強制隔離——**每位使用者只能讀寫自己那一份**
- 我們不保存任何密碼（沒有密碼系統）
- 管理後台存取有雙因子驗證

儘管如此，沒有任何網路系統能保證 100% 安全。我們盡最大努力，但法律上無法承諾絕對防護。

---

## 七、兒童使用

願行沒有年齡限制，但**不主動針對 13 歲以下兒童**。

- 我們不要求年齡資訊
- 我們不收集任何可辨識兒童身分的資料
- 若你是家長，發現未成年子女使用了願行且你希望刪除資料，請來信

---

## 八、資料跨境

- 伺服器（Supabase）位於 **AWS 大洋洲區（ap-southeast-2，雪梨）**
- 僅限本專案開發者（願行開發團隊）存取
- 不主動對第三方國家傳輸

---

## 九、政策變動

本政策若有重大修改：

- 我們會以 app 內或 email 等可行方式通知
- 重大變動前 **14 天**先告知
- 不溯及既往——修改後的政策不適用於修改前已刪除的資料

歷史版本保存於 [GitHub](https://github.com/shihchengwei-lab/inkcrow-studio-site/commits/main/privacy.md)，任何人皆可查閱。

---

## 十、聯絡我們

- **隱私相關：** support@inkcrow-studio.com
- **一般客服：** 同上
- **開發者：** 墨鴉工作室 / Inkcrow Studio

收件後我們盡量在 **7 個工作天內**回覆。

---

## 附錄 A：技術細節（給在乎的人）

### A.1 本地儲存清單（Hive boxes）
`gacha / player / offerings / tutorial / devotion / app_meta / deities / analytics / blessings / inventory / wishpower / day_reset / daily_history / blessing_history / crash_log / audio_settings`

`crash_log` 為崩潰紀錄本地化用途（不上傳雲端，僅供你選擇匯出時使用）。

### A.2 雲端資料表清單（Supabase public schema）

**使用者資料表（12 張）：**
`profiles / friend_edges / daily_states / step_sync_logs / offering_slots / deity_progress / daily_companion_choices / blessing_events / face_card_inventory / devotion_states / gacha_states / deities`

每張表皆啟用 Row Level Security，政策為「使用者僅可讀寫 `profile_id = auth.uid()` 的資料」。`deities` 表為神明 metadata（名稱、神系、顯示順序）唯讀公共資料，不含個人身分資訊。

**遠端配置表（2 張）：**
`copy_variants / remote_balance_config`

供 app 啟動時讀取文案變體與遊戲參數調整，全使用者共讀。**不寫入個人資料**，無 `profile_id` 欄位，僅 anon 公共讀權限。

### A.3 第三方服務
- **Supabase**（後端 BaaS）— [隱私政策](https://supabase.com/privacy)
- **Google Play Services**（由 Android 系統提供；願行 app 本體未引入 Google Play Services SDK，系統層的 Play Protect 等服務由 Android 自行處理）
- 無其他第三方 SDK（**無 Firebase、無 Google Analytics、無廣告 SDK**）

### A.4 開源授權
願行使用的開源套件（Flutter、Riverpod、Hive、supabase-flutter 等）完整清單見 app「設定」→「關於」→「開源授權」。

---

願你走得安好。

— 願行開發團隊

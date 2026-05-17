# inkcrow-studio.com

墨鴉工作室官方網站。靜態 Jekyll 站、託管於 GitHub Pages、綁定自訂網域 `inkcrow-studio.com`。

## 站點結構

| 路徑 | 用途 |
|---|---|
| `/` | 工作室介紹 + 願行簡介 |
| `/privacy/` | 願行隱私權政策（Play Store「Privacy Policy URL」用） |
| `/terms/` | 願行服務條款 |

## 更新法律文件流程

當 [`Yuanxing` repo](https://github.com/shihchengwei-lab/Yuanxing) 的 `docs/legal/PRIVACY.md` 或 `TERMS.md` 更新時：

1. 將更新後內容複製到本 repo 對應 `privacy.md` / `terms.md`
2. 保留檔頭的 Jekyll front matter（`---` 區塊）
3. 確認內部連結（例：TERMS 中的 `/privacy/`）與 GitHub 歷史版本連結未被覆蓋
4. Commit + push 至 `main`、GitHub Pages 自動 deploy（約 30 秒至 2 分鐘）

## 本地預覽（可選）

```bash
bundle install
bundle exec jekyll serve
# 預設 http://localhost:4000
```

## 聯絡

support@inkcrow-studio.com

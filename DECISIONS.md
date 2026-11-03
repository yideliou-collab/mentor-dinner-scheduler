# 實作紀錄

## 決策與原因

- 使用 GitHub Pages 發佈靜態前端，Supabase Edge Function 和資料庫負責跨裝置共用選擇；GitHub Pages 沒有可寫入的後端。
- 公開端只顯示每個起始時間可連續參加兩小時的人數，不提供任何人的代號或個別選擇。使用者決定以可自由填寫的自訂代號與 4 位 PIN 取代學號，避免為回訪登入蒐集可與名冊連結的識別碼。代號以伺服器秘密值雜湊儲存，同一代號連續五次 PIN 錯誤會鎖定 15 分鐘。
- 日期以台灣時間當日到 2026 年 12 月 14 日。截止後關閉調查，不自動延到下一年，避免舊活動無意間重開。
- 依使用者修正，改為仿照 Google 日曆的週檢視。每天 10:00–22:00，以 30 分鐘為單位拖曳選取；公開統計要求同一人連續選取四格才計入該起始時間，對應約兩小時的聚餐。
- 延續原信件的校內 LALA Kitchen 為聚餐地點；科學三館 SC451 標成老師辦公室與聯絡地點。

## 已完成

- 響應式網站、可拖曳週曆、兩小時匿名成團人數、自訂代號與 4 位 PIN 登入、重複登入與修改選擇、台灣日期截止。
- 私有資料庫 schema、Edge Function、GitHub Pages workflow 與設定說明。
- 2026-11-03 已建立並發布獨立 repository `https://github.com/yideliou-collab/mentor-dinner-scheduler`，公開網址 `https://yideliou-collab.github.io/mentor-dinner-scheduler/`。

## 尚待確認與下一步

- 已在 Supabase Free Plan 建立獨立專案 `xnjjptqxzimrfprsyxmb`，套用 migration、設定秘密值並部署 Edge Function。第二筆 migration 將原學號欄位無資料損失地更名為 `account_hash`。秘密值明文未寫入 repository；本機 DPAPI 加密備份位於被 `.gitignore` 排除的 `tools/`。
- 需確認每天 10:00–22:00 是否符合實際餐廳營業時段與師生需求；可在設定檔調整。
- 已通過 `node --check` 的前端 JavaScript 語法檢查與 TypeScript 轉譯語法檢查。兩組測試代號的登入、四格拖曳、匿名兩小時計數、重新登入及清除時段皆通過；另已測中文代號與 4 位 PIN。公開金鑰直接讀取私有資料表被拒。瀏覽器自動化工具無法啟動，因此仍須人工檢查實際畫面與觸控拖曳。

# 導生聚餐時間調查

正式網站：<https://yideliou-collab.github.io/mentor-dinner-scheduler/>

GitHub repository：<https://github.com/yideliou-collab/mentor-dinner-scheduler>

已發佈到 GitHub Pages 的靜態網站。日期依 **Asia/Taipei** 每天自動從當日更新至 **2026 年 12 月 14 日**；截止後停止選填，不會在隔年自動重開。學生可先看匿名人數，再以自訂代號與 4 位數 PIN 登入、重複修改可參加時段。聚餐地點為校內 LALA Kitchen；科學三館 SC451 是老師辦公室。

## 時間選取方式

- 週曆顯示每天 **00:00–24:00**，每格 30 分鐘。第一次點空白格會新增四格（兩小時）；之後點同一連續時段旁的空白格，只增加一格。向上或向下拖曳可延長，不必是四格的倍數。全新時段最晚可從 22:00 開始，已選時段可逐格延長至 24:00。
- **點綠色格子即可刪除該格**；點相鄰空白格仍只延長一格。桌機右鍵也可刪除。鍵盤以 Enter／空白鍵新增或刪除，以 Delete／Backspace 刪除。
- 手機可用日曆上方的七個日期按鈕與 00:00／06:00／12:00／18:00／現在時間捷徑移動。日曆內**雙指拖曳**可同時橫向與縱向捲動；在日期標頭或左側時間欄可單指拖曳。格子上的單指操作保留給選取或刪除。
- **格內數字代表該半小時可參加的人數**，所以選四格後四格各顯示一人。日曆下方的排序和 CSV 則繼續統計從各起點能**連續參加兩小時**的人數。過去日期與今天已過的起始時間會顯示為灰色並停止選取；舊資料不會被刪除。
- 每週可左右捲動，也可用箭頭切換週次。日期範圍由台灣時間的今日起算，至 2026 年 12 月 14 日。

## 查看統計

日曆下方的「最容易成團的兩小時」會依可完整參加的人數列出前八個候選時段；「下載完整統計 CSV」包含從現在到截止日所有可開始的兩小時時段，欄位為日期、開始時間、結束時間及可參加人數，零人時段也會列入。可用 Excel 開啟 CSV，再依人數排序或篩選日期。統計是匿名人數，**不提供參加者名單**；選定聚餐時間後，仍需另行請同學確認是否出席。

若要更改每天可選時間、格距或聚餐長度，須同步修改 `config.js`、`supabase/functions/availability/index.ts` 與 `supabase/schema.sql`，再重新執行 SQL 並部署後端與網站。目前後端的連續兩小時計算固定為四個半小時格。

## 共用資料庫

GitHub Pages 只能提供靜態檔案，無法自行儲存所有學生的選擇。本專案使用 Supabase 作為後端。此版本已連接獨立的 Free Plan 專案 `xnjjptqxzimrfprsyxmb`，並已部署資料表、匿名統計函式與 Edge Function。`config.js` 只包含可公開的 Project URL 與 publishable key；`service_role` key 和代號雜湊秘密值不在 repository 中。

若未來要在另一個 Supabase 專案重新部署：

1. 建立 Supabase 專案，並用 `supabase link --project-ref YOUR_PROJECT_REF` 連結。
2. 在 Supabase 專案的 **Edge Functions → Secrets** 設定 `ACCOUNT_PEPPER`，值為自行產生的長隨機字串，建議至少 32 bytes。不要把此值寫入 GitHub 或 `config.js`。變更這個值後，既有代號將無法再對應原帳號，請妥善保存。
3. 安裝並登入 [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)，在本目錄執行：

   ```sh
   supabase db push --remote
   supabase functions deploy availability --no-verify-jwt --use-api
   ```

4. 在 Supabase 的 **Project Settings → API** 取得 Project URL 和 publishable key，填入 `config.js` 的 `supabaseUrl`、`supabaseAnonKey`。**切勿填入 `service_role` key**。`SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase Edge Functions 的環境提供，僅在伺服器端使用。
5. 在本目錄執行 `node preview.mjs`，開啟 `http://127.0.0.1:8765/` 預覽。用兩組不同代號與 PIN 測試：第一組點選四格，四格均顯示一人；再點相鄰空白格，只增加一格。第二組可見匿名人數，但看不到第一組代號；第一組再次登入後點綠色格子取消。請透過預覽網址開啟，直接開啟 `index.html` 可能因瀏覽器對本機模組檔案的限制而無法執行。

## 發佈到 GitHub Pages

此資料夾已作為獨立 repository `yideliou-collab/mentor-dinner-scheduler` 的根目錄，`main` 推送後由 `.github/workflows/deploy.yml` 自動發佈到 GitHub Pages。工作流程只發佈五個公開檔案：`index.html`、`styles.css`、`calendar.css`、`app.js`、`config.js`。Supabase SQL 與 Edge Function 原始碼保留在 repository 供維護，不會複製到網站產物。此流程依照 [GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)；Edge Function 設定依照 [Supabase 官方文件](https://supabase.com/docs/guides/functions/deploy)。

## 隱私與帳號限制

- 網站公開端只取得各日期／兩小時起始時間的**總人數**；資料表啟用 RLS 並撤銷匿名讀取權限。自訂代號先以伺服器秘密值雜湊，PIN 以 PBKDF2 加鹽儲存，瀏覽器僅保存可撤銷的登入 token。
- **代號 + PIN 不等於學校身分驗證**。代號可自由填寫，系統不蒐集學號；建議不要填真名、學號或生日。首次使用某代號的人可以先建立對應帳號。忘記代號或 PIN 目前需聯繫老師處理，沒有自助重設流程。
- 在每個時段只有 1 人的情況下，後來者仍可能從人數變化推測某位同學的可參加時間；本設計隱藏身分欄位，但不保證統計資料完全無法被推測。
- 4 位 PIN 的強度有限；伺服器將同一代號連續 5 次 PIN 錯誤鎖定 15 分鐘。公開端的時段人數對任何持有網站連結的人可見。

## 專案檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html`, `styles.css`, `calendar.css` | 繁體中文頁面與響應式週曆 |
| `app.js`, `config.js` | 台灣日期、兩小時選取、登入、匿名統計與 CSV 下載 |
| `preview.mjs` | 本機預覽伺服器，不會發佈到 GitHub Pages |
| `supabase/schema.sql` | 私有資料表與統計函式 |
| `supabase/migrations/20261103160000_initial.sql` | 可部署的資料庫 migration |
| `supabase/functions/availability/index.ts` | 登入、儲存與匿名統計 API |
| `supabase/config.toml` | 關閉 Edge Function 內建 JWT 檢查，改由此函式驗證代號與 PIN token |
| `.github/workflows/deploy.yml` | GitHub Pages 自動發佈 |

## 後續調整

若要改聚餐地點、聯絡方式或頁面文字，修改 `index.html`。若要改活動年度或截止日期，必須同步修改 `config.js`、`app.js` 與 Edge Function。正式向學生發送連結前，請先檢查日期、時段、地點及電話，並完成兩人交叉測試。

## 已完成驗證

2026-11-03 已以兩組隨機測試代號驗證登入、拖曳四格、公開兩小時人數、重複登入與取消；測試時段已清空。公開金鑰無法直接讀取 `participants`、`sessions` 或 `availability`。另以含中文、空白與符號的代號及 4 位 PIN 驗證首次建立與重複登入。正式網站的首頁、程式與日曆樣式均回傳 HTTP 200，GitHub Pages → Supabase 的跨網域預檢回傳 HTTP 200。尚未完成實際瀏覽器畫面與觸控拖曳檢查。

本次兩小時選取更新通過 `node --check app.js`、`node --test tests/calendar-logic.test.mjs` 與正式後端測試：不足兩小時的新增請求回傳 400，完整兩小時可儲存並清除；測試時段已清空。網站部署後仍需人工檢查實際觸控拖曳畫面。

後續依使用者修正：新增時只要求**至少四格**，並開放每日 00:00–24:00；點綠格可移除一格。統計函式已延長到最晚 22:00 起始的兩小時。既有填寫資料保持不變。

已執行 `node --test tests/calendar-logic.test.mjs`。正式後端以隨機測試代號確認三格新增遭拒、五格新增成功、22:00–24:00 可選且計入匿名統計；測試時段已清除。實際右鍵與觸控操作仍需在瀏覽器人工確認。

本次逐格延長修正再次通過 `node --test tests/calendar-logic.test.mjs`。正式 API 已驗證第一次四格的**每一格**人數各增加一人、相鄰空白格可新增一格、隔開的單格遭拒，以及一格刪除；測試時段已清除。瀏覽器自動化無法啟動，因此手機實際觸控仍需人工確認。

本次手機操作修正移除刪除模式按鈕，改為點綠格刪一格；加入日期／時間捷徑與雙指手動捲動。前端邏輯測試包含點擊刪除、日期／時間跳轉與雙指橫縱位移；瀏覽器自動化仍無法啟動，需以實機確認雙指拖曳。

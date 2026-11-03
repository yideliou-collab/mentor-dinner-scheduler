-- 原本以學號作為回訪識別碼；改成學生自訂代號，不清除任何已儲存資料。
alter table public.participants rename column student_id_hash to account_hash;

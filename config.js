// 部署前填入 Supabase 專案的公開用戶端資訊。
// anon key 原本就是公開用戶端金鑰；service_role key 絕對不可放在這裡。
window.DINNER_CONFIG = {
  eventYear: 2026,
  supabaseUrl: 'https://xnjjptqxzimrfprsyxmb.supabase.co',
  supabaseAnonKey: 'sb_publishable_NwgsDDAfE4NCAPtSrWw7AA_YangO0rV',
  startHour: 10,
  endHour: 22,
  stepMinutes: 30,
  mealMinutes: 120,
};

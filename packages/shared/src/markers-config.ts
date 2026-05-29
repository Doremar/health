/**
 * Whitelist маркеров, которые ВСЕГДА видны на главном экране, даже в норме.
 * Это «главные» — биохимия, общий анализ крови, гормоны, базовые витамины.
 *
 * Codes должны совпадать с `markers.code` в БД (см. normalize.slugify).
 */
export const PINNED_CODES = new Set<string>([
  // Биохимия
  "glyukoza",
  "glyukoza_polukolichestvenno",
  "holesterin_obschiy",
  "holesterin_lpvp",
  "holesterin_lpnp",
  "triglitseridi",
  "kreatinin",
  "mochevina",
  "mochevaya_kislota",
  "bilirubin_obschiy",
  "alt",
  "ast",
  "alfa_amilaza",
  "obschiy_belok",
  "albumin",

  // Общий анализ крови
  "gemoglobin_obschiy",
  "gemoglobin",
  "gematokrit",
  "kolichestvo_eritrotsitov",
  "kolichestvo_leykotsitov",
  "kolichestvo_trombotsitov",
  "skorost_osedaniya_eritrotsitov_po_vestergrenu",
  "soe",

  // Гормоны (когда появятся)
  "tsh",
  "ttg",
  "t4_svobodniy",
  "t3_svobodniy",
  "kortizol",
  "testosteron",

  // Витамины и микроэлементы
  "vitamin_d_25oh",
  "ferritin",
  "vitamin_b12",
  "folievaya_kislota",
  "magniy",
  "kaltsiy_obschiy",
  "zhelezo_syvorotochnoe",
]);

/**
 * Скрининги — маркеры, которые в норме нам неинтересны (тратят место на главной),
 * но если показатель abnormal — поднимаются в «Отклонения».
 */
export const SCREENING_CODES = new Set<string>([
  "issledovanie_antigena_hbs",
  "antitela_k_hepatitis_c_virus_ifa",
  "issledovanie_antitel_antigena_hiv",
  "treponema_pallidum_igm_igg_ifa_kachestvenno",
]);

export type MarkerCategory = "pinned" | "abnormal" | "screening" | "other";

export function classifyMarker(code: string, flag: string): MarkerCategory {
  const isPinned = PINNED_CODES.has(code);
  const isScreening = SCREENING_CODES.has(code);
  const isAbnormal = flag !== "normal";

  if (isAbnormal) return "abnormal";
  if (isPinned) return "pinned";
  if (isScreening) return "screening";
  return "other";
}

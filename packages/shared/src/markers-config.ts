/**
 * @deprecated Раньше тут жил статический whitelist «главных» маркеров.
 * Теперь все закрепления управляются из UI (`/settings`) и хранятся в
 * `marker_settings.pinned` (миграция 008 сидирует базовый набор).
 *
 * Set оставлен пустым для обратной совместимости импорта.
 */
export const PINNED_CODES = new Set<string>();

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

/**
 * Финальная проверка pinned: статический whitelist OR явно отмеченный
 * в БД (через /settings).
 */
export function isPinnedCode(code: string, overrides: Set<string> = new Set()): boolean {
  return PINNED_CODES.has(code) || overrides.has(code);
}

export function classifyMarkerWithOverrides(
  code: string,
  flag: string,
  pinnedOverrides: Set<string>,
): MarkerCategory {
  const isPinned = isPinnedCode(code, pinnedOverrides);
  const isScreening = SCREENING_CODES.has(code);
  const isAbnormal = flag !== "normal";
  if (isAbnormal) return "abnormal";
  if (isPinned) return "pinned";
  if (isScreening) return "screening";
  return "other";
}

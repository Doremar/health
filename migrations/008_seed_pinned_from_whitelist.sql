-- Переносим бывший статический PINNED_CODES whitelist в БД, чтобы все
-- закрепления управлялись из UI (`/settings`).
-- INSERT OR IGNORE — если юзер уже что-то закрепил/открепил, не трогаем.

INSERT OR IGNORE INTO marker_settings (code, pinned) VALUES
  ('glyukoza', 1),
  ('glyukoza_polukolichestvenno', 1),
  ('holesterin_obschiy', 1),
  ('holesterin_lpvp', 1),
  ('holesterin_lpnp', 1),
  ('triglitseridi', 1),
  ('kreatinin', 1),
  ('mochevina', 1),
  ('mochevaya_kislota', 1),
  ('bilirubin_obschiy', 1),
  ('alt', 1),
  ('ast', 1),
  ('alfa_amilaza', 1),
  ('obschiy_belok', 1),
  ('albumin', 1),
  ('gemoglobin_obschiy', 1),
  ('gemoglobin', 1),
  ('gematokrit', 1),
  ('kolichestvo_eritrotsitov', 1),
  ('kolichestvo_leykotsitov', 1),
  ('kolichestvo_trombotsitov', 1),
  ('skorost_osedaniya_eritrotsitov_po_vestergrenu', 1),
  ('soe', 1),
  ('tsh', 1),
  ('ttg', 1),
  ('t4_svobodniy', 1),
  ('t3_svobodniy', 1),
  ('kortizol', 1),
  ('testosteron', 1),
  ('vitamin_d_25oh', 1),
  ('ferritin', 1),
  ('vitamin_b12', 1),
  ('folievaya_kislota', 1),
  ('magniy', 1),
  ('kaltsiy_obschiy', 1),
  ('zhelezo_syvorotochnoe', 1);

INSERT OR IGNORE INTO _schema (version) VALUES (8);

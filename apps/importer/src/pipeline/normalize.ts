import type Database from "better-sqlite3";

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text: string): string {
  const lower = text.toLowerCase();
  let result = "";
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) {
      result += TRANSLIT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else {
      result += "_";
    }
  }
  return result.replace(/_+/g, "_").replace(/^_|_$/g, "");
}

export function resolveCanonicalCode(db: Database.Database, name: string): string {
  const key = name.trim().toLowerCase();
  // SQLite LOWER() doesn't handle Cyrillic — fetch all rows and compare in JS
  const existing = (
    db.prepare("SELECT alias, canonical_code FROM marker_aliases").all() as Array<{
      alias: string;
      canonical_code: string;
    }>
  ).find((row) => row.alias.toLowerCase() === key);

  if (existing) return existing.canonical_code;

  const code = slugify(name);
  db.prepare(
    "INSERT INTO marker_aliases (alias, canonical_code) VALUES (?, ?)",
  ).run(name, code);
  return code;
}

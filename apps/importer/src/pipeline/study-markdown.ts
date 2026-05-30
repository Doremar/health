export interface MarkdownStudy {
  date: string;
  type: string;
  modality: string | null;
  organ: string | null;
  facility: string | null;
  doctor: string | null;
  conclusion: string | null;
  findings: string | null;
  recommendations: string | null;
  source_file: string;
}

export interface MarkdownDiag { text: string; icd10: string | null }
export interface MarkdownMetric {
  code: string; name: string;
  value: number | null; unit: string | null;
  ref_low: number | null; ref_high: number | null; flag: string | null;
}

export function renderStudyMarkdown(input: {
  study: MarkdownStudy;
  diagnoses: MarkdownDiag[];
  metrics: MarkdownMetric[];
}): string {
  const { study, diagnoses, metrics } = input;
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`created: ${today}`);
  lines.push(`updated: ${today}`);
  lines.push(`date: ${study.date}`);
  lines.push(`type: ${study.type}`);
  if (study.modality) lines.push(`modality: ${study.modality}`);
  if (study.organ) lines.push(`organ: ${study.organ}`);
  if (study.facility) lines.push(`facility: "${study.facility}"`);
  if (study.doctor) lines.push(`doctor: "${study.doctor}"`);
  lines.push(`tags: [health, studies, ${study.type}]`);
  lines.push("status: active");
  lines.push(`source: "${study.source_file}"`);
  lines.push("---");
  lines.push("");

  // Заголовок
  const title = `${study.type.toUpperCase()}${study.organ ? " — " + study.organ : ""} — ${study.date}`;
  lines.push(`# ${title}`);
  lines.push("");

  if (study.conclusion) {
    lines.push("## Заключение");
    lines.push("");
    lines.push(study.conclusion);
    lines.push("");
  }

  if (diagnoses.length > 0) {
    lines.push("## Диагнозы");
    lines.push("");
    for (const d of diagnoses) {
      lines.push(`- ${d.text}${d.icd10 ? ` (${d.icd10})` : ""}`);
    }
    lines.push("");
  }

  if (metrics.length > 0) {
    lines.push("## Показатели");
    lines.push("");
    lines.push("| Показатель | Значение | Норма | Флаг |");
    lines.push("|------------|----------|-------|------|");
    for (const m of metrics) {
      const val = m.value !== null ? `${m.value}${m.unit ? " " + m.unit : ""}` : "—";
      const ref = m.ref_low !== null && m.ref_high !== null ? `${m.ref_low}–${m.ref_high}` : "—";
      lines.push(`| ${m.name} | ${val} | ${ref} | ${m.flag ?? "—"} |`);
    }
    lines.push("");
  }

  if (study.findings) {
    lines.push("## Описание");
    lines.push("");
    lines.push(study.findings);
    lines.push("");
  }

  if (study.recommendations) {
    lines.push("## Рекомендации");
    lines.push("");
    lines.push(study.recommendations);
    lines.push("");
  }

  lines.push(`[Открыть оригинал PDF](../${study.source_file})`);
  lines.push("");

  return lines.join("\n");
}

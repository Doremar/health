import { z } from "zod";

export const StudyTypeSchema = z.enum([
  "ecg", "holter", "smad",
  "xray", "fluorography", "ct", "mri", "usg",
  "other",
]);
export type StudyType = z.infer<typeof StudyTypeSchema>;

export const StudyDiagnosisSchema = z.object({
  text: z.string().min(1),
  icd10: z.string().nullable(),
});

export const StudyMetricSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  ref_low: z.number().nullable(),
  ref_high: z.number().nullable(),
});

export const StudyParseResultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: StudyTypeSchema,
  modality: z.string().nullable(),
  organ: z.string().nullable(),
  facility: z.string().nullable(),
  doctor: z.string().nullable(),
  conclusion: z.string().nullable(),
  findings: z.string().nullable(),
  recommendations: z.string().nullable(),
  diagnoses: z.array(StudyDiagnosisSchema),
  metrics: z.array(StudyMetricSchema),
  is_study: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
});
export type StudyParseResult = z.infer<typeof StudyParseResultSchema>;

export const TriageResultSchema = z.object({
  kind: z.enum(["lab", "study", "other"]),
  confidence: z.enum(["high", "medium", "low"]),
});
export type TriageResult = z.infer<typeof TriageResultSchema>;

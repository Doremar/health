import { z } from "zod";

export const ParsedMarkerSchema = z.object({
  name: z.string().min(1),
  value: z.number().nullable(),
  value_text: z.string().nullable(),
  unit: z.string().nullable(),
  ref_low: z.number().nullable(),
  ref_high: z.number().nullable(),
  ref_text: z.string().nullable(),
});

export const ParseResultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lab_name: z.string().min(1),
  panel: z.string().nullable(),
  markers: z.array(ParsedMarkerSchema),
  is_lab_result: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ParsedMarker = z.infer<typeof ParsedMarkerSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;

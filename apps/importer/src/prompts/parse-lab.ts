export function buildParseLabPrompt(filePath: string): string {
  return `Ты парсер медицинских анализов. Прочитай файл по пути: ${filePath}.

Извлеки данные в строгом JSON по схеме:

{
  "date": "YYYY-MM-DD",
  "lab_name": "Invitro" | "KDL" | "CMD" | "Гемотест" | ...,
  "panel": "биохимия крови" | "ОАК" | "гормоны щитовидной" | null,
  "markers": [
    {
      "name": "Ферритин",
      "value": 45.0,
      "value_text": null,
      "unit": "ng/ml",
      "ref_low": 30,
      "ref_high": 400,
      "ref_text": null
    }
  ],
  "is_lab_result": true,
  "confidence": "high" | "medium" | "low"
}

Правила:
- value — число с точкой как разделителем. Если значение не числовое
  (например, "отрицательно"), value: null и value_text: "отрицательно".
- ref_low/ref_high — оба null, если референс задан текстом ("не обнаружено"),
  тогда заполни ref_text.
- Если файл — НЕ медицинский анализ (квитанция, паспорт, случайное фото),
  поставь is_lab_result: false и markers: [].
- confidence: "low" если значительная часть полей не распознана.

Выведи СТРОГО JSON. Никаких пояснений, никаких markdown-фенсов.`;
}

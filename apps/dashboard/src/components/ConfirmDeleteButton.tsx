"use client";

interface ConfirmDeleteButtonProps {
  /** URL формы (action) */
  endpoint: string;
  /** Текст в window.confirm() */
  confirmText: string;
  /** Все hidden поля формы как Record<name, value> */
  fields: Record<string, string | number>;
  /** Текст кнопки. По дефолту «×» */
  label?: string;
  /** Кастомные классы для button */
  className?: string;
}

export function ConfirmDeleteButton(props: ConfirmDeleteButtonProps) {
  const { endpoint, confirmText, fields, label = "×", className } = props;

  return (
    <form
      action={endpoint}
      method="POST"
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className={className ?? "text-text-faint hover:text-flag-critical text-xs"}
      >
        {label}
      </button>
    </form>
  );
}

interface PageHeaderProps {
  title: string;
  meta?: string;
}

export function PageHeader({ title, meta }: PageHeaderProps) {
  return (
    <div className="mb-7 pb-5 border-b border-border-soft flex items-baseline justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      {meta && <div className="text-xs text-text-faint">{meta}</div>}
    </div>
  );
}

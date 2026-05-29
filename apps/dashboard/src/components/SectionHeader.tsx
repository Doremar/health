interface SectionHeaderProps {
  label: string;
  count?: number;
  icon?: string;
  className?: string;
}

export function SectionHeader({ label, count, icon, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 mb-3.5 mt-7 first:mt-0 ${className}`}>
      {icon && <span className="text-text-subtle">{icon}</span>}
      <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-text-subtle">
        {label}
      </span>
      {typeof count === "number" && (
        <span className="bg-bg-elevated text-text-subtle text-[10px] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

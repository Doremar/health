import { listMarkerSummaries, getPinnedOverrides } from "@/lib/queries";
import { classifyMarkerWithOverrides, type Flag } from "@health/shared";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { HeroCard } from "@/components/HeroCard";
import { MiniCard } from "@/components/MiniCard";

export const dynamic = "force-dynamic";

const FLAG_PRIORITY: Record<Flag, number> = { critical: 0, high: 1, low: 2, normal: 3 };

export default function HomePage() {
  const summaries = listMarkerSummaries();
  const pinnedOverrides = getPinnedOverrides();

  const abnormal = summaries.filter((s) => s.last_flag !== "normal");
  const pinned = summaries.filter((s) => classifyMarkerWithOverrides(s.code, s.last_flag, pinnedOverrides) === "pinned");
  const other = summaries.filter((s) => {
    const c = classifyMarkerWithOverrides(s.code, s.last_flag, pinnedOverrides);
    return c === "other" || c === "screening";
  });

  abnormal.sort((a, b) => FLAG_PRIORITY[a.last_flag] - FLAG_PRIORITY[b.last_flag]);
  const hero = abnormal[0];
  const restAbnormal = abnormal.slice(1);

  const meta = summaries.length === 0
    ? "БД пуста — загрузи первый PDF"
    : `${summaries.length} показателей · последнее обновление ${summaries[0]?.last_date ?? "—"}`;

  return (
    <>
      <PageHeader title="Snapshot" meta={meta} />

      {hero && (
        <>
          <SectionHeader label="Требует внимания" count={abnormal.length} icon="⚠" />
          <HeroCard
            code={hero.code}
            name={hero.name}
            panel={hero.last_panel}
            labName={hero.last_lab_name}
            value={hero.last_value}
            valueText={hero.last_value_text}
            unit={hero.unit}
            refLow={hero.ref_low}
            refHigh={hero.ref_high}
            flag={hero.last_flag}
          />
        </>
      )}

      {restAbnormal.length > 0 && (
        <>
          <SectionHeader label="Также вне нормы" count={restAbnormal.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {restAbnormal.map((s) => (
              <MiniCard key={s.code}
                code={s.code} name={s.name} panel={s.last_panel}
                value={s.last_value} valueText={s.last_value_text} unit={s.unit}
                refLow={s.ref_low} refHigh={s.ref_high} flag={s.last_flag} />
            ))}
          </div>
        </>
      )}

      <SectionHeader label="В фокусе" count={pinned.length} />
      {pinned.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pinned.map((s) => (
            <MiniCard key={s.code}
              code={s.code} name={s.name} panel={s.last_panel}
              value={s.last_value} valueText={s.last_value_text} unit={s.unit}
              refLow={s.ref_low} refHigh={s.ref_high} flag={s.last_flag} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-text-faint">
          Ни один маркер не закреплён. Закрепи нужные в <code>/settings</code>.
        </div>
      )}

      {other.length > 0 && (
        <details className="group mt-9">
          <summary className="flex items-center gap-2.5 px-4 py-3.5 bg-bg-surface border border-border-soft rounded-xl cursor-pointer text-text-subtle text-[13px] hover:border-border-card transition-colors list-none">
            <span className="text-text-disabled transition-transform group-open:rotate-90">▶</span>
            <span className="text-text-primary font-medium">{other.length}</span>
            <span>показателей в норме · нажми чтобы развернуть</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {other.map((s) => (
              <MiniCard key={s.code}
                code={s.code} name={s.name} panel={s.last_panel}
                value={s.last_value} valueText={s.last_value_text} unit={s.unit}
                refLow={s.ref_low} refHigh={s.ref_high} flag={s.last_flag} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

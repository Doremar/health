import { listAllMarkerCodes, getPinnedOverrides } from "@/lib/queries";
import { PINNED_CODES } from "@health/shared";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const all = listAllMarkerCodes();
  const overrides = getPinnedOverrides();

  return (
    <>
      <PageHeader title="Настройки" meta={`${all.length} известных маркеров`} />
      <SectionHeader label="Pinned маркеры (на главной)" />
      <div className="text-sm text-text-faint mb-4">
        Базовый whitelist <code>PINNED_CODES</code> определён в коде. Здесь можно <strong>добавить</strong> ещё (не убрать из whitelist).
      </div>
      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Код</th>
              <th className="p-3 text-left font-medium">Название</th>
              <th className="p-3 text-right font-medium tabular">Сдач</th>
              <th className="p-3 text-center font-medium">В фокусе</th>
            </tr>
          </thead>
          <tbody>
            {all.map((m) => {
              const inWhitelist = PINNED_CODES.has(m.code);
              const overridden = overrides.has(m.code);
              const pinned = inWhitelist || overridden;
              return (
                <tr key={m.code} className="border-t border-border-soft">
                  <td className="p-3 font-mono text-xs text-text-faint">{m.code}</td>
                  <td className="p-3 text-text-muted">{m.name}</td>
                  <td className="p-3 text-right tabular text-text-primary">{m.count}</td>
                  <td className="p-3 text-center">
                    {inWhitelist ? (
                      <span className="text-flag-normal text-xs">в whitelist</span>
                    ) : (
                      <form action="/api/toggle-pin" method="POST" className="inline">
                        <input type="hidden" name="code" value={m.code} />
                        <button type="submit" className={
                          overridden
                            ? "text-flag-normal text-xs hover:underline"
                            : "text-text-faint text-xs hover:text-text-primary hover:underline"
                        }>
                          {pinned ? "● закреплён" : "○ закрепить"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

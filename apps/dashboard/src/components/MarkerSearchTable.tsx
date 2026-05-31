"use client";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

interface Row {
  code: string;
  name: string;
  count: number;
  inWhitelist: boolean;
  overridden: boolean;
}

interface Props {
  rows: Row[];
}

function normalize(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").trim();
}

export function MarkerSearchTable({ rows: initialRows }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = normalize(q);
    if (!needle) return rows;
    return rows.filter(
      (r) => normalize(r.name).includes(needle) || normalize(r.code).includes(needle)
    );
  }, [q, rows]);

  async function togglePin(code: string) {
    // Optimistic update.
    startTransition(() => {
      setRows((prev) =>
        prev.map((r) => (r.code === code ? { ...r, overridden: !r.overridden } : r))
      );
    });
    setPending((s) => new Set(s).add(code));
    try {
      const fd = new FormData();
      fd.set("code", code);
      const res = await fetch("/api/toggle-pin", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      // Rollback.
      setRows((prev) =>
        prev.map((r) => (r.code === code ? { ...r, overridden: !r.overridden } : r))
      );
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(code);
        return n;
      });
    }
  }

  return (
    <>
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию"
          className="w-full pl-9 pr-3 py-2 text-sm bg-bg-surface border border-border-soft rounded-lg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-active"
          autoFocus
        />
      </div>
      <div className="text-[11px] text-text-faint mb-3">
        {q ? `${filtered.length} из ${rows.length}` : `${rows.length} маркеров`}
      </div>

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-center font-medium w-1/3">Название</th>
              <th className="p-3 text-center font-medium tabular w-1/3">Сдач</th>
              <th className="p-3 text-center font-medium w-1/3">В фокусе</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-text-faint text-sm italic">
                  ничего не найдено по «{q}»
                </td>
              </tr>
            )}
            {filtered.map((m) => {
              const pinned = m.overridden;
              const isPending = pending.has(m.code);
              return (
                <tr key={m.code} className="border-t border-border-soft">
                  <td className="p-3 text-center text-text-primary">{m.name}</td>
                  <td className="p-3 text-center tabular text-text-primary">{m.count}</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => togglePin(m.code)}
                      className={[
                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md border text-sm whitespace-nowrap transition-colors",
                        pinned
                          ? "border-flag-normal/40 text-flag-normal hover:border-flag-normal"
                          : "border-border-card text-text-faint hover:border-border-active hover:text-text-strong",
                        isPending ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      {pinned ? "● закреплён" : "○ закрепить"}
                    </button>
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

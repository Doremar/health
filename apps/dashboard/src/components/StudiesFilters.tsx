"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  knownTypes: string[];
  knownMods: string[];
  typeLabels: Record<string, string>;
  modalityLabels: Record<string, string>;
}

export function StudiesFilters({ knownTypes, knownMods, typeLabels, modalityLabels }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [modality, setModality] = useState(params.get("modality") ?? "");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (type) sp.set("type", type);
      if (modality) sp.set("modality", modality);
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `/studies?${qs}` : "/studies");
      });
    }, 220);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [q, type, modality, router]);

  return (
    <div className="flex gap-3 items-end mb-6 flex-wrap">
      <div className="flex-1 min-w-[260px] max-w-md">
        <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">
          Поиск
        </label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder=""
            className="w-full bg-bg-surface border border-border-card rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-active"
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">
          Тип
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
        >
          <option value="">все</option>
          {knownTypes.map((t) => (
            <option key={t} value={t}>
              {typeLabels[t] ?? t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">
          Модальность
        </label>
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
        >
          <option value="">все</option>
          {knownMods.map((m) => (
            <option key={m} value={m}>
              {modalityLabels[m] ?? m}
            </option>
          ))}
        </select>
      </div>
      <div className="text-[11px] text-text-faint pb-2.5">
        {isPending ? "обновление…" : " "}
      </div>
    </div>
  );
}

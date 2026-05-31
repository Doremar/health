"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  knownLabs: string[];
}

export function ArchiveFilters({ knownLabs }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [lab, setLab] = useState(params.get("lab") ?? "");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced URL sync
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (lab) sp.set("lab", lab);
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `/archive?${qs}` : "/archive");
      });
    }, 220);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [q, lab, router]);

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
          Лаборатория
        </label>
        <select
          value={lab}
          onChange={(e) => setLab(e.target.value)}
          className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
        >
          <option value="">все</option>
          {knownLabs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="text-[11px] text-text-faint pb-2.5">
        {isPending ? "обновление…" : " "}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Archive, Upload, Pill, Activity, Watch,
  ListPlus, Apple, Dumbbell, Settings,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  soon?: boolean;
}

interface NavGroup {
  title: string;
  hint?: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Обзор",
    items: [
      { href: "/", label: "Главная", icon: <LayoutDashboard size={16} /> },
      { href: "/archive", label: "Архив сдач", icon: <Archive size={16} /> },
    ],
  },
  {
    title: "Данные",
    items: [
      { href: "/import", label: "Загрузить", icon: <Upload size={16} /> },
      { href: "/meds", label: "Лекарства и БАД", icon: <Pill size={16} /> },
      { href: "/feelings", label: "Самочувствие", icon: <Activity size={16} /> },
    ],
  },
  {
    title: "Дневники",
    hint: "скоро",
    items: [
      { href: "#", label: "Whoop",        icon: <Watch size={16} />,    badge: "soon", soon: true },
      { href: "#", label: "Симптомы",     icon: <ListPlus size={16} />, badge: "soon", soon: true },
      { href: "#", label: "Питание",      icon: <Apple size={16} />,    badge: "soon", soon: true },
      { href: "#", label: "Тренировки",   icon: <Dumbbell size={16} />, badge: "soon", soon: true },
    ],
  },
];

interface SidebarProps {
  archiveCount?: number;
}

export function Sidebar({ archiveCount }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="w-[220px] bg-bg-sidebar border-r border-border-soft p-6 flex flex-col min-h-screen">
      <div className="flex items-center gap-2.5 mb-7 px-2 text-sm font-semibold tracking-tight text-text-primary">
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-flag-normal to-flag-high" />
        Health
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="mb-1">
          <div className="px-2 mt-4 mb-2 text-[10px] font-medium tracking-[0.12em] uppercase text-text-disabled">
            {group.title}
            {group.hint && (
              <span className="ml-1.5 normal-case tracking-normal text-[9px] text-text-disabled">
                {group.hint}
              </span>
            )}
          </div>
          {group.items.map((item) => {
            const active = !item.soon && pathname === item.href;
            const itemBadge = item.label === "Архив сдач" && typeof archiveCount === "number"
              ? archiveCount
              : item.badge;
            return (
              <Link
                key={item.label}
                href={item.soon ? "#" : item.href}
                onClick={(e) => item.soon && e.preventDefault()}
                aria-disabled={item.soon}
                className={[
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-px transition-colors",
                  item.soon
                    ? "text-text-disabled cursor-not-allowed"
                    : active
                      ? "bg-bg-elevated text-text-primary border border-border-active px-2 py-[7px]"
                      : "text-text-subtle hover:bg-bg-surface hover:text-text-strong",
                ].join(" ")}
              >
                <span className={item.soon ? "opacity-40" : "opacity-80"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {itemBadge !== undefined && (
                  <span
                    className={
                      item.soon
                        ? "text-[10px] px-1.5 py-0 text-text-disabled border border-border-card rounded-full"
                        : "text-[10px] font-semibold px-1.5 py-px bg-flag-high text-[#1a0d05] rounded-full"
                    }
                  >
                    {itemBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto pt-4 border-t border-border-soft">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-text-faint hover:text-text-strong transition-colors"
        >
          <Settings size={12} />
          Настройки
        </Link>
      </div>
    </aside>
  );
}

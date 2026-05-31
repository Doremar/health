"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ClickableRow({ href, children, className }: Props) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      tabIndex={0}
      role="link"
      className={[
        "cursor-pointer outline-none border-t border-border-soft",
        "hover:bg-bg-elevated/60 focus-visible:bg-bg-elevated/60",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </tr>
  );
}

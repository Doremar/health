import "./globals.css";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { countLabs } from "@/lib/queries";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = { title: "Health Dashboard" };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let labsCount: number | undefined;
  try {
    labsCount = countLabs();
  } catch {
    labsCount = undefined;
  }

  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans bg-bg-page text-text-strong min-h-screen">
        <div className="flex">
          <Sidebar archiveCount={labsCount} />
          <main className="flex-1 px-9 py-7 max-w-[1200px]">{children}</main>
        </div>
      </body>
    </html>
  );
}

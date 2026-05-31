import "./globals.css";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { countLabs, countStudies } from "@/lib/queries";

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

  let studiesCount: number | undefined;
  try { studiesCount = countStudies(); } catch { studiesCount = undefined; }

  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans bg-bg-page text-text-strong min-h-screen w-full">
        <div className="flex w-full min-h-screen">
          <Sidebar archiveCount={labsCount} studiesCount={studiesCount} />
          <main className="flex-1 px-9 py-7 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}

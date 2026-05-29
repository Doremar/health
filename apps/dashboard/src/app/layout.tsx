import "./globals.css";

export const metadata = { title: "Health Dashboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-neutral-50 text-neutral-900">
        <header className="border-b bg-white px-6 py-3">
          <nav className="flex gap-6 text-sm">
            <a href="/" className="font-semibold">Health</a>
            <a href="/archive">Архив</a>
            <a href="/import">Импорт</a>
          </nav>
        </header>
        <main className="px-6 py-6 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}

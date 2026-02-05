import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "研究筆記",
  description: "投資研究 / 事件雷達 / 量化筆記",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Global Header */}
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight">
              研究筆記
            </a>

            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <a className="hover:text-gray-900" href="/about">
                About
              </a>
              <a className="hover:text-gray-900" href="/">
                首頁
              </a>
              <a className="hover:text-gray-900" href="/notes">
                Notes
              </a>
              <a className="hover:text-gray-900" href="/daily">
                事件雷達
              </a>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

        {/* Global Footer */}
        <footer className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-gray-500">
            © {new Date().getFullYear()} 你的名字 · Built with Next.js + Vercel
          </div>
        </footer>
      </body>
    </html >
  );
}

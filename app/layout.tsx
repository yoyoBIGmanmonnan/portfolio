// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

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
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold tracking-tight hover:text-gray-900">
              研究筆記
            </Link>

            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900">
                首頁
              </Link>
              <Link href="/daily" className="hover:text-gray-900">
                事件雷達
              </Link>
              <Link href="/notes" className="hover:text-gray-900">
                Notes
              </Link>
              <Link href="/about" className="hover:text-gray-900">
                About
              </Link>

              {/* ✅ Keywords 放在 Header nav */}
              <Link
                href="/methodology/keywords"
                className="font-medium text-gray-800 hover:text-gray-900"
              >
                Keywords
              </Link>
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
    </html>
  );
}

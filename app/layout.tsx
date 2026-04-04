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
      <body className="min-h-screen bg-[#0B1120] text-slate-300 font-sans selection:bg-blue-500/30">
        {/* Global Header */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold tracking-tight text-white hover:text-blue-400 transition-colors">
              研究筆記
            </Link>

            <nav className="flex items-center gap-4 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">
                首頁
              </Link>
              <Link href="/daily" className="hover:text-white transition-colors">
                事件雷達
              </Link>
              <Link href="/notes" className="hover:text-white transition-colors">
                Notes
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>

              {/* ✅ Keywords 放在 Header nav */}
              <Link
                href="/methodology/keywords"
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Keywords
              </Link>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

        {/* Global Footer */}
        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-gray-500">
            © {new Date().getFullYear()} 謝家綸 · Built with Next.js + Vercel
          </div>
        </footer>
      </body>
    </html>
  );
}

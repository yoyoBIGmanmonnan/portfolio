"use client";

import { getAllNotes } from "@/lib/notes";

function Tag({ text }: { text: string }) {
    return (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
            {text}
        </span>
    );
}

export default function NotesPage() {
    const notes = getAllNotes();

    return (
        <main className="space-y-8">
            {/* Navigation helpers */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
                <button
                    onClick={() => window.history.back()}
                    className="hover:text-gray-900"
                >
                    ← 上一頁
                </button>
                <a href="/" className="hover:text-gray-900">
                    回首頁
                </a>
            </div>

            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
                <p className="text-gray-600">
                    短筆記 → 可延伸成完整研究報告、策略規則或事件雷達指標。
                </p>
            </header>

            <div className="space-y-4">
                {notes.map((n) => (
                    <a
                        key={n.slug}
                        href={`/notes/${n.slug}`}
                        className="block rounded-xl border p-5 hover:shadow-sm"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{n.title}</h2>
                                <p className="mt-2 text-sm text-gray-600">{n.summary}</p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {n.tags.map((t) => (
                                        <Tag key={t} text={t} />
                                    ))}
                                </div>

                                {(n.theme || n.subTheme || n.weight !== undefined) && (
                                    <div className="mt-3 text-xs text-gray-500">
                                        {n.theme ? `Theme: ${n.theme}` : ""}
                                        {n.subTheme ? ` · Sub: ${n.subTheme}` : ""}
                                        {n.weight !== undefined ? ` · W: ${n.weight}` : ""}
                                    </div>
                                )}
                            </div>

                            <div className="text-sm text-gray-500">{n.date}</div>
                        </div>
                    </a>
                ))}
            </div>
        </main>
    );
}

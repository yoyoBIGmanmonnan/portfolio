"use client";

import { use } from "react";
import { getNoteBySlug } from "@/lib/notes";

function Tag({ text }: { text: string }) {
    return (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
            {text}
        </span>
    );
}

export default function NotePage({
    params,
}: {
    params: Promise<{ slug: string }> | { slug: string };
}) {
    const resolvedParams =
        typeof (params as any)?.then === "function"
            ? use(params as Promise<{ slug: string }>)
            : (params as { slug: string });

    const slug = resolvedParams.slug;
    const note = getNoteBySlug(slug);

    if (!note) {
        return (
            <main className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <button
                        onClick={() => window.history.back()}
                        className="hover:text-gray-900"
                    >
                        ← 上一頁
                    </button>
                    <a className="hover:text-gray-900" href="/notes">
                        回 Notes
                    </a>
                    <a className="hover:text-gray-900" href="/">
                        回首頁
                    </a>
                </div>

                <h1 className="text-2xl font-bold">找不到這篇筆記</h1>
                <p className="text-gray-600">slug: {slug}</p>
            </main>
        );
    }

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
                <a href="/notes" className="hover:text-gray-900">
                    回 Notes
                </a>
                <a href="/" className="hover:text-gray-900">
                    回首頁
                </a>
            </div>

            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500">{note.date}</span>
                    {note.tags.map((t) => (
                        <Tag key={t} text={t} />
                    ))}
                </div>

                {(note.theme || note.subTheme || note.weight !== undefined) && (
                    <div className="text-sm text-gray-600">
                        {note.theme ? `Theme: ${note.theme}` : ""}
                        {note.subTheme ? ` · Sub: ${note.subTheme}` : ""}
                        {note.weight !== undefined ? ` · Weight: ${note.weight}` : ""}
                    </div>
                )}
            </header>

            <article className="space-y-4 leading-7 text-gray-800">
                {note.body.map((p, i) => (
                    <p key={i}>{p}</p>
                ))}
            </article>
        </main>
    );
}

"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { KeywordCat } from "./page";
import type { HitsIndex } from "@/lib/keywords/hits";
import type { ChangelogItem } from "@/lib/keywords/changelog";

function normalize(s: string) {
    return s.toLowerCase().trim();
}

function copyText(text: string) {
    if (!navigator?.clipboard?.writeText) {
        window.prompt("複製以下內容：", text);
        return;
    }
    navigator.clipboard.writeText(text);
}

export default function KeywordsClient({
    cats,
    hits,
    version,
    changelog,
}: {
    cats: KeywordCat[];
    hits: HitsIndex;
    version: string;
    changelog: ChangelogItem[];
}) {
    const [q, setQ] = useState("");
    const [openAll, setOpenAll] = useState<boolean | null>(null);

    const stats = useMemo(() => {
        const totalCats = cats.length;
        const totalWords = cats.reduce((acc, c) => acc + c.items.length, 0);
        const totalHitDays = Object.values(hits).reduce((acc, r) => acc + (r.hitDays || 0), 0);
        return { totalCats, totalWords, totalHitDays };
    }, [cats, hits]);

    const filtered = useMemo(() => {
        const nq = normalize(q);
        if (!nq) return cats;

        return cats
            .map((cat) => {
                const hitTitle = normalize(cat.title).includes(nq) || normalize(cat.key).includes(nq);
                const hitItems = cat.items.filter((k) => normalize(k).includes(nq));
                if (hitTitle) return cat;
                if (hitItems.length > 0) return { ...cat, items: hitItems };
                return null;
            })
            .filter(Boolean) as KeywordCat[];
    }, [q, cats]);

    const hitWords = useMemo(() => filtered.reduce((acc, c) => acc + c.items.length, 0), [filtered]);

    const allText = useMemo(() => {
        return cats
            .map((c) => {
                const lines = c.items.map((x) => `- ${x}`).join("\n");
                return `## ${c.title} (${c.items.length})\n${lines}`;
            })
            .join("\n\n");
    }, [cats]);

    const allJson = useMemo(() => JSON.stringify(cats, null, 2), [cats]);

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">關鍵字總覽（EventRadar Keywords）</h1>
                        <p className="mt-2 text-sm text-neutral-600">
                            版本 <span className="font-medium text-neutral-800">{version}</span> ·
                            提供完整關鍵字分類與命中證據供外部檢視（掃全文）。
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setOpenAll(true)}>
                            全部展開
                        </button>
                        <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setOpenAll(false)}>
                            全部收合
                        </button>
                        <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => copyText(allText)}>
                            複製全部文字
                        </button>
                        <button className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => copyText(allJson)}>
                            複製全部 JSON
                        </button>
                    </div>
                </div>

                {/* Changelog */}
                <div className="mt-4 rounded-2xl border bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-neutral-800">更新紀錄（Changelog）</div>
                    <div className="space-y-3 text-sm text-neutral-700">
                        {changelog.map((c) => (
                            <div key={c.date} className="rounded-xl bg-neutral-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-medium">{c.title}</div>
                                    <div className="text-xs text-neutral-500">{c.date}</div>
                                </div>
                                <ul className="mt-2 list-disc pl-5 text-neutral-600">
                                    {c.items.map((x) => (
                                        <li key={x}>{x}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mb-6 rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <label className="mb-1 block text-xs text-neutral-500">搜尋分類或關鍵字</label>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="例如：HBM / CPO / 衛星 / 探針卡 ..."
                            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                        />
                    </div>
                    <div className="flex gap-6 text-sm text-neutral-700">
                        <div>
                            <div className="text-xs text-neutral-500">總類別</div>
                            <div className="font-semibold">{stats.totalCats}</div>
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500">總關鍵字</div>
                            <div className="font-semibold">{stats.totalWords}</div>
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500">搜尋命中</div>
                            <div className="font-semibold">{hitWords}</div>
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500">累計命中(日)</div>
                            <div className="font-semibold">{stats.totalHitDays}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Index */}
            <div className="space-y-3">
                {filtered.map((cat) => (
                    <KeywordAccordion key={cat.key} cat={cat} openAll={openAll} hits={hits} />
                ))}
                {filtered.length === 0 && (
                    <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
                        找不到符合的分類或關鍵字。
                    </div>
                )}
            </div>
        </main>
    );
}

function KeywordAccordion({
    cat,
    openAll,
    hits,
}: {
    cat: KeywordCat;
    openAll: boolean | null;
    hits: HitsIndex;
}) {
    const [open, setOpen] = useState(false);
    const isOpen = openAll === null ? open : openAll;

    const textForCat = useMemo(() => {
        const lines = cat.items.map((x) => `- ${x}`).join("\n");
        return `## ${cat.title} (${cat.items.length})\n${lines}`;
    }, [cat]);

    return (
        <div className="rounded-2xl border bg-white">
            <div
                className="flex w-full cursor-pointer items-start justify-between gap-4 p-4"
                onClick={() => setOpen((v) => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
                }}
            >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{cat.title}</h3>
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                            {cat.items.length}
                        </span>
                    </div>
                    {cat.desc && <p className="mt-1 text-sm text-neutral-600">{cat.desc}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            copyText(textForCat);
                        }}
                        title="複製此分類"
                        type="button"
                    >
                        複製
                    </button>
                    <span className="text-sm text-neutral-400">{isOpen ? "▾" : "▸"}</span>
                </div>
            </div>

            {isOpen && (
                <div className="border-t p-4">
                    <ul className="space-y-2 text-sm">
                        {cat.items.map((k) => {
                            const r = hits[k];
                            const hitDays = r?.hitDays ?? 0;
                            const first = r?.firstSeen ?? "—";
                            const last = r?.lastSeen ?? "—";
                            const lastSlug = r?.lastSeenSlug;

                            return (
                                <li
                                    key={k}
                                    className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-3 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="font-medium text-neutral-800">{k}</div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                                        <span className="rounded-md border bg-white px-2 py-1">
                                            hitDays: <span className="font-semibold text-neutral-800">{hitDays}</span>
                                        </span>
                                        <span>
                                            first: <span className="font-semibold text-neutral-800">{first}</span>
                                        </span>
                                        <span>
                                            last:{" "}
                                            {lastSlug ? (
                                                <Link href={`/daily/${lastSlug}`} className="font-semibold text-neutral-800 hover:underline">
                                                    {last}
                                                </Link>
                                            ) : (
                                                <span className="font-semibold text-neutral-800">{last}</span>
                                            )}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

// lib/keywords/hits.ts
import fs from "node:fs/promises";
import path from "node:path";
import { KEYWORD_CATS } from "./catalog";

export type KeywordHit = {
    keyword: string;
    hitDays: number;
    firstSeen?: string;     // YYYY-MM-DD
    lastSeen?: string;      // YYYY-MM-DD
    lastSeenSlug?: string;  // 例如 2026-02-09
};

export type HitsIndex = Record<string, KeywordHit>;

function normalize(s: string) {
    return s.toLowerCase();
}

function slugFromFilename(file: string) {
    return file.replace(/\.mdx?$/i, "");
}

function dateFromSlug(slug: string) {
    const m = slug.match(/^(\d{4}-\d{2}-\d{2})$/);
    return m?.[1];
}

export async function buildKeywordHits(): Promise<HitsIndex> {
    const dailyDir = path.join(process.cwd(), "content", "daily");
    const files = await fs.readdir(dailyDir).catch(() => []);

    const allKeywords = KEYWORD_CATS.flatMap((c) => c.items);

    const hits: HitsIndex = Object.fromEntries(
        allKeywords.map((k) => [k, { keyword: k, hitDays: 0 } as KeywordHit])
    );

    for (const file of files) {
        if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;

        const slug = slugFromFilename(file);
        const date = dateFromSlug(slug);
        if (!date) continue;

        const fullPath = path.join(dailyDir, file);
        const raw = await fs.readFile(fullPath, "utf8");
        const text = normalize(raw);

        for (const kw of allKeywords) {
            if (!text.includes(normalize(kw))) continue;

            const rec = hits[kw];
            rec.hitDays += 1;

            if (!rec.firstSeen || date < rec.firstSeen) rec.firstSeen = date;
            if (!rec.lastSeen || date > rec.lastSeen) {
                rec.lastSeen = date;
                rec.lastSeenSlug = slug;
            }
        }
    }

    return hits;
}

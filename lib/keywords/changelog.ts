// lib/keywords/changelog.ts
export const KEYWORDS_VERSION = "v1.1.0";

export type ChangelogItem = {
    date: string; // YYYY-MM-DD
    title: string;
    items: string[];
};

export const KEYWORDS_CHANGELOG: ChangelogItem[] = [
    {
        date: "2026-02-09",
        title: "公開 Keywords Index + 支援命中統計",
        items: [
            "新增 /methodology/keywords 頁",
            "支援搜尋、全展開、複製文字/JSON",
            "新增命中統計：hitDays / firstSeen / lastSeen",
        ],
    },
];

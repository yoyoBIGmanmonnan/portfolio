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
        title: "Keywords 公開檢視 + 命中統計（掃全文）",
        items: [
            "新增版本號 / Changelog",
            "掃描 content/daily/*.md(x) 連動命中",
            "每個 keyword 顯示 hitDays / firstSeen / lastSeen",
            "lastSeen 支援直接連到 /daily/日期",
        ],
    },
];

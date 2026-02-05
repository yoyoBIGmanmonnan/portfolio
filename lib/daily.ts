import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const DAILY_DIR = path.join(process.cwd(), "content", "daily");

export function getDailySlugs(): string[] {
    if (!fs.existsSync(DAILY_DIR)) return [];
    return fs
        .readdirSync(DAILY_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""));
}

export function getDailyList(): { slug: string; title: string; date: string }[] {
    const slugs = getDailySlugs();
    const items = slugs.map((slug) => {
        const fullPath = path.join(DAILY_DIR, `${slug}.md`);
        const raw = fs.readFileSync(fullPath, "utf-8");
        const { data } = matter(raw);
        return {
            slug,
            title: (data.title as string) ?? `台股事件雷達｜${slug}`,
            date: (data.date as string) ?? slug,
        };
    });

    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    return items;
}

export async function getDailyHtml(slug: string) {
    const fullPath = path.join(DAILY_DIR, `${slug}.md`);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(raw);

    const processed = await remark().use(html).process(content);

    return {
        meta: {
            slug,
            title: (data.title as string) ?? `台股事件雷達｜${slug}`,
            date: (data.date as string) ?? slug,
        },
        contentHtml: processed.toString(),
    };
}
export function getLatestDaily() {
    const list = getDailyList();
    if (list.length === 0) return null;
    return list[0]; // 已經是新到舊排序
}

import { getDailyHtml, getDailySlugs } from "@/lib/daily";

export async function generateStaticParams() {
    return getDailySlugs().map((slug) => ({ slug }));
}

function confidenceLabel(c?: number) {
    if (c === undefined || c === null) return "—";
    if (c >= 2) return "高把握";
    if (c === 1) return "中把握";
    return "低把握";
}

type EventItem = {
    title: string;
    ulHtml: string;
    company?: string;
    heat?: number;
};

/* =========================
   Utils
========================= */

function stripTags(s: string) {
    return s.replace(/<[^>]+>/g, "").trim();
}

function extractCompany(ulHtml: string) {
    const m = ulHtml.match(/<li[^>]*>\s*公司\s*[:：]\s*([^<]+?)\s*<\/li>/);
    return m ? m[1].trim() : undefined;
}

function extractHeatAny(s: string) {
    const m = s.match(/熱度\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : undefined;
}

function removeTopicLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*主題\s*[:：][\s\S]*?<\/li>/g, "");
}

function removeCompanyLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*公司\s*[:：][\s\S]*?<\/li>/g, "");
}

/**
 * 把「代表新聞」折疊進 <details>（只處理 ul 版）
 */
function foldNewsInsideUl(ulHtml: string) {
    const lis: string[] = ulHtml.match(/<li[\s\S]*?<\/li>/g) ?? [];
    if (!lis.length) return ulHtml;

    const idx = lis.findIndex((li) => /代表新聞\s*[:：]?/.test(li));
    if (idx === -1) return ulHtml;

    // A) <li>代表新聞：<ul ...>...</ul></li>
    const nested = lis[idx].match(
        /<li[^>]*>\s*代表新聞[:：]?\s*<ul([\s\S]*?)<\/ul>\s*<\/li>/
    );
    if (nested) {
        const inner = nested[1];
        const count = (inner.match(/<li[\s\S]*?<\/li>/g) ?? []).length;

        const folded = `
<li>
  <details>
    <summary style="cursor:pointer; opacity:0.8;">查看來源（${count}）</summary>
    <ul${inner}</ul>
  </details>
</li>
`.replace(/\n\s+/g, "");

        const newLis = [...lis];
        newLis[idx] = folded;
        return `<ul>${newLis.join("")}</ul>`;
    }

    // B) <li>代表新聞：</li> 後面連續很多 li
    const kept = lis.slice(0, idx);
    const newsLis = lis.slice(idx + 1);
    const count = newsLis.length;

    const folded = `
<li>
  <details>
    <summary style="cursor:pointer; opacity:0.8;">查看來源（${count}）</summary>
    <ul>${newsLis.join("")}</ul>
  </details>
</li>
`.replace(/\n\s+/g, "");

    return `<ul>${kept.join("")}${folded}</ul>`;
}

/* =========================
   EventRadarPlus pure-text fallback
========================= */

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseEventsFromPureText(sectionHtml: string): EventItem[] {
    const text = stripTags(
        sectionHtml
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
            .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    )
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .trim();

    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const isStart = (l: string) => /^\d+\)\s*/.test(l);

    const blocks: string[][] = [];
    let cur: string[] = [];
    for (const l of lines) {
        if (isStart(l)) {
            if (cur.length) blocks.push(cur);
            cur = [l];
        } else if (cur.length) {
            cur.push(l);
        }
    }
    if (cur.length) blocks.push(cur);

    return blocks.map((b) => {
        const title = (b[0] || "").replace(/^\d+\)\s*/, "").trim();
        const joined = b.join("\n");

        const company =
            joined.match(/公司\s*[:：]\s*([^\n｜|]+)/)?.[1]?.trim() || undefined;

        const heat = extractHeatAny(joined);

        const idxNews = b.findIndex((l) => /^代表新聞\s*[:：]?\s*$/.test(l) || /^代表新聞\s*[:：]/.test(l));
        const pre = idxNews === -1 ? b : b.slice(0, idxNews + 1);
        const news = idxNews === -1 ? [] : b.slice(idxNews + 1);

        const liMain = pre.map((l) => `<li>${escapeHtml(l)}</li>`).join("");
        const liNews = news.map((l) => `<li>${escapeHtml(l)}</li>`).join("");

        const folded =
            news.length > 0
                ? `<li><details><summary style="cursor:pointer; opacity:0.8;">查看來源（${news.length}）</summary><ul>${liNews}</ul></details></li>`
                : "";

        let ulHtml = `<ul>${liMain}${folded}</ul>`;
        ulHtml = removeTopicLi(ulHtml);
        ulHtml = removeCompanyLi(ulHtml);

        return { title, ulHtml, company, heat };
    });
}

/* =========================
   Main transformer
========================= */

function transformDailyHtml(html: string) {
    let out = html;

    // 1) 移除 RunLog（抓取狀態之後全部砍）
    out = out.replace(/<h2[^>]*>\s*抓取狀態（RunLog[\s\S]*?<\/h2>[\s\S]*$/g, "");

    // 2) 高信心 → 把握度
    out = out.replace(/高信心\s*[:：]\s*(\d+)/g, (_, n) => {
        const c = Number(n);
        return `把握度：${confidenceLabel(Number.isFinite(c) ? c : undefined)}`;
    });
    out = out.replace(/高信心/g, "把握度");

    // 3) 事件排行（EventRadarPlus）做公司卡（先試 h3+ul，沒有就用純文字 fallback）
    const sectionMatch = out.match(
        /<h2[^>]*>[\s\S]*?事件排行[\s\S]*?EventRadarPlus[\s\S]*?<\/h2>[\s\S]*?(?=<h2|$)/
    );

    if (sectionMatch) {
        const sectionHtml = sectionMatch[0];

        const events: EventItem[] = [];

        // A) 原本卡片版：h3 + ul
        const eventRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(<ul[\s\S]*?<\/ul>)/g;
        let m: RegExpExecArray | null;
        while ((m = eventRegex.exec(sectionHtml)) !== null) {
            const title = stripTags(m[1]);
            const rawUl = m[2];

            const company = extractCompany(rawUl);
            const heat = extractHeatAny(rawUl);

            let ulHtml = rawUl;
            ulHtml = removeTopicLi(ulHtml);
            ulHtml = removeCompanyLi(ulHtml);
            ulHtml = foldNewsInsideUl(ulHtml);

            events.push({ title, ulHtml, company, heat });
        }

        // B) 純文字 fallback
        if (events.length === 0) {
            events.push(...parseEventsFromPureText(sectionHtml));
        }

        if (events.length > 0) {
            const byCompany = new Map<string, EventItem[]>();
            for (const e of events) {
                const key = e.company || "（未辨識公司）";
                if (!byCompany.has(key)) byCompany.set(key, []);
                byCompany.get(key)!.push(e);
            }

            const companies = [...byCompany.keys()].sort((a, b) => {
                const aMax = Math.max(...(byCompany.get(a) || []).map((x) => x.heat ?? 0));
                const bMax = Math.max(...(byCompany.get(b) || []).map((x) => x.heat ?? 0));
                return bMax - aMax;
            });

            const rebuilt = [
                `<h2>事件排行（EventRadarPlus）</h2>`,
                ...companies.map((company) => {
                    const list = byCompany.get(company)!;
                    const maxHeat = Math.max(...list.map((x) => x.heat ?? 0));
                    const total = list.length;

                    const itemsHtml = list
                        .map((ev) => {
                            const subTitle = ev.title.replace(/^\d+\)\s*/, "");
                            return `
<div style="margin-top:10px; padding-left:12px; border-left:3px solid rgba(0,0,0,0.08);">
  <div style="font-weight:700; margin-bottom:4px;">${subTitle}</div>
  ${ev.ulHtml}
</div>
`.replace(/\n\s+/g, "");
                        })
                        .join("");

                    return `
<div style="margin-top:16px; padding:12px 14px; border:1px solid rgba(0,0,0,0.08); border-radius:12px;">
  <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
    <div style="font-size:18px; font-weight:800;">${company}</div>
    <div style="opacity:0.75; font-size:13px;">
      事件數 ${total} ・ 最高熱度 ${maxHeat.toFixed(2)}
    </div>
  </div>
  ${itemsHtml}
</div>
`.replace(/\n\s+/g, "");
                }),
            ].join("");

            out = out.replace(sectionHtml, rebuilt);
        }
    }

    // 4) 回填「高把握事件數」
    const highCount = (out.match(/把握度：高把握/g) ?? []).length;
    out = out.replace(/__HIGH_CONF__/g, String(highCount));

    return out;
}

export default async function DailyDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    if (!slug) {
        return (
            <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
                <h1>Missing slug</h1>
            </main>
        );
    }

    const { meta, contentHtml } = await getDailyHtml(slug);
    const cleanedHtml = transformDailyHtml(contentHtml);

    return (
        <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
            <a href="/daily" style={{ opacity: 0.7 }}>
                ← Back
            </a>

            <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 12 }}>{meta.title}</h1>
            <div style={{ opacity: 0.7, marginTop: 6 }}>{meta.date}</div>

            <article
                style={{ marginTop: 20, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
        </main>
    );
}

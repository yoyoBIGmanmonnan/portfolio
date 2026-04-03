// app/daily/[slug]/page.tsx
import { getDailyHtml, getDailySlugs } from "@/lib/daily";
import { KEYWORD_CATS } from "@/lib/keywords/catalog";
import fs from "fs/promises";
import path from "path";

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
    hitWords?: string[];
};

type CompanyHeatRow = {
    company: string;
    heat: number;
    appearCount?: number | null;
    confidenceCount?: number | null;
    mainTheme?: string;
    subTheme?: string;
};

type CompanyHeatJson = {
    slug: string;
    topN: number;
    rows: CompanyHeatRow[];
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

function extractHeat(ulHtml: string) {
    const m = ulHtml.match(/熱度\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : undefined;
}

// 抓「命中詞」
function extractHitWords(ulHtml: string): string[] {
    const m = ulHtml.match(/<li[^>]*>\s*命中詞\s*[:：]\s*([\s\S]*?)<\/li>/);
    if (!m) return [];
    const raw = stripTags(m[0]).replace(/^命中詞\s*[:：]\s*/i, "").trim();
    if (!raw) return [];
    return raw
        .split(/[，,、]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

function foldNewsInsideUl(ulHtml: string) {
    let body = ulHtml;
    const lis = body.match(/<li[\s\S]*?<\/li>/g) || [];
    if (lis.length === 0) return body;

    const idx = lis.findIndex((li) => /代表新聞\s*[:：]?/.test(li));
    if (idx === -1) return body;

    // A) <li>代表新聞：<ul>...</ul></li>
    const nested = lis[idx].match(
        /<li[^>]*>\s*代表新聞[:：]?\s*<ul([\s\S]*?)<\/ul>\s*<\/li>/
    );
    if (nested) {
        const inner = nested[1];
        const count = (inner.match(/<li[\s\S]*?<\/li>/g) || []).length;

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

    // B) <li>代表新聞：</li> 後面連續很多 <li>
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

function removeTopicLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*主題\s*[:：][\s\S]*?<\/li>/g, "");
}

function removeCompanyLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*公司\s*[:：][\s\S]*?<\/li>/g, "");
}

/* =========================
   KEYWORD_CATS 反查：keyword -> catTitle
========================= */

function buildKeywordToCatTitleMap(): Map<string, string> {
    const mp = new Map<string, string>();
    for (const c of KEYWORD_CATS as any[]) {
        const title = String(c.title ?? c.key ?? "");
        const items: string[] = Array.isArray(c.items) ? c.items : [];
        for (const kw of items) {
            if (!kw) continue;
            mp.set(String(kw).trim(), title);
        }
    }
    return mp;
}

const KW_TO_CAT = buildKeywordToCatTitleMap();

function mapHitWordsToCatTitles(words: string[]): string[] {
    const out = new Set<string>();

    for (const w0 of words) {
        const raw = String(w0).trim();
        if (!raw) continue;

        const w = raw.replace(/^[\s\-–—]+|[\s\-–—]+$/g, "");

        // ① 先嘗試 keyword -> 類別 title
        const hit = KW_TO_CAT.get(w);
        if (hit) {
            out.add(hit);
            continue;
        }

        // ② 對不到就直接當 badge 顯示（保底）
        out.add(w);
    }

    return [...out];
}


function renderBadges(titles: string[]) {
    const shown = titles.slice(0, 5);
    const more = titles.length - shown.length;

    const badgeHtml = shown
        .map(
            (t) =>
                `
<span style="
  display:inline-block;
  padding:2px 8px;
  border:1px solid rgba(0,0,0,0.10);
  border-radius:999px;
  font-size:12px;
  line-height:18px;
  opacity:0.85;
  background:rgba(0,0,0,0.03);
  margin-right:6px;
  margin-top:6px;
  white-space:nowrap;
">${t}</span>
`.replace(/\n\s+/g, "")
        )
        .join("");

    const moreHtml =
        more > 0
            ? `
<span style="
  display:inline-block;
  padding:2px 8px;
  border:1px dashed rgba(0,0,0,0.18);
  border-radius:999px;
  font-size:12px;
  line-height:18px;
  opacity:0.7;
  background:rgba(0,0,0,0.02);
  margin-top:6px;
  white-space:nowrap;
">+${more}</span>
`.replace(/\n\s+/g, "")
            : "";

    return `<div style="margin-top:6px; display:flex; flex-wrap:wrap;">${badgeHtml}${moreHtml}</div>`;
}

/* =========================
   CompanyHeat JSON -> HTML
========================= */

function renderCompanyHeatFromJson(data: CompanyHeatJson | null) {
    if (!data || !data.rows?.length) {
        return `
<h2>公司熱度（CompanyHeat | Top 20）</h2>
<div style="opacity:0.7; font-size:13px;">找不到 CompanyHeat JSON（public/data/companyheat/${data?.slug ?? "slug"}.json）或內容為空</div>
`.replace(/\n\s+/g, "");
    }

    const topN = data.topN ?? 20;
    const shown = data.rows.slice(0, topN);
    const maxHeat = Math.max(...shown.map((r) => r.heat || 0), 1);

    const rowHtml = shown
        .map((r, i) => {
            const pct = Math.max(2, Math.round((r.heat / maxHeat) * 100));
            const t1 = (r.mainTheme || "").trim();
            const t2 = (r.subTheme || "").trim();
            const tags = [t1, t2].filter((x) => x && x !== "未分類");

            const tagsHtml = tags.length
                ? renderBadges(tags)
                : "";

            const metaBits = [
                r.appearCount != null ? `出現 ${r.appearCount}` : null,
                r.confidenceCount != null ? `高把握 ${r.confidenceCount}` : null,
            ].filter(Boolean);

            return `
<div style="display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-top:1px solid rgba(0,0,0,0.06);">
  <div style="width:28px; opacity:0.55; font-size:12px; text-align:right; padding-top:2px;">${i + 1}</div>
  <div style="flex:1; min-width:0;">
    <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;">
      <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.company}</div>
      <div style="opacity:0.75; font-size:12px;">熱度 ${Number(r.heat).toFixed(2)}</div>
    </div>

    ${tagsHtml}

    <div style="margin-top:6px; height:8px; border-radius:999px; background:rgba(0,0,0,0.06); overflow:hidden;">
      <div style="height:100%; width:${pct}%; background:rgba(0,0,0,0.35); border-radius:999px;"></div>
    </div>

    ${metaBits.length
                    ? `<div style="margin-top:6px; font-size:12px; opacity:0.75;">${metaBits.join(" ｜ ")}</div>`
                    : ""
                }
  </div>
</div>
`.replace(/\n\s+/g, "");
        })
        .join("");

    return `
<h2>公司熱度（CompanyHeat | Top ${topN}）</h2>
<div style="margin-top:10px; padding:12px 14px; border:1px solid rgba(0,0,0,0.08); border-radius:14px;">
  <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
    <div style="font-weight:900;">Top ${topN} 熱度排行</div>
    <div style="opacity:0.7; font-size:12px;">以熱度排序</div>
  </div>
  ${rowHtml}
</div>
`.replace(/\n\s+/g, "");
}

/* =========================
   Main transformer
========================= */

function transformDailyHtml(html: string, companyHeatHtml: string) {
    let out = html;

    // (1) 移除 RunLog
    out = out.replace(/<h2[^>]*>\s*抓取狀態（RunLog[\s\S]*?<\/h2>[\s\S]*$/g, "");

    // (2) 今日摘要瘦身（事件數 / 最高熱度事件 / 高把握事件數）
    out = out.replace(
        /<h2[^>]*>\s*今日摘要\s*<\/h2>[\s\S]*?(?=<h2|<h3)/g,
        (block) => {
            const m = block.match(/<ul[\s\S]*?<\/ul>/);
            if (!m) return block;

            const ul = m[0];
            const liAll = ul.match(/<li[\s\S]*?<\/li>/g) || [];

            const keep = liAll.filter(
                (li) => /事件數\s*[:：]/.test(li) || /最高熱度事件\s*[:：]/.test(li)
            );

            const placeholder = `<li>高把握事件數：__HIGH_CONF__</li>`;
            const newUl = `<ul>${keep.join("")}${placeholder}</ul>`;
            return `<h2>今日摘要</h2>${newUl}`;
        }
    );

    // (3) 高信心 → 把握度
    out = out.replace(/高信心\s*[:：]\s*(\d+)/g, (_, n) => {
        const c = Number(n);
        return `把握度：${confidenceLabel(Number.isFinite(c) ? c : undefined)}`;
    });
    out = out.replace(/高信心/g, "把握度");

    // (3.5) 精簡最高熱度事件
    out = out.replace(
        /<li[^>]*>\s*最高熱度事件\s*[:：]\s*([\s\S]*?)<\/li>/g,
        (_whole, inner) => {
            const text = String(inner).replace(/\s+/g, " ").trim().replace(/｜/g, "|");
            const parts = text
                .split("|")
                .map((s: string) => s.trim())
                .filter(Boolean);

            if (parts.length >= 3) {
                const eventType = parts[0];
                const company = parts[parts.length - 2];
                const heatPart = parts[parts.length - 1];
                return `<li>最高熱度事件：${eventType} ｜ ${company} ｜ ${heatPart}</li>`;
            }
            return `<li>最高熱度事件：${text}</li>`;
        }
    );

    // ====== 事件排行（EventRadarPlus）→ 公司卡 + 題材 badges ======
    const sectionMatch = out.match(
        /<h2[^>]*>\s*事件排行（EventRadarPlus）\s*<\/h2>[\s\S]*?(?=<h2|$)/
    );

    if (sectionMatch) {
        const sectionHtml = sectionMatch[0];

        const eventRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(<ul[\s\S]*?<\/ul>)/g;
        const events: EventItem[] = [];
        let m: RegExpExecArray | null;

        while ((m = eventRegex.exec(sectionHtml)) !== null) {
            const titleRaw = stripTags(m[1]);
            let ulHtml = m[2];

            const rawCompany = extractCompany(m[2]);
            const rawHitWords = extractHitWords(m[2]);

            ulHtml = removeTopicLi(ulHtml);
            ulHtml = removeCompanyLi(ulHtml);
            ulHtml = foldNewsInsideUl(ulHtml);

            const heat = extractHeat(ulHtml);

            events.push({
                title: titleRaw,
                ulHtml,
                company: rawCompany,
                heat,
                hitWords: rawHitWords,
            });
        }

        const order: string[] = [];
        const byCompany = new Map<string, EventItem[]>();
        const companyCats = new Map<string, Set<string>>();

        for (const e of events) {
            const key = e.company || "（未辨識公司）";
            if (!byCompany.has(key)) {
                byCompany.set(key, []);
                order.push(key);
            }
            byCompany.get(key)!.push(e);

            const catTitles = mapHitWordsToCatTitles(e.hitWords || []);
            if (!companyCats.has(key)) companyCats.set(key, new Set<string>());
            for (const t of catTitles) companyCats.get(key)!.add(t);
        }

        const sortedCompanies = [...order].sort((a, b) => {
            const aMax = Math.max(...(byCompany.get(a) || []).map((x) => x.heat ?? 0));
            const bMax = Math.max(...(byCompany.get(b) || []).map((x) => x.heat ?? 0));
            return bMax - aMax;
        });

        const rebuilt = [
            `<h2>事件排行（EventRadarPlus）</h2>`,
            ...sortedCompanies.map((company) => {
                const list = byCompany.get(company)!;
                const maxHeat = Math.max(...list.map((x) => x.heat ?? 0));
                const totalEvents = list.length;

                const cats = [...(companyCats.get(company) || new Set<string>())];
                const catsFinal = cats.length ? cats : ["未分類"];
                const badgesHtml = renderBadges(catsFinal);

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
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:18px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${company}
                </div>
                ${badgesHtml}
              </div>
              <div style="opacity:0.75; font-size:13px; white-space:nowrap;">
                事件數 ${totalEvents} ・ 最高熱度 ${maxHeat.toFixed(2)}
              </div>
            </div>
            ${itemsHtml}
          </div>
        `.replace(/\n\s+/g, "");
            }),
        ].join("");

        out = out.replace(sectionHtml, rebuilt);
    }

    // ====== CompanyHeat：不 parse、直接整段移除（避免噴管線）=====
    // 把「公司熱度（CompanyHeat...）」那段文字整段砍掉
    out = out.replace(
        /(?:<h2[^>]*>\s*)?公司熱度[\s\S]*?\(CompanyHeat[\s\S]*?\)[\s\S]*?(?=<h2|<\/article>|<footer|$)/g,
        ""
    );

    // 回填高把握事件數
    const highCount = (out.match(/把握度：高把握/g) || []).length;
    out = out.replace(/__HIGH_CONF__/g, String(highCount));

    // 最後插入 JSON 渲染的 CompanyHeat
    out = `${out}\n${companyHeatHtml}`;

    return out;
}

/* =========================
   Server: read JSON
========================= */

async function readCompanyHeatJson(slug: string): Promise<CompanyHeatJson | null> {
    try {
        const p = path.join(process.cwd(), "public", "data", "companyheat", `${slug}.json`);
        const s = await fs.readFile(p, "utf-8");
        return JSON.parse(s) as CompanyHeatJson;
    } catch {
        return null;
    }
}

/* =========================
   Page
========================= */

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

    const heatJson = await readCompanyHeatJson(slug);
    const companyHeatHtml = renderCompanyHeatFromJson(heatJson);

    const cleanedHtml = transformDailyHtml(contentHtml, companyHeatHtml);

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

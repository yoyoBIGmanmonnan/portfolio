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
    const rawMatches = ulHtml.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*[（(]([^｜|]*?)[｜|]([^）)]*?)[）)]/g);
    if (!rawMatches || rawMatches.length === 0) return "";
    
    const uniqueNews = [];
    const seen = new Set<string>();
    
    for (const item of rawMatches) {
        // extract title and source to deduplicate
        const aMatch = item.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const title = aMatch ? stripTags(aMatch[2]).trim() : "";
        
        const srcMatch = item.match(/[（(]([^｜|]*?)[｜|]/);
        const source = srcMatch ? srcMatch[1].trim() : "";
        
        const key = title + "::" + source;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueNews.push(item);
        }
    }
    
    if (uniqueNews.length === 0) return "";
    
    const styledNews = uniqueNews.map(item => {
        return `<div style="font-size:13px; margin-bottom:5px; margin-left:2px; display:flex; align-items:flex-start;">
          <span style="opacity:0.4; margin-right:6px; margin-top:2px;">▸</span>
          <span style="flex:1; min-width:0; line-height:1.4;">
            <span style="display:block; word-break:break-word;">${item}</span>
          </span>
        </div>`;
    }).join("");

    return `<div style="margin-top:8px;">${styledNews}</div>`;
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
  padding:2px 10px;
  border:1px solid rgba(59, 130, 246, 0.5);
  border-radius:6px;
  font-size:11px;
  font-weight:700;
  line-height:18px;
  color:#93C5FD;
  background:rgba(59, 130, 246, 0.1);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
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
  border:1px dashed rgba(255,255,255,0.3);
  color:#cbd5e1;
  border-radius:999px;
  font-size:12px;
  line-height:18px;
  background:rgba(255,255,255,0.05);
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
<div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-top:1px solid rgba(255,255,255,0.06);">
  <div style="width:28px; color:#64748B; font-size:12px; text-align:right; padding-top:2px; font-weight:700;">${i + 1}</div>
  <div style="flex:1; min-width:0;">
    <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;">
      <div style="font-weight:900; color:#F8FAFC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:16px;">${r.company}</div>
      <div style="color:#60A5FA; font-weight:700; font-size:12px;">熱度 ${Number(r.heat).toFixed(2)}</div>
    </div>

    ${tagsHtml}

    <div style="margin-top:8px; height:6px; border-radius:999px; background:rgba(255,255,255,0.05); overflow:hidden;">
      <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #3B82F6, #8B5CF6); box-shadow:0 0 10px rgba(139,92,246,0.4); border-radius:999px;"></div>
    </div>

    ${metaBits.length
                    ? `<div style="margin-top:6px; font-size:12px; color:#94a3b8;">${metaBits.join(" <span style='opacity:0.5'>｜</span> ")}</div>`
                    : ""
                }
  </div>
</div>
`.replace(/\n\s+/g, "");
        })
        .join("");

    return `
<div style="margin-top:16px; padding:20px; border:1px solid rgba(255,255,255,0.08); border-radius:16px; background:#111827; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
  <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:12px;">
    <div style="font-weight:900; color:#F8FAFC; font-size:18px;">🔥 Top ${topN} 焦點金流</div>
    <div style="color:#64748B; font-size:12px;">以熱度排序</div>
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

    // (2) 今日摘要整段移除
    out = out.replace(
        /<h2[^>]*>\s*今日摘要\s*<\/h2>[\s\S]*?(?=<h2|<h3)/g,
        ""
    );

    // (3) 高信心 → 把握度
    out = out.replace(/高信心\s*[:：]\s*(\d+)/g, (_, n) => {
        const c = Number(n);
        return `把握度：${confidenceLabel(Number.isFinite(c) ? c : undefined)}`;
    });
    out = out.replace(/高信心/g, "把握度");

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
            // 移除極性、熱度、命中詞（命中詞已轉為 badges）
            ulHtml = ulHtml.replace(/<li[^>]*>\s*極性\s*[:：][\s\S]*?<\/li>/g, "");
            ulHtml = ulHtml.replace(/<li[^>]*>\s*熱度\s*[:：][\s\S]*?<\/li>/g, "");
            ulHtml = ulHtml.replace(/<li[^>]*>\s*命中詞\s*[:：][\s\S]*?<\/li>/g, "");
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
              <div style="margin-top:16px; padding:12px 16px; border-left:2px solid #3B82F6; background:rgba(59,130,246,0.03); border-radius:4px;">
                <div style="font-weight:800; color:#F8FAFC; font-size:15px; margin-bottom:6px;">${subTitle}</div>
                ${ev.ulHtml}
              </div>
            `.replace(/\n\s+/g, "");
                    })
                    .join("");

                return `
          <div style="margin-top:20px; padding:20px; border:1px solid rgba(99,102,241,0.3); border-radius:16px; background:#111827; box-shadow:0 0 20px rgba(99,102,241,0.05), inset 0 0 20px rgba(99,102,241,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div style="min-width:0;">
                <div style="font-size:20px; font-weight:900; color:#F8FAFC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${company}
                </div>
                ${badgesHtml}
              </div>
              <div style="color:#64748B; font-size:13px; white-space:nowrap; text-align:right;">
                <div>事件數 <span style="color:#F8FAFC; font-weight:700;">${totalEvents}</span></div>
                <div style="margin-top:2px;">最高熱度 <span style="color:#60A5FA; font-weight:700;">${maxHeat.toFixed(2)}</span></div>
              </div>
            </div>
            <div style="margin-top:8px;">
              ${itemsHtml}
            </div>
          </div>
        `.replace(/\n\s+/g, "");
            }),
        ].join("");

        out = out.replace(sectionHtml, rebuilt);
    }

    // ====== CompanyHeat：不 parse、直接整段移除（避免噴管線）=====
    // 把「公司熱度（CompanyHeat...）」那段文字整段砍掉
    out = out.replace(
        /(?:<h2[^>]*>\s*)?公司熱度[\s\S]*?[（\(]CompanyHeat[\s\S]*?[）\)][\s\S]*?(?=<h2|<\/article>|<footer|$)/g,
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

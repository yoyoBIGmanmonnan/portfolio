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

type HeatRow = {
    company: string;
    heat: number;
    cells: string[];
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
 * 把「代表新聞」折疊進 <details>
 * 支援：
 * A) <li>代表新聞：<ul>...</ul></li>
 * B) <li>代表新聞：</li> 後面連續很多 <li>
 */
function foldNewsInsideUl(ulHtml: string) {
    const lis: string[] = ulHtml.match(/<li[\s\S]*?<\/li>/g) ?? [];
    if (!lis.length) return ulHtml;

    const idx = lis.findIndex((li) => /代表新聞\s*[:：]?/.test(li));
    if (idx === -1) return ulHtml;

    const nested = lis[idx].match(
        /<li[^>]*>\s*代表新聞[:：]?\s*<ul([\s\S]*?)<\/ul>\s*<\/li>/
    );

    // A
    if (nested) {
        const inner = nested[1]; // "<li>...</li>" + 可能帶屬性
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

    // B
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
   CompanyHeat (pretty) helpers
========================= */

function extractCellTexts(trHtml: string): string[] {
    const cells: string[] = trHtml.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/g) ?? [];
    return cells.map((c) => stripTags(c).replace(/\s+/g, " ").trim());
}

function parseCompanyHeatFromTable(sectionHtml: string): HeatRow[] | null {
    const table = sectionHtml.match(/<table[\s\S]*?<\/table>/)?.[0];
    if (!table) return null;

    const thead = table.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? null;
    const tbody = table.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? null;

    // headers
    let headers: string[] = [];
    if (thead) {
        const tr = thead.match(/<tr[\s\S]*?<\/tr>/)?.[0];
        if (tr) headers = extractCellTexts(tr);
    } else {
        const firstTr = table.match(/<tr[\s\S]*?<\/tr>/)?.[0];
        if (firstTr) headers = extractCellTexts(firstTr);
    }

    // rows
    const trList: string[] = (tbody ?? table).match(/<tr[\s\S]*?<\/tr>/g) ?? [];
    if (!trList.length) return null;

    // 若沒有 thead，用第一列當 header，資料從第二列開始
    const dataTrs: string[] = !thead && trList.length > 1 ? trList.slice(1) : trList;

    const idxCompany = headers.findIndex((h) => /公司|名稱|標的|個股/i.test(h));
    const idxHeat = headers.findIndex((h) => /熱度|heat/i.test(h));
    const cIdx = idxCompany >= 0 ? idxCompany : 0;
    const hIdx = idxHeat >= 0 ? idxHeat : 1;

    const rows: HeatRow[] = [];
    for (const tr of dataTrs) {
        const cells = extractCellTexts(tr);
        if (!cells.length) continue;

        const company = (cells[cIdx] || "").trim();
        const heatNum = Number(String(cells[hIdx] || "").replace(/[^\d.]/g, ""));

        if (!company) continue;
        if (!Number.isFinite(heatNum)) continue;

        rows.push({ company, heat: heatNum, cells });
    }

    return rows.length ? rows : null;
}

function parseCompanyHeatFromPipe(sectionHtml: string): HeatRow[] | null {
    const withNewlines = sectionHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<\/div>\s*<div[^>]*>/gi, "\n");

    const text = stripTags(withNewlines)
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .trim();

    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const headerIdx = lines.findIndex(
        (l) => l.includes("|") && /公司/.test(l) && /熱度/.test(l)
    );
    if (headerIdx === -1) return null;

    const sepIdx = headerIdx + 1;
    if (!lines[sepIdx] || !/---/.test(lines[sepIdx])) return null;

    const headerCells = lines[headerIdx]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

    const idxCompany = headerCells.findIndex((h) => /公司|名稱|標的|個股/i.test(h));
    const idxHeat = headerCells.findIndex((h) => /熱度|heat/i.test(h));
    const cIdx = idxCompany >= 0 ? idxCompany : 0;
    const hIdx = idxHeat >= 0 ? idxHeat : 1;

    const rows: HeatRow[] = [];
    for (let i = sepIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (!l.includes("|")) break;

        const cells = l
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);

        if (cells.length < 2) continue;

        const company = (cells[cIdx] || "").trim();
        const heatNum = Number(String(cells[hIdx] || "").replace(/[^\d.]/g, ""));

        if (!company) continue;
        if (!Number.isFinite(heatNum)) continue;

        rows.push({ company, heat: heatNum, cells });
    }

    return rows.length ? rows : null;
}

function parseCompanyHeatFromList(sectionHtml: string): HeatRow[] | null {
    const lis: string[] = sectionHtml.match(/<li[\s\S]*?<\/li>/g) ?? [];
    const rows: HeatRow[] = [];

    for (const li of lis) {
        const text = stripTags(li).replace(/\s+/g, " ").trim();
        const mC = text.match(/公司\s*[:：]\s*([^｜|]+?)(?:\s*[｜|]|$)/);
        const mH = text.match(/熱度\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/);
        if (!mC || !mH) continue;

        const company = mC[1].trim();
        const heat = Number(mH[1]);
        if (!company || !Number.isFinite(heat)) continue;

        rows.push({ company, heat, cells: [text] });
    }

    return rows.length ? rows : null;
}

function rebuildCompanyHeatSection(sectionHtml: string) {
    const rows =
        parseCompanyHeatFromTable(sectionHtml) ??
        parseCompanyHeatFromPipe(sectionHtml) ??
        parseCompanyHeatFromList(sectionHtml) ??
        [];

    if (!rows.length) return null;

    const sorted = [...rows].sort((a, b) => b.heat - a.heat);
    const topN = 20;
    const shown = sorted.slice(0, topN);
    const maxHeat = Math.max(...shown.map((r) => r.heat), 1);

    const title =
        sectionHtml.match(/<(h2|h3)[^>]*>[\s\S]*?<\/\1>/)?.[0] ??
        `<h2>公司熱度（CompanyHeat）</h2>`;

    const rowHtml = shown
        .map((r, i) => {
            const pct = Math.max(2, Math.round((r.heat / maxHeat) * 100));
            const detailText = r.cells.join(" ｜ ");

            return `
<div style="display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-top:1px solid rgba(0,0,0,0.06);">
  <div style="width:28px; opacity:0.55; font-size:12px; text-align:right; padding-top:2px;">${i + 1}</div>
  <div style="flex:1; min-width:0;">
    <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;">
      <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.company}</div>
      <div style="opacity:0.75; font-size:12px;">熱度 ${r.heat.toFixed(2)}</div>
    </div>

    <div style="margin-top:6px; height:8px; border-radius:999px; background:rgba(0,0,0,0.06); overflow:hidden;">
      <div style="height:100%; width:${pct}%; background:rgba(0,0,0,0.35); border-radius:999px;"></div>
    </div>

    <details style="margin-top:6px;">
      <summary style="cursor:pointer; opacity:0.75; font-size:12px;">查看細節</summary>
      <div style="margin-top:6px; font-size:12px; opacity:0.85; line-height:1.6;">
        ${detailText}
      </div>
    </details>
  </div>
</div>
`.replace(/\n\s+/g, "");
        })
        .join("");

    return `
${title}
<div style="margin-top:10px; padding:12px 14px; border:1px solid rgba(0,0,0,0.08); border-radius:14px;">
  <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
    <div style="font-weight:900;">Top ${topN} 熱度排行</div>
    <div style="opacity:0.7; font-size:12px;">以熱度排序（可展開看細節）</div>
  </div>
  ${rowHtml}
</div>
`.replace(/\n\s+/g, "");
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

        const idxNews = b.findIndex(
            (l) => /^代表新聞\s*[:：]?\s*$/.test(l) || /^代表新聞\s*[:：]/.test(l)
        );
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

    // 3) EventRadarPlus：公司卡（先試 h3+ul；沒有就純文字 fallback）
    const eventSectionMatch = out.match(
        /<h2[^>]*>[\s\S]*?事件排行[\s\S]*?EventRadarPlus[\s\S]*?<\/h2>[\s\S]*?(?=<h2|$)/
    );

    if (eventSectionMatch) {
        const sectionHtml = eventSectionMatch[0];
        const events: EventItem[] = [];

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

    // 4) CompanyHeat：漂亮版 Top 熱度排行
    const heatSectionMatch = out.match(
        /<(h2|h3)[^>]*>\s*(?:公司熱度(?:排行)?（CompanyHeat[^）]*）|公司熱度(?:排行)?|CompanyHeat)\s*<\/\1>[\s\S]*?(?=<h2|<h3|$)/
    );
    if (heatSectionMatch) {
        const heatSectionHtml = heatSectionMatch[0];
        const rebuiltHeat = rebuildCompanyHeatSection(heatSectionHtml);
        if (rebuiltHeat) out = out.replace(heatSectionHtml, rebuiltHeat);
    }

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

import Link from "next/link";

<div className="mt-10 rounded-2xl border bg-neutral-50 p-5">
    <div className="flex items-center justify-between gap-4">
        <div>
            <h2 className="text-base font-semibold">🧠 雷達掃描範圍（Keywords）</h2>
            <p className="mt-1 text-sm text-neutral-600">
                本頁事件由 EventRadar 關鍵字系統掃描而得。完整關鍵字分類可公開檢視。
            </p>
        </div>

        <Link
            href="/methodology/keywords"
            className="shrink-0 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50"
        >
            查看完整關鍵字 →
        </Link>
    </div>
</div>

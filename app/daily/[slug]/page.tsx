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
    title: string; // 1) 客戶+ / 2) 規格+ ...
    ulHtml: string; // <ul>...</ul>
    company?: string;
    heat?: number;
};

type HeatRow = {
    company: string;
    heat: number;
    cells: string[]; // 保留原表格所有欄位（純文字）
};

/* =========================
   Utils
========================= */

function stripTags(s: string) {
    return s.replace(/<[^>]+>/g, "").trim();
}

// 公司要從「原始 ul」抽，不要抽清理後的（你會把公司 li 刪掉）
function extractCompany(ulHtml: string) {
    const m = ulHtml.match(/<li[^>]*>\s*公司\s*[:：]\s*([^<]+?)\s*<\/li>/);
    return m ? m[1].trim() : undefined;
}

function extractHeat(ulHtml: string) {
    const m = ulHtml.match(/熱度\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : undefined;
}

function removeTopicLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*主題\s*[:：][\s\S]*?<\/li>/g, "");
}

// 公司卡內的子事件不需要「公司：xxx」這行，避免重複
function removeCompanyLi(ulHtml: string) {
    return ulHtml.replace(/<li[^>]*>\s*公司\s*[:：][\s\S]*?<\/li>/g, "");
}

/**
 * 把「代表新聞」折疊進 <details>
 * 支援兩種：
 * A) <li>代表新聞：<ul>...</ul></li>
 * B) <li>代表新聞：</li> 後面連續很多 <li> 都是新聞來源
 */
function foldNewsInsideUl(ulHtml: string) {
    const lis: string[] = ulHtml.match(/<li[\s\S]*?<\/li>/g) ?? [];
    if (!lis.length) return ulHtml;

    const idx = lis.findIndex((li) => /代表新聞\s*[:：]?/.test(li));
    if (idx === -1) return ulHtml;

    // A
    const nested = lis[idx].match(
        /<li[^>]*>\s*代表新聞[:：]?\s*<ul([\s\S]*?)<\/ul>\s*<\/li>/
    );

    if (nested) {
        const innerAttrsAndLis = nested[1]; // "<li>..." 以及可能的屬性
        const count = (innerAttrsAndLis.match(/<li[\s\S]*?<\/li>/g) ?? []).length;

        const folded = `
<li>
  <details>
    <summary style="cursor:pointer; opacity:0.8;">查看來源（${count}）</summary>
    <ul${innerAttrsAndLis}</ul>
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
   CompanyHeat helpers
========================= */

function extractCellTexts(trHtml: string) {
    const cells: string[] = trHtml.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/g) ?? [];
    return cells.map((c) => stripTags(c).replace(/\s+/g, " ").trim());
}

function parseCompanyHeatFromTable(sectionHtml: string): HeatRow[] | null {
    const tableMatch = sectionHtml.match(/<table[\s\S]*?<\/table>/);
    if (!tableMatch) return null;

    const table = tableMatch[0];

    const theadMatch = table.match(/<thead[\s\S]*?<\/thead>/);
    let headers: string[] = [];

    if (theadMatch) {
        const tr = theadMatch[0].match(/<tr[\s\S]*?<\/tr>/);
        if (tr) headers = extractCellTexts(tr[0]);
    } else {
        const firstTr = table.match(/<tr[\s\S]*?<\/tr>/);
        if (firstTr) headers = extractCellTexts(firstTr[0]);
    }

    const tbodyMatch = table.match(/<tbody[\s\S]*?<\/tbody>/);

    // ✅ 這行就是你 Vercel 報錯的根因：match() 推成 RegExpMatchArray
    // ✅ 改成明確 string[]，就不會有 string[] vs RegExpMatchArray 問題
    const trList: string[] =
        ((tbodyMatch ? tbodyMatch[0] : table).match(/<tr[\s\S]*?<\/tr>/g) ?? []);

    let dataTrs: string[] = trList;
    if (!theadMatch && trList.length > 1) dataTrs = trList.slice(1);

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
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n")
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
   EventRadarPlus (pure text) parser
========================= */

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 當 EventRadarPlus 被渲染成「純文字」時，用 1) 切塊解析出事件
 */
function parseEventsFromPureText(sectionHtml: string): EventItem[] {
    const textBlock = sectionHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<\/div>\s*<div[^>]*>/gi, "\n");

    const text = stripTags(textBlock)
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
        } else {
            if (cur.length) cur.push(l);
        }
    }
    if (cur.length) blocks.push(cur);

    const events: EventItem[] = [];

    for (const b of blocks) {
        const first = b[0] || "";
        const titleRaw = first.replace(/^\d+\)\s*/, "").trim();

        const joined = b.join("\n");
        const mC = joined.match(/公司\s*[:：]\s*([^\n｜|]+)\s*/);
        const company = mC ? mC[1].trim() : undefined;

        const mH = joined.match(/熱度\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/);
        const heat = mH ? Number(mH[1]) : undefined;

        // 代表新聞折疊：找到 "代表新聞" 後面的行當來源
        const idxNews = b.findIndex(
            (l) => /^代表新聞\s*[:：]?\s*$/.test(l) || /^代表新聞\s*[:：]/.test(l)
        );

        let pre = b;
        let news: string[] = [];

        if (idxNews !== -1) {
            pre = b.slice(0, idxNews + 1);
            news = b.slice(idxNews + 1);
        }

        const liMain = pre.map((l) => `<li>${escapeHtml(l)}</li>`).join("");
        const liNews = news.map((l) => `<li>${escapeHtml(l)}</li>`).join("");

        const folded =
            news.length > 0
                ? `<li><details><summary style="cursor:pointer; opacity:0.8;">查看來源（${news.length}）</summary><ul>${liNews}</ul></details></li>`
                : "";

        let ulHtml = `<ul>${liMain}${folded}</ul>`;

        // 跟卡片版一致：移除主題、移除公司行（公司會在卡片標題顯示）
        ulHtml = removeTopicLi(ulHtml);
        ulHtml = removeCompanyLi(ulHtml);

        events.push({ title: titleRaw, ulHtml, company, heat });
    }

    return events;
}

/* =========================
   Main transformer
========================= */

function transformDailyHtml(html: string) {
    let out = html;

    // (1) 移除 RunLog（抓取狀態之後全部砍掉）
    out = out.replace(/<h2[^>]*>\s*抓取狀態（RunLog[\s\S]*?<\/h2>[\s\S]*$/g, "");

    // (2) 今日摘要瘦身
    out = out.replace(
        /<h2[^>]*>\s*今日摘要\s*<\/h2>[\s\S]*?(?=<h2|<h3)/g,
        (block) => {
            const m = block.match(/<ul[\s\S]*?<\/ul>/);
            if (!m) return block;

            const ul = m[0];
            const liAll: string[] = ul.match(/<li[\s\S]*?<\/li>/g) ?? [];

            const keep = liAll.filter(
                (li) => /事件數\s*[:：]/.test(li) || /最高熱度事件\s*[:：]/.test(li)
            );

            const placeholder = `<li>高把握事件數：__HIGH_CONF__</li>`;
            const newUl = `<ul>${keep.join("")}${placeholder}</ul>`;
            return `<h2>今日摘要</h2>${newUl}`;
        }
    );

    // (3) 高信心 → 把握度（高/中/低）
    out = out.replace(/高信心\s*[:：]\s*(\d+)/g, (_, n) => {
        const c = Number(n);
        return `把握度：${confidenceLabel(Number.isFinite(c) ? c : undefined)}`;
    });
    out = out.replace(/高信心/g, "把握度");

    // (3.5) 精簡「最高熱度事件」
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

    // ====== 事件排行（EventRadarPlus）聚合成公司卡 ======
    // ✅ 超寬鬆：只要 h2 裡同時出現「事件排行」與「EventRadarPlus」就抓
    const sectionMatch = out.match(
        /<h2[^>]*>[\s\S]*?事件排行[\s\S]*?EventRadarPlus[\s\S]*?<\/h2>[\s\S]*?(?=<h2|$)/
    );

    if (sectionMatch) {
        const sectionHtml = sectionMatch[0];

        // 先試 h3 + ul
        const eventRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(<ul[\s\S]*?<\/ul>)/g;
        const events: EventItem[] = [];
        let m: RegExpExecArray | null;

        while ((m = eventRegex.exec(sectionHtml)) !== null) {
            const titleRaw = stripTags(m[1]);

            const rawUl = m[2]; // 原始 ul（抓公司用）
            const rawCompany = extractCompany(rawUl);

            // 卡片內 ul：移除主題、移除公司行、折疊來源
            let ulHtml = rawUl;
            ulHtml = removeTopicLi(ulHtml);
            ulHtml = removeCompanyLi(ulHtml);
            ulHtml = foldNewsInsideUl(ulHtml);

            const heat = extractHeat(rawUl); // 熱度從原始抓比較穩

            events.push({
                title: titleRaw,
                ulHtml,
                company: rawCompany,
                heat,
            });
        }

        // 如果抓不到（你目前狀況），就用純文字 parser
        if (events.length === 0) {
            events.push(...parseEventsFromPureText(sectionHtml));
        }

        if (events.length > 0) {
            const order: string[] = [];
            const byCompany = new Map<string, EventItem[]>();

            for (const e of events) {
                const key = e.company || "（未辨識公司）";
                if (!byCompany.has(key)) {
                    byCompany.set(key, []);
                    order.push(key);
                }
                byCompany.get(key)!.push(e);
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
    }

    // ====== CompanyHeat 排版（Top 熱度排行） ======
    const heatSectionMatch = out.match(
        /<(h2|h3)[^>]*>\s*(?:公司熱度(?:排行)?（CompanyHeat[^）]*）|公司熱度(?:排行)?|CompanyHeat)\s*<\/\1>[\s\S]*?(?=<h2|<h3|$)/
    );

    if (heatSectionMatch) {
        const heatSectionHtml = heatSectionMatch[0];
        const rebuiltHeat = rebuildCompanyHeatSection(heatSectionHtml);
        if (rebuiltHeat) out = out.replace(heatSectionHtml, rebuiltHeat);
    }

    // (6) 回填「高把握事件數」
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

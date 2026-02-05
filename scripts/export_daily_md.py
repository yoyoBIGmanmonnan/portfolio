# scripts/export_daily_md.py
# -*- coding: utf-8 -*-
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd

TZ_TW = ZoneInfo("Asia/Taipei")
EXCLUDE_COMPANY_FOR_RANK = ["時報", "三星", "中華", "力士", "全國"]
CONF_RANK = {"高": 3, "中": 2, "低": 1}


def _safe(s):
    if s is None:
        return ""
    return str(s).strip()


def _pick_representative_news(df_news: pd.DataFrame, event_name: str, company: str, topn: int = 6) -> pd.DataFrame:
    if df_news is None or df_news.empty:
        return pd.DataFrame()

    df = df_news.copy()

    for c in ["提及公司", "事件類型", "信心等級", "監控分數", "主題分數", "發布時間", "標題", "來源", "連結"]:
        if c not in df.columns:
            df[c] = ""

    df["__company_hit"] = df["提及公司"].fillna("").astype(str).apply(
        lambda s: company in [x.strip() for x in s.split(",")] if s else False
    )
    df["__event_hit"] = df["事件類型"].fillna("").astype(str).apply(
        lambda s: event_name in [x.strip() for x in s.split(",")] if s else False
    )

    df = df[df["__company_hit"] & df["__event_hit"]].copy()
    if df.empty:
        return df

    df["__conf"] = df["信心等級"].fillna("").map(CONF_RANK).fillna(0).astype(int)
    df["__mon"] = pd.to_numeric(df["監控分數"], errors="coerce").fillna(0.0)
    df["__theme"] = pd.to_numeric(df["主題分數"], errors="coerce").fillna(0.0)

    try:
        df["__dt"] = pd.to_datetime(df["發布時間"], errors="coerce")
    except Exception:
        df["__dt"] = pd.NaT

    df.sort_values(by=["__conf", "__mon", "__theme", "__dt"], ascending=[False, False, False, False], inplace=True)
    df = df.drop_duplicates(subset=["連結"], keep="first")
    return df.head(topn)


def export_daily_markdown(excel_path: str, out_md_path: str | None = None, top_events: int = 20):
    if not os.path.isfile(excel_path):
        raise FileNotFoundError(f"Excel not found: {excel_path}")

    xls = pd.ExcelFile(excel_path)
    need_sheets = ["News", "EventRadarPlus", "CompanyHeat", "RunLog"]
    for s in need_sheets:
        if s not in xls.sheet_names:
            raise ValueError(f"Missing sheet '{s}' in {excel_path}. Found: {xls.sheet_names}")

    df_news = pd.read_excel(xls, "News")
    df_evt = pd.read_excel(xls, "EventRadarPlus")
    df_heat = pd.read_excel(xls, "CompanyHeat")
    df_run = pd.read_excel(xls, "RunLog")

    today = datetime.now(TZ_TW).strftime("%Y-%m-%d")
    if out_md_path is None:
        out_md_path = os.path.join("content", "daily", f"{today}.md")

    os.makedirs(os.path.dirname(out_md_path), exist_ok=True)

    total_events = 0 if df_evt is None or df_evt.empty else int(len(df_evt))
    new_events = 0 if df_evt is None or df_evt.empty else int((df_evt.get("NEW", "") == "NEW").sum())
    trending_events = 0
    if df_evt is not None and not df_evt.empty and "熱度變化" in df_evt.columns:
        trending_events = int((pd.to_numeric(df_evt["熱度變化"], errors="coerce").fillna(0) > 0).sum())

    top_line = ""
    if df_evt is not None and not df_evt.empty:
        r0 = df_evt.iloc[0].to_dict()
        top_line = f'{_safe(r0.get("事件"))}｜{_safe(r0.get("主題"))}｜{_safe(r0.get("公司"))}｜熱度 {_safe(r0.get("今日熱度"))}（Δ{_safe(r0.get("熱度變化"))}）'

    runinfo = {}
    if df_run is not None and not df_run.empty:
        runinfo = df_run.iloc[-1].to_dict()

    evt_top = pd.DataFrame() if df_evt is None or df_evt.empty else df_evt.head(top_events).copy()
    heat_top = pd.DataFrame() if df_heat is None or df_heat.empty else df_heat.head(20).copy()

    lines = []
    lines.append("---")
    lines.append(f'title: "台股事件雷達｜{today}"')
    lines.append(f'date: "{today}"')
    lines.append('type: "daily-radar"')
    lines.append("range_days: 3")
    lines.append(f"exclude_companies: {EXCLUDE_COMPANY_FOR_RANK}")
    lines.append("---\n")

    lines.append("## 今日摘要")
    lines.append(f"- 事件數：{total_events}")
    lines.append(f"- 新增事件（NEW）：{new_events}")
    lines.append(f"- 熱度上升事件（Δ>0）：{trending_events}")
    if top_line:
        lines.append(f"- 最高熱度事件：{top_line}")
    lines.append("")

    lines.append("## 事件排行（EventRadarPlus）")
    if evt_top.empty:
        lines.append("> 今日沒有事件排行資料（EventRadarPlus 為空）。\n")
    else:
        for i, row in enumerate(evt_top.to_dict(orient="records"), start=1):
            event_name = _safe(row.get("事件"))
            polarity = _safe(row.get("極性"))
            company = _safe(row.get("公司"))
            theme = _safe(row.get("主題"))
            heat = _safe(row.get("今日熱度"))
            delta = _safe(row.get("熱度變化"))
            n_articles = _safe(row.get("篇數"))
            n_high = _safe(row.get("高信心篇數"))
            tokens = _safe(row.get("命中詞"))
            tag_new = " **NEW**" if _safe(row.get("NEW")) == "NEW" else ""

            lines.append(f"### {i}) {event_name}{tag_new}")
            lines.append(f"- 極性：{polarity}")
            lines.append(f"- 主題：{theme}")
            lines.append(f"- 公司：{company}")
            lines.append(f"- 熱度：{heat}（Δ{delta}）｜篇數：{n_articles}｜高信心：{n_high}")
            if tokens:
                lines.append(f"- 命中詞：{tokens}")

            rep = _pick_representative_news(df_news, event_name=event_name, company=company, topn=6)
            if rep is None or rep.empty:
                lines.append("- 代表新聞：無（未在 News 中匹配到同公司+同事件）\n")
            else:
                lines.append("- 代表新聞：")
                for j, rr in enumerate(rep.to_dict(orient="records"), start=1):
                    title = _safe(rr.get("標題"))
                    url = _safe(rr.get("連結"))
                    src_name = _safe(rr.get("來源"))
                    t = _safe(rr.get("發布時間"))
                    lines.append(f"  {j}. [{title}]({url})（{src_name}｜{t}）")
                lines.append("")

    lines.append("## 公司熱度（CompanyHeat｜Top 20）")
    if heat_top.empty:
        lines.append("> 今日沒有公司熱度資料（CompanyHeat 為空）。\n")
    else:
        lines.append("| 公司 | 熱度 | 出現篇數 | 高信心篇數 | 主要主題 | 主要子題 |")
        lines.append("|---|---:|---:|---:|---|---|")
        for rr in heat_top.to_dict(orient="records"):
            lines.append(
                f'| {_safe(rr.get("公司"))} | {_safe(rr.get("熱度"))} | {_safe(rr.get("出現篇數"))} | {_safe(rr.get("高信心篇數"))} | {_safe(rr.get("主要主題"))} | {_safe(rr.get("主要子題"))} |'
            )
        lines.append("")

    lines.append("## 抓取狀態（RunLog｜最新一次）")
    if not runinfo:
        lines.append("> 今日沒有 RunLog 資料。\n")
    else:
        lines.append(f'- run_at：{_safe(runinfo.get("run_at"))}')
        lines.append(f'- cutoff_dt：{_safe(runinfo.get("cutoff_dt"))}')
        lines.append(f'- keywords：{_safe(runinfo.get("keywords"))}｜domains：{_safe(runinfo.get("domains"))}')
        lines.append(f'- candidates_grouped：{_safe(runinfo.get("candidates_grouped"))}')
        lines.append(f'- rows_fetched：{_safe(runinfo.get("rows_fetched"))}')
        lines.append(f'- fallback_rate_pct：{_safe(runinfo.get("fallback_rate_pct"))}')
        lines.append(f'- cache_path：{_safe(runinfo.get("cache_path"))}')
        lines.append("")

    with open(out_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✅ Export daily markdown: {out_md_path}")


if __name__ == "__main__":
    excel_path = os.environ.get("RADAR_XLSX", "台股三日深度監控報表_全面.xlsx")
    export_daily_markdown(excel_path)

export type Note = {
    slug: string;
    title: string;
    date: string; // YYYY-MM-DD
    summary: string;
    tags: string[];

    // 研究結構（你未來會用到）
    theme?: string;
    subTheme?: string;
    weight?: number; // 0~1 或 0~100 你自己定
    body: string[];
};

export const NOTES: Note[] = [
    {
        slug: "event-continuity",
        title: "事件連續性：題材如何開始自我增強",
        date: "2026-02-04",
        summary: "把同主題新聞拆成來源擴散、公司擴散與時間密度，建立可量化指標。",
        tags: ["EventRadar", "News", "Momentum"],
        theme: "事件雷達",
        subTheme: "連續性",
        weight: 0.8,
        body: [
            "研究動機：近期同主題新聞在不同來源反覆出現，開始形成時間密度。",
            "事件定義：同一技術瓶頸被多家媒體、不同公司重複提及。",
            "重要性判斷：非單一公司利多，而是產業層級的結構性訊號。",
            "市場共識：多數解讀仍停留在短期需求或單一公司受惠。",
            "觀察指標：後續是否出現公司擴散、法人報告跟進、價格反應。",
        ],
    },
    {
        slug: "bbu-hvdc",
        title: "BBU × HVDC：資料中心電力需求推導",
        date: "2026-02-01",
        summary: "從機櫃功耗與備援等級拆解電力架構：瓶頸、ASP、誰有定價權。",
        tags: ["Power", "DataCenter", "SupplyChain"],
        theme: "AI 硬體供應鏈",
        subTheme: "Power",
        weight: 0.75,
        body: [
            "核心想法：功耗上升時，系統會先在瓶頸段升級，該段通常也是 ASP 提升段。",
            "拆解方式：機櫃功耗 → 備援等級 → 電力轉換層級，逐層找出最吃材料與良率的環節。",
            "觀察重點：誰能提供整套方案、交期最緊、良率最難，就是定價權所在。",
        ],
    },
];

export function getAllNotes() {
    // 預設依日期新到舊
    return [...NOTES].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getNoteBySlug(slug: string) {
    return NOTES.find((n) => n.slug === slug);
}

// app/methodology/keywords/page.tsx
import { buildKeywordHits } from "@/lib/keywords/hits";
import { KEYWORDS_CHANGELOG, KEYWORDS_VERSION } from "@/lib/keywords/changelog";
import KeywordsClient from "./KeywordsClient";

export type KeywordCat = {
    key: string;
    title: string;
    desc?: string;
    items: string[];
};

const KEYWORD_CATS: KeywordCat[] = [
    {
        key: "packaging",
        title: "先進製程 / 封裝",
        desc: "先進封裝、CoWoS、SoIC、Chiplet 等。",
        items: [
            "2奈米", "3DIC", "先進製程封裝",
            "CoWoS", "CoWoS-L", "CoWoS-S", "CoWoS-R",
            "SoIC", "FOPLP", "CoWoP",
            "Chiplet", "小晶片",
        ],
    },
    {
        key: "ai-platform",
        title: "AI 算力 / 平台",
        desc: "GPU/AI 伺服器/資料中心平台與相關關鍵詞。",
        items: ["H200", "B200", "GB200", "GPU", "AI伺服器", "資料中心", "DPU", "VR200"],
    },
    {
        key: "interconnect",
        title: "高速互連 / 光",
        desc: "CPO、800G/1.6T、光模組、矽光子、光引擎。",
        items: [
            "800G", "1.6T", "CPO",
            "光收發", "光模組", "交換器",
            "AEC", "PCIe",
            "InP", "磷化銦",
            "矽光子", "silicon photonics",
        ],
    },
    {
        key: "power-dc",
        title: "電力 / 電網 / 基建",
        desc: "資料中心供電、HVDC、UPS、BBU、電網與儲能。",
        items: [
            "HVDC", "UPS", "BBU",
            "Power shelf", "機櫃電源",
            "PDU", "變壓器",
            "電網", "儲能", "核電",
        ],
    },
    {
        key: "fab-facility",
        title: "Fab / 廠務工程",
        desc: "無塵室、特用氣體、化學品、超純水與機電整合。",
        items: [
            "無塵室", "潔淨室", "廠務工程", "機電整合",
            "氣體供應系統", "一次配", "二次配", "特用氣體",
            "化學品供應系統", "水循環系統", "超純水",
        ],
    },
    {
        key: "memory",
        title: "記憶體",
        desc: "DRAM/NAND/HBM/TSV/堆疊與 AI 記憶體相關詞。",
        items: [
            "TLC NAND", "MLC NAND", "記憶體", "DRAM", "NAND",
            "HBM", "HBM2", "HBM2E", "HBM3", "HBM3E",
            "高頻寬記憶體", "AI記憶體", "伺服器記憶體", "資料中心記憶體",
            "NAND Flash", "3D NAND",
            "QLC", "TLC", "MLC", "SLC",
            "堆疊", "Die Stacking", "TSV", "封裝記憶體",
        ],
    },
    {
        key: "satellite-ntn",
        title: "衛星 / NTN",
        desc: "LEO/NTN/直連手機/星座/頻段/地面段/應用/製造發射。",
        items: [
            "低軌衛星", "低軌", "衛星", "Starlink", "星鏈", "SpaceX", "Kuiper", "推進系統", "火箭發射", "Launch", "衛星發射", "發射服務",
        ],
    },
    {
        key: "diffusion-materials",
        title: "擴散型（下游 / 材料）",
        desc: "被動元件與銀材料等擴散型供應鏈。",
        items: ["被動元件", "電阻", "電容", "MLCC", "電感", "銀漿", "銀粉", "導電銀", "銀合金", "銀基材料"],
    },
    {
        key: "substrate",
        title: "載板 / 封裝基板",
        desc: "ABF/FC-BGA/Build-up/mSAP 等高階載板與基板關鍵詞。",
        items: [
            "ABF", "IC 載板", "封裝基板", "FC-BGA", "Substrate",
            "ABF 載板", "BT 載板", "高階載板", "先進載板",
            "mSAP", "SAP", "Any-layer", "Build-up", "Coreless", "高層數載板",
        ],
    },
    {
        key: "panel",
        title: "面板",
        desc: "面板產業與價格報價相關。",
        items: ["面板", "面板產業", "面板價格", "面板報價"],
    },
    {
        key: "pmic-powersemi",
        title: "PMIC / 功率半導體",
        desc: "電源管理IC與功率元件（SiC/GaN/IGBT/MOSFET 等）。",
        items: [
            "PMIC", "電源管理IC", "Power IC", "電源IC",
            "功率半導體", "Power Semiconductor",
            "MOSFET", "SiC", "碳化矽", "GaN", "氮化鎵",
            "IGBT",
        ],
    },
    {
        key: "probe-test",
        title: "探針卡 / 測試介面",
        desc: "Probe Card、ATE、晶圓測試、Load Board、Socket 等。",
        items: [
            "探針卡", "Probe Card", "probe card",
            "測試介面", "Test Interface", "ATE",
            "晶圓測試", "Wafer Sort", "CP測試", "Final Test",
            "測試治具", "Load Board", "Socket",
        ],
    },
];

export default async function KeywordsPage() {
    // ✅ Server 端掃描 content/daily/*.md(x) 並算命中
    const hits = await buildKeywordHits();

    return (
        <KeywordsClient
            cats={KEYWORD_CATS}
            hits={hits}
            version={KEYWORDS_VERSION}
            changelog={KEYWORDS_CHANGELOG}
        />
    );
}

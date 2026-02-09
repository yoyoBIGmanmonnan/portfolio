// lib/keywords/catalog.ts
export type KeywordCat = {
    key: string;
    title: string;
    desc?: string;
    items: string[];
};

export const KEYWORD_CATS: KeywordCat[] = [
    {
        key: "packaging",
        title: "先進製程 / 封裝",
        desc: "先進封裝、HBM、Chiplet、CoWoS 等。",
        items: ["2奈米", "3DIC", "先進製程封裝", "CoWoS", "CoWoS-L", "CoWoS-S",
            "CoWoS-R", "SoIC", "FOPLP", "CoWoP", "Chiplet", "小晶片",],
    },
    {
        key: "interconnect",
        title: "高速互連 / 光",
        desc: "CPO、光通訊、800G/1.6T、光模組。",
        items: ["800G", "1.6T", "CPO", "光收發", "光模組", "交換器",
            "AEC", "PCIe", "InP", "磷化銦", "矽光子"],
    },
    {
        key: "power-dc",
        title: "電力 / 資料中心",
        desc: "HVDC、BBU、UPS、機櫃電源與配電。",
        items: ["HVDC", "UPS", "BBU", "Power shelf", "機櫃電源", "PDU",
            "整流器", "變壓器", "變電站", "電網", "儲能", "核電",],
    },
];

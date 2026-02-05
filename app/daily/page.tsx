import Link from "next/link";
import { getDailyList } from "@/lib/daily";

export default function DailyIndexPage() {
    const items = getDailyList();

    return (
        <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Daily Radar</h1>
            <p style={{ opacity: 0.7, marginTop: 8 }}>讀取 content/daily/*.md</p>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                {items.map((it) => (
                    <Link
                        key={it.slug}
                        href={`/daily/${it.slug}`}
                        style={{
                            display: "block",
                            padding: 16,
                            border: "1px solid #ddd",
                            borderRadius: 12,
                            textDecoration: "none",
                        }}
                    >
                        <div style={{ fontWeight: 700 }}>{it.title}</div>
                        <div style={{ opacity: 0.7, marginTop: 6 }}>{it.date}</div>
                    </Link>
                ))}
            </div>
        </main>
    );
}

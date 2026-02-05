import { getDailyHtml, getDailySlugs } from "@/lib/daily";

export async function generateStaticParams() {
    return getDailySlugs().map((slug) => ({ slug }));
}

// ✅ Next.js 16.1：params 是 Promise，要 await
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

    return (
        <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
            <a href="/daily" style={{ opacity: 0.7 }}>
                ← Back
            </a>

            <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 12 }}>
                {meta.title}
            </h1>
            <div style={{ opacity: 0.7, marginTop: 6 }}>{meta.date}</div>

            <article
                style={{ marginTop: 20, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
        </main>
    );
}

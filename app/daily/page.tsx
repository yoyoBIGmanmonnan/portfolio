import Link from "next/link";
import { getDailyList } from "@/lib/daily";

export default function DailyIndexPage() {
    const items = getDailyList();

    return (
        <main className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">事件雷達</h1>
                <p className="text-gray-600">每日台股事件雷達紀錄</p>
            </header>

            <div className="grid gap-3">
                {items.map((it) => (
                    <Link
                        key={it.slug}
                        href={`/daily/${it.slug}`}
                        className="block rounded-xl border p-5 hover:shadow-sm"
                    >
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                            <div className="text-lg font-semibold">{it.title}</div>
                            <div className="text-sm text-gray-500">{it.date}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}


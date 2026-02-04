"use client";

import { getAllNotes } from "@/lib/notes";

const HIGH_WEIGHT = 0.8;

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
      {text}
    </span>
  );
}

function WeightBadge({ w }: { w?: number }) {
  if (w === undefined) return null;

  const isHigh = w >= HIGH_WEIGHT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
        ${isHigh ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
    >
      W {w}
    </span>
  );
}

export default function NotesPage() {
  // 1) 取資料
  const notes = getAllNotes();

  // 2) 研究排序：weight DESC → date DESC
  const sorted = [...notes].sort((a, b) => {
    const wa = a.weight ?? -Infinity;
    const wb = b.weight ?? -Infinity;
    if (wa !== wb) return wb - wa;
    return a.date < b.date ? 1 : -1;
  });

  // 3) 高權重視圖
  const highPriority = sorted.filter((n) => (n.weight ?? 0) >= HIGH_WEIGHT);

  return (
    <main className="space-y-10">
      {/* Navigation helpers */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <button
          onClick={() => window.history.back()}
          className="hover:text-gray-900"
        >
          ← 上一頁
        </button>
        <a href="/" className="hover:text-gray-900">
          回首頁
        </a>
      </div>

      {/* 高權重事件（第一視角） */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          高權重事件（現在最重要）
        </h1>

        {highPriority.length === 0 ? (
          <p className="text-gray-600">目前沒有達到高權重門檻的事件。</p>
        ) : (
          <div className="space-y-4">
            {highPriority.map((n) => (
              <a
                key={n.slug}
                href={`/notes/${n.slug}`}
                className="block rounded-xl border border-red-200 p-5 hover:shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{n.title}</h2>
                      <WeightBadge w={n.weight} />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{n.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {n.tags.map((t) => (
                        <Tag key={t} text={t} />
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{n.date}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* 全部事件（研究排序） */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">全部事件（依重要性排序）</h2>

        <div className="space-y-4">
          {sorted.map((n) => (
            <a
              key={n.slug}
              href={`/notes/${n.slug}`}
              className="block rounded-xl border p-5 hover:shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{n.title}</h3>
                    <WeightBadge w={n.weight} />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{n.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {n.tags.map((t) => (
                      <Tag key={t} text={t} />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-500">{n.date}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

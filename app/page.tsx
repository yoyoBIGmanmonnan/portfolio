export default function Home() {
  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* Hero */}
      <section className="space-y-4">
        <span className="inline-block rounded-full border px-3 py-1 text-sm text-gray-600">
          Research · Investment · Event Radar
        </span>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          投資研究筆記
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl">
          將市場新聞、題材與公司行為，整理成可追蹤、可驗證、可重複使用的研究結構。
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="/notes"
            className="inline-block rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            前往 Notes
          </a>

          <a
            href="#recent-notes"
            className="inline-block rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            看最近筆記
          </a>
        </div>
      </section>

      {/* Recent Notes */}
      <section id="recent-notes" className="space-y-6">
        <h2 className="text-2xl font-semibold">最近筆記</h2>

        <div className="space-y-4">
          <a
            href="/notes/event-continuity"
            className="block rounded-xl border p-5 hover:shadow-sm"
          >
            <h3 className="font-medium">事件連續性：題材如何開始自我增強</h3>
            <p className="mt-2 text-sm text-gray-600">
              將同主題新聞拆成來源擴散、公司擴散與時間密度，建立可量化指標。
            </p>
            <div className="mt-3 text-sm text-gray-500">點我閱讀 →</div>
          </a>

          <a
            href="/notes/bbu-hvdc"
            className="block rounded-xl border p-5 hover:shadow-sm"
          >
            <h3 className="font-medium">BBU × HVDC：資料中心電力需求推導</h3>
            <p className="mt-2 text-sm text-gray-600">
              從機櫃功耗與備援等級，拆解電力架構的 ASP 與瓶頸位置。
            </p>
            <div className="mt-3 text-sm text-gray-500">點我閱讀 →</div>
          </a>
        </div>

        <div>
          <a className="text-sm text-gray-600 hover:text-gray-900" href="/notes">
            看全部 Notes →
          </a>
        </div>
      </section>
    </main>
  );
}

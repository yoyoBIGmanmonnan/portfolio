export default function AboutPage() {
    return (
        <main className="space-y-12">
            <section className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">About</h1>
                <p className="text-lg text-gray-600 max-w-3xl">
                    這是一個以「事件」為核心的投資研究系統，目標不是產出更多觀點，
                    而是幫助我在資訊過載的市場中，判斷哪些事件真正值得關注。
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">為什麼要做這個？</h2>
                <p className="leading-7 text-gray-700 max-w-3xl">
                    市場從來不缺資訊，缺的是結構。新聞、題材與市場情緒每天大量出現，
                    但多數時候，它們只造成反應，卻無法形成可驗證的研究。
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">研究方法</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 max-w-3xl">
                    <li>以事件為研究最小單位</li>
                    <li>觀察事件的連續性與擴散性</li>
                    <li>透過權重判斷研究優先順序</li>
                    <li>回溯市場是否修正原有共識</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">這不是什麼？</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 max-w-3xl">
                    <li>不是即時喊單</li>
                    <li>不是新聞整理站</li>
                    <li>不是情緒輸出平台</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">未來</h2>
                <p className="leading-7 text-gray-700 max-w-3xl">
                    系統會持續演進，但核心不變：讓研究可回溯、可驗證、可累積。
                </p>
            </section>
        </main>
    );
}

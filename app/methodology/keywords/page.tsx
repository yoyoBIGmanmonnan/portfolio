// app/methodology/keywords/page.tsx
import { KEYWORD_CATS } from "@/lib/keywords/catalog";
import { buildKeywordHits } from "@/lib/keywords/hits";
import { KEYWORDS_CHANGELOG, KEYWORDS_VERSION } from "@/lib/keywords/changelog";
import KeywordsClient from "./KeywordsClient";

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

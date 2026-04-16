# Scoring Models

> **Why this document matters.** Every score SEOpen surfaces must be traceable to a formula documented here. If a metric cannot be explained in this file, it is considered a bug. Transparent math is a non-negotiable project value — no "black box" scoring.

All scores are normalized to a **0–100 scale** for human readability, regardless of their internal computation range. Each score is stored with:

1. The raw inputs used.
2. The version of the formula at computation time.
3. The version of any external data source that contributed.

This makes every historical score reproducible.

---

## 3.1 Technical SEO Score

The top-level SEO Score is a weighted composite of four pillars:

```
SEO_Score = (w_C · Content)
          + (w_T · Technical)
          + (w_U · UX)
          + (w_A · Authority)
```

Where each pillar is itself normalized to 0–100, and the weights satisfy `w_C + w_T + w_U + w_A = 1`.

### Default weights

| Pillar                   | Symbol | Default Weight | Rationale                                                                                |
| ------------------------ | ------ | -------------- | ---------------------------------------------------------------------------------------- |
| Content Quality          | `w_C`  | **0.25**       | On-page content is the single largest controllable factor.                               |
| Technical Infrastructure | `w_T`  | **0.30**       | Crawlability and renderability are preconditions for everything else.                    |
| User Experience          | `w_U`  | **0.20**       | Core Web Vitals are measurable, reproducible, and correlated with ranking.               |
| Authority & Trust        | `w_A`  | **0.25**       | Backlink/authority data comes from BYOK providers; weighted to reflect its signal value. |

Weights are configurable per project. Defaults are rebaselined periodically against industry correlation studies.

### Content Quality sub-score

Sources its inputs from the content analysis pipeline:

| Input                        | Description                                                                       | Contribution |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------ |
| Semantic Relevance           | TF-IDF and embedding-based relevance of content against declared target topics.   | 30%          |
| Topic Coverage               | Breadth of subtopic coverage relative to top-ranking competitors.                 | 20%          |
| Structured Data Completeness | Schema.org types declared, validated, and matching content entities.              | 20%          |
| Meta Completeness            | Title, description, H1, Open Graph, Twitter Card presence and length conformance. | 15%          |
| Readability & Length         | Appropriate depth vs. query intent; penalizes thin content.                       | 15%          |

### Technical Infrastructure sub-score

`formula_version: 3.1.1` · `weights_version: default-v1`.

| Input               | Description                                                                                                                                                                                                    | Contribution |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Indexability        | `robots.txt` health + `<meta robots>` / `X-Robots-Tag` / canonical / sitemap agreement. Decomposition per [ADR A-011](adr/A-011-robots-txt-scoring-inputs.md).                                                 | 25%          |
| Crawlability        | Sitemap discoverability / validity / URL coverage / stale-entry rate alongside depth-of-reach, orphan detection, and crawl-budget hygiene. Decomposition per [ADR A-012](adr/A-012-sitemap-scoring-inputs.md). | 20%          |
| HTTP Health         | Status distribution, redirect chain length, 4xx/5xx ratio.                                                                                                                                                     | 20%          |
| HTTPS & Security    | TLS validity, mixed-content detection, HSTS, secure cookies.                                                                                                                                                   | 15%          |
| Duplicate Content   | Shingle-based near-duplicate ratio across the crawled corpus.                                                                                                                                                  | 10%          |
| Internal Link Graph | PageRank-style equity distribution, link-equity sinks, and orphan rate.                                                                                                                                        | 10%          |

The `3.1.0` → `3.1.1` bump is a **patch** revision: the weighted row structure and contributions are unchanged, but the Indexability and Crawlability rows now cite ADRs A-011 and A-012 for their deterministic decomposition. Scores computed under 3.1.0 against sites whose `robots.txt` and `sitemap.xml` health were not formally decomposed remain valid historical data; dashboards show the version alongside each score per §3.4.

### User Experience sub-score

Sourced directly from Lighthouse and Core Web Vitals:

| Input                           | Description                                                         | Contribution |
| ------------------------------- | ------------------------------------------------------------------- | ------------ |
| Largest Contentful Paint (LCP)  | Good: ≤2.5s. Needs Improvement: 2.5–4.0s. Poor: >4.0s.              | 30%          |
| Interaction to Next Paint (INP) | Good: ≤200ms. Needs Improvement: 200–500ms. Poor: >500ms.           | 30%          |
| Cumulative Layout Shift (CLS)   | Good: ≤0.1. Needs Improvement: 0.1–0.25. Poor: >0.25.               | 20%          |
| Time to First Byte (TTFB)       | Server response latency threshold.                                  | 10%          |
| Lighthouse Accessibility        | Included as a UX signal (accessibility failures also reduce reach). | 10%          |

Sub-score maps the thresholds onto 0–100 via piecewise-linear interpolation so that "just barely green" scores around 75 and "well under the Good threshold" scores closer to 95–100.

### Authority & Trust sub-score

Populated from BYOK backlink providers:

| Input                    | Description                                                 | Contribution |
| ------------------------ | ----------------------------------------------------------- | ------------ |
| Referring Domains        | Distinct root domains linking inbound.                      | 35%          |
| Referring Domain Quality | Weighted by the provider's trust/authority metric.          | 25%          |
| Link Velocity            | Growth or decay of referring domains over the past 90 days. | 15%          |
| Anchor Text Diversity    | Guards against over-optimized / spam-pattern anchors.       | 15%          |
| Brand Mentions           | Unlinked mentions treated as a soft authority signal.       | 10%          |

---

## 3.2 AI Visibility Score

The AI Visibility Score is computed from four primary empirical KPIs plus a contextual citation density term.

```
AI_Visibility_Score = normalize(
    w1 · AIGVR
  + w2 · CER
  + w3 · AECR
  + w4 · SRS
  + w5 · CCD
)
```

Default weights: `w1 = 0.35, w2 = 0.25, w3 = 0.15, w4 = 0.15, w5 = 0.10` (configurable).

### 3.2.1 AIGVR — AI-Generated Visibility Rate

**Definition.** The frequency (and textual prominence) with which a specific brand, entity, or URL is featured in generative AI responses across a defined cluster of target prompts.

**Formula.**

```
AIGVR = (Σ P_i · prominence_i)  /  N_prompts
```

Where:

- `P_i` = 1 if the brand appears in the response to prompt _i_, else 0
- `prominence_i` = weighting based on position, typographical emphasis, and whether the mention is an inline citation vs. a passing mention
- `N_prompts` = total prompts in the cluster

**Target optimization range.** 15%–25% for a well-optimized brand in its core category.

### 3.2.2 CER — Content Extraction Rate

**Definition.** The percentage of the brand's total published content surface that is actively utilized, summarized, or quoted by LLMs during answer formulation.

**Formula.**

```
CER = (N_urls_cited_at_least_once) / (N_total_indexable_urls)
```

Measured across a defined observation window (default: 30 days of prompt-cluster sampling).

**Target optimization range.** 12%–20%.

### 3.2.3 AECR — AI Engagement Conversion Rate

**Definition.** The rate at which human users interact with (click, expand) citations embedded inside AI-generated responses.

**Formula.**

```
AECR = clicks_on_citations / impressions_of_citations
```

Measured via referrer logs where available (some AI engines expose `utm_source=chatgpt.com` and similar), supplemented by server-log pattern matching.

**Target optimization range.** 8%–15%. Notably lower than AIGVR because most AI-surfaced citations go un-clicked — which is exactly why AIGVR exists as its own metric.

### 3.2.4 SRS — Semantic Relevance Score

**Definition.** Algorithmic measure of how closely the brand's content aligns with the underlying semantic intent of a target conversational query.

**Method.** The content and the query are embedded into a shared vector space; SRS is the cosine similarity averaged across the prompt cluster, normalized to 0–100.

**Target optimization range.** 75%–90%.

### 3.2.5 CCD — Contextual Citation Density

**Definition.** How often a brand name is mentioned in proportion to the total volume of category-relevant conversational prompts processed, regardless of whether a click occurred.

**Formula.**

```
CCD = brand_mentions / category_prompt_volume
```

Used as an _early-warning_ signal — a falling CCD indicates the AI ecosystem is losing awareness of the brand _before_ it shows up as a drop in traditional rankings.

---

## 3.3 GEO Content Score (predictive, per-page)

Applied to individual URLs _before_ publication (or during an optimization pass). Answers: "how citation-worthy is this page structurally?"

```
GEO_Content_Score = 100 · (
    0.30 · FactInterpretability
  + 0.25 · SemanticRelevance
  + 0.20 · ConversationalTone
  + 0.15 · Structure
  + 0.10 · Engagement
)
```

Each sub-score is a 0–1 value.

| Sub-score                 | Weight  | What it measures                                                                                                                                                               |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fact Interpretability** | **30%** | Density of verifiable facts, statistics, and hyperlinked primary-source citations. Highest weight because it is the largest empirically observed lift factor for AI citations. |
| **Semantic Relevance**    | **25%** | Alignment of content with the query / prompt intent (reuses the SRS method).                                                                                                   |
| **Conversational Tone**   | **20%** | Does the content read like an answer to a natural-language question? Includes readability scoring, presence of direct Q→A structure.                                           |
| **Structure**             | **15%** | Heading hierarchy cleanliness, modular chunks (lists, tables, FAQ, comparison blocks).                                                                                         |
| **Engagement**            | **10%** | Soft signals: images, examples, interactive elements, embedded expert quotes.                                                                                                  |

### Interpretation bands

| Score  | Interpretation                                                             |
| ------ | -------------------------------------------------------------------------- |
| 90–100 | Best-in-class GEO readiness. Publishable as-is.                            |
| 75–89  | Strong. Tactical improvements recommended.                                 |
| 60–74  | Moderate. Needs structural improvements before publishing.                 |
| 40–59  | Weak. Rework before publishing — fact interpretability is usually the gap. |
| 0–39   | Fails GEO readiness. Major editorial remediation required.                 |

### Worked example

> A 1,200-word article with perfect headings, friendly tone, and nice imagery, but **zero** hyperlinked statistics, scores as follows:
>
> - Structure = 1.0
> - Conversational Tone = 1.0
> - Engagement = 1.0
> - Semantic Relevance = 0.8
> - Fact Interpretability = 0.1
>
> Final = `100 · (0.30·0.1 + 0.25·0.8 + 0.20·1.0 + 0.15·1.0 + 0.10·1.0) = 100 · (0.03 + 0.20 + 0.20 + 0.15 + 0.10) = 68`
>
> A 68 lands in the Moderate band. The 30% weight on Fact Interpretability _specifically_ drags the score down, surfacing the correct remediation ("add statistics from primary sources") as the single highest-impact fix.

### Freshness signal sources

The freshness component of the Engagement sub-score (per-URL) takes its timestamp from the most recent of: schema `datePublished`, schema `dateModified`, visible `<time datetime>` elements, and the URL's `<lastmod>` entry in the site's XML sitemap. Sitemap `<lastmod>` is adopted as a peer source per [ADR A-012](adr/A-012-sitemap-scoring-inputs.md) — publishers frequently update sitemap timestamps without touching visible page dates, and the scoring pass takes the most recent signal. The `formula_version` is unchanged; only the source channel widens, reflected through an additional `source_versions` entry (`sitemap: <url>`) per §3.4.

---

## 3.4 Scoring provenance & versioning

Every score record stored in PostgreSQL carries:

- `formula_version` — SemVer string identifying the formulation
- `weights_version` — identifier for the weight configuration in effect
- `source_versions` — map of each contributing data source → its version or snapshot timestamp
- `computed_at` — UTC timestamp of computation

A formula or weight change **never** back-fills historical scores. Instead, newly computed scores carry the new versions, and dashboards can display either the legacy or current scoring when comparing across time, clearly labeled.

---

## 3.5 Non-proprietary and auditable

No element of the scoring system relies on undocumented proprietary data. Every input is either:

- Measured directly by SEOpen's own crawler / analyzer, or
- Provided by a BYOK integration whose data contract is documented in [`data-integrations.md`](data-integrations.md).

Users are free to re-derive every score from raw inputs if they wish. The scoring code is not, and will not be, a closed differentiator — transparency is the differentiator.

---

## 3.6 GEO Site Readiness Score (per-domain)

The GEO Site Readiness Score is the **per-domain counterpart** to the per-URL §3.3 GEO Content Score. Where §3.3 asks "how citation-worthy is this page?", §3.6 asks "how citation-ready is this site as a whole?" The score is computed once per site using only site-level discovery artifacts and schema signals — no per-URL crawling required beyond what surface signals demand.

Introduced by [ADR A-013](adr/A-013-llms-txt-and-geo-site-readiness.md) and consuming the discovery-artifact decompositions from [ADR A-011](adr/A-011-robots-txt-scoring-inputs.md) (robots.txt) and [ADR A-012](adr/A-012-sitemap-scoring-inputs.md) (sitemap.xml).

### 3.6.1 Formula

```
GEO_Site_Readiness = 100 · (
    0.30 · AiCrawlerPosture
  + 0.25 · LlmsTxtQuality
  + 0.20 · SitemapHealth
  + 0.15 · StructuredDataCoverage
  + 0.10 · EntityClarity
)
```

`formula_version: 3.6.0` · `weights_version: default-v1`.

Each sub-score is a 0–1 value.

| Sub-score                    | Weight  | What it measures                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI-crawler posture**       | **30%** | `robots.txt` allow/deny posture against the tracked roster of AI crawlers (GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Amazonbot, cohere-ai, ChatGPT-User, OAI-SearchBot, Bytespider). Silence scores neutral (0.7); explicit Allow scores full (1.0); explicit Disallow scores zero. Full decomposition in [A-011](adr/A-011-robots-txt-scoring-inputs.md). |
| **llms.txt quality**         | **25%** | Presence at `/llms.txt`, structural validity per the [llmstxt.org](https://llmstxt.org/) format (H1 title + H2 sections + link lists), coverage of the site's major information architecture, health of the links it contains, and an optional `/llms-full.txt` quality bonus. Full decomposition in [A-013](adr/A-013-llms-txt-and-geo-site-readiness.md).                                                 |
| **Sitemap health**           | **20%** | Sitemap discoverability / validity / URL coverage / stale-entry rate. Decomposition reused from the §3.1 Crawlability row per [A-012](adr/A-012-sitemap-scoring-inputs.md).                                                                                                                                                                                                                                 |
| **Structured data coverage** | **15%** | Site-level `Organization` / `Person` / `WebSite` schema on the homepage, and per-content-type schema coverage (fraction of articles carrying `Article`, products carrying `Product`, etc.) across crawled URLs.                                                                                                                                                                                             |
| **Entity clarity**           | **10%** | `sameAs` links to authoritative external identifiers (Wikipedia, Wikidata, Crunchbase, GitHub, LinkedIn, official social), consistent brand name across pages, presence of a canonical About page.                                                                                                                                                                                                          |

### 3.6.2 Interpretation bands

Identical thresholds to §3.3 so dashboards can show per-URL and per-site bands on the same scale.

| Score  | Interpretation                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 90–100 | Best-in-class GEO readiness. The site is infrastructurally ready for AI citation.                                                               |
| 75–89  | Strong. Tactical adjustments (e.g. add missing AI-crawler Allow declarations, publish an llms.txt) recommended.                                 |
| 60–74  | Moderate. Multiple discovery artifacts need attention; remediation ordered by weight typically produces the biggest gains.                      |
| 40–59  | Weak. Major discoverability gaps — robots.txt likely silent on AI crawlers, llms.txt absent, sitemap possibly missing or stale.                 |
| 0–39   | Fails. The site is effectively invisible to AI systems at the infrastructure layer; no content quality can compensate without fixes here first. |

### 3.6.3 Worked example

> A hypothetical site scores as follows:
>
> - AI crawler posture = 0.85 (explicit Allow for the five most prominent AI crawlers; silence for the rest)
> - llms.txt quality = 0.95 (valid, 5 H2 sections matching navigation, 100 % link health, `/llms-full.txt` present)
> - Sitemap health = 0.92 (valid XML, 98 % URL coverage, 2 % stale-entry rate)
> - Structured data coverage = 0.75 (Organization + WebSite on homepage, 70 % article coverage)
> - Entity clarity = 0.90 (Wikipedia + Wikidata + GitHub `sameAs`, consistent brand name, dedicated About page)
>
> Final = `100 · (0.30·0.85 + 0.25·0.95 + 0.20·0.92 + 0.15·0.75 + 0.10·0.90) = 100 · (0.255 + 0.2375 + 0.184 + 0.1125 + 0.090) = 87.9`
>
> An 87.9 lands in the Strong band. Structured data coverage is the lowest sub-input — the correct remediation is to raise per-content-type schema coverage before touching anything else.

This worked example is the characterization-test pin for the future `scoreGeoSiteReadiness` implementation in `@seopen/scoring`, analogous to the §3.3 "68" pin for `scoreGeoContent`.

### 3.6.4 AI crawler roster

The AI-crawler posture sub-input evaluates `robots.txt` against the following roster. The roster is intentionally versioned alongside `weights_version` so scoring runs are reproducible across crawler-launch cadences — new crawlers join the roster via an ADR-accompanied `weights_version` bump.

| User-agent                                | Provider                     |
| ----------------------------------------- | ---------------------------- |
| `GPTBot`                                  | OpenAI                       |
| `ChatGPT-User`                            | OpenAI (on-demand)           |
| `OAI-SearchBot`                           | OpenAI (SearchGPT)           |
| `ClaudeBot`, `claude-web`, `anthropic-ai` | Anthropic                    |
| `PerplexityBot`, `Perplexity-User`        | Perplexity                   |
| `Google-Extended`                         | Google (AI training opt-out) |
| `Applebot-Extended`                       | Apple Intelligence           |
| `CCBot`                                   | Common Crawl                 |
| `Amazonbot`                               | Amazon                       |
| `cohere-ai`                               | Cohere                       |
| `Bytespider`                              | ByteDance                    |

Changes to this roster — adds, removes, renames — bump `weights_version` on the next §3.6 release.

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

| Input               | Description                                                             | Contribution |
| ------------------- | ----------------------------------------------------------------------- | ------------ |
| Indexability        | Robots / meta / canonical / sitemap consistency.                        | 25%          |
| Crawlability        | Depth-of-reach from seed, orphan detection, crawl-budget hygiene.       | 20%          |
| HTTP Health         | Status distribution, redirect chain length, 4xx/5xx ratio.              | 20%          |
| HTTPS & Security    | TLS validity, mixed-content detection, HSTS, secure cookies.            | 15%          |
| Duplicate Content   | Shingle-based near-duplicate ratio across the crawled corpus.           | 10%          |
| Internal Link Graph | PageRank-style equity distribution, link-equity sinks, and orphan rate. | 10%          |

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

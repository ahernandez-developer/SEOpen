# Modules & Feature Surface

SEOpen is organized into four top-level modules. Each is independently useful and can run in isolation, but they share a common data model, crawler, and UI — so composing them across a project gives compounding value.

| #   | Module                              | Primary Persona                 | Outputs                                                           |
| --- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| 1   | Technical SEO & Performance Auditor | Technical SEO, site reliability | SEO Score, issue backlog, Lighthouse reports                      |
| 2   | AI Visibility & GEO Checker         | Brand strategist, content lead  | AI Visibility Score, citation mentions, GEO content grade         |
| 3   | Keyword & Content Gap Analyzer      | Content strategist, SEO lead    | Missing keywords, missing prompts, structural gap recommendations |
| 4   | Scoring & Reporting Engine          | Everyone                        | Dashboards, exports, historical trends                            |

---

## 1. Technical SEO & Performance Auditor

### Purpose

The foundation of both SEO and GEO is technical accessibility. If a crawler cannot reach a page, render its JavaScript, and extract its structured meaning, no amount of content strategy will help. This module exhaustively audits that foundation.

### Capabilities

- **Full-domain crawling.** Breadth-first traversal from a seed URL, honoring `robots.txt`, `sitemap.xml`, and configurable rate limits. Distributed URL frontier allows resuming, restarting, and horizontally scaling crawls.
- **Dynamic rendering.** All target URLs are rendered in a headless Chromium instance via Crawlee/Puppeteer so that JavaScript-heavy SPAs (React, Vue, Angular, Next.js, SvelteKit, …) expose their final DOM to the analyzer.
- **Lighthouse integration.** Programmatic execution of Google Lighthouse against every crawled page, capturing Performance, Accessibility, Best Practices, SEO, and PWA scores, plus raw Core Web Vitals (LCP, CLS, INP/FID, TTFB).
- **Custom Lighthouse audits.** The platform injects its own audit scripts into the Lighthouse pipeline to validate signals that the default audits ignore:
  - Open Graph tag completeness and length conformance
  - Twitter Card declarations
  - Schema.org JSON-LD payloads — presence, validity, and entity coverage
  - hreflang integrity for multi-region sites
- **Site architecture mapping.** Builds an internal link graph, computes internal PageRank-style equity distribution, detects orphan pages, identifies link-equity sinks.
- **Status & redirect analysis.** Classifies every HTTP response, flags chains/loops, surfaces canonicalization conflicts (`rel=canonical` vs `robots` vs `sitemap` vs internal linking).
- **Duplicate content detection.** Near-duplicate detection via shingling/MinHash across the crawled corpus.
- **Indexability audit.** Validates `robots.txt`, `X-Robots-Tag`, `<meta robots>`, `noindex`, canonical, and sitemap consistency, and surfaces contradictions.

### Outputs

- A persistent **SEO Score** (0–100) for the domain, with the sub-score decomposition defined in [`scoring.md`](scoring.md).
- A prioritized **issue backlog** grouped by severity, with one-click drill-down into affected URLs.
- **Historical trends** for every metric at daily/weekly granularity.

---

## 2. AI Visibility & GEO Checker

### Purpose

This is SEOpen's defining module — the first-class, open-source tracker for brand visibility inside generative AI outputs. It answers two distinct questions:

1. **"How often do generative engines cite my brand / domain / entity?"** — measured empirically by querying the engines themselves.
2. **"How _citation-worthy_ is my content, structurally?"** — scored predictively from content properties the research literature identifies as citation-predictive.

### Sub-module A: Empirical AI Visibility Tracking

- **Prompt bank.** Users define clusters of target conversational prompts representative of their category (e.g. "what's the best open-source SEO tool", "compare Semrush vs Ahrefs"). Prompts can be seeded from the Keyword & Content Gap Analyzer.
- **Multi-engine querying.** The tracker submits those prompts across configured AI engines via the BYOK integration layer (OpenAI, Anthropic Claude, Perplexity, Google AI Studio, etc.).
- **Citation extraction.** Responses are parsed to extract mentioned brands, entities, URLs, and quoted text. The parser handles inline citations, reference lists, and naked entity mentions.
- **Metric computation.** Every response feeds the four primary GEO KPIs:
  - **AIGVR** — AI-Generated Visibility Rate
  - **CER** — Content Extraction Rate
  - **AECR** — AI Engagement Conversion Rate
  - **SRS** — Semantic Relevance Score
- **Trend tracking.** The platform records a time series of all four metrics per brand, per prompt cluster, per engine, so users can detect shifts like "my AIGVR on Perplexity dropped 40% after the October model update."

### Sub-module B: Predictive GEO Content Scoring

Applied to any target URL — typically before publication or during an optimization pass — this sub-module scores a page against the structural properties empirically correlated with AI citation:

- **Factual density.** NLP-driven scan for numerical data points, statistics, percentages, proper nouns, and outbound links to primary sources. Research indicates that one hyperlinked statistic per 150–200 words increases citation probability by 37–41%.
- **Semantic chunking.** Heading hierarchy (H1/H2/H3) depth and balance, presence of bulleted/numbered lists, tables, and explicitly labeled FAQ blocks. Comparative articles capture 32.5% of AI citations in analytical queries, so the scorer rewards "vs" / "pros & cons" structures.
- **Authority signals.** Detection of expert quotations, author bylines with credentials, and outbound links to primary research.
- **Freshness signals.** Visible timestamps (`datePublished`, `dateModified`), sitemap last-mod entries, schema announcements, and copyright footers. 76.4% of ChatGPT's most-cited pages were updated within 30 days.
- **Conversational tone.** Lightweight readability and question-answering structure analysis (is the page written in a way that matches how users phrase prompts?).

Outputs a **GEO Content Score** (0–100) with weighted sub-categories, defined in [`scoring.md`](scoring.md).

### Outputs

- **AI Visibility Score** (0–100) for the brand, composed from the four empirical KPIs plus contextual citation density.
- **Per-prompt citation logs** — raw responses, extracted citations, engine-specific breakdowns.
- **Per-page GEO Content Score** with actionable remediation recommendations ("add 2 statistics in the intro", "add a comparison table", "include a byline with credentials").

---

## 3. Keyword & Content Gap Analyzer

### Purpose

Classical keyword research plus its GEO counterpart. Tells users what queries (and what _prompts_) they should be winning but aren't, and what structural changes would close each gap.

### Classical SEO research

- **Keyword discovery.** Seeded by domain, URL, or topic. Uses BYOK integrations (DataForSEO, SerpApi, Semrush API) to fetch monthly search volume, keyword difficulty, CPC, SERP features, and intent classification.
- **SERP feature analysis.** For each keyword, captures which SERP features are present (featured snippet, People Also Ask, AI Overview, video pack, local pack, shopping carousel).
- **Competitor keyword gap.** Given a user domain and N competitor domains, identifies keywords where competitors rank but the user does not, weighted by volume, difficulty, and estimated business value.

### GEO prompt research

- **Prompt clustering.** Starting from classical keywords, the platform uses LLM-assisted expansion to derive the long-tail conversational prompts users might submit to generative engines. Example: keyword `"open source semrush alternative"` expands to prompts like `"what's the best open source alternative to semrush for self-hosting"`, `"are there any free and open source SEO tools that also track AI visibility"`, etc.
- **Prompt-level visibility check.** Each generated prompt is submitted through the AI Visibility module (sub-module A) to determine whether the user's domain is currently cited.
- **Prompt gap analysis.** Identifies prompts where competitors appear in AI answers but the user does not, ranked by prompt frequency and estimated value.

### Content gap recommendations

When a gap is identified, the analyzer does not stop at "you're missing this keyword." It inspects the competitors' cited content and the user's nearest-matching page, then surfaces **structural deltas**:

- The cited competitor has a comparison table; the user's page does not.
- The cited competitor has 6 hyperlinked statistics in the first 500 words; the user has 0.
- The cited competitor was updated 14 days ago; the user's page is 9 months stale.
- The cited competitor includes an FAQ block structured as an FAQPage schema; the user has none.

Each recommendation maps back to a specific sub-score in the GEO Content Score so the user can estimate the impact of each change before making it.

### Outputs

- **Missing keywords** (traditional SERPs).
- **Missing prompts** (generative engines).
- **Ranked structural remediation list** per page.

---

## 4. Scoring & Reporting Engine

### Purpose

All three preceding modules produce signals. The Scoring & Reporting Engine is what turns those signals into numbers humans and dashboards can act on.

### Core responsibilities

- **Deterministic scoring.** Implements every formula in [`scoring.md`](scoring.md): SEO Score, AI Visibility Score, GEO Content Score, plus sub-scores and rolling aggregations.
- **Customizable weightings.** Default weights are empirically grounded (see scoring doc), but every weight is exposed as a project-level configuration so advanced users can rebalance without forking code.
- **Historical time series.** Every score is stored at each run with full provenance (inputs, formula version, data source versions). Scoring changes over time are auditable.
- **Dashboards.** Project home, per-URL drill-downs, side-by-side competitor comparisons, GEO-vs-SEO split views, trend charts.
- **Exports.** CSV, JSON, and PDF exports for every report. PDF exports are branded per-project for agency use.
- **Alerts.** User-defined thresholds (e.g. "alert me if AIGVR on Perplexity drops more than 10% week-over-week") routed to webhooks, email, or Slack.
- **API access.** Every report and score is available via a documented REST API for programmatic consumption.

---

## Shared capabilities across modules

Several cross-cutting features apply to every module above:

- **Projects.** All work is organized under a Project object, which owns domains, competitors, prompt clusters, keyword lists, and user permissions.
- **Scheduled runs.** Any audit, crawl, or visibility check can be scheduled (hourly/daily/weekly/monthly) with cron semantics.
- **Role-based access control.** Owner / editor / viewer roles at the project level.
- **Audit log.** Every action (configuration change, scheduled job trigger, score adjustment) is logged with user attribution.
- **Webhooks & integrations.** Outbound webhooks fire on score changes, issue creation, crawl completion. Inbound integrations plug into Slack, Linear, Jira, and generic HTTP.

---

## Explicitly deferred features (not in MVP)

To keep the MVP surface area honest, the following are called out as _planned but not included_ in the initial release:

- Backlink index crawling _from scratch_ (SEOpen relies on BYOK providers for this).
- Rank tracking for hundreds of thousands of keywords (out of scope for v1 — use BYOK SERP providers for large-scale tracking).
- AI content generation (explicitly out of scope — see [`vision.md`](vision.md) non-goals).
- Paid ads / PPC research modules (would dilute focus).
- Local SEO GMB management (may land in a later phase; see [`roadmap.md`](roadmap.md)).

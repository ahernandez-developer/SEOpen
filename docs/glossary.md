# Glossary

> Canonical definitions of every term used across SEOpen's documentation. When a doc says "AIGVR" or "URL frontier" or "pgvector," this is the authoritative source. If a term is ambiguous inside SEOpen's docs, fix the ambiguity by updating this glossary.

---

## SEO fundamentals

### SEO (Search Engine Optimization)

The discipline of optimizing digital assets to rank well in traditional search engine result pages (SERPs), with the goal of attracting qualified outbound clicks. Measurement primitives: position, impressions, click-through rate, session behavior.

### SERP (Search Engine Result Page)

The page returned by a search engine in response to a user query, including organic results, ads, and SERP features (featured snippet, People Also Ask, AI Overview, local pack, etc.).

### Core Web Vitals

Google's standardized set of user-experience metrics:

- **LCP (Largest Contentful Paint):** how quickly the largest visible element renders.
- **INP (Interaction to Next Paint):** responsiveness of user interactions. Replaces the older FID (First Input Delay).
- **CLS (Cumulative Layout Shift):** visual stability.
- **TTFB (Time to First Byte):** server response latency (a supporting metric, not strictly a Core Web Vital).

### Lighthouse

Google's open-source auditing tool for web pages. Produces scores for Performance, Accessibility, Best Practices, SEO, and PWA. SEOpen integrates Lighthouse natively via the Chrome DevTools Protocol and injects custom audits.

### Canonicalization

The process by which a site declares the preferred URL for a given piece of content (via `rel=canonical`, sitemap entries, HTTP headers, or internal linking). Misconfigured canonicalization is a common cause of duplicate-content and indexing issues.

### Structured data / Schema.org / JSON-LD

Machine-readable markup that explicitly declares the type and relationships of entities on a page (products, articles, events, authors, organizations). Critical for both rich snippets in traditional SEO and entity disambiguation in generative engines.

### Indexability

Whether a URL is eligible to be indexed by search engines, as determined by the union of `robots.txt`, `<meta robots>`, `X-Robots-Tag`, canonical declarations, and sitemap entries.

### Crawlability

Whether a URL can be reached and fetched by a web crawler starting from a seed. Distinct from indexability — a page can be crawlable but not indexable, or vice versa.

### Backlink / Referring Domain

A backlink is an inbound hyperlink from another page pointing to a target URL. A referring domain is the distinct root domain of that inbound link. Referring domains are generally more meaningful than raw backlink counts.

---

## GEO fundamentals

### GEO (Generative Engine Optimization)

The discipline of optimizing content so that generative AI systems (LLMs, RAG-based search engines) accurately extract, recognize, and cite it in synthesized responses. The generative analogue of SEO.

### Generative engine

Any AI system that returns a synthesized natural-language answer to a user query rather than a ranked list of URLs. Examples: Google AI Overviews, ChatGPT, Claude, Perplexity, SearchGPT.

### RAG (Retrieval-Augmented Generation)

An architecture in which a generative model retrieves external documents before producing its output, grounding the response in specific sources. Most modern generative engines are RAG-based; GEO is the practice of being the document that gets retrieved.

### Citation

A reference — inline, footnote-style, or as a listed source — that a generative engine attributes to an external document in its response. In SEOpen, citations are the fundamental unit of GEO visibility measurement.

### Prompt cluster

A set of natural-language prompts that represent how real users query a given topic. SEOpen's AI Visibility Checker measures brand citations across a prompt cluster to get stable visibility metrics.

### Zero-click impression

A query that is satisfied entirely inside the search surface without generating a click to any external site. Zero-click queries are invisible to traditional referral-based analytics, which is one of the reasons GEO needs its own measurement stack.

### Factual density

The rate of verifiable facts, statistics, and hyperlinked primary-source citations per unit of text. Empirically one of the strongest predictors of AI citation-worthiness.

### Semantic chunking

Structuring content into cleanly delineated, self-contained chunks (via heading hierarchy, lists, tables, comparison blocks) so that a generative engine can extract modular pieces without ambiguity.

---

## SEOpen scoring metrics

### SEO Score

SEOpen's composite 0–100 score for a domain across Content, Technical, UX, and Authority pillars. Defined in [`scoring.md`](scoring.md) §3.1.

### AI Visibility Score

SEOpen's composite 0–100 score for a brand's presence inside generative AI outputs. Combines AIGVR, CER, AECR, SRS, and CCD. Defined in [`scoring.md`](scoring.md) §3.2.

### GEO Content Score

SEOpen's predictive 0–100 score for a single URL's GEO readiness, weighted heavily toward Fact Interpretability. Defined in [`scoring.md`](scoring.md) §3.3.

### AIGVR (AI-Generated Visibility Rate)

The frequency and prominence with which a brand or entity appears in generative AI responses across a defined prompt cluster. Target range: 15–25%.

### CER (Content Extraction Rate)

The fraction of a brand's indexable content that is utilized, summarized, or quoted by LLMs in the observation window. Target range: 12–20%.

### AECR (AI Engagement Conversion Rate)

The fraction of AI-surfaced citations that receive a user click. Target range: 8–15%.

### SRS (Semantic Relevance Score)

A cosine-similarity-based measure (on shared embedding vectors) of how closely a brand's content aligns with the semantic intent of target queries. Target range: 75–90%.

### CCD (Contextual Citation Density)

The ratio of brand mentions in AI outputs to total category-relevant prompts processed. Acts as an early-warning signal for AI-ecosystem awareness shifts.

### Fact Interpretability

The sub-score inside the GEO Content Score (weighted at 30%) that measures how readily the content's factual claims can be extracted, verified, and cited.

---

## Architecture & systems

### Single-runtime architecture

An architectural style in which every core service shares the same language runtime. SEOpen's core is Node.js / TypeScript end-to-end — extraction, analysis, scoring, API, workers, and the web frontend all ship as TypeScript. See [`architecture.md`](architecture.md) §4.2 and [ADR A-001](adr/A-001-single-runtime-nodejs.md) for the decision and the rejected alternatives.

### URL frontier

The distributed queue of URLs that have been discovered but not yet crawled. In SEOpen, implemented in Redis with Bloom-filter-based deduplication and per-domain rate limiting. See [`architecture.md`](architecture.md) §4.4.

### Task broker

A message queue that routes work between services and provides durability, priority classes, retry semantics, and dead-letter queues. SEOpen uses BullMQ on Redis as the primary broker — see [ADR A-002](adr/A-002-bullmq-task-broker.md). RabbitMQ and other AMQP brokers remain viable alternatives for high-throughput deployments via the queue adapter.

### Bloom filter

A probabilistic data structure that efficiently tests whether an element is a member of a set. SEOpen uses Bloom filters to deduplicate URLs in the frontier without storing every hash in full.

### Headless browser

A web browser (typically Chromium via Puppeteer or Playwright) running without a visible window, controlled programmatically. Required for rendering JavaScript-heavy sites before extraction.

### Crawlee

A Node.js web scraping and browser automation framework. Provides auto-scaling, session management, proxy rotation, and anti-bot handling. SEOpen's primary extraction library.

### HTML → Markdown toolchain

The libraries SEOpen uses to convert rendered HTML into clean Markdown suitable for LLM ingestion and deterministic scoring. Primary stack: [`@mozilla/readability`](https://github.com/mozilla/readability) (strip boilerplate, identify the main article), [`unified`](https://unifiedjs.com/) + [`rehype-remark`](https://github.com/rehypejs/rehype-remark) (structured conversion), and [`turndown`](https://github.com/mixmark-io/turndown) (long-tail HTML patterns). All run inside the single TypeScript runtime.

### BullMQ

A distributed task queue library for Node.js backed by Redis. SEOpen's primary task broker across extraction **and** analysis — see [ADR A-002](adr/A-002-bullmq-task-broker.md).

### pgvector

A PostgreSQL extension that adds a vector data type and similarity search, enabling embedding-based semantic queries without introducing a separate vector database.

### Observability

The discipline of instrumenting systems so their internal state can be inferred from external signals: structured logs, distributed traces, and metrics. SEOpen uses OpenTelemetry as its cross-language tracing standard.

---

## Data & integrations

### BYOK (Bring Your Own Key)

A model in which users supply their own API credentials for third-party services and interact with providers directly. SEOpen's sole integration model. See [`data-integrations.md`](data-integrations.md) §5.1.

### Provider adapter

A module that wraps a specific third-party API (DataForSEO, SerpApi, OpenAI, …) and exposes SEOpen's provider-agnostic interface. Contracts defined in [`data-integrations.md`](data-integrations.md) §5.4.

### DataForSEO

A pay-as-you-go all-in-one SEO data API providing keyword volumes, SERPs, backlinks, and domain research. SEOpen's default and most deeply integrated BYOK provider.

### SerpApi

A real-time SERP-scraping API used for fresh, parsed SERP results including AI Overviews.

### CrUX (Chrome User Experience Report)

Google's public dataset of real-user Core Web Vitals field data. Used as a free supplement to SEOpen's own lab-based Lighthouse runs.

### Ollama

A local LLM runner that allows users to run models on their own hardware. Supported in SEOpen as a fully private alternative to hosted LLM providers.

---

## Project & community

### 90-9-1 principle

A well-documented participation heuristic: ~90% of users consume, ~9% engage, ~1% actively contribute. SEOpen's community plan is explicitly designed around this distribution rather than against it.

### TTFV (Time to First Value)

The elapsed time from a user's first interaction with SEOpen to their first useful output (a completed audit, a visibility score, etc.). SEOpen's Phase 1 target is under five minutes on a developer laptop.

### ADR (Architecture Decision Record)

A short, dated document that captures a significant architectural decision, its context, the options considered, and the rationale for the chosen option. SEOpen stores ADRs under `docs/adr/` starting in Phase 0.

### CoC (Code of Conduct)

The behavioral standard for participation in SEOpen's community spaces. SEOpen adopts the Contributor Covenant. See [`community.md`](community.md) §7.7.

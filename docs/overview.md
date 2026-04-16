# Overview

> **One-paragraph summary.** SEOpen is an open-source, self-hostable platform that unifies traditional Technical SEO auditing with Generative Engine Optimization (GEO) visibility tracking. It combines a distributed Node.js / TypeScript crawler and analysis stack with deterministic scoring models and a bring-your-own-key (BYOK) integration layer for third-party data providers. The scoring methodology is fully documented and transparent.

---

## The problem, in one page

For twenty years, SEO tools optimized for **ranking URLs**. That assumption is breaking:

- Generative engines (AI Overviews, ChatGPT, Perplexity, Claude) increasingly answer queries **without emitting clicks**.
- Traditional referral-based analytics go **blind** to these zero-click impressions.
- The optimization target is no longer "rank #1" — it is "be the source the model cites."

This is **Generative Engine Optimization (GEO)**: optimizing content so LLMs extract, trust, and reference it. GEO demands different content structure (factual density, semantic chunking, freshness) and different measurement (citation rate, entity prominence, conversational relevance) than classical SEO.

Existing tooling tends to fall into one of three gaps:

1. Legacy SEO suites that do not measure GEO.
2. Nascent GEO trackers that do not measure SEO.
3. Hand-rolled scripts and spreadsheets.

SEOpen closes that gap with a single transparent, self-hostable platform.

---

## The solution, in one page

SEOpen delivers four tightly integrated capabilities:

1. **Technical SEO & Performance Auditor** — full-domain crawl, Lighthouse/Core Web Vitals, structured data validation, link-graph analysis.
2. **AI Visibility & GEO Checker** — measures how often a brand/entity is cited by generative engines; scores content against the structural properties LLMs reward.
3. **Keyword & Content Gap Analyzer** — classical keyword research + GEO prompt gap analysis.
4. **Unified Scoring Engine** — deterministic composite scores for both SEO and GEO, documented in [`scoring.md`](scoring.md).

These sit on top of a distributed architecture designed to scale from a laptop (Docker Compose, one site) to a fleet (Kubernetes, millions of URLs):

- **Extraction workers** (TypeScript, Crawlee / Puppeteer) drive headless browsers, render JavaScript, execute Lighthouse.
- **Analysis workers** (TypeScript) transform HTML → Markdown via `@mozilla/readability` + `unified` / `rehype-remark`, compute deterministic scores, and call LLM APIs for semantic evaluations.
- **BullMQ on Redis** coordinates distributed work queues and the URL frontier in a single backing store.
- **PostgreSQL** (with the **pgvector** extension) stores structured reporting data and embeddings; **object storage (S3/MinIO)** holds raw HTML and Lighthouse payloads.
- **BYOK integrations** plug into DataForSEO, SerpApi, SE Ranking, Semrush, OpenAI, Anthropic, etc.

Full architecture detail in [`architecture.md`](architecture.md).

---

## Who it is for

| Persona                                    | Why SEOpen                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| **Independent developers / indie hackers** | Free, self-hostable, BYOK — run full audits against real domains on a laptop.   |
| **SEO & marketing agencies**               | Audit unlimited client sites on owned infrastructure.                           |
| **In-house SEO / content teams**           | Own the data, customize the scoring weights, integrate with internal pipelines. |
| **Academic & research communities**        | Transparent algorithms enable reproducible research on SEO and GEO.             |

---

## How the pieces fit

```
                 ┌─────────────────────────┐
                 │     Web Dashboard       │
                 │   (Next.js frontend)    │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │       API Gateway       │
                 │    (Fastify + Zod)      │
                 └──────┬──────────┬───────┘
                        │          │
        ┌───────────────▼──┐   ┌───▼────────────────┐
        │ Extraction (Node)│   │ Analysis (Node)    │
        │  Crawlee / PPTR  │   │  Scoring, NLP, LLM │
        └────────┬─────────┘   └─────────┬──────────┘
                 │                       │
                 │      ┌──────────────┐ │
                 └─────▶│    BullMQ    │◀┘
                        │   on Redis   │
                        │  URL frontier│
                        │  + job queue │
                        └──────┬───────┘
                               │
          ┌────────────────────▼─────────────────┐
          │ PostgreSQL + pgvector  •  S3/MinIO   │
          └──────────────────────────────────────┘
```

Details, rationale, and alternatives are in [`architecture.md`](architecture.md).

---

## What this document is _not_

This is a **foundation document**, not an implementation document. It states _what_ the platform is and _why_ each decision was made. It does not contain installation instructions, API references, or source code — those land once Phase 1 of the roadmap ([`roadmap.md`](roadmap.md)) begins.

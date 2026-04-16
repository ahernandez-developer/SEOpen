# Architecture

> SEOpen is a **single-runtime microservices platform** built on Node.js / TypeScript, designed to run on a single laptop (Docker Compose) or a horizontally scaled fleet (Kubernetes) without architectural rewrites.

This document captures the non-speculative architectural decisions that govern the codebase before a single line is merged. It is the authoritative reference for any future implementation work; deviations should be discussed in ADRs (Architecture Decision Records) rather than by silent drift. Every decision in §4.10 has a long-form ADR under [`adr/`](adr/).

---

## 4.1 Design principles

1. **Single runtime.** Node.js / TypeScript is the sole core runtime. Extraction, analysis, scoring, the API gateway, workers, and the CLI all ship as TypeScript. See [A-001](adr/A-001-single-runtime-nodejs.md) for the full rationale and the rejected polyglot alternatives. A second runtime may be reintroduced later via ADR if a specific workload demonstrably requires it.
2. **Queue-first communication.** Services never call each other synchronously across a network boundary. All inter-service traffic flows through a message broker so that failure modes are decoupled.
3. **Deterministic core + non-deterministic leaves.** The scoring engine is deterministic and reproducible. LLM calls and headless browsers are isolated at the leaves and always produce structured, stored artifacts (Markdown, JSON) before feeding deterministic scoring.
4. **Horizontal scale from day one.** Even the single-node deployment runs every service as if it could be one of N — so growing the fleet is a configuration change, not a refactor.
5. **Observability is a first-class module.** Traces, structured logs, and metrics are wired in before feature work starts. An unobservable system is an unmaintainable system at this level of complexity.

---

## 4.2 The runtime choice: Node.js / TypeScript

SEOpen's core runs on a single runtime. Polyglot alternatives were examined during the foundation phase; the analysis and the rejected options are recorded in [A-001](adr/A-001-single-runtime-nodejs.md).

The tight reasoning for Node.js / TypeScript as the sole core runtime:

- **Extraction is Node-native.** Modern sites are React/Vue/Angular/Next.js SPAs whose final DOM exists only after JavaScript execution. **Crawlee** brings production-grade auto-scaling, session management, proxy rotation, and anti-bot handling; **Puppeteer / Playwright** drive headless Chromium with first-class lifecycle control; **Lighthouse** itself is a Node.js library. Any other runtime would be an awkward subprocess dance around this fleet.
- **The analysis pipeline is well-served in TypeScript.** HTML → Markdown has a mature Node toolchain: `@mozilla/readability` strips boilerplate, `unified` + `rehype-remark` converts structured content, `turndown` handles the long tail. These produce exactly the clean Markdown the LLM semantic pass consumes.
- **Scoring is deterministic arithmetic.** Every formula in [`scoring.md`](scoring.md) is a weighted sum of sub-scores that reduce to counts, ratios, and cosine similarities. TypeScript with strict typing expresses these formulas cleanly and reproducibly.
- **Embeddings run in-process.** `@xenova/transformers` executes sentence-transformer models (MiniLM, BGE, GTE families) on top of ONNX Runtime. For the self-host / laptop-first persona this is fast enough. Large-fleet operators who need GPU-batched embeddings can plug in a sidecar embedding service later — an adapter boundary that is orthogonal to the core runtime choice.
- **LLM APIs are first-class in Node.** `@anthropic-ai/sdk`, `openai`, and equivalent providers ship typed SDKs with streaming, tool-use, and structured-output support; the semantic analysis layer has no cross-runtime cost.
- **Type safety crosses every seam.** API schemas, queue message shapes, scoring inputs/outputs, and the Next.js frontend share the same TypeScript types. Zod lives on both sides of every boundary, so there is no schema translation layer to maintain.
- **One runtime, one deployment story.** One `package.json` (or workspace thereof), one Dockerfile family, one linter, one test runner, one CI configuration. The [roadmap.md](roadmap.md) Phase 1 quality gate "first end-to-end audit under five minutes" is structurally easier to hit with a single runtime.

### What this trades away

- **Heavy native ML libraries.** Workloads that demand GPU-batched scientific computing, research-grade linguistic analysis (dependency parsing, coreference resolution), or other capabilities found primarily in dedicated ML runtimes are out of scope for the core. If a future workload genuinely requires them, a sidecar service and a new ADR can introduce an extra runtime behind an adapter; the deterministic core stays single-runtime.
- **Academic-research lineage.** Much published IR / GEO literature ships reference implementations in non-TypeScript languages. Adopting an algorithm is typically a day of porting; accepted as cost of doing business.

### The seam between services

The seam is still a **message broker**, never a direct HTTP call. An extraction worker publishes a message containing pointers to blob-stored artifacts (raw HTML, Lighthouse JSON); analysis workers consume from that queue and persist scored results. The queue boundary survives unchanged if a future ADR ever reintroduces a non-Node worker — that is the insurance premium we pay for queue-first design (principle §4.1.2).

---

## 4.3 Service topology

```
                       ┌─────────────────────────────┐
                       │        Web Frontend         │
                       │     Next.js (TypeScript)    │
                       └──────────────┬──────────────┘
                                      │  HTTPS
                       ┌──────────────▼──────────────┐
                       │         API Gateway         │
                       │  Node · Fastify · Zod · REST │
                       │   Auth · RBAC · rate-limit  │
                       └──────┬─────────┬────────────┘
                              │         │
              enqueue jobs    │         │  read/write
                              │         │
           ┌──────────────────▼─┐    ┌──▼────────────────────────┐
           │  Task Broker       │    │      PostgreSQL            │
           │  BullMQ · Redis    │    │  (users, projects, scores) │
           └────┬─────────┬─────┘    └────────────────────────────┘
                │         │
   ┌────────────▼──┐   ┌──▼────────────────────────┐
   │  Extraction   │   │  Analysis & Scoring        │
   │  Workers      │   │  Workers                   │
   │  Node · TS    │   │  Node · TS                 │
   │  Crawlee      │   │  Readability / unified     │
   │  Puppeteer    │   │  Deterministic scoring     │
   │  Lighthouse   │   │  @xenova/transformers · LLM│
   └──────┬────────┘   └──────┬─────────────────────┘
          │                   │
          │ raw HTML /         │ embeddings /
          │ Lighthouse JSON    │ LLM responses
          ▼                   ▼
   ┌───────────────────────────────────────┐
   │   Object Storage (S3 / MinIO)         │
   │   Raw HTML · Markdown · Reports       │
   └───────────────────────────────────────┘

                       ┌──────────────────────┐
                       │         Redis        │
                       │  URL frontier · cache │
                       │  rate-limit · BullMQ  │
                       └──────────────────────┘
```

### Service responsibilities

| Service                | Runtime                             | Runs as                 | Responsibilities                                                                                                                                                                         |
| ---------------------- | ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web Frontend**       | TypeScript (Next.js)                | Long-running web server | Dashboards, project config UI, report rendering, exports. Server-side rendering for first-byte performance.                                                                              |
| **API Gateway**        | TypeScript (Fastify + Zod)          | Long-running web server | Auth (JWT/OAuth), RBAC, Zod-validated requests, rate limiting, enqueue jobs, aggregate read-only queries.                                                                                |
| **Extraction Workers** | TypeScript (Crawlee / Puppeteer)    | Auto-scaled pool        | Pull crawl tasks, drive headless browsers, run Lighthouse, persist raw HTML + Lighthouse JSON to object storage, emit analysis tasks.                                                    |
| **Analysis Workers**   | TypeScript                          | Auto-scaled pool        | Pull analysis tasks, transform HTML → Markdown via `@mozilla/readability` + `unified` / `rehype-remark`, compute deterministic scores, run LLM-backed semantic analyses, persist scores. |
| **Scheduler**          | TypeScript                          | Long-running            | Fires time-based runs (daily crawl, weekly GEO sweep) onto the broker.                                                                                                                   |
| **Task Broker**        | BullMQ on Redis                     | Infra                   | Delayed, prioritized, retryable job queues with dead-letter semantics. See [A-002](adr/A-002-bullmq-task-broker.md) for why BullMQ replaced the original RabbitMQ choice.                |
| **Redis**              | Redis                               | Infra                   | URL frontier (sets / bloom filters), per-domain rate limits, ephemeral caches, session stores, BullMQ backing store.                                                                     |
| **PostgreSQL**         | PostgreSQL + pgvector               | Infra                   | Source of truth for users, projects, scores, historical trends, audit log, and embedding vectors.                                                                                        |
| **Object Storage**     | S3-compatible (MinIO for self-host) | Infra                   | Raw HTML, Markdown exports, Lighthouse JSON, PDF reports.                                                                                                                                |

---

## 4.4 The URL frontier

The **URL frontier** is the queue of URLs discovered but not yet visited. It is the heart of any crawler at scale and is deliberately kept separate from the task broker.

- **Primary implementation:** Redis. Discovered URLs are hashed and checked against a **Bloom filter** before enqueueing to deduplicate cheaply at scale.
- **Politeness:** Each URL is enqueued with its target domain, and Redis maintains per-domain rate-limit counters. Extraction workers never pull a URL that would violate its domain's rate limit; they pull the next ready URL instead.
- **Robots.txt compliance:** The first fetch per domain is `robots.txt`. Its rules are cached in Redis (with TTL), and subsequent URL enqueues check them before reaching the frontier.
- **Resumability:** The frontier survives worker restarts and process crashes because it lives in Redis, not in worker memory. Interrupted crawls resume from the next ready URL.
- **Fault tolerance:** If a worker fetches a URL and crashes mid-render, the message broker's visibility timeout re-queues the task. Duplicate-render protection is handled by a short-lived "in flight" set in Redis.

---

## 4.5 Data storage layers

SEOpen uses a deliberately partitioned storage strategy — different data shapes, different stores.

| Data type                                        | Store                                    | Why                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Users, projects, permissions                     | PostgreSQL                               | ACID, relational integrity, strong query planner.                                                                             |
| Scores, sub-scores, historical trends            | PostgreSQL (time-series friendly schema) | Easy aggregations, joins to projects/URLs, reliable backup story.                                                             |
| Crawl metadata, URL catalog, issue backlog       | PostgreSQL                               | Needs joins and filters, natural fit for a relational schema.                                                                 |
| Raw HTML, Markdown, Lighthouse JSON, PDFs        | Object storage (S3 / MinIO)              | Large, opaque blobs. Cheap, durable, horizontally scalable.                                                                   |
| URL frontier, rate-limit counters, session state | Redis                                    | Sub-millisecond latency, TTL-native, no durability required.                                                                  |
| Embeddings for SRS / semantic gap analysis       | pgvector (PostgreSQL extension)          | Keeps embeddings next to the project data for efficient joins. Avoids introducing a separate vector DB until scale forces it. |

The object storage layer is S3-compatible; deployments can point at MinIO, AWS S3, Backblaze B2, Cloudflare R2, or any compatible provider. No S3-specific APIs are used beyond the documented compatibility surface.

---

## 4.6 The analysis pipeline

Once raw HTML lands in object storage, each analysis task flows through a deterministic pipeline:

1. **Clean.** Strip boilerplate (nav, footer, ads), convert to standardized Markdown. This radically reduces LLM token consumption downstream.
2. **Parse.** Extract structured data: headings, tables, lists, FAQs, structured data blocks, byline/author, dates, outbound links, quotations.
3. **Score (deterministic).** Compute every deterministic sub-score: structure, meta completeness, factual density counts, readability, etc. This layer never calls an LLM and must run in full without any external API.
4. **Embed.** Compute sentence-level and document-level embeddings (using a chosen embedding model — OpenAI, local `bge-*`, or Cohere) and persist them in pgvector.
5. **LLM semantic pass.** Pass the Markdown plus a rigorous system prompt to an LLM to classify intent, extract dominant entities, compute Semantic Relevance Score, and rank citation-worthiness. The LLM output is constrained to JSON Schema and stored verbatim.
6. **Aggregate.** Deterministic and LLM outputs are combined into the final scores from [`scoring.md`](scoring.md), written to PostgreSQL with full provenance metadata.

Stages 1–3 and 6 are **deterministic** and must succeed without any external LLM. Stages 4–5 are "intelligence" layers that enhance but never block scoring — if the LLM provider is unreachable, stages 4–5 are skipped and the scores carry a `llm_enhanced=false` flag.

---

## 4.7 Observability

Observability is not an afterthought. Every service is instrumented from day one.

- **Structured logs.** JSON logs with correlation IDs propagated from the API gateway through every worker. Aggregated via Loki or the user's logging stack of choice.
- **Traces.** OpenTelemetry traces on every request and every task. W3C trace context propagates through the BullMQ job payloads so every span from API → workers → provider calls composes into a single distributed trace.
- **Metrics.** Prometheus metrics exported by every service: request latencies, queue depths, worker saturation, crawl-rate-vs-budget, LLM cost per project.
- **Alerts.** Ship a default Prometheus alert bundle covering the obvious failure modes: queue backlog growth, worker crash loops, rising 5xx rates, sudden LLM cost spikes.
- **Cost attribution.** Every LLM or BYOK API call is tagged with `project_id` so operators can see exactly where their credits went.

---

## 4.8 Deployment shapes

The architecture supports two deployment shapes without rewrites.

### Single-node (Docker Compose)

- One `docker-compose.yml` brings up every service.
- PostgreSQL (with pgvector), Redis, and MinIO run locally.
- Extraction and analysis workers run as single replicas that auto-scale CPU usage but not instance count.
- Target Time-to-First-Value: **under 5 minutes from `git clone` to first successful audit.**

### Horizontally scaled (Kubernetes / Nomad)

- Helm charts deploy the same services as multi-replica Deployments.
- Extraction and analysis workers auto-scale based on queue depth, not CPU.
- PostgreSQL (with pgvector), Redis, and object storage are externalized to managed services of the operator's choice.
- HorizontalPodAutoscaler targets queue-depth custom metrics, not CPU saturation.

---

## 4.9 Security posture

- **Secrets handling.** No credential is ever committed. Deployments use `.env` files with strict permissions or a KMS-backed secret store; the choice is left to the operator.
- **BYOK credential isolation.** Third-party API keys (DataForSEO, OpenAI, etc.) are encrypted at rest with a project-scoped key. Workers fetch them just-in-time and never log them.
- **Tenant isolation.** Project-level RBAC is enforced at the API gateway and the query layer.
- **Supply chain.** Locked dependency versions (`pnpm-lock.yaml` / `package-lock.json`), automated Dependabot/Renovate updates, pinned Docker base images, reproducible builds.
- **Responsible crawling.** Default configuration respects `robots.txt`, sets a clear `User-Agent` string, enforces conservative rate limits, and exposes a public opt-out mechanism. SEOpen is not a stealth scraper and will not ship bypass-by-default features.

---

## 4.10 Architectural decisions (ADR index)

These are binding decisions. Long-form records live under [`adr/`](adr/); this table is the summary index. Whenever an ADR is added, superseded, or deprecated, both this table and [`adr/README.md`](adr/README.md) update in the same PR. If the two ever disagree, the ADR wins.

| #                                                     | Decision                                                   | Status   | Rationale                                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [A-001](adr/A-001-single-runtime-nodejs.md)           | Single runtime: Node.js / TypeScript                       | Accepted | One runtime across extraction, analysis, scoring, API, CLI, frontend. See §4.2.                                                   |
| [A-002](adr/A-002-bullmq-task-broker.md)              | BullMQ on Redis as the primary task broker                 | Accepted | Durable, prioritized, retryable jobs with dead-letter semantics. Removes a dedicated AMQP broker from the single-node deployment. |
| [A-003](adr/A-003-redis-url-frontier-and-cache.md)    | Redis as the URL frontier, cache, and BullMQ backing store | Accepted | Sub-millisecond latency, TTL-native, no durability required for frontier. Doubles as the BullMQ substrate.                        |
| [A-004](adr/A-004-postgres-with-pgvector.md)          | PostgreSQL + pgvector for relational data and embeddings   | Accepted | Avoids introducing a second datastore until scale forces one.                                                                     |
| [A-005](adr/A-005-s3-compatible-object-storage.md)    | S3-compatible object storage for blobs                     | Accepted | Portable across MinIO / AWS / R2 / B2. No vendor-specific APIs.                                                                   |
| [A-006](adr/A-006-fastify-api-gateway.md)             | Fastify + Zod as the API gateway                           | Accepted | Async, schema-validated, TypeScript-native; shares Zod schemas with workers and the Next.js client.                               |
| [A-007](adr/A-007-nextjs-web-frontend.md)             | Next.js for the web frontend                               | Accepted | SSR, strong ecosystem, comfortable for contributing developers. Same TypeScript toolchain as the backend.                         |
| [A-008](adr/A-008-byok-third-party-indexes.md)        | BYOK for all third-party indexes                           | Accepted | Explicit non-goal to replicate proprietary indexes.                                                                               |
| [A-009](adr/A-009-llm-optional-never-required.md)     | LLM calls optional, never required for scoring             | Accepted | Keeps deterministic core functional offline; degrades gracefully.                                                                 |
| [A-010](adr/A-010-opentelemetry-tracing.md)           | OpenTelemetry for distributed tracing                      | Accepted | Vendor-neutral standard; avoids lock-in.                                                                                          |
| [A-011](adr/A-011-robots-txt-scoring-inputs.md)       | `robots.txt` as explicit SEO + GEO scoring input           | Accepted | Formalizes the §3.1 Indexability input and introduces AI-crawler posture as a §3.6 sub-input.                                     |
| [A-012](adr/A-012-sitemap-scoring-inputs.md)          | `sitemap.xml` as explicit SEO + GEO scoring input          | Accepted | Formalizes the §3.1 Crawlability input and adds sitemap `<lastmod>` as a §3.3 Freshness source.                                   |
| [A-013](adr/A-013-llms-txt-and-geo-site-readiness.md) | `llms.txt` adoption and §3.6 GEO Site Readiness Score      | Accepted | Introduces §3.6 as the per-domain counterpart to §3.3 GEO Content Score.                                                          |

Any future deviation from these decisions requires a new ADR under [`adr/`](adr/) that supersedes the replaced entry, and a matching edit to this table in the same PR.

# Architecture

> SEOpen is a **polyglot microservices platform** designed to run on a single laptop (Docker Compose) or a horizontally scaled fleet (Kubernetes) without architectural rewrites.

This document captures the non-speculative architectural decisions that govern the codebase before a single line is merged. It is the authoritative reference for any future implementation work; deviations should be discussed in ADRs (Architecture Decision Records) rather than by silent drift.

---

## 4.1 Design principles

1. **Polyglot by necessity, not by vanity.** Node.js and Python each have irreplaceable strengths — JavaScript rendering and data/ML respectively — so both languages are first-class citizens. No other languages are in-scope for the core stack.
2. **Queue-first communication.** Services never call each other synchronously across a network boundary. All inter-service traffic flows through a message broker so that failure modes are decoupled.
3. **Deterministic core + non-deterministic leaves.** The scoring engine is deterministic and reproducible. LLM calls and headless browsers are isolated at the leaves and always produce structured, stored artifacts (Markdown, JSON) before feeding deterministic scoring.
4. **Horizontal scale from day one.** Even the single-node deployment runs every service as if it could be one of N — so growing the fleet is a configuration change, not a refactor.
5. **Observability is a first-class module.** Traces, structured logs, and metrics are wired in before feature work starts. An unobservable system is an unmaintainable system at this level of complexity.

---

## 4.2 The polyglot decision: Node.js vs. Python

Both ecosystems have mature web-scraping lineages. Neither is strictly superior. The split is chosen by matching each service to the strengths of its runtime.

### Node.js is used where the workload is JavaScript rendering

- Modern sites are React/Vue/Angular/Next.js SPAs whose final DOM exists only after JavaScript execution. Running a headless browser from Node.js means you execute JavaScript in its native runtime, with immediate access to Chrome DevTools Protocol primitives.
- **Crawlee** provides production-grade auto-scaling, session management, proxy rotation, and anti-bot handling out of the box — roughly 6–12 months of work if built from scratch.
- **Puppeteer / Playwright** give direct control over headless Chromium with tight memory and lifecycle management.
- **Lighthouse** itself is a Node.js library; driving it from Node is a first-class path, driving it from Python is an awkward subprocess dance.

### Python is used where the workload is data, NLP, and ML

- The entire Python data ecosystem (NumPy, pandas, scikit-learn, spaCy, sentence-transformers, LangChain, …) lives here. Reimplementing TF-IDF, embedding similarity, or entity recognition in Node is possible but strictly inferior.
- **FastAPI** provides a production-grade async API layer with Pydantic-driven schema validation — the right choice for the public-facing REST interface.
- **Celery** is the de facto task queue for Python and integrates cleanly with RabbitMQ/Redis.
- **Crawl4AI / Firecrawl / BeautifulSoup** handle HTML → clean Markdown conversion optimized for LLM token efficiency.

### The seam between them

The seam is always a **message broker**, never a direct HTTP call. A Node.js extraction worker publishes a message containing the rendered DOM (and pointers to blob-stored artifacts like raw HTML and Lighthouse JSON); Python analysis workers consume from that queue. This makes the polyglot split invisible to the rest of the system and trivially replaceable if future needs push a service to a different runtime.

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
                       │   Python · FastAPI · REST   │
                       │   Auth · RBAC · rate-limit  │
                       └──────┬─────────┬────────────┘
                              │         │
              enqueue jobs    │         │  read/write
                              │         │
           ┌──────────────────▼─┐    ┌──▼────────────────────────┐
           │  Task Broker       │    │      PostgreSQL            │
           │  RabbitMQ / BullMQ │    │  (users, projects, scores) │
           └────┬─────────┬─────┘    └────────────────────────────┘
                │         │
   ┌────────────▼──┐   ┌──▼────────────────────────┐
   │  Extraction   │   │  Analysis & Scoring        │
   │  Workers      │   │  Workers                   │
   │  Node · TS    │   │  Python · Celery           │
   │  Crawlee      │   │  Crawl4AI / NLP / LLM      │
   │  Puppeteer    │   │  Deterministic scoring     │
   │  Lighthouse   │   │                            │
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
                       │  rate-limit counters  │
                       └──────────────────────┘
```

### Service responsibilities

| Service | Language | Runs as | Responsibilities |
| --- | --- | --- | --- |
| **Web Frontend** | TypeScript (Next.js) | Long-running web server | Dashboards, project config UI, report rendering, exports. Server-side rendering for first-byte performance. |
| **API Gateway** | Python (FastAPI) | Long-running web server | Auth (JWT/OAuth), RBAC, request validation, rate limiting, enqueue jobs, aggregate read-only queries. |
| **Extraction Workers** | Node.js / TypeScript | Auto-scaled pool | Pull crawl tasks, drive headless browsers, run Lighthouse, persist raw HTML + Lighthouse JSON to object storage, emit analysis tasks. |
| **Analysis Workers** | Python (Celery) | Auto-scaled pool | Pull analysis tasks, transform HTML → Markdown, compute deterministic scores, run LLM-backed semantic analyses, persist scores. |
| **Scheduler** | Python | Long-running | Fires time-based runs (daily crawl, weekly GEO sweep) onto the broker. |
| **Task Broker** | RabbitMQ (primary) | Infra | Routes tasks between services with durable queues, dead-letter queues, and priority classes. |
| **Redis** | Redis | Infra | URL frontier (sets / bloom filters), per-domain rate limits, ephemeral caches, session stores. |
| **PostgreSQL** | PostgreSQL | Infra | Source of truth for users, projects, scores, historical trends, audit log. |
| **Object Storage** | S3-compatible (MinIO for self-host) | Infra | Raw HTML, Markdown exports, Lighthouse JSON, PDF reports. |

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

| Data type | Store | Why |
| --- | --- | --- |
| Users, projects, permissions | PostgreSQL | ACID, relational integrity, strong query planner. |
| Scores, sub-scores, historical trends | PostgreSQL (time-series friendly schema) | Easy aggregations, joins to projects/URLs, reliable backup story. |
| Crawl metadata, URL catalog, issue backlog | PostgreSQL | Needs joins and filters, natural fit for a relational schema. |
| Raw HTML, Markdown, Lighthouse JSON, PDFs | Object storage (S3 / MinIO) | Large, opaque blobs. Cheap, durable, horizontally scalable. |
| URL frontier, rate-limit counters, session state | Redis | Sub-millisecond latency, TTL-native, no durability required. |
| Embeddings for SRS / semantic gap analysis | pgvector (PostgreSQL extension) | Keeps embeddings next to the project data for efficient joins. Avoids introducing a separate vector DB until scale forces it. |

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
- **Traces.** OpenTelemetry traces on every request and every task. Distributed tracing spans crossing the Node ↔ Python boundary via W3C trace context propagated through the broker headers.
- **Metrics.** Prometheus metrics exported by every service: request latencies, queue depths, worker saturation, crawl-rate-vs-budget, LLM cost per project.
- **Alerts.** Ship a default Prometheus alert bundle covering the obvious failure modes: queue backlog growth, worker crash loops, rising 5xx rates, sudden LLM cost spikes.
- **Cost attribution.** Every LLM or BYOK API call is tagged with `project_id` so operators can see exactly where their credits went.

---

## 4.8 Deployment shapes

The architecture supports two deployment shapes without rewrites.

### Single-node (Docker Compose)

- One `docker-compose.yml` brings up every service.
- PostgreSQL, Redis, RabbitMQ, and MinIO run locally.
- Extraction and analysis workers run as single replicas that auto-scale CPU usage but not instance count.
- Target Time-to-First-Value: **under 5 minutes from `git clone` to first successful audit.**

### Horizontally scaled (Kubernetes / Nomad)

- Helm charts deploy the same services as multi-replica Deployments.
- Extraction and analysis workers auto-scale based on queue depth, not CPU.
- PostgreSQL, Redis, RabbitMQ, and object storage are externalized to managed services of the operator's choice.
- HorizontalPodAutoscaler targets queue-depth custom metrics, not CPU saturation.

---

## 4.9 Security posture

- **Secrets handling.** No credential is ever committed. Deployments use `.env` files with strict permissions or a KMS-backed secret store; the choice is left to the operator.
- **BYOK credential isolation.** Third-party API keys (DataForSEO, OpenAI, etc.) are encrypted at rest with a project-scoped key. Workers fetch them just-in-time and never log them.
- **Tenant isolation.** Project-level RBAC is enforced at the API gateway and the query layer.
- **Supply chain.** Locked dependency versions (`package-lock.json`, `poetry.lock`), automated Dependabot/Renovate updates, pinned Docker base images, reproducible builds.
- **Responsible crawling.** Default configuration respects `robots.txt`, sets a clear `User-Agent` string, enforces conservative rate limits, and exposes a public opt-out mechanism. SEOpen is not a stealth scraper and will not ship bypass-by-default features.

---

## 4.10 Architectural decisions recorded here (ADR-lite)

These are binding decisions. They live here instead of a dedicated ADR folder until the codebase exists.

| # | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A-001 | Polyglot: Node.js for extraction, Python for analysis | Accepted | Match runtime to workload; see §4.2. |
| A-002 | RabbitMQ as the primary task broker | Accepted | Durable queues, priority support, mature tooling. Redis Pub/Sub is insufficient. |
| A-003 | Redis as the URL frontier & cache | Accepted | Speed and TTL semantics. No persistence required for frontier. |
| A-004 | PostgreSQL + pgvector for relational + embeddings | Accepted | Avoids a second datastore until scale forces one. |
| A-005 | S3-compatible object storage for blobs | Accepted | Portable across MinIO / AWS / R2 / B2. |
| A-006 | FastAPI as the API gateway | Accepted | Async, Pydantic-native, best fit with the Python analysis stack. |
| A-007 | Next.js for the web frontend | Accepted | SSR, strong ecosystem, comfortable for contributing developers. |
| A-008 | BYOK for all third-party indexes | Accepted | Explicit non-goal to replicate proprietary indexes. |
| A-009 | LLM calls optional, never required for scoring | Accepted | Keeps deterministic core functional offline; degrades gracefully. |
| A-010 | OpenTelemetry for distributed tracing | Accepted | Cross-language standard; avoids vendor lock-in. |

Any future deviation from these decisions requires a written ADR and explicit deprecation of the replaced entry.

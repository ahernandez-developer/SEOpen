# Data Integrations

> SEOpen does not own a global index of the web. It **rents** that index from third-party providers under a bring-your-own-key (BYOK) model, and it pairs that rented data with its own self-executed crawl for owned / audited domains.

This document catalogs the integration surface: which providers are supported, what data they contribute, how credentials are handled, and the contract between SEOpen's internal data model and any provider-specific shape.

---

## 5.1 Why BYOK

Global indexes of the open web — backlink graphs, keyword volumes, historical SERP data — require continuous crawling of billions of pages. Replicating that is structurally incompatible with an open-source project, so SEOpen does not try.

SEOpen takes the explicit stance:

- **Auditing owned/target domains** → SEOpen's own crawler (you already have permission; the data is yours).
- **Global index data (volumes, backlinks, historical SERPs)** → rented from providers via BYOK.

Under BYOK, the user:

1. Creates an account with a provider (DataForSEO, SerpApi, etc.).
2. Generates an API key.
3. Pastes it into SEOpen's provider configuration screen.
4. Pays the provider directly at whatever pricing the provider offers.

SEOpen never brokers, marks up, or proxies provider usage. Every byte of billable traffic flows under the user's own credentials.

---

## 5.2 Integration categories

Providers are grouped by the type of data they contribute. SEOpen's internal data model is provider-agnostic — multiple providers can contribute the same category, and users may select one or mix.

| Category | What it provides | Example providers |
| --- | --- | --- |
| **All-in-one SEO data** | Keyword volumes, SERPs, backlinks, domain metrics, competitor data — in a single contract. | DataForSEO, SE Ranking |
| **SERP scraping** | Real-time, unvarnished SERP results including AI Overviews, local packs, featured snippets. | SerpApi, Zenserp, ScaleSERP |
| **Backlink intelligence** | Referring domains, anchors, link velocity, historical backlinks. | DataForSEO, Semrush API, Ahrefs API |
| **Keyword research** | Volume, difficulty, CPC, SERP features, related queries, question queries. | DataForSEO, Semrush API, SE Ranking |
| **Generative AI** | Semantic analysis, prompt submission, citation extraction, embedding generation. | OpenAI, Anthropic Claude, Google AI, Perplexity API, local models via Ollama |
| **Core Web Vitals (field data)** | Real user CrUX metrics beyond lab Lighthouse runs. | CrUX API (free, rate-limited) |

---

## 5.3 Primary providers (MVP)

These are the providers SEOpen commits to supporting in the first stable release. Others may be added community-contributed, but these are the ones covered by the core team.

### DataForSEO

- **Category:** All-in-one (keywords, SERPs, backlinks, domain research).
- **Pricing model:** Pay-as-you-go; no monthly subscription floor.
- **Strengths:** Broadest API surface of any BYOK provider. Wholesale pricing at the credit level suits indie developers. Enterprise-grade data quality.
- **Weaknesses:** Complex schema; SEOpen's adapter layer exists to hide the complexity from end users.
- **Role in SEOpen:** The **default** and most deeply integrated provider. All core keyword, backlink, and SERP features work end-to-end against DataForSEO.

### SerpApi

- **Category:** SERP scraping.
- **Pricing model:** Monthly tiers (free tier for experimentation, paid tiers for production volume).
- **Strengths:** Fast, reliable, parses AI Overviews, PAA, shopping packs, etc. Especially useful for local-SEO verification and high-frequency rank tracking.
- **Role in SEOpen:** Alternative or complementary SERP source for real-time lookups, especially for features DataForSEO reports with delay.

### SE Ranking

- **Category:** All-in-one, leaning technical auditing.
- **Pricing model:** Subscription, from ~$119/month.
- **Strengths:** Mature technical auditing, dependable domain visibility metrics, good value for small agencies already on the platform.
- **Role in SEOpen:** Supported for users who already have a subscription and want to consolidate tooling. Not required.

### Semrush API

- **Category:** Enterprise all-in-one.
- **Pricing model:** Expensive — ~$416/month baseline plus per-API-unit costs.
- **Strengths:** The gold standard for historical backlink data and competitive intelligence.
- **Role in SEOpen:** Supported for enterprise users who already hold a Semrush API key. SEOpen will never require it.

### OpenAI / Anthropic / Perplexity / Google

- **Category:** Generative AI providers.
- **Pricing model:** Pay-as-you-go, per-token.
- **Role in SEOpen:** These are the AI engines SEOpen queries for **empirical AI visibility tracking** and the LLMs SEOpen uses for **semantic analysis** (Semantic Relevance Score, entity extraction, prompt expansion).

Users must supply at least one generative provider to use the GEO Checker's full capabilities. SEOpen's analysis pipeline is deliberately designed so that **the deterministic sub-scores still compute without any generative provider configured**, but the AI visibility and SRS sub-scores will be absent or degraded.

### Local models (Ollama, LM Studio)

- **Category:** Generative AI, but local.
- **Pricing model:** Zero operational cost (user provides compute).
- **Role in SEOpen:** Supported as a first-class alternative to hosted LLM providers for privacy-sensitive users. Embedding generation and semantic scoring can run entirely against a local `bge-*` or Llama-family model.

---

## 5.4 Provider adapter contract

Every provider is wrapped in an **adapter** — a thin internal module that maps the provider's native response shape onto SEOpen's internal, provider-agnostic data model. The adapter contract is:

```python
class Provider:
    name: str                        # e.g. "dataforseo"
    category: set[IntegrationCategory]

    def health_check(self) -> HealthStatus: ...
    def get_keyword_metrics(req: KeywordRequest) -> KeywordMetrics: ...
    def get_serp(req: SerpRequest) -> SerpResult: ...
    def get_backlinks(req: BacklinkRequest) -> BacklinkResult: ...
    def get_domain_overview(req: DomainRequest) -> DomainOverview: ...
    # ... etc.
```

The adapter layer enforces:

1. **Caching.** Every adapter call is cached in Redis with a TTL derived from the semantics of the request (SERPs: short TTL; keyword volumes: long TTL).
2. **Rate limiting.** Per-project and per-provider rate limiters enforce provider-specific quotas before any outbound call is made.
3. **Credit metering.** Every call records an estimated unit cost to the project's internal ledger so operators can audit exactly which run consumed which credits.
4. **Error normalization.** Provider-specific errors are mapped onto a common error taxonomy (`Unauthorized`, `QuotaExceeded`, `NotFound`, `ServiceUnavailable`, `Unknown`).
5. **Observability.** Every outbound call is wrapped in an OpenTelemetry span tagged with provider, project, and credit cost.

When a new provider is added (internal or community-contributed), it is simply another implementation of this contract. No other code in the system learns new shapes.

---

## 5.5 Credential handling

### Storage

- Keys are stored in PostgreSQL, **encrypted at rest** via a per-project symmetric key derived from the root encryption key.
- The root key is provisioned at deployment time via environment variables or a cloud KMS, at the operator's discretion.
- Decrypted keys live only in worker process memory for the lifetime of a single task.

### Rotation

- Users may rotate keys at any time from the project configuration UI.
- Old keys are kept for audit but marked inactive; they are never reused.
- Audit log entries are created for every key creation, rotation, and deletion event.

### Redaction

- Logs, traces, and error reports automatically redact any field matching a configurable set of secret patterns.
- Error messages returned from providers are captured verbatim but scrubbed before being surfaced in the UI.

---

## 5.6 Cost controls

Running global-index queries can generate surprising cost spikes if left unchecked. SEOpen ships with cost-control primitives enabled by default:

- **Per-project daily cap.** A configurable hard cap on total provider spend per project per day. When hit, affected tasks fail with an explicit `QuotaCapped` error that the UI surfaces clearly.
- **Pre-flight cost estimation.** Scheduled or large one-off runs (e.g. "audit 50,000 URLs against DataForSEO") display an estimated credit cost before the user confirms.
- **Anomaly alerts.** A simple moving-average alarm on daily spend flags sudden spikes to the project owner.
- **Degraded-mode fallback.** If a provider is unreachable or the project is capped, SEOpen still returns all **self-crawl** data and clearly marks which sub-scores are missing.

---

## 5.7 Community-contributed providers

Once the adapter contract is stable, SEOpen accepts community-contributed provider implementations via the normal contribution process ([`community.md`](community.md)). Expected reviewer checklist:

- Conforms to the `Provider` contract.
- Includes integration tests against a recorded response fixture set (not against live APIs, to avoid CI quota burn).
- Documents rate limits, credit accounting, and pricing in `docs/providers/<name>.md`.
- Declares any required configuration in the central provider config schema.
- Includes a health-check implementation that does not consume paid credits.

No adapter is merged that violates credential-handling rules in §5.5.

---

## 5.8 What SEOpen refuses to integrate

For clarity: SEOpen will not ship integrations that:

- Require the user to share raw account credentials (username/password) instead of API keys.
- Scrape providers that prohibit automated access in their terms of service.
- Re-sell provider data by embedding shared credentials in the shipped codebase.
- Mask provider rate-limit violations by routing through residential proxies to disguise origin.

These are boundary conditions, not judgments on the providers themselves. Any integration must pass both a technical and a contractual review.

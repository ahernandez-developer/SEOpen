# A-009 — LLM calls are optional, never required for scoring

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, scoring, integrations, llm

## Context

Generative AI providers are central to SEOpen's **AI Visibility & GEO Checker** ([`../modules.md`](../modules.md) §2). They power empirical citation tracking (querying ChatGPT, Claude, Perplexity, Google AI about user-defined prompt clusters) and semantic scoring (Semantic Relevance Score §3.2.4, entity extraction, intent classification).

But generative APIs share three structural weaknesses that make them unsuitable as **required** dependencies of any deterministic score:

1. **Availability variance.** Provider outages and model-specific incidents are common enough to be a design concern; a scoring engine that fails during an outage is unusable during exactly the windows operators most want data.
2. **Cost volatility.** Per-token pricing changes, model deprecations, and quota policies shift on weeks-to-months timelines. A hard LLM requirement gives providers unilateral control over SEOpen's operating cost.
3. **Reproducibility.** LLM outputs are non-deterministic at any non-zero temperature and non-reproducible across model versions. Embedding a mandatory LLM call inside a deterministic score would make that score non-reproducible by construction — a direct contradiction of [`../scoring.md`](../scoring.md) §3.4 (provenance & versioning).

[A-008](A-008-byok-third-party-indexes.md) already commits SEOpen to BYOK for every third-party index, including generative providers. The complementary question is: what happens to scoring when the user has supplied **no** generative credentials at all? That question must have an answer that leaves the system genuinely useful.

## Decision

The scoring engine **must compute valid outputs for every score without any LLM configured**. LLM calls are an optional "intelligence" layer that enhances specific sub-scores but is never required for the engine to produce a result.

Concretely:

- The deterministic core ([`../architecture.md`](../architecture.md) §4.6 stages 1–3 and 6) runs entirely offline. It computes every sub-score that depends only on the crawled DOM, HTTP metadata, Lighthouse JSON, and parsed structure.
- The semantic layer (stages 4–5) is gated on a configured generative provider. If none is configured, or the configured provider is unavailable, semantic sub-scores (Semantic Relevance Score §3.2.4, LLM-assisted entity extraction, prompt expansion) are skipped. The affected runs persist their results with an `llm_enhanced=false` flag and the corresponding sub-scores are marked explicitly as `unavailable` rather than filled with zeros or stubbed values.
- The public API and dashboards distinguish `unavailable` from `0` clearly. A sub-score that is absent because no LLM was configured looks nothing like a sub-score that is present at 0.
- The Phase 2 roadmap quality gate enforces this in CI: every scoring test suite must run with zero generative providers configured and produce valid, non-zero, non-error outputs for all deterministic sub-scores.

## Consequences

### Positive

- SEOpen works on day one with no AI account, on a laptop, behind a corporate firewall. The deterministic SEO and technical-GEO surface is immediately usable.
- Operators with strict privacy or compliance requirements (no data leaving the environment) can run SEOpen end-to-end with local-only models or with the semantic layer disabled entirely. Local LLMs via Ollama or LM Studio integrate through the same adapter boundary as hosted providers.
- Provider outages are gracefully degrading events, not total failures.
- Historical score time series remain meaningful: a score computed with an LLM last week is comparable to one computed without an LLM this week if the comparison scope is restricted to deterministic sub-scores, which is an available view on the dashboard.
- Reproducibility of the deterministic core is architecturally guaranteed — you can always rerun the same deterministic pipeline against the same raw HTML and get the same numbers.

### Negative / trade-offs

- The AI Visibility & GEO Checker module is substantially less powerful without a generative provider configured. Users who want the full surface must configure at least one provider. This is documented prominently in [`../data-integrations.md`](../data-integrations.md) §5.3.
- Maintaining two code paths (with-LLM / without-LLM) increases test-matrix surface. Mitigation: the adapter boundary is narrow, and tests treat "no provider" as a first-class configuration, not an edge case.

### Neutral

- The embedding layer (pgvector per [A-004](A-004-postgres-with-pgvector.md)) can run against `@xenova/transformers` locally when no hosted embedding provider is configured. This keeps the Semantic Relevance sub-score available in "deterministic-ish" mode at reduced quality, which [`../scoring.md`](../scoring.md) §3.2.4 labels clearly.

## Alternatives considered

- **LLM required for scoring.** Rejected. Breaks reproducibility ([`../scoring.md`](../scoring.md) §3.4), breaks self-host TTFV, and gives providers unilateral control over the engine.
- **LLM-only scoring (no deterministic core).** Rejected. Makes every score a black box and contradicts [`../vision.md`](../vision.md)'s "no black boxes" value.
- **Silent zero-filling of missing sub-scores.** Rejected. Indistinguishable from a real zero, and historical charts would be misleading. Explicit `unavailable` status is the honest path.
- **Hard-coding a default provider (e.g. always use OpenAI).** Rejected. Contradicts [A-008](A-008-byok-third-party-indexes.md) vendor-neutrality and would bake a particular provider into the core.

## References

- [`../architecture.md` §4.6 Analysis pipeline](../architecture.md) — stages 1–3 and 6 deterministic, stages 4–5 optional.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-009.
- [`../scoring.md` §3.4 Scoring provenance & versioning](../scoring.md) — the reproducibility guarantee this ADR protects.
- [`../roadmap.md`](../roadmap.md) Phase 2 quality gate — "scores computed without any LLM configured still produce valid outputs".
- [`../data-integrations.md` §5.3, §5.6](../data-integrations.md) — provider configuration + degraded-mode fallback.
- [A-008](A-008-byok-third-party-indexes.md) — BYOK decision this ADR depends on.

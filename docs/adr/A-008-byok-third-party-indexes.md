# A-008 — Bring-your-own-key for all third-party indexes

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, integrations, data, business-model

## Context

SEOpen audits the properties the user already has permission to crawl — their own sites, their competitors' public sites, their client portfolios. That layer scales on infrastructure SEOpen itself operates.

But three capability families require data that can only come from a **global index of the open web**:

1. **Keyword research** — search volume, difficulty, SERP features, competitor keyword gaps.
2. **Backlink intelligence** — referring domains, anchor text, link velocity, historical backlinks.
3. **SERP scraping** — live SERP results including AI Overviews, PAA, local packs, shopping carousels.

Replicating any of these at scale means continuously crawling billions of pages and maintaining a historical snapshot. That is a multi-tens-of-millions-of-dollars undertaking — structurally incompatible with an open-source, self-hostable project ([`../vision.md`](../vision.md) non-goals; [`../data-integrations.md`](../data-integrations.md) §5.1).

In parallel, the generative AI visibility module ([`../modules.md`](../modules.md) §2 sub-module A) and the semantic analysis pipeline depend on access to LLM APIs and embedding models, which are services rented from providers at per-token pricing.

Two feasible monetization postures emerge:

- **Shared credentials.** SEOpen operators share a key and mark up the data. Typical SaaS pattern. Requires SEOpen to broker bytes, settle with providers, police abuse, and maintain enterprise accounts with every provider.
- **BYOK.** Users bring their own credentials for every third-party data source. SEOpen never sees the bytes; the user pays the provider directly.

## Decision

SEOpen is **BYOK for every third-party index and AI provider**. Users supply their own API credentials for DataForSEO, SerpApi, SE Ranking, Semrush, OpenAI, Anthropic, Perplexity, Google AI, local LLM runtimes, and any community-contributed provider. SEOpen never proxies, brokers, or marks up provider traffic. Every byte of billable usage flows under the user's own credentials.

Any future hosted offering built on top of SEOpen may choose a different posture, but the open-source core remains BYOK. No provider's SDK is built into the core in a way that couples users to a specific vendor; every provider is reached through the adapter contract documented in [`../data-integrations.md`](../data-integrations.md) §5.4.

## Consequences

### Positive

- **Sustainable at any scale.** SEOpen never sees provider bills. Laptop deployments and fleet deployments use the same credential model.
- **Aligns incentives.** Users pay for exactly the data they request; operators see provider bills directly and can optimize their own usage.
- **Vendor-neutral.** Multiple providers per category are supported side by side; users mix and match without SEOpen refereeing.
- **Legally cleaner.** SEOpen does not redistribute proprietary data, does not share API keys, does not proxy traffic that might violate a provider's ToS.
- **Self-host consistent.** The same BYOK posture powers free self-hosters and future paid deployments; no feature forking between editions.

### Negative / trade-offs

- **Higher friction for non-technical users.** Creating accounts at DataForSEO, OpenAI, Anthropic, etc. is paperwork a marketing team may not want to do. Mitigation: the UI surfaces account creation links, one-click key testing, and cost pre-flight estimation ([`../data-integrations.md`](../data-integrations.md) §5.6).
- **Cost transparency must be ruthless.** Users paying providers directly need accurate pre-flight cost estimates and runaway-spend protection. Mitigation: every adapter is credit-metered, caps apply per-project per-day, anomaly alerts fire on sudden spikes ([`../data-integrations.md`](../data-integrations.md) §5.6).
- **Onboarding cannot depend on any one provider.** SEOpen must remain useful without any third-party key configured (self-crawl + deterministic scoring should always work), matching [A-009](A-009-llm-optional-never-required.md)'s scoring principle.

### Neutral

- **Future hosted offering.** Nothing in this ADR precludes a commercial SaaS hosted on top of SEOpen where the operator abstracts BYOK behind platform credits. That is a business-model choice for that offering; the OSS core does not change.

## Alternatives considered

- **Replicate the global index.** Rejected. Explicit non-goal in [`../vision.md`](../vision.md). Structurally incompatible with OSS economics.
- **Broker-and-markup model.** Rejected. Requires SEOpen to maintain enterprise accounts, police abuse, and run billing — all major scope expansions away from the stated mission.
- **Hosted-key SaaS only.** Rejected. Would eliminate the self-host-first promise that anchors [`../overview.md`](../overview.md) and [`../vision.md`](../vision.md).
- **"Shared demo key" for onboarding.** Rejected. Would inevitably be abused, fail to scale, and create a support burden out of proportion to its onboarding value. The UI instead emphasizes "how to get your first key in 60 seconds" tutorials.

## References

- [`../vision.md` non-goals](../vision.md) — "not a global index of the open web".
- [`../data-integrations.md` §5](../data-integrations.md) — the entire integrations chapter is the operational expression of this ADR.
- [`../architecture.md` §4.9 Security posture](../architecture.md) — BYOK credential isolation.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-008.
- [A-009](A-009-llm-optional-never-required.md) — complementary decision: core scoring must not require any BYOK provider.

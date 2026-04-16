# Roadmap

> **Principle.** The roadmap is organized by **capability**, not by deployment strategy or calendar. Each phase exits when its target features are implemented, documented, and tested. Phases may overlap if clearly separable workstreams are in flight.

The phase numbering is stable. New scope is appended to later phases; never inserted into earlier ones.

---

## Phase 0 — Foundation (current)

The project's *ideas* become publicly legible and contributable.

**Exit criteria:**

- [x] Strategic blueprint archived (`Open-Source Semrush Alternative Blueprint.md`).
- [x] `README.md` published with clear project positioning and a documentation map.
- [x] Foundation documentation set complete under `docs/` (this document is part of that set).
- [x] `LICENSE` added to the repository root.
- [x] `CONTRIBUTING.md` published and linked from the README.
- [ ] Initial GitHub issue templates. *(descoped from Phase 0; will land alongside Phase 1 if demand materializes.)*
- [ ] Public Discord or GitHub Discussions space open. *(descoped from Phase 0; GitHub Issues / private CoC channel cover the minimum for now.)*
- [x] First ADR directory (`docs/adr/`) with the decisions from [`architecture.md`](architecture.md) §4.10 as individually dated records.
- [x] `CODE_OF_CONDUCT.md` adopted.

**Out of scope for Phase 0:** any code. The phase ends when the foundation documentation is stable and the project is ready to accept its first contributions.

---

## Phase 1 — Technical SEO Auditor MVP

The first end-to-end feature set. A user can point SEOpen at a domain and receive a Technical SEO Score with actionable findings.

**Feature exit criteria:**

- [ ] Seed-crawl a domain breadth-first, respecting `robots.txt`, `sitemap.xml`, and per-domain rate limits.
- [ ] Render JavaScript-heavy pages through a headless browser and extract the final DOM.
- [ ] Run Lighthouse against every crawled URL and persist the full report.
- [ ] Validate structured data (Open Graph, Twitter Cards, Schema.org JSON-LD).
- [ ] Build an internal link graph and detect orphan pages, redirect chains, and canonical conflicts.
- [ ] Classify every HTTP response and surface 4xx/5xx anomalies.
- [ ] Compute the full **SEO Score** as defined in [`scoring.md`](scoring.md) §3.1, including all four sub-scores: Content Quality, Technical Infrastructure, User Experience, Authority & Trust.
- [ ] Persist scored runs with full provenance (formula version, inputs, timestamps).
- [ ] Dashboard renders SEO Score and sub-scores with drill-down into contributing issues.
- [ ] Single-command local deployment for a developer to run the full stack end-to-end.

**Quality gates:**

- [ ] First end-to-end audit runnable by an independent user in under five minutes.
- [ ] At least one BYOK data provider integration working for the Authority & Trust sub-score.
- [ ] Documentation: quickstart, configuration reference, troubleshooting guide.

**Explicitly out of scope for Phase 1:** GEO Checker, gap analysis, scheduled runs, multi-project support, alerting, API, exports.

---

## Phase 2 — AI Visibility & GEO Checker

The module that turns SEOpen into a dual-discipline platform. Technical SEO alone is table stakes; GEO is the differentiator.

**Feature exit criteria:**

- [ ] **Predictive GEO Content Scoring** as defined in [`scoring.md`](scoring.md) §3.3, applied to arbitrary URLs on demand.
  - [ ] Factual density analysis (statistics, hyperlinked primary sources, numerical data points).
  - [ ] Semantic chunking analysis (heading hierarchy, lists, tables, comparison blocks, FAQ sections).
  - [ ] Authority signal detection (expert quotations, bylines, outbound links to primary research).
  - [ ] Freshness signal detection (timestamps, schema dates, sitemap last-mod entries).
  - [ ] Conversational tone and readability scoring.
- [ ] **Empirical AI Visibility Tracking** — query real generative engines for defined prompt clusters and extract brand citations.
  - [ ] Prompt bank configuration per project.
  - [ ] Multi-engine submission (at minimum two of: OpenAI, Anthropic, Perplexity, Google AI).
  - [ ] Citation extraction from natural-language responses.
  - [ ] All four KPIs computed: AIGVR, CER, AECR, SRS.
  - [ ] Contextual Citation Density (CCD) computed as an early-warning metric.
- [ ] **AI Visibility Score** computed as defined in [`scoring.md`](scoring.md) §3.2.
- [ ] Per-page GEO Content Score with actionable remediation recommendations mapped to specific sub-scores.
- [ ] Historical time series for every GEO metric, per brand, per prompt cluster, per engine.
- [ ] Dashboard views for GEO metrics alongside SEO Score.

**Quality gates:**

- [ ] Scores computed without any LLM configured still produce valid outputs — LLM-dependent sub-scores are cleanly marked as unavailable rather than blocking the run.
- [ ] At least one local-LLM integration (Ollama) documented and tested end-to-end for privacy-sensitive users.

---

## Phase 3 — Keyword & Content Gap Analyzer

The research and competitive-intelligence layer that tells users *what* to create next.

**Feature exit criteria:**

- [ ] **Classical keyword research.**
  - [ ] Keyword discovery seeded by domain, URL, or topic via BYOK providers.
  - [ ] Search volume, difficulty, CPC, SERP features, and intent classification per keyword.
  - [ ] Competitor keyword gap analysis.
  - [ ] SERP feature analysis (featured snippets, PAA, AI Overview, local pack, shopping).
- [ ] **GEO prompt research.**
  - [ ] LLM-assisted prompt expansion from seed keywords into conversational long-tail prompts.
  - [ ] Prompt-level visibility checks (submitted through the Phase 2 AI Visibility pipeline).
  - [ ] Prompt gap analysis identifying competitor-cited prompts where the user is absent.
- [ ] **Structural content gap recommendations.**
  - [ ] Side-by-side comparison of the user's nearest page against cited competitor content.
  - [ ] Concrete deltas: missing comparison tables, missing statistics, stale timestamps, missing FAQ blocks, missing bylines.
  - [ ] Each recommendation mapped to a GEO Content Score sub-category so users can estimate impact before making changes.

**Quality gates:**

- [ ] Gap analyzer runs against any supported BYOK provider that exposes the required data surface.
- [ ] Recommendations are reproducible: re-running against the same input produces the same output.

---

## Phase 4 — Reporting, scheduling, and integration surface

The features that turn an ad-hoc audit tool into a workflow-integrated platform.

**Feature exit criteria:**

- [ ] **Scheduled runs.** Cron-based schedules for any audit, crawl, or visibility check at per-project granularity, with run history.
- [ ] **Alerts.** User-defined thresholds on any metric, delivered via webhook, email, or Slack.
- [ ] **Exports.** CSV, JSON, and PDF exports for every report. PDF exports carry per-project branding.
- [ ] **Public REST API.** Every report, score, and configuration object accessible programmatically with complete OpenAPI documentation.
- [ ] **Webhooks.** Outbound webhooks on score changes, crawl completion, issue creation.
- [ ] **Multi-project dashboards.** Portfolio view across multiple projects with side-by-side comparisons.
- [ ] **Audit log.** Every configuration change, scheduled run trigger, and scoring change logged with user attribution.

**Quality gates:**

- [ ] API documented with executable examples for every endpoint.
- [ ] Exports verified for data integrity against the underlying report.

---

## Phase 5 — Advanced analysis and research

Features that push past parity and into novel territory.

**Feature exit criteria:**

- [ ] **Semantic index of owned content.** Users build a private semantic index of their own content and run "what-if" prompt simulations against it before publication.
- [ ] **Prompt-driven A/B testing.** Measure whether structural content changes causally increase AI citation rates, with a rigorous experimental framework.
- [ ] **Multilingual and regional analysis.** First-class support for non-English markets, including language-aware readability, entity extraction, and regional SERP differences.
- [ ] **Competitor monitoring.** Continuous tracking of competitor content changes and their effect on observed AI citations.
- [ ] **Scoring methodology research surface.** Publish aggregated (opt-in, anonymized) data patterns that improve the understanding of AI citation behavior.

---

## Phase 6 — Extensibility

Features that let the community build on top of SEOpen without forking the core.

**Feature exit criteria:**

- [ ] **Plugin SDK.** Third-party modules can extend the crawler, the scoring engine, and the UI through documented interfaces.
- [ ] **Custom audits.** Users can write and register their own Lighthouse-style audits against their own content rules.
- [ ] **Custom scoring formulas.** Power users can override or extend sub-score weights and formulas on a per-project basis, with full provenance tracking so custom formulas are versioned alongside defaults.
- [ ] **Integration marketplace.** A directory listing community-contributed providers, plugins, and integrations.

---

## Non-goals

Listing these explicitly prevents scope drift. SEOpen will not ship:

- A global backlink index built from scratch (the project uses BYOK providers for that data).
- A paid-ads / PPC analysis module.
- A hosted AI content generator.
- A replacement for Google Search Console or Google Analytics on owned properties.
- Stealth / anti-bot bypass crawling features.

---

## How the roadmap evolves

- **Changes to this document** are made via pull request. Significant changes are accompanied by an ADR under `docs/adr/`.
- **New phases** are appended only when prior phases have fully exited their criteria.
- **Scope within a phase** may be trimmed if honest assessment shows it threatens the exit gate, but the gate itself does not move without an ADR.

# SEOpen

> An open-source, self-hostable platform for **Search Engine Optimization (SEO)** and **Generative Engine Optimization (GEO)** — built for the era where LLMs synthesize answers instead of returning ten blue links.

SEOpen unifies traditional technical SEO auditing with AI-visibility tracking across generative engines (Google AI Overviews, ChatGPT, Perplexity, Claude, etc.). It is free, self-hostable, and uses a **bring-your-own-key (BYOK)** model for third-party data providers.

---

## Why SEOpen exists

The digital discovery ecosystem is shifting from algorithmic retrieval to generative synthesis. Up to **83% of queries that trigger AI summaries result in zero outbound clicks**, and Gartner projects traditional search volume to decline another **25% by 2026**. The classic SEO playbook — optimize for rank, earn the click — is no longer sufficient.

SEOpen is built on three convictions:

1. **Teams need one tool that measures both SEO *and* GEO**, not two disconnected stacks.
2. **The methodology itself must be open.** Scoring formulas, weightings, and algorithms are documented in `/docs` — not hidden behind a "black box".
3. **Self-hosting should be first-class.** Run the full stack on your own infrastructure with one command.

---

## What's inside

| Module | Purpose |
| --- | --- |
| **Technical SEO & Performance Auditor** | Full-domain crawling, Lighthouse/Core Web Vitals, structured data validation, internal link equity, redirect/status analysis. |
| **AI Visibility & GEO Checker** | Tracks brand/entity mentions across generative engines. Scores factual density, semantic chunking, freshness, and citation-worthiness. |
| **Keyword & Content Gap Analyzer** | Traditional keyword research augmented with **GEO prompt gap analysis** — identifies long-tail LLM prompts where you fail to appear as a cited source. |
| **Scoring Engine** | Deterministic composite scores: SEO Score (0–100) and AI Visibility Score built from AIGVR, CER, AECR, and SRS sub-metrics. |

Full module specifications live in [`docs/modules.md`](docs/modules.md).

---

## Project status

**Phase: Foundation / pre-alpha.** This repository currently contains:

- The original strategic blueprint (`Open-Source Semrush Alternative Blueprint.md`)
- The foundation documentation set under [`docs/`](docs/)

No production code has been merged yet. The foundation documents are the authoritative source for architecture decisions, scoring math, and roadmap. See [`docs/roadmap.md`](docs/roadmap.md) for what ships first.

---

## Documentation

The full foundation documentation set lives under [`docs/`](docs/). Start with the index:

**→ [docs/README.md](docs/README.md)**

At a glance:

- [**Overview**](docs/overview.md) — executive summary
- [**Vision**](docs/vision.md) — why SEOpen exists
- [**Modules**](docs/modules.md) — what the platform ships
- [**Scoring**](docs/scoring.md) — every score, every formula
- [**Architecture**](docs/architecture.md) — polyglot services, queues, storage
- [**Data Integrations**](docs/data-integrations.md) — BYOK providers
- [**Roadmap**](docs/roadmap.md) — phased delivery plan
- [**Community**](docs/community.md) — governance and contribution
- [**Glossary**](docs/glossary.md) — terminology reference

---

## Guiding principles

- **Transparency over magic.** Every score is a documented formula. No opaque "authority index".
- **Composable over monolithic.** Each module is independently useful and independently replaceable.
- **Self-hostable.** The full stack runs on your own infrastructure with one command. No cloud dependency required to boot.
- **BYOK by default.** You supply your own API keys for third-party data providers and pay them directly.
- **GEO-native, not GEO-retrofit.** The data model and crawler are designed for AI-era signals from day one.

---

## License

SEOpen is released under the **[MIT License](LICENSE)**. You are free to self-host, modify, fork, and redistribute the software under the terms of the license.

Contributions are accepted under a Contributor License Agreement (CLA). See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

---

## Origin

SEOpen began as a research blueprint — `Open-Source Semrush Alternative Blueprint.md` in the repository root — distilled into the foundation documentation set on **2026-04-15**. That blueprint remains archived verbatim for historical context.

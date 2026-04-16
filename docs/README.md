# Documentation

This directory holds SEOpen's foundation documentation set — the authoritative source for project scope, architecture, scoring math, and roadmap.

The documents are written to be read **in order**: each one builds on the previous. New contributors should start at `overview.md` and work down.

## Reading order

1. [**Overview**](overview.md) — executive summary of the whole project
2. [**Vision & Strategic Context**](vision.md) — the SEO → GEO paradigm shift and why SEOpen exists
3. [**Modules & Feature Surface**](modules.md) — every capability the platform ships
4. [**Scoring Models**](scoring.md) — SEO Score, AI Visibility Score, GEO Content Score, GEO Site Readiness Score, and the math behind them
5. [**Architecture**](architecture.md) — single-runtime TypeScript microservices, queues, storage, deployment shapes
6. [**Data Integrations**](data-integrations.md) — BYOK providers
7. [**Roadmap**](roadmap.md) — feature-oriented phased delivery plan
8. [**Community & Contribution**](community.md) — governance, contribution, educational resources
9. [**Glossary**](glossary.md) — terminology reference

## Build & run

- [**Development setup**](development.md) — prerequisites, install, workspace layout, test commands, coding conventions, troubleshooting.
- [**`seopen` CLI reference**](cli.md) — the shipped command surface, subcommand-by-subcommand.

## Quick jumps

- **"What is SEOpen and why does it exist?"** → [overview.md](overview.md) + [vision.md](vision.md)
- **"What does it actually do?"** → [modules.md](modules.md)
- **"How is every score computed?"** → [scoring.md](scoring.md)
- **"How is it built?"** → [architecture.md](architecture.md)
- **"How do I plug in third-party data?"** → [data-integrations.md](data-integrations.md)
- **"What ships first?"** → [roadmap.md](roadmap.md)
- **"How do I run it locally?"** → [development.md](development.md)
- **"What can the CLI do right now?"** → [cli.md](cli.md)
- **"How do I contribute?"** → [community.md](community.md) + [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- **"What does this term mean?"** → [glossary.md](glossary.md)

## Editing these docs

The foundation set is treated as binding project decisions. Significant edits should be accompanied by an ADR under `docs/adr/` (landing in Phase 0). See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the full workflow.

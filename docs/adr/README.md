# Architecture Decision Records (ADRs)

This directory holds SEOpen's **Architecture Decision Records** — short, dated documents that capture a significant architectural or methodological decision, the context that prompted it, the options considered, and the rationale for the chosen option.

ADRs are the mechanism SEOpen uses to evolve its architecture and scoring methodology without silent drift. The definition is mirrored in [`../glossary.md`](../glossary.md) and the governance commitment is in [`../community.md`](../community.md).

---

## Index

The ten ADRs below capture the decisions recorded inline in [`../architecture.md` §4.10](../architecture.md) at the time of the Phase 0 foundation freeze. They are the authoritative long-form of that table; if the table and an ADR ever disagree, **the ADR wins** and the table must be corrected.

| Id                                                | Title                                                       | Status   | Date       |
| ------------------------------------------------- | ----------------------------------------------------------- | -------- | ---------- |
| [A-001](A-001-single-runtime-nodejs.md)           | Single runtime: Node.js / TypeScript                        | Accepted | 2026-04-16 |
| [A-002](A-002-bullmq-task-broker.md)              | BullMQ on Redis as the primary task broker                  | Accepted | 2026-04-16 |
| [A-003](A-003-redis-url-frontier-and-cache.md)    | Redis as the URL frontier, cache, and BullMQ backing store  | Accepted | 2026-04-16 |
| [A-004](A-004-postgres-with-pgvector.md)          | PostgreSQL with pgvector for relational data and embeddings | Accepted | 2026-04-16 |
| [A-005](A-005-s3-compatible-object-storage.md)    | S3-compatible object storage for blobs                      | Accepted | 2026-04-16 |
| [A-006](A-006-fastify-api-gateway.md)             | Fastify + Zod as the API gateway                            | Accepted | 2026-04-16 |
| [A-007](A-007-nextjs-web-frontend.md)             | Next.js for the web frontend                                | Accepted | 2026-04-16 |
| [A-008](A-008-byok-third-party-indexes.md)        | Bring-your-own-key for all third-party indexes              | Accepted | 2026-04-16 |
| [A-009](A-009-llm-optional-never-required.md)     | LLM calls are optional, never required for scoring          | Accepted | 2026-04-16 |
| [A-010](A-010-opentelemetry-tracing.md)           | OpenTelemetry for distributed tracing                       | Accepted | 2026-04-16 |
| [A-011](A-011-robots-txt-scoring-inputs.md)       | `robots.txt` as explicit SEO + GEO scoring input            | Accepted | 2026-04-16 |
| [A-012](A-012-sitemap-scoring-inputs.md)          | `sitemap.xml` as explicit SEO + GEO scoring input           | Accepted | 2026-04-16 |
| [A-013](A-013-llms-txt-and-geo-site-readiness.md) | `llms.txt` adoption and §3.6 GEO Site Readiness Score       | Accepted | 2026-04-16 |

---

## Naming convention

- Filename: `A-NNN-kebab-case-slug.md`.
- `A-NNN` is a **monotonically increasing** three-digit id. Ids are never reused, never renumbered.
- The title slug is kebab-case and should read as a decision headline, not a question.

The `A-NNN` prefix deliberately matches the id column of the [`../architecture.md` §4.10](../architecture.md) table so any developer moving from the summary table to the long-form ADR has no mental overhead.

## File structure

Every ADR in this directory follows the same structure:

```markdown
# A-NNN — <Decision title>

- **Status:** <Proposed | Accepted | Superseded by A-MMM | Deprecated>
- **Date:** <YYYY-MM-DD>
- **Supersedes:** <A-MMM | —>
- **Superseded by:** <A-MMM | —>
- **Tags:** <comma-separated tags>

## Context

## Decision

## Consequences

## Alternatives considered

## References
```

The `Date` field is the date the ADR was **accepted** (or last materially revised). The filename does not embed the date; the header does. This keeps the directory listing sortable by id and lets a superseding ADR link back to the superseded one unambiguously.

## Status lifecycle

An ADR moves through at most four states:

1. **Proposed** — draft, open for discussion. May be opened as a PR against this directory and discussed on the PR thread. Maintainers decide acceptance per the governance model in [`../community.md`](../community.md).
2. **Accepted** — the decision is binding. The file is considered immutable except for typo fixes and reference-link repair. Any material change requires a new ADR.
3. **Superseded by A-MMM** — a later ADR replaces this decision. Fill in `Superseded by` and leave the body intact for historical context.
4. **Deprecated** — the decision no longer applies, but no replacement is proposed (e.g. the subsystem was removed). Rare.

Accepted ADRs are **never deleted** and **never silently mutated**. Superseding is the only path forward.

## How to propose a new ADR

1. Open a GitHub Discussion or Issue to socialize the problem (optional for small decisions, recommended for anything touching architecture, scoring formulas, or the provider contract).
2. Open a pull request that creates `A-NNN-<slug>.md` in this directory, using the next unused `A-NNN` id. Status starts as `Proposed`.
3. Apply the `documentation` label, plus `scoring` if the ADR changes a formula in [`../scoring.md`](../scoring.md) or `provider` if it changes the adapter contract in [`../data-integrations.md`](../data-integrations.md).
4. Land the PR only after maintainer acceptance. At merge time, flip `Status` from `Proposed` to `Accepted` and set `Date` to the merge date.

See [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) §PR labels and §How to contribute for the surrounding workflow.

## Relationship to the architecture table

The [`../architecture.md` §4.10](../architecture.md) table is a **summary index** of accepted ADRs, not a parallel source of truth. Whenever an ADR is added, superseded, or deprecated, update that table in the same PR so the two stay in sync.

If the two ever drift, trust the ADR and fix the table.

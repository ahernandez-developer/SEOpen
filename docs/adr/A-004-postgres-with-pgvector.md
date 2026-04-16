# A-004 — PostgreSQL with pgvector for relational data and embeddings

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, storage, database, embeddings

## Context

SEOpen's durable data splits naturally into three shapes:

1. **Structured relational data** — users, projects, crawl runs, scored URLs, historical score time series, issue backlogs, audit logs.
2. **Semantic embeddings** — per-page and per-chunk vectors used by the Semantic Relevance Score ([`../scoring.md`](../scoring.md) §3.2.4) and by the content gap analyzer ([`../modules.md`](../modules.md) §3 GEO prompt research).
3. **Large opaque blobs** — raw HTML, Lighthouse JSON payloads, exported PDFs. These are handled by object storage per [A-005](A-005-s3-compatible-object-storage.md).

The tension sits between concerns 1 and 2. A dedicated vector database (Weaviate, Qdrant, Pinecone, Milvus) offers excellent ANN performance at scale but imposes a second durable datastore, a second query language, a second backup story, a second authentication surface, and a second failure mode — all for data that is fundamentally associated with rows the relational store already owns (URLs, projects, runs).

`pgvector`, PostgreSQL's extension, now supports HNSW indexes, IVFFlat indexes, L2 / inner-product / cosine distance, and partial indexes. It is not the throughput leader at extreme scale — 100M+ vectors with strict p99 latency requirements — but it comfortably serves SEOpen's MVP and mid-scale targets. Embeddings co-locate with the rows they describe; similarity joins use standard SQL with no additional network hop.

## Decision

SEOpen uses **PostgreSQL 16+** with the **`pgvector`** extension for all durable relational data _and_ all embedding vectors. No separate vector database is introduced at MVP scale. Embedding dimensions, index type (HNSW as default), and distance metric (cosine as default, aligned with SRS methodology) are fixed in the schema migrations for reproducibility.

If a future deployment demonstrates that pgvector cannot meet its latency or throughput targets, a dedicated vector service may be introduced behind an adapter interface — but that requires a new ADR superseding this one.

## Consequences

### Positive

- One durable datastore for all SEOpen-owned data. One backup strategy, one monitoring surface, one credential set.
- Embedding queries are standard SQL with `<=>` (cosine) and `<#>` (inner product) operators, joinable against `projects`, `urls`, and `scores`.
- Row-level security and RBAC enforced at the Postgres layer apply uniformly to relational and embedding data.
- Historical score time series and embedding evolution can be analyzed with the same query planner.
- `formula_version`, `weights_version`, and `source_versions` columns (per [`../scoring.md`](../scoring.md) §3.4) live next to the embeddings that produced them, preserving full provenance in one place.

### Negative / trade-offs

- pgvector is not the ANN leader at extreme scale. For >10M vectors with sub-10 ms p99 requirements, a dedicated engine would outperform it; SEOpen will need to watch this ceiling and prepare an adapter boundary before hitting it.
- HNSW index builds are memory-hungry. Production deployments must budget RAM headroom for index construction, especially when re-embedding large corpora after an embedding-model change.
- Embedding-model migrations require careful planning: changing the model changes the vector space, and pre-existing vectors cannot be compared against new ones. Mitigation: schema records `embedding_model_id`; cross-model similarity is rejected at the query layer.

### Neutral

- Large blobs (raw HTML, Lighthouse JSON) deliberately do **not** live in Postgres — [A-005](A-005-s3-compatible-object-storage.md) keeps them in object storage, referenced by URL from Postgres rows.

## Alternatives considered

- **Standalone vector database (Weaviate, Qdrant, Pinecone, Milvus).** Rejected at MVP scale. Doubles the durable-datastore surface for a performance headroom SEOpen does not yet need. May be reconsidered via ADR at fleet scale.
- **MySQL / MariaDB + plugin.** Rejected. Inferior query planner, less mature vector ecosystem, weaker JSON support, and no industry-standard equivalent to pgvector.
- **MongoDB with vector search.** Rejected. Document model is a worse fit for SEOpen's strongly relational core (projects → runs → URLs → scores); vector search is newer and less battle-tested.
- **DuckDB embedded + Parquet blobs.** Interesting for reporting/analytics but not an OLTP store. Rejected as primary. May resurface in a future ADR for analytical dashboards.
- **CockroachDB / Spanner.** Rejected for MVP. Distributed SQL solves a scale problem SEOpen does not have; operational cost and dependency weight are high.

## References

- [`../architecture.md` §4.5 Data storage layers](../architecture.md) — storage partitioning table row for relational + embeddings.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-004.
- [`../scoring.md` §3.2.4 SRS](../scoring.md) — cosine-similarity method pgvector implements.
- [`../scoring.md` §3.4 scoring provenance & versioning](../scoring.md) — the version fields pgvector rows carry.
- [`../modules.md`](../modules.md) — module-level consumers of embedding queries.
- [`../glossary.md` pgvector](../glossary.md).

# A-005 — S3-compatible object storage for blobs

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, storage, infrastructure, self-host

## Context

SEOpen's crawl and scoring pipelines produce several large, opaque artifacts per URL:

- **Raw HTML** after headless-browser rendering.
- **Cleaned Markdown** emitted by the HTML → Markdown toolchain.
- **Lighthouse JSON reports** (often several hundred KB each).
- **Exported PDFs** for agency-style reports.
- **Screenshots** and other binary artifacts for change-detection workflows.

These artifacts share a profile: large, write-once, read-rarely-but-randomly, no need for relational joins, and highly compressible. Storing them in PostgreSQL (`BYTEA` columns) would bloat the relational store, wreck the query planner's statistics, and force vacuum / backup workflows to move gigabytes per project. They belong in object storage.

SEOpen's self-host-first posture ([`../overview.md`](../overview.md), [`../roadmap.md`](../roadmap.md)) requires that the storage layer work on a laptop (no cloud account required) and at fleet scale (AWS S3, Cloudflare R2, Backblaze B2, managed MinIO) _without code changes_. The vocabulary of the Amazon S3 REST API is the de facto portability standard across every major implementation.

## Decision

SEOpen persists all blob artifacts in an **S3-compatible object store**. MinIO is the reference implementation for self-host (bundled in the default `docker-compose.yml`); AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, Wasabi, and any other conforming provider are supported without code changes.

Only the **documented S3-compatible API surface** is permitted — no provider-specific features (e.g. AWS S3 Object Lock, R2 event notifications as the primary trigger mechanism, MinIO Site Replication) may be relied on by core code. Provider-specific features may be used **within an adapter or optional module** that degrades cleanly when the feature is unavailable.

## Consequences

### Positive

- Portable across MinIO, AWS S3, Cloudflare R2, Backblaze B2, Google Cloud Storage (via its S3 interoperability mode), Wasabi, DigitalOcean Spaces, and any future S3-compatible provider.
- Self-hosters get a working blob store from `docker compose up` with zero cloud accounts or credit cards.
- Storage costs are the operator's — SEOpen never brokers bytes, matching the BYOK ethos in [A-008](A-008-byok-third-party-indexes.md).
- Horizontal scale is a provider concern; SEOpen pays no architectural cost to move from a single-node MinIO to petabyte-scale S3.

### Negative / trade-offs

- Cross-provider feature parity is the **common denominator**, which rules out some optimizations (per-provider lifecycle rules, server-side encryption with specific KMS variants, strongly consistent cross-region replication semantics). Operators opting in to advanced features do so knowingly, and those features live outside the core code path.
- Object storage has higher per-request latency than local disk; the analysis pipeline is designed to tolerate this (pipelined writes after extraction, streaming reads during analysis) but operators must size request throughput budgets for their provider.
- Object-storage egress pricing varies wildly across providers. Deployment docs must call out expected egress patterns so operators can choose a provider that fits their economics (e.g. R2's zero-egress model vs AWS S3's egress-heavy pricing).

### Neutral

- Object storage is separate from the CDN layer. If a deployment serves PDFs or screenshots to end users, the provider's CDN or an external CDN (Cloudflare, CloudFront, Fastly) handles that — outside this ADR's scope.

## Alternatives considered

- **Local filesystem (per-worker disk).** Rejected. Breaks horizontal scale and resumability. Fine for throwaway dev iterations; not a production path.
- **PostgreSQL `BYTEA`.** Rejected. Wrong tool: bloats the relational store, slows backups, multiplies vacuum cost, and adds no query value for opaque blobs.
- **Vendor-locked native APIs (e.g. direct AWS S3 SDK without an abstraction).** Rejected for core code. Using the native SDK through an S3-compatible client is fine; depending on AWS-only features would forfeit the self-host portability promise.
- **Hybrid: Postgres for small artifacts, S3 for large.** Rejected. Adds a size-threshold policy to every write path for no durable benefit — simpler to standardize on one backend.

## References

- [`../architecture.md` §4.5 Data storage layers](../architecture.md) — storage partitioning table row for blobs.
- [`../architecture.md` §4.8 Deployment shapes](../architecture.md) — MinIO in single-node, externalized S3-compatible in multi-node.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-005.
- [`../roadmap.md`](../roadmap.md) Phase 1 TTFV gate — first audit in under five minutes from clean clone; MinIO-in-compose serves this directly.
- [A-008](A-008-byok-third-party-indexes.md) — same "operator pays" posture applied to third-party indexes.

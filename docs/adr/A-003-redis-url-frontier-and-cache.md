# A-003 — Redis as the URL frontier, cache, and BullMQ backing store

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, storage, infrastructure

## Context

Every web crawler at non-trivial scale needs a **URL frontier** — the data structure that tracks URLs discovered but not yet visited. The frontier drives throughput, politeness, and deduplication. Its access pattern is dominated by high-rate reads and writes with tight latency budgets, and its contents are fundamentally ephemeral: once a URL is crawled (or blacklisted), its frontier entry has no long-term value.

In parallel, SEOpen needs an ephemeral cache layer: per-domain rate-limit counters, `robots.txt` TTL caches, hot provider responses, idempotency tokens for retryable operations, and session-level state for the API gateway.

[A-002](A-002-bullmq-task-broker.md) also depends on a Redis-compatible backing store.

These three responsibilities — URL frontier, ephemeral cache, and job broker backing store — share the same operational profile: sub-millisecond access, TTL-native semantics, and no durability requirement beyond best-effort AOF. Splitting them across multiple datastores would triple the operational surface for zero architectural benefit.

## Decision

**Redis** is SEOpen's sole in-memory datastore. It holds the URL frontier (with Bloom-filter-based deduplication and per-domain rate-limit counters), the ephemeral cache layer, and the BullMQ job state. Durable relational data goes to PostgreSQL ([A-004](A-004-postgres-with-pgvector.md)); durable blob data goes to object storage ([A-005](A-005-s3-compatible-object-storage.md)); Redis handles everything volatile.

Deployments may use a standalone Redis, Redis Sentinel, Redis Cluster, or a managed-service equivalent (ElastiCache, MemoryDB, Upstash, Redis Cloud) — any redis-compatible KV that supports the TTL, set, hash, and Lua scripting features the frontier and BullMQ rely on.

## Consequences

### Positive

- One backing store instead of three. Self-hosters run a single `redis` container; production operators manage a single Redis deployment tier.
- URL frontier operations (`SADD`, `SPOP`, Bloom-filter `BF.ADD` / `BF.EXISTS` via RedisBloom, per-domain rate tokens via Lua script) all execute in sub-millisecond time.
- Politeness and `robots.txt` caching co-locate with the frontier, so a rate-limited URL is never promoted without cache lookup hitting the same datastore.
- Observability is simpler: one INFO surface, one metric exporter, one alerting target.

### Negative / trade-offs

- Redis is a single point of failure for three concerns at once. Mitigation: use Redis Sentinel or Cluster in production; AOF with `everysec` for best-effort durability; regular snapshotting.
- Memory pressure from frontier growth must be bounded. Large crawls can accumulate millions of pending URLs. Mitigations: Bloom-filter deduplication at the enqueue edge; per-project frontier sizing limits; spillover to PostgreSQL as an ADR-worthy future option if a specific deployment demands it.
- BullMQ, frontier, and cache share memory and CPU budgets. Noisy-neighbor scenarios (a huge batch enqueue during a crawl slowing cache lookups) are possible. Mitigation: deployment docs recommend separating Redis logical databases per concern, with per-DB memory limits.

### Neutral

- Durability of BullMQ jobs depends on Redis persistence configuration. Deployment docs must call this out explicitly. See [A-002](A-002-bullmq-task-broker.md) consequences.

## Alternatives considered

- **PostgreSQL-as-frontier.** Rejected. Relational engines have no competitive story for sub-millisecond set semantics at millions of rows with TTL and Bloom-filter integration. The frontier's access pattern is wrong for Postgres.
- **Kafka compacted topics.** Rejected. Overkill operationally, and the "check if URL is in the frontier" pattern is not what Kafka is for.
- **In-memory worker-local queues.** Rejected. Loses resumability and horizontal scaling. The foundation principle §4.1.4 explicitly forbids worker-local state that would prevent scale-out.
- **Separate Redis instances per concern.** Rejected as default. Feasible in production deployments for isolation; not worth the operational weight in self-host.

## References

- [`../architecture.md` §4.4 URL frontier](../architecture.md) — the design this ADR ratifies.
- [`../architecture.md` §4.5 Data storage layers](../architecture.md) — Redis row in the storage partitioning table.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-003.
- [A-002](A-002-bullmq-task-broker.md) — why BullMQ piggy-backs on this same Redis.
- [`../glossary.md` URL frontier / BullMQ](../glossary.md) — term definitions.

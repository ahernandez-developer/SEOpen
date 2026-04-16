# A-002 — BullMQ on Redis as the primary task broker

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, queue, infrastructure

## Context

SEOpen's design principle §4.1.2 ([`../architecture.md`](../architecture.md)) requires that every inter-service call cross a message broker. The original foundation draft chose **RabbitMQ** as the primary broker because it was the mature default for polyglot stacks: AMQP is language-neutral, durable queues and priority classes are well-understood, and dead-letter queues are first-class. That rationale was sound _when the stack was polyglot_.

Once [A-001](A-001-single-runtime-nodejs.md) locked the core runtime to TypeScript, the polyglot argument for AMQP evaporated. The remaining broker requirements — durability, retries, priority, scheduled / delayed jobs, dead-letter queues, backpressure, observability, horizontal workers — are all first-class features of **BullMQ**, a TypeScript job queue that piggy-backs on Redis.

Relevant constraints:

- [A-003](A-003-redis-url-frontier-and-cache.md) already commits to Redis for the URL frontier and ephemeral cache. Redis is therefore a required piece of infrastructure regardless of the broker choice.
- [`../roadmap.md`](../roadmap.md) Phase 1 requires a first audit in under five minutes from clean clone. Every additional daemon in the default `docker-compose.yml` costs TTFV.
- Job shapes include long-running crawl tasks (tens of minutes), short analysis tasks (seconds), scheduled recurring crawls, and delayed retries after `503` responses. Priority matters (user-triggered audits outrank background recrawls).

## Decision

SEOpen uses **BullMQ on Redis** as the primary task broker. Every service — extraction, analysis, scoring, scheduled reports — enqueues and consumes via BullMQ. OpenTelemetry trace context is propagated through the job payload per [A-010](A-010-opentelemetry-tracing.md). RabbitMQ (and any other AMQP broker) remain supported behind a thin queue adapter for high-throughput or compliance-driven deployments, but BullMQ is the default and the reference implementation.

## Consequences

### Positive

- Removes RabbitMQ from the default `docker-compose.yml`. One less container for self-hosters to run, debug, and patch.
- Redis is reused for cache, frontier, rate-limit counters, **and** jobs. One backing store, one monitoring surface, one credential.
- BullMQ is TypeScript-native: `Queue`, `Worker`, and `Job<DataType, ResultType>` are fully typed. Job payloads share their Zod schemas with the API gateway and workers.
- Delayed, repeatable, prioritized, and rate-limited jobs are covered out of the box; no bespoke scheduler service needed for simple periodic work.
- Flow/parent-child jobs natively model the extract → analyze → score dependency chain without gluing brokers together.

### Negative / trade-offs

- Redis is now a larger single point of failure. Mitigation: BullMQ supports Redis Cluster and Sentinel; production deployments are expected to use managed Redis with multi-AZ replication.
- BullMQ's throughput ceiling is lower than tuned RabbitMQ at very high rates (hundreds of thousands of messages/sec). SEOpen's MVP and mid-scale targets are well below that ceiling; fleet operators who need it can swap in the RabbitMQ adapter.
- BullMQ's durability model stores job state in Redis, which by default is in-memory. Persistence requires AOF or RDB configured on the Redis deployment. This must be called out in the self-host and production docs.

### Neutral

- The queue adapter boundary is preserved. A future ADR can introduce a different broker (RabbitMQ, NATS JetStream, Kafka) behind the same interface without any call-site changes.
- OpenTelemetry instrumentation exists for both BullMQ and AMQP consumers, so [A-010](A-010-opentelemetry-tracing.md) is satisfied either way.

## Alternatives considered

- **RabbitMQ as primary.** Rejected: polyglot advantage is gone, additional daemon hurts TTFV, and none of its advanced features (exchanges, per-consumer QoS) are needed at MVP scale.
- **Redis Pub/Sub.** Rejected: no durability, no retry semantics, no dead-letter queue. Not a viable job broker.
- **NATS JetStream.** Rejected for now. Interesting but adds a second infra component alongside Redis; no TypeScript SDK feature parity advantage over BullMQ.
- **Kafka.** Rejected: overkill for MVP throughput, operationally heavy, and the job-processing model (retries, per-job state) is not Kafka's strength.
- **Temporal / Inngest (hosted workflow engines).** Rejected: conflict with the self-host-first principle and BYOK cost posture.

## References

- [`../architecture.md` §4.1, §4.3](../architecture.md) — queue-first principle, updated topology showing BullMQ on Redis.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-002.
- [A-001](A-001-single-runtime-nodejs.md) — single-runtime decision that unlocked this change.
- [A-003](A-003-redis-url-frontier-and-cache.md) — Redis already present as URL frontier + cache; BullMQ reuses the backing store.
- [A-010](A-010-opentelemetry-tracing.md) — trace context propagation across the broker.

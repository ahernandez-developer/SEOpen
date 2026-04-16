# A-010 — OpenTelemetry for distributed tracing

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, observability, telemetry

## Context

SEOpen is a distributed system even in its single-node deployment. An audit request triggers: API gateway validation → job enqueue → extraction worker → headless browser render → Lighthouse → analysis worker → HTML → Markdown → deterministic scoring → (optional) embedding + LLM semantic pass → persist. That chain spans multiple processes and crosses queue boundaries.

Without distributed tracing, root-cause analysis for "this audit took 3 minutes instead of 30 seconds" requires grepping multiple log files with hand-correlated request IDs. That was already painful in the polyglot draft and remains painful even in the single-runtime architecture ([A-001](A-001-single-runtime-nodejs.md)) because process boundaries still exist at every worker and queue hop.

Observability is called out as a first-class design principle in [`../architecture.md`](../architecture.md) §4.1.5. The remaining question is which tracing standard to commit to.

Candidates:

- **OpenTelemetry (OTel).** Vendor-neutral CNCF standard. Stable TypeScript SDK. Supported by every major APM and storage backend (Jaeger, Tempo, Honeycomb, Datadog, New Relic, Grafana Cloud, Lightstep/ServiceNow, AWS X-Ray, Azure Monitor, GCP Trace).
- **Vendor-specific APM SDKs** (Datadog, New Relic, Dynatrace, Honeycomb Beeline). Rich integrations but vendor lock-in at the instrumentation layer.
- **No tracing, log-only.** Cheapest to ship; massively expensive to operate.

## Decision

SEOpen instruments every service with **OpenTelemetry**. OTel is the ingress point for traces, metrics, and optional log correlation. Services emit via OTLP (protobuf over gRPC or HTTP); operators point the OTLP endpoint at whichever backend they prefer — the default self-host configuration ships a local collector that can be wired to Tempo, Jaeger, Honeycomb, Datadog, or any other OTLP-compatible backend with no code changes.

W3C Trace Context (`traceparent` / `tracestate`) propagates through every boundary: HTTP requests between frontend, API gateway, and external providers; BullMQ job payloads between API gateway and workers ([A-002](A-002-bullmq-task-broker.md)); provider adapter calls tagged per [`../data-integrations.md`](../data-integrations.md) §5.4.

## Consequences

### Positive

- Vendor-neutral. Operators switch backends (e.g. from self-hosted Tempo to Honeycomb) without code changes.
- Mature TypeScript SDK — auto-instrumentation exists for Fastify, BullMQ, Redis, Postgres, HTTP, undici/fetch. Most boilerplate is a one-time registration.
- Traces carry `project_id` and `run_id` tags, enabling per-project cost attribution for provider calls ([`../architecture.md`](../architecture.md) §4.7).
- Distributed traces across extract → analyze → score make latency regressions, hung workers, and retry storms visible at a glance.
- Smooth interaction with metrics and logs: structured logs carry the active span / trace IDs for instant pivot from a log line to its trace.

### Negative / trade-offs

- Extra runtime overhead from span creation and OTLP export. SEOpen's default sampling strategy is "sample all traces in self-host, tail-sample in production" to keep overhead bounded.
- The OpenTelemetry spec's core is stable, but some surfaces (metrics API, logs bridge, semantic conventions) have evolved recently. Mitigation: pin the OTel SDK version in a workspace constraint and upgrade deliberately.
- Operators need to run a collector (standalone or sidecar). This is one additional infra component. Cost is low compared to the operational value traces provide.

### Neutral

- Vendor APM SDKs remain reachable through OTLP bridges; operators who prefer Datadog, New Relic, etc. can ingest OTel traces into those platforms with no SEOpen-side code changes.

## Alternatives considered

- **Vendor-specific APM SDK (Datadog, New Relic, Honeycomb Beeline).** Rejected as primary. Couples the codebase to one vendor; OTLP export to those same vendors preserves the value without the lock-in.
- **Log-only observability with correlation IDs.** Rejected. Trace reconstruction from logs is possible but labor-intensive; distributed tracing pays for itself the first time an incident spans three services.
- **Zipkin-only instrumentation.** Rejected. Zipkin backends receive OTel traces natively via the OTel exporter, so there is no reason to target the older Zipkin SDK directly.
- **No tracing until post-MVP.** Rejected. Principle §4.1.5 is explicit that observability is wired in before feature work; retrofitting tracing onto a running system is harder than shipping it from day one.

## References

- [`../architecture.md` §4.1 Design principles](../architecture.md) — observability is a first-class module.
- [`../architecture.md` §4.7 Observability](../architecture.md) — traces, logs, metrics, cost attribution.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-010.
- [A-002](A-002-bullmq-task-broker.md) — trace context propagation through BullMQ payloads.
- [`../data-integrations.md` §5.4](../data-integrations.md) — provider adapter spans tagged with project + credit cost.

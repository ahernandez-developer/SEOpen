# A-006 — Fastify + Zod as the API gateway

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, api, framework

## Context

The API gateway is SEOpen's public entry point. Its responsibilities, per [`../architecture.md`](../architecture.md) §4.3, are:

- Authentication (JWT / OAuth, future SSO)
- Role-based access control at the project level
- Request validation with rich schema error reporting
- Rate limiting (per-project and per-user)
- Enqueueing crawl / analysis / scoring jobs onto BullMQ ([A-002](A-002-bullmq-task-broker.md))
- Aggregate read-only queries against PostgreSQL + pgvector ([A-004](A-004-postgres-with-pgvector.md))
- Exposing a fully documented OpenAPI surface ([`../roadmap.md`](../roadmap.md) Phase 4)

The original foundation draft selected **FastAPI** (Python) because the analysis layer was Python. [A-001](A-001-single-runtime-nodejs.md) changed that premise: the analysis layer is now TypeScript. A TypeScript-native API framework shares Zod schemas with the rest of the codebase — with no cross-runtime translation — which is the single largest ergonomic win of the single-runtime decision.

Node's API framework market is mature and fragmented. The realistic finalists:

- **Express** — ubiquitous, permissive, but type story is glued-on and middleware ecosystem is old.
- **Fastify** — async-first, schema-centric (Ajv / JSON Schema compatible, Zod integration via `fastify-type-provider-zod`), fastest pure HTTP server in the Node ecosystem, plugin model, native OpenAPI generation.
- **Hono** — edge-first, Web Fetch API, small surface, excellent DX, younger ecosystem.
- **NestJS** — opinionated, Angular-flavored DI, decorators, batteries included, significant learning curve and codegen weight.
- **tRPC** — type-safe RPC, great for internal monoliths; fits worse when an external OpenAPI REST surface is a roadmap commitment.

## Decision

SEOpen's API gateway is built with **Fastify + Zod**. Every request handler validates input with a Zod schema (via `fastify-type-provider-zod` or equivalent), and the same Zod schemas are reused by the workers, the CLI, and the Next.js frontend to describe shared payload shapes. OpenAPI documentation is generated from the route schemas, not maintained by hand.

## Consequences

### Positive

- End-to-end type safety: API request / response types, BullMQ job payloads, and frontend client all derive from the same Zod schemas. No Pydantic ↔ Zod translation layer.
- Fastify's schema-first design naturally produces consistent 400-level responses, making client integrations pleasant.
- Plugin ecosystem covers the mandatory surface (auth, rate-limiting, CORS, CSRF, OpenTelemetry, multipart, OpenAPI) with first-class official or well-maintained community plugins.
- Top-tier throughput among Node frameworks — not a deciding factor at MVP scale, but free headroom is welcome.
- OpenAPI 3.x output is a by-product of route definitions, satisfying [`../roadmap.md`](../roadmap.md) Phase 4's API documentation exit gate.

### Negative / trade-offs

- Fastify's middleware model is plugin-based and slightly different from Express conventions; contributors familiar only with Express face a modest ramp.
- Zod runtime validation has measurable cost at very high request rates. SEOpen is not latency-bound at the API layer for the MVP; if it becomes so, hot paths can switch to `zod`'s compiled variants or JSON Schema via Ajv directly.
- Some auth / SSO libraries still target Express first; bindings for Fastify occasionally lag. Mitigation: Passport / other strategies can run as Fastify plugins via `@fastify/passport` and equivalents.

### Neutral

- The gateway remains stateless. Session / cache state lives in Redis per [A-003](A-003-redis-url-frontier-and-cache.md). Horizontal scale is a matter of running more gateway replicas behind a load balancer.

## Alternatives considered

- **Express + Zod.** Rejected: works but pays a larger type-discipline tax and lacks Fastify's schema ergonomics. No meaningful advantage.
- **NestJS.** Rejected: opinionated structure and decorator-heavy codegen add more ceremony than SEOpen wants at the MVP stage. Worth revisiting if the codebase later outgrows Fastify's lighter patterns.
- **Hono.** Attractive, but the Node ecosystem around Fastify (plugins, auth libraries, observability integrations) is broader today. Revisit if SEOpen ever targets edge runtimes.
- **tRPC.** Rejected as primary: the public OpenAPI REST commitment in [`../roadmap.md`](../roadmap.md) Phase 4 is a first-class requirement, and tRPC's strength is internal type-safe RPC, not OpenAPI REST.
- **FastAPI (Python).** Rejected by [A-001](A-001-single-runtime-nodejs.md) — no Python in the core stack.

## References

- [`../architecture.md` §4.3 Service responsibilities](../architecture.md) — updated API gateway row.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-006.
- [A-001](A-001-single-runtime-nodejs.md) — single-runtime decision that motivated this choice.
- [A-002](A-002-bullmq-task-broker.md) — job enqueue target for the gateway.
- [A-004](A-004-postgres-with-pgvector.md) — read-query target for the gateway.
- [`../roadmap.md`](../roadmap.md) Phase 4 — public REST API and OpenAPI docs exit criteria served by this decision.

# A-007 — Next.js for the web frontend

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, frontend, framework

## Context

SEOpen ships a web dashboard that shows SEO and GEO scores, issue backlogs, historical trends, project configuration, and exports ([`../modules.md`](../modules.md) §4). The dashboard is server-first: most views are authenticated project pages that render aggregated data pulled from the API gateway, with interactive drill-downs.

Desired properties:

- **Server-side rendering (SSR)** for first-byte performance on dashboards that load a lot of historical data.
- **Strong TypeScript integration** to share types with the Fastify + Zod API ([A-006](A-006-fastify-api-gateway.md)).
- **Mature, familiar developer experience** to lower the contribution barrier.
- **Flexible deployment** — static export isn't enough (we need SSR), but we must run on the same Node/TypeScript stack the rest of SEOpen uses without introducing a second frontend runtime (Bun, Deno) as a hard requirement.
- **Streaming / React-Server-Component-friendly** rendering for the long data-fetching view patterns the dashboards need.

## Decision

SEOpen's web frontend is built with **Next.js** (App Router, React Server Components) on Node.js. The frontend is a workspace package alongside the backend services and shares the same TypeScript + pnpm toolchain. Zod schemas from the API gateway ([A-006](A-006-fastify-api-gateway.md)) are the contract for all frontend ↔ API data exchange.

Deployments bundle the frontend as a stand-alone Next.js server; operators may host it on any Node-capable runtime (a container alongside the API, Vercel, Fly, Railway, Cloudflare Workers via the Node-compat runtime, etc.). No Vercel-specific feature is relied on by core code.

## Consequences

### Positive

- Server-side rendering and streaming out of the box; first-byte performance on dashboards is a solved problem.
- One TypeScript toolchain end-to-end: types, lint rules, test runners, formatters shared with the backend.
- React ecosystem breadth — charting (Recharts, Visx), tables (TanStack Table), forms (react-hook-form + Zod), design systems (shadcn/ui, Radix) — all first-class.
- App Router's server components collapse a lot of data-fetching boilerplate; the dashboard can server-render with streaming for perceived performance.
- Contributor familiarity is high; Next.js is the most widely deployed React meta-framework.

### Negative / trade-offs

- Next.js is a large framework with meaningful churn between major versions. Mitigation: pin the major version, track LTS/stable, upgrade via dedicated PRs with ADR notes if the upgrade changes architectural assumptions.
- Server components and client components require deliberate data-flow discipline; new contributors often trip on the boundary. Mitigation: document the dashboard data-flow patterns clearly once the UI surface exists.
- Hosting outside Vercel can be more operationally involved than static frameworks. Acceptable — SEOpen's self-host posture means operators are already running containers.

### Neutral

- The frontend remains decoupled from the API. Replacing Next.js in a future ADR only touches the web package; it does not affect the API, workers, or CLI.

## Alternatives considered

- **Remix.** Credible alternative; excellent data-loading model. Rejected for now only because the React-Server-Components model in Next.js fits dashboard server rendering slightly better and the contributor familiarity tilt favors Next.js.
- **SvelteKit.** Rejected. Smaller ecosystem for dashboard-heavy workloads (charting, complex tables); contributor pool tilts to React.
- **Nuxt.** Rejected for the same reason — Vue ecosystem is fine but narrower for the dashboard component library space.
- **Pure React SPA (Vite + React Router).** Rejected. No SSR, worse first-byte performance on data-heavy dashboards, and authentication story is more awkward.
- **Astro.** Good for content sites; wrong shape for an auth-gated dashboard. Rejected.

## References

- [`../architecture.md` §4.3 Service responsibilities](../architecture.md) — web frontend row.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-007.
- [`../modules.md` §4 Scoring & Reporting Engine](../modules.md) — the UI surface this frontend renders.
- [A-001](A-001-single-runtime-nodejs.md) — single TypeScript runtime that motivated keeping the frontend in-family.
- [A-006](A-006-fastify-api-gateway.md) — API contract the frontend consumes.

# A-001 — Single runtime: Node.js / TypeScript

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** architecture, runtime, developer-experience

## Context

The original foundation draft ([`../architecture.md`](../architecture.md) pre-amendment, and the strategic blueprint it was distilled from) specified a **polyglot** stack: Node.js for the JavaScript-rendering extraction layer and Python for the NLP, scoring, and analysis layer. That split is a common enterprise pattern — it matches how companies like Semrush, Ahrefs, and legacy SEO tool stacks are built. It was never a free choice; it was the industry default copied forward.

Before any code was written, the polyglot premise was re-examined against SEOpen's actual workload, self-host-first deployment target, and contributor pool. The re-examination concluded that every reason to bring Python to SEOpen was either (a) a non-requirement for the MVP and near-term phases, or (b) fully addressable inside the Node.js ecosystem.

The constraints that shaped this decision:

- **Self-host TTFV.** [`../roadmap.md`](../roadmap.md) Phase 1 quality gate requires a first audit in under five minutes from a clean clone. Two runtimes, two dependency managers, two lockfile families, and two Dockerfile stacks directly work against this gate.
- **Deterministic core.** [`../architecture.md`](../architecture.md) §4.6 already commits to a deterministic scoring pipeline with LLM calls isolated to optional "intelligence" stages. None of the deterministic arithmetic in [`../scoring.md`](../scoring.md) benefits from Python's scientific stack.
- **Extraction is Node-native anyway.** Lighthouse, Crawlee, Puppeteer, and Playwright are Node projects. Any polyglot arrangement pays the Node tax on one side by definition.
- **LLM SDKs are first-class in Node.** `@anthropic-ai/sdk`, `openai`, and equivalent typed SDKs cover the generative workloads without requiring Python's LLM client ecosystem.
- **Type safety across every seam.** Sharing TypeScript types between the API gateway, queue messages, scoring engines, and the Next.js frontend eliminates the Pydantic ↔ Zod (or Pydantic ↔ TS) translation layer that a polyglot stack forces.

## Decision

SEOpen's core is a **single runtime**: **Node.js / TypeScript**. Every long-running service, every worker, the CLI (`seopen`), and the web frontend ship as TypeScript packages inside a single pnpm workspace. No Python, Go, or Rust code lives inside the core stack.

Polyglot may be reintroduced later — strictly via a new ADR that supersedes this one — if a specific workload (for example, GPU-batched embedding at fleet scale, or spaCy-grade dependency parsing for a research surface) genuinely cannot be served in Node.

## Consequences

### Positive

- One runtime, one package manager (pnpm), one lockfile family (`pnpm-lock.yaml`), one Dockerfile pattern, one CI matrix, one test runner preference (`node:test` / Vitest).
- TypeScript types flow end-to-end through Zod schemas: API contracts, BullMQ job payloads, scoring inputs/outputs, frontend fetchers. No translation layer.
- The analysis pipeline uses a mature Node toolchain: `@mozilla/readability` for boilerplate stripping, `unified` + `rehype-remark` for structured HTML → Markdown, `turndown` for long-tail cases, `@xenova/transformers` for local embeddings, `@anthropic-ai/sdk` / `openai` for LLM semantic calls.
- Contributor pool broadens. The SEO tooling and webdev community is JS-native; a single-runtime stack lowers the bar to first contribution.
- The single-node Docker Compose deployment drops from "Postgres + Redis + RabbitMQ + MinIO + Node + Python" to "Postgres + Redis + MinIO + Node", meaningfully advancing the roadmap Phase 1 TTFV gate.

### Negative / trade-offs

- SEOpen will not natively host Python-only ML libraries (spaCy, PyTorch, sentence-transformers with CUDA). Advanced ML features that require them land only if a future ADR reintroduces Python as a sidecar service.
- Academic IR and GEO research usually ships reference code in Python. Each algorithm SEOpen chooses to adopt costs roughly a day of TypeScript porting.
- Large-fleet GPU-batched embedding is slower in Node with ONNX Runtime than in Python with CUDA-PyTorch. This is only a problem at fleet scale; the MVP does not hit that scale. Mitigation: [A-009](A-009-llm-optional-never-required.md) already allows LLM-delegated embedding via the BYOK layer, and the analysis pipeline's embedding step is an adapter boundary — a sidecar embedding service can be introduced behind the adapter without changing the core runtime decision.

### Neutral

- The queue-first design principle ([`../architecture.md`](../architecture.md) §4.1.2) is unchanged. The broker boundary is still the seam where a future non-Node service would attach. A polyglot reversal is therefore a local change, not an architectural rewrite.

## Alternatives considered

- **Keep the polyglot stack (Node + Python).** The industry default. Rejected: none of the Python-only advantages apply to SEOpen's MVP workload, and the cost to TTFV and to contributor onboarding is real. Polyglot was a copy of enterprise-tool conventions, not a first-principles fit.
- **All-Python, using Playwright-Python + Lighthouse-in-subprocess.** Rejected: Lighthouse is a Node library; driving it cleanly from Python is an awkward subprocess dance, and Crawlee is Node-only. The extraction side pays a large cost to move off Node.
- **Go or Rust for extraction + Node for the rest.** Rejected: no workload in the MVP is CPU-bound enough to need a systems language, and this multiplies runtimes rather than reducing them.
- **Python with a Node sidecar only for Lighthouse.** Rejected as a degenerate form of the polyglot option — same cost, worse asymmetry.

## References

- [`../architecture.md` §4.1, §4.2](../architecture.md) — the amended design principles and runtime rationale that this ADR locks in.
- [`../architecture.md` §4.10](../architecture.md) — summary index entry for A-001.
- [`../roadmap.md`](../roadmap.md) Phase 1 quality gate — five-minute TTFV — the primary constraint this decision serves.
- [`../overview.md`](../overview.md) — updated one-paragraph summary reflects the single-runtime stack.
- [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) §Dev setup — toolchain expectations (Node ≥ 20, pnpm, Docker) derived from this ADR.

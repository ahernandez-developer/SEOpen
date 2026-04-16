# Contributing to SEOpen

Thanks for wanting to make SEOpen better. SEOpen exists to keep SEO and Generative Engine Optimization measurement honest and transparent — the same rigor applies to contributions back to the project itself.

> **Project status.** SEOpen is in **Phase 0 (foundation)**. No runnable code has landed yet. Contributions at this stage are primarily documentation, scoring methodology, ADRs, and planning input. The full code-contribution workflow below describes the **target** process and becomes active when Phase 1 begins. See [`docs/roadmap.md`](docs/roadmap.md).

## Quick links

- **Issues & bugs**: GitHub Issues on this repository
- **Discussions**: GitHub Discussions on this repository
- **Documentation index**: [`docs/README.md`](docs/README.md)
- **Scoring math**: [`docs/scoring.md`](docs/scoring.md)
- **Architecture**: [`docs/architecture.md`](docs/architecture.md)
- **Roadmap**: [`docs/roadmap.md`](docs/roadmap.md)

---

## The Golden Rule

**No number without a formula. No production code without a test.**

SEOpen's product promise is that every score traces to a documented formula in [`docs/scoring.md`](docs/scoring.md). That promise extends to contributions:

1. If you change a score, update the formula in `scoring.md` in the same PR and bump `formula_version`.
2. If you change production code (Phase 1+), the PR must include a matching test. Bug fixes need a regression test; features need unit and/or integration tests.
3. If you change a foundation doc, the reasoning must be legible to someone who hasn't read the PR thread.

PRs that ship opaque scoring changes or untested production code will be closed.

---

## How to contribute

| You want to...                       | What to do                                                                                                                                                            |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix a typo or doc wording            | Open a PR directly. No prior discussion needed.                                                                                                                       |
| Clarify or extend a foundation doc   | Open a PR. Significant edits need an ADR under `docs/adr/`.                                                                                                           |
| Propose a scoring methodology change | [Open a discussion](#where-to-get-help) first, then land an ADR + PR following the [Scoring methodology contributions](#scoring-methodology-contributions) checklist. |
| Add a BYOK provider adapter          | [Open a discussion](#where-to-get-help) to align on shape, then follow [Provider adapter contributions](#provider-adapter-contributions).                             |
| Fix a bug (Phase 1+)                 | Open a PR with a failing regression test + the fix.                                                                                                                   |
| Propose a new feature (Phase 1+)     | Open a discussion or issue **before** writing code so the approach can be aligned.                                                                                    |
| Land a refactor-only change          | File an issue explaining the code-health problem first. Drive-by refactors without a discussion are discouraged.                                                      |
| Ask a question                       | [Open a discussion](#where-to-get-help) or file an issue with the `question` label.                                                                                   |

Keep PRs focused. One concern per PR. If you need more than one PR for a coordinated change set, open an issue first so the rollout can be tracked.

---

## Code of Conduct

SEOpen adopts the **[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)** v2.1 as its Code of Conduct. All participation in SEOpen spaces (issues, pull requests, Discussions, Discord, any other official channel) is governed by it.

Violations may be reported confidentially by emailing the maintainers — the contact address will be published in `CODE_OF_CONDUCT.md` when the file lands in Phase 0. In the interim, open a private GitHub security advisory and flag it as a CoC report.

Maintainers commit to acknowledging all Code of Conduct reports within 72 hours and handling every report with discretion, fairness, and proportionality.

---

## License and the CLA

SEOpen is distributed under the **[MIT License](LICENSE)**. By contributing, you agree that your contributions are licensed under the MIT License.

Before your first contribution is merged, you will be asked to sign a **Contributor License Agreement** via CLA Assistant (or equivalent), wired directly into the GitHub PR workflow. The CLA:

1. Confirms you have the right to contribute the code (your own work, or your employer has authorized it).
2. Grants the project a permanent, irrevocable license to use, modify, distribute, and relicense your contribution.
3. Preserves your copyright — you are not assigning ownership; you are granting a broad license.

**Why a CLA if the project is MIT?** MIT already grants most of the relevant rights. The CLA exists for one reason: **optionality**. It gives the project a clean path to evolve licensing decisions in the future without having to chase every past contributor for consent. It does not restrict your use of your own contribution in any way.

You sign once; all future PRs are auto-approved for CLA status. If signing is a blocker (personal or employer policy), open a discussion before investing time in a contribution.

---

## PR labels

Apply at least one **type** label to every PR. Add a **scope** label if the change lives in a single area, and a **meta** label (`ai-assisted`) if an AI agent wrote any part of the diff.

### Type — every PR needs one

Pick **exactly one**:

| Label           | When to use                                                                                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bug`           | Fixing broken behavior. PR body must link to a reproducer or show the failing regression test first.                                               |
| `enhancement`   | New feature, new crawler capability, new scoring sub-metric, new CLI flag, new module.                                                             |
| `documentation` | README, `docs/`, `CONTRIBUTING.md`, inline comments, ADRs. No production code.                                                                     |
| `scoring`       | Any change to a formula, weight, or threshold in [`docs/scoring.md`](docs/scoring.md). Requires an ADR.                                            |
| `provider`      | New or updated BYOK provider adapter (DataForSEO, SerpApi, OpenAI, etc.).                                                                          |
| `refactor`      | Internal cleanup with no user-visible change. **Only open if a maintainer explicitly asked for it** — see [How to contribute](#how-to-contribute). |
| `dependencies`  | Dependency bumps, lockfile refreshes, Renovate/Dependabot PRs.                                                                                     |

Add `breaking-change` **on top of** the base type if the PR forces a major version bump: REST API contract change, scoring `formula_version` reset, provider adapter interface change, database schema migration that is not backward-compatible, etc.

### Scope — optional, one or more

Add only when the change is narrowly confined. Skip scope labels entirely for cross-cutting work — the type label plus a clear PR body is enough.

| Label             | Code it covers                                                                |
| :---------------- | :---------------------------------------------------------------------------- |
| `scope:crawler`   | Extraction workers, Crawlee, Puppeteer, Lighthouse integration, URL frontier. |
| `scope:analysis`  | Analysis workers, HTML → Markdown pipeline, NLP, embeddings.                  |
| `scope:scoring`   | Deterministic score engines and the formula implementations.                  |
| `scope:api`       | Fastify + Zod gateway, auth, RBAC, request validation.                        |
| `scope:ui`        | Next.js frontend, dashboards, exports.                                        |
| `scope:providers` | BYOK provider adapters.                                                       |
| `scope:infra`     | Docker Compose, Helm charts, CI workflows, release tooling.                   |
| `scope:docs`      | `docs/`, `README.md`, `CONTRIBUTING.md`.                                      |

### Meta — apply as needed

| Label              | When to use                                                                                                                   |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `ai-assisted`      | **Required** whenever an AI coding agent wrote any part of the diff. See [AI-assisted PRs welcome](#ai-assisted-prs-welcome). |
| `good first issue` | **Maintainer-applied** on issues suitable for new contributors. Do not add it to your own PR.                                 |
| `help wanted`      | **Maintainer-applied** to signal a stalled PR that needs a second reviewer.                                                   |
| `question`         | For issues, not PRs. If your PR raises an open question, open a discussion instead.                                           |

If a label you need does not exist yet, mention it in the PR body and the maintainer will create it — do not block on missing labels.

---

## AI-assisted contributions

SEOpen is built in an era where AI-assisted development is the default, not the exception. PRs generated with Claude Code, Codex, Cursor, Copilot, Aider, or any other coding agent are **first-class contributions**. The project dog-foods AI assistance itself — the foundation docs you are reading were drafted with Claude. What matters is the quality of what lands, not who (or what) typed it.

This section exists because "the agent did it" is not a defense for a bad PR. The human who opens the PR **owns the diff** — every line, every test, every assumption. These guidelines keep that ownership honest.

### The three non-negotiables

1. **You read the diff.** Every line. If you can't explain what a function does, do not submit it. Reviewers will ask.
2. **The Golden Rule still applies.** No production code without a test. No score change without a formula update. Agents are not exempt.
3. **You resolve bot review conversations yourself.** Code review bots (CodeRabbit, Codecov, the agent's own review replies) leave comment trails. Do not leave "fixed" threads for maintainers to clean up.

### Disclosure checklist

If an agent wrote **any part** of the diff, the PR description must include:

- [ ] **`ai-assisted` label applied** (and optionally prefix the title with `[ai]`)
- [ ] **Agent and model** — e.g. `Claude Code + Opus 4.6`, `Codex + GPT-5`, `Cursor + Sonnet 4.6`
- [ ] **Scope of assistance** — pick one:
  - `authored`: agent wrote ~all of it, human reviewed and tested
  - `co-authored`: human + agent wrote roughly equal parts
  - `completed`: agent completed pre-existing human scaffolding
  - `suggestion`: agent suggestions accepted line-by-line inside an IDE
- [ ] **Testing level** — `untested` / `lightly tested` / `fully tested` (Phase 1+). Untested AI-authored production code will be rejected.
- [ ] **Prompt summary** — one or two lines if the session context would help review. Full transcripts are welcome but not required.
- [ ] **Verification statement** — "I read the diff and understand what it does" (literal words are fine). Not optional.

### What "good" looks like

A well-framed AI-assisted PR reads like any other good PR, with the disclosure block at the top:

> **AI-assisted (`authored`).** Claude Code + Opus 4.6. Asked for a Crawlee-based seed crawler that respects `robots.txt` and per-domain rate limits. Reviewed the diff line-by-line; added three regression tests beyond what the agent proposed (see `tests/crawler/rate-limit.test.ts`). `fully tested`.
>
> **Why:** First piece of the Phase 1 Technical SEO Auditor MVP (see [`docs/roadmap.md`](docs/roadmap.md) Phase 1).
>
> **What:** New `@seopen/extractor` package with a seed crawler, robots parser, and Redis-backed per-domain rate limiter. No scoring yet.
>
> **Verification:** I read the diff and understand what it does. `pnpm test` green locally.

Note what's not there: an apologetic "sorry if there are bugs, the AI made me do it" disclaimer. Own the diff.

### Review standards

Review quality is the same bar whether a human or an agent wrote the code. Reviewers will pay extra attention to the places AI agents most commonly drift:

- **Phantom APIs.** Agents confidently invent function signatures, library methods, and CLI flags that do not exist. If the PR cites `someLibrary.doThing()`, the reviewer will check whether `doThing` is a real method on the current version of `someLibrary`.
- **Over-refactoring.** Agents love to "clean up while they're in there." PRs that touch 40 files to fix one bug will be asked to split into a focused fix + follow-up refactors (if the refactors were even desired — see [How to contribute](#how-to-contribute)).
- **Test theater.** Tests that mock every dependency and assert on the mocks, not on behavior, will be rejected. Property tests for scoring formulas, characterization tests for extraction, integration tests with real Docker Compose infra.
- **Hallucinated citations.** Scoring methodology proposals that cite papers or data must link to something that actually exists. "Research shows…" with no link is not evidence.
- **Comment spam.** Agents sometimes add a docstring to every line. Keep comments purposeful. If a line needs a comment to be understood, consider rewriting the line.
- **License laundering.** Large verbatim code blocks pulled from training data are a risk. If the agent produces a chunk of code that looks suspiciously polished, search for it — the project cannot accept code copied from GPL/AGPL sources, and attribution is required for MIT/BSD-licensed snippets.
- **Secret echoing.** Agents sometimes paste back environment variables, API keys, or access tokens that appeared in the prompt context. Before opening the PR, grep the diff for `sk-`, `ghp_`, `AKIA`, `Bearer `, `-----BEGIN`, and anything that looks like a token. If you find one, **do not amend it out** — rotate the key immediately and then clean the history.

### What's explicitly allowed

- **Using an agent to draft the entire PR**, including tests, as long as you read, understand, and test the output.
- **Using an agent to migrate or translate snippets** when evaluating third-party libraries or prior-art ports — common and genuinely useful here.
- **Using an agent to explore unfamiliar codebases** and synthesize a proposed change.
- **Using an agent to write documentation**, including this file. Transparency matters more than authorship.
- **Pasting session transcripts** into the PR body. If a reviewer asks "why did you do it this way," a transcript is a valid answer.
- **Running multiple agents on the same problem** and picking the best output. Nothing weird about that.

### What's explicitly not allowed

- **Drive-by AI PRs.** "I don't really know what this does but the AI said it fixes #42" will be closed.
- **Undisclosed AI authorship.** If the agent wrote it, label it. The `ai-assisted` label is not a scarlet letter — it's metadata. Hiding it is a trust violation, not a style choice.
- **AI-generated commit floods.** 40 commits of "fix lint", "fix lint again", "actually fix lint" because the agent looped. Squash before pushing.
- **AI-generated bug reports with no reproducer.** "The agent says there's a race condition in the URL frontier" is not an issue. A failing test, a stack trace, or a repro command is.
- **Copy-pasting agent-generated scoring formulas without an ADR.** Scoring changes always need an ADR with evidence. An agent suggesting "what if we weighted factual density at 35% instead of 30%" is a starting point for a discussion, not a PR.

### If the agent broke something on main

Not your fault, not the agent's fault. Open an issue with the failing test, the suspected commit, and a short description. Then open a focused PR with the fix. Do not open a PR that reverts half of main to "get back to a known good state" — that makes triage harder, not easier.

### Summary

The project welcomes AI-assisted contributions unconditionally. It also reviews them unconditionally. The label exists so reviewers can focus attention where it helps; it does not lower the quality bar, and it does not raise it. **Own the diff, disclose the assist, resolve the bot comments, pass the tests.** That's the whole deal.

---

## Dev setup (Phase 1+)

> **Phase 0 note.** No code has been merged yet. The commands below describe the **target** development loop and will become live when Phase 1 begins. If you want to contribute code before then, open a discussion first — you would be defining the project structure rather than contributing to it.

SEOpen is a single-runtime TypeScript stack. You will need:

- **Node.js ≥ 20** — extraction, analysis, scoring, API gateway, and frontend all ship as TypeScript.
- **pnpm** — workspace dependency manager.
- **Docker & Docker Compose** — local PostgreSQL (with pgvector), Redis, and MinIO.

```bash
git clone https://github.com/<org>/seopen.git
cd seopen
docker compose up -d              # Postgres + pgvector, Redis, MinIO
pnpm install                      # pnpm workspaces (extractor, analysis, api, scoring, web, cli)
pnpm test                         # full suite must stay green
```

The exact commands will be pinned in `docs/development-setup.md` when Phase 1 opens. Target Time-to-First-Audit from a clean clone is **under five minutes**.

### Running services standalone

You do not need the full stack to develop against a single service. Each workspace package can be booted in isolation against the Docker Compose infrastructure:

```bash
# Extraction worker
pnpm --filter @seopen/extractor dev

# Analysis worker
pnpm --filter @seopen/analysis dev

# API gateway
pnpm --filter @seopen/api dev

# Frontend
pnpm --filter @seopen/web dev
```

### Running the plugin against itself

SEOpen's Phase 1 quality goal is that **its own docs pass its own audit**. Once the auditor is live you will be able to point it at this repository's documentation site and see the SEO + GEO scores for the project's own pages. Regressions in that score are a meaningful review signal.

---

## Test layout (Phase 1+)

SEOpen uses two top-level pnpm workspace roots:

- **`packages/`** — libraries and the `seopen` CLI. Every package is `@seopen/<name>`, ESM, ships both `src/` (dev) and `dist/` (build) and exposes a `source` export condition so workspace consumers resolve TypeScript directly during development. The opening Phase 1 slice lives here.
- **`services/`** — long-running services (API gateway, extraction worker pool, analysis worker pool, Next.js frontend). These land incrementally as Phase 1 continues.

```text
packages/
├── types/                TypeScript · Zod schemas shared across every layer
│   └── test/
├── fetch/                TypeScript · HTTP client + robots.txt compliance
│   └── test/
├── parse/                TypeScript · HTML → PageSignals extraction
│   └── test/
├── scoring/              TypeScript · deterministic score engines
│   └── test/             (property tests for every formula via fast-check)
└── cli/                  TypeScript · `seopen` Commander.js binary
    └── test/

services/
├── extractor/            TypeScript · Crawlee, Puppeteer, Lighthouse       (planned)
│   └── test/
├── analysis/             TypeScript · HTML→Markdown, NLP, embeddings        (planned)
│   └── test/
├── api/                  TypeScript · Fastify + Zod gateway                 (planned)
│   └── test/
└── web/                  TypeScript · Next.js frontend                      (planned)
    └── test/
```

- **Backend and shared packages** use the built-in `node:test` runner where possible; Vitest is acceptable for the frontend.
- **Scoring packages** must include property-based tests (`fast-check`) for every formula — the inputs are continuous and off-by-one errors in thresholds are otherwise invisible.
- **Provider adapters** use **recorded-response fixtures**, never live API calls, to avoid CI quota burn.

Fixtures shared across packages live at the repo root under `fixtures/`.

---

## Coding conventions

- **TypeScript strict mode.** `strict: true` and `exactOptionalPropertyTypes: true` for every package. Optional fields use `?:` and conditional spread (`...(x ? { x } : {})`) rather than assigning `undefined`. Schema validation at every boundary uses Zod.
- **Pure engines.** Scoring and SARIF-style report generators take their inputs as plain values and never read `process.env` or `fs.*` directly. Environment reads live in dedicated config modules. Filesystem I/O is concentrated at service entrypoints and hook scripts.
- **English only.** Code, docs, commit messages — all in English. SEOpen is published under an international license; keep it accessible to international contributors.
- **No suppression markers.** `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# type: ignore`, `# noqa`, `# nosec` are flagged in review. If you need to suppress a lint, fix the lint instead; if you truly cannot, open an issue explaining why.
- **Conventional Commits.** `feat(crawler): add depth limit`, `fix(scoring): correct LCP threshold interpolation`, `docs(scoring): worked example for GEO Content Score`, `refactor(api): extract provider adapter interface`, `test(crawler): fixture for SPA rendering`, `chore(deps): bump puppeteer to 22.x`.

---

## Documentation contributions

Documentation is not a second-class contribution. It is treated with the same review rigor as code.

- **Small fixes** (typos, broken links, clarity edits) — open a PR directly.
- **New content** (tutorials, guides, write-ups) — open a discussion first so scope and placement can be confirmed.
- **Changes to foundation docs** (`docs/overview.md`, `docs/vision.md`, `docs/modules.md`, `docs/scoring.md`, `docs/architecture.md`, `docs/data-integrations.md`, `docs/roadmap.md`, `docs/community.md`, `docs/glossary.md`) — treated as binding project decisions. Significant edits should be accompanied by an ADR under `docs/adr/`.

Style notes:

- Write in **clear, complete sentences**, not bullet-point stubs. Tables, lists, and diagrams supplement prose; they do not replace it.
- Avoid marketing voice. "SEOpen measures _X_ by computing _Y_" beats "SEOpen's powerful, cutting-edge _X_ engine delivers unmatched _Y_."
- Reference other docs with relative links, not absolute URLs.
- Keep line-lengths reasonable — no hard wrap, but do not produce 400-character lines either.

---

## Provider adapter contributions

Adding a new BYOK provider is an especially clean contribution shape because the integration contract is narrow and well-defined. See [`docs/data-integrations.md`](docs/data-integrations.md) §5.7 for the full checklist. The short form:

1. Implement the `Provider` interface defined in §5.4.
2. Include integration tests against **recorded fixtures**, never against live APIs (to avoid CI quota burn).
3. Document the provider under `docs/providers/<name>.md` — covering authentication, rate limits, pricing, and any provider-specific quirks.
4. Declare configuration schema in the central provider config registry.
5. Implement a `health_check()` that does not consume paid credits.
6. Respect all credential-handling rules from §5.5 (encrypted at rest, redacted in logs, scoped access).

Provider adapters that violate the credential-handling rules will not be merged.

---

## Scoring methodology contributions

The scoring formulas in [`docs/scoring.md`](docs/scoring.md) are **not sacred**. They are documented precisely so they can be challenged, improved, and evolved over time. Methodology proposals are genuinely welcome.

Requirements for a scoring change to be considered:

1. **Evidence.** Cite the research, data, or empirical observation that motivates the change.
2. **Formulation.** State the current formula, the proposed formula, and the specific difference.
3. **Impact estimate.** Run the proposed formula on a representative set of historical scores and show how they shift.
4. **Backward compatibility plan.** Scoring changes never back-fill historical records ([`docs/scoring.md`](docs/scoring.md) §3.4). Your proposal must include the `formula_version` bump strategy.
5. **ADR.** Open an ADR under `docs/adr/` capturing the proposal. Significant scoring changes are always ADR-worthy.

---

## Release process (maintainer only)

> **Version bumps, `CHANGELOG.md` entries, git tags, and container publishes are the maintainer's responsibility — not contributors'.**
>
> Opening a PR is the end of the contributor workflow. Please **do not** edit the version field in `package.json` / `pyproject.toml`, add a new section to `CHANGELOG.md`, or run any release script in your PR. Describe the change in your PR body (the _what_ and the _why_) and the maintainer will curate release notes when cutting the next version.

The exact release tooling will be wired up in Phase 1. Until then, releases do not exist.

---

## Pull request checklist

Before asking for review:

- [ ] Descriptive title following Conventional Commits
- [ ] Clear PR body explaining **what** changed and **why**
- [ ] Linked issue or discussion (for non-trivial changes)
- [ ] **At least one type label** applied (see [PR labels](#pr-labels)), plus `ai-assisted` if an agent touched the diff
- [ ] New code has tests (Golden Rule — Phase 1+)
- [ ] Score changes include a formula update in [`docs/scoring.md`](docs/scoring.md) and a `formula_version` bump
- [ ] Documentation updated alongside code changes — undocumented code changes are incomplete
- [ ] CI green (Phase 1+)
- [ ] `package.json` / `pyproject.toml` versions **not** bumped and `CHANGELOG.md` **not** edited — releases are maintainer-only
- [ ] CLA signed

---

## Reporting bugs

Until Phase 1 ships a CLI, bug reports go through GitHub Issues. Include:

1. SEOpen version or commit SHA.
2. Platform and runtime versions (Node, pnpm, Docker).
3. Steps to reproduce.
4. Expected vs. actual behavior.
5. Relevant logs (with secrets redacted).

Reproducible reports are among the most valuable contributions the project can receive.

---

## Reporting a security vulnerability

**Do not open a public issue for security bugs.**

Report vulnerabilities via **GitHub's private security advisory** on the repository. If that channel is not yet enabled, email the maintainers directly — the address will be published in `SECURITY.md` when the file lands in Phase 0.

Please include:

1. Affected component — crawler / API gateway / credential handling / provider adapter / frontend / infra.
2. Severity assessment.
3. Reproduction steps.
4. Demonstrated impact.
5. Suggested remediation (if any).

Reports without reproduction steps and demonstrated impact will be deprioritized. Security reports are acknowledged within 48 hours and prioritized above all non-security work. Responsible disclosure is credited in the release notes at the reporter's option.

---

## Where to get help

- **Documentation** — start with [`README.md`](README.md) and the [`docs/README.md`](docs/README.md) index.
- **GitHub Discussions** — questions, feature proposals, methodology debates.
- **GitHub Issues** — bug reports, tracked feature work.
- **Discord** — real-time chat (link to be published in Phase 0).

Maintainers are people. They respond on reasonable schedules, not instantly. Persistent polite follow-ups are welcome; public pressure campaigns are not.

---

## Related reading

- [Documentation index](./docs/README.md)
- [Vision & strategic context](./docs/vision.md)
- [Modules & feature surface](./docs/modules.md)
- [Scoring models](./docs/scoring.md)
- [Architecture](./docs/architecture.md)
- [Data integrations](./docs/data-integrations.md)
- [Roadmap](./docs/roadmap.md)
- [Community & governance](./docs/community.md)
- [Glossary](./docs/glossary.md)

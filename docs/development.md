# Development setup

Everything a new contributor — human or AI agent — needs to clone SEOpen, run its tests, and exercise the shipped tooling end-to-end on a developer laptop.

This document is the **operational** counterpart to [`../CONTRIBUTING.md`](../CONTRIBUTING.md), which covers the **policy** side (Golden Rule, PR labels, CLA, AI-assisted work, scoring-methodology process). If you find yourself asking "how do I run X?", you are in the right place. If you are asking "how do I contribute Y?", start with CONTRIBUTING.md.

---

## Prerequisites

| Tool                        | Required version                             | Why                                                                                                                                                 |
| --------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**                 | `≥ 20` (LTS pinned in [`.nvmrc`](../.nvmrc)) | Runtime for every `@seopen/*` package per [ADR A-001](adr/A-001-single-runtime-nodejs.md). Use `nvm use`, `fnm use`, or your distro package.        |
| **pnpm**                    | `9.x`                                        | Workspace manager pinned via `packageManager` in the root `package.json`. Install with `corepack enable` (Node ≥ 16.10) or `npm install -g pnpm@9`. |
| **Git**                     | any modern version                           | Obvious.                                                                                                                                            |
| **Docker + Docker Compose** | optional, required later                     | Not needed for the current Phase 1 slice. Will be required once PostgreSQL / Redis / MinIO land via the extractor and api services.                 |

There is no Python, Java, Go, or Ruby in the critical path. See [ADR A-001](adr/A-001-single-runtime-nodejs.md) for why.

### One-shot prerequisites check

```bash
node --version          # v20.x.x
pnpm --version          # 9.x.x
git --version           # any
```

If `pnpm` is missing, the fastest path (no sudo):

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

If `corepack enable` is not writable on your system (shared / managed node install), route pnpm through a user-scoped npm prefix:

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
npm install -g pnpm@9.12.3
export PATH="$HOME/.npm-global/bin:$PATH"   # add to ~/.zshrc or ~/.bashrc to persist
```

---

## Clone and install

```bash
git clone https://github.com/ahernandez-developer/SEOpen.git
cd SEOpen
pnpm install
```

`pnpm install` takes about 5 seconds on a warm cache and installs ~150 packages into `node_modules/` at the repo root (hoisted via pnpm's content-addressed store).

---

## Workspace layout

```
SEOpen/
├── packages/              # libraries + CLI (shipped in Phase 1)
│   ├── types/             # Zod schemas + TypeScript types shared across every layer
│   ├── fetch/             # HTTP client with robots.txt compliance
│   ├── parse/             # HTML → PageSignals extraction
│   ├── scoring/           # Deterministic score engines
│   └── cli/               # `seopen` Commander.js binary
├── services/              # long-running services (planned Phase 1+)
│   ├── extractor/         # Crawlee, Puppeteer, Lighthouse (planned)
│   ├── analysis/          # HTML → Markdown, NLP, embeddings (planned)
│   ├── api/               # Fastify + Zod gateway (planned)
│   └── web/               # Next.js frontend (planned)
├── fixtures/              # golden HTML fixtures shared across package tests
│   └── geo/               # zero-stats / ideal-geo-ready / fails-geo
├── docs/                  # this tree
│   └── adr/               # accepted Architecture Decision Records
├── .github/workflows/     # CI
├── tsconfig.base.json     # shared compiler options
├── tsconfig.json          # root project references
├── tsconfig.eslint.json   # ESLint project config (includes src/ + test/)
├── eslint.config.js       # ESLint 9 flat config
└── .prettierrc.json       # Prettier 3
```

Source and test files live side-by-side in each package:

```
packages/<name>/
├── src/                   # source
├── test/                  # node:test + fast-check tests
├── package.json           # @seopen/<name> manifest
└── tsconfig.json          # extends ../../tsconfig.base.json
```

Workspace imports use the `source` export condition, so packages consume each other's **TypeScript source** during development and the compiled `dist/` output once `pnpm build` has run.

---

## Everyday commands

All commands run from the repo root unless noted.

| Command             | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| `pnpm install`      | Install / sync the workspace dependency graph.                             |
| `pnpm typecheck`    | Run `tsc --build` across every package (emits `dist/` + `.d.ts`).          |
| `pnpm lint`         | Run ESLint 9 + typescript-eslint across the workspace.                     |
| `pnpm format`       | Apply Prettier to every file Prettier owns.                                |
| `pnpm format:check` | Verify formatting without writing (used in CI).                            |
| `pnpm test`         | Run every package's `test` script in parallel with streamed output.        |
| `pnpm build`        | Alias for `pnpm typecheck` — emits `dist/` via `tsc --build`.              |
| `pnpm clean`        | Remove every `dist/` and `*.tsbuildinfo`. Useful before a fresh typecheck. |

### Running a single package in isolation

```bash
pnpm --filter @seopen/scoring test
pnpm --filter @seopen/parse test --watch
pnpm --filter @seopen/cli build
```

### Running the CLI directly

The CLI needs no build step during development because the `source` export condition resolves `@seopen/*` imports to TypeScript. Three equivalent invocations:

```bash
# (1) Direct against source (fastest iteration)
node --import tsx --conditions=source packages/cli/src/bin.ts geo score https://example.com

# (2) After `pnpm build`, against the compiled output
node packages/cli/dist/bin.js geo score https://example.com

# (3) Inside the @seopen/cli workspace
pnpm --filter @seopen/cli start -- geo score https://example.com
```

The full CLI reference — subcommands, flags, exit codes, output formats — lives in [`cli.md`](cli.md).

---

## Testing

Every package uses Node's built-in `node:test` runner. Scoring packages additionally use `fast-check` for property-based tests on every formula, per [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §Test layout. Tests are invoked via:

```bash
# everything
pnpm test

# one package
pnpm --filter @seopen/scoring test

# one file
node --import tsx --conditions=source --test packages/scoring/test/geo-content.test.ts
```

### Writing a new test

Create `packages/<pkg>/test/<something>.test.ts`. Use `describe` / `it` from `node:test` and `strict as assert` from `node:assert`. Example:

```ts
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { scoreGeoContent } from '../src/index.ts';

describe('scoreGeoContent', () => {
  it('matches the §3.3 worked example', () => {
    const { score, band } = scoreGeoContent({
      factInterpretability: 0.1,
      semanticRelevance: 0.8,
      conversationalTone: 1.0,
      structure: 1.0,
      engagement: 1.0,
    });
    assert.equal(score, 68);
    assert.equal(band, 'moderate');
  });
});
```

### The Golden Rule

Per the [claude-crap](https://github.com/ahernandez-developer/claude-crap) quality gate that governs this repo: **no functional code lands without a characterization test pinning it first**. Write the test before the implementation. Property tests (`fast-check`) are required for every scoring formula because off-by-one threshold errors are invisible without them.

---

## End-to-end smoke test

The fastest way to confirm your environment is healthy:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
node --import tsx --conditions=source packages/cli/src/bin.ts \
  geo score file://$PWD/fixtures/geo/zero-stats.html \
  --topics "sourdough,baking"
```

Expected output: `Final score: 68 / 100  (band: moderate)` on the zero-stats fixture. If that number is different, something has drifted — open an issue.

> **Note:** `file://` URLs are not supported by the current `@seopen/fetch` implementation (HTTP/HTTPS only). To smoke-test locally without a live URL, spin up a one-liner HTTP server:
>
> ```bash
> npx --yes http-server fixtures/geo -p 8765 &
> node --import tsx --conditions=source packages/cli/src/bin.ts \
>   geo score http://127.0.0.1:8765/zero-stats.html --topics sourdough
> ```

---

## Coding conventions

Enforced by ESLint + Prettier + `tsc --strict`. Highlights:

- **TypeScript strict mode.** `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride` all enabled in [`tsconfig.base.json`](../tsconfig.base.json). Optional fields use `?:` and conditional spread, not `| undefined` assignments. Schema validation at every boundary uses Zod.
- **Pure engines.** Scoring packages take inputs as plain values and never read `process.env`, `fs.*`, or any global environment. Environment reads live in dedicated config modules. Filesystem I/O is concentrated at service entrypoints and hook scripts.
- **English only.** Code, docs, commit messages. SEOpen publishes under an international license; keep it accessible to international contributors.
- **No suppression markers.** `eslint-disable`, `@ts-ignore`, `@ts-expect-error` are flagged in review. If you need to suppress a lint, fix the lint; if you truly cannot, open an issue with a justification.
- **Conventional Commits.** Examples from the current history:
  - `feat(scoring): GEO Content Score §3.3 engine`
  - `fix(fetch): respect robots.txt Crawl-delay directive`
  - `docs(adr): A-013 llms.txt and §3.6 GEO Site Readiness Score`
  - `chore: initialize pnpm workspace scaffold`
  - `test(scoring): pin fails-geo fixture to the Fails band`
  - `refactor(parse): extract readability helpers`
- **Branch naming.** `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`, etc. Slug describes the feature / change, not a phase or ticket id.

Full policy in [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Running SEOpen against itself

SEOpen's Phase 1 quality goal is that **its own docs pass its own audit**. Once the Lighthouse-enabled extractor service lands, you will be able to point `seopen` at this repository's documentation site and see the SEO and GEO scores for its own pages. Regressions in that score will be treated as a meaningful review signal.

Until then, the quickest way to see the CLI in action is the smoke-test recipe above or a real URL of your choosing, per [`cli.md`](cli.md).

---

## Troubleshooting

**`pnpm install` fails with `EACCES`.** Your npm prefix is root-owned. Use the user-scoped prefix recipe in [Prerequisites](#prerequisites).

**`pnpm lint` fails with `parserOptions.project`.** The ESLint config references `tsconfig.eslint.json`. If you added files outside the include globs (`packages/*/src/**/*.ts` and `packages/*/test/**/*.ts`), extend the include list rather than disabling the rule.

**`pnpm test` hangs on an HTTP fixture.** Make sure no stray dev server is holding the test port. `lsof -i :8765` (or the relevant port) identifies the offender.

**`@seopen/X` cannot be resolved when linting.** The `tsconfig.eslint.json` `paths` map resolves every `@seopen/*` import to its source entry. If you add a new package, add a matching entry there.

**CI lint passes locally but fails on GitHub.** Run `pnpm clean && pnpm install --frozen-lockfile && pnpm lint`. The combination mirrors CI exactly. See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## Where to look next

- [`cli.md`](cli.md) — detailed `seopen` CLI reference.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution policy, PR labels, scoring-methodology process.
- [`adr/README.md`](adr/README.md) — accepted architecture decisions.
- [`scoring.md`](scoring.md) — the math every score traces back to.
- [`roadmap.md`](roadmap.md) — what ships next.

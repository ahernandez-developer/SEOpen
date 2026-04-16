# `seopen` CLI — Usage

The `seopen` command-line tool is the developer-facing entry point to SEOpen's scoring pipeline. It wraps the `@seopen/fetch`, `@seopen/parse`, and `@seopen/scoring` packages into a single-binary workflow that takes a URL in and emits a scored report.

This document tracks the shipped CLI surface. It grows with each Phase 1 slice.

---

## Installation

The CLI is shipped as a pnpm workspace package (`@seopen/cli`) and runs from the repository clone while the project is in pre-release. Public npm publishing lands once the Phase 1 MVP is complete.

### Prerequisites

- **Node.js ≥ 20** (pinned via `.nvmrc`).
- **pnpm 9** (pinned via the root `package.json` `packageManager` field — use `corepack enable` or install via your package manager of choice).

### From a clean clone

```bash
git clone https://github.com/ahernandez-developer/SEOpen.git
cd SEOpen
pnpm install
pnpm build       # emits each package's dist/ via `tsc --build`
```

### Running the CLI

Three equivalent ways to invoke the binary while developing:

```bash
# (1) Direct, against TypeScript source — no build step required
node --import tsx --conditions=source packages/cli/src/bin.ts geo score <url>

# (2) Via pnpm filter once packages are built
pnpm --filter @seopen/cli start -- geo score <url>

# (3) Via the compiled binary (after `pnpm build`)
node packages/cli/dist/bin.js geo score <url>
```

The `--conditions=source` flag tells Node to resolve `@seopen/*` workspace imports to their `src/` entrypoints (via each package's `source` export condition) so you never need to rebuild while iterating on the CLI. Production usage always goes through the compiled `dist/` output.

---

## `seopen geo score <url>`

Computes the **GEO Content Score** ([`scoring.md` §3.3](scoring.md)) for a single URL by fetching it, extracting a `PageSignals` bundle, mapping those signals to the 5 sub-score inputs, and applying the published formula.

### Synopsis

```
seopen geo score <url> [options]
```

### Arguments

| Argument | Description                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| `<url>`  | Fully-qualified URL to score. Must include the scheme (`http://` or `https://`). |

### Options

| Option                  | Default | Description                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-t, --topics <list>`   | `""`    | Comma-separated topic keywords used to compute the deterministic Semantic Relevance placeholder. Example: `--topics "geo,seo,ai search"`. When empty, Semantic Relevance falls back to a neutral 0.5 per [ADR A-009](adr/A-009-llm-optional-never-required.md) (LLM calls are optional, never required).                                                  |
| `-f, --format <format>` | `table` | Output format. `table` emits a human-readable ASCII summary on stdout; `json` emits the full `GeoContentScoreResult` JSON object (score, band, inputs, weights, provenance).                                                                                                                                                                              |
| `--no-respect-robots`   | —       | **Advanced.** Skip the `robots.txt` check before fetching. Only use on sites you own or for which you have explicit authorization to crawl outside the declared policy. The default (`respect-robots: true`) reflects the responsible-crawling ethos in [ADR A-008](adr/A-008-byok-third-party-indexes.md) and [`architecture.md` §4.9](architecture.md). |
| `--help`                | —       | Show inline help for the subcommand.                                                                                                                                                                                                                                                                                                                      |

### Exit codes

| Code | Meaning                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Score computed successfully.                                                                                                                         |
| `1`  | Fetch failed (network error, non-2xx response, `robots.txt` denial without `--no-respect-robots`, HTML parse failure). Error message goes to stderr. |
| `2`  | Invalid CLI arguments (Commander.js reports the specifics on stderr).                                                                                |

### Example — table output

```bash
$ seopen geo score https://example.com/blog/your-article --topics "ai search,content strategy"

GEO Content Score — https://example.com/blog/your-article

Final score: 68 / 100  (band: moderate)

Sub-scores (0.00 – 1.00):
  factInterpretability 0.10
  semanticRelevance    0.80
  conversationalTone   1.00
  structure            1.00
  engagement           1.00

Provenance:
  formula:  3.3.0
  weights:  default-v1
  computed: 2026-04-16T12:00:00.000Z
```

The worked example from [`scoring.md` §3.3](scoring.md) — a well-structured, friendly-tone article with zero hyperlinked statistics — lands exactly here. The CLI's characterization test asserts it.

### Example — JSON output

```bash
$ seopen geo score https://example.com --topics "geo" --format json
```

```json
{
  "score": 68,
  "band": "moderate",
  "inputs": {
    "factInterpretability": 0.1,
    "semanticRelevance": 0.8,
    "conversationalTone": 1.0,
    "structure": 1.0,
    "engagement": 1.0
  },
  "weights": {
    "factInterpretability": 0.3,
    "semanticRelevance": 0.25,
    "conversationalTone": 0.2,
    "structure": 0.15,
    "engagement": 0.1
  },
  "provenance": {
    "formulaVersion": "3.3.0",
    "weightsVersion": "default-v1",
    "sourceVersions": {
      "fetch": "0.0.0",
      "parse": "0.0.0",
      "scoring": "0.0.0"
    },
    "computedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

JSON output is stable for pipeline consumers — the schema is the `GeoContentScoreResult` Zod schema published by `@seopen/types`.

### Reading the output

| Field        | Meaning                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `score`      | Final 0–100 composite per [§3.3 formula](scoring.md).                                                                                                       |
| `band`       | One of `best-in-class` / `strong` / `moderate` / `weak` / `fails` per the §3.3 interpretation-band table.                                                   |
| `inputs`     | The 5 unit-interval sub-scores fed into the formula. The lowest one is usually the highest-impact remediation target.                                       |
| `weights`    | The weights in effect when the score was computed. Stable in v0 at the §3.3 defaults.                                                                       |
| `provenance` | `formulaVersion`, `weightsVersion`, `sourceVersions`, and `computedAt` — required by [`scoring.md` §3.4](scoring.md) so every stored score is reproducible. |

The table output sorts sub-scores in the order published in §3.3. The JSON output is schema-faithful and is the canonical form for downstream tooling.

---

## Known limitations (v0)

- **No headless-browser rendering.** The CLI fetches the raw HTML via `@seopen/fetch` (Node's built-in `fetch` + `undici`). JavaScript-rendered SPAs that ship shell-only HTML to non-browser clients score low because there is no content to analyze at the crawled surface. A live smoke test against [ganttfather.com](https://ganttfather.com/) returns a Fails-band score for exactly this reason — that result is _correct_ for the current pipeline, and will change when the extractor service lands with Crawlee + Puppeteer (per [`roadmap.md`](roadmap.md) Phase 1 exit criteria).
- **Semantic Relevance is a deterministic placeholder.** v0 computes it via keyword-match against the `--topics` list rather than embedding cosine similarity. Local embeddings through `@xenova/transformers` land in a follow-up PR; BYOK embedding providers land alongside the §3.2 AI Visibility module. Until then, supply accurate topic keywords for realistic Semantic Relevance scores.
- **Per-URL only.** The CLI scores one URL per invocation. Breadth-first domain crawling lands with the extractor service in a later Phase 1 slice. Site-level scoring — the [§3.6 GEO Site Readiness Score](scoring.md) introduced by [ADR A-013](adr/A-013-llms-txt-and-geo-site-readiness.md) — lands once the `@seopen/discovery` package arrives.
- **No Lighthouse integration.** The SEO Score §3.1 pipeline is not yet wired through the CLI. It arrives with the Lighthouse slice.

---

## Roadmap of CLI subcommands

The table below tracks the planned CLI surface across Phase 1. Shipped commands are the deterministic MVP; everything else is scoped to a future slice and documented here so contributors can see what the target shape is.

| Command                      | Status                              | Purpose                                                                                                                      | Spec                                                                                       |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `seopen geo score <url>`     | **Shipped (Phase 1 opening slice)** | Per-URL GEO Content Score.                                                                                                   | [`scoring.md` §3.3](scoring.md)                                                            |
| `seopen geo site <domain>`   | Planned                             | Per-domain GEO Site Readiness Score (robots.txt posture, llms.txt quality, sitemap health, structured data, entity clarity). | [ADR A-013](adr/A-013-llms-txt-and-geo-site-readiness.md), [`scoring.md` §3.6](scoring.md) |
| `seopen seo audit <domain>`  | Planned                             | Full-domain SEO Score §3.1 including Lighthouse, internal link graph, indexability audit.                                    | [`scoring.md` §3.1](scoring.md), [`modules.md` §1](modules.md)                             |
| `seopen geo track <project>` | Planned                             | Empirical AI Visibility run against a configured prompt cluster + provider set.                                              | [`scoring.md` §3.2](scoring.md), [`modules.md` §2](modules.md)                             |
| `seopen gap <domain>`        | Planned                             | Keyword + prompt gap analysis against competitor set.                                                                        | [`modules.md` §3](modules.md)                                                              |
| `seopen report <project>`    | Planned                             | Aggregate score report + CSV / JSON / PDF export.                                                                            | [`modules.md` §4](modules.md)                                                              |
| `seopen config`              | Planned                             | Inspect / set BYOK credentials, default weights, project config.                                                             | [`data-integrations.md` §5.5](data-integrations.md)                                        |

---

## Reference

- [`scoring.md` §3.3](scoring.md) — GEO Content Score formula and worked example.
- [`scoring.md` §3.4](scoring.md) — Provenance / versioning requirements every score record carries.
- [`adr/A-008`](adr/A-008-byok-third-party-indexes.md) — responsible-crawling default reflected in `--no-respect-robots` opt-out wording.
- [`adr/A-009`](adr/A-009-llm-optional-never-required.md) — degrade-gracefully posture that keeps the CLI working with no LLM or embedding provider configured.
- [`adr/A-001`](adr/A-001-single-runtime-nodejs.md) — why the CLI is TypeScript, pnpm, Node 20.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — dev setup, coding conventions, test layout.

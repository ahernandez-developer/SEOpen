# A-013 — `llms.txt` adoption and §3.6 GEO Site Readiness Score

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** scoring, geo, discovery-artifacts, llms-txt

## Context

[`llms.txt`](https://llmstxt.org/) is a proposed standard — originated by Jeremy Howard and maintained at [github.com/AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt) — for a single Markdown file served at `/llms.txt` that gives large-language-model clients a curated, token-efficient summary of a site. The format is opinionated:

- An H1 with the site/project name.
- An optional blockquote with a short description.
- Zero or more paragraphs of context.
- H2 sections grouping Markdown link lists; each link has a short inline description.

An optional companion file `/llms-full.txt` extends the same format with full-content copies of the linked resources, so LLMs can ingest the entire site from a single file when doing so is appropriate.

The standard is **nascent** — adoption is measured in the low thousands of sites as of early 2026 — but it directly addresses a measurable problem with LLM ingestion: HTML sites are expensive to tokenize, full of boilerplate, and rarely optimized for model consumption. `llms.txt` is the first format that targets the *model* as a reader rather than the browser or the search crawler.

SEOpen's current scoring catalog covers per-domain SEO (§3.1), empirical AI visibility (§3.2), and per-URL GEO content (§3.3). There is **no per-domain GEO score** — nothing that asks, holistically, *"is this site architecturally ready to be cited by AI?"* That gap is why A-011 needed a new home for AI-crawler posture and why the sitemap health input from A-012 has an awkward fit today.

This ADR fills that gap.

## Decision

SEOpen introduces a new scoring axis, the **GEO Site Readiness Score** (published as `docs/scoring.md` §3.6), and adopts `llms.txt` as one of its five sub-inputs. The score is the **per-domain counterpart to §3.3** — same 0–100 scale, same interpretation bands (90 / 75 / 60 / 40), same provenance requirements, computed once per site rather than once per URL.

### §3.6 formula

```
GEO_Site_Readiness = 100 · (
    w1 · AiCrawlerPosture
  + w2 · LlmsTxtQuality
  + w3 · SitemapHealth
  + w4 · StructuredDataCoverage
  + w5 · EntityClarity
)
```

Default weights — initial estimates subject to empirical revision per `CONTRIBUTING.md` §Scoring methodology contributions:

| # | Sub-input | Weight | Source |
| --- | --- | --- | --- |
| w1 | AiCrawlerPosture | **0.30** | [A-011](A-011-robots-txt-scoring-inputs.md) |
| w2 | LlmsTxtQuality | **0.25** | this ADR |
| w3 | SitemapHealth | **0.20** | [A-012](A-012-sitemap-scoring-inputs.md) |
| w4 | StructuredDataCoverage | **0.15** | this ADR |
| w5 | EntityClarity | **0.10** | this ADR |

Sum: `0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00`. `formula_version: 3.6.0`, `weights_version: default-v1`.

### `LlmsTxtQuality` sub-input (new)

A 0–1 composite computed from:

- **Presence** — `/llms.txt` returns 200 with `Content-Type: text/plain` or `text/markdown`.
- **Structural validity** — parses as Markdown with: H1 present, at least one H2 section, at least one link list under an H2, link lists using the standard ` - [title](url): description` shape.
- **Coverage** — count of H2 sections relative to a target. The target is anchored to the site's apparent information architecture (main navigation groups, sitemap section roots). Sites with a single H2 score low; sites whose H2 sections match the major content areas of the site score high.
- **Link health** — fraction of links in `llms.txt` that return 200 on crawl. A broken-link rate >10 % caps the sub-input at 0.5.
- **`/llms-full.txt` bonus** — presence of a valid `llms-full.txt` adds up to +0.15 to the sub-input (capped at 1.0 overall). Sites that publish the extended form are signaling a higher commitment to LLM-friendly consumption.

The full definition lives in `docs/scoring.md` §3.6; this ADR records the decision to adopt it.

### `StructuredDataCoverage` sub-input (new)

Site-level structured-data signals complement [`../scoring.md`](../scoring.md) §3.1's per-URL schema-completeness input:

- Presence of a site-level `Organization` or `Person` schema on the homepage.
- Presence of `WebSite` schema (with or without `SearchAction`).
- Coverage of content-type schemas across crawled URLs — what fraction of articles carry `Article`, products carry `Product`, events carry `Event`, etc., relative to a simple page-type classifier.

### `EntityClarity` sub-input (new)

A measure of how unambiguously the site tells AI systems *what entity it represents*:

- `sameAs` links to authoritative external identifiers — Wikipedia, Wikidata, Crunchbase, GitHub, LinkedIn, official social profiles.
- Consistent brand mentions across the site (name form, spelling).
- Presence of a canonical `/about/` or similarly well-known page.

### §3.6 interpretation bands

Reuse the §3.3 band table verbatim (90–100 best-in-class / 75–89 strong / 60–74 moderate / 40–59 weak / 0–39 fails). Band consistency across §3.3 and §3.6 lets dashboards present "this page is Strong but the site is Weak" narratives without cross-band translation.

### Worked example (for the future characterization test)

A hypothetical site:

- AI crawler posture: explicit Allow for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot; silence for others. → **0.85**
- `llms.txt` quality: valid, 5 H2 sections matching nav, 100 % link health, `/llms-full.txt` present. → **0.95**
- Sitemap health: `/sitemap.xml` valid, 98 % URL coverage, 2 % stale-entry rate. → **0.92**
- Structured data coverage: Organization + WebSite on homepage, 70 % of articles carry Article schema. → **0.75**
- Entity clarity: Wikipedia + Wikidata + GitHub `sameAs`; consistent brand name; dedicated About page. → **0.90**

```
Score = 100 · (0.30·0.85 + 0.25·0.95 + 0.20·0.92 + 0.15·0.75 + 0.10·0.90)
      = 100 · (0.255 + 0.2375 + 0.184 + 0.1125 + 0.090)
      = 100 · 0.879
      = 87.9
```

Band: `strong`. When `@seopen/scoring`'s `scoreGeoSiteReadiness` ships, this worked example becomes the characterization-test pin the same way the §3.3 "68" worked example pins `scoreGeoContent`.

## Consequences

### Positive

- A **per-domain GEO diagnosis** exists for the first time. Brands can see, at a glance, whether their site is AI-ready infrastructurally, independent of any individual article's quality.
- `llms.txt` gets first-class treatment while the standard is still young — SEOpen is early enough that its scoring treatment can influence adoption norms.
- Cleanly houses the AI-crawler-posture signal from [A-011](A-011-robots-txt-scoring-inputs.md) and the sitemap health signal from [A-012](A-012-sitemap-scoring-inputs.md), without polluting §3.1 (which is SEO-first) or §3.2 (which is empirical-only).
- Same 0–100 + 5-band scale as §3.3, so dashboards and reports treat them uniformly.

### Negative / trade-offs

- `llms.txt` is a **proposed** standard, not a ratified one. If the standard evolves (the spec has already had minor revisions) the `LlmsTxtQuality` sub-input will need to track it via a `weights_version` bump. This is accepted as the cost of being early.
- Site-level scores are expensive to compute — full-site crawl + artifact fetches + `<link rel="canonical">` resolution across every URL. The implementation must be staged (site-level runs are longer-lived than per-URL runs).
- Some of the `EntityClarity` signals are heuristic (is this brand mention consistent?). Empirical calibration is weaker here than for `AiCrawlerPosture` or `SitemapHealth`. The ADR acknowledges this explicitly; the 0.10 weight reflects that calibration uncertainty.

### Neutral

- Introducing `weights_version: default-v1` for the new score establishes a clean slate for empirical revision. Future calibration PRs bump the version alongside the scoring doc.
- Implementation of §3.6 ships in a separate Phase 1 slice. This ADR commits to the decision and the formula; code lives in a follow-up PR that introduces a new `@seopen/discovery` package, adds `scoreGeoSiteReadiness` to `@seopen/scoring`, and exposes `seopen geo site <domain>` on the CLI.

## Alternatives considered

- **Extend §3.3 GEO Content Score with a site-level sub-input.** Rejected. §3.3 is explicitly per-URL; adding a site-level term would duplicate the same site value across every URL and dilute per-URL diagnostics.
- **Extend §3.2 AI Visibility Score with a `siteReadiness` sub-metric.** Rejected. §3.2 is empirical (real citation measurement); mixing a static infra signal into the empirical KPI would conflate causes and outcomes.
- **Ignore `llms.txt` until adoption exceeds 10 % of tracked sites.** Rejected. Early-mover transparency is a core project value ([`../vision.md`](../vision.md)). Waiting to score an emerging standard cedes industry-definition authority to incumbent tools.
- **Score only `llms.txt` presence (boolean).** Rejected. Binary presence is a weak signal; quality and coverage are the real discriminators. A valid, well-maintained `llms.txt` signals much more than a one-line file.
- **Hard-code `llms.txt` spec validation into the scoring engine.** Rejected. The spec is versioned; the scoring engine delegates parsing to a dedicated `@seopen/discovery` module whose version is tracked via `source_versions` provenance.

## References

- [`../scoring.md` §3.6 GEO Site Readiness Score](../scoring.md) — the new section this ADR creates.
- [`../scoring.md` §3.3 GEO Content Score](../scoring.md) — the per-URL sibling.
- [`../modules.md` §2 AI Visibility & GEO Checker](../modules.md) — the module host.
- [A-011](A-011-robots-txt-scoring-inputs.md) — `AiCrawlerPosture` input.
- [A-012](A-012-sitemap-scoring-inputs.md) — `SitemapHealth` input.
- [A-009](A-009-llm-optional-never-required.md) — §3.6 is fully deterministic; no LLM dependency.
- [llmstxt.org](https://llmstxt.org/) and the [llms.txt specification](https://github.com/AnswerDotAI/llms-txt).
- Schema.org vocabularies referenced by `StructuredDataCoverage` and `EntityClarity`: [`Organization`](https://schema.org/Organization), [`WebSite`](https://schema.org/WebSite), [`sameAs`](https://schema.org/sameAs).

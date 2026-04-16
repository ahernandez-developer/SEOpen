# A-012 — `sitemap.xml` and `sitemap-index.xml` as explicit SEO and GEO scoring input

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** scoring, seo, geo, discovery-artifacts, crawling

## Context

XML sitemaps are the declarative counterpart to breadth-first crawling: a site tells a crawler which URLs exist, when they changed, and how the crawler should prioritize them. The [sitemaps.org 0.9 protocol](https://www.sitemaps.org/protocol.html) standardizes the format; index sitemaps (`sitemap-index.xml`) nest many sitemaps for large sites.

In SEOpen the sitemap currently shows up three ways:

1. **Seed for the crawler** — [`../roadmap.md`](../roadmap.md) Phase 1 commits to respecting `sitemap.xml` during the breadth-first crawl.
2. **Informal input to §3.1 Indexability** — same row as `robots.txt` ([A-011](A-011-robots-txt-scoring-inputs.md)), same abstract phrasing today.
3. **Freshness hint for §3.3 GEO Content Score** — [`../modules.md` §2 sub-module B](../modules.md) notes that "sitemap last-mod entries" feed freshness detection, but [`../scoring.md` §3.3](../scoring.md) only enumerates `datePublished`, `dateModified`, and visible `<time>` elements for the per-URL Freshness sub-input.

The content of a sitemap is extremely information-dense for an auditor: the URL list is a declarative bound on what "the site" comprises; `<lastmod>` fixes the publisher's own notion of freshness; `<changefreq>` and `<priority>` (legacy signals) round out editorial intent. All of this is unscored today.

This ADR formalizes sitemaps as an explicit input for both scoring axes.

## Decision

SEOpen treats XML sitemaps as **explicit, decomposed inputs** on two axes.

### 1. SEO Score §3.1 Technical Infrastructure — Crawlability (existing row, formalized)

The Crawlability row of the §3.1 sub-score gains the following formal decomposition. The 20 % weight of the row within §3.1 is unchanged; only the internal decomposition is codified.

| Input                    | Signal                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sitemap discoverability  | At least one sitemap is discoverable via (a) `robots.txt` `Sitemap:` directive, (b) `/sitemap.xml`, or (c) `/sitemap_index.xml`.                                                                                                                                    |
| Sitemap validity         | All discovered sitemaps parse under the [sitemaps.org 0.9 XSD](https://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd).                                                                                                                                           |
| Sitemap index resolution | Any `<sitemapindex>` is followed and all nested `<sitemap>` URLs return parseable XML.                                                                                                                                                                              |
| URL coverage             | Ratio of URLs SEOpen's own crawler reached from the seed to URLs declared in the sitemap. Target ≥ 0.9; low coverage implies either orphan pages (the crawler reached URLs the sitemap omits) or stale sitemaps (the sitemap lists URLs the crawler never reached). |
| Stale-entry rate         | Ratio of sitemap-declared URLs that return 4xx, 5xx, or 3xx-redirect-to-elsewhere when fetched. Target ≤ 0.05.                                                                                                                                                      |
| HTTPS consistency        | All sitemap URLs share the canonical HTTPS scheme of the declaring site.                                                                                                                                                                                            |

Depth-of-reach, orphan detection, and crawl-budget hygiene (the original Crawlability row text) remain included; the sitemap inputs above sit alongside them.

### 2. GEO Content Score §3.3 — Freshness cross-signal (existing Freshness sub-input, formalized)

The §3.3 Freshness sub-score (itself part of the `engagement` signal bundle in the implementation) adds `<lastmod>` as an additional data source:

- The per-URL Freshness sub-input already considers `datePublished`, `dateModified`, and `<time datetime>` elements on the page.
- This ADR adds: if the URL appears in a sitemap with a `<lastmod>` entry, that timestamp is treated as a **peer** to the page-embedded timestamps. The most recent of all observed sources wins.
- This closes a real gap: publishers often update `<lastmod>` in their sitemap without updating visible date stamps on the rendered page. Under the prior formulation, such updates were invisible to the scoring engine.

The formula and weights of §3.3 are **unchanged**. Only the input sourcing gains a channel. `formula_version` stays `3.3.0`; a new `source_versions` entry (`sitemap: <url>`) documents the provenance per `docs/scoring.md` §3.4.

### 3. GEO Site Readiness Score §3.6 — Sitemap health

The new §3.6 score introduced by [A-013](A-013-llms-txt-and-geo-site-readiness.md) carries a `SitemapHealth` sub-input at weight 0.20. It is computed from the same decomposition as the §3.1 Crawlability row above, normalized to 0–1 per the standard sub-score scale.

This is the only site-level (per-domain) reuse of the sitemap signals; all other consumers remain per-URL.

## Consequences

### Positive

- **Coverage asymmetries surface automatically.** Crawled-but-not-in-sitemap and in-sitemap-but-unreachable findings are now scored, not just logged.
- **Freshness stops losing to sitemap updates.** A page whose visible timestamp is stale but whose sitemap `<lastmod>` is current now inherits the more recent signal — matching how Google and Bing already treat the artifact.
- **Reproducibility is preserved.** The sitemap URL set is a stable input; the same sitemap yields the same scores.
- **Scales to large sites.** Index sitemaps (`<sitemapindex>`) are first-class; sites with hundreds of sub-sitemaps are scored the same way as single-file sitemaps.

### Negative / trade-offs

- **Sitemap compliance in the wild is uneven.** Many sites ship invalid XML, duplicated entries, or `<lastmod>` values that lie. Scoring must degrade gracefully when any one input is unreliable. The §3.1 row handles this by scoring each input independently; §3.3 handles it by always taking `max()` across freshness sources so a lying sitemap cannot _reduce_ a reliable page signal.
- **Very large sitemaps are expensive to fetch and parse.** The implementation must stream-parse large index sitemaps rather than load them entirely into memory. This is an implementation detail called out here as a known constraint.
- **Legacy signals (`<changefreq>`, `<priority>`) are explicitly ignored.** They are widely misused and Google has repeatedly stated they carry no ranking weight. Scoring them would mislead operators.

### Neutral

- The existing runtime sitemap consumer in the extractor (for breadth-first crawl seeding) is not touched by this ADR; only the scoring reads of the same artifact are added.

## Alternatives considered

- **Skip sitemaps as a scoring input; rely only on crawl reach.** Rejected: the asymmetry between crawler reach and publisher declaration is diagnostically important. A site with comprehensive content but no sitemap is crawler-hostile in a way that silently hurts ranking and GEO visibility.
- **Trust sitemap `<lastmod>` as the _authoritative_ freshness source.** Rejected: sitemap lastmod is trivial to misreport (e.g. the CMS stamps the current time on every build regardless of content change). Using `max()` across sources is a more robust aggregation.
- **Score `<changefreq>` and `<priority>`.** Rejected: their ranking weight is effectively zero in modern search engines and scoring them would encourage operators to optimize meaningless signals.
- **Require sitemaps at a specific location only (`/sitemap.xml`).** Rejected: `robots.txt` `Sitemap:` declarations are standard practice; many large sites use non-default paths.

## References

- [`../scoring.md` §3.1 Technical Infrastructure sub-score](../scoring.md) — Crawlability row formalized by this ADR.
- [`../scoring.md` §3.3 GEO Content Score](../scoring.md) — Freshness sub-input gains sitemap `<lastmod>` as a source.
- [`../scoring.md` §3.6 GEO Site Readiness Score](../scoring.md) — `SitemapHealth` sub-input consumes the same decomposition.
- [`../modules.md` §1 Technical SEO & Performance Auditor](../modules.md) — sitemap auditing is promoted from narrative text to an explicit capability list item.
- [A-011](A-011-robots-txt-scoring-inputs.md) — robots.txt ↔ sitemap agreement check.
- [A-013](A-013-llms-txt-and-geo-site-readiness.md) — the §3.6 score that hosts the `SitemapHealth` sub-input.
- [sitemaps.org 0.9 protocol](https://www.sitemaps.org/protocol.html) and [XSD](https://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd).
- [Google Search Central — sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) for authoritative treatment of legacy signals.

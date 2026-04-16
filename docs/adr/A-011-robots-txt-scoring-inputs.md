# A-011 — `robots.txt` as explicit SEO and GEO scoring input

- **Status:** Accepted
- **Date:** 2026-04-16
- **Supersedes:** —
- **Superseded by:** —
- **Tags:** scoring, seo, geo, discovery-artifacts, crawling

## Context

`robots.txt` is the oldest and most widely supported machine-readable site-policy artifact on the web. For SEOpen it shows up in three different roles today, not all of which are scored:

1. **Crawl politeness** — `@seopen/fetch` already honors `robots.txt` at request time per [ADR A-008](A-008-byok-third-party-indexes.md) and [`../architecture.md` §4.9](../architecture.md). This is a crawler behavior, not a score input.
2. **Indexability (SEO)** — [`../scoring.md:55`](../scoring.md) references "Robots / meta / canonical / sitemap consistency" as a 25 %-weighted input to the Technical Infrastructure sub-score of SEO Score §3.1. The phrasing is abstract; there is no formal decomposition of what "consistency" means, so the auditor cannot score it deterministically today.
3. **AI-crawler posture (GEO)** — modern AI systems announce dedicated crawler user-agents (GPTBot, ClaudeBot, anthropic-ai, CCBot, PerplexityBot, Google-Extended, Applebot-Extended, Amazonbot, ChatGPT-User, cohere-ai, Bytespider, …). A site's `robots.txt` posture toward these user-agents is a first-order GEO visibility signal — a site that Disallows `GPTBot` cannot be cited by ChatGPT, no matter how well its content is written. SEOpen has **no score hook** for this today.

Role #1 is a runtime concern and out of scope for scoring. Roles #2 and #3 are scoring gaps this ADR closes.

[RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) is the authoritative Robots Exclusion Protocol specification and defines the parsing rules and user-agent matching semantics this ADR relies on.

## Decision

SEOpen treats `robots.txt` as an **explicit, decomposed scoring input** on two axes:

### 1. SEO Score §3.1 Technical Infrastructure — Indexability (existing row, formalized)

The Indexability row of the [§3.1 Technical Infrastructure sub-score](../scoring.md) decomposes into the following deterministic inputs. The 25 % weight of the row within §3.1 is unchanged; only the internal decomposition is codified.

| Input                                     | Signal                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `robots.txt` presence                     | File served at `/robots.txt` returning 200 with `Content-Type: text/plain`.                                                 |
| `robots.txt` parseability                 | Parses without errors under RFC 9309 rules via `robots-parser`.                                                             |
| `robots.txt` vs `<meta robots>` agreement | No per-URL contradiction between robots.txt Allow/Disallow and the rendered page's `<meta name="robots">` / `X-Robots-Tag`. |
| `robots.txt` vs canonical agreement       | URLs declared canonical via `<link rel="canonical">` or HTTP header are not Disallowed by robots.txt.                       |
| `robots.txt` vs sitemap agreement         | URLs listed in the sitemap ([A-012](A-012-sitemap-scoring-inputs.md)) are not Disallowed by robots.txt.                     |
| `Sitemap:` directive presence             | robots.txt declares at least one `Sitemap:` URL (or the site's sole sitemap lives at the default `/sitemap.xml`).           |

### 2. GEO Site Readiness Score §3.6 — AI-crawler posture (new input)

The new [§3.6 GEO Site Readiness Score](../scoring.md) introduced by [A-013](A-013-llms-txt-and-geo-site-readiness.md) carries an **AI-crawler posture** sub-input scored as follows.

The auditor evaluates `robots.txt` against a tracked roster of AI crawler user-agents:

| User-agent                                | Provider                                           |
| ----------------------------------------- | -------------------------------------------------- |
| `GPTBot`                                  | OpenAI                                             |
| `ChatGPT-User`                            | OpenAI (on-demand during chats)                    |
| `OAI-SearchBot`                           | OpenAI (SearchGPT)                                 |
| `ClaudeBot`, `claude-web`, `anthropic-ai` | Anthropic                                          |
| `PerplexityBot`, `Perplexity-User`        | Perplexity                                         |
| `Google-Extended`                         | Google (AI training opt-out flag)                  |
| `Applebot-Extended`                       | Apple Intelligence                                 |
| `CCBot`                                   | Common Crawl (feeds numerous LLM training corpora) |
| `Amazonbot`                               | Amazon                                             |
| `cohere-ai`                               | Cohere                                             |
| `Bytespider`                              | ByteDance                                          |

The roster is versioned in `docs/scoring.md` §3.6 and bumps with `weights_version` when crawlers are added, removed, or renamed — the roster is part of what makes the score reproducible over time.

AI-crawler posture for a site is a single 0–1 value derived from:

- **Allowed (posture = 1.0)** — no `Disallow: /` rule matches the crawler and at least one explicit policy statement appears (either an explicit group with `Allow:` rules or the absence of both a wildcard Disallow and a per-agent Disallow).
- **Blocked (posture = 0.0)** — a `Disallow: /` applies under the crawler's user-agent group or the wildcard group.
- **Partially allowed (posture interpolated 0.0–1.0)** — crawler is allowed on some paths but explicitly disallowed on others; interpolation weights by the fraction of the crawled URL set that is allowed.

Silence (no rule at all) is treated as **Allowed but not intentional**: the posture scores at 0.7 rather than 1.0. Sites that _actively welcome_ AI citation signal intent; silence is neutral. This encodes a policy choice: SEOpen's default recommendation for brands that want AI visibility is to add explicit Allow statements for the major AI crawlers rather than relying on silence.

The final AI-crawler-posture value is the mean of the posture values across the tracked roster, weighted by provider prominence as declared in the current `weights_version`. Opt-outs from one specific provider (e.g. a publisher with a commercial deal to block a single crawler) should not catastrophically drag the aggregate — per-crawler values inform the UI findings even when they don't dominate the aggregate.

## Consequences

### Positive

- The auditor now has a **deterministic, reproducible** Indexability signal that maps 1:1 to a machine-readable file. No hand-wavy "consistency" check.
- AI-crawler posture becomes a first-class diagnostic: brands can see which AI systems can and cannot cite them and receive explicit remediation guidance (e.g. "add `User-agent: GPTBot` / `Allow: /`").
- Reproducibility holds across scoring runs — the same `robots.txt` yields the same score under the same `weights_version`.
- Separates **crawl politeness** (runtime concern, already handled in `@seopen/fetch`) from **scoring** (static analysis of the artifact), so the two never have to share code paths.

### Negative / trade-offs

- The AI crawler roster is a moving target. New crawlers launch on weeks-to-months timelines; the roster must stay current. Mitigation: the roster lives in a versioned doc section with a `weights_version` that bumps on roster changes, and community contributions (per `CONTRIBUTING.md` §Scoring methodology contributions) are the primary update path.
- Some operators — especially publishers — actively block AI crawlers for business reasons (no training opt-in without a commercial deal). Blocking posture correctly scores low for _GEO visibility_, which is the intended behavior: this ADR does not claim blocking is bad, only that it is a visibility-reducing choice.
- `robots.txt` cannot be trusted as access control — it is a policy directive, not enforcement. SEOpen's scoring explicitly notes that audit findings about AI-crawler allow/deny posture describe _declarations_, not guarantees.

### Neutral

- Python-style `robots.txt` URL matching and wildcard resolution (`*`, `$`) are delegated to the existing `robots-parser` library. SEOpen does not reimplement the RFC 9309 state machine.

## Alternatives considered

- **Leave the §3.1 row abstract and let implementations interpret it.** Rejected: violates the project's transparency promise ([`../vision.md`](../vision.md) — "not a black box") and would cause score drift between implementations.
- **Score AI-crawler posture as part of §3.2 AI Visibility Score.** Rejected: §3.2 is empirical (measures real citation outcomes). Folding a static infra signal into an empirical KPI would dilute the KPI's meaning. The new §3.6 created by [A-013](A-013-llms-txt-and-geo-site-readiness.md) is the right home.
- **Treat silence on an AI crawler as a full Allow (posture = 1.0).** Rejected: silence is the default and thus uninformative. Rewarding intentional declarations nudges sites toward unambiguous AI-visibility policies.
- **Hard-code the AI crawler roster in code.** Rejected: locks the project to a release cadence tied to third-party crawler launches. Versioned doc-side roster with a `weights_version` bump is the transparent path.

## References

- [`../scoring.md` §3.1 Technical Infrastructure sub-score](../scoring.md) — Indexability row formalized by this ADR.
- [`../scoring.md` §3.6 GEO Site Readiness Score](../scoring.md) — host of the AI-crawler-posture input.
- [`../architecture.md` §4.4 URL frontier, §4.9 Security posture](../architecture.md) — runtime `robots.txt` compliance (separate concern).
- [A-003](A-003-redis-url-frontier-and-cache.md) — Redis-cached `robots.txt` at crawl time.
- [A-008](A-008-byok-third-party-indexes.md) — responsible-crawling ethos this ADR extends into scoring.
- [A-012](A-012-sitemap-scoring-inputs.md) — sibling discovery-artifact ADR (sitemap cross-check referenced here).
- [A-013](A-013-llms-txt-and-geo-site-readiness.md) — the §3.6 score that consumes the AI-crawler-posture value.
- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309).
- [OpenAI GPTBot documentation](https://platform.openai.com/docs/gptbot), [Anthropic crawler documentation](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity crawler documentation](https://docs.perplexity.ai/guides/bots), [Google-Extended](https://blog.google/technology/ai/an-update-on-web-publisher-controls/), [Applebot-Extended](https://support.apple.com/en-us/119829).

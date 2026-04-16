# Community & Contribution

This document is the public charter for how SEOpen's community is organized, governed, and invited to contribute. It covers contribution workflows, governance, educational resources, communication channels, and community safety.

---

## 7.1 Principles

SEOpen's community operates on four principles:

1. **Radical transparency.** Roadmap, architecture decisions, and scoring formulas are all published in this repository. Nothing material is hidden from the community.
2. **Transparent methodology.** Every score, every formula, and every weighting is documented in [`scoring.md`](scoring.md). Users can inspect, audit, and propose changes to the math that underlies the product.
3. **Self-serve first.** Every onboarding path is designed so that a technical user can reach value without talking to a human. Good docs beat good support.
4. **Respectful collaboration.** Code reviews and issue threads are blunt but never personal. New contributors are given extra patience on their first PR.

---

## 7.2 Participation shapes

Online communities follow a predictable distribution: most users consume the product, a smaller group engages via questions and feedback, and a small core actively contributes. SEOpen plans for all three groups explicitly.

### Consumers

Users who want the product to _work_. Rarely post in Discussions, never open a PR, and will churn silently if friction is high. They are served by:

- Impeccable README and quickstart. "Time to First Audit" under five minutes.
- Tutorials that read like solved problems.
- Troubleshooting guides that address real failure modes.
- A clear changelog so users can see what changed without joining a chat.

### Engagers

Users who ask questions, file issues, suggest features, and participate in Discussions. They are served by:

- Responsive, empathetic triage on issues and Discussions — the goal is acknowledgment within 48 hours.
- Clear issue templates: bug report, feature request, provider request, scoring methodology question.
- A Discord or chat workspace with dedicated channels (`#general`, `#self-hosting`, `#geo-methodology`, `#providers`, `#contributors`).
- A public roadmap so feature requesters can see where their ask stands without asking.

### Contributors

Users who write code, improve documentation, review PRs, and help other community members. They are served by:

- A curated list of **"Good First Issues"** continuously maintained across modules.
- A `CONTRIBUTING.md` that explains the end-to-end contribution loop without glossing over friction.
- A public contributor list and periodic "thank you" posts highlighting contributions.
- Direct access to maintainers via a `#contributors` channel.

---

## 7.3 Governance

Until the project outgrows it, governance is lightweight and explicit:

- **Maintainers.** Initially the founding author(s). Listed in `MAINTAINERS.md` (added in Phase 0). Maintainers have merge rights on the core repository.
- **Decisions.** Architectural and scope decisions are made via ADRs under `docs/adr/`. Any community member may propose an ADR via pull request. Final acceptance is at maintainer discretion but the rationale is public.
- **Conflict resolution.** Disagreements are resolved in the PR or issue thread; if that stalls, they are elevated to a maintainer discussion and the outcome is documented in the thread.
- **Code of Conduct.** The project adopts the Contributor Covenant as its CoC (added in Phase 0). Violations are handled by maintainers and escalated as needed.
- **Formal governance** (technical steering committee, voting, formal membership) is considered **only** if the project reaches a scale where ad-hoc maintainer governance becomes a bottleneck.

---

## 7.4 How to contribute

Full contribution workflow lives in [`CONTRIBUTING.md`](../CONTRIBUTING.md). Summary:

### Non-code contributions

- **Improve the docs.** Every doc in `/docs` is editable via PR. Factual corrections, clarity improvements, and typo fixes are genuinely valued — not second-class.
- **Report issues.** Reproducible bug reports with version, environment, steps, and observed vs. expected behavior are among the most valuable contributions.
- **Propose scoring methodology improvements.** SEOpen's scoring formulas are not sacred. If a researcher or practitioner has a better formulation with evidence, open an ADR-level discussion.
- **Share real-world results.** Write-ups showing measured SEO / GEO outcomes from real deployments help validate the methodology and inspire others.

### Code contributions

- **Good First Issues** are labeled `good-first-issue` and grouped by area (crawler, scoring, UI, docs, providers).
- **Larger work** should start with an issue or discussion to align on approach _before_ code is written.
- **Pull requests** follow the checklist in [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- **Review expectations.** Small PRs are triaged in days, large PRs within one to two weeks. No PR sits in limbo without explicit feedback.

### Provider adapter contributions

Adding a new BYOK data provider is a particularly clean contribution shape because the integration contract is narrow and well-defined ([`data-integrations.md`](data-integrations.md) §5.4). Expect:

- Implementation of the `Provider` interface.
- Recorded-response integration tests (not live API calls).
- Documentation under `docs/providers/<name>.md`.
- Respect for all credential-handling rules.

---

## 7.5 Educational resources

SEOpen exists in a field — Generative Engine Optimization — where the terminology and best practices are still unsettled. The project publishes educational material alongside the code to help users understand both the problem space and the tool.

### The Knowledge Base

Deeply technical articles published in the project's documentation site:

- Engineering deep-dives ("How SEOpen's crawler executes JavaScript rendering").
- Methodology explanations ("Why Fact Interpretability carries 30% weight in the GEO Content Score").
- Reproducible walkthroughs ("Running a full competitor gap audit end to end").

### GEO learning resources

Structured educational content on Generative Engine Optimization:

- Primers on RAG-friendly content architecture.
- Explainers on the mathematical foundations of AI visibility metrics.
- Glossaries mapping SEOpen's terminology to the wider industry vocabulary.

### Walkthroughs and write-ups

Long-form write-ups demonstrating concrete workflows on real domains. Published in the Knowledge Base and intended as reproducible reference material.

---

## 7.6 Communication channels

Channels are chosen for **low friction** and **searchability**, not for trendiness:

| Channel                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| **GitHub Issues**       | Bug reports, feature requests.                         |
| **GitHub Discussions**  | Q&A, RFCs, show-and-tell, scoring methodology debates. |
| **Discord (or chat)**   | Real-time chat for contributors and engaged users.     |
| **Repository Releases** | Changelog, versioned release notes.                    |
| **Documentation Site**  | Long-form content, tutorials, Knowledge Base.          |
| **Project Blog**        | Announcements, engineering posts.                      |

Intentionally not adopted at launch: mailing lists, IRC, forums with separate accounts. The bar for adding a channel is that an existing channel is demonstrably failing.

---

## 7.7 Community safety

A predictable, safe environment is a prerequisite for contribution. The concrete commitments:

- **Code of Conduct** (Contributor Covenant) governs all community spaces.
- **Private reporting** via a dedicated email address for CoC concerns, not only through public channels.
- **Transparent moderation.** Enforcement actions (warnings, temporary bans, permanent bans) are logged internally and anonymized summaries are published periodically.
- **Respectful feedback culture.** Code reviews and issue threads are expected to be blunt but never personal. Maintainers model this explicitly.
- **Psychological safety for new contributors.** First PRs get extra patience, encouragement, and direct coaching — the cost of losing a first-time contributor to a harsh review is far higher than the cost of patience.

---

## 7.8 Evolution

This document is not static. It will be revised as the project's community matures and as contribution patterns change. Revisions follow the normal PR process; significant changes are accompanied by an ADR.

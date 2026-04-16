import type { GeoContentScoreInputs, PageSignals, ScoringContext } from '@seopen/types';

/**
 * Map a `PageSignals` bundle onto the 5 sub-score inputs consumed by the
 * GEO Content Score formula (`docs/scoring.md` §3.3).
 *
 * This layer is deliberately **deterministic**. Semantic Relevance falls back
 * to a keyword-match placeholder when no embedding provider is configured, in
 * line with ADR A-009 (LLM calls are optional, never required).
 */
export function signalsToInputs(
  signals: PageSignals,
  context: ScoringContext = { topicKeywords: [] },
): GeoContentScoreInputs {
  return {
    factInterpretability: mapFactInterpretability(signals),
    semanticRelevance: mapSemanticRelevance(signals, context),
    conversationalTone: mapConversationalTone(signals),
    structure: mapStructure(signals),
    engagement: mapEngagement(signals),
  };
}

// --- sub-score mappers ----------------------------------------------------

/**
 * Fact Interpretability: density of verifiable facts, hyperlinked primary
 * sources, and numerical data points. The ideal density target cited in
 * `docs/modules.md` §2 is ~1 hyperlinked statistic per 150–200 words.
 */
function mapFactInterpretability(signals: PageSignals): number {
  const { statistics, outboundLinks, wordCount } = signals;
  if (wordCount === 0) return 0;

  const targetHyperlinked = wordCount / 175;
  const hyperlinkedScore =
    targetHyperlinked > 0 ? Math.min(1, statistics.hyperlinkedStatistics / targetHyperlinked) : 0;
  const inlineBonus =
    targetHyperlinked > 0
      ? Math.min(0.3, (statistics.inlineNumericMentions / targetHyperlinked) * 0.25)
      : 0;
  const primarySourceBonus = Math.min(0.2, outboundLinks.toPrimarySources * 0.05);

  return clampUnit(hyperlinkedScore + inlineBonus + primarySourceBonus);
}

/**
 * Semantic Relevance: alignment with the supplied topic keywords. Uses a
 * deterministic keyword-presence heuristic when no embedding provider is
 * configured. When topics are absent we return a neutral 0.5 rather than 0,
 * so a single-URL audit without context is not penalized for user oversight.
 */
function mapSemanticRelevance(signals: PageSignals, context: ScoringContext): number {
  const topics = context.topicKeywords;
  if (topics.length === 0) return 0.5;

  const haystack = signals.textSample.toLowerCase();
  const matched = topics.reduce(
    (count, topic) => (haystack.includes(topic.toLowerCase()) ? count + 1 : count),
    0,
  );
  return clampUnit(matched / topics.length);
}

/**
 * Conversational Tone: banded mapping of the Flesch reading-ease score. The
 * article reads like a natural answer to a question when the Flesch is ≥ 60.
 */
function mapConversationalTone(signals: PageSignals): number {
  const flesch = signals.readability.flesch;
  if (flesch >= 60) return 1.0;
  if (flesch >= 50) return 0.85;
  if (flesch >= 40) return 0.7;
  if (flesch >= 30) return 0.5;
  return 0.3;
}

/**
 * Structure: weighted mix of heading hierarchy, lists, tables, and FAQ blocks.
 */
function mapStructure(signals: PageSignals): number {
  const { headingCounts, structuralBlocks } = signals;
  let score = 0;
  if (headingCounts.h1 >= 1) score += 0.2;
  if (headingCounts.h2 >= 3) score += 0.25;
  else if (headingCounts.h2 >= 1) score += 0.15;
  if (headingCounts.h3 >= 1) score += 0.1;
  if (structuralBlocks.lists >= 1) score += 0.15;
  if (structuralBlocks.tables >= 1) score += 0.15;
  if (structuralBlocks.faqBlocks >= 1) score += 0.15;
  return clampUnit(score);
}

/**
 * Engagement: soft signals — authorship, freshness, media, expert quotes.
 */
function mapEngagement(signals: PageSignals): number {
  const { authorship, freshness, media } = signals;
  let score = 0;
  if (authorship.hasByline) score += 0.25;
  if (authorship.hasAuthorSchema) score += 0.1;
  if (isFreshness(freshness.publishedAt, 90) || isFreshness(freshness.modifiedAt, 30)) {
    score += 0.3;
  }
  if (media.imageCount >= 1 || media.figureCount >= 1) score += 0.2;
  if (media.quoteBlockCount >= 1) score += 0.15;
  return clampUnit(score);
}

// --- helpers --------------------------------------------------------------

function clampUnit(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function isFreshness(isoDate: string | null, maxDays: number): boolean {
  if (isoDate === null) return false;
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs <= maxDays * 86_400_000 && ageMs >= 0;
}

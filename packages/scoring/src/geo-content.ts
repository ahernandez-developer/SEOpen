import {
  DEFAULT_GEO_CONTENT_WEIGHTS,
  GeoContentScoreInputsSchema,
  GeoContentWeightsSchema,
  type GeoContentBand,
  type GeoContentScoreInputs,
  type GeoContentScoreResult,
  type GeoContentWeights,
} from '@seopen/types';

/**
 * SemVer identifier for the GEO Content Score formula shipped by this build.
 * Match it to the heading in `docs/scoring.md` §3.3; bump it whenever the
 * formula itself changes (not when weights change).
 */
export const GEO_CONTENT_FORMULA_VERSION = '3.3.0';

/**
 * Default weights version identifier. Weight changes do not invalidate the
 * formula version but do bump this string — dashboards use it to label
 * historical scores whose weights differ from the current defaults.
 */
export const GEO_CONTENT_WEIGHTS_VERSION = 'default-v1';

export interface ScoreGeoContentOptions {
  /** Override default weights (must sum to 1.0). */
  weights?: GeoContentWeights;
  /** Override the weights-version string stamped into the result. */
  weightsVersion?: string;
  /** Free-form provenance map: data-source identifier → version token. */
  sourceVersions?: Record<string, string>;
  /** Clock injection for deterministic tests. */
  now?: () => Date;
}

/**
 * Compute the predictive GEO Content Score for a single URL, per the formula
 * in `docs/scoring.md` §3.3:
 *
 * ```
 * GEO_Content_Score = 100 * (
 *     0.30 * FactInterpretability
 *   + 0.25 * SemanticRelevance
 *   + 0.20 * ConversationalTone
 *   + 0.15 * Structure
 *   + 0.10 * Engagement
 * )
 * ```
 *
 * Returns the composite score, the interpretation band, the inputs and
 * weights that produced it, and provenance metadata as required by
 * `docs/scoring.md` §3.4.
 */
export function scoreGeoContent(
  rawInputs: GeoContentScoreInputs,
  options: ScoreGeoContentOptions = {},
): GeoContentScoreResult {
  const inputs = GeoContentScoreInputsSchema.parse(rawInputs);
  const weights = options.weights
    ? GeoContentWeightsSchema.parse(options.weights)
    : DEFAULT_GEO_CONTENT_WEIGHTS;

  const weightedSum =
    weights.factInterpretability * inputs.factInterpretability +
    weights.semanticRelevance * inputs.semanticRelevance +
    weights.conversationalTone * inputs.conversationalTone +
    weights.structure * inputs.structure +
    weights.engagement * inputs.engagement;

  const score = clampScore(round1(weightedSum * 100));
  const band = classifyBand(score);

  const now = (options.now ?? (() => new Date()))();

  return {
    score,
    band,
    inputs,
    weights,
    provenance: {
      formulaVersion: GEO_CONTENT_FORMULA_VERSION,
      weightsVersion: options.weightsVersion ?? GEO_CONTENT_WEIGHTS_VERSION,
      sourceVersions: options.sourceVersions ?? {},
      computedAt: now.toISOString(),
    },
  };
}

/**
 * Map a 0–100 GEO Content Score onto the named interpretation bands from
 * `docs/scoring.md` §3.3.
 */
export function classifyBand(score: number): GeoContentBand {
  if (score >= 90) return 'best-in-class';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'weak';
  return 'fails';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampScore(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

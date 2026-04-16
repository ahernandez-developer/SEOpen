import { z } from 'zod';

/**
 * Unit-interval value in `[0, 1]`.
 *
 * Sub-scores of the predictive GEO Content Score (see `docs/scoring.md` §3.3)
 * are modeled as unit-interval values before the weighted aggregation to a
 * 0–100 final score.
 */
const unitInterval = z.number().min(0).max(1);

/**
 * Inputs to the GEO Content Score formula. One unit-interval value per
 * sub-score category documented in `docs/scoring.md` §3.3.
 */
export const GeoContentScoreInputsSchema = z.object({
  factInterpretability: unitInterval,
  semanticRelevance: unitInterval,
  conversationalTone: unitInterval,
  structure: unitInterval,
  engagement: unitInterval,
});
export type GeoContentScoreInputs = z.infer<typeof GeoContentScoreInputsSchema>;

/**
 * Weights applied to each sub-score. Must sum to `1.0` (tolerance `1e-9`) so
 * the weighted composite lands on the documented 0–100 scale.
 */
export const GeoContentWeightsSchema = z
  .object({
    factInterpretability: unitInterval,
    semanticRelevance: unitInterval,
    conversationalTone: unitInterval,
    structure: unitInterval,
    engagement: unitInterval,
  })
  .refine(
    (weights) => {
      const sum =
        weights.factInterpretability +
        weights.semanticRelevance +
        weights.conversationalTone +
        weights.structure +
        weights.engagement;
      return Math.abs(sum - 1) < 1e-9;
    },
    { message: 'GEO Content Score weights must sum to 1.0' },
  );
export type GeoContentWeights = z.infer<typeof GeoContentWeightsSchema>;

/**
 * Default GEO Content Score weights as published in `docs/scoring.md` §3.3.
 */
export const DEFAULT_GEO_CONTENT_WEIGHTS: GeoContentWeights = Object.freeze({
  factInterpretability: 0.3,
  semanticRelevance: 0.25,
  conversationalTone: 0.2,
  structure: 0.15,
  engagement: 0.1,
});

/**
 * Interpretation bands defined by the band table in `docs/scoring.md` §3.3.
 */
export const GeoContentBandSchema = z.enum([
  'best-in-class',
  'strong',
  'moderate',
  'weak',
  'fails',
]);
export type GeoContentBand = z.infer<typeof GeoContentBandSchema>;

/**
 * Provenance metadata that every persisted score must carry, per
 * `docs/scoring.md` §3.4.
 */
export const ProvenanceSchema = z.object({
  formulaVersion: z.string(),
  weightsVersion: z.string(),
  sourceVersions: z.record(z.string(), z.string()),
  computedAt: z.string().datetime(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Full GEO Content Score result bundle — final score, sub-scores, weights in
 * effect, and provenance metadata.
 */
export const GeoContentScoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  band: GeoContentBandSchema,
  inputs: GeoContentScoreInputsSchema,
  weights: GeoContentWeightsSchema,
  provenance: ProvenanceSchema,
});
export type GeoContentScoreResult = z.infer<typeof GeoContentScoreResultSchema>;

/**
 * HTTP fetch result passed from `@seopen/fetch` to `@seopen/parse`.
 */
export const FetchResultSchema = z.object({
  requestedUrl: z.string().url(),
  finalUrl: z.string().url(),
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
  fetchedAt: z.string().datetime(),
  robotsAllowed: z.boolean(),
});
export type FetchResult = z.infer<typeof FetchResultSchema>;

/**
 * Structural and semantic signals extracted from an HTML page by
 * `@seopen/parse`. Consumed by `@seopen/scoring` to derive
 * `GeoContentScoreInputs`.
 */
export const PageSignalsSchema = z.object({
  url: z.string().url(),
  wordCount: z.number().int().nonnegative(),
  headingCounts: z.object({
    h1: z.number().int().nonnegative(),
    h2: z.number().int().nonnegative(),
    h3: z.number().int().nonnegative(),
    h4Plus: z.number().int().nonnegative(),
  }),
  structuralBlocks: z.object({
    lists: z.number().int().nonnegative(),
    tables: z.number().int().nonnegative(),
    faqBlocks: z.number().int().nonnegative(),
  }),
  statistics: z.object({
    inlineNumericMentions: z.number().int().nonnegative(),
    hyperlinkedStatistics: z.number().int().nonnegative(),
  }),
  outboundLinks: z.object({
    total: z.number().int().nonnegative(),
    toPrimarySources: z.number().int().nonnegative(),
  }),
  authorship: z.object({
    hasByline: z.boolean(),
    hasAuthorSchema: z.boolean(),
  }),
  freshness: z.object({
    publishedAt: z.string().datetime().nullable(),
    modifiedAt: z.string().datetime().nullable(),
    schemaDateCount: z.number().int().nonnegative(),
  }),
  readability: z.object({
    flesch: z.number(),
    avgWordsPerSentence: z.number().nonnegative(),
  }),
  media: z.object({
    imageCount: z.number().int().nonnegative(),
    figureCount: z.number().int().nonnegative(),
    quoteBlockCount: z.number().int().nonnegative(),
  }),
  textSample: z.string(),
});
export type PageSignals = z.infer<typeof PageSignalsSchema>;

/**
 * Context supplied alongside `PageSignals` when deriving scoring inputs.
 * Topic keywords drive the deterministic Semantic Relevance placeholder
 * (TF-IDF cosine) used when no embedding provider is configured (ADR A-009).
 */
export const ScoringContextSchema = z.object({
  topicKeywords: z.array(z.string()).default([]),
  weights: GeoContentWeightsSchema.optional(),
});
export type ScoringContext = z.infer<typeof ScoringContextSchema>;

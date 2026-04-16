import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  DEFAULT_GEO_CONTENT_WEIGHTS,
  GeoContentScoreInputsSchema,
  GeoContentWeightsSchema,
  ProvenanceSchema,
} from '../src/schemas.ts';

describe('@seopen/types schemas', () => {
  it('accepts the worked-example inputs from docs/scoring.md §3.3', () => {
    const parsed = GeoContentScoreInputsSchema.parse({
      factInterpretability: 0.1,
      semanticRelevance: 0.8,
      conversationalTone: 1.0,
      structure: 1.0,
      engagement: 1.0,
    });
    assert.equal(parsed.factInterpretability, 0.1);
  });

  it('rejects sub-scores outside the unit interval', () => {
    assert.throws(() =>
      GeoContentScoreInputsSchema.parse({
        factInterpretability: 1.2,
        semanticRelevance: 0,
        conversationalTone: 0,
        structure: 0,
        engagement: 0,
      }),
    );
    assert.throws(() =>
      GeoContentScoreInputsSchema.parse({
        factInterpretability: -0.1,
        semanticRelevance: 0,
        conversationalTone: 0,
        structure: 0,
        engagement: 0,
      }),
    );
  });

  it('accepts the default GEO Content Score weights (sum = 1.0)', () => {
    const parsed = GeoContentWeightsSchema.parse(DEFAULT_GEO_CONTENT_WEIGHTS);
    const sum =
      parsed.factInterpretability +
      parsed.semanticRelevance +
      parsed.conversationalTone +
      parsed.structure +
      parsed.engagement;
    assert.ok(Math.abs(sum - 1) < 1e-9);
  });

  it('rejects weight sets that do not sum to 1.0', () => {
    assert.throws(() =>
      GeoContentWeightsSchema.parse({
        factInterpretability: 0.5,
        semanticRelevance: 0.5,
        conversationalTone: 0.5,
        structure: 0.0,
        engagement: 0.0,
      }),
    );
  });

  it('parses Provenance with an ISO-8601 UTC timestamp', () => {
    const parsed = ProvenanceSchema.parse({
      formulaVersion: '3.3.0',
      weightsVersion: 'default-v1',
      sourceVersions: { html: 'fetch-1' },
      computedAt: '2026-04-16T12:00:00.000Z',
    });
    assert.equal(parsed.formulaVersion, '3.3.0');
  });
});

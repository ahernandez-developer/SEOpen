import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fc from 'fast-check';
import { classifyBand, scoreGeoContent } from '../src/geo-content.ts';

describe('scoreGeoContent — docs/scoring.md §3.3', () => {
  it('worked example: Fact Interpretability drags score to 68 (Moderate band)', () => {
    // From docs/scoring.md §3.3 worked example:
    //   100 * (0.30*0.1 + 0.25*0.8 + 0.20*1.0 + 0.15*1.0 + 0.10*1.0) = 68
    const result = scoreGeoContent({
      factInterpretability: 0.1,
      semanticRelevance: 0.8,
      conversationalTone: 1.0,
      structure: 1.0,
      engagement: 1.0,
    });
    assert.equal(result.score, 68);
    assert.equal(result.band, 'moderate');
  });

  it('max sub-scores → 100 and best-in-class', () => {
    const result = scoreGeoContent({
      factInterpretability: 1,
      semanticRelevance: 1,
      conversationalTone: 1,
      structure: 1,
      engagement: 1,
    });
    assert.equal(result.score, 100);
    assert.equal(result.band, 'best-in-class');
  });

  it('zero sub-scores → 0 and fails band', () => {
    const result = scoreGeoContent({
      factInterpretability: 0,
      semanticRelevance: 0,
      conversationalTone: 0,
      structure: 0,
      engagement: 0,
    });
    assert.equal(result.score, 0);
    assert.equal(result.band, 'fails');
  });

  it('returns provenance with the published formula and weights versions', () => {
    const result = scoreGeoContent({
      factInterpretability: 0.5,
      semanticRelevance: 0.5,
      conversationalTone: 0.5,
      structure: 0.5,
      engagement: 0.5,
    });
    assert.equal(result.provenance.formulaVersion, '3.3.0');
    assert.equal(result.provenance.weightsVersion, 'default-v1');
    assert.ok(!Number.isNaN(Date.parse(result.provenance.computedAt)));
  });

  it('echoes the inputs and weights used', () => {
    const inputs = {
      factInterpretability: 0.4,
      semanticRelevance: 0.6,
      conversationalTone: 0.7,
      structure: 0.8,
      engagement: 0.9,
    } as const;
    const result = scoreGeoContent(inputs);
    assert.deepEqual(result.inputs, inputs);
    assert.equal(result.weights.factInterpretability, 0.3);
    assert.equal(result.weights.semanticRelevance, 0.25);
    assert.equal(result.weights.conversationalTone, 0.2);
    assert.equal(result.weights.structure, 0.15);
    assert.equal(result.weights.engagement, 0.1);
  });
});

describe('scoreGeoContent — properties', () => {
  const unit = fc.double({ min: 0, max: 1, noNaN: true, minExcluded: false, maxExcluded: false });

  it('every output score is in [0, 100]', () => {
    fc.assert(
      fc.property(unit, unit, unit, unit, unit, (a, b, c, d, e) => {
        const { score } = scoreGeoContent({
          factInterpretability: a,
          semanticRelevance: b,
          conversationalTone: c,
          structure: d,
          engagement: e,
        });
        return score >= 0 && score <= 100;
      }),
      { numRuns: 250 },
    );
  });

  it('monotone in Fact Interpretability: raising it never lowers the score', () => {
    fc.assert(
      fc.property(unit, unit, unit, unit, unit, unit, (a, b, c, d, e, bump) => {
        const base = {
          factInterpretability: a,
          semanticRelevance: b,
          conversationalTone: c,
          structure: d,
          engagement: e,
        };
        const raised = { ...base, factInterpretability: Math.min(1, a + bump) };
        return scoreGeoContent(raised).score + 1e-9 >= scoreGeoContent(base).score;
      }),
      { numRuns: 250 },
    );
  });
});

describe('classifyBand', () => {
  it('maps score thresholds to bands per docs/scoring.md §3.3', () => {
    assert.equal(classifyBand(100), 'best-in-class');
    assert.equal(classifyBand(90), 'best-in-class');
    assert.equal(classifyBand(89.9), 'strong');
    assert.equal(classifyBand(75), 'strong');
    assert.equal(classifyBand(74.9), 'moderate');
    assert.equal(classifyBand(60), 'moderate');
    assert.equal(classifyBand(59.9), 'weak');
    assert.equal(classifyBand(40), 'weak');
    assert.equal(classifyBand(39.9), 'fails');
    assert.equal(classifyBand(0), 'fails');
  });
});

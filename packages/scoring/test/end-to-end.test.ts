import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractPageSignals } from '@seopen/parse';
import { scoreGeoContent } from '../src/geo-content.ts';
import { signalsToInputs } from '../src/signals-to-inputs.ts';

const FIXTURE_URL = 'https://example.com/sourdough-starter-guide';

async function loadFixture(name: string): Promise<string> {
  const path = fileURLToPath(new URL(`../../../fixtures/geo/${name}`, import.meta.url));
  return readFile(path, 'utf8');
}

describe('pipeline: HTML → signals → scoring inputs → score (zero-stats fixture)', () => {
  it('lands in the Moderate band (60-74) for a well-structured but stat-free article', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    const inputs = signalsToInputs(signals, { topicKeywords: ['sourdough'] });
    const result = scoreGeoContent(inputs);

    assert.ok(
      result.score >= 60 && result.score <= 74,
      `expected Moderate-band score 60–74, got ${String(result.score)}`,
    );
    assert.equal(result.band, 'moderate');
  });

  it('flags factInterpretability as the lowest sub-score (drives the remediation story)', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    const inputs = signalsToInputs(signals, { topicKeywords: ['sourdough'] });

    const [lowest] = Object.entries(inputs).sort((a, b) => a[1] - b[1]);
    assert.equal(lowest?.[0], 'factInterpretability');
  });

  it('semantic relevance rewards on-topic content', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    const onTopic = signalsToInputs(signals, { topicKeywords: ['sourdough', 'bread'] });
    const offTopic = signalsToInputs(signals, { topicKeywords: ['quantum computing'] });
    assert.ok(onTopic.semanticRelevance > offTopic.semanticRelevance);
  });

  it('emits provenance sourceVersions when the caller supplies them', () => {
    const inputs = {
      factInterpretability: 0.5,
      semanticRelevance: 0.5,
      conversationalTone: 0.5,
      structure: 0.5,
      engagement: 0.5,
    };
    const result = scoreGeoContent(inputs, {
      sourceVersions: { parse: '0.0.0', fetch: '0.0.0' },
    });
    assert.deepEqual(result.provenance.sourceVersions, { parse: '0.0.0', fetch: '0.0.0' });
  });
});

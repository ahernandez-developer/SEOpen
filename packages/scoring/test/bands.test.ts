import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractPageSignals } from '@seopen/parse';
import { scoreGeoContent } from '../src/geo-content.ts';
import { signalsToInputs } from '../src/signals-to-inputs.ts';

async function loadFixture(name: string): Promise<string> {
  const path = fileURLToPath(new URL(`../../../fixtures/geo/${name}`, import.meta.url));
  return readFile(path, 'utf8');
}

describe('score bands — pinning fixtures to their expected interpretation band', () => {
  it('ideal-geo-ready.html scores in Strong or Best-in-class', async () => {
    const html = await loadFixture('ideal-geo-ready.html');
    const signals = extractPageSignals({
      html,
      url: 'https://example.com/sourdough-digestibility',
    });
    const inputs = signalsToInputs(signals, {
      topicKeywords: ['sourdough', 'fermentation', 'digestibility'],
    });
    const result = scoreGeoContent(inputs);

    assert.ok(
      result.band === 'strong' || result.band === 'best-in-class',
      `expected Strong or Best-in-class, got ${result.band} (score=${String(result.score)})`,
    );
    assert.ok(result.inputs.factInterpretability > 0.3);
  });

  it('fails-geo.html scores in Fails band (<40)', async () => {
    const html = await loadFixture('fails-geo.html');
    const signals = extractPageSignals({
      html,
      url: 'https://example.com/bread-rambling',
    });
    const inputs = signalsToInputs(signals);
    const result = scoreGeoContent(inputs);

    assert.ok(
      result.score < 40,
      `expected Fails band (<40), got ${String(result.score)} (${result.band})`,
    );
    assert.equal(result.band, 'fails');
  });
});

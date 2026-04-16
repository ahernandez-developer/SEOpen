import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractPageSignals } from '../src/signals.ts';

const FIXTURE_URL = 'https://example.com/sourdough-starter-guide';

async function loadFixture(name: string): Promise<string> {
  const path = fileURLToPath(new URL(`../../../fixtures/geo/${name}`, import.meta.url));
  return readFile(path, 'utf8');
}

describe('extractPageSignals — zero-stats fixture', () => {
  it('detects zero hyperlinked statistics and zero inline numeric mentions', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.equal(signals.statistics.hyperlinkedStatistics, 0);
    assert.equal(signals.statistics.inlineNumericMentions, 0);
  });

  it('detects the canonical heading hierarchy', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.equal(signals.headingCounts.h1, 1);
    assert.ok(signals.headingCounts.h2 >= 4);
    assert.ok(signals.headingCounts.h3 >= 4); // FAQ questions
  });

  it('detects structural blocks: lists, tables, FAQ', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(signals.structuralBlocks.lists >= 3, 'UL and OL lists present');
    assert.equal(signals.structuralBlocks.tables, 1);
    assert.ok(signals.structuralBlocks.faqBlocks >= 1);
  });

  it('detects byline and Article/Person schema author', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.equal(signals.authorship.hasByline, true);
    assert.equal(signals.authorship.hasAuthorSchema, true);
  });

  it('parses freshness dates from Article schema', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.equal(signals.freshness.publishedAt, '2026-04-01T08:00:00.000Z');
    assert.equal(signals.freshness.modifiedAt, '2026-04-10T12:00:00.000Z');
    assert.ok(signals.freshness.schemaDateCount >= 2);
  });

  it('counts outbound links to the Further Reading section', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(signals.outboundLinks.total >= 3);
  });

  it('counts roughly 1000-1400 words of body content', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(
      signals.wordCount >= 900 && signals.wordCount <= 1500,
      `expected 900–1500 words, got ${String(signals.wordCount)}`,
    );
  });

  it('computes a reasonable Flesch readability for plain prose', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(signals.readability.flesch >= 40 && signals.readability.flesch <= 100);
    assert.ok(signals.readability.avgWordsPerSentence > 0);
  });

  it('preserves a representative text sample for downstream scoring', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(signals.textSample.length > 0);
    assert.ok(
      signals.textSample.toLowerCase().includes('sourdough'),
      'text sample should contain the article topic',
    );
  });

  it('detects engagement media: images, figures, and quotes', async () => {
    const html = await loadFixture('zero-stats.html');
    const signals = extractPageSignals({ html, url: FIXTURE_URL });
    assert.ok(signals.media.imageCount >= 1);
    assert.ok(signals.media.figureCount >= 1);
    assert.ok(signals.media.quoteBlockCount >= 1);
  });
});

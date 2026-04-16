import { Command } from 'commander';
import { fetchPage } from '@seopen/fetch';
import { extractPageSignals } from '@seopen/parse';
import { scoreGeoContent, signalsToInputs } from '@seopen/scoring';
import type { GeoContentScoreResult } from '@seopen/types';

interface GeoScoreOptions {
  topics: string;
  format: 'json' | 'table';
  respectRobots: boolean;
}

export function geoScoreCommand(): Command {
  return new Command('score')
    .description('Compute the GEO Content Score for a URL (docs/scoring.md §3.3)')
    .argument('<url>', 'URL to score')
    .option(
      '-t, --topics <list>',
      'Comma-separated topic keywords used to compute Semantic Relevance',
      '',
    )
    .option('-f, --format <format>', 'Output format: json | table', 'table')
    .option('--no-respect-robots', 'Skip robots.txt check (authorized use only)')
    .action(async (url: string, rawOptions: Record<string, unknown>) => {
      const options = normalizeOptions(rawOptions);
      const topics = parseTopics(options.topics);

      const fetchResult = await fetchPage(url, { respectRobots: options.respectRobots });
      if (fetchResult.status >= 400) {
        throw new Error(`fetch failed: ${String(fetchResult.status)} for ${url}`);
      }

      const signals = extractPageSignals({
        html: fetchResult.body,
        url: fetchResult.finalUrl,
      });
      const inputs = signalsToInputs(signals, { topicKeywords: topics });
      const result = scoreGeoContent(inputs, {
        sourceVersions: {
          fetch: '0.0.0',
          parse: '0.0.0',
          scoring: '0.0.0',
        },
      });

      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(renderTable(result, url));
      }
    });
}

function normalizeOptions(raw: Record<string, unknown>): GeoScoreOptions {
  const topics = typeof raw['topics'] === 'string' ? raw['topics'] : '';
  const formatRaw = typeof raw['format'] === 'string' ? raw['format'] : 'table';
  const format: 'json' | 'table' = formatRaw === 'json' ? 'json' : 'table';
  const respectRobots = raw['respectRobots'] !== false;
  return { topics, format, respectRobots };
}

function parseTopics(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function renderTable(result: GeoContentScoreResult, url: string): string {
  const lines: string[] = [];
  lines.push(`GEO Content Score — ${url}`);
  lines.push('');
  lines.push(`Final score: ${String(result.score)} / 100  (band: ${result.band})`);
  lines.push('');
  lines.push('Sub-scores (0.00 – 1.00):');
  lines.push(`  factInterpretability ${formatSub(result.inputs.factInterpretability)}`);
  lines.push(`  semanticRelevance    ${formatSub(result.inputs.semanticRelevance)}`);
  lines.push(`  conversationalTone   ${formatSub(result.inputs.conversationalTone)}`);
  lines.push(`  structure            ${formatSub(result.inputs.structure)}`);
  lines.push(`  engagement           ${formatSub(result.inputs.engagement)}`);
  lines.push('');
  lines.push('Provenance:');
  lines.push(`  formula:  ${result.provenance.formulaVersion}`);
  lines.push(`  weights:  ${result.provenance.weightsVersion}`);
  lines.push(`  computed: ${result.provenance.computedAt}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatSub(value: number): string {
  return value.toFixed(2);
}

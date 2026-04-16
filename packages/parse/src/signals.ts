import { parseHTML } from 'linkedom';
import type { PageSignals } from '@seopen/types';

export interface ExtractPageSignalsInput {
  html: string;
  url: string;
}

/**
 * Extract a `PageSignals` bundle from a rendered HTML document. Deterministic,
 * pure with respect to its inputs, and does not reach out to the network.
 *
 * The signals align with the predictive GEO Content Score categories
 * documented in `docs/scoring.md` §3.3 and `docs/modules.md` §2 (sub-module B):
 * factual density, semantic chunking, authority, freshness, readability.
 */
export function extractPageSignals(input: ExtractPageSignalsInput): PageSignals {
  const { document } = parseHTML(input.html);
  const jsonLd = collectJsonLd(document);
  const origin = safeOrigin(input.url);

  const article = document.querySelector('article') ?? document.body ?? document.documentElement;

  const bodyText = extractVisibleText(article);
  const wordCount = countWords(bodyText);

  return {
    url: input.url,
    wordCount,
    headingCounts: countHeadings(article),
    structuralBlocks: {
      lists: countMatching(article, 'ul, ol'),
      tables: countMatching(article, 'table'),
      faqBlocks: countFaqBlocks(article, jsonLd),
    },
    statistics: countStatistics(article),
    outboundLinks: countOutboundLinks(article, origin),
    authorship: {
      hasByline: hasBylineIndicator(document),
      hasAuthorSchema: hasAuthorInJsonLd(jsonLd),
    },
    freshness: extractFreshness(document, jsonLd),
    readability: computeReadability(bodyText),
    media: {
      imageCount: countMatching(article, 'img'),
      figureCount: countMatching(article, 'figure'),
      quoteBlockCount: countMatching(article, 'blockquote'),
    },
    textSample: bodyText.slice(0, 4000),
  };
}

// --- JSON-LD --------------------------------------------------------------

type JsonLdNode = Record<string, unknown>;

function collectJsonLd(document: Document): JsonLdNode[] {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const out: JsonLdNode[] = [];
  for (const script of scripts) {
    const text = script.textContent ?? '';
    if (text.trim().length === 0) continue;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) if (isObject(item)) out.push(item);
      } else if (isObject(parsed)) {
        out.push(parsed);
      }
    } catch {
      // Malformed JSON-LD is ignored. Parser is deliberately tolerant.
    }
  }
  return out;
}

function isObject(value: unknown): value is JsonLdNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasAuthorInJsonLd(nodes: JsonLdNode[]): boolean {
  for (const node of nodes) {
    const type = node['@type'];
    if (type === 'Article' || type === 'NewsArticle' || type === 'BlogPosting') {
      if (node['author'] !== undefined) return true;
    }
  }
  return false;
}

// --- headings -------------------------------------------------------------

function countHeadings(root: Element | Document): PageSignals['headingCounts'] {
  return {
    h1: countMatching(root, 'h1'),
    h2: countMatching(root, 'h2'),
    h3: countMatching(root, 'h3'),
    h4Plus: countMatching(root, 'h4, h5, h6'),
  };
}

function countMatching(root: Element | Document, selector: string): number {
  return root.querySelectorAll(selector).length;
}

// --- FAQ ------------------------------------------------------------------

function countFaqBlocks(root: Element | Document, jsonLd: JsonLdNode[]): number {
  let count = 0;
  for (const node of jsonLd) {
    if (node['@type'] === 'FAQPage') count += 1;
  }
  count += root.querySelectorAll('[class*="faq" i]').length;
  return count;
}

// --- statistics -----------------------------------------------------------

const STAT_PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?\s*%/,
  /[$€£¥]\s*\d[\d,]*(?:\.\d+)?/,
  /\b\d+(?:\.\d+)?\s*x\b/i,
  /\b\d+(?:\.\d+)?\s+times\b/i,
];

function containsStatistic(text: string): boolean {
  return STAT_PATTERNS.some((pattern) => pattern.test(text));
}

function countStatistics(root: Element | Document): PageSignals['statistics'] {
  const text = (root.textContent ?? '').replace(/\s+/g, ' ');
  const inlineNumericMentions = countAllMatches(text, STAT_PATTERNS);

  let hyperlinked = 0;
  for (const anchor of root.querySelectorAll('a')) {
    const anchorText = anchor.textContent ?? '';
    if (containsStatistic(anchorText)) hyperlinked += 1;
  }

  return { inlineNumericMentions, hyperlinkedStatistics: hyperlinked };
}

function countAllMatches(text: string, patterns: RegExp[]): number {
  let total = 0;
  for (const pattern of patterns) {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    const matches = text.match(global);
    total += matches?.length ?? 0;
  }
  return total;
}

// --- outbound links -------------------------------------------------------

const PRIMARY_SOURCE_PATTERNS: RegExp[] = [
  /\.gov(?:\/|$|:)/i,
  /\.edu(?:\/|$|:)/i,
  /doi\.org\//i,
  /arxiv\.org\//i,
  /ncbi\.nlm\.nih\.gov/i,
  /who\.int/i,
  /nature\.com/i,
  /science\.org/i,
  /acm\.org/i,
  /ieee\.org/i,
];

function countOutboundLinks(
  root: Element | Document,
  origin: string | null,
): PageSignals['outboundLinks'] {
  let total = 0;
  let toPrimarySources = 0;
  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    if (!/^https?:\/\//i.test(href)) continue;
    if (origin !== null && href.startsWith(origin)) continue;
    total += 1;
    if (PRIMARY_SOURCE_PATTERNS.some((pattern) => pattern.test(href))) {
      toPrimarySources += 1;
    }
  }
  return { total, toPrimarySources };
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// --- byline ---------------------------------------------------------------

function hasBylineIndicator(document: Document): boolean {
  if (document.querySelector('[rel="author"]') !== null) return true;
  if (document.querySelector('.byline, [class*="byline" i]') !== null) return true;
  return false;
}

// --- freshness ------------------------------------------------------------

function extractFreshness(document: Document, jsonLd: JsonLdNode[]): PageSignals['freshness'] {
  let publishedAt: string | null = null;
  let modifiedAt: string | null = null;
  let schemaDateCount = 0;

  for (const node of jsonLd) {
    const published = node['datePublished'];
    const modified = node['dateModified'];
    if (typeof published === 'string') {
      publishedAt ??= normalizeIsoDate(published);
      if (publishedAt !== null) schemaDateCount += 1;
    }
    if (typeof modified === 'string') {
      modifiedAt ??= normalizeIsoDate(modified);
      if (modifiedAt !== null) schemaDateCount += 1;
    }
  }

  const timeElements = document.querySelectorAll('time[datetime]');
  for (const time of timeElements) {
    const value = time.getAttribute('datetime') ?? '';
    const normalized = normalizeIsoDate(value);
    if (normalized === null) continue;
    publishedAt ??= normalized;
    if (modifiedAt === null && normalized !== publishedAt) modifiedAt = normalized;
  }

  return { publishedAt, modifiedAt, schemaDateCount };
}

function normalizeIsoDate(raw: string): string | null {
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

// --- text + readability ---------------------------------------------------

function extractVisibleText(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  for (const node of clone.querySelectorAll('script, style, noscript, template')) {
    node.remove();
  }
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  if (text.length === 0) return 0;
  return text.split(/\s+/).filter((token) => /[a-zA-Z]/.test(token)).length;
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return Math.max(1, matches?.length ?? 1);
}

function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length === 0) return 0;
  if (normalized.length <= 3) return 1;
  const stripped = normalized.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, '').replace(/^y/u, '');
  const groups = stripped.match(/[aeiouy]{1,2}/gu);
  return Math.max(1, groups?.length ?? 1);
}

function computeReadability(text: string): PageSignals['readability'] {
  if (text.length === 0) return { flesch: 0, avgWordsPerSentence: 0 };

  const words = text.split(/\s+/).filter((token) => /[a-zA-Z]/.test(token));
  const sentences = countSentences(text);
  if (words.length === 0) return { flesch: 0, avgWordsPerSentence: 0 };

  let syllableTotal = 0;
  for (const word of words) syllableTotal += countSyllables(word);

  const avgWordsPerSentence = words.length / sentences;
  const avgSyllablesPerWord = syllableTotal / words.length;
  const flesch = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  return {
    flesch: round1(flesch),
    avgWordsPerSentence: round1(avgWordsPerSentence),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

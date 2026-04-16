import robotsParserRaw from 'robots-parser';
import type { FetchResult } from '@seopen/types';

// robots-parser ships an ambient `declare module` that strips its export
// signature from TypeScript's view. Re-type the default export explicitly.
interface Robot {
  isAllowed(url: string, ua?: string): boolean | undefined;
}
type RobotsParserFn = (url: string, contents: string) => Robot;
const robotsParser = robotsParserRaw as unknown as RobotsParserFn;

const DEFAULT_USER_AGENT = 'SEOpen/0.0.0 (+https://github.com/ahernandez-developer/SEOpen)';

export interface FetchPageOptions {
  /** User-Agent header sent with every request. Defaults to `SEOpen/<version>`. */
  userAgent?: string;
  /** Per-request timeout. Default 15 000 ms. */
  timeoutMs?: number;
  /** Respect `robots.txt`. Default `true`; disables only when the caller has explicit authorization. */
  respectRobots?: boolean;
  /** Clock injection for deterministic tests. */
  now?: () => Date;
}

/**
 * Fetch a single URL and return a normalized `FetchResult`. The client
 * respects `robots.txt` by default — see ADR A-008 and `docs/architecture.md`
 * §4.9 for the "responsible crawling" posture that motivates this default.
 */
export async function fetchPage(
  rawUrl: string,
  options: FetchPageOptions = {},
): Promise<FetchResult> {
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const respectRobots = options.respectRobots ?? true;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const now = options.now ?? ((): Date => new Date());

  const url = new URL(rawUrl);
  let robotsAllowed = true;
  if (respectRobots) {
    robotsAllowed = await checkRobotsAllowed(url, userAgent, timeoutMs);
    if (!robotsAllowed) throw new RobotsDeniedError(rawUrl);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  let response: Response;
  try {
    response = await fetch(rawUrl, {
      method: 'GET',
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    requestedUrl: rawUrl,
    finalUrl: response.url,
    status: response.status,
    headers,
    body,
    fetchedAt: now().toISOString(),
    robotsAllowed,
  };
}

async function checkRobotsAllowed(
  url: URL,
  userAgent: string,
  timeoutMs: number,
): Promise<boolean> {
  const robotsUrl = `${url.origin}/robots.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(robotsUrl, {
      method: 'GET',
      headers: { 'user-agent': userAgent },
      signal: controller.signal,
    });
    if (response.status === 404 || response.status >= 500) return true;
    if (!response.ok) return true;
    const text = await response.text();
    const robots = robotsParser(robotsUrl, text);
    return robots.isAllowed(url.toString(), userAgent) ?? true;
  } catch {
    // Network error on robots.txt is treated as a lenient allow so transient
    // infrastructure failures don't block the crawl. Real deployments should
    // monitor for sustained robots.txt fetch failures.
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export class RobotsDeniedError extends Error {
  public readonly url: string;
  constructor(url: string) {
    super(`robots.txt denies access to ${url}`);
    this.name = 'RobotsDeniedError';
    this.url = url;
  }
}

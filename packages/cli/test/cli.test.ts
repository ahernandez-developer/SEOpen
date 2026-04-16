import { after, before, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: readonly string[]): Promise<CliResult> {
  const binPath = fileURLToPath(new URL('../src/bin.ts', import.meta.url));
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', '--conditions=source', binPath, ...args],
      {
        env: { ...process.env, NODE_OPTIONS: '' },
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });
  });
}

interface FixtureServer {
  url: string;
  close: () => Promise<void>;
}

async function startFixtureServer(): Promise<FixtureServer> {
  const fixturePath = fileURLToPath(
    new URL('../../../fixtures/geo/zero-stats.html', import.meta.url),
  );
  const html = await readFile(fixturePath, 'utf8');

  const server: Server = createServer((req, res) => {
    if ((req.url ?? '/') === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('User-agent: *\nAllow: /\n');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('failed to bind fixture server');
  }

  return {
    url: `http://127.0.0.1:${String(address.port)}/zero-stats.html`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

let fixture: FixtureServer;

before(async () => {
  fixture = await startFixtureServer();
});

after(async () => {
  await fixture.close();
});

describe('seopen geo score <url>', () => {
  it('prints a Moderate-band score as a table by default', async () => {
    const result = await runCli(['geo', 'score', fixture.url, '--topics', 'sourdough,baking']);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.ok(
      /Final score:\s+\d+(?:\.\d+)?\s+\/\s+100\s+\(band: moderate\)/.test(result.stdout),
      `unexpected stdout:\n${result.stdout}`,
    );
    assert.ok(result.stdout.includes('factInterpretability'));
    assert.ok(result.stdout.includes('formula:  3.3.0'));
  });

  it('emits JSON when --format json is passed', async () => {
    const result = await runCli([
      'geo',
      'score',
      fixture.url,
      '--topics',
      'sourdough',
      '--format',
      'json',
    ]);
    assert.equal(result.exitCode, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as {
      score: number;
      band: string;
      provenance: { formulaVersion: string };
    };
    assert.ok(parsed.score >= 60 && parsed.score <= 74);
    assert.equal(parsed.band, 'moderate');
    assert.equal(parsed.provenance.formulaVersion, '3.3.0');
  });

  it('exits non-zero when the URL cannot be reached', async () => {
    // Use a port that is very unlikely to have a server bound.
    const result = await runCli(['geo', 'score', 'http://127.0.0.1:1/doesnotexist']);
    assert.notEqual(result.exitCode, 0);
    assert.ok(result.stderr.length > 0);
  });
});

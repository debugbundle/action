import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const actionSource = await readFile(new URL('../action.yml', import.meta.url), 'utf8');
const script = actionSource.split("node --input-type=module <<'EOF'\n")[1]?.split('\n        EOF')[0]?.replace(/^        /gm, '');
assert.ok(script, 'action script was not found');

async function runAction(handler, incidentId = 'inc_123') {
  const directory = await mkdtemp(join(tmpdir(), 'debugbundle-action-'));
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', ['--input-type=module'], {
        env: {
          ...process.env,
          INPUT_INCIDENT_ID: incidentId,
          INPUT_DEBUGBUNDLE_TOKEN: 'test-token',
          INPUT_API_BASE_URL: `http://127.0.0.1:${address.port}`,
          INPUT_WORKSPACE_ROOT: directory,
          GITHUB_OUTPUT: join(directory, 'outputs')
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stderr = '';
      child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stderr, directory }));
      child.stdin.end(script);
    });
    return { ...result, read: (path) => readFile(join(directory, path), 'utf8') };
  } finally {
    server.close();
    // Files are read before cleanup in tests via the returned read function.
  }
}

test('writes only privacy-projected bundle and reproduction responses', async () => {
  const result = await runAction((request, response) => {
    response.setHeader('x-debugbundle-privacy-policy', 'telemetry-privacy-v1');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(request.url?.endsWith('/bundle') ? { bundle_version: 1 } : { possible: false }));
  });
  try {
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(await result.read('.debugbundle/bundles/cloud/inc_123.bundle.json')), { bundle_version: 1 });
    assert.deepEqual(JSON.parse(await result.read('.debugbundle/bundles/cloud/reproductions/inc_123.reproduction.json')), { possible: false });
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});

test('rejects a legacy unmarked bundle without writing it or echoing its contents', async () => {
  const result = await runAction((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{"summary":"token=old-secret"}');
  });
  try {
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /required privacy projection/);
    assert.doesNotMatch(result.stderr, /old-secret/);
    await assert.rejects(result.read('.debugbundle/bundles/cloud/inc_123.bundle.json'), { code: 'ENOENT' });
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});

test('rejects unsafe incident IDs before any filesystem write', async () => {
  const result = await runAction(() => {}, '../unsafe');
  try {
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /incident-id input is invalid/);
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});

test('does not follow artifact redirects or print upstream response contents', async () => {
  let requests = 0;
  const result = await runAction((_request, response) => {
    requests += 1;
    response.writeHead(302, { location: '/raw?token=SYNTHETIC_SECRET' });
    response.end();
  });
  try {
    assert.notEqual(result.code, 0);
    assert.equal(requests, 1);
    assert.doesNotMatch(result.stderr, /SYNTHETIC_SECRET/);
  } finally { await rm(result.directory, { recursive: true, force: true }); }
});

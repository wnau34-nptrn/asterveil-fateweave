/* global Request */
import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.mjs';

test('health reports only development service status and cannot be cached', async () => {
  const response = worker.fetch(new Request('https://example.com/health'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok', service: 'asterveil-api', environment: 'dev' });
});

test('HEAD has the same headers but no body', async () => {
  const response = worker.fetch(new Request('https://example.com/health', { method: 'HEAD' }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(await response.text(), '');
});

test('account and reward routes remain unavailable', async () => {
  for (const path of ['/', '/accounts', '/rewards', '/health/']) {
    const response = worker.fetch(new Request(`https://example.com${path}`));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
  }
});

test('health rejects mutation methods', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const response = worker.fetch(new Request('https://example.com/health', { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.deepEqual(await response.json(), { error: 'method_not_allowed' });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import KeyOrchestrator from '../src/lib/keyOrchestrator.ts';

test('KeyOrchestrator - Round robin selection', () => {
  const orchestrator = new KeyOrchestrator({
    keys: ['key-1', 'key-2', 'key-3'],
    cooldownMs: 5000,
  });

  assert.equal(orchestrator.getKey(), 'key-1');
  assert.equal(orchestrator.getKey(), 'key-2');
  assert.equal(orchestrator.getKey(), 'key-3');
  assert.equal(orchestrator.getKey(), 'key-1');
});

test('KeyOrchestrator - Excluded on cooldown (429)', () => {
  const orchestrator = new KeyOrchestrator({
    keys: ['key-1', 'key-2', 'key-3'],
    cooldownMs: 5000,
  });

  assert.equal(orchestrator.getKey(), 'key-1');
  orchestrator.reportExhausted('key-2', 'RESOURCE_EXHAUSTED');

  // key-2 is on cooldown, so next key should be key-3
  assert.equal(orchestrator.getKey(), 'key-3');
  // and next should skip key-2 and go to key-1
  assert.equal(orchestrator.getKey(), 'key-1');
  assert.equal(orchestrator.getKey(), 'key-3');
});

test('KeyOrchestrator - Throws when all keys exhausted', () => {
  const orchestrator = new KeyOrchestrator({
    keys: ['key-a', 'key-b'],
    cooldownMs: 10000,
  });

  orchestrator.reportExhausted('key-a');
  orchestrator.reportExhausted('key-b');

  assert.throws(
    () => orchestrator.getKey(),
    /All API keys are on cooldown/
  );
});

test('KeyOrchestrator - Pool status reporting', () => {
  const orchestrator = new KeyOrchestrator({
    keys: ['key-alpha', 'key-beta'],
    cooldownMs: 10000,
  });

  orchestrator.reportExhausted('key-alpha');
  const status = orchestrator.getStatus();

  assert.equal(status.total, 2);
  assert.equal(status.healthy, 1);
  assert.equal(status.keys[0].isHealthy, false);
  assert.equal(status.keys[1].isHealthy, true);
});

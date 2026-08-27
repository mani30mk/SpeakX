import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBasicScores, getGrade, type TranscriptEntry } from '../src/lib/scoring.ts';

test('Scoring - Empty transcript returns zero scores', () => {
  const scores = computeBasicScores([]);
  assert.equal(scores.fluencyScore, 0);
  assert.equal(scores.fillerCount, 0);
  assert.equal(scores.wordCount, 0);
});

test('Scoring - Counts filler words correctly', () => {
  const transcript: TranscriptEntry[] = [
    { role: 'ai', text: 'Tell me about yourself.', timestamp: 1000 },
    { role: 'user', text: 'Um, basically I like coding and you know I build apps.', timestamp: 4000 },
  ];

  const scores = computeBasicScores(transcript);
  assert.ok(scores.fillerCount >= 3); // 'um', 'basically', 'like', 'you know'
  assert.ok(scores.wordCount > 0);
  assert.equal(scores.avgResponseTimeSec, 3);
});

test('Scoring - Grade label mapping', () => {
  assert.equal(getGrade(95).label, 'Excellent');
  assert.equal(getGrade(80).label, 'Good');
  assert.equal(getGrade(65).label, 'Fair');
  assert.equal(getGrade(45).label, 'Needs Work');
  assert.equal(getGrade(20).label, 'Keep Practicing');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCard, createCard, QUALITY_MAP } from '../src/lib/sm2.ts';

test('SM-2 Algorithm - Fresh card creation', () => {
  const card = createCard();
  assert.equal(card.repetition, 0);
  assert.equal(card.efactor, 2.5);
  assert.equal(card.intervalDays, 1);
});

test('SM-2 Algorithm - Successful recall progression', () => {
  let card = createCard();

  // First review: quality 4 (good) -> interval 1, rep 1
  let result = reviewCard(card, 4);
  assert.equal(result.repetition, 1);
  assert.equal(result.intervalDays, 1);
  assert.ok(result.nextReview > new Date(Date.now() - 1000));

  // Second review: quality 5 (easy) -> interval 6, rep 2
  result = reviewCard(result, 5);
  assert.equal(result.repetition, 2);
  assert.equal(result.intervalDays, 6);

  // Third review: quality 4 (good) -> interval = 6 * efactor
  const prevEfactor = result.efactor;
  result = reviewCard(result, 4);
  assert.equal(result.repetition, 3);
  assert.equal(result.intervalDays, Math.round(6 * prevEfactor));
});

test('SM-2 Algorithm - Failed recall resets interval and repetition', () => {
  let card = {
    repetition: 4,
    efactor: 2.7,
    intervalDays: 24,
  };

  // Quality < 3 should reset
  const result = reviewCard(card, QUALITY_MAP.again);
  assert.equal(result.repetition, 0);
  assert.equal(result.intervalDays, 1);
  assert.ok(result.efactor < 2.7); // efactor drops on failure
});

test('SM-2 Algorithm - EF floor at 1.3', () => {
  let card = {
    repetition: 0,
    efactor: 1.35,
    intervalDays: 1,
  };

  // Repeated complete blackouts
  for (let i = 0; i < 5; i++) {
    card = reviewCard(card, 0);
  }

  assert.equal(card.efactor, 1.3);
});

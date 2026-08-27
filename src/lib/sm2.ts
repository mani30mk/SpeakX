/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo-2 algorithm by Piotr Wozniak.
 * Used for vocabulary review scheduling — no API calls needed.
 */

export interface SM2Card {
  repetition: number;   // number of consecutive correct recalls
  efactor: number;      // easiness factor (minimum 1.3)
  intervalDays: number; // current interval in days
}

export interface SM2Result extends SM2Card {
  nextReview: Date;
}

/**
 * Quality grades for card review:
 * 0 - Complete blackout (couldn't recall at all)
 * 1 - Incorrect, but remembered upon seeing answer
 * 2 - Incorrect, but answer felt familiar
 * 3 - Correct, but with significant difficulty
 * 4 - Correct, with some hesitation
 * 5 - Perfect, instant recall
 */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Calculate the next review parameters for a card.
 *
 * @param card - Current card state
 * @param quality - Quality of recall (0-5)
 * @returns Updated card state with next review date
 */
export function reviewCard(card: SM2Card, quality: SM2Quality): SM2Result {
  let { repetition, efactor, intervalDays } = card;

  if (quality >= 3) {
    // Successful recall
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * efactor);
    }
    repetition += 1;
  } else {
    // Failed recall — reset
    repetition = 0;
    intervalDays = 1;
  }

  // Update easiness factor
  efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Floor at 1.3
  if (efactor < 1.3) efactor = 1.3;

  // Round to 2 decimal places
  efactor = Math.round(efactor * 100) / 100;

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  nextReview.setHours(0, 0, 0, 0);

  return {
    repetition,
    efactor,
    intervalDays,
    nextReview,
  };
}

/**
 * Map user-friendly button labels to SM-2 quality grades.
 */
export const QUALITY_MAP = {
  again: 1 as SM2Quality,
  hard: 2 as SM2Quality,
  good: 3 as SM2Quality,
  easy: 5 as SM2Quality,
} as const;

/**
 * Create a fresh card with default SM-2 parameters.
 */
export function createCard(): SM2Card {
  return {
    repetition: 0,
    efactor: 2.5,
    intervalDays: 1,
  };
}

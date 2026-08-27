/**
 * Scoring module — computes fluency, grammar, and vocabulary scores
 * from session transcripts. Pure computed logic, no API calls.
 */

export interface TranscriptEntry {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface BasicScores {
  fluencyScore: number;    // 0-100
  fillerCount: number;
  avgResponseTimeSec: number;
  wordCount: number;
  uniqueWordCount: number;
  vocabularyDiversity: number; // unique/total ratio
  avgSentenceLength: number;
}

// Common filler words and hesitation markers
const FILLER_WORDS = new Set([
  'um', 'uh', 'hmm', 'er', 'ah', 'like', 'you know', 'i mean',
  'basically', 'actually', 'literally', 'right', 'so yeah',
  'kind of', 'sort of', 'well', 'just', 'honestly',
]);

/**
 * Compute basic scores from a transcript.
 * These are heuristic/computed metrics — the AI feedback is separate.
 */
export function computeBasicScores(transcript: TranscriptEntry[]): BasicScores {
  const userEntries = transcript.filter((e) => e.role === 'user');

  if (userEntries.length === 0) {
    return {
      fluencyScore: 0,
      fillerCount: 0,
      avgResponseTimeSec: 0,
      wordCount: 0,
      uniqueWordCount: 0,
      vocabularyDiversity: 0,
      avgSentenceLength: 0,
    };
  }

  // Combine all user text
  const allText = userEntries.map((e) => e.text).join(' ');
  const words = allText.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);

  // Count fillers
  let fillerCount = 0;
  for (const word of words) {
    if (FILLER_WORDS.has(word)) fillerCount++;
  }

  // Also check multi-word fillers
  const lowerText = allText.toLowerCase();
  for (const filler of FILLER_WORDS) {
    if (filler.includes(' ')) {
      const matches = lowerText.split(filler).length - 1;
      fillerCount += matches;
    }
  }

  // Average response time (time between AI message and user reply)
  const responseTimes: number[] = [];
  for (let i = 1; i < transcript.length; i++) {
    if (transcript[i].role === 'user' && transcript[i - 1].role === 'ai') {
      const delta = (transcript[i].timestamp - transcript[i - 1].timestamp) / 1000;
      if (delta > 0 && delta < 120) {
        responseTimes.push(delta);
      }
    }
  }
  const avgResponseTimeSec =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Sentence count (approximate)
  const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

  // Vocabulary diversity
  const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Fluency score (heuristic composite)
  // Higher is better: fewer fillers, faster responses, richer vocabulary
  const fillerPenalty = Math.min(fillerCount / Math.max(words.length, 1) * 200, 40);
  const responsePenalty = avgResponseTimeSec > 5 ? Math.min((avgResponseTimeSec - 5) * 3, 20) : 0;
  const diversityBonus = vocabularyDiversity * 30;
  const lengthBonus = Math.min(words.length / 5, 20);

  const fluencyScore = Math.round(
    Math.max(0, Math.min(100, 60 + diversityBonus + lengthBonus - fillerPenalty - responsePenalty))
  );

  return {
    fluencyScore,
    fillerCount,
    avgResponseTimeSec: Math.round(avgResponseTimeSec * 10) / 10,
    wordCount: words.length,
    uniqueWordCount: uniqueWords.size,
    vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
  };
}

/**
 * Grade label from a numeric score
 */
export function getGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { label: 'Good', color: '#3b82f6' };
  if (score >= 60) return { label: 'Fair', color: '#f59e0b' };
  if (score >= 40) return { label: 'Needs Work', color: '#f97316' };
  return { label: 'Keep Practicing', color: '#ef4444' };
}

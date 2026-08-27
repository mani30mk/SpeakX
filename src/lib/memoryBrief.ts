/**
 * Memory Brief — compiles a short summary of the user's history
 * for injection into the Live API system prompt.
 *
 * This is the "persistent memory" layer: the app remembers, not the model.
 */
import { query, execute } from './db';

interface SessionSummary {
  id: string;
  summary: string;
  feedback: string;
  fluency_score: number;
  started_at: string;
  scenario_id: string;
}

interface VocabEntry {
  word: string;
  efactor: number;
  repetition: number;
}

export interface MemoryBrief {
  text: string;       // The prompt injection text (~300 tokens)
  sessionCount: number;
  weakPoints: string[];
  strongPoints: string[];
}

/**
 * Build a memory brief from the user's past sessions and vocabulary data.
 * This is injected into the system prompt before each new Live session.
 */
export async function buildMemoryBrief(): Promise<MemoryBrief> {
  // Get recent sessions (last 10)
  const sessions = await query<SessionSummary>(
    `SELECT id, summary, feedback, fluency_score, started_at, scenario_id
     FROM sessions
     WHERE summary IS NOT NULL
     ORDER BY started_at DESC
     LIMIT 10`
  );

  // Get weak vocabulary (low efactor or low repetition)
  const weakVocab = await query<VocabEntry>(
    `SELECT word, efactor, repetition
     FROM vocabulary
     WHERE efactor < 2.0 OR repetition < 2
     ORDER BY efactor ASC
     LIMIT 15`
  );

  // Get all practiced scenario IDs
  const practicedScenarios = await query<{ scenario_id: string }>(
    `SELECT DISTINCT scenario_id FROM sessions WHERE scenario_id IS NOT NULL`
  );

  // Get scenarios not yet tried
  const practicedIds = practicedScenarios.map((s) => s.scenario_id);
  const allScenarios = await query<{ id: string; name: string }>(
    `SELECT id, name FROM scenarios`
  );
  const untriedScenarios = allScenarios.filter((s) => !practicedIds.includes(s.id));

  // Extract patterns from feedback
  const weakPoints: string[] = [];
  const strongPoints: string[] = [];

  for (const session of sessions) {
    if (session.feedback) {
      try {
        const fb = JSON.parse(session.feedback);
        if (fb.weaknesses) weakPoints.push(...fb.weaknesses);
        if (fb.strengths) strongPoints.push(...fb.strengths);
      } catch {
        // Skip malformed feedback
      }
    }
  }

  // Deduplicate
  const uniqueWeak = [...new Set(weakPoints)].slice(0, 5);
  const uniqueStrong = [...new Set(strongPoints)].slice(0, 3);

  // Compute fluency trend
  const scores = sessions
    .map((s) => s.fluency_score)
    .filter((s) => s != null && !isNaN(s));
  let trend = 'no data yet';
  if (scores.length >= 3) {
    const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
    trend = recent > older + 5 ? 'improving' : recent < older - 5 ? 'declining' : 'stable';
  }

  // Build the brief text
  const parts: string[] = [];

  parts.push(`The student has completed ${sessions.length} practice session(s).`);
  parts.push(`Fluency trend: ${trend}.`);

  if (uniqueWeak.length > 0) {
    parts.push(`Recurring weak points to focus on: ${uniqueWeak.join('; ')}.`);
  }

  if (uniqueStrong.length > 0) {
    parts.push(`Strengths to reinforce: ${uniqueStrong.join('; ')}.`);
  }

  if (weakVocab.length > 0) {
    const words = weakVocab.map((v) => v.word).join(', ');
    parts.push(`Vocabulary needing review: ${words}. Try to naturally use or reference these words during the conversation.`);
  }

  if (untriedScenarios.length > 0) {
    const names = untriedScenarios.slice(0, 3).map((s) => s.name).join(', ');
    parts.push(`Scenarios not yet tried: ${names}.`);
  }

  const text = parts.join(' ');

  // Save the brief
  const briefId = `brief-${Date.now()}`;
  await execute(
    `INSERT INTO memory_briefs (id, content, sessions_used) VALUES (?, ?, ?)`,
    [briefId, text, JSON.stringify(sessions.map((s) => s.id))]
  );

  return {
    text,
    sessionCount: sessions.length,
    weakPoints: uniqueWeak,
    strongPoints: uniqueStrong,
  };
}

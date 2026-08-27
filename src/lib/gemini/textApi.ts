/**
 * Gemini Text API — for post-session summaries and feedback.
 * Routed through the key orchestrator for quota resilience.
 */
import { GoogleGenAI } from '@google/genai';
import { getKeyOrchestrator } from '../keyOrchestrator';

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';

/**
 * Call Gemini text API with automatic key rotation on quota errors.
 */
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const orchestrator = getKeyOrchestrator();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = orchestrator.getKey();
    const client = new GoogleGenAI({ apiKey: key });

    try {
      const response = await client.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      orchestrator.reportSuccess(key);
      return response.text ?? '';
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        orchestrator.reportExhausted(key, err.message);
        console.warn(`[TextAPI] Key exhausted on attempt ${attempt + 1}, rotating...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error('[TextAPI] All retries exhausted');
}

/**
 * Generate a structured session summary from a transcript.
 */
export async function generateSessionSummary(
  transcript: { role: string; text: string }[]
): Promise<{
  summary: string;
  topicsCovered: string[];
  newVocabulary: { word: string; definition: string; context: string }[];
}> {
  const transcriptText = transcript
    .map((e) => `${e.role === 'user' ? 'Student' : 'AI Partner'}: ${e.text}`)
    .join('\n');

  const prompt = `Analyze this conversation practice transcript and return a JSON object with:
1. "summary": A 2-3 sentence summary of what was discussed
2. "topicsCovered": Array of topics/themes covered
3. "newVocabulary": Array of objects {word, definition, context} for any advanced or notable vocabulary the student used or should learn

Transcript:
${transcriptText}

Return ONLY valid JSON, no markdown fences.`;

  const response = await callGemini(prompt, 'You are a language and communication coach analyzing a practice session.');

  try {
    return JSON.parse(response);
  } catch {
    return {
      summary: response.slice(0, 500),
      topicsCovered: [],
      newVocabulary: [],
    };
  }
}

/**
 * Generate a detailed feedback report from a transcript.
 */
export async function generateFeedbackReport(
  transcript: { role: string; text: string }[]
): Promise<{
  overallScore: number;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  strengths: string[];
  weaknesses: string[];
  grammarIssues: { original: string; corrected: string; explanation: string }[];
  vocabularySuggestions: { word: string; definition: string; context: string }[];
  fillerWordsUsed: string[];
  tips: string[];
}> {
  const transcriptText = transcript
    .map((e) => `${e.role === 'user' ? 'Student' : 'AI Partner'}: ${e.text}`)
    .join('\n');

  const prompt = `Analyze this communication practice transcript and provide detailed feedback. Return a JSON object with:
1. "overallScore": 0-100 overall communication score
2. "grammarScore": 0-100
3. "vocabularyScore": 0-100 (variety and appropriateness)
4. "fluencyScore": 0-100 (natural flow, coherence)
5. "strengths": Array of 2-3 things the student did well
6. "weaknesses": Array of 2-3 areas to improve
7. "grammarIssues": Array of {original, corrected, explanation} for specific mistakes
8. "vocabularySuggestions": Array of {word, definition, context} — better word choices they could have used
9. "fillerWordsUsed": Array of filler words/phrases detected
10. "tips": Array of 2-3 actionable tips for improvement

Be constructive and encouraging. Focus on patterns, not one-off mistakes.

Transcript:
${transcriptText}

Return ONLY valid JSON, no markdown fences.`;

  const response = await callGemini(prompt, 'You are an expert communication skills coach providing detailed, constructive feedback.');

  try {
    return JSON.parse(response);
  } catch {
    return {
      overallScore: 50,
      grammarScore: 50,
      vocabularyScore: 50,
      fluencyScore: 50,
      strengths: ['Completed the session'],
      weaknesses: ['Unable to parse detailed feedback'],
      grammarIssues: [],
      vocabularySuggestions: [],
      fillerWordsUsed: [],
      tips: ['Keep practicing regularly'],
    };
  }
}

/**
 * Suggest the next scenario based on the user's history.
 */
export async function suggestNextScenario(
  weakPoints: string[],
  practicedScenarios: string[],
  availableScenarios: { id: string; name: string; category: string; description: string }[]
): Promise<string> {
  const untried = availableScenarios.filter((s) => !practicedScenarios.includes(s.id));

  const prompt = `Based on the student's weak points and available scenarios, suggest the best next scenario to practice.

Weak points: ${weakPoints.join(', ') || 'None identified yet'}
Previously practiced: ${practicedScenarios.join(', ') || 'None'}

Available scenarios:
${(untried.length > 0 ? untried : availableScenarios).map((s) => `- ${s.id}: ${s.name} (${s.category}) — ${s.description}`).join('\n')}

Return ONLY the scenario id string, nothing else.`;

  const response = await callGemini(prompt);
  return response.trim();
}

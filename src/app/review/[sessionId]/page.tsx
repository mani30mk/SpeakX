'use client';

import Link from 'next/link';
import styles from './page.module.css';

// Demo feedback data — in production this comes from DB + Gemini analysis
const DEMO_FEEDBACK = {
  overallScore: 74,
  grammarScore: 68,
  vocabularyScore: 80,
  fluencyScore: 75,
  strengths: [
    'Good use of transitional phrases to connect ideas',
    'Maintained a natural conversational flow',
    'Asked thoughtful follow-up questions',
  ],
  weaknesses: [
    'Overuse of filler words ("like", "you know") — 8 instances',
    'Some subject-verb agreement errors in complex sentences',
    'Could vary sentence structure more',
  ],
  grammarIssues: [
    { original: 'There was many people', corrected: 'There were many people', explanation: 'Use "were" with plural subjects' },
    { original: 'Me and my friend went', corrected: 'My friend and I went', explanation: 'Use subject pronouns (I) as the subject of a sentence' },
  ],
  vocabularySuggestions: [
    { word: 'eloquent', definition: 'Fluent or persuasive in speaking', context: 'Instead of "she spoke really well", try "she was eloquent"' },
    { word: 'elaborate', definition: 'To explain in more detail', context: 'Instead of "tell me more", try "could you elaborate on that?"' },
  ],
  tips: [
    'Try pausing briefly instead of using filler words — silence is powerful',
    'Practice using the STAR method to structure longer responses',
    'Record yourself speaking and listen back to identify patterns',
  ],
};

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle className="score-ring-bg" cx="60" cy="60" r="45" />
        <circle
          className="score-ring-fill"
          cx="60" cy="60" r="45"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-value">
        <span>{score}</span>
        <span className="score-ring-label">{label}</span>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const fb = DEMO_FEEDBACK;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <Link href="/practice" className={styles.backLink}>← Back to Practice</Link>
        <h1>Session Review</h1>
        <p className={styles.subtitle}>
          Coffee Shop Chat · 5 min 32 sec · Just now
        </p>
      </div>

      {/* Score rings */}
      <div className={styles.scores}>
        <ScoreRing score={fb.overallScore} label="Overall" color="var(--accent-primary)" />
        <ScoreRing score={fb.grammarScore} label="Grammar" color="var(--info)" />
        <ScoreRing score={fb.vocabularyScore} label="Vocabulary" color="var(--success)" />
        <ScoreRing score={fb.fluencyScore} label="Fluency" color="var(--accent-warm)" />
      </div>

      <div className={styles.grid}>
        {/* Strengths */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>✅ Strengths</h2>
          <ul className={styles.list}>
            {fb.strengths.map((s, i) => (
              <li key={i} className={styles.listItemGood}>{s}</li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🔧 Areas to Improve</h2>
          <ul className={styles.list}>
            {fb.weaknesses.map((w, i) => (
              <li key={i} className={styles.listItemWarn}>{w}</li>
            ))}
          </ul>
        </div>

        {/* Grammar Issues */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>✏️ Grammar Issues</h2>
          {fb.grammarIssues.map((issue, i) => (
            <div key={i} className={styles.grammarIssue}>
              <div className={styles.issueOriginal}>
                <span className={styles.issueLabel}>You said:</span>
                <span className={styles.issueText}>&ldquo;{issue.original}&rdquo;</span>
              </div>
              <div className={styles.issueCorrected}>
                <span className={styles.issueLabel}>Better:</span>
                <span className={styles.issueText}>&ldquo;{issue.corrected}&rdquo;</span>
              </div>
              <p className={styles.issueExpl}>{issue.explanation}</p>
            </div>
          ))}
        </div>

        {/* Vocabulary Suggestions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📖 Vocabulary Boost</h2>
          {fb.vocabularySuggestions.map((v, i) => (
            <div key={i} className={styles.vocabCard}>
              <div className={styles.vocabWord}>{v.word}</div>
              <div className={styles.vocabDef}>{v.definition}</div>
              <div className={styles.vocabContext}>{v.context}</div>
              <button className="btn btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                + Add to deck
              </button>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className={`${styles.section} ${styles.tipsSection}`}>
          <h2 className={styles.sectionTitle}>💡 Tips for Next Time</h2>
          <ol className={styles.tipsList}>
            {fb.tips.map((tip, i) => (
              <li key={i} className={styles.tip}>{tip}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

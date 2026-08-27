import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.hero}>
      {/* Ambient decoration */}
      <div className={styles.orbLeft}></div>
      <div className={styles.orbRight}></div>

      <div className={styles.content}>
        <div className={styles.badge}>
          <span>✨</span> AI-Powered Communication Practice
        </div>

        <h1 className={styles.title}>
          Speak Better,{' '}
          <span className="gradient-text">Every Day</span>
        </h1>

        <p className={styles.subtitle}>
          Practice real conversations with an AI partner. Get instant feedback on
          fluency, grammar, and vocabulary. Track your progress with spaced
          repetition and personalized coaching.
        </p>

        <div className={styles.actions}>
          <Link href="/practice" className="btn btn-primary btn-lg" id="start-practice-btn">
            🎙️ Start Practicing
          </Link>
          <Link href="/scenarios" className="btn btn-secondary btn-lg" id="browse-scenarios-btn">
            📋 Browse Scenarios
          </Link>
        </div>

        {/* Feature cards */}
        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🗣️</div>
            <h3 className={styles.featureTitle}>Real-Time Voice</h3>
            <p className={styles.featureDesc}>
              Natural voice conversations powered by Gemini Live API. Speak and get
              responses in real-time.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3 className={styles.featureTitle}>AI Memory</h3>
            <p className={styles.featureDesc}>
              Your AI partner remembers your progress, mistakes, and goals across
              every session.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📈</div>
            <h3 className={styles.featureTitle}>Smart Feedback</h3>
            <p className={styles.featureDesc}>
              Post-session reports with grammar analysis, vocabulary suggestions,
              and fluency scoring.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Vocab Deck</h3>
            <p className={styles.featureDesc}>
              Words you struggle with are added to a spaced-repetition deck for
              efficient review.
            </p>
          </div>
        </div>

        {/* Scenario categories preview */}
        <div className={styles.categories}>
          <h2 className={styles.sectionTitle}>Practice Any Scenario</h2>
          <div className={styles.categoryGrid}>
            {[
              { icon: '☕', label: 'Everyday Talk', count: 4 },
              { icon: '💼', label: 'Interviews', count: 3 },
              { icon: '🎤', label: 'Presentations', count: 3 },
              { icon: '⚖️', label: 'Debates', count: 1 },
              { icon: '📞', label: 'Phone Calls', count: 1 },
            ].map((cat) => (
              <div key={cat.label} className={styles.categoryChip}>
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={styles.categoryCount}>{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import styles from './page.module.css';

// Demo data — in production this comes from the DB
const DEMO_SESSIONS = [
  { id: '1', scenario: 'Coffee Shop Chat', date: '2 hours ago', duration: '5:32', fluency: 78 },
  { id: '2', scenario: 'Job Interview', date: 'Yesterday', duration: '8:15', fluency: 65 },
  { id: '3', scenario: 'Elevator Pitch', date: '2 days ago', duration: '3:45', fluency: 72 },
];

const DEMO_WEAKPOINTS = [
  { pattern: 'Overuse of filler words ("like", "you know")', count: 12, trend: 'improving' },
  { pattern: 'Subject-verb agreement errors', count: 8, trend: 'stable' },
  { pattern: 'Limited use of transition phrases', count: 6, trend: 'new' },
];

const STREAK_DAYS = 7;
const HEATMAP_DATA = Array.from({ length: 91 }, () => Math.floor(Math.random() * 5));

export default function DashboardPage() {
  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>Track your communication skills progress</p>
      </div>

      {/* Top stats row */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.streakCard}`}>
          <div className={styles.streakIcon}>🔥</div>
          <div className={styles.streakInfo}>
            <span className={styles.streakValue}>{STREAK_DAYS}</span>
            <span className={styles.streakLabel}>Day Streak</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎙️</div>
          <div>
            <span className={styles.statValue}>23</span>
            <span className={styles.statLabel}>Sessions</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📚</div>
          <div>
            <span className={styles.statValue}>47</span>
            <span className={styles.statLabel}>Words Learned</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏱️</div>
          <div>
            <span className={styles.statValue}>2.4h</span>
            <span className={styles.statLabel}>Total Practice</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Fluency Trend */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Fluency Trend</h2>
          <div className={styles.chart}>
            <svg viewBox="0 0 400 160" className={styles.svg}>
              {/* Grid lines */}
              <line x1="40" y1="20" x2="40" y2="140" stroke="var(--border-subtle)" strokeWidth="1" />
              <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border-subtle)" strokeWidth="1" />
              <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="4" />

              {/* Labels */}
              <text x="20" y="24" fill="var(--text-muted)" fontSize="10" textAnchor="middle">100</text>
              <text x="20" y="84" fill="var(--text-muted)" fontSize="10" textAnchor="middle">50</text>
              <text x="20" y="144" fill="var(--text-muted)" fontSize="10" textAnchor="middle">0</text>

              {/* Gradient area */}
              <defs>
                <linearGradient id="fluencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 60 120 L 110 105 L 160 110 L 210 90 L 260 85 L 310 70 L 360 60 L 360 140 L 60 140 Z"
                fill="url(#fluencyGrad)"
              />

              {/* Line */}
              <polyline
                points="60,120 110,105 160,110 210,90 260,85 310,70 360,60"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots */}
              {[[60,120],[110,105],[160,110],[210,90],[260,85],[310,70],[360,60]].map(([x,y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="var(--accent-primary)" stroke="var(--bg-elevated)" strokeWidth="2" />
              ))}
            </svg>
          </div>
          <p className={styles.chartNote}>📈 Your fluency is improving! Up 12 points this week.</p>
        </div>

        {/* Activity Heatmap */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Activity (Last 90 Days)</h2>
          <div className="heatmap">
            {HEATMAP_DATA.map((level, i) => (
              <div
                key={i}
                className={`heatmap-cell heatmap-${level}`}
                title={`${level} session(s)`}
              />
            ))}
          </div>
          <div className={styles.heatmapLegend}>
            <span className={styles.legendLabel}>Less</span>
            <div className="heatmap-cell heatmap-0" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell heatmap-1" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell heatmap-2" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell heatmap-3" style={{ width: 12, height: 12 }} />
            <div className="heatmap-cell heatmap-4" style={{ width: 12, height: 12 }} />
            <span className={styles.legendLabel}>More</span>
          </div>
        </div>

        {/* Weak Points */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Weak Points</h2>
          <div className={styles.weakPoints}>
            {DEMO_WEAKPOINTS.map((wp, i) => (
              <div key={i} className={styles.weakPoint}>
                <div className={styles.wpInfo}>
                  <span className={styles.wpPattern}>{wp.pattern}</span>
                  <span className={styles.wpCount}>{wp.count} occurrences</span>
                </div>
                <span className={`badge ${wp.trend === 'improving' ? 'badge-green' : wp.trend === 'new' ? 'badge-amber' : 'badge-blue'}`}>
                  {wp.trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Recent Sessions</h2>
          <div className={styles.sessionList}>
            {DEMO_SESSIONS.map((session) => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionScenario}>{session.scenario}</span>
                  <span className={styles.sessionDate}>{session.date} · {session.duration}</span>
                </div>
                <div className={styles.sessionScore}>
                  <span className={styles.scoreValue}>{session.fluency}</span>
                  <span className={styles.scoreLabel}>Fluency</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

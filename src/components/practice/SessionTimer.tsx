'use client';

import { useEffect, useState } from 'react';
import styles from './SessionTimer.module.css';

interface SessionTimerProps {
  isRunning: boolean;
  maxSeconds?: number; // 600 = 10 min default
  onTimeWarning?: () => void;
  onTimeUp?: () => void;
}

export function SessionTimer({
  isRunning,
  maxSeconds = 600,
  onTimeWarning,
  onTimeUp,
}: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const remaining = maxSeconds - elapsed;
  const isWarning = remaining <= 60 && remaining > 0;
  const isExpired = remaining <= 0;

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next === maxSeconds - 60 && onTimeWarning) onTimeWarning();
        if (next >= maxSeconds && onTimeUp) onTimeUp();
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, maxSeconds, onTimeWarning, onTimeUp]);

  // Reset when session stops
  useEffect(() => {
    if (!isRunning) setElapsed(0);
  }, [isRunning]);

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.abs(secs) / 60);
    const s = Math.abs(secs) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = Math.min(elapsed / maxSeconds, 1) * 100;

  return (
    <div
      className={`${styles.timer} ${isWarning ? styles.warning : ''} ${isExpired ? styles.expired : ''}`}
      id="session-timer"
    >
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={styles.timeDisplay}>
        <span className={styles.elapsed}>{formatTime(elapsed)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.total}>{formatTime(maxSeconds)}</span>
      </div>
    </div>
  );
}

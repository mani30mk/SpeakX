'use client';

import styles from './MicButton.module.css';

interface MicButtonProps {
  state: 'idle' | 'listening' | 'ai-speaking' | 'connecting';
  onToggle: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onToggle, disabled }: MicButtonProps) {
  const label = {
    idle: 'Tap to speak',
    listening: 'Listening...',
    'ai-speaking': 'AI speaking...',
    connecting: 'Connecting...',
  }[state];

  const icon = {
    idle: '🎙️',
    listening: '⏹️',
    'ai-speaking': '🔊',
    connecting: '⏳',
  }[state];

  return (
    <div className={styles.container}>
      <button
        className={`${styles.micBtn} ${styles[state]}`}
        onClick={onToggle}
        disabled={disabled || state === 'connecting'}
        aria-label={label}
        id="mic-button"
      >
        <span className={styles.icon}>{icon}</span>
      </button>

      {/* Animated pulse rings (visible when listening) */}
      {state === 'listening' && (
        <>
          <span className={styles.ring}></span>
          <span className={styles.ring}></span>
          <span className={styles.ring}></span>
        </>
      )}

      {/* Glow animation when AI is speaking */}
      {state === 'ai-speaking' && (
        <span className={styles.glowRing}></span>
      )}

      <span className={styles.label}>{label}</span>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { MicButton } from '@/components/practice/MicButton';
import { TranscriptView } from '@/components/practice/TranscriptView';
import { SessionTimer } from '@/components/practice/SessionTimer';
import { FeedbackPanel } from '@/components/practice/FeedbackPanel';
import { useLiveConversation } from '@/hooks/useLiveConversation';
import styles from './page.module.css';

const DEFAULT_PROMPT = `You are a friendly and supportive conversation partner helping the user practice their communication skills. Be natural, ask follow-up questions, and keep the conversation flowing. If you notice grammar mistakes or awkward phrasing, gently model the correct form in your response without explicitly correcting them. Encourage the user and make the conversation enjoyable.`;

export default function PracticePage() {
  const {
    sessionState,
    micState,
    transcript,
    startSession,
    stopSession,
    toggleMic,
    error,
  } = useLiveConversation();

  const [showFeedback, setShowFeedback] = useState(false);

  const handleStart = useCallback(() => {
    startSession(DEFAULT_PROMPT);
  }, [startSession]);

  const handleToggle = useCallback(() => {
    if (sessionState === 'idle') {
      handleStart();
    } else {
      toggleMic();
    }
  }, [sessionState, handleStart, toggleMic]);

  return (
    <div className={styles.practicePage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Practice</h1>
          {sessionState === 'active' && (
            <span className="badge badge-green">● Live</span>
          )}
        </div>

        <div className={styles.headerRight}>
          {sessionState === 'active' && (
            <>
              <SessionTimer
                isRunning={sessionState === 'active'}
                maxSeconds={600}
                onTimeWarning={() => {
                  /* Could show a toast warning */
                }}
                onTimeUp={stopSession}
              />
              <button
                className="btn btn-ghost"
                onClick={() => setShowFeedback(true)}
                id="show-feedback-btn"
              >
                💡 Feedback
              </button>
              <button
                className="btn btn-secondary"
                onClick={stopSession}
                id="end-session-btn"
              >
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            className={styles.errorDismiss}
            onClick={() => {/* clear error */}}
          >
            ✕
          </button>
        </div>
      )}

      {/* Transcript area */}
      <div className={styles.transcriptArea}>
        <TranscriptView messages={transcript} />
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <MicButton
          state={sessionState === 'idle' ? 'idle' : micState}
          onToggle={handleToggle}
        />
      </div>

      {/* Feedback Panel */}
      <FeedbackPanel
        items={[]} // Will be populated when feedback system is active
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
}

'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MicButton } from '@/components/practice/MicButton';
import { TranscriptView } from '@/components/practice/TranscriptView';
import { SessionTimer } from '@/components/practice/SessionTimer';
import { FeedbackPanel } from '@/components/practice/FeedbackPanel';
import { useLiveConversation } from '@/hooks/useLiveConversation';
import styles from './page.module.css';

const DEFAULT_PROMPT = `You are a friendly and supportive conversation partner helping the user practice their communication skills. Be natural, ask follow-up questions, and keep the conversation flowing. If you notice grammar mistakes or awkward phrasing, gently model the correct form in your response without explicitly correcting them. Encourage the user and make the conversation enjoyable.`;

const SCENARIO_PROMPTS: Record<string, { name: string; icon: string; prompt: string }> = {
  'coffee-chat': {
    name: 'Coffee Shop Chat',
    icon: '☕',
    prompt: `You are Alex, a friendly person at a coffee shop. You just sat down at a shared table. Be warm, curious, and conversational. Ask follow-up questions. Share small personal anecdotes. Keep the tone light and natural. Gently model correct grammar if the user makes mistakes.`,
  },
  'job-interview-general': {
    name: 'Job Interview — General',
    icon: '💼',
    prompt: `You are a hiring manager conducting a professional job interview. Start by welcoming the candidate and asking them to introduce themselves. Ask standard interview questions one at a time: "Tell me about yourself", "What are your strengths?", "Describe a challenging project". Give brief encouraging responses.`,
  },
  'job-interview-behavioral': {
    name: 'Behavioral Interview (STAR)',
    icon: '🎯',
    prompt: `You are a senior interviewer who specializes in behavioral questions using the STAR method. Ask one question at a time: "Tell me about a time when you dealt with a difficult coworker", "Describe a situation where you failed". Probe for specifics (Situation, Task, Action, Result).`,
  },
  'elevator-pitch': {
    name: 'Elevator Pitch',
    icon: '🚀',
    prompt: `You are a venture capitalist at a networking event. The user will give you their 60-second elevator pitch. Listen carefully, then ask pointed questions: "What problem does this solve?", "Who is your target customer?". Give constructive feedback on clarity and confidence.`,
  },
  'presentation-qa': {
    name: 'Presentation Q&A',
    icon: '🎤',
    prompt: `You are moderating a Q&A session after the user's presentation. Play curious audience members and ask challenging follow-up questions to help them practice staying composed under pressure.`,
  },
  'phone-support': {
    name: 'Customer Support Call',
    icon: '📞',
    prompt: `You are a customer calling a support line because your package arrived damaged. Start frustrated but respond well to empathy and solutions. Test their ability to apologize genuinely and offer concrete help.`,
  },
  'friendly-debate': {
    name: 'Friendly Debate',
    icon: '⚖️',
    prompt: `You are a thoughtful debating partner. Propose a lighthearted debate topic (e.g. remote work vs office work). Take the opposing side respectfully, use logic, and challenge them to support their arguments.`,
  },
  'networking-event': {
    name: 'Networking Event',
    icon: '🤝',
    prompt: `You are a tech professional at a networking event. Introduce yourself, ask what they do, find common ground, and practice professional small talk.`,
  },
  'restaurant-order': {
    name: 'Restaurant Ordering',
    icon: '🍽️',
    prompt: `You are a friendly waiter at a restaurant. Welcome the guest, describe today's specials, take their order, answer ingredient questions, and bring the check.`,
  },
  'doctor-appointment': {
    name: 'Doctor Appointment',
    icon: '🩺',
    prompt: `You are a friendly doctor. Greet the patient and ask what symptoms they are experiencing. Ask clarifying health questions and provide clear medical advice.`,
  },
  'apartment-hunting': {
    name: 'Apartment Viewing',
    icon: '🏠',
    prompt: `You are a landlord showing a 2-bedroom rental apartment. Describe the space, answer questions about rent and lease terms, and practice negotiation.`,
  },
  'storytelling': {
    name: 'Storytelling Practice',
    icon: '📖',
    prompt: `You are a storytelling coach. Ask the user to tell you a personal or funny story. After they finish, give warm feedback on narrative arc and pacing.`,
  },
  'salary-negotiation': {
    name: 'Salary Negotiation',
    icon: '💰',
    prompt: `You are an HR director extending a job offer. Make a reasonable initial offer and let the candidate negotiate their compensation professionally.`,
  },
  'tech-explanation': {
    name: 'Explain Tech Simply',
    icon: '🧠',
    prompt: `You are a non-technical person. Ask the user to explain a technical concept in simple words. Ask confused questions to test their ability to avoid jargon.`,
  },
  'conflict-resolution': {
    name: 'Workplace Conflict',
    icon: '🤔',
    prompt: `You are a coworker who disagrees with the user on project priorities. Be firm but open to compromise. Practice active listening and finding common ground.`,
  },
};

function PracticeContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario') || '';

  const currentScenario = useMemo(() => {
    if (scenarioId && SCENARIO_PROMPTS[scenarioId]) {
      return SCENARIO_PROMPTS[scenarioId];
    }
    return {
      name: 'Free Practice',
      icon: '🎙️',
      prompt: DEFAULT_PROMPT,
    };
  }, [scenarioId]);

  const {
    sessionState,
    micState,
    transcript,
    startSession,
    stopSession,
    toggleMic,
    error,
    clearError,
  } = useLiveConversation();

  const [showFeedback, setShowFeedback] = useState(false);

  const handleStart = useCallback(() => {
    startSession(currentScenario.prompt);
  }, [startSession, currentScenario]);

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
          <h1 className={styles.title}>
            <span>{currentScenario.icon}</span> {currentScenario.name}
          </h1>
          {sessionState === 'active' ? (
            <span className="badge badge-green">● Live</span>
          ) : (
            <Link href="/scenarios" className="badge badge-blue" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              Change Scenario ▾
            </Link>
          )}
        </div>

        <div className={styles.headerRight}>
          {sessionState === 'active' && (
            <>
              <SessionTimer
                isRunning={sessionState === 'active'}
                maxSeconds={600}
                onTimeWarning={() => {}}
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
          <span style={{ flex: 1 }}>{error}</span>
          <button
            className={styles.errorDismiss}
            onClick={clearError}
            aria-label="Dismiss error"
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
        items={[]}
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="page-container"><p>Loading Practice Session...</p></div>}>
      <PracticeContent />
    </Suspense>
  );
}

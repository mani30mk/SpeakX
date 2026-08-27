'use client';

import { useEffect, useRef } from 'react';
import styles from './TranscriptView.module.css';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface TranscriptViewProps {
  messages: TranscriptMessage[];
}

export function TranscriptView({ messages }: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>💬</div>
        <p className={styles.emptyText}>
          Start speaking to begin the conversation.
          <br />
          Your transcript will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.transcript} id="transcript-view">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`${styles.bubble} ${styles[msg.role]}`}
        >
          <div className={styles.bubbleHeader}>
            <span className={styles.roleBadge}>
              {msg.role === 'user' ? 'You' : 'AI Partner'}
            </span>
            <span className={styles.time}>
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className={styles.text}>{msg.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

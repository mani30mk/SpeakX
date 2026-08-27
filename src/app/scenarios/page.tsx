'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface Scenario {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  icon: string;
}

// Static scenario data (matches DB seed)
const SCENARIOS: Scenario[] = [
  { id: 'coffee-chat', name: 'Coffee Shop Chat', category: 'everyday', description: 'Casual conversation with a new acquaintance. Practice small talk and keeping conversation flowing.', difficulty: 'beginner', icon: '☕' },
  { id: 'job-interview-general', name: 'Job Interview — General', category: 'interview', description: 'Practice answering common interview questions with a professional interviewer.', difficulty: 'intermediate', icon: '💼' },
  { id: 'job-interview-behavioral', name: 'Behavioral Interview (STAR)', category: 'interview', description: 'Practice the STAR method with behavioral interview questions.', difficulty: 'advanced', icon: '🎯' },
  { id: 'elevator-pitch', name: 'Elevator Pitch', category: 'presentation', description: 'Deliver a compelling 60-second pitch to a potential investor.', difficulty: 'intermediate', icon: '🚀' },
  { id: 'presentation-qa', name: 'Presentation Q&A', category: 'presentation', description: 'Handle tough audience questions after your presentation.', difficulty: 'advanced', icon: '🎤' },
  { id: 'phone-support', name: 'Customer Support Call', category: 'phone', description: 'Handle a customer complaint over the phone professionally.', difficulty: 'intermediate', icon: '📞' },
  { id: 'friendly-debate', name: 'Friendly Debate', category: 'debate', description: 'Make structured arguments on everyday topics respectfully.', difficulty: 'intermediate', icon: '⚖️' },
  { id: 'networking-event', name: 'Networking Event', category: 'everyday', description: 'Practice professional networking and finding common ground.', difficulty: 'intermediate', icon: '🤝' },
  { id: 'restaurant-order', name: 'Restaurant Ordering', category: 'everyday', description: 'Order food, ask about the menu, and handle the check.', difficulty: 'beginner', icon: '🍽️' },
  { id: 'doctor-appointment', name: 'Doctor Appointment', category: 'everyday', description: 'Describe symptoms and understand medical advice.', difficulty: 'intermediate', icon: '🩺' },
  { id: 'apartment-hunting', name: 'Apartment Viewing', category: 'everyday', description: 'Ask questions about a rental and negotiate terms.', difficulty: 'intermediate', icon: '🏠' },
  { id: 'storytelling', name: 'Storytelling Practice', category: 'everyday', description: 'Tell engaging stories with coaching on structure and detail.', difficulty: 'beginner', icon: '📖' },
  { id: 'salary-negotiation', name: 'Salary Negotiation', category: 'interview', description: 'Negotiate a job offer — salary, benefits, and terms.', difficulty: 'advanced', icon: '💰' },
  { id: 'tech-explanation', name: 'Explain Tech Simply', category: 'presentation', description: 'Explain complex concepts to a non-technical audience.', difficulty: 'intermediate', icon: '🧠' },
  { id: 'conflict-resolution', name: 'Workplace Conflict', category: 'everyday', description: 'Handle a disagreement with a colleague professionally.', difficulty: 'advanced', icon: '🤔' },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '✨' },
  { key: 'everyday', label: 'Everyday', icon: '☕' },
  { key: 'interview', label: 'Interview', icon: '💼' },
  { key: 'presentation', label: 'Presentation', icon: '🎤' },
  { key: 'debate', label: 'Debate', icon: '⚖️' },
  { key: 'phone', label: 'Phone', icon: '📞' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'badge-green',
  intermediate: 'badge-blue',
  advanced: 'badge-amber',
};

export default function ScenariosPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered =
    activeCategory === 'all'
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === activeCategory);

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1>Scenarios</h1>
        <p className={styles.subtitle}>
          Choose a scenario to practice. Each one puts your AI partner into a specific
          role and situation.
        </p>
      </div>

      {/* Category filters */}
      <div className={styles.filters}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.filterBtn} ${activeCategory === cat.key ? styles.filterActive : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Scenario grid */}
      <div className={styles.grid}>
        {filtered.map((scenario) => (
          <Link
            key={scenario.id}
            href={`/practice?scenario=${scenario.id}`}
            className={styles.scenarioCard}
          >
            <div className={styles.cardIcon}>{scenario.icon}</div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{scenario.name}</h3>
              <p className={styles.cardDesc}>{scenario.description}</p>
              <div className={styles.cardMeta}>
                <span className={`badge ${DIFFICULTY_COLORS[scenario.difficulty]}`}>
                  {scenario.difficulty}
                </span>
                <span className={styles.categoryTag}>{scenario.category}</span>
              </div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

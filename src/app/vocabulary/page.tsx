'use client';

import { useState, useCallback } from 'react';
import styles from './page.module.css';

interface VocabCard {
  id: string;
  word: string;
  definition: string;
  context: string;
  repetition: number;
  efactor: number;
  intervalDays: number;
}

// Demo cards for the UI (real data comes from DB)
const DEMO_CARDS: VocabCard[] = [
  { id: '1', word: 'eloquent', definition: 'Fluent or persuasive in speaking or writing', context: '"She gave an eloquent speech that moved the entire audience."', repetition: 1, efactor: 2.5, intervalDays: 1 },
  { id: '2', word: 'articulate', definition: 'Able to express ideas clearly and effectively', context: '"He was very articulate in explaining the complex process."', repetition: 0, efactor: 2.5, intervalDays: 1 },
  { id: '3', word: 'concise', definition: 'Giving a lot of information clearly in few words', context: '"Keep your elevator pitch concise — under 60 seconds."', repetition: 2, efactor: 2.6, intervalDays: 6 },
  { id: '4', word: 'nuance', definition: 'A subtle difference in meaning, expression, or sound', context: '"The nuance in her tone suggested she disagreed."', repetition: 0, efactor: 2.5, intervalDays: 1 },
  { id: '5', word: 'pragmatic', definition: 'Dealing with things practically rather than theoretically', context: '"Let\'s take a pragmatic approach to solving this problem."', repetition: 1, efactor: 2.3, intervalDays: 1 },
];

export default function VocabularyPage() {
  const [cards] = useState<VocabCard[]>(DEMO_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const currentCard = cards[currentIndex];
  const dueCards = cards.filter((c) => c.repetition < 3);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleGrade = useCallback((quality: number) => {
    // In real app, this would call SM-2 and update DB
    setIsFlipped(false);
    setReviewed((prev) => prev + 1);

    if (currentIndex < cards.length - 1) {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 200);
    } else {
      setReviewMode(false);
    }
  }, [currentIndex, cards.length]);

  const startReview = useCallback(() => {
    setReviewMode(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewed(0);
  }, []);

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1>Vocabulary Deck</h1>
        <p className={styles.subtitle}>
          Words from your practice sessions, reviewed with spaced repetition.
        </p>
      </div>

      {/* Stats row */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{cards.length}</span>
          <span className={styles.statLabel}>Total Cards</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{dueCards.length}</span>
          <span className={styles.statLabel}>Due Today</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{reviewed}</span>
          <span className={styles.statLabel}>Reviewed</span>
        </div>
      </div>

      {!reviewMode ? (
        <>
          {/* Start review button */}
          <div className={styles.startArea}>
            <button className="btn btn-primary btn-lg" onClick={startReview} id="start-review-btn">
              📚 Start Review ({dueCards.length} cards)
            </button>
          </div>

          {/* Card list */}
          <div className={styles.cardList}>
            <h2 className={styles.sectionTitle}>All Cards</h2>
            {cards.map((card) => (
              <div key={card.id} className={styles.listCard}>
                <div className={styles.listWord}>{card.word}</div>
                <div className={styles.listDef}>{card.definition}</div>
                <div className={styles.listMeta}>
                  <span className={`badge ${card.repetition >= 3 ? 'badge-green' : card.repetition >= 1 ? 'badge-blue' : 'badge-amber'}`}>
                    {card.repetition >= 3 ? 'Learned' : card.repetition >= 1 ? 'Learning' : 'New'}
                  </span>
                  <span className={styles.interval}>
                    Next: {card.intervalDays}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Review mode — flashcard UI */
        <div className={styles.reviewArea}>
          <div className={styles.progress}>
            {currentIndex + 1} / {cards.length}
          </div>

          {currentCard && (
            <>
              <div className="flashcard-container" onClick={handleFlip}>
                <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                  <div className="flashcard-face flashcard-front">
                    <span className={styles.flashcardWord}>{currentCard.word}</span>
                    <span className={styles.flashcardHint}>Tap to reveal</span>
                  </div>
                  <div className="flashcard-face flashcard-back">
                    <span className={styles.flashcardDef}>{currentCard.definition}</span>
                    <span className={styles.flashcardContext}>{currentCard.context}</span>
                  </div>
                </div>
              </div>

              {isFlipped && (
                <div className={styles.gradeButtons}>
                  <button className={`${styles.gradeBtn} ${styles.gradeAgain}`} onClick={() => handleGrade(1)}>
                    Again
                  </button>
                  <button className={`${styles.gradeBtn} ${styles.gradeHard}`} onClick={() => handleGrade(2)}>
                    Hard
                  </button>
                  <button className={`${styles.gradeBtn} ${styles.gradeGood}`} onClick={() => handleGrade(3)}>
                    Good
                  </button>
                  <button className={`${styles.gradeBtn} ${styles.gradeEasy}`} onClick={() => handleGrade(5)}>
                    Easy
                  </button>
                </div>
              )}
            </>
          )}

          <button className="btn btn-ghost" onClick={() => setReviewMode(false)} style={{ marginTop: '1rem' }}>
            ← Back to deck
          </button>
        </div>
      )}
    </div>
  );
}

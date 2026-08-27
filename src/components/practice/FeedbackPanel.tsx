'use client';

import styles from './FeedbackPanel.module.css';

interface FeedbackItem {
  type: 'grammar' | 'vocabulary' | 'tip';
  text: string;
}

interface FeedbackPanelProps {
  items: FeedbackItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackPanel({ items, isOpen, onClose }: FeedbackPanelProps) {
  if (!isOpen) return null;

  const icons = {
    grammar: '✏️',
    vocabulary: '📖',
    tip: '💡',
  };

  const labels = {
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    tip: 'Tip',
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Live Feedback</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {items.length === 0 ? (
            <p className={styles.emptyText}>
              Feedback will appear here as you speak.
            </p>
          ) : (
            <div className={styles.list}>
              {items.map((item, i) => (
                <div key={i} className={`${styles.item} ${styles[item.type]}`}>
                  <span className={styles.itemIcon}>{icons[item.type]}</span>
                  <div>
                    <span className={styles.itemLabel}>{labels[item.type]}</span>
                    <p className={styles.itemText}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

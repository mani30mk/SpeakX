'use client';

import styles from './Navbar.module.css';

export function Navbar() {
  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        {/* Mobile logo */}
        <div className={styles.mobileLogo}>
          <span>🎙️</span>
          <span className={styles.mobileLogoText}>SpeakX</span>
        </div>

        <div className={styles.right}>
          <div className={styles.statusDot} title="API Status">
            <span className={styles.dot}></span>
            <span className={styles.statusLabel}>Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}

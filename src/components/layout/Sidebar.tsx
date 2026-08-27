'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/practice', label: 'Practice', icon: '🎙️' },
  { href: '/scenarios', label: 'Scenarios', icon: '📋' },
  { href: '/vocabulary', label: 'Vocabulary', icon: '📚' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🎙️</span>
        <span className={styles.logoText}>SpeakX</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.streak}>
          <span className={styles.streakIcon}>🔥</span>
          <div>
            <div className={styles.streakCount}>0 day streak</div>
            <div className={styles.streakSub}>Practice today!</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

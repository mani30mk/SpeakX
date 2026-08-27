'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileNav.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/practice', label: 'Practice', icon: '🎙️' },
  { href: '/scenarios', label: 'Scenarios', icon: '📋' },
  { href: '/vocabulary', label: 'Vocab', icon: '📚' },
  { href: '/dashboard', label: 'Stats', icon: '📊' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.mobileNav}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

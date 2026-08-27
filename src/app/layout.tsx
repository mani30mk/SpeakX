import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SpeakX — Communication Skills Practice',
  description:
    'Practice speaking with an AI partner. Improve your communication skills through real-time voice conversations, vocabulary building, and personalized feedback.',
  keywords: ['communication', 'speaking practice', 'AI conversation', 'vocabulary', 'fluency'],
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SpeakX',
  },
  openGraph: {
    title: 'SpeakX — Communication Skills Practice',
    description: 'Practice speaking with an AI partner powered by Gemini.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Navbar />
            {children}
          </div>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}

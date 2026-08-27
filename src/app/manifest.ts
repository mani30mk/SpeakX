import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakX — Communication Practice',
    short_name: 'SpeakX',
    description: 'Practice speaking with an AI partner powered by Gemini Live voice streaming.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff5aa5',
};

export const metadata: Metadata = {
  title: 'Nikita — WokSpec AI',
  description: 'Private preview of Nikita. Join the waitlist.',
  metadataBase: new URL('https://nikita.wokspec.org'),
  openGraph: {
    type: 'website',
    siteName: 'Nikita',
    url: 'https://nikita.wokspec.org',
    title: 'Nikita — WokSpec AI',
    description: 'Private preview of Nikita.',
    images: [{ url: '/og.png' }],
  },
  twitter: { card: 'summary_large_image', site: '@wokspec' },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: '#2b0b18' }}>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}

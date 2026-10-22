import { Geist_Mono, Inter } from 'next/font/google';

export const fontSans = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
});

export const fontMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

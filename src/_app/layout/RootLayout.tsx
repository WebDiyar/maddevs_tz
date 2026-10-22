import type { ReactNode } from 'react';
import '@/_app/styles/globals.css';
import { AppProviders } from './AppProviders';
import { fontMono, fontSans } from './fonts';
import { localeScript } from './localeScript';
import { SiteHeader } from './SiteHeader';

type Props = {
  children: ReactNode;
};

export const RootLayout = ({ children }: Props) => (
  <html
    lang="ru"
    suppressHydrationWarning
    className={`${fontSans.variable} ${fontMono.variable} h-full`}
  >
    <head>
      <script dangerouslySetInnerHTML={{ __html: localeScript }} />
    </head>
    <body className="min-h-full">
      <AppProviders>
        <SiteHeader />
        {children}
      </AppProviders>
    </body>
  </html>
);

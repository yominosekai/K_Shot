import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import SetupGuard from '@/components/SetupGuard';
import ConditionalLayout from '@/components/ConditionalLayout';

export const metadata: Metadata = {
  title: 'K Shot',
  description: '知識や情報を管理・共有するためのナレッジ管理ツール',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <SetupGuard>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </SetupGuard>
        </Providers>
      </body>
    </html>
  );
}


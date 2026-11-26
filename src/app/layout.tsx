import type { Metadata } from 'next';
import { AppShell } from '@/components/workspace/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Memory Hub',
  description: 'AI Memory Management workspace powered by Next.js, SpaceTimeDB, and OpenRouter',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell />
        {children}
      </body>
    </html>
  );
}

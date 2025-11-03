import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/contexts/auth-context';

export const metadata: Metadata = {
  title: 'Bubbles - Non-Linear AI Chat',
  description: 'Graph-based AI conversation interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

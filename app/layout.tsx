import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POCR-Bot | AI-Powered Course Review Assistant (CCC CVC)',
  description: 'Automated Canvas LMS course review assistant for California Community Colleges aligned with the June 2026 CCC POCR Rubric.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

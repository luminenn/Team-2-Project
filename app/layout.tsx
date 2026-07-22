import './globals.css';
import type { Metadata } from 'next';
import { PocrProvider } from '@/lib/context/PocrContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'POCR-Bot | AI-Powered Course Review Assistant (CCC CVC)',
  description: 'Automated Canvas LMS course review assistant for California Community Colleges aligned with the 2027 CCC CVC POCR Rubric.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#E5E5E7] text-slate-900 min-h-screen font-sans antialiased">
        <PocrProvider>
          <AppShell>{children}</AppShell>
        </PocrProvider>
      </body>
    </html>
  );
}

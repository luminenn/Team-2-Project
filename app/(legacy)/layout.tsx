import { PocrProvider } from '@/lib/context/PocrContext';
import { AppShell } from '@/components/AppShell';

export default function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PocrProvider>
      <AppShell>{children}</AppShell>
    </PocrProvider>
  );
}

import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#07070f' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <LeadPanel />
      <Toaster />
    </div>
  );
}

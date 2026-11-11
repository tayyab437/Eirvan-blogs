import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white border border-slate-700/80 px-4 py-2 text-xs font-medium shadow-xl animate-in fade-in slide-in-from-bottom-2"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode — Reading cached EIRVAN stories</span>
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    </div>
  );
};

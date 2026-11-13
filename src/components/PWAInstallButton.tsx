import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'footer' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS (e.g. standard browser that doesn't trigger prompt yet),
  // we still display a helpful button in footer or sidebar that explains how to install or pins the app.
  if (!isInstallable && !isIOS && variant === 'navbar') {
    return null;
  }

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          title="Install EIRVAN as a desktop or mobile application"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shrink-0 ${className}`}
        >
          {justInstalled ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Installed!</span>
            </>
          ) : isIOS ? (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install Web App</span>
              <span className="sm:hidden">Install</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install Web App</span>
              <span className="sm:hidden">Install</span>
            </>
          )}
        </button>
      )}

      {variant === 'footer' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Web App (PWA)</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Install App on Device</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
            PWA
          </span>
        </button>
      )}

      {/* Guided Modal for iOS Safari */}
      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src="/images/brand/eirvan-icon-192.webp"
                  alt="EIRVAN Icon"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-md"
                />
                <h3 className="font-serif font-bold text-base">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Tap the Share Button</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    Tap <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> in your Safari bottom toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Add to Home Screen</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    Scroll down and select <PlusSquare className="w-3.5 h-3.5 inline text-blue-600" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                EIRVAN will install as a standalone app with offline caching and instant launch speeds.
              </p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

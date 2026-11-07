import React, { useEffect, useRef } from 'react';
import { ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { AdSlotConfig } from '../types/blog';
import { StorageService } from '../services/storage';

interface AdBannerProps {
  slot: AdSlotConfig;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (slot.isEnabled && !hasTrackedImpression.current) {
      hasTrackedImpression.current = true;
      StorageService.recordAdImpression(slot.id);
    }
  }, [slot.id, slot.isEnabled]);

  if (!slot.isEnabled) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    StorageService.recordAdClick(slot.id);
    if (slot.ctaUrl.startsWith('http')) {
      window.open(slot.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // FORMAT 1: RESPONSIVE TOP LEADERBOARD
  if (slot.type === 'leaderboard') {
    return (
      <aside
        aria-label="Advertisement"
        className={`w-full max-w-5xl mx-auto my-6 px-4 ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 font-mono px-1">
          <span>Sponsored Recommendation</span>
          <span>Google AdSense Slot · 728×90</span>
        </div>

        <div
          onClick={handleClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-400 min-h-[90px] flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                {slot.sponsorName}
              </span>
              <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                Verified
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {slot.headline}
            </h4>
            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
              {slot.tagline}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
            <span>{slot.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </aside>
    );
  }

  // FORMAT 2: IN-ARTICLE NATIVE CARD (Vibrant, high CTR)
  if (slot.type === 'native-card') {
    return (
      <aside
        aria-label="Sponsored content"
        className={`my-10 p-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 shadow-sm transition-all hover:shadow-md ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-mono">
          <span className="flex items-center gap-1 text-indigo-600 font-sans font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {slot.badgeLabel || 'Featured Partner'}
          </span>
          <span className="text-slate-400">{slot.sponsorName}</span>
        </div>

        <div
          onClick={handleClick}
          className="group cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-1"
        >
          <div className="flex-1">
            <h4 className="text-base sm:text-lg font-serif font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              {slot.headline}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              {slot.tagline}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full group-hover:scale-105 transition-all shadow-md shadow-indigo-500/25">
            <span>{slot.ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </aside>
    );
  }

  // FORMAT 3: RECTANGLE SIDEBAR CARD
  return (
    <aside
      aria-label="Advertisement"
      className={`w-full max-w-[340px] mx-auto my-6 ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 font-mono px-1">
        <span>Sponsored</span>
        <span>300 × 250</span>
      </div>
      <div
        onClick={handleClick}
        className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between h-[270px] shadow-sm hover:shadow-lg hover:border-blue-300 transition-all"
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
            {slot.sponsorName}
          </span>
          <h4 className="text-base font-serif font-bold text-slate-900 mt-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {slot.headline}
          </h4>
          <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
            {slot.tagline}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
          <span>{slot.ctaText}</span>
          <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useEffect, useRef } from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { PublicAdSlot } from '../types/blog';
import { StorageService } from '../services/storage';

interface AdBannerProps {
  slot: PublicAdSlot;
  className?: string;
  onRefreshData?: () => void;
}

/**
 * Editorial Sponsorship & Display Ad Container.
 * Preserves fixed aspect/min-height geometry for Zero CLS and clean sponsor disclosures.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (!slot.isEnabled || hasTrackedImpression.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !hasTrackedImpression.current) {
          hasTrackedImpression.current = true;
          StorageService.recordAdImpression(slot.id);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const el = document.getElementById(`ad-slot-${slot.id}`);
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [slot.id, slot.isEnabled]);

  if (!slot.isEnabled) {
    return null;
  }

  const handleTrackClick = () => {
    StorageService.recordAdClick(slot.id);
  };

  const isExternal = slot.ctaUrl.startsWith('http');

  // FORMAT 1: TOP LEADERBOARD
  if (slot.type === 'leaderboard') {
    return (
      <aside
        id={`ad-slot-${slot.id}`}
        aria-label="Sponsored recommendation"
        className={`ad-slot-container w-full max-w-6xl mx-auto my-4 px-4 sm:px-6 lg:px-8 ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-500 mb-1.5 font-mono px-1">
          <span>{slot.badgeLabel || 'Sponsored'}</span>
          <span>{slot.sponsorName}</span>
        </div>

        <a
          href={slot.ctaUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer sponsored' : undefined}
          onClick={handleTrackClick}
          className="group rounded-xl border border-stone-200 bg-white p-4 sm:px-6 min-h-[90px] flex flex-col md:flex-row items-center justify-between gap-4 hover:border-blue-900 transition-colors"
        >
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-sm sm:text-base font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors">
              {slot.headline}
            </h3>
            <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">
              {slot.tagline}
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 group-hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap">
            <span>{slot.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </a>
      </aside>
    );
  }

  // FORMAT 2: IN-ARTICLE NATIVE CARD
  if (slot.type === 'native-card') {
    return (
      <aside
        id={`ad-slot-${slot.id}`}
        aria-label="Sponsored briefing"
        className={`ad-slot-container my-10 p-6 rounded-xl border border-stone-200 bg-[#FAF9F6] ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] text-stone-500 uppercase tracking-wider mb-2 font-mono">
          <span>{slot.badgeLabel || 'Sponsored Partner'}</span>
          <span>{slot.sponsorName}</span>
        </div>

        <a
          href={slot.ctaUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer sponsored' : undefined}
          onClick={handleTrackClick}
          className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-1"
        >
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors">
              {slot.headline}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
              {slot.tagline}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 group-hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap">
            <span>{slot.ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </a>
      </aside>
    );
  }

  // FORMAT 3: RECTANGLE SIDEBAR CARD
  return (
    <aside
      id={`ad-slot-${slot.id}`}
      aria-label="Sponsored placement"
      className={`ad-slot-container w-full max-w-[340px] mx-auto my-6 ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-500 mb-1.5 font-mono px-1">
        <span>{slot.badgeLabel || 'Sponsored'}</span>
        <span>{slot.dimensions || '300 × 250'}</span>
      </div>
      <a
        href={slot.ctaUrl}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer sponsored' : undefined}
        onClick={handleTrackClick}
        className="group rounded-2xl border border-stone-200 bg-white p-6 flex flex-col justify-between h-[260px] hover:border-blue-900 transition-colors"
      >
        <div>
          <span className="text-xs font-mono text-stone-500 block">
            {slot.sponsorName}
          </span>
          <h3 className="text-base font-serif font-bold text-stone-900 mt-2 line-clamp-2 group-hover:text-blue-900 transition-colors">
            {slot.headline}
          </h3>
          <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">
            {slot.tagline}
          </p>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-blue-900">
          <span>{slot.ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </a>
    </aside>
  );
};

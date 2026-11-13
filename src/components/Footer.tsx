import React, { useState } from 'react';
import { Mail, Check, ArrowRight, Rss } from 'lucide-react';
import { Link } from '../utils/router';
import { CATEGORY_HUBS } from '../data/categories';
import { StorageService } from '../services/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { LanguageSelector } from './LanguageSelector';

interface FooterProps {
  onSelectCategory: (category: string) => void;
  onOpenAdmin: () => void;
  onOpenAbout?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenAdmin,
  onOpenAbout,
  onOpenTerms,
  onOpenPrivacy
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      StorageService.addSubscriber(email);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="mt-20 border-t border-stone-200 bg-white text-stone-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-stone-100">
          {/* Brand & Mission */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/images/brand/eirvan-logo-360.webp"
                alt="EIRVAN – Explore · Learn · Stay Informed"
                width={180}
                height={90}
                loading="lazy"
                decoding="async"
                className="h-11 w-auto object-contain"
              />
            </Link>

            <p className="text-sm text-stone-600 leading-relaxed max-w-sm">
              Independent editorial publication examining Technology, Business, Lifestyle, Education, and News with cited primary sources and transparent standards.
            </p>

            <div className="text-xs font-mono text-stone-500">
              Explore · Learn · Stay Informed
            </div>
          </div>

          {/* 5 Core Sections */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-900 block">
              Editorial Sections
            </span>
            <ul className="space-y-2.5 text-xs font-medium">
              {CATEGORY_HUBS.map(hub => (
                <li key={hub.slug}>
                  <Link
                    href={`/category/${hub.slug}`}
                    onClick={() => onSelectCategory(hub.name)}
                    className="text-stone-600 hover:text-blue-900 transition-colors"
                  >
                    {hub.name} — {hub.shortLabel === 'News' ? 'Policy & Infrastructure' : hub.clusters[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Institutional & Trust */}
          <div className="md:col-span-2 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-900 block">
              Standards &amp; Governance
            </span>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/about" onClick={onOpenAbout} className="text-stone-600 hover:text-blue-900 transition-colors">
                  About &amp; Masthead
                </Link>
              </li>
              <li>
                <Link href="/editorial-policy" className="text-stone-600 hover:text-blue-900 transition-colors">
                  Editorial Policy
                </Link>
              </li>
              <li>
                <Link href="/corrections-policy" className="text-stone-600 hover:text-blue-900 transition-colors">
                  Corrections Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-stone-600 hover:text-blue-900 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-600 hover:text-amber-800 transition-colors inline-flex items-center gap-1.5"
                >
                  <Rss className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  <span>RSS 2.0 Feed</span>
                </a>
              </li>
              <li>
                <PWAInstallButton variant="footer" />
              </li>
            </ul>
          </div>

          {/* Weekly Dispatch Preferences */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-900 block">
              Editorial Dispatch Updates
            </span>
            <p className="text-xs text-stone-600 leading-relaxed">
              Save your email locally or subscribe via RSS to follow new dispatches across all five desks.
            </p>

            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <input
                  id="footer-email-input"
                  name="email"
                  type="email"
                  aria-label="Email address for weekly dispatch updates"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="reader@domain.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-900 text-stone-900 min-h-[40px]"
                />
              </div>
              <button
                type="submit"
                aria-label="Join dispatch list"
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-blue-900 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer min-h-[40px]"
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
            {subscribed && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Email recorded in local reader preferences. You can also follow updates anytime via /rss.xml.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Utility Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            &copy; {new Date().getFullYear()} EIRVAN (eirvan.com). All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/about" onClick={onOpenAbout} className="hover:text-blue-900 transition-colors">
              About
            </Link>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Link href="/editorial-policy" className="hover:text-blue-900 transition-colors">
              Editorial Policy
            </Link>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Link href="/terms" onClick={onOpenTerms} className="hover:text-blue-900 transition-colors">
              Terms
            </Link>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Link href="/privacy" onClick={onOpenPrivacy} className="hover:text-blue-900 transition-colors">
              Privacy
            </Link>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Link href="/bookmarks" className="hover:text-blue-900 transition-colors">
              Saved List
            </Link>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <LanguageSelector variant="footer" />
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Link href="/admin" onClick={onOpenAdmin} className="font-semibold text-blue-900 hover:underline">
              Publisher Studio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { Mail, Check, ArrowRight, ShieldCheck, Sparkles, ShoppingBag, Rss } from 'lucide-react';
import { Link } from '../utils/router';
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
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-100">
          
          {/* Brand & Editorial Mission */}
          <div className="md:col-span-4 space-y-4">
            <div className="space-y-2">
              <Link href="/" className="inline-block">
                <img
                  src="/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png"
                  alt="EIRVAN – Explore · Learn · Stay Informed"
                  width={240}
                  height={120}
                  loading="lazy"
                  decoding="async"
                  className="h-11 sm:h-13 w-auto max-w-[240px] object-contain bg-transparent"
                />
              </Link>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
              EIRVAN is a premier digital publication exploring trending breakthroughs in deep computing, algorithmic finance, human performance, and cellular science with journalistic rigor.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Google Helpful Content &amp; Core Web Vitals Standard</span>
            </div>
          </div>

          {/* Curated Channels with Proper URLs */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block font-mono">
              Editorial Channels
            </span>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>
                <Link
                  href="/category/technology-ai"
                  onClick={() => onSelectCategory('Technology & AI')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Technology &amp; Artificial Intelligence
                </Link>
              </li>
              <li>
                <Link
                  href="/category/global-markets-finance"
                  onClick={() => onSelectCategory('Global Markets & Finance')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Global Markets &amp; Quantitative Finance
                </Link>
              </li>
              <li>
                <Link
                  href="/category/productivity-mindset"
                  onClick={() => onSelectCategory('Productivity & Mindset')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Productivity, Deep Work &amp; Neuroscience
                </Link>
              </li>
              <li>
                <Link
                  href="/category/biotech-longevity"
                  onClick={() => onSelectCategory('Biotech & Longevity')}
                  className="hover:text-blue-600 transition-colors"
                >
                  Biotech, Cellular Biology &amp; Medicine
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policy Column with Canonical URLs */}
          <div className="md:col-span-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block font-mono">
              Legal &amp; Policy
            </span>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li>
                <Link
                  href="/about"
                  onClick={onOpenAbout}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <span>About EIRVAN</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  onClick={onOpenTerms}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  onClick={onOpenPrivacy}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/bookmarks"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <span>Saved Reading List</span>
                </Link>
              </li>
              <li>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-600 transition-colors flex items-center gap-1.5"
                >
                  <Rss className="w-3.5 h-3.5 text-amber-500" />
                  <span>RSS 2.0 Feed (XML)</span>
                </a>
              </li>
              <li>
                <PWAInstallButton variant="footer" />
              </li>
            </ul>
          </div>

          {/* Newsletter Dispatch */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block font-mono">
              The Weekly Executive Dispatch
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Curated technical analyses, algorithmic insights, and actionable guides delivered directly to your inbox weekly.
            </p>

            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="footer-email-input"
                  name="email"
                  type="email"
                  aria-label="Email address for weekly executive dispatch newsletter"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
              <button
                type="submit"
                aria-label="Subscribe to executive dispatch newsletter"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Utility & Legal Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} EIRVAN (EIRVAN.COM). All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/about"
              onClick={onOpenAbout}
              className="hover:text-blue-600 transition-colors"
            >
              About Us
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/terms"
              onClick={onOpenTerms}
              className="hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/privacy"
              onClick={onOpenPrivacy}
              className="hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300">·</span>
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-600 transition-colors flex items-center gap-1 font-mono text-[11px]"
            >
              <Rss className="w-3 h-3 text-amber-500" />
              <span>RSS Feed</span>
            </a>
            <span className="text-slate-300">·</span>
            <LanguageSelector variant="footer" />
            <span className="text-slate-300">·</span>
            <Link
              href="/admin"
              onClick={onOpenAdmin}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Publisher Studio CMS
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { Mail, Check, ArrowRight, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (category: string) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onOpenAdmin }) => {
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
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-2">
              <img
                src="/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png"
                alt="EIRVAN – Explore · Learn · Stay Informed"
                className="h-11 sm:h-13 w-auto max-w-[240px] object-contain bg-transparent"
              />
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
              EIRVAN is a premier digital publication exploring trending breakthroughs in deep computing, algorithmic finance, human performance, and cellular science with journalistic rigor.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Google Helpful Content &amp; Core Web Vitals Standard</span>
            </div>
          </div>

          {/* Curated Channels */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block font-mono">
              Editorial Channels
            </span>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>
                <button
                  onClick={() => onSelectCategory('Technology & AI')}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Technology &amp; Artificial Intelligence
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Global Markets & Finance')}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Global Markets &amp; Quantitative Finance
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Productivity & Mindset')}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Productivity, Deep Work &amp; Neuroscience
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Biotech & Longevity')}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Biotech, Cellular Biology &amp; Medicine
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Dispatch */}
          <div className="md:col-span-4 space-y-3">
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
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
              <button
                type="submit"
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

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdmin}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Publisher Studio CMS
            </button>
            <span className="text-slate-300">·</span>
            <span>Zero-CLS Engine</span>
            <span className="text-slate-300">·</span>
            <span>Schema.org JSON-LD</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

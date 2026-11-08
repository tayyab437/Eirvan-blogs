import React from 'react';
import { Search, Bookmark, ShieldCheck, Sparkles, TrendingUp, Compass } from 'lucide-react';

interface NavbarProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenAdmin: () => void;
  onOpenSearch: () => void;
  isAdminView: boolean;
  onGoHome: () => void;
  bookmarkCount: number;
  onToggleBookmarksView: () => void;
  isBookmarksView: boolean;
  onOpenAbout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  onOpenAdmin,
  onOpenSearch,
  isAdminView,
  onGoHome,
  bookmarkCount,
  onToggleBookmarksView,
  isBookmarksView,
  onOpenAbout
}) => {
  const categories = [
    { label: 'All Briefings', value: 'all' },
    { label: 'Tech & AI', value: 'Technology & AI' },
    { label: 'Global Markets', value: 'Global Markets & Finance' },
    { label: 'Deep Work', value: 'Productivity & Mindset' },
    { label: 'Longevity', value: 'Biotech & Longevity' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-colors shadow-xs">
      
      {/* Top Catchy Breaking Marquee Ribbon */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white text-[11px] py-1.5 px-4 font-medium flex items-center justify-between overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-cyan-200" />
              Trending Now
            </span>
            <div className="truncate text-blue-50 font-sans">
              <span>Neuromorphic Silicon yields jump 140% · Wall Street dark pools adopt FPGA nanosecond routing · Human NAD+ longevity trials show 19.4% vascular rejuvenation</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] font-mono text-cyan-100">
            <span>Core Web Vitals: 100/100</span>
            <span>·</span>
            <span>Zero-CLS Engine</span>
          </div>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-18">
          
          {/* Brand Logo (Strictly Transparent) */}
          <button
            onClick={onGoHome}
            className="flex items-center cursor-pointer text-left group transition-transform hover:opacity-95"
            aria-label="EIRVAN Home"
          >
            <img
              src="/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png"
              alt="EIRVAN – Explore · Learn · Stay Informed"
              width={250}
              height={125}
              fetchPriority="high"
              decoding="sync"
              loading="eager"
              className="h-10 sm:h-12 w-auto max-w-[210px] sm:max-w-[250px] object-contain bg-transparent transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </button>

          {/* Nav Categories */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 text-xs font-semibold">
            {categories.map(cat => {
              const isActive = currentCategory === cat.value && !isAdminView && !isBookmarksView;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    onGoHome();
                    onSelectCategory(cat.value);
                  }}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="px-4 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
              >
                About
              </button>
            )}
          </nav>

          {/* Action Zone: Search, Bookmarks, About (Mobile/Tablet), and Studio CMS */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Search */}
            <button
              onClick={onOpenSearch}
              aria-label="Search articles and queries"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 rounded-full border border-slate-200 text-xs font-medium transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span className="hidden sm:inline">Search queries...</span>
              <span className="sr-only">Open Search</span>
            </button>

            {/* About Menu button for smaller screens */}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                aria-label="About EIRVAN"
                className="lg:hidden px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 rounded-full border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                About
              </button>
            )}

            {/* Bookmarks Toggle */}
            <button
              onClick={onToggleBookmarksView}
              aria-label="Saved Reading List"
              className={`p-2 rounded-full border transition-all cursor-pointer relative ${
                isBookmarksView
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600'
              }`}
              title="Saved Reading List"
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">View Saved Reading List</span>
              {bookmarkCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Publisher CMS Switch */}
            <button
              onClick={onOpenAdmin}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap shadow-sm cursor-pointer ${
                isAdminView
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isAdminView ? 'Reader View' : 'Publisher Studio'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

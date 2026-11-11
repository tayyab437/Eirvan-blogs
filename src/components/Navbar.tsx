import React, { useState, useEffect } from 'react';
import {
  Search,
  Bookmark,
  ShieldCheck,
  Rss,
  Menu,
  X,
  Bell,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Link, categoryToSlug } from '../utils/router';
import { PWAInstallButton } from './PWAInstallButton';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenAdmin: () => void;
  onOpenSearch: () => void;
  onOpenSubscribe: () => void;
  isAdminView: boolean;
  onGoHome: () => void;
  bookmarkCount: number;
  onToggleBookmarksView: () => void;
  isBookmarksView: boolean;
  isProductsView?: boolean;
  isAboutView?: boolean;
  onOpenAbout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  onOpenAdmin,
  onOpenSearch,
  onOpenSubscribe,
  isAdminView,
  onGoHome,
  bookmarkCount,
  onToggleBookmarksView,
  isBookmarksView,
  isProductsView,
  isAboutView,
  onOpenAbout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll to apply subtle shadow to sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center Navigation Items
  const navItems = [
    { label: 'Home', value: 'all', url: '/' },
    { label: 'Technology', value: 'Technology & AI', url: '/category/technology' },
    { label: 'Business', value: 'Global Markets & Finance', url: '/category/business' },
    { label: 'Lifestyle', value: 'Biotech & Longevity', url: '/category/lifestyle' },
    { label: 'Education', value: 'Productivity & Mindset', url: '/category/education' },
    { label: 'News', value: 'Technology & AI', url: '/category/news' },
    { label: 'About Us', value: 'about', url: '/about' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    setIsMobileMenuOpen(false);
    if (item.value === 'about') {
      if (onOpenAbout) onOpenAbout();
    } else {
      onGoHome();
      onSelectCategory(item.value);
    }
  };

  return (
    <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200 ${isScrolled ? 'shadow-md shadow-slate-900/5' : 'shadow-xs'}`}>
      
      {/* Top Editorial Ribbon */}
      <div className="bg-slate-900 text-white text-[11px] py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-cyan-200" />
              Dispatch
            </span>
            <div className="truncate text-slate-300 font-sans">
              <span>EIRVAN Blogs: Deep-dive investigations in AI, markets, neuro-productivity, and biotechnology</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono text-slate-400">
            <span>Verified Editorial Masthead</span>
            <span>·</span>
            <span>Google News Indexing Standard</span>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-20">
          
          {/* Left Side: Brand Logo & Wordmark */}
          <Link
            href="/"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onGoHome();
            }}
            className="flex items-center gap-3 shrink-0 group py-1 cursor-pointer"
            aria-label="Eirvan Blogs Homepage"
          >
            <img
              src="/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png"
              alt="EIRVAN Logo"
              width={180}
              height={90}
              fetchPriority="high"
              decoding="sync"
              loading="eager"
              className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            />
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <span className="font-serif font-black text-slate-900 text-lg sm:text-xl tracking-tight uppercase leading-none group-hover:text-blue-600 transition-colors">
                EIRVAN<span className="text-blue-600 ml-1 font-sans text-sm font-bold tracking-widest uppercase">BLOGS</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                Explore · Learn · Stay Informed
              </span>
            </div>
          </Link>

          {/* Center Navigation Menu (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold uppercase tracking-wider font-sans">
            {navItems.map(item => {
              const isAbout = item.value === 'about';
              const isActive = isAbout
                ? isAboutView
                : !isAdminView &&
                  !isBookmarksView &&
                  !isProductsView &&
                  !isAboutView &&
                  currentCategory === item.value;

              return (
                <Link
                  key={item.label}
                  href={item.url}
                  onClick={() => handleNavClick(item)}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all relative font-bold ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/70 font-bold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side: Search, Subscribe & Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Search Trigger Button */}
            <button
              onClick={onOpenSearch}
              aria-label="Search articles"
              title="Search blog articles"
              className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline font-medium text-slate-700">Search</span>
            </button>

            {/* Prominent Subscribe Button */}
            <button
              onClick={onOpenSubscribe}
              aria-label="Subscribe to EIRVAN newsletter"
              className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              <span>Subscribe</span>
            </button>

            {/* RSS Feed Icon */}
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="EIRVAN RSS Feed"
              title="RSS Feed (/rss.xml)"
              className="hidden sm:flex p-2 rounded-full border border-slate-200 bg-white text-amber-600 hover:bg-amber-50/80 hover:border-amber-300 transition-colors cursor-pointer"
            >
              <Rss className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">RSS Feed</span>
            </a>

            {/* Multi-Language Selector */}
            <div className="hidden sm:block">
              <LanguageSelector variant="navbar" />
            </div>

            {/* Bookmarks Toggle */}
            <Link
              href="/bookmarks"
              onClick={onToggleBookmarksView}
              aria-label="Saved Reading List"
              className={`p-2 rounded-full border transition-all relative ${
                isBookmarksView
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-600'
              }`}
              title="Saved Reading List (/bookmarks)"
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">View Saved Reading List</span>
              {bookmarkCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {bookmarkCount}
                </span>
              )}
            </Link>

            {/* Publisher CMS Button */}
            <Link
              href={isAdminView ? '/' : '/admin'}
              onClick={onOpenAdmin}
              className={`hidden md:flex px-3.5 py-2 text-xs font-bold rounded-full transition-all items-center gap-1.5 whitespace-nowrap ${
                isAdminView
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200/80 hover:text-blue-600'
              }`}
              title="Publisher CMS Studio"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>{isAdminView ? 'Reader View' : 'Studio'}</span>
            </Link>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-900" />
              ) : (
                <Menu className="w-6 h-6 text-slate-900" />
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
            
            {/* Quick Actions Bar inside Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="py-2.5 px-3 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Search className="w-4 h-4 text-blue-600" />
                <span>Search Articles</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSubscribe();
                }}
                className="py-2.5 px-3 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <Bell className="w-4 h-4 text-cyan-300" />
                <span>Subscribe</span>
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold px-3 block mb-1">
                Editorial Categories
              </span>
              {navItems.map(item => {
                const isAbout = item.value === 'about';
                const isActive = isAbout
                  ? isAboutView
                  : !isAdminView &&
                    !isBookmarksView &&
                    !isProductsView &&
                    !isAboutView &&
                    currentCategory === item.value;

                return (
                  <Link
                    key={item.label}
                    href={item.url}
                    onClick={() => handleNavClick(item)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  </Link>
                );
              })}
            </div>

            {/* Mobile Utilities Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <LanguageSelector variant="footer" />
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 flex items-center gap-1.5 font-medium"
                >
                  <Rss className="w-3.5 h-3.5 text-amber-600" />
                  <span>RSS</span>
                </a>
              </div>

              <Link
                href={isAdminView ? '/' : '/admin'}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-200 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{isAdminView ? 'Reader View' : 'Publisher Studio'}</span>
              </Link>
            </div>

          </div>
        </div>
      )}

    </header>
  );
};

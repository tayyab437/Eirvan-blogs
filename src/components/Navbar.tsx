import React, { useState, useEffect } from 'react';
import {
  Search,
  Bookmark,
  ShieldCheck,
  Rss,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Link } from '../utils/router';
import { CATEGORY_HUBS, getCategoryHubByName } from '../data/categories';
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    ...CATEGORY_HUBS.map(hub => ({
      label: hub.shortLabel,
      value: hub.name,
      url: `/category/${hub.slug}`
    })),
    { label: 'About', value: 'about', url: '/about' }
  ];

  const activeCategoryName = currentCategory === 'all' ? 'all' : getCategoryHubByName(currentCategory).name;

  const handleNavClick = (item: typeof navItems[0]) => {
    setIsMobileMenuOpen(false);
    if (item.value === 'about') {
      onOpenAbout?.();
    } else {
      onSelectCategory(item.value);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-shadow duration-200 ${
        isScrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16 sm:h-18">
          {/* Zone 1: Brand Wordmark */}
          <Link
            href="/"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onGoHome();
            }}
            className="flex items-center gap-2.5 shrink-0 whitespace-nowrap"
            aria-label="EIRVAN Homepage"
          >
            <img
              src="/images/brand/eirvan-icon-192.webp"
              alt=""
              width={32}
              height={32}
              fetchPriority="high"
              decoding="sync"
              loading="eager"
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
            <span className="font-serif font-bold text-stone-900 text-xl tracking-tight whitespace-nowrap">
              EIRVAN
            </span>
          </Link>

          {/* Zone 2: Single-line Category Navigation */}
          <nav aria-label="Primary Editorial Navigation" className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navItems.map(item => {
              const isAbout = item.value === 'about';
              const isActive = isAbout
                ? Boolean(isAboutView)
                : !isAdminView &&
                  !isBookmarksView &&
                  !isProductsView &&
                  !isAboutView &&
                  activeCategoryName === item.value;

              return (
                <Link
                  key={item.label}
                  href={item.url}
                  onClick={() => handleNavClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-2 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isActive
                      ? 'text-blue-900 font-semibold border-blue-900'
                      : 'text-stone-600 hover:text-stone-900 border-transparent hover:border-stone-300'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Reader Actions & Primary Subscribe CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search articles"
              className="p-2.5 sm:px-3 sm:py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[40px]"
            >
              <Search className="w-4 h-4 text-stone-700 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <Link
              href="/bookmarks"
              onClick={onToggleBookmarksView}
              aria-label={`Saved reading list (${bookmarkCount})`}
              className={`p-2.5 rounded-lg border transition-colors relative flex items-center justify-center min-h-[40px] min-w-[40px] ${
                isBookmarksView
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              {bookmarkCount > 0 && (
                <span className="ml-1 text-[11px] font-mono tabular-nums font-semibold">
                  {bookmarkCount}
                </span>
              )}
            </Link>

            <Link
              href={isAdminView ? '/' : '/admin'}
              onClick={onOpenAdmin}
              className={`hidden md:inline-flex px-3 py-2 text-xs font-medium rounded-lg border transition-colors items-center gap-1.5 whitespace-nowrap min-h-[40px] ${
                isAdminView
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-900" aria-hidden="true" />
              <span>{isAdminView ? 'Reader' : 'Studio'}</span>
            </Link>

            <button
              type="button"
              onClick={onOpenSubscribe}
              className="hidden sm:inline-flex px-4 py-2 bg-stone-900 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[40px] items-center"
            >
              Subscribe
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2.5 rounded-lg text-stone-700 hover:bg-stone-100 border border-stone-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="min-h-[44px] px-3 bg-stone-100 text-stone-900 font-medium text-xs rounded-lg border border-stone-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSubscribe();
                }}
                className="min-h-[44px] px-3 bg-stone-900 text-white font-semibold text-xs rounded-lg flex items-center justify-center cursor-pointer"
              >
                Subscribe
              </button>
            </div>

            <nav aria-label="Mobile Editorial Sections" className="space-y-1">
              {navItems.map(item => {
                const isAbout = item.value === 'about';
                const isActive = isAbout
                  ? Boolean(isAboutView)
                  : !isAdminView && !isBookmarksView && activeCategoryName === item.value;

                return (
                  <Link
                    key={item.label}
                    href={item.url}
                    onClick={() => handleNavClick(item)}
                    className={`flex items-center justify-between px-3.5 min-h-[44px] rounded-lg text-sm font-medium ${
                      isActive ? 'bg-stone-100 text-blue-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <LanguageSelector variant="footer" />
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg border border-stone-200 text-stone-700 flex items-center gap-1.5 font-medium min-h-[40px]"
                >
                  <Rss className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  <span>RSS Feed</span>
                </a>
              </div>

              <Link
                href={isAdminView ? '/' : '/admin'}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="px-3.5 py-2 bg-stone-100 text-stone-900 font-medium rounded-lg border border-stone-200 flex items-center gap-1.5 min-h-[40px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-900" aria-hidden="true" />
                <span>{isAdminView ? 'Reader View' : 'Publisher Studio'}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

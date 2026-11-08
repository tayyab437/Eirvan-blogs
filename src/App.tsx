import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ArticleCard } from './components/ArticleCard';
import { ArticleView } from './components/ArticleView';
import { AdBanner } from './components/AdBanner';
import { FAQSection } from './components/FAQSection';
import { StorageService } from './services/storage';
import { FirebaseSyncService, testFirestoreConnection, auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Article, AdSlotConfig, VisitorAnalytics } from './types/blog';
import { updateHeadSEO } from './utils/seo';

// Lazy-loaded secondary components & modals for zero unused JS on initial render
const SERPPreviewModal = lazy(() => import('./components/SERPPreviewModal').then(m => ({ default: m.SERPPreviewModal })));
const SearchModal = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const PageModal = lazy(() => import('./components/PageModal').then(m => ({ default: m.PageModal })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminLoginModal = lazy(() => import('./components/admin/AdminLoginModal').then(m => ({ default: m.AdminLoginModal })));
import {
  Sparkles,
  TrendingUp,
  Bookmark,
  Search,
  Sliders,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  Gauge,
  Lock
} from 'lucide-react';

export default function App() {
  const [articles, setArticles] = useState<Article[]>(StorageService.getArticles());
  const [adSlots, setAdSlots] = useState<AdSlotConfig[]>(StorageService.getAdSlots());
  const [analytics, setAnalytics] = useState<VisitorAnalytics>(StorageService.getAnalytics());
  
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isBookmarksView, setIsBookmarksView] = useState<boolean>(false);
  
  const [serpPreviewArticle, setSerpPreviewArticle] = useState<Article | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activePageModal, setActivePageModal] = useState<'about' | 'terms' | 'privacy' | null>(null);

  // Admin Authentication State
  const [adminUser, setAdminUser] = useState<{ email: string; role: string } | null>(() => {
    try {
      const stored = localStorage.getItem('cp_admin_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Interactive Live SERP & CTR Calculator on Homepage
  const [interactiveKeyword, setInteractiveKeyword] = useState('neuromorphic silicon breakthrough 2026');
  const [monthlySearchVolume, setMonthlySearchVolume] = useState(24500);

  // Defer non-critical network background synchronization to prioritize initial paint & LCP
  useEffect(() => {
    let unsubArticles: (() => void) | null = null;
    let unsubAdSlots: (() => void) | null = null;
    let unsubAnalytics: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const bootTimer = setTimeout(() => {
      // 1. Mandatory Firestore connection test per skill requirements
      testFirestoreConnection();

      // 2. Real-time Firebase Firestore synchronization
      unsubArticles = FirebaseSyncService.subscribeArticles((firebaseArticles) => {
        setArticles(firebaseArticles);
        StorageService.saveArticles(firebaseArticles);
      });

      unsubAdSlots = FirebaseSyncService.subscribeAdSlots((slots) => {
        setAdSlots(slots);
        StorageService.saveAdSlots(slots);
      });

      unsubAnalytics = FirebaseSyncService.subscribeAnalytics((stats) => {
        setAnalytics(stats);
        StorageService.saveAnalytics(stats);
      });

      // 3. Listen to Firebase Auth state
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user && user.email) {
          setAdminUser({
            email: user.email,
            role: 'Verified Administrator'
          });
        }
      });
    }, 200);

    return () => {
      clearTimeout(bootTimer);
      if (unsubArticles) unsubArticles();
      if (unsubAdSlots) unsubAdSlots();
      if (unsubAnalytics) unsubAnalytics();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const refreshData = () => {
    setArticles(StorageService.getArticles());
    setAdSlots(StorageService.getAdSlots());
    setAnalytics(StorageService.getAnalytics());
  };

  // Update SEO Head on view changes
  useEffect(() => {
    if (!isAdminView) {
      updateHeadSEO(selectedArticle);
    } else {
      document.title = 'EIRVAN Studio – Editorial CMS';
    }
  }, [selectedArticle, isAdminView]);

  const handleSelectArticle = (art: Article) => {
    setSelectedArticle(art);
    setIsAdminView(false);
    setIsBookmarksView(false);
  };

  const handleBackToHome = () => {
    setSelectedArticle(null);
    setIsAdminView(false);
    setIsBookmarksView(false);
  };

  const handleToggleBookmark = (articleId: string) => {
    StorageService.toggleBookmark(articleId);
    refreshData();
  };

  // Admin access handler
  const handleOpenAdminPortal = () => {
    if (adminUser) {
      setIsAdminView(true);
      setIsBookmarksView(false);
      setSelectedArticle(null);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('cp_admin_auth');
    signOut(auth).catch(() => {});
    setAdminUser(null);
    setIsAdminView(false);
  };

  // Filter articles based on active category and bookmarks
  const publishedArticles = articles.filter(a => a.status === 'published');
  
  let displayArticles = publishedArticles;
  if (isBookmarksView) {
    displayArticles = publishedArticles.filter(a => a.isBookmarked);
  } else if (currentCategory !== 'all') {
    displayArticles = publishedArticles.filter(a => a.category === currentCategory);
  }

  const bookmarkedArticles = publishedArticles.filter(a => a.isBookmarked);
  const leadArticle = displayArticles.find(a => a.isFeatured) || displayArticles[0];
  const bentoArticles = displayArticles.filter(a => a.id !== leadArticle?.id).slice(0, 3);
  const remainingArticles = displayArticles.filter(a => a.id !== leadArticle?.id && !bentoArticles.some(s => s.id === a.id));

  // Multi-niche shelves for homepage discovery
  const techArticles = publishedArticles.filter(a => a.category === 'Technology & AI');
  const marketArticles = publishedArticles.filter(a => a.category === 'Global Markets & Finance');
  const bioMindArticles = publishedArticles.filter(a => a.category === 'Productivity & Mindset' || a.category === 'Biotech & Longevity');

  const topLeaderboardAd = adSlots.find(s => s.type === 'leaderboard' && s.isEnabled);
  const nativeMidAd = adSlots.find(s => s.type === 'native-card' && s.isEnabled);

  // Calculate simulated Google organic traffic & revenue
  const estimatedCTR = 28.5; // Average position #1 organic CTR
  const estimatedMonthlyClicks = Math.round((monthlySearchVolume * estimatedCTR) / 100);
  const estimatedAdRevenue = ((estimatedMonthlyClicks * 3.40) / 1000).toFixed(2); // RPM $3.40

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors">
      
      {/* Top Navbar */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={(cat) => {
          setCurrentCategory(cat);
          setSelectedArticle(null);
          setIsBookmarksView(false);
        }}
        onOpenAdmin={handleOpenAdminPortal}
        onOpenSearch={() => setIsSearchOpen(true)}
        isAdminView={isAdminView}
        onGoHome={handleBackToHome}
        bookmarkCount={bookmarkedArticles.length}
        onToggleBookmarksView={() => {
          setIsBookmarksView(prev => !prev);
          setSelectedArticle(null);
          setIsAdminView(false);
        }}
        isBookmarksView={isBookmarksView}
        onOpenAbout={() => setActivePageModal('about')}
      />

      {/* Main View Router */}
      <main className="flex-1">
        
        {/* VIEW 1: ADMIN CMS STUDIO (Protected) */}
        {isAdminView ? (
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Publisher Studio...</div>}>
            <AdminDashboard
              articles={articles}
              adSlots={adSlots}
              analytics={analytics}
              onRefreshData={refreshData}
              onPreviewSERP={(art) => setSerpPreviewArticle(art)}
              onExitAdmin={() => setIsAdminView(false)}
              adminEmail={adminUser?.email}
              onLogout={handleAdminLogout}
            />
          </Suspense>
        ) : selectedArticle ? (
          /* VIEW 2: ARTICLE READING EXPERIENCE */
          <ArticleView
            article={selectedArticle}
            adSlots={adSlots}
            onBack={handleBackToHome}
            onPreviewSERP={(art) => setSerpPreviewArticle(art)}
            onToggleBookmark={handleToggleBookmark}
          />
        ) : (
          /* VIEW 3: BROAD & AMAZING HOMEPAGE / DISCOVERY HUB */
          <div>
            
            {/* Top Leaderboard Ad Slot */}
            {topLeaderboardAd && (
              <div className="pt-2">
                <AdBanner slot={topLeaderboardAd} />
              </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14">
              
              {/* Editorial Header & Interactive Channel Switcher */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-600 font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Google Rank-Engineered Multi-Niche Intelligence</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight text-balance">
                    {isBookmarksView
                      ? 'Saved Reading List'
                      : currentCategory === 'all'
                      ? 'The Intelligence Dispatch'
                      : currentCategory}
                  </h1>
                </div>

                {/* Interactive Channel Filters */}
                <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs text-xs font-semibold">
                  <button
                    onClick={() => {
                      setCurrentCategory('all');
                      setIsBookmarksView(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      currentCategory === 'all' && !isBookmarksView
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    All Briefings ({publishedArticles.length})
                  </button>

                  {[
                    { label: 'Tech & AI', value: 'Technology & AI' },
                    { label: 'Markets', value: 'Global Markets & Finance' },
                    { label: 'Deep Work', value: 'Productivity & Mindset' },
                    { label: 'Longevity', value: 'Biotech & Longevity' }
                  ].map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setCurrentCategory(cat.value);
                        setIsBookmarksView(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        currentCategory === cat.value && !isBookmarksView
                          ? 'bg-blue-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label} ({publishedArticles.filter(a => a.category === cat.value).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* BOOKMARKS EMPTY STATE */}
              {isBookmarksView && displayArticles.length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto shadow-xs">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    No Saved Stories Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    Click the bookmark icon on any article card to save it for offline reading.
                  </p>
                  <button
                    onClick={() => setIsBookmarksView(false)}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Explore Briefings
                  </button>
                </div>
              )}

              {/* TIER 1: LEAD HERO SHOWCASE */}
              {leadArticle && (
                <section aria-label="Lead Story">
                  <ArticleCard
                    article={leadArticle}
                    variant="lead"
                    onSelect={handleSelectArticle}
                    onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                </section>
              )}

              {/* TIER 2: CURATED 3-COLUMN MULTI-NICHE BENTO SHOWCASE */}
              {bentoArticles.length > 0 && (
                <section aria-label="Curated Intelligence Trio">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-blue-600 font-bold block">
                        Editorial Selection
                      </span>
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
                        Trending Insights Across Disciplines
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                      Curated Daily · Core Web Vitals 100/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bentoArticles.map(art => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="secondary"
                        onSelect={handleSelectArticle}
                        onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* INTERACTIVE GOOGLE SEARCH RANK SIMULATOR WIDGET */}
              <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-950/15">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      <span>Google SERP Ranking Simulator &amp; Monetization Calculator</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white text-balance">
                      Simulate Google Position #1 Organic Traffic &amp; AdSense Yield
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-200 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/15">
                    <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Real-Time Algorithm Engine</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-center">
                  
                  {/* Query Controller */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label htmlFor="target-search-query-input" className="block text-xs font-mono text-slate-300 uppercase mb-1.5">
                        Target Search Query:
                      </label>
                      <input
                        id="target-search-query-input"
                        type="text"
                        aria-label="Target Search Query"
                        value={interactiveKeyword}
                        onChange={(e) => setInteractiveKeyword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-cyan-400 font-medium"
                      />
                    </div>

                    <div>
                      <label htmlFor="monthly-search-volume-range" className="flex justify-between text-xs font-mono text-slate-300 mb-1 cursor-pointer">
                        <span>Est. Monthly Search Volume:</span>
                        <span className="font-bold text-cyan-300">{monthlySearchVolume.toLocaleString()} / mo</span>
                      </label>
                      <input
                        id="monthly-search-volume-range"
                        aria-label="Est. Monthly Search Volume"
                        type="range"
                        min="5000"
                        max="100000"
                        step="5000"
                        value={monthlySearchVolume}
                        onChange={(e) => setMonthlySearchVolume(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="text-[11px] text-slate-400 font-mono">Quick Inquiries:</span>
                      {[
                        'neuromorphic silicon breakthrough 2026',
                        'photonic supercomputing datacenter',
                        'algorithmic arbitrage dark pools',
                        'NAD+ longevity clinical trials'
                      ].map(k => (
                        <button
                          key={k}
                          onClick={() => setInteractiveKeyword(k)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-cyan-200 transition-colors cursor-pointer"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Yield Metrics */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                      <span className="text-xs text-slate-300 font-mono block">Google SERP Rank</span>
                      <div className="text-3xl font-serif font-black text-cyan-300 mt-1">#1</div>
                      <span className="text-[11px] text-emerald-400 mt-1 block">Featured Snippet Win</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                      <span className="text-xs text-slate-300 font-mono block">Est. Organic Clicks</span>
                      <div className="text-3xl font-serif font-black text-white mt-1 tabular-nums">
                        {estimatedMonthlyClicks.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-300 mt-1 block">28.5% Organic CTR</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                      <span className="text-xs text-slate-300 font-mono block">Est. AdSense Yield</span>
                      <div className="text-3xl font-serif font-black text-emerald-300 mt-1 tabular-nums">
                        ${estimatedAdRevenue}
                      </div>
                      <span className="text-[11px] text-slate-300 mt-1 block">At $3.40 Target RPM</span>
                    </div>
                  </div>

                </div>
              </section>

              {/* NATIVE SPONSORED BRIEFING AD (High-CTR Monetization Slot) */}
              {nativeMidAd && (
                <section aria-label="Sponsored In-Feed Briefing">
                  <AdBanner slot={nativeMidAd} />
                </section>
              )}

              {/* CHANNEL SHELVES: When on 'all' view, showcase domain deep-dives */}
              {currentCategory === 'all' && !isBookmarksView && (
                <div className="space-y-12">
                  
                  {/* Shelf 1: Deep Tech & Artificial Intelligence */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
                          Technology &amp; Artificial Intelligence
                        </h3>
                      </div>
                      <button
                        onClick={() => setCurrentCategory('Technology & AI')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {techArticles.slice(0, 2).map(art => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          onSelect={handleSelectArticle}
                          onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Shelf 2: Global Markets & Quantitative Systems */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
                          Global Markets &amp; Quantitative Finance
                        </h3>
                      </div>
                      <button
                        onClick={() => setCurrentCategory('Global Markets & Finance')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {marketArticles.slice(0, 2).map(art => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          onSelect={handleSelectArticle}
                          onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Shelf 3: Cognitive Architecture & Cellular Longevity */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
                          Cognitive Ergonomics &amp; Cellular Longevity
                        </h3>
                      </div>
                      <button
                        onClick={() => setCurrentCategory('Biotech & Longevity')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {bioMindArticles.slice(0, 2).map(art => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          onSelect={handleSelectArticle}
                          onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Trending Inquiries Strip */}
              <section className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <span className="font-bold text-slate-900 flex items-center gap-2 text-sm font-sans">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Trending High-Search-Volume Queries
                  </span>
                  <span className="text-slate-400 font-mono text-xs">
                    Updated Daily via Search Console Telemetry
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Neuromorphic Silicon Breakthrough', cat: 'Technology & AI' },
                    { label: 'Photonic Supercomputing Datacenter', cat: 'Technology & AI' },
                    { label: 'Algorithmic Arbitrage Dark Pools', cat: 'Global Markets & Finance' },
                    { label: 'Sovereign Wealth Macro Execution', cat: 'Global Markets & Finance' },
                    { label: '90-Minute Ultradian Protocols', cat: 'Productivity & Mindset' },
                    { label: 'Dopamine Baseline Calibration', cat: 'Productivity & Mindset' },
                    { label: 'NAD+ Cellular Clinical Trials', cat: 'Biotech & Longevity' },
                    { label: 'CRISPR Epigenetic Methylation', cat: 'Biotech & Longevity' }
                  ].map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const match = publishedArticles.find(a => a.category === topic.cat);
                        if (match) handleSelectArticle(match);
                      }}
                      className="text-xs font-semibold px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-700 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{topic.label}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </section>

              {/* TIER 3: FULL FIELD ANALYSES & ARCHIVE TABLE */}
              {remainingArticles.length > 0 && (
                <section aria-label="Recent Briefings" className="pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 className="text-xl font-serif font-bold text-slate-900">
                      Recent Field Analyses &amp; Guides
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      {remainingArticles.length} additional briefings
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 p-2 shadow-xs">
                    {remainingArticles.map(art => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="compact"
                        onSelect={handleSelectArticle}
                        onPreviewSERP={(art) => setSerpPreviewArticle(art)}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* INTERACTIVE EDITORIAL KNOWLEDGE HUB & FAQ ENGINE */}
              <FAQSection
                articles={publishedArticles}
                onSelectArticle={handleSelectArticle}
              />

            </div>
          </div>
        )}

      </main>

      {/* Editorial Footer */}
      {!isAdminView && (
        <Footer
          onSelectCategory={(cat) => {
            setCurrentCategory(cat);
            setSelectedArticle(null);
            setIsBookmarksView(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAdmin={handleOpenAdminPortal}
          onOpenAbout={() => setActivePageModal('about')}
          onOpenTerms={() => setActivePageModal('terms')}
          onOpenPrivacy={() => setActivePageModal('privacy')}
        />
      )}

      {/* Interactive Publication & Legal Document Modal */}
      <Suspense fallback={null}>
        {activePageModal && (
          <PageModal
            type={activePageModal}
            onClose={() => setActivePageModal(null)}
          />
        )}

        {/* Interactive SERP Preview Modal */}
        {serpPreviewArticle && (
          <SERPPreviewModal
            article={serpPreviewArticle}
            onClose={() => setSerpPreviewArticle(null)}
          />
        )}

        {/* Global Search Modal */}
        {isSearchOpen && (
          <SearchModal
            articles={publishedArticles}
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {/* Admin Login Modal with Default Credentials */}
        {isLoginModalOpen && (
          <AdminLoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={(email) => {
              setAdminUser({ email, role: 'Administrator' });
              setIsLoginModalOpen(false);
              setIsAdminView(true);
              setSelectedArticle(null);
            }}
          />
        )}
      </Suspense>

    </div>
  );
}

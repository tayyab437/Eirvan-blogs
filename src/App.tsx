import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ArticleCard } from './components/ArticleCard';
import { ArticleView } from './components/ArticleView';
import { AdBanner } from './components/AdBanner';
import { FAQSection } from './components/FAQSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import { StorageService } from './services/storage';
import { Article, PublicAdSlot, AdMetrics, AdMetricsLoadStatus, AdSlotConfig, VisitorAnalytics } from './types/blog';
import { updateHeadSEO } from './utils/seo';
import { PRODUCTS } from './data/products';
import { Product } from './types/products';
import {
  useRouter,
  navigate,
  Link,
  slugToCategory,
  categoryToSlug
} from './utils/router';
import { subscribeAdminAuth, logoutAdmin, AdminUser } from './services/auth-service';

// Resilient dynamic import helper with automatic retry on temporary network or wake-up delays
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory();
      return { default: module.default || module.AdminDashboard || module.AdminLoginModal || module.SearchModal || module.PageModal || module.SERPPreviewModal || module };
    } catch (firstError) {
      console.warn('Initial dynamic module fetch failed, retrying...', firstError);
      await new Promise(r => setTimeout(r, 600));
      const module = await factory();
      return { default: module.default || module.AdminDashboard || module.AdminLoginModal || module.SearchModal || module.PageModal || module.SERPPreviewModal || module };
    }
  });
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackTitle?: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <h3 className="font-serif font-bold text-slate-900 text-lg">
            {this.props.fallbackTitle || 'Unable to Load View'}
          </h3>
          <p className="text-xs text-slate-500">
            A temporary connection delay occurred while loading this module.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-loaded secondary components & modals with automatic retry
const SERPPreviewModal = lazyWithRetry(() => import('./components/SERPPreviewModal'));
const SearchModal = lazyWithRetry(() => import('./components/SearchModal'));
const TermsPage = lazyWithRetry(() => import('./components/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./components/PrivacyPage'));
const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard'));
const AdminLoginModal = lazyWithRetry(() => import('./components/admin/AdminLoginModal'));
const AboutPage = lazyWithRetry(() => import('./components/AboutPage'));
const ProductsView = lazyWithRetry(() => import('./components/ProductsView'));
const ProductDetailView = lazyWithRetry(() => import('./components/ProductDetailView'));
const CheckoutView = lazyWithRetry(() => import('./components/CheckoutView'));
const AuthorProfilePage = lazyWithRetry(() => import('./components/AuthorProfilePage'));

import { LanguageProvider } from './i18n/LanguageContext';
import { getAuthorBySlug, AUTHORS } from './data/authors';
import { SubscribeModal } from './components/SubscribeModal';

import {
  Sparkles,
  TrendingUp,
  Bookmark,
  ArrowRight,
  Zap,
  Gauge,
  ShoppingBag
} from 'lucide-react';

export default function App() {
  const { route } = useRouter();

  // state initialization
  // state initialization - sync load to prevent LCP render delay
  const [articles, setArticles] = useState<Article[]>(() => StorageService.getArticles());
  const [adSlots, setAdSlots] = useState<PublicAdSlot[]>(() => StorageService.getAdSlots());
  const [adMetrics, setAdMetrics] = useState<Record<string, AdMetrics>>({});
  const [adMetricsLoadStatus, setAdMetricsLoadStatus] = useState<AdMetricsLoadStatus>('loading');
  const [analytics, setAnalytics] = useState<VisitorAnalytics | null>(() => StorageService.getAnalytics());
  const [initialDataLoaded, setInitialDataLoaded] = useState(true);
  
  const [serpPreviewArticle, setSerpPreviewArticle] = useState<Article | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState<boolean>(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [interactiveKeyword, setInteractiveKeyword] = useState('neuromorphic silicon breakthrough 2026');
  const [monthlySearchVolume, setMonthlySearchVolume] = useState(24500);

  // Determine active article from URL route
  const activeArticle = route.routeType === 'article' && route.param
    ? articles.find(a => a.slug === route.param || a.id === route.param) || null
    : null;

  // Determine active product from URL route
  const activeProduct = route.routeType === 'product' && route.param
    ? PRODUCTS.find(p => p.slug === route.param || p.id === route.param) || null
    : null;

  // Determine current active category from URL route
  const activeCategory = route.routeType === 'category' && route.param
    ? slugToCategory(route.param)
    : 'all';

  const isBookmarksView = route.routeType === 'bookmarks';
  const isAdminView = route.routeType === 'admin' && adminUser !== null;
  const isProductsCatalogView = route.routeType === 'products';
  const isProductDetailView = route.routeType === 'product' && activeProduct !== null;
  const isCheckoutView = route.routeType.startsWith('checkout');

  // Background non-blocking sync during browser idle
  useEffect(() => {
    const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;

    const idleHandle = scheduleIdle(async () => {
      try {
        const { testFirestoreConnection, FirebaseSyncService } = await import('./services/firebase-sync');
        await testFirestoreConnection();

        const [freshArticles, freshAdSlots] = await Promise.all([
          FirebaseSyncService.fetchArticlesOnce(),
          FirebaseSyncService.fetchAdSlotsOnce()
        ]);

        if (freshArticles && freshArticles.length > 0) {
          setArticles(freshArticles);
          StorageService.saveArticles(freshArticles);
        }
        if (freshAdSlots && freshAdSlots.length > 0) {
          setAdSlots(freshAdSlots);
          StorageService.saveAdSlots(freshAdSlots);
        }
      } catch {}
    });

    return () => {
      cancelIdle(idleHandle as any);
    };
  }, []);

  // One-time migration to reset views to 0 for real-time tracking from scratch as requested
  useEffect(() => {
    const hasReset = localStorage.getItem('eirvan_views_reset_2026');
    if (!hasReset) {
      StorageService.resetTelemetryToZero();
      localStorage.setItem('eirvan_views_reset_2026', 'true');
      refreshData();
    }
  }, []);

  // Real-time Firebase Authentication listener enforcing verified admin authorization
  useEffect(() => {
    const unsubscribe = subscribeAdminAuth((user, loading) => {
      setAdminUser(user);
      setIsAuthLoading(loading);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time synchronization for Admin Studio
  useEffect(() => {
    if (!isAdminView) return;

    let unsubs: (() => void)[] = [];
    let isActive = true;

    import('./services/firebase-sync').then(async ({ FirebaseSyncService }) => {
      if (!isActive) return;

      const [unsubArt, unsubAna, unsubAds, unsubAdMetrics] = await Promise.all([
        FirebaseSyncService.subscribeArticles((freshArticles) => {
          setArticles(freshArticles);
          StorageService.saveArticles(freshArticles);
        }),
        FirebaseSyncService.subscribeAnalytics((freshAnalytics) => {
          setAnalytics(freshAnalytics);
          StorageService.saveAnalytics(freshAnalytics);
        }),
        FirebaseSyncService.subscribeAdSlots((freshAdSlots) => {
          setAdSlots(freshAdSlots);
          StorageService.saveAdSlots(freshAdSlots);
        }),
        FirebaseSyncService.subscribeAdMetrics(
          (freshMetrics) => {
            setAdMetrics(freshMetrics);
            StorageService.saveAdMetricsFromFirestore(freshMetrics);
          },
          (status) => {
            setAdMetricsLoadStatus(status);
          }
        )
      ]);

      unsubs.push(unsubArt, unsubAna, unsubAds, unsubAdMetrics);
    });

    return () => {
      isActive = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [isAdminView]);

  const refreshData = () => {
    setArticles(StorageService.getArticles());
    setAdSlots(StorageService.getAdSlots());
    setAnalytics(StorageService.getAnalytics());
  };

  // Combine PublicAdSlot + protected AdMetrics ONLY for authenticated Admin Studio view
  const adminAdSlots: AdSlotConfig[] = adminUser
    ? StorageService.getCombinedAdminAdSlots(adMetrics, adMetricsLoadStatus)
    : [];

  // Dynamic document title and SEO updates based on canonical URL
  useEffect(() => {
    if (route.routeType === 'article' && activeArticle) {
      updateHeadSEO(activeArticle);
    } else if (route.routeType === 'products') {
      document.title = 'Pro Research Store & Monograph Dossiers – EIRVAN';
    } else if (route.routeType === 'product' && activeProduct) {
      document.title = `${activeProduct.title} – EIRVAN Institutional Store`;
    } else if (route.routeType === 'checkout-cart') {
      document.title = 'Step 1: Review Plan – EIRVAN Institutional Checkout';
    } else if (route.routeType === 'checkout-details') {
      document.title = 'Step 2: Customer & Billing – EIRVAN Institutional Checkout';
    } else if (route.routeType === 'checkout-payment') {
      document.title = 'Step 3: Secure Payment – EIRVAN Institutional Checkout';
    } else if (route.routeType === 'checkout-confirmation') {
      document.title = 'Step 4: Order Confirmation & Receipt – EIRVAN';
    } else if (route.routeType === 'category' && activeCategory !== 'all') {
      document.title = `${activeCategory} – EIRVAN Editorial Channel`;
    } else if (route.routeType === 'bookmarks') {
      document.title = 'Saved Reading List – EIRVAN';
    } else if (route.routeType === 'about') {
      document.title = 'About EIRVAN – Editorial Charter & Mission';
    } else if (route.routeType === 'terms') {
      document.title = 'Terms of Service – EIRVAN';
    } else if (route.routeType === 'privacy') {
      document.title = 'Privacy Policy – EIRVAN';
    } else if (route.routeType === 'admin') {
      document.title = 'EIRVAN Studio – Editorial CMS';
    } else if (route.routeType === 'author' && route.param) {
      const author = getAuthorBySlug(route.param);
      document.title = author ? `${author.name} – EIRVAN Editorial Masthead` : 'Editorial Masthead – EIRVAN';
    } else {
      updateHeadSEO(null);
    }

    if (route.routeType !== 'admin') {
      StorageService.recordPageView(activeArticle?.id);
    }
  }, [route.path, activeArticle?.id, activeProduct?.id, activeCategory]);

  const handleSelectArticle = (art: Article) => {
    navigate(`/article/${art.slug}`);
  };

  const handleSelectProduct = (prod: Product) => {
    navigate(`/product/${prod.slug}`);
  };

  const handleInitiateCheckout = (prod: Product) => {
    navigate(`/checkout?product=${prod.slug}`);
  };

  const handleSelectCategory = (cat: string) => {
    if (cat === 'all') {
      navigate('/');
    } else {
      navigate(`/category/${categoryToSlug(cat)}`);
    }
  };

  const handleToggleBookmark = (articleId: string) => {
    StorageService.toggleBookmark(articleId);
    refreshData();
  };

  const handleOpenAdminPortal = () => {
    if (adminUser) {
      navigate('/admin');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
    navigate('/');
  };

  const publishedArticles = articles.filter(a => a.status === 'published');
  
  let displayArticles = publishedArticles;
  if (isBookmarksView) {
    displayArticles = publishedArticles.filter(a => a.isBookmarked);
  } else if (activeCategory !== 'all') {
    displayArticles = publishedArticles.filter(a => {
      const aCat = (a.category || '').toLowerCase();
      const activeCat = (activeCategory || '').toLowerCase();
      return aCat === activeCat || aCat.includes(activeCat) || activeCat.includes(aCat);
    });
    if (displayArticles.length === 0) {
      displayArticles = publishedArticles;
    }
  }

  const bookmarkedArticles = publishedArticles.filter(a => a.isBookmarked);
  const leadArticle = displayArticles.find(a => a.isFeatured) || displayArticles[0];
  const bentoArticles = displayArticles.filter(a => a.id !== leadArticle?.id).slice(0, 3);
  const remainingArticles = displayArticles.filter(a => a.id !== leadArticle?.id && !bentoArticles.some(s => s.id === a.id));

  const techArticles = publishedArticles.filter(a => a.category === 'Technology & AI');
  const marketArticles = publishedArticles.filter(a => a.category === 'Global Markets & Finance');
  const bioMindArticles = publishedArticles.filter(a => a.category === 'Productivity & Mindset' || a.category === 'Biotech & Longevity');

  const topLeaderboardAd = adSlots.find(s => s.type === 'leaderboard' && s.isEnabled);
  const nativeMidAd = adSlots.find(s => s.type === 'native-card' && s.isEnabled);

  const estimatedCTR = 28.5;
  const estimatedMonthlyClicks = Math.round((monthlySearchVolume * estimatedCTR) / 100);
  const estimatedAdRevenue = ((estimatedMonthlyClicks * 3.40) / 1000).toFixed(2);

  // Determine which checkout step is active
  const checkoutStep: 'cart' | 'details' | 'payment' | 'confirmation' =
    route.routeType === 'checkout-details' ? 'details' :
    route.routeType === 'checkout-payment' ? 'payment' :
    route.routeType === 'checkout-confirmation' ? 'confirmation' : 'cart';

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors">
        <OfflineIndicator />
      <Navbar
        currentCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onOpenAdmin={handleOpenAdminPortal}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSubscribe={() => setIsSubscribeOpen(true)}
        isAdminView={isAdminView}
        onGoHome={() => navigate('/')}
        bookmarkCount={bookmarkedArticles.length}
        onToggleBookmarksView={() => navigate(isBookmarksView ? '/' : '/bookmarks')}
        isBookmarksView={isBookmarksView}
        isProductsView={isProductsCatalogView || isProductDetailView}
        isAboutView={route.routeType === 'about'}
        onOpenAbout={() => navigate('/about')}
      />

      <main className="flex-1">
        {/* VIEW 1: ADMIN CMS STUDIO (/admin) */}
        {route.routeType === 'admin' ? (
          isAuthLoading ? (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Verifying administrator authorization...</p>
            </div>
          ) : adminUser ? (
            <ErrorBoundary fallbackTitle="Publisher Studio CMS">
              <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Publisher Studio...</div>}>
                <AdminDashboard
                  articles={articles}
                  adSlots={adminAdSlots}
                  adMetricsStatus={adMetricsLoadStatus}
                  analytics={analytics}
                  onRefreshData={refreshData}
                  onPreviewSERP={(art: Article) => setSerpPreviewArticle(art)}
                  onExitAdmin={() => navigate('/')}
                  adminEmail={adminUser?.email}
                  onLogout={handleAdminLogout}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-lg">
              <h2 className="text-xl font-serif font-bold text-slate-900">Administrator Access Required</h2>
              <p className="text-xs text-slate-600">Please sign in with an authorized administrator account to access the EIRVAN Publisher Studio CMS.</p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Sign In to Studio
              </button>
            </div>
          )
        ) :
 activeArticle ? (
          /* VIEW 2: ARTICLE READING VIEW (/article/:slug) */
            <ArticleView
              article={activeArticle}
              adSlots={adSlots}
              onBack={() => navigate('/')}
              onToggleBookmark={handleToggleBookmark}
            />
        ) : route.routeType === 'about' ? (
          /* VIEW 3: DEDICATED ABOUT PAGE (/about) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Institutional Charter...</div>}>
            <AboutPage
              onBackToHome={() => navigate('/')}
              onSelectCategory={handleSelectCategory}
            />
          </Suspense>
        ) : route.routeType === 'terms' ? (
          /* VIEW 4: DEDICATED TERMS OF SERVICE (/terms) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Terms of Service...</div>}>
            <TermsPage onBackToHome={() => navigate('/')} />
          </Suspense>
        ) : route.routeType === 'privacy' ? (
          /* VIEW 5: DEDICATED PRIVACY POLICY (/privacy) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Privacy Policy...</div>}>
            <PrivacyPage onBackToHome={() => navigate('/')} />
          </Suspense>
        ) : isProductsCatalogView ? (
          /* VIEW 3: PRODUCTS CATALOG (/products) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Institutional Store...</div>}>
            <ProductsView
              onSelectProduct={handleSelectProduct}
              onInitiateCheckout={handleInitiateCheckout}
            />
          </Suspense>
        ) : isProductDetailView && activeProduct ? (
          /* VIEW 4: PRODUCT DETAIL (/product/:slug) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Monograph Dossier...</div>}>
            <ProductDetailView
              product={activeProduct}
              onInitiateCheckout={handleInitiateCheckout}
              onBack={() => navigate('/products')}
            />
          </Suspense>
        ) : isCheckoutView ? (
          /* VIEW 5: CHECKOUT MULTI-STEP FLOW (/checkout, /checkout/details, /checkout/payment, /checkout/confirmation) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Secure Checkout...</div>}>
            <CheckoutView
              initialStep={checkoutStep}
              selectedProductSlug={route.queryParams.product}
            />
          </Suspense>
        ) : route.routeType === 'author' && route.param ? (
          /* VIEW 6: AUTHOR DOSSIER & MASTHEAD (/author/:slug) */
          <Suspense fallback={<div className="p-12 text-center text-slate-500 font-mono text-xs">Loading Editorial Dossier...</div>}>
            <AuthorProfilePage
              author={getAuthorBySlug(route.param) || AUTHORS[0]}
              articles={publishedArticles}
              onSelectArticle={handleSelectArticle}
              onToggleBookmark={handleToggleBookmark}
              onGoHome={() => navigate('/')}
            />
          </Suspense>
        ) : (
          /* VIEW 7: HOME DISPATCH & CATEGORIES (/, /category/:slug, /bookmarks) */
          <div>
            {topLeaderboardAd && (
              <div className="pt-2">
                <AdBanner slot={topLeaderboardAd} onRefreshData={refreshData} />
              </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-600 font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Google Rank-Engineered Multi-Niche Intelligence</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight text-balance">
                    {isBookmarksView ? 'Saved Reading List' : activeCategory === 'all' ? 'The Intelligence Dispatch' : activeCategory}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs text-xs font-semibold">
                  <Link
                    href="/"
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${activeCategory === 'all' && !isBookmarksView ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    All Briefings ({publishedArticles.length})
                  </Link>
                  {[
                    { label: 'Tech & AI', value: 'Technology & AI', slug: 'technology-ai' },
                    { label: 'Markets', value: 'Global Markets & Finance', slug: 'global-markets-finance' },
                    { label: 'Deep Work', value: 'Productivity & Mindset', slug: 'productivity-mindset' },
                    { label: 'Longevity', value: 'Biotech & Longevity', slug: 'biotech-longevity' }
                  ].map(cat => (
                    <Link
                      key={cat.value}
                      href={`/category/${cat.slug}`}
                      className={`px-3.5 py-1.5 rounded-xl transition-all ${activeCategory === cat.value && !isBookmarksView ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      {cat.label} ({publishedArticles.filter(a => a.category === cat.value).length})
                    </Link>
                  ))}
                </div>
              </div>

              {isBookmarksView && displayArticles.length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto shadow-xs">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-serif font-bold text-slate-900">No Saved Stories Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-5">Click the bookmark icon on any article card to save it.</p>
                  <Link href="/" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors inline-block">
                    Explore Briefings
                  </Link>
                </div>
              )}

              {leadArticle && (
                <section aria-label="Lead Story">
                  <ArticleCard article={leadArticle} variant="lead" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                </section>
              )}

              {bentoArticles.length > 0 && (
                <section aria-label="Curated Intelligence Trio">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-blue-600 font-bold block">Editorial Selection</span>
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">Trending Insights Across Disciplines</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bentoArticles.map(art => (
                      <ArticleCard key={art.id} article={art} variant="secondary" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                    ))}
                  </div>
                </section>
              )}



              {activeCategory === 'all' && !isBookmarksView && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">Technology &amp; AI</h3>
                      </div>
                      <Link href="/category/technology-ai" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {techArticles.slice(0, 2).map(art => (
                        <ArticleCard key={art.id} article={art} variant="secondary" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">Global Markets &amp; Finance</h3>
                      </div>
                      <Link href="/category/global-markets-finance" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {marketArticles.slice(0, 2).map(art => (
                        <ArticleCard key={art.id} article={art} variant="secondary" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">Cognitive Ergonomics &amp; Longevity</h3>
                      </div>
                      <Link href="/category/biotech-longevity" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                        <span>View Channel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {bioMindArticles.slice(0, 2).map(art => (
                        <ArticleCard key={art.id} article={art} variant="secondary" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Trending Queries */}
              <section className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <span className="font-bold text-slate-900 flex items-center gap-2 text-sm font-sans">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Trending High-Search-Volume Queries
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
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </section>

              {remainingArticles.length > 0 && (
                <section aria-label="Recent Briefings" className="pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h3 className="text-xl font-serif font-bold text-slate-900">Recent Field Analyses &amp; Guides</h3>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 p-2 shadow-xs">
                    {remainingArticles.map(art => (
                      <ArticleCard key={art.id} article={art} variant="compact" onSelect={handleSelectArticle} onToggleBookmark={handleToggleBookmark} />
                    ))}
                  </div>
                </section>
              )}

              <FAQSection articles={publishedArticles} onSelectArticle={handleSelectArticle} />
            </div>
          </div>
        )}
      </main>

      {route.routeType !== 'admin' && (
        <Footer
          onSelectCategory={handleSelectCategory}
          onOpenAdmin={handleOpenAdminPortal}
          onOpenAbout={() => navigate('/about')}
          onOpenTerms={() => navigate('/terms')}
          onOpenPrivacy={() => navigate('/privacy')}
        />
      )}

      {/* Modals with proper URL sync */}
      <Suspense fallback={null}>
        {serpPreviewArticle && (
          <SERPPreviewModal
            article={serpPreviewArticle}
            onClose={() => setSerpPreviewArticle(null)}
          />
        )}
        {isSearchOpen && (
          <SearchModal
            articles={publishedArticles}
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectArticle={handleSelectArticle}
          />
        )}
        {isSubscribeOpen && (
          <SubscribeModal
            isOpen={isSubscribeOpen}
            onClose={() => setIsSubscribeOpen(false)}
          />
        )}
        {isLoginModalOpen && (
          <AdminLoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={() => {
              setIsLoginModalOpen(false);
              navigate('/admin');
            }}
          />
        )}
      </Suspense>
    </div>
    </LanguageProvider>
  );
}

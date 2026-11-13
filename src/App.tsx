import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ArticleCard } from './components/ArticleCard';
import { ArticleView } from './components/ArticleView';
import { AdBanner } from './components/AdBanner';
import { FAQSection } from './components/FAQSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import { StorageService } from './services/storage';
import {
  Article,
  PublicAdSlot,
  AdMetrics,
  AdMetricsLoadStatus,
  AdSlotConfig,
  VisitorAnalytics
} from './types/blog';
import { isPublicPublishedArticle, updateRouteSEO } from './utils/seo';
import { initOptionalAnalytics, trackRoutePageView } from './utils/analytics';
import { CATEGORY_HUBS, getCategoryHubByName, getCategoryHubBySlug } from './data/categories';
import { PRODUCTS } from './data/products';
import { Product } from './types/products';
import {
  useRouter,
  navigate,
  Link,
  getArticlePath,
  getCategoryPath
} from './utils/router';
import { subscribeAdminAuth, logoutAdmin, AdminUser } from './services/auth-service';
import { LanguageProvider } from './i18n/LanguageContext';
import { getAuthorBySlug, AUTHORS } from './data/authors';
import { SubscribeModal } from './components/SubscribeModal';
import { Bookmark, ArrowLeft, ArrowRight, ShieldCheck, BookOpen } from 'lucide-react';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory();
      return {
        default:
          module.default ||
          module.AdminDashboard ||
          module.AdminLoginModal ||
          module.SearchModal ||
          module.SERPPreviewModal ||
          module
      };
    } catch (firstError) {
      console.warn('Initial dynamic module fetch failed, retrying...', firstError);
      await new Promise(r => setTimeout(r, 600));
      const module = await factory();
      return {
        default:
          module.default ||
          module.AdminDashboard ||
          module.AdminLoginModal ||
          module.SearchModal ||
          module.SERPPreviewModal ||
          module
      };
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
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto font-bold text-base">
            !
          </div>
          <h3 className="font-serif font-bold text-stone-900 text-lg">
            {this.props.fallbackTitle || 'Unable to Load View'}
          </h3>
          <p className="text-xs text-stone-600">
            A temporary loading delay occurred while initializing this view.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 bg-stone-900 hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SERPPreviewModal = lazyWithRetry(() => import('./components/SERPPreviewModal'));
const SearchModal = lazyWithRetry(() => import('./components/SearchModal'));
const TermsPage = lazyWithRetry(() => import('./components/TermsPage'));
const PrivacyPage = lazyWithRetry(() => import('./components/PrivacyPage'));
const EditorialPolicyPage = lazyWithRetry(() => import('./components/EditorialPolicyPage'));
const CorrectionsPolicyPage = lazyWithRetry(() => import('./components/CorrectionsPolicyPage'));
const ContactPage = lazyWithRetry(() => import('./components/ContactPage'));
const NotFoundPage = lazyWithRetry(() => import('./components/NotFoundPage'));
const CategoryHubPage = lazyWithRetry(() => import('./components/CategoryHubPage'));
const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard'));
const AdminLoginModal = lazyWithRetry(() => import('./components/admin/AdminLoginModal'));
const AboutPage = lazyWithRetry(() => import('./components/AboutPage'));
const ProductsView = lazyWithRetry(() => import('./components/ProductsView'));
const ProductDetailView = lazyWithRetry(() => import('./components/ProductDetailView'));
const CheckoutView = lazyWithRetry(() => import('./components/CheckoutView'));
const AuthorProfilePage = lazyWithRetry(() => import('./components/AuthorProfilePage'));

const HOME_PAGE_SIZE = 6;

export default function App() {
  const { route } = useRouter();

  const [articles, setArticles] = useState<Article[]>(() => StorageService.getArticles());
  const [adSlots, setAdSlots] = useState<PublicAdSlot[]>(() => StorageService.getAdSlots());
  const [adMetrics, setAdMetrics] = useState<Record<string, AdMetrics>>({});
  const [adMetricsLoadStatus, setAdMetricsLoadStatus] = useState<AdMetricsLoadStatus>('loading');
  const [analytics, setAnalytics] = useState<VisitorAnalytics>(() => StorageService.getAnalytics());

  const [serpPreviewArticle, setSerpPreviewArticle] = useState<Article | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState<boolean>(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Strictly enforce published status & schedule release timestamp on all public views
  const publishedArticles = useMemo(() => {
    return articles
      .filter(a => isPublicPublishedArticle(a))
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.updatedAt).getTime() -
          new Date(a.publishedAt || a.updatedAt).getTime()
      );
  }, [articles]);

  // Match active article strictly among published articles (including previousSlugs for seamless SPA resolution)
  const activeArticle = useMemo(() => {
    if (route.routeType !== 'article' || !route.param) return null;
    return (
      publishedArticles.find(
        a =>
          a.slug === route.param ||
          a.id === route.param ||
          (a.previousSlugs || []).includes(route.param as string)
      ) || null
    );
  }, [route.routeType, route.param, publishedArticles]);

  // Canonicalize legacy /article/:slug or moved previousSlug URLs cleanly
  useEffect(() => {
    if (route.routeType === 'article' && activeArticle) {
      const targetPath = getArticlePath(activeArticle.slug);
      if (route.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [route.routeType, route.pathname, activeArticle?.slug]);

  const activeCategoryHub = useMemo(() => {
    if (route.routeType !== 'category' || !route.param) return null;
    return getCategoryHubBySlug(route.param) || null;
  }, [route.routeType, route.param]);

  const activeProduct = useMemo(() => {
    if (route.routeType !== 'product' || !route.param) return null;
    return PRODUCTS.find(p => p.slug === route.param || p.id === route.param) || null;
  }, [route.routeType, route.param]);

  const activeAuthor = useMemo(() => {
    if (route.routeType !== 'author' || !route.param) return null;
    return getAuthorBySlug(route.param) || AUTHORS[0];
  }, [route.routeType, route.param]);

  const isBookmarksView = route.routeType === 'bookmarks';
  const isAdminView = route.routeType === 'admin' && adminUser !== null;
  const isProductsCatalogView = route.routeType === 'products';
  const isProductDetailView = route.routeType === 'product' && activeProduct !== null;
  const isCheckoutView = route.routeType.startsWith('checkout');

  // Optional GA4 initialization (only activates if VITE_GA_MEASUREMENT_ID env var is configured)
  useEffect(() => {
    initOptionalAnalytics();
  }, []);

  // Background non-blocking Firestore sync during browser idle
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
      } catch {
        // Resilient offline/static fallback already hydrated from local catalog
      }
    });

    return () => {
      cancelIdle(idleHandle as any);
    };
  }, []);

  // Real-time Firebase Authentication listener
  useEffect(() => {
    const unsubscribe = subscribeAdminAuth((user, loading) => {
      setAdminUser(user);
      setIsAuthLoading(loading);
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization strictly inside Admin Studio
  useEffect(() => {
    if (!isAdminView) return;

    const unsubs: (() => void)[] = [];
    let isActive = true;

    import('./services/firebase-sync').then(async ({ FirebaseSyncService }) => {
      if (!isActive) return;

      const [unsubArt, unsubAna, unsubAds, unsubAdMetrics] = await Promise.all([
        FirebaseSyncService.subscribeArticles(freshArticles => {
          setArticles(freshArticles);
          StorageService.saveArticles(freshArticles);
        }),
        FirebaseSyncService.subscribeAnalytics(freshAnalytics => {
          setAnalytics(freshAnalytics);
          StorageService.saveAnalytics(freshAnalytics);
        }),
        FirebaseSyncService.subscribeAdSlots(freshAdSlots => {
          setAdSlots(freshAdSlots);
          StorageService.saveAdSlots(freshAdSlots);
        }),
        FirebaseSyncService.subscribeAdMetrics(
          freshMetrics => {
            setAdMetrics(freshMetrics);
            StorageService.saveAdMetricsFromFirestore(freshMetrics);
          },
          status => {
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

  const totalHomePages = Math.max(1, Math.ceil(publishedArticles.length / HOME_PAGE_SIZE));
  const activeCategoryArticles = useMemo(() => {
    if (!activeCategoryHub) return [];
    return publishedArticles.filter(
      a => getCategoryHubByName(a.category).slug === activeCategoryHub.slug
    );
  }, [activeCategoryHub, publishedArticles]);
  const totalCategoryPages = Math.max(1, Math.ceil(activeCategoryArticles.length / HOME_PAGE_SIZE));

  // Unmatched article or unknown route resolves safely to 404 metadata
  const effectiveRoute = useMemo(() => {
    if (route.routeType === 'article' && !activeArticle) {
      return { ...route, routeType: 'not-found' as const };
    }
    if (route.routeType === 'category' && !activeCategoryHub) {
      return { ...route, routeType: 'not-found' as const };
    }
    if (route.routeType === 'product' && !activeProduct) {
      return { ...route, routeType: 'not-found' as const };
    }
    return route;
  }, [route, activeArticle, activeCategoryHub, activeProduct]);

  // Unified route <head> SEO & optional GA4 telemetry update
  useEffect(() => {
    updateRouteSEO(effectiveRoute, {
      article: activeArticle,
      author: activeAuthor,
      totalPages:
        effectiveRoute.routeType === 'category' ? totalCategoryPages : totalHomePages
    });

    if (effectiveRoute.routeType !== 'admin') {
      StorageService.recordPageView(activeArticle?.id);
      trackRoutePageView(effectiveRoute.pathname);
    }
  }, [
    effectiveRoute,
    activeArticle?.id,
    activeAuthor?.slug,
    totalHomePages,
    totalCategoryPages
  ]);

  const handleSelectArticle = (art: Article) => {
    navigate(getArticlePath(art.slug));
  };

  const handleSelectProduct = (prod: Product) => {
    navigate(`/product/${prod.slug}`);
  };

  const handleInitiateCheckout = (prod: Product) => {
    navigate(`/checkout?product=${prod.slug}`);
  };

  const handleSelectCategory = (cat: string) => {
    navigate(getCategoryPath(cat));
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

  const bookmarkedArticles = useMemo(
    () => publishedArticles.filter(a => a.isBookmarked),
    [publishedArticles]
  );

  // Home page 10-section curation
  const currentHomePage = Math.min(Math.max(1, route.page || 1), totalHomePages);
  const leadArticle = useMemo(
    () => publishedArticles.find(a => a.isFeatured) || publishedArticles[0],
    [publishedArticles]
  );
  const editorsPicks = useMemo(
    () => publishedArticles.filter(a => a.id !== leadArticle?.id).slice(0, 3),
    [publishedArticles, leadArticle]
  );
  const trendingArticles = useMemo(() => {
    const flagged = publishedArticles.filter(a => a.isTrending && a.id !== leadArticle?.id);
    if (flagged.length >= 3) return flagged.slice(0, 3);
    return publishedArticles.filter(a => a.id !== leadArticle?.id).slice(0, 3);
  }, [publishedArticles, leadArticle]);

  const archiveArticles = useMemo(() => {
    const start = (currentHomePage - 1) * HOME_PAGE_SIZE;
    return publishedArticles.slice(start, start + HOME_PAGE_SIZE);
  }, [publishedArticles, currentHomePage]);

  const topLeaderboardAd = adSlots.find(s => s.type === 'leaderboard' && s.isEnabled);
  const nativeMidAd = adSlots.find(s => s.type === 'native-card' && s.isEnabled);

  const checkoutStep: 'cart' | 'details' | 'payment' | 'confirmation' =
    route.routeType === 'checkout-details'
      ? 'details'
      : route.routeType === 'checkout-payment'
        ? 'payment'
        : route.routeType === 'checkout-confirmation'
          ? 'confirmation'
          : 'cart';

  const activeCategoryName = activeCategoryHub ? activeCategoryHub.name : 'all';

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
        <OfflineIndicator />

        <Navbar
          currentCategory={activeCategoryName}
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
          {route.routeType === 'admin' ? (
            isAuthLoading ? (
              <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-stone-500 font-mono">
                  Verifying administrator authorization...
                </p>
              </div>
            ) : adminUser ? (
              <ErrorBoundary fallbackTitle="Publisher Studio CMS">
                <Suspense
                  fallback={
                    <div className="p-12 text-center text-stone-500 font-mono text-xs">
                      Loading Publisher Studio...
                    </div>
                  }
                >
                  <AdminDashboard
                    articles={articles}
                    adSlots={adminAdSlots}
                    adMetricsStatus={adMetricsLoadStatus}
                    analytics={analytics}
                    onRefreshData={refreshData}
                    onPreviewSERP={(art: Article) => setSerpPreviewArticle(art)}
                    onExitAdmin={() => navigate('/')}
                    adminEmail={adminUser?.email}
                    adminUser={adminUser}
                    onLogout={handleAdminLogout}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-4 shadow-sm">
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  Administrator Access Required
                </h2>
                <p className="text-xs text-stone-600">
                  Sign in with an authorized administrator account to access the EIRVAN Publisher Studio.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-3 bg-stone-900 hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In to Studio
                </button>
              </div>
            )
          ) : effectiveRoute.routeType === 'not-found' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading...</div>}>
              <NotFoundPage onOpenSearch={() => setIsSearchOpen(true)} />
            </Suspense>
          ) : activeArticle ? (
            <ArticleView
              article={activeArticle}
              allArticles={publishedArticles}
              adSlots={adSlots}
              onBack={() => navigate('/')}
              onSelectArticle={handleSelectArticle}
              onToggleBookmark={handleToggleBookmark}
            />
          ) : activeCategoryHub ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading {activeCategoryHub.name}...</div>}>
              <CategoryHubPage
                hub={activeCategoryHub}
                articles={activeCategoryArticles}
                currentPage={route.page || 1}
                pageSize={HOME_PAGE_SIZE}
                onSelectArticle={handleSelectArticle}
                onToggleBookmark={handleToggleBookmark}
              />
            </Suspense>
          ) : route.routeType === 'about' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading About EIRVAN...</div>}>
              <AboutPage onBackToHome={() => navigate('/')} onSelectCategory={handleSelectCategory} />
            </Suspense>
          ) : route.routeType === 'editorial-policy' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Editorial Policy...</div>}>
              <EditorialPolicyPage />
            </Suspense>
          ) : route.routeType === 'corrections-policy' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Corrections Policy...</div>}>
              <CorrectionsPolicyPage />
            </Suspense>
          ) : route.routeType === 'contact' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Contact Desk...</div>}>
              <ContactPage />
            </Suspense>
          ) : route.routeType === 'terms' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Terms...</div>}>
              <TermsPage onBackToHome={() => navigate('/')} />
            </Suspense>
          ) : route.routeType === 'privacy' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Privacy Policy...</div>}>
              <PrivacyPage onBackToHome={() => navigate('/')} />
            </Suspense>
          ) : isProductsCatalogView ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Research Monographs...</div>}>
              <ProductsView onSelectProduct={handleSelectProduct} onInitiateCheckout={handleInitiateCheckout} />
            </Suspense>
          ) : isProductDetailView && activeProduct ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Monograph...</div>}>
              <ProductDetailView
                product={activeProduct}
                onInitiateCheckout={handleInitiateCheckout}
                onBack={() => navigate('/products')}
              />
            </Suspense>
          ) : isCheckoutView ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Checkout...</div>}>
              <CheckoutView initialStep={checkoutStep} selectedProductSlug={route.queryParams.product} />
            </Suspense>
          ) : route.routeType === 'author' && activeAuthor ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading Author Dossier...</div>}>
              <AuthorProfilePage
                author={activeAuthor}
                articles={publishedArticles}
                onSelectArticle={handleSelectArticle}
                onToggleBookmark={handleToggleBookmark}
                onGoHome={() => navigate('/')}
              />
            </Suspense>
          ) : isBookmarksView ? (
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              <header className="border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-2">
                    Local Browser Reading List
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
                    Saved Articles ({bookmarkedArticles.length})
                  </h1>
                </div>
                <Link
                  href="/"
                  className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Back to Dispatch</span>
                </Link>
              </header>

              {bookmarkedArticles.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 max-w-xl mx-auto space-y-4">
                  <Bookmark className="w-8 h-8 text-stone-300 mx-auto" aria-hidden="true" />
                  <h2 className="text-lg font-serif font-bold text-stone-900">
                    No Saved Articles Yet
                  </h2>
                  <p className="text-sm text-stone-600">
                    Use the Save button on any article to store a reading shortcut in your browser.
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    Browse Published Articles
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookmarkedArticles.map((art, idx) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      variant="secondary"
                      priority={idx === 0}
                      onSelect={handleSelectArticle}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* 10-SECTION EDITORIAL HOMEPAGE (/ or /page/:n) */
            <div>
              {topLeaderboardAd && (
                <div className="pt-3">
                  <AdBanner slot={topLeaderboardAd} onRefreshData={refreshData} />
                </div>
              )}

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
                {/* SECTION 1: MASTHEAD INTRO & 5-DESK INDEX */}
                <header className="border-b border-stone-200 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
                      Explore · Learn · Stay Informed
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
                      {currentHomePage > 1
                        ? `EIRVAN Archive — Page ${currentHomePage}`
                        : 'Independent Reporting & Primary-Source Analysis'}
                    </h1>
                    <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                      Thorough, cite-checked briefings across Technology, Business, Lifestyle, Education, and News—authored with verifiable primary sources.
                    </p>
                  </div>

                  <nav
                    aria-label="Primary Editorial Categories"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Link
                      href="/"
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors min-h-[40px] flex items-center ${
                        currentHomePage === 1
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-blue-900'
                      }`}
                    >
                      All ({publishedArticles.length})
                    </Link>
                    {CATEGORY_HUBS.map(hub => {
                      const count = publishedArticles.filter(
                        a => getCategoryHubByName(a.category).slug === hub.slug
                      ).length;
                      return (
                        <Link
                          key={hub.slug}
                          href={`/category/${hub.slug}`}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white text-stone-700 border border-stone-200 hover:border-blue-900 hover:text-blue-900 transition-colors min-h-[40px] flex items-center"
                        >
                          {hub.name} ({count})
                        </Link>
                      );
                    })}
                  </nav>
                </header>

                {/* SECTION 2: LEAD FEATURED STORY (Page 1) */}
                {currentHomePage === 1 && leadArticle && (
                  <section aria-label="Featured Story">
                    <ArticleCard
                      article={leadArticle}
                      variant="lead"
                      priority
                      onSelect={handleSelectArticle}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  </section>
                )}

                {/* SECTION 3: EDITOR'S PICKS (Page 1) */}
                {currentHomePage === 1 && editorsPicks.length > 0 && (
                  <section aria-label="Editor's Picks" className="space-y-6">
                    <div className="flex items-end justify-between border-b border-stone-200 pb-3">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
                          Editor&apos;s Selection
                        </span>
                        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                          Essential Research Briefings
                        </h2>
                      </div>
                      <Link
                        href="/editorial-policy"
                        className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap"
                      >
                        Our Review Standards →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {editorsPicks.map(art => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          onSelect={handleSelectArticle}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* SECTION 4: CATEGORY SPOTLIGHT GRIDS ACROSS ALL 5 DESKS (Page 1) */}
                {currentHomePage === 1 && (
                  <section aria-label="Coverage by Editorial Desk" className="space-y-12">
                    <div className="border-b border-stone-200 pb-3">
                      <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
                        Five Editorial Desks
                      </span>
                      <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                        Explore by Subject Area
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {CATEGORY_HUBS.map(hub => {
                        const catArts = publishedArticles
                          .filter(a => getCategoryHubByName(a.category).slug === hub.slug)
                          .slice(0, 2);
                        return (
                          <div
                            key={hub.slug}
                            className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 flex flex-col justify-between"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                <div>
                                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                                    {hub.kicker}
                                  </span>
                                  <h3 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                                    {hub.name}
                                  </h3>
                                </div>
                                <Link
                                  href={`/category/${hub.slug}`}
                                  className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <span>View All</span>
                                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </Link>
                              </div>

                              <p className="text-xs text-stone-600 leading-relaxed">
                                {hub.description}
                              </p>

                              <div className="divide-y divide-stone-100">
                                {catArts.map(art => (
                                  <ArticleCard
                                    key={art.id}
                                    article={art}
                                    variant="compact"
                                    onSelect={handleSelectArticle}
                                    onToggleBookmark={handleToggleBookmark}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* SECTION 5: MID-PAGE NATIVE SPONSOR SLOT */}
                {nativeMidAd && (
                  <div className="py-2">
                    <AdBanner slot={nativeMidAd} onRefreshData={refreshData} />
                  </div>
                )}

                {/* SECTION 6: TRENDING & RECENT ARCHIVE WITH CRAWLABLE PAGINATION */}
                <section aria-label="Published Briefings Archive" className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-200 pb-3">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
                        Publication Ledger · Page {currentHomePage} of {totalHomePages}
                      </span>
                      <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                        {currentHomePage > 1
                          ? `Published Archive (Page ${currentHomePage})`
                          : 'Latest Published Dispatches & Field Guides'}
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-stone-500 tabular-nums">
                      {publishedArticles.length} Published Articles
                    </span>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 px-4 sm:px-6">
                    {archiveArticles.map(art => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="compact"
                        onSelect={handleSelectArticle}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    ))}
                  </div>

                  {totalHomePages > 1 && (
                    <nav
                      aria-label="Archive pagination"
                      className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-medium"
                    >
                      <div>
                        {currentHomePage > 1 ? (
                          <Link
                            href={getCategoryPath('all', currentHomePage - 1)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 hover:border-blue-900"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Previous Page</span>
                          </Link>
                        ) : (
                          <span className="text-stone-400">Page 1 of {totalHomePages}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalHomePages }, (_, i) => i + 1).map(p => (
                          <Link
                            key={p}
                            href={getCategoryPath('all', p)}
                            aria-current={p === currentHomePage ? 'page' : undefined}
                            className={`px-3.5 py-2 rounded-lg tabular-nums ${
                              p === currentHomePage
                                ? 'bg-stone-900 text-white font-semibold'
                                : 'bg-white border border-stone-200 text-stone-700 hover:border-blue-900'
                            }`}
                          >
                            {p}
                          </Link>
                        ))}
                      </div>

                      <div>
                        {currentHomePage < totalHomePages && (
                          <Link
                            href={getCategoryPath('all', currentHomePage + 1)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 hover:border-blue-900"
                          >
                            <span>Next Page</span>
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </nav>
                  )}
                </section>

                {/* SECTION 7: TOPIC CLUSTERS & RESEARCH COLLECTIONS */}
                <section
                  aria-label="Topic Collections"
                  className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-100 pb-4">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
                        Topical Clusters
                      </span>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1">
                        Browse Core Coverage Clusters
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CATEGORY_HUBS.map(hub => (
                      <Link
                        key={hub.slug}
                        href={`/category/${hub.slug}`}
                        className="p-4 rounded-xl bg-stone-50 border border-stone-200 hover:border-blue-900 transition-colors space-y-1.5 group"
                      >
                        <div className="text-xs font-mono uppercase text-stone-500">
                          {hub.name}
                        </div>
                        <div className="font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors">
                          {hub.pillarTopic}
                        </div>
                        <div className="text-xs text-stone-600">
                          {hub.clusters.join(' · ')}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* SECTION 8: FAQ KNOWLEDGE HUB */}
                <FAQSection articles={publishedArticles} onSelectArticle={handleSelectArticle} />

                {/* SECTION 9: READER DISPATCH INVITATION */}
                <section
                  aria-label="Weekly Dispatch and RSS Access"
                  className="bg-stone-900 text-stone-100 rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2 max-w-2xl">
                    <span className="text-xs font-mono uppercase tracking-widest text-stone-300 block">
                      Direct Publication Access
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                      Follow EIRVAN Without Paywalls or Algorithms
                    </h2>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      Every published dispatch is syndicated via open RSS 2.0 XML and cross-checked by named masthead editors.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSubscribeOpen(true)}
                      className="px-5 py-3 bg-white text-stone-900 hover:bg-stone-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Dispatch Updates
                    </button>
                    <a
                      href="/rss.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 border border-stone-600 hover:border-white text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Open RSS 2.0 Feed
                    </a>
                  </div>
                </section>

                {/* SECTION 10: EDITORIAL TRUST & VERIFICATION STRIP */}
                <section
                  aria-label="Editorial Trust Standards"
                  className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4 max-w-2xl">
                    <ShieldCheck className="w-6 h-6 text-blue-900 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <h2 className="font-serif font-bold text-lg text-stone-900">
                        Transparent Sourcing, Human Review &amp; Public Errata
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                        Read how EIRVAN separates primary reporting from opinion, discloses any AI drafting assistance, and logs timestamped factual corrections.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs font-semibold">
                    <Link
                      href="/about"
                      className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-800 hover:border-blue-900 transition-colors"
                    >
                      Masthead &amp; About
                    </Link>
                    <Link
                      href="/editorial-policy"
                      className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-800 hover:border-blue-900 transition-colors"
                    >
                      Editorial Policy
                    </Link>
                    <Link
                      href="/corrections-policy"
                      className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-800 hover:border-blue-900 transition-colors"
                    >
                      Corrections Policy
                    </Link>
                  </div>
                </section>

                {/* Trending Quick Links Fallback for Readers */}
                {trendingArticles.length > 0 && currentHomePage === 1 && (
                  <aside aria-label="Popular Briefings" className="text-xs text-stone-500 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                    <span className="font-mono uppercase tracking-wider font-semibold text-stone-700 inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Direct Briefings:</span>
                    </span>
                    {trendingArticles.map(art => (
                      <Link
                        key={art.id}
                        href={getArticlePath(art.slug)}
                        className="text-stone-600 hover:text-blue-900 underline underline-offset-4"
                      >
                        {art.title}
                      </Link>
                    ))}
                  </aside>
                )}
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

        <Suspense fallback={null}>
          {serpPreviewArticle && (
            <SERPPreviewModal
              article={serpPreviewArticle}
              allArticles={articles}
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

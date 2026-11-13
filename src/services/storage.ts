import { Article, PublicAdSlot, AdMetrics, AdMetricsLoadStatus, AdSlotConfig, VisitorAnalytics } from '../types/blog';
import { SEED_ARTICLES, DEFAULT_AD_SLOTS, DEFAULT_AD_METRICS } from '../data/seedArticles';
import { normalizeCategoryName } from '../data/categories';
import { getOptimizedImageUrl } from '../utils/seo';
import { getArticlePath } from '../utils/router';
import { validateEditorialApproval } from '../utils/editorialApproval';

const ARTICLES_KEY = 'cp_articles_v1';
const AD_SLOTS_KEY = 'cp_ad_slots_v1';
const AD_METRICS_KEY = 'cp_ad_metrics_v1';
const ANALYTICS_KEY = 'cp_analytics_v1';

export function toPublicAdSlot(raw: any): PublicAdSlot {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    type: raw.type || 'native-card',
    dimensions: String(raw.dimensions || ''),
    sponsorName: String(raw.sponsorName || ''),
    headline: String(raw.headline || ''),
    tagline: String(raw.tagline || ''),
    ctaText: String(raw.ctaText || ''),
    ctaUrl: String(raw.ctaUrl || ''),
    badgeLabel: String(raw.badgeLabel || ''),
    ...(raw.imageUrl ? { imageUrl: String(raw.imageUrl) } : {}),
    isEnabled: Boolean(raw.isEnabled)
  };
}

/**
 * Clean session analytics starting from real zeros.
 * Avoids presenting synthetic traffic spikes or fabricated Search Console queries as production data.
 */
const INITIAL_ANALYTICS: VisitorAnalytics = {
  totalPageviews: 0,
  uniqueSessions: 0,
  avgDwellSeconds: 0,
  totalDwellSeconds: 0,
  scrollMilestones: {
    milestone25: 0,
    milestone50: 0,
    milestone75: 0,
    milestone100: 0
  },
  scrollCounts: {
    milestone25: 0,
    milestone50: 0,
    milestone75: 0,
    milestone100: 0
  },
  topQueries: [],
  dailyViews: [
    { date: 'Mon', views: 0, adRevenue: 0 },
    { date: 'Tue', views: 0, adRevenue: 0 },
    { date: 'Wed', views: 0, adRevenue: 0 },
    { date: 'Thu', views: 0, adRevenue: 0 },
    { date: 'Fri', views: 0, adRevenue: 0 },
    { date: 'Sat', views: 0, adRevenue: 0 },
    { date: 'Sun', views: 0, adRevenue: 0 }
  ],
  adImpressions: 0,
  adClicks: 0,
  estimatedEarnings: 0
};

/**
 * Normalizes an article from local cache or Firestore so legacy categories,
 * old /article/ URLs, and /src/assets/images paths upgrade cleanly without trusting
 * missing or outdated human-review booleans.
 */
export function normalizeArticleRecord(raw: Article): Article {
  const seedMatch = SEED_ARTICLES.find(s => s.id === raw.id || s.slug === raw.slug);
  const rawUpdatedMs = raw.updatedAt ? Date.parse(raw.updatedAt) : NaN;
  const seedUpdatedMs = seedMatch?.updatedAt ? Date.parse(seedMatch.updatedAt) : NaN;
  const seedExplicitlyApproved =
    Boolean(seedMatch) &&
    seedMatch?.status === 'published' &&
    validateEditorialApproval(seedMatch).valid;
  const remoteApprovalCheck = validateEditorialApproval(raw);
  const remoteIncompleteOrLegacy =
    !Array.isArray(raw.sources) ||
    raw.sources.length === 0 ||
    (raw.featuredImage || '').includes('/src/assets/') ||
    raw.category !== normalizeCategoryName(raw.category) ||
    !remoteApprovalCheck.valid;
  const seedIsNewerAndVerified =
    seedExplicitlyApproved &&
    !Number.isNaN(seedUpdatedMs) &&
    (Number.isNaN(rawUpdatedMs) || (seedUpdatedMs > rawUpdatedMs && remoteIncompleteOrLegacy));

  const effectiveSource = seedIsNewerAndVerified && seedMatch
    ? {
        ...seedMatch,
        views: typeof raw.views === 'number' ? Math.max(raw.views, seedMatch.views || 0) : seedMatch.views,
        reactions: raw.reactions || seedMatch.reactions,
        isBookmarked: raw.isBookmarked ?? seedMatch.isBookmarked
      }
    : {
        ...(seedMatch || {}),
        ...raw
      };

  const category = normalizeCategoryName(effectiveSource.category);
  const normalizedCanonical =
    effectiveSource.canonicalUrl && effectiveSource.canonicalUrl.includes('/articles/')
      ? effectiveSource.canonicalUrl
      : `https://eirvan.com${getArticlePath(effectiveSource.slug)}`;

  const featuredImage = getOptimizedImageUrl(effectiveSource.featuredImage || seedMatch?.featuredImage, 1200);
  const sources =
    effectiveSource.sources && effectiveSource.sources.length > 0
      ? effectiveSource.sources
      : seedMatch?.sources || [];

  return {
    ...effectiveSource,
    category,
    canonicalUrl: normalizedCanonical,
    featuredImage,
    sources,
    previousSlugs: effectiveSource.previousSlugs || seedMatch?.previousSlugs || [],
    relatedArticleIds: effectiveSource.relatedArticleIds || seedMatch?.relatedArticleIds || [],
    robotsDirective: effectiveSource.robotsDirective || 'index, follow'
  };
}

export const StorageService = {
  getArticles(): Article[] {
    try {
      const raw = localStorage.getItem(ARTICLES_KEY);
      if (!raw) {
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(SEED_ARTICLES));
        return SEED_ARTICLES;
      }
      const stored: Article[] = JSON.parse(raw);
      if (!Array.isArray(stored) || stored.length === 0) {
        return SEED_ARTICLES;
      }

      const map = new Map<string, Article>();
      SEED_ARTICLES.forEach(s => map.set(s.id, s));
      stored.forEach(a => {
        if (a && a.id) {
          map.set(a.id, normalizeArticleRecord(a));
        }
      });

      return Array.from(map.values()).sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    } catch {
      return SEED_ARTICLES;
    }
  },

  getArticlesSync(): Article[] {
    return this.getArticles();
  },

  saveArticles(articles: Article[]): void {
    try {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    } catch (e) {
      console.warn('Failed to save articles to localStorage', e);
    }
  },

  getArticleBySlug(slug: string): Article | undefined {
    const clean = (slug || '').trim().toLowerCase();
    return this.getArticles().find(
      a => a.slug.toLowerCase() === clean || (a.previousSlugs || []).some(p => p.toLowerCase() === clean)
    );
  },

  saveArticle(article: Article): void {
    const normalized = normalizeArticleRecord(article);
    const list = this.getArticles();
    const index = list.findIndex(a => a.id === normalized.id);
    if (index >= 0) {
      list[index] = { ...normalized, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...normalized,
        publishedAt: normalized.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.saveArticles(list);
  },

  deleteArticle(id: string): void {
    const list = this.getArticles().filter(a => a.id !== id);
    this.saveArticles(list);
  },

  getAdSlots(): PublicAdSlot[] {
    try {
      const raw = localStorage.getItem(AD_SLOTS_KEY);
      if (!raw) {
        const cleanDefaults = DEFAULT_AD_SLOTS.map(toPublicAdSlot);
        localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(cleanDefaults));
        return cleanDefaults;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_AD_SLOTS.map(toPublicAdSlot);
      }
      // Always strip any legacy impressions/clicks fields from public cache
      return parsed.map(toPublicAdSlot);
    } catch {
      return DEFAULT_AD_SLOTS.map(toPublicAdSlot);
    }
  },

  getAdSlotsSync(): PublicAdSlot[] {
    return this.getAdSlots();
  },

  saveAdSlots(slots: PublicAdSlot[]): void {
    try {
      const cleanSlots = slots.map(toPublicAdSlot);
      localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(cleanSlots));
    } catch (e) {
      console.warn('Failed to save ad slots', e);
    }
  },

  getAdMetrics(): Record<string, AdMetrics> {
    try {
      const raw = localStorage.getItem(AD_METRICS_KEY);
      if (!raw) {
        return { ...DEFAULT_AD_METRICS };
      }
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : { ...DEFAULT_AD_METRICS };
    } catch {
      return { ...DEFAULT_AD_METRICS };
    }
  },

  saveAdMetricsFromFirestore(firestoreMetrics: Record<string, AdMetrics>): void {
    try {
      const current = this.getAdMetrics();
      const merged: Record<string, AdMetrics> = { ...current };
      for (const [slotId, metric] of Object.entries(firestoreMetrics)) {
        const hasImpressions = typeof metric.impressions === 'number';
        const hasClicks = typeof metric.clicks === 'number';
        const hasRevenue = typeof metric.revenue === 'number';
        merged[slotId] = {
          id: slotId,
          impressions: hasImpressions ? metric.impressions : null,
          clicks: hasClicks ? metric.clicks : null,
          impressionsStatus: hasImpressions ? 'actual' : 'missing',
          clicksStatus: hasClicks ? 'actual' : 'missing',
          revenue: hasRevenue ? metric.revenue : null,
          revenueStatus: hasRevenue ? 'actual' : 'missing',
          ...(!hasRevenue && typeof metric.estimatedRevenue === 'number'
            ? {
                estimatedRevenue: metric.estimatedRevenue,
                revenueEstimateStatus: 'estimated' as const,
                ...(metric.revenueEstimateFormula ? { revenueEstimateFormula: metric.revenueEstimateFormula } : {})
              }
            : {}),
          ...(metric.lastUpdated ? { lastUpdated: metric.lastUpdated } : {})
        };
      }
      localStorage.setItem(AD_METRICS_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to cache Firestore ad metrics', e);
    }
  },

  getCombinedAdminAdSlots(
    firestoreMetrics?: Record<string, AdMetrics>,
    metricsLoadStatus: AdMetricsLoadStatus = 'ready'
  ): AdSlotConfig[] {
    const publicSlots = this.getAdSlots();
    return publicSlots.map(slot => {
      if (metricsLoadStatus === 'permission-denied' || metricsLoadStatus === 'unavailable' || metricsLoadStatus === 'loading') {
        return {
          ...slot,
          impressions: null,
          clicks: null,
          revenue: null,
          metricsStatus: metricsLoadStatus
        };
      }

      const metric = firestoreMetrics?.[slot.id];
      if (!metric) {
        return {
          ...slot,
          impressions: null,
          clicks: null,
          revenue: null,
          metricsStatus: 'missing'
        };
      }

      const hasImpressions = typeof metric.impressions === 'number';
      const hasClicks = typeof metric.clicks === 'number';
      const hasRevenue = typeof metric.revenue === 'number';

      return {
        ...slot,
        impressions: hasImpressions ? metric.impressions : null,
        clicks: hasClicks ? metric.clicks : null,
        impressionsStatus: hasImpressions ? 'actual' : 'missing',
        clicksStatus: hasClicks ? 'actual' : 'missing',
        revenue: hasRevenue ? metric.revenue : null,
        revenueStatus: hasRevenue ? 'actual' : 'missing',
        ...(!hasRevenue && typeof metric.estimatedRevenue === 'number'
          ? {
              estimatedRevenue: metric.estimatedRevenue,
              revenueEstimateStatus: 'estimated' as const,
              ...(metric.revenueEstimateFormula ? { revenueEstimateFormula: metric.revenueEstimateFormula } : {})
            }
          : {}),
        ...(metric.lastUpdated ? { lastUpdated: metric.lastUpdated } : {}),
        metricsStatus: 'available'
      };
    });
  },

  turnOffAllAds(): PublicAdSlot[] {
    const slots = this.getAdSlots();
    const updated = slots.map(s => ({ ...s, isEnabled: false }));
    this.saveAdSlots(updated);
    return updated;
  },

  turnOnAllAds(): PublicAdSlot[] {
    const slots = this.getAdSlots();
    const updated = slots.map(s => ({ ...s, isEnabled: true }));
    this.saveAdSlots(updated);
    return updated;
  },

  recordAdImpression(_slotId: string): void {
    const analytics = this.getAnalytics();
    analytics.adImpressions = (analytics.adImpressions || 0) + 1;
    analytics.estimatedEarnings = (analytics.estimatedEarnings || 0) + 0.0034;
    this.saveAnalytics(analytics);
  },

  recordAdClick(_slotId: string): void {
    const analytics = this.getAnalytics();
    analytics.adClicks = (analytics.adClicks || 0) + 1;
    analytics.estimatedEarnings = (analytics.estimatedEarnings || 0) + 0.45;
    this.saveAnalytics(analytics);
  },

  getAnalytics(): VisitorAnalytics {
    try {
      const raw = localStorage.getItem(ANALYTICS_KEY);
      if (!raw) {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
        return INITIAL_ANALYTICS;
      }
      const parsed = JSON.parse(raw);
      // Clear pre-upgrade legacy hardcoded seed baseline (48370 synthetic pageviews)
      if (parsed && parsed.totalPageviews >= 48370 && !parsed.sessionStartedAt) {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
        return INITIAL_ANALYTICS;
      }
      return parsed;
    } catch {
      return INITIAL_ANALYTICS;
    }
  },

  saveAnalytics(analytics: VisitorAnalytics): void {
    try {
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (e) {
      console.warn('Failed to save analytics', e);
    }
  },

  recordPageView(articleId?: string): void {
    const analytics = this.getAnalytics();
    analytics.totalPageviews = (analytics.totalPageviews || 0) + 1;

    try {
      if (!sessionStorage.getItem('cp_session_active')) {
        sessionStorage.setItem('cp_session_active', '1');
        analytics.uniqueSessions = (analytics.uniqueSessions || 0) + 1;
      }
    } catch {}

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = days[new Date().getDay()];
    if (!analytics.dailyViews) analytics.dailyViews = [];
    const todayIndex = analytics.dailyViews.findIndex(d => d.date === todayStr);
    if (todayIndex >= 0) {
      analytics.dailyViews[todayIndex].views += 1;
    } else {
      analytics.dailyViews.push({ date: todayStr, views: 1, adRevenue: 0 });
    }

    this.saveAnalytics(analytics);

    if (articleId) {
      const articles = this.getArticles();
      const art = articles.find(a => a.id === articleId || a.slug === articleId);
      if (art) {
        art.views = (art.views || 0) + 1;
        this.saveArticles(articles);
      }
    }

    import('./firebase-admin').then(({ FirebaseAdminService }) => {
      FirebaseAdminService.recordTelemetryPageView(articleId).catch(() => {});
    });
  },

  recordDwellTime(seconds: number): void {
    if (seconds <= 0) return;
    const analytics = this.getAnalytics();
    const currentTotalDwell = (analytics.totalDwellSeconds || (analytics.avgDwellSeconds * analytics.totalPageviews)) + seconds;
    analytics.totalDwellSeconds = currentTotalDwell;
    analytics.avgDwellSeconds = Math.round(currentTotalDwell / Math.max(1, analytics.totalPageviews));
    this.saveAnalytics(analytics);
  },

  recordScrollMilestone(milestone: 25 | 50 | 75 | 100): void {
    const analytics = this.getAnalytics();
    if (!analytics.scrollCounts) {
      analytics.scrollCounts = {
        milestone25: 0,
        milestone50: 0,
        milestone75: 0,
        milestone100: 0
      };
    }

    const key = `milestone${milestone}` as keyof typeof analytics.scrollCounts;
    analytics.scrollCounts[key] = (analytics.scrollCounts[key] || 0) + 1;

    const total = Math.max(1, analytics.totalPageviews);
    analytics.scrollMilestones = {
      milestone25: Math.min(100, Math.round((analytics.scrollCounts.milestone25 / total) * 100)),
      milestone50: Math.min(100, Math.round((analytics.scrollCounts.milestone50 / total) * 100)),
      milestone75: Math.min(100, Math.round((analytics.scrollCounts.milestone75 / total) * 100)),
      milestone100: Math.min(100, Math.round((analytics.scrollCounts.milestone100 / total) * 100))
    };

    this.saveAnalytics(analytics);
  },

  recordSearchQuery(query: string): void {
    const normalized = query.toLowerCase().trim();
    if (!normalized || normalized.length < 2) return;
    const analytics = this.getAnalytics();
    if (!analytics.topQueries) analytics.topQueries = [];

    const existing = analytics.topQueries.find(q => q.query.toLowerCase() === normalized);
    if (existing) {
      existing.impressions += 1;
      existing.clicks += 1;
      existing.ctr = Math.min(100, Math.round((existing.clicks / Math.max(1, existing.impressions)) * 100 * 10) / 10);
    } else {
      analytics.topQueries.unshift({
        query: normalized,
        impressions: 1,
        clicks: 1,
        ctr: 100.0
      });
      if (analytics.topQueries.length > 10) {
        analytics.topQueries = analytics.topQueries.slice(0, 10);
      }
    }

    this.saveAnalytics(analytics);
  },

  resetTelemetryToZero(): VisitorAnalytics {
    const articles = this.getArticles();
    const updatedArticles = articles.map(a => ({ ...a, views: 0 }));
    this.saveArticles(updatedArticles);

    const fresh: VisitorAnalytics = { ...INITIAL_ANALYTICS };
    this.saveAnalytics(fresh);

    import('./firebase-admin').then(({ FirebaseAdminService }) => {
      FirebaseAdminService.resetAllTelemetry(articles.map(a => a.id));
    });

    return fresh;
  },

  toggleBookmark(articleId: string): boolean {
    const articles = this.getArticles();
    const art = articles.find(a => a.id === articleId);
    let newState = false;
    if (art) {
      art.isBookmarked = !art.isBookmarked;
      newState = art.isBookmarked;
      this.saveArticles(articles);
    }
    return newState;
  },

  recordReaction(articleId: string, type: 'helpful' | 'fire' | 'insightful'): { helpful: number; fire: number; insightful: number } {
    const articles = this.getArticles();
    const art = articles.find(a => a.id === articleId);
    if (!art) return { helpful: 0, fire: 0, insightful: 0 };
    if (!art.reactions) {
      art.reactions = { helpful: 0, fire: 0, insightful: 0 };
    }
    art.reactions[type] = (art.reactions[type] || 0) + 1;
    this.saveArticles(articles);
    return art.reactions;
  },

  addSubscriber(email: string): boolean {
    try {
      const raw = localStorage.getItem('cp_subscribers_v1');
      const subscribers: string[] = raw ? JSON.parse(raw) : [];
      const normalized = email.toLowerCase().trim();
      if (!subscribers.includes(normalized)) {
        subscribers.push(normalized);
        localStorage.setItem('cp_subscribers_v1', JSON.stringify(subscribers));
      }
      return true;
    } catch {
      return false;
    }
  },

  getSubscribers(): string[] {
    try {
      const raw = localStorage.getItem('cp_subscribers_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  resetToDefault(): void {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(SEED_ARTICLES));
    localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(DEFAULT_AD_SLOTS.map(toPublicAdSlot)));
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
  }
};

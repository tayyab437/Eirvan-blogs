import { Article, AdSlotConfig, VisitorAnalytics } from '../types/blog';
import { SEED_ARTICLES, DEFAULT_AD_SLOTS } from '../data/seedArticles';

const ARTICLES_KEY = 'cp_articles_v1';
const AD_SLOTS_KEY = 'cp_ad_slots_v1';
const ANALYTICS_KEY = 'cp_analytics_v1';

const INITIAL_ANALYTICS: VisitorAnalytics = {
  totalPageviews: 48370,
  uniqueSessions: 31200,
  avgDwellSeconds: 164,
  scrollMilestones: {
    milestone25: 88,
    milestone50: 72,
    milestone75: 54,
    milestone100: 38
  },
  topQueries: [
    { query: 'neuromorphic silicon edge computing 2026', impressions: 14200, clicks: 1850, ctr: 13.0 },
    { query: 'quantum annealing silicon substrates', impressions: 9800, clicks: 1120, ctr: 11.4 },
    { query: 'algorithmic arbitrage dark pools hft', impressions: 8400, clicks: 920, ctr: 10.9 },
    { query: '90 minute ultradian sprint deep work', impressions: 6900, clicks: 810, ctr: 11.7 },
    { query: 'cellular longevity nad+ trials 2026', impressions: 6100, clicks: 740, ctr: 12.1 }
  ],
  dailyViews: [
    { date: 'Mon', views: 6400, adRevenue: 48.2 },
    { date: 'Tue', views: 7100, adRevenue: 54.1 },
    { date: 'Wed', views: 7900, adRevenue: 62.8 },
    { date: 'Thu', views: 8400, adRevenue: 69.4 },
    { date: 'Fri', views: 7800, adRevenue: 61.2 },
    { date: 'Sat', views: 5200, adRevenue: 41.0 },
    { date: 'Sun', views: 5570, adRevenue: 44.5 }
  ],
  adImpressions: 112100,
  adClicks: 3490,
  estimatedEarnings: 381.20
};

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
      return stored.map(a => {
        if (a.featuredImage?.startsWith('/src/assets/images') || a.featuredImage?.startsWith('/images/')) {
          const match = SEED_ARTICLES.find(s => s.id === a.id);
          return match ? { ...a, featuredImage: match.featuredImage } : a;
        }
        return a;
      });
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
    return this.getArticles().find(a => a.slug === slug);
  },

  saveArticle(article: Article): void {
    const list = this.getArticles();
    const index = list.findIndex(a => a.id === article.id);
    if (index >= 0) {
      list[index] = { ...article, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...article, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveArticles(list);
  },

  deleteArticle(id: string): void {
    const list = this.getArticles().filter(a => a.id !== id);
    this.saveArticles(list);
  },

  getAdSlots(): AdSlotConfig[] {
    try {
      const raw = localStorage.getItem(AD_SLOTS_KEY);
      if (!raw) {
        localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(DEFAULT_AD_SLOTS));
        return DEFAULT_AD_SLOTS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_AD_SLOTS;
    }
  },

  getAdSlotsSync(): AdSlotConfig[] {
    return this.getAdSlots();
  },

  saveAdSlots(slots: AdSlotConfig[]): void {
    try {
      localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(slots));
    } catch (e) {
      console.warn('Failed to save ad slots', e);
    }
  },

  turnOffAllAds(): AdSlotConfig[] {
    const slots = this.getAdSlots();
    const updated = slots.map(s => ({ ...s, isEnabled: false }));
    this.saveAdSlots(updated);
    return updated;
  },

  turnOnAllAds(): AdSlotConfig[] {
    const slots = this.getAdSlots();
    const updated = slots.map(s => ({ ...s, isEnabled: true }));
    this.saveAdSlots(updated);
    return updated;
  },

  recordAdImpression(slotId: string): void {
    const slots = this.getAdSlots();
    const target = slots.find(s => s.id === slotId);
    if (target) {
      target.impressions += 1;
      this.saveAdSlots(slots);
      
      const analytics = this.getAnalytics();
      analytics.adImpressions += 1;
      analytics.estimatedEarnings += 0.0034;
      this.saveAnalytics(analytics);
    }
  },

  recordAdClick(slotId: string): void {
    const slots = this.getAdSlots();
    const target = slots.find(s => s.id === slotId);
    if (target) {
      target.clicks += 1;
      this.saveAdSlots(slots);

      const analytics = this.getAnalytics();
      analytics.adClicks += 1;
      analytics.estimatedEarnings += 0.45;
      this.saveAnalytics(analytics);
    }
  },

  getAnalytics(): VisitorAnalytics {
    try {
      const raw = localStorage.getItem(ANALYTICS_KEY);
      if (!raw) {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
        return INITIAL_ANALYTICS;
      }
      return JSON.parse(raw);
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

    // Track unique session in sessionStorage
    try {
      if (!sessionStorage.getItem('cp_session_active')) {
        sessionStorage.setItem('cp_session_active', '1');
        analytics.uniqueSessions = (analytics.uniqueSessions || 0) + 1;
      }
    } catch {}

    // Track daily view for today
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = days[new Date().getDay()];
    if (!analytics.dailyViews) analytics.dailyViews = [];
    const todayIndex = analytics.dailyViews.findIndex(d => d.date === todayStr);
    if (todayIndex >= 0) {
      analytics.dailyViews[todayIndex].views += 1;
      analytics.dailyViews[todayIndex].adRevenue += 0.0034;
    } else {
      analytics.dailyViews.push({ date: todayStr, views: 1, adRevenue: 0.0034 });
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

    // Sync to Firestore background
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
        milestone25: Math.round(((analytics.scrollMilestones?.milestone25 || 80) * analytics.totalPageviews) / 100),
        milestone50: Math.round(((analytics.scrollMilestones?.milestone50 || 60) * analytics.totalPageviews) / 100),
        milestone75: Math.round(((analytics.scrollMilestones?.milestone75 || 40) * analytics.totalPageviews) / 100),
        milestone100: Math.round(((analytics.scrollMilestones?.milestone100 || 20) * analytics.totalPageviews) / 100),
      };
    }

    const key = `milestone${milestone}` as keyof typeof analytics.scrollCounts;
    analytics.scrollCounts[key] = (analytics.scrollCounts[key] || 0) + 1;

    const total = Math.max(1, analytics.totalPageviews);
    analytics.scrollMilestones = {
      milestone25: Math.min(100, Math.round((analytics.scrollCounts.milestone25 / total) * 100)),
      milestone50: Math.min(100, Math.round((analytics.scrollCounts.milestone50 / total) * 100)),
      milestone75: Math.min(100, Math.round((analytics.scrollCounts.milestone75 / total) * 100)),
      milestone100: Math.min(100, Math.round((analytics.scrollCounts.milestone100 / total) * 100)),
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

    const fresh: VisitorAnalytics = {
      totalPageviews: 0,
      uniqueSessions: 0,
      avgDwellSeconds: 0,
      totalDwellSeconds: 0,
      scrollMilestones: { milestone25: 0, milestone50: 0, milestone75: 0, milestone100: 0 },
      scrollCounts: { milestone25: 0, milestone50: 0, milestone75: 0, milestone100: 0 },
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
    this.saveAnalytics(fresh);

    // One-time cleanup for Firestore as well if admin is logged in
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
    localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(DEFAULT_AD_SLOTS));
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
  }
};

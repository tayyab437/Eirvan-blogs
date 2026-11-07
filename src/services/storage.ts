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
      // Guarantee all seed articles remain available while preserving any user edits
      const idMap = new Map<string, Article>();
      SEED_ARTICLES.forEach(a => idMap.set(a.id, a));
      stored.forEach(a => {
        if (a && a.id) {
          idMap.set(a.id, a);
        }
      });
      const merged = Array.from(idMap.values());
      return merged;
    } catch {
      return SEED_ARTICLES;
    }
  },

  saveArticles(articles: Article[]): void {
    try {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    } catch (e) {
      console.error('Failed to save articles to localStorage', e);
    }
  },

  getArticleBySlug(slug: string): Article | undefined {
    const list = this.getArticles();
    return list.find(a => a.slug === slug);
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

  saveAdSlots(slots: AdSlotConfig[]): void {
    try {
      localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(slots));
    } catch (e) {
      console.error('Failed to save ad slots', e);
    }
  },

  recordAdImpression(slotId: string): void {
    const slots = this.getAdSlots();
    const target = slots.find(s => s.id === slotId);
    if (target) {
      target.impressions += 1;
      this.saveAdSlots(slots);
      
      const analytics = this.getAnalytics();
      analytics.adImpressions += 1;
      // Estimate RPM ~$3.40
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
      analytics.estimatedEarnings += 0.45; // CPC est
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
      console.error('Failed to save analytics', e);
    }
  },

  recordPageView(articleId?: string): void {
    const analytics = this.getAnalytics();
    analytics.totalPageviews += 1;
    this.saveAnalytics(analytics);

    if (articleId) {
      const articles = this.getArticles();
      const art = articles.find(a => a.id === articleId);
      if (art) {
        art.views = (art.views || 0) + 1;
        this.saveArticles(articles);
      }
    }
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

  resetToDefault(): void {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(SEED_ARTICLES));
    localStorage.setItem(AD_SLOTS_KEY, JSON.stringify(DEFAULT_AD_SLOTS));
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(INITIAL_ANALYTICS));
  }
};


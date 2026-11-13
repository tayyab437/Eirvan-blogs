import {
  doc,
  getDocFromServer,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase-config';
import { Article, PublicAdSlot, AdMetrics, VisitorAnalytics } from '../types/blog';
import { SEED_ARTICLES, DEFAULT_AD_SLOTS } from '../data/seedArticles';
import { StorageService, toPublicAdSlot, normalizeArticleRecord } from './storage';

export enum OperationType {
  GET = 'get',
  LIST = 'list',
}

export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (
    errMsg.includes('offline') ||
    errMsg.includes('ERR_TIMED_OUT') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('deadline-exceeded') ||
    errMsg.includes('permission-denied')
  ) {
    return;
  }
  console.warn('Firestore Operation Notice: ', JSON.stringify({ error: errMsg, operationType, path }));
}

/**
 * Validates connection to Firestore using getDocFromServer per Firebase skill specification
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const db = await getFirebaseDB();
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, operating in cached mode.');
      return false;
    }
    return true;
  }
}

export const FirebaseSyncService = {
  /**
   * One-time non-streaming fetch for public reader sessions.
   * Completely avoids opening persistent WebChannel Listen streams that cause ERR_TIMED_OUT.
   */
  async fetchArticlesOnce(): Promise<Article[] | null> {
    try {
      const db = await getFirebaseDB();
      const snapshot = await getDocs(
        query(collection(db, 'articles'), where('status', '==', 'published'))
      );
      if (snapshot.empty) {
        return SEED_ARTICLES;
      }
      const list: Article[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Article;
        if (data && data.id) list.push(normalizeArticleRecord(data));
      });
      if (list.length === 0) return SEED_ARTICLES;

      const idMap = new Map<string, Article>();
      SEED_ARTICLES.forEach(a => idMap.set(a.id, a));
      list.forEach(a => idMap.set(a.id, a));
      const merged = Array.from(idMap.values());
      merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      return merged;
    } catch (e) {
      handleFirestoreError(e, 'LIST', 'articles');
      return null;
    }
  },

  /**
   * Real-time subscription for authenticated Admin Studio sessions only
   */
  async subscribeArticles(onUpdate: (articles: Article[]) => void): Promise<() => void> {
    const db = await getFirebaseDB();
    const articlesCol = collection(db, 'articles');
    return onSnapshot(
      articlesCol,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(SEED_ARTICLES);
        } else {
          const list: Article[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Article;
            if (data && data.id) list.push(normalizeArticleRecord(data));
          });
          const idMap = new Map<string, Article>();
          SEED_ARTICLES.forEach(a => idMap.set(a.id, a));
          list.forEach(a => idMap.set(a.id, a));
          const merged = Array.from(idMap.values());
          merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          onUpdate(merged);
        }
      },
      (error) => {
        handleFirestoreError(error, 'LIST', 'articles');
        onUpdate(SEED_ARTICLES);
      }
    );
  },

  async fetchAdSlotsOnce(): Promise<PublicAdSlot[] | null> {
    try {
      const db = await getFirebaseDB();
      const snapshot = await getDocs(collection(db, 'adSlots'));
      if (snapshot.empty) return DEFAULT_AD_SLOTS.map(toPublicAdSlot);
      const list: PublicAdSlot[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data && (data.id || docSnap.id)) {
          list.push(toPublicAdSlot({ ...data, id: data.id || docSnap.id }));
        }
      });
      return list.length > 0 ? list : DEFAULT_AD_SLOTS.map(toPublicAdSlot);
    } catch (e) {
      handleFirestoreError(e, 'LIST', 'adSlots');
      return null;
    }
  },

  async subscribeAdSlots(onUpdate: (slots: PublicAdSlot[]) => void): Promise<() => void> {
    const db = await getFirebaseDB();
    const adSlotsCol = collection(db, 'adSlots');
    return onSnapshot(
      adSlotsCol,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(DEFAULT_AD_SLOTS.map(toPublicAdSlot));
        } else {
          const list: PublicAdSlot[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data && (data.id || docSnap.id)) {
              list.push(toPublicAdSlot({ ...data, id: data.id || docSnap.id }));
            }
          });
          const idMap = new Map<string, PublicAdSlot>();
          DEFAULT_AD_SLOTS.forEach(s => idMap.set(s.id, toPublicAdSlot(s)));
          list.forEach(s => idMap.set(s.id, s));
          onUpdate(Array.from(idMap.values()));
        }
      },
      (error) => {
        handleFirestoreError(error, 'LIST', 'adSlots');
        onUpdate(DEFAULT_AD_SLOTS.map(toPublicAdSlot));
      }
    );
  },

  /**
   * Admin-only fetch of private performance metrics from /adMetrics.
   * Distinguishes genuine empty/zero results from missing fields and permission-denied / unavailable errors.
   */
  async fetchAdMetricsOnce(): Promise<{
    status: 'ready' | 'permission-denied' | 'unavailable';
    metrics: Record<string, AdMetrics>;
    errorMessage?: string;
  }> {
    try {
      const db = await getFirebaseDB();
      const snapshot = await getDocs(collection(db, 'adMetrics'));
      const metricsMap: Record<string, AdMetrics> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const id = data?.id || docSnap.id;
        const hasImpressions = typeof data?.impressions === 'number';
        const hasClicks = typeof data?.clicks === 'number';
        const hasRevenue = typeof data?.revenue === 'number';
        metricsMap[id] = {
          id,
          impressions: hasImpressions ? data.impressions : null,
          clicks: hasClicks ? data.clicks : null,
          impressionsStatus: hasImpressions ? 'actual' : 'missing',
          clicksStatus: hasClicks ? 'actual' : 'missing',
          revenue: hasRevenue ? data.revenue : null,
          revenueStatus: hasRevenue ? 'actual' : 'missing',
          ...(!hasRevenue && typeof data?.estimatedRevenue === 'number'
            ? {
                estimatedRevenue: data.estimatedRevenue,
                revenueEstimateStatus: 'estimated' as const,
                ...(typeof data?.revenueEstimateFormula === 'string'
                  ? { revenueEstimateFormula: data.revenueEstimateFormula }
                  : {})
              }
            : {}),
          ...(typeof data?.ctr === 'number' ? { ctr: data.ctr } : {}),
          ...(data?.campaignPerformance !== undefined ? { campaignPerformance: data.campaignPerformance } : {}),
          ...(data?.internalTracking !== undefined ? { internalTracking: data.internalTracking } : {}),
          ...(data?.lastUpdated ? { lastUpdated: String(data.lastUpdated) } : {})
        };
      });
      return { status: 'ready', metrics: metricsMap };
    } catch (e) {
      const errCode = (e as { code?: string })?.code || '';
      const errMsg = e instanceof Error ? e.message : String(e);
      handleFirestoreError(e, 'LIST', 'adMetrics');
      const isPermDenied = errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions');
      return {
        status: isPermDenied ? 'permission-denied' : 'unavailable',
        metrics: {},
        errorMessage: errMsg
      };
    }
  },

  /**
   * Real-time subscription to private /adMetrics collection for authenticated Admin Studio sessions only.
   * Reports explicit load status so permission-denied during rollout is never displayed as real 0 metrics.
   */
  async subscribeAdMetrics(
    onUpdate: (metrics: Record<string, AdMetrics>) => void,
    onStatusChange?: (status: 'ready' | 'permission-denied' | 'unavailable', errorMessage?: string) => void
  ): Promise<() => void> {
    const db = await getFirebaseDB();
    const adMetricsCol = collection(db, 'adMetrics');
    return onSnapshot(
      adMetricsCol,
      (snapshot) => {
        const metricsMap: Record<string, AdMetrics> = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const id = data?.id || docSnap.id;
          const hasImpressions = typeof data?.impressions === 'number';
          const hasClicks = typeof data?.clicks === 'number';
          const hasRevenue = typeof data?.revenue === 'number';
          metricsMap[id] = {
            id,
            impressions: hasImpressions ? data.impressions : null,
            clicks: hasClicks ? data.clicks : null,
            impressionsStatus: hasImpressions ? 'actual' : 'missing',
            clicksStatus: hasClicks ? 'actual' : 'missing',
            revenue: hasRevenue ? data.revenue : null,
            revenueStatus: hasRevenue ? 'actual' : 'missing',
            ...(!hasRevenue && typeof data?.estimatedRevenue === 'number'
              ? {
                  estimatedRevenue: data.estimatedRevenue,
                  revenueEstimateStatus: 'estimated' as const,
                  ...(typeof data?.revenueEstimateFormula === 'string'
                    ? { revenueEstimateFormula: data.revenueEstimateFormula }
                    : {})
                }
              : {}),
            ...(typeof data?.ctr === 'number' ? { ctr: data.ctr } : {}),
            ...(data?.campaignPerformance !== undefined ? { campaignPerformance: data.campaignPerformance } : {}),
            ...(data?.internalTracking !== undefined ? { internalTracking: data.internalTracking } : {}),
            ...(data?.lastUpdated ? { lastUpdated: String(data.lastUpdated) } : {})
          };
        });
        onUpdate(metricsMap);
        onStatusChange?.('ready');
      },
      (error) => {
        const errCode = (error as { code?: string })?.code || '';
        const errMsg = error instanceof Error ? error.message : String(error);
        handleFirestoreError(error, 'LIST', 'adMetrics');
        const isPermDenied = errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions');
        onStatusChange?.(isPermDenied ? 'permission-denied' : 'unavailable', errMsg);
      }
    );
  },

  async subscribeAnalytics(onUpdate: (analytics: VisitorAnalytics) => void): Promise<() => void> {
    const db = await getFirebaseDB();
    const docRef = doc(db, 'analytics', 'live_telemetry');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const liveData = snapshot.data();
          const currentLocal = StorageService.getAnalytics();
          onUpdate({
            ...currentLocal,
            totalPageviews: liveData.totalPageviews || currentLocal.totalPageviews,
            // Add other live fields if recorded in Firestore
          });
        }
      },
      (error) => {
        handleFirestoreError(error, 'GET', 'analytics/live_telemetry');
      }
    );
  }
};

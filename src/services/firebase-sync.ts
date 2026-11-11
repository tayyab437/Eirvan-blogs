import {
  doc,
  getDocFromServer,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase-config';
import { Article, AdSlotConfig, VisitorAnalytics } from '../types/blog';
import { SEED_ARTICLES, DEFAULT_AD_SLOTS } from '../data/seedArticles';
import { StorageService } from './storage';

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
      const snapshot = await getDocs(collection(db, 'articles'));
      if (snapshot.empty) {
        return SEED_ARTICLES;
      }
      const list: Article[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Article;
        if (data && data.id) list.push(data);
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
            if (data && data.id) list.push(data);
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

  async fetchAdSlotsOnce(): Promise<AdSlotConfig[] | null> {
    try {
      const db = await getFirebaseDB();
      const snapshot = await getDocs(collection(db, 'adSlots'));
      if (snapshot.empty) return DEFAULT_AD_SLOTS;
      const list: AdSlotConfig[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as AdSlotConfig;
        if (data && data.id) list.push(data);
      });
      return list.length > 0 ? list : DEFAULT_AD_SLOTS;
    } catch (e) {
      handleFirestoreError(e, 'LIST', 'adSlots');
      return null;
    }
  },

  async subscribeAdSlots(onUpdate: (slots: AdSlotConfig[]) => void): Promise<() => void> {
    const db = await getFirebaseDB();
    const adSlotsCol = collection(db, 'adSlots');
    return onSnapshot(
      adSlotsCol,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(DEFAULT_AD_SLOTS);
        } else {
          const list: AdSlotConfig[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as AdSlotConfig;
            if (data && data.id) list.push(data);
          });
          const idMap = new Map<string, AdSlotConfig>();
          DEFAULT_AD_SLOTS.forEach(s => idMap.set(s.id, s));
          list.forEach(s => idMap.set(s.id, s));
          onUpdate(Array.from(idMap.values()));
        }
      },
      (error) => {
        handleFirestoreError(error, 'LIST', 'adSlots');
        onUpdate(DEFAULT_AD_SLOTS);
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

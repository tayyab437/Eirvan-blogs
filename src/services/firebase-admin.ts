import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  collection,
  increment
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase-config';
import { Article, AdSlotConfig } from '../types/blog';
import { handleFirestoreError } from './firebase-sync';

export const FirebaseAdminService = {
  async saveArticle(article: Article): Promise<void> {
    try {
      const db = await getFirebaseDB();
      await setDoc(doc(db, 'articles', article.id), {
        ...article,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'WRITE', `articles/${article.id}`);
      throw e;
    }
  },

  async deleteArticle(articleId: string): Promise<void> {
    try {
      const db = await getFirebaseDB();
      await deleteDoc(doc(db, 'articles', articleId));
    } catch (e) {
      handleFirestoreError(e, 'DELETE', `articles/${articleId}`);
      throw e;
    }
  },

  async recordAdInteraction(slotId: string, type: 'impression' | 'click'): Promise<void> {
    try {
      const db = await getFirebaseDB();
      const slotRef = doc(db, 'adSlots', slotId);
      // Using increment() for atomic, low-latency counter updates without read-before-write
      await updateDoc(slotRef, {
        [type === 'impression' ? 'impressions' : 'clicks']: increment(1)
      });
    } catch (e) {
      handleFirestoreError(e, 'UPDATE', `adSlots/${slotId}`);
    }
  },

  async recordTelemetryPageView(articleId?: string): Promise<void> {
    try {
      const db = await getFirebaseDB();
      if (articleId) {
        const artRef = doc(db, 'articles', articleId);
        await updateDoc(artRef, { views: increment(1) });
      }
      const telemetryRef = doc(db, 'analytics', 'live_telemetry');
      await setDoc(telemetryRef, {
        totalPageviews: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (e) {}
  },

  async recordPageView(articleId?: string): Promise<void> {
    return this.recordTelemetryPageView(articleId);
  },

  async resetAllTelemetry(articleIds: string[]): Promise<void> {
    try {
      const db = await getFirebaseDB();
      // Reset main analytics doc
      const telemetryRef = doc(db, 'analytics', 'live_telemetry');
      await setDoc(telemetryRef, {
        totalPageviews: 0,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      // Reset individual article views in Firestore
      for (const id of articleIds) {
        const artRef = doc(db, 'articles', id);
        await updateDoc(artRef, { views: 0 }).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore reset telemetry failure', e);
    }
  },

  async saveAdSlot(slot: AdSlotConfig): Promise<void> {
    try {
      const db = await getFirebaseDB();
      await setDoc(doc(db, 'adSlots', slot.id), slot, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'WRITE', `adSlots/${slot.id}`);
      throw e;
    }
  },

  async saveAllAdSlots(slots: AdSlotConfig[]): Promise<void> {
    try {
      const db = await getFirebaseDB();
      for (const slot of slots) {
        await setDoc(doc(db, 'adSlots', slot.id), slot, { merge: true }).catch(() => {});
      }
    } catch (e) {
      handleFirestoreError(e, 'WRITE', 'adSlots');
    }
  }
};

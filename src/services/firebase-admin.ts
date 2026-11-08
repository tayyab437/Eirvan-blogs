import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  collection
} from 'firebase/firestore';
import { db } from './firebase-config';
import { Article, AdSlotConfig } from '../types/blog';
import { handleFirestoreError } from './firebase-sync';

export const FirebaseAdminService = {
  async saveArticle(article: Article): Promise<void> {
    try {
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
      await deleteDoc(doc(db, 'articles', articleId));
    } catch (e) {
      handleFirestoreError(e, 'DELETE', `articles/${articleId}`);
      throw e;
    }
  },

  async recordAdInteraction(slotId: string, type: 'impression' | 'click'): Promise<void> {
    try {
      const slotRef = doc(db, 'adSlots', slotId);
      const snapshot = await getDocs(query(collection(db, 'adSlots')));
      const target = snapshot.docs.find(d => d.id === slotId);
      if (target) {
        const data = target.data() as AdSlotConfig;
        if (type === 'impression') {
          await updateDoc(slotRef, { impressions: (data.impressions || 0) + 1 });
        } else {
          await updateDoc(slotRef, { clicks: (data.clicks || 0) + 1 });
        }
      }
    } catch (e) {
      handleFirestoreError(e, 'UPDATE', `adSlots/${slotId}`);
    }
  },

  async recordPageView(articleId?: string): Promise<void> {
    try {
      if (articleId) {
        const artRef = doc(db, 'articles', articleId);
        // Minimal update logic
        await updateDoc(artRef, { views: (Math.floor(Math.random() * 5) + 1) + 1 });
      }
    } catch (e) {}
  }
};

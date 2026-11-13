import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  deleteField
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase-config';
import { Article, PublicAdSlot, AdMetrics, AdSlotConfig } from '../types/blog';
import { handleFirestoreError } from './firebase-sync';
import { toPublicAdSlot } from './storage';
import {
  validateEditorialApproval,
  invalidateApprovalOnSubstantiveChange
} from '../utils/editorialApproval';

export const FirebaseAdminService = {
  async saveArticle(article: Article, previousArticle?: Article | null): Promise<void> {
    const normalizedInput = previousArticle
      ? invalidateApprovalOnSubstantiveChange(previousArticle, article)
      : article;

    if (
      ['approved', 'scheduled', 'published'].includes(article.status) &&
      normalizedInput.status !== article.status
    ) {
      throw new Error(
        `Editorial Gate Blocked: Status "${article.status}" rejected because substantive content changed since prior approval. Re-approval by an authorized reviewer is required.`
      );
    }

    if (['approved', 'scheduled', 'published'].includes(normalizedInput.status)) {
      const check = validateEditorialApproval(normalizedInput);
      if (!check.valid) {
        throw new Error(
          `Editorial Gate Blocked: Status "${normalizedInput.status}" rejected. ${check.reason}`
        );
      }
    }
    try {
      const db = await getFirebaseDB();
      const { editorialNotes, ...publicFields } = normalizedInput;
      const includeNotesOnDraft = normalizedInput.status !== 'published' ? editorialNotes : undefined;
      const approvalCleared =
        !normalizedInput.approval &&
        Boolean(
          previousArticle?.approval ||
            previousArticle?.reviewer ||
            previousArticle?.reviewedAt ||
            previousArticle?.reviewedRevisionHash
        );
      const cleanedPayload = Object.fromEntries(
        Object.entries({
          ...publicFields,
          ...(includeNotesOnDraft ? { editorialNotes: includeNotesOnDraft } : {}),
          ...(approvalCleared
            ? {
                approval: deleteField(),
                reviewer: deleteField(),
                reviewedAt: deleteField(),
                reviewedRevisionHash: deleteField()
              }
            : {}),
          updatedAt: normalizedInput.updatedAt || new Date().toISOString()
        }).filter(([, value]) => value !== undefined)
      );
      await setDoc(doc(db, 'articles', normalizedInput.id), cleanedPayload, { merge: true });
      if (editorialNotes && editorialNotes.trim().length > 0) {
        await setDoc(
          doc(db, 'articlePrivate', normalizedInput.id),
          {
            articleId: normalizedInput.id,
            editorialNotes: editorialNotes.trim(),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }
    } catch (e) {
      handleFirestoreError(e, 'WRITE', `articles/${normalizedInput.id}`);
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

  /**
   * Public browsers must NEVER write impressions or clicks into /adSlots or /adMetrics.
   * Global impression/click aggregation requires a trusted server-side endpoint using Firebase Admin SDK.
   */
  async recordAdInteraction(_slotId: string, _type: 'impression' | 'click'): Promise<void> {
    // Intentionally disabled on client SDK to prevent public metric manipulation and /adSlots contamination.
    return;
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

  /**
   * Saves public creative ad configuration to /adSlots/{slotId} ONLY.
   * Writes strictly the allowlisted PublicAdSlot fields without merge so no legacy private metrics
   * (impressions, clicks, revenue, ctr, campaignPerformance, internalTracking) can remain.
   */
  async savePublicAdSlot(slot: PublicAdSlot): Promise<void> {
    try {
      const db = await getFirebaseDB();
      const publicConfig = toPublicAdSlot(slot);
      await setDoc(doc(db, 'adSlots', slot.id), publicConfig);
    } catch (e) {
      handleFirestoreError(e, 'WRITE', `adSlots/${slot.id}`);
      throw e;
    }
  },

  /**
   * Saves private advertising performance metrics to /adMetrics/{slotId} ONLY.
   */
  async saveAdMetrics(metrics: AdMetrics): Promise<void> {
    try {
      const db = await getFirebaseDB();
      const hasImpressions = typeof metrics.impressions === 'number';
      const hasClicks = typeof metrics.clicks === 'number';
      const hasRevenue = typeof metrics.revenue === 'number';
      await setDoc(
        doc(db, 'adMetrics', metrics.id),
        {
          id: metrics.id,
          impressions: hasImpressions ? metrics.impressions : null,
          clicks: hasClicks ? metrics.clicks : null,
          impressionsStatus: hasImpressions ? 'actual' : 'missing',
          clicksStatus: hasClicks ? 'actual' : 'missing',
          ...(metrics.revenue !== undefined
            ? {
                revenue: hasRevenue ? metrics.revenue : null,
                revenueStatus: hasRevenue ? 'actual' : 'missing'
              }
            : {}),
          lastUpdated: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(e, 'WRITE', `adMetrics/${metrics.id}`);
      throw e;
    }
  },

  async saveAdSlot(slot: PublicAdSlot | AdSlotConfig): Promise<void> {
    await this.savePublicAdSlot(slot);
    if (
      ('impressions' in slot && typeof slot.impressions === 'number') ||
      ('clicks' in slot && typeof slot.clicks === 'number')
    ) {
      await this.saveAdMetrics({
        id: slot.id,
        impressions: typeof (slot as AdSlotConfig).impressions === 'number' ? ((slot as AdSlotConfig).impressions as number) : null,
        clicks: typeof (slot as AdSlotConfig).clicks === 'number' ? ((slot as AdSlotConfig).clicks as number) : null,
        ...(typeof (slot as AdSlotConfig).revenue === 'number' ? { revenue: (slot as AdSlotConfig).revenue } : {})
      }).catch(() => {});
    }
  },

  async saveAllPublicAdSlots(slots: PublicAdSlot[]): Promise<void> {
    for (const slot of slots) {
      await this.savePublicAdSlot(slot);
    }
  },

  async saveAllAdSlots(slots: PublicAdSlot[] | AdSlotConfig[]): Promise<void> {
    await this.saveAllPublicAdSlots(slots);
  }
};

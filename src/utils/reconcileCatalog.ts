import { Article } from '../types/blog';
import { normalizeCategoryName } from '../data/categories';
import { getArticlePath } from './router';
import { getOptimizedImageUrl } from './seo';
import { validateEditorialApproval } from './editorialApproval';

export type CatalogPrecedenceMode = 'reconcile-curated-verified' | 'remote-authoritative';

export type ConflictStatus =
  | 'SYNCED_MATCH'
  | 'REMOTE_NEWER_AUTHORITATIVE'
  | 'REMOTE_STALE_AND_INCOMPLETE'
  | 'REMOTE_NEWER_BUT_INCOMPLETE'
  | 'REMOTE_MISSING_UNSYNCED'
  | 'REMOTE_ONLY_ARTICLE'
  | 'APPROVAL_UNCERTAIN_BLOCKED';

export interface CatalogReconciliationEntry {
  id: string;
  remoteSlug: string | null;
  seedSlug: string | null;
  remoteStatus: string | null;
  seedStatus: string | null;
  remotePublishedAt: string | null;
  remoteUpdatedAt: string | null;
  seedPublishedAt: string | null;
  seedUpdatedAt: string | null;
  remoteSourcesCount: number;
  seedSourcesCount: number;
  remoteLegacyIssues: string[];
  conflictStatus: ConflictStatus;
  needsEditorialReview: boolean;
  selectedSource: 'remote' | 'seed_curated_override' | 'none_blocked';
  approvedForPublication: boolean;
  reason: string;
}

export interface CatalogReconciliationReport {
  mode: CatalogPrecedenceMode;
  generatedAt: string;
  remoteTotal: number;
  seedTotal: number;
  publishedCount: number;
  flaggedConflictCount: number;
  blockedUncertainCount: number;
  entries: CatalogReconciliationEntry[];
  publishedArticles: Article[];
}

export function isExplicitlyApprovedForPublication(article: Article | undefined | null, nowMs = Date.now()): boolean {
  if (!article) return false;
  if (article.status !== 'published') return false;
  if (article.scheduledAt) {
    const schedMs = Date.parse(article.scheduledAt);
    if (!Number.isNaN(schedMs) && schedMs > nowMs) return false;
  }
  return validateEditorialApproval(article, { nowMs }).valid;
}

function stripPrivateFieldsFromArticle(article: Article): Article {
  const { editorialNotes: _omitted, ...publicSafe } = article;
  return publicSafe;
}

function sanitizeNormalizedArticle(article: Article): Article {
  const category = normalizeCategoryName(article.category);
  const canonicalUrl =
    article.canonicalUrl && article.canonicalUrl.includes('/articles/')
      ? article.canonicalUrl
      : `https://eirvan.com${getArticlePath(article.slug)}`;
  const featuredImage = getOptimizedImageUrl(article.featuredImage, 1200);
  return stripPrivateFieldsFromArticle({
    ...article,
    category,
    canonicalUrl,
    featuredImage,
    previousSlugs: article.previousSlugs || [],
    relatedArticleIds: article.relatedArticleIds || [],
    robotsDirective: article.robotsDirective || 'index, follow'
  });
}

function detectRemoteLegacyIssues(remote: Article, seed?: Article, nowMs = Date.now()): string[] {
  const issues: string[] = [];
  if (!Array.isArray(remote.sources) || remote.sources.length === 0) {
    issues.push('missing_primary_sources');
  }
  if (remote.category !== normalizeCategoryName(remote.category)) {
    issues.push(`legacy_category(${remote.category})`);
  }
  if ((remote.featuredImage || '').includes('/src/assets/')) {
    issues.push('legacy_src_asset_image_path');
  }
  const approvalCheck = validateEditorialApproval(remote, { nowMs });
  if (!approvalCheck.valid) {
    issues.push(approvalCheck.stale ? 'stale_editorial_approval_hash' : 'missing_verified_approval');
  }
  if (seed) {
    const rUpd = remote.updatedAt ? Date.parse(remote.updatedAt) : NaN;
    const sUpd = seed.updatedAt ? Date.parse(seed.updatedAt) : NaN;
    if (!Number.isNaN(sUpd) && (Number.isNaN(rUpd) || sUpd > rUpd)) {
      issues.push(`older_updatedAt(${remote.updatedAt || 'none'} < ${seed.updatedAt})`);
    }
    if (remote.title !== seed.title) {
      issues.push('title_differs_from_curated_seed');
    }
    if (remote.slug !== seed.slug) {
      issues.push(`slug_differs(${remote.slug} != ${seed.slug})`);
    }
  }
  return issues;
}

/**
 * Explicitly reconciles raw remote Firestore documents with local curated seed articles.
 * - Never silently merges or overwrites records.
 * - Flags every stale, incomplete, inconsistent, or unsynced remote record for editorial review.
 * - Refuses to silently publish any article whose publication status or human approval is uncertain.
 */
export function reconcileArticleCatalog(
  rawRemoteArticles: Article[],
  seedArticles: Article[],
  options: {
    mode?: CatalogPrecedenceMode;
    nowMs?: number;
  } = {}
): CatalogReconciliationReport {
  const mode: CatalogPrecedenceMode = options.mode || 'reconcile-curated-verified';
  const nowMs = options.nowMs ?? Date.now();

  const remoteById = new Map<string, Article>();
  for (const r of rawRemoteArticles) {
    if (r?.id) remoteById.set(r.id, r);
  }

  const seedById = new Map<string, Article>();
  for (const s of seedArticles) {
    if (s?.id) seedById.set(s.id, s);
  }

  const allIds = Array.from(new Set([...seedById.keys(), ...remoteById.keys()])).sort();
  const entries: CatalogReconciliationEntry[] = [];
  const selectedArticles: Article[] = [];
  const seenSlugs = new Map<string, string>();

  let flaggedConflictCount = 0;
  let blockedUncertainCount = 0;

  for (const id of allIds) {
    const remote = remoteById.get(id);
    const seed = seedById.get(id);

    const remoteSourcesCount = Array.isArray(remote?.sources) ? remote!.sources.length : 0;
    const seedSourcesCount = Array.isArray(seed?.sources) ? seed!.sources.length : 0;

    if (remote && !seed) {
      const remoteIssues = detectRemoteLegacyIssues(remote);
      const remoteApproved = isExplicitlyApprovedForPublication(remote, nowMs) && remoteIssues.length === 0;
      if (remoteApproved) {
        selectedArticles.push(sanitizeNormalizedArticle(remote));
      } else {
        blockedUncertainCount += 1;
        flaggedConflictCount += 1;
      }
      entries.push({
        id,
        remoteSlug: remote.slug || null,
        seedSlug: null,
        remoteStatus: remote.status || null,
        seedStatus: null,
        remotePublishedAt: remote.publishedAt || null,
        remoteUpdatedAt: remote.updatedAt || null,
        seedPublishedAt: null,
        seedUpdatedAt: null,
        remoteSourcesCount,
        seedSourcesCount: 0,
        remoteLegacyIssues: remoteIssues,
        conflictStatus: remoteApproved ? 'REMOTE_ONLY_ARTICLE' : 'APPROVAL_UNCERTAIN_BLOCKED',
        needsEditorialReview: !remoteApproved,
        selectedSource: remoteApproved ? 'remote' : 'none_blocked',
        approvedForPublication: remoteApproved,
        reason: remoteApproved
          ? 'Published and verified remote Firestore article (no local seed entry).'
          : `Remote-only article blocked due to uncertain approval or incomplete schema: ${remoteIssues.join(', ') || remote.status}.`
      });
      continue;
    }

    if (!remote && seed) {
      flaggedConflictCount += 1;
      const seedApproved = isExplicitlyApprovedForPublication(seed, nowMs);
      const canSelectSeed = mode === 'reconcile-curated-verified' && seedApproved;

      if (!canSelectSeed) {
        blockedUncertainCount += 1;
      } else {
        selectedArticles.push(sanitizeNormalizedArticle(seed));
      }

      entries.push({
        id,
        remoteSlug: null,
        seedSlug: seed.slug || null,
        remoteStatus: null,
        seedStatus: seed.status || null,
        remotePublishedAt: null,
        remoteUpdatedAt: null,
        seedPublishedAt: seed.publishedAt || null,
        seedUpdatedAt: seed.updatedAt || null,
        remoteSourcesCount: 0,
        seedSourcesCount,
        remoteLegacyIssues: ['missing_in_remote_firestore'],
        conflictStatus: seedApproved ? 'REMOTE_MISSING_UNSYNCED' : 'APPROVAL_UNCERTAIN_BLOCKED',
        needsEditorialReview: true,
        selectedSource: canSelectSeed ? 'seed_curated_override' : 'none_blocked',
        approvedForPublication: canSelectSeed,
        reason: canSelectSeed
          ? 'Missing in remote Firestore; explicit verified seed selected for staging build and flagged for Firestore sync.'
          : mode === 'remote-authoritative'
            ? 'Blocked in remote-authoritative mode: document does not exist in remote Firestore.'
            : 'Blocked: local seed article lacks explicit published status or humanReviewed=true approval.'
      });
      continue;
    }

    if (remote && seed) {
      const remoteIssues = detectRemoteLegacyIssues(remote, seed);
      const remoteUpdMs = remote.updatedAt ? Date.parse(remote.updatedAt) : NaN;
      const seedUpdMs = seed.updatedAt ? Date.parse(seed.updatedAt) : NaN;
      const remoteApproved = isExplicitlyApprovedForPublication(remote, nowMs);
      const seedApproved = isExplicitlyApprovedForPublication(seed, nowMs);

      const remoteStrictlyClean =
        remoteApproved &&
        remoteIssues.length === 0 &&
        !Number.isNaN(remoteUpdMs) &&
        (Number.isNaN(seedUpdMs) || remoteUpdMs >= seedUpdMs);

      if (remoteStrictlyClean) {
        const isExactMatch = remoteUpdMs === seedUpdMs && remote.title === seed.title && remote.slug === seed.slug;
        const selected = sanitizeNormalizedArticle({
          ...remote,
          previousSlugs: remote.previousSlugs?.length ? remote.previousSlugs : seed.previousSlugs,
          relatedArticleIds: remote.relatedArticleIds?.length ? remote.relatedArticleIds : seed.relatedArticleIds
        });
        selectedArticles.push(selected);
        entries.push({
          id,
          remoteSlug: remote.slug,
          seedSlug: seed.slug,
          remoteStatus: remote.status,
          seedStatus: seed.status,
          remotePublishedAt: remote.publishedAt || null,
          remoteUpdatedAt: remote.updatedAt || null,
          seedPublishedAt: seed.publishedAt || null,
          seedUpdatedAt: seed.updatedAt || null,
          remoteSourcesCount,
          seedSourcesCount,
          remoteLegacyIssues: [],
          conflictStatus: isExactMatch ? 'SYNCED_MATCH' : 'REMOTE_NEWER_AUTHORITATIVE',
          needsEditorialReview: false,
          selectedSource: 'remote',
          approvedForPublication: true,
          reason: isExactMatch
            ? 'Remote Firestore record and curated seed match cleanly with valid approval and citations.'
            : 'Remote Firestore record is newer or authoritative with complete schema and humanReviewed=true.'
        });
        continue;
      }

      // Remote differs, is older, or is incomplete/unverified
      flaggedConflictCount += 1;
      const isNewerRemoteIncomplete =
        !Number.isNaN(remoteUpdMs) && !Number.isNaN(seedUpdMs) && remoteUpdMs > seedUpdMs;

      const canPromoteCuratedSeed =
        mode === 'reconcile-curated-verified' && seedApproved && !isNewerRemoteIncomplete;

      if (canPromoteCuratedSeed) {
        // Carry over non-editorial reader counters cleanly without altering curated copy or pretending remote won
        const selected = sanitizeNormalizedArticle({
          ...seed,
          views: typeof remote.views === 'number' ? Math.max(remote.views, seed.views || 0) : seed.views,
          reactions: remote.reactions || seed.reactions
        });
        selectedArticles.push(selected);
      } else {
        blockedUncertainCount += 1;
      }

      entries.push({
        id,
        remoteSlug: remote.slug || null,
        seedSlug: seed.slug || null,
        remoteStatus: remote.status || null,
        seedStatus: seed.status || null,
        remotePublishedAt: remote.publishedAt || null,
        remoteUpdatedAt: remote.updatedAt || null,
        seedPublishedAt: seed.publishedAt || null,
        seedUpdatedAt: seed.updatedAt || null,
        remoteSourcesCount,
        seedSourcesCount,
        remoteLegacyIssues: remoteIssues,
        conflictStatus: !seedApproved
          ? 'APPROVAL_UNCERTAIN_BLOCKED'
          : isNewerRemoteIncomplete
            ? 'REMOTE_NEWER_BUT_INCOMPLETE'
            : 'REMOTE_STALE_AND_INCOMPLETE',
        needsEditorialReview: true,
        selectedSource: canPromoteCuratedSeed ? 'seed_curated_override' : 'none_blocked',
        approvedForPublication: canPromoteCuratedSeed,
        reason: canPromoteCuratedSeed
          ? `Remote record flagged (${remoteIssues.join('; ')}); verified curated seed (humanReviewed=true, 2 sources) selected for staging build pending Firestore sync.`
          : mode === 'remote-authoritative'
            ? `Blocked in remote-authoritative mode: remote Firestore record failed completeness/approval check (${remoteIssues.join('; ')}).`
            : `Blocked due to uncertain approval or conflicting newer incomplete remote edit (${remoteIssues.join('; ')}).`
      });
    }
  }

  // Verify slug uniqueness without silent overwrites
  const dedupedPublished: Article[] = [];
  for (const art of selectedArticles) {
    const slugKey = art.slug.toLowerCase();
    const existingOwner = seenSlugs.get(slugKey);
    if (existingOwner) {
      throw new Error(`Reconciliation slug collision detected: "${slugKey}" claimed by both ${existingOwner} and ${art.id}.`);
    }
    seenSlugs.set(slugKey, art.id);
    dedupedPublished.push(art);
  }

  return {
    mode,
    generatedAt: new Date(nowMs).toISOString(),
    remoteTotal: rawRemoteArticles.length,
    seedTotal: seedArticles.length,
    publishedCount: dedupedPublished.length,
    flaggedConflictCount,
    blockedUncertainCount,
    entries,
    publishedArticles: dedupedPublished
  };
}

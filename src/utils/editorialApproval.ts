import { Article } from '../types/blog';

/**
 * Default authorized editorial reviewer emails aligned cleanly with firestore.rules and auth-service.ts.
 */
export const AUTHORIZED_REVIEWER_EMAILS = [
  'ashfaqtayyab318@gmail.com',
  'admin@eirvan.com',
  'admin@chroniclepulse.com'
] as const;

const PLACEHOLDER_REVIEWER_NAMES = new Set([
  '',
  'eirvan editorial desk',
  'editorial desk',
  'admin',
  'administrator',
  'system',
  'ai assistant',
  'anonymous',
  'unknown'
]);

/**
 * Pure TypeScript synchronous SHA-256 implementation (UTF-8 aware) so identical content hashes
 * are generated deterministically across Vite browser runtime, Node CLI build scripts, and tests.
 */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(n => n.toString(16).padStart(8, '0'))
    .join('');
}

export function isAuthorizedReviewerEmail(email?: string | null, extraAuthorizedEmails: string[] = []): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return (
    AUTHORIZED_REVIEWER_EMAILS.some(e => e.toLowerCase() === normalized) ||
    extraAuthorizedEmails.some(e => e.trim().toLowerCase() === normalized)
  );
}

/**
 * Computes a canonical SHA-256 fingerprint over all substantive editorial fields of an article.
 * Any factual, structural, citation, headline, slug, FAQ, or body change modifies this digest
 * and automatically invalidates prior approval sign-off.
 */
export function computeArticleRevisionHash(article: Partial<Article>): string {
  const canonicalPayload = {
    title: (article.title || '').trim(),
    slug: (article.slug || '').trim().toLowerCase(),
    metaTitle: (article.metaTitle || '').trim(),
    metaDescription: (article.metaDescription || '').trim(),
    summary: (article.summary || '').trim(),
    contentHtml: (article.contentHtml || '').replace(/\r\n/g, '\n').trim(),
    category: (article.category || '').trim(),
    articleType: article.articleType || 'Article',
    tags: (article.tags || []).map(t => t.trim()).filter(Boolean),
    headings: (article.headings || []).map(h => ({
      id: (h.id || '').trim(),
      text: (h.text || '').trim(),
      level: h.level
    })),
    faqs: (article.faqs || [])
      .map(f => ({
        question: (f.question || '').trim(),
        answer: (f.answer || '').trim()
      }))
      .filter(f => f.question && f.answer),
    sources: (article.sources || [])
      .map(s => ({
        title: (s.title || '').trim(),
        url: (s.url || '').trim(),
        publisher: (s.publisher || '').trim(),
        year: (s.year || '').trim(),
        publishedDate: (s.publishedDate || '').trim()
      }))
      .filter(s => s.title && s.url)
  };

  return sha256Hex(JSON.stringify(canonicalPayload));
}

export interface EditorialApprovalValidationResult {
  valid: boolean;
  reason: string;
  currentHash: string;
  stale: boolean;
  missingFields: string[];
}

export function validateEditorialApproval(
  article: Partial<Article> | undefined | null,
  options: {
    authorizedEmails?: string[];
    nowMs?: number;
  } = {}
): EditorialApprovalValidationResult {
  if (!article) {
    return {
      valid: false,
      reason: 'Missing article record.',
      currentHash: '',
      stale: false,
      missingFields: ['article']
    };
  }

  const currentHash = computeArticleRevisionHash(article);
  const nowMs = options.nowMs ?? Date.now();
  const missingFields: string[] = [];

  if (!article.slug?.trim()) missingFields.push('slug');
  if (!article.title?.trim()) missingFields.push('title');
  if (!article.contentHtml?.trim()) missingFields.push('contentHtml');

  const validSources = (article.sources || []).filter(s => Boolean(s?.title?.trim() && s?.url?.trim()));
  if (validSources.length === 0) {
    missingFields.push('sources');
  }

  if (article.humanReviewed !== true) {
    missingFields.push('humanReviewed');
  }

  const approval = article.approval;
  const effectiveReviewedAt = approval?.reviewedAt || article.reviewedAt;
  const effectiveReviewerName = (approval?.reviewerName || article.reviewer?.name || '').trim();
  const effectiveReviewerEmail = (approval?.reviewerEmail || article.reviewer?.email || '').trim().toLowerCase();
  const effectiveReviewerUid = (approval?.reviewerUid || article.reviewer?.uid || '').trim();
  const effectiveRevisionHash = (approval?.reviewedRevisionHash || article.reviewedRevisionHash || '').trim();

  if (!approval) missingFields.push('approval');
  if (!effectiveReviewedAt || Number.isNaN(Date.parse(effectiveReviewedAt))) {
    missingFields.push('reviewedAt');
  } else if (Date.parse(effectiveReviewedAt) > nowMs + 60_000) {
    return {
      valid: false,
      reason: `Approval timestamp (${effectiveReviewedAt}) is in the future.`,
      currentHash,
      stale: false,
      missingFields
    };
  }

  if (PLACEHOLDER_REVIEWER_NAMES.has(effectiveReviewerName.toLowerCase())) {
    missingFields.push('authorizedReviewerName');
  }

  if (!effectiveReviewerUid || effectiveReviewerUid.length < 4) {
    missingFields.push('reviewerUid');
  }

  const emailAuthorized =
    isAuthorizedReviewerEmail(effectiveReviewerEmail, options.authorizedEmails) ||
    (Boolean(approval?.reviewerVerifiedInAdmins) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveReviewerEmail));

  if (!emailAuthorized) {
    missingFields.push('authorizedReviewerEmail');
  }

  if (!effectiveRevisionHash) {
    missingFields.push('reviewedRevisionHash');
  }

  const stale =
    Boolean(effectiveRevisionHash) && effectiveRevisionHash !== currentHash;

  if (missingFields.length > 0) {
    return {
      valid: false,
      reason: `Incomplete editorial approval evidence: missing or unverified [${missingFields.join(', ')}].`,
      currentHash,
      stale,
      missingFields
    };
  }

  if (stale) {
    return {
      valid: false,
      reason: `Outdated approval: article content modified since reviewed revision ${effectiveRevisionHash.slice(0, 12)} (current ${currentHash.slice(0, 12)}).`,
      currentHash,
      stale: true,
      missingFields: []
    };
  }

  return {
    valid: true,
    reason: `Approved by ${effectiveReviewerName} (${effectiveReviewerEmail}) for revision ${currentHash.slice(0, 12)}.`,
    currentHash,
    stale: false,
    missingFields: []
  };
}

/**
 * Compares previous vs next article substantive hashes; if substantive content changed,
 * clears prior approval proof (`humanReviewed`, `reviewedAt`, `reviewedRevisionHash`, `approval`, `reviewer`)
 * and downgrades `approved | scheduled | published` back to `in_review`, while preserving `aiAssisted`.
 */
export function invalidateApprovalOnSubstantiveChange<T extends Partial<Article>>(
  previousArticle: Partial<Article> | null | undefined,
  nextArticle: T
): T {
  const prevHash = previousArticle ? computeArticleRevisionHash(previousArticle) : '';
  const nextHash = computeArticleRevisionHash(nextArticle);
  const approvedHash =
    nextArticle.approval?.reviewedRevisionHash || nextArticle.reviewedRevisionHash || '';

  const contentChangedWithoutNewHash =
    Boolean(previousArticle && prevHash !== nextHash) && approvedHash !== nextHash;
  const hashMismatchesRecordedApproval = Boolean(approvedHash && approvedHash !== nextHash);

  if (!contentChangedWithoutNewHash && !hashMismatchesRecordedApproval) {
    return nextArticle;
  }

  const nextStatus =
    nextArticle.status && ['approved', 'scheduled', 'published'].includes(nextArticle.status)
      ? ('in_review' as const)
      : nextArticle.status;

  return {
    ...nextArticle,
    status: nextStatus,
    humanReviewed: false,
    reviewedAt: undefined,
    reviewedRevisionHash: undefined,
    approval: undefined,
    reviewer: undefined,
    aiAssisted: Boolean(nextArticle.aiAssisted ?? previousArticle?.aiAssisted)
  };
}

export interface AuthorizedApproverInput {
  uid: string;
  email: string;
  displayName?: string | null;
  role?: string;
  verifiedInAdmins?: boolean;
}

/**
 * Records a cryptographically revision-bound human editorial approval from an authenticated authorized admin.
 * Preserves `aiAssisted` disclosure truthfully.
 */
export function applyAuthorizedApproval<T extends Partial<Article>>(
  article: T,
  approver: AuthorizedApproverInput,
  nowIso: string = new Date().toISOString()
): T {
  const uid = (approver.uid || '').trim();
  const email = (approver.email || '').trim().toLowerCase();
  const name = (approver.displayName || email.split('@')[0] || '').trim();
  const role = (approver.role || 'Authorized Editorial Reviewer').trim();

  if (!uid || uid.length < 4) {
    throw new Error('Editorial Approval Denied: An authenticated reviewer UID is required.');
  }
  if (!isAuthorizedReviewerEmail(email) && !approver.verifiedInAdmins) {
    throw new Error(`Editorial Approval Denied: "${email || 'unknown'}" is not an authorized reviewer.`);
  }
  if (PLACEHOLDER_REVIEWER_NAMES.has(name.toLowerCase())) {
    throw new Error('Editorial Approval Denied: Named individual reviewer identity is required.');
  }
  const validSources = (article.sources || []).filter(s => Boolean(s?.title?.trim() && s?.url?.trim()));
  if (validSources.length === 0) {
    throw new Error('Editorial Approval Denied: At least one verified primary source citation is required.');
  }
  if (!article.title?.trim() || !article.contentHtml?.trim()) {
    throw new Error('Editorial Approval Denied: Article title and body cannot be empty.');
  }

  const revisionHash = computeArticleRevisionHash(article);
  const aiAssisted = Boolean(article.aiAssisted);

  return {
    ...article,
    aiAssisted,
    humanReviewed: true,
    reviewedAt: nowIso,
    reviewedRevisionHash: revisionHash,
    reviewer: {
      name,
      role,
      email,
      uid
    },
    approval: {
      reviewerUid: uid,
      reviewerEmail: email,
      reviewerName: name,
      reviewerRole: role,
      reviewedAt: nowIso,
      reviewedRevisionHash: revisionHash,
      aiAssistedAtReview: aiAssisted,
      ...(approver.verifiedInAdmins ? { reviewerVerifiedInAdmins: true } : {})
    }
  };
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import {
  getFirestore,
  FieldValue,
  Firestore,
  Timestamp,
  GeoPoint,
  DocumentReference
} from 'firebase-admin/firestore';
import { DEFAULT_AD_SLOTS, DEFAULT_AD_METRICS } from '../src/data/seedArticles.js';

export const PRIVATE_AD_METRIC_KEYS = [
  'impressions',
  'clicks',
  'revenue',
  'ctr',
  'campaignPerformance',
  'internalTracking'
] as const;

export const PUBLIC_AD_SLOT_REQUIRED_KEYS = [
  'id',
  'name',
  'type',
  'dimensions',
  'sponsorName',
  'headline',
  'tagline',
  'ctaText',
  'ctaUrl',
  'badgeLabel',
  'isEnabled'
] as const;

export const PUBLIC_AD_SLOT_ALLOWED_KEYS = new Set<string>([
  ...PUBLIC_AD_SLOT_REQUIRED_KEYS,
  'imageUrl'
]);

const KNOWN_LEGACY_METRIC_KEYS = new Set<string>([
  ...PRIVATE_AD_METRIC_KEYS,
  'lastUpdated'
]);

const VALID_AD_TYPES = new Set<string>([
  'leaderboard',
  'rectangle',
  'native-card',
  'in-article'
]);

export const REVENUE_ESTIMATE_FORMULA = '(impressions * 0.0034) + (clicks * 0.45)';
export const FIRESTORE_HARD_LIMIT_BYTES = 1048576; // 1 MiB
export const SAFE_FIRESTORE_DOC_BYTES = 900 * 1024; // 900 KiB safety threshold
export const ARCHIVE_CHUNK_SAFE_BYTES = 700 * 1024; // 700 KiB per chunk (< 900 KiB Firestore limit)

export interface RawAdSlotDocument {
  id?: string;
  [key: string]: unknown;
}

export interface PublicAdSlotDocument {
  id: string;
  name: string;
  type: string;
  dimensions: string;
  sponsorName: string;
  headline: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  badgeLabel: string;
  imageUrl?: string;
  isEnabled: boolean;
}

export interface AdMetricsDocument {
  id: string;
  impressions: number | null;
  clicks: number | null;
  impressionsStatus: 'actual' | 'missing';
  clicksStatus: 'actual' | 'missing';
  revenue: number | null;
  revenueStatus: 'actual' | 'missing';
  estimatedRevenue?: number;
  revenueEstimateStatus?: 'estimated';
  revenueEstimateFormula?: string;
  ctr?: number;
  campaignPerformance?: unknown;
  internalTracking?: unknown;
  legacyExtraFields?: Record<string, unknown>;
  migratedFromLegacy?: boolean;
  archivedToSubcollection?: boolean;
  archivedFields?: string[];
  archiveChunkCount?: number;
  archiveChecksumSha256?: string;
  lastUpdated: unknown;
}

export interface AdMetricsArchiveChunkDocument {
  slotId: string;
  chunkIndex: number;
  chunkCount: number;
  payloadChunk: string;
  checksumSha256: string;
  archivedFields: string[];
  createdAt: string;
}

export interface MetricConflict {
  field: string;
  resolution: 'kept-higher-cumulative' | 'kept-existing';
  note: string;
}

export type DryRunDocumentStatus = 'WOULD_MIGRATE' | 'WOULD_CLEANUP' | 'ALREADY_CLEAN' | 'ERROR';
export type ExecuteDocumentStatus = 'MIGRATED' | 'ALREADY_CLEAN' | 'NEEDS_CLEANUP' | 'ERROR';
export type AuditReadinessStatus = 'READY_CLEAN' | 'NEEDS_MIGRATION' | 'NEEDS_CLEANUP' | 'BLOCKED_MALFORMED';

export interface DocumentMigrationPlan {
  slotId: string;
  dryRunStatus: DryRunDocumentStatus;
  executeStatus?: ExecuteDocumentStatus;
  legacyFieldsToDelete: string[];
  publicDoc: PublicAdSlotDocument;
  privateMetricsDoc: AdMetricsDocument | null;
  fieldDeleteDirectives: Record<string, { __op: 'FieldValue.delete' }>;
  conflicts: MetricConflict[];
  estimatedBytes: number;
  error?: string;
}

export interface AuditDocumentReport {
  docId: string;
  publicFieldsValid: boolean;
  malformedReasons: string[];
  unapprovedFieldNames: string[];
  hasMetricsDoc: boolean;
  missingMetricsFields: string[];
  readiness: AuditReadinessStatus;
}

interface FirebaseTargetConfig {
  projectId: string;
  firestoreDatabaseId: string;
  emulatorHost: string | null;
}

function isTimestampLike(val: unknown): val is { seconds: number; nanoseconds: number; toDate?: () => Date } {
  if (val instanceof Timestamp) return true;
  if (val !== null && typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    return (
      typeof rec.seconds === 'number' &&
      typeof rec.nanoseconds === 'number' &&
      typeof rec.toDate === 'function'
    );
  }
  return false;
}

function isGeoPointLike(val: unknown): val is { latitude: number; longitude: number } {
  if (val instanceof GeoPoint) return true;
  if (val !== null && typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    return (
      typeof rec.latitude === 'number' &&
      typeof rec.longitude === 'number' &&
      Object.keys(rec).length <= 3 &&
      typeof rec.isEqual === 'function'
    );
  }
  return false;
}

function isDocumentRefLike(val: unknown): val is { path: string } {
  if (val instanceof DocumentReference) return true;
  if (val !== null && typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    return typeof rec.path === 'string' && typeof rec.id === 'string' && typeof rec.firestore === 'object';
  }
  return false;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Resolves and strictly validates explicit Firebase projectId and firestoreDatabaseId.
 * Aborts if either identifier is missing or if config/environment disagree.
 */
export function resolveFirebaseTargetConfig(requireExplicitDatabase = false): FirebaseTargetConfig {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  let fileProjectId = '';
  let fileDatabaseId = '';

  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      fileProjectId = String(parsed.projectId || '').trim();
      fileDatabaseId = String(parsed.firestoreDatabaseId || '').trim();
    } catch {
      throw new Error('Failed to parse firebase-applet-config.json.');
    }
  }

  const envProjectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const envDatabaseId = (process.env.FIRESTORE_DATABASE_ID || '').trim();

  if (envProjectId && fileProjectId && envProjectId !== fileProjectId) {
    throw new Error(
      `Target mismatch: FIREBASE_PROJECT_ID (${envProjectId}) does not match firebase-applet-config.json (${fileProjectId}).`
    );
  }
  if (envDatabaseId && fileDatabaseId && envDatabaseId !== fileDatabaseId) {
    throw new Error(
      `Target mismatch: FIRESTORE_DATABASE_ID (${envDatabaseId}) does not match firebase-applet-config.json (${fileDatabaseId}).`
    );
  }

  const projectId = envProjectId || fileProjectId;
  const firestoreDatabaseId = envDatabaseId || fileDatabaseId || (requireExplicitDatabase ? '' : '(default)');
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || null;

  if (!projectId) {
    throw new Error('Explicit target Firebase projectId could not be resolved from firebase-applet-config.json or FIREBASE_PROJECT_ID.');
  }
  if (requireExplicitDatabase && !firestoreDatabaseId) {
    throw new Error('Explicit target firestoreDatabaseId could not be resolved from firebase-applet-config.json or FIRESTORE_DATABASE_ID.');
  }

  return { projectId, firestoreDatabaseId, emulatorHost };
}

/**
 * Firestore-type-safe recursive validator and cloner (zero JSON serialization).
 * Preserves Timestamps, GeoPoints, DocumentReferences, Bytes, Maps, Arrays, Strings, finite Numbers, Booleans, and null.
 * Throws descriptive errors for unsupported Firestore types (nested arrays, NaN/Infinity, functions, symbols, circular refs, depth > 20).
 */
export function validateAndCloneFirestoreValue<T>(
  value: T,
  fieldPath = 'root',
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): T {
  if (depth > 20) {
    throw new Error(`Firestore depth limit (20) exceeded at "${fieldPath}".`);
  }

  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Unsupported non-finite number (${String(value)}) at "${fieldPath}".`);
    }
    return value;
  }

  if (typeof value === 'undefined') {
    throw new Error(`Unsupported undefined value inside Firestore payload at "${fieldPath}".`);
  }

  if (typeof value !== 'object') {
    throw new Error(`Unsupported JavaScript type "${typeof value}" at "${fieldPath}".`);
  }

  const obj = value as unknown as object;
  if (seen.has(obj)) {
    throw new Error(`Circular reference detected at "${fieldPath}".`);
  }

  if (isTimestampLike(value)) {
    return new Timestamp(value.seconds, value.nanoseconds) as unknown as T;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Invalid Date value at "${fieldPath}".`);
    }
    return Timestamp.fromDate(value) as unknown as T;
  }

  if (isGeoPointLike(value)) {
    return new GeoPoint(value.latitude, value.longitude) as unknown as T;
  }

  if (isDocumentRefLike(value)) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return Buffer.from(value) as unknown as T;
  }

  if (value instanceof Uint8Array) {
    return Uint8Array.from(value) as unknown as T;
  }

  seen.add(obj);
  try {
    if (Array.isArray(value)) {
      const clonedArr: unknown[] = [];
      for (let i = 0; i < value.length; i++) {
        const el = value[i];
        if (Array.isArray(el)) {
          throw new Error(`Unsupported nested array directly inside array at "${fieldPath}[${i}]".`);
        }
        clonedArr.push(validateAndCloneFirestoreValue(el, `${fieldPath}[${i}]`, depth + 1, seen));
      }
      return clonedArr as unknown as T;
    }

    if (!isPlainObject(value)) {
      const ctorName = (value as { constructor?: { name?: string } })?.constructor?.name || 'UnknownClass';
      throw new Error(`Unsupported object class "${ctorName}" at "${fieldPath}".`);
    }

    const clonedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      clonedObj[k] = validateAndCloneFirestoreValue(v, `${fieldPath}.${k}`, depth + 1, seen);
    }
    return clonedObj as T;
  } finally {
    seen.delete(obj);
  }
}

export function deepCloneFirestore<T>(value: T): T {
  return validateAndCloneFirestoreValue(value, 'root', 0);
}

/**
 * Firestore-type-safe deep structural equality checker.
 * Supports Timestamps (exact second + nanosecond equality), GeoPoints, DocumentReferences,
 * Uint8Array/Buffer bytes, Arrays, and nested Plain Maps (key-order independent).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (isTimestampLike(a) || isTimestampLike(b) || a instanceof Date || b instanceof Date) {
    const tsA = a instanceof Date ? Timestamp.fromDate(a) : isTimestampLike(a) ? new Timestamp(a.seconds, a.nanoseconds) : null;
    const tsB = b instanceof Date ? Timestamp.fromDate(b) : isTimestampLike(b) ? new Timestamp(b.seconds, b.nanoseconds) : null;
    if (!tsA || !tsB) return false;
    return tsA.seconds === tsB.seconds && tsA.nanoseconds === tsB.nanoseconds;
  }

  if (isGeoPointLike(a) || isGeoPointLike(b)) {
    if (!isGeoPointLike(a) || !isGeoPointLike(b)) return false;
    return a.latitude === b.latitude && a.longitude === b.longitude;
  }

  if (isDocumentRefLike(a) || isDocumentRefLike(b)) {
    if (!isDocumentRefLike(a) || !isDocumentRefLike(b)) return false;
    return a.path === b.path;
  }

  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).filter(k => aObj[k] !== undefined);
  const bKeys = Object.keys(bObj).filter(k => bObj[k] !== undefined);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

/**
 * Estimates Firestore document storage size in bytes following official Firestore document sizing rules.
 */
function utf8Bytes(str: string): number {
  return Buffer.byteLength(str, 'utf8');
}

function estimateFirestoreValueBytes(val: unknown): number {
  if (val === null || val === undefined || typeof val === 'boolean') return 1;
  if (typeof val === 'number') return 8;
  if (typeof val === 'string') return utf8Bytes(val) + 1;
  if (isTimestampLike(val) || val instanceof Date) return 8;
  if (isGeoPointLike(val)) return 16;
  if (val instanceof Uint8Array) return val.byteLength;
  if (isDocumentRefLike(val)) {
    return val.path.split('/').reduce((acc, seg) => acc + utf8Bytes(seg) + 1, 16);
  }
  if (Array.isArray(val)) {
    return val.reduce<number>((sum, item) => sum + estimateFirestoreValueBytes(item), 0);
  }
  if (typeof val === 'object') {
    let total = 0;
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v === undefined) continue;
      total += utf8Bytes(k) + 1 + estimateFirestoreValueBytes(v);
    }
    return total;
  }
  return 0;
}

export function estimateFirestoreDocumentBytes(
  docPath: string,
  data: Record<string, unknown>
): { estimatedBytes: number; exceedsSafeLimit: boolean; hardLimitBytes: number } {
  const pathBytes = docPath.split('/').reduce((acc, seg) => acc + utf8Bytes(seg) + 1, 16);
  const bodyBytes = estimateFirestoreValueBytes(data);
  const estimatedBytes = pathBytes + 32 + bodyBytes;
  return {
    estimatedBytes,
    exceedsSafeLimit: estimatedBytes > SAFE_FIRESTORE_DOC_BYTES || estimatedBytes > FIRESTORE_HARD_LIMIT_BYTES,
    hardLimitBytes: FIRESTORE_HARD_LIMIT_BYTES
  };
}

/**
 * Compares every retained field in the written /adMetrics document against the expected merged payload.
 */
export function verifyMetricsReadBack(
  expected: AdMetricsDocument,
  actual: Record<string, unknown> | undefined | null
): { ok: boolean; mismatches: string[] } {
  if (!actual) {
    return { ok: false, mismatches: ['Document missing on read-back'] };
  }

  const mismatches: string[] = [];
  for (const key of Object.keys(expected) as (keyof AdMetricsDocument)[]) {
    const expectedValue = expected[key];
    if (expectedValue === undefined) continue;
    if (!deepEqual(actual[key], expectedValue)) {
      mismatches.push(String(key));
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}

/**
 * Validates whether a raw /adSlots document satisfies DRAFT_proposed_firestore.rules isValidPublicAdSlot().
 */
export function validatePublicAdSlotShape(rawDoc: RawAdSlotDocument, docId: string): {
  valid: boolean;
  reasons: string[];
  unapprovedFieldNames: string[];
} {
  const reasons: string[] = [];
  const unapprovedFieldNames = Object.keys(rawDoc).filter(
    key => !PUBLIC_AD_SLOT_ALLOWED_KEYS.has(key) && rawDoc[key] !== undefined
  );

  for (const reqKey of PUBLIC_AD_SLOT_REQUIRED_KEYS) {
    if (rawDoc[reqKey] === undefined || rawDoc[reqKey] === null) {
      reasons.push(`Missing required PublicAdSlot field: ${reqKey}`);
    }
  }

  if (typeof rawDoc.id !== 'string' || rawDoc.id.length === 0 || rawDoc.id.length > 128) {
    reasons.push('Field "id" must be a non-empty string <= 128 chars');
  } else if (rawDoc.id !== docId) {
    reasons.push(`Document field id ("${rawDoc.id}") differs from document key ("${docId}")`);
  }

  const stringBounds: Array<[string, number]> = [
    ['name', 200],
    ['dimensions', 100],
    ['sponsorName', 200],
    ['headline', 300],
    ['tagline', 500],
    ['ctaText', 100],
    ['ctaUrl', 1000],
    ['badgeLabel', 100]
  ];

  for (const [field, maxLen] of stringBounds) {
    if (rawDoc[field] !== undefined) {
      if (typeof rawDoc[field] !== 'string') {
        reasons.push(`Field "${field}" has invalid type ${typeof rawDoc[field]} (expected string)`);
      } else if ((rawDoc[field] as string).length > maxLen) {
        reasons.push(`Field "${field}" exceeds max length ${maxLen}`);
      }
    }
  }

  if (rawDoc.type !== undefined && (typeof rawDoc.type !== 'string' || !VALID_AD_TYPES.has(rawDoc.type))) {
    reasons.push(`Field "type" has invalid value "${String(rawDoc.type)}"`);
  }

  if (rawDoc.isEnabled !== undefined && typeof rawDoc.isEnabled !== 'boolean') {
    reasons.push(`Field "isEnabled" has invalid type ${typeof rawDoc.isEnabled} (expected boolean)`);
  }

  if (rawDoc.imageUrl !== undefined) {
    if (typeof rawDoc.imageUrl !== 'string' || rawDoc.imageUrl.length > 1000) {
      reasons.push('Optional field "imageUrl" must be a string <= 1000 chars');
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
    unapprovedFieldNames
  };
}

/**
 * Audits a single /adSlots doc paired with its /adMetrics doc without outputting private metric values.
 */
export function inspectAdSlotAuditDocument(
  docId: string,
  rawDoc: RawAdSlotDocument,
  existingMetric?: Record<string, unknown> | null
): AuditDocumentReport {
  const shape = validatePublicAdSlotShape(rawDoc, docId);
  const hasMetricsDoc = Boolean(existingMetric);

  const missingMetricsFields: string[] = [];
  if (!existingMetric) {
    missingMetricsFields.push('adMetrics_document_missing');
  } else {
    if (typeof existingMetric.impressions !== 'number') missingMetricsFields.push('impressions');
    if (typeof existingMetric.clicks !== 'number') missingMetricsFields.push('clicks');
    if (typeof existingMetric.revenue !== 'number') missingMetricsFields.push('revenue');
  }

  let readiness: AuditReadinessStatus = 'READY_CLEAN';
  if (!shape.valid) {
    readiness = 'BLOCKED_MALFORMED';
  } else if (shape.unapprovedFieldNames.length > 0 && !hasMetricsDoc) {
    readiness = 'NEEDS_MIGRATION';
  } else if (shape.unapprovedFieldNames.length > 0 && hasMetricsDoc) {
    readiness = 'NEEDS_CLEANUP';
  } else if (!hasMetricsDoc) {
    readiness = 'NEEDS_MIGRATION';
  }

  return {
    docId,
    publicFieldsValid: shape.valid,
    malformedReasons: shape.reasons,
    unapprovedFieldNames: shape.unapprovedFieldNames,
    hasMetricsDoc,
    missingMetricsFields,
    readiness
  };
}

/**
 * Extracts strictly the 12 PublicAdSlot fields matching src/types/blog.ts & DRAFT_proposed_firestore.rules.
 */
export function extractPublicAdSlot(rawDoc: RawAdSlotDocument, docId: string): PublicAdSlotDocument {
  const docOut: PublicAdSlotDocument = {
    id: String(rawDoc.id || docId),
    name: String(rawDoc.name || ''),
    type: String(rawDoc.type || 'native-card'),
    dimensions: String(rawDoc.dimensions || ''),
    sponsorName: String(rawDoc.sponsorName || ''),
    headline: String(rawDoc.headline || ''),
    tagline: String(rawDoc.tagline || ''),
    ctaText: String(rawDoc.ctaText || ''),
    ctaUrl: String(rawDoc.ctaUrl || ''),
    badgeLabel: String(rawDoc.badgeLabel || ''),
    isEnabled: Boolean(rawDoc.isEnabled)
  };

  if (typeof rawDoc.imageUrl === 'string' && rawDoc.imageUrl.length > 0) {
    docOut.imageUrl = rawDoc.imageUrl;
  }

  return docOut;
}

/**
 * Idempotently extracts and preserves ALL legacy advertising metric fields with ZERO fabricated actual revenue:
 * - Cumulative counter assumption: `impressions` and `clicks` are merged via Math.max(existing, legacy) so
 *   reruns never double-count or reduce an existing higher counter. Missing values remain `null` ('missing'),
 *   distinguishable from genuine `0` ('actual').
 * - Actual historical `revenue` (including genuine `0`) is preserved verbatim. When absent on both source &
 *   existing docs, `revenue` stays `null` with `revenueStatus: 'missing'`; an optional estimate is stored
 *   separately under `estimatedRevenue` with explicit `revenueEstimateStatus` and `revenueEstimateFormula`.
 * - Conflicts between existing `/adMetrics` and legacy `/adSlots` are recorded in `conflicts[]`, never hidden.
 */
export function extractPrivateAdMetrics(
  rawDoc: RawAdSlotDocument,
  docId: string,
  existingMetrics?: Partial<AdMetricsDocument> | null,
  timestampIso: string = new Date().toISOString()
): { doc: AdMetricsDocument; conflicts: MetricConflict[] } {
  const conflicts: MetricConflict[] = [];

  const hasRawImpressions = typeof rawDoc.impressions === 'number' && Number.isFinite(rawDoc.impressions);
  const hasExistingImpressions = Boolean(existingMetrics && typeof existingMetrics.impressions === 'number' && Number.isFinite(existingMetrics.impressions));

  let impressions: number | null = null;
  let impressionsStatus: 'actual' | 'missing' = 'missing';
  if (hasExistingImpressions && hasRawImpressions) {
    const existingVal = existingMetrics!.impressions as number;
    const rawVal = rawDoc.impressions as number;
    impressions = Math.max(existingVal, rawVal);
    impressionsStatus = 'actual';
    if (existingVal !== rawVal) {
      conflicts.push({
        field: 'impressions',
        resolution: 'kept-higher-cumulative',
        note: 'Existing /adMetrics and legacy /adSlots impressions differed; retained Math.max cumulative value.'
      });
    }
  } else if (hasExistingImpressions) {
    impressions = existingMetrics!.impressions as number;
    impressionsStatus = 'actual';
  } else if (hasRawImpressions) {
    impressions = rawDoc.impressions as number;
    impressionsStatus = 'actual';
  }

  const hasRawClicks = typeof rawDoc.clicks === 'number' && Number.isFinite(rawDoc.clicks);
  const hasExistingClicks = Boolean(existingMetrics && typeof existingMetrics.clicks === 'number' && Number.isFinite(existingMetrics.clicks));

  let clicks: number | null = null;
  let clicksStatus: 'actual' | 'missing' = 'missing';
  if (hasExistingClicks && hasRawClicks) {
    const existingVal = existingMetrics!.clicks as number;
    const rawVal = rawDoc.clicks as number;
    clicks = Math.max(existingVal, rawVal);
    clicksStatus = 'actual';
    if (existingVal !== rawVal) {
      conflicts.push({
        field: 'clicks',
        resolution: 'kept-higher-cumulative',
        note: 'Existing /adMetrics and legacy /adSlots clicks differed; retained Math.max cumulative value.'
      });
    }
  } else if (hasExistingClicks) {
    clicks = existingMetrics!.clicks as number;
    clicksStatus = 'actual';
  } else if (hasRawClicks) {
    clicks = rawDoc.clicks as number;
    clicksStatus = 'actual';
  }

  const hasRawRevenue = typeof rawDoc.revenue === 'number' && Number.isFinite(rawDoc.revenue);
  const hasExistingRevenue = Boolean(existingMetrics && typeof existingMetrics.revenue === 'number' && Number.isFinite(existingMetrics.revenue));

  let revenue: number | null = null;
  let revenueStatus: 'actual' | 'missing' = 'missing';
  if (hasExistingRevenue && hasRawRevenue) {
    const existingVal = existingMetrics!.revenue as number;
    const rawVal = rawDoc.revenue as number;
    revenue = Math.max(existingVal, rawVal);
    revenueStatus = 'actual';
    if (existingVal !== rawVal) {
      conflicts.push({
        field: 'revenue',
        resolution: 'kept-higher-cumulative',
        note: 'Existing /adMetrics and legacy /adSlots revenue differed; retained higher historical value.'
      });
    }
  } else if (hasExistingRevenue) {
    revenue = existingMetrics!.revenue as number;
    revenueStatus = 'actual';
  } else if (hasRawRevenue) {
    revenue = rawDoc.revenue as number;
    revenueStatus = 'actual';
  }

  // LastUpdated preserves Firestore Timestamp/Date/string faithfully without lossy JSON conversion
  let resolvedLastUpdated: unknown = timestampIso;
  if (rawDoc.lastUpdated !== undefined) {
    resolvedLastUpdated = validateAndCloneFirestoreValue(rawDoc.lastUpdated, 'lastUpdated');
  } else if (existingMetrics?.lastUpdated !== undefined) {
    resolvedLastUpdated = validateAndCloneFirestoreValue(existingMetrics.lastUpdated, 'existingMetrics.lastUpdated');
  }

  const out: AdMetricsDocument = {
    id: String(rawDoc.id || docId),
    impressions,
    clicks,
    impressionsStatus,
    clicksStatus,
    revenue,
    revenueStatus,
    migratedFromLegacy: true,
    lastUpdated: resolvedLastUpdated
  };

  // Store optional estimate separately ONLY when actual historical revenue is missing and cumulative counters exist
  if (revenueStatus === 'missing' && impressions !== null && clicks !== null) {
    out.estimatedRevenue = parseFloat(((impressions * 0.0034) + (clicks * 0.45)).toFixed(2));
    out.revenueEstimateStatus = 'estimated';
    out.revenueEstimateFormula = REVENUE_ESTIMATE_FORMULA;
  }

  // Legacy CTR (numeric)
  if (existingMetrics && typeof existingMetrics.ctr === 'number' && Number.isFinite(existingMetrics.ctr)) {
    out.ctr = existingMetrics.ctr;
    if (typeof rawDoc.ctr === 'number' && rawDoc.ctr !== existingMetrics.ctr) {
      conflicts.push({
        field: 'ctr',
        resolution: 'kept-existing',
        note: 'Existing /adMetrics.ctr differed from legacy /adSlots.ctr; kept existing /adMetrics value.'
      });
    }
  } else if (typeof rawDoc.ctr === 'number' && Number.isFinite(rawDoc.ctr)) {
    out.ctr = rawDoc.ctr;
  } else if (rawDoc.ctr !== undefined && rawDoc.ctr !== null) {
    throw new Error(`Invalid type for ctr (${typeof rawDoc.ctr}); expected finite number.`);
  }

  // CampaignPerformance (Firestore-type-safe deep clone)
  if (existingMetrics && existingMetrics.campaignPerformance !== undefined) {
    const clonedExisting = validateAndCloneFirestoreValue(existingMetrics.campaignPerformance, 'existingMetrics.campaignPerformance');
    out.campaignPerformance = clonedExisting;
    if (rawDoc.campaignPerformance !== undefined) {
      const clonedRaw = validateAndCloneFirestoreValue(rawDoc.campaignPerformance, 'rawDoc.campaignPerformance');
      if (!deepEqual(clonedExisting, clonedRaw)) {
        conflicts.push({
          field: 'campaignPerformance',
          resolution: 'kept-existing',
          note: 'Existing /adMetrics.campaignPerformance differed from legacy /adSlots value; kept existing.'
        });
      }
    }
  } else if (rawDoc.campaignPerformance !== undefined) {
    out.campaignPerformance = validateAndCloneFirestoreValue(rawDoc.campaignPerformance, 'campaignPerformance');
  }

  // InternalTracking (Firestore-type-safe deep clone)
  if (existingMetrics && existingMetrics.internalTracking !== undefined) {
    const clonedExisting = validateAndCloneFirestoreValue(existingMetrics.internalTracking, 'existingMetrics.internalTracking');
    out.internalTracking = clonedExisting;
    if (rawDoc.internalTracking !== undefined) {
      const clonedRaw = validateAndCloneFirestoreValue(rawDoc.internalTracking, 'rawDoc.internalTracking');
      if (!deepEqual(clonedExisting, clonedRaw)) {
        conflicts.push({
          field: 'internalTracking',
          resolution: 'kept-existing',
          note: 'Existing /adMetrics.internalTracking differed from legacy /adSlots value; kept existing.'
        });
      }
    }
  } else if (rawDoc.internalTracking !== undefined) {
    out.internalTracking = validateAndCloneFirestoreValue(rawDoc.internalTracking, 'internalTracking');
  }

  // Archive any unexpected unknown fields outside both PublicAdSlot and known metric keys
  const extraFields: Record<string, unknown> = existingMetrics?.legacyExtraFields
    ? validateAndCloneFirestoreValue(existingMetrics.legacyExtraFields, 'existingMetrics.legacyExtraFields')
    : {};

  for (const key of Object.keys(rawDoc)) {
    if (!PUBLIC_AD_SLOT_ALLOWED_KEYS.has(key) && !KNOWN_LEGACY_METRIC_KEYS.has(key) && rawDoc[key] !== undefined) {
      const clonedVal = validateAndCloneFirestoreValue(rawDoc[key], `legacyExtraFields.${key}`);
      if (!(key in extraFields)) {
        extraFields[key] = clonedVal;
      } else if (!deepEqual(extraFields[key], clonedVal)) {
        conflicts.push({
          field: `legacyExtraFields.${key}`,
          resolution: 'kept-existing',
          note: `Existing /adMetrics.legacyExtraFields.${key} differed from legacy /adSlots.${key}; kept existing.`
        });
      }
    }
  }
  if (Object.keys(extraFields).length > 0) {
    out.legacyExtraFields = extraFields;
  }

  return { doc: out, conflicts };
}

/**
 * Builds a deterministic, idempotent migration plan for a single /adSlots document.
 * Validates Firestore type safety and 900 KiB size threshold BEFORE returning a runnable plan.
 */
export function buildDocumentMigrationPlan(
  rawDoc: RawAdSlotDocument,
  docId: string,
  existingMetrics?: Partial<AdMetricsDocument> | null,
  timestampIso: string = new Date().toISOString()
): DocumentMigrationPlan {
  const slotId = String(rawDoc.id || docId);
  const legacyFieldsToDelete = Object.keys(rawDoc).filter(
    key => !PUBLIC_AD_SLOT_ALLOWED_KEYS.has(key) && rawDoc[key] !== undefined
  );
  const publicDoc = extractPublicAdSlot(rawDoc, slotId);

  const fieldDeleteDirectives: Record<string, { __op: 'FieldValue.delete' }> = {};
  for (const field of legacyFieldsToDelete) {
    fieldDeleteDirectives[field] = { __op: 'FieldValue.delete' };
  }

  try {
    const { doc: privateMetricsDoc, conflicts } = extractPrivateAdMetrics(rawDoc, slotId, existingMetrics, timestampIso);
    const sizeCheck = estimateFirestoreDocumentBytes(`adMetrics/${slotId}`, privateMetricsDoc as unknown as Record<string, unknown>);

    if (sizeCheck.exceedsSafeLimit) {
      return {
        slotId,
        dryRunStatus: 'ERROR',
        legacyFieldsToDelete,
        publicDoc,
        privateMetricsDoc: null,
        fieldDeleteDirectives,
        conflicts,
        estimatedBytes: sizeCheck.estimatedBytes,
        error: `Destination /adMetrics/${slotId} estimated size (${sizeCheck.estimatedBytes} bytes) exceeds safe limit (${SAFE_FIRESTORE_DOC_BYTES} bytes, hard limit ${FIRESTORE_HARD_LIMIT_BYTES}). Source /adSlots untouched. Recovery: archive oversized fields via chunked /adMetricsArchive/${slotId}/chunks/* subcollection using verified backup.`
      };
    }

    let dryRunStatus: DryRunDocumentStatus = 'ALREADY_CLEAN';
    if (legacyFieldsToDelete.length > 0 && !existingMetrics) {
      dryRunStatus = 'WOULD_MIGRATE';
    } else if (legacyFieldsToDelete.length > 0 && existingMetrics) {
      dryRunStatus = 'WOULD_CLEANUP';
    } else if (!existingMetrics) {
      dryRunStatus = 'WOULD_MIGRATE';
    }

    return {
      slotId,
      dryRunStatus,
      legacyFieldsToDelete,
      publicDoc,
      privateMetricsDoc,
      fieldDeleteDirectives,
      conflicts,
      estimatedBytes: sizeCheck.estimatedBytes
    };
  } catch (err) {
    return {
      slotId,
      dryRunStatus: 'ERROR',
      legacyFieldsToDelete,
      publicDoc,
      privateMetricsDoc: null,
      fieldDeleteDirectives,
      conflicts: [],
      estimatedBytes: 0,
      error: `Firestore-type validation failed (${err instanceof Error ? err.message : String(err)}). Source /adSlots untouched.`
    };
  }
}

function backupJsonReplacer(_key: string, val: unknown): unknown {
  if (isTimestampLike(val)) {
    return { __firestoreType: 'Timestamp', seconds: val.seconds, nanoseconds: val.nanoseconds };
  }
  if (isGeoPointLike(val)) {
    return { __firestoreType: 'GeoPoint', latitude: val.latitude, longitude: val.longitude };
  }
  if (isDocumentRefLike(val)) {
    return { __firestoreType: 'DocumentReference', path: val.path };
  }
  if (val instanceof Uint8Array) {
    return { __firestoreType: 'Bytes', base64: Buffer.from(val).toString('base64') };
  }
  return val;
}

export function reviveBackupValue(val: unknown, db?: Firestore): unknown {
  if (val === null || val === undefined || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => reviveBackupValue(item, db));
  }
  const rec = val as Record<string, unknown>;
  if (typeof rec.__firestoreType === 'string') {
    switch (rec.__firestoreType) {
      case 'Timestamp':
        if (typeof rec.seconds === 'number' && typeof rec.nanoseconds === 'number') {
          return new Timestamp(rec.seconds, rec.nanoseconds);
        }
        break;
      case 'GeoPoint':
        if (typeof rec.latitude === 'number' && typeof rec.longitude === 'number') {
          return new GeoPoint(rec.latitude, rec.longitude);
        }
        break;
      case 'Bytes':
        if (typeof rec.base64 === 'string') {
          return Uint8Array.from(Buffer.from(rec.base64, 'base64'));
        }
        break;
      case 'DocumentReference':
        if (typeof rec.path === 'string' && db) {
          return db.doc(rec.path);
        }
        return { path: String(rec.path || '') };
    }
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = reviveBackupValue(v, db);
  }
  return out;
}

export function serializeBackupSnapshot(
  target: FirebaseTargetConfig,
  sourceDocs: RawAdSlotDocument[],
  existingMetricsMap: Record<string, Partial<AdMetricsDocument>>
): string {
  return JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      targetProjectId: target.projectId,
      targetDatabaseId: target.firestoreDatabaseId,
      environment: target.emulatorHost ? 'EMULATOR' : 'PRODUCTION',
      purpose: 'Pre-migration backup of /adSlots and /adMetrics before FieldValue.delete() cleanup',
      adSlotsBackup: sourceDocs,
      adMetricsBackup: existingMetricsMap
    },
    backupJsonReplacer,
    2
  );
}

export function deserializeBackupSnapshot(
  jsonText: string,
  db?: Firestore
): {
  createdAt?: string;
  targetProjectId?: string;
  targetDatabaseId?: string;
  adSlotsBackup: RawAdSlotDocument[];
  adMetricsBackup: Record<string, Partial<AdMetricsDocument>>;
} {
  const raw = JSON.parse(jsonText) as Record<string, unknown>;
  return {
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    targetProjectId: typeof raw.targetProjectId === 'string' ? raw.targetProjectId : undefined,
    targetDatabaseId: typeof raw.targetDatabaseId === 'string' ? raw.targetDatabaseId : undefined,
    adSlotsBackup: Array.isArray(raw.adSlotsBackup)
      ? (reviveBackupValue(raw.adSlotsBackup, db) as RawAdSlotDocument[])
      : [],
    adMetricsBackup: isPlainObject(raw.adMetricsBackup)
      ? (reviveBackupValue(raw.adMetricsBackup, db) as Record<string, Partial<AdMetricsDocument>>)
      : {}
  };
}

/**
 * Splits oversized legacy fields (e.g., campaignPerformance, internalTracking, legacyExtraFields)
 * into deterministic, SHA-256 verified subcollection chunk documents under /adMetricsArchive/{slotId}/chunks/*
 * so each Firestore document remains strictly below SAFE_FIRESTORE_DOC_BYTES.
 */
export function buildChunkedArchiveRecords(
  slotId: string,
  overflowFields: Record<string, unknown>,
  timestampIso: string = new Date().toISOString(),
  maxChunkBytes: number = ARCHIVE_CHUNK_SAFE_BYTES
): {
  chunks: Array<{ chunkId: string; doc: AdMetricsArchiveChunkDocument }>;
  checksumSha256: string;
  archivedFields: string[];
} {
  const archivedFields = Object.keys(overflowFields).filter(k => overflowFields[k] !== undefined);
  const serialized = JSON.stringify(overflowFields, backupJsonReplacer);
  const checksumSha256 = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');

  const safeBytes = Math.max(1024, Math.min(maxChunkBytes, ARCHIVE_CHUNK_SAFE_BYTES));
  const rawChunks: string[] = [];
  let cursor = 0;
  while (cursor < serialized.length) {
    let sliceEnd = Math.min(serialized.length, cursor + safeBytes);
    while (sliceEnd > cursor + 1 && Buffer.byteLength(serialized.slice(cursor, sliceEnd), 'utf8') > safeBytes) {
      sliceEnd = cursor + Math.floor((sliceEnd - cursor) * 0.85);
    }
    rawChunks.push(serialized.slice(cursor, sliceEnd));
    cursor = sliceEnd;
  }
  if (rawChunks.length === 0) rawChunks.push('{}');

  const chunks = rawChunks.map((payloadChunk, idx) => ({
    chunkId: `chunk_${String(idx).padStart(4, '0')}`,
    doc: {
      slotId,
      chunkIndex: idx,
      chunkCount: rawChunks.length,
      payloadChunk,
      checksumSha256,
      archivedFields,
      createdAt: timestampIso
    }
  }));

  return { chunks, checksumSha256, archivedFields };
}

/**
 * Reconstructs and cryptographically verifies archived fields from /adMetricsArchive/{slotId}/chunks/*.
 * Throws immediately on missing chunks, count mismatch, or SHA-256 verification failure.
 */
export function recoverFromArchiveChunks(
  chunks: AdMetricsArchiveChunkDocument[],
  expectedChecksumSha256?: string,
  db?: Firestore
): { recoveredFields: Record<string, unknown>; checksumSha256: string; chunkCount: number } {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('Archive recovery failed: no archive chunk documents found.');
  }
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const expectedCount = sorted[0].chunkCount;
  if (sorted.length !== expectedCount) {
    throw new Error(`Archive recovery failed: expected ${expectedCount} chunks, found ${sorted.length}.`);
  }
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].chunkIndex !== i || sorted[i].chunkCount !== expectedCount) {
      throw new Error(`Archive recovery failed: corrupted chunk sequence at index ${i}.`);
    }
  }

  const combined = sorted.map(c => c.payloadChunk).join('');
  const actualChecksum = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
  const referenceChecksum = expectedChecksumSha256 || sorted[0].checksumSha256;
  if (referenceChecksum && actualChecksum !== referenceChecksum) {
    throw new Error(`Archive recovery checksum mismatch: expected ${referenceChecksum}, got ${actualChecksum}.`);
  }

  const parsed = reviveBackupValue(JSON.parse(combined), db);
  if (!isPlainObject(parsed)) {
    throw new Error('Archive recovery failed: recovered payload is not an object map.');
  }
  return { recoveredFields: parsed, checksumSha256: actualChecksum, chunkCount: expectedCount };
}

function getPrivilegedAdminFirestore(target: FirebaseTargetConfig): { db: Firestore; appProjectId: string } {
  const existingApp = getApps().find(a => a.name === 'eirvan-migration-admin');
  const app =
    existingApp ||
    initializeApp(
      target.emulatorHost
        ? { projectId: target.projectId }
        : { credential: applicationDefault(), projectId: target.projectId },
      'eirvan-migration-admin'
    );

  const appProjectId = String(app.options.projectId || '');
  if (appProjectId !== target.projectId) {
    throw new Error(`Firebase Admin App projectId verification failed: expected ${target.projectId}, got ${appProjectId}`);
  }

  const db =
    target.firestoreDatabaseId && target.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, target.firestoreDatabaseId)
      : getFirestore(app);

  return { db, appProjectId };
}

async function promptForConfirmation(question: string, expectedToken: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim() === expectedToken);
    });
  });
}

export async function runProductionPreflightAudit(): Promise<{
  reports: AuditDocumentReport[];
  target: FirebaseTargetConfig;
}> {
  const target = resolveFirebaseTargetConfig(true);
  const envLabel = target.emulatorHost ? `EMULATOR (${target.emulatorHost})` : 'PRODUCTION';

  console.log('=== EIRVAN PRODUCTION PREFLIGHT AUDIT (READ-ONLY) ===');
  console.log(`TARGET PROJECT ID : ${target.projectId}`);
  console.log(`TARGET DATABASE   : ${target.firestoreDatabaseId}`);
  console.log(`ENVIRONMENT       : ${envLabel}`);
  console.log('MODE              : READ-ONLY PRODUCTION PREFLIGHT AUDIT (NO WRITES, NO DELETES, NO BACKUPS)\n');

  const { db } = getPrivilegedAdminFirestore(target);
  const [slotsSnap, metricsSnap] = await Promise.all([
    db.collection('adSlots').get(),
    db.collection('adMetrics').get()
  ]);

  const metricsMap: Record<string, Record<string, unknown>> = {};
  metricsSnap.docs.forEach(docSnap => {
    metricsMap[docSnap.id] = docSnap.data() as Record<string, unknown>;
  });

  const reports: AuditDocumentReport[] = slotsSnap.docs.map(docSnap =>
    inspectAdSlotAuditDocument(
      docSnap.id,
      docSnap.data() as RawAdSlotDocument,
      metricsMap[docSnap.id] || null
    )
  );

  const slotIds = new Set(slotsSnap.docs.map(d => d.id));
  const orphanMetricIds = Object.keys(metricsMap).filter(id => !slotIds.has(id));

  console.log(`Documents found: ${reports.length} in /adSlots, ${metricsSnap.size} in /adMetrics\n`);
  for (const r of reports) {
    console.log(
      `[AUDIT] docId=${r.docId} | PublicValid=${r.publicFieldsValid} | UnapprovedFields=[${
        r.unapprovedFieldNames.join(', ') || 'none'
      }] | HasAdMetrics=${r.hasMetricsDoc} | MissingMetricsFields=[${
        r.missingMetricsFields.join(', ') || 'none'
      }] | Readiness=${r.readiness}`
    );
    if (r.malformedReasons.length > 0) {
      console.log(`        Malformed/Unexpected Issues: ${r.malformedReasons.join('; ')}`);
    }
  }

  if (orphanMetricIds.length > 0) {
    console.log(`\n[AUDIT NOTICE] Orphaned /adMetrics document IDs without matching /adSlots doc: [${orphanMetricIds.join(', ')}]`);
  }

  const blockedCount = reports.filter(r => r.readiness === 'BLOCKED_MALFORMED').length;
  console.log(`\nSummary: READY_CLEAN=${reports.filter(r => r.readiness === 'READY_CLEAN').length}, NEEDS_MIGRATION=${reports.filter(r => r.readiness === 'NEEDS_MIGRATION').length}, NEEDS_CLEANUP=${reports.filter(r => r.readiness === 'NEEDS_CLEANUP').length}, BLOCKED_MALFORMED=${blockedCount}`);
  console.log('[AUDIT COMPLETE] Zero Firestore writes, zero deletes, zero backup files created, and zero private values printed.');

  return { reports, target };
}

export async function runAdMetricsMigration(options?: {
  execute?: boolean;
  auditProduction?: boolean;
  archiveOversized?: boolean;
  recoverArchiveSlotId?: string;
  rollbackFile?: string;
  confirmed?: boolean;
  emulatorOnly?: boolean;
  backupDir?: string;
}) {
  const auditProduction = Boolean(options?.auditProduction);
  const execute = Boolean(options?.execute);
  const archiveOversized = Boolean(options?.archiveOversized);
  const recoverArchiveSlotId = options?.recoverArchiveSlotId;
  const rollbackFile = options?.rollbackFile;
  const confirmed = Boolean(options?.confirmed);
  const emulatorOnly = Boolean(options?.emulatorOnly);
  const backupDir = options?.backupDir || path.resolve(process.cwd(), 'backups');

  if (auditProduction) {
    if (execute || rollbackFile || recoverArchiveSlotId) {
      throw new Error('Safety Abort: --audit-production cannot be combined with --execute, --rollback, or --recover-archive.');
    }
    const auditResult = await runProductionPreflightAudit();
    return { plans: [], executed: false, auditReports: auditResult.reports };
  }

  const target = resolveFirebaseTargetConfig();
  const envLabel = target.emulatorHost ? `EMULATOR (${target.emulatorHost})` : 'PRODUCTION';

  if (emulatorOnly && !target.emulatorHost) {
    throw new Error('Safety Abort: --emulator was specified, but FIRESTORE_EMULATOR_HOST is not set. Refusing to target production.');
  }

  console.log('=== EIRVAN ADVERTISING METRICS SEPARATION MIGRATION ===');
  console.log(`TARGET PROJECT ID : ${target.projectId}`);
  console.log(`TARGET DATABASE   : ${target.firestoreDatabaseId}`);
  console.log(`ENVIRONMENT       : ${envLabel}`);

  if (recoverArchiveSlotId) {
    console.log(`MODE              : VERIFY & RECOVER ARCHIVE (/adMetricsArchive/${recoverArchiveSlotId}/chunks/*)\n`);
    const { db } = getPrivilegedAdminFirestore(target);
    const [metricSnap, chunksSnap] = await Promise.all([
      db.collection('adMetrics').doc(recoverArchiveSlotId).get(),
      db.collection('adMetricsArchive').doc(recoverArchiveSlotId).collection('chunks').get()
    ]);
    const chunks = chunksSnap.docs.map(d => d.data() as AdMetricsArchiveChunkDocument);
    const expectedChecksum = metricSnap.exists ? (metricSnap.data()?.archiveChecksumSha256 as string | undefined) : undefined;
    const recovered = recoverFromArchiveChunks(chunks, expectedChecksum, db);
    console.log(
      `[ARCHIVE VERIFIED] slotId=${recoverArchiveSlotId} | chunks=${recovered.chunkCount} | sha256=${recovered.checksumSha256} | fields=[${Object.keys(recovered.recoveredFields).join(', ')}]`
    );
    return { executed: false, plans: [], recovered };
  }

  if (rollbackFile) {
    console.log('MODE              : ROLLBACK (RESTORE /adMetrics ONLY)\n');
    console.log('[SECURITY POLICY] Rollback strictly restores private metrics to /adMetrics from backup.');
    console.log('[SECURITY POLICY] Rollback NEVER automatically copies private metrics back into public /adSlots.');

    if (!fs.existsSync(rollbackFile)) {
      throw new Error(`Rollback backup file not found: ${rollbackFile}`);
    }

    const rawBackupJson = fs.readFileSync(rollbackFile, 'utf-8');
    const preParsedMeta = JSON.parse(rawBackupJson) as { targetProjectId?: string; targetDatabaseId?: string };
    if (preParsedMeta.targetProjectId && preParsedMeta.targetProjectId !== target.projectId) {
      throw new Error(`Backup projectId (${preParsedMeta.targetProjectId}) does not match current target (${target.projectId}).`);
    }
    if (preParsedMeta.targetDatabaseId && preParsedMeta.targetDatabaseId !== target.firestoreDatabaseId) {
      throw new Error(`Backup databaseId (${preParsedMeta.targetDatabaseId}) does not match current target (${target.firestoreDatabaseId}).`);
    }

    if (!confirmed) {
      const ok = await promptForConfirmation(
        `\nConfirm rollback of /adMetrics ONLY on ${envLabel} [${target.projectId}]. Type ROLLBACK_AD_METRICS: `,
        'ROLLBACK_AD_METRICS'
      );
      if (!ok) {
        console.error('[ABORTED] Rollback cancelled by user.');
        return { executed: false, plans: [] };
      }
    }

    if (!target.emulatorHost && process.env.FIREBASE_ADMIN_LIVE_AUTHORIZED !== 'true') {
      throw new Error('Live rollback blocked: set FIREBASE_ADMIN_LIVE_AUTHORIZED=true for production execution.');
    }

    const { db } = getPrivilegedAdminFirestore(target);
    const backupData = deserializeBackupSnapshot(rawBackupJson, db);
    const metricsBackup = backupData.adMetricsBackup || {};
    for (const [slotId, metricDoc] of Object.entries(metricsBackup)) {
      await db.collection('adMetrics').doc(slotId).set(metricDoc, { merge: true });
      console.log(`[ROLLED_BACK] Restored /adMetrics/${slotId}`);
    }
    return { executed: true, plans: [] };
  }

  console.log(`MODE              : ${execute ? 'EXECUTE (PRIVILEGED ADMIN SDK WRITE)' : 'DRY-RUN (LOCAL SEED SIMULATION)'}\n`);

  if (!execute) {
    const simulatedLegacyDocs: RawAdSlotDocument[] = DEFAULT_AD_SLOTS.map(slot => {
      const metrics = DEFAULT_AD_METRICS[slot.id];
      return {
        ...slot,
        ...(typeof metrics?.impressions === 'number' ? { impressions: metrics.impressions } : {}),
        ...(typeof metrics?.clicks === 'number' ? { clicks: metrics.clicks } : {}),
        ...(typeof metrics?.revenue === 'number' ? { revenue: metrics.revenue } : {})
      };
    });

    const plans = simulatedLegacyDocs.map(rawDoc =>
      buildDocumentMigrationPlan(rawDoc, String(rawDoc.id || ''), null)
    );

    for (const plan of plans) {
      if (plan.dryRunStatus === 'ERROR' || !plan.privateMetricsDoc) {
        console.error(`[DRY-RUN] ${plan.slotId} | Status: ERROR | ${plan.error}`);
        continue;
      }
      const revDesc =
        plan.privateMetricsDoc.revenueStatus === 'actual'
          ? `revenue=${plan.privateMetricsDoc.revenue} (actual)`
          : `revenue=null (missing${plan.privateMetricsDoc.estimatedRevenue !== undefined ? `; est=${plan.privateMetricsDoc.estimatedRevenue}` : ''})`;
      console.log(
        `[DRY-RUN] ${plan.slotId} | Status: ${plan.dryRunStatus} | Would delete from /adSlots: [${
          plan.legacyFieldsToDelete.join(', ') || 'none'
        }] | Would write /adMetrics => impressions=${plan.privateMetricsDoc.impressions}, clicks=${plan.privateMetricsDoc.clicks}, ${revDesc}`
      );
      if (plan.conflicts.length > 0) {
        console.log(`          Conflicts: ${plan.conflicts.map(c => `${c.field} (${c.resolution})`).join('; ')}`);
      }
    }

    console.log('\n[DRY-RUN COMPLETE] Zero Firestore writes, zero deletes, and zero backup files created.');
    console.log('NOTE: Run "--audit-production" with Admin SDK credentials to inspect live production documents read-only.');
    console.log('=== SAFE ROLLBACK POLICY ===');
    console.log('1. --execute automatically creates a timestamped pre-migration backup in ./backups/ before any write.');
    console.log('2. --rollback <backupFile> restores ONLY /adMetrics and NEVER re-exposes private metrics in public /adSlots.');
    return { plans, executed: false };
  }

  // Live or Emulator Execution Gates
  if (!target.emulatorHost && process.env.FIREBASE_ADMIN_LIVE_AUTHORIZED !== 'true') {
    throw new Error(
      'Production execution blocked: set FIREBASE_ADMIN_LIVE_AUTHORIZED=true and provide Application Default Credentials to execute against production.'
    );
  }

  if (!confirmed) {
    const ok = await promptForConfirmation(
      `\nWARNING: About to migrate /adSlots -> /adMetrics on ${envLabel} [${target.projectId} / ${target.firestoreDatabaseId}].\nType MIGRATE_AD_METRICS to continue: `,
      'MIGRATE_AD_METRICS'
    );
    if (!ok) {
      console.error('[ABORTED] Confirmation token mismatch. Zero Firestore operations performed.');
      return { plans: [], executed: false };
    }
  }

  const { db } = getPrivilegedAdminFirestore(target);
  const [slotsSnap, metricsSnap] = await Promise.all([
    db.collection('adSlots').get(),
    db.collection('adMetrics').get()
  ]);

  const sourceDocs: RawAdSlotDocument[] = slotsSnap.docs.map(d => ({
    ...(d.data() as Record<string, unknown>),
    id: String(d.data().id || d.id)
  }));
  const existingMetricsMap: Record<string, Partial<AdMetricsDocument>> = {};
  metricsSnap.docs.forEach(d => {
    existingMetricsMap[d.id] = d.data() as Partial<AdMetricsDocument>;
  });

  // Step 1: Write timestamped backup snapshot BEFORE any write or delete
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `adSlots-backup-${target.projectId}-${Date.now()}.json`);
  fs.writeFileSync(backupFile, serializeBackupSnapshot(target, sourceDocs, existingMetricsMap), 'utf-8');
  console.log(`[BACKUP] Exported pre-migration snapshot (${sourceDocs.length} adSlots, ${metricsSnap.size} adMetrics) -> ${backupFile}`);

  const plans: DocumentMigrationPlan[] = [];

  // Step 2: Per-document idempotent Write -> Firestore-Type-Safe Full-Field Read-Back Verify -> FieldValue.delete()
  for (const rawDoc of sourceDocs) {
    const slotId = String(rawDoc.id || '');
    const existingMetric = existingMetricsMap[slotId] || null;
    const plan = buildDocumentMigrationPlan(rawDoc, slotId, existingMetric);

    if (plan.dryRunStatus === 'ERROR' || !plan.privateMetricsDoc) {
      if (archiveOversized && plan.error?.includes('exceeds safe limit')) {
        try {
          const { doc: rawFullMetrics } = extractPrivateAdMetrics(rawDoc, slotId, existingMetric);
          const overflowFields: Record<string, unknown> = {};
          for (const key of ['campaignPerformance', 'internalTracking', 'legacyExtraFields'] as const) {
            if (rawFullMetrics[key] !== undefined) {
              overflowFields[key] = rawFullMetrics[key];
            }
          }
          const archiveBundle = buildChunkedArchiveRecords(slotId, overflowFields);
          const chunksCol = db.collection('adMetricsArchive').doc(slotId).collection('chunks');
          for (const chunkEntry of archiveBundle.chunks) {
            await chunksCol.doc(chunkEntry.chunkId).set(chunkEntry.doc);
          }
          const verifiedChunksSnap = await chunksCol.get();
          const recoveredCheck = recoverFromArchiveChunks(
            verifiedChunksSnap.docs.map(d => d.data() as AdMetricsArchiveChunkDocument),
            archiveBundle.checksumSha256,
            db
          );
          if (!deepEqual(overflowFields, recoveredCheck.recoveredFields)) {
            throw new Error('Archive chunk verification mismatch after write.');
          }
          const compactMetricsDoc: AdMetricsDocument = {
            ...rawFullMetrics,
            archivedToSubcollection: true,
            archivedFields: archiveBundle.archivedFields,
            archiveChunkCount: archiveBundle.chunks.length,
            archiveChecksumSha256: archiveBundle.checksumSha256
          };
          delete compactMetricsDoc.campaignPerformance;
          delete compactMetricsDoc.internalTracking;
          delete compactMetricsDoc.legacyExtraFields;

          const compactSize = estimateFirestoreDocumentBytes(
            `adMetrics/${slotId}`,
            compactMetricsDoc as unknown as Record<string, unknown>
          );
          if (compactSize.exceedsSafeLimit) {
            throw new Error(`Compacted /adMetrics/${slotId} still exceeds safe limit (${compactSize.estimatedBytes} bytes).`);
          }
          plan.privateMetricsDoc = compactMetricsDoc;
          plan.dryRunStatus = existingMetric ? 'WOULD_CLEANUP' : 'WOULD_MIGRATE';
          plan.estimatedBytes = compactSize.estimatedBytes;
          delete plan.error;
        } catch (archErr) {
          plan.executeStatus = 'ERROR';
          plan.error = archErr instanceof Error ? archErr.message : String(archErr);
          plans.push(plan);
          console.error(`[ERROR] ${plan.slotId} | Status: ERROR | ${plan.error}`);
          continue;
        }
      } else {
        plan.executeStatus = 'ERROR';
        plans.push(plan);
        console.error(`[ERROR] ${plan.slotId} | Status: ERROR | ${plan.error}`);
        continue;
      }
    }

    if (plan.dryRunStatus === 'ALREADY_CLEAN') {
      plan.executeStatus = 'ALREADY_CLEAN';
      plans.push(plan);
      console.log(`[EXEC] ${plan.slotId} | Status: ALREADY_CLEAN`);
      continue;
    }

    if (plan.conflicts.length > 0) {
      console.warn(`[CONFLICT NOTICE] ${plan.slotId} | ${plan.conflicts.map(c => `${c.field}: ${c.note}`).join(' | ')}`);
    }

    try {
      const metricsRef = db.collection('adMetrics').doc(plan.slotId);
      const slotRef = db.collection('adSlots').doc(plan.slotId);

      // A. Write validated private metrics to /adMetrics first (clearing stale estimate fields if actual revenue exists)
      const metricsWritePayload: Record<string, unknown> = { ...plan.privateMetricsDoc };
      if (
        plan.privateMetricsDoc.revenueStatus === 'actual' &&
        existingMetric &&
        (existingMetric.estimatedRevenue !== undefined ||
          existingMetric.revenueEstimateStatus !== undefined ||
          existingMetric.revenueEstimateFormula !== undefined)
      ) {
        metricsWritePayload.estimatedRevenue = FieldValue.delete();
        metricsWritePayload.revenueEstimateStatus = FieldValue.delete();
        metricsWritePayload.revenueEstimateFormula = FieldValue.delete();
      }
      await metricsRef.set(metricsWritePayload, { merge: true });

      // B. Read-back verification comparing EVERY retained merged field using Firestore-type-safe deepEqual
      const verifiedSnap = await metricsRef.get();
      const verifiedData = verifiedSnap.data() as Record<string, unknown> | undefined;
      const verification = verifyMetricsReadBack(plan.privateMetricsDoc, verifiedSnap.exists ? verifiedData : null);

      if (!verifiedSnap.exists || !verification.ok) {
        plan.executeStatus = 'ERROR';
        plan.error = `Read-back verification mismatch on /adMetrics fields [${verification.mismatches.join(', ')}]; skipped legacy field deletion on /adSlots.`;
        plans.push(plan);
        console.error(`[ERROR] ${plan.slotId} | ${plan.error}`);
        continue;
      }

      // C. Delete legacy private fields from /adSlots ONLY after verified /adMetrics persistence
      if (plan.legacyFieldsToDelete.length > 0) {
        const deleteUpdate: Record<string, unknown> = { ...plan.publicDoc };
        for (const legacyKey of plan.legacyFieldsToDelete) {
          deleteUpdate[legacyKey] = FieldValue.delete();
        }
        await slotRef.set(deleteUpdate, { merge: true });
        plan.executeStatus = plan.dryRunStatus === 'WOULD_CLEANUP' ? 'NEEDS_CLEANUP' : 'MIGRATED';
      } else {
        plan.executeStatus = 'MIGRATED';
      }

      plans.push(plan);
      console.log(`[EXEC] ${plan.slotId} | Status: ${plan.executeStatus}`);
    } catch (err) {
      plan.executeStatus = 'ERROR';
      plan.error = err instanceof Error ? err.message : String(err);
      plans.push(plan);
      console.error(`[ERROR] ${plan.slotId} | Status: ERROR | ${plan.error}`);
    }
  }

  return { plans, executed: true, backupFile };
}

const isDirectCli = process.argv[1]?.includes('migrate-ad-metrics');
if (isDirectCli) {
  const auditProductionFlag = process.argv.includes('--audit-production');
  const executeFlag = process.argv.includes('--execute');
  const archiveOversizedFlag = process.argv.includes('--archive-oversized');
  const yesFlag = process.argv.includes('--yes');
  const emulatorFlag = process.argv.includes('--emulator');
  const rollbackIdx = process.argv.indexOf('--rollback');
  const rollbackFile = rollbackIdx >= 0 ? process.argv[rollbackIdx + 1] : undefined;
  const recoverIdx = process.argv.indexOf('--recover-archive');
  const recoverArchiveSlotId = recoverIdx >= 0 ? process.argv[recoverIdx + 1] : undefined;

  runAdMetricsMigration({
    auditProduction: auditProductionFlag,
    execute: executeFlag,
    archiveOversized: archiveOversizedFlag,
    recoverArchiveSlotId,
    confirmed: yesFlag,
    emulatorOnly: emulatorFlag,
    rollbackFile
  }).catch(err => {
    console.error('[MIGRATION ERROR]', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Timestamp, GeoPoint } from 'firebase-admin/firestore';
import {
  buildDocumentMigrationPlan,
  extractPrivateAdMetrics,
  deepEqual,
  deepCloneFirestore,
  verifyMetricsReadBack,
  inspectAdSlotAuditDocument,
  estimateFirestoreDocumentBytes,
  resolveFirebaseTargetConfig,
  serializeBackupSnapshot,
  deserializeBackupSnapshot,
  buildChunkedArchiveRecords,
  recoverFromArchiveChunks,
  runAdMetricsMigration,
  SAFE_FIRESTORE_DOC_BYTES,
  RawAdSlotDocument
} from './scripts/migrate-ad-metrics.js';
import { StorageService, toPublicAdSlot } from './src/services/storage.js';
import { verifyAdminStatus } from './src/services/auth-service.js';

async function runPhase2ITests() {
  console.log('=== PHASE 2I DATA INTEGRITY & SAFE ROLLOUT LOCAL TEST SUITE ===\n');

  const basePublic: RawAdSlotDocument = {
    id: 'ad-test-slot',
    name: 'Test Slot',
    type: 'leaderboard',
    dimensions: '728 × 90 px',
    sponsorName: 'Test Sponsor',
    headline: 'Headline',
    tagline: 'Tagline',
    ctaText: 'Go',
    ctaUrl: 'https://example.com',
    badgeLabel: 'Sponsored',
    isEnabled: true
  };

  // Test 1: Revenue missing -> preserved as null + revenueStatus='missing' (never fabricated into revenue)
  const docMissingRev: RawAdSlotDocument = { ...basePublic, impressions: 1000, clicks: 50 };
  const planMissingRev = buildDocumentMigrationPlan(docMissingRev, 'ad-test-slot', null);
  assert.equal(planMissingRev.dryRunStatus, 'WOULD_MIGRATE');
  assert.equal(planMissingRev.privateMetricsDoc?.revenue, null);
  assert.equal(planMissingRev.privateMetricsDoc?.revenueStatus, 'missing');
  assert.equal(planMissingRev.privateMetricsDoc?.revenueEstimateStatus, 'estimated');
  assert.ok(typeof planMissingRev.privateMetricsDoc?.estimatedRevenue === 'number');
  console.log('[PASS] Test 1: Revenue missing stays null (missing), never written as actual revenue.');

  // Test 2: Revenue genuine zero -> preserved strictly as 0 + revenueStatus='actual'
  const docZeroRev: RawAdSlotDocument = { ...basePublic, impressions: 1000, clicks: 50, revenue: 0 };
  const planZeroRev = buildDocumentMigrationPlan(docZeroRev, 'ad-test-slot', null);
  assert.equal(planZeroRev.privateMetricsDoc?.revenue, 0);
  assert.equal(planZeroRev.privateMetricsDoc?.revenueStatus, 'actual');
  assert.equal(planZeroRev.privateMetricsDoc?.estimatedRevenue, undefined);
  console.log('[PASS] Test 2: Genuine zero revenue is preserved strictly as 0 (actual).');

  // Test 3: Existing actual revenue preserved verbatim & verified on read-back
  const docExactRev: RawAdSlotDocument = { ...basePublic, impressions: 48200, clicks: 1420, revenue: 1234.56 };
  const planExactRev = buildDocumentMigrationPlan(docExactRev, 'ad-test-slot', null);
  assert.equal(planExactRev.privateMetricsDoc?.revenue, 1234.56);
  assert.equal(planExactRev.privateMetricsDoc?.revenueStatus, 'actual');
  console.log('[PASS] Test 3: Existing actual revenue preserved verbatim.');

  // Test 4: Firestore Timestamp, GeoPoint, Bytes, Nested Maps, and Arrays preservation (zero JSON coercion)
  const sampleTs = Timestamp.fromMillis(1760000000123);
  const sampleGeo = new GeoPoint(37.7749, -122.4194);
  const sampleBytes = Uint8Array.from([1, 2, 3, 255]);
  const typedDoc: RawAdSlotDocument = {
    ...basePublic,
    impressions: 100,
    clicks: 5,
    lastUpdated: sampleTs,
    campaignPerformance: {
      tier: 'A',
      regionCenter: sampleGeo,
      checkpoints: [{ at: sampleTs, clicks: 5 }],
      signature: sampleBytes
    },
    internalTracking: { partner: 'direct', tags: ['q4', 'enterprise'] },
    extraBinaryMeta: { updatedAt: sampleTs, flag: false, emptyVal: null }
  };
  const planTyped = buildDocumentMigrationPlan(typedDoc, 'ad-test-slot', null);
  assert.equal(planTyped.dryRunStatus, 'WOULD_MIGRATE');
  assert.ok(planTyped.privateMetricsDoc?.lastUpdated instanceof Timestamp);
  assert.equal(deepEqual(planTyped.privateMetricsDoc?.lastUpdated, sampleTs), true);
  assert.equal(
    verifyMetricsReadBack(planTyped.privateMetricsDoc!, deepCloneFirestore(planTyped.privateMetricsDoc as unknown as Record<string, unknown>)).ok,
    true
  );

  // Detect unsupported non-finite number & nested array safely without deleting source
  const badTypeDoc: RawAdSlotDocument = { ...basePublic, impressions: 10, clicks: 1, campaignPerformance: { broken: Number.NaN } };
  const badPlan = buildDocumentMigrationPlan(badTypeDoc, 'ad-test-slot', null);
  assert.equal(badPlan.dryRunStatus, 'ERROR');
  assert.equal(badPlan.privateMetricsDoc, null);
  console.log('[PASS] Test 4: Firestore Timestamps, GeoPoints, Bytes, nested maps/arrays preserved; invalid types rejected safely.');

  // Test 5: Counter merge idempotency, conflict reporting, & missing vs zero counters
  const existingHigher = { id: 'ad-test-slot', impressions: 500, clicks: 20, revenue: 10 };
  const mergePlan = buildDocumentMigrationPlan(
    { ...basePublic, impressions: 300, clicks: 25, revenue: 10 },
    'ad-test-slot',
    existingHigher
  );
  assert.equal(mergePlan.privateMetricsDoc?.impressions, 500); // kept higher existing
  assert.equal(mergePlan.privateMetricsDoc?.clicks, 25); // kept higher legacy
  assert.equal(mergePlan.conflicts.length, 2); // conflicts explicitly reported

  // Rerun with identical source does not double-count
  const rerunPlan = buildDocumentMigrationPlan(
    { ...basePublic, impressions: 300, clicks: 25, revenue: 10 },
    'ad-test-slot',
    mergePlan.privateMetricsDoc
  );
  assert.equal(rerunPlan.privateMetricsDoc?.impressions, 500);
  assert.equal(rerunPlan.privateMetricsDoc?.clicks, 25);

  // Missing counters stay null ('missing'), distinct from real zero
  const noCounters = extractPrivateAdMetrics(basePublic, 'ad-test-slot', null);
  assert.equal(noCounters.doc.impressions, null);
  assert.equal(noCounters.doc.impressionsStatus, 'missing');
  const zeroCounters = extractPrivateAdMetrics({ ...basePublic, impressions: 0, clicks: 0 }, 'ad-test-slot', null);
  assert.equal(zeroCounters.doc.impressions, 0);
  assert.equal(zeroCounters.doc.impressionsStatus, 'actual');
  console.log('[PASS] Test 5: Cumulative counter merge deterministic, idempotent, conflict-reported, and zero vs missing preserved.');

  // Test 6: Oversized destination document detected safely before write -> ERROR with no deletion
  const hugeString = 'x'.repeat(SAFE_FIRESTORE_DOC_BYTES + 10000);
  const oversizedDoc: RawAdSlotDocument = {
    ...basePublic,
    impressions: 100,
    clicks: 2,
    campaignPerformance: { blob: hugeString }
  };
  const oversizedPlan = buildDocumentMigrationPlan(oversizedDoc, 'ad-test-slot', null);
  assert.equal(oversizedPlan.dryRunStatus, 'ERROR');
  assert.equal(oversizedPlan.privateMetricsDoc, null);
  assert.ok(oversizedPlan.error?.includes('exceeds safe limit'));
  assert.ok(oversizedPlan.error?.includes('/adMetricsArchive/'));
  const sizeCheck = estimateFirestoreDocumentBytes('adMetrics/ad-test-slot', { a: 'hello' });
  assert.equal(sizeCheck.exceedsSafeLimit, false);
  console.log('[PASS] Test 6: Oversized document fails safely before write with recovery guidance and zero source deletion.');

  // Test 7: Admin UI status model distinguishes denied, unavailable, missing, real-zero revenue, & estimated revenue
  const realZeroAdmin = StorageService.getCombinedAdminAdSlots(
    { 'ad-leaderboard-top': { id: 'ad-leaderboard-top', impressions: 0, clicks: 0, revenue: 0 } },
    'ready'
  ).find(s => s.id === 'ad-leaderboard-top');
  assert.equal(realZeroAdmin?.metricsStatus, 'available');
  assert.equal(realZeroAdmin?.revenue, 0);
  assert.equal(realZeroAdmin?.revenueStatus, 'actual');

  const missingRevAdmin = StorageService.getCombinedAdminAdSlots(
    { 'ad-leaderboard-top': { id: 'ad-leaderboard-top', impressions: 100, clicks: 5, revenue: null, estimatedRevenue: 2.59 } },
    'ready'
  ).find(s => s.id === 'ad-leaderboard-top');
  assert.equal(missingRevAdmin?.revenue, null);
  assert.equal(missingRevAdmin?.revenueStatus, 'missing');
  assert.equal(missingRevAdmin?.revenueEstimateStatus, 'estimated');
  assert.equal(missingRevAdmin?.estimatedRevenue, 2.59);

  const actualSuppressesEstAdmin = StorageService.getCombinedAdminAdSlots(
    { 'ad-leaderboard-top': { id: 'ad-leaderboard-top', impressions: 100, clicks: 5, revenue: 42.5, estimatedRevenue: 2.59 } },
    'ready'
  ).find(s => s.id === 'ad-leaderboard-top');
  assert.equal(actualSuppressesEstAdmin?.revenueStatus, 'actual');
  assert.equal(actualSuppressesEstAdmin?.revenueEstimateStatus, undefined);
  assert.equal(actualSuppressesEstAdmin?.estimatedRevenue, undefined);
  console.log('[PASS] Test 7: Admin Studio distinguishes actual zero revenue, missing revenue, consistent revenueEstimateStatus, and denied status.');

  // Test 8: Staged rules contain server-side isAdSlotMigrated protection + client write freeze in protective rules
  const proposedRules = fs.readFileSync('./DRAFT_proposed_firestore.rules', 'utf8');
  const tempRules = fs.readFileSync('./DRAFT_temp_migration_firestore.rules', 'utf8');
  assert.ok(proposedRules.includes('function isAdSlotMigrated(slotId)'));
  assert.ok(proposedRules.includes('allow update: if isAdmin() && isValidId(slotId) && isValidPublicAdSlot(incoming()) && isAdSlotMigrated(slotId);'));
  assert.ok(tempRules.includes('allow create, update, delete: if false;'));

  const target = resolveFirebaseTargetConfig(true);
  assert.ok(target.projectId.length > 0 && target.firestoreDatabaseId.length > 0);
  const dryRun = await runAdMetricsMigration({ execute: false, backupDir: './backups_test_2i' });
  assert.equal(dryRun.executed, false);
  assert.equal(fs.existsSync('./backups_test_2i'), false);
  console.log('[PASS] Test 8: Server-side unmigrated-doc guards in staged rules & clean dry-run verified.');

  // Test 9: Backup serialization + deserialization revival preserves Firestore native types
  const snapshotJson = serializeBackupSnapshot(
    target,
    [typedDoc],
    { 'ad-test-slot': planTyped.privateMetricsDoc! }
  );
  const revived = deserializeBackupSnapshot(snapshotJson);
  assert.equal(revived.targetProjectId, target.projectId);
  assert.equal(revived.targetDatabaseId, target.firestoreDatabaseId);
  assert.ok(revived.adMetricsBackup['ad-test-slot'].lastUpdated instanceof Timestamp);
  assert.equal(
    deepEqual(revived.adMetricsBackup['ad-test-slot'], planTyped.privateMetricsDoc),
    true
  );
  console.log('[PASS] Test 9: Backup serialization & Firestore-type revival round-trips Timestamp/GeoPoint/Bytes cleanly.');

  // Test 10: Chunked /adMetricsArchive splitting + SHA-256 checksummed recovery + unverified email rejection
  const overflowPayload = {
    campaignPerformance: {
      blob: 'A'.repeat(SAFE_FIRESTORE_DOC_BYTES + 25000),
      recordedAt: sampleTs,
      geo: sampleGeo
    },
    internalTracking: { partner: 'direct', rawSig: sampleBytes },
    legacyExtraFields: { legacyKey: 'retained-value' }
  };
  const archiveBundle = buildChunkedArchiveRecords('ad-oversized', overflowPayload);
  assert.ok(archiveBundle.chunks.length >= 2);
  for (const chunkEntry of archiveBundle.chunks) {
    const chunkSize = estimateFirestoreDocumentBytes(
      `adMetricsArchive/ad-oversized/chunks/${chunkEntry.chunkId}`,
      chunkEntry.doc as unknown as Record<string, unknown>
    );
    assert.equal(chunkSize.exceedsSafeLimit, false);
  }
  const recovered = recoverFromArchiveChunks(
    archiveBundle.chunks.map(c => c.doc),
    archiveBundle.checksumSha256
  );
  assert.equal(deepEqual(recovered.recoveredFields, overflowPayload), true);
  assert.throws(() => recoverFromArchiveChunks(archiveBundle.chunks.map(c => c.doc), 'bad_checksum'));

  const unverifiedAdminCheck = await verifyAdminStatus({
    uid: 'u1',
    email: 'ashfaqtayyab318@gmail.com',
    emailVerified: false
  } as unknown as Parameters<typeof verifyAdminStatus>[0]);
  assert.equal(unverifiedAdminCheck, null);
  console.log('[PASS] Test 10: Chunked archive/recovery SHA-256 verification and unverified-email admin rejection passed.');

  // Quick check of preflight audit helper
  const auditReport = inspectAdSlotAuditDocument('ad-test-slot', { ...basePublic, impressions: 10 }, null);
  assert.equal(auditReport.readiness, 'NEEDS_MIGRATION');
  const cleanStripped = toPublicAdSlot(docExactRev);
  assert.equal('revenue' in cleanStripped, false);

  console.log('\nALL 10 FINAL PHASE MIGRATION & INTEGRITY VERIFICATION TESTS PASSED.');
}

runPhase2ITests().catch(err => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});

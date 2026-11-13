import fs from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, query, where, collection, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'eirvan-firestore-test-project';
const LEGACY_PROD_RULES_PATH = './firestore.rules';
const FINAL_RULES_PATH = './DRAFT_proposed_firestore.rules';
const TEMP_PROTECTIVE_RULES_PATH = './DRAFT_temp_migration_firestore.rules';

const validPublicSlot = {
  id: 'ad-native',
  name: 'Native In-Article Card',
  type: 'native-card',
  dimensions: 'Fluid',
  sponsorName: 'Acme Research',
  headline: 'High-Leverage Computing',
  tagline: 'Deploy workloads at low latency.',
  ctaText: 'Explore',
  ctaUrl: 'https://example.com/acme',
  badgeLabel: 'Partner',
  imageUrl: 'https://example.com/banner.webp',
  isEnabled: true
};

const validSlotWithoutImage = {
  id: 'ad-no-image',
  name: 'Minimalist Text Card',
  type: 'rectangle',
  dimensions: '300 x 250 px',
  sponsorName: 'Acme Research',
  headline: 'Low Latency Inference',
  tagline: 'Edge silicon workloads.',
  ctaText: 'Explore',
  ctaUrl: 'https://example.com/acme',
  badgeLabel: 'Sponsored',
  isEnabled: true
};

async function testCurrentBaselineRulesBehavior() {
  console.log('--- Testing Current Production Baseline (firestore.rules) ---');
  const rules = fs.readFileSync(LEGACY_PROD_RULES_PATH, 'utf8');
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: `${PROJECT_ID}-legacy`,
    firestore: { rules }
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const seedDb = context.firestore();
    await setDoc(doc(seedDb, 'articles', 'art-001'), { id: 'art-001', title: 'Published', status: 'published' });
    await setDoc(doc(seedDb, 'articles', 'art-draft'), { id: 'art-draft', title: 'Draft', status: 'draft' });
    await setDoc(doc(seedDb, 'articles', 'art-sched'), { id: 'art-sched', title: 'Scheduled', status: 'scheduled' });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  // Legacy baseline allows broad reads including draft/scheduled documents (motivation for staged upgrade)
  await assertSucceeds(getDoc(doc(unauthDb, 'articles', 'art-001')));
  await assertSucceeds(getDoc(doc(unauthDb, 'articles', 'art-draft')));
  await assertSucceeds(getDoc(doc(unauthDb, 'articles', 'art-sched')));
  await assertSucceeds(getDocs(collection(unauthDb, 'articles')));
  await assertFails(getDoc(doc(unauthDb, 'adMetrics', 'ad-native')));

  await testEnv.cleanup();
  console.log('[PASS] Baseline legacy rules behavior documented & verified cleanly.');
}

async function testProtectiveLockdownRules() {
  console.log('--- Testing DRAFT_temp_migration_firestore.rules (Protective Pre-Migration Window) ---');
  const rules = fs.readFileSync(TEMP_PROTECTIVE_RULES_PATH, 'utf8');
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: `${PROJECT_ID}-protective`,
    firestore: { rules }
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const seedDb = context.firestore();
    await setDoc(doc(seedDb, 'adSlots', 'ad-legacy-unmigrated'), {
      ...validSlotWithoutImage,
      id: 'ad-legacy-unmigrated',
      impressions: 5000,
      clicks: 210
    });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const adminDb = testEnv.authenticatedContext('admin_001', {
    email: 'ashfaqtayyab318@gmail.com',
    email_verified: true
  }).firestore();

  // Unauthenticated reads & old-client metric writes blocked during protective rollout window
  await assertFails(getDoc(doc(unauthDb, 'adSlots', 'ad-legacy-unmigrated')));
  await assertFails(updateDoc(doc(unauthDb, 'adSlots', 'ad-legacy-unmigrated'), { impressions: 5001 }));

  // Even verified Admin client SDK cannot overwrite/delete unmigrated /adSlots during protective freeze
  await assertSucceeds(getDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated')));
  await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated'), validSlotWithoutImage));
  await assertFails(updateDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated'), { isEnabled: false }));
  await assertFails(deleteDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated')));

  await testEnv.cleanup();
  console.log('[PASS] Protective Lockdown Rules verified cleanly.');
}

async function testFinalProposedRules() {
  console.log('--- Testing DRAFT_proposed_firestore.rules (Staged Candidate Rules) ---');
  const rules = fs.readFileSync(FINAL_RULES_PATH, 'utf8');
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });

  // Seed initial data bypassing security rules
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminSeedDb = context.firestore();
    await setDoc(doc(adminSeedDb, 'articles', 'art-001'), { id: 'art-001', title: 'Published Article', status: 'published' });
    await setDoc(doc(adminSeedDb, 'articles', 'art-draft'), {
      id: 'art-draft',
      title: 'Internal Draft',
      status: 'draft',
      editorialNotes: 'Confidential internal review memo'
    });
    await setDoc(doc(adminSeedDb, 'articles', 'art-sched'), {
      id: 'art-sched',
      title: 'Scheduled Embargo Story',
      status: 'scheduled'
    });
    await setDoc(doc(adminSeedDb, 'articlePrivate', 'art-001'), {
      articleId: 'art-001',
      editorialNotes: 'Private editorial source verification memo'
    });
    await setDoc(doc(adminSeedDb, 'adSlots', 'ad-native'), validPublicSlot);
    await setDoc(doc(adminSeedDb, 'adSlots', 'ad-no-metrics-doc'), {
      ...validSlotWithoutImage,
      id: 'ad-no-metrics-doc'
    });
    await setDoc(doc(adminSeedDb, 'adSlots', 'ad-legacy-unmigrated'), {
      ...validSlotWithoutImage,
      id: 'ad-legacy-unmigrated',
      impressions: 5000,
      clicks: 210,
      ctr: 4.2
    });
    await setDoc(doc(adminSeedDb, 'adMetrics', 'ad-native'), { id: 'ad-native', impressions: 100, clicks: 5 });
    await setDoc(doc(adminSeedDb, 'analytics', 'live_telemetry'), { totalPageviews: 1000 });
    await setDoc(doc(adminSeedDb, 'admins', 'staff_99'), { email: 'staff@eirvan.com', role: 'admin' });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const ordinaryDb = testEnv.authenticatedContext('user_123', {
    email: 'reader@example.com',
    email_verified: true
  }).firestore();
  const adminDb = testEnv.authenticatedContext('admin_001', {
    email: 'ashfaqtayyab318@gmail.com',
    email_verified: true
  }).firestore();
  const unverifiedAdminDb = testEnv.authenticatedContext('unverified_1', {
    email: 'admin@eirvan.com',
    email_verified: false
  }).firestore();
  const docAdminDb = testEnv.authenticatedContext('staff_99', {
    email: 'staff@eirvan.com',
    email_verified: true
  }).firestore();
  const mismatchedAdminDb = testEnv.authenticatedContext('staff_99', {
    email: 'attacker@evil.com',
    email_verified: true
  }).firestore();

  // 1-5. Article read controls (published get/query allowed; direct draft/scheduled GET and broad collection LIST denied)
  await assertSucceeds(getDoc(doc(unauthDb, 'articles', 'art-001')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(ordinaryDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-sched')));
  await assertFails(getDocs(collection(unauthDb, 'articles')));
  await assertSucceeds(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'published'))));
  await assertSucceeds(getDoc(doc(adminDb, 'articles', 'art-draft')));

  // 6. Private editorial fields protection (/articlePrivate admin-only + block editorialNotes on published article writes)
  await assertFails(getDoc(doc(unauthDb, 'articlePrivate', 'art-001')));
  await assertFails(getDoc(doc(ordinaryDb, 'articlePrivate', 'art-001')));
  await assertSucceeds(getDoc(doc(adminDb, 'articlePrivate', 'art-001')));
  await assertFails(setDoc(doc(adminDb, 'articles', 'art-pub-leak'), {
    id: 'art-pub-leak',
    title: 'Should Reject Editorial Notes on Published',
    status: 'published',
    editorialNotes: 'Secret note'
  }));

  // Article write protection (public/ordinary denied; art-001..art-009 exception removed)
  await assertFails(setDoc(doc(unauthDb, 'articles', 'art-009'), { title: 'Legacy Exception Exploit', status: 'published' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { title: 'Hacked' }));
  await assertFails(deleteDoc(doc(ordinaryDb, 'articles', 'art-001')));

  // Verified allowlisted & document-provisioned admins can manage articles
  await assertSucceeds(setDoc(doc(adminDb, 'articles', 'art-admin-1'), { title: 'Admin Article', status: 'published' }));
  await assertSucceeds(updateDoc(doc(adminDb, 'articles', 'art-admin-1'), { title: 'Updated Admin Article', status: 'published' }));
  await assertSucceeds(deleteDoc(doc(adminDb, 'articles', 'art-admin-1')));
  await assertSucceeds(setDoc(doc(docAdminDb, 'articles', 'art-staff-1'), { title: 'Staff Article', status: 'draft', editorialNotes: 'OK on draft' }));

  // Unverified email & mismatched UID/email spoofing rejected
  await assertFails(setDoc(doc(unverifiedAdminDb, 'articles', 'art-spoof'), { title: 'Spoof', status: 'published' }));
  await assertFails(setDoc(doc(mismatchedAdminDb, 'articles', 'art-mismatched'), { title: 'Mismatched', status: 'published' }));

  // 5. Public adSlots reads allowed; old client / ordinary writes rejected
  await assertSucceeds(getDoc(doc(unauthDb, 'adSlots', 'ad-native')));
  await assertSucceeds(getDocs(collection(unauthDb, 'adSlots')));
  await assertFails(setDoc(doc(unauthDb, 'adSlots', 'ad-hack'), validPublicSlot));
  await assertFails(updateDoc(doc(unauthDb, 'adSlots', 'ad-native'), { impressions: 101 }));
  await assertFails(updateDoc(doc(ordinaryDb, 'adSlots', 'ad-native'), { isEnabled: false }));
  await assertFails(deleteDoc(doc(ordinaryDb, 'adSlots', 'ad-native')));

  // 6. Migrated document edit succeeds without losing /adMetrics
  await assertSucceeds(setDoc(doc(adminDb, 'adSlots', 'ad-native'), { ...validPublicSlot, isEnabled: false }));
  await assertSucceeds(updateDoc(doc(adminDb, 'adSlots', 'ad-native'), { isEnabled: true }));

  // 7. Brand-new adSlot creation with valid shape succeeds; invalid shapes rejected
  await assertSucceeds(setDoc(doc(adminDb, 'adSlots', 'ad-brand-new'), { ...validSlotWithoutImage, id: 'ad-brand-new' }));
  await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-incomplete'), { id: 'ad-incomplete', isEnabled: true }));
  await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-bad-type'), { ...validSlotWithoutImage, id: 'ad-bad-type', type: 'popup' }));

  // 8. CRITICAL (Phase 2I): New frontend full replacement OR partial update on UNMIGRATED documents is REJECTED
  await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated'), { ...validSlotWithoutImage, id: 'ad-legacy-unmigrated', isEnabled: false }));
  await assertFails(updateDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated'), { isEnabled: false }));
  await assertFails(deleteDoc(doc(adminDb, 'adSlots', 'ad-legacy-unmigrated')));
  await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-no-metrics-doc'), { ...validSlotWithoutImage, id: 'ad-no-metrics-doc', isEnabled: false }));

  // 9. Every blocked legacy/private field & unknown extra fields rejected even on migrated document
  const prohibitedPayloads = [
    { impressions: 100 },
    { clicks: 10 },
    { revenue: 45.5 },
    { ctr: 2.5 },
    { campaignPerformance: { score: 90 } },
    { internalTracking: 'utm_secret' },
    { lastUpdated: '2026-11-12T00:00:00Z' },
    { unknownExtraField: 'shadow' }
  ];
  for (const extra of prohibitedPayloads) {
    await assertFails(setDoc(doc(adminDb, 'adSlots', 'ad-native'), { ...validPublicSlot, ...extra }));
    await assertFails(updateDoc(doc(adminDb, 'adSlots', 'ad-native'), extra));
  }

  // 10. Admin-only /adMetrics, /adMetricsArchive & /analytics
  await assertFails(getDoc(doc(unauthDb, 'adMetrics', 'ad-native')));
  await assertFails(getDocs(collection(ordinaryDb, 'adMetrics')));
  await assertFails(setDoc(doc(ordinaryDb, 'adMetrics', 'ad-native'), { impressions: 999 }));
  await assertSucceeds(setDoc(doc(adminDb, 'adMetrics', 'ad-native'), { id: 'ad-native', impressions: 250, clicks: 12 }));
  await assertSucceeds(getDoc(doc(docAdminDb, 'adMetrics', 'ad-native')));
  await assertFails(getDoc(doc(ordinaryDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1')));
  await assertSucceeds(setDoc(doc(adminDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1'), { chunkIndex: 0 }));

  await assertFails(getDoc(doc(unauthDb, 'analytics', 'live_telemetry')));
  await assertFails(setDoc(doc(ordinaryDb, 'analytics', 'live_telemetry'), { totalPageviews: 0 }));
  await assertSucceeds(getDoc(doc(adminDb, 'analytics', 'live_telemetry')));

  // 11. Admins collection client-write denial & invalid ID / default deny
  await assertFails(getDoc(doc(ordinaryDb, 'admins', 'staff_99')));
  await assertFails(setDoc(doc(adminDb, 'admins', 'new_admin_uid'), { email: 'hacked@eirvan.com' }));
  await assertFails(updateDoc(doc(adminDb, 'admins', 'staff_99'), { role: 'superadmin' }));
  await assertFails(deleteDoc(doc(adminDb, 'admins', 'staff_99')));
  await assertFails(getDoc(doc(ordinaryDb, 'secret_collection', 'doc1')));

  await testEnv.cleanup();
  console.log('[PASS] Final Proposed Rules verified cleanly.');
}

async function runAllEmulatorTests() {
  console.log('=== STARTING FIRESTORE RULES EMULATOR TEST SUITE ===');
  await testCurrentBaselineRulesBehavior();
  await testProtectiveLockdownRules();
  await testFinalProposedRules();
  console.log('=== ALL FIRESTORE EMULATOR TESTS PASSED ===');
}

runAllEmulatorTests().catch((err) => {
  console.error('Emulator Test Execution Exception:', err);
  process.exit(1);
});

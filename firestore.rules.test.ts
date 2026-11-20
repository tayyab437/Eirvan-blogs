import fs from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, query, where, collection, setDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

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
    await setDoc(doc(adminSeedDb, 'articles', 'art-null-views'), { id: 'art-null-views', title: 'Null Views Published Article', status: 'published', views: null });
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
    await setDoc(doc(adminSeedDb, 'articles', 'art-review'), {
      id: 'art-review',
      title: 'In Review Story',
      status: 'in_review'
    });
    await setDoc(doc(adminSeedDb, 'articles', 'art-rejected'), {
      id: 'art-rejected',
      title: 'Rejected Story',
      status: 'rejected'
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
    await setDoc(doc(adminSeedDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1'), {
      slotId: 'ad-native',
      chunkIndex: 0,
      chunkCount: 1,
      payloadChunk: '{}'
    });
    await setDoc(doc(adminSeedDb, 'analytics', 'live_telemetry'), { totalPageviews: 1000 });
    await setDoc(doc(adminSeedDb, 'admins', 'staff_99'), { email: 'staff@eirvan.com', role: 'admin' });
    await setDoc(doc(adminSeedDb, 'secret_collection', 'doc1'), { classification: 'restricted-test' });
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
  const claimAdminDb = testEnv.authenticatedContext('claim_admin_1', {
    email: 'claims-editor@external-partner.org',
    email_verified: true,
    admin: true
  }).firestore();
  const unverifiedClaimAdminDb = testEnv.authenticatedContext('claim_admin_unverified', {
    email: 'claims-unverified@external-partner.org',
    email_verified: false,
    admin: true
  }).firestore();
  const superAdminUpperDb = testEnv.authenticatedContext('super_admin_upper', {
    email: 'ashfaqtayyab318@GMAIL.COM',
    email_verified: true
  }).firestore();

  // 1-5. Article read controls (published get/query allowed; direct draft/scheduled/in_review/rejected GET & non-published queries denied)
  await assertSucceeds(getDoc(doc(unauthDb, 'articles', 'art-001')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(ordinaryDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-sched')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-review')));
  await assertFails(getDoc(doc(unauthDb, 'articles', 'art-rejected')));
  await assertFails(getDocs(collection(unauthDb, 'articles')));
  await assertFails(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'draft'))));
  await assertFails(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'scheduled'))));
  await assertFails(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'in_review'))));
  await assertFails(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'rejected'))));
  await assertFails(getDocs(query(collection(ordinaryDb, 'articles'), where('status', '==', 'draft'))));
  await assertSucceeds(getDocs(query(collection(unauthDb, 'articles'), where('status', '==', 'published'))));
  await assertSucceeds(getDoc(doc(adminDb, 'articles', 'art-draft')));
  await assertSucceeds(getDocs(collection(adminDb, 'articles')));

  // 6. Private editorial fields protection (/articlePrivate admin-only + block editorialNotes on published article writes)
  await assertFails(getDoc(doc(unauthDb, 'articlePrivate', 'art-001')));
  await assertFails(getDoc(doc(ordinaryDb, 'articlePrivate', 'art-001')));
  await assertFails(setDoc(doc(unauthDb, 'articlePrivate', 'art-001'), { articleId: 'art-001', editorialNotes: 'Anon overwrite' }));
  await assertFails(updateDoc(doc(unauthDb, 'articlePrivate', 'art-001'), { editorialNotes: 'Anon patch' }));
  await assertSucceeds(getDoc(doc(adminDb, 'articlePrivate', 'art-001')));
  await assertFails(setDoc(doc(adminDb, 'articles', 'art-pub-leak'), {
    id: 'art-pub-leak',
    title: 'Should Reject Editorial Notes on Published',
    status: 'published',
    editorialNotes: 'Secret note'
  }));

  // Article write & publication status transition protection (public/ordinary denied; art-001..art-009 exception removed)
  await assertFails(setDoc(doc(unauthDb, 'articles', 'art-009'), { title: 'Legacy Exception Exploit', status: 'published' }));
  await assertFails(setDoc(doc(ordinaryDb, 'articles', 'art-ordinary-create'), { title: 'Unauthorized Create', status: 'draft' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { title: 'Hacked' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-draft'), { status: 'published' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-draft'), { status: 'published' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { status: 'draft' }));
  await assertFails(deleteDoc(doc(unauthDb, 'articles', 'art-001')));
  await assertFails(deleteDoc(doc(ordinaryDb, 'articles', 'art-001')));

  // Strict +1 public article view increment allowed ONLY on published articles; tampering, ordinary-user bypasses & non-published increments rejected
  await assertSucceeds(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1) }));
  await assertSucceeds(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: increment(1) }));
  const art001AfterIncrements = await getDoc(doc(unauthDb, 'articles', 'art-001'));
  if (art001AfterIncrements.data()?.views !== 2) {
    throw new Error(`Expected art-001 views to equal 2 after two +1 increments, got ${art001AfterIncrements.data()?.views}`);
  }
  await assertSucceeds(updateDoc(doc(unauthDb, 'articles', 'art-null-views'), { views: increment(1) }));
  const artNullAfterIncrement = await getDoc(doc(unauthDb, 'articles', 'art-null-views'));
  if (artNullAfterIncrement.data()?.views !== 1) {
    throw new Error(`Expected art-null-views to equal 1 after +1 from null, got ${artNullAfterIncrement.data()?.views}`);
  }

  // Tampering attempts by anonymous visitor
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: 0 }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: 2 }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: 9999 }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(2) }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(-1) }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: -1 }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), title: 'Injected' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), slug: 'hijacked-slug' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), status: 'draft' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), contentHtml: '<p>Injected</p>' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), publishedAt: '2020-01-01T00:00:00Z' }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-001'), { views: increment(1), author: { name: 'Spoofed' } }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-draft'), { views: increment(1) }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-sched'), { views: increment(1) }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-review'), { views: increment(1) }));
  await assertFails(updateDoc(doc(unauthDb, 'articles', 'art-rejected'), { views: increment(1) }));

  // Tampering attempts by ordinary authenticated user (must NOT bypass any view restrictions)
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: 0 }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: 9999 }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: increment(2) }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: increment(-1) }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: increment(1), status: 'draft' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-001'), { views: increment(1), contentHtml: '<p>Tampered</p>' }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-draft'), { views: increment(1) }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-sched'), { views: increment(1) }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-review'), { views: increment(1) }));
  await assertFails(updateDoc(doc(ordinaryDb, 'articles', 'art-rejected'), { views: increment(1) }));

  const adminApprovalProof = {
    reviewerUid: 'admin_001',
    reviewerEmail: 'ashfaqtayyab318@gmail.com',
    reviewerName: 'Ashfaq Tayyab',
    reviewedAt: '2026-11-13T12:00:00Z',
    reviewedRevisionHash: 'a'.repeat(64)
  };
  const validPublishedPayload = {
    id: 'art-admin-1',
    title: 'Admin Article',
    status: 'published',
    humanReviewed: true,
    reviewedAt: adminApprovalProof.reviewedAt,
    reviewedRevisionHash: adminApprovalProof.reviewedRevisionHash,
    approval: adminApprovalProof,
    reviewer: {
      uid: 'admin_001',
      email: 'ashfaqtayyab318@gmail.com',
      name: 'Ashfaq Tayyab'
    },
    sources: [{ title: 'Primary Citation', url: 'https://example.com/source' }]
  };

  // Publishing without approval, with forged caller identity, or with mismatched reviewer is rejected
  await assertFails(setDoc(doc(adminDb, 'articles', 'art-unapproved-pub'), { title: 'No Approval', status: 'published' }));
  await assertFails(
    setDoc(doc(adminDb, 'articles', 'art-forged-signer'), {
      ...validPublishedPayload,
      id: 'art-forged-signer',
      approval: { ...adminApprovalProof, reviewerUid: 'staff_99', reviewerEmail: 'staff@eirvan.com' }
    })
  );
  await assertFails(
    setDoc(doc(adminDb, 'articles', 'art-mismatch-reviewer'), {
      ...validPublishedPayload,
      id: 'art-mismatch-reviewer',
      reviewer: { uid: 'other_uid', email: 'other@eirvan.com', name: 'Other Reviewer' }
    })
  );

  // Verified allowlisted admin can publish with matching valid approval proof
  await assertSucceeds(setDoc(doc(adminDb, 'articles', 'art-admin-1'), validPublishedPayload));
  // Concurrent visitor increments on published admin article
  await assertSucceeds(updateDoc(doc(unauthDb, 'articles', 'art-admin-1'), { views: increment(1) }));
  await assertSucceeds(updateDoc(doc(unauthDb, 'articles', 'art-admin-1'), { views: increment(1) }));
  // Non-substantive metric update preserves existing approval cleanly
  await assertSucceeds(updateDoc(doc(adminDb, 'articles', 'art-admin-1'), { views: 42 }));
  // Concurrent visitor increment after admin metric update (views -> 43)
  await assertSucceeds(updateDoc(doc(unauthDb, 'articles', 'art-admin-1'), { views: increment(1) }));
  // Substantive edit keeping prior revision hash/timestamp is rejected
  await assertFails(updateDoc(doc(adminDb, 'articles', 'art-admin-1'), { title: 'Edited Without Reapproval' }));
  // Substantive edit via setDoc(..., { merge: true }) WITHOUT views field (matching FirebaseAdminService.saveArticle) preserves concurrent visitor views (43)
  await assertSucceeds(
    setDoc(
      doc(adminDb, 'articles', 'art-admin-1'),
      {
        title: 'Updated Admin Article',
        reviewedAt: '2026-11-14T12:00:00Z',
        reviewedRevisionHash: 'b'.repeat(64),
        approval: {
          ...adminApprovalProof,
          reviewedAt: '2026-11-14T12:00:00Z',
          reviewedRevisionHash: 'b'.repeat(64)
        }
      },
      { merge: true }
    )
  );
  const artAdminAfterMerge = await getDoc(doc(adminDb, 'articles', 'art-admin-1'));
  if (artAdminAfterMerge.data()?.views !== 43) {
    throw new Error(`Expected admin merge save omitting views to preserve concurrent views=43, got ${artAdminAfterMerge.data()?.views}`);
  }
  await assertSucceeds(deleteDoc(doc(adminDb, 'articles', 'art-admin-1')));

  // Case-insensitive Super Admin (ashfaqtayyab318@GMAIL.COM) full access & approval signing verification
  const superAdminUpperProof = {
    reviewerUid: 'super_admin_upper',
    reviewerEmail: 'ashfaqtayyab318@gmail.com',
    reviewerName: 'Ashfaq Tayyab',
    reviewedAt: '2026-11-16T08:00:00Z',
    reviewedRevisionHash: 'd'.repeat(64)
  };
  await assertSucceeds(getDoc(doc(superAdminUpperDb, 'articles', 'art-draft')));
  await assertSucceeds(getDoc(doc(superAdminUpperDb, 'articlePrivate', 'art-001')));
  await assertSucceeds(getDoc(doc(superAdminUpperDb, 'adMetrics', 'ad-native')));
  await assertSucceeds(getDoc(doc(superAdminUpperDb, 'analytics', 'live_telemetry')));
  await assertSucceeds(
    setDoc(doc(superAdminUpperDb, 'articles', 'art-super-upper'), {
      ...validPublishedPayload,
      id: 'art-super-upper',
      reviewedAt: superAdminUpperProof.reviewedAt,
      reviewedRevisionHash: superAdminUpperProof.reviewedRevisionHash,
      approval: superAdminUpperProof,
      reviewer: {
        uid: 'super_admin_upper',
        email: 'ashfaqtayyab318@gmail.com',
        name: 'Ashfaq Tayyab'
      }
    })
  );
  await assertSucceeds(deleteDoc(doc(superAdminUpperDb, 'articles', 'art-super-upper')));

  // Draft articles cannot carry private editorialNotes on /articles/{id}; notes belong in /articlePrivate/{id}
  await assertFails(
    setDoc(doc(docAdminDb, 'articles', 'art-staff-1'), {
      title: 'Staff Article',
      status: 'draft',
      editorialNotes: 'Should fail on /articles'
    })
  );
  await assertSucceeds(setDoc(doc(docAdminDb, 'articles', 'art-staff-1'), { title: 'Staff Article', status: 'draft' }));
  await assertSucceeds(setDoc(doc(docAdminDb, 'articlePrivate', 'art-staff-1'), { articleId: 'art-staff-1', editorialNotes: 'Internal memo' }));

  // Unverified email & mismatched UID/email spoofing rejected across reads and writes
  await assertFails(getDoc(doc(unverifiedAdminDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(unverifiedAdminDb, 'articlePrivate', 'art-001')));
  await assertFails(getDoc(doc(unverifiedAdminDb, 'adMetrics', 'ad-native')));
  await assertFails(updateDoc(doc(unverifiedAdminDb, 'adSlots', 'ad-native'), { isEnabled: false }));
  await assertFails(
    setDoc(doc(unverifiedAdminDb, 'articles', 'art-spoof'), {
      ...validPublishedPayload,
      id: 'art-spoof',
      approval: { ...adminApprovalProof, reviewerUid: 'unverified_1', reviewerEmail: 'admin@eirvan.com' }
    })
  );
  await assertFails(
    setDoc(doc(mismatchedAdminDb, 'articles', 'art-mismatched'), {
      ...validPublishedPayload,
      id: 'art-mismatched',
      approval: { ...adminApprovalProof, reviewerUid: 'staff_99', reviewerEmail: 'attacker@evil.com' }
    })
  );

  // Custom-claim admin (admin: true, email_verified: true, non-allowlisted email, no /admins doc)
  const claimApprovalProof = {
    reviewerUid: 'claim_admin_1',
    reviewerEmail: 'claims-editor@external-partner.org',
    reviewerName: 'External Claim Editor',
    reviewedAt: '2026-11-15T09:00:00Z',
    reviewedRevisionHash: 'c'.repeat(64)
  };
  await assertSucceeds(getDoc(doc(claimAdminDb, 'articles', 'art-draft')));
  await assertSucceeds(getDoc(doc(claimAdminDb, 'articlePrivate', 'art-001')));
  await assertSucceeds(
    setDoc(doc(claimAdminDb, 'articles', 'art-claim-pub'), {
      ...validPublishedPayload,
      id: 'art-claim-pub',
      reviewedAt: claimApprovalProof.reviewedAt,
      reviewedRevisionHash: claimApprovalProof.reviewedRevisionHash,
      approval: claimApprovalProof,
      reviewer: {
        uid: 'claim_admin_1',
        email: 'claims-editor@external-partner.org',
        name: 'External Claim Editor'
      }
    })
  );
  await assertSucceeds(deleteDoc(doc(claimAdminDb, 'articles', 'art-claim-pub')));

  // Prohibited actions for custom-claim admin (cannot write /admins, cannot forge signer, cannot embed editorialNotes)
  await assertFails(setDoc(doc(claimAdminDb, 'admins', 'claim_admin_1'), { email: 'claims-editor@external-partner.org' }));
  await assertFails(
    setDoc(doc(claimAdminDb, 'articles', 'art-claim-forged'), {
      ...validPublishedPayload,
      id: 'art-claim-forged'
    })
  );
  await assertFails(
    setDoc(doc(claimAdminDb, 'articles', 'art-claim-notes'), {
      id: 'art-claim-notes',
      title: 'Claim Draft With Notes',
      status: 'draft',
      editorialNotes: 'Prohibited on /articles'
    })
  );
  // Custom-claim admin without email_verified == true is rejected
  await assertFails(getDoc(doc(unverifiedClaimAdminDb, 'articles', 'art-draft')));
  await assertFails(getDoc(doc(unverifiedClaimAdminDb, 'adMetrics', 'ad-native')));

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
  await assertFails(setDoc(doc(unauthDb, 'adMetrics', 'ad-native'), { impressions: 999 }));
  await assertFails(updateDoc(doc(unauthDb, 'adMetrics', 'ad-native'), { impressions: 999 }));
  await assertFails(setDoc(doc(ordinaryDb, 'adMetrics', 'ad-native'), { impressions: 999 }));
  await assertSucceeds(setDoc(doc(adminDb, 'adMetrics', 'ad-native'), { id: 'ad-native', impressions: 250, clicks: 12 }));
  await assertSucceeds(getDoc(doc(docAdminDb, 'adMetrics', 'ad-native')));
  await assertFails(getDoc(doc(unauthDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1')));
  await assertFails(getDoc(doc(ordinaryDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1')));
  await assertFails(setDoc(doc(unauthDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1'), { chunkIndex: 0 }));
  await assertSucceeds(getDoc(doc(adminDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c1')));
  await assertSucceeds(setDoc(doc(adminDb, 'adMetricsArchive', 'ad-native', 'chunks', 'c2'), { chunkIndex: 1 }));

  await assertFails(getDoc(doc(unauthDb, 'analytics', 'live_telemetry')));
  await assertFails(setDoc(doc(unauthDb, 'analytics', 'live_telemetry'), { totalPageviews: 0 }));
  await assertFails(setDoc(doc(unauthDb, 'analytics', 'live_telemetry'), { totalPageviews: increment(1), lastUpdated: '2026-11-20T00:00:00Z' }, { merge: true }));
  await assertFails(updateDoc(doc(unauthDb, 'analytics', 'live_telemetry'), { totalPageviews: 0 }));
  await assertFails(updateDoc(doc(unauthDb, 'analytics', 'live_telemetry'), { totalPageviews: increment(1) }));
  await assertFails(setDoc(doc(ordinaryDb, 'analytics', 'live_telemetry'), { totalPageviews: 0 }));
  await assertFails(setDoc(doc(ordinaryDb, 'analytics', 'live_telemetry'), { totalPageviews: increment(1), lastUpdated: '2026-11-20T00:00:00Z' }, { merge: true }));
  await assertSucceeds(getDoc(doc(adminDb, 'analytics', 'live_telemetry')));

  // 11. Admins collection client-write denial & existing unmatched document default deny
  await assertFails(getDoc(doc(unauthDb, 'admins', 'staff_99')));
  await assertFails(getDoc(doc(ordinaryDb, 'admins', 'staff_99')));
  await assertFails(setDoc(doc(unauthDb, 'admins', 'anon_admin'), { email: 'anon@evil.com' }));
  await assertFails(updateDoc(doc(unauthDb, 'admins', 'staff_99'), { role: 'superadmin' }));
  await assertFails(setDoc(doc(adminDb, 'admins', 'new_admin_uid'), { email: 'hacked@eirvan.com' }));
  await assertFails(updateDoc(doc(adminDb, 'admins', 'staff_99'), { role: 'superadmin' }));
  await assertFails(deleteDoc(doc(adminDb, 'admins', 'staff_99')));
  await assertFails(getDoc(doc(unauthDb, 'secret_collection', 'doc1')));
  await assertFails(setDoc(doc(unauthDb, 'secret_collection', 'doc1'), { leak: true }));
  await assertFails(updateDoc(doc(unauthDb, 'secret_collection', 'doc1'), { leak: true }));
  await assertFails(getDoc(doc(ordinaryDb, 'secret_collection', 'doc1')));
  await assertFails(setDoc(doc(ordinaryDb, 'secret_collection', 'doc1'), { leak: true }));
  await assertFails(getDoc(doc(adminDb, 'secret_collection', 'doc1')));
  await assertFails(setDoc(doc(adminDb, 'secret_collection', 'doc1'), { leak: true }));

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

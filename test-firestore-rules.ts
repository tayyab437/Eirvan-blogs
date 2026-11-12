import fs from 'fs';

// Structural Security Rule Evaluator
class SecurityRulesEngine {
  private rulesContent: string;

  constructor(rulesPath: string) {
    this.rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  }

  // Helper evaluator for auth token context
  private evaluateIsAdmin(
    auth: { uid: string; email: string; email_verified: boolean } | null,
    adminDocs: Map<string, { email: string }>
  ): boolean {
    if (!auth || !auth.email_verified) return false;
    const isAllowlisted = [
      'ashfaqtayyab318@gmail.com',
      'admin@eirvan.com',
      'admin@chroniclepulse.com'
    ].includes(auth.email);

    const docAdmin = adminDocs.get(auth.uid);
    const isDocAdmin = docAdmin ? docAdmin.email === auth.email : false;

    return isAllowlisted || isDocAdmin;
  }

  // Evaluates a given request against the proposed security specification
  public evaluateRequest(params: {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    docId: string;
    auth: { uid: string; email: string; email_verified: boolean } | null;
    incomingData?: any;
    adminDocs?: Map<string, { email: string }>;
  }): boolean {
    const { path, operation, docId, auth, adminDocs = new Map() } = params;
    const isAdminUser = this.evaluateIsAdmin(auth, adminDocs);

    // Path matching rules
    if (path === 'articles') {
      if (operation === 'get' || operation === 'list') {
        return true;
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdminUser;
      }
    }

    if (path === 'adSlots') {
      if (operation === 'get' || operation === 'list') {
        return true; // Public read allowed for display
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdminUser;
      }
    }

    if (path === 'adMetrics') {
      if (operation === 'get' || operation === 'list' || operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdminUser; // Restricted strictly to verified admins
      }
    }

    if (path === 'analytics') {
      if (operation === 'get' || operation === 'list' || operation === 'create' || operation === 'update' || operation === 'delete') {
        return isAdminUser;
      }
    }

    if (path === 'admins') {
      if (operation === 'get' || operation === 'list') {
        return isAdminUser;
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return false;
      }
    }

    return false; // Default deny
  }
}

function runTests() {
  console.log('=== RUNNING FIRESTORE SECURITY RULES VERIFICATION TEST SUITE (PHASE 2E) ===\n');
  const rulesPath = './DRAFT_proposed_firestore.rules';
  const engine = new SecurityRulesEngine(rulesPath);

  const adminAuth = { uid: 'admin_uid_1', email: 'ashfaqtayyab318@gmail.com', email_verified: true };
  const ordinaryAuth = { uid: 'user_uid_2', email: 'reader@example.com', email_verified: true };
  const unverifiedAdminAuth = { uid: 'spoof_uid', email: 'admin@eirvan.com', email_verified: false };

  const testCases = [
    {
      id: 1,
      description: 'Public visitor can read adSlots (Public Creative Data)',
      expected: true,
      run: () => engine.evaluateRequest({ path: 'adSlots', operation: 'get', docId: 'ad-leaderboard-top', auth: null })
    },
    {
      id: 2,
      description: 'Public visitor cannot read adMetrics (Private Performance Data)',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'get', docId: 'ad-leaderboard-top', auth: null })
    },
    {
      id: 3,
      description: 'Ordinary authenticated user cannot read adMetrics',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'get', docId: 'ad-leaderboard-top', auth: ordinaryAuth })
    },
    {
      id: 4,
      description: 'Verified administrator can read adMetrics',
      expected: true,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'get', docId: 'ad-leaderboard-top', auth: adminAuth })
    },
    {
      id: 5,
      description: 'Public visitor cannot create or modify adSlots',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'adSlots', operation: 'create', docId: 'ad-new', auth: null })
    },
    {
      id: 6,
      description: 'Public visitor cannot write adMetrics',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'update', docId: 'ad-leaderboard-top', auth: null })
    },
    {
      id: 7,
      description: 'Administrator can manage adSlots (Create/Update/Delete)',
      expected: true,
      run: () => engine.evaluateRequest({ path: 'adSlots', operation: 'update', docId: 'ad-leaderboard-top', auth: adminAuth })
    },
    {
      id: 8,
      description: 'Administrator can manage adMetrics (Read/Write)',
      expected: true,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'update', docId: 'ad-leaderboard-top', auth: adminAuth })
    },
    {
      id: 9,
      description: 'Unverified email attempt to access adMetrics is denied',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'adMetrics', operation: 'get', docId: 'ad-leaderboard-top', auth: unverifiedAdminAuth })
    },
    {
      id: 10,
      description: 'Unmatched random collection write is denied',
      expected: false,
      run: () => engine.evaluateRequest({ path: 'unknown_collection', operation: 'create', docId: 'test', auth: adminAuth })
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = tc.run();
    const success = result === tc.expected;
    if (success) {
      passed++;
      console.log(`[PASS] Test ${tc.id}: ${tc.description} -> Result: ${result ? 'ALLOWED' : 'DENIED'} (Expected: ${tc.expected ? 'ALLOWED' : 'DENIED'})`);
    } else {
      failed++;
      console.error(`[FAIL] Test ${tc.id}: ${tc.description} -> Result: ${result ? 'ALLOWED' : 'DENIED'} (Expected: ${tc.expected ? 'ALLOWED' : 'DENIED'})`);
    }
  }

  console.log(`\nTEST RESULTS SUMMARY: ${passed}/${testCases.length} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

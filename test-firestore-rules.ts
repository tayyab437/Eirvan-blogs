import fs from 'node:fs';
import { execSync } from 'node:child_process';

type CheckOutcome = 'VERIFIED_PASS' | 'VERIFIED_GAP' | 'NOT_VERIFIED';

interface ProbeResult {
  scenario: string;
  target: 'CURRENT_PRODUCTION' | 'STAGED_CANDIDATE';
  status: CheckOutcome;
  evidence: string;
}

function hasBinary(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runLiveReadOnlyProbes(): Promise<ProbeResult[]> {
  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
  const results: ProbeResult[] = [];

  // 1. Public retrieval of published article (current production)
  const pubGet = await fetch(`${baseUrl}/articles/art-001?key=${cfg.apiKey}`);
  results.push({
    scenario: '1. Public retrieval (GET) of a published article',
    target: 'CURRENT_PRODUCTION',
    status: pubGet.status === 200 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only REST GET /articles/art-001 returned HTTP ${pubGet.status}`
  });

  // 2. Direct retrieval of a draft article in production (cannot assert unless a live draft exists)
  results.push({
    scenario: '2. Direct document retrieval (GET) of a draft article',
    target: 'CURRENT_PRODUCTION',
    status: 'NOT_VERIFIED',
    evidence:
      'No unauthenticated direct GET test can pass safely without creating a live draft document (0 draft docs returned by runQuery; forbidden to mutate production).'
  });

  // 3. Direct retrieval of a scheduled article in production
  results.push({
    scenario: '3. Direct document retrieval (GET) of a scheduled article',
    target: 'CURRENT_PRODUCTION',
    status: 'NOT_VERIFIED',
    evidence:
      'No scheduled doc exists to probe without mutating live production DB.'
  });

  // 4. Broad unauthenticated collection LIST
  const broadList = await fetch(`${baseUrl}/articles?key=${cfg.apiKey}`);
  results.push({
    scenario: '4. Broad unauthenticated collection query (LIST /articles)',
    target: 'CURRENT_PRODUCTION',
    status: broadList.status === 403 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only REST GET /articles returned HTTP ${broadList.status}`
  });

  // 5. Query constrained to status == published vs draft
  const rqPub = await fetch(`${baseUrl}:runQuery?key=${cfg.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'articles' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
        limit: 50
      }
    })
  });
  const pubRows = rqPub.ok ? ((await rqPub.json()) as any[]).filter(r => r.document) : [];
  results.push({
    scenario: '5a. Query constrained to status == "published"',
    target: 'CURRENT_PRODUCTION',
    status: rqPub.status === 200 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only :runQuery (status=="published") returned HTTP ${rqPub.status} (${pubRows.length} docs)`
  });

  const rqDraft = await fetch(`${baseUrl}:runQuery?key=${cfg.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'articles' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'draft' } } },
        limit: 10
      }
    })
  });
  results.push({
    scenario: '5b. Unauthenticated query constrained to status == "draft"',
    target: 'CURRENT_PRODUCTION',
    status: rqDraft.status === 403 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only :runQuery (status=="draft") returned HTTP ${rqDraft.status} (HTTP 200 means live deployed rules do not enforce status=="published" on queries yet)`
  });

  // 6. Access to private editorial fields (/articlePrivate)
  const privGet = await fetch(`${baseUrl}/articlePrivate/art-001?key=${cfg.apiKey}`);
  results.push({
    scenario: '6. Unauthenticated read of /articlePrivate/{id}',
    target: 'CURRENT_PRODUCTION',
    status: privGet.status === 403 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only REST GET /articlePrivate/art-001 returned HTTP ${privGet.status}`
  });

  // 7. Access to ad metrics (/adMetrics)
  const adList = await fetch(`${baseUrl}/adMetrics?key=${cfg.apiKey}`);
  const adGet = await fetch(`${baseUrl}/adMetrics/ad-leaderboard-top?key=${cfg.apiKey}`);
  results.push({
    scenario: '7. Unauthenticated read of /adMetrics',
    target: 'CURRENT_PRODUCTION',
    status: adList.status === 403 && adGet.status === 403 ? 'VERIFIED_PASS' : 'VERIFIED_GAP',
    evidence: `Read-only REST LIST /adMetrics HTTP ${adList.status}; GET /adMetrics/ad-leaderboard-top HTTP ${adGet.status}`
  });

  // 8. Administrator access on live production (no service credentials in sandbox)
  results.push({
    scenario: '8. Authenticated Admin access against live production',
    target: 'CURRENT_PRODUCTION',
    status: 'NOT_VERIFIED',
    evidence: 'Requires verified Firebase Admin user token or Admin SDK credentials (not run under read-only/unprivileged sandbox policy).'
  });

  return results;
}

function getStagedEmulatorStatus(): ProbeResult[] {
  const emulatorReady = hasBinary('java') && hasBinary('firebase');
  const reason = emulatorReady
    ? 'Execute via: firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"'
    : 'NOT VERIFIED: Java and Firebase Emulator CLI are not installed in this environment (cannot run firestore.rules.test.ts locally; never report simulated results as PASS).';

  const stagedScenarios = [
    '1. Public retrieval (GET) of published article (DRAFT_proposed_firestore.rules)',
    '2. Direct GET denial on status=="draft" article (DRAFT_proposed_firestore.rules)',
    '3. Direct GET denial on status=="scheduled" article (DRAFT_proposed_firestore.rules)',
    '4. Broad unauthenticated collection LIST /articles denial when drafts exist (DRAFT_proposed_firestore.rules)',
    '5. Query constrained to status=="published" succeeds cleanly (DRAFT_proposed_firestore.rules)',
    '6. /articlePrivate admin-only isolation & editorialNotes blocked on published /articles (DRAFT_proposed_firestore.rules)',
    '7. /adMetrics & /adMetricsArchive admin-only + PublicAdSlot allowlist + migration guard (DRAFT_proposed_firestore.rules)',
    '8. Admin email_verified + /admins whitelist validation & spoof rejection (DRAFT_proposed_firestore.rules)'
  ];

  return stagedScenarios.map(scenario => ({
    scenario,
    target: 'STAGED_CANDIDATE',
    status: 'NOT_VERIFIED',
    evidence: reason
  }));
}

async function main() {
  console.log('=== FIRESTORE ACCESS VERIFICATION MATRIX (PRODUCTION READ-ONLY VS STAGED CANDIDATE) ===\n');

  const liveResults = await runLiveReadOnlyProbes();
  const stagedResults = getStagedEmulatorStatus();

  for (const r of [...liveResults, ...stagedResults]) {
    console.log(`[${r.status}] (${r.target}) ${r.scenario} -> ${r.evidence}`);
  }

  // Validate syntax invariants inside staged rules file (static inspection only, not runtime enforcement claim)
  const stagedContent = fs.readFileSync('./DRAFT_proposed_firestore.rules', 'utf8');
  if (!stagedContent.includes("resource.data.status == 'published'") || !stagedContent.includes('match /articlePrivate/{articleId}')) {
    console.error('[FAIL] DRAFT_proposed_firestore.rules missing expected article/private rule definitions.');
    process.exit(1);
  }
  console.log('\nStatic file assertions on DRAFT_proposed_firestore.rules present; runtime rule verification awaits Firebase Emulator.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

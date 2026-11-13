# Runbook B — Firestore Ad-Metrics Separation & Security Rules Rollout

> **Scope Isolation**: This runbook covers **Cloud Firestore schema/privacy separation and security rules deployment only**. It is completely decoupled from deploying static HTML to IONOS (`RUNBOOK_SEO_IONOS_RELEASE.md`).
>
> **DO NOT EXECUTE `--execute` OR DEPLOY RULES WITHOUT EXPLICIT PRODUCTION AUTHORIZATION.**

---

## 1. Target Environment
- **Firebase Project ID**: `gen-lang-client-0804123492`
- **Firestore Database ID**: `ai-studio-chroniclepulsehi-83a4c935-1a54-4a94-a27b-02d2985db02d`
- **Staged Candidate Rules**: `DRAFT_proposed_firestore.rules` (enforces `/adSlots` 12-field `PublicAdSlot` allowlist, server-side `isAdSlotMigrated(slotId)` guard, admin-only `/adMetrics`, `/adMetricsArchive`, `/analytics`, `/articlePrivate`, verified admin checks, and `status == 'published'` restriction on unauthenticated `/articles` reads)
- **Live Rules Baseline (Untouched Until Rollout)**: `firestore.rules`

## 2. Mandatory Pre-Rollout Gates

### Gate 1: Run Real Firebase Emulator Test Suite (Operator Workstation with Java + Firebase CLI)
```bash
firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
```
All assertions across `firestore.rules`, `DRAFT_temp_migration_firestore.rules`, and `DRAFT_proposed_firestore.rules` must exit `0`:
- Public GET of `published` articles succeeds; direct GET of `draft` and `scheduled` fails.
- Broad unauthenticated collection `LIST` on `/articles` fails when drafts exist; `where('status', '==', 'published')` succeeds.
- `/articlePrivate` & `editorialNotes` on published `/articles` are rejected for non-admins / public writes.
- `/adMetrics` and `/adMetricsArchive` are inaccessible to unauthenticated and non-admin callers.
- Unverified email and mismatched `/admins/{uid}` spoofing attempts fail.

### Gate 2: Run Local Data Integrity & Dry-Run Suite
```bash
npx tsx test-ad-privacy-migration.ts
```

### Gate 3: Production Read-Only Audit (Admin SDK Required)
Run on a machine with read access (`GOOGLE_APPLICATION_CREDENTIALS`) against live production:
```bash
npx tsx scripts/migrate-ad-metrics.ts --audit-production
```
Inspect every reported status (`ALREADY_CLEAN`, `NEEDS_MIGRATION`, `NEEDS_CLEANUP`, `BLOCKED_MALFORMED`), unexpected legacy fields, and orphaned `/adMetrics` docs. Resolve any `BLOCKED_MALFORMED` records before proceeding.

### Gate 4: Explicit Authorization Sign-Off
Obtain explicit operator approval before writing to production Firestore or deploying security rules.

## 3. Authorized Migration & Rules Deployment Sequence
1. *(Optional high-safety freeze)* Temporarily deploy `DRAFT_temp_migration_firestore.rules` if preventing legacy client metric writes during migration cutover.
2. **Execute Migration with Automatic Backup Verification**:
   ```bash
   npx tsx scripts/migrate-ad-metrics.ts --execute
   ```
   - Automatically writes a timestamped pre-migration snapshot in `./backups/` prior to any mutation.
   - Verifies backup readability & Firestore native type round-trip before migrating `/adSlots` → `/adMetrics` (and `/adMetricsArchive` if payloads exceed limits).
3. **Verify Post-Migration Readback**:
   ```bash
   npx tsx scripts/migrate-ad-metrics.ts --audit-production
   ```
   Confirm `0` documents remain in `NEEDS_MIGRATION` / `NEEDS_CLEANUP`.
4. **Deploy Final Hardened Rules**:
   Promote `DRAFT_proposed_firestore.rules` → `firestore.rules` cleanly and deploy via authorized Firebase CLI / `DeployRules`.

## 4. Emergency Rollback Readiness
To restore `/adMetrics` state cleanly from the verified snapshot without re-exposing private fields in public `/adSlots`:
```bash
npx tsx scripts/migrate-ad-metrics.ts --rollback ./backups/<timestamped-backup>.json
```

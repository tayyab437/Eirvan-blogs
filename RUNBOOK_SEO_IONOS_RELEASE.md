# Runbook A — Static SEO Release to IONOS Web Hosting Plus (Apache 2.4+)

> **Scope Isolation**: This runbook covers **static web publication deployment only** (`dist/` → IONOS document root). It does **NOT** execute ad-metrics migration or deploy Firestore security rules (see `RUNBOOK_FIRESTORE_AD_MIGRATION_AND_RULES.md`).

---

## 1. Architecture Confirmation
- **Target Domain**: `https://eirvan.com`
- **Hosting**: IONOS Web Hosting Plus (Apache 2.4+, static document root)
- **No Separate Node.js Production Server**: `server.ts` / `server.js` exist strictly for local/AI Studio preview and **must NEVER be uploaded** into the IONOS document root.

## 2. Pre-Build Editorial Checklist (Studio & Source Control)
1. Confirm every story intended for public release has:
   - `status === 'published'`
   - `humanReviewed === true` (and `aiAssisted: false` unless human fact-check sign-off is checked)
   - At least one verified primary citation in `sources`
   - Valid `/articles/<slug>`, `canonicalUrl`, descriptive `imageAlt`, and valid `robotsDirective`.
2. Reconcile any discrepancies between Cloud Firestore and local `src/data/seedArticles.ts` before cutting a release.

## 3. Clean Local Build & Static Verification
Run in workspace root:
```bash
npm run build
npx tsc --noEmit
npx tsx test-seo-build.ts
```
Verify from build output:
- Zero source maps (`*.map`) inside `dist/`.
- Zero Netlify/Cloudflare sidecars (`_headers`, `_redirects`) or `server.js` inside `dist/`.
- `dist/.htaccess`, `dist/robots.txt`, `dist/sitemap.xml`, `dist/rss.xml`, `dist/feed.xml`, `dist/llms.txt`, `dist/llms-full.txt`, `dist/.well-known/*`, and `dist/404.html` generated cleanly.
- Review `[RECONCILE]` output lines to confirm no unintended article conflicts or suppressed drafts leaked.

*(When publishing strictly from already-synced Firestore documents with zero seed overrides allowed, run:)*
```bash
STRICT_FIRESTORE_BUILD=1 CATALOG_PRECEDENCE=remote-authoritative npx tsx scripts/build-static-seo.ts
```

## 4. Safe Upload to IONOS Web Hosting Plus (SFTP / Webspace)
1. Connect via SFTP/FTPS to the IONOS directory mapped to `https://eirvan.com`.
2. Enable **"Show Hidden Files"** so dotfiles transfer cleanly.
3. Upload **only the contents of `dist/`**:
   - Required hidden files/folders: `.htaccess`, `.well-known/` (`ard.json`, `ai-catalog.json`, `llms.txt`)
   - HTML & feeds: `index.html`, `404.html`, `page/`, `articles/`, `category/`, `author/`, `about/`, `editorial-policy/`, `corrections-policy/`, `contact/`, `privacy/`, `terms/`, `products/`, `sitemap.xml`, `rss.xml`, `feed.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`
   - Assets: `assets/`, `images/`, `favicon-64.png`, `manifest.webmanifest`, `sw.js`, `workbox-*.js`
4. **Never upload** `server.ts`, `server.js`, `scripts/`, `backups/`, `.env*`, or `DRAFT_*.rules`.

## 5. Post-Upload Live Apache & Search Console Verification
```bash
# Single-hop www + HTTP -> apex HTTPS
curl -ILs -o /dev/null -w "%{http_code} %{url_effective} redirects=%{num_redirects}\n" http://www.eirvan.com/

# Extensionless prerendered article route returns 200 directly with zero trailing-slash redirect
curl -ILs -o /dev/null -w "%{http_code} %{url_effective} redirects=%{num_redirects}\n" https://eirvan.com/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing

# Historical slug and legacy category 1-hop 301 redirects
curl -I https://eirvan.com/article/photonic-supercomputing-datacenters
curl -I https://eirvan.com/category/technology-ai

# Unknown path returns true HTTP 404 serving noindex /404.html
curl -I https://eirvan.com/non-existent-verification-probe
```
- Run Mobile & Desktop Lighthouse / PageSpeed Insights against live `https://eirvan.com/` and flagship article URLs.
- Submit `https://eirvan.com/sitemap.xml` inside Google Search Console.

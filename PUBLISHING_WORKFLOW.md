# EIRVAN Blogs — Editorial Publishing & Static IONOS Deployment Workflow

This publication uses a **Static-First Architecture**: Firebase Authentication and Cloud Firestore handle content management in `/admin`, while production traffic at `https://eirvan.com` is served purely as pre-rendered static HTML, images, sitemaps, and RSS feeds on **IONOS Web Hosting Plus** (`Apache 2.4+`). No separately hosted Node.js/Express production server is required.

## Step 1: Author, Review, and Approve Content in Publisher Studio

1. Sign in to `/admin` using an authorized Firebase Admin account.
2. Create or edit stories using the **6 editorial states**:
   - `draft` (excluded from public site, sitemap, RSS)
   - `in_review` (awaiting factual/technical review)
   - `approved` (ready for scheduling or publishing)
   - `scheduled` (staged for upcoming release)
   - `published` (live in static build, RSS, and sitemap unless set to `noindex, follow`)
   - `archived` (retained internally; excluded from feeds/sitemap)
3. Verify the SEO Checklist in Studio:
   - Headline (`H1`), distinct SEO Title (`35–65` chars), Meta Description (`115–160` chars), kebab-case canonical slug (`/articles/<slug>`), `<h2>`/`<h3>` hierarchy, descriptive image `alt` text, at least one primary cited source, internal links, and **Human Editorial Review Completed** when `aiAssisted` is checked.
4. Save to Cloud Firestore.

## Step 2: Build & Prerender Static Publication Bundle

Run the local build pipeline on your workstation or CI environment:

```bash
npm run build
```

What `npm run build` executes:
1. `vite build`: compiles the client application and hashed JS/CSS assets into `dist/`.
2. `npx tsx scripts/build-static-seo.ts`:
   - Reads published articles cleanly from Cloud Firestore's public REST endpoint (using `firebase-applet-config.json`—never embedding Admin SDK credentials) merged with `src/data/seedArticles.ts`.
   - Excludes drafts, `in_review`, `approved`, `scheduled`, `archived`, and `noindex` posts from public output.
   - Emits full semantic HTML (header, breadcrumb, `H1`, byline, responsive `<picture>` AVIF/WebP/JPEG tags, body HTML, sources, FAQs, related links, `<head>` canonical/OG/Twitter/JSON-LD) into:
     - `dist/index.html` and `dist/page/<n>/index.html`
     - `dist/articles/<slug>/index.html`
     - `dist/category/<slug>/index.html` & `dist/category/<slug>/page/<n>/index.html` (`technology`, `business`, `lifestyle`, `education`, `news`)
     - `dist/author/<slug>/index.html`
     - `dist/about/index.html`, `dist/editorial-policy/index.html`, `dist/corrections-policy/index.html`, `dist/contact/index.html`, `dist/privacy/index.html`, `dist/terms/index.html`, `dist/products/index.html`
     - `dist/404.html` (`noindex, follow`)
   - Emits dynamic `dist/sitemap.xml`, `dist/rss.xml`, `dist/feed.xml`, `dist/robots.txt`, `dist/llms.txt`, `dist/.well-known/ard.json`, and `dist/.htaccess` (HTTPS/apex `301` redirect, legacy `/article/*` & old category `301` redirects, previous-slug redirects, security headers, caching headers, and SPA fallback scoped strictly to `/admin`, `/bookmarks`, `/search`, `/checkout`, `/product`).

## Step 3: Verify Build Integrity Before Upload

Run the verification suite:

```bash
npx tsc --noEmit
npx tsx test-ad-privacy-migration.ts
npx tsx test-seo-build.ts
```

## Step 4: Upload `dist/` to IONOS Web Hosting Plus

1. Connect via SFTP/FTPS or IONOS Webspace Explorer to the root directory mapped to `https://eirvan.com`.
2. Upload the complete contents of `dist/` (including hidden files `.htaccess` and `.well-known/`).
3. Verify live URLs return `200 OK` without JS execution (`curl -s https://eirvan.com/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing | grep "<h1"`), confirm unknown routes return HTTP `404`, and submit `https://eirvan.com/sitemap.xml` inside Google Search Console once ownership verification is active (`VITE_GSC_VERIFICATION_TOKEN`).

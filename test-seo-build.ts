import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_ARTICLES } from './src/data/seedArticles.js';
import { PUBLIC_SEED_ARTICLES } from './src/data/publicCatalog.js';
import { AUTHORS } from './src/data/authors.js';
import { CATEGORY_HUBS, normalizeCategoryName } from './src/data/categories.js';
import { parseRoute, getArticlePath } from './src/utils/router.js';
import {
  auditArticleSEO,
  buildRouteHeadMetadata,
  generateArticleSchema,
  getWebSiteSchema,
  isIndexableRobotsDirective,
  isPublicIndexableArticle,
  isPublicPublishedArticle
} from './src/utils/seo.js';
import { generateSitemapXml } from './src/utils/sitemap.js';
import { generateRSSFeed } from './src/utils/rss.js';
import { FirebaseAdminService } from './src/services/firebase-admin.js';
import { normalizeArticleRecord } from './src/services/storage.js';
import { reconcileArticleCatalog } from './src/utils/reconcileCatalog.js';
import {
  applyAuthorizedApproval,
  computeArticleRevisionHash,
  invalidateApprovalOnSubstantiveChange,
  validateEditorialApproval
} from './src/utils/editorialApproval.js';

const DIST_DIR = path.join(process.cwd(), 'dist');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const EXPECTED_GSC_TOKEN = '2FXIRjx9IQVyHM4q5jOs7ORKPBpVVwRL3NjSBxP5ZXQ';
const TRUST_STATIC_ROUTES = [
  'about',
  'editorial-policy',
  'corrections-policy',
  'contact',
  'privacy',
  'terms',
  'products'
] as const;

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Deterministic simulator for our generated .htaccess rewrite rules
 * honoring DirectorySlash Off and Apache [R=301,L] / [L] evaluation order.
 */
function simulateHtaccessRequest(
  htaccessContent: string,
  methodUrl: string
): { status: number; location?: string; servedFile?: string } {
  const parsed = new URL(methodUrl);
  const host = parsed.host.toLowerCase();
  const isHttps = parsed.protocol === 'https:';
  const relPath = parsed.pathname.replace(/^\/+/, '');

  const lines = htaccessContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  assert.ok(lines.includes('DirectorySlash Off'), '.htaccess must explicitly disable mod_dir DirectorySlash');

  const resolveDistFile = (p: string): boolean => {
    const clean = p.replace(/^\/+/, '');
    if (!clean) return false;
    const candidate = path.join(DIST_DIR, clean);
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  };

  const resolveDistDir = (p: string): boolean => {
    const clean = p.replace(/^\/+|\/+$/g, '');
    const candidate = path.join(DIST_DIR, clean);
    return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
  };

  if (host === 'www.eirvan.com') {
    return { status: 301, location: `https://eirvan.com/${relPath}` };
  }
  if (!isHttps && host === 'eirvan.com') {
    return { status: 301, location: `https://eirvan.com/${relPath}` };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('RewriteRule ')) continue;

    const conds: string[] = [];
    let j = i - 1;
    while (j >= 0 && lines[j].startsWith('RewriteCond ')) {
      conds.unshift(lines[j]);
      j--;
    }

    if (conds.some(c => c.includes('%{HTTP_HOST}') || c.includes('%{HTTPS}'))) {
      continue;
    }

    const match = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]+)\])?$/);
    if (!match) continue;
    const [, pattern, target, flags = ''] = match;

    let condsOk = true;
    for (const c of conds) {
      if (c.includes('%{REQUEST_FILENAME} !-f')) {
        if (resolveDistFile(relPath)) condsOk = false;
      } else if (c.includes('%{REQUEST_FILENAME} -f')) {
        if (!resolveDistFile(relPath)) condsOk = false;
      } else if (c.includes('%{REQUEST_FILENAME} -d')) {
        if (!resolveDistDir(relPath)) condsOk = false;
      } else if (c.includes('%{REQUEST_FILENAME}/index.html -f')) {
        const cleanDir = relPath.replace(/\/+$/, '');
        if (!resolveDistFile(`${cleanDir}/index.html`)) condsOk = false;
      }
    }
    if (!condsOk) continue;

    const regex = new RegExp(pattern);
    const rxMatch = relPath.match(regex);
    if (!rxMatch) continue;

    const expandedTarget = target.replace(/\$(\d+)/g, (_, idx) => rxMatch[Number(idx)] ?? '');

    if (flags.includes('R=301')) {
      return {
        status: 301,
        location: expandedTarget.startsWith('http')
          ? expandedTarget
          : `https://eirvan.com${expandedTarget.startsWith('/') ? '' : '/'}${expandedTarget}`
      };
    }

    if (target === '-') {
      return { status: 200, servedFile: relPath };
    }

    return { status: 200, servedFile: expandedTarget.replace(/^\/+/, '') };
  }

  return { status: 404, servedFile: '404.html' };
}

function signTestArticle(article: (typeof SEED_ARTICLES)[number]) {
  return applyAuthorizedApproval(
    {
      ...article,
      status: 'published' as const
    },
    {
      uid: 'uid-admin-ashfaq',
      email: 'ashfaqtayyab318@gmail.com',
      emailVerified: true,
      displayName: 'Ashfaq Tayyab',
      role: 'Chief Editorial Administrator',
      verifiedInAdmins: true
    },
    '2026-11-13T12:00:00Z'
  );
}

async function runSeoVerification() {
  console.log('=== EIRVAN PHASE 3D PUBLIC RELEASE ISOLATION, GOVERNANCE & SEO VERIFICATION ===\n');

  assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist (run npm run build first)');

  // 1. Verify Public Client Catalog Is Empty & All 10 Candidate Seeds Are Honestly Unapproved + Source-Reconciled
  assert.equal(PUBLIC_SEED_ARTICLES.length, 0, 'Client publicCatalog must ship ZERO unapproved seed articles');
  assert.equal(SEED_ARTICLES.length, 10, 'Editorial seed catalog must retain 10 candidate articles for internal staging/reconciliation');

  for (const seed of SEED_ARTICLES) {
    assert.equal(seed.status, 'in_review', `${seed.id} must remain in_review until authorized human approval`);
    assert.equal(seed.aiAssisted, true, `${seed.id} must honestly preserve aiAssisted: true`);
    assert.equal(seed.humanReviewed, false, `${seed.id} must NOT spoof humanReviewed: true`);
    assert.equal(seed.reviewer, undefined, `${seed.id} must NOT contain invented reviewer identity`);
    assert.equal(seed.reviewedAt, undefined, `${seed.id} must NOT contain invented reviewedAt timestamp`);
    assert.equal(seed.approval, undefined, `${seed.id} must NOT contain unverified approval block`);
    assert.equal(isPublicPublishedArticle(seed), false, `${seed.id} must not evaluate as public published`);
    assert.equal(isPublicIndexableArticle(seed), false, `${seed.id} must not evaluate as public indexable`);

    for (const src of seed.sources || []) {
      assert.equal(src.accessedAt, '2026-11-13', `${seed.id} source "${src.title}" must keep accessedAt separate`);
      if (src.dateStatus === 'undated-evergreen') {
        assert.equal(src.publishedDate, undefined, `${seed.id} undated evergreen source "${src.title}" must omit invented publishedDate`);
        assert.equal(src.year, undefined, `${seed.id} undated evergreen source "${src.title}" must omit invented year`);
      } else {
        assert.ok(src.publishedDate && /^\d{4}-\d{2}-\d{2}$/.test(src.publishedDate), `${seed.id} source "${src.title}" must record primary YYYY-MM-DD publishedDate`);
      }
    }
  }

  // Verify Factual Resolutions in Revised art-007, art-008, art-009, art-010 Source Data
  const art007 = SEED_ARTICLES.find(a => a.id === 'art-007')!;
  for (const doi of [
    'https://doi.org/10.1126/science.275.5306.1593',
    'https://doi.org/10.1038/nrn.2016.57',
    'https://doi.org/10.1016/j.obhdp.2009.04.002',
    'https://doi.org/10.1145/1357054.1357072',
    'https://doi.org/10.1086/691462'
  ]) {
    assert.ok(art007.contentHtml.includes(doi) || art007.sources?.some(s => s.url === doi), `art-007 missing verified citation ${doi}`);
  }
  assert.ok(art007.contentHtml.includes('ADHD') && art007.contentHtml.includes('pharmacological sense'), 'art-007 must preserve non-medical boundary');
  assert.ok(art007.previousSlugs?.includes('dopamine-baseline-neuroscience-flow-state-architecture'), 'art-007 must preserve previousSlug');

  const art008 = SEED_ARTICLES.find(a => a.id === 'art-008')!;
  assert.equal(art008.contentHtml.includes('hepatic hepatocyte'), false, 'art-008 must not repeat "hepatic hepatocyte"');
  assert.ok(art008.contentHtml.includes('hepatocyte') && art008.contentHtml.includes('KRAB') && art008.contentHtml.includes('DNMT3A-DNMT3L') && art008.contentHtml.includes('TET1'));
  assert.ok(art008.sources?.some(s => s.url === 'https://doi.org/10.1016/j.cell.2021.03.025' && s.publishedDate === '2021-04-09'));
  assert.ok(art008.sources?.some(s => s.url === 'https://doi.org/10.1038/s43587-023-00539-2' && s.publishedDate === '2023-12-15'));
  assert.ok(art008.sources?.some(s => s.url === 'https://doi.org/10.1016/j.cell.2016.11.052' && s.publishedDate === '2016-12-15'));

  const art009 = SEED_ARTICLES.find(a => a.id === 'art-009')!;
  assert.equal(art009.contentHtml.includes('twelve HBM stacks'), false, 'art-009 must remove unverified twelve HBM stacks claim');
  assert.ok(art009.sources?.some(s => s.url === 'https://ec.europa.eu/commission/presscorner/detail/en/ip_24_4287'), 'art-009 must use verified EC ip_24_4287 URL');
  for (const needle of ['CoWoS-S', 'CoWoS-L', 'EMIB', 'Amkor', '$407 million', 'end of 2027', 'mid-2027', 'early 2028', 'not yet operational', 'Dresden', 'EUR 5 billion', 'Kumamoto']) {
    assert.ok(art009.contentHtml.includes(needle), `art-009 missing reconciled fact: ${needle}`);
  }

  const art010 = SEED_ARTICLES.find(a => a.id === 'art-010')!;
  assert.equal(art010.contentHtml.includes('80% of available operational hours'), false, 'art-010 must remove unverified 80% hours claim');
  assert.equal(art010.contentHtml.includes('sifma.org/'), false, 'art-010 must cite DTCC after-action URL');
  assert.ok(art010.contentHtml.includes('scheduled future transition date of October 11, 2027'), 'art-010 must describe Oct 11, 2027 as a scheduled future transition');
  assert.ok(art010.contentHtml.includes('no numerical affirmation-percentage safe harbor'), 'art-010 must clarify Rule 15c6-2 has no numerical safe harbor');
  for (const srcUrl of [
    'https://www.sec.gov/files/rules/final/2023/34-96930.pdf',
    'https://www.dtcc.com/news/2024/september/12/sifma-ici-and-dtcc-release-t1-after-action-report',
    'https://www.esma.europa.eu/press-news/esma-news/esma-proposes-move-t1-october-2027',
    'https://www.gov.uk/government/publications/accelerated-settlement-t1',
    'https://www.fca.org.uk/news/statements/final-report-accelerated-settlement-taskforce-uk-markets-move-t1'
  ]) {
    assert.ok(art010.sources?.some(s => s.url === srcUrl), `art-010 missing verified source ${srcUrl}`);
  }
  console.log('[PASS] 1. Public seed isolation (0 client seeds), evergreen source date separation, and Phase 3D factual checks verified.');

  // 2. Strict Zero-Leakage Filesystem Audit on Public dist/
  assert.equal(
    fs.existsSync(path.join(DIST_DIR, 'articles')),
    false,
    'Public dist/articles/ MUST NOT exist when 0 approved published articles exist'
  );
  assert.equal(
    fs.existsSync(path.join(DIST_DIR, 'images', 'articles')),
    false,
    'Public dist/images/articles/ MUST NOT contain unapproved draft article images when 0 published articles exist'
  );

  const allDistFiles = walkDir(DIST_DIR);
  const forbiddenExtensions = allDistFiles.filter(
    f => /\.(tsx?|env|pem|key|map)$/.test(f) || ['server.js', '_headers', '_redirects'].includes(path.basename(f))
  );
  assert.equal(forbiddenExtensions.length, 0, `Forbidden source/map/sidecar/secret files in dist/: ${forbiddenExtensions.join(', ')}`);

  const textFiles = allDistFiles.filter(f => /\.(html|js|css|json|xml|txt|webmanifest)$/.test(f) || path.basename(f) === '.htaccess');
  for (const tf of textFiles) {
    const content = fs.readFileSync(tf, 'utf8');
    const rel = path.relative(DIST_DIR, tf);

    assert.equal(
      content.includes('BEGIN PRIVATE KEY') || content.includes('GEMINI_API_KEY') || content.includes('FIREBASE_PRIVATE_KEY'),
      false,
      `Potential secret leaked in dist/${rel}`
    );
    assert.equal(
      content.includes('/images/articles/') || content.includes('images/articles/'),
      false,
      `Unapproved draft /images/articles/ path leaked in dist/${rel}`
    );
    for (const seed of SEED_ARTICLES) {
      assert.equal(content.includes(seed.slug), false, `Unapproved draft slug "${seed.slug}" leaked in dist/${rel}`);
      assert.equal(content.includes(seed.title), false, `Unapproved draft title "${seed.title}" leaked in dist/${rel}`);
      for (const prevSlug of seed.previousSlugs || []) {
        assert.equal(content.includes(prevSlug), false, `Unapproved previousSlug "${prevSlug}" leaked in dist/${rel}`);
      }
    }
    if (/\.(html|xml|json|txt)$/.test(tf)) {
      assert.equal(content.includes('editorialNotes'), false, `Private editorialNotes leaked in public static artifact dist/${rel}`);
    }
  }
  console.log(`[PASS] 2. Strict dist/ filesystem scan passed across all ${allDistFiles.length} files (0 draft HTML, 0 draft images, 0 draft text/bundle leaks).`);

  // 3. Indexability & Robots Audit Across Every Generated Page Type in dist/
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  assert.ok(homeHtml.includes('<h1'), 'Homepage must render visible H1 without JS');
  assert.ok(homeHtml.includes('<link rel="canonical" href="https://eirvan.com"'), 'Homepage canonical must match https://eirvan.com');
  assert.ok(homeHtml.includes('<meta name="robots" content="noindex, follow"'), 'Empty 0-article homepage MUST carry noindex, follow');
  assert.ok(homeHtml.includes(EXPECTED_GSC_TOKEN), 'Homepage must preserve Google Search Console verification tag');
  assert.ok(homeHtml.includes('"@type": "Organization"') && homeHtml.includes('"@type": "WebSite"'));
  assert.equal(homeHtml.includes('SearchAction'), false, 'Homepage must NOT emit deprecated SearchAction schema');
  assert.equal(homeHtml.includes('href="/articles/'), false, 'Homepage must NOT expose /articles/ links');
  assert.ok(homeHtml.includes('Editorial Governance Gate Active'), 'Empty homepage must explain publication status honestly');

  for (const hub of CATEGORY_HUBS) {
    const catFile = path.join(DIST_DIR, 'category', hub.slug, 'index.html');
    assert.ok(fs.existsSync(catFile), `Missing category hub static HTML for /category/${hub.slug}`);
    const html = fs.readFileSync(catFile, 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex, follow"'), `Empty category ${hub.slug} MUST carry noindex, follow`);
    assert.ok(html.includes(`https://eirvan.com/category/${hub.slug}`), `Category ${hub.slug} missing canonical`);
    assert.ok(html.includes('"@type": "CollectionPage"'), `Category ${hub.slug} missing CollectionPage JSON-LD`);
    assert.equal(html.includes('FAQPage'), false, `Category ${hub.slug} must not emit FAQPage schema`);
    assert.equal(html.includes('href="/articles/'), false, `Category ${hub.slug} must exclude unapproved articles`);
  }

  for (const author of AUTHORS) {
    const authorFile = path.join(DIST_DIR, 'author', author.slug, 'index.html');
    assert.ok(fs.existsSync(authorFile), `Missing author HTML for /author/${author.slug}`);
    const html = fs.readFileSync(authorFile, 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex, follow"'), `Empty author page ${author.slug} MUST carry noindex, follow`);
    assert.ok(html.includes('"@type": "Person"'), `Author ${author.slug} missing Person JSON-LD`);
    assert.ok(html.includes('Published Dispatches (0)'), `Author ${author.slug} must show 0 published dispatches`);
    assert.equal(html.includes('href="/articles/'), false, `Author ${author.slug} must exclude unapproved articles`);
  }

  for (const staticRoute of TRUST_STATIC_ROUTES) {
    const pFile = path.join(DIST_DIR, staticRoute, 'index.html');
    assert.ok(fs.existsSync(pFile), `Missing static HTML for /${staticRoute}`);
    const html = fs.readFileSync(pFile, 'utf8');
    assert.ok(html.includes('<meta name="robots" content="index, follow'), `Trust/catalog page /${staticRoute} must remain index, follow`);
    assert.ok(html.includes(`https://eirvan.com/${staticRoute}`), `Trust/catalog page /${staticRoute} missing canonical`);
  }

  const notFoundHtml = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('content="noindex, follow"'), '404.html must carry noindex, follow directive');
  assert.ok(notFoundHtml.includes('<title>Page Not Found (404) | EIRVAN</title>'), '404.html must carry dedicated 404 title');

  // Verify buildRouteHeadMetadata switches cleanly to index, follow when published articles >= 1, while keeping admin/search noindex
  assert.equal(
    buildRouteHeadMetadata({ path: '/', pathname: '/', search: '', queryParams: {}, routeType: 'home', page: 1 }, { homeArticleCount: 0 }).robots,
    'noindex, follow'
  );
  assert.ok(
    buildRouteHeadMetadata({ path: '/', pathname: '/', search: '', queryParams: {}, routeType: 'home', page: 1 }, { homeArticleCount: 3 }).robots.startsWith('index, follow')
  );
  assert.equal(
    buildRouteHeadMetadata({ path: '/category/technology', pathname: '/category/technology', search: '', queryParams: {}, routeType: 'category', param: 'technology', page: 1 }, { categoryArticleCount: 0 }).robots,
    'noindex, follow'
  );
  assert.ok(
    buildRouteHeadMetadata({ path: '/category/technology', pathname: '/category/technology', search: '', queryParams: {}, routeType: 'category', param: 'technology', page: 1 }, { categoryArticleCount: 2 }).robots.startsWith('index, follow')
  );
  assert.equal(
    buildRouteHeadMetadata({ path: '/author/evelyn-vance', pathname: '/author/evelyn-vance', search: '', queryParams: {}, routeType: 'author', param: 'evelyn-vance' }, { author: AUTHORS[0], authorArticleCount: 0 }).robots,
    'noindex, follow'
  );
  assert.ok(
    buildRouteHeadMetadata({ path: '/author/evelyn-vance', pathname: '/author/evelyn-vance', search: '', queryParams: {}, routeType: 'author', param: 'evelyn-vance' }, { author: AUTHORS[0], authorArticleCount: 1 }).robots.startsWith('index, follow')
  );
  assert.equal(
    buildRouteHeadMetadata({ path: '/admin', pathname: '/admin', search: '', queryParams: {}, routeType: 'admin' }).robots,
    'noindex, follow'
  );
  console.log('[PASS] 3. Empty vs populated indexability and robots directives verified for every page type.');

  // 4. Sitemap, RSS, Feed, Robots, LLMs & .well-known Audit
  const sitemapXml = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  const rssXml = fs.readFileSync(path.join(DIST_DIR, 'rss.xml'), 'utf8');
  const feedXml = fs.readFileSync(path.join(DIST_DIR, 'feed.xml'), 'utf8');
  const robotsTxt = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  const llmsTxt = fs.readFileSync(path.join(DIST_DIR, 'llms.txt'), 'utf8');
  const wellKnownLlmsTxt = fs.readFileSync(path.join(DIST_DIR, '.well-known', 'llms.txt'), 'utf8');
  const llmsFullTxt = fs.readFileSync(path.join(DIST_DIR, 'llms-full.txt'), 'utf8');
  const ardJson = JSON.parse(fs.readFileSync(path.join(DIST_DIR, '.well-known', 'ard.json'), 'utf8'));
  const aiCatalogJson = JSON.parse(fs.readFileSync(path.join(DIST_DIR, '.well-known', 'ai-catalog.json'), 'utf8'));
  const htaccess = fs.readFileSync(path.join(DIST_DIR, '.htaccess'), 'utf8');

  assert.equal(rssXml, feedXml, 'rss.xml and feed.xml must be identical');
  assert.equal(llmsTxt, wellKnownLlmsTxt, 'llms.txt and .well-known/llms.txt must be identical');
  assert.equal(sitemapXml.includes('/articles/'), false, 'Default sitemap.xml must NOT list unapproved articles');
  assert.equal(sitemapXml.includes('/category/'), false, '0-article sitemap.xml must NOT list empty category hubs');
  assert.equal(sitemapXml.includes('/author/'), false, '0-article sitemap.xml must NOT list empty author pages');
  assert.equal(rssXml.includes('<item>'), false, 'Default rss.xml must NOT syndicate unapproved articles');
  assert.equal(llmsTxt.includes('/articles/'), false, 'Default llms.txt must NOT list unapproved articles');
  assert.equal(llmsFullTxt.includes('/articles/'), false, 'Default llms-full.txt must NOT list unapproved articles');
  assert.ok(robotsTxt.includes('Sitemap: https://eirvan.com/sitemap.xml') && robotsTxt.includes('Disallow: /admin'));
  assert.equal(ardJson.specVersion, '1.0');
  assert.ok(aiCatalogJson, '.well-known/ai-catalog.json must parse cleanly');

  const locMatches = [...sitemapXml.matchAll(/<loc>(https:\/\/eirvan\.com[^<]*)<\/loc>/g)].map(m => m[1]);
  assert.equal(locMatches.length, TRUST_STATIC_ROUTES.length, `Expected exactly ${TRUST_STATIC_ROUTES.length} indexable trust/catalog URLs in 0-article sitemap, got ${locMatches.length}`);
  for (const loc of locMatches) {
    const pathname = new URL(loc).pathname;
    const expectedHtml = path.join(DIST_DIR, pathname.replace(/^\/+/, ''), 'index.html');
    assert.ok(fs.existsSync(expectedHtml), `Sitemap <loc> ${loc} has no corresponding dist file`);
  }
  const imgLocMatches = [...sitemapXml.matchAll(/<image:loc>(https:\/\/eirvan\.com[^<]*)<\/image:loc>/g)].map(m => m[1]);
  assert.equal(imgLocMatches.length, 0, '0-article sitemap must contain 0 <image:loc> entries');
  console.log(`[PASS] 4. Sitemap (exact ${locMatches.length} indexable pages), RSS/Feed (0 items), Robots, LLMs, and .well-known verified.`);

  // 5. Populated/Signed Catalog Behavior & Exclusion Edge Cases (In-Memory)
  const signedArticles = SEED_ARTICLES.map(signTestArticle);
  assert.equal(signedArticles.length, 10);
  for (const signed of signedArticles) {
    assert.equal(signed.aiAssisted, true, 'Signing must preserve truthful aiAssisted disclosure');
    assert.equal(isPublicIndexableArticle(signed, Date.parse('2026-11-13T12:05:00Z')), true);
  }

  const approvedSitemap = generateSitemapXml(signedArticles);
  const approvedRss = generateRSSFeed(signedArticles);
  const approvedImgLocs = [...approvedSitemap.matchAll(/<image:loc>(https:\/\/eirvan\.com[^<]*)<\/image:loc>/g)].map(m => m[1]);
  assert.equal(approvedImgLocs.length, 10, 'Signed published catalog must emit 10 <image:loc> entries in sitemap');
  for (const imgLoc of approvedImgLocs) {
    const relImg = new URL(imgLoc).pathname.replace(/^\/+/, '');
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, relImg)), `Approved sitemap <image:loc> source ${imgLoc} missing in public/`);
  }
  assert.ok(approvedSitemap.includes('https://eirvan.com/</loc>'));
  assert.ok(approvedSitemap.includes('https://eirvan.com/category/technology'));
  assert.ok(approvedSitemap.includes('https://eirvan.com/author/evelyn-vance'));
  assert.ok(approvedRss.includes('<item>'), 'Approved catalog must emit RSS items');

  assert.equal(isIndexableRobotsDirective('index, follow'), true);
  assert.equal(isIndexableRobotsDirective('NOINDEX, FOLLOW'), false);
  assert.equal(isIndexableRobotsDirective('noindex'), false);
  assert.equal(isIndexableRobotsDirective('none'), false);
  assert.equal('potentialAction' in getWebSiteSchema(), false, 'getWebSiteSchema() must not emit SearchAction');
  assert.equal(
    generateArticleSchema(signedArticles[0]).some((s: any) => s?.['@type'] === 'FAQPage'),
    false,
    'generateArticleSchema() must not emit FAQPage JSON-LD'
  );

  const mixedArticles = [
    ...signedArticles,
    {
      ...signedArticles[0],
      id: 'art-draft-test',
      slug: 'unpublished-draft-secret',
      title: 'Unpublished Draft Story',
      canonicalUrl: 'https://eirvan.com/articles/unpublished-draft-secret',
      status: 'draft' as const
    },
    {
      ...signedArticles[0],
      id: 'art-future-test',
      slug: 'future-scheduled-story',
      title: 'Future Scheduled Story',
      canonicalUrl: 'https://eirvan.com/articles/future-scheduled-story',
      status: 'published' as const,
      scheduledAt: '2099-01-01T00:00:00.000Z'
    },
    {
      ...signedArticles[0],
      id: 'art-noindex-test',
      slug: 'hidden-noindex-story',
      title: 'Noindex Published Story',
      canonicalUrl: 'https://eirvan.com/articles/hidden-noindex-story',
      robotsDirective: 'NOINDEX, FOLLOW' as unknown as 'noindex, follow'
    }
  ];

  const mixedSitemap = generateSitemapXml(mixedArticles);
  const mixedRss = generateRSSFeed(mixedArticles);
  assert.equal(mixedSitemap.includes('unpublished-draft-secret'), false, 'Sitemap must exclude drafts');
  assert.equal(mixedSitemap.includes('future-scheduled-story'), false, 'Sitemap must exclude future scheduledAt posts');
  assert.equal(mixedSitemap.includes('hidden-noindex-story'), false, 'Sitemap must exclude NOINDEX posts');
  assert.equal(mixedSitemap.includes('/admin'), false, 'Sitemap must exclude /admin');
  assert.equal(mixedRss.includes('unpublished-draft-secret'), false, 'RSS must exclude drafts');
  assert.equal(mixedRss.includes('hidden-noindex-story'), false, 'RSS must exclude NOINDEX posts');
  assert.equal(isPublicIndexableArticle(mixedArticles[mixedArticles.length - 1]), false);
  console.log('[PASS] 5. Populated signed catalog sitemap/RSS, NOINDEX/NONE, future scheduledAt, and draft exclusions verified.');

  // 6. Apache .htaccess Rewrite & DirectorySlash Off Verification
  assert.ok(htaccess.includes('ErrorDocument 404 /404.html'));
  assert.ok(htaccess.includes('DirectorySlash Off'));
  assert.equal(htaccess.includes('images.unsplash.com'), false);

  assert.deepEqual(simulateHtaccessRequest(htaccess, 'http://eirvan.com/about'), {
    status: 301,
    location: 'https://eirvan.com/about'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://www.eirvan.com/about'), {
    status: 301,
    location: 'https://eirvan.com/about'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/article/sample-slug/'), {
    status: 301,
    location: 'https://eirvan.com/articles/sample-slug'
  });

  // All 5 legacy category slugs in 1 hop
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/technology-ai/'), {
    status: 301,
    location: 'https://eirvan.com/category/technology'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/global-markets-finance/page/2'), {
    status: 301,
    location: 'https://eirvan.com/category/business/page/2'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/biotech-longevity'), {
    status: 301,
    location: 'https://eirvan.com/category/lifestyle'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/productivity-mindset'), {
    status: 301,
    location: 'https://eirvan.com/category/education'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/future-of-work'), {
    status: 301,
    location: 'https://eirvan.com/category/education'
  });

  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/').status, 200);
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/technology').servedFile, 'category/technology/index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/about').servedFile, 'about/index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/admin').servedFile, 'index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/unknown-random-url').status, 404);
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/articles/does-not-exist').status, 404);
  console.log('[PASS] 6. Apache .htaccess single-hop 301s, DirectorySlash Off, zero draft slug leakage, direct 200s, and true 404 verified.');

  // 7. Editorial Approval Security, Forged Payload Rejection, Invalidation & Save Gates
  assert.equal(normalizeCategoryName('Technology & AI'), 'Technology');
  assert.equal(normalizeCategoryName('Global Markets & Finance'), 'Business');
  assert.equal(normalizeCategoryName('Biotech & Longevity'), 'Lifestyle');
  assert.equal(normalizeCategoryName('Productivity & Mindset'), 'Education');
  assert.equal(parseRoute('/articles/foo-bar').routeType, 'article');
  assert.equal(parseRoute('/category/technology').routeType, 'category');
  assert.equal(parseRoute('/category/technology/page/2').page, 2);
  assert.equal(parseRoute('/unknown-random-url').routeType, 'not-found');
  assert.equal(getArticlePath('sample-slug'), '/articles/sample-slug');

  // Block bare boolean humanReviewed=true without cryptographically bound revision proof
  const spoofedBareBoolean = {
    ...SEED_ARTICLES[0],
    status: 'published' as const,
    humanReviewed: true,
    reviewer: { name: 'EIRVAN Editorial Desk', role: 'Desk' }
  };
  assert.equal(validateEditorialApproval(spoofedBareBoolean).valid, false, 'Bare humanReviewed=true must be rejected');
  assert.equal(isPublicPublishedArticle(spoofedBareBoolean), false, 'Bare spoofed article must never publish');

  // Forged approval with self-asserted reviewerVerifiedInAdmins flag & untrusted email MUST fail
  const forgedAdminSelfAssert = {
    ...SEED_ARTICLES[0],
    status: 'published' as const,
    humanReviewed: true,
    reviewedAt: '2026-11-13T12:00:00Z',
    reviewedRevisionHash: computeArticleRevisionHash(SEED_ARTICLES[0]),
    approval: {
      reviewerUid: 'attacker-uid-123',
      reviewerEmail: 'attacker@evil.com',
      reviewerName: 'Forged Reviewer',
      reviewerRole: 'Forged Role',
      reviewedAt: '2026-11-13T12:00:00Z',
      reviewedRevisionHash: computeArticleRevisionHash(SEED_ARTICLES[0]),
      aiAssistedAtReview: true,
      reviewerVerifiedInAdmins: true
    }
  };
  const forgedCheck = validateEditorialApproval(forgedAdminSelfAssert, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
  assert.equal(forgedCheck.valid, false, 'Forged approval asserting reviewerVerifiedInAdmins=true must be rejected');
  assert.ok(forgedCheck.missingFields.includes('authorizedReviewerEmail'));

  // Forged approval with mismatched article.reviewer vs approval block MUST fail
  const signed0 = signTestArticle(SEED_ARTICLES[0]);
  const mismatchedReviewerPayload = {
    ...signed0,
    reviewer: {
      name: 'Impersonated Editor',
      role: 'Senior Editor',
      email: 'fake@evil.com',
      uid: 'uid-forged-999'
    }
  };
  const mismatchCheck = validateEditorialApproval(mismatchedReviewerPayload, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
  assert.equal(mismatchCheck.valid, false, 'Mismatched article.reviewer vs approval signer must be rejected');
  assert.ok(mismatchCheck.missingFields.some(f => f.startsWith('forgedOrMismatched(')));

  // Unauthorized & unverified reviewers rejected by applyAuthorizedApproval
  assert.throws(
    () =>
      applyAuthorizedApproval(SEED_ARTICLES[0], {
        uid: 'uid-random',
        email: 'unauthorized@example.com',
        emailVerified: true,
        displayName: 'Random User'
      }),
    /Editorial Approval Denied/
  );
  assert.throws(
    () =>
      applyAuthorizedApproval(SEED_ARTICLES[0], {
        uid: 'uid-admin-ashfaq',
        email: 'ashfaqtayyab318@gmail.com',
        emailVerified: false,
        displayName: 'Ashfaq Tayyab'
      }),
    /verified email address/
  );
  assert.throws(
    () =>
      applyAuthorizedApproval(SEED_ARTICLES[0], {
        uid: 'uid-admin-ashfaq',
        email: 'ashfaqtayyab318@gmail.com',
        emailVerified: true,
        displayName: 'EIRVAN Editorial Desk'
      }),
    /Named individual reviewer identity is required/
  );

  // Authorized approval binds exact revision hash and preserves aiAssisted: true
  const validationOk = validateEditorialApproval(signed0, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
  assert.equal(validationOk.valid, true, 'Authorized approval must pass validation');
  assert.equal(validationOk.currentHash, computeArticleRevisionHash(signed0));
  assert.equal(signed0.aiAssisted, true, 'Authorized approval must preserve truthful aiAssisted=true disclosure');

  const signedAudit = auditArticleSEO(signed0, [signed0]);
  assert.equal(signedAudit.checks.find(c => c.id === 'trust-sources')?.status, 'pass');

  // Substantive edits (body, author, image, sources) invalidate prior approval
  for (const mutated of [
    { ...signed0, contentHtml: `${signed0.contentHtml}<p>Unreviewed claim added after sign-off.</p>` },
    { ...signed0, author: { ...signed0.author, name: 'Different Author' } },
    { ...signed0, featuredImage: '/images/articles/different-image-1200.webp' },
    { ...signed0, robotsDirective: 'noindex, follow' as const }
  ]) {
    const staleCheck = validateEditorialApproval(mutated, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
    assert.equal(staleCheck.valid, false, 'Substantive edit after sign-off must invalidate prior approval');
    assert.equal(staleCheck.stale, true, 'Validator must flag stale hash mismatch');
  }

  const editedContentWithoutResign = {
    ...signed0,
    contentHtml: `${signed0.contentHtml}<p>Unreviewed factual claim added after approval.</p>`
  };
  const invalidated = invalidateApprovalOnSubstantiveChange(signed0, editedContentWithoutResign);
  assert.equal(invalidated.status, 'in_review');
  assert.equal(invalidated.humanReviewed, false);
  assert.equal(invalidated.approval, undefined);
  assert.equal(invalidated.reviewedAt, undefined);
  assert.equal(invalidated.reviewer, undefined);
  assert.equal(invalidated.aiAssisted, true, 'Invalidation must preserve aiAssisted flag');

  // FirebaseAdminService.saveArticle must reject unapproved, spoofed, forged, or stale-edited saves
  for (const blockedStatus of ['approved', 'scheduled', 'published'] as const) {
    await assert.rejects(
      FirebaseAdminService.saveArticle({
        ...SEED_ARTICLES[0],
        status: blockedStatus,
        humanReviewed: false
      }),
      /Editorial Gate Blocked/
    );
    await assert.rejects(
      FirebaseAdminService.saveArticle({
        ...spoofedBareBoolean,
        status: blockedStatus
      }),
      /Editorial Gate Blocked/
    );
    await assert.rejects(
      FirebaseAdminService.saveArticle({
        ...forgedAdminSelfAssert,
        status: blockedStatus
      }),
      /Editorial Gate Blocked/
    );
    await assert.rejects(
      FirebaseAdminService.saveArticle({
        ...mismatchedReviewerPayload,
        status: blockedStatus
      }),
      /Editorial Gate Blocked/
    );
    await assert.rejects(
      FirebaseAdminService.saveArticle({ ...editedContentWithoutResign, status: blockedStatus }, signed0),
      /Editorial Gate Blocked/
    );
  }

  // Catalog reconciliation blocks unapproved seeds and promotes only cryptographically verified articles
  const unapprovedReconcile = reconcileArticleCatalog([], SEED_ARTICLES, { mode: 'reconcile-curated-verified' });
  assert.equal(unapprovedReconcile.publishedArticles.length, 0, 'Unapproved in_review seeds must yield 0 publishedArticles');
  assert.equal(unapprovedReconcile.blockedUncertainCount, 10);

  const staleRemoteDoc = {
    ...SEED_ARTICLES[0],
    title: 'Legacy Unverified Title',
    category: 'Technology & AI',
    featuredImage: '/src/assets/images/old.jpg',
    sources: [],
    humanReviewed: false,
    updatedAt: '2026-03-01T00:00:00Z'
  };
  const verifiedSeedReconcile = reconcileArticleCatalog(
    [staleRemoteDoc],
    [signed0, signTestArticle(SEED_ARTICLES[8])],
    {
      mode: 'reconcile-curated-verified',
      nowMs: Date.parse('2026-11-13T12:05:00Z')
    }
  );
  assert.equal(verifiedSeedReconcile.entries[0].conflictStatus, 'REMOTE_STALE_AND_INCOMPLETE');
  assert.equal(verifiedSeedReconcile.entries[1].conflictStatus, 'REMOTE_MISSING_UNSYNCED');
  assert.equal(verifiedSeedReconcile.publishedArticles.length, 2, 'Only cryptographically approved records promote in reconciliation');

  const newerSignedRemote = normalizeArticleRecord({
    ...signed0,
    updatedAt: '2026-12-01T00:00:00Z'
  });
  assert.equal(newerSignedRemote.approval?.reviewerEmail, 'ashfaqtayyab318@gmail.com');

  console.log('[PASS] 7. Editorial approval security, forged-payload rejection, substantive invalidation, and reconciliation verified.\n');
  console.log('ALL 7 PHASE 3D PUBLIC RELEASE ISOLATION & GOVERNANCE CHECKS PASSED.');
}

runSeoVerification().catch(err => {
  console.error('[SEO TEST FAILURE]', err);
  process.exit(1);
});

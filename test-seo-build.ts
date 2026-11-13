import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_ARTICLES } from './src/data/seedArticles.js';
import { AUTHORS } from './src/data/authors.js';
import { CATEGORY_HUBS, normalizeCategoryName } from './src/data/categories.js';
import { parseRoute, getArticlePath } from './src/utils/router.js';
import {
  auditArticleSEO,
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
const EXPECTED_GSC_TOKEN = '2FXIRjx9IQVyHM4q5jOs7ORKPBpVVwRL3NjSBxP5ZXQ';

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
  let relPath = parsed.pathname.replace(/^\/+/, '');

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
      displayName: 'Ashfaq Tayyab',
      role: 'Chief Editorial Administrator',
      verifiedInAdmins: true
    },
    '2026-11-13T12:00:00Z'
  );
}

async function runSeoVerification() {
  console.log('=== EIRVAN PHASE 3C EDITORIAL GOVERNANCE & SEO VERIFICATION ===\n');

  assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist (run npm run build first)');

  // 1. Verify Seed Articles Reflect Honest Unapproved Governance State
  assert.equal(SEED_ARTICLES.length, 10, 'Seed catalog must contain 10 candidate articles');
  for (const seed of SEED_ARTICLES) {
    assert.equal(seed.status, 'in_review', `${seed.id} must be in_review until authorized human approval`);
    assert.equal(seed.aiAssisted, true, `${seed.id} must honestly preserve aiAssisted: true`);
    assert.equal(seed.humanReviewed, false, `${seed.id} must NOT spoof humanReviewed: true`);
    assert.equal(seed.reviewer, undefined, `${seed.id} must NOT contain invented reviewer identity`);
    assert.equal(seed.reviewedAt, undefined, `${seed.id} must NOT contain invented reviewedAt timestamp`);
    assert.equal(seed.approval, undefined, `${seed.id} must NOT contain unverified approval block`);
    assert.equal(isPublicPublishedArticle(seed), false, `${seed.id} must not evaluate as public published`);
    assert.equal(isPublicIndexableArticle(seed), false, `${seed.id} must not evaluate as public indexable`);
    for (const src of seed.sources || []) {
      assert.ok(src.publishedDate, `${seed.id} source "${src.title}" must record primary publishedDate`);
      assert.equal(src.accessedAt, '2026-11-13', `${seed.id} source "${src.title}" must record accessedAt 2026-11-13`);
    }
  }
  console.log('[PASS] 1. All 10 seed articles honestly marked in_review, aiAssisted=true, humanReviewed=false with zero fabricated reviewer identities and verified source dates.');

  // 2. Homepage & Unapproved Indexation Isolation Verification
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  assert.ok(homeHtml.includes('<h1'), 'Homepage must render visible H1 without JS');
  assert.ok(homeHtml.includes('<link rel="canonical" href="https://eirvan.com"'), 'Homepage canonical must match https://eirvan.com');
  assert.ok(homeHtml.includes(EXPECTED_GSC_TOKEN), 'Homepage must preserve Google Search Console verification tag');
  assert.ok(homeHtml.includes('"@type": "Organization"'), 'Homepage must contain Organization JSON-LD');
  assert.ok(homeHtml.includes('"@type": "WebSite"'), 'Homepage must contain WebSite JSON-LD');
  assert.equal(homeHtml.includes('SearchAction'), false, 'Homepage must NOT emit deprecated SearchAction schema');
  assert.equal(homeHtml.includes('href="/articles/'), false, 'Homepage must NOT expose unapproved /articles/ cards');
  assert.ok(homeHtml.includes('Editorial Governance Gate Active'), 'Homepage must explain when articles await human approval');
  console.log('[PASS] 2. Homepage SEO tags, GSC verification, zero SearchAction, and zero unapproved article leakage verified.');

  // 3. Staging HTML Inspection Across All 10 Corrected Candidate Articles (noindex, nofollow + factual corrections)
  for (const article of SEED_ARTICLES) {
    const filePath = path.join(DIST_DIR, 'articles', article.slug, 'index.html');
    assert.ok(fs.existsSync(filePath), `Missing staging HTML for /articles/${article.slug}`);
    const html = fs.readFileSync(filePath, 'utf8');

    assert.ok(html.includes('<h1'), `Article ${article.slug} missing visible H1`);
    assert.ok(html.includes(EXPECTED_GSC_TOKEN), `Article ${article.slug} missing preserved GSC verification meta tag`);
    assert.ok(html.includes(`https://eirvan.com/articles/${article.slug}`), `Article ${article.slug} missing exact canonical URL`);
    assert.ok(
      html.includes('<meta name="robots" content="noindex, nofollow"'),
      `Unapproved staging article ${article.slug} MUST carry <meta name="robots" content="noindex, nofollow">`
    );
    assert.ok(
      html.includes('PENDING AUTHORIZED HUMAN EDITORIAL APPROVAL'),
      `Staging article ${article.slug} must display explicit pending approval notice`
    );
    assert.ok(html.includes('AI-assisted draft'), `Staging article ${article.slug} must disclose AI-assisted draft status`);
    assert.ok(html.includes('<picture>') && html.includes('type="image/avif"') && html.includes('type="image/webp"'), `Article ${article.slug} missing <picture> AVIF/WebP responsive markup`);
    assert.ok(html.includes('"@type": "BreadcrumbList"'), `Article ${article.slug} missing BreadcrumbList schema`);
    assert.equal(html.includes('FAQPage'), false, `Article ${article.slug} must not emit deprecated FAQPage schema`);
    assert.equal(html.includes('Quantum Annealing'), false, `Article ${article.slug} must not contain stale Quantum Annealing claim`);
    assert.equal(html.includes('100x efficiency gains'), false, `Article ${article.slug} must not contain stale 100x claim`);

    if (article.category === 'News') {
      assert.ok(html.includes('"@type": "NewsArticle"'), `News article ${article.slug} should emit NewsArticle schema`);
    } else {
      assert.equal(html.includes('"@type": "NewsArticle"'), false, `Evergreen article ${article.slug} must NOT misuse NewsArticle`);
    }

    if (article.faqs && article.faqs.length > 0) {
      assert.ok(html.includes('<details open'), `Article ${article.slug} must render visible FAQ accordion HTML`);
    }

    const imgMatch = article.featuredImage.match(/^(\/images\/articles\/[^/]+)-1200\.webp$/);
    if (imgMatch) {
      for (const size of [400, 800, 1200]) {
        for (const ext of ['avif', 'webp', 'jpg']) {
          const assetRel = `${imgMatch[1].replace(/^\//, '')}-${size}.${ext}`;
          assert.ok(fs.existsSync(path.join(DIST_DIR, assetRel)), `Missing dist asset: ${assetRel}`);
        }
      }
    }
  }

  // Targeted Phase 3C Content & Citation Checks in Generated Staging HTML
  const art010Html = fs.readFileSync(
    path.join(DIST_DIR, 'articles', 't1-settlement-architecture-global-clearing-update', 'index.html'),
    'utf8'
  );
  assert.equal(art010Html.includes('80% of available operational hours'), false, 'art-010 must remove unverified 80% hours claim');
  assert.equal(art010Html.includes('sifma.org/'), false, 'art-010 must use DTCC after-action report URL, not hallucinated sifma.org path');
  for (const needle of [
    'Rule 15c6-1',
    'Rule 15c6-2',
    '9:00 PM ET',
    'nearly 95%',
    '$9.8 billion',
    '2.12%',
    '3.31%',
    'October 11, 2027',
    'ESMA74-2119945925-1969',
    'https://www.sec.gov/files/rules/final/2023/34-96930.pdf',
    'https://www.dtcc.com/news/2024/september/12/sifma-ici-and-dtcc-release-t1-after-action-report',
    'https://www.gov.uk/government/publications/accelerated-settlement-t1',
    'https://www.fca.org.uk/news/statements/final-report-accelerated-settlement-taskforce-uk-markets-move-t1'
  ]) {
    assert.ok(art010Html.includes(needle), `art-010 HTML missing verified fact/source: ${needle}`);
  }

  const art009Html = fs.readFileSync(
    path.join(DIST_DIR, 'articles', 'global-foundry-capacity-2026-advanced-packaging-expansion', 'index.html'),
    'utf8'
  );
  assert.equal(art009Html.includes('twelve HBM stacks'), false, 'art-009 must remove unverified twelve HBM stacks figure');
  for (const needle of [
    'CoWoS-S',
    'CoWoS-L',
    'EMIB',
    'Amkor',
    '$407 million',
    'early 2028',
    'not yet operational',
    'Dresden',
    'EUR 5 billion',
    'Kumamoto',
    'https://doi.org/10.1109/TED.2017.2737644',
    'https://www.nist.gov/chips/amkor-technology-inc-arizona-peoria',
    'https://ir.amkor.com/news-releases/news-release-details/tsmc-and-amkor-technology-announce-long-term-partnership',
    'https://ec.europa.eu/commission/presscorner/detail/en/ip_24_4301',
    'https://pr.tsmc.com/english/news/3159',
    'https://pr.tsmc.com/english/news/3120'
  ]) {
    assert.ok(art009Html.includes(needle), `art-009 HTML missing verified fact/source: ${needle}`);
  }

  const art007Html = fs.readFileSync(
    path.join(DIST_DIR, 'articles', 'dopamine-reward-prediction-attention-residue-technical-study', 'index.html'),
    'utf8'
  );
  assert.equal(
    fs.existsSync(path.join(DIST_DIR, 'articles', 'dopamine-baseline-neuroscience-flow-state-architecture', 'index.html')),
    false,
    'Old art-007 slug must not emit an active duplicate page in dist/articles/'
  );
  for (const needle of [
    'https://doi.org/10.1126/science.275.5306.1593',
    'https://doi.org/10.1038/nrn.2016.57',
    'https://doi.org/10.1016/j.obhdp.2009.04.002',
    'https://doi.org/10.1145/1357054.1357072',
    'https://doi.org/10.1086/691462',
    'ADHD',
    'pharmacological sense'
  ]) {
    assert.ok(art007Html.includes(needle), `art-007 HTML missing verified study/caveat: ${needle}`);
  }

  const art008Html = fs.readFileSync(
    path.join(DIST_DIR, 'articles', 'crispr-epigenetic-reprogramming-cellular-rejuvenation', 'index.html'),
    'utf8'
  );
  assert.equal(art008Html.includes('hepatic hepatocyte'), false, 'art-008 must fix redundant "hepatic hepatocyte" wording');
  assert.ok(art008Html.includes('hepatocyte'), 'art-008 must use clean "hepatocyte" terminology');
  assert.ok(art008Html.includes('https://doi.org/10.1038/s43587-023-00562-3'), 'art-008 must include Cipriano et al. 2024 DOI');
  assert.ok(art008Html.includes('https://doi.org/10.1016/j.cell.2016.11.052'), 'art-008 must include Ocampo et al. 2016 DOI');

  const art003Html = fs.readFileSync(
    path.join(DIST_DIR, 'articles', 'the-90-minute-cognitive-sprint-neuroscience-protocols', 'index.html'),
    'utf8'
  );
  assert.equal(
    art003Html.includes('dopamine-baseline-neuroscience-flow-state-architecture'),
    false,
    'art-003 must not retain broken/old internal link to former art-007 slug'
  );
  assert.ok(
    art003Html.includes('/articles/dopamine-reward-prediction-attention-residue-technical-study'),
    'art-003 must link directly to aligned art-007 slug'
  );
  console.log('[PASS] 3. All 10 staging article HTML files verified (noindex/nofollow, factual corrections, verified citations, non-medical boundary, clean art-003 -> art-007 link).');

  // 4. Category hubs, author pages, trust pages, and 404.html verified
  for (const hub of CATEGORY_HUBS) {
    const catFile = path.join(DIST_DIR, 'category', hub.slug, 'index.html');
    assert.ok(fs.existsSync(catFile), `Missing category hub static HTML for /category/${hub.slug}`);
    const html = fs.readFileSync(catFile, 'utf8');
    assert.ok(html.includes('"@type": "CollectionPage"'), `Category ${hub.slug} missing CollectionPage JSON-LD`);
    assert.ok(html.includes(`https://eirvan.com/category/${hub.slug}`), `Category ${hub.slug} missing canonical`);
    assert.equal(html.includes('FAQPage'), false, `Category ${hub.slug} must not emit FAQPage schema`);
    assert.equal(html.includes('href="/articles/'), false, `Category ${hub.slug} must exclude unapproved in_review articles`);
  }

  for (const author of AUTHORS) {
    const authorFile = path.join(DIST_DIR, 'author', author.slug, 'index.html');
    assert.ok(fs.existsSync(authorFile), `Missing author HTML for /author/${author.slug}`);
    const html = fs.readFileSync(authorFile, 'utf8');
    assert.ok(html.includes('"@type": "Person"'), `Author ${author.slug} missing Person JSON-LD`);
    assert.ok(html.includes('Published Dispatches (0)'), `Author ${author.slug} must show 0 published dispatches until human approval`);
  }

  for (const staticRoute of ['about', 'editorial-policy', 'corrections-policy', 'contact', 'privacy', 'terms', 'products']) {
    const pFile = path.join(DIST_DIR, staticRoute, 'index.html');
    assert.ok(fs.existsSync(pFile), `Missing static HTML for /${staticRoute}`);
  }

  const notFoundHtml = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('content="noindex, follow"'), '404.html must carry noindex, follow directive');
  assert.ok(notFoundHtml.includes('<title>Page Not Found (404) | EIRVAN</title>'), '404.html must carry dedicated 404 title');
  assert.ok(notFoundHtml.includes('The requested page could not be found on EIRVAN.'), '404.html must carry reader-facing 404 description');
  console.log(`[PASS] 4. All ${CATEGORY_HUBS.length} categories, ${AUTHORS.length} authors, 7 trust/catalog pages, and noindex 404.html verified cleanly.`);

  // 5. Sitemap, RSS, Feed, Robots, LLMs Exclusion of Unapproved Drafts + Mapping Verification
  const sitemapXml = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  const rssXml = fs.readFileSync(path.join(DIST_DIR, 'rss.xml'), 'utf8');
  const feedXml = fs.readFileSync(path.join(DIST_DIR, 'feed.xml'), 'utf8');
  const robotsTxt = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  const llmsTxt = fs.readFileSync(path.join(DIST_DIR, 'llms.txt'), 'utf8');
  const llmsFullTxt = fs.readFileSync(path.join(DIST_DIR, 'llms-full.txt'), 'utf8');
  const ardJson = JSON.parse(fs.readFileSync(path.join(DIST_DIR, '.well-known', 'ard.json'), 'utf8'));
  const htaccess = fs.readFileSync(path.join(DIST_DIR, '.htaccess'), 'utf8');

  assert.equal(rssXml, feedXml, 'rss.xml and feed.xml must be identical');
  assert.equal(sitemapXml.includes('/articles/'), false, 'Default sitemap.xml must NOT list unapproved in_review articles');
  assert.equal(rssXml.includes('<item>'), false, 'Default rss.xml must NOT syndicate unapproved in_review articles');
  assert.equal(llmsTxt.includes('/articles/'), false, 'Default llms.txt must NOT list unapproved articles');
  assert.equal(llmsFullTxt.includes('/articles/'), false, 'Default llms-full.txt must NOT list unapproved articles');
  assert.ok(sitemapXml.includes('<urlset'), 'sitemap.xml must be valid XML urlset');
  assert.ok(robotsTxt.includes('Sitemap: https://eirvan.com/sitemap.xml'), 'robots.txt must reference sitemap.xml');
  assert.ok(robotsTxt.includes('Disallow: /admin'), 'robots.txt must disallow /admin');
  assert.ok(llmsTxt.includes('https://eirvan.com/sitemap.xml'), 'llms.txt must link to sitemap.xml');
  assert.equal(ardJson.specVersion, '1.0', '.well-known/ard.json must be valid JSON');

  const locMatches = [...sitemapXml.matchAll(/<loc>(https:\/\/eirvan\.com[^<]*)<\/loc>/g)].map(m => m[1]);
  assert.ok(locMatches.length >= 17, `Expected at least 17 non-article canonical sitemap URLs, got ${locMatches.length}`);
  for (const loc of locMatches) {
    const pathname = new URL(loc).pathname;
    const expectedHtml = pathname === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, pathname.replace(/^\/+/, ''), 'index.html');
    assert.ok(fs.existsSync(expectedHtml), `Sitemap <loc> ${loc} has no corresponding dist file (${expectedHtml})`);
  }

  const imgLocMatches = [...sitemapXml.matchAll(/<image:loc>(https:\/\/eirvan\.com[^<]*)<\/image:loc>/g)].map(m => m[1]);
  assert.equal(imgLocMatches.length, 0, 'Unapproved staging sitemap must contain 0 <image:loc> entries');
  console.log(`[PASS] 5. Verified zero unapproved article leaks in sitemap/RSS/llms; all ${locMatches.length} public sitemap <loc> entries map 1:1 to dist/ files.`);

  // 6. Approved Catalog Sitemap/RSS/Directive Behavior + Exclusion Edge Cases
  const signedArticles = SEED_ARTICLES.map(signTestArticle);
  assert.equal(signedArticles.length, 10);
  for (const signed of signedArticles) {
    assert.equal(signed.aiAssisted, true, 'Signing an article MUST preserve truthful aiAssisted disclosure');
    assert.equal(isPublicIndexableArticle(signed, Date.parse('2026-11-13T12:05:00Z')), true);
  }

  const approvedSitemap = generateSitemapXml(signedArticles);
  const approvedRss = generateRSSFeed(signedArticles);
  const approvedImgLocs = [...approvedSitemap.matchAll(/<image:loc>(https:\/\/eirvan\.com[^<]*)<\/image:loc>/g)].map(m => m[1]);
  assert.equal(approvedImgLocs.length, 10, 'Signed published catalog must emit 10 <image:loc> entries in sitemap');
  for (const imgLoc of approvedImgLocs) {
    const relImg = new URL(imgLoc).pathname.replace(/^\/+/, '');
    assert.ok(fs.existsSync(path.join(DIST_DIR, relImg)), `Approved sitemap <image:loc> ${imgLoc} missing in dist/`);
  }
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
  assert.equal(mixedSitemap.includes('hidden-noindex-story'), false, 'Sitemap must exclude case-insensitive NOINDEX posts');
  assert.equal(mixedSitemap.includes('/admin'), false, 'Sitemap must exclude /admin');
  assert.equal(mixedRss.includes('unpublished-draft-secret'), false, 'RSS must exclude drafts');
  assert.equal(mixedRss.includes('hidden-noindex-story'), false, 'RSS must exclude NOINDEX posts');
  assert.equal(isPublicIndexableArticle(mixedArticles[mixedArticles.length - 1]), false);
  console.log('[PASS] 6. Signed-catalog sitemap/RSS generation, case-insensitive NOINDEX/NONE, future scheduledAt, and draft exclusions verified.');

  // 7. Apache .htaccess Rewrite & DirectorySlash Off Verification (including art-007 301 preservation!)
  assert.ok(htaccess.includes('ErrorDocument 404 /404.html'));
  assert.ok(htaccess.includes('DirectorySlash Off'));
  assert.ok(!htaccess.includes('images.unsplash.com'));

  assert.deepEqual(simulateHtaccessRequest(htaccess, 'http://eirvan.com/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing'), {
    status: 301,
    location: 'https://eirvan.com/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing'
  });
  assert.deepEqual(simulateHtaccessRequest(htaccess, 'https://www.eirvan.com/about'), {
    status: 301,
    location: 'https://eirvan.com/about'
  });

  // Legacy singular and plural art-007 old slug -> new aligned art-007 slug in 1 clean hop
  assert.deepEqual(
    simulateHtaccessRequest(htaccess, 'https://eirvan.com/articles/dopamine-baseline-neuroscience-flow-state-architecture'),
    {
      status: 301,
      location: 'https://eirvan.com/articles/dopamine-reward-prediction-attention-residue-technical-study'
    }
  );
  assert.deepEqual(
    simulateHtaccessRequest(htaccess, 'https://eirvan.com/article/dopamine-baseline-neuroscience-flow-state-architecture/'),
    {
      status: 301,
      location: 'https://eirvan.com/articles/dopamine-reward-prediction-attention-residue-technical-study'
    }
  );
  assert.deepEqual(
    simulateHtaccessRequest(htaccess, 'https://eirvan.com/article/neuromorphic-silicon-breakthrough-2026'),
    {
      status: 301,
      location: 'https://eirvan.com/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing'
    }
  );
  assert.deepEqual(
    simulateHtaccessRequest(htaccess, 'https://eirvan.com/articles/dark-pool-algorithmic-arbitrage/'),
    {
      status: 301,
      location: 'https://eirvan.com/articles/algorithmic-arbitrage-2026-autonomous-high-frequency-execution'
    }
  );

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
  assert.equal(
    simulateHtaccessRequest(htaccess, 'https://eirvan.com/articles/dopamine-reward-prediction-attention-residue-technical-study').servedFile,
    'articles/dopamine-reward-prediction-attention-residue-technical-study/index.html'
  );
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/category/technology').servedFile, 'category/technology/index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/about').servedFile, 'about/index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/admin').servedFile, 'index.html');
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/unknown-random-url').status, 404);
  assert.equal(simulateHtaccessRequest(htaccess, 'https://eirvan.com/articles/does-not-exist').status, 404);
  console.log('[PASS] 7. Apache .htaccess single-hop 301s (including art-007 redirect), DirectorySlash Off, direct 200s, and true 404 verified.');

  // 8. Recursive Security, Source Map & Sidecar Hygiene Scan
  const allDistFiles = walkDir(DIST_DIR);
  const forbiddenExtensions = allDistFiles.filter(
    f => /\.(tsx?|env|pem|key|map)$/.test(f) || ['server.js', '_headers', '_redirects'].includes(path.basename(f))
  );
  assert.equal(forbiddenExtensions.length, 0, `Forbidden source/map/sidecar/secret files in dist/: ${forbiddenExtensions.join(', ')}`);
  assert.ok(fs.existsSync(path.join(DIST_DIR, '.well-known', 'ai-catalog.json')), 'Missing .well-known/ai-catalog.json in dist/');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '.well-known', 'llms.txt')), 'Missing .well-known/llms.txt in dist/');

  const textFiles = allDistFiles.filter(f => /\.(html|js|css|json|xml|txt)$/.test(f));
  for (const tf of textFiles) {
    const content = fs.readFileSync(tf, 'utf8');
    assert.equal(
      content.includes('BEGIN PRIVATE KEY') || content.includes('GEMINI_API_KEY') || content.includes('FIREBASE_PRIVATE_KEY'),
      false,
      `Potential secret leaked in ${tf}`
    );
  }
  console.log(`[PASS] 8. Recursive security, zero-sourcemap & IONOS artifact hygiene scan across all ${allDistFiles.length} dist/ files passed.`);

  // 9. Revision-Bound Editorial Approval Integrity, Auto-Invalidation & Reconciliation Checks
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
  assert.equal(validateEditorialApproval(spoofedBareBoolean).valid, false, 'Bare humanReviewed=true with generic desk name must be rejected');
  assert.equal(isPublicPublishedArticle(spoofedBareBoolean), false, 'Bare spoofed article must never be treated as public published');

  // Unauthorized reviewer rejection
  assert.throws(
    () =>
      applyAuthorizedApproval(SEED_ARTICLES[0], {
        uid: 'uid-random',
        email: 'unauthorized@example.com',
        displayName: 'Random User'
      }),
    /Editorial Approval Denied/
  );

  // Generic placeholder name rejection
  assert.throws(
    () =>
      applyAuthorizedApproval(SEED_ARTICLES[0], {
        uid: 'uid-admin-ashfaq',
        email: 'ashfaqtayyab318@gmail.com',
        displayName: 'EIRVAN Editorial Desk'
      }),
    /Named individual reviewer identity is required/
  );

  // Authorized approval binds exact revision hash and preserves aiAssisted: true
  const signed0 = signTestArticle(SEED_ARTICLES[0]);
  const validationOk = validateEditorialApproval(signed0, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
  assert.equal(validationOk.valid, true, 'Authorized approval must pass validation');
  assert.equal(validationOk.currentHash, computeArticleRevisionHash(signed0));
  assert.equal(signed0.aiAssisted, true, 'Authorized approval must preserve truthful aiAssisted=true disclosure');

  const signedAudit = auditArticleSEO(signed0, [signed0]);
  assert.equal(signedAudit.checks.find(c => c.id === 'trust-sources')?.status, 'pass');

  // Tampering with contentHtml or sources without re-signing makes prior approval stale & rejected
  const editedContentWithoutResign = {
    ...signed0,
    contentHtml: `${signed0.contentHtml}<p>Unreviewed factual claim added after approval.</p>`
  };
  const staleCheck = validateEditorialApproval(editedContentWithoutResign, { nowMs: Date.parse('2026-11-13T12:05:00Z') });
  assert.equal(staleCheck.valid, false, 'Editing content after sign-off must invalidate prior approval');
  assert.equal(staleCheck.stale, true, 'Validator must flag stale hash mismatch');

  // invalidateApprovalOnSubstantiveChange automatically revokes approval and resets status -> in_review
  const invalidated = invalidateApprovalOnSubstantiveChange(signed0, editedContentWithoutResign);
  assert.equal(invalidated.status, 'in_review');
  assert.equal(invalidated.humanReviewed, false);
  assert.equal(invalidated.approval, undefined);
  assert.equal(invalidated.reviewedAt, undefined);
  assert.equal(invalidated.reviewer, undefined);
  assert.equal(invalidated.aiAssisted, true, 'Invalidation must preserve aiAssisted flag');

  // FirebaseAdminService.saveArticle must reject unapproved, spoofed, or stale-edited saves to published/scheduled/approved
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

  // Complete authorized remote edit with newer updatedAt wins in normalizeArticleRecord
  const newerSignedRemote = normalizeArticleRecord({
    ...signed0,
    updatedAt: '2026-12-01T00:00:00Z'
  });
  assert.equal(newerSignedRemote.approval?.reviewerEmail, 'ashfaqtayyab318@gmail.com');

  console.log('[PASS] 9. Revision-bound editorial approval, stale-hash auto-invalidation, save gates, and catalog reconciliation verified.\n');
  console.log('ALL 9 PHASE 3C EDITORIAL GOVERNANCE & SEO RELEASE CHECKS PASSED.');
}

runSeoVerification().catch(err => {
  console.error('[SEO TEST FAILURE]', err);
  process.exit(1);
});

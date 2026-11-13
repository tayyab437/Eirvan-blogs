import fs from 'node:fs';
import path from 'node:path';
import { Article } from '../src/types/blog';
import { SEED_ARTICLES } from '../src/data/seedArticles';
import { AUTHORS, EDITORIAL_DESK_PROFILE, getAuthorByName } from '../src/data/authors';
import { CATEGORY_HUBS, getCategoryHubByName } from '../src/data/categories';
import { getArticlePath, getCategoryPath, RouteState } from '../src/utils/router';
import {
  SITE_URL,
  SITE_NAME,
  buildRouteHeadMetadata,
  getResponsiveImageSet,
  isPublicIndexableArticle,
  isPublicPublishedArticle,
  toAbsoluteSiteUrl
} from '../src/utils/seo';
import { generateSitemapXml } from '../src/utils/sitemap';
import { generateRSSFeed } from '../src/utils/rss';
import {
  reconcileArticleCatalog,
  CatalogPrecedenceMode,
  CatalogReconciliationReport
} from '../src/utils/reconcileCatalog';
import { PRODUCTS } from '../src/data/products';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const HOME_PAGE_SIZE = 6;

interface FirebaseClientConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeFirestoreValue(val: Record<string, any> | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return values.map((v: Record<string, any>) => decodeFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v as Record<string, any>);
    }
    return out;
  }
  return undefined;
}

function stripPrivateFields(article: Article): Article {
  const { editorialNotes: _omitted, ...publicSafe } = article;
  return publicSafe;
}

function validateRemoteArticle(raw: Record<string, any>): boolean {
  const slugOk = typeof raw.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw.slug.trim());
  const titleOk = typeof raw.title === 'string' && raw.title.trim().length > 0;
  const bodyOk = typeof raw.contentHtml === 'string' && raw.contentHtml.trim().length > 0;
  const catOk = typeof raw.category === 'string' && raw.category.trim().length > 0;
  return slugOk && titleOk && bodyOk && catOk;
}

function decodeFirestoreDocument(
  doc: Record<string, any>
): { article: Article | null; malformed: boolean } {
  const fields = doc.fields || {};
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = decodeFirestoreValue(v as Record<string, any>);
  }
  if (!obj.id && typeof doc.name === 'string') {
    obj.id = doc.name.split('/').pop();
  }
  if (!obj.slug && !obj.title) {
    return { article: null, malformed: true };
  }
  if (!validateRemoteArticle(obj)) {
    return { article: null, malformed: true };
  }
  return {
    article: stripPrivateFields(obj as unknown as Article),
    malformed: false
  };
}

async function fetchJsonWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublishedViaRunQuery(
  projectId: string,
  dbId: string,
  apiKey: string
): Promise<{ docs: Record<string, any>[]; status: number; truncated: boolean }> {
  const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'articles' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'published' }
        }
      },
      limit: 500
    }
  };
  const res = await fetchJsonWithTimeout(runQueryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    return { docs: [], status: res.status, truncated: false };
  }
  const rows = (await res.json()) as Array<{ document?: Record<string, any> }>;
  const docs = Array.isArray(rows)
    ? rows.map(r => r.document).filter((d): d is Record<string, any> => Boolean(d))
    : [];
  return { docs, status: res.status, truncated: docs.length >= 500 };
}

/**
 * Fetches raw public articles cleanly via Cloud Firestore REST API using public client config
 * (zero Admin SDK keys or server secrets embedded), paginating through all pages via
 * nextPageToken and falling back to structured :runQuery when list rules restrict collection scans.
 *
 * Uses reconcileArticleCatalog() so remote records and curated seeds are NEVER silently merged
 * or promoted without explicit humanReviewed=true approval and conflict reporting.
 */
async function loadArticlesForBuild(): Promise<{
  articles: Article[];
  stagingArticles: Article[];
  source: string;
  reconciliation: CatalogReconciliationReport;
}> {
  const isStrict = process.env.STRICT_FIRESTORE_BUILD === '1' || process.argv.includes('--strict-firestore');
  const isProdPublish = process.env.PRODUCTION_PUBLISH === '1' || process.argv.includes('--production-publish');
  const precedenceMode: CatalogPrecedenceMode =
    process.env.CATALOG_PRECEDENCE === 'remote-authoritative' || process.argv.includes('--remote-authoritative')
      ? 'remote-authoritative'
      : 'reconcile-curated-verified';

  const configPath = path.join(ROOT_DIR, 'firebase-applet-config.json');

  const computeStaging = (published: Article[]): Article[] => {
    if (isProdPublish) return [];
    const pubIds = new Set(published.map(a => a.id));
    return SEED_ARTICLES.filter(a => !pubIds.has(a.id)).map(a => stripPrivateFields(a));
  };

  const buildReportFallback = (reason: string) => {
    if (isStrict) {
      throw new Error(`Strict Firestore build aborted: ${reason}`);
    }
    console.warn(`[STATIC-SEO WARN] ${reason}. Reconciling with explicit verified seed gate (${SEED_ARTICLES.length} seeds).`);
    const reconciliation = reconcileArticleCatalog([], SEED_ARTICLES, { mode: precedenceMode });
    return {
      articles: reconciliation.publishedArticles,
      stagingArticles: computeStaging(reconciliation.publishedArticles),
      source: `seed_reconciled_only (${reason})`,
      reconciliation
    };
  };

  if (!fs.existsSync(configPath)) {
    return buildReportFallback('firebase-applet-config.json not found');
  }

  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseClientConfig;
    if (!cfg.projectId || !cfg.apiKey) {
      return buildReportFallback('incomplete firebase-applet-config.json');
    }
    const dbId = cfg.firestoreDatabaseId || '(default)';
    const baseListUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(dbId)}/documents/articles?key=${encodeURIComponent(cfg.apiKey)}&pageSize=100`;

    const allDocs: Record<string, any>[] = [];
    let pageToken: string | undefined;
    let transportSource = 'firestore_rest_list';
    let hitListErrorStatus: number | null = null;

    do {
      const pagedUrl = pageToken ? `${baseListUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseListUrl;
      const res = await fetchJsonWithTimeout(pagedUrl);
      if (!res.ok) {
        hitListErrorStatus = res.status;
        break;
      }
      const data = (await res.json()) as { documents?: Record<string, any>[]; nextPageToken?: string };
      if (Array.isArray(data.documents)) {
        allDocs.push(...data.documents);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (hitListErrorStatus !== null && allDocs.length === 0) {
      // If full collection LIST was denied (e.g. hardened status=='published' rule), retry via filtered :runQuery
      const queryAttempt = await fetchPublishedViaRunQuery(cfg.projectId, dbId, cfg.apiKey);
      if (queryAttempt.status >= 200 && queryAttempt.status < 300) {
        allDocs.push(...queryAttempt.docs);
        transportSource = 'firestore_rest_runQuery(status==published)';
      } else {
        return buildReportFallback(
          `Firestore LIST returned HTTP ${hitListErrorStatus} and :runQuery returned HTTP ${queryAttempt.status}`
        );
      }
    }

    let malformedCount = 0;
    const remoteRawArticles: Article[] = [];
    for (const doc of allDocs) {
      const decoded = decodeFirestoreDocument(doc);
      if (decoded.malformed) {
        malformedCount += 1;
      } else if (decoded.article) {
        remoteRawArticles.push(decoded.article);
      }
    }

    if (malformedCount > 0) {
      const msg = `${malformedCount} remote Firestore article document(s) failed schema validation`;
      if (isStrict) {
        throw new Error(`Strict Firestore build aborted: ${msg}`);
      }
      console.warn(`[STATIC-SEO WARN] ${msg}.`);
    }

    if (remoteRawArticles.length === 0) {
      return buildReportFallback('0 valid remote Firestore documents returned');
    }

    const reconciliation = reconcileArticleCatalog(remoteRawArticles, SEED_ARTICLES, {
      mode: precedenceMode
    });

    if (isStrict && precedenceMode === 'remote-authoritative' && reconciliation.flaggedConflictCount > 0) {
      throw new Error(
        `Strict remote-authoritative build aborted: ${reconciliation.flaggedConflictCount} catalog conflict(s) require editorial reconciliation.`
      );
    }

    return {
      articles: reconciliation.publishedArticles,
      stagingArticles: computeStaging(reconciliation.publishedArticles),
      source: `${transportSource} (${remoteRawArticles.length} remote docs; mode=${precedenceMode}; conflictsFlagged=${reconciliation.flaggedConflictCount})`,
      reconciliation
    };
  } catch (err) {
    if (isStrict) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    return buildReportFallback(msg);
  }
}

function renderPictureHtml(url: string, alt: string, className = 'w-full h-auto object-cover', eager = false): string {
  const img = getResponsiveImageSet(url);
  const loadingAttr = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  if (img.isLocalResponsive) {
    return `<picture>
  ${img.avifSrcSet ? `<source type="image/avif" srcset="${escapeHtml(img.avifSrcSet)}" sizes="${escapeHtml(img.sizes || '100vw')}" />` : ''}
  ${img.webpSrcSet ? `<source type="image/webp" srcset="${escapeHtml(img.webpSrcSet)}" sizes="${escapeHtml(img.sizes || '100vw')}" />` : ''}
  <img src="${escapeHtml(img.fallbackSrc)}" ${img.jpegSrcSet ? `srcset="${escapeHtml(img.jpegSrcSet)}" sizes="${escapeHtml(img.sizes || '100vw')}"` : ''} alt="${escapeHtml(alt)}" width="1200" height="675" ${loadingAttr} decoding="async" class="${escapeHtml(className)}" />
</picture>`;
  }
  return `<img src="${escapeHtml(img.fallbackSrc)}" alt="${escapeHtml(alt)}" width="1200" height="675" ${loadingAttr} decoding="async" class="${escapeHtml(className)}" />`;
}

function renderSiteHeaderHtml(): string {
  const links = CATEGORY_HUBS.map(
    h => `<a href="/category/${h.slug}" class="text-sm font-medium text-stone-700 hover:text-blue-900 px-3 py-2">${escapeHtml(h.name)}</a>`
  ).join('\n        ');

  return `<header class="border-b border-stone-200 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
    <a href="/" class="flex items-center gap-3 font-serif font-bold text-xl text-stone-900">
      <img src="/images/brand/eirvan-icon-192.webp" alt="EIRVAN" width="32" height="32" class="w-8 h-8 rounded-lg" />
      <span>EIRVAN</span>
    </a>
    <nav aria-label="Primary sections" class="hidden md:flex items-center gap-1">
      ${links}
      <a href="/about" class="text-sm font-medium text-stone-700 hover:text-blue-900 px-3 py-2">About</a>
    </nav>
    <div class="flex items-center gap-3 text-xs font-semibold">
      <a href="/rss.xml" class="text-stone-700 hover:text-amber-800">RSS</a>
      <a href="/contact" class="px-3 py-2 rounded-lg bg-stone-900 text-white">Contact</a>
    </div>
  </div>
</header>`;
}

function renderSiteFooterHtml(): string {
  const catLinks = CATEGORY_HUBS.map(
    h => `<li><a href="/category/${h.slug}" class="hover:text-blue-900">${escapeHtml(h.name)}</a></li>`
  ).join('\n        ');

  return `<footer class="mt-16 border-t border-stone-200 bg-white text-stone-700">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
    <div>
      <strong class="font-serif text-lg text-stone-900 block mb-2">EIRVAN</strong>
      <p class="text-stone-600 leading-relaxed">Independent digital publication examining Technology, Business, Lifestyle, Education, and News with cited primary sources.</p>
    </div>
    <div>
      <strong class="font-mono uppercase text-stone-900 block mb-2">Editorial Sections</strong>
      <ul class="space-y-1.5">
        ${catLinks}
      </ul>
    </div>
    <div>
      <strong class="font-mono uppercase text-stone-900 block mb-2">Standards &amp; Trust</strong>
      <ul class="space-y-1.5">
        <li><a href="/about">About &amp; Masthead</a></li>
        <li><a href="/editorial-policy">Editorial Policy</a></li>
        <li><a href="/corrections-policy">Corrections Policy</a></li>
        <li><a href="/contact">Contact Us</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
      </ul>
    </div>
  </div>
</footer>`;
}

function renderHomepageHtml(articles: Article[], page: number, totalPages: number): string {
  const lead = articles.find(a => a.isFeatured) || articles[0];
  const paged = articles.slice((page - 1) * HOME_PAGE_SIZE, page * HOME_PAGE_SIZE);

  const cards =
    paged.length > 0
      ? paged
          .map(art => {
            const cat = getCategoryHubByName(art.category);
            const author = getAuthorByName(art.author.name);
            return `<article class="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
  <a href="${getArticlePath(art.slug)}">${renderPictureHtml(art.featuredImage, art.imageAlt || art.title, 'w-full aspect-video object-cover')}</a>
  <div class="p-5 space-y-2">
    <div class="text-xs font-mono text-stone-500">
      <a href="/category/${cat.slug}" class="text-blue-900 font-semibold">${escapeHtml(cat.name)}</a> · <time datetime="${escapeHtml(art.publishedAt)}">${escapeHtml(art.publishedAt.split('T')[0])}</time>
    </div>
    <h2 class="font-serif text-xl font-bold text-stone-900"><a href="${getArticlePath(art.slug)}">${escapeHtml(art.title)}</a></h2>
    <p class="text-sm text-stone-600">${escapeHtml(art.summary)}</p>
    <div class="text-xs text-stone-500">By <a href="/author/${escapeHtml(author.slug)}" class="font-medium text-stone-800">${escapeHtml(author.name)}</a> · ${art.readTimeMinutes} min read</div>
  </div>
</article>`;
          })
          .join('\n')
      : `<div class="col-span-full bg-white border border-amber-300 rounded-2xl p-6 text-sm text-stone-700">
  <strong>Editorial Governance Gate Active:</strong> Candidate articles in this release build are currently marked <code>in_review</code> awaiting authorized human editorial approval before public indexation or feed syndication.
</div>`;

  const paginationLinks: string[] = [];
  if (page > 1) {
    paginationLinks.push(`<a href="${page === 2 ? '/' : `/page/${page - 1}`}">← Previous Page</a>`);
  }
  for (let p = 1; p <= totalPages; p++) {
    paginationLinks.push(`<a href="${p === 1 ? '/' : `/page/${p}`}">${p}</a>`);
  }
  if (page < totalPages) {
    paginationLinks.push(`<a href="/page/${page + 1}">Next Page →</a>`);
  }

  return `<div class="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
${renderSiteHeaderHtml()}
<main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
  <header class="border-b border-stone-200 pb-6 space-y-3">
    <p class="text-xs font-mono uppercase tracking-widest text-stone-500">Explore · Learn · Stay Informed</p>
    <h1 class="text-4xl font-serif font-bold text-stone-900">${page > 1 ? `EIRVAN Archive — Page ${page}` : 'Independent Reporting &amp; Primary-Source Analysis'}</h1>
    <p class="text-base text-stone-600 max-w-2xl">Thorough, cite-checked briefings across Technology, Business, Lifestyle, Education, and News—authored with verifiable primary sources.</p>
  </header>
  ${page === 1 && lead ? `<section aria-label="Featured Story" class="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
    <a href="${getArticlePath(lead.slug)}">${renderPictureHtml(lead.featuredImage, lead.imageAlt || lead.title, 'w-full aspect-video object-cover rounded-xl', true)}</a>
    <div class="text-xs font-mono text-blue-900 font-semibold">${escapeHtml(getCategoryHubByName(lead.category).name)}</div>
    <h2 class="text-3xl font-serif font-bold"><a href="${getArticlePath(lead.slug)}">${escapeHtml(lead.title)}</a></h2>
    <p class="text-stone-600">${escapeHtml(lead.summary)}</p>
  </section>` : ''}
  <section aria-label="Published Dispatches" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    ${cards}
  </section>
  ${totalPages > 1 ? `<nav aria-label="Archive pagination" class="flex items-center gap-4 text-xs font-semibold pt-4">${paginationLinks.join(' ')}</nav>` : ''}
</main>
${renderSiteFooterHtml()}
</div>`;
}

function renderArticlePageHtml(article: Article, allPublished: Article[]): string {
  const catHub = getCategoryHubByName(article.category);
  const author = getAuthorByName(article.author.name);
  const isApprovedPublic = isPublicPublishedArticle(article);
  const reviewer = isApprovedPublic ? article.approval || article.reviewer : undefined;
  const reviewerName = article.approval?.reviewerName || article.reviewer?.name;
  const reviewedAt = article.approval?.reviewedAt || article.reviewedAt;

  const related = allPublished
    .filter(a => a.id !== article.id)
    .sort((a, b) => {
      const sameA = getCategoryHubByName(a.category).slug === catHub.slug ? 1 : 0;
      const sameB = getCategoryHubByName(b.category).slug === catHub.slug ? 1 : 0;
      return sameB - sameA;
    })
    .slice(0, 3);

  const sourcesHtml =
    article.sources && article.sources.length > 0
      ? `<section aria-label="Primary Sources" class="border-t border-stone-200 pt-6 space-y-3">
  <h2 class="text-xl font-serif font-bold">Primary Sources &amp; Citations</h2>
  <ol class="list-decimal pl-5 space-y-2 text-sm text-stone-700">
    ${article.sources
      .map(
        s =>
          `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-900 underline">${escapeHtml(s.title)}</a> — ${escapeHtml(s.publisher)}${s.publishedDate ? ` (Published ${escapeHtml(s.publishedDate)})` : s.year ? ` (${escapeHtml(s.year)})` : ''}${s.accessedAt ? ` · Accessed ${escapeHtml(s.accessedAt)}` : ''}</li>`
      )
      .join('\n    ')}
  </ol>
</section>`
      : '';

  const changelogHtml =
    article.changelog && article.changelog.length > 0
      ? `<section aria-label="Revision History" class="border-t border-stone-200 pt-6 space-y-2">
  <h2 class="text-lg font-serif font-bold">Corrections &amp; Revision Log</h2>
  <ul class="list-disc pl-5 space-y-1 text-xs text-stone-600">
    ${article.changelog
      .map(c => `<li><strong>${escapeHtml(c.date)}:</strong> ${escapeHtml(c.note)}</li>`)
      .join('\n    ')}
  </ul>
</section>`
      : '';

  const faqHtml =
    article.faqs && article.faqs.length > 0
      ? `<section aria-label="Frequently Asked Questions" class="border-t border-stone-200 pt-6 space-y-3">
  <h2 class="text-xl font-serif font-bold">Frequently Asked Questions</h2>
  ${article.faqs
    .map(
      f => `<details open class="border border-stone-200 bg-white rounded-xl p-4">
    <summary class="font-serif font-semibold text-stone-900">${escapeHtml(f.question)}</summary>
    <p class="mt-2 text-sm text-stone-600">${escapeHtml(f.answer)}</p>
  </details>`
    )
    .join('\n  ')}
</section>`
      : '';

  const relatedHtml =
    related.length > 0
      ? `<section aria-label="Related Briefings" class="border-t border-stone-200 pt-8 space-y-4">
  <h2 class="text-2xl font-serif font-bold">Related Briefings</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    ${related
      .map(
        r => `<a href="${getArticlePath(r.slug)}" class="block bg-white border border-stone-200 rounded-xl p-4 hover:border-blue-900">
      <div class="text-xs font-mono text-stone-500">${escapeHtml(getCategoryHubByName(r.category).name)}</div>
      <div class="font-serif font-bold text-stone-900 mt-1">${escapeHtml(r.title)}</div>
    </a>`
      )
      .join('\n    ')}
  </div>
</section>`
      : '';

  const governanceBanner = !isApprovedPublic
    ? `<aside aria-label="Editorial Governance Status" class="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4 text-xs leading-relaxed">
  <strong>[PENDING AUTHORIZED HUMAN EDITORIAL APPROVAL — EXCLUDED FROM PUBLIC INDEXATION]</strong>
  <span> · Status: <code>${escapeHtml(article.status)}</code></span>
  <span> · ${article.aiAssisted ? 'AI-assisted draft requiring authorized human verification' : 'Awaiting authorized reviewer sign-off'}</span>
  <span> · Marked <code>noindex, nofollow</code> and excluded from sitemaps and feeds.</span>
</aside>`
    : '';

  return `<div class="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
${renderSiteHeaderHtml()}
<main class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
  <nav aria-label="Breadcrumb" class="text-xs font-mono text-stone-500 flex flex-wrap items-center gap-2">
    <a href="/">Home</a> <span>/</span>
    <a href="/category/${catHub.slug}">${escapeHtml(catHub.name)}</a> <span>/</span>
    <span class="text-stone-900">${escapeHtml(article.title)}</span>
  </nav>
  ${governanceBanner}
  <article class="space-y-6">
    <header class="space-y-4 border-b border-stone-200 pb-6">
      <h1 class="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">${escapeHtml(article.title)}</h1>
      <p class="text-lg text-stone-600 leading-relaxed">${escapeHtml(article.summary)}</p>
      <div class="text-xs text-stone-600 flex flex-wrap items-center gap-3">
        <span>By <a href="/author/${escapeHtml(author.slug)}" class="font-semibold text-stone-900 underline">${escapeHtml(author.name)}</a></span>
        ${reviewer && reviewerName ? `<span>· Approved by <span class="font-semibold text-stone-900">${escapeHtml(reviewerName)}</span>${reviewedAt ? ` (<time datetime="${escapeHtml(reviewedAt)}">${escapeHtml(reviewedAt.split('T')[0])}</time>)` : ''}</span>` : '<span>· Pending authorized human approval</span>'}
        <span>· ${article.aiAssisted ? (isApprovedPublic ? 'AI-assisted draft · Human-verified' : 'AI-assisted draft · Pending human verification') : 'Human-authored'}</span>
        <span>· Published <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(article.publishedAt.split('T')[0])}</time></span>
        <span>· Updated <time datetime="${escapeHtml(article.updatedAt || article.publishedAt)}">${escapeHtml((article.updatedAt || article.publishedAt).split('T')[0])}</time></span>
        <span>· ${article.readTimeMinutes} min read</span>
      </div>
    </header>
    <figure class="space-y-2">
      ${renderPictureHtml(article.featuredImage, article.imageAlt || article.title, 'w-full aspect-video object-cover rounded-2xl', true)}
      <figcaption class="text-xs text-stone-500">${escapeHtml(article.imageAlt || article.title)}</figcaption>
    </figure>
    <div class="prose-editorial text-stone-800 space-y-4">
      ${article.contentHtml}
    </div>
    ${sourcesHtml}
    ${changelogHtml}
    ${faqHtml}
    ${relatedHtml}
  </article>
</main>
${renderSiteFooterHtml()}
</div>`;
}

function renderCategoryPageHtml(hubIndex: number, articles: Article[], page: number, totalPages: number): string {
  const hub = CATEGORY_HUBS[hubIndex];
  const paged = articles.slice((page - 1) * HOME_PAGE_SIZE, page * HOME_PAGE_SIZE);
  const cards = paged
    .map(
      art => `<article class="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
  <a href="${getArticlePath(art.slug)}">${renderPictureHtml(art.featuredImage, art.imageAlt || art.title, 'w-full aspect-video object-cover')}</a>
  <div class="p-5 space-y-2">
    <h2 class="font-serif text-xl font-bold"><a href="${getArticlePath(art.slug)}">${escapeHtml(art.title)}</a></h2>
    <p class="text-sm text-stone-600">${escapeHtml(art.summary)}</p>
  </div>
</article>`
    )
    .join('\n');

  const paginationLinks: string[] = [];
  if (page > 1) {
    paginationLinks.push(`<a href="${getCategoryPath(hub.name, page - 1)}">← Previous Page</a>`);
  }
  for (let p = 1; p <= totalPages; p++) {
    paginationLinks.push(`<a href="${getCategoryPath(hub.name, p)}">${p}</a>`);
  }
  if (page < totalPages) {
    paginationLinks.push(`<a href="${getCategoryPath(hub.name, page + 1)}">Next Page →</a>`);
  }

  return `<div class="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
${renderSiteHeaderHtml()}
<main class="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
  <nav aria-label="Breadcrumb" class="text-xs font-mono text-stone-500">
    <a href="/">Home</a> / <span class="text-stone-900">${escapeHtml(hub.name)}</span>
  </nav>
  <header class="border-b border-stone-200 pb-6 space-y-3">
    <p class="text-xs font-mono uppercase tracking-widest text-stone-500">${escapeHtml(hub.kicker)}</p>
    <h1 class="text-4xl font-serif font-bold text-stone-900">${escapeHtml(hub.name)}: ${escapeHtml(hub.headline)}</h1>
    <p class="text-base text-stone-600 max-w-3xl">${escapeHtml(hub.description)}</p>
  </header>
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    ${cards}
  </section>
  ${totalPages > 1 ? `<nav aria-label="Category pagination" class="flex items-center gap-4 text-xs font-semibold pt-4">${paginationLinks.join(' ')}</nav>` : ''}
</main>
${renderSiteFooterHtml()}
</div>`;
}

function renderAuthorPageHtml(authorSlug: string, publishedArticles: Article[]): string {
  const author = AUTHORS.find(a => a.slug === authorSlug) || AUTHORS[0];
  const authored = publishedArticles.filter(
    a => a.author?.slug === author.slug || getAuthorByName(a.author?.name || '').slug === author.slug
  );

  return `<div class="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
${renderSiteHeaderHtml()}
<main class="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
  <nav aria-label="Breadcrumb" class="text-xs font-mono text-stone-500">
    <a href="/">Home</a> / <span class="text-stone-900">${escapeHtml(author.name)}</span>
  </nav>
  <header class="bg-white border border-stone-200 rounded-2xl p-8 flex flex-col sm:flex-row gap-6 items-start">
    ${renderPictureHtml(author.avatar, author.name, 'w-28 h-28 rounded-xl object-cover', true)}
    <div class="space-y-2">
      <div class="text-xs font-mono uppercase text-blue-900 font-semibold">${escapeHtml(author.department)}</div>
      <h1 class="text-3xl font-serif font-bold">${escapeHtml(author.name)}</h1>
      <p class="text-sm font-medium text-stone-600">${escapeHtml(author.role)}</p>
      <p class="text-sm text-stone-700 leading-relaxed">${escapeHtml(author.bio)}</p>
    </div>
  </header>
  <section class="space-y-4">
    <h2 class="text-2xl font-serif font-bold">Published Dispatches (${authored.length})</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${authored
        .map(
          a => `<a href="${getArticlePath(a.slug)}" class="block bg-white border border-stone-200 rounded-xl p-5 hover:border-blue-900">
        <div class="font-serif font-bold text-lg text-stone-900">${escapeHtml(a.title)}</div>
        <p class="text-sm text-stone-600 mt-1">${escapeHtml(a.summary)}</p>
      </a>`
        )
        .join('\n      ')}
    </div>
  </section>
</main>
${renderSiteFooterHtml()}
</div>`;
}

function renderTrustStaticPageHtml(routeType: RouteState['routeType']): string {
  const contentMap: Record<string, { title: string; lead: string; body: string }> = {
    about: {
      title: 'About EIRVAN — Independent Digital Publication & Editorial Masthead',
      lead: 'EIRVAN publishes primary-sourced reporting across Technology, Business, Lifestyle, Education, and News without paywalls.',
      body: `<p>Every dispatch passes source citation checks, schema validation, and named editor review. Browse our <a href="/editorial-policy">Editorial Policy</a> and <a href="/corrections-policy">Corrections Policy</a> for complete methodology.</p>`
    },
    'editorial-policy': {
      title: 'EIRVAN Editorial Policy & Verification Standards',
      lead: 'Primary-source attribution, independence from sponsors, and mandatory human editorial sign-off.',
      body: `<p>EIRVAN separates empirical reporting from commentary. Any AI-assisted outline tools remain strictly disclosed as unreviewed until a named human editor completes primary source verification.</p>`
    },
    'corrections-policy': {
      title: 'EIRVAN Corrections & Versioning Policy',
      lead: 'Transparent errata handling and timestamped revision logs across every updated article.',
      body: `<p>Substantive factual fixes are appended directly inside the article changelog and reflected in visible Updated timestamps. Submit errata notices to <a href="mailto:editorial@eirvan.com">editorial@eirvan.com</a>.</p>`
    },
    contact: {
      title: 'Contact the EIRVAN Editorial & Syndication Desk',
      lead: 'Reach newsroom editors, factual corrections, privacy requests, or sponsorship inquiries.',
      body: `<ul><li>Editorial &amp; Corrections: <a href="mailto:editorial@eirvan.com">editorial@eirvan.com</a></li><li>Privacy Office: <a href="mailto:privacy@eirvan.com">privacy@eirvan.com</a></li><li>Legal Counsel: <a href="mailto:legal@eirvan.com">legal@eirvan.com</a></li></ul>`
    },
    privacy: {
      title: 'EIRVAN Privacy Policy',
      lead: 'Privacy by design, minimal client storage, and GDPR / CCPA rights.',
      body: `<p>Hosted on IONOS Web Hosting Plus with Firebase Cloud Firestore CMS synchronization. Reader bookmarks stay locally inside browser localStorage.</p>`
    },
    terms: {
      title: 'EIRVAN Terms of Service',
      lead: 'Open citation licensing, sponsorship disclosures, and non-advisory notices.',
      body: `<p>Non-commercial academic citation with canonical attribution is welcomed. Financial and biological health reporting does not constitute individualized financial or medical advice.</p>`
    },
    products: {
      title: 'EIRVAN Reference Monographs & Institutional Editions',
      lead: 'Structured reference monographs compiled from EIRVAN research desks.',
      body: `<ul>${PRODUCTS.map(p => `<li><strong>${escapeHtml(p.title)}</strong> — ${escapeHtml(p.subtitle)}</li>`).join('')}</ul>`
    },
    'not-found': {
      title: 'Page Not Found (HTTP 404) — EIRVAN',
      lead: 'The requested URL could not be found on eirvan.com.',
      body: `<p>Return to the <a href="/">EIRVAN Homepage</a> or browse <a href="/category/technology">Technology</a>, <a href="/category/business">Business</a>, <a href="/category/lifestyle">Lifestyle</a>, <a href="/category/education">Education</a>, or <a href="/category/news">News</a>.</p>`
    }
  };

  const entry = contentMap[routeType] || contentMap.about;
  return `<div class="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
${renderSiteHeaderHtml()}
<main class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
  <h1 class="text-4xl font-serif font-bold text-stone-900">${entry.title}</h1>
  <p class="text-lg text-stone-600 leading-relaxed">${entry.lead}</p>
  <div class="bg-white border border-stone-200 rounded-2xl p-8 space-y-4 text-stone-700">${entry.body}</div>
</main>
${renderSiteFooterHtml()}
</div>`;
}

function injectHeadAndRootHtml(
  templateHtml: string,
  route: RouteState,
  rootInnerHtml: string,
  options: {
    article?: Article;
    author?: (typeof AUTHORS)[number];
    totalPages?: number;
  } = {}
): string {
  const meta = buildRouteHeadMetadata(route, options);
  const gscToken = (process.env.VITE_GSC_VERIFICATION_TOKEN || '').trim();
  const gaId = (process.env.VITE_GA_MEASUREMENT_ID || '').trim();

  const jsonLdScripts = meta.schemas
    .map(
      (schema, idx) =>
        `  <script${idx === 0 ? ' id="dynamic-article-schema"' : ''} type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`
    )
    .join('\n');

  const seoHeadBlock = `  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta name="robots" content="${escapeHtml(meta.robots)}" />
  <link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />
  ${meta.prevUrl ? `<link rel="prev" href="${escapeHtml(meta.prevUrl)}" />` : ''}
  ${meta.nextUrl ? `<link rel="next" href="${escapeHtml(meta.nextUrl)}" />` : ''}
  ${gscToken ? `<meta name="google-site-verification" content="${escapeHtml(gscToken)}" />` : ''}
  <meta property="og:type" content="${escapeHtml(meta.ogType)}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(meta.ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />
${jsonLdScripts}`;

  let html = templateHtml;

  // Replace default template <title>, meta description/robots/canonical/OG/Twitter and JSON-LD block cleanly.
  // Only overwrite google-site-verification if VITE_GSC_VERIFICATION_TOKEN env var is explicitly supplied,
  // preserving any verification tag checked into index.html.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, '');
  if (gscToken) {
    html = html.replace(/<meta\s+name="google-site-verification"[^>]*>/gi, '');
  }
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  html = html.replace(/<link\s+rel="(?:prev|next)"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
  html = html.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');

  // Cleanly strip any prior injected hero preload tags across reruns
  html = html.replace(/<link[^>]*data-seo-hero="true"[^>]*>\s*/gi, '');

  // Preload hero image cleanly on article routes
  if (route.routeType === 'article' && options.article) {
    const heroImg = getResponsiveImageSet(options.article.featuredImage);
    const preloadHref = heroImg.isLocalResponsive
      ? `${options.article.featuredImage.replace(/-(400|800|1200)\.(avif|webp|jpg)$/, '-800.webp')}`
      : heroImg.fallbackSrc;
    html = html.replace(
      /<\/head>/i,
      `  <link rel="preload" as="image" href="${escapeHtml(preloadHref)}" fetchpriority="high" data-seo-hero="true" />\n${seoHeadBlock}\n${gaId && /^G-[A-Z0-9]+$/i.test(gaId) ? `  <!-- Google Analytics configured cleanly at runtime via VITE_GA_MEASUREMENT_ID -->` : ''}\n</head>`
    );
  } else {
    html = html.replace(/<\/head>/i, `${seoHeadBlock}\n</head>`);
  }

  // Inject static visible semantic HTML into <div id="root"> idempotently
  const ROOT_START = '<!-- __EIRVAN_SSR_ROOT_START__ -->';
  const ROOT_END = '<!-- __EIRVAN_SSR_ROOT_END__ -->';
  if (html.includes(ROOT_START) && html.includes(ROOT_END)) {
    html = html.replace(
      new RegExp(`${ROOT_START}[\\s\\S]*?${ROOT_END}`),
      `${ROOT_START}\n${rootInnerHtml}\n${ROOT_END}`
    );
  } else if (/<div id="root"><\/div>/i.test(html)) {
    html = html.replace(
      /<div id="root"><\/div>/i,
      `<div id="root">${ROOT_START}\n${rootInnerHtml}\n${ROOT_END}</div>`
    );
  } else {
    throw new Error('Template HTML does not contain an expected #root mount container.');
  }
  return html;
}

function writeRouteFile(relativeFile: string, content: string) {
  const fullPath = path.join(DIST_DIR, relativeFile);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function buildHtaccess(publishedArticles: Article[]): string {
  const previousSlugRedirects = publishedArticles.flatMap(art =>
    (art.previousSlugs || [])
      .filter(oldSlug => oldSlug && oldSlug !== art.slug)
      .map(
        oldSlug =>
          `  RewriteRule ^articles?/${oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$ /articles/${art.slug} [R=301,L]`
      )
  );

  return `# ==============================================================================
# EIRVAN BLOGS — Production Apache Configuration (.htaccess)
# Optimized for IONOS Web Hosting Plus & Apache 2.4+ (Static-First Architecture)
# ==============================================================================

DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Prevent Apache mod_dir from issuing 301 trailing-slash redirects on extensionless prerendered directories
  DirectorySlash Off

  # Enforce canonical HTTPS + apex eirvan.com in a single hop (avoid www/http duplicate indexation)
  RewriteCond %{HTTP_HOST} ^www\\.eirvan\\.com$ [NC]
  RewriteRule ^(.*)$ https://eirvan.com/$1 [R=301,L]

  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP_HOST} ^eirvan\\.com$ [NC]
  RewriteRule ^(.*)$ https://eirvan.com/$1 [R=301,L]

  # Allow direct access to discovery & syndication files
  RewriteRule ^\\.well-known/ - [L]

  # Redirect moved historical article slugs cleanly in 1 hop (evaluated BEFORE generic /article/ rule)
${previousSlugRedirects.join('\n')}

  # Legacy singular /article/<slug> -> canonical /articles/<slug> (301 Permanent, 1 hop)
  RewriteRule ^article/(.+?)/?$ /articles/$1 [R=301,L]

  # Legacy category slugs -> 5 consolidated topical category hubs (301 Permanent, 1 hop)
  RewriteRule ^category/technology-ai/?$ /category/technology [R=301,L]
  RewriteRule ^category/technology-ai/(.+?)/?$ /category/technology/$1 [R=301,L]
  RewriteRule ^category/global-markets-finance/?$ /category/business [R=301,L]
  RewriteRule ^category/global-markets-finance/(.+?)/?$ /category/business/$1 [R=301,L]
  RewriteRule ^category/biotech-longevity/?$ /category/lifestyle [R=301,L]
  RewriteRule ^category/biotech-longevity/(.+?)/?$ /category/lifestyle/$1 [R=301,L]
  RewriteRule ^category/productivity-mindset/?$ /category/education [R=301,L]
  RewriteRule ^category/productivity-mindset/(.+?)/?$ /category/education/$1 [R=301,L]
  RewriteRule ^category/future-of-work/?$ /category/education [R=301,L]
  RewriteRule ^category/future-of-work/(.+?)/?$ /category/education/$1 [R=301,L]

  # Canonicalize explicit non-root trailing slashes cleanly to match extensionless canonical tags
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.+)/$ /$1 [R=301,L]

  # Serve root index.html and static files directly
  RewriteRule ^$ index.html [L]

  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # Internally serve prerendered <route>/index.html for extensionless URLs without trailing-slash redirect loops
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+?)/?$ $1/index.html [L]

  # SPA fallback strictly for interactive utility/admin routes; unknown paths trigger 404.html
  RewriteRule ^(admin|bookmarks|search|checkout|product)(/.*)?$ /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"

  Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' blob: https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://gen-lang-client-0804123492.firebaseapp.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.googleusercontent.com https://www.google-analytics.com; connect-src 'self' https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://gen-lang-client-0804123492.firebaseapp.com https://www.googleapis.com https://www.google-analytics.com https://analytics.google.com; frame-src 'self' https://gen-lang-client-0804123492.firebaseapp.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self';"

  <FilesMatch "\\.(json|xml|txt)$">
    Header set Access-Control-Allow-Origin "*"
  </FilesMatch>

  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "max-age=0, must-revalidate"
  </FilesMatch>

  <FilesMatch "(sw\\.js|registerSW\\.js|manifest\\.webmanifest)$">
    Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
  </FilesMatch>

  <FilesMatch "\\.(js|css|avif|webp|png|jpg|jpeg|gif|svg|ico|woff|woff2)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_mime.c>
  AddType application/json .json
  AddType application/manifest+json .webmanifest
  AddType application/rss+xml .xml
  AddType text/markdown .txt
  AddType image/svg+xml .svg
  AddType image/avif .avif
  AddType image/webp .webp
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/xml application/rss+xml image/svg+xml
</IfModule>
`;
}

function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /bookmarks
Disallow: /checkout
Disallow: /search

Sitemap: ${SITE_URL}/sitemap.xml

# AI & Research Documentation
# ${SITE_URL}/llms.txt
`;
}

function buildLlmsTxt(publishedArticles: Article[]): string {
  const categoryLines = CATEGORY_HUBS.map(
    h => `- [${h.name}](${SITE_URL}/category/${h.slug}): ${h.description}`
  ).join('\n');

  const articleLines = publishedArticles
    .slice(0, 15)
    .map(a => `- [${a.title}](${toAbsoluteSiteUrl(getArticlePath(a.slug))}): ${a.summary}`)
    .join('\n');

  return `# EIRVAN

> EIRVAN (eirvan.com) is an independent multi-niche digital publication covering Technology, Business, Lifestyle, Education, and News with cited primary sources.

## Canonical Category Hubs
${categoryLines}

## Featured Dispatches
${articleLines}

## Governance & Trust
- [About & Masthead](${SITE_URL}/about)
- [Editorial Policy](${SITE_URL}/editorial-policy)
- [Corrections Policy](${SITE_URL}/corrections-policy)
- [Contact Us](${SITE_URL}/contact)
- [RSS 2.0 Feed](${SITE_URL}/rss.xml)
- [XML Sitemap](${SITE_URL}/sitemap.xml)
`;
}

function buildLlmsFullTxt(publishedArticles: Article[]): string {
  const categorySections = CATEGORY_HUBS.map(hub => {
    const items = publishedArticles
      .filter(a => getCategoryHubByName(a.category).slug === hub.slug)
      .map(
        a =>
          `- **${a.title}** (${toAbsoluteSiteUrl(getArticlePath(a.slug))}): ${a.summary}`
      )
      .join('\n');
    return `### ${hub.name} — ${hub.headline}\n${hub.description}\n${items}`;
  }).join('\n\n');

  return `# EIRVAN – Extended Machine & LLM Documentation

> EIRVAN (${SITE_URL}) is an open-access independent digital publication covering Technology, Business, Lifestyle, Education, and News with cited primary sources and named editorial review.

## Canonical Knowledge Desks & Published Dispatches

${categorySections}

## Governance, Verification & Discovery
- Editorial Standards: ${SITE_URL}/editorial-policy
- Corrections & Versioning: ${SITE_URL}/corrections-policy
- Masthead & About: ${SITE_URL}/about
- RSS 2.0 Feed: ${SITE_URL}/rss.xml
- XML Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function buildArdJson(): string {
  return JSON.stringify(
    {
      specVersion: '1.0',
      host: {
        displayName: 'EIRVAN',
        documentationUrl: `${SITE_URL}/about`,
        logoUrl: `${SITE_URL}/images/brand/eirvan-icon-192.png`
      },
      entries: [
        {
          identifier: 'urn:eirvan.com:feed:rss',
          displayName: 'EIRVAN Research & News RSS 2.0 Feed',
          type: 'application/rss+xml',
          url: `${SITE_URL}/rss.xml`,
          description: 'Full syndication stream for published articles across Technology, Business, Lifestyle, Education, and News.'
        },
        {
          identifier: 'urn:eirvan.com:discovery:sitemap',
          displayName: 'EIRVAN XML Sitemap',
          type: 'application/xml',
          url: `${SITE_URL}/sitemap.xml`,
          description: 'Indexable URL discovery across categories, articles, authors, and editorial standards pages.'
        }
      ]
    },
    null,
    2
  );
}

async function runStaticSeoBuild() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html not found. Run "vite build" before build-static-seo.ts.');
  }

  const templateHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  const { articles: allArticles, stagingArticles, source, reconciliation } = await loadArticlesForBuild();

  // Explicit conflict reporting (never silent overwrite)
  for (const entry of reconciliation.entries) {
    if (entry.needsEditorialReview || !entry.approvedForPublication) {
      console.log(
        `[RECONCILE] ${entry.id} | ${entry.conflictStatus} | selected=${entry.selectedSource} | approved=${entry.approvedForPublication} | issues=[${entry.remoteLegacyIssues.join(', ')}]`
      );
    }
  }

  // Strictly only published & indexable approved stories appear in homepage, hubs, author dispatches, sitemaps, feeds, and llms.txt
  const publishedArticles = allArticles
    .filter(a => isPublicIndexableArticle(a))
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.updatedAt).getTime() -
        new Date(a.publishedAt || a.updatedAt).getTime()
    );

  // 1. Prerender Homepage (/ and /page/:n)
  const totalHomePages = Math.max(1, Math.ceil(publishedArticles.length / HOME_PAGE_SIZE));
  for (let p = 1; p <= totalHomePages; p++) {
    const pathname = p === 1 ? '/' : `/page/${p}`;
    const route: RouteState = {
      path: pathname,
      pathname,
      search: '',
      queryParams: {},
      routeType: 'home',
      page: p
    };
    const bodyHtml = renderHomepageHtml(publishedArticles, p, totalHomePages);
    const pageHtml = injectHeadAndRootHtml(templateHtml, route, bodyHtml, {
      totalPages: totalHomePages
    });
    writeRouteFile(p === 1 ? 'index.html' : `page/${p}/index.html`, pageHtml);
  }

  // 2. Prerender Published Articles + Non-Indexable Local Staging Review Drafts (/articles/<slug>/index.html)
  const renderableArticles = [
    ...publishedArticles,
    ...stagingArticles.filter(s => !publishedArticles.some(p => p.id === s.id || p.slug === s.slug))
  ];
  for (const article of renderableArticles) {
    const pathname = getArticlePath(article.slug);
    const route: RouteState = {
      path: pathname,
      pathname,
      search: '',
      queryParams: {},
      routeType: 'article',
      param: article.slug
    };
    const bodyHtml = renderArticlePageHtml(article, publishedArticles);
    const pageHtml = injectHeadAndRootHtml(templateHtml, route, bodyHtml, { article });
    writeRouteFile(`articles/${article.slug}/index.html`, pageHtml);
  }

  // 3. Prerender Category Hubs (/category/<slug>/ and /category/<slug>/page/:n)
  CATEGORY_HUBS.forEach((hub, idx) => {
    const catArticles = publishedArticles.filter(
      a => getCategoryHubByName(a.category).slug === hub.slug
    );
    const totalCatPages = Math.max(1, Math.ceil(catArticles.length / HOME_PAGE_SIZE));
    for (let p = 1; p <= totalCatPages; p++) {
      const pathname = getCategoryPath(hub.name, p);
      const route: RouteState = {
        path: pathname,
        pathname,
        search: '',
        queryParams: {},
        routeType: 'category',
        param: hub.slug,
        page: p
      };
      const bodyHtml = renderCategoryPageHtml(idx, catArticles, p, totalCatPages);
      const pageHtml = injectHeadAndRootHtml(templateHtml, route, bodyHtml, {
        totalPages: totalCatPages
      });
      writeRouteFile(
        p === 1 ? `category/${hub.slug}/index.html` : `category/${hub.slug}/page/${p}/index.html`,
        pageHtml
      );
    }
  });

  // 4. Prerender Author Pages (/author/<slug>/index.html)
  for (const author of AUTHORS) {
    const pathname = `/author/${author.slug}`;
    const route: RouteState = {
      path: pathname,
      pathname,
      search: '',
      queryParams: {},
      routeType: 'author',
      param: author.slug
    };
    const bodyHtml = renderAuthorPageHtml(author.slug, publishedArticles);
    const pageHtml = injectHeadAndRootHtml(templateHtml, route, bodyHtml, { author });
    writeRouteFile(`author/${author.slug}/index.html`, pageHtml);
  }

  // 5. Prerender Trust, Legal & Utility Pages + 404.html
  const staticPages: { routeType: RouteState['routeType']; file: string; pathname: string }[] = [
    { routeType: 'about', file: 'about/index.html', pathname: '/about' },
    { routeType: 'editorial-policy', file: 'editorial-policy/index.html', pathname: '/editorial-policy' },
    { routeType: 'corrections-policy', file: 'corrections-policy/index.html', pathname: '/corrections-policy' },
    { routeType: 'contact', file: 'contact/index.html', pathname: '/contact' },
    { routeType: 'privacy', file: 'privacy/index.html', pathname: '/privacy' },
    { routeType: 'terms', file: 'terms/index.html', pathname: '/terms' },
    { routeType: 'products', file: 'products/index.html', pathname: '/products' },
    { routeType: 'not-found', file: '404.html', pathname: '/not-found' }
  ];

  for (const sp of staticPages) {
    const route: RouteState = {
      path: sp.pathname,
      pathname: sp.pathname,
      search: '',
      queryParams: {},
      routeType: sp.routeType
    };
    const bodyHtml = renderTrustStaticPageHtml(sp.routeType);
    const pageHtml = injectHeadAndRootHtml(templateHtml, route, bodyHtml);
    writeRouteFile(sp.file, pageHtml);
  }

  // 6. Generate Dynamic Sitemap, RSS, Robots, LLMs, ARD, & Apache .htaccess
  const sitemapXml = generateSitemapXml(publishedArticles, { pageSize: HOME_PAGE_SIZE });
  const rssXml = generateRSSFeed(publishedArticles);
  const robotsTxt = buildRobotsTxt();
  const llmsTxt = buildLlmsTxt(publishedArticles);
  const llmsFullTxt = buildLlmsFullTxt(publishedArticles);
  const ardJson = buildArdJson();
  const htaccess = buildHtaccess(renderableArticles);

  writeRouteFile('sitemap.xml', sitemapXml);
  writeRouteFile('rss.xml', rssXml);
  writeRouteFile('feed.xml', rssXml);
  writeRouteFile('robots.txt', robotsTxt);
  writeRouteFile('llms.txt', llmsTxt);
  writeRouteFile('llms-full.txt', llmsFullTxt);
  writeRouteFile('.well-known/ard.json', ardJson);
  writeRouteFile('.htaccess', htaccess);

  // Sync static discovery artifacts into public/ so local Vite dev server mirrors production output
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rssXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.xml'), rssXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt, 'utf8');
  fs.mkdirSync(path.join(PUBLIC_DIR, '.well-known'), { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, '.well-known', 'ard.json'), ardJson, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, '.htaccess'), htaccess, 'utf8');

  // Remove non-Apache sidecar files and any accidental source maps from dist/ for IONOS release hygiene
  for (const unusedSidecar of ['_headers', '_redirects', 'sw.js.map']) {
    fs.rmSync(path.join(DIST_DIR, unusedSidecar), { force: true });
  }
  const removeMaps = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) removeMaps(fullPath);
      else if (entry.name.endsWith('.map')) fs.rmSync(fullPath, { force: true });
    }
  };
  removeMaps(DIST_DIR);

  console.log(`[STATIC-SEO] Source: ${source}`);
  console.log(
    `[STATIC-SEO] Prerendered ${publishedArticles.length} public approved articles, ${stagingArticles.length} noindex staging drafts, ${CATEGORY_HUBS.length} category hubs, ${AUTHORS.length} authors, 8 static/404 pages, sitemap.xml, rss.xml, robots.txt, and .htaccess into dist/.`
  );
}

runStaticSeoBuild().catch(err => {
  console.error('[STATIC-SEO ERROR]', err);
  process.exit(1);
});

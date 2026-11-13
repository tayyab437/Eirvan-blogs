import { Article, SEOAuditResult, SEOCheck } from '../types/blog';
import { AuthorProfile } from '../types/author';
import { AUTHORS, getAuthorByName } from '../data/authors';
import { CATEGORY_HUBS, getCategoryHubByName, getCategoryHubBySlug } from '../data/categories';
import { RouteState } from './router';
import { validateEditorialApproval } from './editorialApproval';

export const SITE_URL = 'https://eirvan.com';
export const SITE_NAME = 'EIRVAN';
export const DEFAULT_BRAND_IMAGE = `${SITE_URL}/images/brand/eirvan-logo-360.png`;
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/images/editorial/about-library-1200.jpg`;

export interface ResponsiveImageSet {
  fallbackSrc: string;
  webpSrcSet?: string;
  avifSrcSet?: string;
  jpegSrcSet?: string;
  sizes?: string;
  isLocalResponsive: boolean;
}

/**
 * Resolves a local responsive image asset (/images/...-<width>.(avif|webp|jpg))
 * or safely returns an external image URL without hijacking local images to Unsplash.
 */
export function getOptimizedImageUrl(url?: string, width = 800, _quality = 76): string {
  if (!url) {
    return `/images/articles/neuromorphic-silicon-${width <= 500 ? 400 : width <= 950 ? 800 : 1200}.webp`;
  }

  // Handle legacy /src/assets/images/... references safely if any exist in cached localStorage
  if (url.startsWith('/src/assets/images/')) {
    if (url.includes('about_editorial_library')) return '/images/editorial/about-library-1200.webp';
    if (url.includes('about_editorial_masthead')) return '/images/editorial/about-masthead-800.webp';
    if (url.includes('hero_ai_quantum_chip')) return '/images/articles/neuromorphic-silicon-1200.webp';
    if (url.includes('fintech_algorithmic_exchange')) return '/images/articles/algorithmic-arbitrage-1200.webp';
    if (url.includes('productivity_deep_work')) return '/images/articles/cognitive-sprint-1200.webp';
    if (url.includes('biotech_longevity_lab')) return '/images/articles/cellular-longevity-nad-1200.webp';
    if (url.includes('ai_photonics_datacenter')) return '/images/articles/photonic-supercomputing-1200.webp';
    if (url.includes('finance_global_markets')) return '/images/articles/sovereign-wealth-liquidity-1200.webp';
    if (url.includes('neuroscience_synapse_lab')) return '/images/articles/dopamine-baseline-1200.webp';
    if (url.includes('biotech_crispr_epigenetics')) return '/images/articles/crispr-epigenetics-1200.webp';
  }

  const localArticleMatch = url.match(/^(\/images\/articles\/[^/]+)-(400|800|1200)\.(avif|webp|jpg)$/);
  if (localArticleMatch) {
    const targetW = width <= 500 ? 400 : width <= 950 ? 800 : 1200;
    return `${localArticleMatch[1]}-${targetW}.webp`;
  }

  const localAuthorMatch = url.match(/^(\/images\/authors\/[^/]+)-(160|400)\.(avif|webp|jpg)$/);
  if (localAuthorMatch) {
    const targetW = width <= 200 ? 160 : 400;
    return `${localAuthorMatch[1]}-${targetW}.webp`;
  }

  const localEditorialMatch = url.match(/^(\/images\/editorial\/about-library)-(600|1200)\.(avif|webp|jpg)$/);
  if (localEditorialMatch) {
    const targetW = width <= 700 ? 600 : 1200;
    return `${localEditorialMatch[1]}-${targetW}.webp`;
  }

  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&w=${width}&q=75&fm=webp`;
  }

  return url;
}

export function getResponsiveImageSet(url?: string, sizes = '(max-width: 768px) 100vw, 800px'): ResponsiveImageSet {
  const normalized = getOptimizedImageUrl(url, 1200);
  const articleMatch = normalized.match(/^(\/images\/articles\/[^/]+)-(400|800|1200)\.(avif|webp|jpg)$/);
  if (articleMatch) {
    const prefix = articleMatch[1];
    return {
      isLocalResponsive: true,
      fallbackSrc: `${prefix}-800.jpg`,
      avifSrcSet: `${prefix}-400.avif 400w, ${prefix}-800.avif 800w, ${prefix}-1200.avif 1200w`,
      webpSrcSet: `${prefix}-400.webp 400w, ${prefix}-800.webp 800w, ${prefix}-1200.webp 1200w`,
      jpegSrcSet: `${prefix}-400.jpg 400w, ${prefix}-800.jpg 800w, ${prefix}-1200.jpg 1200w`,
      sizes
    };
  }

  const authorMatch = normalized.match(/^(\/images\/authors\/[^/]+)-(160|400)\.(avif|webp|jpg)$/);
  if (authorMatch) {
    const prefix = authorMatch[1];
    return {
      isLocalResponsive: true,
      fallbackSrc: `${prefix}-400.jpg`,
      avifSrcSet: `${prefix}-160.avif 160w, ${prefix}-400.avif 400w`,
      webpSrcSet: `${prefix}-160.webp 160w, ${prefix}-400.webp 400w`,
      jpegSrcSet: `${prefix}-160.jpg 160w, ${prefix}-400.jpg 400w`,
      sizes
    };
  }

  return {
    isLocalResponsive: false,
    fallbackSrc: normalized,
    sizes
  };
}

export function toAbsoluteSiteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const clean = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${clean}`;
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/brand/eirvan-logo-360.png`,
      width: 360,
      height: 180
    },
    description:
      'Independent digital publication covering Technology, Business, Lifestyle, Education, and News with cited primary sources and transparent editorial standards.',
    publishingPrinciples: `${SITE_URL}/editorial-policy`,
    correctionsPolicy: `${SITE_URL}/corrections-policy`,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'editorial@eirvan.com',
      contactType: 'editorial'
    },
    sameAs: ['https://x.com/eirvan', 'https://linkedin.com/company/eirvan']
  };
}

export function isIndexableRobotsDirective(directive?: string): boolean {
  const normalized = (directive || 'index, follow').toLowerCase();
  return !/\b(?:noindex|none)\b/.test(normalized);
}

export function isPublicPublishedArticle(article: Article, nowMs: number = Date.now()): boolean {
  if (!article || article.status !== 'published') return false;
  if (article.scheduledAt) {
    const schedMs = Date.parse(article.scheduledAt);
    if (!Number.isNaN(schedMs) && schedMs > nowMs) return false;
  }
  return validateEditorialApproval(article, { nowMs }).valid;
}

export function isPublicIndexableArticle(article: Article, nowMs: number = Date.now()): boolean {
  return isPublicPublishedArticle(article, nowMs) && isIndexableRobotsDirective(article.robotsDirective);
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ['EIRVAN Blogs', 'Eirvan.com'],
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` }
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(item.url)
    }))
  };
}

export function getAuthorPersonSchema(author: AuthorProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/author/${author.slug}#person`,
    name: author.name,
    jobTitle: author.role,
    description: author.shortBio,
    url: `${SITE_URL}/author/${author.slug}`,
    image: toAbsoluteSiteUrl(author.avatar),
    worksFor: { '@id': `${SITE_URL}/#organization` },
    knowsAbout: author.expertise,
    sameAs: Object.values(author.socialLinks || {}).filter(Boolean)
  };
}

export function generateArticleSchema(article: Article) {
  const categoryHub = getCategoryHubByName(article.category);
  const authorProfile = getAuthorByName(article.author?.name || '');
  const canonical = toAbsoluteSiteUrl(article.canonicalUrl || `/articles/${article.slug}`);
  const schemaType =
    article.articleType ||
    (categoryHub.slug === 'news' ? 'NewsArticle' : categoryHub.slug === 'education' ? 'BlogPosting' : 'Article');
  const heroImage = toAbsoluteSiteUrl(article.socialImage || getOptimizedImageUrl(article.featuredImage, 1200));
  const plainText = (article.contentHtml || '').replace(/<[^>]*>/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  const articleNode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    },
    headline: article.title,
    description: article.metaDescription || article.summary,
    image: [heroImage],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    articleSection: categoryHub.name,
    wordCount,
    inLanguage: 'en-US',
    author: {
      '@type': 'Person',
      name: authorProfile.name,
      jobTitle: article.author?.role || authorProfile.role,
      url: `${SITE_URL}/author/${authorProfile.slug}`
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/brand/eirvan-logo-360.png`
      }
    },
    keywords: (article.tags || []).join(', ')
  };

  if (article.sources && article.sources.length > 0) {
    articleNode.citation = article.sources.map(s => s.url).filter(Boolean);
  }

  const schemas: unknown[] = [
    articleNode,
    getBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: categoryHub.name, url: `${SITE_URL}/category/${categoryHub.slug}` },
      { name: article.title, url: canonical }
    ])
  ];

  return schemas;
}

export interface HeadMetadataPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogType: 'website' | 'article' | 'profile';
  ogImage: string;
  prevUrl?: string;
  nextUrl?: string;
  schemas: unknown[];
}

export function buildRouteHeadMetadata(
  route: RouteState,
  options: {
    article?: Article | null;
    author?: AuthorProfile | null;
    totalPages?: number;
    categoryArticleCount?: number;
  } = {}
): HeadMetadataPayload {
  const { article, author, totalPages = 1 } = options;

  if (route.routeType === 'article' && article) {
    const canonical = toAbsoluteSiteUrl(article.canonicalUrl || `/articles/${article.slug}`);
    const ogImage = toAbsoluteSiteUrl(article.socialImage || getOptimizedImageUrl(article.featuredImage, 1200));
    const isApprovedAndPublished = isPublicPublishedArticle(article);
    const robots = !isApprovedAndPublished
      ? 'noindex, nofollow'
      : !isPublicIndexableArticle(article)
        ? 'noindex, follow'
        : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

    return {
      title: `${article.metaTitle || article.title} | ${SITE_NAME}`,
      description: article.metaDescription || article.summary,
      canonicalUrl: canonical,
      robots,
      ogType: 'article',
      ogImage,
      schemas: generateArticleSchema(article)
    };
  }

  if (route.routeType === 'category' && route.param) {
    const hub = getCategoryHubBySlug(route.param) || CATEGORY_HUBS[0];
    const page = route.page || 1;
    const base = `${SITE_URL}/category/${hub.slug}`;
    const canonical = page > 1 ? `${base}/page/${page}` : base;
    const title = page > 1 ? `${hub.metaTitle} (Page ${page}) | ${SITE_NAME}` : `${hub.metaTitle} | ${SITE_NAME}`;

    return {
      title,
      description: hub.metaDescription,
      canonicalUrl: canonical,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      prevUrl: page > 1 ? (page === 2 ? base : `${base}/page/${page - 1}`) : undefined,
      nextUrl: page < totalPages ? `${base}/page/${page + 1}` : undefined,
      schemas: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${hub.name} — ${SITE_NAME}`,
          description: hub.metaDescription,
          url: canonical,
          isPartOf: { '@id': `${SITE_URL}/#website` }
        },
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: hub.name, url: canonical }
        ])
      ]
    };
  }

  if (route.routeType === 'author') {
    const targetAuthor = author || AUTHORS[0];
    const canonical = `${SITE_URL}/author/${targetAuthor.slug}`;
    return {
      title: `${targetAuthor.name} — ${targetAuthor.department} | ${SITE_NAME}`,
      description: `${targetAuthor.name}: ${targetAuthor.role}. ${targetAuthor.shortBio}`,
      canonicalUrl: canonical,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large',
      ogType: 'profile',
      ogImage: toAbsoluteSiteUrl(targetAuthor.avatar),
      schemas: [
        getAuthorPersonSchema(targetAuthor),
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: targetAuthor.name, url: canonical }
        ])
      ]
    };
  }

  if (route.routeType === 'about') {
    return {
      title: `About ${SITE_NAME} — Editorial Mission, Masthead & Standards`,
      description:
        'Learn about EIRVAN’s editorial methodology, category desks across Technology, Business, Lifestyle, Education, and News, and our masthead contributors.',
      canonicalUrl: `${SITE_URL}/about`,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large',
      ogType: 'website',
      ogImage: `${SITE_URL}/images/editorial/about-library-1200.jpg`,
      schemas: [
        getOrganizationSchema(),
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'About', url: `${SITE_URL}/about` }
        ])
      ]
    };
  }

  if (route.routeType === 'editorial-policy') {
    return {
      title: `Editorial Policy & Verification Standards | ${SITE_NAME}`,
      description:
        'How EIRVAN sources primary research, separates reporting from commentary, discloses AI-assisted workflow aids, and conducts peer-level technical review.',
      canonicalUrl: `${SITE_URL}/editorial-policy`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [
        getOrganizationSchema(),
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Editorial Policy', url: `${SITE_URL}/editorial-policy` }
        ])
      ]
    };
  }

  if (route.routeType === 'corrections-policy') {
    return {
      title: `Corrections & Versioning Policy | ${SITE_NAME}`,
      description:
        'EIRVAN’s public corrections standards, timestamped article revision logs, and how to submit factual errata notices.',
      canonicalUrl: `${SITE_URL}/corrections-policy`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [
        getOrganizationSchema(),
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Corrections Policy', url: `${SITE_URL}/corrections-policy` }
        ])
      ]
    };
  }

  if (route.routeType === 'contact') {
    return {
      title: `Contact the Editorial & Syndication Desk | ${SITE_NAME}`,
      description:
        'Contact EIRVAN for editorial pitches, factual corrections, press inquiries, privacy requests, or advertising disclosures.',
      canonicalUrl: `${SITE_URL}/contact`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [
        getOrganizationSchema(),
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Contact', url: `${SITE_URL}/contact` }
        ])
      ]
    };
  }

  if (route.routeType === 'terms') {
    return {
      title: `Terms of Service | ${SITE_NAME}`,
      description: 'Terms of Service, fair-use citation permissions, and financial/medical disclaimers for EIRVAN.',
      canonicalUrl: `${SITE_URL}/terms`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Terms of Service', url: `${SITE_URL}/terms` }
        ])
      ]
    };
  }

  if (route.routeType === 'privacy') {
    return {
      title: `Privacy Policy | ${SITE_NAME}`,
      description: 'How EIRVAN handles reader privacy, browser storage, optional analytics, and GDPR/CCPA rights.',
      canonicalUrl: `${SITE_URL}/privacy`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [
        getBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Privacy Policy', url: `${SITE_URL}/privacy` }
        ])
      ]
    };
  }

  // Utility, private, checkout, search, admin, and 404 routes: strictly noindex
  const noindexRoutes = new Set([
    'admin',
    'bookmarks',
    'search',
    'not-found',
    'checkout-cart',
    'checkout-details',
    'checkout-payment',
    'checkout-confirmation'
  ]);

  if (noindexRoutes.has(route.routeType)) {
    const titleMap: Record<string, string> = {
      admin: `Publisher Studio CMS | ${SITE_NAME}`,
      bookmarks: `Saved Reading List | ${SITE_NAME}`,
      search: `Search Articles | ${SITE_NAME}`,
      'not-found': `Page Not Found (404) | ${SITE_NAME}`,
      'checkout-cart': `Checkout Cart | ${SITE_NAME}`,
      'checkout-details': `Checkout Billing Details | ${SITE_NAME}`,
      'checkout-payment': `Checkout Payment | ${SITE_NAME}`,
      'checkout-confirmation': `Order Confirmation | ${SITE_NAME}`
    };

    const descMap: Record<string, string> = {
      'not-found':
        'The requested page could not be found on EIRVAN. Return to the homepage or browse Technology, Business, Lifestyle, Education, and News dispatches.'
    };

    return {
      title: titleMap[route.routeType] || `${SITE_NAME}`,
      description: descMap[route.routeType] || 'EIRVAN utility and administrative view.',
      canonicalUrl: `${SITE_URL}${route.pathname === '/not-found' ? '/404.html' : route.pathname}`,
      robots: 'noindex, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: []
    };
  }

  if (route.routeType === 'products') {
    return {
      title: `Research Monographs & Store | ${SITE_NAME}`,
      description: 'Explore technical dossiers and reference monographs curated by the EIRVAN research desk.',
      canonicalUrl: `${SITE_URL}/products`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: DEFAULT_SOCIAL_IMAGE,
      schemas: [getOrganizationSchema()]
    };
  }

  // Homepage (/ or /page/:n)
  const homePage = route.page || 1;
  const canonical = homePage > 1 ? `${SITE_URL}/page/${homePage}` : SITE_URL;
  return {
    title:
      homePage > 1
        ? `${SITE_NAME} — Archive Page ${homePage} | Explore, Learn & Stay Informed`
        : `${SITE_NAME} — Explore, Learn & Stay Informed`,
    description:
      'Independent editorial publication covering Technology, Business, Lifestyle, Education, and News with verified primary sources and fast, distraction-free reading.',
    canonicalUrl: canonical,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
    ogImage: DEFAULT_SOCIAL_IMAGE,
    prevUrl: homePage > 1 ? (homePage === 2 ? SITE_URL : `${SITE_URL}/page/${homePage - 1}`) : undefined,
    nextUrl: homePage < totalPages ? `${SITE_URL}/page/${homePage + 1}` : undefined,
    schemas: [getOrganizationSchema(), getWebSiteSchema()]
  };
}

/**
 * Updates DOM <head> metadata on client-side navigation.
 */
export function updateRouteSEO(
  route: RouteState,
  options: {
    article?: Article | null;
    author?: AuthorProfile | null;
    totalPages?: number;
  } = {}
) {
  if (typeof document === 'undefined') return;
  const meta = buildRouteHeadMetadata(route, options);

  document.title = meta.title;

  const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaTag('meta[name="description"]', 'name', 'description', meta.description);
  setMetaTag('meta[name="robots"]', 'name', 'robots', meta.robots);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', meta.canonicalUrl);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', meta.ogType);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', meta.ogImage);
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', meta.ogImage);

  const setLinkTag = (rel: string, href?: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!href) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  setLinkTag('canonical', meta.canonicalUrl);
  setLinkTag('prev', meta.prevUrl);
  setLinkTag('next', meta.nextUrl);

  injectJSONLDSchema(meta.schemas);
}

/**
 * Legacy helper kept for backward compatibility with direct article callers
 */
export function updateHeadSEO(article: Article | null) {
  if (article) {
    updateRouteSEO(
      {
        path: `/articles/${article.slug}`,
        pathname: `/articles/${article.slug}`,
        search: '',
        queryParams: {},
        routeType: 'article',
        param: article.slug
      },
      { article }
    );
  } else {
    updateRouteSEO({
      path: '/',
      pathname: '/',
      search: '',
      queryParams: {},
      routeType: 'home',
      page: 1
    });
  }
}

export function injectJSONLDSchema(schemaObj: unknown) {
  if (typeof document === 'undefined') return;
  const scriptId = 'dynamic-article-schema';
  let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = scriptId;
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(schemaObj, null, 2);
}

/**
 * Transparent, Rule-Based Editorial & Technical SEO Quality Assistant.
 * Evaluates verifiable structural and editorial quality checks (no fake ranking promises or keyword-density myths).
 */
export function auditArticleSEO(
  article: Partial<Article>,
  allArticles: Article[] = []
): SEOAuditResult {
  const checks: SEOCheck[] = [];

  const otherArticles = allArticles.filter(a => a.id !== article.id);
  const title = (article.metaTitle || article.title || '').trim();
  const titleLen = title.length;

  // 1. SEO Title Length & Uniqueness
  const duplicateTitle = otherArticles.find(
    a => (a.metaTitle || a.title || '').trim().toLowerCase() === title.toLowerCase() && title.length > 0
  );
  if (duplicateTitle) {
    checks.push({
      id: 'title-unique',
      label: 'Unique SEO Title',
      status: 'fail',
      description: `Matches existing article "${duplicateTitle.title}". Duplicate titles confuse search crawlers.`,
      recommendation: 'Write a distinct headline and SEO title for this piece.'
    });
  } else if (titleLen >= 35 && titleLen <= 65) {
    checks.push({
      id: 'title-len',
      label: 'SEO Title Length & Uniqueness',
      status: 'pass',
      description: `${titleLen} characters and unique across catalog (recommended: 35–65 chars).`,
      recommendation: 'Clear and concise for search snippet display.'
    });
  } else if (titleLen > 65) {
    checks.push({
      id: 'title-len',
      label: 'SEO Title Length & Uniqueness',
      status: 'warn',
      description: `${titleLen} characters; may truncate on narrower search results.`,
      recommendation: 'Trim SEO title under 65 characters while keeping meaning intact.'
    });
  } else {
    checks.push({
      id: 'title-len',
      label: 'SEO Title Length & Uniqueness',
      status: 'fail',
      description: `${titleLen} characters; too brief to describe subject matter clearly.`,
      recommendation: 'Expand headline/SEO title to 35–65 characters.'
    });
  }

  // 2. Meta Description Length & Uniqueness
  const desc = (article.metaDescription || '').trim();
  const descLen = desc.length;
  const duplicateDesc = otherArticles.find(
    a => (a.metaDescription || '').trim().toLowerCase() === desc.toLowerCase() && desc.length > 0
  );
  if (duplicateDesc) {
    checks.push({
      id: 'desc-unique',
      label: 'Meta Description Uniqueness',
      status: 'fail',
      description: `Meta description duplicates "${duplicateDesc.title}".`,
      recommendation: 'Write an original summary tailored specifically to this article.'
    });
  } else if (descLen >= 115 && descLen <= 160) {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description',
      status: 'pass',
      description: `${descLen} characters and distinct across site (recommended: 115–160 chars).`,
      recommendation: 'Clean summary length.'
    });
  } else if (descLen > 160) {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description',
      status: 'warn',
      description: `${descLen} characters; likely clipped past 160 characters in snippets.`,
      recommendation: 'Condense meta description to ~145–155 characters.'
    });
  } else {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description',
      status: 'fail',
      description: `${descLen} characters; insufficient context for readers inspecting links.`,
      recommendation: 'Add a 115–160 character summary explaining key findings.'
    });
  }

  // 3. Heading Hierarchy (H2/H3 from actual HTML content & headings array)
  const contentHtml = article.contentHtml || '';
  const htmlH2Count = (contentHtml.match(/<h2[\s>]/gi) || []).length;
  const effectiveH2 = Math.max(htmlH2Count, (article.headings || []).filter(h => h.level === 2).length);
  if (effectiveH2 >= 2) {
    checks.push({
      id: 'heading-struct',
      label: 'Heading Hierarchy (H2/H3)',
      status: 'pass',
      description: `${effectiveH2} H2 section headings structure the article cleanly and enable jump links.`,
      recommendation: 'Maintain single H1 per page (title) and logical H2/H3 nesting.'
    });
  } else {
    checks.push({
      id: 'heading-struct',
      label: 'Heading Hierarchy (H2/H3)',
      status: 'fail',
      description: 'Fewer than 2 H2 subheadings found in article HTML.',
      recommendation: 'Break long-form prose into logical sections with <h2> headings.'
    });
  }

  // 4. Image Alt Text & Media Integrity
  const alt = (article.imageAlt || '').trim();
  const hasFeatured = Boolean(article.featuredImage && article.featuredImage.trim().length > 0);
  if (hasFeatured && alt.length >= 15) {
    checks.push({
      id: 'image-alt',
      label: 'Featured Image & Alt Text',
      status: 'pass',
      description: `Featured image configured with descriptive alt text (${alt.length} chars).`,
      recommendation: 'Supports screen readers and image search accessibility.'
    });
  } else {
    checks.push({
      id: 'image-alt',
      label: 'Featured Image & Alt Text',
      status: 'fail',
      description: !hasFeatured ? 'Missing featured image URL.' : 'Missing or overly brief image alt description.',
      recommendation: 'Provide an image path and accurate 15+ character alt description.'
    });
  }

  // 5. Canonical & Slug Formatting
  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test((article.slug || '').trim());
  const canonicalValid = Boolean(
    article.canonicalUrl &&
      article.canonicalUrl.startsWith('https://eirvan.com/articles/') &&
      article.slug &&
      article.canonicalUrl.endsWith(article.slug)
  );
  if (slugValid && canonicalValid) {
    checks.push({
      id: 'canonical',
      label: 'Slug & Canonical URL Alignment',
      status: 'pass',
      description: `Clean kebab-case slug matches canonical URL (${article.canonicalUrl}).`,
      recommendation: 'Canonical consistency intact.'
    });
  } else {
    checks.push({
      id: 'canonical',
      label: 'Slug & Canonical URL Alignment',
      status: 'warn',
      description: 'Slug or canonical URL does not match standard https://eirvan.com/articles/<slug>.',
      recommendation: 'Use lowercase kebab-case slug and sync canonicalUrl to match.'
    });
  }

  // 6. Contextual Internal Links & Broken Route Check
  const internalLinkMatches = [...contentHtml.matchAll(/href=["']\/(articles?|category|author|about|editorial-policy)\/([^"']+)["']/gi)];
  const knownSlugs = new Set(allArticles.map(a => a.slug));
  const brokenLinks = internalLinkMatches.filter(m => {
    const type = m[1].toLowerCase();
    const targetSlug = m[2].split('#')[0].replace(/\/+$/, '');
    if (type === 'article') return true; // legacy /article/ path inside content
    if (type === 'articles' && knownSlugs.size > 0) {
      return !knownSlugs.has(targetSlug);
    }
    return false;
  });

  if (brokenLinks.length > 0) {
    checks.push({
      id: 'internal-links',
      label: 'Internal Link Integrity',
      status: 'fail',
      description: `${brokenLinks.length} internal link(s) use legacy /article/ paths or point to unknown slugs.`,
      recommendation: 'Update internal links to valid /articles/<slug> targets.'
    });
  } else if (internalLinkMatches.length >= 1) {
    checks.push({
      id: 'internal-links',
      label: 'Contextual Internal Links',
      status: 'pass',
      description: `${internalLinkMatches.length} valid contextual internal link(s) detected in body copy.`,
      recommendation: 'Connects topic clusters naturally for readers and crawlers.'
    });
  } else {
    checks.push({
      id: 'internal-links',
      label: 'Contextual Internal Links',
      status: 'warn',
      description: 'No contextual internal links found within the body HTML.',
      recommendation: 'Link to at least 1–2 related EIRVAN briefings using /articles/<slug>.'
    });
  }

  // 7. Substantive Depth (Word Count Context — not a magic ranking score)
  const wordCount = contentHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 450) {
    checks.push({
      id: 'depth',
      label: 'Article Depth & Completeness',
      status: 'pass',
      description: `${wordCount} words in body text (~${Math.max(1, Math.ceil(wordCount / 210))} min read).`,
      recommendation: 'Substantive analytical depth without filler.'
    });
  } else if (wordCount >= 250) {
    checks.push({
      id: 'depth',
      label: 'Article Depth & Completeness',
      status: 'warn',
      description: `${wordCount} words. Adequate for brief news updates; consider expanding for evergreen guides.`,
      recommendation: 'Ensure every key reader question is answered thoroughly.'
    });
  } else {
    checks.push({
      id: 'depth',
      label: 'Article Depth & Completeness',
      status: 'fail',
      description: `${wordCount} words. Thin content risks poor reader utility.`,
      recommendation: 'Expand analysis with evidence, examples, or primary sources.'
    });
  }

  // 8. Authorship, Primary Sources & Revision-Bound Editorial Approval Gate
  const hasAuthor = Boolean(article.author?.name && article.author.name.trim().length > 0);
  const sourceCount = (article.sources || []).filter(s => s.title && s.url).length;
  const approvalCheck = validateEditorialApproval(article);

  if (!approvalCheck.valid) {
    checks.push({
      id: 'trust-sources',
      label: 'Authorship, Sources & Human Review',
      status: 'fail',
      description: approvalCheck.reason,
      recommendation:
        'Attach verified primary sources and sign off the current revision as an authorized reviewer before publishing.'
    });
  } else if (hasAuthor && sourceCount >= 1) {
    checks.push({
      id: 'trust-sources',
      label: 'Authorship, Sources & Review',
      status: 'pass',
      description: `Attributed to ${article.author?.name} with ${sourceCount} cited source(s). ${approvalCheck.reason}`,
      recommendation: 'Verified approval matches current revision.'
    });
  } else {
    checks.push({
      id: 'trust-sources',
      label: 'Authorship & Primary Sources',
      status: 'warn',
      description: !hasAuthor ? 'Missing author attribution.' : 'No cited primary sources attached.',
      recommendation: 'Add verified author byline and at least one primary reference citation.'
    });
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const totalWeight = checks.length * 10;
  const rawScore = passCount * 10 + warnCount * 5;
  const finalScore = Math.min(100, Math.round((rawScore / totalWeight) * 100));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (finalScore >= 95) grade = 'A+';
  else if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else grade = 'D';

  return { score: finalScore, grade, checks };
}

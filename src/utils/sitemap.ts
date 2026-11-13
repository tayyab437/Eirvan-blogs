import { Article } from '../types/blog';
import { AUTHORS } from '../data/authors';
import { CATEGORY_HUBS, getCategoryHubByName } from '../data/categories';
import { getArticlePath } from './router';
import { SITE_URL, getOptimizedImageUrl, isPublicIndexableArticle, toAbsoluteSiteUrl } from './seo';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString();
}

export interface SitemapOptions {
  siteUrl?: string;
  pageSize?: number;
}

/**
 * Generates a clean XML Sitemap including:
 * - Homepage & paginated archive pages (/page/N)
 * - Category hubs (/category/:slug) & paginated category pages
 * - Published, indexable articles (/articles/:slug) with image sitemap entries
 * - Author profile pages (/author/:slug)
 * - Public editorial trust & policy pages (/about, /editorial-policy, /corrections-policy, /contact, /terms, /privacy)
 *
 * Strictly excludes drafts, in_review, approved, scheduled, archived, noindex articles,
 * as well as /admin, /bookmarks, /search, and /checkout routes.
 */
export function generateSitemapXml(articles: Article[], options: SitemapOptions = {}): string {
  const siteUrl = (options.siteUrl || SITE_URL).replace(/\/+$/, '');
  const pageSize = options.pageSize || 6;

  const indexableArticles = articles
    .filter(a => isPublicIndexableArticle(a))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());

  const latestUpdate = indexableArticles[0]
    ? toIsoDate(indexableArticles[0].updatedAt || indexableArticles[0].publishedAt)
    : new Date().toISOString();

  const urls: string[] = [];

  // 1. Homepage & paginated home archive
  urls.push(`  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${latestUpdate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  const totalHomePages = Math.max(1, Math.ceil(indexableArticles.length / pageSize));
  for (let p = 2; p <= totalHomePages; p++) {
    urls.push(`  <url>
    <loc>${siteUrl}/page/${p}</loc>
    <lastmod>${latestUpdate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  // 2. Category Hubs + paginated category pages
  for (const hub of CATEGORY_HUBS) {
    const catArticles = indexableArticles.filter(
      a => getCategoryHubByName(a.category).slug === hub.slug
    );
    const catLastMod = catArticles[0]
      ? toIsoDate(catArticles[0].updatedAt || catArticles[0].publishedAt)
      : latestUpdate;

    urls.push(`  <url>
    <loc>${siteUrl}/category/${hub.slug}</loc>
    <lastmod>${catLastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);

    const totalCatPages = Math.max(1, Math.ceil(catArticles.length / pageSize));
    for (let p = 2; p <= totalCatPages; p++) {
      urls.push(`  <url>
    <loc>${siteUrl}/category/${hub.slug}/page/${p}</loc>
    <lastmod>${catLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }
  }

  // 3. Published Indexable Articles (with image metadata)
  for (const article of indexableArticles) {
    const loc = toAbsoluteSiteUrl(article.canonicalUrl || getArticlePath(article.slug));
    const lastmod = toIsoDate(article.updatedAt || article.publishedAt);
    const imgUrl = toAbsoluteSiteUrl(getOptimizedImageUrl(article.featuredImage, 1200));

    urls.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
      <image:caption>${escapeXml(article.imageAlt || article.title)}</image:caption>
    </image:image>
  </url>`);
  }

  // 4. Author Profile Pages
  for (const author of AUTHORS) {
    urls.push(`  <url>
    <loc>${siteUrl}/author/${author.slug}</loc>
    <lastmod>${latestUpdate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // 5. Institutional Trust & Legal Pages
  const staticPages = [
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/editorial-policy', priority: '0.6', changefreq: 'monthly' },
    { path: '/corrections-policy', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/products', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms', priority: '0.4', changefreq: 'yearly' }
  ];

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${latestUpdate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}

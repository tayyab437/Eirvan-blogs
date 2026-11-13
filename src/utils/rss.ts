import { Article } from '../types/blog';
import { getCategoryHubByName } from '../data/categories';
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

/**
 * Builds a W3C / RSS 2.0 valid XML feed with CDATA content blocks and local JPEG enclosures.
 * Strictly filters out draft, in_review, approved, scheduled, archived, and noindex articles.
 */
export function generateRSSFeed(articles: Article[], siteUrl = SITE_URL): string {
  const published = articles
    .filter(a => isPublicIndexableArticle(a))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());

  const lastBuildDate =
    published[0]?.updatedAt || published[0]?.publishedAt
      ? new Date(published[0].updatedAt || published[0].publishedAt).toUTCString()
      : new Date().toUTCString();

  const itemsXml = published
    .map(article => {
      const articleUrl = toAbsoluteSiteUrl(article.canonicalUrl || getArticlePath(article.slug));
      const pubDate = new Date(article.publishedAt || article.updatedAt).toUTCString();
      const authorName = article.author?.name || 'EIRVAN Editorial Desk';
      const category = getCategoryHubByName(article.category).name;

      const tagElements = (article.tags || [])
        .map(tag => `      <category>${escapeXml(tag)}</category>`)
        .join('\n');

      const optimizedHero = getOptimizedImageUrl(article.featuredImage, 1200).replace(/\.webp$/, '.jpg');
      const imageUrl = toAbsoluteSiteUrl(optimizedHero);
      const enclosure = imageUrl
        ? `      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />`
        : '';

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${authorName}]]></dc:creator>
      <category>${escapeXml(category)}</category>
${tagElements}
      <description><![CDATA[${article.summary || article.metaDescription || ''}]]></description>
      <content:encoded><![CDATA[${article.contentHtml || article.summary || ''}]]></content:encoded>
${enclosure}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EIRVAN – Explore, Learn &amp; Stay Informed</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Independent editorial publication covering Technology, Business, Lifestyle, Education, and News with verified primary sources.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>EIRVAN Static Publishing Engine</generator>
    <managingEditor>editorial@eirvan.com (EIRVAN Editorial Desk)</managingEditor>
    <webMaster>admin@eirvan.com (EIRVAN Technical Operations)</webMaster>
    <image>
      <url>${siteUrl}/images/brand/eirvan-icon-192.png</url>
      <title>EIRVAN</title>
      <link>${siteUrl}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;
}

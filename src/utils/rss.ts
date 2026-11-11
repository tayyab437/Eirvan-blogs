import { Article } from '../types/blog';

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
 * Builds a W3C / RSS 2.0 valid XML feed with CDATA content blocks and enclosures
 */
export function generateRSSFeed(articles: Article[], siteUrl = 'https://eirvan.com'): string {
  const published = articles.filter(a => a.status === 'published');
  const lastBuildDate = new Date().toUTCString();

  const itemsXml = published
    .map(article => {
      const articleUrl = article.canonicalUrl || `${siteUrl}/article/${article.slug}`;
      const pubDate = new Date(article.publishedAt || article.updatedAt).toUTCString();
      const authorName = article.author?.name || 'EIRVAN Editorial Desk';
      const category = article.category || 'Technology';

      const tagElements = (article.tags || [])
        .map(tag => `      <category>${escapeXml(tag)}</category>`)
        .join('\n');

      const enclosure = article.featuredImage
        ? `      <enclosure url="${escapeXml(article.featuredImage)}" type="image/jpeg" length="0" />`
        : '';

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${authorName}]]></dc:creator>
      <category>${escapeXml(category)}</category>
${tagElements}
      <description><![CDATA[${article.summary || ''}]]></description>
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
    <description>High-performance multi-niche publication dissecting trending topics in AI, technology, global finance, productivity, and biotechnology.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <generator>EIRVAN Editorial RSS Engine 2.0</generator>
    <managingEditor>editorial@eirvan.com (EIRVAN Editorial Desk)</managingEditor>
    <webMaster>admin@eirvan.com (EIRVAN Technical Operations)</webMaster>
    <image>
      <url>${siteUrl}/assets/aistudio/Global_Orbit_E_Icon_346096e1.png</url>
      <title>EIRVAN</title>
      <link>${siteUrl}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;
}

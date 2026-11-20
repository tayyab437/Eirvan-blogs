import {
  Article,
  ArticleChangelogEntry,
  ArticleSchemaType,
  ArticleSource,
  ArticleStatus,
  FAQItem,
  HeadingItem,
  RobotsDirective,
  SearchIntent
} from '../types/blog';
import { AUTHORS } from '../data/authors';
import { CATEGORY_HUBS } from '../data/categories';
import { sanitizeArticleHtml } from './sanitize';

export const VALID_ARTICLE_STATUSES: readonly ArticleStatus[] = [
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived'
] as const;

export const VALID_CATEGORY_NAMES = CATEGORY_HUBS.map(h => h.name);

export const VALID_ARTICLE_TYPES: readonly ArticleSchemaType[] = [
  'Article',
  'BlogPosting',
  'NewsArticle'
] as const;

export const VALID_ROBOTS_DIRECTIVES: readonly RobotsDirective[] = [
  'index, follow',
  'noindex, follow'
] as const;

export const VALID_SEARCH_INTENTS: readonly SearchIntent[] = [
  'informational',
  'commercial',
  'navigational',
  'transactional'
] as const;

export const VALID_SOURCE_DATE_STATUSES = ['published', 'undated-evergreen'] as const;

const PROTECTED_SYSTEM_FIELDS = [
  'approval',
  'humanReviewed',
  'reviewedAt',
  'reviewedRevisionHash',
  'reviewer',
  'views',
  'reactions',
  'isBookmarked'
] as const;

export interface ArticleJsonImportResult {
  success: boolean;
  mappedForm?: Partial<Article>;
  errors: string[];
  warnings: string[];
  summary?: {
    title: string;
    slug: string;
    category: string;
    topicCluster: string;
    authorName: string;
    status: ArticleStatus;
    wordCount: number;
    readTimeMinutes: number;
    sourcesCount: number;
    faqsCount: number;
    headingsCount: number;
    changelogCount: number;
  };
}

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extracts <h2> / <h3> headings from sanitized HTML and guarantees each heading tag carries a deterministic id
 * so Table of Contents anchor links resolve reliably in ArticleView and static HTML output.
 */
export function extractAndEnsureHeadings(html: string): { html: string; headings: HeadingItem[] } {
  const headings: HeadingItem[] = [];
  const usedIds = new Set<string>();

  const updatedHtml = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (fullMatch, levelStr, attrs, innerHtml) => {
    const level = (levelStr === '3' ? 3 : 2) as 2 | 3;
    const plainText = decodeBasicEntities(innerHtml.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) {
      return fullMatch;
    }

    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    const baseId = idMatch?.[1]?.trim() || slugifyText(plainText) || `section-${headings.length + 1}`;
    let finalId = baseId;
    let suffix = 2;
    while (usedIds.has(finalId)) {
      finalId = `${baseId}-${suffix++}`;
    }
    usedIds.add(finalId);

    headings.push({ id: finalId, text: plainText, level });

    if (idMatch) {
      return fullMatch;
    }
    const trimmedAttrs = attrs.trim();
    const nextAttrs = trimmedAttrs ? ` id="${finalId}" ${trimmedAttrs}` : ` id="${finalId}"`;
    return `<h${level}${nextAttrs}>${innerHtml}</h${level}>`;
  });

  return { html: updatedHtml, headings };
}

function unwrapJsonInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringArray(
  value: unknown,
  fieldName: string,
  errors: string[]
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`"${fieldName}" must be an array of strings (e.g. ["tag-one", "tag-two"]).`);
    return undefined;
  }
  const result: string[] = [];
  value.forEach((item, idx) => {
    if (typeof item !== 'string') {
      errors.push(`"${fieldName}[${idx}]" must be a string.`);
    } else if (item.trim()) {
      result.push(item.trim());
    }
  });
  return result;
}

function isSafeImagePath(url: string): boolean {
  return url.startsWith('/images/') || /^https?:\/\/.+/i.test(url);
}

export function parseAndMapArticleJson(
  rawInput: string,
  options: {
    existingArticle?: Article | null;
    currentDraftId?: string;
  } = {}
): ArticleJsonImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      success: false,
      errors: ['Paste a JSON object before importing.'],
      warnings
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonInput(rawInput));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
    return {
      success: false,
      errors: [`JSON parse error: ${msg}`],
      warnings
    };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 1 && isPlainObject(parsed[0])) {
      parsed = parsed[0];
      warnings.push('Unwrapped single-item JSON array to import the article object.');
    } else {
      return {
        success: false,
        errors: ['JSON root must be a single article object {...}, not an array of multiple items.'],
        warnings
      };
    }
  }

  if (!isPlainObject(parsed)) {
    return {
      success: false,
      errors: ['JSON root must be a JSON object {...}.'],
      warnings
    };
  }

  const raw = parsed as Record<string, unknown>;

  // Check if protected/system fields were passed in JSON
  const suppliedProtected = PROTECTED_SYSTEM_FIELDS.filter(key => raw[key] !== undefined);
  if (suppliedProtected.length > 0) {
    warnings.push(
      `Ignored system-managed/protected field(s) [${suppliedProtected.join(', ')}]. Editorial approval and live view counters cannot be imported from JSON.`
    );
  }

  // 1. Title (required)
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) {
    errors.push('"title" is required and must be a non-empty string.');
  }

  // 2. Slug & Canonical URL
  let slug = '';
  if (raw.slug !== undefined) {
    if (typeof raw.slug !== 'string' || !raw.slug.trim()) {
      errors.push('"slug" must be a non-empty lowercase kebab-case string when provided.');
    } else {
      slug = raw.slug.trim().replace(/^\/+|\/+$/g, '').replace(/^articles?\//i, '').toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        errors.push(
          `"slug" ("${slug}") must be lowercase kebab-case using only letters, numbers, and single hyphens (e.g. "quantum-photonic-interconnects").`
        );
      }
    }
  } else if (title) {
    slug = slugifyText(title);
    if (slug) {
      warnings.push(`Auto-generated kebab-case "slug": "${slug}" from "title".`);
    } else {
      errors.push('Could not auto-generate a valid kebab-case "slug" from "title"; provide "slug" explicitly.');
    }
  }

  const canonicalUrl = slug ? `https://eirvan.com/articles/${slug}` : '';
  if (typeof raw.canonicalUrl === 'string' && raw.canonicalUrl.trim() && raw.canonicalUrl.trim() !== canonicalUrl) {
    warnings.push(`Normalized "canonicalUrl" to "${canonicalUrl}" to match the canonical /articles/${slug} path.`);
  }

  // 3. Category Hub Selector (strictly 1 of the 5 hubs)
  let categoryName: (typeof VALID_CATEGORY_NAMES)[number] = CATEGORY_HUBS[0].name;
  if (raw.category !== undefined) {
    if (typeof raw.category !== 'string' || !raw.category.trim()) {
      errors.push(`"category" must be one of: ${VALID_CATEGORY_NAMES.join(', ')}.`);
    } else {
      const candidate = raw.category.trim().toLowerCase();
      const matchedHub = CATEGORY_HUBS.find(
        h => h.name.toLowerCase() === candidate || h.slug.toLowerCase() === candidate
      );
      if (!matchedHub) {
        errors.push(
          `Invalid "category": "${raw.category}". Allowed Story Composer options are strictly: ${VALID_CATEGORY_NAMES.join(', ')}.`
        );
      } else {
        categoryName = matchedHub.name;
      }
    }
  } else {
    warnings.push(`"category" omitted; defaulted to "${categoryName}".`);
  }

  const selectedHub = CATEGORY_HUBS.find(h => h.name === categoryName) || CATEGORY_HUBS[0];

  // 4. Topic Cluster Selector (strictly 1 of the 3 clusters for the chosen Category Hub)
  let topicCluster = selectedHub.clusters[0];
  if (raw.topicCluster !== undefined) {
    if (typeof raw.topicCluster !== 'string' || !raw.topicCluster.trim()) {
      errors.push(
        `"topicCluster" must be one of [${selectedHub.clusters.join(', ')}] for category "${selectedHub.name}".`
      );
    } else {
      const candidate = raw.topicCluster.trim().toLowerCase();
      const matchedCluster = selectedHub.clusters.find(cl => cl.toLowerCase() === candidate);
      if (!matchedCluster) {
        errors.push(
          `Invalid "topicCluster": "${raw.topicCluster}" for category "${selectedHub.name}". Allowed options for this Category Hub are strictly: ${selectedHub.clusters.join(', ')}.`
        );
      } else {
        topicCluster = matchedCluster;
      }
    }
  } else {
    warnings.push(`"topicCluster" omitted; defaulted to "${topicCluster}" for "${selectedHub.name}".`);
  }

  // 5. Author Selector (strictly 1 of the 6 masthead authors in AUTHORS)
  let selectedAuthor = AUTHORS[0];
  if (raw.author !== undefined) {
    let lookupKey = '';
    if (typeof raw.author === 'string') {
      lookupKey = raw.author.trim().toLowerCase();
    } else if (isPlainObject(raw.author)) {
      const aObj = raw.author;
      const rawLookup = aObj.slug || aObj.id || aObj.name;
      if (typeof rawLookup === 'string') {
        lookupKey = rawLookup.trim().toLowerCase();
      }
    }

    const matchedAuthor = AUTHORS.find(
      a =>
        a.name.toLowerCase() === lookupKey ||
        a.slug.toLowerCase() === lookupKey ||
        a.id.toLowerCase() === lookupKey
    );

    if (!matchedAuthor) {
      errors.push(
        `Invalid "author". Allowed Story Composer options are strictly the 6 masthead authors: ${AUTHORS.map(
          a => `"${a.name}" (or "${a.slug}")`
        ).join(', ')}.`
      );
    } else {
      selectedAuthor = matchedAuthor;
    }
  } else {
    warnings.push(`"author" omitted; defaulted to "${selectedAuthor.name}".`);
  }

  // 6. Workflow Status Selector (strictly 1 of the 6 states; never bypasses approval gate)
  let status: ArticleStatus = 'draft';
  if (raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !VALID_ARTICLE_STATUSES.includes(raw.status.trim() as ArticleStatus)) {
      errors.push(
        `Invalid "status": "${String(raw.status)}". Allowed Story Composer options are strictly: ${VALID_ARTICLE_STATUSES.join(', ')}.`
      );
    } else {
      const requestedStatus = raw.status.trim() as ArticleStatus;
      if (['approved', 'scheduled', 'published'].includes(requestedStatus)) {
        status = 'in_review';
        warnings.push(
          `Requested "status": "${requestedStatus}" was staged as "in_review" because imported stories require live administrator sign-off ("Approve Current Revision") before saving as ${requestedStatus}.`
        );
      } else {
        status = requestedStatus;
      }
    }
  }

  // 7. Schema.org Type Selector
  let articleType: ArticleSchemaType = 'Article';
  if (raw.articleType !== undefined) {
    if (typeof raw.articleType !== 'string' || !VALID_ARTICLE_TYPES.includes(raw.articleType as ArticleSchemaType)) {
      errors.push(
        `Invalid "articleType": "${String(raw.articleType)}". Allowed Story Composer options are strictly: ${VALID_ARTICLE_TYPES.join(', ')}.`
      );
    } else {
      articleType = raw.articleType as ArticleSchemaType;
    }
  }

  // 8. Robots Indexation Directive Selector
  let robotsDirective: RobotsDirective = 'index, follow';
  if (raw.robotsDirective !== undefined) {
    if (
      typeof raw.robotsDirective !== 'string' ||
      !VALID_ROBOTS_DIRECTIVES.includes(raw.robotsDirective as RobotsDirective)
    ) {
      errors.push(
        `Invalid "robotsDirective": "${String(raw.robotsDirective)}". Allowed Story Composer options are strictly: ${VALID_ROBOTS_DIRECTIVES.join(' | ')}.`
      );
    } else {
      robotsDirective = raw.robotsDirective as RobotsDirective;
    }
  }

  // 9. Search Intent Selector
  let searchIntent: SearchIntent = 'informational';
  if (raw.searchIntent !== undefined) {
    if (
      typeof raw.searchIntent !== 'string' ||
      !VALID_SEARCH_INTENTS.includes(raw.searchIntent as SearchIntent)
    ) {
      errors.push(
        `Invalid "searchIntent": "${String(raw.searchIntent)}". Allowed Story Composer options are strictly: ${VALID_SEARCH_INTENTS.join(', ')}.`
      );
    } else {
      searchIntent = raw.searchIntent as SearchIntent;
    }
  }

  // 10. Boolean checkboxes & flags
  const parseBooleanField = (val: unknown, name: string, fallback = false): boolean => {
    if (val === undefined) return fallback;
    if (typeof val !== 'boolean') {
      errors.push(`"${name}" must be a JSON boolean (true or false).`);
      return fallback;
    }
    return val;
  };
  const aiAssisted = parseBooleanField(raw.aiAssisted, 'aiAssisted', false);
  const isFeatured = parseBooleanField(raw.isFeatured, 'isFeatured', false);
  const isTrending = parseBooleanField(raw.isTrending, 'isTrending', false);

  // 11. Summary, SEO Meta Title & Meta Description
  let summary = '';
  if (raw.summary !== undefined) {
    if (typeof raw.summary !== 'string') {
      errors.push('"summary" must be a string.');
    } else {
      summary = raw.summary.trim();
    }
  }
  if (!summary) {
    warnings.push('"summary" is empty; provide a concise 1–2 sentence editorial deck before publishing.');
  }

  let metaTitle = title;
  if (raw.metaTitle !== undefined) {
    if (typeof raw.metaTitle !== 'string') {
      errors.push('"metaTitle" must be a string.');
    } else if (raw.metaTitle.trim()) {
      metaTitle = raw.metaTitle.trim();
    }
  }
  if (metaTitle && (metaTitle.length < 35 || metaTitle.length > 65)) {
    warnings.push(
      `"metaTitle" is ${metaTitle.length} chars (recommended for Google SERP: 35–65 chars).`
    );
  }

  let metaDescription = summary;
  if (raw.metaDescription !== undefined) {
    if (typeof raw.metaDescription !== 'string') {
      errors.push('"metaDescription" must be a string.');
    } else if (raw.metaDescription.trim()) {
      metaDescription = raw.metaDescription.trim();
    }
  }
  if (metaDescription && (metaDescription.length < 115 || metaDescription.length > 160)) {
    warnings.push(
      `"metaDescription" is ${metaDescription.length} chars (recommended: 115–160 chars).`
    );
  }

  // 12. Body HTML + Sanitization + Headings Extraction
  let contentHtml = '';
  if (raw.contentHtml === undefined) {
    errors.push('"contentHtml" is required and must be a non-empty HTML string.');
  } else if (typeof raw.contentHtml !== 'string' || !raw.contentHtml.trim()) {
    errors.push('"contentHtml" must be a non-empty HTML string.');
  } else {
    const sanitized = sanitizeArticleHtml(raw.contentHtml);
    if (sanitized.length < raw.contentHtml.length * 0.8 && raw.contentHtml.includes('<script')) {
      warnings.push('Stripped disallowed HTML tags/attributes from "contentHtml" during DOMPurify sanitization.');
    }
    contentHtml = sanitized;
  }

  const extracted = extractAndEnsureHeadings(contentHtml);
  contentHtml = extracted.html;

  let headings: HeadingItem[] = extracted.headings;
  if (raw.headings !== undefined) {
    if (!Array.isArray(raw.headings)) {
      errors.push('"headings" must be an array of { id, text, level } objects where level is 2 or 3.');
    } else {
      const parsedHeadings: HeadingItem[] = [];
      raw.headings.forEach((h, idx) => {
        if (!isPlainObject(h)) {
          errors.push(`"headings[${idx}]" must be an object.`);
          return;
        }
        const hText = typeof h.text === 'string' ? h.text.trim() : '';
        const hId = typeof h.id === 'string' && h.id.trim() ? h.id.trim() : slugifyText(hText);
        if (!hText) errors.push(`"headings[${idx}].text" must be a non-empty string.`);
        if (!hId) errors.push(`"headings[${idx}].id" must be a non-empty string.`);
        if (h.level !== 2 && h.level !== 3) {
          errors.push(`"headings[${idx}].level" must strictly be 2 or 3 (<h2> or <h3>).`);
          return;
        }
        if (hText && hId) {
          parsedHeadings.push({ id: hId, text: hText, level: h.level });
        }
      });
      headings = parsedHeadings;
    }
  } else if (headings.length > 0) {
    warnings.push(`Auto-extracted ${headings.length} H2/H3 Table-of-Contents heading(s) from "contentHtml".`);
  }

  const plainWords = contentHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean);
  const wordCount = plainWords.length;
  let readTimeMinutes = Math.max(3, Math.ceil(wordCount / 210));
  if (raw.readTimeMinutes !== undefined) {
    if (
      typeof raw.readTimeMinutes !== 'number' ||
      !Number.isFinite(raw.readTimeMinutes) ||
      raw.readTimeMinutes < 1
    ) {
      errors.push('"readTimeMinutes" must be a positive number (e.g. 6).');
    } else {
      readTimeMinutes = Math.round(raw.readTimeMinutes);
    }
  }

  // 13. Images & Alt Text
  let featuredImage = '/images/editorial/about-library-1200.webp';
  if (raw.featuredImage !== undefined) {
    if (typeof raw.featuredImage !== 'string' || !raw.featuredImage.trim()) {
      errors.push('"featuredImage" must be a non-empty string starting with "/images/" or "https://".');
    } else {
      const img = raw.featuredImage.trim();
      if (!isSafeImagePath(img)) {
        errors.push(`Invalid "featuredImage" ("${img}"). Must start with "/images/" or "https://".`);
      } else {
        featuredImage = img;
      }
    }
  }

  let socialImage: string | undefined =
    featuredImage === '/images/editorial/about-library-1200.webp'
      ? '/images/editorial/about-library-1200.jpg'
      : undefined;
  if (raw.socialImage !== undefined) {
    if (typeof raw.socialImage !== 'string' || !raw.socialImage.trim()) {
      errors.push('"socialImage" must be a non-empty string starting with "/images/" or "https://" when provided.');
    } else if (!isSafeImagePath(raw.socialImage.trim())) {
      errors.push(`Invalid "socialImage" ("${raw.socialImage}"). Must start with "/images/" or "https://".`);
    } else {
      socialImage = raw.socialImage.trim();
    }
  }

  let imageAlt = title;
  if (raw.imageAlt !== undefined) {
    if (typeof raw.imageAlt !== 'string') {
      errors.push('"imageAlt" must be a string.');
    } else if (raw.imageAlt.trim()) {
      imageAlt = raw.imageAlt.trim();
    }
  }
  if (imageAlt && imageAlt.length < 15) {
    warnings.push('"imageAlt" is under 15 characters; SEO audit recommends at least 15 descriptive characters.');
  }

  // 14. Tags, Keywords, Focus Topic, Secondary Topics, Previous Slugs, Related IDs
  const tags = normalizeStringArray(raw.tags, 'tags', errors) || [categoryName];
  const targetKeywords = normalizeStringArray(raw.targetKeywords, 'targetKeywords', errors) || [];
  const secondaryTopics = normalizeStringArray(raw.secondaryTopics, 'secondaryTopics', errors) || [];
  const relatedArticleIds = normalizeStringArray(raw.relatedArticleIds, 'relatedArticleIds', errors) || [];

  const rawPreviousSlugs = normalizeStringArray(raw.previousSlugs, 'previousSlugs', errors) || [];
  const previousSlugs = rawPreviousSlugs.map(s => s.replace(/^\/+|\/+$/g, '').replace(/^articles?\//i, '').toLowerCase());

  let focusTopic = targetKeywords[0] || '';
  if (raw.focusTopic !== undefined) {
    if (typeof raw.focusTopic !== 'string') {
      errors.push('"focusTopic" must be a string.');
    } else {
      focusTopic = raw.focusTopic.trim();
    }
  }

  // 15. Dates (publishedAt, scheduledAt)
  let publishedAt = options.existingArticle?.publishedAt || new Date().toISOString();
  if (raw.publishedAt !== undefined) {
    if (typeof raw.publishedAt !== 'string' || Number.isNaN(Date.parse(raw.publishedAt))) {
      errors.push('"publishedAt" must be a valid ISO-8601 date/timestamp string (e.g. "2026-11-20T09:00:00Z").');
    } else {
      publishedAt = new Date(raw.publishedAt).toISOString();
    }
  }

  let scheduledAt: string | undefined;
  if (raw.scheduledAt !== undefined && raw.scheduledAt !== null && raw.scheduledAt !== '') {
    if (typeof raw.scheduledAt !== 'string' || Number.isNaN(Date.parse(raw.scheduledAt))) {
      errors.push('"scheduledAt" must be a valid ISO-8601 date/timestamp string.');
    } else {
      scheduledAt = new Date(raw.scheduledAt).toISOString();
    }
  }

  // 16. Primary Sources
  const sources: ArticleSource[] = [];
  if (raw.sources !== undefined) {
    if (!Array.isArray(raw.sources)) {
      errors.push('"sources" must be an array of primary source objects.');
    } else {
      raw.sources.forEach((src, idx) => {
        if (!isPlainObject(src)) {
          errors.push(`"sources[${idx}]" must be an object.`);
          return;
        }
        const sTitle = typeof src.title === 'string' ? src.title.trim() : '';
        const sPublisher = typeof src.publisher === 'string' ? src.publisher.trim() : '';
        const sUrl = typeof src.url === 'string' ? src.url.trim() : '';

        if (!sTitle) errors.push(`"sources[${idx}].title" is required.`);
        if (!sPublisher) errors.push(`"sources[${idx}].publisher" is required.`);
        if (!sUrl || !/^https?:\/\/.+/i.test(sUrl)) {
          errors.push(`"sources[${idx}].url" must be a valid http(s):// URL.`);
        }

        let dateStatus: ArticleSource['dateStatus'] | undefined;
        if (src.dateStatus !== undefined) {
          if (
            typeof src.dateStatus !== 'string' ||
            !VALID_SOURCE_DATE_STATUSES.includes(src.dateStatus as 'published' | 'undated-evergreen')
          ) {
            errors.push(
              `"sources[${idx}].dateStatus" must strictly be "published" or "undated-evergreen".`
            );
          } else {
            dateStatus = src.dateStatus as 'published' | 'undated-evergreen';
          }
        }

        if (sTitle && sPublisher && /^https?:\/\/.+/i.test(sUrl)) {
          sources.push({
            title: sTitle,
            publisher: sPublisher,
            url: sUrl,
            ...(typeof src.year === 'string' && src.year.trim() ? { year: src.year.trim() } : {}),
            ...(typeof src.publishedDate === 'string' && src.publishedDate.trim()
              ? { publishedDate: src.publishedDate.trim() }
              : {}),
            ...(dateStatus ? { dateStatus } : {}),
            ...(typeof src.accessedAt === 'string' && src.accessedAt.trim()
              ? { accessedAt: src.accessedAt.trim() }
              : {})
          });
        }
      });
    }
  }
  if (sources.length === 0) {
    warnings.push('No cited primary "sources" supplied; at least 1 primary source is required before editorial approval.');
  }

  // 17. FAQs
  const faqs: FAQItem[] = [];
  if (raw.faqs !== undefined) {
    if (!Array.isArray(raw.faqs)) {
      errors.push('"faqs" must be an array of { question, answer } objects.');
    } else {
      raw.faqs.forEach((f, idx) => {
        if (!isPlainObject(f)) {
          errors.push(`"faqs[${idx}]" must be an object.`);
          return;
        }
        const q = typeof f.question === 'string' ? f.question.trim() : '';
        const a = typeof f.answer === 'string' ? f.answer.trim() : '';
        if (!q) errors.push(`"faqs[${idx}].question" must be a non-empty string.`);
        if (!a) errors.push(`"faqs[${idx}].answer" must be a non-empty string.`);
        if (q && a) {
          faqs.push({ question: q, answer: a });
        }
      });
    }
  }

  // 18. Changelog
  const changelog: ArticleChangelogEntry[] = [];
  if (raw.changelog !== undefined) {
    if (!Array.isArray(raw.changelog)) {
      errors.push('"changelog" must be an array of { date, note } objects.');
    } else {
      raw.changelog.forEach((entry, idx) => {
        if (!isPlainObject(entry)) {
          errors.push(`"changelog[${idx}]" must be an object.`);
          return;
        }
        const d = typeof entry.date === 'string' ? entry.date.trim() : '';
        const n = typeof entry.note === 'string' ? entry.note.trim() : '';
        if (!d || Number.isNaN(Date.parse(d))) {
          errors.push(`"changelog[${idx}].date" must be a valid date string (recommended: "YYYY-MM-DD").`);
        }
        if (!n) {
          errors.push(`"changelog[${idx}].note" must be a non-empty string.`);
        }
        if (d && !Number.isNaN(Date.parse(d)) && n) {
          changelog.push({ date: d, note: n });
        }
      });
    }
  }

  // 19. Private editorialNotes (stored separately in /articlePrivate/{id} on Save)
  let editorialNotes = '';
  if (raw.editorialNotes !== undefined) {
    if (typeof raw.editorialNotes !== 'string') {
      errors.push('"editorialNotes" must be a string.');
    } else {
      editorialNotes = raw.editorialNotes.trim();
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings
    };
  }

  const effectiveId =
    options.existingArticle?.id || options.currentDraftId || `art-${Date.now()}`;
  const effectiveViews = options.existingArticle?.views ?? 0;

  const mappedForm: Partial<Article> = {
    id: effectiveId,
    title,
    slug,
    canonicalUrl,
    metaTitle,
    metaDescription,
    summary,
    contentHtml,
    category: selectedHub.name,
    topicCluster,
    tags,
    targetKeywords,
    focusTopic,
    secondaryTopics,
    previousSlugs,
    relatedArticleIds,
    author: {
      name: selectedAuthor.name,
      role: selectedAuthor.role,
      avatar: selectedAuthor.avatar,
      slug: selectedAuthor.slug,
      bio: selectedAuthor.shortBio,
      verified: selectedAuthor.verified
    },
    articleType,
    robotsDirective,
    searchIntent,
    status,
    aiAssisted,
    isFeatured,
    isTrending,
    publishedAt,
    updatedAt: new Date().toISOString(),
    ...(scheduledAt ? { scheduledAt } : {}),
    readTimeMinutes,
    featuredImage,
    ...(socialImage ? { socialImage } : {}),
    imageAlt,
    headings,
    faqs,
    sources,
    changelog,
    editorialNotes,
    // Strictly clear any editorial approval sign-off so imported content must be reviewed & approved by signed-in Admin
    humanReviewed: false,
    reviewedAt: undefined,
    reviewedRevisionHash: undefined,
    approval: undefined,
    reviewer: undefined,
    views: effectiveViews
  };

  return {
    success: true,
    mappedForm,
    errors: [],
    warnings,
    summary: {
      title,
      slug,
      category: selectedHub.name,
      topicCluster,
      authorName: selectedAuthor.name,
      status,
      wordCount,
      readTimeMinutes,
      sourcesCount: sources.length,
      faqsCount: faqs.length,
      headingsCount: headings.length,
      changelogCount: changelog.length
    }
  };
}

export const SAMPLE_IMPORT_ARTICLE_JSON = JSON.stringify(
  {
    title: 'Co-Packaged Silicon Photonics for Sub-Watt Datacenter Interconnects',
    metaTitle: 'Co-Packaged Silicon Photonics for Low-Power AI Interconnects',
    slug: 'co-packaged-silicon-photonics-sub-watt-interconnects',
    category: 'Technology',
    topicCluster: 'Silicon Photonics',
    author: 'Dr. Evelyn Vance',
    status: 'draft',
    articleType: 'Article',
    robotsDirective: 'index, follow',
    searchIntent: 'informational',
    aiAssisted: false,
    isFeatured: false,
    isTrending: false,
    metaDescription:
      'Technical analysis of co-packaged optical engines reducing datacenter SerDes energy below 2 pJ/bit compared to copper retimers.',
    summary:
      'An architectural evaluation of co-packaged silicon photonics, laser thermal budgets, and link energy per bit across next-generation AI clusters.',
    featuredImage: '/images/articles/photonic-supercomputing-1200.webp',
    socialImage: '/images/articles/photonic-supercomputing-1200.jpg',
    imageAlt: 'Co-packaged silicon photonics optical waveguide wafer architecture diagram',
    tags: ['Silicon Photonics', 'Interconnects', 'Datacenter Hardware'],
    targetKeywords: ['co-packaged silicon photonics', 'optical interconnects', 'sub-watt serdes'],
    focusTopic: 'co-packaged silicon photonics',
    secondaryTopics: ['Co-Packaged Optics', 'Waveguide Thermal Tuning'],
    previousSlugs: [],
    contentHtml:
      '<h2 id="copper-wall">Copper Attenuation Limits Past 224G PAM4</h2><p>At 224 Gbps per lane, electrical PCB traces face severe skin-effect and dielectric insertion losses that require power-hungry DSP retimers within inches of the switch ASIC. See our <a href="/editorial-policy">editorial sourcing methodology</a> for how interconnect benchmarks are validated.</p><h3 id="energy-per-bit">Energy-Per-Bit Scaling Thresholds</h3><p>Co-packaged optical engines relocate optical modulation directly onto the organic package substrate, cutting electrical reach to a few millimeters and lowering total link energy below 2 picojoules per bit.</p><h2 id="thermal-budget">Laser Coupling &amp; Thermal Constraints</h2><p>Micro-ring modulators remain sensitive to die temperature drift, making external continuous-wave laser sources and closed-loop thermal tuning essential for production yield.</p>',
    sources: [
      {
        title: 'IEEE ISSCC Optical Interconnect Energy Benchmarks',
        publisher: 'IEEE Solid-State Circuits Society',
        url: 'https://ieeexplore.ieee.org/',
        year: '2026',
        publishedDate: '2026-02-18',
        dateStatus: 'published',
        accessedAt: '2026-11-20'
      }
    ],
    faqs: [
      {
        question: 'Why does co-packaged optics save power over pluggable transceivers?',
        answer:
          'Co-packaged optics eliminates long copper traces and intermediate DSP retimer hops by placing the optical modulator directly adjacent to the switch silicon.'
      }
    ],
    changelog: [
      {
        date: '2026-11-20',
        note: 'Initial technical draft imported for editorial review.'
      }
    ],
    editorialNotes: 'Verify ISSCC table 4 energy figures against final PDF before signing off.'
  },
  null,
  2
);

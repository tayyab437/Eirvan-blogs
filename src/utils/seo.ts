import { Article, SEOAuditResult, SEOCheck } from '../types/blog';

/**
 * Updates DOM head elements dynamically on route / article changes
 */
export function updateHeadSEO(article: Article | null) {
  if (typeof document === 'undefined') return;

  const defaultTitle = 'EIRVAN – Explore, Learn & Stay Informed | High-Performance Publication';
  const defaultDesc = 'EIRVAN: Explore, Learn & Stay Informed. Lightweight multi-niche editorial publishing platform engineered for top Google ranking, JSON-LD schema richness, Core Web Vitals optimization, and high-CTR monetization.';

  const pageTitle = article ? `${article.metaTitle || article.title} | EIRVAN` : defaultTitle;
  const pageDesc = article ? (article.metaDescription || article.summary) : defaultDesc;
  const pageUrl = article ? article.canonicalUrl : 'https://eirvan.com';

  // Title
  document.title = pageTitle;

  // Helper for meta tags
  const setMetaTag = (selector: string, attr: string, value: string) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=');
      el.setAttribute(attrName, attrVal.replace(/"/g, ''));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  setMetaTag('meta[name="description"]', 'content', pageDesc);
  setMetaTag('meta[property="og:title"]', 'content', pageTitle);
  setMetaTag('meta[property="og:description"]', 'content', pageDesc);
  setMetaTag('meta[property="og:url"]', 'content', pageUrl);
  setMetaTag('meta[property="og:type"]', 'content', article ? 'article' : 'website');

  if (article?.featuredImage) {
    setMetaTag('meta[property="og:image"]', 'content', article.featuredImage);
    setMetaTag('meta[name="twitter:image"]', 'content', article.featuredImage);
  }

  setMetaTag('meta[name="twitter:title"]', 'content', pageTitle);
  setMetaTag('meta[name="twitter:description"]', 'content', pageDesc);

  // Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', pageUrl);

  // Update dynamic JSON-LD Schema
  if (article) {
    const schema = generateArticleSchema(article);
    injectJSONLDSchema(schema);
  } else {
    // Reset to root website schema
    const siteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'EIRVAN',
      'alternateName': ['EIRVAN – Explore, Learn & Stay Informed', 'Eirvan.com'],
      'url': 'https://eirvan.com',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': 'https://eirvan.com/?s={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    };
    injectJSONLDSchema(siteSchema);
  }
}

/**
 * Builds standard Google Schema.org structured data for Article, BreadcrumbList, and FAQPage
 */
export function generateArticleSchema(article: Article) {
  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': article.canonicalUrl
      },
      'headline': article.title,
      'description': article.metaDescription || article.summary,
      'image': [article.featuredImage],
      'datePublished': article.publishedAt,
      'dateModified': article.updatedAt || article.publishedAt,
      'author': {
        '@type': 'Person',
        'name': article.author.name,
        'jobTitle': article.author.role
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'EIRVAN',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://eirvan.com/assets/aistudio/EIRVAN_Global_Orbit_Logo_96fec474.png'
        }
      },
      'keywords': article.tags.join(', ')
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://eirvan.com'
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': article.category,
          'item': `https://eirvan.com/category/${encodeURIComponent(article.category.toLowerCase().replace(/\s+/g, '-'))}`
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': article.title,
          'item': article.canonicalUrl
        }
      ]
    }
  ];

  // Include FAQPage Schema if article has FAQs (Google rich snippet booster)
  if (article.faqs && article.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': article.faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    });
  }

  return schemas;
}

/**
 * Dynamically updates the JSON-LD script element in document head
 */
export function injectJSONLDSchema(schemaObj: any) {
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
 * Real-Time Google SERP and Core Web Vitals Auditor
 */
export function auditArticleSEO(article: Partial<Article>): SEOAuditResult {
  const checks: SEOCheck[] = [];

  // Check 1: Meta Title Length (optimal 35-60 chars)
  const title = article.metaTitle || article.title || '';
  const titleLen = title.length;
  if (titleLen >= 35 && titleLen <= 65) {
    checks.push({
      id: 'title-len',
      label: 'Meta Title Length',
      status: 'pass',
      description: `${titleLen} characters (Ideal: 35–65 characters). Fits within Google desktop & mobile snippet pixel limits.`,
      recommendation: 'Perfect title tag length.'
    });
  } else if (titleLen > 65) {
    checks.push({
      id: 'title-len',
      label: 'Meta Title Length',
      status: 'warn',
      description: `${titleLen} characters. Likely to be truncated with an ellipsis (...) in SERPs.`,
      recommendation: 'Trim title under 65 characters to prevent truncation on mobile.'
    });
  } else {
    checks.push({
      id: 'title-len',
      label: 'Meta Title Length',
      status: 'fail',
      description: `${titleLen} characters. Too short to maximize click-through intent.`,
      recommendation: 'Add high-value secondary keyword or brand modifier (min 35 characters).'
    });
  }

  // Check 2: Meta Description Length (optimal 120-160 chars)
  const desc = article.metaDescription || '';
  const descLen = desc.length;
  if (descLen >= 120 && descLen <= 165) {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description Length',
      status: 'pass',
      description: `${descLen} characters (Ideal: 120–165 characters). Captures maximum SERP real estate without clipping.`,
      recommendation: 'Optimal snippet length.'
    });
  } else if (descLen > 165) {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description Length',
      status: 'warn',
      description: `${descLen} characters. Truncated on mobile SERP displays (>160 chars).`,
      recommendation: 'Condense description to 140–155 characters.'
    });
  } else {
    checks.push({
      id: 'desc-len',
      label: 'Meta Description Length',
      status: 'fail',
      description: `${descLen} characters. Too brief to communicate key value or trigger high CTR.`,
      recommendation: 'Expand with a clear call-to-action and primary keyword phrase (min 120 chars).'
    });
  }

  // Check 3: Primary Keyword Inclusion
  const keywords = article.targetKeywords || [];
  const primaryKw = keywords[0]?.toLowerCase() || '';
  if (primaryKw && title.toLowerCase().includes(primaryKw)) {
    checks.push({
      id: 'keyword-title',
      label: 'Target Keyword in Title',
      status: 'pass',
      description: `Primary query "${primaryKw}" detected near front of headline.`,
      recommendation: 'High topical relevance signal established.'
    });
  } else if (primaryKw) {
    checks.push({
      id: 'keyword-title',
      label: 'Target Keyword in Title',
      status: 'warn',
      description: `Target keyword "${primaryKw}" not found verbatim in Title tag.`,
      recommendation: 'Integrate target keyword naturally into the first 40 characters of Title.'
    });
  } else {
    checks.push({
      id: 'keyword-title',
      label: 'Target Keyword Configured',
      status: 'warn',
      description: 'No target search query specified for algorithmic audit.',
      recommendation: 'Add at least 1 target search query.'
    });
  }

  // Check 4: Heading Hierarchy (H2 presence)
  const headings = article.headings || [];
  const h2Count = headings.filter(h => h.level === 2).length;
  if (h2Count >= 2) {
    checks.push({
      id: 'heading-struct',
      label: 'Heading Hierarchy (H2/H3)',
      status: 'pass',
      description: `${h2Count} H2 section markers found. Enables Google featured snippet extraction and auto-TOC jump links.`,
      recommendation: 'Excellent content structure.'
    });
  } else {
    checks.push({
      id: 'heading-struct',
      label: 'Heading Hierarchy (H2/H3)',
      status: 'fail',
      description: 'Fewer than 2 H2 headings found in article body.',
      recommendation: 'Structure content into distinct thematic sections using H2 subheadings.'
    });
  }

  // Check 5: Word Count & Depth
  const content = article.contentHtml || '';
  const textOnly = content.replace(/<[^>]*>/g, ' ');
  const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 600) {
    checks.push({
      id: 'word-count',
      label: 'Comprehensive Content Depth',
      status: 'pass',
      description: `Estimated ${wordCount} words. High topical authority signal for Google helpful content guidelines.`,
      recommendation: 'Substantial long-form editorial coverage.'
    });
  } else if (wordCount >= 300) {
    checks.push({
      id: 'word-count',
      label: 'Comprehensive Content Depth',
      status: 'warn',
      description: `${wordCount} words. Moderate length; may struggle against in-depth competitive guides.`,
      recommendation: 'Aim for 600+ words with examples, case studies, or reference citations.'
    });
  } else {
    checks.push({
      id: 'word-count',
      label: 'Comprehensive Content Depth',
      status: 'fail',
      description: `${wordCount} words. Thin content risk for high-difficulty search queries.`,
      recommendation: 'Expand content with substantial analytical depth.'
    });
  }

  // Check 6: Google Rich Snippet FAQ Schema
  const faqs = article.faqs || [];
  if (faqs.length >= 2) {
    checks.push({
      id: 'faq-schema',
      label: 'FAQ Rich Snippet Schema',
      status: 'pass',
      description: `${faqs.length} FAQ pairs configured. Eligible for expanded Google People-Also-Ask and SERP accordions.`,
      recommendation: 'High CTR booster active.'
    });
  } else {
    checks.push({
      id: 'faq-schema',
      label: 'FAQ Rich Snippet Schema',
      status: 'warn',
      description: 'Zero or only 1 FAQ item present.',
      recommendation: 'Include at least 2 common conversational questions to qualify for rich FAQ snippets.'
    });
  }

  // Check 7: Image Alt Tag Accessibility
  const alt = article.imageAlt || '';
  if (alt.length >= 15) {
    checks.push({
      id: 'image-alt',
      label: 'Featured Image Alt Text',
      status: 'pass',
      description: `Descriptive alt text configured (${alt.length} chars). Meets Google Images and WCAG requirements.`,
      recommendation: 'Proper image indexing.'
    });
  } else {
    checks.push({
      id: 'image-alt',
      label: 'Featured Image Alt Text',
      status: 'fail',
      description: 'Missing or non-descriptive alt text on hero visual.',
      recommendation: 'Write a natural 15–80 character description of the image content.'
    });
  }

  // Check 8: Canonical URL
  if (article.canonicalUrl && article.canonicalUrl.startsWith('http')) {
    checks.push({
      id: 'canonical',
      label: 'Canonical Tag Integrity',
      status: 'pass',
      description: 'Absolute canonical URL defined to prevent duplicate content penalties.',
      recommendation: 'Protects against scraper scraping.'
    });
  } else {
    checks.push({
      id: 'canonical',
      label: 'Canonical Tag Integrity',
      status: 'warn',
      description: 'Canonical URL is relative or missing protocol.',
      recommendation: 'Provide absolute URL (e.g. https://...)'
    });
  }

  // Compute overall score
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const totalWeight = checks.length * 10;
  const rawScore = (passCount * 10) + (warnCount * 5);
  const finalScore = Math.min(100, Math.round((rawScore / totalWeight) * 100));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (finalScore >= 95) grade = 'A+';
  else if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else grade = 'D';

  return {
    score: finalScore,
    grade,
    checks
  };
}

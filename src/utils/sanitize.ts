import DOMPurify, { Config } from 'dompurify';

/**
 * Editorial HTML sanitization configuration for EIRVAN publications.
 * Defines a strict allowlist of semantic formatting tags and safe attributes
 * while preventing XSS, script execution, event handler injections, and malicious protocols.
 */
const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Structural & Text Elements
    'p', 'span', 'div', 'blockquote', 'hr', 'br',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small', 'del', 'ins',
    // Lists
    'ul', 'ol', 'li',
    // Code & Monospace
    'pre', 'code', 'kbd', 'samp',
    // Links
    'a',
    // Media & Figures
    'figure', 'figcaption', 'img',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Interactive disclosures
    'details', 'summary'
  ],
  ALLOWED_ATTR: [
    'id',           // Crucial for Table of Contents anchor jump links
    'class',        // Editorial styling classes (e.g. drop caps, font families)
    'href',         // Links
    'title',        // Tooltips & accessible descriptions
    'target',       // Target window
    'rel',          // Link relationships (rel="noopener noreferrer")
    'src',          // Image sources
    'alt',          // Image accessibility text
    'width',        // Dimensions
    'height',       // Dimensions
    'loading',      // Lazy loading attribute
    'decoding',     // Image decoding hints
    'srcset',       // Responsive images
    'sizes',        // Responsive sizing
    'colspan',      // Table cell span
    'rowspan',      // Table cell span
    'scope',        // Table header scope
    'aria-label',   // Accessibility labels
    'aria-hidden'   // Accessibility hiding
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['rel'], // Ensures rel is added if target="_blank"
  FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'base', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'] // Prevent inline JS and styles
};

// Add hook to enforce rel="noopener noreferrer" on all external links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Sanitizes arbitrary HTML strings using DOMPurify with the editorial allowlist.
 * Guarantees zero script execution, removes dangerous protocols (javascript:),
 * and prevents event handler attribute injection.
 */
export function sanitizeArticleHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }
  return String(DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG));
}


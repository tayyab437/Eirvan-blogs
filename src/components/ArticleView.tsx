import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Check,
  ChevronDown,
  BookOpen,
  Bookmark,
  ThumbsUp,
  Flame,
  Lightbulb,
  Copy,
  Type,
  ExternalLink,
  History,
  ArrowRight
} from 'lucide-react';
import { Article, PublicAdSlot } from '../types/blog';
import { StorageService } from '../services/storage';
import { AdBanner } from './AdBanner';
import { Link, getArticlePath, getCategoryPath } from '../utils/router';
import { getAuthorByName } from '../data/authors';
import { getCategoryHubByName } from '../data/categories';
import { sanitizeArticleHtml } from '../utils/sanitize';
import { ResponsiveImage } from './ResponsiveImage';

interface ArticleViewProps {
  article: Article;
  allArticles?: Article[];
  adSlots: PublicAdSlot[];
  onBack: () => void;
  onSelectArticle?: (article: Article) => void;
  onToggleBookmark: (articleId: string) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  allArticles = [],
  adSlots,
  onBack,
  onSelectArticle,
  onToggleBookmark
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  const categoryHub = getCategoryHubByName(article.category);
  const authorProfile = getAuthorByName(article.author.name);
  const authorSlug = article.author.slug || authorProfile.slug;

  const [reactions, setReactions] = useState(
    article.reactions || { helpful: 0, fire: 0, insightful: 0 }
  );
  const [userVoted, setUserVoted] = useState<string | null>(null);
  const dwellStartTime = useRef(Date.now());
  const maxScrollMilestone = useRef(0);

  useEffect(() => {
    setReactions(article.reactions || { helpful: 0, fire: 0, insightful: 0 });
    setUserVoted(null);
  }, [article.id]);

  const sanitizedContentHtml = useMemo(() => {
    return sanitizeArticleHtml(article.contentHtml);
  }, [article.contentHtml]);

  const relatedArticles = useMemo(() => {
    const published = allArticles.filter(a => a.status === 'published' && a.id !== article.id);
    if (article.relatedArticleIds && article.relatedArticleIds.length > 0) {
      const explicit = article.relatedArticleIds
        .map(id => published.find(a => a.id === id))
        .filter((a): a is Article => Boolean(a));
      if (explicit.length >= 2) return explicit.slice(0, 3);
    }
    const sameCategory = published.filter(
      a => getCategoryHubByName(a.category).slug === categoryHub.slug
    );
    const others = published.filter(
      a => getCategoryHubByName(a.category).slug !== categoryHub.slug
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [allArticles, article.id, article.relatedArticleIds, categoryHub.slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    dwellStartTime.current = Date.now();
    maxScrollMilestone.current = 0;

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
      setScrollProgress(progress);

      if (progress >= 25 && maxScrollMilestone.current < 25) {
        maxScrollMilestone.current = 25;
        StorageService.recordScrollMilestone(25);
      }
      if (progress >= 50 && maxScrollMilestone.current < 50) {
        maxScrollMilestone.current = 50;
        StorageService.recordScrollMilestone(50);
      }
      if (progress >= 75 && maxScrollMilestone.current < 75) {
        maxScrollMilestone.current = 75;
        StorageService.recordScrollMilestone(75);
      }
      if (progress >= 95 && maxScrollMilestone.current < 100) {
        maxScrollMilestone.current = 100;
        StorageService.recordScrollMilestone(100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      const dwellSeconds = Math.round((Date.now() - dwellStartTime.current) / 1000);
      if (dwellSeconds > 1) {
        StorageService.recordDwellTime(dwellSeconds);
      }
    };
  }, [article.id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: article.summary,
          url: window.location.href
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopySummary = () => {
    const text = `${article.title}\n\n${article.summary}\n\nRead full briefing: ${article.canonicalUrl || window.location.href}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  const handleReaction = (type: 'helpful' | 'fire' | 'insightful') => {
    if (userVoted) return;
    const updated = StorageService.recordReaction(article.id, type);
    setReactions(updated);
    setUserVoted(type);
  };

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const updatedDate = article.updatedAt
    ? new Date(article.updatedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const inArticleAd = adSlots.find(s => s.type === 'native-card' && s.isEnabled);
  const sidebarAd = adSlots.find(s => s.type === 'rectangle' && s.isEnabled);

  return (
    <div className="relative bg-[#FAF9F6] min-h-screen text-stone-900">
      {/* Subtle Top Reading Progress Line */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-1 bg-blue-900 z-50 origin-left transition-transform duration-75"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Top Breadcrumb & Reader Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
            <Link href="/" onClick={onBack} className="hover:text-blue-900 font-medium inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Home</span>
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={getCategoryPath(categoryHub.name)} className="hover:text-blue-900 font-medium">
              {categoryHub.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-900 font-medium truncate max-w-[220px] sm:max-w-sm">{article.title}</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleBookmark(article.id)}
              aria-label={article.isBookmarked ? 'Remove bookmark' : 'Save story'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                article.isBookmarked
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
              title={article.isBookmarked ? 'Saved' : 'Save to reading list'}
            >
              <Bookmark className={`w-4 h-4 ${article.isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setFontSize(prev => (prev === 'normal' ? 'large' : 'normal'))}
              aria-label="Toggle reading text size"
              className="p-2 bg-white text-stone-700 border border-stone-200 rounded-lg hover:border-stone-400 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Toggle text size"
            >
              <Type className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share this article"
              className="p-2 bg-white text-stone-700 border border-stone-200 rounded-lg hover:border-stone-400 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Share article link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="mb-10 max-w-4xl mx-auto">
          <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-stone-500 mb-4">
            <Link
              href={getCategoryPath(categoryHub.name)}
              className="text-blue-900 font-semibold uppercase tracking-wider hover:underline"
            >
              {categoryHub.name}
            </Link>
            {article.topicCluster && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>{article.topicCluster}</span>
              </>
            )}
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="font-mono tabular-nums">{article.readTimeMinutes} min read</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-[1.14] tracking-tight text-balance">
            {article.title}
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-stone-600 leading-relaxed max-w-3xl">
            {article.summary}
          </p>

          {/* Author & Reviewer Editorial Transparency Bar */}
          <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href={`/author/${authorSlug}`}
              className="flex items-center gap-3.5 group/author"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 shrink-0 border border-stone-200">
                <ResponsiveImage
                  src={authorProfile.avatar}
                  alt={authorProfile.name}
                  width={160}
                  height={160}
                  sizes="48px"
                  preferredWidth={160}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-semibold text-sm text-stone-900 group-hover/author:text-blue-900 transition-colors">
                  By {article.author.name}
                </div>
                <div className="text-xs text-stone-500">
                  {article.author.role}
                  {article.reviewer?.name && (
                    <> · Reviewed by {article.reviewer.name}</>
                  )}
                </div>
              </div>
            </Link>

            <div className="text-xs text-stone-500 font-mono space-y-0.5 sm:text-right">
              <div>Published: {publishedDate}</div>
              {updatedDate && updatedDate !== publishedDate && (
                <div>Updated: {updatedDate}</div>
              )}
              {(article.approval?.reviewedAt || article.reviewedAt) && article.humanReviewed && (
                <div>
                  Reviewed:{' '}
                  {new Date(article.approval?.reviewedAt || article.reviewedAt!).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              )}
              {article.aiAssisted && article.humanReviewed && (
                <div className="text-stone-600">Disclosure: AI-assisted draft · Human-verified</div>
              )}
              {article.aiAssisted && !article.humanReviewed && (
                <div className="text-amber-800 font-semibold">Disclosure: AI-assisted · Pending human approval</div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Media */}
        <figure className="my-10 rounded-2xl overflow-hidden border border-stone-200 bg-white">
          <div className="aspect-16/9 w-full overflow-hidden bg-stone-100">
            <ResponsiveImage
              src={article.featuredImage}
              alt={article.imageAlt || article.title}
              width={1200}
              height={675}
              sizes="(max-width: 1152px) 100vw, 1152px"
              preferredWidth={1200}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="px-5 py-3.5 text-xs text-stone-500 italic font-serif border-t border-stone-100 bg-white">
            {article.imageAlt || article.title}
          </figcaption>
        </figure>

        {/* Reading Grid: Main Body (8 cols) + Utility Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 bg-white p-6 sm:p-10 rounded-2xl border border-stone-200">
            {/* Key Synopsis Copy Bar */}
            <div className="mb-8 p-5 bg-[#FAF9F6] rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold block mb-1">
                  Briefing Synopsis
                </span>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {article.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySummary}
                className="shrink-0 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
            </div>

            {/* Table of Contents */}
            {article.headings && article.headings.length > 0 && (
              <nav aria-label="Table of contents" className="p-5 mb-8 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-3">
                  <BookOpen className="w-4 h-4 text-blue-900" aria-hidden="true" />
                  <span>Contents</span>
                </div>
                <ul className="space-y-2 text-xs">
                  {article.headings.map(h => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block text-stone-700 hover:text-blue-900 hover:underline ${
                          h.level === 3 ? 'pl-4 text-stone-600' : 'font-semibold'
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Main Sanitized Editorial Prose */}
            <div
              className={`prose-editorial max-w-prose ${
                fontSize === 'large' ? 'text-lg sm:text-[19px]' : 'text-base sm:text-[17px]'
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }}
            />

            {/* Primary Sources & Citations */}
            {article.sources && article.sources.length > 0 && (
              <section aria-label="Sources and Primary Citations" className="mt-10 pt-8 border-t border-stone-200 space-y-4">
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  Sources &amp; Primary Citations
                </h2>
                <ol className="space-y-2.5 text-sm text-stone-700 list-decimal pl-5">
                  {article.sources.map((src, idx) => (
                    <li key={idx}>
                      <span className="font-medium text-stone-900">{src.title}</span>{' '}
                      <span className="text-stone-500">
                        — {src.publisher}
                        {src.publishedDate
                          ? ` (${src.publishedDate})`
                          : src.year
                            ? ` (${src.year})`
                            : ''}
                        {src.accessedAt ? ` · Accessed ${src.accessedAt}` : ''}
                      </span>{' '}
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-blue-900 hover:underline ml-1"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* In-Article Ad Placement */}
            {inArticleAd && <AdBanner slot={inArticleAd} className="my-10" />}

            {/* Reader Utility Feedback */}
            <div className="my-10 p-6 rounded-xl bg-[#FAF9F6] border border-stone-200 text-center">
              <h3 className="text-base font-serif font-bold text-stone-900 mb-1">
                Was this briefing useful?
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Reader responses help our editors evaluate clarity and technical depth.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleReaction('helpful')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border ${
                    userVoted === 'helpful'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white hover:border-stone-400 text-stone-800 border-stone-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Helpful</span>
                  <span className="font-mono tabular-nums opacity-75">{reactions.helpful}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('fire')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border ${
                    userVoted === 'fire'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white hover:border-stone-400 text-stone-800 border-stone-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Thorough</span>
                  <span className="font-mono tabular-nums opacity-75">{reactions.fire}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('insightful')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border ${
                    userVoted === 'insightful'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white hover:border-stone-400 text-stone-800 border-stone-200'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Insightful</span>
                  <span className="font-mono tabular-nums opacity-75">{reactions.insightful}</span>
                </button>
              </div>
            </div>

            {/* Revision / Corrections Log if present */}
            {article.changelog && article.changelog.length > 0 && (
              <section aria-label="Revision History" className="my-8 p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-stone-800">
                  <History className="w-4 h-4 text-blue-900" aria-hidden="true" />
                  <span>Revision &amp; Correction History</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  {article.changelog.map((entry, idx) => (
                    <li key={idx}>
                      <span className="font-mono font-semibold text-stone-800">{entry.date}:</span> {entry.note}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Visible FAQ Section */}
            {article.faqs && article.faqs.length > 0 && (
              <section aria-label="Frequently Asked Questions" className="mt-10 pt-8 border-t border-stone-200 space-y-5">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                    Key Questions &amp; Reference Answers
                  </span>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                    Frequently Asked Questions
                  </h2>
                </div>

                <div className="space-y-3">
                  {article.faqs.map((faq, idx) => (
                    <details
                      key={idx}
                      className="group bg-[#FAF9F6] rounded-xl border border-stone-200 p-5 open:bg-white"
                    >
                      <summary className="flex items-start justify-between text-base font-serif font-bold text-stone-900 cursor-pointer list-none gap-4">
                        <span>{faq.question}</span>
                        <ChevronDown className="w-4 h-4 text-stone-500 group-open:rotate-180 transition-transform shrink-0 mt-1" aria-hidden="true" />
                      </summary>
                      <p className="mt-3 pt-3 border-t border-stone-200/80 text-sm text-stone-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Plain unboxed topics */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-stone-200 flex items-center flex-wrap gap-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-800">Topics:</span>
                {article.tags.map((tag, i) => (
                  <React.Fragment key={tag}>
                    {i > 0 && <span aria-hidden="true">·</span>}
                    <span>{tag}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Author Dossier */}
            <section aria-label="About the Author" className="mt-10 pt-8 border-t border-stone-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link
                    href={`/author/${authorSlug}`}
                    className="w-16 h-16 rounded-full overflow-hidden border border-stone-200 shrink-0 block"
                  >
                    <ResponsiveImage
                      src={authorProfile.avatar}
                      alt={authorProfile.name}
                      width={160}
                      height={160}
                      sizes="64px"
                      preferredWidth={160}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                      {authorProfile.department}
                    </span>
                    <Link
                      href={`/author/${authorSlug}`}
                      className="text-lg font-serif font-bold text-stone-900 hover:text-blue-900 transition-colors block"
                    >
                      {authorProfile.name}
                    </Link>
                    <span className="text-xs text-stone-600 block">
                      {authorProfile.role} · {authorProfile.education}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/author/${authorSlug}`}
                  className="px-4 py-2 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors shrink-0 whitespace-nowrap self-start sm:self-center"
                >
                  View Author Archive →
                </Link>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                {authorProfile.bio}
              </p>
            </section>

            {/* Curated Related Articles */}
            {relatedArticles.length > 0 && (
              <section aria-label="Related Briefings" className="mt-12 pt-8 border-t border-stone-200 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-serif font-bold text-stone-900">
                    Related Briefings
                  </h2>
                  <Link
                    href={getCategoryPath(categoryHub.name)}
                    className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-1"
                  >
                    <span>More in {categoryHub.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedArticles.map(rel => (
                    <Link
                      key={rel.id}
                      href={getArticlePath(rel.slug)}
                      onClick={() => onSelectArticle?.(rel)}
                      className="group p-4 rounded-xl border border-stone-200 bg-[#FAF9F6] hover:bg-white hover:border-blue-900 transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                          {getCategoryHubByName(rel.category).name}
                        </span>
                        <h3 className="text-sm font-serif font-bold text-stone-900 group-hover:text-blue-900 mt-1 line-clamp-2">
                          {rel.title}
                        </h3>
                      </div>
                      <span className="text-xs text-stone-500 font-mono">
                        {rel.readTimeMinutes} min read
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            {sidebarAd && <AdBanner slot={sidebarAd} />}

            <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-3 text-xs text-stone-600">
              <h3 className="font-serif font-bold text-base text-stone-900">
                Editorial &amp; Corrections Policy
              </h3>
              <p className="leading-relaxed">
                Every EIRVAN article attributes claims to primary sources and undergoes named human editorial review prior to publication.
              </p>
              <div className="pt-2 flex flex-wrap gap-3 font-medium">
                <Link href="/editorial-policy" className="text-blue-900 hover:underline">
                  Editorial Policy
                </Link>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <Link href="/corrections-policy" className="text-blue-900 hover:underline">
                  Report an Erratum
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

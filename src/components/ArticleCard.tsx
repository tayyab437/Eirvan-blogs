import React from 'react';
import { Bookmark, ArrowUpRight } from 'lucide-react';
import { Article } from '../types/blog';
import { Link, getArticlePath, getCategoryPath } from '../utils/router';
import { getAuthorByName } from '../data/authors';
import { getCategoryHubByName } from '../data/categories';
import { ResponsiveImage } from './ResponsiveImage';

interface ArticleCardProps {
  article: Article;
  variant?: 'lead' | 'secondary' | 'compact';
  priority?: boolean;
  onSelect: (article: Article) => void;
  onToggleBookmark?: (articleId: string) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'secondary',
  priority = false,
  onSelect,
  onToggleBookmark
}) => {
  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const articleUrl = getArticlePath(article.slug);
  const categoryHub = getCategoryHubByName(article.category);
  const categoryUrl = getCategoryPath(categoryHub.name);
  const authorProfile = getAuthorByName(article.author.name);
  const authorSlug = article.author.slug || authorProfile.slug;

  // TIER 1: LEAD HERO STORY
  if (variant === 'lead') {
    return (
      <article className="group rounded-2xl border border-stone-200 bg-white overflow-hidden transition-shadow hover:shadow-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <Link
            href={articleUrl}
            onClick={() => onSelect(article)}
            className="lg:col-span-7 relative aspect-16/9 lg:aspect-auto lg:min-h-[400px] overflow-hidden bg-stone-100 block"
          >
            <ResponsiveImage
              src={article.featuredImage}
              alt={article.imageAlt || article.title}
              width={1200}
              height={675}
              sizes="(max-width: 1024px) 100vw, 60vw"
              preferredWidth={800}
              priority
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {onToggleBookmark && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleBookmark(article.id);
                }}
                aria-label={article.isBookmarked ? 'Remove bookmark' : 'Save article'}
                className={`absolute top-4 right-4 p-2.5 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                  article.isBookmarked
                    ? 'bg-blue-900 text-white'
                    : 'bg-white/95 text-stone-800 hover:text-blue-900'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${article.isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            )}
          </Link>

          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Zero-pill quiet editorial metadata */}
              <div className="flex items-center flex-wrap gap-2 text-xs text-stone-500 mb-3 font-medium">
                <Link
                  href={categoryUrl}
                  className="text-blue-900 font-semibold uppercase tracking-wider hover:underline"
                >
                  {categoryHub.name}
                </Link>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>{formattedDate}</span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="font-mono tabular-nums">{article.readTimeMinutes} min read</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors leading-[1.2] text-balance">
                <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
                  {article.title}
                </Link>
              </h2>

              <p className="mt-4 text-stone-600 text-sm sm:text-base leading-relaxed line-clamp-4">
                {article.summary}
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-stone-100 flex items-center justify-between gap-4">
              <Link
                href={`/author/${authorSlug}`}
                className="flex items-center gap-3 group/author min-w-0"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-200 shrink-0">
                  <ResponsiveImage
                    src={authorProfile.avatar}
                    alt={authorProfile.name}
                    width={160}
                    height={160}
                    sizes="40px"
                    preferredWidth={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs min-w-0">
                  <span className="font-semibold text-stone-900 block group-hover/author:text-blue-900 truncate">
                    {article.author.name}
                  </span>
                  <span className="text-stone-500 block truncate">
                    {article.author.role}
                  </span>
                </div>
              </Link>

              <Link
                href={articleUrl}
                onClick={() => onSelect(article)}
                aria-label={`Read full article: ${article.title}`}
                className="px-3.5 py-2 rounded-lg bg-stone-900 text-white hover:bg-blue-900 transition-colors inline-flex items-center gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap"
              >
                <span>Read</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // TIER 2: SECONDARY FEATURE CARD
  if (variant === 'secondary') {
    return (
      <article className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white overflow-hidden transition-shadow hover:shadow-md">
        <div>
          <Link
            href={articleUrl}
            onClick={() => onSelect(article)}
            className="relative aspect-16/10 overflow-hidden bg-stone-100 block"
          >
            <ResponsiveImage
              src={article.featuredImage}
              alt={article.imageAlt || article.title}
              width={800}
              height={500}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
              preferredWidth={800}
              priority={priority}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />

            {onToggleBookmark && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleBookmark(article.id);
                }}
                aria-label={article.isBookmarked ? 'Remove bookmark' : 'Save article'}
                className={`absolute top-3 right-3 p-2 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  article.isBookmarked
                    ? 'bg-blue-900 text-white'
                    : 'bg-white/95 text-stone-800 hover:text-blue-900'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${article.isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            )}
          </Link>

          <div className="p-6">
            <div className="flex items-center flex-wrap gap-1.5 text-xs text-stone-500 mb-2 font-medium">
              <Link
                href={categoryUrl}
                className="font-semibold text-blue-900 uppercase tracking-wider hover:underline"
              >
                {categoryHub.name}
              </Link>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>{formattedDate}</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className="font-mono tabular-nums">{article.readTimeMinutes}m</span>
            </div>

            <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors leading-snug line-clamp-2">
              <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
                {article.title}
              </Link>
            </h3>

            <p className="mt-2.5 text-stone-600 text-sm leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-stone-100 flex items-center justify-between">
          <Link
            href={`/author/${authorSlug}`}
            className="flex items-center gap-2 group/author min-w-0"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-stone-200 shrink-0">
              <ResponsiveImage
                src={authorProfile.avatar}
                alt={authorProfile.name}
                width={160}
                height={160}
                sizes="28px"
                preferredWidth={160}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs text-stone-700 font-medium truncate max-w-[160px] group-hover/author:text-blue-900">
              {article.author.name}
            </span>
          </Link>

          <Link
            href={articleUrl}
            onClick={() => onSelect(article)}
            aria-label={`Read full story: ${article.title}`}
            className="p-2 rounded-lg text-stone-700 hover:bg-stone-100 hover:text-blue-900 transition-colors flex items-center justify-center"
          >
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    );
  }

  // TIER 3: COMPACT ARCHIVE ROW
  return (
    <article className="group p-4 sm:p-5 hover:bg-stone-50 transition-colors flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1 font-medium">
          <Link
            href={categoryUrl}
            className="font-semibold text-blue-900 uppercase tracking-wider hover:underline"
          >
            {categoryHub.name}
          </Link>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>{formattedDate}</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="font-mono tabular-nums">{article.readTimeMinutes}m</span>
        </div>
        <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors leading-snug line-clamp-1">
          <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
            {article.title}
          </Link>
        </h3>
      </div>

      <Link
        href={articleUrl}
        onClick={() => onSelect(article)}
        aria-label={`Read full story: ${article.title}`}
        className="p-2 rounded-lg text-stone-600 hover:bg-white hover:text-blue-900 border border-transparent hover:border-stone-200 transition-colors shrink-0"
      >
        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </article>
  );
};

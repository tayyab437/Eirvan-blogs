import React, { useState } from 'react';
import { Clock, Eye, Bookmark, Flame, ThumbsUp, Lightbulb, ArrowUpRight } from 'lucide-react';
import { Article } from '../types/blog';
import { getOptimizedImageUrl } from '../utils/seo';
import { Link } from '../utils/router';
import { getAuthorByName } from '../data/authors';

interface ArticleCardProps {
  article: Article;
  variant?: 'lead' | 'secondary' | 'compact';
  onSelect: (article: Article) => void;
  onPreviewSERP?: (article: Article) => void;
  onToggleBookmark?: (articleId: string) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'secondary',
  onSelect,
  onPreviewSERP,
  onToggleBookmark
}) => {
  const [imageError, setImageError] = useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const articleUrl = `/article/${article.slug}`;
  const authorProfile = getAuthorByName(article.author.name);
  const authorSlug = article.author.slug || authorProfile.slug;

  // TIER 1: LEAD HERO STORY (Broad, Cool, Amazing)
  if (variant === 'lead') {
    return (
      <article className="group relative rounded-3xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Broad Image Container */}
          <Link
            href={articleUrl}
            onClick={() => onSelect(article)}
            className="lg:col-span-7 relative h-72 sm:h-96 lg:h-full min-h-[380px] overflow-hidden bg-slate-100 block"
          >
            {!imageError ? (
              <img
                src={getOptimizedImageUrl(article.featuredImage, 650, 70)}
                alt={article.imageAlt || article.title}
                width={1200}
                height={800}
                fetchPriority="high"
                decoding="sync"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-900 font-serif text-xl">
                {article.title}
              </div>
            )}
            
            {/* Subtle Cool Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent lg:opacity-70" />
            
            {/* Top Label */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-white/90 drop-shadow-sm">
                Lead Editorial Briefing
              </span>
            </div>

            {/* Quick Bookmark Trigger */}
            {onToggleBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleBookmark(article.id);
                }}
                className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all shadow-sm cursor-pointer ${
                  article.isBookmarked
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-blue-600'
                }`}
                title="Save story"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
            )}
          </Link>

          {/* Lead Content Column */}
          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Category & Meta with Proper Category Link */}
              <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-500 mb-3 tracking-wide">
                <Link
                  href={`/category/${article.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="text-blue-600 font-bold uppercase tracking-wider hover:underline"
                >
                  {article.category}
                </Link>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{formattedDate}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-slate-600 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {article.readTimeMinutes}m read
                </span>
              </div>

              {/* Catchy Headline with Link */}
              <h2 className="text-2xl sm:text-3xl lg:text-3xl font-serif font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-[1.2] tracking-tight text-balance">
                <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
                  {article.title}
                </Link>
              </h2>

              {/* Engaging Summary */}
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-4">
                {article.summary}
              </p>

              {/* Subtle Reaction Count Preview */}
              {article.reactions && (
                <div className="mt-5 flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-mono tabular-nums">{article.reactions.helpful}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-200">·</span>
                  <span className="flex items-center gap-1 text-slate-600 hover:text-amber-600 transition-colors">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono tabular-nums">{article.reactions.fire}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-200">·</span>
                  <span className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-mono tabular-nums">{article.reactions.insightful}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Author Footer & SERP Diagnostic Trigger */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/author/${authorSlug}`}
                className="flex items-center gap-3 group/author transition-opacity hover:opacity-90"
                title={`View ${article.author.name}'s profile and articles`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                  {authorProfile.avatar && authorProfile.avatar.startsWith('http') ? (
                    <img src={authorProfile.avatar} alt={article.author.name} className="w-full h-full object-cover" />
                  ) : (
                    article.author.name[0]
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block group-hover/author:text-blue-600 transition-colors">
                    {article.author.name}
                  </span>
                  <span className="text-slate-400 text-[11px] block truncate max-w-[140px]">
                    {article.author.role}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href={articleUrl}
                  onClick={() => onSelect(article)}
                  aria-label={`Read full story: ${article.title}`}
                  className="p-2 rounded-full bg-slate-900 text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">Read full story: {article.title}</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </article>
    );
  }

  // TIER 2: SECONDARY FEATURES (Cool, Modern Cards)
  if (variant === 'secondary') {
    return (
      <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200">
        <div>
          {/* Card Image */}
          <Link
            href={articleUrl}
            onClick={() => onSelect(article)}
            className="relative aspect-16/10 overflow-hidden bg-slate-100 block"
          >
            {!imageError ? (
              <img
                src={getOptimizedImageUrl(article.featuredImage, 450, 65)}
                alt={article.imageAlt || article.title}
                width={800}
                height={500}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 bg-blue-50 text-blue-900 font-serif text-sm">
                {article.title}
              </div>
            )}

            {/* Quick Bookmark Button */}
            {onToggleBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleBookmark(article.id);
                }}
                aria-label={article.isBookmarked ? "Remove bookmark" : "Bookmark story"}
                className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                  article.isBookmarked
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-blue-600'
                }`}
                title="Save story"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span className="sr-only">{article.isBookmarked ? "Remove bookmark" : "Bookmark story"}</span>
              </button>
            )}
          </Link>

          {/* Card Body */}
          <div className="p-6">
            <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 mb-2 font-medium">
              <Link
                href={`/category/${article.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="font-bold text-blue-600 uppercase tracking-wider hover:underline"
              >
                {article.category}
              </Link>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{formattedDate}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-slate-500">{article.readTimeMinutes}m read</span>
            </div>

            <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
              <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
                {article.title}
              </Link>
            </h3>

            <p className="mt-2.5 text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link
            href={`/author/${authorSlug}`}
            className="flex items-center gap-2 group/author hover:opacity-90 transition-opacity"
            title={`View ${article.author.name}'s profile`}
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold flex items-center justify-center overflow-hidden">
              {authorProfile.avatar && authorProfile.avatar.startsWith('http') ? (
                <img src={authorProfile.avatar} alt={article.author.name} className="w-full h-full object-cover" />
              ) : (
                article.author.name[0]
              )}
            </div>
            <span className="text-xs text-slate-600 font-semibold truncate max-w-[120px] group-hover/author:text-blue-600 transition-colors">
              {article.author.name}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={articleUrl}
              onClick={() => onSelect(article)}
              aria-label={`Read full story: ${article.title}`}
              className="p-1.5 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center"
            >
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Read full story: {article.title}</span>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // TIER 3: COMPACT ENGAGING ROW
  return (
    <article className="group p-4 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-md transition-all flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
          <Link
            href={`/category/${article.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className="font-bold text-blue-600 uppercase tracking-wider hover:underline"
          >
            {article.category}
          </Link>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{formattedDate}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-mono">{article.readTimeMinutes}m</span>
        </div>
        <h4 className="text-base font-serif font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-1">
          <Link href={articleUrl} onClick={() => onSelect(article)} className="hover:underline">
            {article.title}
          </Link>
        </h4>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={articleUrl}
          onClick={() => onSelect(article)}
          className="p-2 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
};

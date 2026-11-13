import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, BookOpen } from 'lucide-react';
import { Article } from '../types/blog';
import { CategoryHubConfig } from '../types/blog';
import { ArticleCard } from './ArticleCard';
import { Link, getCategoryPath } from '../utils/router';

interface CategoryHubPageProps {
  hub: CategoryHubConfig;
  articles: Article[];
  currentPage: number;
  pageSize?: number;
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (articleId: string) => void;
}

export const CategoryHubPage: React.FC<CategoryHubPageProps> = ({
  hub,
  articles,
  currentPage,
  pageSize = 6,
  onSelectArticle,
  onToggleBookmark
}) => {
  const [selectedCluster, setSelectedCluster] = useState<string>('all');

  const filtered = useMemo(() => {
    if (selectedCluster === 'all') return articles;
    return articles.filter(
      a =>
        (a.topicCluster || '').toLowerCase() === selectedCluster.toLowerCase() ||
        a.tags.some(t => t.toLowerCase().includes(selectedCluster.toLowerCase()))
    );
  }, [articles, selectedCluster]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedArticles = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="bg-[#FAF9F6] text-stone-900 min-h-screen">
      {/* Breadcrumb Bar */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" className="hover:text-blue-900 transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-900">{hub.name}</span>
          </nav>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-stone-600 hover:text-blue-900 font-medium transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>All Sections</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        {/* Category Hub Header */}
        <header className="border-b border-stone-200 pb-8 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            {hub.kicker}
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
            {hub.name}: {hub.headline}
          </h1>
          <p className="text-base sm:text-lg text-stone-600 max-w-3xl leading-relaxed">
            {hub.description}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500 font-mono">
            <span>Pillar Focus: {hub.pillarTopic}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{articles.length} Published Briefings</span>
          </div>

          {/* Interactive Cluster Filters */}
          <div className="pt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by topic cluster">
            <button
              type="button"
              onClick={() => setSelectedCluster('all')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
                selectedCluster === 'all'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              All {hub.name} ({articles.length})
            </button>
            {hub.clusters.map(cluster => (
              <button
                key={cluster}
                type="button"
                onClick={() => setSelectedCluster(cluster)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap min-h-[40px] ${
                  selectedCluster === cluster
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
              >
                {cluster}
              </button>
            ))}
          </div>
        </header>

        {/* Articles Grid */}
        {pagedArticles.length > 0 ? (
          <section aria-label={`${hub.name} Articles`} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedArticles.map((art, idx) => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  variant="secondary"
                  priority={idx === 0}
                  onSelect={onSelectArticle}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>

            {/* Real Anchor Pagination Links for Crawlers */}
            {totalPages > 1 && (
              <nav aria-label="Category pagination" className="pt-6 border-t border-stone-200 flex items-center justify-between text-xs font-medium">
                <div>
                  {safePage > 1 ? (
                    <Link
                      href={getCategoryPath(hub.name, safePage - 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 hover:border-blue-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Previous Page</span>
                    </Link>
                  ) : (
                    <span className="text-stone-400">Page 1 of {totalPages}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Link
                      key={p}
                      href={getCategoryPath(hub.name, p)}
                      aria-current={p === safePage ? 'page' : undefined}
                      className={`px-3 py-2 rounded-lg tabular-nums ${
                        p === safePage
                          ? 'bg-stone-900 text-white font-semibold'
                          : 'bg-white border border-stone-200 text-stone-700 hover:border-blue-900'
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>

                <div>
                  {safePage < totalPages && (
                    <Link
                      href={getCategoryPath(hub.name, safePage + 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 hover:border-blue-900"
                    >
                      <span>Next Page</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </section>
        ) : (
          <div className="p-12 bg-white border border-stone-200 rounded-xl text-center space-y-3">
            <BookOpen className="w-7 h-7 text-stone-400 mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-serif font-semibold text-stone-900">
              No articles matched the "{selectedCluster}" filter
            </h2>
            <button
              type="button"
              onClick={() => setSelectedCluster('all')}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg cursor-pointer"
            >
              Show All {hub.name} Articles
            </button>
          </div>
        )}

        {/* Category FAQs */}
        {hub.faqs.length > 0 && (
          <section aria-label={`${hub.name} Scope and Standards`} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="border-b border-stone-100 pb-3">
              <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
                Editorial Desk Notes
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1">
                About {hub.name} Coverage
              </h2>
            </div>
            <div className="space-y-3">
              {hub.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group border border-stone-200 rounded-xl p-4 open:bg-stone-50"
                >
                  <summary className="flex items-center justify-between gap-4 font-serif font-semibold text-stone-900 cursor-pointer list-none">
                    <span>{faq.question}</span>
                    <ChevronDown className="w-4 h-4 text-stone-500 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CategoryHubPage;

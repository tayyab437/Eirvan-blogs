import React from 'react';
import {
  MapPin,
  GraduationCap,
  Building,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { AuthorProfile } from '../types/author';
import { Article } from '../types/blog';
import { ArticleCard } from './ArticleCard';
import { Link } from '../utils/router';
import { ResponsiveImage } from './ResponsiveImage';

interface AuthorProfilePageProps {
  author: AuthorProfile;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string) => void;
  onGoHome: () => void;
}

export const AuthorProfilePage: React.FC<AuthorProfilePageProps> = ({
  author,
  articles,
  onSelectArticle,
  onToggleBookmark,
  onGoHome
}) => {
  const authorArticles = articles.filter(a => {
    if (a.author?.slug === author.slug) return true;
    const authorNorm = author.name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
    const artAuthorNorm = (a.author?.name || '').toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
    return artAuthorNorm.includes(authorNorm) || authorNorm.includes(artAuthorNorm);
  });

  const totalReadTime = authorArticles.reduce((acc, curr) => acc + (curr.readTimeMinutes || 5), 0);
  const citedSourceCount = authorArticles.reduce((acc, curr) => acc + (curr.sources?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-20">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" onClick={onGoHome} className="hover:text-blue-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/about" className="hover:text-blue-900">
              Masthead
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-900 font-semibold">{author.name}</span>
          </nav>

          <Link
            href="/"
            onClick={onGoHome}
            className="flex items-center gap-1.5 text-stone-600 hover:text-blue-900 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
              <ResponsiveImage
                src={author.avatar}
                alt={author.name}
                width={400}
                height={400}
                sizes="128px"
                preferredWidth={400}
                priority
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-500 uppercase tracking-wider">
                <span>{author.department}</span>
                <span aria-hidden="true">·</span>
                <span>EIRVAN Masthead</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
                  {author.name}
                </h1>
                <p className="text-sm sm:text-base font-medium text-stone-600 mt-1">
                  {author.role}
                </p>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed max-w-3xl">
                {author.bio}
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-stone-500 font-mono">
                {author.institution && (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                    <span>{author.institution}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                  <span>{author.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                  <span>{author.education}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span className="font-mono uppercase text-stone-500">Focus:</span>
                {author.expertise.map((exp, i) => (
                  <React.Fragment key={exp}>
                    {i > 0 && <span aria-hidden="true" className="text-stone-300">·</span>}
                    <span className="font-medium text-stone-800">{exp}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Verifiable Catalog Metrics Strip (no fabricated readership numbers) */}
          <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                Published Briefings
              </span>
              <span className="text-2xl font-serif font-bold text-stone-900 tabular-nums mt-1 block">
                {authorArticles.length}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                Primary Citations
              </span>
              <span className="text-2xl font-serif font-bold text-stone-900 tabular-nums mt-1 block">
                {citedSourceCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                Combined Depth
              </span>
              <span className="text-2xl font-serif font-bold text-stone-900 tabular-nums mt-1 block">
                {totalReadTime} min
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                Editorial Desk
              </span>
              <span className="text-lg font-serif font-bold text-blue-900 mt-1 block truncate">
                {author.department}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 mb-6 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-900" aria-hidden="true" />
          <h2 className="text-2xl font-serif font-bold text-stone-900">
            Articles by {author.name}
          </h2>
        </div>

        {authorArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onSelect={() => onSelectArticle(article)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
            <h3 className="text-base font-serif font-bold text-stone-900">No published dispatches in archive yet</h3>
            <p className="text-xs text-stone-500">
              Check back soon for upcoming publications from {author.name}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorProfilePage;

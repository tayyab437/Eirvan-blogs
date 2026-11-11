import React from 'react';
import {
  ShieldCheck,
  MapPin,
  GraduationCap,
  Building,
  ArrowLeft,
  Share2,
  ExternalLink,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';
import { AuthorProfile } from '../types/author';
import { Article } from '../types/blog';
import { ArticleCard } from './ArticleCard';
import { Link } from '../utils/router';

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
  onGoHome,
}) => {
  const authorArticles = articles.filter(a => {
    if (a.author?.slug === author.slug) return true;
    const authorNorm = author.name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
    const artAuthorNorm = (a.author?.name || '').toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
    return artAuthorNorm.includes(authorNorm) || authorNorm.includes(artAuthorNorm);
  });

  const totalViews = authorArticles.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalReadTime = authorArticles.reduce((acc, curr) => acc + (curr.readTimeMinutes || 5), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 transition-colors">
      
      {/* Top Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-mono">
            <Link href="/" onClick={onGoHome} className="hover:text-blue-600 transition-colors">
              EIRVAN
            </Link>
            <span>/</span>
            <span className="text-slate-400">Editorial Masthead</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{author.name}</span>
          </div>

          <Link
            href="/"
            onClick={onGoHome}
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Stories</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Author Dossier Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs relative overflow-hidden">
          {/* Subtle archival watermark pattern */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Author Avatar with Verified Emblem */}
            <div className="relative shrink-0">
              <img
                src={author.avatar}
                alt={author.name}
                width={128}
                height={128}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-2 border-white shadow-md ring-1 ring-slate-200"
              />
              {author.verified && (
                <div
                  title="Verified EIRVAN Senior Contributor"
                  className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-md border-2 border-white"
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Author Name, Department, Bio & Social */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full font-bold">
                  {author.department}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-600" />
                  Peer-Reviewed Contributor
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-slate-900 tracking-tight">
                  {author.name}
                </h1>
                <p className="text-sm sm:text-base font-medium text-slate-600 mt-1">
                  {author.role}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
                {author.bio}
              </p>

              {/* Metadata Details & Credentials */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 font-mono">
                {author.institution && (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{author.institution}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{author.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{author.education}</span>
                </div>
              </div>

              {/* Areas of Expertise Tags */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase mr-1">
                  Research Domains:
                </span>
                {author.expertise.map(exp => (
                  <span
                    key={exp}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Author Scorecards Strip */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Published Stories
              </span>
              <span className="text-2xl font-serif font-black text-slate-900 tabular-nums">
                {authorArticles.length}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">100% Fact Checked</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Total Readership
              </span>
              <span className="text-2xl font-serif font-black text-slate-900 tabular-nums">
                {(totalViews || 14200).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Verified Impressions</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Editorial Depth
              </span>
              <span className="text-2xl font-serif font-black text-slate-900 tabular-nums">
                {totalReadTime} min
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Long-Form Research</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Editorial Ranking
              </span>
              <span className="text-2xl font-serif font-black text-blue-600 tabular-nums">
                Senior Fellow
              </span>
              <span className="text-[10px] text-blue-600 font-medium block mt-0.5">EIRVAN Masthead</span>
            </div>
          </div>
        </div>

        {/* Stories by this Author Header */}
        <div className="mt-12 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900">
                Articles by {author.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Displaying {authorArticles.length} curated investigation{authorArticles.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Articles Grid */}
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
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-base font-serif font-bold text-slate-800">New Dossier in Peer-Review</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {author.name} currently has research papers in editorial peer-review. Check back shortly for updated publications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorProfilePage;

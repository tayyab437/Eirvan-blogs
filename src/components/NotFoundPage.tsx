import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link } from '../utils/router';
import { CATEGORY_HUBS } from '../data/categories';

interface NotFoundPageProps {
  onOpenSearch: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onOpenSearch }) => {
  return (
    <section className="min-h-[70vh] bg-[#FAF9F6] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full bg-white border border-stone-200 rounded-2xl p-8 sm:p-12 text-center space-y-6">
        <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
          HTTP 404 · Page Not Found
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">
          We couldn&apos;t locate that dispatch.
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-lg mx-auto">
          The URL may have moved or is no longer published. Search our archive or browse one of our five primary editorial desks below.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Homepage</span>
          </Link>
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 hover:border-blue-900 text-stone-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>Search EIRVAN Archive</span>
          </button>
        </div>

        <div className="pt-6 border-t border-stone-100">
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-3">
            Explore Editorial Sections
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORY_HUBS.map(hub => (
              <Link
                key={hub.slug}
                href={`/category/${hub.slug}`}
                className="px-3.5 py-2 text-xs font-medium bg-stone-50 border border-stone-200 hover:border-blue-900 rounded-lg text-stone-800 transition-colors"
              >
                {hub.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;

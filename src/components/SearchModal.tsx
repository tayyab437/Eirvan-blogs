import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { Article } from '../types/blog';
import { StorageService } from '../services/storage';
import { getCategoryHubByName } from '../data/categories';

interface SearchModalProps {
  articles: Article[];
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  articles,
  isOpen,
  onClose,
  onSelectArticle
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 3) {
      const timer = setTimeout(() => {
        StorageService.recordSearchQuery(trimmed);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [query]);

  if (!isOpen) return null;

  const results = articles.filter(a => {
    const q = query.toLowerCase().trim();
    if (!q) return false;
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.targetKeywords?.some(k => k.toLowerCase().includes(q)) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-stone-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Search EIRVAN Archive"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-5 py-4 border-b border-stone-200 gap-3 bg-[#FAF9F6]">
          <Search className="w-5 h-5 text-blue-900 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id="search-modal-query-input"
            aria-label="Search published articles by title, topic, or keyword"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles across Technology, Business, Lifestyle, Education, News..."
            className="w-full text-sm bg-transparent border-0 focus:outline-hidden text-stone-900 placeholder:text-stone-400 font-medium"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search modal"
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {query.trim() === '' ? (
            <div className="p-6 text-center text-xs text-stone-500 space-y-4">
              <div>
                <span className="block font-semibold text-stone-900 text-sm">
                  Suggested Topic Queries
                </span>
                <p className="text-stone-500 text-xs mt-1">
                  Select a subject below or type any keyword to filter our published briefings.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {['neuromorphic', 'photonic', 'arbitrage', 'ultradian', 'NAD+', 'foundry', 'settlement'].map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-[#FAF9F6] hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-800 transition-colors text-xs font-medium cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            results.map(art => (
              <button
                key={art.id}
                type="button"
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="w-full text-left group p-3.5 rounded-xl hover:bg-[#FAF9F6] border border-transparent hover:border-stone-200 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                    <span className="text-blue-900 font-semibold uppercase tracking-wider">
                      {getCategoryHubByName(art.category).name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{art.readTimeMinutes}m</span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-stone-900 group-hover:text-blue-900 transition-colors mt-0.5 line-clamp-1">
                    {art.title}
                  </h4>
                  <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">
                    {art.summary}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-blue-900 shrink-0" aria-hidden="true" />
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-stone-500">
              No published articles matched &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

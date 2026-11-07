import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { Article } from '../types/blog';

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-slate-200 gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trending topics, questions, or target keywords..."
            className="w-full text-sm bg-transparent border-0 focus:outline-hidden text-slate-900 placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <span className="block font-bold text-slate-800 text-sm mb-1">
                Trending Search Inquiries
              </span>
              <p className="text-slate-400 text-xs mb-4">
                Popular queries driving algorithmic ranking traffic this week
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {['neuromorphic computing', 'algorithmic arbitrage', '90-minute ultradian sprint', 'NAD+ longevity trials', 'quantum annealing'].map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-slate-200 rounded-full text-slate-700 transition-colors text-xs font-medium cursor-pointer"
                  >
                    "{term}"
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            results.map(art => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="group p-3.5 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-blue-600 uppercase tracking-wider font-bold">
                    <span>{art.category}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-slate-400 font-mono flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {art.readTimeMinutes}m read
                    </span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5 line-clamp-1">
                    {art.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {art.summary}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching editorial publications found for "{query}".
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

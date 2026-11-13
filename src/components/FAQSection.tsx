import React, { useState, useMemo } from 'react';
import { HelpCircle, Search, ChevronDown, ArrowRight } from 'lucide-react';
import { Article, FAQItem } from '../types/blog';
import { CATEGORY_HUBS, getCategoryHubByName } from '../data/categories';
import { Link, getArticlePath } from '../utils/router';

interface ExtendedFAQItem extends FAQItem {
  category: string;
  articleId?: string;
  articleSlug?: string;
  articleTitle?: string;
}

interface FAQSectionProps {
  articles: Article[];
  onSelectArticle?: (article: Article) => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ articles, onSelectArticle }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const allFaqs = useMemo<ExtendedFAQItem[]>(() => {
    const list: ExtendedFAQItem[] = [];
    articles.forEach(art => {
      const canonicalCat = getCategoryHubByName(art.category).name;
      if (art.faqs && art.faqs.length > 0) {
        art.faqs.slice(0, 2).forEach(faq => {
          list.push({
            question: faq.question,
            answer: faq.answer,
            category: canonicalCat,
            articleId: art.id,
            articleSlug: art.slug,
            articleTitle: art.title
          });
        });
      }
    });
    return list;
  }, [articles]);

  const categories = [
    { label: 'All Topics', value: 'all', count: allFaqs.length },
    ...CATEGORY_HUBS.map(hub => ({
      label: hub.shortLabel,
      value: hub.name,
      count: allFaqs.filter(f => f.category === hub.name).length
    }))
  ];

  const filteredFaqs = useMemo(() => {
    return allFaqs.filter(faq => {
      const matchesCat = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allFaqs, activeCategory, searchQuery]);

  return (
    <section
      id="faq-knowledge-hub"
      aria-label="Frequently Asked Questions & Reference Answers"
      className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-8 lg:p-10 space-y-6"
    >
      <div className="pb-5 border-b border-stone-100">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-1">
            Quick Reference
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-1.5 text-sm text-stone-600 max-w-2xl leading-relaxed">
            Direct answers drawn from EIRVAN&apos;s published reporting across Technology, Business, Lifestyle, Education, and News.
          </p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="text"
            aria-label="Filter reference questions"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter questions..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
          />
        </div>

        <div className="lg:col-span-8 flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {categories.map(cat => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.value);
                  setOpenIndex(0);
                }}
                className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  isActive
                    ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                    : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="p-8 text-center bg-[#FAF9F6] rounded-xl border border-stone-200 text-stone-600 space-y-2">
          <HelpCircle className="w-6 h-6 text-stone-400 mx-auto" aria-hidden="true" />
          <p className="text-sm">No matching reference questions found.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="text-xs text-blue-900 hover:underline font-semibold cursor-pointer"
          >
            Show All Questions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.slice(0, 8).map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={`${faq.articleId || 'faq'}-${idx}`}
                className={`rounded-xl border transition-colors overflow-hidden ${
                  isOpen ? 'bg-white border-stone-400' : 'bg-[#FAF9F6] border-stone-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                      {faq.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 leading-snug">
                      {faq.question}
                    </h3>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-stone-500 transition-transform duration-200 shrink-0 mt-1 ${
                      isOpen ? 'rotate-180 text-blue-900' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-stone-100 space-y-3">
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.articleSlug && (
                      <div>
                        <Link
                          href={getArticlePath(faq.articleSlug)}
                          onClick={() => {
                            const match = articles.find(a => a.id === faq.articleId);
                            if (match && onSelectArticle) onSelectArticle(match);
                          }}
                          className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Read: {faq.articleTitle || 'Full Briefing'}</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

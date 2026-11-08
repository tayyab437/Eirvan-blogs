import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ArrowRight,
  Code2,
  Check,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Sparkles
} from 'lucide-react';
import { Article, FAQItem } from '../types/blog';

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
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default
  const [showSchemaCode, setShowSchemaCode] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, 'yes' | 'no'>>({});
  const [copiedFaqIndex, setCopiedFaqIndex] = useState<number | null>(null);

  // Compile all FAQs dynamically from articles
  const allFaqs = useMemo<ExtendedFAQItem[]>(() => {
    const list: ExtendedFAQItem[] = [];
    articles.forEach(art => {
      if (art.faqs && art.faqs.length > 0) {
        art.faqs.forEach(faq => {
          list.push({
            question: faq.question,
            answer: faq.answer,
            category: art.category,
            articleId: art.id,
            articleSlug: art.slug,
            articleTitle: art.title
          });
        });
      }
    });

    if (list.length === 0) {
      return [
        {
          question: 'What is neuromorphic silicon and how does it bypass von Neumann limits?',
          answer: 'Neuromorphic dies operate at sub-threshold voltages using analog memristor conductances to mimic biological dendrites, performing in-memory compute at up to 140 tera-operations per watt with zero copper bus latency.',
          category: 'Technology & AI'
        },
        {
          question: 'How do dark pools match institutional trades without price impact?',
          answer: 'Through crossing networks that execute mid-point trades without pre-trade quotation feeds, routing mega-orders in stochastic micro-lots across private liquidity venues.',
          category: 'Global Markets & Finance'
        },
        {
          question: 'What is the biological mechanism behind 90-minute ultradian cognitive cycles?',
          answer: 'Human wakefulness oscillates in ~90-minute Basic Rest-Activity Cycles (BRAC) governed by hypothalamic neurotransmitter rhythms and prefrontal ATP replenishment.',
          category: 'Productivity & Mindset'
        },
        {
          question: 'Does NAD+ supplementation reverse human vascular stiffness in clinical trials?',
          answer: 'Recent human Phase II randomized trials demonstrated a 19.4% reduction in arterial pulse wave velocity and muscle satellite cell regeneration over a 180-day protocol.',
          category: 'Biotech & Longevity'
        }
      ];
    }

    return list;
  }, [articles]);

  const categories = [
    { label: 'All Questions', value: 'all', count: allFaqs.length },
    { label: 'Tech & AI', value: 'Technology & AI', count: allFaqs.filter(f => f.category === 'Technology & AI').length },
    { label: 'Global Markets', value: 'Global Markets & Finance', count: allFaqs.filter(f => f.category === 'Global Markets & Finance').length },
    { label: 'Deep Work', value: 'Productivity & Mindset', count: allFaqs.filter(f => f.category === 'Productivity & Mindset').length },
    { label: 'Biotech & Longevity', value: 'Biotech & Longevity', count: allFaqs.filter(f => f.category === 'Biotech & Longevity').length },
  ];

  // Filter FAQs based on active category and search query
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

  // Generate Schema.org JSON-LD FAQPage string dynamically
  const schemaJsonLd = useMemo(() => {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': filteredFaqs.map(f => ({
        '@type': 'Question',
        'name': f.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.answer
        }
      }))
    };
    return JSON.stringify(faqSchema, null, 2);
  }, [filteredFaqs]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaJsonLd);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleCopyFaqAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedFaqIndex(index);
    setTimeout(() => setCopiedFaqIndex(null), 2000);
  };

  const handleVote = (questionKey: string, vote: 'yes' | 'no') => {
    setHelpfulVotes(prev => ({ ...prev, [questionKey]: vote }));
  };

  return (
    <section
      id="faq-knowledge-hub"
      aria-label="Frequently Asked Questions & Answers"
      className="rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 sm:p-8 lg:p-10 space-y-8"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-blue-600 font-bold block mb-1">
            EIRVAN Editorial Briefings
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Concise, evidence-based answers to key inquiries across deep technology, quantitative finance, cognitive ergonomics, and cellular biology.
          </p>
        </div>

        {/* Developer Schema Toggle */}
        <button
          onClick={() => setShowSchemaCode(prev => !prev)}
          className="text-xs font-mono font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Code2 className="w-4 h-4 text-blue-500" />
          <span>{showSchemaCode ? 'Hide JSON-LD' : 'Schema.org JSON-LD'}</span>
        </button>
      </div>

      {/* Collapsible Developer Schema Inspector View */}
      {showSchemaCode && (
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span>Schema.org FAQPage Structured Data Snippet</span>
            <button
              onClick={handleCopySchema}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
            >
              {copiedSchema ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950 rounded-xl text-[11px] font-mono overflow-x-auto max-h-52 leading-relaxed text-slate-300 border border-slate-800">
            <code>{`<script type="application/ld+json">\n${schemaJsonLd}\n</script>`}</code>
          </pre>
        </div>
      )}

      {/* Control Bar: Search & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Search Bar */}
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 focus:border-blue-500 focus:bg-white rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70 text-xs font-semibold">
          {categories.map(cat => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => {
                  setActiveCategory(cat.value);
                  setOpenIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-blue-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Accordion Container */}
      {filteredFaqs.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-500 space-y-2">
          <HelpCircle className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-sm font-medium">No questions matching "{searchQuery}" in this channel.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
          >
            Show All Questions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const voteState = helpfulVotes[faq.question];

            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white border-blue-200 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/10'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Question Header */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer focus:outline-hidden"
                >
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="text-blue-600 font-bold uppercase tracking-wider text-[11px]">
                        {faq.category}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-400 text-[11px] font-mono">Verified Briefing</span>
                    </div>

                    <h3 className={`text-base sm:text-lg font-serif font-bold transition-colors leading-snug ${
                      isOpen ? 'text-blue-600' : 'text-slate-900'
                    }`}>
                      {faq.question}
                    </h3>
                  </div>

                  <div className={`p-2 rounded-full transition-all shrink-0 mt-0.5 ${
                    isOpen ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                  </div>
                </button>

                {/* Answer Content */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                      {faq.answer}
                    </p>

                    {/* Utility Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                      
                      {/* Deep-link to Article */}
                      {faq.articleId && onSelectArticle ? (
                        <button
                          onClick={() => {
                            const match = articles.find(a => a.id === faq.articleId);
                            if (match) onSelectArticle(match);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Read full article</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-4 text-slate-400">
                        {/* Copy Answer */}
                        <button
                          onClick={() => handleCopyFaqAnswer(faq.answer, idx)}
                          className="hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                          title="Copy answer"
                        >
                          {copiedFaqIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>

                        <span className="text-slate-200">|</span>

                        {/* Was this helpful */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Was this helpful?</span>
                          <button
                            onClick={() => handleVote(faq.question, 'yes')}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              voteState === 'yes' ? 'bg-emerald-50 text-emerald-600 font-bold' : 'hover:text-slate-700'
                            }`}
                            title="Yes"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleVote(faq.question, 'no')}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              voteState === 'no' ? 'bg-rose-50 text-rose-600 font-bold' : 'hover:text-slate-700'
                            }`}
                            title="No"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
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

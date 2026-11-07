import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Share2,
  Eye,
  Check,
  ChevronDown,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Bookmark,
  ThumbsUp,
  Flame,
  Lightbulb,
  Copy,
  Sparkles,
  Type
} from 'lucide-react';
import { Article, AdSlotConfig } from '../types/blog';
import { updateHeadSEO } from '../utils/seo';
import { StorageService } from '../services/storage';
import { AdBanner } from './AdBanner';

interface ArticleViewProps {
  article: Article;
  adSlots: AdSlotConfig[];
  onBack: () => void;
  onPreviewSERP: (article: Article) => void;
  onToggleBookmark: (articleId: string) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  adSlots,
  onBack,
  onPreviewSERP,
  onToggleBookmark
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<'1.0x' | '1.5x'>('1.0x');
  
  // Local reactions
  const [reactions, setReactions] = useState(article.reactions || { helpful: 140, fire: 85, insightful: 210 });
  const [userVoted, setUserVoted] = useState<string | null>(null);

  const dwellStartTime = useRef(Date.now());
  const maxScrollMilestone = useRef(0);

  // Sync Head metadata and JSON-LD schema
  useEffect(() => {
    updateHeadSEO(article);
    StorageService.recordPageView(article.id);
    window.scrollTo({ top: 0, behavior: 'instant' });

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const currentScroll = window.scrollY;
      const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
      setScrollProgress(progress);

      if (progress >= 25 && maxScrollMilestone.current < 25) maxScrollMilestone.current = 25;
      if (progress >= 50 && maxScrollMilestone.current < 50) maxScrollMilestone.current = 50;
      if (progress >= 75 && maxScrollMilestone.current < 75) maxScrollMilestone.current = 75;
      if (progress >= 95 && maxScrollMilestone.current < 100) maxScrollMilestone.current = 100;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      const dwellSeconds = Math.round((Date.now() - dwellStartTime.current) / 1000);
      if (dwellSeconds > 2) {
        const analytics = StorageService.getAnalytics();
        analytics.avgDwellSeconds = Math.round((analytics.avgDwellSeconds + dwellSeconds) / 2);
        StorageService.saveAnalytics(analytics);
      }
    };
  }, [article]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopySummary = () => {
    const text = `📋 Executive Summary: ${article.title}\n\n${article.summary}\n\nRead full analysis at: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleReaction = (type: 'helpful' | 'fire' | 'insightful') => {
    if (userVoted) return;
    const updated = StorageService.recordReaction(article.id, type);
    setReactions(updated);
    setUserVoted(type);
  };

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const inArticleAd = adSlots.find(s => s.type === 'native-card' && s.isEnabled);
  const sidebarAd = adSlots.find(s => s.type === 'rectangle' && s.isEnabled);

  return (
    <div className="relative bg-slate-50 min-h-screen">
      
      {/* Top Gradient Reading Progress Line */}
      <div
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 z-50 origin-left transition-transform duration-75 shadow-xs"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      {/* Broad Content Canvas */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Navigation & Engagement Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Return to Editorial Index</span>
          </button>

          <div className="flex items-center gap-2">
            {/* SERP Diagnostic Trigger */}
            <button
              onClick={() => onPreviewSERP(article)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Google SERP &amp; Schema</span>
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                article.isBookmarked
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600'
              }`}
              title="Bookmark this briefing"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            {/* Font size adjuster */}
            <button
              onClick={() => setFontSize(prev => prev === 'normal' ? 'large' : 'normal')}
              className="p-2 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              title="Toggle reading text size"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Share link button */}
            <button
              onClick={handleShare}
              className="p-2 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              title="Share article"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="mb-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4 font-sans">
            <Sparkles className="w-3 h-3 text-cyan-500" />
            <span>{article.category}</span>
            <span aria-hidden="true" className="text-blue-300">·</span>
            <span>{article.readTimeMinutes} min read</span>
            <span aria-hidden="true" className="text-blue-300">·</span>
            <span>{formattedDate}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-serif font-black text-slate-900 leading-[1.15] tracking-tight text-balance">
            {article.title}
          </h1>

          <p className="mt-6 text-lg sm:text-xl font-sans text-slate-600 leading-relaxed max-w-3xl mx-auto">
            {article.summary}
          </p>

          {/* Author Lockup & Executive Listen Bar */}
          <div className="mt-8 pt-6 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                {article.author.name[0]}
              </div>
              <div className="text-left">
                <span className="font-bold text-sm text-slate-900 block">
                  {article.author.name}
                </span>
                <span className="text-xs text-slate-500 block">
                  {article.author.role}
                </span>
              </div>
            </div>

            {/* Interactive Audio Player Simulation */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-xs">
              <button
                onClick={() => setIsPlayingAudio(prev => !prev)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                title={isPlayingAudio ? 'Pause Audio Briefing' : 'Listen to Audio Briefing'}
              >
                {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPlayingAudio ? 'Playing AI Briefing...' : 'Listen to Audio'}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`w-1 h-2 rounded-full bg-blue-500 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                  <div className={`w-1 h-3 rounded-full bg-indigo-500 ${isPlayingAudio ? 'animate-bounce delay-75' : ''}`} />
                  <div className={`w-1 h-2.5 rounded-full bg-cyan-500 ${isPlayingAudio ? 'animate-bounce delay-150' : ''}`} />
                  <span className="text-[10px] text-slate-400 font-mono ml-1">4:15 min</span>
                </div>
              </div>

              <button
                onClick={() => setAudioPlaybackSpeed(prev => prev === '1.0x' ? '1.5x' : '1.0x')}
                className="ml-1 text-[11px] font-mono font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
              >
                {audioPlaybackSpeed}
              </button>
            </div>
          </div>
        </header>

        {/* Featured Broad Hero Media */}
        <figure className="my-10 rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50">
          <img
            src={article.featuredImage}
            alt={article.imageAlt || article.title}
            referrerPolicy="no-referrer"
            className="w-full aspect-16/9 object-cover"
          />
          <figcaption className="p-4 text-xs text-slate-500 italic text-center font-serif bg-white border-t border-slate-100">
            {article.imageAlt || article.title}
          </figcaption>
        </figure>

        {/* Broad Grid Layout: Main Reading Column + Interactive Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Column */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
            
            {/* 1-Click Copy Key Takeaways Action Box */}
            <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                  Executive Briefing Synopsis
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {article.summary}
                </p>
              </div>
              <button
                onClick={handleCopySummary}
                className="shrink-0 px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    <span>Copy Takeaways</span>
                  </>
                )}
              </button>
            </div>

            {/* Table of Contents Accordion */}
            {article.headings && article.headings.length > 0 && (
              <div className="p-5 mb-8 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 font-sans">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Section Guide (Jump Links)</span>
                </div>
                <nav className="space-y-1.5 text-xs">
                  {article.headings.map(h => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block text-slate-600 hover:text-blue-600 transition-colors ${
                        h.level === 3 ? 'pl-4 text-[11px]' : 'font-semibold'
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Dynamic Prose Body */}
            <div
              className={`prose-content leading-[1.8] text-slate-800 space-y-6 ${
                fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-[17px]'
              }`}
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />

            {/* In-Article Catchy Native Ad Unit */}
            {inArticleAd && (
              <AdBanner slot={inArticleAd} className="my-10" />
            )}

            {/* Interactive Reader Poll & Reactions */}
            <div className="my-10 p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 border border-slate-200 text-center">
              <h4 className="text-base font-serif font-bold text-slate-900 mb-1">
                Did this technical analysis answer your search query?
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Your direct feedback refines our editorial quality and Google Helpful Content score.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleReaction('helpful')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    userVoted === 'helpful'
                      ? 'bg-blue-600 text-white scale-105'
                      : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 text-blue-600" />
                  <span>Helpful</span>
                  <span className="font-mono ml-1 text-slate-500">{reactions.helpful}</span>
                </button>

                <button
                  onClick={() => handleReaction('fire')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    userVoted === 'fire'
                      ? 'bg-amber-500 text-white scale-105'
                      : 'bg-white hover:bg-amber-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Brilliant</span>
                  <span className="font-mono ml-1 text-slate-500">{reactions.fire}</span>
                </button>

                <button
                  onClick={() => handleReaction('insightful')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                    userVoted === 'insightful'
                      ? 'bg-indigo-600 text-white scale-105'
                      : 'bg-white hover:bg-indigo-50 text-slate-800 border border-slate-200'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-indigo-500" />
                  <span>Deep Insight</span>
                  <span className="font-mono ml-1 text-slate-500">{reactions.insightful}</span>
                </button>
              </div>

              {userVoted && (
                <div className="mt-3 text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Thank you for voting! Your reaction has been recorded.</span>
                </div>
              )}
            </div>

            {/* Google FAQPage Rich Snippet Section */}
            {article.faqs && article.faqs.length > 0 && (
              <section className="mt-12 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold tracking-wider uppercase text-blue-700">
                    Frequently Asked Questions
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-black text-slate-900 mb-6">
                  Answers to Trending Questions
                </h3>

                <div className="space-y-3">
                  {article.faqs.map((faq, idx) => (
                    <details
                      key={idx}
                      className="group bg-slate-50 rounded-2xl border border-slate-200 p-4 transition-all open:bg-white open:shadow-md open:border-blue-200"
                    >
                      <summary className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-900 cursor-pointer list-none select-none">
                        <span>{faq.question}</span>
                        <ChevronDown className="w-4 h-4 text-blue-600 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-slate-200 flex items-center flex-wrap gap-2 text-xs text-slate-500">
              <span className="font-bold text-slate-700">Tagged Topics:</span>
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>

          </div>

          {/* Sticky Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            
            {/* Sidebar Ad Unit */}
            {sidebarAd && (
              <AdBanner slot={sidebarAd} />
            )}

            {/* Google SERP Rank Snippet Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Live Google SERP Card
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  Position #1
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs">
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  eirvan.com › {article.slug}
                </div>
                <h5 className="text-xs font-semibold text-blue-700 mt-1 line-clamp-1">
                  {article.metaTitle || article.title}
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {article.metaDescription || article.summary}
                </p>
              </div>

              <button
                onClick={() => onPreviewSERP(article)}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Inspect Full Google Snippet
              </button>
            </div>

            {/* Journalistic Trust Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-900 block font-sans">
                Google Helpful Content Standard
              </span>
              <p className="leading-relaxed text-[11px]">
                This article has been audited for original research, author expertise, Schema.org news structure, and zero cumulative layout shift.
              </p>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
};

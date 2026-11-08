import React, { useState } from 'react';
import { X, Smartphone, Monitor, CheckCircle2, AlertTriangle, XCircle, Code2, Copy, Check } from 'lucide-react';
import { Article } from '../types/blog';
import { auditArticleSEO, generateArticleSchema } from '../utils/seo';

interface SERPPreviewModalProps {
  article: Article;
  onClose: () => void;
}

export const SERPPreviewModal: React.FC<SERPPreviewModalProps> = ({ article, onClose }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'serp' | 'audit' | 'schema'>('serp');
  const [copied, setCopied] = useState(false);

  const audit = auditArticleSEO(article);
  const schemas = generateArticleSchema(article);
  const jsonLdString = JSON.stringify(schemas, null, 2);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(jsonLdString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const domain = 'https://eirvan.com';
  const displayUrl = `${domain} › ${article.category.toLowerCase().replace(/\s+/g, '-')} › ${article.slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-serif font-black text-slate-900">
              Google SERP &amp; SEO Diagnostic Engine
            </h3>
            <p className="text-xs text-slate-500">
              Algorithmic snippet simulation &amp; structured data validator
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('serp')}
              className={`px-3.5 py-1.5 font-bold rounded-full transition-colors cursor-pointer ${
                activeTab === 'serp'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              SERP Preview
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>SEO Audit</span>
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded text-[10px] font-bold">
                {audit.score}/100
              </span>
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 font-bold rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'schema'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON-LD Schema</span>
            </button>
          </div>

          {activeTab === 'serp' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full border border-slate-200">
              <button
                onClick={() => setDevice('desktop')}
                aria-label="Desktop preview"
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  device === 'desktop' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                aria-label="Mobile preview"
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  device === 'mobile' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* TAB 1: SERP Preview */}
          {activeTab === 'serp' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-slate-700">
                <span className="font-bold text-blue-900">Google SERP Snippet Reality:</span>{' '}
                This preview renders using Google's 2026 desktop &amp; mobile search typography specifications (Roboto/Arial rendering engine, 600px pixel width truncation constraint).
              </div>

              {/* SERP Card Container */}
              <div
                className={`mx-auto bg-white p-5 rounded-xl border border-stone-200 shadow-sm text-left transition-all ${
                  device === 'mobile' ? 'max-w-md' : 'max-w-2xl'
                }`}
              >
                {/* Site Brand & Breadcrumb */}
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src="/assets/aistudio/Global_Orbit_E_Icon_346096e1.png"
                    alt="EIRVAN Favicon"
                    width={20}
                    height={20}
                    decoding="async"
                    className="w-5 h-5 rounded-full object-cover shadow-2xs"
                  />
                  <div className="flex flex-col text-xs leading-tight">
                    <span className="font-medium text-stone-900">EIRVAN</span>
                    <span className="text-[11px] text-stone-500 truncate max-w-[280px] sm:max-w-md font-sans">
                      {displayUrl}
                    </span>
                  </div>
                </div>

                {/* Clickable Headline */}
                <h4 className="text-lg sm:text-xl font-normal text-[#1a0dab] hover:underline cursor-pointer leading-snug line-clamp-2">
                  {article.metaTitle || article.title}
                </h4>

                {/* Date + Description */}
                <p className="text-[13px] text-[#4d5156] mt-1.5 leading-relaxed line-clamp-3">
                  <span className="text-stone-500">
                    {new Date(article.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}{' '}
                    —{' '}
                  </span>
                  {article.metaDescription || article.summary}
                </p>

                {/* Rich Snippet Accordions (FAQs) */}
                {article.faqs && article.faqs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                      Google Rich Snippet (FAQPage Schema):
                    </span>
                    {article.faqs.slice(0, 2).map((faq, idx) => (
                      <details
                        key={idx}
                        className="group text-xs text-stone-700 bg-stone-50 rounded-md p-2 cursor-pointer border border-stone-200/50"
                      >
                        <summary className="font-medium text-stone-800 list-none flex items-center justify-between">
                          <span>{faq.question}</span>
                          <span className="text-stone-400 group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <p className="mt-1.5 text-stone-600 pl-1 leading-relaxed">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                )}
              </div>

              {/* Character Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Title Tag Length</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {(article.metaTitle || article.title).length} / 60 chars
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full ${
                        (article.metaTitle || article.title).length > 60
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, ((article.metaTitle || article.title).length / 60) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Desktop Google cutoff is ~60 characters (~580px width).
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Meta Description</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {(article.metaDescription || '').length} / 160 chars
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full ${
                        (article.metaDescription || '').length > 160
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, ((article.metaDescription || '').length / 160) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Optimal range is 130–160 characters for complete CTR visibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Full SEO Audit Checklist */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Google On-Page Ranking Score
                  </h4>
                  <p className="text-xs text-slate-500">
                    Calculated against Core Web Vitals, Schema, and semantic content guidelines.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-serif font-black text-slate-900">
                      {audit.score}
                    </span>
                    <span className="text-xs text-slate-400"> / 100</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-sm shadow-xs">
                    Grade {audit.grade}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {audit.checks.map(chk => (
                  <div
                    key={chk.id}
                    className="p-3.5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      {chk.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {chk.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {chk.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {chk.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                            chk.status === 'pass'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : chk.status === 'warn'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {chk.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        {chk.description}
                      </p>
                      {chk.status !== 'pass' && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                          Fix: {chk.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Schema Inspector */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Schema.org JSON-LD (Auto-injected into &lt;head&gt;)
                </span>
                <button
                  onClick={handleCopySchema}
                  className="px-2.5 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                      <span>Copy JSON-LD</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                <code>{jsonLdString}</code>
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

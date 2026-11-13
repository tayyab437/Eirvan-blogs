import React, { useState } from 'react';
import { X, Smartphone, Monitor, CheckCircle2, AlertTriangle, XCircle, Code2, Copy, Check } from 'lucide-react';
import { Article } from '../types/blog';
import { auditArticleSEO, generateArticleSchema } from '../utils/seo';
import { getCategoryHubByName } from '../data/categories';

interface SERPPreviewModalProps {
  article: Article;
  allArticles?: Article[];
  onClose: () => void;
}

export const SERPPreviewModal: React.FC<SERPPreviewModalProps> = ({ article, allArticles = [], onClose }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'serp' | 'audit' | 'schema'>('serp');
  const [copied, setCopied] = useState(false);

  const audit = auditArticleSEO(article, allArticles);
  const schemas = generateArticleSchema(article);
  const jsonLdString = JSON.stringify(schemas, null, 2);

  const handleCopySchema = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonLdString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const categoryHub = getCategoryHubByName(article.category);
  const displayUrl = `https://eirvan.com › articles › ${article.slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#FAF9F6]">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">
              SERP Snippet, SEO Rules &amp; Structured Data Check
            </h3>
            <p className="text-xs text-stone-500">
              Structural metadata preview and rule-based quality checks for /articles/{article.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-stone-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('serp')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'serp' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Snippet Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>Quality Checks</span>
              <span className="font-mono tabular-nums text-[11px] opacity-85">
                {audit.score}%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'schema' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>JSON-LD Output</span>
            </button>
          </div>

          {activeTab === 'serp' && (
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                aria-label="Desktop preview"
                className={`p-1.5 rounded-md cursor-pointer ${
                  device === 'desktop' ? 'bg-white text-blue-900' : 'text-stone-500'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                aria-label="Mobile preview"
                className={`p-1.5 rounded-md cursor-pointer ${
                  device === 'mobile' ? 'bg-white text-blue-900' : 'text-stone-500'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F6]">
          {activeTab === 'serp' && (
            <div className="space-y-6">
              <div
                className={`mx-auto bg-white p-5 rounded-xl border border-stone-200 text-left transition-all ${
                  device === 'mobile' ? 'max-w-md' : 'max-w-2xl'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src="/favicon-64.png"
                    alt="EIRVAN Favicon"
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <div className="flex flex-col text-xs leading-tight">
                    <span className="font-medium text-stone-900">EIRVAN · {categoryHub.name}</span>
                    <span className="text-[11px] text-stone-500 truncate max-w-[280px] sm:max-w-md">
                      {displayUrl}
                    </span>
                  </div>
                </div>

                <h4 className="text-lg sm:text-xl font-normal text-[#1a0dab] leading-snug line-clamp-2">
                  {article.metaTitle || article.title}
                </h4>

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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-xl border border-stone-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-stone-800">SEO Title Length</span>
                    <span className="font-mono tabular-nums text-stone-900 font-semibold">
                      {(article.metaTitle || article.title).length} / 65 chars
                    </span>
                  </div>
                  <p className="text-stone-500 mt-1">
                    Recommended display window: 35–65 characters.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-stone-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-stone-800">Meta Description Length</span>
                    <span className="font-mono tabular-nums text-stone-900 font-semibold">
                      {(article.metaDescription || '').length} / 160 chars
                    </span>
                  </div>
                  <p className="text-stone-500 mt-1">
                    Recommended summary window: 115–160 characters.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-stone-200">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Editorial &amp; Technical SEO Readiness Checklist
                  </h4>
                  <p className="text-xs text-stone-500">
                    Rule-based structural checks (title/meta uniqueness, heading hierarchy, internal links, sources, review status).
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-2xl font-bold text-stone-900">{audit.score}%</span>
                  <span className="block text-xs text-stone-500">Grade {audit.grade}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {audit.checks.map(chk => (
                  <div
                    key={chk.id}
                    className="p-4 bg-white rounded-xl border border-stone-200 flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      {chk.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />}
                      {chk.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />}
                      {chk.status === 'fail' && <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900">{chk.label}</span>
                        <span className="text-[11px] font-mono uppercase text-stone-500">{chk.status}</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">{chk.description}</p>
                      {chk.status !== 'pass' && (
                        <p className="text-xs text-amber-800 mt-1 font-medium">Action: {chk.recommendation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">
                  Generated JSON-LD (Injected dynamically &amp; prerendered at build time)
                </span>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 hover:border-stone-400 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON-LD'}</span>
                </button>
              </div>

              <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                <code>{jsonLdString}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-white border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowLeft, ArrowRight, History, Mail } from 'lucide-react';
import { Link } from '../utils/router';

interface CorrectionsPolicyPageProps {
  onBackToHome: () => void;
}

export const CorrectionsPolicyPage: React.FC<CorrectionsPolicyPageProps> = ({ onBackToHome }) => {
  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" onClick={onBackToHome} className="hover:text-blue-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-900">Corrections Policy</span>
          </nav>
          <Link href="/" onClick={onBackToHome} className="flex items-center gap-1.5 text-stone-600 hover:text-blue-900 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <header className="border-b border-stone-200 pb-8 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            EIRVAN Accountability · Timestamped Revisions
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">
            Corrections &amp; Revision History Policy
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
            When new data emerges or a factual error is identified after publication, EIRVAN updates the record openly without silent rewrites.
          </p>
        </header>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 space-y-8 text-stone-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-900" aria-hidden="true" />
              <span>1. Substantive Corrections vs. Clarifications</span>
            </h2>
            <p>
              <strong>Substantive Factual Corrections:</strong> If an article misstates a figure, clinical trial outcome, quotation, attribution, or regulatory rule, we amend the text, update the article&apos;s <span className="font-mono text-xs">updatedAt</span> timestamp, and append an explicit dated entry in the article&apos;s on-page Revision Log.
            </p>
            <p>
              <strong>Clarifications &amp; Copy Edits:</strong> Minor typographical fixes or structural heading refinements that do not alter factual meaning are applied without disrupting reading continuity, while material source additions receive a dated revision note.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-stone-100">
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              2. Submitting an Erratum Notice
            </h2>
            <p>
              Readers, researchers, and subject-matter specialists can flag potential inaccuracies or newly published follow-up papers directly with our standards desk. Please include the article URL, the specific statement in question, and a link to the primary documentation.
            </p>
            <div className="p-5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-stone-900">Corrections &amp; Standards Desk</div>
                <div className="text-xs text-stone-600 mt-0.5">Target initial acknowledgement within 2 business days.</div>
              </div>
              <a
                href="mailto:corrections@eirvan.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-blue-900 text-white text-xs font-medium rounded-lg whitespace-nowrap"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>corrections@eirvan.com</span>
              </a>
            </div>
          </section>

          <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
            <Link href="/editorial-policy" className="text-blue-900 hover:underline inline-flex items-center gap-1.5">
              <span>Read our Editorial Policy</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link href="/about" className="text-stone-700 hover:text-blue-900">
              About EIRVAN Masthead →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CorrectionsPolicyPage;

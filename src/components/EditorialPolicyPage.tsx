import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { Link } from '../utils/router';

interface EditorialPolicyPageProps {
  onBackToHome: () => void;
}

export const EditorialPolicyPage: React.FC<EditorialPolicyPageProps> = ({ onBackToHome }) => {
  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" onClick={onBackToHome} className="hover:text-blue-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-900">Editorial Policy</span>
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
            EIRVAN Publishing Standards · Effective March 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">
            Editorial Policy &amp; Verification Standards
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
            This charter sets the methodological, sourcing, and editorial review rules governing every article, dispatch, and explainer published on EIRVAN.
          </p>
        </header>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 space-y-8 text-stone-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-900" aria-hidden="true" />
              <span>1. Primary Source Sourcing Mandate</span>
            </h2>
            <p>
              EIRVAN reporters and contributing fellows trace empirical claims directly to primary records: peer-reviewed journals (such as <em>IEEE</em>, <em>Optica</em>, <em>Nature</em>, or <em>Cell</em>), registered human clinical trials, regulatory disclosures (FINRA, SEC, ESMA, NIST), and public technical documentation. Secondary blog commentary is never presented as primary evidence.
            </p>
            <p>
              Every long-form article includes an explicit <strong>Sources &amp; Primary Citations</strong> block so readers can inspect the underlying literature independently.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-stone-100">
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              2. Separation of News, Analysis &amp; Sponsorships
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-1" aria-hidden="true" />
                <span><strong>News Dispatches:</strong> Time-sensitive reporting on foundry capacity, market infrastructure, and policy shifts marked as <span className="font-mono text-xs">NewsArticle</span>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-1" aria-hidden="true" />
                <span><strong>Technical &amp; Market Analysis:</strong> Structured deep dives clearly separated from news briefs, identifying limitations and opposing interpretations.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-1" aria-hidden="true" />
                <span><strong>Advertising Independence:</strong> Display sponsorships are visually separated from editorial copy and labeled as &ldquo;Sponsored&rdquo;. Advertisers hold zero pre-publication review over reporting or conclusions.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-stone-100">
            <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-900" aria-hidden="true" />
              <span>3. AI Workflow Assistance &amp; Human Review Gate</span>
            </h2>
            <p>
              EIRVAN editors may use automated outlining or translation tools inside the Publisher Studio solely as structural drafting aids. All AI-assisted revisions are explicitly disclosed. No article can move to <strong>Published</strong> status without verified primary citations, an authenticated authorized human reviewer identity and timestamp, and a matching cryptographic revision digest. Whenever substantive headlines, body prose, or citations are edited after approval, prior sign-off is automatically invalidated until re-reviewed.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-stone-100">
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              4. Health &amp; Financial Non-Advisory Scope
            </h2>
            <p>
              Articles in Business and Lifestyle evaluate scientific and market mechanisms for educational clarity only. EIRVAN does not offer individualized investment recommendations or medical diagnoses.
            </p>
          </section>

          <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
            <Link href="/corrections-policy" className="text-blue-900 hover:underline inline-flex items-center gap-1.5">
              <span>Read our Corrections &amp; Versioning Policy</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="text-stone-700 hover:text-blue-900">
              Contact the Editorial Desk →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EditorialPolicyPage;

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Scale,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { Link } from '../utils/router';

interface TermsPageProps {
  onBackToHome: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBackToHome }) => {
  const [activeSection, setActiveSection] = useState<string>('acceptance');

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'editorial', title: '2. Editorial Integrity & Independence' },
    { id: 'ip', title: '3. Intellectual Property & Citation Licensing' },
    { id: 'disclaimers', title: '4. Financial, Legal & Health Disclaimers' },
    { id: 'monetization', title: '5. Sponsorship & Advertising Disclosures' },
    { id: 'conduct', title: '6. Reader Conduct & Browser Features' },
    { id: 'governance', title: '7. Revisions, Jurisdiction & Governance' }
  ];

  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Breadcrumb Ribbon */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs font-mono">
          <Link
            href="/"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-stone-600 hover:text-blue-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-900" aria-hidden="true" />
            <span>Return to Dispatch Index</span>
          </Link>
          <div className="flex items-center gap-3 text-stone-500">
            <span>TERMS OF SERVICE</span>
            <span aria-hidden="true">·</span>
            <span className="text-stone-800 font-semibold">REVISED 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        <header className="space-y-4 border-b border-stone-200 pb-8">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
            EIRVAN Legal &amp; Governance · Standard Publication Terms
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
            Terms of Service
          </h1>

          <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
            These Terms of Service govern your access to and use of EIRVAN (eirvan.com), including published articles, category archives, reference citations, and machine-readable syndication feeds.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500">
            <span>Effective Date: March 1, 2026</span>
            <span aria-hidden="true">·</span>
            <Link href="/editorial-policy" className="text-blue-900 hover:underline">
              Editorial Policy →
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-stone-500 font-bold block">
                Table of Contents
              </span>
              <nav className="space-y-1 text-xs">
                {sections.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block py-1.5 px-3 rounded-lg transition-colors ${
                      activeSection === s.id
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="pt-3 border-t border-stone-100 text-[11px] font-mono text-stone-500">
                Legal inquiries:{' '}
                <a href="mailto:legal@eirvan.com" className="text-blue-900 hover:underline">
                  legal@eirvan.com
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Scale className="w-4 h-4 text-blue-900" aria-hidden="true" />
                <span>Open Citation Standard</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Non-commercial research quotation and academic attribution are welcomed with direct canonical links back to the cited EIRVAN dispatch.
              </p>
            </div>
          </aside>

          <div className="lg:col-span-8 bg-white rounded-2xl p-8 sm:p-10 border border-stone-200 space-y-10 text-stone-700 text-sm sm:text-base leading-relaxed">
            <section id="acceptance" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 01
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  1. Acceptance of Terms
                </h2>
              </div>
              <p>
                By accessing, reading, or syndicating content hosted at{' '}
                <span className="font-mono text-stone-900 text-xs">https://eirvan.com</span>, you agree to these Terms of Service and our{' '}
                <Link href="/privacy" className="text-blue-900 underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                If you do not agree to these terms, discontinue use of the publication. Material revisions are documented with an updated revision date at the top of this page.
              </p>
            </section>

            <section id="editorial" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 02
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  2. Editorial Integrity &amp; Independence
                </h2>
              </div>
              <p>
                EIRVAN publishes articles grounded in cited primary sources, transparent review notes, and explicit correction logs. Commercial sponsors hold zero preview, veto, or modification authority over editorial reporting.
              </p>
            </section>

            <section id="ip" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 03
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  3. Intellectual Property &amp; Citation Licensing
                </h2>
              </div>
              <p>
                Original articles, editorial graphics, and compilation structures published on EIRVAN remain the intellectual property of EIRVAN unless attributed to public-domain sources or referenced research institutions.
              </p>
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <h3 className="font-bold text-stone-900 font-mono uppercase tracking-wider">
                  Permitted Research &amp; Quotation:
                </h3>
                <ul className="space-y-1.5 text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Excerpt quotation with clear author attribution and canonical URL link.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Personal and academic syndication via our public <a href="/rss.xml" className="text-blue-900 underline font-mono">/rss.xml</a> feed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Standard search engine and research indexing per <a href="/robots.txt" className="text-blue-900 underline font-mono">robots.txt</a> and <a href="/llms.txt" className="text-blue-900 underline font-mono">llms.txt</a>.</span>
                  </li>
                </ul>
              </div>
            </section>

            <section id="disclaimers" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 04
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  4. Financial, Legal &amp; Health Disclaimers
                </h2>
              </div>

              <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs sm:text-sm text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 font-mono uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span>Informational Purpose Only</span>
                </div>
                <p>
                  <strong>Not Financial Advice:</strong> Business and market microstructure analyses examine institutional mechanics for educational context only and never constitute individualized investment or legal advice.
                </p>
                <p>
                  <strong>Not Medical Advice:</strong> Lifestyle and longevity syntheses summarize peer-reviewed trials for public literacy and never substitute for licensed medical diagnosis or care.
                </p>
              </div>
            </section>

            <section id="monetization" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 05
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  5. Sponsorship &amp; Advertising Disclosures
                </h2>
              </div>
              <p>
                Sponsor placements are clearly labeled as &ldquo;Sponsored Briefing&rdquo; or &ldquo;Advertisement&rdquo; with fixed display containers and <span className="font-mono text-xs">rel=&quot;sponsored noopener&quot;</span> links. Sponsorship never influences editorial scoring, headlines, or corrections.
              </p>
            </section>

            <section id="conduct" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 06
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  6. Reader Conduct &amp; Browser Features
                </h2>
              </div>
              <p>
                Saved reading bookmarks and typography preferences are stored locally in your browser&apos;s <span className="font-mono text-xs">localStorage</span>. Readers agree not to submit automated denial-of-service traffic or malicious payloads against publication endpoints.
              </p>
            </section>

            <section id="governance" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 07
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  7. Revisions, Jurisdiction &amp; Governance
                </h2>
              </div>
              <p>
                These Terms of Service are governed under applicable United States law in Delaware. Factual correction requests follow our{' '}
                <Link href="/corrections-policy" className="text-blue-900 underline">
                  Corrections Policy
                </Link>
                .
              </p>
            </section>

            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-stone-900 block text-sm">
                  Legal or Licensing Inquiries?
                </span>
                <span className="text-xs text-stone-500">
                  Contact EIRVAN Editorial &amp; Legal Operations.
                </span>
              </div>
              <a
                href="mailto:legal@eirvan.com"
                className="px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-blue-900 text-white font-mono text-xs transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>legal@eirvan.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <Link href="/privacy" className="text-blue-900 hover:underline flex items-center gap-1 font-semibold">
            <span>Read Privacy Policy</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <span>EIRVAN · eirvan.com</span>
        </div>
      </div>
    </article>
  );
};

export default TermsPage;

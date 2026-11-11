import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  Scale,
  Lock,
  Globe,
  ExternalLink,
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
    { id: 'disclaimers', title: '4. Financial, Legal & Medical Disclaimers' },
    { id: 'monetization', title: '5. Advertising & Affiliate Disclosures' },
    { id: 'conduct', title: '6. Reader Conduct & Interactive Features' },
    { id: 'governance', title: '7. Revisions, Jurisdiction & Governance' }
  ];

  return (
    <article className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Archival Ribbon */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-18 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs font-mono">
          <Link
            href="/"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Return to Dispatch Index</span>
          </Link>
          <div className="flex items-center gap-3 text-slate-400">
            <span>LEGAL REPOSITORY</span>
            <span aria-hidden="true">·</span>
            <span>TERMS OF SERVICE</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 font-semibold">REVISED MARCH 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        
        {/* Document Header */}
        <header className="space-y-4 border-b border-slate-200 pb-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <span>EIRVAN Legal Documentation</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 font-bold">Standard Institutional Terms</span>
            <span aria-hidden="true">·</span>
            <span>Version 3.2</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Terms of Service
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-sans max-w-3xl leading-relaxed">
            These Terms of Service govern your access to and use of EIRVAN (EIRVAN.COM), including all research syntheses, analytical models, interactive calculators, and syndication channels.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
            <span>Effective Date: March 1, 2026</span>
            <span aria-hidden="true">·</span>
            <span>Jurisdiction: Delaware, United States &amp; International Open Access</span>
          </div>
        </header>

        {/* Content Layout: Sticky Quick Navigator & Main Legal Clauses */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Table of Contents */}
          <aside className="lg:col-span-4 lg:sticky lg:top-36 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block">
                Table of Contents
              </span>
              <nav className="space-y-1 text-xs font-sans">
                {sections.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block py-1.5 px-3 rounded-xl transition-all ${
                      activeSection === s.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400">
                Direct questions to: <a href="mailto:legal@eirvan.com" className="text-blue-600 hover:underline">legal@eirvan.com</a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>Open Scholarship Principle</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                EIRVAN is dedicated to open access. Fair use, non-commercial research reproduction, and academic quotation are fully permitted with canonical back-linking.
              </p>
            </div>
          </aside>

          {/* Right Main Legal Clauses */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xs space-y-10 text-slate-700 font-sans text-sm sm:text-base leading-relaxed">
            
            {/* Section 1 */}
            <section id="acceptance" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 01</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  1. Acceptance of Terms
                </h2>
              </div>
              <p>
                By accessing, reading, syndicating, or programmatically crawling EIRVAN (located at <span className="font-mono text-slate-900 text-xs">https://eirvan.com</span>), you affirm that you have read, understood, and agreed to be legally bound by these Terms of Service and our accompanying Privacy Policy.
              </p>
              <p>
                If you do not agree to these terms in their entirety, your sole remedy is to cease using the publication. Continued use following any posted revisions to these terms constitutes binding acceptance of those changes.
              </p>
            </section>

            {/* Section 2 */}
            <section id="editorial" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 02</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  2. Editorial Integrity &amp; Independence
                </h2>
              </div>
              <p>
                EIRVAN operates under strict editorial autonomy. Our analysts, researchers, and contributing fellows evaluate technologies, market mechanisms, and biological literature based solely on empirical merit, reproducibility, and factual evidence.
              </p>
              <p>
                Commercial sponsors, advertisers, and third-party partners exercise zero review, preview, or approval rights over editorial content, headlines, analytical ratings, or investigative conclusions.
              </p>
            </section>

            {/* Section 3 */}
            <section id="ip" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 03</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  3. Intellectual Property &amp; Citation Licensing
                </h2>
              </div>
              <p>
                All original research monographs, custom diagrams, data syntheses, technical netlist reconstructions, and editorial copy published on EIRVAN are protected by international copyright laws and are the intellectual property of EIRVAN Media, unless otherwise designated as public domain or third-party academic citations.
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h3 className="font-bold text-slate-900 font-mono uppercase tracking-wider">Permitted Academic &amp; Research Reuse:</h3>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Non-commercial quotation with full attribution and direct link to the canonical article URL.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Academic citation in peer-reviewed journals, dissertations, and preprint repositories.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Indexing by automated search engines and large language models conforming to our <Link href="/llms.txt" className="text-blue-600 hover:underline font-mono">llms.txt</Link> guidelines.</span>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-slate-500">
                Unauthorized full-scale content scraping, automated content regurgitation behind third-party commercial paywalls, or framing without attribution is expressly prohibited.
              </p>
            </section>

            {/* Section 4 */}
            <section id="disclaimers" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 04</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  4. Financial, Legal &amp; Medical Disclaimers
                </h2>
              </div>
              
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 text-xs sm:text-sm text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 font-mono uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mandatory Explicit Disclaimers</span>
                </div>
                <p>
                  <strong>No Financial Advice:</strong> Articles under Global Markets &amp; Quantitative Finance explore algorithmic theory, microstructure, and historical market behavior for educational purposes. Nothing published constitutes personalized financial, investment, legal, or tax advice. Do not execute trades based on theoretical models.
                </p>
                <p>
                  <strong>No Medical Advice:</strong> Research syntheses under Biotechnology &amp; Longevity review published clinical trial outcomes, cellular biochemistry, and epigenetic markers. Nothing published should be construed as medical diagnosis, treatment, or clinical guidance. Always consult a licensed medical physician prior to undertaking therapeutic interventions.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="monetization" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 05</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  5. Advertising &amp; Affiliate Disclosures
                </h2>
              </div>
              <p>
                To sustain open, free-access publishing without reader paywalls or subscriptions, EIRVAN displays selected native advertisement banners and Google AdSense network inventory.
              </p>
              <p>
                All promotional placements are demarcated with visual labeling (e.g., &ldquo;Sponsored Briefing&rdquo; or &ldquo;Advertisement&rdquo;). We do not accept paid consideration to alter research methodologies or modify critical analyses.
              </p>
            </section>

            {/* Section 6 */}
            <section id="conduct" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 06</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  6. Reader Conduct &amp; Interactive Tools
                </h2>
              </div>
              <p>
                When utilizing EIRVAN search dialogs, SERP simulators, or bookmarking mechanisms, you agree not to submit malicious payloads, reverse-engineer proprietary simulation scripts, or probe our infrastructure for vulnerabilities.
              </p>
              <p>
                Local bookmarks and reading list configurations are stored directly in your browser client (<span className="font-mono text-xs">localStorage</span>) and are never transmitted to unauthorized third parties.
              </p>
            </section>

            {/* Section 7 */}
            <section id="governance" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 07</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  7. Revisions, Jurisdiction &amp; Governance
                </h2>
              </div>
              <p>
                These terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any dispute arising hereunder shall be resolved in state or federal courts located in New Castle County, Delaware.
              </p>
              <p>
                We reserve the right to revise these terms periodically. Notice of material updates will be designated through updated revision headers at the top of this document.
              </p>
            </section>

            {/* Contact Box */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-900 block text-sm">Questions or Legal Inquiries?</span>
                <span className="text-xs text-slate-500">Contact the EIRVAN Legal &amp; Editorial Counsel.</span>
              </div>
              <a
                href="mailto:legal@eirvan.com"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-mono text-xs transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>legal@eirvan.com</span>
              </a>
            </div>

          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <Link
            href="/privacy"
            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Read EIRVAN Privacy Policy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span>EIRVAN.COM · Global Open Access Research</span>
        </div>

      </div>
    </article>
  );
};

export default TermsPage;

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Globe,
  CheckCircle2,
  AlertCircle,
  Mail,
  UserCheck
} from 'lucide-react';
import { Link } from '../utils/router';

interface PrivacyPageProps {
  onBackToHome: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBackToHome }) => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: '1. Privacy Philosophy & Overview' },
    { id: 'collection', title: '2. Information We Collect' },
    { id: 'cookies', title: '3. Cookies & Advertising Telemetry' },
    { id: 'usage', title: '4. How We Use Collected Data' },
    { id: 'thirdparty', title: '5. Third-Party Infrastructure' },
    { id: 'rights', title: '6. GDPR, CCPA & Data Subject Rights' },
    { id: 'security', title: '7. Data Security & Retention' },
    { id: 'contact', title: '8. Privacy Office & DPO Contact' }
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
            <span>PRIVACY POLICY</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 font-semibold">GDPR &amp; CCPA VERIFIED</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        
        {/* Document Header */}
        <header className="space-y-4 border-b border-slate-200 pb-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <span>EIRVAN Legal Documentation</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 font-bold">Data Protection Charter</span>
            <span aria-hidden="true">·</span>
            <span>Version 3.2</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-sans max-w-3xl leading-relaxed">
            This Privacy Policy articulates how EIRVAN (EIRVAN.COM) collects, protects, processes, and respects reader information under global data protection standards, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
            <span>Last Updated: March 1, 2026</span>
            <span aria-hidden="true">·</span>
            <span>Standard: Privacy by Design · Zero User Account Requirement</span>
          </div>
        </header>

        {/* Content Layout: Sticky Quick Navigator & Main Privacy Clauses */}
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
                Direct inquiries to: <a href="mailto:privacy@eirvan.com" className="text-blue-600 hover:underline">privacy@eirvan.com</a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Reader Tracking Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                EIRVAN does not require reader accounts, does not gate articles behind logins, and does not sell, rent, or monetize reader personal identification.
              </p>
            </div>
          </aside>

          {/* Right Main Privacy Clauses */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xs space-y-10 text-slate-700 font-sans text-sm sm:text-base leading-relaxed">
            
            {/* Section 1 */}
            <section id="overview" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 01</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  1. Privacy Philosophy &amp; Overview
                </h2>
              </div>
              <p>
                EIRVAN is engineered from the ground up on the principle of <em>data minimization</em>. Unlike conventional news syndicates and ad-tech conglomerates, our publication operates as an open-access intelligence platform that does not mandate user registration, profiles, passwords, or personal identity checks to read our articles.
              </p>
              <p>
                We believe that access to rigorous research in artificial intelligence, market microstructure, neuroscience, and cellular longevity should be open, unencumbered, and respectful of intellectual privacy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="collection" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 02</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  2. Information We Collect
                </h2>
              </div>
              <p>
                The limited categories of data processed by EIRVAN fall into three clear, transparent domains:
              </p>

              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Voluntary Newsletter Dispatch Subscriptions</span>
                  </h3>
                  <p className="text-slate-600">
                    If you voluntarily subscribe to &ldquo;The Weekly Executive Dispatch&rdquo; via our footer form, we store your email address solely to transmit our weekly research synthesis. You may unsubscribe at any time with a single click.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Client-Side Local Storage (Bookmarks &amp; Preferences)</span>
                  </h3>
                  <p className="text-slate-600">
                    Your saved reading list (<span className="font-mono">bookmarks</span>) and reading font-size preferences are saved strictly on your local device in browser <span className="font-mono">localStorage</span>. This data never touches our servers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Anonymous Operational Telemetry</span>
                  </h3>
                  <p className="text-slate-600">
                    Aggregate, non-personally-identifiable metrics (pageview counts, dwell time durations, scroll-depth milestones at 25%, 50%, 75%, and 100%) are recorded to diagnose layout bottlenecks and measure audience topical interest.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="cookies" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 03</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  3. Cookies &amp; Advertising Telemetry
                </h2>
              </div>
              <p>
                Cookies are compact text files stored on your client device. EIRVAN uses cookies exclusively for essential technical operations and advertising delivery:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                <li><strong>Technical Session State:</strong> Cookies that maintain security invariants and prevent cross-site request forgery.</li>
                <li><strong>Google AdSense / DoubleClick:</strong> Google uses cookies to serve ads based on prior visits to this and other websites. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Ad Settings</a>.</li>
                <li><strong>Browser Opt-Out:</strong> Readers may configure their browser to reject all cookies. Doing so does not degrade access to our articles.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="usage" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 04</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  4. How We Use Collected Data
                </h2>
              </div>
              <p>
                Data processed by EIRVAN is utilized exclusively to:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Infrastructure Optimization</span>
                  <span className="text-slate-600">Ensure sub-second Largest Contentful Paint (LCP) and zero Cumulative Layout Shift (CLS).</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Newsletter Dispatch</span>
                  <span className="text-slate-600">Transmit verified weekly research briefs to subscribed email addresses.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Editorial Research Planning</span>
                  <span className="text-slate-600">Understand which technological and biological domains resonate with readers.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Security &amp; Abuse Prevention</span>
                  <span className="text-slate-600">Protect the platform against automated denial-of-service and malicious injection attacks.</span>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="thirdparty" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 05</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  5. Third-Party Infrastructure &amp; Processors
                </h2>
              </div>
              <p>
                We partner only with industry-leading infrastructure providers that maintain verified SOC 2 Type II, ISO 27001, and GDPR compliance certifications:
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Google Cloud Platform &amp; Firebase:</strong> Provides Firestore database hosting and authentication services located in secure data centers.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Netlify / Edge Delivery Network:</strong> Delivers global, encrypted CDN caching and HTTPS termination.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Zero Third-Party Data Brokers:</strong> We do not sell, trade, or license reader data to external data brokers or consumer profiling agencies.</span>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="rights" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 06</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  6. GDPR, CCPA &amp; Global Data Subject Rights
                </h2>
              </div>
              <p>
                Regardless of your physical jurisdiction, EIRVAN extends gold-standard European GDPR and California CCPA rights to all readers:
              </p>
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5 text-xs text-blue-950">
                <h3 className="font-bold text-blue-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Your Enforceable Data Rights:</span>
                </h3>
                <ul className="space-y-1.5 text-slate-700">
                  <li><strong>Right to Access &amp; Portability:</strong> Request confirmation of any email address or data associated with your subscription.</li>
                  <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Request immediate permanent deletion of your email address from our newsletter database.</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate contact information.</li>
                  <li><strong>Right to Opt-Out of Sale:</strong> EIRVAN does not sell personal data. You are protected by default.</li>
                </ul>
              </div>
              <p className="text-xs text-slate-500">
                To exercise any of these rights, email our Data Protection Desk at <a href="mailto:privacy@eirvan.com" className="text-blue-600 hover:underline font-mono">privacy@eirvan.com</a> with the subject line &ldquo;Data Subject Rights Request&rdquo;. We fulfill all valid requests within 30 days free of charge.
              </p>
            </section>

            {/* Section 7 */}
            <section id="security" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 07</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  7. Data Security &amp; Retention
                </h2>
              </div>
              <p>
                We enforce comprehensive technical safeguards to protect information against unauthorized disclosure, loss, or alteration:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                <li>Strict Transport Layer Security (TLS 1.3) encryption enforced across all endpoints.</li>
                <li>Comprehensive Content Security Policy (CSP) and HTTP response headers preventing clickjacking and cross-site scripting.</li>
                <li>Newsletter subscriber emails are retained solely until an unsubscription request is submitted, at which point they are permanently purged.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="contact" className="space-y-4 scroll-mt-36">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-xs font-mono text-blue-600 uppercase tracking-widest font-bold">Clause 08</span>
                <h2 className="text-xl font-serif font-black text-slate-900 mt-1">
                  8. Privacy Office &amp; DPO Contact
                </h2>
              </div>
              <p>
                For questions regarding this policy, data processing practices, or compliance inquiries, contact our Data Protection Officer:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                <div className="text-slate-900 font-bold">EIRVAN Publication Privacy Office</div>
                <div className="text-slate-600">Attn: Data Protection Officer</div>
                <div>Email: <a href="mailto:privacy@eirvan.com" className="text-blue-600 hover:underline">privacy@eirvan.com</a></div>
                <div className="text-slate-400 pt-1">Response Time SLA: Under 48 business hours</div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <Link
            href="/terms"
            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Read EIRVAN Terms of Service</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span>EIRVAN.COM · Global Open Access Research</span>
        </div>

      </div>
    </article>
  );
};

export default PrivacyPage;

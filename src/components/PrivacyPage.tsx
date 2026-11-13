import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Database,
  Globe,
  CheckCircle2,
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
    { id: 'collection', title: '2. Data Processed & Local Storage' },
    { id: 'cookies', title: '3. Cookies & Optional Analytics' },
    { id: 'usage', title: '4. Purpose of Processing' },
    { id: 'thirdparty', title: '5. Hosting & Infrastructure Processors' },
    { id: 'rights', title: '6. GDPR, CCPA & Data Subject Rights' },
    { id: 'security', title: '7. Data Security & Retention' },
    { id: 'contact', title: '8. Privacy Office Contact' }
  ];

  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900 selection:bg-blue-100 selection:text-blue-900">
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
            <span>PRIVACY POLICY</span>
            <span aria-hidden="true">·</span>
            <span className="text-stone-800 font-semibold">DATA MINIMIZATION</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        <header className="space-y-4 border-b border-stone-200 pb-8">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
            EIRVAN Legal Documentation · Privacy Charter
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
            This Privacy Policy explains what limited information EIRVAN (eirvan.com) processes when you read articles, manage bookmarks locally, or opt into dispatch updates, alongside your GDPR and CCPA rights.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500">
            <span>Last Updated: March 1, 2026</span>
            <span aria-hidden="true">·</span>
            <span>No Reader Accounts Required</span>
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
                Privacy inquiries:{' '}
                <a href="mailto:privacy@eirvan.com" className="text-blue-900 hover:underline">
                  privacy@eirvan.com
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs text-stone-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Data Minimization Commitment</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                EIRVAN never gates articles behind mandatory sign-up walls and never sells reader information to data brokers.
              </p>
            </div>
          </aside>

          <div className="lg:col-span-8 bg-white rounded-2xl p-8 sm:p-10 border border-stone-200 space-y-10 text-stone-700 text-sm sm:text-base leading-relaxed">
            <section id="overview" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 01
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  1. Privacy Philosophy &amp; Overview
                </h2>
              </div>
              <p>
                EIRVAN is engineered on the principle of <em>data minimization</em>. Readers do not need accounts, logins, or personal profiles to browse any published dispatch across Technology, Business, Lifestyle, Education, or News.
              </p>
            </section>

            <section id="collection" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 02
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  2. Data Processed &amp; Local Storage
                </h2>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-stone-900 font-mono flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-900" aria-hidden="true" />
                    <span>Optional Dispatch Email Preferences</span>
                  </h3>
                  <p className="text-stone-600">
                    If you enter an email address into the reader dispatch form, it is stored locally in your browser preferences unless explicitly transmitted to a configured newsletter endpoint.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-stone-900 font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <span>Browser Local Storage (Bookmarks &amp; Reading Preferences)</span>
                  </h3>
                  <p className="text-stone-600">
                    Saved reading lists and font-size selections stay strictly in your device&apos;s <span className="font-mono">localStorage</span> and are never uploaded to third parties.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <h3 className="font-bold text-stone-900 font-mono flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-stone-700" aria-hidden="true" />
                    <span>Anonymous Aggregate Telemetry &amp; Server Logs</span>
                  </h3>
                  <p className="text-stone-600">
                    Standard web server request logs (timestamps, requested path, status codes) may be recorded by our hosting provider for security and uptime diagnostics. On-page reading session metrics are aggregated locally without individual user profiling.
                  </p>
                </div>
              </div>
            </section>

            <section id="cookies" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 03
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  3. Cookies &amp; Optional Analytics
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-600">
                <li><strong>Essential Browser Storage:</strong> Used strictly to preserve local bookmarks, reading display preferences, and administrator sign-in sessions.</li>
                <li><strong>Optional Measurement:</strong> Aggregate traffic measurement (such as Google Analytics 4) is activated only when explicitly configured by the publisher via environment configuration.</li>
                <li><strong>Zero Cross-Site Advertising Pixels:</strong> Our static sponsor cards render direct editorial placements without loading invasive third-party tracking scripts.</li>
              </ul>
            </section>

            <section id="usage" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 04
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  4. Purpose of Processing
                </h2>
              </div>
              <p>
                Limited technical metrics are used strictly to diagnose layout stability, keep static assets fast, identify broken URLs, and protect the publication against abuse.
              </p>
            </section>

            <section id="thirdparty" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 05
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  5. Hosting &amp; Infrastructure Processors
                </h2>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-900 shrink-0 mt-0.5" aria-hidden="true" />
                  <span><strong>IONOS Web Hosting Plus:</strong> Hosts EIRVAN&apos;s pre-rendered static HTML publication pages, optimized media assets, and HTTPS delivery.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-900 shrink-0 mt-0.5" aria-hidden="true" />
                  <span><strong>Google Cloud Platform &amp; Firebase:</strong> Provides Cloud Firestore storage and Firebase Authentication for editorial CMS operations.</span>
                </div>
              </div>
            </section>

            <section id="rights" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 06
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  6. GDPR, CCPA &amp; Global Data Subject Rights
                </h2>
              </div>
              <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2 text-xs text-stone-800">
                <h3 className="font-bold text-blue-900 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-900" aria-hidden="true" />
                  <span>Your Enforceable Data Rights</span>
                </h3>
                <ul className="space-y-1.5">
                  <li><strong>Right to Access &amp; Deletion:</strong> Request confirmation or erasure of any correspondence sent to EIRVAN.</li>
                  <li><strong>Right to Opt-Out of Sale:</strong> EIRVAN does not sell or rent reader personal data.</li>
                </ul>
              </div>
              <p className="text-xs text-stone-500">
                Submit data requests to{' '}
                <a href="mailto:privacy@eirvan.com" className="text-blue-900 underline font-mono">
                  privacy@eirvan.com
                </a>
                .
              </p>
            </section>

            <section id="security" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 07
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  7. Data Security &amp; Retention
                </h2>
              </div>
              <p>
                HTTPS transport security, strict HTTP security headers, HTML sanitization on editorial body content, and strict Firestore security rules protect editorial and administrative operations.
              </p>
            </section>

            <section id="contact" className="space-y-4 scroll-mt-24">
              <div className="border-b border-stone-100 pb-2">
                <span className="text-xs font-mono text-blue-900 uppercase tracking-widest font-bold">
                  Clause 08
                </span>
                <h2 className="text-xl font-serif font-bold text-stone-900 mt-1">
                  8. Privacy Office Contact
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono space-y-1">
                <div className="text-stone-900 font-bold">EIRVAN Privacy Desk</div>
                <div>
                  Email:{' '}
                  <a href="mailto:privacy@eirvan.com" className="text-blue-900 hover:underline">
                    privacy@eirvan.com
                  </a>
                </div>
                <div>
                  Web Contact:{' '}
                  <Link href="/contact" className="text-blue-900 hover:underline">
                    https://eirvan.com/contact
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <Link href="/terms" className="text-blue-900 hover:underline flex items-center gap-1 font-semibold">
            <span>Read Terms of Service</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <span>EIRVAN · eirvan.com</span>
        </div>
      </div>
    </article>
  );
};

export default PrivacyPage;

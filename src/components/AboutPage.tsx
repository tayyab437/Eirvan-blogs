import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { Link } from '../utils/router';
import { AUTHORS } from '../data/authors';
import { CATEGORY_HUBS } from '../data/categories';
import { ResponsiveImage } from './ResponsiveImage';

interface AboutPageProps {
  onBackToHome: () => void;
  onSelectCategory?: (category: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBackToHome
}) => {
  const [copiedCitation, setCopiedCitation] = useState(false);

  const handleCopyCitation = () => {
    const citation = `EIRVAN Editorial Publication. (2026). EIRVAN: Explore, Learn & Stay Informed. Retrieved from https://eirvan.com`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  };

  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" onClick={onBackToHome} className="hover:text-blue-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-900">About EIRVAN</span>
          </nav>
          <Link
            href="/"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-stone-600 hover:text-blue-900 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-14">
        {/* Header */}
        <header className="space-y-5 border-b border-stone-200 pb-8">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
            EIRVAN Publication · About &amp; Masthead
          </div>

          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-[1.12]">
            Explore, Learn &amp; Stay Informed.
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-3xl">
            EIRVAN is an independent digital publication covering Technology, Business, Lifestyle, Education, and News with named contributors, primary citations, and transparent editorial policies.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-stone-600 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-900" aria-hidden="true" />
              <span>Primary Source Citations</span>
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Named Human Editorial Review</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Sponsored Placements Explicitly Labeled</span>
          </div>
        </header>

        {/* Featured Editorial Visual */}
        <figure className="space-y-3">
          <div className="aspect-16/9 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
            <img
              src="/images/editorial/about-library-1200.webp"
              srcSet="/images/editorial/about-library-600.webp 600w, /images/editorial/about-library-1200.webp 1200w"
              sizes="(max-width: 1024px) 100vw, 1024px"
              alt="EIRVAN research library and editorial workspace"
              width={1200}
              height={675}
              loading="eager"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="text-xs font-serif italic text-stone-500">
            Fig. 1 — EIRVAN editorial research desk, tracing reporting directly to technical proceedings, market filings, and clinical trial registries.
          </figcaption>
        </figure>

        {/* Foundational Mission */}
        <section aria-labelledby="mission-heading" className="bg-white p-8 sm:p-10 rounded-2xl border border-stone-200 space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-1">
              Publishing Charter
            </span>
            <h2 id="mission-heading" className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Clarity Over Click Velocity
            </h2>
          </div>

          <div className="prose-editorial max-w-prose">
            <p>
              Modern digital publishing frequently rewards speed over accuracy—recycling press releases, headline fragments, and unverified preprints without context. EIRVAN exists to slow the analytical cycle down until claims can be traced to primary evidence.
            </p>
            <p>
              Across hardware physics, market microstructure, cognitive science, preventive health, and global industrial policy, every briefing is written for readers who expect precise numbers, cited sources, and explicit separation between reporting and advertising.
            </p>
            <blockquote>
              &ldquo;Trace every quantitative claim directly to its primary paper, regulatory filing, or registered clinical endpoint—and state clearly what remains uncertain.&rdquo;
            </blockquote>
          </div>
        </section>

        {/* Five Editorial Sections */}
        <section aria-labelledby="desks-heading" className="space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-1">
              Coverage Desks
            </span>
            <h2 id="desks-heading" className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Five Core Editorial Sections
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORY_HUBS.map(hub => (
              <div
                key={hub.id}
                className="bg-white rounded-2xl p-6 border border-stone-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                    {hub.kicker}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-stone-900">
                    {hub.name}: {hub.headline}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {hub.description}
                  </p>
                  <div className="pt-2 space-y-1.5">
                    {hub.clusters.map(cluster => (
                      <div key={cluster} className="flex items-center gap-2 text-xs text-stone-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-900 shrink-0" aria-hidden="true" />
                        <span>{cluster}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100">
                  <Link
                    href={`/category/${hub.slug}`}
                    className="text-xs font-semibold text-blue-900 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>Explore {hub.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Masthead Contributors */}
        <section aria-labelledby="masthead-heading" className="space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-1">
              Editorial Masthead
            </span>
            <h2 id="masthead-heading" className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Editors &amp; Contributing Analysts
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {AUTHORS.map(author => (
              <div
                key={author.id}
                className="bg-white rounded-2xl p-6 border border-stone-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/author/${author.slug}`} className="w-14 h-14 rounded-full overflow-hidden border border-stone-200 shrink-0 block">
                      <ResponsiveImage
                        src={author.avatar}
                        alt={author.name}
                        width={160}
                        height={160}
                        sizes="56px"
                        preferredWidth={160}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-stone-900">
                        <Link href={`/author/${author.slug}`} className="hover:text-blue-900 hover:underline">
                          {author.name}
                        </Link>
                      </h3>
                      <span className="text-xs text-stone-600 block">
                        {author.role}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-stone-600 leading-relaxed">
                    {author.shortBio}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-mono">
                  <span>{author.department}</span>
                  <Link href={`/author/${author.slug}`} className="text-blue-900 font-sans font-semibold hover:underline">
                    View Dossier →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary Craft Highlight */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white p-8 rounded-2xl border border-stone-200">
          <div className="md:col-span-5 aspect-4/3 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
            <img
              src="/images/editorial/about-masthead-800.webp"
              srcSet="/images/editorial/about-masthead-400.webp 400w, /images/editorial/about-masthead-800.webp 800w"
              sizes="(max-width: 768px) 100vw, 400px"
              alt="Editorial typography proofs and reference notebook"
              width={800}
              height={600}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-7 space-y-4">
            <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block">
              Transparency &amp; Accountability
            </span>
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              Published Editorial &amp; Corrections Policies
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              We publish our sourcing framework, AI disclosure requirements, and timestamped correction history publicly so readers understand how every report is verified.
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold pt-1">
              <Link href="/editorial-policy" className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-blue-900">
                Editorial Policy
              </Link>
              <Link href="/corrections-policy" className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg hover:border-blue-900">
                Corrections Policy
              </Link>
              <Link href="/contact" className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg hover:border-blue-900">
                Contact Desk
              </Link>
            </div>
          </div>
        </section>

        {/* Citation & Contact */}
        <section aria-labelledby="citation-heading" className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 id="citation-heading" className="text-lg font-serif font-bold text-stone-900">
              Academic Citation &amp; Press Inquiries
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Editorial desk: <a href="mailto:editorial@eirvan.com" className="text-blue-900 hover:underline font-mono">editorial@eirvan.com</a> · Press: <a href="mailto:press@eirvan.com" className="text-blue-900 hover:underline font-mono">press@eirvan.com</a>
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCitation}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {copiedCitation ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy APA Citation</span>
              </>
            )}
          </button>
        </section>
      </div>
    </article>
  );
};

export default AboutPage;

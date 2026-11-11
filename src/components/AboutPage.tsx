import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  BookOpen,
  Sparkles,
  ExternalLink,
  Cpu,
  TrendingUp,
  Brain,
  Dna
} from 'lucide-react';
import { Link } from '../utils/router';

interface AboutPageProps {
  onBackToHome: () => void;
  onSelectCategory?: (category: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBackToHome,
  onSelectCategory
}) => {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [activePillar, setActivePillar] = useState<number>(0);

  const handleCopyCitation = () => {
    const citation = `EIRVAN Research Group. (2026). EIRVAN: Explore, Learn & Stay Informed. Institutional Monograph Series. Retrieved from https://eirvan.com`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  };

  const pillars = [
    {
      id: 1,
      title: 'Deep Technology & Machine Cognition',
      category: 'Technology & AI',
      slug: 'technology-ai',
      icon: Cpu,
      summary: 'Investigating the hardware inflection points that make contemporary AI physically possible: from analog spiking silicon to optical interconnect interposers.',
      principles: [
        'Physical thermodynamics of compute: 2nm gate-all-around fab yields and thermal dissipation barriers.',
        'Photonic co-packaged optics (CPO) replacing lossy copper traces across multi-terabit datacenters.',
        'Neuromorphic event-driven architectures delivering 100x efficiency in sensory edge inference.'
      ]
    },
    {
      id: 2,
      title: 'Global Markets & Quantitative Liquidity',
      category: 'Global Markets & Finance',
      slug: 'global-markets-finance',
      icon: TrendingUp,
      summary: 'Deconstructing market microstructure, sub-microsecond FPGA packet parsing, dark pool queue dynamics, and sovereign balance sheet allocations.',
      principles: [
        'Sub-microsecond deterministic matching engines and exchange order routing latency.',
        'Dark pool hidden order detection and institutional adverse selection mitigation.',
        'Macroeconomic portfolio hedging against currency debasement and sovereign debt restructuring.'
      ]
    },
    {
      id: 3,
      title: 'Cognitive Ergonomics & High-Leverage Work',
      category: 'Productivity & Mindset',
      slug: 'productivity-mindset',
      icon: Brain,
      summary: 'Grounded in chronobiology and neurochemistry rather than productivity folklore: calibrating the biological substrate for prolonged creative stamina.',
      principles: [
        '90-minute ultradian rhythm synchronization aligned with endogenous rest-activity cycles.',
        'Neurochemical baseline management: dopamine sensitivity and cortisol awakening response priming.',
        'Physical workspace ergonomics: lux thresholds, air-quality particulate ceilings, and acoustic attenuation.'
      ]
    },
    {
      id: 4,
      title: 'Biotechnology & Cellular Longevity',
      category: 'Biotech & Longevity',
      slug: 'biotech-longevity',
      icon: Dna,
      summary: 'Translating peer-reviewed longevity science into verifiable human data: vascular compliance, epigenetic clock methylation, and mitochondrial renewal.',
      principles: [
        'Phase III human clinical trial syntheses evaluating NAD+ precursors and carotid artery compliance.',
        'CRISPR epigenetic base editing targeting age-associated DNA hypermethylation loci.',
        'Biomarker assessment rigor: distinguishing surrogate endpoints from true biological age deceleration.'
      ]
    }
  ];

  const editorialStaff = [
    {
      name: 'Dr. Aris Thorne',
      role: 'Principal Computing Architect & Silicon Foundry Specialist',
      institution: 'Formerly IMEC & Stanford Nanoelectronics',
      bio: 'PhD in Applied Physics. Researches 2nm gate-all-around lithography yields, memristive neuromorphic compute, and co-packaged silicon photonics.',
      focus: 'Neuromorphic Silicon & Photonics',
      recentBrief: 'Neuromorphic Silicon Breakthrough 2026'
    },
    {
      name: 'Elena Rostova, CFA',
      role: 'Director of Quantitative Research & Market Microstructure',
      institution: 'Ex-Quant Lead, Citadel Securities & Oxford OMI',
      bio: 'Specializes in high-frequency order book dynamics, FPGA latency optimization, dark pool adverse selection, and algorithmic arbitrage.',
      focus: 'Dark Pools & FPGA Execution',
      recentBrief: 'Dark Pool Algorithmic Arbitrage'
    },
    {
      name: 'Dr. Marcus Vance',
      role: 'Senior Fellow in Cellular Biology & Epigenetics',
      institution: 'Harvard Medical School & Max Planck Institute',
      bio: 'Investigates chromatin accessibility, Horvath DNA methylation clocks, and human clinical trials evaluating vascular endothelial renewal.',
      focus: 'NAD+ & Epigenetic Methylation',
      recentBrief: 'NAD+ Vascular Elasticity Clinical Trials'
    },
    {
      name: 'Kaelen Zhang',
      role: 'Lead Cognitive Ergonomist & Neurobiology Editor',
      institution: 'UC Berkeley Neuroscience & MIT Media Lab',
      bio: 'Researches endogenous ultradian rhythm calibration, deep work environmental engineering, and autonomic nervous system optimization.',
      focus: 'Ultradian Deep Work Systems',
      recentBrief: '90-Minute Ultradian Rhythm Calibration'
    }
  ];

  return (
    <article className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Editorial Utility Nav Ribbon */}
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
            <span>VOL. III</span>
            <span aria-hidden="true">·</span>
            <span>PUBLICATION CHARTER</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 font-semibold">EST. 2024</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        
        {/* Monograph Header */}
        <header className="space-y-6 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <span>EIRVAN Institutional Publication</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 font-bold">About &amp; Editorial Standards</span>
            <span aria-hidden="true">·</span>
            <span>ISSN 2984-1182</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black text-slate-900 tracking-tight leading-[1.1] text-balance">
            Explore, Learn &amp; Stay Informed.
          </h1>

          <p className="text-lg sm:text-xl font-sans text-slate-600 leading-relaxed max-w-3xl">
            EIRVAN is an independent digital publication dissecting foundational breakthroughs in deep computing, quantitative finance, cognitive architecture, and human cellular longevity.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-sans text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Peer-Reviewed Primary Citations Only</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Zero Native Sponsored Content</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Open Access for Global Researchers</span>
          </div>
        </header>

        {/* Featured Editorial Visual Frame */}
        <figure className="space-y-3">
          <div className="relative aspect-16/9 rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-slate-100">
            <img
              src="/src/assets/images/about_editorial_library_1794248632744.jpg"
              alt="EIRVAN Research Library and Editorial Archives"
              width={1600}
              height={900}
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-mono">
              <span className="bg-slate-900/80 px-3 py-1 rounded-md backdrop-blur-md">
                EIRVAN Archive &amp; Synthesis Facility
              </span>
              <span className="hidden sm:inline bg-slate-900/80 px-3 py-1 rounded-md backdrop-blur-md">
                Permanent Open Repository
              </span>
            </div>
          </div>
          <figcaption className="text-xs font-serif italic text-slate-500 text-center sm:text-left">
            Fig. 1 — EIRVAN Editorial Research Desk. Every briefing is synthesized directly from primary semiconductor foundry disclosures, algorithmic mathematical proofs, or registered human clinical trials.
          </figcaption>
        </figure>

        {/* The Manifesto / Core Narrative with Drop Cap */}
        <section aria-labelledby="manifesto-heading" className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/90 shadow-xs space-y-8">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-bold block mb-1">
              Foundational Thesis
            </span>
            <h2 id="manifesto-heading" className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
              The Antidote to Information Fragmentation
            </h2>
          </div>

          <div className="space-y-6 text-slate-700 font-sans text-base sm:text-lg leading-relaxed max-w-none">
            <p className="first-letter:text-6xl first-letter:font-serif first-letter:font-black first-letter:float-left first-letter:mr-3 first-letter:text-slate-900 first-letter:leading-none">
              Modern digital media is trapped in an incentive loop optimized for velocity over veracity. Technical press releases are reprinted verbatim, macroeconomic reports are distilled into alarmist soundbites, and biomedical preprints are weaponized for clicks before peer review has even begun. The signal-to-noise ratio in high-leverage domains has collapsed.
            </p>

            <p>
              EIRVAN was founded on a contrary principle: that the most transformative shifts in human capability do not happen in soundbites. They occur at the boundary layers of difficult disciplines—where the physics of silicon lithography intersects with artificial intelligence, where market microstructure determines sovereign capital flows, where neuroendocrine chronobiology shapes cognitive output, and where epigenetic base editing redefines cellular senescence.
            </p>

            {/* Curatorial Pull Quote */}
            <blockquote className="my-8 py-6 px-6 sm:px-8 border-y border-slate-200 bg-slate-50/60 text-xl sm:text-2xl font-serif italic text-slate-900 leading-snug">
              &ldquo;We reject secondhand reporting. Our editorial mandate is unequivocal: trace every claim directly to its physical foundry yield, its mathematical derivation, or its randomized clinical trial data.&rdquo;
            </blockquote>

            <p>
              By treating our readers as intellectually rigorous peers rather than passive consumers, EIRVAN delivers uncompromised depth. We publish when research is verified, not when an arbitrary news cycle demands engagement.
            </p>
          </div>
        </section>

        {/* The Four Core Pillars (Interactive Showcase) */}
        <section aria-labelledby="pillars-heading" className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-bold block mb-1">
                Curatorial Taxonomy
              </span>
              <h2 id="pillars-heading" className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                Four Specialized Editorial Verticals
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500 max-w-sm sm:text-right">
              Explore our core channels covering high-consequence frontiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.id}
                  className="bg-white rounded-3xl p-8 border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Pillar 0{pillar.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-serif font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {pillar.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                        {pillar.summary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {pillar.principles.map((principle, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{principle}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Link
                      href={`/category/${pillar.slug}`}
                      className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Explore Channel Briefings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Fact-Checking & Editorial Review Process */}
        <section aria-labelledby="verification-heading" className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-8 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-bold block mb-1">
              Methodological Rigor
            </span>
            <h2 id="verification-heading" className="text-2xl sm:text-3xl font-serif font-black text-white">
              The EIRVAN Verification Standard
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-cyan-300 block">Step 01</span>
              <h3 className="text-lg font-serif font-bold text-white">Primary Source Mandate</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                We never cite secondary blogs or news summaries. Every assertion must map directly to published research preprints, SEC/regulatory filings, or audited clinical registries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-cyan-300 block">Step 02</span>
              <h3 className="text-lg font-serif font-bold text-white">Quantitative Replication</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Numerical claims—from FPGA packet parsing latencies to mitochondrial respiration rates—are stress-tested internally using mathematical models and verified benchmarks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-mono text-cyan-300 block">Step 03</span>
              <h3 className="text-lg font-serif font-bold text-white">Transparent Errata &amp; Versioning</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If new evidence challenges a published analysis, we issue public versioned revisions with clear errata logs, preserving historical scholarship without silent edits.
              </p>
            </div>
          </div>
        </section>

        {/* Curatorial Masthead / Staff Analysts */}
        <section aria-labelledby="masthead-heading" className="space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-bold block mb-1">
              Editorial Board
            </span>
            <h2 id="masthead-heading" className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
              Staff Analysts &amp; Contributing Fellows
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {editorialStaff.map((staff, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-700 text-white font-serif font-bold flex items-center justify-center text-lg shadow-sm">
                    {staff.name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">
                      {staff.name}
                    </h3>
                    <span className="text-xs text-blue-600 font-mono font-medium block">
                      {staff.role}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  {staff.institution}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {staff.bio}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Core Domain:</span>
                  <span className="text-slate-700 font-semibold">{staff.focus}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary Editorial Visual: The Craft */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xs">
          <div className="md:col-span-5 aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
            <img
              src="/src/assets/images/about_editorial_masthead_1794248632379.jpg"
              alt="Editorial typography proofs and analysis table"
              width={800}
              height={600}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="md:col-span-7 space-y-4">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-bold block">
              Editorial Craft
            </span>
            <h3 className="text-2xl font-serif font-bold text-slate-900 leading-snug">
              Architected for Focused Long-Form Reading
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every EIRVAN article is typeset with custom typographic proportions, measured 65-character line lengths, and deliberate whitespace hierarchies to prevent reading fatigue. Our platform is strictly zero-tracker, zero-telemetry, and fully accessible across desktop and mobile browsers.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-slate-500">
              <span>· Zero-CLS Layout Engine</span>
              <span>· Sub-100ms Hydration</span>
              <span>· Semantic HTML5</span>
            </div>
          </div>
        </div>

        {/* Academic Citation & Institutional Contact Box */}
        <section aria-labelledby="contact-heading" className="bg-slate-100/80 rounded-3xl p-8 sm:p-10 border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 id="contact-heading" className="text-xl font-serif font-bold text-slate-900">
                Institutional Inquiries &amp; Academic Citation
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                For researchers citing EIRVAN in academic publications or institutions submitting papers.
              </p>
            </div>
            <button
              onClick={handleCopyCitation}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-mono font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Citation Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Copy APA Citation</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
              <span className="font-mono text-slate-400 block text-[11px]">Editorial Submissions</span>
              <a href="mailto:editorial@eirvan.com" className="font-bold text-blue-600 hover:underline">
                editorial@eirvan.com
              </a>
              <p className="text-slate-500 text-[11px] pt-1">Peer review submissions and technical corrections.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
              <span className="font-mono text-slate-400 block text-[11px]">Press &amp; Syndication</span>
              <a href="mailto:press@eirvan.com" className="font-bold text-blue-600 hover:underline">
                press@eirvan.com
              </a>
              <p className="text-slate-500 text-[11px] pt-1">Media inquiries and academic syndication rights.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
              <span className="font-mono text-slate-400 block text-[11px]">Publisher Office</span>
              <span className="font-bold text-slate-900 block">EIRVAN Publication</span>
              <p className="text-slate-500 text-[11px] pt-1">Global digital distribution. Open research access.</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA to Return to Latest Dispatches */}
        <div className="text-center pt-4">
          <Link
            href="/"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <span>Explore Current Editorial Dispatches</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </article>
  );
};

export default AboutPage;

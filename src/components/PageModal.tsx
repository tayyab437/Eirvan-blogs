import React from 'react';
import { X, ShieldCheck, FileText, Lock, Globe, Sparkles } from 'lucide-react';

interface PageModalProps {
  type: 'about' | 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const PageModal: React.FC<PageModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img
              src="/images/brand/eirvan-icon-192.webp"
              alt="EIRVAN Icon"
              width={32}
              height={32}
              decoding="async"
              className="w-8 h-8 rounded-xl object-contain shadow-xs"
            />
            <div>
              <h3 className="font-serif font-black text-lg text-slate-900">
                {type === 'about' && 'About EIRVAN'}
                {type === 'terms' && 'Terms of Service'}
                {type === 'privacy' && 'Privacy Policy'}
              </h3>
              <span className="text-[10px] font-mono uppercase text-blue-600 font-bold block -mt-0.5">
                EIRVAN.COM · Official Publication Document
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
          
          {/* ABOUT US CONTENT */}
          {type === 'about' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-900 font-medium">
                  <strong>EIRVAN</strong> ("Explore · Learn · Stay Informed") is an independent, multi-niche publication engineered for technical excellence and journalistic rigor.
                </p>
              </div>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                1. Our Editorial Mission
              </h4>
              <p>
                At EIRVAN.COM, our editorial desk dissects frontier shifts across four primary channels: Deep Computing &amp; Artificial Intelligence, Quantitative Global Markets, Cognitive Ergonomics &amp; Deep Work, and Cellular Longevity &amp; Biotechnology.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                2. Google Helpful Content &amp; Core Web Vitals
              </h4>
              <p>
                Every briefing published on EIRVAN is researched by domain specialists and engineered to meet Google’s highest Core Web Vitals standards (Zero CLS, sub-second LCP, and comprehensive Schema.org JSON-LD structured data).
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                3. Editorial Contact &amp; Corrections Desk
              </h4>
              <p>
                For editorial inquiries, expert submissions, or technical corrections, contact our editorial board directly at <a href="mailto:editor@eirvan.com" className="text-blue-600 font-bold hover:underline">editor@eirvan.com</a>.
              </p>
            </div>
          )}

          {/* TERMS OF SERVICE CONTENT */}
          {type === 'terms' && (
            <div className="space-y-4">
              <p className="text-slate-500 font-mono text-[11px]">
                Last Updated: March 2026 · Effective Date: Immediate
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-1">
                1. Acceptance of Terms
              </h4>
              <p>
                By accessing or reading EIRVAN (EIRVAN.COM), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the publication.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                2. Intellectual Property &amp; Content Licensing
              </h4>
              <p>
                All editorial analyses, original figures, custom research summaries, and software tools hosted on EIRVAN are the exclusive property of EIRVAN. Personal, non-commercial sharing with proper attribution and canonical links is encouraged.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                3. Financial &amp; Health Disclaimers
              </h4>
              <p>
                Content published under Global Markets &amp; Quantitative Finance or Biotech &amp; Longevity is provided strictly for educational and informational purposes. Nothing on EIRVAN constitutes individualized financial, legal, or medical advice.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                4. Advertisements &amp; Sponsored Links
              </h4>
              <p>
                EIRVAN displays native advertisements and Google AdSense inventory. Third-party advertisers are responsible for ensuring that material submitted complies with applicable international advertising laws.
              </p>
            </div>
          )}

          {/* PRIVACY POLICY CONTENT */}
          {type === 'privacy' && (
            <div className="space-y-4">
              <p className="text-slate-500 font-mono text-[11px]">
                Privacy Standard: GDPR &amp; CCPA Compliant · Updated: March 2026
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-1">
                1. Information We Collect
              </h4>
              <p>
                EIRVAN prioritizes reader privacy. We collect minimal telemetry required to deliver high-performance page loading:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Anonymized aggregate pageviews and scroll milestones.</li>
                <li>Newsletter subscriber emails (when voluntarily provided for Weekly Dispatches).</li>
                <li>Cookies utilized by Google AdSense for personalized or non-personalized ad delivery.</li>
              </ul>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                2. Use of Cookies &amp; Telemetry
              </h4>
              <p>
                We utilize standard browser cookies and Google Analytics / AdSense tags to measure audience engagement and maintain server performance. Readers may disable cookies in browser settings without losing access to editorial content.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                3. Data Protection &amp; Third-Party Services
              </h4>
              <p>
                We do not sell, rent, or trade reader personal information. Firebase Authentication and Firestore database services manage credentials under Google Cloud enterprise security infrastructure.
              </p>

              <h4 className="text-base font-serif font-bold text-slate-900 pt-2">
                4. Data Subject Rights
              </h4>
              <p>
                To request deletion of your newsletter subscription or inquire about stored telemetry data, contact <a href="mailto:privacy@eirvan.com" className="text-blue-600 font-bold hover:underline">privacy@eirvan.com</a>.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            EIRVAN.COM Media
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Document
          </button>
        </div>

      </div>
    </div>
  );
};

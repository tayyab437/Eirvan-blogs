import React from 'react';
import { ArrowLeft, Mail, ShieldCheck, FileText, Globe } from 'lucide-react';
import { Link } from '../utils/router';

interface ContactPageProps {
  onBackToHome: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBackToHome }) => {
  const desks = [
    {
      title: 'Editorial & Submissions',
      email: 'editorial@eirvan.com',
      description: 'Story pitches, primary paper tips, expert interviews, and contributor inquiries across Technology, Business, Lifestyle, Education, and News.',
      icon: FileText
    },
    {
      title: 'Corrections & Standards',
      email: 'corrections@eirvan.com',
      description: 'Factual errata notices, citation updates, and post-publication methodology clarifications.',
      icon: ShieldCheck
    },
    {
      title: 'Privacy & Legal Requests',
      email: 'privacy@eirvan.com',
      description: 'GDPR / CCPA data inquiries, copyright licensing, and academic fair-use syndication permissions.',
      icon: Globe
    },
    {
      title: 'Press & Partnerships',
      email: 'press@eirvan.com',
      description: 'Institutional media inquiries, sponsorship disclosures, and newsletter syndication questions.',
      icon: Mail
    }
  ];

  return (
    <article className="min-h-screen bg-[#FAF9F6] text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-stone-500">
            <Link href="/" onClick={onBackToHome} className="hover:text-blue-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-900">Contact</span>
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
            EIRVAN Publication Directory
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">
            Contact the Editorial &amp; Standards Desk
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
            Direct email channels to reach EIRVAN editors, corrections reviewers, and compliance contacts without ticket queues.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {desks.map(desk => {
            const Icon = desk.icon;
            return (
              <section key={desk.title} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2.5 text-stone-900">
                  <Icon className="w-5 h-5 text-blue-900 shrink-0" aria-hidden="true" />
                  <h2 className="text-lg font-serif font-bold">{desk.title}</h2>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">{desk.description}</p>
                <div className="pt-2">
                  <a
                    href={`mailto:${desk.email}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-900 hover:underline"
                  >
                    <span>{desk.email}</span>
                  </a>
                </div>
              </section>
            );
          })}
        </div>

        <section className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-900">Looking for Editorial Policies?</h2>
            <p className="text-sm text-stone-600 mt-1">
              Review our primary sourcing rules, AI disclosure policy, and timestamped revision logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium shrink-0">
            <Link href="/editorial-policy" className="px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-blue-900">
              Editorial Policy
            </Link>
            <Link href="/corrections-policy" className="px-4 py-2.5 bg-white border border-stone-200 text-stone-800 rounded-lg hover:border-blue-900">
              Corrections Policy
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
};

export default ContactPage;

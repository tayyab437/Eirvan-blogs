import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, Sparkles, Shield, ArrowRight, Bell } from 'lucide-react';
import { StorageService } from '../services/storage';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Technology & AI',
    'Global Markets',
    'Biotech & Longevity'
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setEmail('');
      setErrorMessage('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !email.trim()) {
      setErrorMessage('Please enter your email address.');
      setStatus('error');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address (e.g. name@company.com).');
      setStatus('error');
      return;
    }

    setStatus('submitting');

    setTimeout(() => {
      const success = StorageService.addSubscriber(email);
      if (success) {
        setStatus('success');
      } else {
        setErrorMessage('Failed to save subscription. Please try again.');
        setStatus('error');
      }
    }, 600);
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden relative transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header pattern banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Subtle glow accent */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close subscription modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Executive Editorial Dispatch</span>
          </div>

          <h2 id="subscribe-modal-title" className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            EIRVAN Intelligence Weekly
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Join 32,000+ founders, researchers, and market strategists receiving our curated weekly analysis every Tuesday morning.
          </p>
        </div>

        {/* Form or Success View */}
        <div className="p-6 sm:p-8 space-y-6">
          {status === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-slate-900">
                  Welcome to EIRVAN Intelligence
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Confirmation sent to <span className="font-semibold text-slate-900">{email}</span>. You will receive your first editorial briefing in the upcoming cycle.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Subscribed Channels:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopics.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700">
                      ✓ {t}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Return to EIRVAN Briefings
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="subscribe-email-modal" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business / Institutional Email:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={inputRef}
                    id="subscribe-email-modal"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. evelyn.vance@institution.org"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
                    disabled={status === 'submitting'}
                  />
                </div>
                {status === 'error' && errorMessage && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {errorMessage}
                  </p>
                )}
              </div>

              {/* Topic Selectors */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Preferred Intelligence Tracks:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Technology & AI',
                    'Global Markets',
                    'Biotech & Longevity',
                    'Productivity & Mindset'
                  ].map(topic => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security & Spam Commitment */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Zero spam commitment. Unsubscribe at any time with a single click.</span>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {status === 'submitting' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Subscription...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Free Subscription</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, Shield, ArrowRight, Bell, Rss } from 'lucide-react';
import { StorageService } from '../services/storage';
import { CATEGORY_HUBS } from '../data/categories';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Technology',
    'Business',
    'News'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !re.test(email.trim())) {
      setErrorMessage('Please enter a valid email address (e.g. name@domain.com).');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setTimeout(() => {
      const success = StorageService.addSubscriber(email);
      if (success) {
        setStatus('success');
      } else {
        setErrorMessage('Unable to save preferences right now.');
        setStatus('error');
      }
    }, 250);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-modal-title"
    >
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden relative">
        <div className="bg-stone-900 p-6 sm:p-8 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-lg cursor-pointer"
            aria-label="Close subscription dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="text-xs font-mono uppercase tracking-widest text-stone-300 mb-2">
            EIRVAN Reader Dispatch
          </div>
          <h2 id="subscribe-modal-title" className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Follow New Briefings
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
            Save your preferred reading desks locally or connect your RSS reader to receive every published dispatch automatically.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {status === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  Preferences Saved
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  <span className="font-semibold text-stone-900">{email}</span> has been recorded locally for selected sections. For instant syndication alerts across all readers, subscribe directly via our XML feed.
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F6] rounded-xl border border-stone-200 text-left text-xs text-stone-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <Bell className="w-4 h-4 text-blue-900" aria-hidden="true" />
                  <span>Selected Desks: {selectedTopics.join(', ')}</span>
                </div>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-900 font-semibold hover:underline"
                >
                  <Rss className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open /rss.xml Feed</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-stone-900 hover:bg-blue-900 text-white font-semibold text-xs rounded-lg cursor-pointer"
              >
                Return to EIRVAN
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="subscribe-email-modal" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    id="subscribe-email-modal"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="reader@domain.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
                    disabled={status === 'submitting'}
                  />
                </div>
                {status === 'error' && errorMessage && (
                  <p className="text-xs text-rose-700 font-medium mt-1.5">{errorMessage}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-stone-700 mb-2">
                  Editorial Sections of Interest
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_HUBS.map(hub => {
                    const isSelected = selectedTopics.includes(hub.name);
                    return (
                      <button
                        key={hub.slug}
                        type="button"
                        onClick={() => toggleTopic(hub.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-stone-900 border-stone-900 text-white'
                            : 'bg-[#FAF9F6] border-stone-200 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        {hub.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <Shield className="w-3.5 h-3.5 text-blue-900 shrink-0" aria-hidden="true" />
                <span>Stored in local browser preferences on this static release. Or use <a href="/rss.xml" className="text-blue-900 underline">RSS 2.0</a>.</span>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3.5 bg-stone-900 hover:bg-blue-900 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Save Dispatch Preferences</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

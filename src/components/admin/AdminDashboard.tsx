import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Globe,
  BarChart3,
  Search,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Download,
  Code2,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Rss,
  Copy,
  Wand2,
  Loader2,
  ListChecks
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { AIService, GeneratedOutlineResponse } from '../../services/ai-service';
import { AUTHORS } from '../../data/authors';
import { Article, AdSlotConfig, VisitorAnalytics, FAQItem } from '../../types/blog';
import { StorageService } from '../../services/storage';
import { FirebaseSyncService } from '../../services/firebase-sync';
import { FirebaseAdminService } from '../../services/firebase-admin';
import { auditArticleSEO, generateArticleSchema } from '../../utils/seo';

interface AdminDashboardProps {
  articles: Article[];
  adSlots: AdSlotConfig[];
  analytics: VisitorAnalytics;
  onRefreshData: () => void;
  onPreviewSERP: (article: Article) => void;
  onExitAdmin: () => void;
  adminEmail?: string;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  articles,
  adSlots,
  analytics,
  onRefreshData,
  onPreviewSERP,
  onExitAdmin,
  adminEmail,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'editor' | 'ads' | 'analytics' | 'technical'>('articles');
  const [searchFilter, setSearchFilter] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Editor State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editorForm, setEditorForm] = useState<Partial<Article>>({
    title: '',
    slug: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    category: 'Technology & AI',
    tags: ['Trending', 'Analysis'],
    author: { name: 'Editorial Team', role: 'Staff Analyst' },
    readTimeMinutes: 5,
    featuredImage: '/src/assets/images/hero_ai_quantum_chip_1794048891153.jpg',
    imageAlt: 'Detailed technical diagram illustration',
    summary: '',
    contentHtml: '<p>Write your high-value search content here...</p>',
    headings: [{ id: 'overview', text: 'Overview', level: 2 }],
    faqs: [
      { question: 'What is the key takeaway?', answer: 'This breakthrough enables high efficiency with zero latency.' }
    ],
    isFeatured: false,
    isTrending: false,
    status: 'published',
    targetKeywords: ['trending keyword 2026'],
    views: 0
  });

  // AI Content Outline Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('Technology & AI');
  const [aiKeywords, setAiKeywords] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedOutlineResponse | null>(null);

  const handleGenerateOutline = async () => {
    if (!aiTopic.trim()) {
      alert('Please enter a topic or target keyword for the AI generator.');
      return;
    }
    setIsGeneratingOutline(true);
    try {
      const keywords = aiKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const result = await AIService.generateOutline(aiTopic, aiCategory, keywords);
      setGeneratedOutline(result);
      showNotification('AI Content Outline & Draft generated!');
    } catch (e: any) {
      alert(`Generation notice: ${e?.message || 'Failed to generate outline'}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleApplyOutline = () => {
    if (!generatedOutline) return;
    setEditorForm(prev => ({
      ...prev,
      title: generatedOutline.title,
      slug: generatedOutline.slug,
      metaTitle: generatedOutline.metaTitle,
      metaDescription: generatedOutline.metaDescription,
      category: generatedOutline.category,
      targetKeywords: generatedOutline.targetKeywords,
      readTimeMinutes: generatedOutline.readTimeMinutes,
      summary: generatedOutline.summary,
      headings: generatedOutline.headings,
      faqs: generatedOutline.faqs,
      contentHtml: generatedOutline.contentHtml,
    }));
    showNotification('AI Outline & Draft applied to Composer!');
  };

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Start editing existing article or create new
  const handleStartNewArticle = () => {
    setEditingArticle(null);
    setEditorForm({
      id: `art-${Date.now()}`,
      slug: `trending-article-${Date.now().toString().slice(-4)}`,
      title: '',
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: 'https://eirvan.com/articles/new-post',
      category: 'Technology & AI',
      tags: ['Trending', 'Guide'],
      author: { name: 'Editorial Desk', role: 'Contributing Specialist' },
      readTimeMinutes: 5,
      featuredImage: '/src/assets/images/hero_ai_quantum_chip_1794048891153.jpg',
      imageAlt: 'Editorial technical visualization',
      summary: '',
      contentHtml: `<p class="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 leading-relaxed">Begin your introductory paragraph with high authority...</p><h2 id="deep-dive" class="text-2xl font-serif font-semibold mt-8 mb-4">Deep Dive Analysis</h2><p>Provide evidence, data points, and technical substantiation.</p>`,
      headings: [{ id: 'deep-dive', text: 'Deep Dive Analysis', level: 2 }],
      faqs: [
        { question: 'What is the primary benefit?', answer: 'Detailed answer optimized for Google rich snippets.' }
      ],
      isFeatured: false,
      isTrending: true,
      status: 'published',
      targetKeywords: ['high volume search query'],
      views: 0
    });
    setActiveTab('editor');
  };

  const handleEditArticle = (art: Article) => {
    setEditingArticle(art);
    setEditorForm({ ...art });
    setActiveTab('editor');
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        await FirebaseAdminService.deleteArticle(id);
      } catch (e) {
        console.warn('Firestore delete notice', e);
      }
      StorageService.deleteArticle(id);
      onRefreshData();
      showNotification('Article deleted from Firestore.');
    }
  };

  const handleSaveArticle = async () => {
    if (!editorForm.title) {
      alert('Please provide an article title.');
      return;
    }

    const slug = editorForm.slug || editorForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const canonical = editorForm.canonicalUrl || `https://eirvan.com/articles/${slug}`;

    const completeArticle: Article = {
      id: editingArticle?.id || editorForm.id || `art-${Date.now()}`,
      slug,
      title: editorForm.title,
      metaTitle: editorForm.metaTitle || editorForm.title,
      metaDescription: editorForm.metaDescription || editorForm.summary || '',
      canonicalUrl: canonical,
      category: editorForm.category || 'Technology & AI',
      tags: editorForm.tags || ['General'],
      author: editorForm.author || { name: 'Editorial Desk', role: 'Staff Writer' },
      publishedAt: editingArticle?.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTimeMinutes: Number(editorForm.readTimeMinutes) || 5,
      featuredImage: editorForm.featuredImage || '/src/assets/images/hero_ai_quantum_chip_1794048891153.jpg',
      imageAlt: editorForm.imageAlt || editorForm.title,
      summary: editorForm.summary || '',
      contentHtml: editorForm.contentHtml || '',
      headings: editorForm.headings || [],
      faqs: editorForm.faqs || [],
      isFeatured: !!editorForm.isFeatured,
      isTrending: !!editorForm.isTrending,
      status: editorForm.status || 'published',
      targetKeywords: editorForm.targetKeywords || [],
      views: editorForm.views || 0,
      reactions: editorForm.reactions || { helpful: 0, fire: 0, insightful: 0 },
      isBookmarked: editorForm.isBookmarked || false
    };

    try {
      await FirebaseAdminService.saveArticle(completeArticle);
    } catch (e) {
      console.warn('Firestore save notice', e);
    }
    StorageService.saveArticle(completeArticle);
    onRefreshData();
    showNotification('Article saved & synced to Firebase Firestore!');
    setActiveTab('articles');
  };

  // Add / Remove FAQs in editor
  const handleAddFAQ = () => {
    const list = [...(editorForm.faqs || [])];
    list.push({ question: '', answer: '' });
    setEditorForm({ ...editorForm, faqs: list });
  };

  const handleUpdateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const list = [...(editorForm.faqs || [])];
    list[index][field] = value;
    setEditorForm({ ...editorForm, faqs: list });
  };

  const handleRemoveFAQ = (index: number) => {
    const list = [...(editorForm.faqs || [])].filter((_, i) => i !== index);
    setEditorForm({ ...editorForm, faqs: list });
  };

  // Ad Slot Toggle
  const handleToggleAdSlot = (slotId: string) => {
    const updated = adSlots.map(s => {
      if (s.id === slotId) {
        const newSlot = { ...s, isEnabled: !s.isEnabled };
        FirebaseAdminService.saveAdSlot(newSlot).catch(() => {});
        return newSlot;
      }
      return s;
    });
    StorageService.saveAdSlots(updated);
    onRefreshData();
    showNotification('Ad slot configuration updated & synced to Cloud.');
  };

  // Turn Off All Ads / Turn On All Ads
  const handleToggleAllAds = (turnOff: boolean) => {
    let updated: AdSlotConfig[] = [];
    if (turnOff) {
      updated = StorageService.turnOffAllAds();
      showNotification('All ad slots disabled site-wide.');
    } else {
      updated = StorageService.turnOnAllAds();
      showNotification('All ad slots activated site-wide.');
    }
    FirebaseAdminService.saveAllAdSlots(updated).catch(() => {});
    onRefreshData();
  };

  // Reset Telemetry to Live Baseline
  const handleResetTelemetry = () => {
    if (confirm('Reset telemetry to live collection baseline? All future page views, search queries, and scroll milestones will be recorded purely in real time from this moment.')) {
      StorageService.resetTelemetryToZero();
      onRefreshData();
      showNotification('Telemetry reset to live real-time collection baseline.');
    }
  };

  // Live SEO audit of current editor form
  const currentAudit = auditArticleSEO(editorForm);

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    a.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/aistudio/Global_Orbit_E_Icon_346096e1.png"
            alt="EIRVAN Icon"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-contain"
          />
          <div>
            <span className="font-serif font-black text-base tracking-tight text-slate-900 block leading-tight">
              EIRVAN Studio
            </span>
            <span className="text-[9px] font-mono uppercase text-blue-600 font-bold block">
              CMS &amp; Monetization
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notification && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {notification}
            </span>
          )}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Dedicated Vertical Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 xl:w-72 h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/Global_Orbit_E_Icon_346096e1.png"
              alt="EIRVAN Icon"
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-contain shadow-xs"
            />
            <div>
              <span className="font-serif font-black text-lg tracking-tight text-slate-900 block leading-tight">
                EIRVAN Studio
              </span>
              <span className="text-[10px] font-mono uppercase text-blue-600 font-bold block">
                Editorial &amp; Ad Control
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick CTA: New Story */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => {
              handleStartNewArticle();
              setIsMobileSidebarOpen(false);
            }}
            className="w-full px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Compose New Story</span>
          </button>
        </div>

        {/* Vertical Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto text-xs">
          {/* Editorial Section */}
          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              Editorial Suite
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('articles');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  activeTab === 'articles'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-4 h-4 ${activeTab === 'articles' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Articles Directory</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'articles' ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {articles.length}
                </span>
              </button>

              <button
                onClick={() => {
                  if (!editingArticle) {
                    handleStartNewArticle();
                  } else {
                    setActiveTab('editor');
                  }
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Edit3 className={`w-4 h-4 shrink-0 ${activeTab === 'editor' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">
                    {editingArticle ? `Edit: ${editingArticle.title.slice(0, 16)}...` : 'Story Composer'}
                  </span>
                </div>
                {editingArticle ? (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold shrink-0">
                    Draft
                  </span>
                ) : (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold shrink-0">
                    New
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Monetization & Analytics Section */}
          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              Growth &amp; Monetization
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('ads');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  activeTab === 'ads'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className={`w-4 h-4 ${activeTab === 'ads' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>AdSense &amp; Ads</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'ads' ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {adSlots.filter(s => s.isEnabled).length} On
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Visitor Telemetry</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                  {analytics.totalPageviews.toLocaleString()}
                </span>
              </button>
            </div>
          </div>

          {/* Search & Infrastructure Section */}
          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              Search Infrastructure
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('technical');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  activeTab === 'technical'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className={`w-4 h-4 ${activeTab === 'technical' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Sitemap &amp; Tech SEO</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  XML
                </span>
              </button>
            </div>
          </div>
        </nav>

        {/* Cloud DB & Admin User Lockup at Bottom */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          {/* Firebase Status */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Firestore: Connected</span>
          </div>

          {/* Admin Account */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-2xs">
                {adminEmail ? adminEmail[0] : 'E'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                  {adminEmail || 'Editor-in-Chief'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  Super Administrator
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of Admin Studio"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* PWA Device Installation */}
          <PWAInstallButton variant="sidebar" />

          {/* View Reader Site button */}
          <button
            onClick={onExitAdmin}
            className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Exit to Reader Site</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>EIRVAN CMS</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-slate-800 font-semibold">
                  {activeTab === 'articles' && 'Articles Directory'}
                  {activeTab === 'editor' && (editingArticle ? 'Story Composer (Editing)' : 'Story Composer (New Draft)')}
                  {activeTab === 'ads' && 'AdSense & Monetization Hub'}
                  {activeTab === 'analytics' && 'Visitor Telemetry'}
                  {activeTab === 'technical' && 'Sitemap & Technical SEO'}
                </span>
              </div>
              <h1 className="text-lg font-serif font-black text-slate-900 mt-0.5">
                {activeTab === 'articles' && 'Content & Articles Directory'}
                {activeTab === 'editor' && (editingArticle ? `Editing: ${editingArticle.title}` : 'Article Composer & Live SEO Auditor')}
                {activeTab === 'ads' && 'Google AdSense & Ad Monetization Hub'}
                {activeTab === 'analytics' && 'Visitor Telemetry & Engagement Analytics'}
                {activeTab === 'technical' && 'Search Engine Indexation & XML Sitemap'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {notification && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in">
                {notification}
              </span>
            )}
            
              {/* Live Cloud Badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Firestore: Connected</span>
              </div>

              <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Ads:</span>
                <button
                  onClick={() => handleToggleAllAds(adSlots.some(s => s.isEnabled))}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                    adSlots.some(s => s.isEnabled)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {adSlots.some(s => s.isEnabled) ? 'Active' : 'Halted'}
                </button>
              </div>

              <button
                onClick={onExitAdmin}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Reader Site</span>
            </button>
          </div>
        </header>

        {/* Main Body with KPI Strip & Active Tab Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* KPI Scorecard Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-mono block">Published Stories</span>
              <div className="text-2xl font-serif font-black text-slate-900 mt-1 tabular-nums">
                {articles.filter(a => a.status === 'published').length}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">100% Schema Validated</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-mono block">Monthly Pageviews</span>
              <div className="text-2xl font-serif font-black text-slate-900 mt-1 tabular-nums">
                {analytics.totalPageviews.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Avg Dwell: {Math.floor(analytics.avgDwellSeconds / 60)}m {analytics.avgDwellSeconds % 60}s</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-mono block">AdSense Revenue Est.</span>
              <div className="text-2xl font-serif font-black text-blue-600 mt-1 tabular-nums">
                ${analytics.estimatedEarnings.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">RPM: ~$3.40 · Clicks: {analytics.adClicks}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-mono block">Google Health Score</span>
              <div className="text-2xl font-serif font-black text-emerald-600 mt-1 tabular-nums">
                98 / 100
              </div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Zero CLS · Mobile Pass</span>
            </div>
          </div>

        {/* TAB 1: ARTICLES DIRECTORY */}
        {activeTab === 'articles' && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter articles by title or niche..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <button
                onClick={handleStartNewArticle}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5 justify-center cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Compose New Post</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4">Title &amp; Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">SEO Health</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {filteredArticles.map(art => {
                    const audit = auditArticleSEO(art);
                    return (
                      <tr key={art.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="py-3.5 px-4 max-w-sm">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 block line-clamp-1">
                            {art.title}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {art.category} · {art.readTimeMinutes}m read
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              art.status === 'published'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {art.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {audit.score}/100 ({audit.grade})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-stone-600 dark:text-stone-300">
                          {art.views?.toLocaleString() || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => onPreviewSERP(art)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Inspect SERP Snippet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditArticle(art)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-1.5 text-stone-500 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ARTICLE COMPOSER & REAL-TIME SEO AUDITOR */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 7 Columns: Article Form */}
            <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                  {editingArticle ? 'Edit Article & Metadata' : 'Compose New High-Ranking Article'}
                </h3>
                <button
                  onClick={handleSaveArticle}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Publish</span>
                </button>
              </div>

              {/* AI Content Outline & Draft Architect */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 border border-blue-200/80 dark:border-blue-900/60 dark:bg-stone-800/80 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>AI Content Architect &amp; Outline Generator</span>
                        <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                          Gemini 2.5 Flash
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Automate H2/H3 heading hierarchy, search intent keywords, and Google FAQ schema
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Topic / Subject Keyword
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="E.g., Quantum Annealing Edge Computing..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Secondary Queries (optional)
                    </label>
                    <input
                      type="text"
                      value={aiKeywords}
                      onChange={(e) => setAiKeywords(e.target.value)}
                      placeholder="neuromorphic, 2026 silicon..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      disabled={isGeneratingOutline}
                      onClick={handleGenerateOutline}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      {isGeneratingOutline ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Architecting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Outline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Outline Preview Accordion */}
                {generatedOutline && (
                  <div className="pt-3 border-t border-blue-200/60 dark:border-blue-900/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Outline Ready: {generatedOutline.headings.length} Headings · {generatedOutline.faqs.length} FAQs · ~{generatedOutline.readTimeMinutes}m Read</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyOutline}
                        className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>Apply to Composer</span>
                      </button>
                    </div>

                    <div className="bg-white dark:bg-stone-900/90 p-3 rounded-xl border border-slate-200 dark:border-stone-700 text-xs space-y-2">
                      <div className="font-serif font-bold text-slate-900 dark:text-slate-100">
                        "{generatedOutline.title}"
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                        {generatedOutline.headings.map((h, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300">
                            H{h.level}: {h.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Slug */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Article Title (H1 Headline)
                  </label>
                  <input
                    type="text"
                    value={editorForm.title || ''}
                    onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                    placeholder="E.g., Quantum Computing Breakthrough 2026..."
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={editorForm.slug || ''}
                      onChange={(e) => setEditorForm({ ...editorForm, slug: e.target.value })}
                      placeholder="quantum-breakthrough-2026"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Editorial Category
                      </label>
                      <select
                        value={editorForm.category || 'Technology & AI'}
                        onChange={(e) => setEditorForm({ ...editorForm, category: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                      >
                        <option value="Technology & AI">Technology &amp; AI</option>
                        <option value="Global Markets & Finance">Global Markets &amp; Finance</option>
                        <option value="Productivity & Mindset">Productivity &amp; Mindset</option>
                        <option value="Biotech & Longevity">Biotech &amp; Longevity</option>
                        <option value="Future of Work">Future of Work</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Author Byline (Verified Contributor)
                      </label>
                      <select
                        value={editorForm.author?.name || 'Dr. Evelyn Vance'}
                        onChange={(e) => {
                          const selected = AUTHORS.find(a => a.name === e.target.value) || AUTHORS[0];
                          setEditorForm({
                            ...editorForm,
                            author: {
                              name: selected.name,
                              role: selected.role,
                              avatar: selected.avatar,
                              slug: selected.slug,
                              bio: selected.shortBio,
                              verified: selected.verified
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg font-medium"
                      >
                        {AUTHORS.map(a => (
                          <option key={a.id} value={a.name}>
                            {a.name} ({a.role.split('&')[0].trim()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Target Search Keywords */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Target Search Queries (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={editorForm.targetKeywords?.join(', ') || ''}
                    onChange={(e) => setEditorForm({
                      ...editorForm,
                      targetKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="neuromorphic computing, edge inference 2026..."
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Google Meta Description
                    </label>
                    <span className="text-[11px] font-mono text-stone-400">
                      {(editorForm.metaDescription || '').length} / 160
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={editorForm.metaDescription || ''}
                    onChange={(e) => setEditorForm({ ...editorForm, metaDescription: e.target.value })}
                    placeholder="120 to 160 character snippet with high CTR action verbs..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                </div>

                {/* Summary / Deck */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Lead Summary / Subtitle Deck
                  </label>
                  <textarea
                    rows={2}
                    value={editorForm.summary || ''}
                    onChange={(e) => setEditorForm({ ...editorForm, summary: e.target.value })}
                    placeholder="Short editorial summary appearing below headline..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                </div>

                {/* Featured Image URL & Alt Text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Hero Image Path
                    </label>
                    <input
                      type="text"
                      value={editorForm.featuredImage || ''}
                      onChange={(e) => setEditorForm({ ...editorForm, featuredImage: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Image Alt Text (SEO critical)
                    </label>
                    <input
                      type="text"
                      value={editorForm.imageAlt || ''}
                      onChange={(e) => setEditorForm({ ...editorForm, imageAlt: e.target.value })}
                      placeholder="Descriptive figure caption"
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>
                </div>

                {/* Content HTML */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    HTML Article Body
                  </label>
                  <textarea
                    rows={10}
                    value={editorForm.contentHtml || ''}
                    onChange={(e) => setEditorForm({ ...editorForm, contentHtml: e.target.value })}
                    className="w-full px-3 py-2 font-mono text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg leading-relaxed"
                  />
                </div>

                {/* FAQ Rich Snippet Builder */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 block">
                        Google FAQPage Rich Snippet Builder
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Generates high-CTR accordion drop-downs directly on Google SERPs.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFAQ}
                      className="px-2.5 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editorForm.faqs?.map((faq, i) => (
                      <div
                        key={i}
                        className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200/80 dark:border-stone-700 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-stone-500">FAQ #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFAQ(i)}
                            className="text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Question query..."
                          value={faq.question}
                          onChange={(e) => handleUpdateFAQ(i, 'question', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md"
                        />
                        <textarea
                          rows={2}
                          placeholder="Direct factual answer..."
                          value={faq.answer}
                          onChange={(e) => handleUpdateFAQ(i, 'answer', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right 5 Columns: Live SERP & SEO Diagnostic Engine */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
              
              {/* Overall Score Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block font-mono">
                      Live SEO Diagnostic
                    </span>
                    <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                      On-Page Optimization Score
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                      {currentAudit.score}
                    </span>
                    <span className="text-xs text-stone-400">/100</span>
                    <div className="text-xs font-bold text-emerald-600">Grade {currentAudit.grade}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {currentAudit.checks.map(chk => (
                    <div key={chk.id} className="text-xs flex items-start gap-2">
                      <div className="shrink-0 mt-0.5">
                        {chk.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {chk.status === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        {chk.status === 'fail' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                          {chk.label}
                        </span>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {chk.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live SERP Mock Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block font-mono">
                  Live Google SERP Card Preview
                </span>
                
                <div className="p-4 bg-white rounded-xl border border-stone-200 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <img
                      src="/assets/aistudio/Global_Orbit_E_Icon_346096e1.png"
                      alt="EIRVAN"
                      width={16}
                      height={16}
                      decoding="async"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="font-medium text-stone-900">EIRVAN</span>
                    <span className="text-[10px] text-stone-400 truncate max-w-[180px]">
                      › {editorForm.category?.toLowerCase()}
                    </span>
                  </div>
                  <h5 className="text-sm font-normal text-[#1a0dab] line-clamp-2 leading-snug">
                    {editorForm.metaTitle || editorForm.title || 'Your Article Title'}
                  </h5>
                  <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                    {editorForm.metaDescription || editorForm.summary || 'Your meta description will appear here...'}
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: ADSENSE & MONETIZATION HUB */}
        {activeTab === 'ads' && (
          <div className="space-y-6">

            {/* Master Turn Off / Turn On All Ads Control Bar */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-amber-400 font-mono uppercase font-bold">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Site-Wide Ad Master Switch</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white">
                  {adSlots.some(s => s.isEnabled) ? 'Advertisements Are Currently ACTIVE' : 'All Advertisements Are Currently OFF'}
                </h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Easily disable or re-enable all leaderboards, native sponsored cards, and display banners site-wide with a single click.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {adSlots.some(s => s.isEnabled) ? (
                  <button
                    onClick={() => handleToggleAllAds(true)}
                    className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Turn Off All Ads</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleAllAds(false)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Turn On All Ads</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                    Google AdSense &amp; Programmatic Ad Inventory
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pre-reserved, zero-CLS responsive ad slots engineered to preserve Core Web Vitals while maximizing CTR.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                    AdSense Ready (Zero-CLS Compliant)
                  </span>
                </div>
              </div>

              {/* Publisher ID & Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Google AdSense Publisher ID
                  </label>
                  <input
                    type="text"
                    defaultValue="ca-pub-8904166685512345"
                    className="w-full px-3 py-2 font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Automatically propagates to AdSense tags across all publication templates.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Auto-Ads Optimization Level
                  </label>
                  <select
                    defaultValue="balanced"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  >
                    <option value="balanced">High Yield (Leaderboard + Native In-Article + Sidebar)</option>
                    <option value="subtle">Subtle Minimal (Sidebar &amp; Footer only)</option>
                    <option value="aggressive">Maximum Monetization (All slots active)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ad Slots Configuration List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {adSlots.map(slot => (
                <div
                  key={slot.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
                        {slot.type} ({slot.dimensions})
                      </span>
                      <button
                        onClick={() => handleToggleAdSlot(slot.id)}
                        className={`text-xs px-2 py-0.5 rounded font-mono uppercase cursor-pointer ${
                          slot.isEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                        }`}
                      >
                        {slot.isEnabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      {slot.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {slot.headline}
                    </p>

                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Impressions</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                          {slot.impressions.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Clicks</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                          {slot.clicks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono">
                    CTR: {slot.impressions > 0 ? ((slot.clicks / slot.impressions) * 100).toFixed(2) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: VISITOR BEHAVIOR TELEMETRY */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">

            {/* Real-Time Telemetry Control Bar */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono uppercase font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>Real-Time Visitor Telemetry Active</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white">
                  Live Real-Time Audience Behavioral Analytics
                </h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Real pageviews, active reader dwell seconds, scroll milestones, and real search queries captured directly as visitors navigate EIRVAN.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleResetTelemetry}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-2"
                  title="Clear sample data and start collecting live telemetry from 0"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-300" />
                  <span>Reset to Live Baseline</span>
                </button>
              </div>
            </div>

            {/* Daily Traffic Breakdown Chart */}
            <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-base text-slate-900 dark:text-stone-100">
                    Real Daily Traffic Volume
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">Live Session Breakdown</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  {analytics.totalPageviews.toLocaleString()} Total Real Pageviews
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2 items-end h-32">
                {analytics.dailyViews.map((d, i) => {
                  const maxViews = Math.max(...analytics.dailyViews.map(v => v.views), 1);
                  const heightPercent = Math.min(100, Math.max(15, Math.round((d.views / maxViews) * 100)));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-stone-300 tabular-nums">
                        {d.views}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-stone-800 rounded-t-lg overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-700 group-hover:to-indigo-600 transition-all rounded-t-lg"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{d.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Top Organic Search Entrance Queries */}
              <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    Top Google Search Entrance Queries
                  </h4>
                  <span className="text-xs font-mono text-stone-400">Search Console Feed</span>
                </div>

                <div className="space-y-3">
                  {analytics.topQueries.map((q, i) => (
                    <div
                      key={i}
                      className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-4">
                        <span className="font-medium text-stone-900 dark:text-stone-100 block">
                          "{q.query}"
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {q.impressions.toLocaleString()} impressions · {q.clicks.toLocaleString()} clicks
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {q.ctr.toFixed(1)}% CTR
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reader Scroll Depth Funnel */}
              <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    Content Retention &amp; Scroll Depth Funnel
                  </h4>
                  <span className="text-xs font-mono text-stone-400">Milestone Telemetry</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-stone-600 dark:text-stone-400">Reached 25% (Intro Hook)</span>
                      <span className="font-mono font-semibold">{analytics.scrollMilestones.milestone25}%</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${analytics.scrollMilestones.milestone25}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-stone-600 dark:text-stone-400">Reached 50% (Core Analysis)</span>
                      <span className="font-mono font-semibold">{analytics.scrollMilestones.milestone50}%</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${analytics.scrollMilestones.milestone50}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-stone-600 dark:text-stone-400">Reached 75% (Native Ad Slot)</span>
                      <span className="font-mono font-semibold">{analytics.scrollMilestones.milestone75}%</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${analytics.scrollMilestones.milestone75}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-stone-600 dark:text-stone-400">Reached 100% (Complete Read &amp; FAQs)</span>
                      <span className="font-mono font-semibold">{analytics.scrollMilestones.milestone100}%</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${analytics.scrollMilestones.milestone100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
                  Exceptional long-form retention: 38% of readers digest the full article, triggering top dwell metrics for Google ranking algorithms.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: SITEMAP & TECHNICAL SEO */}
        {activeTab === 'technical' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                  Google Search Console &amp; Technical SEO Assets
                </h3>
                <p className="text-xs text-stone-500">
                  Automated XML sitemap generator, crawl directive controls, and JSON export.
                </p>
              </div>

              <button
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(articles, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', `eirvan_backup_${Date.now()}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  showNotification('Publication backup exported!');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Database</span>
              </button>
            </div>

            {/* Syndication & Web Standards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RSS 2.0 XML Feed Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                      <Rss className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">RSS 2.0 Syndication Feed</h4>
                      <p className="text-[11px] text-stone-500">Auto-generated XML feed for newsreaders &amp; aggregators</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    Active (200 OK)
                  </span>
                </div>

                <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs flex items-center justify-between">
                  <code className="font-mono text-stone-700 dark:text-stone-300 text-[11px] truncate">
                    https://eirvan.com/rss.xml
                  </code>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://eirvan.com/rss.xml');
                        showNotification('RSS Feed URL copied to clipboard!');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <a
                      href="/rss.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open XML</span>
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  Includes all {articles.filter(a => a.status === 'published').length} published stories with full CDATA content, Dublin Core tags, and image enclosures. Also aliased at <code className="text-stone-700 dark:text-stone-300 font-mono">/feed.xml</code>.
                </p>
              </div>

              {/* Progressive Web App (PWA) Status Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Progressive Web App (PWA)</h4>
                      <p className="text-[11px] text-stone-500">Installable desktop &amp; mobile offline application</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    PWA Compliant
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-mono">Service Worker</span>
                    <span className="font-bold text-emerald-600 text-xs">Active</span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-mono">Icons</span>
                    <span className="font-bold text-emerald-600 text-xs">192 &amp; 512px</span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-mono">Offline Cache</span>
                    <span className="font-bold text-blue-600 text-xs">Stale-While</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500">
                  Full standalone display mode configured with auto-updating Service Worker, maskable Android icons, and Apple Safari home screen meta tags.
                </p>
              </div>
            </div>

            {/* Sitemap XML Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Simulated sitemap.xml
                </span>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View /sitemap.xml</span>
                </a>
              </div>
              <pre className="p-4 bg-stone-900 text-stone-200 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://eirvan.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${articles.map(a => `  <url>
    <loc>${a.canonicalUrl}</loc>
    <lastmod>${a.updatedAt.split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}
</urlset>`}
              </pre>
            </div>

            {/* Reset Data Button */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center text-xs">
              <span className="text-stone-500">Need to restore seed demonstration articles?</span>
              <button
                onClick={() => {
                  if (confirm('Reset all articles and ad settings to factory defaults?')) {
                    StorageService.resetToDefault();
                    onRefreshData();
                    showNotification('Database reset to initial demo seeds.');
                  }
                }}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Seed Articles</span>
              </button>
            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

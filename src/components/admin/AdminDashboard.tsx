import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  DollarSign,
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
  Menu,
  X,
  LogOut,
  ChevronRight,
  Rss,
  Copy,
  Wand2,
  Loader2,
  ListChecks,
  Link2,
  BookOpen,
  History,
  ShieldCheck
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { AIService, GeneratedOutlineResponse } from '../../services/ai-service';
import { AUTHORS } from '../../data/authors';
import { AdminUser } from '../../services/auth-service';
import {
  applyAuthorizedApproval,
  computeArticleRevisionHash,
  invalidateApprovalOnSubstantiveChange,
  validateEditorialApproval
} from '../../utils/editorialApproval';
import { CATEGORY_HUBS, getCategoryHubByName, normalizeCategoryName } from '../../data/categories';
import {
  Article,
  ArticleStatus,
  ArticleSchemaType,
  RobotsDirective,
  SearchIntent,
  PublicAdSlot,
  AdMetricsLoadStatus,
  AdSlotConfig,
  VisitorAnalytics
} from '../../types/blog';
import { StorageService, toPublicAdSlot } from '../../services/storage';
import { FirebaseAdminService } from '../../services/firebase-admin';
import { auditArticleSEO, isPublicIndexableArticle } from '../../utils/seo';
import { sanitizeArticleHtml } from '../../utils/sanitize';
import { generateSitemapXml } from '../../utils/sitemap';
import { generateRSSFeed } from '../../utils/rss';
import { getAnalyticsConfigSummary } from '../../utils/analytics';

interface AdminDashboardProps {
  articles: Article[];
  adSlots: AdSlotConfig[];
  adMetricsStatus?: AdMetricsLoadStatus;
  analytics: VisitorAnalytics;
  onRefreshData: () => void;
  onPreviewSERP: (article: Article) => void;
  onExitAdmin: () => void;
  adminEmail?: string;
  adminUser?: AdminUser | null;
  onLogout?: () => void;
}

const ALL_STATUSES: ArticleStatus[] = [
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived'
];

const STATUS_BADGE_MAP: Record<ArticleStatus, string> = {
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  draft: 'bg-stone-100 text-stone-700 border-stone-200',
  archived: 'bg-stone-200 text-stone-600 border-stone-300'
};

function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  articles,
  adSlots,
  adMetricsStatus = 'ready',
  analytics,
  onRefreshData,
  onPreviewSERP,
  onExitAdmin,
  adminEmail,
  adminUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'editor' | 'ads' | 'analytics' | 'technical'>('articles');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetTelemetry, setConfirmResetTelemetry] = useState(false);
  const [confirmResetSeeds, setConfirmResetSeeds] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Editor State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editorForm, setEditorForm] = useState<Partial<Article>>({
    title: '',
    slug: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    category: 'Technology',
    topicCluster: 'Neuromorphic Silicon',
    tags: ['Technology', 'Analysis'],
    author: {
      name: AUTHORS[0].name,
      role: AUTHORS[0].role,
      avatar: AUTHORS[0].avatar,
      slug: AUTHORS[0].slug,
      verified: true
    },
    reviewer: undefined,
    readTimeMinutes: 5,
    featuredImage: '/images/articles/neuromorphic-silicon-1200.webp',
    socialImage: '/images/articles/neuromorphic-silicon-1200.jpg',
    imageAlt: 'Detailed editorial illustration',
    summary: '',
    contentHtml: '<p>Write primary-sourced analysis with verifiable citations here...</p>',
    headings: [{ id: 'overview', text: 'Overview', level: 2 }],
    faqs: [
      { question: 'What is the core finding?', answer: 'Provide a direct factual synthesis grounded in primary sources.' }
    ],
    sources: [],
    relatedArticleIds: [],
    previousSlugs: [],
    focusTopic: '',
    secondaryTopics: [],
    searchIntent: 'informational',
    articleType: 'Article',
    robotsDirective: 'index, follow',
    aiAssisted: false,
    humanReviewed: false,
    reviewedAt: undefined,
    reviewedRevisionHash: undefined,
    approval: undefined,
    editorialNotes: '',
    changelog: [],
    isFeatured: false,
    isTrending: false,
    status: 'draft',
    targetKeywords: [],
    views: 0
  });

  // AI Content Outline Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('Technology');
  const [aiKeywords, setAiKeywords] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedOutlineResponse | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleGenerateOutline = async () => {
    if (!aiTopic.trim()) {
      setValidationError('Enter a topic or target subject before generating an outline.');
      return;
    }
    setValidationError(null);
    setIsGeneratingOutline(true);
    try {
      const keywords = aiKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const result = await AIService.generateOutline(aiTopic, aiCategory, keywords);
      setGeneratedOutline(result);
      showNotification('AI editorial outline ready for human review.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate outline';
      setValidationError(`Outline generation notice: ${msg}`);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleApplyOutline = () => {
    if (!generatedOutline) return;
    const normalizedCat = normalizeCategoryName(generatedOutline.category);
    const hub = getCategoryHubByName(normalizedCat);
    const slug = generatedOutline.slug || slugifyTitle(generatedOutline.title);
    setEditorForm(prev => ({
      ...prev,
      title: generatedOutline.title,
      slug,
      canonicalUrl: `https://eirvan.com/articles/${slug}`,
      metaTitle: generatedOutline.metaTitle,
      metaDescription: generatedOutline.metaDescription,
      category: normalizedCat,
      topicCluster: hub.clusters[0],
      targetKeywords: generatedOutline.targetKeywords,
      focusTopic: generatedOutline.targetKeywords[0] || aiTopic,
      readTimeMinutes: generatedOutline.readTimeMinutes,
      summary: generatedOutline.summary,
      headings: generatedOutline.headings,
      faqs: generatedOutline.faqs,
      contentHtml: generatedOutline.contentHtml,
      aiAssisted: true,
      humanReviewed: false,
      status: 'draft'
    }));
    showNotification('Outline applied as draft. Complete human review before publishing.');
  };

  const handleStartNewArticle = () => {
    setEditingArticle(null);
    setValidationError(null);
    const id = `art-${Date.now()}`;
    const slug = `dispatch-${Date.now().toString().slice(-4)}`;
    setEditorForm({
      id,
      slug,
      title: '',
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: `https://eirvan.com/articles/${slug}`,
      category: 'Technology',
      topicCluster: 'Neuromorphic Silicon',
      tags: ['Analysis'],
      author: {
        name: AUTHORS[0].name,
        role: AUTHORS[0].role,
        avatar: AUTHORS[0].avatar,
        slug: AUTHORS[0].slug,
        bio: AUTHORS[0].shortBio,
        verified: true
      },
      reviewer: undefined,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTimeMinutes: 5,
      featuredImage: '/images/articles/neuromorphic-silicon-1200.webp',
      socialImage: '/images/articles/neuromorphic-silicon-1200.jpg',
      imageAlt: 'Technical editorial figure',
      summary: '',
      contentHtml:
        '<h2 id="context">Background &amp; Technical Context</h2><p>Establish factual scope and link to primary documentation.</p><h2 id="analysis">Key Findings &amp; Trade-offs</h2><p>Present verifiable evidence, methodology, and limitations.</p>',
      headings: [
        { id: 'context', text: 'Background & Technical Context', level: 2 },
        { id: 'analysis', text: 'Key Findings & Trade-offs', level: 2 }
      ],
      faqs: [
        { question: 'What is the primary finding?', answer: 'Summarize key conclusions grounded in cited primary sources.' }
      ],
      sources: [],
      relatedArticleIds: [],
      previousSlugs: [],
      focusTopic: '',
      secondaryTopics: [],
      searchIntent: 'informational',
      articleType: 'Article',
      robotsDirective: 'index, follow',
      aiAssisted: false,
      humanReviewed: false,
      reviewedAt: undefined,
      reviewedRevisionHash: undefined,
      approval: undefined,
      editorialNotes: '',
      changelog: [],
      isFeatured: false,
      isTrending: false,
      status: 'draft',
      targetKeywords: [],
      views: 0
    });
    setActiveTab('editor');
  };

  const handleEditArticle = (art: Article) => {
    setEditingArticle(art);
    setValidationError(null);
    setEditorForm({
      ...art,
      category: normalizeCategoryName(art.category),
      sources: art.sources || [],
      previousSlugs: art.previousSlugs || [],
      relatedArticleIds: art.relatedArticleIds || [],
      secondaryTopics: art.secondaryTopics || [],
      changelog: art.changelog || [],
      reviewer: art.reviewer,
      reviewedAt: art.reviewedAt,
      reviewedRevisionHash: art.reviewedRevisionHash,
      approval: art.approval
    });
    setActiveTab('editor');
  };

  const currentRevisionHash = useMemo(() => computeArticleRevisionHash(editorForm), [editorForm]);
  const approvalCheck = useMemo(() => validateEditorialApproval(editorForm), [editorForm]);

  // Automatically invalidate any prior approval sign-off if substantive fields change in the composer
  useEffect(() => {
    if (
      editorForm.humanReviewed &&
      (!editorForm.approval?.reviewedRevisionHash ||
        editorForm.approval.reviewedRevisionHash !== currentRevisionHash)
    ) {
      setEditorForm(prev => {
        const nextStatus: ArticleStatus =
          prev.status && ['approved', 'scheduled', 'published'].includes(prev.status)
            ? 'in_review'
            : prev.status || 'draft';
        return {
          ...prev,
          status: nextStatus,
          humanReviewed: false,
          reviewedAt: undefined,
          reviewedRevisionHash: undefined,
          approval: undefined,
          reviewer: undefined
        };
      });
      showNotification(
        'Substantive edit detected — previous editorial approval invalidated until re-reviewed.'
      );
    }
  }, [
    currentRevisionHash,
    editorForm.humanReviewed,
    editorForm.approval?.reviewedRevisionHash
  ]);

  const handleApproveCurrentRevision = () => {
    setValidationError(null);
    if (!adminUser?.uid || !adminUser?.email) {
      setValidationError(
        'Approval Blocked: Only an authenticated, verified Administrator session with a valid UID can sign off articles.'
      );
      return;
    }
    try {
      const signed = applyAuthorizedApproval(editorForm, {
        uid: adminUser.uid,
        email: adminUser.email,
        displayName: adminUser.displayName || adminUser.email.split('@')[0],
        role: adminUser.role || 'Authorized Administrator'
      });
      setEditorForm(signed);
      showNotification(
        `Revision ${signed.reviewedRevisionHash?.slice(0, 12)} approved by ${signed.approval?.reviewerName}.`
      );
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Unable to record editorial approval.');
    }
  };

  const handleRevokeApproval = () => {
    setEditorForm(prev => ({
      ...prev,
      humanReviewed: false,
      reviewedAt: undefined,
      reviewedRevisionHash: undefined,
      approval: undefined,
      reviewer: undefined,
      status:
        prev.status && ['approved', 'scheduled', 'published'].includes(prev.status)
          ? 'in_review'
          : prev.status
    }));
    showNotification('Editorial approval cleared. Status set to In Review.');
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await FirebaseAdminService.deleteArticle(id);
    } catch (e) {
      console.warn('Firestore delete notice', e);
    }
    StorageService.deleteArticle(id);
    setConfirmDeleteId(null);
    onRefreshData();
    showNotification('Article deleted.');
  };

  const handleSaveArticle = async () => {
    setValidationError(null);
    if (!editorForm.title || !editorForm.title.trim()) {
      setValidationError('Provide an article H1 title before saving.');
      return;
    }

    const slug = (editorForm.slug || slugifyTitle(editorForm.title)).replace(/^\/+|\/+$/g, '');
    const canonical =
      editorForm.canonicalUrl && editorForm.canonicalUrl.startsWith('https://eirvan.com/articles/')
        ? editorForm.canonicalUrl
        : `https://eirvan.com/articles/${slug}`;

    const sanitizedBody = sanitizeArticleHtml(editorForm.contentHtml || '');
    const wordCount = sanitizedBody.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const computedReadTime = Math.max(3, Math.ceil(wordCount / 210));
    const normalizedCat = normalizeCategoryName(editorForm.category);
    const nextStatus: ArticleStatus = editorForm.status || 'draft';

    const candidateArticle: Article = {
      id: editingArticle?.id || editorForm.id || `art-${Date.now()}`,
      slug,
      title: editorForm.title.trim(),
      metaTitle: (editorForm.metaTitle || editorForm.title).trim(),
      metaDescription: (editorForm.metaDescription || editorForm.summary || '').trim(),
      canonicalUrl: canonical,
      category: normalizedCat,
      topicCluster: editorForm.topicCluster || getCategoryHubByName(normalizedCat).clusters[0],
      tags: editorForm.tags && editorForm.tags.length > 0 ? editorForm.tags : [normalizedCat],
      author: editorForm.author || {
        name: AUTHORS[0].name,
        role: AUTHORS[0].role,
        avatar: AUTHORS[0].avatar,
        slug: AUTHORS[0].slug,
        verified: true
      },
      reviewer: editorForm.reviewer,
      publishedAt: editorForm.publishedAt || editingArticle?.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledAt: editorForm.scheduledAt || undefined,
      readTimeMinutes: Number(editorForm.readTimeMinutes) || computedReadTime,
      featuredImage: editorForm.featuredImage || '/images/articles/neuromorphic-silicon-1200.webp',
      socialImage: editorForm.socialImage || undefined,
      imageAlt: editorForm.imageAlt || editorForm.title.trim(),
      summary: (editorForm.summary || '').trim(),
      contentHtml: sanitizedBody,
      headings: editorForm.headings || [],
      faqs: (editorForm.faqs || []).filter(f => f.question.trim() && f.answer.trim()),
      sources: (editorForm.sources || []).filter(s => s.title.trim() && s.url.trim()),
      relatedArticleIds: editorForm.relatedArticleIds || [],
      previousSlugs: editorForm.previousSlugs || [],
      focusTopic: editorForm.focusTopic || undefined,
      secondaryTopics: editorForm.secondaryTopics || [],
      searchIntent: editorForm.searchIntent || 'informational',
      articleType: editorForm.articleType || 'Article',
      robotsDirective: editorForm.robotsDirective || 'index, follow',
      aiAssisted: Boolean(editorForm.aiAssisted),
      humanReviewed: Boolean(editorForm.humanReviewed),
      reviewedAt: editorForm.reviewedAt,
      reviewedRevisionHash: editorForm.reviewedRevisionHash,
      approval: editorForm.approval,
      editorialNotes: editorForm.editorialNotes || undefined,
      changelog: editorForm.changelog || [],
      isFeatured: Boolean(editorForm.isFeatured),
      isTrending: Boolean(editorForm.isTrending),
      status: nextStatus,
      targetKeywords: editorForm.targetKeywords || [],
      views: editorForm.views || 0,
      reactions: editorForm.reactions || { helpful: 0, fire: 0, insightful: 0 },
      isBookmarked: editorForm.isBookmarked || false
    };

    const validatedArticle = editingArticle
      ? invalidateApprovalOnSubstantiveChange(editingArticle, candidateArticle)
      : candidateArticle;

    if (['approved', 'scheduled', 'published'].includes(nextStatus)) {
      const check = validateEditorialApproval(validatedArticle);
      if (!check.valid || validatedArticle.status !== nextStatus) {
        setValidationError(
          `Release Gate Blocked (${nextStatus}): ${check.reason} Sign off the exact current revision as an authorized reviewer before moving to "${nextStatus}".`
        );
        return;
      }
    }

    try {
      await FirebaseAdminService.saveArticle(validatedArticle, editingArticle);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Editorial Gate Blocked')) {
        setValidationError(msg);
        return;
      }
      console.warn('Firestore save notice', e);
    }
    StorageService.saveArticle(validatedArticle);
    onRefreshData();
    showNotification(
      `Saved (${validatedArticle.status}). Run "npm run build" before uploading static dist/ to IONOS.`
    );
    setActiveTab('articles');
  };

  // FAQs handlers
  const handleAddFAQ = () => {
    setEditorForm(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };
  const handleUpdateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    setEditorForm(prev => {
      const list = [...(prev.faqs || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, faqs: list };
    });
  };
  const handleRemoveFAQ = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  // Sources handlers
  const handleAddSource = () => {
    setEditorForm(prev => ({
      ...prev,
      sources: [...(prev.sources || []), { title: '', publisher: '', url: '', year: '2026' }]
    }));
  };
  const handleUpdateSource = (
    index: number,
    field: 'title' | 'publisher' | 'url' | 'year',
    value: string
  ) => {
    setEditorForm(prev => {
      const list = [...(prev.sources || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, sources: list };
    });
  };
  const handleRemoveSource = (index: number) => {
    setEditorForm(prev => ({
      ...prev,
      sources: (prev.sources || []).filter((_, i) => i !== index)
    }));
  };

  // Changelog handlers
  const handleAddChangelog = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditorForm(prev => ({
      ...prev,
      changelog: [{ date: today, note: '' }, ...(prev.changelog || [])]
    }));
  };

  // Ad Slot Toggle (preserves strict Phase 2E–2I /adMetrics migration guard)
  const handleToggleAdSlot = async (slotId: string) => {
    const targetSlot = adSlots.find(s => s.id === slotId);
    if (!targetSlot) return;

    if (adMetricsStatus !== 'ready' || targetSlot.metricsStatus !== 'available') {
      showNotification('Edit blocked: ad slot must be migrated to /adMetrics before updating /adSlots.');
      return;
    }

    const updated: PublicAdSlot[] = adSlots.map(s => {
      const publicSlot = toPublicAdSlot(s);
      if (publicSlot.id === slotId) {
        return { ...publicSlot, isEnabled: !publicSlot.isEnabled };
      }
      return publicSlot;
    });
    const nextSlot = updated.find(s => s.id === slotId)!;

    try {
      await FirebaseAdminService.savePublicAdSlot(nextSlot);
      StorageService.saveAdSlots(updated);
      onRefreshData();
      showNotification('Ad slot configuration updated & synced to Cloud.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showNotification(
        msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')
          ? 'Blocked by Firestore protective rules until migration completes.'
          : 'Failed to update ad slot in Firestore.'
      );
    }
  };

  const handleToggleAllAds = async (turnOff: boolean) => {
    if (adMetricsStatus !== 'ready' || adSlots.some(s => s.metricsStatus !== 'available')) {
      showNotification('Site-wide edit blocked: all ad slots must complete /adMetrics migration first.');
      return;
    }

    const updated: PublicAdSlot[] = adSlots.map(s => ({
      ...toPublicAdSlot(s),
      isEnabled: !turnOff
    }));

    try {
      await FirebaseAdminService.saveAllPublicAdSlots(updated);
      StorageService.saveAdSlots(updated);
      onRefreshData();
      showNotification(turnOff ? 'All ad slots disabled site-wide.' : 'All ad slots activated site-wide.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showNotification(
        msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')
          ? 'Blocked by Firestore protective rules until migration completes.'
          : 'Failed to update ad slots in Firestore.'
      );
    }
  };

  const currentAudit = useMemo(() => auditArticleSEO(editorForm, articles), [editorForm, articles]);

  const catalogAverageScore = useMemo(() => {
    const pub = articles.filter(a => a.status === 'published');
    if (pub.length === 0) return 0;
    const sum = pub.reduce((acc, art) => acc + auditArticleSEO(art, articles).score, 0);
    return Math.round(sum / pub.length);
  }, [articles]);

  // Internal Link Suggestions for Composer
  const internalLinkSuggestions = useMemo(() => {
    const currentId = editingArticle?.id || editorForm.id;
    const activeCat = normalizeCategoryName(editorForm.category);
    const terms = new Set(
      [
        ...(editorForm.targetKeywords || []),
        editorForm.focusTopic || '',
        editorForm.topicCluster || '',
        ...(editorForm.title || '').split(/\s+/).filter(w => w.length > 4)
      ]
        .map(s => s.toLowerCase())
        .filter(Boolean)
    );

    return articles
      .filter(a => a.status === 'published' && a.id !== currentId)
      .map(a => {
        let relevance = getCategoryHubByName(a.category).name === activeCat ? 2 : 0;
        const hay = `${a.title} ${a.tags.join(' ')} ${a.topicCluster || ''}`.toLowerCase();
        terms.forEach(t => {
          if (hay.includes(t)) relevance += 1;
        });
        return { article: a, relevance };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }, [articles, editorForm.title, editorForm.category, editorForm.targetKeywords, editorForm.focusTopic, editorForm.topicCluster, editingArticle?.id, editorForm.id]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const q = searchFilter.toLowerCase();
      const matchesQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [articles, statusFilter, searchFilter]);

  const generatedSitemapPreview = useMemo(() => generateSitemapXml(articles), [articles]);
  const generatedRssPreview = useMemo(() => generateRSSFeed(articles), [articles]);
  const analyticsEnv = getAnalyticsConfigSummary();

  const downloadTextFile = (filename: string, content: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/brand/eirvan-icon-192.webp"
            alt="EIRVAN Icon"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-contain"
          />
          <div>
            <span className="font-serif font-bold text-base tracking-tight text-stone-900 block leading-tight">
              EIRVAN Studio
            </span>
            <span className="text-[10px] font-mono uppercase text-blue-900 font-bold block">
              CMS &amp; Editorial Control
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 xl:w-72 h-screen bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/brand/eirvan-icon-192.webp"
              alt="EIRVAN Icon"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg object-contain"
            />
            <div>
              <span className="font-serif font-bold text-lg tracking-tight text-stone-900 block leading-tight">
                EIRVAN Studio
              </span>
              <span className="text-[10px] font-mono uppercase text-blue-900 font-semibold block">
                Editorial &amp; Ad Control
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-stone-500 hover:text-stone-900 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              handleStartNewArticle();
              setIsMobileSidebarOpen(false);
            }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-blue-900 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Story</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto text-xs">
          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block mb-1.5">
              Editorial Workflow
            </span>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('articles');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'articles'
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Articles Directory</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold">
                  {articles.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!editingArticle && !editorForm.title) {
                    handleStartNewArticle();
                  } else {
                    setActiveTab('editor');
                  }
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Edit3 className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {editingArticle ? `Edit: ${editingArticle.title.slice(0, 16)}...` : 'Story Composer'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold shrink-0">
                  {editorForm.status || 'draft'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block mb-1.5">
              Monetization &amp; Telemetry
            </span>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ads');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'ads'
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Sponsor Placements</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold">
                  {adSlots.filter(s => s.isEnabled).length} On
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('analytics');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" />
                  <span>Session Telemetry</span>
                </div>
                <span className="text-[10px] font-mono text-stone-700 font-bold tabular-nums">
                  {analytics.totalPageviews.toLocaleString()}
                </span>
              </button>
            </div>
          </div>

          <div>
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block mb-1.5">
              Static SEO &amp; Deploy
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('technical');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'technical'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>Sitemaps &amp; IONOS Build</span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">XML</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-stone-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Firestore: Sync Ready</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {adminEmail ? adminEmail[0] : 'E'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-stone-900 block truncate">
                  {adminEmail || 'Editor-in-Chief'}
                </span>
                <span className="text-[10px] text-stone-500 block">Authorized Admin</span>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <PWAInstallButton variant="sidebar" />

          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full px-3 py-2 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-stone-500" />
            <span>View Reader Site</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                <span>EIRVAN STUDIO</span>
                <ChevronRight className="w-3 h-3 text-stone-400" />
                <span className="text-stone-800 font-semibold capitalize">{activeTab}</span>
              </div>
              <h1 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
                {activeTab === 'articles' && 'Editorial Workflow & Articles Directory'}
                {activeTab === 'editor' && (editingArticle ? `Editing: ${editingArticle.title}` : 'Article Composer & Quality Checks')}
                {activeTab === 'ads' && 'Sponsor Placements & Protected Ad Metrics'}
                {activeTab === 'analytics' && 'Local Session Telemetry & External Analytics Status'}
                {activeTab === 'technical' && 'Static SEO Artifacts & IONOS Deployment Workflow'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {notification && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                {notification}
              </span>
            )}
            <button
              type="button"
              onClick={onExitAdmin}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-stone-500" />
              <span>Reader Site</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Honest KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <span className="text-xs text-stone-500 uppercase tracking-wider font-mono block">Published</span>
              <div className="text-2xl font-serif font-bold text-stone-900 mt-1 tabular-nums">
                {articles.filter(a => a.status === 'published').length}
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                {articles.filter(a => a.status !== 'published').length} unpublished/archived
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <span className="text-xs text-stone-500 uppercase tracking-wider font-mono block">Local Session Views</span>
              <div className="text-2xl font-serif font-bold text-stone-900 mt-1 tabular-nums">
                {analytics.totalPageviews.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Avg Dwell: {Math.floor(analytics.avgDwellSeconds / 60)}m {analytics.avgDwellSeconds % 60}s
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <span className="text-xs text-stone-500 uppercase tracking-wider font-mono block">SEO Checklist Avg</span>
              <div className="text-2xl font-serif font-bold text-blue-900 mt-1 tabular-nums">
                {catalogAverageScore} / 100
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">Rule-based structural checks</span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200">
              <span className="text-xs text-stone-500 uppercase tracking-wider font-mono block">Analytics / GSC Env</span>
              <div className="text-lg font-serif font-bold text-stone-900 mt-1">
                {analyticsEnv.gaConfigured ? 'GA4 Active' : 'Static-Only'}
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                {analyticsEnv.gscConfigured ? 'GSC meta token set' : 'Set VITE_GSC_VERIFICATION_TOKEN'}
              </span>
            </div>
          </div>

          {/* TAB 1: ARTICLES DIRECTORY */}
          {activeTab === 'articles' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    All ({articles.length})
                  </button>
                  {ALL_STATUSES.map(st => {
                    const count = articles.filter(a => a.status === st).length;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                          statusFilter === st
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        {st.replace('_', ' ')} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Filter title, slug, desk..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg w-56"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleStartNewArticle}
                    className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-blue-900 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Story</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Article &amp; Canonical Slug</th>
                      <th className="py-3 px-4">Desk</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Checklist</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredArticles.map(art => {
                      const audit = auditArticleSEO(art, articles);
                      return (
                        <tr key={art.id} className="hover:bg-stone-50">
                          <td className="py-3.5 px-4 max-w-md">
                            <span className="font-semibold text-stone-900 block line-clamp-1">
                              {art.title}
                            </span>
                            <span className="text-[11px] font-mono text-stone-500 block truncate">
                              /articles/{art.slug} · {(art.sources || []).length} sources
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-700 font-medium">
                            {normalizeCategoryName(art.category)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-semibold ${
                                STATUS_BADGE_MAP[art.status] || STATUS_BADGE_MAP.draft
                              }`}
                            >
                              {art.status.replace('_', ' ')}
                            </span>
                            {art.aiAssisted && !art.humanReviewed && (
                              <span className="block text-[10px] text-rose-700 font-mono mt-0.5">
                                Needs human review
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-stone-800">
                            {audit.score}/100 ({audit.grade})
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onPreviewSERP(art)}
                                className="p-1.5 text-stone-600 hover:text-blue-900 rounded hover:bg-stone-100 cursor-pointer"
                                title="Inspect SERP & JSON-LD"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditArticle(art)}
                                className="p-1.5 text-stone-600 hover:text-blue-900 rounded hover:bg-stone-100 cursor-pointer"
                                title="Edit Article"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === art.id ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArticle(art.id)}
                                  className="px-2 py-1 text-[10px] font-bold bg-rose-700 text-white rounded cursor-pointer"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(art.id)}
                                  className="p-1.5 text-stone-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete Article"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STORY COMPOSER */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                  <h2 className="font-serif font-bold text-lg text-stone-900">
                    {editingArticle ? 'Edit Article & Publishing Metadata' : 'Compose New Article'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewSERP({
                          ...(editorForm as Article),
                          id: editorForm.id || 'preview',
                          slug: editorForm.slug || slugifyTitle(editorForm.title || 'preview'),
                          title: editorForm.title || 'Untitled Draft',
                          metaTitle: editorForm.metaTitle || editorForm.title || 'Untitled Draft',
                          metaDescription: editorForm.metaDescription || editorForm.summary || '',
                          canonicalUrl:
                            editorForm.canonicalUrl ||
                            `https://eirvan.com/articles/${editorForm.slug || 'preview'}`,
                          category: normalizeCategoryName(editorForm.category),
                          tags: editorForm.tags || [],
                          author: editorForm.author || { name: AUTHORS[0].name, role: AUTHORS[0].role },
                          publishedAt: editorForm.publishedAt || new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          readTimeMinutes: editorForm.readTimeMinutes || 5,
                          featuredImage:
                            editorForm.featuredImage || '/images/articles/neuromorphic-silicon-1200.webp',
                          imageAlt: editorForm.imageAlt || editorForm.title || 'Preview',
                          summary: editorForm.summary || '',
                          contentHtml: editorForm.contentHtml || '',
                          headings: editorForm.headings || [],
                          faqs: editorForm.faqs || [],
                          isFeatured: Boolean(editorForm.isFeatured),
                          isTrending: Boolean(editorForm.isTrending),
                          status: editorForm.status || 'draft',
                          targetKeywords: editorForm.targetKeywords || [],
                          views: editorForm.views || 0
                        })
                      }
                      className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview SERP &amp; Schema</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveArticle}
                      className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-blue-900 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Story</span>
                    </button>
                  </div>
                </div>

                {validationError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* AI Outline Assistant */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                    <Wand2 className="w-4 h-4 text-blue-900" />
                    <span>Optional AI Outline Assistant (Drafts Require Human Editorial Review)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder="Topic or research focus..."
                      className="sm:col-span-5 px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={aiKeywords}
                      onChange={e => setAiKeywords(e.target.value)}
                      placeholder="Secondary keywords..."
                      className="sm:col-span-4 px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={isGeneratingOutline}
                      onClick={handleGenerateOutline}
                      className="sm:col-span-3 py-2 px-3 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isGeneratingOutline ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Working...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Outline</span>
                        </>
                      )}
                    </button>
                  </div>

                  {generatedOutline && (
                    <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-800">
                        Generated draft ready: &ldquo;{generatedOutline.title}&rdquo;
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyOutline}
                        className="px-3 py-1 bg-emerald-700 text-white rounded-md font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>Apply as Draft</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Core Fields */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Article Headline (H1)
                    </label>
                    <input
                      type="text"
                      value={editorForm.title || ''}
                      onChange={e => setEditorForm({ ...editorForm, title: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-stone-700">SEO Title Tag</label>
                        <span className="font-mono text-stone-400">
                          {(editorForm.metaTitle || editorForm.title || '').length} chars
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editorForm.metaTitle || ''}
                        onChange={e => setEditorForm({ ...editorForm, metaTitle: e.target.value })}
                        placeholder="35–65 chars for Google SERP"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-stone-700">Canonical URL Slug</label>
                        <button
                          type="button"
                          onClick={() => {
                            const s = slugifyTitle(editorForm.title || '');
                            setEditorForm(prev => ({
                              ...prev,
                              slug: s,
                              canonicalUrl: `https://eirvan.com/articles/${s}`
                            }));
                          }}
                          className="text-blue-900 hover:underline font-medium cursor-pointer"
                        >
                          Auto-suggest
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editorForm.slug || ''}
                        onChange={e => {
                          const s = e.target.value;
                          setEditorForm({
                            ...editorForm,
                            slug: s,
                            canonicalUrl: `https://eirvan.com/articles/${s}`
                          });
                        }}
                        className="w-full px-3 py-2 font-mono bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Workflow Status
                      </label>
                      <select
                        value={editorForm.status || 'draft'}
                        onChange={e =>
                          setEditorForm({ ...editorForm, status: e.target.value as ArticleStatus })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg capitalize"
                      >
                        {ALL_STATUSES.map(st => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Category Hub
                      </label>
                      <select
                        value={normalizeCategoryName(editorForm.category)}
                        onChange={e => {
                          const cat = normalizeCategoryName(e.target.value);
                          const hub = getCategoryHubByName(cat);
                          setEditorForm({
                            ...editorForm,
                            category: cat,
                            topicCluster: hub.clusters[0]
                          });
                        }}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        {CATEGORY_HUBS.map(hub => (
                          <option key={hub.slug} value={hub.name}>
                            {hub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Topic Cluster
                      </label>
                      <select
                        value={editorForm.topicCluster || ''}
                        onChange={e =>
                          setEditorForm({ ...editorForm, topicCluster: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        {getCategoryHubByName(editorForm.category).clusters.map(cl => (
                          <option key={cl} value={cl}>
                            {cl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Author</label>
                      <select
                        value={editorForm.author?.name || AUTHORS[0].name}
                        onChange={e => {
                          const sel = AUTHORS.find(a => a.name === e.target.value) || AUTHORS[0];
                          setEditorForm({
                            ...editorForm,
                            author: {
                              name: sel.name,
                              role: sel.role,
                              avatar: sel.avatar,
                              slug: sel.slug,
                              bio: sel.shortBio,
                              verified: sel.verified
                            }
                          });
                        }}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        {AUTHORS.map(a => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Verified Revision Reviewer
                      </label>
                      <div className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 truncate">
                        {approvalCheck.valid && editorForm.approval
                          ? `${editorForm.approval.reviewerName} (${editorForm.approval.reviewerEmail})`
                          : 'Unapproved — requires authorized admin sign-off'}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Schema.org Type
                      </label>
                      <select
                        value={editorForm.articleType || 'Article'}
                        onChange={e =>
                          setEditorForm({
                            ...editorForm,
                            articleType: e.target.value as ArticleSchemaType
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        <option value="Article">Article</option>
                        <option value="BlogPosting">BlogPosting</option>
                        <option value="NewsArticle">NewsArticle</option>
                      </select>
                    </div>
                  </div>

                  {/* Governance & Search Directives */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Robots Indexation Directive
                      </label>
                      <select
                        value={editorForm.robotsDirective || 'index, follow'}
                        onChange={e =>
                          setEditorForm({
                            ...editorForm,
                            robotsDirective: e.target.value as RobotsDirective
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg font-mono"
                      >
                        <option value="index, follow">index, follow</option>
                        <option value="noindex, follow">noindex, follow</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Search Intent
                      </label>
                      <select
                        value={editorForm.searchIntent || 'informational'}
                        onChange={e =>
                          setEditorForm({
                            ...editorForm,
                            searchIntent: e.target.value as SearchIntent
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg capitalize"
                      >
                        <option value="informational">Informational</option>
                        <option value="commercial">Commercial Investigation</option>
                        <option value="navigational">Navigational</option>
                        <option value="transactional">Transactional</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editorForm.aiAssisted)}
                          onChange={e =>
                            setEditorForm({ ...editorForm, aiAssisted: e.target.checked })
                          }
                          className="rounded border-stone-300"
                        />
                        <span className="font-medium text-stone-800">
                          AI-Assisted Outline / Draft (disclosed)
                        </span>
                      </label>
                      <span className="text-[11px] font-mono text-stone-500">
                        Revision SHA-256: {currentRevisionHash.slice(0, 12)}
                      </span>
                    </div>

                    <div className="flex flex-col justify-between gap-2">
                      <div className="text-xs">
                        {approvalCheck.valid && editorForm.approval ? (
                          <span className="font-semibold text-emerald-800 block">
                            Approved by {editorForm.approval.reviewerName} ·{' '}
                            {editorForm.approval.reviewedAt.split('T')[0]}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-800 block">
                            {approvalCheck.stale
                              ? 'Approval Invalidated — Content Edited'
                              : 'Pending Authorized Human Approval'}
                          </span>
                        )}
                        <span className="text-[11px] text-stone-500 block">
                          {adminUser?.email
                            ? `Signed in: ${adminUser.email}`
                            : 'Sign in with an authorized reviewer account to approve.'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleApproveCurrentRevision}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer"
                        >
                          Approve Current Revision
                        </button>
                        {editorForm.humanReviewed && (
                          <button
                            type="button"
                            onClick={handleRevokeApproval}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-stone-300 text-stone-700 hover:border-rose-600 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Previous Slugs + Canonical */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Previous Slugs (for .htaccess 301 rules, comma-separated)
                      </label>
                      <input
                        type="text"
                        value={(editorForm.previousSlugs || []).join(', ')}
                        onChange={e =>
                          setEditorForm({
                            ...editorForm,
                            previousSlugs: e.target.value
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                          })
                        }
                        placeholder="old-article-slug"
                        className="w-full px-3 py-2 font-mono bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Focus Topic &amp; Target Keywords
                      </label>
                      <input
                        type="text"
                        value={(editorForm.targetKeywords || []).join(', ')}
                        onChange={e => {
                          const kws = e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                          setEditorForm({
                            ...editorForm,
                            targetKeywords: kws,
                            focusTopic: kws[0] || ''
                          });
                        }}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="font-semibold text-stone-700">Meta Description</label>
                      <span className="font-mono text-stone-400">
                        {(editorForm.metaDescription || '').length} / 160
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={editorForm.metaDescription || ''}
                      onChange={e =>
                        setEditorForm({ ...editorForm, metaDescription: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Summary Deck</label>
                    <textarea
                      rows={2}
                      value={editorForm.summary || ''}
                      onChange={e => setEditorForm({ ...editorForm, summary: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Hero Image Path (/images/articles/...)
                      </label>
                      <input
                        type="text"
                        value={editorForm.featuredImage || ''}
                        onChange={e =>
                          setEditorForm({ ...editorForm, featuredImage: e.target.value })
                        }
                        className="w-full px-3 py-2 font-mono bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Descriptive Alt Text
                      </label>
                      <input
                        type="text"
                        value={editorForm.imageAlt || ''}
                        onChange={e => setEditorForm({ ...editorForm, imageAlt: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      HTML Article Body
                    </label>
                    <textarea
                      rows={12}
                      value={editorForm.contentHtml || ''}
                      onChange={e =>
                        setEditorForm({ ...editorForm, contentHtml: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono bg-stone-50 border border-stone-200 rounded-lg leading-relaxed"
                    />
                  </div>

                  {/* Primary Sources Builder */}
                  <div className="pt-4 border-t border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-900" />
                        <span>Cited Primary Sources ({(editorForm.sources || []).length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddSource}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Source</span>
                      </button>
                    </div>
                    {(editorForm.sources || []).map((src, i) => (
                      <div
                        key={i}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-1 sm:grid-cols-12 gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Source Title"
                          value={src.title}
                          onChange={e => handleUpdateSource(i, 'title', e.target.value)}
                          className="sm:col-span-5 px-2.5 py-1.5 bg-white border border-stone-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Publisher"
                          value={src.publisher}
                          onChange={e => handleUpdateSource(i, 'publisher', e.target.value)}
                          className="sm:col-span-3 px-2.5 py-1.5 bg-white border border-stone-200 rounded"
                        />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={src.url}
                          onChange={e => handleUpdateSource(i, 'url', e.target.value)}
                          className="sm:col-span-3 px-2.5 py-1.5 bg-white border border-stone-200 rounded font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(i)}
                          className="sm:col-span-1 text-stone-500 hover:text-rose-700 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* FAQ Schema Builder */}
                  <div className="pt-4 border-t border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">
                        Article FAQs &amp; Reader Q&amp;A ({(editorForm.faqs || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddFAQ}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add FAQ</span>
                      </button>
                    </div>
                    {(editorForm.faqs || []).map((faq, i) => (
                      <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-mono text-stone-500">FAQ #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFAQ(i)}
                            className="text-stone-400 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={e => handleUpdateFAQ(i, 'question', e.target.value)}
                          placeholder="Reader question..."
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded"
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={e => handleUpdateFAQ(i, 'answer', e.target.value)}
                          placeholder="Direct answer..."
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Changelog Entries */}
                  <div className="pt-4 border-t border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-stone-600" />
                        <span>Revision &amp; Correction Log</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddChangelog}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Log Revision</span>
                      </button>
                    </div>
                    {(editorForm.changelog || []).map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={entry.date}
                          onChange={e => {
                            const next = [...(editorForm.changelog || [])];
                            next[idx] = { ...next[idx], date: e.target.value };
                            setEditorForm({ ...editorForm, changelog: next });
                          }}
                          className="w-28 px-2.5 py-1.5 font-mono bg-stone-50 border border-stone-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Correction or update note..."
                          value={entry.note}
                          onChange={e => {
                            const next = [...(editorForm.changelog || [])];
                            next[idx] = { ...next[idx], note: e.target.value };
                            setEditorForm({ ...editorForm, changelog: next });
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live SEO Diagnostic, Internal Links & SERP Card */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                        Rule-Based Quality Check
                      </span>
                      <h3 className="text-base font-serif font-bold text-stone-900">
                        Editorial &amp; Technical SEO Checklist
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-serif font-bold text-stone-900 tabular-nums">
                        {currentAudit.score}
                      </span>
                      <span className="text-xs text-stone-500">/100</span>
                      <div className="text-xs font-bold text-emerald-700">
                        Grade {currentAudit.grade}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-stone-100">
                    {currentAudit.checks.map(chk => (
                      <div key={chk.id} className="text-xs flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          {chk.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                          {chk.status === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          {chk.status === 'fail' && <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />}
                        </div>
                        <div>
                          <span className="font-semibold text-stone-800 block">{chk.label}</span>
                          <p className="text-[11px] text-stone-500">{chk.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contextual Internal Link Scanner */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">
                    <Link2 className="w-3.5 h-3.5 text-blue-900" />
                    <span>Internal Link Scanner &amp; Quick Insert</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Link to relevant published dispatches to avoid orphan URLs:
                  </p>
                  <div className="space-y-2">
                    {internalLinkSuggestions.map(({ article: rel }) => {
                      const snippet = `<a href="/articles/${rel.slug}">${rel.title}</a>`;
                      const isRelated = (editorForm.relatedArticleIds || []).includes(rel.id);
                      return (
                        <div
                          key={rel.id}
                          className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1.5"
                        >
                          <div className="font-medium text-stone-900 line-clamp-1">{rel.title}</div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono text-stone-500 truncate">
                              /articles/{rel.slug}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = isRelated
                                    ? (editorForm.relatedArticleIds || []).filter(id => id !== rel.id)
                                    : [...(editorForm.relatedArticleIds || []), rel.id];
                                  setEditorForm({ ...editorForm, relatedArticleIds: next });
                                }}
                                className={`px-2 py-0.5 rounded border font-medium cursor-pointer ${
                                  isRelated
                                    ? 'bg-blue-900 text-white border-blue-900'
                                    : 'bg-white text-stone-700 border-stone-200'
                                }`}
                              >
                                {isRelated ? 'Linked' : 'Pin Related'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(snippet);
                                  showNotification('Copied HTML internal link snippet.');
                                }}
                                className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 hover:border-blue-900 cursor-pointer"
                              >
                                Copy &lt;a&gt;
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live SERP Preview */}
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                    Google SERP Snippet Preview
                  </span>
                  <div className="p-4 bg-[#FAF9F6] rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-stone-600">
                      <img
                        src="/images/brand/eirvan-icon-192.webp"
                        alt="EIRVAN"
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="font-medium text-stone-900">EIRVAN</span>
                      <span className="text-[11px] text-stone-500 truncate">
                        › articles › {editorForm.slug || 'slug'}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[#1a0dab] line-clamp-2 leading-snug">
                      {editorForm.metaTitle || editorForm.title || 'Article Headline'}
                    </div>
                    <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                      {editorForm.metaDescription || editorForm.summary || 'Meta description snippet...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPONSOR PLACEMENTS & PROTECTED AD METRICS */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-amber-300 font-mono uppercase font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Public /adSlots &amp; Protected /adMetrics Governance</span>
                  </div>
                  <h2 className="text-xl font-serif font-bold">
                    {adSlots.some(s => s.isEnabled)
                      ? 'Sponsor Containers Active'
                      : 'Sponsor Containers Paused'}
                  </h2>
                  <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
                    Toggle fixed-height static sponsor placements. Private revenue and impression counters remain isolated in /adMetrics.
                  </p>
                </div>

                <div className="shrink-0">
                  {adSlots.some(s => s.isEnabled) ? (
                    <button
                      type="button"
                      onClick={() => handleToggleAllAds(true)}
                      className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      Pause All Slots
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleAllAds(false)}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      Enable All Slots
                    </button>
                  )}
                </div>
              </div>

              {(adMetricsStatus === 'permission-denied' ||
                adMetricsStatus === 'unavailable' ||
                adMetricsStatus === 'loading') && (
                <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold uppercase tracking-wider font-mono text-[11px]">
                      {adMetricsStatus === 'permission-denied'
                        ? 'Ad Metrics Unavailable — Firestore Rules Rollout Pending'
                        : adMetricsStatus === 'unavailable'
                          ? 'Ad Metrics Temporarily Unavailable'
                          : 'Connecting to Protected /adMetrics Collection...'}
                    </div>
                    <p className="text-amber-900 leading-relaxed">
                      {adMetricsStatus === 'permission-denied'
                        ? 'Reads to /adMetrics were denied by active Firestore security rules. Numeric counters are suppressed rather than displaying false zeros.'
                        : adMetricsStatus === 'unavailable'
                          ? 'Unable to retrieve protected /adMetrics documents right now. Counters are marked unavailable rather than displaying zero.'
                          : 'Fetching private advertising counters from Firestore...'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {adSlots.map(slot => {
                  const slotStatus =
                    slot.metricsStatus ??
                    (adMetricsStatus === 'ready'
                      ? slot.impressions !== undefined || slot.clicks !== undefined
                        ? 'available'
                        : 'missing'
                      : adMetricsStatus);
                  const isMigratedAvailable = slotStatus === 'available';
                  const hasImpressions = isMigratedAvailable && typeof slot.impressions === 'number';
                  const hasClicks = isMigratedAvailable && typeof slot.clicks === 'number';
                  const hasActualRevenue = isMigratedAvailable && typeof slot.revenue === 'number';
                  const hasEstimatedRevenue =
                    isMigratedAvailable &&
                    !hasActualRevenue &&
                    slot.revenueEstimateStatus === 'estimated' &&
                    typeof slot.estimatedRevenue === 'number';
                  const canEditSlot = adMetricsStatus === 'ready' && isMigratedAvailable;
                  const unavailableLabel =
                    slotStatus === 'permission-denied'
                      ? 'Unavailable (Denied)'
                      : slotStatus === 'unavailable'
                        ? 'Unavailable'
                        : slotStatus === 'loading'
                          ? 'Loading...'
                          : 'Not Migrated';

                  return (
                    <div
                      key={slot.id}
                      className="p-5 rounded-2xl bg-white border border-stone-200 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                            {slot.type} ({slot.dimensions})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAdSlot(slot.id)}
                            disabled={!canEditSlot}
                            title={
                              !canEditSlot
                                ? 'Locked until migration to /adMetrics is verified'
                                : 'Toggle slot active status'
                            }
                            className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${
                              !canEditSlot
                                ? 'bg-amber-100 text-amber-800 cursor-not-allowed'
                                : slot.isEnabled
                                  ? 'bg-emerald-100 text-emerald-800 cursor-pointer'
                                  : 'bg-stone-200 text-stone-600 cursor-pointer'
                            }`}
                          >
                            {!canEditSlot ? 'Locked' : slot.isEnabled ? 'Active' : 'Disabled'}
                          </button>
                        </div>

                        <h3 className="text-base font-semibold text-stone-900">{slot.name}</h3>
                        <p className="text-xs text-stone-500 mt-1">{slot.headline}</p>

                        <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-3 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-stone-400 block uppercase">
                              Impressions
                            </span>
                            {!isMigratedAvailable ? (
                              <span className="font-medium text-amber-700 text-[11px]">
                                {unavailableLabel}
                              </span>
                            ) : hasImpressions ? (
                              <span className="font-semibold text-stone-900 tabular-nums">
                                {(slot.impressions as number).toLocaleString()}
                              </span>
                            ) : (
                              <span className="font-medium text-stone-400 text-[11px]">Missing</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block uppercase">Clicks</span>
                            {!isMigratedAvailable ? (
                              <span className="font-medium text-amber-700 text-[11px]">
                                {unavailableLabel}
                              </span>
                            ) : hasClicks ? (
                              <span className="font-semibold text-stone-900 tabular-nums">
                                {(slot.clicks as number).toLocaleString()}
                              </span>
                            ) : (
                              <span className="font-medium text-stone-400 text-[11px]">Missing</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block uppercase">
                              Revenue
                            </span>
                            {!isMigratedAvailable ? (
                              <span className="font-medium text-amber-700 text-[11px]">
                                {unavailableLabel}
                              </span>
                            ) : hasActualRevenue ? (
                              <span className="font-semibold text-emerald-700 tabular-nums">
                                ${(slot.revenue as number).toFixed(2)} (Actual)
                              </span>
                            ) : hasEstimatedRevenue ? (
                              <span className="font-medium text-blue-800 tabular-nums">
                                ~${(slot.estimatedRevenue as number).toFixed(2)} (Est.)
                              </span>
                            ) : (
                              <span className="font-medium text-stone-400 text-[11px]">Missing</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-stone-500 font-mono">
                        {!isMigratedAvailable
                          ? `Metrics Status: ${unavailableLabel}`
                          : hasImpressions && hasClicks
                            ? `CTR: ${(slot.impressions as number) > 0 ? (((slot.clicks as number) / (slot.impressions as number)) * 100).toFixed(2) : '0.00'}%`
                            : 'CTR: Missing Counter Data'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: LOCAL SESSION TELEMETRY */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase text-stone-300 font-semibold block">
                    Transparent Measurement Scope
                  </span>
                  <h2 className="text-xl font-serif font-bold">
                    Local Session Telemetry &amp; Optional GA4 / GSC Configuration
                  </h2>
                  <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                    Counters below track browser reading activity in this workspace only. Production search impressions and clicks require Google Search Console verification, and global visitor analytics activate only when <code className="text-amber-300">VITE_GA_MEASUREMENT_ID</code> is configured at build time.
                  </p>
                </div>

                {confirmResetTelemetry ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.resetTelemetryToZero();
                        setConfirmResetTelemetry(false);
                        onRefreshData();
                        showNotification('Local session telemetry cleared to zero.');
                      }}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetTelemetry(false)}
                      className="px-3 py-2 bg-white/10 text-white text-xs rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetTelemetry(true)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Clear Session Counters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      External Search Console &amp; GA4 Setup
                    </h3>
                    <span className="text-xs font-mono text-stone-500">Build Env Status</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                      <span className="font-semibold text-stone-800">Google Analytics 4 (VITE_GA_MEASUREMENT_ID)</span>
                      <span className={`font-mono font-bold ${analyticsEnv.gaConfigured ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {analyticsEnv.gaConfigured ? analyticsEnv.gaMeasurementId : 'Not configured'}
                      </span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                      <span className="font-semibold text-stone-800">Search Console Tag (VITE_GSC_VERIFICATION_TOKEN)</span>
                      <span className={`font-mono font-bold ${analyticsEnv.gscConfigured ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {analyticsEnv.gscConfigured ? 'Configured in HTML / build' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Add both variables to your build environment before running <code className="font-mono">npm run build</code> to inject GA4 pageview tracking and the Search Console ownership meta tag across every prerendered static HTML page.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Local Reader Scroll Depth Funnel
                    </h3>
                    <span className="text-xs font-mono text-stone-500">Local Telemetry</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {[
                      { label: 'Reached 25%', val: analytics.scrollMilestones.milestone25 },
                      { label: 'Reached 50%', val: analytics.scrollMilestones.milestone50 },
                      { label: 'Reached 75%', val: analytics.scrollMilestones.milestone75 },
                      { label: 'Reached 100%', val: analytics.scrollMilestones.milestone100 }
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-stone-600">{row.label}</span>
                          <span className="font-mono font-semibold">{row.val}%</span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-900 h-full" style={{ width: `${row.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STATIC SEO ARTIFACTS & IONOS WORKFLOW */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              {/* Static Rebuild & IONOS Runbook */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-blue-900 font-bold block">
                      Static-First IONOS Hosting Architecture
                    </span>
                    <h2 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                      Static Rebuild &amp; IONOS Deployment Workflow
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextFile(
                        `eirvan_backup_${Date.now()}.json`,
                        JSON.stringify(articles, null, 2),
                        'application/json'
                      )
                    }
                    className="px-3.5 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Articles JSON</span>
                  </button>
                </div>

                <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <li className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="font-mono font-bold text-blue-900 block">STEP 1 · EDIT IN FIREBASE</span>
                    <p className="text-stone-600 leading-relaxed">
                      Author, peer-review, and publish articles here in Studio. Only stories with status <strong>published</strong> enter public HTML, feeds, and sitemaps.
                    </p>
                  </li>
                  <li className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="font-mono font-bold text-blue-900 block">STEP 2 · RUN STATIC BUILD</span>
                    <p className="text-stone-600 leading-relaxed">
                      Execute <code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">npm run build</code> locally. The build fetches published Firestore articles cleanly via REST and prerenders full semantic HTML for every URL into <code className="font-mono">dist/</code>.
                    </p>
                  </li>
                  <li className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="font-mono font-bold text-blue-900 block">STEP 3 · UPLOAD DIST/ TO IONOS</span>
                    <p className="text-stone-600 leading-relaxed">
                      Verify <code className="font-mono">npx tsx test-seo-build.ts</code> passes, then upload <code className="font-mono">dist/</code> contents (including <code className="font-mono">.htaccess</code>, <code className="font-mono">sitemap.xml</code>, <code className="font-mono">rss.xml</code>) to IONOS Web Hosting Plus. No Node server needed in production.
                    </p>
                  </li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rss className="w-4 h-4 text-amber-700" />
                      <div>
                        <h3 className="text-xs font-bold text-stone-900">Generated RSS 2.0 Feed</h3>
                        <p className="text-[11px] text-stone-500">
                          {articles.filter(a => isPublicIndexableArticle(a)).length} indexable published items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTextFile('rss.xml', generatedRssPreview, 'application/rss+xml')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 rounded cursor-pointer"
                      >
                        Download XML
                      </button>
                      <a
                        href="/rss.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-semibold bg-stone-900 text-white rounded flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-900" />
                      <div>
                        <h3 className="text-xs font-bold text-stone-900">Generated XML Sitemap</h3>
                        <p className="text-[11px] text-stone-500">
                          Excludes drafts, archived, noindex &amp; /admin paths
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTextFile('sitemap.xml', generatedSitemapPreview, 'application/xml')}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 rounded cursor-pointer"
                      >
                        Download XML
                      </button>
                      <a
                        href="/sitemap.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-semibold bg-stone-900 text-white rounded flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800">
                    Live sitemap.xml Preview (from current catalog)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(generatedSitemapPreview);
                      showNotification('Copied sitemap.xml content.');
                    }}
                    className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy XML</span>
                  </button>
                </div>
                <pre className="p-4 bg-stone-900 text-stone-200 rounded-xl text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                  {generatedSitemapPreview}
                </pre>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-between items-center text-xs">
                <span className="text-stone-500">Restore local browser seed articles from repository defaults:</span>
                {confirmResetSeeds ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.resetToDefault();
                        setConfirmResetSeeds(false);
                        onRefreshData();
                        showNotification('Local catalog restored to default seed articles.');
                      }}
                      className="px-3 py-1.5 bg-rose-700 text-white rounded-lg font-semibold cursor-pointer"
                    >
                      Confirm Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetSeeds(false)}
                      className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetSeeds(true)}
                    className="px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Seed Articles</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

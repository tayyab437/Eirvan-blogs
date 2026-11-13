export interface FAQItem {
  question: string;
  answer: string;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ArticleSource {
  title: string;
  url: string;
  publisher: string;
  year?: string;
  publishedDate?: string;
  accessedAt?: string;
}

export interface EditorialApproval {
  reviewerUid: string;
  reviewerEmail: string;
  reviewerName: string;
  reviewerRole: string;
  reviewedAt: string;
  reviewedRevisionHash: string;
  aiAssistedAtReview: boolean;
  reviewerVerifiedInAdmins?: boolean;
}

export interface ArticleChangelogEntry {
  date: string;
  note: string;
}

export type ArticleStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export type ArticleSchemaType = 'Article' | 'BlogPosting' | 'NewsArticle';

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational';

export type RobotsDirective =
  | 'index, follow'
  | 'noindex, follow';

export interface Article {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    role: string;
    avatar?: string;
    slug?: string;
    bio?: string;
    verified?: boolean;
  };
  reviewer?: {
    name: string;
    role: string;
    slug?: string;
    email?: string;
    uid?: string;
  };
  translations?: Record<string, {
    title: string;
    summary: string;
    metaDescription?: string;
  }>;
  publishedAt: string;
  updatedAt: string;
  scheduledAt?: string;
  readTimeMinutes: number;
  featuredImage: string;
  socialImage?: string;
  imageAlt: string;
  summary: string;
  contentHtml: string;
  headings: HeadingItem[];
  faqs: FAQItem[];
  sources?: ArticleSource[];
  relatedArticleIds?: string[];
  pillarId?: string;
  topicCluster?: string;
  previousSlugs?: string[];
  focusTopic?: string;
  secondaryTopics?: string[];
  searchIntent?: SearchIntent;
  articleType?: ArticleSchemaType;
  robotsDirective?: RobotsDirective;
  aiAssisted?: boolean;
  humanReviewed?: boolean;
  reviewedAt?: string;
  reviewedRevisionHash?: string;
  approval?: EditorialApproval;
  editorialNotes?: string;
  changelog?: ArticleChangelogEntry[];
  isFeatured: boolean;
  isTrending: boolean;
  status: ArticleStatus;
  targetKeywords: string[];
  views: number;
  reactions?: {
    helpful: number;
    fire: number;
    insightful: number;
  };
  isBookmarked?: boolean;
}

export interface PublicAdSlot {
  id: string;
  name: string;
  type: 'leaderboard' | 'rectangle' | 'native-card' | 'in-article';
  dimensions: string;
  sponsorName: string;
  headline: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  badgeLabel: string;
  imageUrl?: string;
  isEnabled: boolean;
}

export type AdMetricsLoadStatus = 'loading' | 'ready' | 'permission-denied' | 'unavailable';

export interface AdMetrics {
  id: string;
  impressions: number | null;
  clicks: number | null;
  impressionsStatus?: 'actual' | 'missing';
  clicksStatus?: 'actual' | 'missing';
  revenue?: number | null;
  revenueStatus?: 'actual' | 'missing';
  estimatedRevenue?: number;
  revenueEstimateStatus?: 'estimated';
  revenueEstimateFormula?: string;
  ctr?: number;
  campaignPerformance?: Record<string, unknown> | unknown[];
  internalTracking?: string | Record<string, unknown>;
  lastUpdated?: string;
  migratedFromLegacy?: boolean;
  legacyExtraFields?: Record<string, unknown>;
}

export interface AdSlotConfig extends PublicAdSlot {
  impressions?: number | null;
  clicks?: number | null;
  impressionsStatus?: 'actual' | 'missing';
  clicksStatus?: 'actual' | 'missing';
  revenue?: number | null;
  revenueStatus?: 'actual' | 'missing';
  estimatedRevenue?: number;
  revenueEstimateStatus?: 'estimated';
  revenueEstimateFormula?: string;
  lastUpdated?: string;
  metricsStatus?: 'available' | 'missing' | 'loading' | 'permission-denied' | 'unavailable';
}

export interface VisitorAnalytics {
  totalPageviews: number;
  uniqueSessions: number;
  avgDwellSeconds: number;
  totalDwellSeconds?: number;
  scrollMilestones: {
    milestone25: number;
    milestone50: number;
    milestone75: number;
    milestone100: number;
  };
  scrollCounts?: {
    milestone25: number;
    milestone50: number;
    milestone75: number;
    milestone100: number;
  };
  topQueries: { query: string; impressions: number; clicks: number; ctr: number }[];
  dailyViews: { date: string; views: number; adRevenue: number }[];
  adImpressions: number;
  adClicks: number;
  estimatedEarnings: number;
}

export interface SEOCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  description: string;
  recommendation: string;
}

export interface SEOAuditResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  checks: SEOCheck[];
}

export interface CategoryHubConfig {
  id: string;
  slug: 'technology' | 'business' | 'lifestyle' | 'education' | 'news';
  name: 'Technology' | 'Business' | 'Lifestyle' | 'Education' | 'News';
  shortLabel: string;
  kicker: string;
  headline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  pillarTopic: string;
  clusters: string[];
  faqs: FAQItem[];
}

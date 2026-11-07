export interface FAQItem {
  question: string;
  answer: string;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

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
  };
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  featuredImage: string;
  imageAlt: string;
  summary: string;
  contentHtml: string;
  headings: HeadingItem[];
  faqs: FAQItem[];
  isFeatured: boolean;
  isTrending: boolean;
  status: 'published' | 'draft';
  targetKeywords: string[];
  views: number;
  reactions?: {
    helpful: number;
    fire: number;
    insightful: number;
  };
  isBookmarked?: boolean;
}

export interface AdSlotConfig {
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
  impressions: number;
  clicks: number;
}

export interface VisitorAnalytics {
  totalPageviews: number;
  uniqueSessions: number;
  avgDwellSeconds: number;
  scrollMilestones: {
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

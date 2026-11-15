import { Article, PublicAdSlot } from '../types/blog';

/**
 * Clean public client runtime seed catalog.
 * Unapproved drafts/in_review articles must NEVER be bundled into client JS assets.
 * Live public articles are fetched from Cloud Firestore (`status == 'published'`) or prerendered
 * at build time exclusively from cryptographically approved published articles.
 */
export const PUBLIC_SEED_ARTICLES: Article[] = [];

export const DEFAULT_AD_SLOTS: PublicAdSlot[] = [
  {
    id: 'ad-leaderboard-top',
    name: 'Top Header Leaderboard (728x90)',
    type: 'leaderboard',
    dimensions: '728 × 90 px',
    sponsorName: 'Synthetix Cloud Compute',
    headline: 'Deploy High-Performance Edge AI Workloads at Lower Latency',
    tagline: 'Bare-metal GPU clusters with straightforward API provisioning and transparent egress.',
    ctaText: 'Explore Platform',
    ctaUrl: 'https://example.com/cloud-compute',
    badgeLabel: 'Sponsored',
    isEnabled: true
  },
  {
    id: 'ad-in-article-native',
    name: 'Native In-Article Sponsored Card',
    type: 'native-card',
    dimensions: 'Fluid Editorial Card',
    sponsorName: 'QuantFlow Analytics',
    headline: 'Portfolio Risk Modeling & Historical Tick Stream Analysis',
    tagline: 'Quantitative analytics infrastructure for systematic research teams.',
    ctaText: 'Request Demo',
    ctaUrl: 'https://example.com/quant-analytics',
    badgeLabel: 'Sponsored Partner',
    isEnabled: true
  },
  {
    id: 'ad-sidebar-rectangle',
    name: 'Sticky Sidebar Medium Rectangle (300x250)',
    type: 'rectangle',
    dimensions: '300 × 250 px',
    sponsorName: 'BioSynthetica Research',
    headline: 'Clinical Biomarker Tracking for Research Practitioners',
    tagline: 'Standardized laboratory assay integrations and Longitudinal Health Metrics.',
    ctaText: 'View Research Kit',
    ctaUrl: 'https://example.com/biosynthetica',
    badgeLabel: 'Sponsored',
    isEnabled: true
  }
];

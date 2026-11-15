import { PublicAdSlot, AdMetrics } from '../types/blog';

/**
 * Public advertising creative configuration defaults.
 * Contains strictly the 12 approved PublicAdSlot attributes (zero private metrics).
 */
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

/**
 * Baseline test/seed metrics used strictly in local migration simulation or testing.
 * Never bundled into public browser client bundles.
 */
export const DEFAULT_AD_METRICS: Record<string, AdMetrics> = {
  'ad-leaderboard-top': {
    id: 'ad-leaderboard-top',
    impressions: 48200,
    clicks: 1420,
    revenue: 802.88
  },
  'ad-in-article-native': {
    id: 'ad-in-article-native',
    impressions: 34100,
    clicks: 1180,
    revenue: 646.94
  },
  'ad-sidebar-rectangle': {
    id: 'ad-sidebar-rectangle',
    impressions: 29800,
    clicks: 890,
    revenue: 501.82
  }
};

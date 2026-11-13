import { CategoryHubConfig } from '../types/blog';

export const CATEGORY_HUBS: CategoryHubConfig[] = [
  {
    id: 'cat-tech',
    slug: 'technology',
    name: 'Technology',
    shortLabel: 'Technology',
    kicker: 'Deep Computing · Silicon · Photonics',
    headline: 'Hardware Physics & Frontier Computing',
    description:
      'Investigative technical briefings examining neuromorphic architectures, co-packaged optical interconnects, wafer lithography, and sub-milliwatt edge intelligence.',
    metaTitle: 'Technology Research & Hardware Architecture Analysis',
    metaDescription:
      'In-depth analysis of neuromorphic silicon, co-packaged photonics, datacenter power architectures, and reproducible hardware benchmarks.',
    pillarTopic: 'Post-von Neumann Hardware & Optical Computing',
    clusters: ['Neuromorphic Silicon', 'Silicon Photonics', 'Edge Inference'],
    faqs: [
      {
        question: 'What defines EIRVAN Technology coverage?',
        answer:
          'We focus on foundry-level physics, architecture trade-offs, energy per operation, and production validation timelines rather than consumer launch press releases.'
      },
      {
        question: 'How are semiconductor performance claims verified?',
        answer:
          'Every dispatch cross-references primary peer-reviewed conference papers (ISSCC, IEDM), IEEE proceedings, and published thermal or interconnect benchmarks.'
      }
    ]
  },
  {
    id: 'cat-business',
    slug: 'business',
    name: 'Business',
    shortLabel: 'Business',
    kicker: 'Quantitative Markets · Capital · Microstructure',
    headline: 'Capital Allocation & Market Infrastructure',
    description:
      'Analytical coverage of algorithmic execution, off-exchange crossing networks, FPGA order matching, institutional liquidity, and sovereign capital allocation.',
    metaTitle: 'Business Strategy, Quantitative Markets & Liquidity Analysis',
    metaDescription:
      'Research on algorithmic market microstructure, institutional dark pools, cross-venue liquidity execution, and sovereign balance-sheet strategy.',
    pillarTopic: 'Market Microstructure & Institutional Capital',
    clusters: ['Algorithmic Execution', 'Dark Pool Liquidity', 'Sovereign Allocation'],
    faqs: [
      {
        question: 'Does EIRVAN Business publish investment recommendations?',
        answer:
          'No. All quantitative markets and institutional capital analyses are published strictly for educational and structural understanding, never as individualized financial advice.'
      },
      {
        question: 'What primary sources underpin EIRVAN financial reporting?',
        answer:
          'Analyses draw upon exchange microstructure disclosures, FINRA ATS transparency reports, SEC filings, and peer-reviewed econometrics literature.'
      }
    ]
  },
  {
    id: 'cat-lifestyle',
    slug: 'lifestyle',
    name: 'Lifestyle',
    shortLabel: 'Lifestyle',
    kicker: 'Longevity Science · Preventive Medicine · Biology',
    headline: 'Preventive Health & Biological Longevity',
    description:
      'Evidence-led reporting on human clinical trials, mitochondrial coenzymes, epigenetic methylation, and sleep-circadian alignment grounded in registered trials.',
    metaTitle: 'Lifestyle, Preventive Biology & Longevity Clinical Trials',
    metaDescription:
      'Evidence-based analyses of NAD+ human clinical trials, epigenetic methylation research, vascular health markers, and preventive longevity protocols.',
    pillarTopic: 'Translational Longevity & Preventive Physiology',
    clusters: ['Clinical Trial Syntheses', 'Epigenetic Reprogramming', 'Vascular Health'],
    faqs: [
      {
        question: 'How does EIRVAN evaluate longevity and health studies?',
        answer:
          'We explicitly separate early rodent or in-vitro hypotheses from randomized, double-blind, placebo-controlled human trials and registered clinical endpoints.'
      },
      {
        question: 'Are articles in Lifestyle intended as medical guidance?',
        answer:
          'No. Every health and biotechnology synthesis includes explicit non-medical-advice disclosures encouraging consultation with qualified physicians.'
      }
    ]
  },
  {
    id: 'cat-education',
    slug: 'education',
    name: 'Education',
    shortLabel: 'Education',
    kicker: 'Cognitive Science · Deep Work · Learning Systems',
    headline: 'Cognitive Ergonomics & Deliberate Mastery',
    description:
      'Research-backed methodologies on attention conservation, ultradian sprint architecture, mesolimbic motivation calibration, and technical skill acquisition.',
    metaTitle: 'Education, Cognitive Neuroscience & Deep Work Playbooks',
    metaDescription:
      'Practical guides grounded in cognitive neuroscience covering 90-minute ultradian cycles, attention residue elimination, and deep work ergonomics.',
    pillarTopic: 'Applied Cognitive Neuroscience & Learning Architecture',
    clusters: ['Ultradian Cycles', 'Attention Residue', 'Motivation Calibration'],
    faqs: [
      {
        question: 'What topics belong in EIRVAN Education?',
        answer:
          'Deep work protocols, cognitive psychology research, deliberate skill acquisition frameworks, and environmental ergonomics for technical learners.'
      },
      {
        question: 'How long are EIRVAN methodology guides?',
        answer:
          'Each guide is structured with clear step-by-step protocols, scientific study citations, and actionable rest-recovery ratios rather than productivity platitudes.'
      }
    ]
  },
  {
    id: 'cat-news',
    slug: 'news',
    name: 'News',
    shortLabel: 'News',
    kicker: 'Briefings · Standards · Regulatory Dispatches',
    headline: 'Policy, Foundry & Infrastructure Dispatches',
    description:
      'Timely news reporting on global semiconductor capacity expansions, market settlement reforms, AI safety governance, and scientific institutional milestones.',
    metaTitle: 'News Dispatches: Semiconductors, Policy & Market Infrastructure',
    metaDescription:
      'Verified reporting on semiconductor manufacturing expansions, global market T+1 settlement architecture, and regulatory milestones.',
    pillarTopic: 'Global Infrastructure, Standards & Regulatory Shifts',
    clusters: ['Foundry Policy', 'Settlement Reform', 'Standards Updates'],
    faqs: [
      {
        question: 'How is News distinguished from long-form analysis on EIRVAN?',
        answer:
          'News dispatches report time-sensitive policy, industry capacity, and regulatory shifts with NewsArticle structured data and primary agency or corporate filings.'
      },
      {
        question: 'How does EIRVAN handle updates or corrections to breaking news?',
        answer:
          'Every factual update is stamped with an updated publication date and logged transparently under our Corrections Policy.'
      }
    ]
  }
];

export const LEGACY_CATEGORY_ALIASES: Record<string, CategoryHubConfig['name']> = {
  'technology & ai': 'Technology',
  'technology-ai': 'Technology',
  'technology': 'Technology',
  'tech': 'Technology',
  'global markets & finance': 'Business',
  'global-markets-finance': 'Business',
  'business': 'Business',
  'finance': 'Business',
  'markets': 'Business',
  'biotech & longevity': 'Lifestyle',
  'biotech-longevity': 'Lifestyle',
  'lifestyle': 'Lifestyle',
  'health': 'Lifestyle',
  'productivity & mindset': 'Education',
  'productivity-mindset': 'Education',
  'future of work': 'Education',
  'future-of-work': 'Education',
  'education': 'Education',
  'news': 'News'
};

export function normalizeCategoryName(input?: string): CategoryHubConfig['name'] {
  if (!input) return 'Technology';
  const key = input.trim().toLowerCase();
  return LEGACY_CATEGORY_ALIASES[key] || 'Technology';
}

export function getCategoryHubBySlug(slug?: string): CategoryHubConfig | undefined {
  if (!slug) return undefined;
  const clean = slug.trim().toLowerCase();
  const mappedName = LEGACY_CATEGORY_ALIASES[clean];
  if (mappedName) {
    return CATEGORY_HUBS.find(c => c.name === mappedName);
  }
  return CATEGORY_HUBS.find(c => c.slug === clean);
}

export function getCategoryHubByName(name?: string): CategoryHubConfig {
  const normalized = normalizeCategoryName(name);
  return CATEGORY_HUBS.find(c => c.name === normalized) || CATEGORY_HUBS[0];
}

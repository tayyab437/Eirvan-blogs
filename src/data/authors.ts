import { AuthorProfile } from '../types/author';

export const AUTHORS: AuthorProfile[] = [
  {
    id: 'auth-001',
    slug: 'evelyn-vance',
    name: 'Dr. Evelyn Vance',
    role: 'Principal Hardware Architect & Research Fellow',
    department: 'Technology Desk',
    institution: 'EIRVAN Computing & Silicon Desk',
    avatar: '/images/authors/evelyn-vance-400.webp',
    bio: 'Dr. Evelyn Vance leads hardware and semiconductor architecture investigations at EIRVAN. With over 15 years in silicon topology design, mixed-signal ASIC fabrication, and photonic interconnect engineering, she focuses on physical compute efficiency and edge inference architectures.',
    shortBio: 'Covers neuromorphic silicon, optical interconnects, and sub-milliwatt edge compute hardware.',
    location: 'Zurich · Cambridge',
    expertise: ['Neuromorphic Silicon', 'Co-Packaged Optics', 'Wafer Lithography', 'Edge Computing'],
    education: 'Ph.D. in Applied Physics & VLSI Systems, ETH Zurich',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/author/evelyn-vance'
    },
    verified: true,
    featuredArticleSlug: 'quantum-neuromorphic-silicon-breakthrough-edge-computing'
  },
  {
    id: 'auth-002',
    slug: 'marcus-sterling',
    name: 'Marcus Sterling',
    role: 'Senior Markets & Microstructure Analyst',
    department: 'Business & Markets Desk',
    institution: 'EIRVAN Quantitative Research Desk',
    avatar: '/images/authors/marcus-sterling-400.webp',
    bio: 'Marcus Sterling analyzes electronic exchange microstructure, deterministic order matching, and institutional liquidity routing. Previously an execution systems analyst covering equity and fixed-income crossing venues, he focuses on transparency and systemic resilience.',
    shortBio: 'Covers market microstructure, FPGA matching engines, and institutional liquidity flows.',
    location: 'London · New York',
    expertise: ['Order Book Microstructure', 'Crossing Networks', 'Settlement Reform', 'Liquidity Analysis'],
    education: 'M.Sc. in Mathematical Finance & Econometrics, University of Oxford',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/author/marcus-sterling'
    },
    verified: true,
    featuredArticleSlug: 'algorithmic-arbitrage-2026-autonomous-high-frequency-execution'
  },
  {
    id: 'auth-003',
    slug: 'clara-thorne',
    name: 'Dr. Clara Thorne',
    role: 'Cognitive Neuroscientist & Learning Systems Editor',
    department: 'Education Desk',
    institution: 'EIRVAN Learning & Cognition Desk',
    avatar: '/images/authors/clara-thorne-400.webp',
    bio: 'Dr. Clara Thorne researches applied cognitive neuroscience, ultradian rest-activity cycles, and deliberate skill acquisition environments. Her work examines how knowledge workers and technical teams can reduce context-switching residue.',
    shortBio: 'Covers cognitive ergonomics, ultradian focus cycles, and research-backed learning protocols.',
    location: 'San Francisco · Boston',
    expertise: ['Cognitive Endurance', 'Ultradian Rhythms', 'Attention Architecture', 'Deep Work Systems'],
    education: 'Ph.D. in Cognitive Neuroscience, Stanford University',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/author/clara-thorne'
    },
    verified: true,
    featuredArticleSlug: 'the-90-minute-cognitive-sprint-neuroscience-protocols'
  },
  {
    id: 'auth-004',
    slug: 'aris-thorne',
    name: 'Dr. Aris Thorne',
    role: 'Molecular Biologist & Translational Medicine Editor',
    department: 'Lifestyle & Longevity Desk',
    institution: 'EIRVAN Life Sciences Desk',
    avatar: '/images/authors/aris-thorne-400.webp',
    bio: 'Dr. Aris Thorne evaluates human clinical trials on cellular metabolism, NAD+ biosynthesis, and targeted epigenetic interventions. His reporting distinguishes early laboratory findings from validated human clinical endpoints.',
    shortBio: 'Covers human longevity trials, mitochondrial biology, and epigenetic clock research.',
    location: 'Boston · Stockholm',
    expertise: ['Cellular Senescence', 'Epigenetic Methylation', 'Clinical Trial Design', 'Mitochondrial Biology'],
    education: 'Ph.D. in Molecular & Cellular Biology, Harvard University',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/author/aris-thorne'
    },
    verified: true,
    featuredArticleSlug: 'cellular-longevity-nad-synthesis-human-trials-preventive-medicine'
  },
  {
    id: 'auth-005',
    slug: 'elena-rostova',
    name: 'Elena Rostova',
    role: 'Senior Systems & Ergonomics Correspondent',
    department: 'Education & News Desk',
    institution: 'EIRVAN Systems & Policy Desk',
    avatar: '/images/authors/elena-rostova-400.webp',
    bio: 'Elena Rostova reports on workplace ergonomics, technical learning architectures, and semiconductor industrial policy. She specializes in translating primary regulatory filings and neuroscience studies into structured field guides.',
    shortBio: 'Covers workplace ergonomics, industrial policy, and sustained technical focus.',
    location: 'Geneva · New York',
    expertise: ['Cognitive Ergonomics', 'Industrial Policy', 'Technical Learning', 'Focus Protocols'],
    education: 'M.Sc. in Human-Computer Interaction, EPFL Lausanne',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/author/elena-rostova'
    },
    verified: true,
    featuredArticleSlug: 'dopamine-reward-prediction-attention-residue-technical-study'
  },
  {
    id: 'auth-006',
    slug: 'editorial-desk',
    name: 'EIRVAN Editorial Desk',
    role: 'Staff Reporting & Standards Collective',
    department: 'News & Standards Desk',
    institution: 'EIRVAN Publication',
    avatar: '/images/brand/eirvan-icon-192.webp',
    bio: 'The EIRVAN Editorial Desk produces verified multi-author news dispatches, standards briefs, and institutional updates reviewed under our published editorial and corrections policies.',
    shortBio: 'Collaborative staff reporting reviewed under EIRVAN editorial verification standards.',
    location: 'New York · London',
    expertise: ['Infrastructure Policy', 'Market Standards', 'Fact Verification', 'Technical Briefings'],
    education: 'EIRVAN Editorial Charter & Review Board',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com/about'
    },
    verified: true,
    featuredArticleSlug: 'global-foundry-capacity-2026-advanced-packaging-expansion'
  }
];

export const EDITORIAL_DESK_PROFILE: AuthorProfile = AUTHORS[AUTHORS.length - 1];

export function getAuthorBySlug(slug: string): AuthorProfile | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().replace(/^\/author\//, '').replace(/\/$/, '').trim();
  return AUTHORS.find(a => a.slug === clean || clean.includes(a.slug));
}

export function getAuthorByName(name: string): AuthorProfile {
  if (!name) return AUTHORS[AUTHORS.length - 1];
  const normalized = name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
  const matched = AUTHORS.find(a => {
    const aNorm = a.name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/, '').trim();
    return aNorm.includes(normalized) || normalized.includes(aNorm);
  });
  return matched || AUTHORS[AUTHORS.length - 1];
}

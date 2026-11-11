import { AuthorProfile } from '../types/author';

export const AUTHORS: AuthorProfile[] = [
  {
    id: 'auth-001',
    slug: 'evelyn-vance',
    name: 'Dr. Evelyn Vance',
    role: 'Principal Hardware Architect & Research Fellow',
    department: 'Semiconductor Systems & Quantum Physics',
    institution: 'EIRVAN Advanced Computing Directorate',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    bio: 'Dr. Evelyn Vance leads deep computing and neuromorphic hardware investigations at EIRVAN. With over 15 years in silicon topology design, mixed-signal ASIC fabrication, and low-temperature superconducting experiments, she previously served as a senior principal investigator at leading European semiconductor institutes and holds 9 patents in high-density memristor crossbars.',
    shortBio: 'Specialist in neuromorphic silicon, quantum annealing topology, and sub-milliwatt edge inference architectures.',
    location: 'Cambridge, MA · Zurich, Switzerland',
    expertise: ['Neuromorphic Silicon', 'Quantum Annealing', 'Memristive Logic', 'Edge Computing', 'Thermodynamic Computing'],
    education: 'Ph.D. in Applied Physics & VLSI Systems, ETH Zürich',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      scholar: 'https://scholar.google.com',
      github: 'https://github.com'
    },
    verified: true,
    featuredArticleSlug: 'quantum-neuromorphic-silicon-breakthrough-edge-computing'
  },
  {
    id: 'auth-002',
    slug: 'marcus-sterling',
    name: 'Marcus Sterling',
    role: 'Chief Quantitative Strategist & Financial Engineer',
    department: 'Algorithmic Markets & Discrete Simulation',
    institution: 'EIRVAN Quantitative Research Lab',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Marcus Sterling is a quantitative researcher and financial engineer specializing in ultra-low latency exchange microstructure, order book simulation, and dark pool crossing networks. Former head of execution analytics at a Tier-1 proprietary trading desk, Marcus has spent a decade dissecting adverse selection algorithms and market liquidity fragmentation.',
    shortBio: 'Dissects high-frequency trading microstructure, FPGA order matching, and dark liquidity routing.',
    location: 'London, UK · New York, NY',
    expertise: ['Order Book Microstructure', 'FPGA Matching Engines', 'Dark Pool Crossings', 'Algorithmic Execution', 'Liquidity Analysis'],
    education: 'M.Sc. in Mathematical Finance & Econometrics, Oxford University',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      github: 'https://github.com'
    },
    verified: true,
    featuredArticleSlug: 'algorithmic-finance-dark-pools-high-frequency-microstructure'
  },
  {
    id: 'auth-003',
    slug: 'clara-thorne',
    name: 'Dr. Clara Thorne',
    role: 'Cognitive Neuroscientist & Executive Performance Fellow',
    department: 'Neuro-Productivity & Executive Performance',
    institution: 'EIRVAN Human Performance Institute',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    bio: 'Dr. Clara Thorne is a cognitive neuroscientist and systems theorist whose research focuses on neurobiology-backed workplace architectures, cognitive endurance protocols, and digital attention conservation. She advises Fortune 50 engineering leaders and high-performing quantitative teams on eliminating asynchronous entropy and structuring ultra-deep work cycles.',
    shortBio: 'Focuses on non-sleep deep rest (NSDR), ultradian focus rhythms, and systemic operational leverage.',
    location: 'San Francisco, CA · Boston, MA',
    expertise: ['Cognitive Endurance', 'Ultradian Rhythms', 'Deep Work Systems', 'Neurochemistry of Focus', 'Attention Architecture'],
    education: 'Ph.D. in Cognitive Neuroscience, Stanford University',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com'
    },
    verified: true,
    featuredArticleSlug: 'deep-work-neuro-architecture-cognitive-mastery-protocol'
  },
  {
    id: 'auth-004',
    slug: 'aris-thorne',
    name: 'Dr. Aris Thorne',
    role: 'Molecular Biologist & Clinical Epigeneticist',
    department: 'Biotechnology & Cellular Longevity',
    institution: 'EIRVAN Life Sciences Division',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Dr. Aris Thorne is a molecular biologist researching mitochondrial respiration dynamics, epigenetic reprogramming, and targeted senolytic therapeutics. Aris was previously a post-doctoral fellow in epigenetic therapeutics, investigating Yamanaka transcription factors and NAD+ biosynthesis pathways in vascular aging.',
    shortBio: 'Investigates telomeric biology, Yamanaka factors, autophagy induction, and cellular rejuvenation therapeutics.',
    location: 'Boston, MA · Stockholm, Sweden',
    expertise: ['Cellular Senescence', 'Epigenetic Reprogramming', 'Mitochondrial Respiration', 'NAD+ Kinase Dynamics', 'Gene Therapy'],
    education: 'Ph.D. in Molecular & Cellular Biology, Harvard Medical School',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      scholar: 'https://scholar.google.com'
    },
    verified: true,
    featuredArticleSlug: 'cellular-longevity-epigenetic-reprogramming-senolytics-guide'
  },
  {
    id: 'auth-005',
    slug: 'elena-rostova',
    name: 'Elena Rostova',
    role: 'Director of Cognitive Ergonomics & Systems Design',
    department: 'Cognitive Science & Executive Systems',
    institution: 'EIRVAN Human Performance Institute',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    bio: 'Elena Rostova specializes in workplace environmental ergonomics, neuro-architecture, and bio-feedback systems for high-pressure knowledge teams.',
    shortBio: 'Specialist in cognitive stamina, sensory ergonomics, and distraction-immune engineering environments.',
    location: 'Geneva, Switzerland · New York, NY',
    expertise: ['Cognitive Ergonomics', 'Biorhythm Entrainment', 'Deep Focus Protocols'],
    education: 'M.Sc. in Human-Computer Interaction & Ergonomics, EPFL Lausanne',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan'
    },
    verified: true
  },
  {
    id: 'auth-006',
    slug: 'editorial-desk',
    name: 'EIRVAN Editorial Desk',
    role: 'Staff Technology & Global Markets Collective',
    department: 'Editorial Board & Standards Committee',
    institution: 'EIRVAN Publishing Consortium',
    avatar: '/assets/aistudio/Global_Orbit_E_Icon_346096e1.png',
    bio: 'The EIRVAN Editorial Desk is a collaborative syndicate of engineers, investigative journalists, data scientists, and sector specialists dedicated to reporting on high-impact technology, finance, and science breakthroughs with zero hype and empirical rigour.',
    shortBio: 'Collaborative staff reporting by verified EIRVAN subject-matter specialists.',
    location: 'Global Bureau · New York · London · Singapore',
    expertise: ['Empirical Journalism', 'Peer-Reviewed Analysis', 'Technical Verification', 'Market Data Auditing'],
    education: 'EIRVAN Fact-Checking & Technical Charter Standards',
    socialLinks: {
      twitter: 'https://x.com/eirvan',
      linkedin: 'https://linkedin.com/company/eirvan',
      website: 'https://eirvan.com'
    },
    verified: true
  }
];

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

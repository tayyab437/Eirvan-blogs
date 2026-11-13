import { Product } from '../types/products';

export const PRODUCTS: Product[] = [
  {
    id: 'prod-annual-pass',
    slug: 'annual-pro-research-pass',
    title: 'EIRVAN Pro Annual Intelligence Pass',
    subtitle: 'Institutional-grade research memos, proprietary datasets, and full dossier archives',
    description: 'Unlimited access to all deep-dive research briefs, weekly alpha memos, raw datasets, and direct access to EIRVAN quantitative analysts.',
    longDescription: 'The EIRVAN Pro Annual Intelligence Pass is engineered for hedge fund analysts, technology executives, deep-tech founders, and longevity researchers. Receive unredacted intelligence briefings 48 hours prior to public syndication, complete with raw statistical models, proprietary market microstructure simulations, and peer-reviewed biomedical data appendices.',
    price: 240,
    originalPrice: 348,
    category: 'Membership',
    featuredImage: '/images/editorial/about-library-1200.webp',
    format: 'Annual Subscription · All Access',
    badge: 'Flagship Membership',
    isFeatured: true,
    highlights: [
      'Unlimited access to all institutional research dossiers and PDF whitepapers',
      'Weekly proprietary macro & AI alpha dispatch delivered every Sunday at 20:00 UTC',
      'Downloadable Python / R simulation models and raw research data (CSV, Parquet)',
      'Quarterly private closed-door briefings with EIRVAN principal analysts',
      'Zero advertising across all EIRVAN web and mobile interfaces'
    ],
    tableOfContents: [
      'Module 1: Real-Time Intelligence Stream & RSS Pro Access',
      'Module 2: Complete Institutional Dossier Archive (2024–2026)',
      'Module 3: Quantitative Simulation Frameworks & Jupyter Notebooks',
      'Module 4: Global Macroeconomic Asset Allocation Models',
      'Module 5: Clinical Trial Rejuvenation Protocol Syntheses'
    ]
  },
  {
    id: 'prod-neuromorphic-dossier',
    slug: 'neuromorphic-silicon-dossier',
    title: '2026 Neuromorphic Silicon & Photonic Interposers Dossier',
    subtitle: '140-page technical monograph on analog spiking neural networks and co-packaged optics',
    description: 'Comprehensive technical blueprint analyzing the industry pivot from synchronous digital von Neumann designs to analog event-driven spiking architectures.',
    longDescription: 'As traditional foundry scaling hits thermal dissipation barriers at 2nm, neuromorphic compute and photonic interposers represent the primary frontier for sustained compute density. This monograph dissects real-world fab yields, thermal envelope comparisons, and interconnect latency across leading commercial tape-outs.',
    price: 89,
    originalPrice: 129,
    category: 'Research Dossier',
    featuredImage: '/images/articles/neuromorphic-silicon-800.webp',
    format: '140-Page DRM-Free PDF + EDA Netlists',
    pageCount: 140,
    badge: 'Bestseller',
    highlights: [
      'Die-level layout diagrams and interconnect latency benchmarks for 2nm analog compute',
      'Co-packaged optics (CPO) power-per-bit metrics versus traditional copper traces',
      'Spiking Neural Network (SNN) energy efficiency models across edge inference nodes',
      'Comparative economic yield analysis across TSMC, Intel Foundry, and Samsung nodes'
    ],
    tableOfContents: [
      'Chapter 1: The Thermodynamic Wall of Von Neumann Compute',
      'Chapter 2: Analog Spiking Dynamics and Memristive Synapse Fabric',
      'Chapter 3: Co-Packaged Optics & Silicon Photonics Substrate Integration',
      'Chapter 4: Commercial Foundry Roadmap & Commercial Deployment Timelines',
      'Chapter 5: Full Architectural Spec Sheets & Benchmark Replications'
    ]
  },
  {
    id: 'prod-dark-pool-suite',
    slug: 'dark-pool-fpga-arbitrage-suite',
    title: 'Dark Pool Algorithmic Arbitrage Execution Suite',
    subtitle: 'Microsecond market microstructure simulator and FPGA packet parsing codebase',
    description: 'Production-ready Python/C++ simulation toolkit for quantitative traders modeling sub-microsecond cross-venue liquidity fragmentation and dark pool queues.',
    longDescription: 'An exhaustive engineering suite designed for quantitative traders and financial engineers. Includes a full discrete-event matching engine simulator, NASDAQ ITCH 5.0 and direct multicast feed parsers, queue-position predictive algorithms, and adverse selection mitigation frameworks.',
    price: 149,
    originalPrice: 199,
    category: 'Code & Tooling',
    featuredImage: '/images/articles/algorithmic-arbitrage-800.webp',
    format: 'GitHub Private Repo + Documentation + Jupyter Suite',
    badge: 'Quant Toolkit',
    highlights: [
      'Sub-microsecond deterministic order book matching simulator in modern C++20 and Python',
      'Synthetic dark pool crossing network with simulated adverse selection and latency slippage',
      'FPGA bitstream architecture templates for low-latency network interface cards (NICs)',
      '12 Jupyter notebooks demonstrating mean-reversion and statistical latency arbitrage'
    ],
    tableOfContents: [
      'Section 1: Microsecond Market Microstructure Foundations',
      'Section 2: C++20 Zero-Allocation Multicast Feed Handler',
      'Section 3: Dark Liquidity Probability Models and Hidden Order Detection',
      'Section 4: Simulation Engine Architecture and Historical Tick Backtesting',
      'Section 5: Deployment Guide for Institutional Trading Infrastructures'
    ]
  },
  {
    id: 'prod-ultradian-blueprint',
    slug: 'ultradian-ergonomics-blueprint',
    title: '90-Minute Ultradian Rhythm & Cognitive Ergonomics Blueprint',
    subtitle: 'Neurobiological performance protocols, circadian alignment kits, and workspace design',
    description: 'A scientifically validated system for knowledge workers, developers, and writers seeking to sustain high-intensity focus without adrenal burnout.',
    longDescription: 'Rooted in chronobiology and neuroendocrine research, this blueprint outlines the exact daily rhythm calibration protocols used by top research teams. Move beyond generic time management and align intellectual output with endogenous biological ultradian cycles.',
    price: 49,
    category: 'Blueprint',
    featuredImage: '/images/articles/cognitive-sprint-800.webp',
    format: 'Digital Notion Workspace + PDF Protocol Manual',
    pageCount: 65,
    highlights: [
      'Hour-by-hour circadian schedule template with neurochemical timing markers',
      'Sensory ergonomics guide: lighting spectrums, acoustic baffles, and CO2 thresholds',
      'Dopamine baseline reset protocol for sustained deep work sprints',
      'Interactive Notion OS template with integrated focus timers and sprint logs'
    ],
    tableOfContents: [
      'Protocol 1: Biological Foundations of the 90-Minute Basic Rest-Activity Cycle',
      'Protocol 2: Morning Neurochemical Priming and Cortisol Awakening Optimization',
      'Protocol 3: Physical Environment Architecture (Lux, Kelvin, Air Quality, Posture)',
      'Protocol 4: Evening Glymphatic Clearance and Deep Sleep Restoration'
    ]
  },
  {
    id: 'prod-longevity-meta-analysis',
    slug: 'cellular-longevity-meta-analysis',
    title: 'Cellular Longevity & Epigenetic Methylation Meta-Analysis',
    subtitle: 'Human clinical trials synthesis on NAD+ precursors, vascular elasticity, and epigenetic clocks',
    description: 'In-depth meta-analysis examining 42 peer-reviewed human trials evaluating nicotinamide derivatives, senolytics, and epigenetic rejuvenation markers.',
    longDescription: 'A rigorous meta-analysis examining peer-reviewed human clinical trials on vascular compliance, mitochondrial respiration, and biological age measurement. Designed for medical professionals, bio-hackers, and longevity biotech researchers.',
    price: 79,
    originalPrice: 110,
    category: 'Research Dossier',
    featuredImage: '/images/articles/cellular-longevity-nad-800.webp',
    format: '95-Page Research Report + Biomarker Assessment Spreadsheet',
    pageCount: 95,
    badge: 'Clinical Research',
    highlights: [
      'Systematic review of 42 human clinical trials with pooled effect size calculations',
      'Vascular compliance (Pulse Wave Velocity) outcomes across NAD+ supplementation cohorts',
      'Comparison of Horvath, Hannum, and GrimAge epigenetic clock acceleration rates',
      'Biomarker assessment spreadsheet template with reference ranges and lab test checklists'
    ],
    tableOfContents: [
      'Section 1: Human Trial Methodology and Cohort Demographics',
      'Section 2: Microvascular Endothelial Metrics and Arterial Stiffness Findings',
      'Section 3: Epigenetic Methylation Dynamics and Reversible Aging Markers',
      'Section 4: Safety Profiles, Dosing Windows, and Bioavailability Data',
      'Section 5: Future Research Vectors and Pipeline Clinical Drug Candidates'
    ]
  }
];

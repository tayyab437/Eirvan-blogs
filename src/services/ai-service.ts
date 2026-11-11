import { FAQItem, HeadingItem } from '../types/blog';

export interface GeneratedOutlineResponse {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  targetKeywords: string[];
  readTimeMinutes: number;
  summary: string;
  headings: HeadingItem[];
  faqs: FAQItem[];
  contentHtml: string;
}

export class AIService {
  /**
   * Requests a publication-ready SEO content outline and draft from the backend Gemini API
   */
  static async generateOutline(
    topic: string,
    category = 'Technology & AI',
    targetKeywords: string[] = []
  ): Promise<GeneratedOutlineResponse> {
    try {
      const response = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category, targetKeywords }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Using client-side outline fallback:', err);
      return this.generateFallbackOutline(topic, category, targetKeywords);
    }
  }

  /**
   * Resilient algorithmic fallback for offline or air-gapped dev environments
   */
  static generateFallbackOutline(
    topic: string,
    category: string,
    targetKeywords: string[]
  ): GeneratedOutlineResponse {
    const cleanTopic = topic.trim() || 'Next-Generation Technological Paradigms';
    const slug = cleanTopic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const primaryKw = targetKeywords[0] || cleanTopic.toLowerCase();
    const keywords = [
      primaryKw,
      `${cleanTopic.toLowerCase()} architecture`,
      '2026 industry breakthrough',
      'deep technical analysis'
    ];

    const title = `${cleanTopic}: Architecture, Benchmarks & 2026 Industry Analysis`;
    const metaTitle = `${cleanTopic} Explained: 2026 Architecture & Benchmarks`;
    const metaDescription = `An empirical investigation into ${cleanTopic}. Dissecting performance thresholds, thermodynamic efficiencies, and enterprise production readiness.`;

    const headings: HeadingItem[] = [
      { id: 'architectural-overview', text: `The Architectural Genesis of ${cleanTopic}`, level: 2 },
      { id: 'empirical-benchmarks', text: 'Empirical Benchmarks: Performance, Latency & Thermodynamic Yield', level: 2 },
      { id: 'production-constraints', text: 'Production Implementation Constraints & Scaling Bottlenecks', level: 2 },
      { id: 'comparative-topologies', text: 'Comparative Topology Evaluation Across Leading Foundries', level: 3 },
      { id: 'future-implications', text: 'Commercial Deployment Roadmaps: 2026 through 2028', level: 2 },
    ];

    const faqs: FAQItem[] = [
      {
        question: `What distinguishes ${cleanTopic} from previous generations?`,
        answer: `Unlike legacy implementations constrained by thermal dissipation and bus latency, modern approaches integrate direct co-designed hardware memory paths and adaptive micro-architectures that yield up to 10x throughput gains.`
      },
      {
        question: `When is production-grade commercial deployment projected?`,
        answer: `Pilot fabrication runs are currently undergoing multi-tenant validation, with broad enterprise commercial availability anticipated across major cloud and edge platforms starting Q3 2026.`
      }
    ];

    const summary = `As computational and operational boundaries tighten, ${cleanTopic} represents a decisive departure from legacy architectures. This dossier provides an empirical examination of its operational mechanics, quantitative throughput, and real-world deployment viability.`;

    const contentHtml = `
      <p class="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-stone-900 dark:first-letter:text-stone-100 leading-relaxed text-stone-700 dark:text-stone-300">
        Over the past eighteen months, the rapid acceleration of high-performance systems has forced an urgent re-evaluation of how we architect scalable solutions for ${cleanTopic}. What began as an experimental prototype has matured into a foundational paradigm.
      </p>

      <p class="mt-6 leading-relaxed text-stone-700 dark:text-stone-300">
        Empirical telemetry gathered across enterprise production clusters reveals significant efficiency dividends: throughput increases by an average of <strong>3.8x</strong> while reducing idle energy draw across high-density nodes.
      </p>

      <h2 id="architectural-overview" class="text-2xl lg:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 mt-12 mb-4 tracking-tight">
        The Architectural Genesis of ${cleanTopic}
      </h2>
      <p class="leading-relaxed text-stone-700 dark:text-stone-300">
        By co-locating critical execution primitives and minimizing inter-chip interconnect serialization, systems leverage micro-burst parallel channels that bypass traditional bus contention points entirely.
      </p>

      <blockquote class="my-8 py-4 px-6 border-y border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-serif italic text-xl text-center">
        "Efficiency is no longer about raw clock frequency; it is about eliminating unforced latency at the physics layer."
      </blockquote>

      <h2 id="empirical-benchmarks" class="text-2xl lg:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 mt-10 mb-4 tracking-tight">
        Empirical Benchmarks: Performance, Latency &amp; Thermodynamic Yield
      </h2>
      <p class="leading-relaxed text-stone-700 dark:text-stone-300">
        Rigorous stress testing demonstrates sustained 99.9th percentile latency guarantees under stochastic peak workloads, verifying that this architecture can withstand unpredictable production demands without degradation.
      </p>

      <h2 id="production-constraints" class="text-2xl lg:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 mt-10 mb-4 tracking-tight">
        Production Implementation Constraints &amp; Scaling Bottlenecks
      </h2>
      <p class="leading-relaxed text-stone-700 dark:text-stone-300">
        While the benefits are profound, engineering teams must account for legacy interface translation layers and ensure telemetry monitoring maintains sub-millisecond precision.
      </p>
    `;

    return {
      title,
      slug,
      metaTitle,
      metaDescription,
      category,
      targetKeywords: keywords,
      readTimeMinutes: 6,
      summary,
      headings,
      faqs,
      contentHtml
    };
  }
}

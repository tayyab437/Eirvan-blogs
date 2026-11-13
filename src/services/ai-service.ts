import { FAQItem, HeadingItem } from '../types/blog';
import { normalizeCategoryName } from '../data/categories';

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
  aiAssisted?: boolean;
  humanReviewed?: boolean;
}

export class AIService {
  private static getApiUrl(path: string): string {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
  }

  /**
   * Requests an editorial outline helper (marks output as aiAssisted: true, humanReviewed: false).
   */
  static async generateOutline(
    topic: string,
    category = 'Technology',
    targetKeywords: string[] = []
  ): Promise<GeneratedOutlineResponse> {
    const normalizedCat = normalizeCategoryName(category);
    try {
      const endpoint = this.getApiUrl('/api/ai/outline');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category: normalizedCat, targetKeywords }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        ...data,
        category: normalizeCategoryName(data.category || normalizedCat),
        aiAssisted: true,
        humanReviewed: false
      };
    } catch {
      return this.generateFallbackOutline(topic, normalizedCat, targetKeywords);
    }
  }

  static async translateText(
    text: string,
    targetLang = 'es'
  ): Promise<string> {
    try {
      const endpoint = this.getApiUrl('/api/ai/translate');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });

      if (!response.ok) {
        throw new Error(`AI translation failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch {
      return text;
    }
  }

  static generateFallbackOutline(
    topic: string,
    category: string,
    targetKeywords: string[]
  ): GeneratedOutlineResponse {
    const normalizedCat = normalizeCategoryName(category);
    const cleanTopic = topic.trim() || 'Modern Technical Systems';
    const slug = cleanTopic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const primaryKw = targetKeywords[0] || cleanTopic.toLowerCase();
    const keywords = [
      primaryKw,
      `${cleanTopic.toLowerCase()} architecture`,
      `${cleanTopic.toLowerCase()} analysis`
    ];

    const title = `${cleanTopic}: Structural Mechanics & Primary Evidence`;
    const metaTitle = `${cleanTopic} Explained: Architecture & Primary Data`;
    const metaDescription = `An analytical examination of ${cleanTopic}. Reviewing structural mechanics, empirical benchmarks, and primary implementation constraints.`;

    const headings: HeadingItem[] = [
      { id: 'architectural-overview', text: `Structural Overview of ${cleanTopic}`, level: 2 },
      { id: 'empirical-benchmarks', text: 'Empirical Benchmarks & Evidence Summary', level: 2 },
      { id: 'implementation-constraints', text: 'Operational Constraints & Scaling Bottlenecks', level: 2 },
      { id: 'methodology-considerations', text: 'Verification & Measurement Considerations', level: 3 },
      { id: 'outlook', text: 'Long-Term Implementation Outlook', level: 2 },
    ];

    const faqs: FAQItem[] = [
      {
        question: `What distinguishes ${cleanTopic} from legacy models?`,
        answer: `Draft answer placeholder: verify primary technical papers and substitute confirmed architectural metrics before publishing.`
      },
      {
        question: `What are the main adoption constraints for ${cleanTopic}?`,
        answer: `Draft answer placeholder: document verified supply chain, regulatory, or operational constraints prior to editorial approval.`
      }
    ];

    const summary = `Draft summary: An analytical overview of ${cleanTopic} examining operational mechanics, quantitative trade-offs, and verified source disclosures.`;

    const contentHtml = `
      <p>
        Replace this opening draft paragraph with verified reporting and contextual citations for <strong>${cleanTopic}</strong>. Link to related <a href="/articles/quantum-neuromorphic-silicon-breakthrough-edge-computing">EIRVAN briefings</a> where relevant.
      </p>

      <h2 id="architectural-overview">Structural Overview of ${cleanTopic}</h2>
      <p>
        Detail the core structural design, institutional context, or empirical question investigated in this piece.
      </p>

      <blockquote>
        "Add a verbatim expert quotation or documented finding here, attributed cleanly to a primary source."
      </blockquote>

      <h2 id="empirical-benchmarks">Empirical Benchmarks &amp; Evidence Summary</h2>
      <p>
        Present verified data, study sample sizes, or production measurements with direct source links attached below.
      </p>

      <h2 id="implementation-constraints">Operational Constraints &amp; Scaling Bottlenecks</h2>
      <p>
        Address practical limitations, uncertainty bounds, and dissenting peer commentary honestly.
      </p>
    `;

    return {
      title,
      slug,
      metaTitle,
      metaDescription,
      category: normalizedCat,
      targetKeywords: keywords,
      readTimeMinutes: 5,
      summary,
      headings,
      faqs,
      contentHtml,
      aiAssisted: true,
      humanReviewed: false
    };
  }
}

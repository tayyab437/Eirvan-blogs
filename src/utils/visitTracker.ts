export interface VisitCandidate {
  visitSeq: number;
  routeType: string;
  pathname: string;
  articleId?: string;
  awaitingArticleResolution: boolean;
}

export interface RecordedVisitEntry {
  visitSeq: number;
  targetKey: string;
}

export interface VisitTracker {
  shouldRecord(candidate: VisitCandidate): { record: boolean; targetKey?: string };
  reset(): void;
}

/**
 * Guarantees deterministic single-count per route visit:
 * - Waits for cold-load article resolution before counting
 * - Prevents duplicate counts from React StrictMode double-effects, background catalog refreshes,
 *   bookmark toggles, or canonical replaceState updates within the same visitSeq
 * - Counts legitimately when a visitor leaves an article and returns in a new navigation (new visitSeq)
 */
export function createVisitTracker(): VisitTracker {
  let lastRecorded: RecordedVisitEntry | null = null;

  return {
    shouldRecord(candidate: VisitCandidate): { record: boolean; targetKey?: string } {
      if (candidate.routeType === 'admin') {
        return { record: false };
      }

      if (candidate.awaitingArticleResolution) {
        return { record: false };
      }

      const targetKey = candidate.articleId
        ? `article:${candidate.articleId}`
        : `route:${candidate.routeType}:${candidate.pathname}`;

      if (
        lastRecorded &&
        lastRecorded.visitSeq === candidate.visitSeq &&
        lastRecorded.targetKey === targetKey
      ) {
        return { record: false };
      }

      lastRecorded = {
        visitSeq: candidate.visitSeq,
        targetKey
      };

      return { record: true, targetKey };
    },
    reset() {
      lastRecorded = null;
    }
  };
}

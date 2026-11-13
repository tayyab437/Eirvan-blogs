declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gaInitialized = false;

/**
 * Optional Google Analytics 4 loader.
 * Activates strictly when VITE_GA_MEASUREMENT_ID is configured at build time
 * (never injects third-party tracking scripts or fake telemetry when unset).
 */
export function initOptionalAnalytics(): void {
  if (typeof window === 'undefined' || gaInitialized) return;
  const measurementId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return;
  }

  gaInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function trackRoutePageView(path: string, title?: string): void {
  if (typeof window === 'undefined') return;
  const measurementId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
  if (!measurementId || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

export function getAnalyticsConfigSummary() {
  const gaId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
  const gscEnvToken = (import.meta.env.VITE_GSC_VERIFICATION_TOKEN || '').trim();
  const domGscToken =
    typeof document !== 'undefined'
      ? (document.querySelector('meta[name="google-site-verification"]')?.getAttribute('content') || '').trim()
      : '';
  return {
    gaConfigured: Boolean(gaId),
    gaMeasurementId: gaId || null,
    gscConfigured: Boolean(gscEnvToken || domGscToken)
  };
}

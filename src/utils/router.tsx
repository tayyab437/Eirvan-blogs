import React, { useEffect, useState, useCallback } from 'react';

export interface RouteState {
  path: string;
  pathname: string;
  search: string;
  queryParams: Record<string, string>;
  routeType:
    | 'home'
    | 'category'
    | 'article'
    | 'products'
    | 'product'
    | 'checkout-cart'
    | 'checkout-details'
    | 'checkout-payment'
    | 'checkout-confirmation'
    | 'bookmarks'
    | 'about'
    | 'terms'
    | 'privacy'
    | 'admin'
    | 'author'
    | 'search'
    | 'not-found';
  param?: string; // slug or id
}

export const CATEGORY_MAP: Record<string, string> = {
  'technology-ai': 'Technology & AI',
  'technology': 'Technology & AI',
  'global-markets-finance': 'Global Markets & Finance',
  'business': 'Global Markets & Finance',
  'productivity-mindset': 'Productivity & Mindset',
  'education': 'Productivity & Mindset',
  'biotech-longevity': 'Biotech & Longevity',
  'lifestyle': 'Biotech & Longevity',
  'news': 'Technology & AI',
};

export const REVERSE_CATEGORY_MAP: Record<string, string> = {
  'Technology & AI': 'technology',
  'Global Markets & Finance': 'business',
  'Productivity & Mindset': 'education',
  'Biotech & Longevity': 'lifestyle',
  'News': 'news',
};

export function categoryToSlug(category: string): string {
  return REVERSE_CATEGORY_MAP[category] || 'all';
}

export function slugToCategory(slug: string): string {
  return CATEGORY_MAP[slug] || 'all';
}

export function parseRoute(pathname: string, search: string = window.location.search): RouteState {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  if (normalizedPath === '/') {
    return { path: '/', pathname: '/', search, queryParams, routeType: 'home' };
  }

  if (normalizedPath === '/bookmarks') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'bookmarks' };
  }

  if (normalizedPath === '/about') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'about' };
  }

  if (normalizedPath === '/terms') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'terms' };
  }

  if (normalizedPath === '/privacy') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'privacy' };
  }

  if (normalizedPath === '/admin') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'admin' };
  }

  if (normalizedPath === '/search') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'search' };
  }

  if (normalizedPath === '/products' || normalizedPath === '/store') {
    return { path: '/products', pathname: '/products', search, queryParams, routeType: 'products' };
  }

  // Checkout multi-step flow URLs
  if (normalizedPath === '/checkout' || normalizedPath === '/checkout/cart') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'checkout-cart' };
  }

  if (normalizedPath === '/checkout/details' || normalizedPath === '/checkout/information') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'checkout-details' };
  }

  if (normalizedPath === '/checkout/payment') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'checkout-payment' };
  }

  if (normalizedPath === '/checkout/confirmation' || normalizedPath === '/checkout/success') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'checkout-confirmation' };
  }

  // Parameterized routes
  const productMatch = normalizedPath.match(/^\/product\/([^/]+)/);
  if (productMatch) {
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'product',
      param: productMatch[1]
    };
  }

  const articleMatch = normalizedPath.match(/^\/(?:articles?|briefing|post)\/([^/]+)/);
  if (articleMatch) {
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'article',
      param: articleMatch[1]
    };
  }

  const authorMatch = normalizedPath.match(/^\/author\/([^/]+)/);
  if (authorMatch) {
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'author',
      param: authorMatch[1]
    };
  }

  const categoryMatch = normalizedPath.match(/^\/category\/([^/]+)/);
  if (categoryMatch) {
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'category',
      param: categoryMatch[1]
    };
  }

  return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'not-found' };
}

export function navigate(url: string, options: { replace?: boolean; scroll?: boolean } = {}) {
  const { replace = false, scroll = true } = options;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.pathname, window.location.search));

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const push = useCallback((url: string, options?: { replace?: boolean; scroll?: boolean }) => {
    navigate(url, options);
  }, []);

  return { route, navigate: push };
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  replace?: boolean;
  scroll?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const Link: React.FC<LinkProps> = ({
  href,
  children,
  replace,
  scroll = true,
  className,
  onClick,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    // Allow default for new tab / external modifier keys
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
      return;
    }
    e.preventDefault();
    navigate(href, { replace, scroll });
  };

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};

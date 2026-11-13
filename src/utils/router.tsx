import React, { useEffect, useState, useCallback } from 'react';
import { getCategoryHubBySlug, getCategoryHubByName, LEGACY_CATEGORY_ALIASES } from '../data/categories';

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
    | 'editorial-policy'
    | 'corrections-policy'
    | 'contact'
    | 'terms'
    | 'privacy'
    | 'admin'
    | 'author'
    | 'search'
    | 'not-found';
  param?: string;
  page?: number;
}

export const CATEGORY_MAP: Record<string, string> = {
  ...LEGACY_CATEGORY_ALIASES
};

export const REVERSE_CATEGORY_MAP: Record<string, string> = {
  'Technology': 'technology',
  'Technology & AI': 'technology',
  'Business': 'business',
  'Global Markets & Finance': 'business',
  'Lifestyle': 'lifestyle',
  'Biotech & Longevity': 'lifestyle',
  'Education': 'education',
  'Productivity & Mindset': 'education',
  'Future of Work': 'education',
  'News': 'news'
};

export function getArticlePath(slug: string): string {
  const clean = (slug || '').replace(/^\/+/, '').replace(/^articles?\//, '');
  return `/articles/${clean}`;
}

export function getCategoryPath(category: string, page = 1): string {
  if (!category || category.toLowerCase() === 'all') {
    return page > 1 ? `/page/${page}` : '/';
  }
  const slug = categoryToSlug(category);
  return page > 1 ? `/category/${slug}/page/${page}` : `/category/${slug}`;
}

export function categoryToSlug(category: string): string {
  if (!category || category.toLowerCase() === 'all') return 'all';
  if (REVERSE_CATEGORY_MAP[category]) return REVERSE_CATEGORY_MAP[category];
  return getCategoryHubByName(category).slug;
}

export function slugToCategory(slug: string): string {
  if (!slug || slug.toLowerCase() === 'all') return 'all';
  const hub = getCategoryHubBySlug(slug);
  return hub ? hub.name : 'all';
}

export function parseRoute(pathname: string, search: string = typeof window !== 'undefined' ? window.location.search : ''): RouteState {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  if (normalizedPath === '/') {
    const queryPage = Math.max(1, parseInt(queryParams.page || '1', 10) || 1);
    return { path: '/', pathname: '/', search, queryParams, routeType: 'home', page: queryPage };
  }

  const homePageMatch = normalizedPath.match(/^\/page\/(\d+)$/);
  if (homePageMatch) {
    const pageNum = Math.max(1, parseInt(homePageMatch[1], 10) || 1);
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'home', page: pageNum };
  }

  if (normalizedPath === '/bookmarks') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'bookmarks' };
  }

  if (normalizedPath === '/about') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'about' };
  }

  if (normalizedPath === '/editorial-policy') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'editorial-policy' };
  }

  if (normalizedPath === '/corrections-policy') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'corrections-policy' };
  }

  if (normalizedPath === '/contact') {
    return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'contact' };
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

  const productMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
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

  const articleMatch = normalizedPath.match(/^\/(?:articles?|briefing|post)\/([^/]+)$/);
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

  const authorMatch = normalizedPath.match(/^\/author\/([^/]+)$/);
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

  const categoryPageMatch = normalizedPath.match(/^\/category\/([^/]+)\/page\/(\d+)$/);
  if (categoryPageMatch) {
    const hub = getCategoryHubBySlug(categoryPageMatch[1]);
    if (!hub) {
      return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'not-found' };
    }
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'category',
      param: hub.slug,
      page: Math.max(1, parseInt(categoryPageMatch[2], 10) || 1)
    };
  }

  const categoryMatch = normalizedPath.match(/^\/category\/([^/]+)$/);
  if (categoryMatch) {
    const hub = getCategoryHubBySlug(categoryMatch[1]);
    if (!hub) {
      return { path: normalizedPath, pathname: normalizedPath, search, queryParams, routeType: 'not-found' };
    }
    const queryPage = Math.max(1, parseInt(queryParams.page || '1', 10) || 1);
    return {
      path: normalizedPath,
      pathname: normalizedPath,
      search,
      queryParams,
      routeType: 'category',
      param: hub.slug,
      page: queryPage
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

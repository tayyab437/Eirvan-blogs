import React, { useState } from 'react';
import { getOptimizedImageUrl, getResponsiveImageSet } from '../utils/seo';

interface ResponsiveImageProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  preferredWidth?: number;
}

/**
 * Progressive <picture> renderer serving AVIF -> WebP -> JPEG srcset variants
 * for self-hosted /images/ assets, with explicit dimensions (zero CLS) and clean fallback.
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 800px',
  className = 'w-full h-full object-cover',
  priority = false,
  preferredWidth = 800
}) => {
  const [hasError, setHasError] = useState(false);
  const imageSet = getResponsiveImageSet(src, sizes);
  const fallbackDisplaySrc = getOptimizedImageUrl(src, preferredWidth);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-medium px-4 text-center ${className}`}
      >
        <span>{alt}</span>
      </div>
    );
  }

  return (
    <picture className="block w-full h-full">
      {imageSet.isLocalResponsive && imageSet.avifSrcSet && (
        <source type="image/avif" srcSet={imageSet.avifSrcSet} sizes={imageSet.sizes} />
      )}
      {imageSet.isLocalResponsive && imageSet.webpSrcSet && (
        <source type="image/webp" srcSet={imageSet.webpSrcSet} sizes={imageSet.sizes} />
      )}
      {imageSet.isLocalResponsive && imageSet.jpegSrcSet && (
        <source type="image/jpeg" srcSet={imageSet.jpegSrcSet} sizes={imageSet.sizes} />
      )}
      <img
        src={imageSet.isLocalResponsive ? imageSet.fallbackSrc : fallbackDisplaySrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={className}
      />
    </picture>
  );
};

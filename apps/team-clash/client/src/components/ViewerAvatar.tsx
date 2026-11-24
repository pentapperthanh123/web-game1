import React, { useState } from 'react';
import { DEFAULT_AVATAR_URL_PREFIX } from '../../../shared/constants/clashConfig';

interface ViewerAvatarProps {
  src?: string;
  /** Display name, used for the alt text and the placeholder initial. */
  name: string;
  /** Seed for the generated fallback avatar (username is stable across renames). */
  seed: string;
  sizePx: number;
  ringColor: string;
  ringWidthPx?: number;
  className?: string;
}

function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : '?';
}

/**
 * Round viewer avatar. The initial letter on the team color shows immediately and stays until an
 * image has actually loaded (slow / hanging CDN never leaves an empty circle).
 * Image fallback chain: real avatar → generated avatar → initial only.
 * TikTok CDN avatars often reject hotlinking with a referrer, hence `no-referrer`.
 */
export const ViewerAvatar: React.FC<ViewerAvatarProps> = ({
  src,
  name,
  seed,
  sizePx,
  ringColor,
  ringWidthPx = 3,
  className = '',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [isGeneratedFailed, setIsGeneratedFailed] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const canUsePrimary = Boolean(src) && failedSrc !== src;
  const url = canUsePrimary
    ? (src as string)
    : isGeneratedFailed
      ? null
      : `${DEFAULT_AVATAR_URL_PREFIX}${encodeURIComponent(seed)}`;
  const isLoaded = url !== null && loadedUrl === url;

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-black text-white ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        fontSize: sizePx * 0.46,
        backgroundColor: isLoaded ? '#0f172a' : ringColor,
        boxShadow: `0 0 0 ${ringWidthPx}px ${ringColor}, 0 0 0 ${ringWidthPx + 2}px rgba(255,255,255,0.9), 0 4px 14px rgba(0,0,0,0.55)`,
      }}
      aria-label={name}
    >
      {!isLoaded && <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{getInitial(name)}</span>}
      {url && (
        <img
          key={url}
          src={url}
          alt={name}
          draggable={false}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setLoadedUrl(url)}
          onError={() => {
            if (canUsePrimary) {
              setFailedSrc(src ?? null);
            } else {
              setIsGeneratedFailed(true);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
};

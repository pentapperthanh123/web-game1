import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  SESSION_TIER_EMBLEM_PATHS,
  SESSION_TIER_EMBLEM_VIEWBOX,
  SESSION_TIER_STYLE,
  SessionTier,
} from '../../../constants/sessionLeaderboard';

const EMBLEM_VIEWBOX = `0 0 ${SESSION_TIER_EMBLEM_VIEWBOX} ${SESSION_TIER_EMBLEM_VIEWBOX}`;

interface SessionTierEmblemProps {
  tier: SessionTier;
  className?: string;
}

export const SessionTierEmblem = React.memo(({ tier, className = 'w-3 h-3' }: SessionTierEmblemProps) => {
  const style = SESSION_TIER_STYLE[tier];
  // Original emblem art (no Riot assets): metal tiers = shield, gem tiers = cut gem, apex = crowned gem
  const paths = SESSION_TIER_EMBLEM_PATHS[style.shape];
  const gradientId = `session-tier-${tier}`;

  return (
    <svg viewBox={EMBLEM_VIEWBOX} className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={style.light} />
          <stop offset="100%" stopColor={style.dark} />
        </linearGradient>
      </defs>
      {paths.crown && <path d={paths.crown} fill={style.light} stroke={style.dark} strokeWidth={1} strokeLinejoin="round" />}
      <path d={paths.body} fill={`url(#${gradientId})`} stroke={style.dark} strokeWidth={1.4} strokeLinejoin="round" />
      <path d={paths.detail} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.9} strokeLinejoin="round" />
    </svg>
  );
});

SessionTierEmblem.displayName = 'SessionTierEmblem';

interface SessionTierBadgeProps {
  tier: SessionTier | undefined;
  /** Emblem only (chat lines) or emblem + tier name (banners). */
  hasLabel?: boolean;
}

const LABEL_CHIP_CLASS =
  'inline-flex items-center gap-0.5 pl-0.5 pr-1 py-px rounded-full border text-[8px] font-black uppercase leading-none shrink-0 bg-slate-950/85';

/** Session tier of a viewer. Renders nothing for unranked viewers. */
export const SessionTierBadge = React.memo(({ tier, hasLabel = false }: SessionTierBadgeProps) => {
  const { t } = useTranslation();
  if (!tier) return null;
  if (!hasLabel) return <SessionTierEmblem tier={tier} />;

  const style = SESSION_TIER_STYLE[tier];
  return (
    <span className={LABEL_CHIP_CLASS} style={{ borderColor: style.dark, color: style.light }}>
      <SessionTierEmblem tier={tier} className="w-3 h-3" />
      {t(style.labelKey, style.fallbackLabel)}
    </span>
  );
});

SessionTierBadge.displayName = 'SessionTierBadge';

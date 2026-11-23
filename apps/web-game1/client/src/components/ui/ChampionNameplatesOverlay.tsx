import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useRoundIntroStore } from '../../store/roundIntroStore';
import { getCanonicalViewerName, useSessionLeaderboardStore } from '../../store/sessionLeaderboardStore';
import { toCanonicalViewerName } from '../../store/roundDamageTracker';
import { CHAMPION_DEFAULT_MAX_HP } from '../../constants/bossSkills';
import {
  CHAMPION_LEVEL_THRESHOLDS,
  ChampionLevelConfig,
  getChampionLevelConfig,
} from '../../constants/championLevel';
import { GAME_CONSTANTS } from '../../constants/game';
import {
  SESSION_TIER,
  SESSION_TIER_STYLE,
  SessionTier,
  isSessionTierAtLeast,
} from '../../constants/sessionLeaderboard';
import { getTeamTheme } from '../../constants/teams';
import {
  getLiveChampionNameplateAnchor,
  setNameplateSyncListener,
} from '../../services/minionPositionRegistry';
import { SessionTierEmblem } from './session/SessionTierBadge';

const NAMEPLATE_UI = {
  EDGE_PADDING_PX: 4,
  RIM_GAP_PX: 3,
  FALLBACK_NAME: 'Viewer',
  SIGNATURE_PREFIX: '★ ',
  LEVEL_PREFIX: 'Lv.',
  OFFSCREEN_TRANSFORM: 'translate3d(-9999px, -9999px, 0)',
  TEXT_COLOR_DEFAULT: '#ffffff',
  TEXT_COLOR_GOLD: '#fde047',
  BORDER_WIDTH_STANDARD: '1px',
  BORDER_WIDTH_HIGH_TIER: '1.5px',
} as const;

interface NameplatePresentation {
  label: string;
  accentColor: string;
  isGoldText: boolean;
  isThickBorder: boolean;
  tier: SessionTier | undefined;
  level: number;
  levelConfig: ChampionLevelConfig;
}

interface PillDimensions {
  halfW: number;
  halfH: number;
}

const resolveDisplayDpr = (): number =>
  typeof window === 'undefined'
    ? 1
    : Math.min(window.devicePixelRatio || 1, GAME_CONSTANTS.RENDER.TEXT_CANVAS_DPR_MAX);

const resolveStandardAccentColor = (
  isHighLevel: boolean,
  levelAuraColor: string,
  isSignature: boolean,
  primaryColor: string
): string => {
  if (isHighLevel) return levelAuraColor;
  if (isSignature) return GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR;
  return primaryColor;
};

const resolveNameplatePresentation = (
  summonerName: string,
  signaturePlayerName: string | undefined,
  level: number | undefined,
  primaryColor: string,
  sessionTier: SessionTier | undefined
): NameplatePresentation => {
  const cleanName = (summonerName || NAMEPLATE_UI.FALLBACK_NAME).trim().replace(/^@+/, '');
  const sigTag = signaturePlayerName ? signaturePlayerName.trim() : '';
  const safeLevel = level && level > 0 ? level : 1;
  const levelConfig = getChampionLevelConfig(safeLevel);
  const isHighLevel = safeLevel >= CHAMPION_LEVEL_THRESHOLDS.WARLORD_MIN;
  const isLegendLevel = safeLevel >= CHAMPION_LEVEL_THRESHOLDS.LEGEND_MIN;

  if (sessionTier) {
    const isHighTier = isSessionTierAtLeast(sessionTier, SESSION_TIER.DIAMOND) || isHighLevel;
    return {
      label: `@${toCanonicalViewerName(cleanName)}`,
      accentColor: isHighLevel ? levelConfig.auraColor : SESSION_TIER_STYLE[sessionTier].light,
      isGoldText: isSessionTierAtLeast(sessionTier, SESSION_TIER.MASTER) || isLegendLevel,
      isThickBorder: isHighTier,
      tier: sessionTier,
      level: safeLevel,
      levelConfig,
    };
  }

  const isSignature = sigTag.length > 0;
  const accentColor = resolveStandardAccentColor(
    isHighLevel,
    levelConfig.auraColor,
    isSignature,
    primaryColor
  );

  return {
    label: isSignature ? `${NAMEPLATE_UI.SIGNATURE_PREFIX}@${cleanName}` : `@${cleanName}`,
    accentColor,
    isGoldText: isSignature || isLegendLevel,
    isThickBorder: isHighLevel,
    tier: undefined,
    level: safeLevel,
    levelConfig,
  };
};

interface NameplatePillProps {
  minionId: string;
  summonerName: string;
  signaturePlayerName: string | undefined;
  level: number | undefined;
  primaryColor: string;
  sessionTier: SessionTier | undefined;
  registerElement: (id: string, node: HTMLDivElement | null) => void;
  refreshSize: (id: string) => void;
}

const NameplatePill = React.memo(
  ({
    minionId,
    summonerName,
    signaturePlayerName,
    level,
    primaryColor,
    sessionTier,
    registerElement,
    refreshSize,
  }: NameplatePillProps) => {
    const presentation = resolveNameplatePresentation(
      summonerName,
      signaturePlayerName,
      level,
      primaryColor,
      sessionTier
    );
    const showLevelBadge = presentation.level >= CHAMPION_LEVEL_THRESHOLDS.WARRIOR_MIN;
    const handleRef = useCallback(
      (node: HTMLDivElement | null) => registerElement(minionId, node),
      [minionId, registerElement]
    );

    useLayoutEffect(() => {
      refreshSize(minionId);
    }, [minionId, presentation.label, presentation.level, presentation.tier, refreshSize]);

    return (
      <div
        ref={handleRef}
        style={{
          borderStyle: 'solid',
          borderWidth: presentation.isThickBorder
            ? NAMEPLATE_UI.BORDER_WIDTH_HIGH_TIER
            : NAMEPLATE_UI.BORDER_WIDTH_STANDARD,
          borderColor: presentation.accentColor,
        }}
        className="absolute left-0 top-0 inline-flex items-center gap-1 h-[18px] sm:h-[19px] px-1.5 rounded-full bg-slate-950/92 shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap will-change-transform"
      >
        {presentation.tier && <SessionTierEmblem tier={presentation.tier} className="w-3 h-3 shrink-0" />}
        <span
          className="text-[9.5px] sm:text-[10.5px] font-bold leading-none tracking-[0.01em] truncate max-w-[78px] sm:max-w-[92px] [text-shadow:0_1px_1px_rgba(0,0,0,0.95)]"
          style={{
            color: presentation.isGoldText
              ? NAMEPLATE_UI.TEXT_COLOR_GOLD
              : NAMEPLATE_UI.TEXT_COLOR_DEFAULT,
          }}
        >
          {presentation.label}
        </span>
        {showLevelBadge && (
          <span
            className="text-[8px] sm:text-[8.5px] font-mono font-extrabold leading-none px-1 py-px rounded-full border shrink-0"
            style={{
              backgroundColor: presentation.levelConfig.badgeBgColor,
              borderColor: presentation.levelConfig.badgeBorderColor,
              color: presentation.levelConfig.badgeTextColor,
            }}
          >
            {NAMEPLATE_UI.LEVEL_PREFIX}
            {presentation.level}
          </span>
        )}
      </div>
    );
  }
);

NameplatePill.displayName = 'NameplatePill';

/**
 * Sharp screen-space HTML/DOM viewer nameplates rigidly locked to the bottom rim of each champion token.
 * Eliminates mipmap/DPR=1 CanvasTexture blur while snapping cleanly to physical pixels.
 */
export const ChampionNameplatesOverlay = React.memo(() => {
  const minions = useGameStore((state) => state.minions);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const sessionTierByName = useSessionLeaderboardStore((state) => state.tierByName);
  const isIntroActive = useRoundIntroStore((state) => state.isActive);

  const containerRef = useRef<HTMLDivElement>(null);
  const elementMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sizeMapRef = useRef<Map<string, PillDimensions>>(new Map());

  const visibleMinions = useMemo(
    () => minions.filter((m) => (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0),
    [minions]
  );

  const positionSingleElement = useCallback(
    (id: string, el: HTMLDivElement, viewportW: number, viewportH: number, dpr: number) => {
      const anchor = getLiveChampionNameplateAnchor(id);
      if (!anchor || !anchor.visible) {
        if (el.style.opacity !== '0') el.style.opacity = '0';
        return;
      }

      let dims = sizeMapRef.current.get(id);
      if (!dims) {
        dims = { halfW: el.offsetWidth / 2, halfH: el.offsetHeight / 2 };
        sizeMapRef.current.set(id, dims);
      }

      const minCenterX = NAMEPLATE_UI.EDGE_PADDING_PX + dims.halfW;
      const maxCenterX = Math.max(minCenterX, viewportW - NAMEPLATE_UI.EDGE_PADDING_PX - dims.halfW);
      const clampedX = Math.max(minCenterX, Math.min(maxCenterX, anchor.x));
      const pillHeight = dims.halfH * 2;
      const maxTopY = Math.max(
        NAMEPLATE_UI.EDGE_PADDING_PX,
        viewportH - NAMEPLATE_UI.EDGE_PADDING_PX - pillHeight
      );
      const clampedTopY = Math.max(
        NAMEPLATE_UI.EDGE_PADDING_PX,
        Math.min(maxTopY, anchor.y + NAMEPLATE_UI.RIM_GAP_PX)
      );
      const leftPx = Math.round((clampedX - dims.halfW) * dpr) / dpr;
      const topPx = Math.round(clampedTopY * dpr) / dpr;

      el.style.transform = `translate3d(${leftPx}px, ${topPx}px, 0)`;
      el.style.zIndex = String(anchor.zIndex);
      if (el.style.opacity !== '1') el.style.opacity = '1';
    },
    []
  );

  const syncNameplateTransforms = useCallback(() => {
    const viewportW = containerRef.current?.clientWidth || window.innerWidth;
    const viewportH = containerRef.current?.clientHeight || window.innerHeight;
    if (!viewportW || !viewportH) return;

    const dpr = resolveDisplayDpr();
    for (const [id, el] of elementMapRef.current) {
      positionSingleElement(id, el, viewportW, viewportH, dpr);
    }
  }, [positionSingleElement]);

  const registerElement = useCallback(
    (id: string, node: HTMLDivElement | null) => {
      if (!node) {
        elementMapRef.current.delete(id);
        sizeMapRef.current.delete(id);
        return;
      }
      node.style.opacity = '0';
      node.style.transform = NAMEPLATE_UI.OFFSCREEN_TRANSFORM;
      elementMapRef.current.set(id, node);
      sizeMapRef.current.set(id, {
        halfW: node.offsetWidth / 2,
        halfH: node.offsetHeight / 2,
      });

      const viewportW = containerRef.current?.clientWidth || window.innerWidth;
      const viewportH = containerRef.current?.clientHeight || window.innerHeight;
      if (viewportW > 0 && viewportH > 0) {
        positionSingleElement(id, node, viewportW, viewportH, resolveDisplayDpr());
      }
    },
    [positionSingleElement]
  );

  const refreshSize = useCallback(
    (id: string) => {
      const el = elementMapRef.current.get(id);
      if (!el) return;
      sizeMapRef.current.set(id, {
        halfW: el.offsetWidth / 2,
        halfH: el.offsetHeight / 2,
      });
      const viewportW = containerRef.current?.clientWidth || window.innerWidth;
      const viewportH = containerRef.current?.clientHeight || window.innerHeight;
      if (viewportW > 0 && viewportH > 0) {
        positionSingleElement(id, el, viewportW, viewportH, resolveDisplayDpr());
      }
    },
    [positionSingleElement]
  );

  useEffect(() => {
    const handleResize = () => {
      for (const [id, el] of elementMapRef.current) {
        sizeMapRef.current.set(id, {
          halfW: el.offsetWidth / 2,
          halfH: el.offsetHeight / 2,
        });
      }
      syncNameplateTransforms();
    };

    setNameplateSyncListener(syncNameplateTransforms);
    window.addEventListener('resize', handleResize);
    return () => {
      setNameplateSyncListener(null);
      window.removeEventListener('resize', handleResize);
    };
  }, [syncNameplateTransforms]);

  if (isIntroActive || visibleMinions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden z-[24] select-none"
    >
      {visibleMinions.map((minion) => {
        const primaryColor = getTeamTheme(activeTeams[minion.team]?.colorTheme).primaryHex;
        const sessionTier = sessionTierByName[getCanonicalViewerName(minion.summonerName)];
        return (
          <NameplatePill
            key={minion.id}
            minionId={minion.id}
            summonerName={minion.summonerName}
            signaturePlayerName={minion.signaturePlayerName}
            level={minion.level}
            primaryColor={primaryColor}
            sessionTier={sessionTier}
            registerElement={registerElement}
            refreshSize={refreshSize}
          />
        );
      })}
    </div>
  );
});

ChampionNameplatesOverlay.displayName = 'ChampionNameplatesOverlay';

import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  FIGHTER_NAMEPLATE_CONFIG,
  LAYOUT_WRITE_EPSILON_PX,
  PUSH_FEED_CONFIG,
} from '../../../shared/constants/clashConfig';
import type { TeamId, ViewerSummary } from '../../../shared/types/clash';
import { getTeamPortrait } from '../engine/characterPortrait';
import { ARENA_FIGHTER_Y, type ClashLayout } from '../engine/clashLayout';
import { getEffectivePreset, useClashStore } from '../store/clashStore';
import { usePushFeedStore, type PushFeedChip } from '../store/pushFeedStore';
import { ViewerAvatar } from './ViewerAvatar';
import { useClashText } from '../i18n/clashText';

export interface PushOverlayHandle {
  applyLayout: (layout: Readonly<ClashLayout>) => void;
}

const NAMEPLATE_TOP_Y = ARENA_FIGHTER_Y + FIGHTER_NAMEPLATE_CONFIG.TOP_OFFSET_BELOW_FEET_Y;
const LEFT_FEED_MIN_X = PUSH_FEED_CONFIG.STAGE_EDGE_PADDING_PX + PUSH_FEED_CONFIG.MAX_CHIP_WIDTH_PX;
/** Right team chips grow rightward from their anchor; keep them inside the (stretchable) stage. */
const RIGHT_FEED_EDGE_RESERVE =
  PUSH_FEED_CONFIG.STAGE_EDGE_PADDING_PX + PUSH_FEED_CONFIG.MAX_CHIP_WIDTH_PX;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Moves an anchor element horizontally; skips the DOM write when it barely moved. */
function writeAnchorX(element: HTMLDivElement | null, lastX: { current: number }, x: number): void {
  if (!element || Math.abs(lastX.current - x) < LAYOUT_WRITE_EPSILON_PX) return;
  lastX.current = x;
  element.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
}

function formatPercent(amount: number): string {
  return `+${amount < 10 ? amount.toFixed(1) : amount.toFixed(0)}%`;
}

function describeChip(chip: PushFeedChip): string {
  if (chip.source === 'GIFT') return `🎁 ${chip.giftName ?? ''}`;
  return chip.source === 'LIKE' ? '❤️' : '⚡';
}

interface TeamVisual {
  name: string;
  keyword: string;
  primaryColor: string;
  avatarUrl?: string;
}

const FighterNameplate: React.FC<{
  side: TeamId;
  team: TeamVisual;
  pusher: ViewerSummary | undefined;
  hint: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}> = ({ side, team, pusher, hint, anchorRef }) => {
  const displayName = pusher?.nickname ?? team.name;

  return (
    <div
      ref={anchorRef}
      className="absolute left-0 z-20 pointer-events-none will-change-transform"
      style={{ top: NAMEPLATE_TOP_Y }}
      data-side={side}
    >
      <div className="-translate-x-1/2">
        {/* Keyed by pusher so a new pusher replays the pop (animation lives on its own element). */}
        <div key={pusher?.id ?? 'team'} className="flex flex-col items-center animate-plate-pop">
        <ViewerAvatar
          src={pusher ? pusher.avatarUrl : team.avatarUrl}
          name={displayName}
          seed={pusher?.username ?? team.name}
          sizePx={64}
          ringColor={team.primaryColor}
          ringWidthPx={4}
        />
        <div
          // relative + z-10: the avatar is positioned, so without this its ring paints over the name.
          className="relative z-10 mt-1.5 max-w-[210px] px-3 py-[2px] rounded-full border-2 shadow-xl flex items-center"
          style={{ borderColor: team.primaryColor, backgroundColor: 'rgba(6, 8, 20, 0.88)' }}
        >
          <span className="truncate text-[19px] leading-[1.35] font-black text-white">
            {displayName}
          </span>
        </div>
        {!pusher && (
          <span
            className="mt-1 text-[13px] font-extrabold text-white px-2 rounded-full"
            style={{ backgroundColor: `${team.primaryColor}CC` }}
          >
            {hint}
          </span>
        )}
        </div>
      </div>
    </div>
  );
};

const FeedChip: React.FC<{ chip: PushFeedChip; slot: number; side: TeamId; color: string }> = ({
  chip,
  slot,
  side,
  color,
}) => {
  const isGift = chip.source === 'GIFT';
  const isLeaving = chip.leavingAt !== null;
  const isLeft = side === 'LEFT';
  // Leaving chips drift one extra half-slot up while fading out.
  const offsetY = -(slot * PUSH_FEED_CONFIG.SLOT_GAP_PX) - (isLeaving ? PUSH_FEED_CONFIG.SLOT_GAP_PX / 2 : 0);

  return (
    <div
      className="absolute bottom-0 transition-[transform,opacity] duration-300 ease-out"
      style={{
        [isLeft ? 'right' : 'left']: 0,
        transform: `translate3d(0, ${offsetY}px, 0)`,
        opacity: isLeaving ? 0 : 1,
      }}
    >
      <div
        className={`flex items-center gap-2 rounded-full border-[3px] shadow-2xl animate-chip-enter ${
          isLeft ? 'flex-row pl-1 pr-3' : 'flex-row-reverse pr-1 pl-3'
        } ${isGift ? 'h-[54px]' : 'h-[46px]'}`}
        style={{
          maxWidth: PUSH_FEED_CONFIG.MAX_CHIP_WIDTH_PX,
          transformOrigin: isLeft ? 'right center' : 'left center',
          borderColor: isGift ? '#FDE047' : color,
          background: isGift
            ? `linear-gradient(${isLeft ? 90 : 270}deg, ${color} 0%, rgba(6, 8, 20, 0.92) 70%)`
            : 'rgba(6, 8, 20, 0.88)',
        }}
      >
        <ViewerAvatar
          src={chip.avatarUrl}
          name={chip.nickname}
          seed={chip.username}
          sizePx={isGift ? 44 : 36}
          ringColor={color}
          ringWidthPx={2}
        />
        <div className={`flex flex-col min-w-0 leading-tight ${isLeft ? 'items-start' : 'items-end'}`}>
          <span className="max-w-[150px] truncate text-[17px] leading-[1.3] font-black text-white">
            {chip.nickname}
          </span>
          <span className="flex items-center gap-1 text-[13px] font-extrabold whitespace-nowrap">
            <span className="max-w-[96px] truncate text-white/85">{describeChip(chip)}</span>
            {chip.giftCount > 1 && <span className="text-white">×{chip.giftCount}</span>}
            <span key={chip.bump} className="text-yellow-300 inline-block animate-amount-bump">
              {formatPercent(chip.amount)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

const FeedColumn: React.FC<{
  side: TeamId;
  chips: PushFeedChip[];
  color: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}> = ({ side, chips, color, anchorRef }) => (
  <div
    ref={anchorRef}
    className="absolute left-0 w-0 h-0 z-20 pointer-events-none will-change-transform"
    style={{ top: PUSH_FEED_CONFIG.BASE_BOTTOM_Y }}
  >
    {chips.map((chip, index) => (
      <FeedChip key={chip.key} chip={chip} slot={index} side={side} color={color} />
    ))}
  </div>
);

/**
 * DOM layer above the canvas: who is pushing (name plate under each fighter) and a live feed of
 * pushes rising next to the clash orb. DOM keeps names/avatars sharp at any OBS scale; positions
 * are written imperatively from the engine's per-frame layout (transform only, no React render).
 */
export const PushOverlay: React.FC<{ ref?: React.Ref<PushOverlayHandle> }> = ({ ref }) => {
  const leftPlateRef = useRef<HTMLDivElement | null>(null);
  const rightPlateRef = useRef<HTMLDivElement | null>(null);
  const leftFeedRef = useRef<HTMLDivElement | null>(null);
  const rightFeedRef = useRef<HTMLDivElement | null>(null);
  const lastLeftPlateX = useRef(Number.NaN);
  const lastRightPlateX = useRef(Number.NaN);
  const lastLeftFeedX = useRef(Number.NaN);
  const lastRightFeedX = useRef(Number.NaN);

  const preset = useClashStore((s) => getEffectivePreset(s.activePresetId, s.customPreset));
  const text = useClashText();
  const roundNumber = useClashStore((s) => s.roundNumber);
  const leftPusher = useClashStore((s) => s.recentLeftContributors[0]);
  const rightPusher = useClashStore((s) => s.recentRightContributors[0]);
  const leftChips = usePushFeedStore((s) => s.left);
  const rightChips = usePushFeedStore((s) => s.right);

  useImperativeHandle(
    ref,
    () => ({
      applyLayout: (layout) => {
        const minCenterX = FIGHTER_NAMEPLATE_CONFIG.EDGE_MARGIN_X;
        const maxCenterX = layout.stageWidth - FIGHTER_NAMEPLATE_CONFIG.EDGE_MARGIN_X;
        writeAnchorX(
          leftPlateRef.current,
          lastLeftPlateX,
          clamp(layout.leftFighterX, minCenterX, maxCenterX)
        );
        writeAnchorX(
          rightPlateRef.current,
          lastRightPlateX,
          clamp(layout.rightFighterX, minCenterX, maxCenterX)
        );
        writeAnchorX(
          leftFeedRef.current,
          lastLeftFeedX,
          Math.max(LEFT_FEED_MIN_X, layout.orbX - PUSH_FEED_CONFIG.ORB_GAP_X)
        );
        writeAnchorX(
          rightFeedRef.current,
          lastRightFeedX,
          Math.min(layout.stageWidth - RIGHT_FEED_EDGE_RESERVE, layout.orbX + PUSH_FEED_CONFIG.ORB_GAP_X)
        );
      },
    }),
    []
  );

  useEffect(() => {
    const prune = () => usePushFeedStore.getState().prune(performance.now());
    const intervalId = window.setInterval(prune, PUSH_FEED_CONFIG.PRUNE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    usePushFeedStore.getState().clear();
  }, [roundNumber]);

  // No pusher yet: show the team's own fighter (same art as the arena), not a stock avatar.
  const leftPortrait = useMemo(() => getTeamPortrait(preset, 'LEFT'), [preset]);
  const rightPortrait = useMemo(() => getTeamPortrait(preset, 'RIGHT'), [preset]);

  const leftTeam: TeamVisual = {
    name: preset.leftTeam.name,
    keyword: preset.leftTeam.keywords[0]?.toUpperCase() ?? '1',
    primaryColor: preset.leftTeam.primaryColor,
    avatarUrl: leftPortrait,
  };
  const rightTeam: TeamVisual = {
    name: preset.rightTeam.name,
    keyword: preset.rightTeam.keywords[0]?.toUpperCase() ?? '2',
    primaryColor: preset.rightTeam.primaryColor,
    avatarUrl: rightPortrait,
  };

  return (
    <>
      <FeedColumn side="LEFT" chips={leftChips} color={leftTeam.primaryColor} anchorRef={leftFeedRef} />
      <FeedColumn side="RIGHT" chips={rightChips} color={rightTeam.primaryColor} anchorRef={rightFeedRef} />
      <FighterNameplate
        side="LEFT"
        team={leftTeam}
        pusher={leftPusher}
        hint={text.pushHint(leftTeam.keyword)}
        anchorRef={leftPlateRef}
      />
      <FighterNameplate
        side="RIGHT"
        team={rightTeam}
        pusher={rightPusher}
        hint={text.pushHint(rightTeam.keyword)}
        anchorRef={rightPlateRef}
      />
    </>
  );
};

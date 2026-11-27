import React, { useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages } from '@shared/i18n';
import type { DrinkOrder, GuestBubble } from '@shared/types';
import type { GuestLaneIndex } from '../store/drinkBarStore';
import { useDrinkBarStore } from '../store/drinkBarStore';

interface DisplayGuestSlot {
  id: string;
  nickname: string;
  avatarUrl?: string;
  shirtColor: string;
  bottomColor: string;
  isVip: boolean;
  isSignature: boolean;
  bubbleText?: string;
  bubbleKey?: string;
  styleIdx: number;
  lane: GuestLaneIndex;
  row: number;
  isHeadOfQueue: boolean;
}

interface FloorSlotCoord {
  left: number;
  top: number;
  scale: number;
  zIndex: number;
}

const OUTLINE_COLOR = '#3B2820';
const SKIN_COLOR = '#FDE0C2';
const BLUSH_COLOR = '#F48BA3';
const CHIBI_STROKE_WIDTH = 2.5;
const MAX_PER_LANE = 12;
const FIXED_GUEST_SCALE = 0.72;
const ORDER_ZONE_SCALE = 0.82;
const ORDER_ZONE_COLS: readonly number[] = [252, 468, 150, 570, 58, 662];
const ORDER_ZONE_TOP_Y = 678;
const OUTER_CROWD_COLS: readonly number[] = [56, 142, 228, 314, 406, 492, 578, 664];
const OUTER_CROWD_ROWS_Y: readonly number[] = [800, 844];
const OUTER_CROWD_MIN_X = 48;
const OUTER_CROWD_MAX_X = 672;
const OUTER_CROWD_MIN_Y = 796;
const OUTER_CROWD_MAX_Y = 856;

const EMPTY_LOBBY_MAT_METRICS = {
  TOP_Y: 832,
  LEFT_X: 22,
  WIDTH: 676,
  HEIGHT: 122,
} as const;

const GUEST_SHIRT_COLORS: readonly string[] = [
  '#F7C6D7',
  '#A7D397',
  '#7FC8D9',
  '#FCE397',
  '#F4A6BE',
  '#CBEAD2',
];

const GUEST_BOTTOM_COLORS: readonly string[] = [
  '#7A5E6C',
  '#5E7287',
  '#8C6674',
  '#6E7864',
  '#7D6172',
  '#5D7679',
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampRange(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Uniform guest scale across waiting crowd, larger prominence in front Order Zone:
// - Front Order Zone (slots 0..5): 6 balanced spots along the counter leaving center aisle (x=360) clear
// - Outer Crowd (slots 6+): stratified wide distribution across full floor width & 2 depth bands
//   with deterministic organic jitter so guests spread evenly without clumping, staying strictly above y=960.
function computeGuestFloorCoord(slotIndex: number, orderId: string): FloorSlotCoord {
  if (slotIndex < ORDER_ZONE_COLS.length) {
    return {
      left: ORDER_ZONE_COLS[slotIndex],
      top: ORDER_ZONE_TOP_Y,
      scale: ORDER_ZONE_SCALE,
      zIndex: 20,
    };
  }

  const outerIdx = slotIndex - ORDER_ZONE_COLS.length;
  const colCount = OUTER_CROWD_COLS.length;
  const colIdx = outerIdx % colCount;
  const rowIdx = Math.floor(outerIdx / colCount) % OUTER_CROWD_ROWS_Y.length;

  const jitterX = (hashString(`${orderId}_jx`) % 29) - 14;
  const jitterY = (hashString(`${orderId}_jy`) % 17) - 8;

  const left = clampRange(OUTER_CROWD_COLS[colIdx] + jitterX, OUTER_CROWD_MIN_X, OUTER_CROWD_MAX_X);
  const top = clampRange(OUTER_CROWD_ROWS_Y[rowIdx] + jitterY, OUTER_CROWD_MIN_Y, OUTER_CROWD_MAX_Y);

  return {
    left,
    top,
    scale: FIXED_GUEST_SCALE,
    zIndex: 24 + Math.round((top - OUTER_CROWD_MIN_Y) / 2),
  };
}

const CENTER_PICKUP_COORD: FloorSlotCoord = {
  left: 360,
  top: 682,
  scale: ORDER_ZONE_SCALE,
  zIndex: 29,
};

function hashOrderStyle(orderId: string): number {
  let hash = 0;
  for (let i = 0; i < orderId.length; i += 1) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  return hash % 6;
}

function resolveBubblePositionClass(centerX: number): string {
  if (centerX < 180) {
    return 'top-[12px] -right-[42px]';
  }
  if (centerX > 540) {
    return 'top-[12px] -left-[42px]';
  }
  return centerX < 360 ? 'top-[18px] -left-[48px]' : 'top-[18px] -right-[48px]';
}

function findBubbleForGuest(
  bubbles: readonly GuestBubble[],
  order: DrinkOrder,
  queueIndex: number
): GuestBubble | undefined {
  const exact = bubbles.find((b) => b.userId === order.user.id);
  if (exact) return exact;
  return bubbles.find((b) => b.slotIndex === queueIndex);
}

const ChibiBackViewHair: React.FC<{ styleIdx: number }> = ({ styleIdx }) => {
  switch (styleIdx) {
    case 0:
      // Style 0: Soft rounded bob embracing nape + pastel pink hairclip bow
      return (
        <g>
          <path
            d="M16 34 C14 8, 82 8, 80 34 C82 52, 73 60, 62 60 L34 60 C23 60, 14 52, 16 34 Z"
            fill="#4B3227"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <path
            d="M28 20 Q48 14 68 20"
            fill="none"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <g transform="translate(48, 48)">
            <circle cx="0" cy="0" r="3" fill="#FCE7EE" stroke={OUTLINE_COLOR} strokeWidth="1.8" />
            <path
              d="M0 0 L-8 -5 C-10 -1, -8 4, 0 0 Z"
              fill="#F4A6BE"
              stroke={OUTLINE_COLOR}
              strokeWidth="1.8"
            />
            <path
              d="M0 0 L8 -5 C10 -1, 8 4, 0 0 Z"
              fill="#F4A6BE"
              stroke={OUTLINE_COLOR}
              strokeWidth="1.8"
            />
          </g>
        </g>
      );

    case 1:
      // Style 1: Neat short pixie/undercut with clean tapered nape & textured tips
      return (
        <g>
          <path
            d="M18 32 C16 9, 80 9, 78 32 C79 45, 71 50, 61 50 L35 50 C25 50, 17 45, 18 32 Z"
            fill="#3B2820"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <path
            d="M36 50 L40 55 L44 50 L48 56 L52 50 L56 55 L60 50"
            fill="#3B2820"
            stroke={OUTLINE_COLOR}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M28 20 Q48 15 68 20"
            fill="none"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );

    case 2:
      // Style 2: Cute twin buns with pastel yellow scrunchies & vertical part
      return (
        <g>
          <circle
            cx="18"
            cy="13"
            r="11.5"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <circle
            cx="78"
            cy="13"
            r="11.5"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <ellipse
            cx="20"
            cy="20"
            rx="7.5"
            ry="4"
            fill="#F7C95B"
            stroke={OUTLINE_COLOR}
            strokeWidth="2"
          />
          <ellipse
            cx="76"
            cy="20"
            rx="7.5"
            ry="4"
            fill="#F7C95B"
            stroke={OUTLINE_COLOR}
            strokeWidth="2"
          />
          <path
            d="M17 32 C17 9, 79 9, 79 32 C79 49, 70 54, 48 54 C26 54, 17 49, 17 32 Z"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <line
            x1="48"
            y1="20"
            x2="48"
            y2="50"
            stroke="rgba(59, 40, 32, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 24 Q32 18 42 22"
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M54 22 Q64 18 72 24"
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 3:
      // Style 3: Strawberry-cream beret + wavy hair fringe peeking beneath
      return (
        <g>
          <path
            d="M18 28 C15 40, 18 54, 28 54 C38 54, 40 48, 48 48 C56 48, 58 54, 68 54 C78 54, 81 40, 78 28"
            fill="#4A3528"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <ellipse
            cx="48"
            cy="16"
            rx="30"
            ry="13"
            fill="#FCE7EE"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <rect x="47" y="2" width="3" height="4.5" rx="1.5" fill="#3B2820" />
          <rect
            x="25"
            y="21"
            width="46"
            height="6.5"
            rx="3.25"
            fill="#F4A6BE"
            stroke={OUTLINE_COLOR}
            strokeWidth="2"
          />
        </g>
      );

    case 4:
      // Style 4: High flowing ponytail + pastel scrunchie
      return (
        <g>
          <ellipse
            cx="48"
            cy="30"
            rx="32"
            ry="27"
            fill="#3D261C"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <path
            d="M60 16 C82 10, 94 34, 79 51 C71 43, 69 31, 60 24 Z"
            fill="#3D261C"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <path
            d="M69 20 C79 24, 82 34, 78 43"
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="60"
            cy="18"
            r="6"
            fill="#F7C6D7"
            stroke={OUTLINE_COLOR}
            strokeWidth="2.2"
          />
          <path
            d="M54 16 L50 12 C48 14, 50 18, 54 18 Z"
            fill="#F4A6BE"
            stroke={OUTLINE_COLOR}
            strokeWidth="1.8"
          />
        </g>
      );

    case 5:
    default:
      // Style 5: Soft wavy shoulder-length hair flowing over back + mint headband
      return (
        <g>
          <path
            d="M16 28 C13 8, 83 8, 80 28 C84 46, 82 66, 73 66 C65 66, 62 58, 48 58 C34 58, 31 66, 23 66 C14 66, 12 46, 16 28 Z"
            fill="#52372A"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <path
            d="M30 36 Q34 50 28 62"
            fill="none"
            stroke="rgba(59, 40, 32, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M66 36 Q62 50 68 62"
            fill="none"
            stroke="rgba(59, 40, 32, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M21 17 C31 7, 65 7, 75 17"
            fill="none"
            stroke="#7FC8D9"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M21 17 C31 7, 65 7, 75 17"
            fill="none"
            stroke={OUTLINE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
  }
};

const StandingChibiSvg: React.FC<{
  shirtColor: string;
  bottomColor: string;
  styleIdx: number;
  isSignature: boolean;
  isHappy?: boolean;
  isReaching?: boolean;
  holdingCupColor?: string;
}> = ({
  shirtColor,
  bottomColor,
  styleIdx,
  isSignature,
  isHappy = false,
  isReaching = false,
  holdingCupColor,
}) => {
  return (
    <svg
      viewBox="0 0 96 104"
      className="w-[122px] h-[132px] overflow-visible shrink-0"
      aria-hidden="true"
    >
      {/* Floor shadow beneath feet */}
      <ellipse cx="48" cy="98" rx="27" ry="5.5" fill="rgba(59, 40, 32, 0.22)" />

      {/* Signature golden floor ring */}
      {isSignature && (
        <ellipse
          cx="48"
          cy="98"
          rx="33"
          ry="7.5"
          fill="rgba(247, 201, 91, 0.4)"
          stroke="#F4B83E"
          strokeWidth="1.8"
        />
      )}

      {/* Sneaker heels from behind (soft rounded counter + heel pull tabs) */}
      <rect
        x="35"
        y="82"
        width="10"
        height="12"
        rx="4"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <rect
        x="51"
        y="82"
        width="10"
        height="12"
        rx="4"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <ellipse
        cx="40"
        cy="94"
        rx="8"
        ry="4.5"
        fill="#FFF9FA"
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <rect x="38.5" y="89" width="3" height="4" rx="1.5" fill={OUTLINE_COLOR} />
      <ellipse
        cx="56"
        cy="94"
        rx="8"
        ry="4.5"
        fill="#FFF9FA"
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <rect x="54.5" y="89" width="3" height="4" rx="1.5" fill={OUTLINE_COLOR} />

      {/* Skirt / shorts viewed from behind */}
      <path
        d="M26 76 L70 76 L72 87 L24 87 Z"
        fill={bottomColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <path
        d="M32 79 Q36 83 40 79"
        fill="none"
        stroke="rgba(59, 40, 32, 0.3)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M56 79 Q60 83 64 79"
        fill="none"
        stroke="rgba(59, 40, 32, 0.3)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Pastel shirt torso viewed from back (width ~50px, rounded shoulders) */}
      <rect
        x="23"
        y="58"
        width="50"
        height="20"
        rx="9"
        fill={shirtColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Back neckline collar seam & subtle spine crease */}
      <path
        d="M36 58 Q48 62 60 58"
        fill="none"
        stroke={OUTLINE_COLOR}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="48"
        y1="62"
        x2="48"
        y2="76"
        stroke="rgba(59, 40, 32, 0.18)"
        strokeWidth="1.5"
      />

      {/* Snug short nape / neck connecting head and shirt */}
      <rect
        x="41"
        y="51"
        width="14"
        height="9"
        rx="3"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Left arm: angled forward towards bar counter */}
      <rect
        x="15"
        y="60"
        width="10"
        height="19"
        rx="5"
        transform="rotate(12 20 62)"
        fill={shirtColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <circle
        cx="18"
        cy="78"
        r="4.2"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth="2.2"
      />

      {/* Right arm: reaching eagerly before handoff, OR holding finished iced drink cup directly from shoulder to wrist */}
      {holdingCupColor ? (
        <g>
          {/* Sleeve connected seamlessly from right shoulder (65, 62) to wrist (79, 46) */}
          <line
            x1="65"
            y1="62"
            x2="79"
            y2="46"
            stroke={OUTLINE_COLOR}
            strokeWidth={10 + CHIBI_STROKE_WIDTH * 2}
            strokeLinecap="round"
          />
          <line
            x1="65"
            y1="62"
            x2="79"
            y2="46"
            stroke={shirtColor}
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Finished Iced Drink Cup centered cleanly inside customer's hand grip */}
          <g transform="translate(71, 24)">
            {/* Angled straw */}
            <line
              x1="11"
              y1="11"
              x2="9"
              y2="1.5"
              stroke={OUTLINE_COLOR}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <line
              x1="11"
              y1="11"
              x2="9"
              y2="1.5"
              stroke={holdingCupColor}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Tapered clear drink cup body filled with recipe color */}
            <path
              d="M4 13 L18 13 L16 32 L6 32 Z"
              fill={holdingCupColor}
              stroke={OUTLINE_COLOR}
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
            {/* Creamy foam cap layer at top */}
            <path
              d="M4.6 13.5 L17.4 13.5 L17.1 16.8 L4.9 16.8 Z"
              fill="#FFF9F2"
            />
            {/* Subtle glass shine */}
            <line
              x1="7"
              y1="16"
              x2="8"
              y2="29"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Dome lid & rim */}
            <path
              d="M4.5 12.5 A 6.5 6.5 0 0 1 17.5 12.5 Z"
              fill="#FFFDF9"
              fillOpacity="0.88"
              stroke={OUTLINE_COLOR}
              strokeWidth="1.8"
            />
            <rect
              x="3.5"
              y="11.5"
              width="15"
              height="2.4"
              rx="1.2"
              fill="#FFFDF9"
              stroke={OUTLINE_COLOR}
              strokeWidth="1.6"
            />
          </g>
          {/* Customer hand gripping side of cup at exact arm endpoint (79, 46) */}
          <circle
            cx="79"
            cy="46"
            r="4.4"
            fill={SKIN_COLOR}
            stroke={OUTLINE_COLOR}
            strokeWidth="2.1"
          />
        </g>
      ) : isReaching ? (
        <g>
          {/* Right arm reaching up toward counter rim while barista pushes drink forward */}
          <line
            x1="65"
            y1="62"
            x2="75"
            y2="49"
            stroke={OUTLINE_COLOR}
            strokeWidth={10 + CHIBI_STROKE_WIDTH * 2}
            strokeLinecap="round"
          />
          <line
            x1="65"
            y1="62"
            x2="75"
            y2="49"
            stroke={shirtColor}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle
            cx="75"
            cy="49"
            r="4.3"
            fill={SKIN_COLOR}
            stroke={OUTLINE_COLOR}
            strokeWidth="2.2"
          />
        </g>
      ) : (
        <g>
          <rect
            x="71"
            y="60"
            width="10"
            height="19"
            rx="5"
            transform="rotate(-12 76 62)"
            fill={shirtColor}
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <circle
            cx="78"
            cy="78"
            r="4.2"
            fill={SKIN_COLOR}
            stroke={OUTLINE_COLOR}
            strokeWidth="2.2"
          />
        </g>
      )}

      {/* Head & Back-View Hairstyle (Facing towards bar counter) */}
      <ChibiBackViewHair styleIdx={styleIdx} />

      {/* Celebration floating sparkles & hearts when happy / pickup */}
      {isHappy && (
        <g className="animate-pulse">
          {/* Heart on left */}
          <path
            d="M20 22 C17 18, 12 21, 15 25 L20 29 L25 25 C28 21, 23 18, 20 22 Z"
            fill="#F48BA3"
            stroke={OUTLINE_COLOR}
            strokeWidth="1.6"
          />
          {/* Star sparkle on right */}
          <path
            d="M78 17 L80 13 L82 17 L86 19 L82 21 L80 25 L78 21 L74 19 Z"
            fill="#F7C95B"
            stroke={OUTLINE_COLOR}
            strokeWidth="1.6"
          />
        </g>
      )}
    </svg>
  );
};

function extractAvatarInitials(nickname: string): string {
  const clean = nickname.replace(/\d+$/g, '').trim() || nickname.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'VIP';
}

const GuestHeadAvatarBadge: React.FC<{
  nickname: string;
  avatarUrl?: string;
  bgColor: string;
  isSignature: boolean;
}> = ({ nickname, avatarUrl, bgColor, isSignature }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl && failedUrl !== avatarUrl);
  const ringBorderColor = isSignature ? '#D99526' : OUTLINE_COLOR;

  return (
    <div
      className="absolute top-[16px] left-1/2 -translate-x-1/2 w-[50px] h-[50px] rounded-full overflow-hidden z-20 flex items-center justify-center shadow-[0_1.5px_0_rgba(59,40,32,0.28)]"
      style={{
        border: `2.4px solid ${ringBorderColor}`,
        backgroundColor: bgColor,
      }}
    >
      {showPhoto ? (
        <img
          src={avatarUrl}
          alt={nickname}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedUrl(avatarUrl ?? null)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-display font-bold text-[16px] tracking-tight text-[#3B2820] leading-none select-none">
          {extractAvatarInitials(nickname)}
        </span>
      )}
    </div>
  );
};

export const WaitingGuestsStrip: React.FC = () => {
  const language = useDrinkBarStore((s) => s.config.language);
  const vipQueue = useDrinkBarStore((s) => s.vipQueue);
  const normalQueue = useDrinkBarStore((s) => s.normalQueue);
  const guestBubbles = useDrinkBarStore((s) => s.guestBubbles);
  const guestLaneByOrderId = useDrinkBarStore((s) => s.guestLaneByOrderId);
  const celebratingByOrderId = useDrinkBarStore((s) => s.celebratingByOrderId);
  const departingGuests = useDrinkBarStore((s) => s.departingGuests);

  const allQueuedCount = vipQueue.length + normalQueue.length;
  const queued = [...vipQueue, ...normalQueue].slice(0, GAMEPLAY_LIMITS.MAX_GUEST_SLOTS);
  const overflowCount = Math.max(0, allQueuedCount - queued.length);
  if (queued.length === 0 && departingGuests.length === 0) {
    const msg = getMessages(language);
    return (
      <section
        className="absolute pointer-events-none z-20 flex items-center justify-center px-4"
        style={{
          top: EMPTY_LOBBY_MAT_METRICS.TOP_Y,
          left: EMPTY_LOBBY_MAT_METRICS.LEFT_X,
          width: EMPTY_LOBBY_MAT_METRICS.WIDTH,
          height: EMPTY_LOBBY_MAT_METRICS.HEIGHT,
        }}
        aria-label="Empty lobby order guide"
      >
        <div className="w-[624px] max-w-full rounded-[16px] bg-[#FFFDF9]/96 border-[2.2px] border-[#3B2820] px-4 py-2 shadow-[0_2.5px_0_#3B2820] text-center">
          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-black text-[#3B2820] tracking-tight">
            <Sparkles className="w-3.5 h-3.5 text-[#F48BA3]" strokeWidth={2.5} />
            <span>{msg.lobbyIdleTitle}</span>
            <Sparkles className="w-3.5 h-3.5 text-[#F7C95B]" strokeWidth={2.5} />
          </div>
          <p className="mt-0.5 text-[11px] font-bold text-[#7A5460] leading-snug">
            {msg.lobbyIdleDesc}
          </p>
        </div>
      </section>
    );
  }

  const laneRowCounts: [number, number] = [0, 0];
  const guests: (DisplayGuestSlot & { isHappy: boolean; holdingCupColor?: string })[] = queued.map(
    (order, idx) => {
      const fallbackLane: GuestLaneIndex = laneRowCounts[0] <= laneRowCounts[1] ? 0 : 1;
      const assigned = guestLaneByOrderId[order.orderId];
      const lane: GuestLaneIndex =
        assigned !== undefined && laneRowCounts[assigned] < MAX_PER_LANE
          ? assigned
          : fallbackLane;
      const baseRow = laneRowCounts[lane];
      laneRowCounts[lane] += 1;

      const styleIdx = hashOrderStyle(order.orderId);
      const bubble = findBubbleForGuest(guestBubbles, order, idx);
      const celeb = celebratingByOrderId[order.orderId];

      return {
        id: order.orderId,
        nickname: order.user.nickname,
        avatarUrl: order.user.avatarUrl,
        shirtColor: GUEST_SHIRT_COLORS[styleIdx % GUEST_SHIRT_COLORS.length],
        bottomColor: GUEST_BOTTOM_COLORS[styleIdx % GUEST_BOTTOM_COLORS.length],
        isVip: order.isVip,
        isSignature: order.isSignature,
        bubbleText: celeb?.text ?? bubble?.text,
        bubbleKey: celeb ? `celeb_${order.orderId}` : bubble ? `${bubble.id}` : undefined,
        styleIdx,
        lane,
        row: baseRow,
        isHeadOfQueue: idx === 0,
        isHappy: Boolean(celeb),
        holdingCupColor: celeb?.recipeColor,
      };
    }
  );

  return (
    <section
      className="absolute inset-0 pointer-events-none z-20"
      aria-label="Waiting guests standing dynamically on floor"
    >
      {/* Active queued customers: smoothly walk from outer crowd into counter order zone */}
      {guests.map((guest, idx) => {
        const coord = computeGuestFloorCoord(idx, guest.id);
        const bobClass =
          guest.isHeadOfQueue || guest.isHappy ? 'animate-guest-eager' : 'animate-guest-bob';

        return (
          <div
            key={guest.id}
            className="absolute w-[136px] transition-[left,top] duration-700 ease-out"
            style={{
              left: `${coord.left - 68}px`,
              top: `${coord.top}px`,
              zIndex: coord.zIndex,
            }}
          >
            <div className="w-full flex flex-col items-center animate-queue-enter-vertical">
              <div
                className="w-full flex flex-col items-center transition-transform duration-500 ease-in-out"
                style={{
                  transform: `scale(${coord.scale})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Auto-fading compact drink / VIP / celebration speech bubble clamped safely inside stage */}
                {guest.bubbleText && (
                  <div
                    key={guest.bubbleKey}
                    className={`absolute max-w-[116px] bg-[#FFFDF9] border-[2.2px] border-[#3B2820] rounded-[11px] px-2 py-[2.5px] shadow-[0_2px_0_#3B2820] animate-guest-bubble z-40 ${resolveBubblePositionClass(coord.left)}`}
                  >
                    <p className="text-[10px] font-black text-[#3B2820] leading-tight text-center truncate">
                      {guest.bubbleText}
                    </p>
                  </div>
                )}

                {/* Full-body standing chibi guest facing bar counter (~1.3x scale) */}
                <div
                  className={`relative flex flex-col items-center ${bobClass}`}
                  style={{ animationDelay: `${idx * 0.28}s` }}
                >
                  {guest.isVip && (
                    <span className="absolute -top-[6px] right-[12px] w-5 h-5 rounded-full bg-[#F7C95B] border-[2px] border-[#3B2820] flex items-center justify-center z-30 shadow-[0_1.5px_0_#3B2820]">
                      <Crown className="w-3 h-3 text-[#3B2820]" strokeWidth={2.8} />
                    </span>
                  )}

                  <StandingChibiSvg
                    shirtColor={guest.shirtColor}
                    bottomColor={guest.bottomColor}
                    styleIdx={guest.styleIdx}
                    isSignature={guest.isSignature}
                    isHappy={guest.isHappy}
                    holdingCupColor={guest.holdingCupColor}
                  />
                  <GuestHeadAvatarBadge
                    nickname={guest.nickname}
                    avatarUrl={guest.avatarUrl}
                    bgColor={guest.shirtColor}
                    isSignature={guest.isSignature}
                  />
                </div>

                {/* Compact Guest Name Tag beneath feet */}
                <div
                  className={`-mt-[6px] px-2.5 py-[2px] rounded-full border-[2px] border-[#3B2820] text-center shadow-[0_1.5px_0_#3B2820] max-w-[118px] ${
                    guest.isSignature ? 'bg-[#FFF1C2]' : 'bg-[#FFF9FA]'
                  }`}
                >
                  <span className="block text-[10.5px] font-black text-[#3B2820] truncate leading-none">
                    {guest.nickname}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Departing guests: wait empty-handed while cup slides (0..680ms) -> grab cup & celebrate -> step away with cup */}
      {departingGuests.map((dep) => {
        const coord = dep.isCenterPickup
          ? CENTER_PICKUP_COORD
          : computeGuestFloorCoord(dep.slotIndex, dep.order.orderId);
        const styleIdx = hashOrderStyle(dep.order.orderId);
        const shirtColor = GUEST_SHIRT_COLORS[styleIdx % GUEST_SHIRT_COLORS.length];
        const bottomColor = GUEST_BOTTOM_COLORS[styleIdx % GUEST_BOTTOM_COLORS.length];
        const isReaching = Boolean(dep.isCenterPickup && dep.phase === 'REACHING');
        const isExiting = dep.phase === 'EXITING';
        const exitShiftX = coord.left < 360 ? -96 : 96;

        return (
          <div
            key={`depart_${dep.order.orderId}`}
            className="absolute w-[136px] transition-all duration-500 ease-out"
            style={{
              left: `${coord.left - 68}px`,
              top: `${coord.top}px`,
              zIndex: coord.zIndex + 6,
              opacity: isExiting ? 0 : 1,
              transform: isExiting
                ? `translateX(${exitShiftX}px) translateY(12px) scale(${coord.scale * 0.92})`
                : `translateX(0px) translateY(0px) scale(${coord.scale})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="w-full flex flex-col items-center">
              {!isReaching && (
                <div
                  className={`absolute max-w-[120px] bg-[#FFFDF9] border-[2.2px] border-[#3B2820] rounded-[11px] px-2.5 py-[2.5px] shadow-[0_2px_0_#3B2820] animate-bubble-pop z-40 ${
                    dep.isCenterPickup ? 'top-[12px] -right-[58px]' : resolveBubblePositionClass(coord.left)
                  }`}
                >
                  <p className="text-[10px] font-black text-[#3B2820] leading-tight text-center truncate">
                    {dep.bubbleText}
                  </p>
                </div>
              )}

              <div className="relative flex flex-col items-center animate-guest-eager">
                {dep.order.isVip && (
                  <span className="absolute -top-[6px] right-[12px] w-5 h-5 rounded-full bg-[#F7C95B] border-[2px] border-[#3B2820] flex items-center justify-center z-30 shadow-[0_1.5px_0_#3B2820]">
                    <Crown className="w-3 h-3 text-[#3B2820]" strokeWidth={2.8} />
                  </span>
                )}

                <StandingChibiSvg
                  shirtColor={shirtColor}
                  bottomColor={bottomColor}
                  styleIdx={styleIdx}
                  isSignature={dep.order.isSignature}
                  isHappy={!isReaching}
                  isReaching={isReaching}
                  holdingCupColor={isReaching ? undefined : dep.recipeColor}
                />
                <GuestHeadAvatarBadge
                  nickname={dep.order.user.nickname}
                  avatarUrl={dep.order.user.avatarUrl}
                  bgColor={shirtColor}
                  isSignature={dep.order.isSignature}
                />
              </div>

              <div
                className={`-mt-[2px] px-2.5 py-[2px] rounded-full border-[2px] border-[#3B2820] text-center shadow-[0_1.5px_0_#3B2820] max-w-[112px] ${
                  dep.order.isSignature ? 'bg-[#FFF1C2]' : 'bg-[#FFF9FA]'
                }`}
              >
                <span className="block text-[10px] font-black text-[#3B2820] truncate leading-none">
                  {dep.order.user.nickname}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Overflow badge when burst exceeds 24 visible stage slots (safely above y=960) */}
      {overflowCount > 0 && (
        <div className="absolute top-[930px] right-[14px] px-2.5 py-0.5 rounded-full bg-[#FFF1C2] border-[2px] border-[#3B2820] shadow-[0_2px_0_#3B2820] text-[10.5px] font-black text-[#8A5200]">
          +{overflowCount}
        </div>
      )}
    </section>
  );
};

import React from 'react';
import { Crown } from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import type { DrinkOrder, GuestBubble } from '@shared/types';
import type { GuestLaneIndex } from '../store/drinkBarStore';
import { useDrinkBarStore } from '../store/drinkBarStore';

interface DisplayGuestSlot {
  id: string;
  nickname: string;
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
const MAX_PER_LANE = 2;

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

// Two vertical standing columns (~1.0x barista scale) in front/below bar counter (y: 722 -> 944)
// Keeps y: 960 -> 1280 completely open for TikTok LIVE chat.
const LANE_FLOOR_POSITIONS: Readonly<Record<GuestLaneIndex, readonly FloorSlotCoord[]>> = {
  0: [
    { left: 376, top: 722, scale: 1.0, zIndex: 21 },
    { left: 364, top: 838, scale: 0.93, zIndex: 23 },
  ],
  1: [
    { left: 564, top: 722, scale: 1.0, zIndex: 21 },
    { left: 576, top: 838, scale: 0.93, zIndex: 23 },
  ],
};

function hashOrderStyle(orderId: string): number {
  let hash = 0;
  for (let i = 0; i < orderId.length; i += 1) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  return hash % 6;
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

const ChibiSvgBackHair: React.FC<{ styleIdx: number }> = ({ styleIdx }) => {
  switch (styleIdx) {
    case 0:
      // Soft rounded bob back mass framing neck & shoulders
      return (
        <path
          d="M16 34 C14 10, 82 10, 80 34 L82 60 C77 64, 71 61, 69 54 L27 54 C25 61, 19 64, 14 60 Z"
          fill="#4B3227"
          stroke={OUTLINE_COLOR}
          strokeWidth={CHIBI_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      );
    case 2:
      // Twin cute buns on top left & right
      return (
        <g>
          <circle
            cx="21"
            cy="15"
            r="9.5"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <circle
            cx="75"
            cy="15"
            r="9.5"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <ellipse
            cx="48"
            cy="32"
            rx="32"
            ry="29"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
        </g>
      );
    case 4:
      // High flowing ponytail + pastel scrunchie
      return (
        <g>
          <path
            d="M68 18 C88 15, 91 45, 76 56 C71 48, 70 34, 64 26 Z"
            fill="#3D261C"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <ellipse
            cx="48"
            cy="32"
            rx="32"
            ry="29"
            fill="#3D261C"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <circle
            cx="69"
            cy="21"
            r="5.2"
            fill="#F7C6D7"
            stroke={OUTLINE_COLOR}
            strokeWidth="2.2"
          />
        </g>
      );
    case 5:
      // Soft wavy shoulder-length hair back mass
      return (
        <path
          d="M15 34 C14 8, 82 8, 81 34 C84 52, 81 66, 73 66 L23 66 C15 66, 12 52, 15 34 Z"
          fill="#52372A"
          stroke={OUTLINE_COLOR}
          strokeWidth={CHIBI_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      );
    case 1:
    case 3:
    default:
      return (
        <ellipse
          cx="48"
          cy="32"
          rx="32"
          ry="29"
          fill={styleIdx === 1 ? '#3B2820' : '#4A3528'}
          stroke={OUTLINE_COLOR}
          strokeWidth={CHIBI_STROKE_WIDTH}
        />
      );
  }
};

const ChibiSvgFrontHair: React.FC<{ styleIdx: number }> = ({ styleIdx }) => {
  switch (styleIdx) {
    case 0:
      // Neat blunt bangs + side tendrils + pastel pink hairclip
      return (
        <g>
          <path
            d="M19 31 C19 6, 77 6, 77 31 L76 46 C73 46, 72 34, 71 27 C62 22, 54 22, 48 25 C42 22, 34 22, 25 27 C24 34, 23 46, 20 46 Z"
            fill="#4B3227"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <rect
            x="58"
            y="14"
            width="12"
            height="6.5"
            rx="3.2"
            transform="rotate(14 64 17)"
            fill="#F4A6BE"
            stroke={OUTLINE_COLOR}
            strokeWidth="2.1"
          />
        </g>
      );
    case 1:
      // Neat side-parted short hair
      return (
        <path
          d="M19 31 C19 6, 77 6, 77 31 C68 20, 56 18, 46 25 C36 18, 26 21, 19 31 Z"
          fill="#3B2820"
          stroke={OUTLINE_COLOR}
          strokeWidth={CHIBI_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      );
    case 2:
      // Soft wispy bangs + golden star clip
      return (
        <g>
          <path
            d="M19 31 C20 6, 76 6, 77 31 C67 21, 56 20, 48 26 C40 20, 29 21, 19 31 Z"
            fill="#5C3D2E"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <circle
            cx="29"
            cy="18"
            r="4.5"
            fill="#F7C95B"
            stroke={OUTLINE_COLOR}
            strokeWidth="2.1"
          />
        </g>
      );
    case 3:
      // Layered fluffy fringe + pastel strawberry-cream beret
      return (
        <g>
          <path
            d="M19 31 C20 7, 76 7, 77 31 C67 22, 56 20, 48 27 C40 20, 29 22, 19 31 Z"
            fill="#4A3528"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <ellipse
            cx="47"
            cy="9"
            rx="21"
            ry="8"
            transform="rotate(-7 47 9)"
            fill="#FCE7EE"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
          />
          <rect
            x="29"
            y="11"
            width="36"
            height="5.5"
            rx="2.75"
            transform="rotate(-7 47 13)"
            fill="#F4A6BE"
            stroke={OUTLINE_COLOR}
            strokeWidth="2"
          />
        </g>
      );
    case 4:
      // Clean parted bangs for ponytail style
      return (
        <path
          d="M19 31 C20 6, 76 6, 77 31 C64 21, 32 21, 19 31 Z"
          fill="#3D261C"
          stroke={OUTLINE_COLOR}
          strokeWidth={CHIBI_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      );
    case 5:
    default:
      // Wavy hair + pastel mint-blue headband
      return (
        <g>
          <path
            d="M19 31 C19 6, 77 6, 77 31 C67 22, 56 20, 48 25 C40 20, 29 22, 19 31 Z"
            fill="#52372A"
            stroke={OUTLINE_COLOR}
            strokeWidth={CHIBI_STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <path
            d="M22 21 C31 9, 65 9, 74 21"
            fill="none"
            stroke="#7FC8D9"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M22 21 C31 9, 65 9, 74 21"
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
}> = ({ shirtColor, bottomColor, styleIdx, isSignature }) => {
  return (
    <svg
      viewBox="0 0 96 104"
      className="w-[96px] h-[102px] overflow-visible shrink-0"
      aria-hidden="true"
    >
      {/* Soft elliptical floor shadow beneath standing feet */}
      <ellipse cx="48" cy="99" rx="25" ry="5" fill="rgba(59, 40, 32, 0.2)" />

      {/* Subtle golden floor glow for Signature guest */}
      {isSignature && (
        <ellipse
          cx="48"
          cy="99"
          rx="29"
          ry="6.5"
          fill="rgba(247, 201, 91, 0.38)"
          stroke="#F4B83E"
          strokeWidth="1.8"
        />
      )}

      {/* Back hair behind head & shoulders */}
      <ChibiSvgBackHair styleIdx={styleIdx} />

      {/* Cute legs + rounded cream sneakers */}
      <rect
        x="35"
        y="86"
        width="9"
        height="11"
        rx="4"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <rect
        x="52"
        y="86"
        width="9"
        height="11"
        rx="4"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <ellipse
        cx="39"
        cy="97"
        rx="7.5"
        ry="4.2"
        fill="#FFF9FA"
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <ellipse
        cx="57"
        cy="97"
        rx="7.5"
        ry="4.2"
        fill="#FFF9FA"
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Rounded pastel arms resting beside body */}
      <rect
        x="17"
        y="65"
        width="10"
        height="18"
        rx="5"
        transform="rotate(14 22 67)"
        fill={shirtColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <rect
        x="69"
        y="65"
        width="10"
        height="18"
        rx="5"
        transform="rotate(-14 74 67)"
        fill={shirtColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />
      <circle
        cx="20"
        cy="82"
        r="4.2"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth="2.2"
      />
      <circle
        cx="76"
        cy="82"
        r="4.2"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth="2.2"
      />

      {/* Pastel skirt / shorts */}
      <path
        d="M28 79 L68 79 L70 90 L26 90 Z"
        fill={bottomColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
        strokeLinejoin="round"
      />

      {/* Pastel top shirt (matching barista torso width ~50-66px) */}
      <rect
        x="24"
        y="62"
        width="48"
        height="21"
        rx="9"
        fill={shirtColor}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Snug short neck (2.5px outline) cleanly joining chin & collar */}
      <rect
        x="40"
        y="56"
        width="16"
        height="9"
        rx="4"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Crisp cream collar accent */}
      <path
        d="M36 62 L48 68 L60 62 Z"
        fill="#FFFDF9"
        stroke={OUTLINE_COLOR}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />

      {/* Round Chibi Head (~60px face / ~70px with hair, matching 1.0x barista scale) */}
      <ellipse
        cx="48"
        cy="34"
        rx="29"
        ry="27"
        fill={SKIN_COLOR}
        stroke={OUTLINE_COLOR}
        strokeWidth={CHIBI_STROKE_WIDTH}
      />

      {/* Soft curved eyebrows */}
      <path
        d="M33 27 Q38 24.5 42 27"
        fill="none"
        stroke={OUTLINE_COLOR}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M54 27 Q58 24.5 63 27"
        fill="none"
        stroke={OUTLINE_COLOR}
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Expressive anime eyes with dual sparkle glints */}
      <ellipse cx="38" cy="35" rx="3.8" ry="4.3" fill={OUTLINE_COLOR} />
      <ellipse cx="58" cy="35" rx="3.8" ry="4.3" fill={OUTLINE_COLOR} />
      <circle cx="36.6" cy="33.5" r="1.5" fill="#FFFFFF" />
      <circle cx="56.6" cy="33.5" r="1.5" fill="#FFFFFF" />
      <circle cx="39.3" cy="36.8" r="0.85" fill="rgba(255,255,255,0.8)" />
      <circle cx="59.3" cy="36.8" r="0.85" fill="rgba(255,255,255,0.8)" />

      {/* Rosy pastel cheeks */}
      <ellipse cx="31" cy="41.5" rx="5.5" ry="3.2" fill={BLUSH_COLOR} opacity="0.52" />
      <ellipse cx="65" cy="41.5" rx="5.5" ry="3.2" fill={BLUSH_COLOR} opacity="0.52" />

      {/* Sweet smile */}
      <path
        d="M42.5 43.5 Q48 48.5 53.5 43.5"
        fill="none"
        stroke={OUTLINE_COLOR}
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      {/* Front hair & accessories */}
      <ChibiSvgFrontHair styleIdx={styleIdx} />
    </svg>
  );
};

export const WaitingGuestsStrip: React.FC = () => {
  const vipQueue = useDrinkBarStore((s) => s.vipQueue);
  const normalQueue = useDrinkBarStore((s) => s.normalQueue);
  const guestBubbles = useDrinkBarStore((s) => s.guestBubbles);
  const guestLaneByOrderId = useDrinkBarStore((s) => s.guestLaneByOrderId);

  const queued = [...vipQueue, ...normalQueue].slice(0, GAMEPLAY_LIMITS.MAX_GUEST_SLOTS);
  if (queued.length === 0) {
    return null;
  }

  const laneRowCounts: [number, number] = [0, 0];
  const guests: DisplayGuestSlot[] = queued.map((order, idx) => {
    const fallbackLane: GuestLaneIndex = laneRowCounts[0] <= laneRowCounts[1] ? 0 : 1;
    const assigned = guestLaneByOrderId[order.orderId];
    const lane: GuestLaneIndex =
      assigned !== undefined && laneRowCounts[assigned] < MAX_PER_LANE
        ? assigned
        : fallbackLane;
    const row = laneRowCounts[lane];
    laneRowCounts[lane] += 1;

    const styleIdx = hashOrderStyle(order.orderId);
    const bubble = findBubbleForGuest(guestBubbles, order, idx);

    return {
      id: order.orderId,
      nickname: order.user.nickname,
      shirtColor: GUEST_SHIRT_COLORS[styleIdx % GUEST_SHIRT_COLORS.length],
      bottomColor: GUEST_BOTTOM_COLORS[styleIdx % GUEST_BOTTOM_COLORS.length],
      isVip: order.isVip,
      isSignature: order.isSignature,
      bubbleText: bubble?.text,
      bubbleKey: bubble ? `${bubble.id}` : undefined,
      styleIdx,
      lane,
      row,
      isHeadOfQueue: idx === 0,
    };
  });

  return (
    <section
      className="absolute inset-0 pointer-events-none z-20"
      aria-label="Waiting guests standing in 2 vertical queues"
    >
      {guests.map((guest, idx) => {
        const lanePositions = LANE_FLOOR_POSITIONS[guest.lane];
        const coord = lanePositions[guest.row] ?? lanePositions[lanePositions.length - 1];
        const bobClass = guest.isHeadOfQueue ? 'animate-guest-eager' : 'animate-guest-bob';

        return (
          <div
            key={guest.id}
            className="absolute w-[108px] transition-all duration-300 ease-out"
            style={{
              left: `${coord.left - 54}px`,
              top: `${coord.top}px`,
              zIndex: coord.zIndex,
            }}
          >
            <div className="w-full flex flex-col items-center animate-queue-enter-vertical">
              <div
                className="w-full flex flex-col items-center transition-transform duration-300 ease-out"
                style={{
                  transform: `scale(${coord.scale})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Auto-fading compact drink / VIP speech bubble above head */}
                {guest.bubbleText && (
                  <div
                    key={guest.bubbleKey}
                    className="absolute -top-[22px] left-1/2 -translate-x-1/2 max-w-[118px] bg-[#FFF9FA] border-[2.2px] border-[#3B2820] rounded-[11px] px-2 py-[2px] shadow-[0_2px_0_#3B2820] animate-guest-bubble z-40"
                  >
                    <p className="text-[9.5px] font-extrabold text-[#3B2820] leading-tight text-center truncate">
                      {guest.bubbleText}
                    </p>
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-[4.5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFF9FA] border-r-[2.2px] border-b-[2.2px] border-[#3B2820] rotate-45"
                    />
                  </div>
                )}

                {/* Full-body standing chibi guest (~1.0x barista scale) */}
                <div
                  className={`relative flex flex-col items-center ${bobClass}`}
                  style={{ animationDelay: `${idx * 0.28}s` }}
                >
                  {guest.isVip && (
                    <span className="absolute -top-[4px] right-[8px] w-5 h-5 rounded-full bg-[#F7C95B] border-[2px] border-[#3B2820] flex items-center justify-center z-30 shadow-[0_1.5px_0_#3B2820]">
                      <Crown className="w-3 h-3 text-[#3B2820]" strokeWidth={2.8} />
                    </span>
                  )}

                  <StandingChibiSvg
                    shirtColor={guest.shirtColor}
                    bottomColor={guest.bottomColor}
                    styleIdx={guest.styleIdx}
                    isSignature={guest.isSignature}
                  />
                </div>

                {/* Compact Guest Name Tag beneath feet */}
                <div
                  className={`-mt-[2px] px-2.5 py-[2px] rounded-full border-[2px] border-[#3B2820] text-center shadow-[0_1.5px_0_#3B2820] max-w-[100px] ${
                    guest.isSignature ? 'bg-[#FFF1C2]' : 'bg-[#FFF9FA]'
                  }`}
                >
                  <span className="block text-[9.5px] font-black text-[#3B2820] truncate leading-none">
                    {guest.nickname}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

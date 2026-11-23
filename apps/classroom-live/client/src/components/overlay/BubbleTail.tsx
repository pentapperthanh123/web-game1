import React from 'react';
import { SPEECH_BUBBLE_LAYOUT } from '../../constants/stageLayout';
import type { BubbleTailSide } from './speechBubblePlacement';

const { TAIL_LENGTH, TAIL_HALF_BASE, BORDER_WIDTH, FILL_COLOR, BORDER_COLOR } = SPEECH_BUBBLE_LAYOUT;
const BASE = TAIL_HALF_BASE * 2;
/** Phần đáy tam giác chồng lên viền bong bóng để phủ trắng đoạn viền tại chỗ nối. */
const DEPTH = TAIL_LENGTH + BORDER_WIDTH;
const HALF_STROKE = BORDER_WIDTH / 2;

interface TailGeometry {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  style: (offset: number) => React.CSSProperties;
}

/**
 * Tam giác SVG đặt sát mép trong của viền (containing block = padding box):
 * nền trắng phủ đoạn viền chỗ nối, 2 cạnh xiên có nét viền nối liền với viền bong bóng.
 * `offset` tính từ mép ngoài bong bóng (border box) nên trừ BORDER_WIDTH khi đặt.
 */
const TAIL_GEOMETRY: Record<BubbleTailSide, TailGeometry> = {
  bottom: {
    width: BASE,
    height: DEPTH,
    fill: `0,0 ${BASE},0 ${TAIL_HALF_BASE},${DEPTH}`,
    stroke: `0,${HALF_STROKE} ${TAIL_HALF_BASE},${DEPTH - HALF_STROKE} ${BASE},${HALF_STROKE}`,
    style: (offset) => ({ top: '100%', left: offset - BORDER_WIDTH - TAIL_HALF_BASE }),
  },
  left: {
    width: DEPTH,
    height: BASE,
    fill: `${DEPTH},0 ${DEPTH},${BASE} 0,${TAIL_HALF_BASE}`,
    stroke: `${DEPTH - HALF_STROKE},0 ${HALF_STROKE},${TAIL_HALF_BASE} ${DEPTH - HALF_STROKE},${BASE}`,
    style: (offset) => ({ right: '100%', top: offset - BORDER_WIDTH - TAIL_HALF_BASE }),
  },
  right: {
    width: DEPTH,
    height: BASE,
    fill: `0,0 0,${BASE} ${DEPTH},${TAIL_HALF_BASE}`,
    stroke: `${HALF_STROKE},0 ${DEPTH - HALF_STROKE},${TAIL_HALF_BASE} ${HALF_STROKE},${BASE}`,
    style: (offset) => ({ left: '100%', top: offset - BORDER_WIDTH - TAIL_HALF_BASE }),
  },
};

/** Mũi nhọn bong bóng thoại trỏ về phía cô giáo. */
export const BubbleTail: React.FC<{ side: BubbleTailSide; offset: number }> = ({ side, offset }) => {
  const geometry = TAIL_GEOMETRY[side];
  return (
    <svg
      aria-hidden
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className="absolute overflow-visible pointer-events-none"
      style={geometry.style(offset)}
    >
      <polygon points={geometry.fill} fill={FILL_COLOR} />
      <polyline
        points={geometry.stroke}
        fill="none"
        stroke={BORDER_COLOR}
        strokeWidth={BORDER_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default BubbleTail;

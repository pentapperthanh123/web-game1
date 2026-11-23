import React from 'react';
import { DESK_GRID, STAGE_ASSETS } from '../../constants/stageLayout';
import { useAssetAvailable } from '../../services/assetProbe';

/** Bàn gỗ nhìn từ phía sau lớp (vector sạch) — dùng khi chưa có `desk.png`. */
const DeskFallbackSVG: React.FC<{ hasStudent: boolean }> = ({ hasStudent }) => (
  <svg viewBox="0 0 80 44" className="w-full h-full">
    <ellipse cx="40" cy="41" rx="36" ry="3" fill="rgba(60,25,0,0.22)" />
    <path d="M8 18 L8 40" stroke="#5a2908" strokeWidth="3" strokeLinecap="round" />
    <path d="M72 18 L72 40" stroke="#5a2908" strokeWidth="3" strokeLinecap="round" />
    <polygon points="4,4 76,4 73,16 7,16" fill="#e8963f" stroke="#7c3407" strokeWidth="1.2" />
    <line x1="6" y1="5.5" x2="74" y2="5.5" stroke="#fde68a" strokeWidth="1" opacity="0.8" />
    <rect x="7" y="16" width="66" height="10" rx="1.5" fill="#8d4007" stroke="#5a2404" strokeWidth="1" />
    <rect x="13" y="18.5" width="54" height="5" rx="1" fill="#3d1702" />
    {hasStudent && (
      <g>
        <polygon points="28,6 46,6 45,13 27,13" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
        <line x1="37" y1="6" x2="36.5" y2="13" stroke="#94a3b8" strokeWidth="0.5" />
        <line x1="50" y1="7" x2="57" y2="11" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    )}
  </svg>
);

const ChairBack: React.FC = () => (
  <div
    className="absolute left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-b from-[#d97706] to-[#8d3a04] border border-[#5a2404]"
    style={{ top: DESK_GRID.CHAIR_TOP, width: DESK_GRID.CHAIR_WIDTH, height: DESK_GRID.CHAIR_HEIGHT }}
  />
);

/** Mặt bàn + lưng ghế trong một ô 112x113. */
export const DeskSurface: React.FC<{ hasStudent: boolean }> = ({ hasStudent }) => {
  const hasDeskImage = useAssetAvailable(STAGE_ASSETS.DESK);

  return (
    <>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: DESK_GRID.DESK_TOP_OFFSET, width: DESK_GRID.DESK_WIDTH, height: DESK_GRID.DESK_HEIGHT }}
      >
        {hasDeskImage ? (
          <img src={STAGE_ASSETS.DESK} alt="" draggable={false} className="w-full h-full object-contain" />
        ) : (
          <DeskFallbackSVG hasStudent={hasStudent} />
        )}
      </div>
      <ChairBack />
    </>
  );
};

export default DeskSurface;

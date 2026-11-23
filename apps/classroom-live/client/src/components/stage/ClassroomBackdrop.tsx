import React from 'react';
import {
  HALLWAY_LAYOUT,
  PODIUM_LAYOUT,
  STAGE_ASSETS,
  STAGE_SIZE,
  STAGE_ZONES,
} from '../../constants/stageLayout';
import { useAssetAvailable } from '../../services/assetProbe';

const WALL_BOTTOM = STAGE_ZONES.PODIUM.TOP;
const BASEBOARD_HEIGHT = 8;
const HALLWAY_WALL_WIDTH = 6;
const FLOOR_TOP = PODIUM_LAYOUT.BOTTOM;

const WALL_STYLE: React.CSSProperties = {
  height: WALL_BOTTOM,
  background:
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 36px), linear-gradient(180deg, #fdf0d8 0%, #f6dcb0 70%, #eccb94 100%)',
};

const BACK_FLOOR_STYLE: React.CSSProperties = {
  top: WALL_BOTTOM,
  height: FLOOR_TOP - WALL_BOTTOM,
  background: 'linear-gradient(180deg, #c98845 0%, #d99654 100%)',
};

const PODIUM_TOP_STYLE: React.CSSProperties = {
  left: PODIUM_LAYOUT.LEFT,
  width: PODIUM_LAYOUT.RIGHT - PODIUM_LAYOUT.LEFT,
  top: PODIUM_LAYOUT.PLATFORM_TOP,
  height: PODIUM_LAYOUT.PLATFORM_FRONT_TOP - PODIUM_LAYOUT.PLATFORM_TOP,
  background:
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 60px), linear-gradient(180deg, #b8692b 0%, #a75c22 100%)',
  borderRadius: '10px 10px 0 0',
};

const PODIUM_FRONT_STYLE: React.CSSProperties = {
  left: PODIUM_LAYOUT.LEFT,
  width: PODIUM_LAYOUT.RIGHT - PODIUM_LAYOUT.LEFT,
  top: PODIUM_LAYOUT.PLATFORM_FRONT_TOP,
  height: PODIUM_LAYOUT.BOTTOM - PODIUM_LAYOUT.PLATFORM_FRONT_TOP,
  background: 'linear-gradient(180deg, #6e3510 0%, #4e240a 100%)',
};

const FLOOR_STYLE: React.CSSProperties = {
  top: FLOOR_TOP,
  height: STAGE_SIZE.HEIGHT - FLOOR_TOP,
  background:
    'repeating-linear-gradient(90deg, rgba(120,60,15,0.22) 0 2px, transparent 2px 56px), repeating-linear-gradient(180deg, rgba(120,60,15,0.12) 0 1px, transparent 1px 113px), linear-gradient(180deg, #eaa762 0%, #e29a52 100%)',
};

const HALLWAY_FLOOR_BACKGROUND =
  'repeating-conic-gradient(#e7e1d4 0 25%, #d6cdbb 0 50%) 0 0 / 24px 24px';

const SAFE_AREA_STYLE: React.CSSProperties = {
  top: STAGE_ZONES.SAFE_BOTTOM.TOP,
  height: STAGE_ZONES.SAFE_BOTTOM.BOTTOM - STAGE_ZONES.SAFE_BOTTOM.TOP,
  background: 'linear-gradient(180deg, rgba(40,18,4,0) 0%, rgba(40,18,4,0.28) 100%)',
};

const HallwayStrip: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const isLeft = side === 'left';
  return (
    <>
      <div
        className="absolute"
        style={{
          [side]: 0,
          top: FLOOR_TOP,
          width: HALLWAY_LAYOUT.WIDTH,
          height: STAGE_SIZE.HEIGHT - FLOOR_TOP,
          background: HALLWAY_FLOOR_BACKGROUND,
        }}
      />
      <div
        className="absolute"
        style={{
          left: isLeft ? HALLWAY_LAYOUT.WIDTH : STAGE_SIZE.WIDTH - HALLWAY_LAYOUT.WIDTH - HALLWAY_WALL_WIDTH,
          top: FLOOR_TOP,
          width: HALLWAY_WALL_WIDTH,
          height: STAGE_SIZE.HEIGHT - FLOOR_TOP,
          background: 'linear-gradient(90deg, #8a4b1c, #5c2d0c)',
        }}
      />
    </>
  );
};

/** Layer 0: phòng học trống. Không chứa học sinh, bàn ghế hay chữ — mọi thứ động nằm ở các layer trên. */
export const ClassroomBackdrop: React.FC = () => {
  const hasBackgroundImage = useAssetAvailable(STAGE_ASSETS.BACKGROUND);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-x-0 top-0" style={WALL_STYLE} />
      <div
        className="absolute inset-x-0"
        style={{ top: WALL_BOTTOM - BASEBOARD_HEIGHT, height: BASEBOARD_HEIGHT, background: '#8a4b1c' }}
      />
      <div className="absolute inset-x-0" style={BACK_FLOOR_STYLE} />
      <div className="absolute inset-x-0" style={FLOOR_STYLE} />
      <HallwayStrip side="left" />
      <HallwayStrip side="right" />
      <div className="absolute shadow-[0_6px_10px_rgba(0,0,0,0.25)]" style={PODIUM_TOP_STYLE} />
      <div className="absolute" style={PODIUM_FRONT_STYLE} />
      <div className="absolute inset-x-0" style={SAFE_AREA_STYLE} />

      {hasBackgroundImage && (
        <img
          src={STAGE_ASSETS.BACKGROUND}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default ClassroomBackdrop;

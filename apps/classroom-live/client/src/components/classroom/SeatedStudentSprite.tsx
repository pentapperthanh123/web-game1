import React from 'react';
import { DESK_GRID } from '../../constants/stageLayout';
import {
  DEFAULT_BOY_VARIANT,
  DEFAULT_GIRL_VARIANT,
  StudentVariant,
  getStudentSpriteSrc,
} from '../../constants/studentVariants';
import { STAGE_TEXT } from '../../constants/stageText';
import { useAssetAvailable } from '../../services/assetProbe';

const SPRITE_WIDTH = Math.round(DESK_GRID.SEATED_SPRITE_HEIGHT * DESK_GRID.SEATED_SPRITE_ASPECT);

/**
 * Ảnh ngồi bàn của kiểu nhân vật. Thiếu ảnh của kiểu đó thì dùng kiểu mặc định cùng giới tính;
 * thiếu cả hai trả về null để bàn dùng bản vẽ CSS.
 */
export const useSeatedSpriteSrc = (variant: StudentVariant): string | null => {
  const preferredSrc = getStudentSpriteSrc(variant);
  const fallbackSrc = getStudentSpriteSrc(variant.isGirl ? DEFAULT_GIRL_VARIANT : DEFAULT_BOY_VARIANT);
  const hasPreferred = useAssetAvailable(preferredSrc);
  const hasFallback = useAssetAvailable(fallbackSrc);

  if (hasPreferred) return preferredSrc;
  if (hasFallback) return fallbackSrc;
  return null;
};

/** Ảnh học sinh ngồi bàn (12 kiểu tóc / màu da / áo) ở vùng y 38..113 của ô — không có gì đè lên. */
export const SeatedStudentSprite: React.FC<{ spriteSrc: string }> = ({ spriteSrc }) => (
  <img
    src={spriteSrc}
    alt={STAGE_TEXT.STUDENT_ALT}
    draggable={false}
    className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_3px_3px_rgba(60,25,0,0.25)] animate-sit-bounce"
    style={{ top: DESK_GRID.SEATED_SPRITE_TOP, width: SPRITE_WIDTH, height: DESK_GRID.SEATED_SPRITE_HEIGHT }}
  />
);

export default SeatedStudentSprite;

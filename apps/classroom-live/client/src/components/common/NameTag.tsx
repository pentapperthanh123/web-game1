import React from 'react';
import { fitFontSize } from '../../utils/fitFontSize';

const HORIZONTAL_PADDING_PX = 6;
const BORDER_PX = 1;
const SINGLE_LINE_HEIGHT_RATIO = 1.3;
const MULTI_LINE_HEIGHT_RATIO = 1.2;
/** Chân chữ / dấu tiếng Việt cao hơn line-height 1px; đệm thêm để line-clamp không xén mép dưới. */
const DIACRITIC_SAFE_PADDING_PX = 1;

interface NameTagProps {
  name: string;
  maxWidth: number;
  maxFont: number;
  minFont: number;
  /** Số dòng tối đa (mặc định 1). Cột hẹp như hành lang dùng 2 dòng để hiện đủ tên. */
  maxLines?: number;
  className?: string;
  style?: React.CSSProperties;
}

const BASE_CLASS =
  'bg-white text-[#2b1404] border border-[#8a4b1c] font-extrabold shadow-[0_1px_3px_rgba(0,0,0,0.35)] text-center';

/**
 * Thẻ tên tương phản cao: tự giảm cỡ chữ để hiện đủ tên, chỉ cắt "…" khi đã ở cỡ nhỏ nhất.
 * `title` giữ tên đầy đủ để dễ kiểm tra.
 */
export const NameTag: React.FC<NameTagProps> = ({ name, maxWidth, maxFont, minFont, maxLines = 1, className = '', style }) => {
  const textWidth = maxWidth - 2 * (HORIZONTAL_PADDING_PX + BORDER_PX);
  const fontSize = fitFontSize(name, textWidth * maxLines, maxFont, minFont);
  const isMultiLine = maxLines > 1;
  const lineHeightRatio = isMultiLine ? MULTI_LINE_HEIGHT_RATIO : SINGLE_LINE_HEIGHT_RATIO;

  const lineStyle: React.CSSProperties = isMultiLine
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: maxLines,
        overflow: 'hidden',
        overflowWrap: 'anywhere',
        whiteSpace: 'normal',
        paddingBottom: DIACRITIC_SAFE_PADDING_PX,
      }
    : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  return (
    <div
      title={name}
      className={`${BASE_CLASS} ${isMultiLine ? 'rounded-md' : 'rounded-full'} ${className}`}
      style={{
        ...style,
        ...lineStyle,
        /* max-content: phần tử định vị tuyệt đối (left 50%) không bị bóp còn nửa khối cha */
        width: 'max-content',
        maxWidth,
        fontSize,
        lineHeight: `${Math.round(fontSize * lineHeightRatio)}px`,
        paddingLeft: HORIZONTAL_PADDING_PX,
        paddingRight: HORIZONTAL_PADDING_PX,
      }}
    >
      {name}
    </div>
  );
};

export default NameTag;

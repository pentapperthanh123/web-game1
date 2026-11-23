import React from 'react';
import { STAGE_ASSETS } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { useAssetAvailable } from '../../services/assetProbe';

/** Cô giáo áo dài vẽ bằng SVG — dùng khi chưa có `teacher.png`. */
const TeacherFallbackSVG: React.FC = () => (
  <svg viewBox="0 0 52 95" className="w-full h-full" aria-label={STAGE_TEXT.TEACHER_ALT}>
    <ellipse cx="26" cy="92" rx="16" ry="3" fill="rgba(40,15,0,0.25)" />
    <path d="M14 22 C10 40 12 56 14 62 L38 62 C40 56 42 40 38 22 Z" fill="#1b1410" />
    <rect x="19" y="64" width="6" height="24" rx="2" fill="#ffffff" />
    <rect x="27" y="64" width="6" height="24" rx="2" fill="#ffffff" />
    <ellipse cx="22" cy="89" rx="4" ry="2" fill="#111" />
    <ellipse cx="30" cy="89" rx="4" ry="2" fill="#111" />
    <path d="M17 30 L35 30 L39 76 L13 76 Z" fill="#8fc9ef" stroke="#4f8fbf" strokeWidth="1" />
    <path d="M22 30 L30 30 L29 36 L23 36 Z" fill="#6fb2e0" />
    <path d="M35 33 L42 46 L39 48 L33 38 Z" fill="#8fc9ef" stroke="#4f8fbf" strokeWidth="0.8" />
    <path d="M17 33 L10 46 L13 48 L19 38 Z" fill="#8fc9ef" stroke="#4f8fbf" strokeWidth="0.8" />
    <circle cx="26" cy="17" r="10" fill="#ffe2cc" />
    <path d="M15 16 C15 5 37 5 37 16 C33 11 20 11 15 16 Z" fill="#1b1410" />
    <circle cx="22.5" cy="18" r="1.3" fill="#2b2b2b" />
    <circle cx="29.5" cy="18" r="1.3" fill="#2b2b2b" />
    <path d="M23.5 22 Q26 24 28.5 22" stroke="#d26d6d" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
);

export const TeacherSprite: React.FC = () => {
  const hasTeacherImage = useAssetAvailable(STAGE_ASSETS.TEACHER);
  if (!hasTeacherImage) return <TeacherFallbackSVG />;

  return (
    <img
      src={STAGE_ASSETS.TEACHER}
      alt={STAGE_TEXT.TEACHER_ALT}
      draggable={false}
      className="w-full h-full object-contain object-bottom drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)]"
    />
  );
};

export default TeacherSprite;

import React from 'react';
import { TEACHER_DESK_LAYOUT } from '../../constants/stageLayout';
import { getDepthZ } from '../../constants/classroomCoordinates';

/** Bàn giáo viên vector (khung 136x80: 28px đồ vật phía trên + 52px thân bàn). */
const TeacherDeskSVG: React.FC = () => (
  <svg viewBox="0 0 136 80" className="w-full h-full overflow-visible">
    <defs>
      <linearGradient id="teacherDeskTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c9773a" />
        <stop offset="100%" stopColor="#a65a24" />
      </linearGradient>
      <linearGradient id="teacherDeskFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7a3a12" />
        <stop offset="100%" stopColor="#4e230a" />
      </linearGradient>
    </defs>

    {/* Bóng đổ trên bục */}
    <ellipse cx="68" cy="78" rx="64" ry="3" fill="rgba(30,10,0,0.3)" />

    {/* Thân bàn: mặt trước + 2 hộc kéo */}
    <rect x="6" y="38" width="124" height="40" rx="3" fill="url(#teacherDeskFront)" stroke="#3a1906" strokeWidth="1" />
    <rect x="12" y="44" width="32" height="12" rx="2" fill="#8d4a1c" stroke="#3a1906" strokeWidth="0.8" />
    <rect x="92" y="44" width="32" height="12" rx="2" fill="#8d4a1c" stroke="#3a1906" strokeWidth="0.8" />
    <circle cx="28" cy="50" r="1.6" fill="#f5c26b" />
    <circle cx="108" cy="50" r="1.6" fill="#f5c26b" />

    {/* Mặt bàn vát phối cảnh */}
    <polygon points="2,28 134,28 130,38 6,38" fill="url(#teacherDeskTop)" stroke="#5c2d0c" strokeWidth="1" />
    <line x1="4" y1="29.5" x2="132" y2="29.5" stroke="#f4c58a" strokeWidth="1" opacity="0.8" />

    {/* Khăn trải bàn xanh viền ren rủ xuống mặt trước */}
    <polygon points="46,28 90,28 92,62 44,62" fill="#3b82c4" stroke="#1e4f80" strokeWidth="0.8" />
    <path
      d="M44 62 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    {/* Chồng sách + sổ đầu bài đỏ */}
    <rect x="14" y="22" width="28" height="6" rx="1" fill="#2563eb" stroke="#1e3a8a" strokeWidth="0.6" />
    <rect x="16" y="17" width="25" height="5" rx="1" fill="#16a34a" stroke="#14532d" strokeWidth="0.6" />
    <rect x="13" y="12" width="27" height="5" rx="1" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.6" />
    <rect x="15" y="13.5" width="10" height="2" fill="#fde68a" />

    {/* Hộp phấn trắng */}
    <rect x="58" y="20" width="18" height="8" rx="1.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
    <rect x="61" y="17" width="3" height="4" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
    <rect x="66" y="16" width="3" height="5" rx="1" fill="#fca5a5" stroke="#f87171" strokeWidth="0.5" />

    {/* Lọ hoa */}
    <path d="M100 28 C96 22 98 16 104 15 C110 16 112 22 108 28 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.8" />
    <path d="M104 15 L101 5 M104 15 L104 3 M104 15 L108 6" stroke="#15803d" strokeWidth="1.2" />
    <circle cx="101" cy="5" r="3" fill="#f43f5e" />
    <circle cx="104" cy="2.5" r="3" fill="#facc15" />
    <circle cx="108" cy="6" r="3" fill="#ec4899" />
  </svg>
);

/** Layer 2 — Bàn giáo viên trên bục giảng, sắp z theo y chân bàn để đứng trước cô giáo. */
export const TeacherDesk: React.FC = () => (
  <div
    className="absolute pointer-events-none select-none"
    style={{
      left: TEACHER_DESK_LAYOUT.CENTER_X - TEACHER_DESK_LAYOUT.WIDTH / 2,
      top: TEACHER_DESK_LAYOUT.TOP,
      width: TEACHER_DESK_LAYOUT.WIDTH,
      height: TEACHER_DESK_LAYOUT.HEIGHT,
      zIndex: getDepthZ(TEACHER_DESK_LAYOUT.DEPTH_Y),
    }}
  >
    <TeacherDeskSVG />
  </div>
);

export default TeacherDesk;

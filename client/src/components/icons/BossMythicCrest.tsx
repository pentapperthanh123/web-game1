import React from 'react';
import { GAME_THEME, BossThemeConfig } from '../../constants/game';
import { TeamColorPalette } from '../../types/team';

export type CrestSize = 'sm' | 'md' | 'lg' | 'xl';

interface BossMythicCrestProps {
  themeConfig: BossThemeConfig;
  teamTheme?: TeamColorPalette;
  size?: CrestSize;
  className?: string;
}

const SIZE_MAP: Record<CrestSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-20 h-20 sm:w-24 sm:h-24',
  xl: 'w-28 h-28 sm:w-32 sm:h-32',
};

const DEFAULT_PRIMARY = '#ec4899';
const DEFAULT_SECONDARY = '#a855f7';

/**
 * 1. Sứ Giả Khe Nứt (Rift Herald) - Eye of the Herald (Mắt Sứ Giả)
 * Vector SVG đa lớp chi tiết chuẩn LMHT:
 * - Cặp sừng mai giáp Hư Không uốn lượn sắc nhọn với viền ánh kim
 * - Tấm khiên giáp chitin đa giác phân tầng
 * - Con mắt Hư Không trung tâm phát quang đa sắc với đồng tử xẻ dọc và tinh cầu ánh sáng
 */
const HeraldMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_16px_rgba(236,72,153,0.9)]">
    <defs>
      <linearGradient id="heraldChitinOuter" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="35%" stopColor="#d946ef" />
        <stop offset="70%" stopColor="#7e22ce" />
        <stop offset="100%" stopColor="#2e1065" />
      </linearGradient>

      <linearGradient id="heraldHornRim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#fbcfe8" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>

      <radialGradient id="heraldEyeCore" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#f43f5e" />
        <stop offset="55%" stopColor="#c026d3" />
        <stop offset="85%" stopColor="#581c87" />
        <stop offset="100%" stopColor="#090514" />
      </radialGradient>

      <filter id="heraldGlowLayer">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Outer Floating Void Energy Spikes */}
    <g opacity="0.85">
      <polygon points="60,4 66,20 54,20" fill="#ffffff" />
      <polygon points="18,18 30,28 20,34" fill={primary} />
      <polygon points="102,18 100,34 90,28" fill={primary} />
      <polygon points="10,60 24,56 22,66" fill={secondary} />
      <polygon points="110,60 98,66 96,56" fill={secondary} />
      <polygon points="60,114 54,102 66,102" fill="#ffffff" />
    </g>

    {/* Primary Chitin Horns & Shell Body */}
    <path
      d="M60,14 L76,30 L104,22 L96,54 L106,78 L80,72 L60,104 L40,72 L14,78 L24,54 L16,22 L44,30 Z"
      fill="url(#heraldChitinOuter)"
      stroke={primary}
      strokeWidth="3"
      strokeLinejoin="round"
    />

    {/* Sweeping Upper Horn Edges */}
    <path
      d="M44,30 Q60,8 76,30 Q60,18 44,30 Z"
      fill="url(#heraldHornRim)"
      stroke="#ffffff"
      strokeWidth="1.5"
    />

    {/* Segmented Mandibles & Side Carapace Plates */}
    <polygon points="24,54 40,48 48,60 30,68" fill="#3b0764" stroke="#f43f5e" strokeWidth="1.8" />
    <polygon points="96,54 90,68 72,60 80,48" fill="#3b0764" stroke="#f43f5e" strokeWidth="1.8" />

    {/* Central Runic Eye Socket Frame */}
    <ellipse
      cx="60"
      cy="54"
      rx="28"
      ry="19"
      fill="#05020a"
      stroke={secondary}
      strokeWidth="3.2"
      filter="url(#heraldGlowLayer)"
    />

    {/* Glowing Eye of the Void */}
    <ellipse cx="60" cy="54" rx="23" ry="14" fill="url(#heraldEyeCore)" />

    {/* Luminous Inner Eye Rings */}
    <ellipse cx="60" cy="54" rx="14" ry="8" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.6" />

    {/* Vertical Slit Pupil with Star Core */}
    <path
      d="M60,42 Q65,54 60,66 Q55,54 60,42 Z"
      fill="#ffffff"
      filter="url(#heraldGlowLayer)"
    />
    <circle cx="60" cy="54" r="3" fill="#ffffff" />

    {/* Bottom Pincer Fang */}
    <path
      d="M52,82 L60,100 L68,82"
      stroke="#ffffff"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/**
 * 2. Baron Nashor - Hand of Baron (Vương Miện Hàm Răng Hư Không)
 * Vector SVG đa lớp chi tiết:
 * - 5 đỉnh răng nanh Hư Không uy lực
 * - Hàm dưới sắc lẹm cùng cụm mắt đỏ/tím Hư Không đặc trưng của Baron
 * - Tinh thể Hư Vô tỏa sáng rực rỡ
 */
const BaronMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(168,85,247,0.95)]">
    <defs>
      <linearGradient id="baronCrownMetallic" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#e9d5ff" />
        <stop offset="55%" stopColor="#a855f7" />
        <stop offset="85%" stopColor="#6b21a8" />
        <stop offset="100%" stopColor="#1e1035" />
      </linearGradient>

      <radialGradient id="baronEyeGlowRed" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#f43f5e" />
        <stop offset="75%" stopColor="#9f1239" />
        <stop offset="100%" stopColor="#1c050d" />
      </radialGradient>
    </defs>

    {/* Outer Void Aura Petals */}
    <polygon
      points="60,6 72,28 98,20 86,48 112,62 84,74 92,104 60,88 28,104 36,74 8,62 34,48 22,20 48,28"
      fill="#2e1065"
      stroke={secondary}
      strokeWidth="2"
      opacity="0.8"
    />

    {/* 5-Toothed Baron Crown Shell */}
    <path
      d="M24,80 L20,32 L40,50 L60,12 L80,50 L100,32 L96,80 L60,98 Z"
      fill="url(#baronCrownMetallic)"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />

    {/* Inner Chitin Ribs */}
    <path d="M40,50 L60,30 L80,50" fill="none" stroke="#3b0764" strokeWidth="2.5" />

    {/* Baron Mouth Cavity */}
    <path
      d="M34,74 L60,52 L86,74 L60,90 Z"
      fill="#090514"
      stroke={primary}
      strokeWidth="2.5"
    />

    {/* Main Center Void Eye */}
    <circle cx="60" cy="65" r="9.5" fill="url(#baronEyeGlowRed)" />
    <circle cx="60" cy="65" r="4" fill="#ffffff" />

    {/* Flanking Secondary Sensory Eyes */}
    <circle cx="48" cy="61" r="3.2" fill="#ec4899" />
    <circle cx="72" cy="61" r="3.2" fill="#ec4899" />
    <circle cx="53" cy="73" r="2.4" fill="#f43f5e" />
    <circle cx="67" cy="73" r="2.4" fill="#f43f5e" />

    {/* Sharp Mandibular Fangs */}
    <polygon points="44,56 50,68 46,68" fill="#ffffff" />
    <polygon points="76,56 70,68 74,68" fill="#ffffff" />
    <polygon points="60,54 57,63 63,63" fill="#ffffff" />

    {/* Lower Teeth Plate */}
    <polygon points="48,84 52,76 55,84" fill="#ffffff" />
    <polygon points="65,84 68,76 72,84" fill="#ffffff" />
  </svg>
);

/**
 * 3. Rồng Ngàn Tuổi (Elder Dragon) - Aspect of the Dragon (Hơi Thở Long Thần)
 * Vector SVG đa lớp chi tiết:
 * - Đầu Rồng nguyên tố uy nghi, cặp sừng ngọn lửa uốn cong
 * - Đôi cánh rồng giương cao rực lửa
 * - Đôi mắt rực sáng lửa vàng kim / xanh ngọc
 */
const ElderMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.95)]">
    <defs>
      <linearGradient id="elderFireFlames" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="30%" stopColor="#f59e0b" />
        <stop offset="70%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#450a0a" />
      </linearGradient>

      <linearGradient id="elderHornGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#fef08a" />
        <stop offset="75%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>

    {/* Draconic Wings & Fire Halo */}
    <path
      d="M60,16 Q88,10 108,38 Q90,46 86,68 Q100,82 106,104 Q82,92 60,110 Q38,92 14,104 Q20,82 34,68 Q30,46 12,38 Q32,10 60,16 Z"
      fill="url(#elderFireFlames)"
      stroke={secondary}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />

    {/* Great Ancient Horns */}
    <path
      d="M42,50 Q32,18 14,26 Q36,36 46,58 Z"
      fill="url(#elderHornGold)"
      stroke="#ffffff"
      strokeWidth="1.8"
    />
    <path
      d="M78,50 Q88,18 106,26 Q84,36 74,58 Z"
      fill="url(#elderHornGold)"
      stroke="#ffffff"
      strokeWidth="1.8"
    />

    {/* Dragon Skull Core */}
    <polygon
      points="60,36 76,58 70,90 60,102 50,90 44,58"
      fill="#1c1917"
      stroke={primary}
      strokeWidth="2.8"
      strokeLinejoin="round"
    />

    {/* Flaming Dragon Eyes */}
    <polygon points="50,60 56,65 50,67" fill="#fef08a" />
    <polygon points="70,60 64,65 70,67" fill="#fef08a" />

    {/* Dragon Snout & Fangs */}
    <polygon points="56,86 60,94 58,86" fill="#ffffff" />
    <polygon points="64,86 60,94 62,86" fill="#ffffff" />

    {/* Central Solar Element Rune */}
    <circle cx="60" cy="46" r="4.5" fill="#fef08a" />
    <line x1="60" y1="40" x2="60" y2="84" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 4. Thần Hư Vô (Void Titan) - Primordial Singularity Core
 */
const VoidTitanMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_22px_rgba(192,132,252,0.95)]">
    <defs>
      <radialGradient id="titanCosmicVortex" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#e879f9" />
        <stop offset="60%" stopColor="#7e22ce" />
        <stop offset="85%" stopColor="#3b0764" />
        <stop offset="100%" stopColor="#05020a" />
      </radialGradient>
    </defs>
    {/* Accretion Disk Rings */}
    <circle cx="60" cy="60" r="44" fill="url(#titanCosmicVortex)" stroke={primary} strokeWidth="3" />
    <circle cx="60" cy="60" r="28" fill="#000000" stroke={secondary} strokeWidth="2.4" strokeDasharray="10 5" />
    <circle cx="60" cy="60" r="8" fill="#ffffff" />
    {/* 4 Cardinal Dimensional Needles */}
    <polygon points="60,6 66,30 54,30" fill="#ffffff" />
    <polygon points="60,114 66,90 54,90" fill="#ffffff" />
    <polygon points="6,60 30,66 30,54" fill="#ffffff" />
    <polygon points="114,60 90,66 90,54" fill="#ffffff" />
  </svg>
);

/**
 * 5. Lôi Long Bão Tố (Storm Dragon) / Rồng Gió - Electric Thunder Visage
 */
const StormDragonMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(56,189,248,0.95)]">
    <path
      d="M60,10 L74,40 L106,38 L82,62 L102,94 L68,80 L60,110 L52,80 L18,94 L38,62 L14,38 L46,40 Z"
      fill="#082f49"
      stroke={primary}
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Electric Horns & Bolts */}
    <polygon
      points="64,22 48,56 62,56 52,94 76,50 60,50"
      fill="#ffffff"
      stroke={secondary}
      strokeWidth="1.8"
    />
    <circle cx="48" cy="44" r="3" fill="#38bdf8" />
    <circle cx="72" cy="44" r="3" fill="#38bdf8" />
  </svg>
);

/**
 * 6. Rồng Núi (Mountain Dragon) - Granite Carapace Crest
 */
const MountainDragonMythicCrest: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary,
}) => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.9)]">
    <polygon
      points="60,12 84,36 108,60 88,88 60,108 32,88 12,60 36,36"
      fill="#292524"
      stroke={primary}
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <polygon
      points="60,26 78,44 72,78 60,90 48,78 42,44"
      fill="#78350f"
      stroke={secondary}
      strokeWidth="2.2"
    />
    <circle cx="60" cy="56" r="6" fill="#fbbf24" />
    <line x1="60" y1="26" x2="60" y2="88" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const BossMythicCrest: React.FC<BossMythicCrestProps> = React.memo(
  ({ themeConfig, teamTheme, size = 'lg', className = '' }) => {
    const primary = teamTheme?.primaryHex || DEFAULT_PRIMARY;
    const secondary = teamTheme?.secondaryHex || DEFAULT_SECONDARY;

    const renderCrest = () => {
      if (themeConfig.archetype === 'HERALD' || themeConfig.id === GAME_THEME.XU_GIA) {
        return <HeraldMythicCrest primary={primary} secondary={secondary} />;
      }
      if (themeConfig.id === GAME_THEME.VOID_TITAN) {
        return <VoidTitanMythicCrest primary={primary} secondary={secondary} />;
      }
      if (themeConfig.id === GAME_THEME.RONG_GIA) {
        return <StormDragonMythicCrest primary={primary} secondary={secondary} />;
      }
      if (themeConfig.id === GAME_THEME.RONG_NUI) {
        return <MountainDragonMythicCrest primary={primary} secondary={secondary} />;
      }
      if (themeConfig.archetype === 'DRAGON' || themeConfig.id === GAME_THEME.ELDER_DRAGON) {
        return <ElderMythicCrest primary={primary} secondary={secondary} />;
      }
      return <BaronMythicCrest primary={primary} secondary={secondary} />;
    };

    return (
      <div className={`relative flex items-center justify-center ${SIZE_MAP[size]} ${className}`}>
        {renderCrest()}
      </div>
    );
  }
);

BossMythicCrest.displayName = 'BossMythicCrest';

import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';
import {
  TEAM_KEY,
  TeamType,
  CHAMPION_SKILL_VFX_TYPE,
  ChampionSkillVFXType,
} from '../../constants/game';

// -----------------------------------------------------------------------------
// Visual Effects Constants (Strict Clean Code - Zero Magic Values)
// -----------------------------------------------------------------------------
const VFX_STYLE = {
  TRAIL: {
    LENGTH_NORMAL: 58,
    LENGTH_CRIT: 104,
    WIDTH_HEAD_NORMAL: 12,
    WIDTH_HEAD_CRIT: 22,
    RIBBON_WAVE_SPEED: 0.026,
    RIBBON_WAVE_AMP_NORMAL: 3.2,
    RIBBON_WAVE_AMP_CRIT: 6.5,
    STARDUST_COUNT_NORMAL: 4,
    STARDUST_COUNT_CRIT: 8,
  },
  IMPACT: {
    START_PROGRESS: 0.74,
    RING_MAX_RADIUS_NORMAL: 28,
    RING_MAX_RADIUS_CRIT: 54,
    STAR_RAY_LENGTH_NORMAL: 22,
    STAR_RAY_LENGTH_CRIT: 44,
    SPARK_COUNT_NORMAL: 6,
    SPARK_COUNT_CRIT: 12,
  },
  GLOW: {
    BLUR_NORMAL: 10,
    BLUR_CRIT: 24,
  },
  SCALE: {
    NORMAL: 0.92,
    CRIT: 1.48,
  },
} as const;

// -----------------------------------------------------------------------------
// Math & Color Utilities
// -----------------------------------------------------------------------------
const computeLerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

const HEX_RGB_CACHE = new Map<string, string>();

const hexToRgba = (hex: string, alpha: number): string => {
  let rgb = HEX_RGB_CACHE.get(hex);
  if (!rgb) {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      rgb = `${r}, ${g}, ${b}`;
    } else if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      rgb = `${r}, ${g}, ${b}`;
    } else {
      rgb = '255, 255, 255';
    }
    HEX_RGB_CACHE.set(hex, rgb);
  }
  return `rgba(${rgb}, ${alpha})`;
};

// -----------------------------------------------------------------------------
// 1. Draw Comet Plasma Body & Esports Energy Ribbons
// -----------------------------------------------------------------------------
const drawCometEnergyBody = (
  ctx: CanvasRenderingContext2D,
  color: string,
  glowColor: string,
  team: TeamType,
  isCrit: boolean,
  elapsed: number
) => {
  const tailLength = isCrit
    ? VFX_STYLE.TRAIL.LENGTH_CRIT
    : VFX_STYLE.TRAIL.LENGTH_NORMAL;
  const headHalfWidth = isCrit
    ? VFX_STYLE.TRAIL.WIDTH_HEAD_CRIT / 2
    : VFX_STYLE.TRAIL.WIDTH_HEAD_NORMAL / 2;

  ctx.save();

  // A. Luminous Energy Flame Polygon (Thân sao chổi hình nêm phát quang)
  const bodyGrad = ctx.createLinearGradient(-tailLength, 0, 10, 0);
  bodyGrad.addColorStop(0, hexToRgba(color, 0));
  bodyGrad.addColorStop(0.35, hexToRgba(color, isCrit ? 0.4 : 0.28));
  bodyGrad.addColorStop(0.75, hexToRgba(glowColor, isCrit ? 0.9 : 0.75));
  bodyGrad.addColorStop(1, '#ffffff');

  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(-tailLength * 0.3, -headHalfWidth, -tailLength, 0);
  ctx.quadraticCurveTo(-tailLength * 0.3, headHalfWidth, 10, 0);
  ctx.closePath();
  ctx.fill();

  // B. Incandescent White Photon Laser Core (Lõi chùm photon trắng sáng chói)
  const coreGrad = ctx.createLinearGradient(-tailLength * 0.7, 0, 10, 0);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
  coreGrad.addColorStop(1, '#ffffff');

  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = isCrit ? 3.6 : 2.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.7, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  // C. Worlds Esports Twin Ribbons (2 dải năng lượng lượn sóng đối xứng theo đội)
  const teamTheme = getTeamTheme(useGameStore.getState().activeTeams[team]?.colorTheme);
  const ribbonColor1 = teamTheme.primaryHex;
  const ribbonColor2 = teamTheme.accentHex;
  const waveAmp = isCrit
    ? VFX_STYLE.TRAIL.RIBBON_WAVE_AMP_CRIT
    : VFX_STYLE.TRAIL.RIBBON_WAVE_AMP_NORMAL;
  const wave = Math.sin(elapsed * VFX_STYLE.TRAIL.RIBBON_WAVE_SPEED) * waveAmp;

  // Ribbon 1 (Upper Wave)
  ctx.strokeStyle = ribbonColor1;
  ctx.lineWidth = isCrit ? 2.4 : 1.4;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.65, 0);
  ctx.quadraticCurveTo(-tailLength * 0.3, wave, 6, 0);
  ctx.stroke();

  // Ribbon 2 (Lower Wave)
  ctx.strokeStyle = ribbonColor2;
  ctx.lineWidth = isCrit ? 2.0 : 1.1;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.55, 0);
  ctx.quadraticCurveTo(-tailLength * 0.25, -wave, 6, 0);
  ctx.stroke();

  // D. Stardust Sparkles Trailing Backwards (Hạt bụi sao phát sáng rơi rụng lại phía sau)
  const sparkCount = isCrit
    ? VFX_STYLE.TRAIL.STARDUST_COUNT_CRIT
    : VFX_STYLE.TRAIL.STARDUST_COUNT_NORMAL;
  ctx.fillStyle = '#ffffff';
  for (let i = 1; i <= sparkCount; i++) {
    const distRatio = i / (sparkCount + 1);
    const sparkX = -tailLength * distRatio;
    const sparkWave = Math.sin(elapsed * 0.02 + i * 1.5) * (waveAmp * (1 - distRatio));
    const sparkRadius = Math.max(0.6, (1 - distRatio) * (isCrit ? 2.5 : 1.5));

    ctx.beginPath();
    ctx.arc(sparkX, sparkWave, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

// -----------------------------------------------------------------------------
// 2. Draw Champion Specific Weapon / Skill Graphic at the Head
// -----------------------------------------------------------------------------
const drawSkillGraphic = (
  ctx: CanvasRenderingContext2D,
  vfxType: ChampionSkillVFXType,
  color: string,
  glowColor: string,
  coreColor: string,
  isCrit: boolean,
  elapsed: number
) => {
  ctx.save();

  switch (vfxType) {
    // -------------------------------------------------------------------------
    // A. SHURIKEN & SPINNING LANTERN (Phi Tiêu Ám Sát / Đèn Lồng Jax)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SHURIKEN:
    case CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN: {
      const spinAngle = (elapsed * 0.006 * Math.PI * 2) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      // Motion Blur Swirl Ring
      ctx.strokeStyle = hexToRgba(glowColor, 0.45);
      ctx.lineWidth = isCrit ? 2.0 : 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 18 : 13, 0, Math.PI * 2);
      ctx.stroke();

      // 4-Point Razor Blade Shuriken
      const bladeLen = isCrit ? 20 : 14;
      const bladeHalf = isCrit ? 5.5 : 3.8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -bladeLen);
      ctx.lineTo(bladeHalf, -bladeHalf);
      ctx.lineTo(bladeLen, 0);
      ctx.lineTo(bladeHalf, bladeHalf);
      ctx.lineTo(0, bladeLen);
      ctx.lineTo(-bladeHalf, bladeHalf);
      ctx.lineTo(-bladeLen, 0);
      ctx.lineTo(-bladeHalf, -bladeHalf);
      ctx.closePath();
      ctx.fill();

      // Sharp Edge Highlights
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Luminous Power Gem Core
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 4.5 : 3.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // B. SPINNING AXE (Rìu Xoay Cuồng Bạo - Draven / Hans Sama)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SPINNING_AXE: {
      const spinAngle = (elapsed * 0.007 * Math.PI * 2) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      // Motion Blur Crimson Swirl Ring
      ctx.strokeStyle = hexToRgba(glowColor, 0.45);
      ctx.lineWidth = isCrit ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 20 : 14, 0, Math.PI * 2);
      ctx.stroke();

      // Dual-Headed Heavy Crescent Executioner Axe
      const bladeR = isCrit ? 19 : 13;
      const axeGrad = ctx.createLinearGradient(-bladeR, 0, bladeR, 0);
      axeGrad.addColorStop(0, color);
      axeGrad.addColorStop(0.5, '#ffffff');
      axeGrad.addColorStop(1, color);

      ctx.fillStyle = axeGrad;
      // Head 1 (Top Blade)
      ctx.beginPath();
      ctx.moveTo(0, -bladeR);
      ctx.quadraticCurveTo(8, -bladeR * 0.6, 5, 0);
      ctx.lineTo(-5, 0);
      ctx.quadraticCurveTo(-8, -bladeR * 0.6, 0, -bladeR);
      ctx.closePath();
      ctx.fill();

      // Head 2 (Bottom Blade)
      ctx.beginPath();
      ctx.moveTo(0, bladeR);
      ctx.quadraticCurveTo(8, bladeR * 0.6, 5, 0);
      ctx.lineTo(-5, 0);
      ctx.quadraticCurveTo(-8, bladeR * 0.6, 0, bladeR);
      ctx.closePath();
      ctx.fill();

      // Center Grip Boss & Stud
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 4.5 : 3.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // C. SAND SOLDIER (Ngọn Giáo Hoàng Kim Shurima - Azir / Faker)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SAND_SOLDIER: {
      const scale = isCrit ? 1.3 : 1.0;
      ctx.scale(scale, scale);

      // Shuriman Golden Shaft
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = isCrit ? 4.2 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // White-Gold Inner Core
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = isCrit ? 2.0 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      // Winged Sun Blade Head
      const spearGrad = ctx.createLinearGradient(10, 0, 32, 0);
      spearGrad.addColorStop(0, '#f59e0b');
      spearGrad.addColorStop(0.6, '#fbbf24');
      spearGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = spearGrad;
      ctx.beginPath();
      ctx.moveTo(32, 0);
      ctx.lineTo(14, -8);
      ctx.lineTo(18, -3);
      ctx.lineTo(6, -9);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 9);
      ctx.lineTo(18, 3);
      ctx.lineTo(14, 8);
      ctx.closePath();
      ctx.fill();

      // Sun Disk Emblem Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, 0, isCrit ? 4.0 : 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Solar Sand Embers
      for (let s = 0; s < 3; s++) {
        const sandAngle = elapsed * 0.01 + (s * Math.PI * 2) / 3;
        const sandX = -12 + Math.cos(sandAngle) * 8;
        const sandY = Math.sin(sandAngle) * 6;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sandX, sandY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // -------------------------------------------------------------------------
    // D. ROCKET MISSILE (Tên Lửa Siêu Khủng Khiếp - Jinx / Gumayusi)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.ROCKET_MISSILE: {
      const scale = isCrit ? 1.35 : 1.0;
      ctx.scale(scale, scale);

      // Rocket Fuselage Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(12, -7);
      ctx.lineTo(-18, -6);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-18, 6);
      ctx.lineTo(12, 7);
      ctx.closePath();
      ctx.fill();

      // Sharp Silver Nose Cone
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(13, -4);
      ctx.lineTo(13, 4);
      ctx.closePath();
      ctx.fill();

      // Tail Stabilizer Fins
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(-20, -12);
      ctx.lineTo(-16, -5);
      ctx.moveTo(-12, 6);
      ctx.lineTo(-20, 12);
      ctx.lineTo(-16, 5);
      ctx.fill();

      // Thruster Flame Exhaust
      const flameGrad = ctx.createLinearGradient(-24, 0, -38, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#f59e0b');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-24, -3.5);
      ctx.lineTo(-38, 0);
      ctx.lineTo(-24, 3.5);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // E. SHOCK ORB (Cầu Sấm Gia Tốc Siêu Nạp - Jayce / Knight)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SHOCK_ORB: {
      const pulse = 1 + Math.sin(elapsed * 0.03) * 0.15;
      const radius = (isCrit ? 13 : 9.5) * pulse;

      // Outer Ionized Plasma Sheath
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 3.0 : 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      // Core Plasma Sphere
      const sphereGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.5, glowColor);
      sphereGrad.addColorStop(1, color);

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Electric Spark Ring
      const rot = (elapsed * 0.008) % (Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.5, radius * 0.6, rot, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // -------------------------------------------------------------------------
    // F. SPIRIT SPEAR (Mũi Giáo Linh Hồn - Kalista / Elk)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SPIRIT_SPEAR: {
      const scale = isCrit ? 1.3 : 1.0;
      ctx.scale(scale, scale);

      // Spectral Jade Shaft
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = isCrit ? 4.0 : 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      // Core Luminous Soul Beam
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = isCrit ? 2.0 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();

      // Barbed Ethereal Spearhead
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(14, -7);
      ctx.lineTo(18, -2);
      ctx.lineTo(8, -8);
      ctx.lineTo(12, 0);
      ctx.lineTo(8, 8);
      ctx.lineTo(18, 2);
      ctx.lineTo(14, 7);
      ctx.closePath();
      ctx.fill();

      // Incandescent Soul Tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(16, -3);
      ctx.lineTo(18, 0);
      ctx.lineTo(16, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // G. LASER (Tia Chùm Photon Cực Đại - Viktor / Lux)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.LASER: {
      // Outer Neon Plasma Sheath
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 7.5 : 4.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();

      // Inner High-Energy Laser Beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 3.5 : 2.0;
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();

      // 2 Ionization Shock Rings
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(-12, 0, 5, isCrit ? 10 : 7, 0, 0, Math.PI * 2);
      ctx.ellipse(8, 0, 4, isCrit ? 8 : 5.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Piercing Diamond Tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(18, -4);
      ctx.lineTo(20, 0);
      ctx.lineTo(18, 4);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // H. CRESCENT ARC & GOLDEN FEATHER (Trăng Khuyết / Lông Vũ Xayah & Chovy)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC:
    case CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER: {
      const arcScale = isCrit ? 1.35 : 1.0;
      ctx.scale(arcScale, arcScale);

      // Radial Glowing Scythe Blade Wave
      const scytheGrad = ctx.createLinearGradient(-4, -22, 22, 0);
      scytheGrad.addColorStop(0, hexToRgba(color, 0.4));
      scytheGrad.addColorStop(0.5, color);
      scytheGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = scytheGrad;
      ctx.beginPath();
      ctx.moveTo(4, -22);
      ctx.quadraticCurveTo(24, 0, 4, 22);
      ctx.quadraticCurveTo(12, 0, 4, -22);
      ctx.closePath();
      ctx.fill();

      // Radiant Razor Cutting Edge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(4, -22);
      ctx.quadraticCurveTo(24, 0, 4, 22);
      ctx.stroke();

      // Energy Fin Sweeps
      ctx.strokeStyle = hexToRgba(glowColor, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(-10, -8, -14, -4);
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(-10, 8, -14, 4);
      ctx.stroke();
      break;
    }

    // -------------------------------------------------------------------------
    // I. SPIRIT ORB (Hồ Ly Ma Cầu - Ahri / Syndra / Orianna)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB: {
      const pulse = 1 + Math.sin(elapsed * 0.025) * 0.14;
      const radius = (isCrit ? 12 : 8.5) * pulse;

      // Outer Mystic Mist Halo
      const haloGrad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.6);
      haloGrad.addColorStop(0, hexToRgba(color, 0.9));
      haloGrad.addColorStop(0.7, hexToRgba(glowColor, 0.4));
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Core Orb
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Incandescent Center
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // 2 Orbiting Will-o'-Wisp Spirits
      const orbitAngle = elapsed * 0.006;
      const orbitR = radius * 1.25;
      for (let w = 0; w < 2; w++) {
        const a = orbitAngle + w * Math.PI;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * (orbitR * 0.5), 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // -------------------------------------------------------------------------
    // J. JAVELIN & WIND SPEAR (Ngọn Giáo Hoàng Kim / Thần Phong - Nidalee / Xin Zhao)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.JAVELIN:
    case CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR: {
      // Shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 4.2 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Core Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 2.0 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      // Barbed Golden Spearhead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(12, -8);
      ctx.lineTo(16, 0);
      ctx.lineTo(12, 8);
      ctx.closePath();
      ctx.fill();

      // White Sharp Tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(15, -4);
      ctx.lineTo(17, 0);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();

      // Aerodynamic Wind Break Cones
      ctx.strokeStyle = hexToRgba(glowColor, 0.55);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(22, -2);
      ctx.lineTo(6, -14);
      ctx.moveTo(22, 2);
      ctx.lineTo(6, 14);
      ctx.stroke();
      break;
    }

    // -------------------------------------------------------------------------
    // K. VOID MISSILE (Phi Đạn Hư Không - Kai'Sa)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE: {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(6, -8);
      ctx.lineTo(-18, -4);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-18, 4);
      ctx.lineTo(6, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(6, -4);
      ctx.lineTo(-10, 0);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // L. TORNADO (Lốc Xoáy Bão Tố - Janna / Yasuo)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.TORNADO: {
      const pulse = 1 + Math.sin(elapsed * 0.02) * 0.12;
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 3.2 : 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(3, 0, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // -------------------------------------------------------------------------
    // M. SONIC WAVE (Sóng Âm Hộ Thể - Lee Sin)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE: {
      const pulse = 1 + Math.sin(elapsed * 0.03) * 0.18;
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 12 : 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(2, 0, isCrit ? 6 : 4.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // -------------------------------------------------------------------------
    // N. BLADE SLASH & DARKIN BLADE (Song Đao / Trảm Kích Yone & Aatrox)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.MELEE_LEAP:
    case CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH:
    case CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE:
    case CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM: {
      // Dual Katana Blade lines
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = isCrit ? 4.0 : 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-28, -7);
      ctx.lineTo(20, -2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = isCrit ? 4.0 : 2.6;
      ctx.beginPath();
      ctx.moveTo(-28, 7);
      ctx.lineTo(20, 2);
      ctx.stroke();

      // Blade Core Spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, 0, isCrit ? 4.5 : 3.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // O. ANCHOR DEPTH (Mỏ Neo Khổng Lồ / Án Tử - Nautilus / Thresh / Keria)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH: {
      const scale = isCrit ? 1.3 : 1.0;
      ctx.scale(scale, scale);

      // Heavy Iron Shank
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 4.5 : 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Curved Anchor Flukes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 3.0 : 2.0;
      ctx.beginPath();
      ctx.arc(6, 0, isCrit ? 15 : 11, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();

      // Sharp Barbed Fluke Tips
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.moveTo(10, -14);
      ctx.lineTo(18, -10);
      ctx.lineTo(13, -7);
      ctx.moveTo(10, 14);
      ctx.lineTo(18, 10);
      ctx.lineTo(13, 7);
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // P. ARROW (Mũi Tên Tinh Thể Ánh Sáng - Ashe / Varus / ADC Mặc Định)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.ARROW:
    default: {
      // Crystal Arrow Shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 4.0 : 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Core Beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 2.0 : 1.3;
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      // Crystal Diamond Arrowhead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(6, -6.5);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 6.5);
      ctx.closePath();
      ctx.fill();

      // White Sharp Tip & Ridge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(8, -3.2);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 3.2);
      ctx.closePath();
      ctx.fill();

      // Dual Energy Fletchings (Cánh Lông Vũ Năng Lượng)
      ctx.strokeStyle = hexToRgba(glowColor, 0.75);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-34, -7);
      ctx.moveTo(-26, 0);
      ctx.lineTo(-34, 7);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
};

// -----------------------------------------------------------------------------
// 3. Draw Impact Burst Upon Hitting the Boss Monster
// -----------------------------------------------------------------------------
const drawImpactBurst = (
  ctx: CanvasRenderingContext2D,
  color: string,
  glowColor: string,
  isCrit: boolean,
  impactProgress: number
) => {
  ctx.save();

  const maxRadius = isCrit
    ? VFX_STYLE.IMPACT.RING_MAX_RADIUS_CRIT
    : VFX_STYLE.IMPACT.RING_MAX_RADIUS_NORMAL;
  const rayMaxLen = isCrit
    ? VFX_STYLE.IMPACT.STAR_RAY_LENGTH_CRIT
    : VFX_STYLE.IMPACT.STAR_RAY_LENGTH_NORMAL;

  const currentRadius = maxRadius * Math.sin(impactProgress * Math.PI * 0.5);
  const fade = Math.max(0, 1 - impactProgress);

  // 1. Expanding Shockwave Ring (layered glow without slow shadowBlur)
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = Math.max(2.0, (1 - impactProgress) * (isCrit ? 8.0 : 5.0));
  ctx.globalAlpha = fade * 0.3;
  ctx.beginPath();
  ctx.ellipse(14, 0, currentRadius, currentRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.0, (1 - impactProgress) * (isCrit ? 4.5 : 2.6));
  ctx.globalAlpha = fade * 0.9;
  ctx.beginPath();
  ctx.ellipse(14, 0, currentRadius, currentRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. White-Hot Expanding Secondary Core Ring
  if (isCrit) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.0, (1 - impactProgress) * 2.2);
    ctx.globalAlpha = fade * 0.95;
    ctx.beginPath();
    ctx.ellipse(14, 0, currentRadius * 0.55, currentRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Eight-Point Impact Star Burst
  const rayLen = rayMaxLen * (1 - Math.pow(impactProgress, 2));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = isCrit ? 2.5 : 1.6;
  ctx.globalAlpha = fade;
  ctx.beginPath();
  // Horizontal & Vertical principal rays
  ctx.moveTo(14 - rayLen, 0);
  ctx.lineTo(14 + rayLen, 0);
  ctx.moveTo(14, -rayLen * 0.7);
  ctx.lineTo(14, rayLen * 0.7);

  if (isCrit) {
    // Diagonal secondary rays for Crits
    const diagLen = rayLen * 0.5;
    ctx.moveTo(14 - diagLen, -diagLen * 0.5);
    ctx.lineTo(14 + diagLen, diagLen * 0.5);
    ctx.moveTo(14 - diagLen, diagLen * 0.5);
    ctx.lineTo(14 + diagLen, -diagLen * 0.5);
  }
  ctx.stroke();

  // 4. Directional Spark Particles (Tia lửa văng ra từ điểm va chạm)
  const sparkCount = isCrit
    ? VFX_STYLE.IMPACT.SPARK_COUNT_CRIT
    : VFX_STYLE.IMPACT.SPARK_COUNT_NORMAL;
  ctx.fillStyle = isCrit ? '#fef08a' : color;
  for (let s = 0; s < sparkCount; s++) {
    const angle = (s / sparkCount) * Math.PI * 2 + impactProgress * 0.8;
    const sparkDist = (currentRadius + 6) * (0.4 + (s % 3) * 0.3);
    const sx = 14 + Math.cos(angle) * sparkDist;
    const sy = Math.sin(angle) * (sparkDist * 0.7);
    const sparkSize = Math.max(0.6, (1 - impactProgress) * (isCrit ? 3.0 : 1.8));

    ctx.beginPath();
    ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const drawMuzzleLaunchFlash = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  aimAngleRad: number,
  color: string,
  glowColor: string,
  isCrit: boolean,
  progress: number
) => {
  const launchWindow = 0.25;
  if (progress > launchWindow) return;

  const p = progress / launchWindow;
  const fade = 1 - p;
  const ringRadius = (isCrit ? 22 : 14) * (0.35 + p * 0.9);

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(aimAngleRad);
  ctx.globalAlpha = fade * 0.9;

  // Expanding muzzle ring
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = isCrit ? 2.8 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();

  // Forward directional blast cone
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ringRadius * 1.4, 0);
  ctx.lineTo(0, -ringRadius * 0.45);
  ctx.lineTo(ringRadius * 0.3, 0);
  ctx.lineTo(0, ringRadius * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export const ChampionArrowVFX: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number | null = null;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let isCanvasDirty = false;

    const renderLoop = () => {
      const activeFlyingArrows = useGameStore.getState().activeFlyingArrows;
      if (activeFlyingArrows.length === 0) {
        if (isCanvasDirty) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          isCanvasDirty = false;
        }
        animFrameId = null;
        return;
      }

      isCanvasDirty = true;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();

      for (let i = 0; i < activeFlyingArrows.length; i++) {
        const arrow = activeFlyingArrows[i];
        const elapsed = now - arrow.createdAt;
        const progress = Math.min(1.0, Math.max(0, elapsed / arrow.durationMs));

        if (progress >= 1.0) continue;

        // Smooth accelerating curve so projectiles slam sharply into Boss without stalling/twisting at t -> 1
        const eased = 0.35 * progress + 0.65 * (progress * progress);
        const dEasedDt = 0.35 + 1.3 * progress;

        const dx = arrow.targetX - arrow.startX;
        const dy = arrow.targetY - arrow.startY;
        const dist = Math.hypot(dx, dy) || 100;
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const sideSign = arrow.team === TEAM_KEY.BLG ? -1 : 1;
        const maxCurve = Math.min(26, dist * 0.1);
        const curveOffset = Math.sin(progress * Math.PI) * maxCurve * sideSign;
        const dCurveDt = Math.cos(progress * Math.PI) * Math.PI * maxCurve * sideSign;

        const currentX = computeLerp(arrow.startX, arrow.targetX, eased) + perpX * curveOffset;
        const currentY = computeLerp(arrow.startY, arrow.targetY, eased) + perpY * curveOffset;

        // Analytical velocity tangent ensures projectile tip stays aimed squarely along flight arc
        const velX = dx * dEasedDt + perpX * dCurveDt;
        const velY = dy * dEasedDt + perpY * dCurveDt;
        const angleRad = Math.atan2(velY, velX);
        const baseAimAngleRad = Math.atan2(dy, dx);

        const glowColor = arrow.glowColor || arrow.color;
        const coreColor = arrow.coreColor || '#ffffff';

        // Muzzle launch flash at source for both Normal and Crit
        drawMuzzleLaunchFlash(
          ctx,
          arrow.startX,
          arrow.startY,
          baseAimAngleRad,
          arrow.color,
          glowColor,
          arrow.isCrit,
          progress
        );

        let opacity = 1.0;
        if (progress < 0.04) {
          opacity = progress / 0.04;
        } else if (progress > 0.9) {
          opacity = (1.0 - progress) / 0.1;
        }
        const scale = arrow.isCrit ? VFX_STYLE.SCALE.CRIT : VFX_STYLE.SCALE.NORMAL;
        const clampedOpacity = Math.max(0, Math.min(1, opacity));

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(angleRad);
        ctx.scale(scale, scale);
        ctx.globalAlpha = clampedOpacity;

        // 1. Dynamic Energy Ribbon Comet Trail Body
        drawCometEnergyBody(
          ctx,
          arrow.color,
          glowColor,
          arrow.team,
          arrow.isCrit,
          elapsed
        );

        // 2. Champion Signature Weapon Graphic
        drawSkillGraphic(
          ctx,
          arrow.vfxType || CHAMPION_SKILL_VFX_TYPE.ARROW,
          arrow.color,
          glowColor,
          coreColor,
          arrow.isCrit,
          elapsed
        );

        // 3. Multi-layer Impact Burst upon hitting the Boss Monster
        if (progress >= VFX_STYLE.IMPACT.START_PROGRESS) {
          const impactProgress =
            (progress - VFX_STYLE.IMPACT.START_PROGRESS) /
            (1.0 - VFX_STYLE.IMPACT.START_PROGRESS);
          drawImpactBurst(
            ctx,
            arrow.color,
            glowColor,
            arrow.isCrit,
            impactProgress
          );
        }

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    const startLoopIfNeeded = () => {
      if (animFrameId === null && useGameStore.getState().activeFlyingArrows.length > 0) {
        animFrameId = requestAnimationFrame(renderLoop);
      }
    };

    startLoopIfNeeded();
    const unsubscribeArrows = useGameStore.subscribe((state, prevState) => {
      if (state.activeFlyingArrows !== prevState.activeFlyingArrows && state.activeFlyingArrows.length > 0) {
        startLoopIfNeeded();
      }
    });

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      unsubscribeArrows();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
    />
  );
});

import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
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
    LENGTH_NORMAL: 64,
    LENGTH_CRIT: 96,
    WIDTH_HEAD_NORMAL: 14,
    WIDTH_HEAD_CRIT: 20,
    RIBBON_WAVE_SPEED: 0.024,
    RIBBON_WAVE_AMP_NORMAL: 3.5,
    RIBBON_WAVE_AMP_CRIT: 6.0,
    STARDUST_COUNT: 5,
  },
  IMPACT: {
    START_PROGRESS: 0.76,
    RING_MAX_RADIUS_NORMAL: 32,
    RING_MAX_RADIUS_CRIT: 52,
    STAR_RAY_LENGTH_NORMAL: 24,
    STAR_RAY_LENGTH_CRIT: 42,
    SPARK_COUNT: 8,
  },
  GLOW: {
    BLUR_NORMAL: 14,
    BLUR_CRIT: 24,
  },
} as const;

// -----------------------------------------------------------------------------
// Math & Color Utilities
// -----------------------------------------------------------------------------
const computeLerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(255, 255, 255, ${alpha})`;
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
  bodyGrad.addColorStop(0.35, hexToRgba(color, 0.35));
  bodyGrad.addColorStop(0.75, hexToRgba(glowColor, 0.85));
  bodyGrad.addColorStop(1, '#ffffff');

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isCrit ? VFX_STYLE.GLOW.BLUR_CRIT : VFX_STYLE.GLOW.BLUR_NORMAL;
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
  ctx.lineWidth = isCrit ? 3.6 : 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.7, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  // C. Worlds Esports Twin Ribbons (2 dải năng lượng lượn sóng đối xứng BLG / GEN.G)
  const isBLG = team === TEAM_KEY.BLG;
  const ribbonColor1 = isBLG ? '#00f2fe' : '#fbbf24';
  const ribbonColor2 = isBLG ? '#f43f5e' : '#f97316';
  const waveAmp = isCrit
    ? VFX_STYLE.TRAIL.RIBBON_WAVE_AMP_CRIT
    : VFX_STYLE.TRAIL.RIBBON_WAVE_AMP_NORMAL;
  const wave = Math.sin(elapsed * VFX_STYLE.TRAIL.RIBBON_WAVE_SPEED) * waveAmp;

  // Ribbon 1 (Upper Wave)
  ctx.strokeStyle = ribbonColor1;
  ctx.lineWidth = isCrit ? 2.4 : 1.5;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.65, 0);
  ctx.quadraticCurveTo(-tailLength * 0.3, wave, 6, 0);
  ctx.stroke();

  // Ribbon 2 (Lower Wave)
  ctx.strokeStyle = ribbonColor2;
  ctx.lineWidth = isCrit ? 2.0 : 1.2;
  ctx.beginPath();
  ctx.moveTo(-tailLength * 0.55, 0);
  ctx.quadraticCurveTo(-tailLength * 0.25, -wave, 6, 0);
  ctx.stroke();

  // D. Stardust Sparkles Trailing Backwards (Hạt bụi sao phát sáng rơi rụng lại phía sau)
  const sparkCount = VFX_STYLE.TRAIL.STARDUST_COUNT;
  ctx.fillStyle = '#ffffff';
  for (let i = 1; i <= sparkCount; i++) {
    const distRatio = i / (sparkCount + 1);
    const sparkX = -tailLength * distRatio;
    const sparkWave = Math.sin(elapsed * 0.02 + i * 1.5) * (waveAmp * (1 - distRatio));
    const sparkRadius = Math.max(0.7, (1 - distRatio) * (isCrit ? 2.4 : 1.6));

    ctx.shadowColor = ribbonColor1;
    ctx.shadowBlur = 8;
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
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isCrit ? VFX_STYLE.GLOW.BLUR_CRIT : VFX_STYLE.GLOW.BLUR_NORMAL;

  switch (vfxType) {
    // -------------------------------------------------------------------------
    // A. SHURIKEN & SPINNING LANTERN (Phi Tiêu Ám Sát / Đèn Lồng Jax)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SHURIKEN:
    case CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN: {
      const spinAngle = (elapsed * 0.005 * Math.PI * 2) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      // Motion Blur Swirl Ring
      ctx.strokeStyle = hexToRgba(glowColor, 0.45);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 18 : 13, 0, Math.PI * 2);
      ctx.stroke();

      // 4-Point Razor Blade Shuriken
      const bladeLen = isCrit ? 20 : 15;
      const bladeHalf = isCrit ? 5.5 : 4.0;
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
      ctx.arc(0, 0, isCrit ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // -------------------------------------------------------------------------
    // B. LASER (Tia Chùm Photon Cực Đại - Viktor / Lux)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.LASER: {
      // Outer Neon Plasma Sheath
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 7.5 : 5.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();

      // Inner High-Energy Laser Beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 3.5 : 2.2;
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
    // C. CRESCENT ARC & GOLDEN FEATHER (Trăng Khuyết / Lông Vũ Xayah & Chovy)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC:
    case CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER: {
      const arcScale = isCrit ? 1.35 : 1.05;
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
    // D. SPIRIT ORB (Hồ Ly Ma Cầu - Ahri)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB: {
      const pulse = 1 + Math.sin(elapsed * 0.025) * 0.14;
      const radius = (isCrit ? 12 : 9.0) * pulse;

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
    // E. JAVELIN & WIND SPEAR (Ngọn Giáo Hoàng Kim / Thần Phong - Nidalee / Xin Zhao)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.JAVELIN:
    case CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR: {
      // Shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 4.2 : 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Core Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 2.0 : 1.3;
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
    // F. VOID MISSILE (Phi Đạn Hư Không - Kai'Sa)
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
    // G. TORNADO (Lốc Xoáy Bão Tố - Janna / Yasuo)
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
    // H. SONIC WAVE (Sóng Âm Hộ Thể - Lee Sin)
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
    // I. BLADE SLASH & DARKIN BLADE (Song Đao / Trảm Kích Yone & Aatrox)
    // -------------------------------------------------------------------------
    case CHAMPION_SKILL_VFX_TYPE.MELEE_LEAP:
    case CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH:
    case CHAMPION_SKILL_VFX_TYPE.DARKIN_BLADE:
    case CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM:
    case CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH: {
      // Dual Katana Blade lines
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = isCrit ? 4.0 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-28, -7);
      ctx.lineTo(20, -2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = isCrit ? 4.0 : 2.8;
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
    // J. ARROW (Mũi Tên Tinh Thể Ánh Sáng - Ashe / Varus / ADC Mặc Định)
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

  // 1. Expanding Shockwave Ring
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.0, (1 - impactProgress) * (isCrit ? 4.5 : 3.0));
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isCrit ? 20 : 12;
  ctx.globalAlpha = fade * 0.9;
  ctx.beginPath();
  ctx.ellipse(14, 0, currentRadius, currentRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. White-Hot Expanding Secondary Core Ring
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.0, (1 - impactProgress) * 2.0);
  ctx.globalAlpha = fade * 0.95;
  ctx.beginPath();
  ctx.ellipse(14, 0, currentRadius * 0.55, currentRadius * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Eight-Point Impact Star Burst
  const rayLen = rayMaxLen * (1 - Math.pow(impactProgress, 2));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = isCrit ? 2.5 : 1.8;
  ctx.globalAlpha = fade;
  ctx.beginPath();
  // Horizontal & Vertical principal rays
  ctx.moveTo(14 - rayLen, 0);
  ctx.lineTo(14 + rayLen, 0);
  ctx.moveTo(14, -rayLen * 0.7);
  ctx.lineTo(14, rayLen * 0.7);
  // Diagonal secondary rays
  const diagLen = rayLen * 0.5;
  ctx.moveTo(14 - diagLen, -diagLen * 0.5);
  ctx.lineTo(14 + diagLen, diagLen * 0.5);
  ctx.moveTo(14 - diagLen, diagLen * 0.5);
  ctx.lineTo(14 + diagLen, -diagLen * 0.5);
  ctx.stroke();

  // 4. Directional Spark Particles (Tia lửa văng ra từ điểm va chạm)
  const sparkCount = VFX_STYLE.IMPACT.SPARK_COUNT;
  ctx.fillStyle = isCrit ? '#fef08a' : color;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;
  for (let s = 0; s < sparkCount; s++) {
    const angle = (s / sparkCount) * Math.PI * 2 + impactProgress * 0.8;
    const sparkDist = (currentRadius + 6) * (0.4 + (s % 3) * 0.3);
    const sx = 14 + Math.cos(angle) * sparkDist;
    const sy = Math.sin(angle) * (sparkDist * 0.7);
    const sparkSize = Math.max(0.6, (1 - impactProgress) * (isCrit ? 3.0 : 2.0));

    ctx.beginPath();
    ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }

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

    let animFrameId: number;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

    const renderLoop = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const activeFlyingArrows = useGameStore.getState().activeFlyingArrows;
      const now = Date.now();

      for (let i = 0; i < activeFlyingArrows.length; i++) {
        const arrow = activeFlyingArrows[i];
        const elapsed = now - arrow.createdAt;
        const progress = Math.min(1.0, elapsed / arrow.durationMs);

        if (progress >= 1.0) continue;

        // Smooth flight curve with power easing
        const eased = 1 - Math.pow(1 - progress, 2.2);

        const dx = arrow.targetX - arrow.startX;
        const dy = arrow.targetY - arrow.startY;
        const dist = Math.hypot(dx, dy) || 100;
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const sideSign = arrow.team === TEAM_KEY.BLG ? -1 : 1;
        const maxCurve = Math.min(28, dist * 0.12);
        const curveOffset = Math.sin(progress * Math.PI) * maxCurve * sideSign;

        const currentX = computeLerp(arrow.startX, arrow.targetX, eased) + perpX * curveOffset;
        const currentY = computeLerp(arrow.startY, arrow.targetY, eased) + perpY * curveOffset;

        // Trajectory heading angle
        const nextT = Math.min(1.0, progress + 0.04);
        const nextEased = 1 - Math.pow(1 - nextT, 2.2);
        const nextCurveOffset = Math.sin(nextT * Math.PI) * maxCurve * sideSign;

        const nextX = computeLerp(arrow.startX, arrow.targetX, nextEased) + perpX * nextCurveOffset;
        const nextY = computeLerp(arrow.startY, arrow.targetY, nextEased) + perpY * nextCurveOffset;

        const deltaX = nextX - currentX;
        const deltaY = nextY - currentY;
        const angleRad = Math.atan2(deltaY, deltaX);

        const opacity =
          progress < 0.08
            ? progress * 12.5
            : progress > 0.88
            ? (1.0 - progress) * 8.3
            : 1.0;
        const scale = arrow.isCrit ? 1.35 : 1.05;
        const clampedOpacity = Math.max(0, Math.min(1, opacity));

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(angleRad);
        ctx.scale(scale, scale);
        ctx.globalAlpha = clampedOpacity;

        const glowColor = arrow.glowColor || arrow.color;
        const coreColor = arrow.coreColor || '#ffffff';

        // 1. Draw Streamer Comet Tail & Esports Ribbons
        drawCometEnergyBody(
          ctx,
          arrow.color,
          glowColor,
          arrow.team,
          arrow.isCrit,
          elapsed
        );

        // 2. Draw Champion Specific Weapon / Skill Graphic at the Head
        drawSkillGraphic(
          ctx,
          arrow.vfxType || CHAMPION_SKILL_VFX_TYPE.ARROW,
          arrow.color,
          glowColor,
          coreColor,
          arrow.isCrit,
          elapsed
        );

        // 3. Draw Impact Flash & Shockwave Ring on Arrival at Boss
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

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
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

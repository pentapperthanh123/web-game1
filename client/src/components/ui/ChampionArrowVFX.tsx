import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  TEAM_KEY,
  TeamType,
  CHAMPION_SKILL_VFX_TYPE,
  ChampionSkillVFXType,
} from '../../constants/game';

const computeLerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

// 1. Draw Team Esports Trail
const drawEsportsTrail = (
  ctx: CanvasRenderingContext2D,
  team: TeamType,
  isCrit: boolean,
  elapsed: number
) => {
  const isBLG = team === TEAM_KEY.BLG;
  const ribbonColor1 = isBLG ? '#00f2fe' : '#ffe259';
  const ribbonColor2 = isBLG ? '#ff6699' : '#ffa751';
  const wave = Math.sin(elapsed * 0.03) * (isCrit ? 4 : 2);

  ctx.save();
  ctx.lineCap = 'round';

  // Streamer Ribbon Upper
  ctx.strokeStyle = ribbonColor1;
  ctx.lineWidth = isCrit ? 2.8 : 1.8;
  ctx.beginPath();
  ctx.moveTo(-32, 0);
  ctx.quadraticCurveTo(-16, wave, 0, 0);
  ctx.stroke();

  // Streamer Ribbon Lower
  ctx.strokeStyle = ribbonColor2;
  ctx.lineWidth = isCrit ? 2.2 : 1.4;
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.quadraticCurveTo(-14, -wave, 0, 0);
  ctx.stroke();

  // Worlds Crystal Stardust Core on Crits
  if (isCrit) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = ribbonColor1;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-18, wave * 0.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

// 2. Draw Skill Specific Graphics
const drawSkillGraphic = (
  ctx: CanvasRenderingContext2D,
  vfxType: ChampionSkillVFXType,
  color: string,
  isCrit: boolean,
  elapsed: number
) => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = isCrit ? 10 : 5;

  switch (vfxType) {
    case CHAMPION_SKILL_VFX_TYPE.SHURIKEN:
    case CHAMPION_SKILL_VFX_TYPE.SPINNING_LANTERN: {
      const spinAngle = (elapsed * 0.0035 * Math.PI * 2) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      // Razor Shuriken 4-point star
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(4, -4);
      ctx.lineTo(16, 0);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 16);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();

      // White core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.LASER: {
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 4.5 : 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();

      // Incandescent White Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.TORNADO: {
      const pulse = 1 + Math.sin(elapsed * 0.02) * 0.12;
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 2.8 : 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 8, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(2, 0, 10, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.SPIRIT_ORB: {
      const pulse = 1 + Math.sin(elapsed * 0.025) * 0.15;
      const radius = (isCrit ? 9.5 : 7.0) * pulse;

      // Outer Aura
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Bright Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.VOID_MISSILE: {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(4, -6);
      ctx.lineTo(-14, -3);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-14, 3);
      ctx.lineTo(4, 6);
      ctx.closePath();
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(-8, 0);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.JAVELIN:
    case CHAMPION_SKILL_VFX_TYPE.WIND_SPEAR: {
      // Shaft
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = isCrit ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-38, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();

      // Spearhead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(8, -6);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(10, -3);
      ctx.lineTo(12, 0);
      ctx.lineTo(10, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.CRESCENT_ARC:
    case CHAMPION_SKILL_VFX_TYPE.GOLDEN_FEATHER: {
      const arcScale = isCrit ? 1.3 : 1.0;
      ctx.scale(arcScale, arcScale);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(6, -18);
      ctx.quadraticCurveTo(18, 0, 6, 18);
      ctx.quadraticCurveTo(14, 0, 6, -18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(7, -14);
      ctx.quadraticCurveTo(15, 0, 7, 14);
      ctx.quadraticCurveTo(13, 0, 7, -14);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.SONIC_WAVE: {
      const pulse = 1 + Math.sin(elapsed * 0.025) * 0.15;
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 3.0 : 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, isCrit ? 10 : 7.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.MELEE_LEAP:
    case CHAMPION_SKILL_VFX_TYPE.BLADE_SLASH:
    case CHAMPION_SKILL_VFX_TYPE.NTOFO_SLAM:
    case CHAMPION_SKILL_VFX_TYPE.ANCHOR_DEPTH: {
      // Dual Katana Blade lines
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = isCrit ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-24, -6);
      ctx.lineTo(16, -2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = isCrit ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-24, 6);
      ctx.lineTo(16, 2);
      ctx.stroke();

      // Blade Core Spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(16, 0, isCrit ? 3.8 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case CHAMPION_SKILL_VFX_TYPE.ARROW:
    default: {
      // Arrow Shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = isCrit ? 3.5 : 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();

      // Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isCrit ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(4, -5);
      ctx.lineTo(7, 0);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();

      // White tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(6, -2.5);
      ctx.lineTo(8, 0);
      ctx.lineTo(6, 2.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
};

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

        // Smooth flight curve
        const eased = 1 - Math.pow(1 - progress, 2.2);

        const dx = arrow.targetX - arrow.startX;
        const dy = arrow.targetY - arrow.startY;
        const dist = Math.hypot(dx, dy) || 100;
        const perpX = -dy / dist;
        const perpY = dx / dist;

        const sideSign = arrow.team === TEAM_KEY.BLG ? -1 : 1;
        const maxCurve = Math.min(24, dist * 0.12);
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
          progress < 0.1
            ? progress * 10
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

        // Draw Streamer Trail
        drawEsportsTrail(ctx, arrow.team, arrow.isCrit, elapsed);

        // Draw Specific Champion Skill Graphic
        drawSkillGraphic(
          ctx,
          arrow.vfxType || CHAMPION_SKILL_VFX_TYPE.ARROW,
          arrow.color,
          arrow.isCrit,
          elapsed
        );

        // Draw Impact Flash Ring on Arrival at Boss
        if (progress > 0.85) {
          const impactProgress = (progress - 0.85) / 0.15;
          const radius = (arrow.isCrit ? 16 : 10) * (0.6 + impactProgress * 0.8);
          ctx.strokeStyle = arrow.color;
          ctx.lineWidth = 2.0;
          ctx.globalAlpha = clampedOpacity * (1 - impactProgress);
          ctx.beginPath();
          ctx.arc(12, 0, radius, 0, Math.PI * 2);
          ctx.stroke();
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

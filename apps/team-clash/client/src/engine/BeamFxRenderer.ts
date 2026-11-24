import type { CharacterType, TeamPresetConfig } from '../../../shared/types/clash';

export interface RenderBeamsParams {
  ctx: CanvasRenderingContext2D;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  clashX: number;
  clashY: number;
  time: number;
  preset: TeamPresetConfig;
}

export class BeamFxRenderer {
  public renderBeams(params: RenderBeamsParams): void {
    const { ctx, leftX, leftY, rightX, rightY, clashX, clashY, time, preset } = params;

    const leftCharType = preset.leftTeam.characterType || 'girl';
    const rightCharType = preset.rightTeam.characterType || 'boy';

    // 1. Draw Left Team Beam (Left fighter to clash center)
    this.drawCharacterBeam({
      ctx,
      startX: leftX,
      startY: leftY,
      endX: clashX,
      endY: clashY,
      time,
      charType: leftCharType,
      primaryColor: preset.leftTeam.primaryColor,
      secondaryColor: preset.leftTeam.secondaryColor,
      direction: 1
    });

    // 2. Draw Right Team Beam (Right fighter to clash center)
    this.drawCharacterBeam({
      ctx,
      startX: rightX,
      startY: rightY,
      endX: clashX,
      endY: clashY,
      time,
      charType: rightCharType,
      primaryColor: preset.rightTeam.primaryColor,
      secondaryColor: preset.rightTeam.secondaryColor,
      direction: -1
    });
  }

  private drawCharacterBeam(opts: {
    ctx: CanvasRenderingContext2D;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    time: number;
    charType: CharacterType;
    primaryColor: string;
    secondaryColor: string;
    direction: number; // 1 = Left to Right, -1 = Right to Left
  }): void {
    const { ctx, startX, startY, endX, endY, time, charType, primaryColor, secondaryColor, direction } = opts;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    if (length < 10) return;

    ctx.save();

    // Base thick energy stream
    const beamPulse = Math.sin(time * 14) * 4;
    ctx.lineWidth = 26 + beamPulse;
    ctx.strokeStyle = primaryColor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Hot white inner core
    ctx.lineWidth = 10 + beamPulse * 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Specialized visual signature per character type, drawn in beam-aligned space
    // (origin at the hand, +/-X along the beam) so it follows the beam when fighters lean.
    ctx.translate(startX, startY);
    ctx.rotate(Math.atan2(dy, dx) - (direction === 1 ? 0 : Math.PI));
    this.drawSignatureFx(ctx, charType, length, time, direction, primaryColor, secondaryColor);

    ctx.restore();
  }

  private drawSignatureFx(
    ctx: CanvasRenderingContext2D,
    charType: CharacterType,
    length: number,
    time: number,
    direction: number,
    primaryColor: string,
    secondaryColor: string
  ): void {
    const startX = 0;
    const startY = 0;
    switch (charType) {
      case 'girl':
        this.drawGirlBeamFx(ctx, startX, startY, length, time, direction, secondaryColor);
        break;
      case 'boy':
        this.drawBoyBeamFx(ctx, startX, startY, length, time, direction, primaryColor);
        break;
      case 'cat':
        this.drawCatBeamFx(ctx, startX, startY, length, time, direction);
        break;
      case 'dog':
        this.drawDogBeamFx(ctx, startX, startY, length, time, direction);
        break;
      case 'red_fighter':
        this.drawRedFighterBeamFx(ctx, startX, startY, length, time, direction);
        break;
      case 'blue_fighter':
        this.drawBlueFighterBeamFx(ctx, startX, startY, length, time, direction);
        break;
      default:
        break;
    }
  }

  // 1. GIRL BEAM FX: Drifting hearts and sparkle stars
  private drawGirlBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number,
    accentColor: string
  ): void {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const count = 4;
    for (let i = 0; i < count; i++) {
      const progress = ((time * 0.9 + i / count) % 1.0);
      const px = startX + dir * progress * length;
      const py = startY + Math.sin(time * 10 + i * 2) * 12;

      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : accentColor;
      if (i % 2 === 0) {
        // Draw star
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw cute heart glyph
        ctx.fillText('♥', px, py);
      }
    }
  }

  // 2. BOY BEAM FX: Electric zig-zags and diamond sparks
  private drawBoyBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number,
    primaryColor: string
  ): void {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#67e8f9';
    ctx.beginPath();

    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const px = startX + dir * (i / segments) * length;
      const jitter = (i > 0 && i < segments) ? ((i % 2 === 0 ? 1 : -1) * (8 + Math.sin(time * 25 + i) * 6)) : 0;
      const py = startY + jitter;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Floating angular sparks
    ctx.fillStyle = primaryColor;
    for (let i = 0; i < 3; i++) {
      const prog = ((time * 1.4 + i * 0.33) % 1.0);
      const sx = startX + dir * prog * length;
      const sy = startY + Math.cos(time * 12 + i) * 10;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }
  }

  // 3. CAT BEAM FX: Floating cat paws and claw slash marks
  private drawCatBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number
  ): void {
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const count = 3;
    for (let i = 0; i < count; i++) {
      const progress = ((time * 0.8 + i / count) % 1.0);
      const px = startX + dir * progress * length;
      const py = startY + Math.sin(time * 8 + i * 3) * 10;

      ctx.fillStyle = '#ffedd5';
      ctx.fillText('🐾', px, py);
    }

    // Claw slash flashing near clash point
    const slashAlpha = (Math.sin(time * 16) + 1) * 0.4;
    ctx.strokeStyle = `rgba(254, 240, 138, ${slashAlpha})`;
    ctx.lineWidth = 3;
    const nearClashX = startX + dir * (length - 35);
    ctx.beginPath();
    ctx.moveTo(nearClashX - 10, startY - 14);
    ctx.lineTo(nearClashX + 10, startY + 14);
    ctx.moveTo(nearClashX - 5, startY - 16);
    ctx.lineTo(nearClashX + 15, startY + 12);
    ctx.stroke();
  }

  // 4. DOG BEAM FX: Sonic bark shockwave rings and flying bones
  private drawDogBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number
  ): void {
    // Sonic shockwave rings
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const prog = ((time * 1.1 + i / ringCount) % 1.0);
      const rx = startX + dir * prog * length;
      const ringRadius = 8 + prog * 16;
      const alpha = (1 - prog) * 0.7;

      ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(rx, startY, ringRadius * 0.6, ringRadius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Flying energy bone glyph
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const boneProg = ((time * 0.7) % 1.0);
    const bx = startX + dir * boneProg * length;
    const by = startY + Math.sin(time * 7) * 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🦴', bx, by);
  }

  // 5. RED FIGHTER BEAM FX: Fiery vortex spiral
  private drawRedFighterBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number
  ): void {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f97316'; // Vivid orange flame spiral
    ctx.beginPath();

    const points = 16;
    for (let i = 0; i <= points; i++) {
      const prog = i / points;
      const px = startX + dir * prog * length;
      const wave = Math.sin(prog * Math.PI * 4 - time * 18) * 14 * (1 - prog * 0.3);
      const py = startY + wave;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Secondary yellow flame tongue
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const prog = i / points;
      const px = startX + dir * prog * length;
      const wave = Math.cos(prog * Math.PI * 4 - time * 18) * 10 * (1 - prog * 0.3);
      const py = startY + wave;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // 6. BLUE FIGHTER BEAM FX: Jagged frost lightning arcs
  private drawBlueFighterBeamFx(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    time: number,
    dir: number
  ): void {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();

    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const px = startX + dir * prog * length;
      const noise = (i > 0 && i < steps) ? Math.sin(time * 30 + i * 7) * 12 : 0;
      const py = startY + noise;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // White electric needles
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const px = startX + dir * prog * length;
      const noise = (i > 0 && i < steps) ? Math.cos(time * 35 + i * 11) * 8 : 0;
      const py = startY + noise;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  /** Core energy clash orb; its inner ring takes the color of the team currently winning. */
  public renderClashOrb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    isStrobeWarning: boolean,
    preset: TeamPresetConfig,
    shake: number,
    clashPosition: number
  ): void {
    const isLeftAhead = clashPosition >= 50;
    const innerColor = isLeftAhead ? preset.leftTeam.primaryColor : preset.rightTeam.primaryColor;
    const outerColor = isLeftAhead ? preset.rightTeam.primaryColor : preset.leftTeam.primaryColor;
    const basePulse = Math.sin(time * 16) * 6;
    const orbRadius = 34 + basePulse + (shake * 12);

    // 1. Outer Glow Aura
    const grad = ctx.createRadialGradient(x, y, 6, x, y, orbRadius * 2.2);
    grad.addColorStop(0, '#ffffff');
    if (isStrobeWarning) {
      grad.addColorStop(0.3, '#ff0033');
      grad.addColorStop(0.7, '#ff0055');
    } else {
      grad.addColorStop(0.25, innerColor);
      grad.addColorStop(0.65, outerColor);
    }
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, orbRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Solid High Energy Center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, orbRadius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 3. Electrical / Spark Jitter Spikes radiating out from collision point
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2) / spikeCount + time * 12;
      const spikeLen = orbRadius * 1.3 + ((i % 2 === 0 ? 1 : 0) * 14);
      const ex = x + Math.cos(angle) * spikeLen + Math.sin(time * 22 + i) * 5;
      const ey = y + Math.sin(angle) * spikeLen + Math.cos(time * 22 + i) * 5;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }
}

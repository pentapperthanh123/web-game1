import type { TeamPresetConfig } from '../../../shared/types/clash';

export class WaveRenderer {
  public renderWaves(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    clashPosition: number,
    time: number,
    preset: TeamPresetConfig
  ): void {
    const clashX = (clashPosition / 100) * width;

    ctx.save();

    // 1. Fill base backgrounds for Left and Right sides
    ctx.fillStyle = preset.leftTeam.primaryColor;
    ctx.fillRect(0, 0, clashX, height);

    ctx.fillStyle = preset.rightTeam.primaryColor;
    ctx.fillRect(clashX, 0, width - clashX, height);

    // 2. Render Left Flame Waves (Layer 1 - Darker Magenta Flame)
    ctx.fillStyle = '#6b003b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= height; y += 40) {
      const wave = Math.sin(y * 0.02 + time * 2.5) * 28 + Math.cos(y * 0.04 - time * 1.8) * 16;
      const x = Math.min(clashX - 10, (clashX * 0.6) + wave);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // 3. Render Left Flame Waves (Layer 2 - Hot Pink Flame Tongues)
    ctx.fillStyle = preset.leftTeam.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= height; y += 30) {
      const tongue = Math.sin(y * 0.035 - time * 3.0) * 35 + Math.sin(y * 0.08 + time * 2.0) * 15;
      const x = Math.min(clashX - 5, (clashX * 0.85) + tongue);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // 4. Render Right Energy Waves (Layer 1 - Deep Blue Plasma)
    ctx.fillStyle = '#003366';
    ctx.beginPath();
    ctx.moveTo(width, 0);
    for (let y = 0; y <= height; y += 40) {
      const wave = Math.cos(y * 0.025 + time * 2.2) * 25 + Math.sin(y * 0.05 - time * 1.5) * 15;
      const x = Math.max(clashX + 10, width - ((width - clashX) * 0.6) - wave);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 5. Render Right Energy Waves (Layer 2 - Cyan Lightning Streaks)
    ctx.fillStyle = preset.rightTeam.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(width, 0);
    for (let y = 0; y <= height; y += 30) {
      const streak = Math.sin(y * 0.04 + time * 3.2) * 32 + Math.cos(y * 0.07 - time * 2.5) * 12;
      const x = Math.max(clashX + 5, width - ((width - clashX) * 0.85) - streak);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 6. Dividing Clash Border Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= height; y += 20) {
      const jitter = Math.sin(y * 0.05 + time * 8) * 6;
      const x = clashX + jitter;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.restore();
  }
}

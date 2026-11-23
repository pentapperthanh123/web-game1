import { CLASH_STAGE } from '../../../shared/constants/clashConfig';
import type { TeamId, TeamPresetConfig } from '../../../shared/types/clash';
import { BeamFxRenderer } from './BeamFxRenderer';
import { CharacterRenderer } from './CharacterRenderer';
import { ParticlePool } from './ParticlePool';
import { WaveRenderer } from './WaveRenderer';

export class ClashCanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private totalElapsedTime = 0;

  private readonly particlePool = new ParticlePool();
  private readonly waveRenderer = new WaveRenderer();
  private readonly characterRenderer = new CharacterRenderer();
  private readonly beamFxRenderer = new BeamFxRenderer();

  private onTickCallback: ((deltaSeconds: number) => void) | null = null;
  private getClashStateCallback:
    | (() => {
        clashPosition: number;
        preset: TeamPresetConfig;
        isStrobeWarning: boolean;
        screenShake: number;
      })
    | null = null;

  public init(
    canvas: HTMLCanvasElement,
    onTick: (deltaSeconds: number) => void,
    getClashState: () => {
      clashPosition: number;
      preset: TeamPresetConfig;
      isStrobeWarning: boolean;
      screenShake: number;
    }
  ): void {
    this.canvas = canvas;
    this.canvas.width = CLASH_STAGE.WIDTH;
    this.canvas.height = CLASH_STAGE.HEIGHT;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onTickCallback = onTick;
    this.getClashStateCallback = getClashState;
    this.startLoop();
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.particlePool.clear();
    this.canvas = null;
    this.ctx = null;
  }

  public spawnSparks(team: TeamId, count = 6): void {
    if (!this.canvas || !this.getClashStateCallback) return;

    const { clashPosition, preset } = this.getClashStateCallback();
    const clashX = (clashPosition / 100) * CLASH_STAGE.WIDTH;
    const centerY = (CLASH_STAGE.CENTER_STAGE_TOP_Y + CLASH_STAGE.CENTER_STAGE_BOTTOM_Y) / 2 + 43;

    const color = team === 'LEFT' ? preset.leftTeam.primaryColor : preset.rightTeam.primaryColor;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 4;
      const life = 0.3 + Math.random() * 0.4;

      this.particlePool.spawn(clashX, centerY, vx, vy, size, color, life);
    }
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();

    const renderLoop = (currentTime: number) => {
      this.animationFrameId = requestAnimationFrame(renderLoop);

      const elapsed = currentTime - this.lastFrameTime;
      // Lock strictly to 30 FPS target (~33.33ms per frame)
      if (elapsed < CLASH_STAGE.FRAME_INTERVAL_MS) {
        return;
      }

      this.lastFrameTime = currentTime - (elapsed % CLASH_STAGE.FRAME_INTERVAL_MS);
      const deltaSeconds = Math.min(0.1, elapsed / 1000);
      this.totalElapsedTime += deltaSeconds;

      // 1. Tick game logic
      this.onTickCallback?.(deltaSeconds);

      // 2. Update particles
      this.particlePool.update(deltaSeconds);

      // 3. Render Canvas
      this.renderFrame();
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  private renderFrame(): void {
    if (!this.ctx || !this.getClashStateCallback) return;

    const { clashPosition, preset, isStrobeWarning, screenShake } = this.getClashStateCallback();
    const ctx = this.ctx;
    const width = CLASH_STAGE.WIDTH;
    const height = CLASH_STAGE.HEIGHT;
    const clashX = (clashPosition / 100) * width;
    const centerY = (CLASH_STAGE.CENTER_STAGE_TOP_Y + CLASH_STAGE.CENTER_STAGE_BOTTOM_Y) / 2;
    const fighterY = centerY + 120;
    const clashCenterY = centerY + 43;

    const leftFighterX = Math.max(90, clashX - 140);
    const rightFighterX = Math.min(630, clashX + 140);

    const isLeftWinning = clashPosition > 55;
    const isLeftLosing = clashPosition < 45;
    const isRightWinning = clashPosition < 45;
    const isRightLosing = clashPosition > 55;

    ctx.save();

    // Screen Shake effect
    if (screenShake > 0) {
      const maxOffset = screenShake * 10;
      const offsetX = (Math.random() - 0.5) * maxOffset;
      const offsetY = (Math.random() - 0.5) * maxOffset;
      ctx.translate(offsetX, offsetY);
    }

    // A. Render Waves Background
    this.waveRenderer.renderWaves(ctx, width, height, clashPosition, this.totalElapsedTime, preset);

    // B. Render Energy Beams and Central Clash Orb
    this.beamFxRenderer.renderBeamsAndClash({
      ctx,
      leftX: leftFighterX + 46,
      leftY: clashCenterY,
      rightX: rightFighterX - 46,
      rightY: clashCenterY,
      clashX,
      clashY: clashCenterY,
      time: this.totalElapsedTime,
      preset,
      isStrobeWarning,
      screenShake
    });

    // C. Render Left 2D Character (Dynamic cel-shaded vector)
    this.characterRenderer.renderFighter({
      ctx,
      x: leftFighterX,
      y: fighterY,
      time: this.totalElapsedTime,
      type: preset.leftTeam.characterType || 'girl',
      side: 'LEFT',
      primaryColor: preset.leftTeam.primaryColor,
      secondaryColor: preset.leftTeam.secondaryColor,
      isWinning: isLeftWinning,
      isLosing: isLeftLosing,
      screenShake
    });

    // D. Render Right 2D Character (Dynamic cel-shaded vector)
    this.characterRenderer.renderFighter({
      ctx,
      x: rightFighterX,
      y: fighterY,
      time: this.totalElapsedTime,
      type: preset.rightTeam.characterType || 'boy',
      side: 'RIGHT',
      primaryColor: preset.rightTeam.primaryColor,
      secondaryColor: preset.rightTeam.secondaryColor,
      isWinning: isRightWinning,
      isLosing: isRightLosing,
      screenShake
    });

    // E. Render Dynamic Particle Burst
    this.particlePool.render(ctx);

    ctx.restore();
  }
}

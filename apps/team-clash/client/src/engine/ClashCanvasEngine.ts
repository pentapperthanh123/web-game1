import {
  CLASH_ARENA_LAYOUT,
  CLASH_STAGE,
  GIFT_PANEL_CONFIG,
  GIFT_STRIKE_CONFIG,
  PUSH_TIER_IMPULSE,
  PUSH_TIER_SPARKS,
} from '../../../shared/constants/clashConfig';
import type { PushTier, TeamId, TeamPresetConfig } from '../../../shared/types/clash';
import { BeamFxRenderer } from './BeamFxRenderer';
import { CharacterRenderer } from './CharacterRenderer';
import { computeClashLayout, createClashLayout, type ClashLayout } from './clashLayout';
import { GiftStrikeRenderer } from './GiftStrikeRenderer';
import { ParticlePool } from './ParticlePool';
import { WaveRenderer } from './WaveRenderer';

export interface ClashFrameState {
  clashPosition: number;
  preset: TeamPresetConfig;
  isStrobeWarning: boolean;
  screenShake: number;
}

export type LayoutListener = (layout: Readonly<ClashLayout>) => void;

const WINNING_THRESHOLD = 55;
const LOSING_THRESHOLD = 45;
const DUST_COLOR = 'rgba(255, 255, 255, 0.85)';

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
  private readonly giftStrikeRenderer = new GiftStrikeRenderer();

  /** Cached, mutated every frame. */
  private readonly layout: ClashLayout = createClashLayout();
  private leftImpulse = 0;
  private rightImpulse = 0;
  private prevLeftFighterX = Number.NaN;
  private prevRightFighterX = Number.NaN;

  private onTickCallback: ((deltaSeconds: number) => void) | null = null;
  private getClashStateCallback: (() => ClashFrameState) | null = null;
  private layoutListener: LayoutListener | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private stageWidth: number = CLASH_STAGE.WIDTH;
  private stageHeight: number = CLASH_STAGE.HEIGHT;

  public init(
    canvas: HTMLCanvasElement,
    onTick: (deltaSeconds: number) => void,
    getClashState: () => ClashFrameState
  ): void {
    this.canvas = canvas;
    this.stageWidth = canvas.clientWidth || CLASH_STAGE.WIDTH;
    this.stageHeight = canvas.clientHeight || CLASH_STAGE.HEIGHT;
    this.observeStageSize(canvas);
    this.syncCanvasSize();
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.onTickCallback = onTick;
    this.getClashStateCallback = getClashState;
    this.startLoop();
  }

  /**
   * Canvas backing store follows the canvas' CSS box, i.e. the logical (stretched) stage size,
   * 1 canvas px per stage px. Measured by a ResizeObserver so the render loop never reads layout.
   */
  private syncCanvasSize(): void {
    if (!this.canvas) return;
    const width = Math.max(1, Math.round(this.stageWidth));
    const height = Math.max(1, Math.round(this.stageHeight));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  private observeStageSize(canvas: HTMLCanvasElement): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width <= 0 || box.height <= 0) return;
      // contentRect ignores the stage's CSS scale, so this is already in stage px.
      this.stageWidth = box.width;
      this.stageHeight = box.height;
    });
    this.resizeObserver.observe(canvas);
  }

  /** Receives the arena layout after every rendered frame (DOM name plates / feed follow it). */
  public setLayoutListener(listener: LayoutListener | null): void {
    this.layoutListener = listener;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.particlePool.clear();
    this.giftStrikeRenderer.clear();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.layoutListener = null;
    this.canvas = null;
    this.ctx = null;
  }

  private getTeamColor(team: TeamId): string {
    const preset = this.getClashStateCallback?.().preset;
    if (!preset) return '#ffffff';
    return team === 'LEFT' ? preset.leftTeam.primaryColor : preset.rightTeam.primaryColor;
  }

  /**
   * Fly a gift icon from the gift panel into the orb; onImpact runs when it lands.
   * Returns false if the engine is not running or every strike slot is busy.
   */
  public launchGiftStrike(team: TeamId, tier: PushTier, icon: string, onImpact: () => void): boolean {
    if (!this.ctx) return false;
    return this.giftStrikeRenderer.launch(team, tier, icon, this.getTeamColor(team), onImpact);
  }

  /** RPG-style damage number popping out of the clash orb. */
  public showGiftDamage(team: TeamId, tier: PushTier, text: string, critText: string | null): void {
    if (!this.ctx) return;
    // A LEFT gift hits the orb toward the right, so its number pops on the right (and vice versa).
    const hitSide = team === 'LEFT' ? 1 : -1;
    this.giftStrikeRenderer.showDamage(
      this.layout.orbX + hitSide * GIFT_STRIKE_CONFIG.DAMAGE_POP_OFFSET_X,
      this.layout.orbY + GIFT_STRIKE_CONFIG.DAMAGE_POP_OFFSET_Y,
      tier,
      this.getTeamColor(team),
      text,
      critText
    );
  }

  /** Visual reaction to a push that was actually applied: lunge, orb kick and sparks. */
  public applyPush(team: TeamId, tier: PushTier): void {
    if (!this.canvas || !this.getClashStateCallback) return;

    const impulse = PUSH_TIER_IMPULSE[tier];
    if (team === 'LEFT') {
      this.leftImpulse = Math.min(1, this.leftImpulse + impulse);
    } else {
      this.rightImpulse = Math.min(1, this.rightImpulse + impulse);
    }

    const { preset } = this.getClashStateCallback();
    const color = team === 'LEFT' ? preset.leftTeam.primaryColor : preset.rightTeam.primaryColor;
    // Sparks fly out of the orb toward the side being pushed.
    const pushDirection = team === 'LEFT' ? 1 : -1;
    const count = PUSH_TIER_SPARKS[tier];

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 2.5 + Math.random() * 5;
      const vx = Math.cos(angle) * speed * pushDirection;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 4;
      const life = 0.3 + Math.random() * 0.4;

      this.particlePool.spawn(this.layout.orbX, this.layout.orbY, vx, vy, size, color, life);
    }
  }

  public step(deltaSeconds: number): void {
    this.totalElapsedTime += deltaSeconds;

    // 1. Tick game logic
    this.onTickCallback?.(deltaSeconds);

    // 2. Decay push impulses
    const decay = deltaSeconds * CLASH_ARENA_LAYOUT.IMPULSE_DECAY_PER_SECOND;
    this.leftImpulse = Math.max(0, this.leftImpulse - decay);
    this.rightImpulse = Math.max(0, this.rightImpulse - decay);

    // 3. Update particles
    this.particlePool.update(deltaSeconds);

    // 4. Advance gift strikes (impacts apply their gift push from here)
    this.giftStrikeRenderer.update(deltaSeconds);

    // 5. Render Canvas
    this.renderFrame();
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
      this.step(deltaSeconds);
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  /** Dust kicks up under a fighter that is being shoved backwards. */
  private spawnRetreatDust(fighterX: number, footY: number, retreatDirection: number): void {
    const vx = -retreatDirection * (0.5 + Math.random() * 1.5);
    const vy = -(0.8 + Math.random() * 1.6);
    this.particlePool.spawn(
      fighterX + retreatDirection * 30,
      footY,
      vx,
      vy,
      3 + Math.random() * 4,
      DUST_COLOR,
      0.35 + Math.random() * 0.25
    );
  }

  private renderFrame(): void {
    if (!this.ctx || !this.getClashStateCallback) return;

    const { clashPosition, preset, isStrobeWarning, screenShake } = this.getClashStateCallback();
    const ctx = this.ctx;
    this.syncCanvasSize();
    const width = this.stageWidth;
    const height = this.stageHeight;
    const layout = computeClashLayout(
      clashPosition,
      this.leftImpulse,
      this.rightImpulse,
      width,
      this.layout
    );
    // Gifts launch from the bottom-right gift panel, wherever the stretched stage puts it.
    this.giftStrikeRenderer.setOrigin(
      width - GIFT_PANEL_CONFIG.RIGHT_X - GIFT_PANEL_CONFIG.WIDTH + GIFT_STRIKE_CONFIG.ORIGIN_INSET_X,
      GIFT_PANEL_CONFIG.BOTTOM_Y - GIFT_STRIKE_CONFIG.ORIGIN_INSET_Y
    );

    // Retreat dust: left retreats toward -X, right toward +X.
    if (!Number.isNaN(this.prevLeftFighterX)) {
      if (this.prevLeftFighterX - layout.leftFighterX > CLASH_ARENA_LAYOUT.DUST_MIN_SPEED_PX) {
        this.spawnRetreatDust(layout.leftFighterX, layout.fighterY, -1);
      }
      if (layout.rightFighterX - this.prevRightFighterX > CLASH_ARENA_LAYOUT.DUST_MIN_SPEED_PX) {
        this.spawnRetreatDust(layout.rightFighterX, layout.fighterY, 1);
      }
    }
    this.prevLeftFighterX = layout.leftFighterX;
    this.prevRightFighterX = layout.rightFighterX;

    // Pinned fighters tremble under the pressure.
    const strainJitter = CLASH_ARENA_LAYOUT.STRAIN_JITTER_PX;
    const leftStrain =
      clashPosition < CLASH_ARENA_LAYOUT.STRAIN_THRESHOLD_PERCENT
        ? (Math.random() - 0.5) * 2 * strainJitter
        : 0;
    const rightStrain =
      clashPosition > 100 - CLASH_ARENA_LAYOUT.STRAIN_THRESHOLD_PERCENT
        ? (Math.random() - 0.5) * 2 * strainJitter
        : 0;

    const isLeftWinning = clashPosition > WINNING_THRESHOLD;
    const isLeftLosing = clashPosition < LOSING_THRESHOLD;

    ctx.save();

    // Screen Shake effect
    if (screenShake > 0) {
      const maxOffset = screenShake * 10;
      const offsetX = (Math.random() - 0.5) * maxOffset;
      const offsetY = (Math.random() - 0.5) * maxOffset;
      ctx.translate(offsetX, offsetY);
    }

    // A. Territory background — border passes exactly through the clash orb
    this.waveRenderer.renderWaves(ctx, width, height, layout.orbX, this.totalElapsedTime, preset);

    // B. Energy beams from each fighter's hands into the orb
    this.beamFxRenderer.renderBeams({
      ctx,
      leftX: layout.leftHandX + leftStrain,
      leftY: layout.leftHandY,
      rightX: layout.rightHandX + rightStrain,
      rightY: layout.rightHandY,
      clashX: layout.orbX,
      clashY: layout.orbY,
      time: this.totalElapsedTime,
      preset,
    });

    // C. Left fighter
    this.characterRenderer.renderFighter({
      ctx,
      x: layout.leftFighterX + leftStrain,
      y: layout.fighterY,
      time: this.totalElapsedTime,
      type: preset.leftTeam.characterType || 'girl',
      side: 'LEFT',
      primaryColor: preset.leftTeam.primaryColor,
      secondaryColor: preset.leftTeam.secondaryColor,
      isWinning: isLeftWinning,
      isLosing: isLeftLosing,
      leanDeg: layout.leftLeanDeg,
      screenShake,
    });

    // D. Right fighter
    this.characterRenderer.renderFighter({
      ctx,
      x: layout.rightFighterX + rightStrain,
      y: layout.fighterY,
      time: this.totalElapsedTime,
      type: preset.rightTeam.characterType || 'boy',
      side: 'RIGHT',
      primaryColor: preset.rightTeam.primaryColor,
      secondaryColor: preset.rightTeam.secondaryColor,
      isWinning: isLeftLosing,
      isLosing: isLeftWinning,
      leanDeg: layout.rightLeanDeg,
      screenShake,
    });

    // E. Clash orb on top of the hands so the impact point is always readable
    this.beamFxRenderer.renderClashOrb(
      ctx,
      layout.orbX,
      layout.orbY,
      this.totalElapsedTime,
      isStrobeWarning,
      preset,
      screenShake,
      clashPosition
    );

    // F. Dynamic particle burst
    this.particlePool.render(ctx);

    // G. Gift strikes in flight + damage numbers, above everything in the arena
    this.giftStrikeRenderer.render(ctx, layout.orbX, layout.orbY);

    ctx.restore();

    this.layoutListener?.(layout);
  }
}

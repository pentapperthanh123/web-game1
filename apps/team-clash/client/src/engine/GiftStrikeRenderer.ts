import { GIFT_STRIKE_CONFIG } from '../../../shared/constants/clashConfig';
import type { PushTier, TeamId } from '../../../shared/types/clash';

const EMOJI_FONT_STACK = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const DAMAGE_FONT_STACK = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const CRIT_COLOR = '#FDE047';
const DAMAGE_STROKE = 'rgba(10, 6, 24, 0.95)';
const POP_IN_FRACTION = 0.18;
const FADE_START_FRACTION = 0.6;

interface GiftStrike {
  active: boolean;
  team: TeamId;
  tier: PushTier;
  icon: string;
  /** Pre-built canvas font string (no string work per frame). */
  font: string;
  color: string;
  elapsed: number;
  duration: number;
  onImpact: (() => void) | null;
}

interface DamagePop {
  active: boolean;
  text: string;
  critText: string | null;
  font: string;
  critFont: string;
  color: string;
  x: number;
  y: number;
  elapsed: number;
}

/**
 * Gift icons flying from the gift panel into the clash orb, plus RPG-style damage numbers on
 * impact. Fixed pools; a full pool refuses new entries (caller applies the gift instantly).
 */
export class GiftStrikeRenderer {
  private readonly strikes: GiftStrike[] = [];
  private readonly pops: DamagePop[] = [];
  /** Scratch point reused by the bezier evaluation. */
  private readonly point = { x: 0, y: 0 };
  /** Launch point (the gift panel), updated by the engine as the stage resizes. */
  private originX = 0;
  private originY = 0;

  public setOrigin(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  constructor() {
    for (let i = 0; i < GIFT_STRIKE_CONFIG.MAX_IN_FLIGHT; i++) {
      this.strikes.push({
        active: false,
        team: 'LEFT',
        tier: 'SMALL',
        icon: '',
        font: '',
        color: '#ffffff',
        elapsed: 0,
        duration: 1,
        onImpact: null,
      });
    }
    for (let i = 0; i < GIFT_STRIKE_CONFIG.MAX_DAMAGE_POPS; i++) {
      this.pops.push({
        active: false,
        text: '',
        critText: null,
        font: '',
        critFont: '',
        color: '#ffffff',
        x: 0,
        y: 0,
        elapsed: 0,
      });
    }
  }

  /** Returns false when every slot is busy (caller should apply the gift immediately). */
  public launch(team: TeamId, tier: PushTier, icon: string, color: string, onImpact: () => void): boolean {
    const strike = this.strikes.find((item) => !item.active);
    if (!strike) return false;

    strike.active = true;
    strike.team = team;
    strike.tier = tier;
    strike.icon = icon;
    strike.font = `${GIFT_STRIKE_CONFIG.ICON_SIZE_PX[tier]}px ${EMOJI_FONT_STACK}`;
    strike.color = color;
    strike.elapsed = 0;
    strike.duration = GIFT_STRIKE_CONFIG.FLIGHT_SECONDS[tier];
    strike.onImpact = onImpact;
    return true;
  }

  /** Floating damage number at the impact point; drops the pop when the pool is full. */
  public showDamage(x: number, y: number, tier: PushTier, color: string, text: string, critText: string | null): void {
    const pop = this.pops.find((item) => !item.active);
    if (!pop) return;

    const fontPx = GIFT_STRIKE_CONFIG.DAMAGE_FONT_PX[tier];
    pop.active = true;
    pop.text = text;
    pop.critText = critText;
    pop.font = `italic 900 ${fontPx}px ${DAMAGE_FONT_STACK}`;
    pop.critFont = `italic 900 ${Math.round(fontPx * 0.6)}px ${DAMAGE_FONT_STACK}`;
    pop.color = color;
    pop.x = x;
    pop.y = y;
    pop.elapsed = 0;
  }

  public clear(): void {
    for (const strike of this.strikes) {
      strike.active = false;
      strike.onImpact = null;
    }
    for (const pop of this.pops) pop.active = false;
  }

  /** Advances flights; fires onImpact for strikes that reached the orb this frame. */
  public update(deltaSeconds: number): void {
    for (const strike of this.strikes) {
      if (!strike.active) continue;
      strike.elapsed += deltaSeconds;
      if (strike.elapsed >= strike.duration) {
        const onImpact = strike.onImpact;
        strike.active = false;
        strike.onImpact = null;
        onImpact?.();
      }
    }
    for (const pop of this.pops) {
      if (!pop.active) continue;
      pop.elapsed += deltaSeconds;
      if (pop.elapsed >= GIFT_STRIKE_CONFIG.DAMAGE_POP_SECONDS) pop.active = false;
    }
  }

  /**
   * Quadratic curve: panel → swing out to the giver's side above the orb → orb.
   * Ending tangent points from the giver's side, so the hit visibly shoves the orb the right way.
   */
  private evaluate(progress: number, team: TeamId, orbX: number, orbY: number): { x: number; y: number } {
    const side = team === 'LEFT' ? -1 : 1;
    const controlX = orbX + side * GIFT_STRIKE_CONFIG.ARC_SIDE_PX;
    const controlY = orbY - GIFT_STRIKE_CONFIG.ARC_LIFT_PX;
    const inv = 1 - progress;
    this.point.x =
      inv * inv * this.originX + 2 * inv * progress * controlX + progress * progress * orbX;
    this.point.y =
      inv * inv * this.originY + 2 * inv * progress * controlY + progress * progress * orbY;
    return this.point;
  }

  public render(ctx: CanvasRenderingContext2D, orbX: number, orbY: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const strike of this.strikes) {
      if (!strike.active) continue;
      const t = Math.min(1, strike.elapsed / strike.duration);
      const iconPx = GIFT_STRIKE_CONFIG.ICON_SIZE_PX[strike.tier];
      ctx.font = strike.font;

      // Fading trail of ghost icons
      for (let ghost = GIFT_STRIKE_CONFIG.TRAIL_GHOSTS; ghost >= 1; ghost--) {
        const ghostT = t - ghost * GIFT_STRIKE_CONFIG.TRAIL_STEP;
        if (ghostT <= 0) continue;
        const p = this.evaluate(Math.pow(ghostT, GIFT_STRIKE_CONFIG.EASE_POWER), strike.team, orbX, orbY);
        ctx.globalAlpha = 0.35 * (1 - ghost / (GIFT_STRIKE_CONFIG.TRAIL_GHOSTS + 1));
        ctx.fillText(strike.icon, p.x, p.y);
      }

      const head = this.evaluate(Math.pow(t, GIFT_STRIKE_CONFIG.EASE_POWER), strike.team, orbX, orbY);
      // Team-colored glow behind the icon
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = strike.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, iconPx * 0.62, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillText(strike.icon, head.x, head.y);
    }

    for (const pop of this.pops) {
      if (!pop.active) continue;
      const t = pop.elapsed / GIFT_STRIKE_CONFIG.DAMAGE_POP_SECONDS;
      const rise = (1 - (1 - t) * (1 - t)) * GIFT_STRIKE_CONFIG.DAMAGE_POP_RISE_PX;
      const scale = t < POP_IN_FRACTION ? 1.6 - (0.6 * t) / POP_IN_FRACTION : 1;
      const alpha = t < FADE_START_FRACTION ? 1 : 1 - (t - FADE_START_FRACTION) / (1 - FADE_START_FRACTION);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(pop.x, pop.y - rise);
      ctx.scale(scale, scale);
      ctx.lineJoin = 'round';

      ctx.font = pop.font;
      ctx.lineWidth = 7;
      ctx.strokeStyle = DAMAGE_STROKE;
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);

      if (pop.critText) {
        ctx.font = pop.critFont;
        ctx.lineWidth = 5;
        ctx.strokeText(pop.critText, 0, -GIFT_STRIKE_CONFIG.DAMAGE_FONT_PX.LARGE * 0.8);
        ctx.fillStyle = CRIT_COLOR;
        ctx.fillText(pop.critText, 0, -GIFT_STRIKE_CONFIG.DAMAGE_FONT_PX.LARGE * 0.8);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

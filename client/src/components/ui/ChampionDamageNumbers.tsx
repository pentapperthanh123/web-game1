import React, { useEffect, useRef } from 'react';
import { DAMAGE_TYPE, GAME_CONSTANTS } from '../../constants/game';
import { ChampionHitEvent, onChampionHit } from '../../services/championHitFeedback';
import { DamageTextSprite, getDamageTextSprite } from './damageTextSprites';

const NUMBER_LIFETIME_MS = 1100;
/** On-screen cap: when full, new numbers are dropped (in-flight ones are never cut). */
const MAX_ACTIVE_NUMBERS = 48;
const RISE_DISTANCE_PX = 28;
/** Numbers start above the token's HP bar instead of on top of the portrait. */
const START_OFFSET_Y_PX = -26;
/** High exponent: the number stays fully opaque for most of its life and only fades at the end. */
const FADE_EXPONENT = 3;
const POP = { GROW_END: 0.16, START_SCALE: 0.7, PEAK_SCALE: 1.25, SETTLE_SCALE: 1 } as const;
const HIT_SCALE = 1;
const LETHAL_SCALE = 1.25;
const LETHAL_PREFIX = '💀 ';

interface DamageNumber {
  x: number;
  y: number;
  scale: number;
  createdAt: number;
  sprite: DamageTextSprite;
}

const getPopScale = (progress: number): number => {
  if (progress < POP.GROW_END) {
    return POP.START_SCALE + (progress / POP.GROW_END) * (POP.PEAK_SCALE - POP.START_SCALE);
  }
  return POP.PEAK_SCALE - ((progress - POP.GROW_END) / (1 - POP.GROW_END)) * (POP.PEAK_SCALE - POP.SETTLE_SCALE);
};

const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);

const resolvePixelRatio = (): number => Math.min(window.devicePixelRatio || 1, GAME_CONSTANTS.RENDER.DPR_MAX);

const buildDamageNumber = (event: ChampionHitEvent): DamageNumber | null => {
  if (event.amount <= 0) return null;
  const amountLabel = `-${Math.round(event.amount).toLocaleString()}`;
  const label = event.isLethal ? `${LETHAL_PREFIX}${amountLabel}` : amountLabel;
  const sprite = getDamageTextSprite(label, DAMAGE_TYPE.NORMAL, event.color);
  if (!sprite) return null;
  return {
    x: event.screenX,
    y: event.screenY + START_OFFSET_Y_PX,
    scale: event.isLethal ? LETHAL_SCALE : HIT_SCALE,
    createdAt: event.createdAt,
    sprite,
  };
};

/** Draws the live numbers and compacts expired ones in place. Returns how many are still alive. */
const drawDamageNumbers = (ctx: CanvasRenderingContext2D, numbers: DamageNumber[], pixelRatio: number, now: number): number => {
  let activeCount = 0;
  for (let index = 0; index < numbers.length; index += 1) {
    const item = numbers[index];
    const progress = (now - item.createdAt) / NUMBER_LIFETIME_MS;
    if (progress >= 1) continue;
    numbers[activeCount] = item;
    activeCount += 1;

    const scale = item.scale * getPopScale(progress) * pixelRatio;
    const offsetY = -easeOutCubic(progress) * RISE_DISTANCE_PX;
    const { image, width, height } = item.sprite;
    ctx.globalAlpha = Math.max(0, 1 - Math.pow(progress, FADE_EXPONENT));
    ctx.setTransform(scale, 0, 0, scale, item.x * pixelRatio, (item.y + offsetY) * pixelRatio);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  }
  numbers.length = activeCount;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  return activeCount;
};

/**
 * Full-screen canvas for the damage champions take from the boss ("-95", "💀 -140").
 * Fed by `championHitFeedback` (not the store), and the render loop only runs while numbers are alive.
 */
export const ChampionDamageNumbers = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const numbers: DamageNumber[] = [];
    let frameId: number | null = null;
    let pixelRatio = resolvePixelRatio();

    const resizeCanvas = () => {
      pixelRatio = resolvePixelRatio();
      canvas.width = Math.round(window.innerWidth * pixelRatio);
      canvas.height = Math.round(window.innerHeight * pixelRatio);
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const activeCount = drawDamageNumbers(ctx, numbers, pixelRatio, Date.now());
      frameId = activeCount > 0 ? requestAnimationFrame(renderFrame) : null;
    };

    const handleHit = (event: ChampionHitEvent) => {
      if (numbers.length >= MAX_ACTIVE_NUMBERS) return;
      const damageNumber = buildDamageNumber(event);
      if (!damageNumber) return;
      numbers.push(damageNumber);
      if (frameId === null) frameId = requestAnimationFrame(renderFrame);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const unsubscribe = onChampionHit(handleHit);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', resizeCanvas);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none z-30" />;
});

ChampionDamageNumbers.displayName = 'ChampionDamageNumbers';

import type { CharacterType, TeamId, TeamPresetConfig } from '../../../shared/types/clash';
import { characterRenderer } from './CharacterRenderer';

/** Output size of a portrait image (px); displayed at 32–64px, so 2× is plenty sharp. */
const PORTRAIT_SIZE_PX = 160;
/** Bust framing in the fighter's local space (feet at 0,0): head center and half-extent. */
const PORTRAIT_FOCUS_X = 4;
const PORTRAIT_FOCUS_Y = -112;
const PORTRAIT_HALF_EXTENT = 46;

const portraitCache = new Map<string, string>();

/**
 * Head-and-shoulders portrait of an arena fighter, drawn with the exact same vector art as the
 * stage (frozen pose, facing the opponent like on stage). Returned as a cached PNG data URL so it
 * can be used anywhere an avatar image is expected.
 */
export function getCharacterPortrait(
  type: CharacterType,
  side: TeamId,
  primaryColor: string,
  secondaryColor: string
): string | undefined {
  const cacheKey = `${type}|${side}|${primaryColor}|${secondaryColor}`;
  const cached = portraitCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_SIZE_PX;
  canvas.height = PORTRAIT_SIZE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  // Team-colored backdrop so the portrait reads as that team even at small sizes.
  const half = PORTRAIT_SIZE_PX / 2;
  const backdrop = ctx.createRadialGradient(half, half * 0.8, 8, half, half, half * 1.15);
  backdrop.addColorStop(0, secondaryColor);
  backdrop.addColorStop(1, primaryColor);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, PORTRAIT_SIZE_PX, PORTRAIT_SIZE_PX);

  // Map the bust region onto the canvas; the renderer mirrors the RIGHT side itself.
  const scale = half / PORTRAIT_HALF_EXTENT;
  const mirroredFocusX = side === 'RIGHT' ? -PORTRAIT_FOCUS_X : PORTRAIT_FOCUS_X;
  ctx.translate(half - mirroredFocusX * scale, half - PORTRAIT_FOCUS_Y * scale);
  ctx.scale(scale, scale);
  characterRenderer.renderFighter({
    ctx,
    x: 0,
    y: 0,
    time: 0,
    type,
    side,
    primaryColor,
    secondaryColor,
    isWinning: false,
    isLosing: false,
    leanDeg: 0,
    screenShake: 0,
  });

  const dataUrl = canvas.toDataURL('image/png');
  portraitCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/** Portrait of the fighter a preset uses for one side (same character fallback as the arena). */
export function getTeamPortrait(preset: TeamPresetConfig, side: TeamId): string | undefined {
  const team = side === 'LEFT' ? preset.leftTeam : preset.rightTeam;
  const type: CharacterType = team.characterType || (side === 'LEFT' ? 'girl' : 'boy');
  return getCharacterPortrait(type, side, team.primaryColor, team.secondaryColor) ?? team.avatarUrl;
}

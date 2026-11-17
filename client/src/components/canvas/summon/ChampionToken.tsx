import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getTeamTheme } from '../../../constants/teams';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS, isEliteMinion } from '../../../constants/game';
import { MinionEntity } from '../../../types/game';
import { TeamColorThemeId } from '../../../types/team';
import { SessionTier } from '../../../constants/sessionLeaderboard';
import { getActiveStatusEffects } from '../../../utils/statusEffects';
import { ChampionEntranceAuraMeshes } from './ChampionEntranceAuraMeshes';
import {
  FURY_COLOR_FULL,
  SHARED_NAMEPLATE_GEO,
  SHARED_SHIELD_RING_GEO,
  SHARED_SIGNATURE_HALO_GEO,
  SHARED_ELITE_AURA_RING_GEO,
  SHARED_ELITE_FLOOR_AURA_GEO,
  getChampionTexture,
  getFuryFillColor,
  getNameplateTexture,
} from './summonShared';
import { SHARED_TOKEN_BODY_GEO, createTokenBodyMaterial, syncTokenBodyMaterial } from './tokenBodyMaterial';

/**
 * Tokens are flat quads that always face the camera, so only the front face is drawn.
 * DoubleSide on a transparent material makes three.js render it twice (back pass + front pass),
 * which doubled the draw calls per champion.
 */
const TOKEN_FACE_SIDE = THREE.FrontSide;

const STATUS_RING_OPACITY = 0.7;
export const SIGNATURE_HALO_OPACITY = 0.85;

const GAUGE_STYLE = {
  BG_COLOR: '#020617',
  FURY_BORDER_FULL_OPACITY: 0.98,
  FURY_BORDER_IDLE_OPACITY: 0.72,
  FURY_BORDER_IDLE_COLOR: '#1d4ed8',
} as const;

const HP_COLOR = { HEALTHY: '#10b981', WOUNDED: '#f59e0b', CRITICAL: '#ef4444' } as const;
const HP_THRESHOLD = { HEALTHY: 0.5, WOUNDED: 0.25 } as const;
const DEFAULT_MAX_HP = 100;

export interface ChampionTokenProps {
  minion: MinionEntity;
  /** Team colour theme id; resolved here so the token needs no store subscription of its own. */
  colorThemeId: TeamColorThemeId | undefined;
  shouldUseUserAvatar: boolean;
  /** Crowded field: draw only portrait, border and HP (fewer draw calls). */
  isCompact: boolean;
  hasNameplate: boolean;
  /** Live-session tier of the summoner: emblem on the nameplate. Passed in, never subscribed per token. */
  sessionTier: SessionTier | undefined;
}

const getHpFillColor = (hpRatio: number): string => {
  if (hpRatio > HP_THRESHOLD.HEALTHY) return HP_COLOR.HEALTHY;
  if (hpRatio > HP_THRESHOLD.WOUNDED) return HP_COLOR.WOUNDED;
  return HP_COLOR.CRITICAL;
};

const isFuryFull = (minion: MinionEntity): boolean =>
  minion.fury >= (minion.maxFury || GAME_CONSTANTS.MINION_FURY.MAX_FURY);

const areMinionVisualsEqual = (a: MinionEntity, b: MinionEntity, isCompact: boolean): boolean => {
  // In compact mode only "fury is full" is drawn, so intermediate fury ticks must not re-render
  const isFuryUnchanged = isCompact ? isFuryFull(a) === isFuryFull(b) : a.fury === b.fury;
  return (
    isFuryUnchanged &&
    a.id === b.id &&
    a.hp === b.hp &&
    a.maxHp === b.maxHp &&
    a.maxFury === b.maxFury &&
    a.avatarUrl === b.avatarUrl &&
    a.userAvatarUrl === b.userAvatarUrl &&
    a.team === b.team &&
    a.summonerName === b.summonerName &&
    a.signaturePlayerName === b.signaturePlayerName &&
    a.isSignatureSynergy === b.isSignatureSynergy &&
    a.isElite === b.isElite &&
    (a.statusEffects?.length ?? 0) === (b.statusEffects?.length ?? 0)
  );
};

const areChampionTokenPropsEqual = (prev: ChampionTokenProps, next: ChampionTokenProps): boolean => {
  const isLayoutEqual =
    prev.isCompact === next.isCompact &&
    prev.hasNameplate === next.hasNameplate &&
    prev.sessionTier === next.sessionTier &&
    prev.colorThemeId === next.colorThemeId &&
    prev.shouldUseUserAvatar === next.shouldUseUserAvatar;
  if (!isLayoutEqual) return false;
  return areMinionVisualsEqual(prev.minion, next.minion, next.isCompact);
};

export const ChampionToken = React.memo(
  ({ minion, colorThemeId, shouldUseUserAvatar, isCompact, hasNameplate, sessionTier }: ChampionTokenProps) => {
    const teamTheme = getTeamTheme(colorThemeId);
    const primaryColor = teamTheme.primaryHex;
    const critColor = teamTheme.critHex;

    const displayAvatarUrl = shouldUseUserAvatar && minion.userAvatarUrl ? minion.userAvatarUrl : minion.avatarUrl;
    const texture = useMemo(() => getChampionTexture(displayAvatarUrl), [displayAvatarUrl]);
    const isSignature = Boolean(minion.isSignatureSynergy);
    const isElite = isEliteMinion(minion);
    const signatureColor = GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR;
    const eliteColor = isSignature || isElite ? signatureColor : primaryColor;
    const nameplateTexture = useMemo(() => {
      if (!hasNameplate) return null;
      return getNameplateTexture(
        minion.championName,
        minion.summonerName,
        minion.team,
        primaryColor,
        minion.signaturePlayerName,
        sessionTier
      );
    }, [hasNameplate, minion.championName, minion.summonerName, minion.team, primaryColor, minion.signaturePlayerName, sessionTier]);

    const activeStatusEffect = getActiveStatusEffects(minion, Date.now())[0] ?? null;

    const maxHp = minion.maxHp || DEFAULT_MAX_HP;
    const currentHp = Math.max(0, minion.hp !== undefined ? minion.hp : maxHp);
    const hpRatio = Math.min(1.0, Math.max(0.0, currentHp / maxHp));

    const maxFury = minion.maxFury || GAME_CONSTANTS.MINION_FURY.MAX_FURY;
    const furyRatio = Math.min(1.0, Math.max(0.0, Math.max(0, minion.fury ?? 0) / maxFury));
    const isFullFury = furyRatio >= 1.0;
    // Compact tokens have no fury bar, so a full fury is shown by a gold border instead
    const borderColor = isCompact && isFullFury ? FURY_COLOR_FULL : primaryColor;

    const bodyMaterial = useMemo(() => createTokenBodyMaterial(), []);
    useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);
    useLayoutEffect(() => {
      syncTokenBodyMaterial(bodyMaterial, {
        portrait: texture,
        primaryColor,
        borderColor,
        secondaryColor: teamTheme.secondaryHex,
        critColor,
        gaugeBgColor: GAUGE_STYLE.BG_COLOR,
        hpRatio,
        hpFillColor: getHpFillColor(hpRatio),
        furyRatio,
        furyFillColor: getFuryFillColor(furyRatio),
        furyBorderColor: isFullFury ? FURY_COLOR_FULL : GAUGE_STYLE.FURY_BORDER_IDLE_COLOR,
        furyBorderOpacity: isFullFury ? GAUGE_STYLE.FURY_BORDER_FULL_OPACITY : GAUGE_STYLE.FURY_BORDER_IDLE_OPACITY,
        isCompact,
      });
    });

    return (
      <group>
        <mesh geometry={SHARED_TOKEN_BODY_GEO} material={bodyMaterial} />

        <ChampionEntranceAuraMeshes auraColor={isSignature ? signatureColor : primaryColor} accentColor={isSignature ? signatureColor : critColor} />

        {nameplateTexture && (
          <mesh
            position={[0, COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Y, COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Z]}
            geometry={SHARED_NAMEPLATE_GEO}
            renderOrder={100}
          >
            <meshBasicMaterial map={nameplateTexture} transparent depthWrite={false} side={TOKEN_FACE_SIDE} />
          </mesh>
        )}

        {isSignature && (
          <mesh name="signature-synergy-halo" visible={false} position={[0, 0, -0.025]} geometry={SHARED_SIGNATURE_HALO_GEO}>
            <meshBasicMaterial color={signatureColor} transparent opacity={SIGNATURE_HALO_OPACITY} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
          </mesh>
        )}

        {isElite && (
          <>
            {/* VIP Golden Halo around token avatar */}
            <mesh
              name="elite-vip-aura"
              position={[0, 0, -0.02]}
              geometry={SHARED_ELITE_AURA_RING_GEO}
            >
              <meshBasicMaterial
                color={eliteColor}
                transparent
                opacity={0.88}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={TOKEN_FACE_SIDE}
              />
            </mesh>

            {/* Rotating Ground Aura beneath Champion */}
            <mesh
              name="elite-floor-aura"
              position={[0, -0.24, -0.01]}
              rotation={[-Math.PI / 2.3, 0, 0]}
              geometry={SHARED_ELITE_FLOOR_AURA_GEO}
            >
              <meshBasicMaterial
                color={eliteColor}
                transparent
                opacity={0.75}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </>
        )}

        {activeStatusEffect && (
          <mesh position={[0, 0, 0.034]} name="status-ring" geometry={SHARED_SHIELD_RING_GEO}>
            <meshBasicMaterial color={activeStatusEffect.color} transparent opacity={STATUS_RING_OPACITY} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
          </mesh>
        )}

        <mesh position={[0, 0, 0.035]} name="invuln-shield" visible={false} geometry={SHARED_SHIELD_RING_GEO}>
          <meshBasicMaterial color="#facc15" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
        </mesh>
      </group>
    );
  },
  areChampionTokenPropsEqual
);

ChampionToken.displayName = 'ChampionToken';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getTeamTheme } from '../../../constants/teams';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS } from '../../../constants/game';
import { MinionEntity } from '../../../types/game';
import { TeamColorThemeId } from '../../../types/team';
import { getActiveStatusEffects } from '../../../utils/statusEffects';
import { ChampionEntranceAuraMeshes } from './ChampionEntranceAuraMeshes';
import { GaugeBar } from './TokenGaugeBar';
import {
  FURY_COLOR_FULL,
  SHARED_BACKING_DISC_GEO,
  SHARED_CELESTIAL_AURA_GEO,
  SHARED_FURY_BG_GEO,
  SHARED_FURY_BORDER_GEO,
  SHARED_FURY_FILL_GEO,
  SHARED_HP_BG_GEO,
  SHARED_HP_BORDER_GEO,
  SHARED_HP_FILL_GEO,
  SHARED_NAMEPLATE_GEO,
  SHARED_PORTRAIT_GEO,
  SHARED_RUNIC_RING_GEO,
  SHARED_SATELLITE_GEO,
  SHARED_SHIELD_RING_GEO,
  SHARED_TORUS_BORDER_GEO,
  getChampionTexture,
  getFuryFillColor,
  getNameplateTexture,
} from './summonShared';

/**
 * Tokens are flat quads that always face the camera, so only the front face is drawn.
 * DoubleSide on a transparent material makes three.js render it twice (back pass + front pass),
 * which doubled the draw calls per champion.
 */
const TOKEN_FACE_SIDE = THREE.FrontSide;

const STATUS_RING_OPACITY = 0.7;
const TOKEN_GLOW_OPACITY = {
  BACKING_DISC: 0.22,
  BORDER: 0.7,
  RUNIC_RING: 0.35,
  SATELLITE: 0.6,
  SIGNATURE_HALO: 0.4,
} as const;

const GAUGE_LAYOUT = {
  HP_Y: 0.295,
  FURY_Y: 0.238,
  Z: 0.03,
  HP_BG_OPACITY: 0.9,
  HP_BORDER_OPACITY: 0.8,
  HP_FILL_OPACITY: 0.95,
  FURY_BG_OPACITY: 0.92,
  FURY_FILL_OPACITY: 0.98,
  FURY_BORDER_FULL_OPACITY: 0.98,
  FURY_BORDER_IDLE_OPACITY: 0.72,
  FURY_BORDER_IDLE_COLOR: '#f59e0b',
  BG_COLOR: '#020617',
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
    (a.statusEffects?.length ?? 0) === (b.statusEffects?.length ?? 0)
  );
};

const areChampionTokenPropsEqual = (prev: ChampionTokenProps, next: ChampionTokenProps): boolean => {
  const isLayoutEqual =
    prev.isCompact === next.isCompact &&
    prev.hasNameplate === next.hasNameplate &&
    prev.colorThemeId === next.colorThemeId &&
    prev.shouldUseUserAvatar === next.shouldUseUserAvatar;
  if (!isLayoutEqual) return false;
  return areMinionVisualsEqual(prev.minion, next.minion, next.isCompact);
};

export const ChampionToken = React.memo(
  ({ minion, colorThemeId, shouldUseUserAvatar, isCompact, hasNameplate }: ChampionTokenProps) => {
    const teamTheme = getTeamTheme(colorThemeId);
    const primaryColor = teamTheme.primaryHex;
    const critColor = teamTheme.critHex;

    const displayAvatarUrl = shouldUseUserAvatar && minion.userAvatarUrl ? minion.userAvatarUrl : minion.avatarUrl;
    const texture = useMemo(() => getChampionTexture(displayAvatarUrl), [displayAvatarUrl]);
    const isSignature = Boolean(minion.isSignatureSynergy);
    const signatureColor = GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR;
    const nameplateTexture = useMemo(() => {
      if (!hasNameplate) return null;
      return getNameplateTexture(minion.summonerName, minion.team, primaryColor, minion.signaturePlayerName);
    }, [hasNameplate, minion.summonerName, minion.team, primaryColor, minion.signaturePlayerName]);

    const activeStatusEffect = getActiveStatusEffects(minion, Date.now())[0] ?? null;

    const maxHp = minion.maxHp || DEFAULT_MAX_HP;
    const currentHp = Math.max(0, minion.hp !== undefined ? minion.hp : maxHp);
    const hpRatio = Math.min(1.0, Math.max(0.0, currentHp / maxHp));

    const maxFury = minion.maxFury || GAME_CONSTANTS.MINION_FURY.MAX_FURY;
    const furyRatio = Math.min(1.0, Math.max(0.0, Math.max(0, minion.fury ?? 0) / maxFury));
    const isFullFury = furyRatio >= 1.0;
    // Compact tokens have no fury bar, so a full fury is shown by a gold border instead
    const borderColor = isCompact && isFullFury ? FURY_COLOR_FULL : primaryColor;

    return (
      <group>
        <mesh position={[0, 0, -0.02]} geometry={SHARED_BACKING_DISC_GEO}>
          <meshBasicMaterial color={primaryColor} transparent opacity={TOKEN_GLOW_OPACITY.BACKING_DISC} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
        </mesh>

        <mesh position={[0, 0, 0]} geometry={SHARED_PORTRAIT_GEO}>
          <meshBasicMaterial map={texture} transparent side={TOKEN_FACE_SIDE} toneMapped={false} />
        </mesh>

        <mesh position={[0, 0, 0.01]} geometry={SHARED_TORUS_BORDER_GEO}>
          <meshBasicMaterial color={borderColor} transparent opacity={TOKEN_GLOW_OPACITY.BORDER} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>

        {!isCompact && (
          <>
            <mesh name="runic-ring" position={[0, 0, 0.02]} geometry={SHARED_RUNIC_RING_GEO}>
              <meshBasicMaterial color={teamTheme.secondaryHex} transparent opacity={TOKEN_GLOW_OPACITY.RUNIC_RING} depthWrite={false} blending={THREE.AdditiveBlending} side={TOKEN_FACE_SIDE} />
            </mesh>
            <mesh position={[0, 0.22, 0.02]} geometry={SHARED_SATELLITE_GEO}>
              <meshBasicMaterial color={critColor} transparent opacity={TOKEN_GLOW_OPACITY.SATELLITE} blending={THREE.AdditiveBlending} />
            </mesh>
          </>
        )}

        <GaugeBar
          positionY={GAUGE_LAYOUT.HP_Y}
          positionZ={GAUGE_LAYOUT.Z}
          ratio={hpRatio}
          fillColor={getHpFillColor(hpRatio)}
          borderColor={primaryColor}
          bgColor={GAUGE_LAYOUT.BG_COLOR}
          bgOpacity={GAUGE_LAYOUT.HP_BG_OPACITY}
          borderOpacity={GAUGE_LAYOUT.HP_BORDER_OPACITY}
          fillOpacity={GAUGE_LAYOUT.HP_FILL_OPACITY}
          bgGeometry={SHARED_HP_BG_GEO}
          borderGeometry={SHARED_HP_BORDER_GEO}
          fillGeometry={SHARED_HP_FILL_GEO}
          side={TOKEN_FACE_SIDE}
        />

        {!isCompact && (
          <GaugeBar
            positionY={GAUGE_LAYOUT.FURY_Y}
            positionZ={GAUGE_LAYOUT.Z}
            ratio={furyRatio}
            fillColor={getFuryFillColor(furyRatio)}
            borderColor={isFullFury ? FURY_COLOR_FULL : GAUGE_LAYOUT.FURY_BORDER_IDLE_COLOR}
            bgColor={GAUGE_LAYOUT.BG_COLOR}
            bgOpacity={GAUGE_LAYOUT.FURY_BG_OPACITY}
            borderOpacity={isFullFury ? GAUGE_LAYOUT.FURY_BORDER_FULL_OPACITY : GAUGE_LAYOUT.FURY_BORDER_IDLE_OPACITY}
            fillOpacity={GAUGE_LAYOUT.FURY_FILL_OPACITY}
            bgGeometry={SHARED_FURY_BG_GEO}
            borderGeometry={SHARED_FURY_BORDER_GEO}
            fillGeometry={SHARED_FURY_FILL_GEO}
            side={TOKEN_FACE_SIDE}
          />
        )}

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
          <mesh name="signature-synergy-halo" position={[0, 0, -0.025]} geometry={SHARED_CELESTIAL_AURA_GEO}>
            <meshBasicMaterial color={signatureColor} transparent opacity={TOKEN_GLOW_OPACITY.SIGNATURE_HALO} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
          </mesh>
        )}

        {activeStatusEffect && (
          <mesh position={[0, 0, 0.034]} name="status-ring" geometry={SHARED_SHIELD_RING_GEO}>
            <meshBasicMaterial color={activeStatusEffect.color} transparent opacity={STATUS_RING_OPACITY} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
          </mesh>
        )}

        <mesh position={[0, 0, 0.035]} name="invuln-shield" geometry={SHARED_SHIELD_RING_GEO}>
          <meshBasicMaterial color="#facc15" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={TOKEN_FACE_SIDE} />
        </mesh>
      </group>
    );
  },
  areChampionTokenPropsEqual
);

ChampionToken.displayName = 'ChampionToken';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../store/gameStore';
import { getTeamTheme } from '../../../constants/teams';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS } from '../../../constants/game';
import { MinionEntity } from '../../../types/game';
import { getActiveStatusEffects } from '../../../utils/statusEffects';

const STATUS_RING_OPACITY = 0.92;
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
  SHARED_LANDING_RING_GEO,
  SHARED_LIGHT_BEAM_GEO,
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

interface ChampionTokenProps {
  minion: MinionEntity;
}

const getHpFillColor = (hpRatio: number): string => {
  if (hpRatio > 0.5) return '#10b981';
  if (hpRatio > 0.25) return '#f59e0b';
  return '#ef4444';
};

const areChampionTokenPropsEqual = (
  prev: ChampionTokenProps,
  next: ChampionTokenProps
): boolean => {
  const a = prev.minion;
  const b = next.minion;
  return (
    a.id === b.id &&
    a.hp === b.hp &&
    a.maxHp === b.maxHp &&
    a.fury === b.fury &&
    a.maxFury === b.maxFury &&
    a.avatarUrl === b.avatarUrl &&
    a.team === b.team &&
    a.summonerName === b.summonerName &&
    a.signaturePlayerName === b.signaturePlayerName &&
    a.isSignatureSynergy === b.isSignatureSynergy &&
    (a.statusEffects?.length ?? 0) === (b.statusEffects?.length ?? 0)
  );
};

export const ChampionToken = React.memo(({ minion }: ChampionTokenProps) => {
  const teamProfile = useGameStore((state) => state.activeTeams[minion.team]);
  const teamTheme = getTeamTheme(teamProfile?.colorTheme);
  const primaryColor = teamTheme.primaryHex;
  const secondaryColor = teamTheme.secondaryHex;
  const critColor = teamTheme.critHex;

  const texture = useMemo(() => getChampionTexture(minion.avatarUrl), [minion.avatarUrl]);
  const isSignature = Boolean(minion.isSignatureSynergy);
  const nameplateTexture = useMemo(
    () =>
      getNameplateTexture(
        minion.summonerName,
        minion.team,
        primaryColor,
        minion.signaturePlayerName
      ),
    [minion.summonerName, minion.team, primaryColor, minion.signaturePlayerName]
  );

  const activeStatusEffect = getActiveStatusEffects(minion, Date.now())[0] ?? null;

  const maxHp = minion.maxHp || 100;
  const currentHp = Math.max(0, minion.hp !== undefined ? minion.hp : maxHp);
  const hpRatio = Math.min(1.0, Math.max(0.0, currentHp / maxHp));
  const hpFillColor = getHpFillColor(hpRatio);

  const maxFury = minion.maxFury || GAME_CONSTANTS.MINION_FURY.MAX_FURY;
  const currentFury = Math.max(0, minion.fury ?? 0);
  const furyRatio = Math.min(1.0, Math.max(0.0, currentFury / maxFury));
  const isFuryFull = furyRatio >= 1.0;
  const furyFillColor = getFuryFillColor(furyRatio);

  return (
    <group>
      <mesh position={[0, 0, -0.02]} geometry={SHARED_BACKING_DISC_GEO}>
        <meshBasicMaterial color={primaryColor} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, 0]} geometry={SHARED_PORTRAIT_GEO}>
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0, 0.01]} geometry={SHARED_TORUS_BORDER_GEO}>
        <meshBasicMaterial color={primaryColor} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, 0, 0.02]} geometry={SHARED_RUNIC_RING_GEO}>
        <meshBasicMaterial color={secondaryColor} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.22, 0.02]} geometry={SHARED_SATELLITE_GEO}>
        <meshBasicMaterial color={critColor} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>

      <group position={[0, 0.295, 0.03]}>
        <mesh position={[0, 0, 0]} geometry={SHARED_HP_BG_GEO}>
          <meshBasicMaterial color="#020617" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -0.001]} geometry={SHARED_HP_BORDER_GEO}>
          <meshBasicMaterial color={primaryColor} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[-0.17 * (1.0 - hpRatio), 0, 0.002]} scale={[hpRatio, 1, 1]} geometry={SHARED_HP_FILL_GEO}>
          <meshBasicMaterial color={hpFillColor} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      <group position={[0, 0.238, 0.03]}>
        <mesh position={[0, 0, 0]} geometry={SHARED_FURY_BG_GEO}>
          <meshBasicMaterial color="#020617" transparent opacity={0.92} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -0.001]} geometry={SHARED_FURY_BORDER_GEO}>
          <meshBasicMaterial
            color={isFuryFull ? FURY_COLOR_FULL : '#f59e0b'}
            transparent
            opacity={isFuryFull ? 0.98 : 0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {furyRatio > 0 && (
          <mesh position={[-0.17 * (1.0 - furyRatio), 0, 0.002]} scale={[furyRatio, 1, 1]} geometry={SHARED_FURY_FILL_GEO}>
            <meshBasicMaterial color={furyFillColor} transparent opacity={0.98} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>

      <mesh name="celestial-halo" position={[0, 0, -0.015]} geometry={SHARED_CELESTIAL_AURA_GEO}>
        <meshBasicMaterial color={critColor} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh name="sky-beam" position={[0, 0.75, 0]} geometry={SHARED_LIGHT_BEAM_GEO}>
        <meshBasicMaterial color={primaryColor} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} name="landing-ring" geometry={SHARED_LANDING_RING_GEO}>
        <meshBasicMaterial color={primaryColor} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh
        position={[0, COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Y, COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Z]}
        geometry={SHARED_NAMEPLATE_GEO}
      >
        <meshBasicMaterial map={nameplateTexture} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {isSignature && (
        <mesh name="signature-synergy-halo" position={[0, 0, -0.025]} geometry={SHARED_CELESTIAL_AURA_GEO}>
          <meshBasicMaterial
            color={GAME_CONSTANTS.SIGNATURE_SYNERGY.GOLD_COLOR}
            transparent
            opacity={0.78}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {activeStatusEffect && (
        <mesh position={[0, 0, 0.034]} name="status-ring" geometry={SHARED_SHIELD_RING_GEO}>
          <meshBasicMaterial
            color={activeStatusEffect.color}
            transparent
            opacity={STATUS_RING_OPACITY}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh position={[0, 0, 0.035]} name="invuln-shield" geometry={SHARED_SHIELD_RING_GEO}>
        <meshBasicMaterial color="#facc15" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}, areChampionTokenPropsEqual);

ChampionToken.displayName = 'ChampionToken';

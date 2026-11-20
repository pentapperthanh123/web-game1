import React from 'react';
import { Canvas } from '@react-three/fiber';
import { BackgroundFrameDriver } from './BackgroundFrameDriver';
import { CameraRig } from './CameraRig';
import { ChampionBarrage } from './ChampionBarrage';
import { FloatingHearts } from './FloatingHearts';
import { ProjectilesBeam } from './ProjectilesBeam';
import { ShockwaveRings } from './ShockwaveRings';
import { SlashEffects } from './SlashEffects';
import { MeteorShower3D } from './MeteorShower3D';
import { CelestialGiftVFX } from './CelestialGiftVFX';
import { GiftVFXPool } from './gift/GiftVFXPool';
import { DonatorGlorification } from './gift/DonatorGlorification';
import { InnateMilestoneVFX } from './gift/InnateMilestoneVFX';
import { CinematicCameraController } from './gift/CinematicCameraController';
import { VictoryPodium3D } from './gift/VictoryPodium3D';
import { ContinuousVictoryFireworks } from './gift/ContinuousVictoryFireworks';
import { HealWave3D } from './HealWave3D';
import { ArenaEnvironment } from './ArenaEnvironment';
import { BossVoidAttack } from './BossVoidAttack';
import { BossSkillVfx3D } from './bossSkill/BossSkillVfx3D';
import { SummonPortals3D } from './SummonPortals3D';
import { BossDeathVFX3D } from './BossDeathVFX3D';
import { Boss3DPresence } from './Boss3DPresence';
import { GAME_CONSTANTS } from '../../constants/game';

export const GameCanvas = React.memo(() => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
      <Canvas
        camera={{
          position: [0, GAME_CONSTANTS.RENDER.CAMERA_POS_Y, GAME_CONSTANTS.RENDER.CAMERA_POS_Z],
          fov: GAME_CONSTANTS.RENDER.CAMERA_FOV,
        }}
        dpr={GAME_CONSTANTS.RENDER.FIXED_DPR}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          stencil: false,
          depth: true,
        }}
        frameloop="never"
      >
        <BackgroundFrameDriver />
        <CameraRig />
        <CinematicCameraController />
        <ArenaEnvironment />
        <Boss3DPresence />
        <BossVoidAttack />
        <BossSkillVfx3D />
        <SummonPortals3D />
        <BossDeathVFX3D />
        <ChampionBarrage />
        <ProjectilesBeam />
        <SlashEffects />
        <ShockwaveRings />
        <MeteorShower3D />
        <CelestialGiftVFX />
        <GiftVFXPool />
        <DonatorGlorification />
        <InnateMilestoneVFX />
        <VictoryPodium3D />
        <ContinuousVictoryFireworks />
        <FloatingHearts />
        <HealWave3D />
      </Canvas>
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';

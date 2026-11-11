import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { ChampionBarrage } from './ChampionBarrage';
import { ParticleSystem } from './ParticleSystem';
import { FloatingHearts } from './FloatingHearts';
import { ProjectilesBeam } from './ProjectilesBeam';
import { ShockwaveRings } from './ShockwaveRings';
import { SlashEffects } from './SlashEffects';
import { MeteorShower3D } from './MeteorShower3D';
import { CelestialGiftVFX } from './CelestialGiftVFX';
import { ArenaEnvironment } from './ArenaEnvironment';
import { AmbientDust } from './AmbientDust';
import { BossVoidAttack } from './BossVoidAttack';
import { SummonPortals3D } from './SummonPortals3D';
import { BossDeathVFX3D } from './BossDeathVFX3D';
import { GAME_CONSTANTS } from '../../constants/game';

export const GameCanvas = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <Canvas
        camera={{
          position: [0, GAME_CONSTANTS.RENDER.CAMERA_POS_Y, GAME_CONSTANTS.RENDER.CAMERA_POS_Z],
          fov: GAME_CONSTANTS.RENDER.CAMERA_FOV,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          stencil: false,
          depth: true,
        }}
        frameloop="always"
      >
        <CameraRig />
        <ArenaEnvironment />
        <BossVoidAttack />
        <SummonPortals3D />
        <BossDeathVFX3D />
        <ChampionBarrage />
        <ProjectilesBeam />
        <SlashEffects />
        <ShockwaveRings />
        <MeteorShower3D />
        <CelestialGiftVFX />
        <ParticleSystem />
        <AmbientDust />
        <FloatingHearts />
      </Canvas>
    </div>
  );
};

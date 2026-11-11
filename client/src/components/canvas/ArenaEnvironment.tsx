export const ArenaEnvironment = () => {
  return (
    <group position={[0, -2.1, 0]}>
      {/* Dynamic 3D Lighting for Minions & Combat VFX Particles */}
      <ambientLight intensity={0.9} color="#cbd5e1" />
      <directionalLight position={[0, 16, 6]} intensity={2.6} color="#f8fafc" castShadow />

      {/* Top Spotlight illuminating combat particles */}
      <spotLight
        position={[0, 14, 0]}
        target-position={[0, 0, 0]}
        intensity={3.5}
        color="#e0e7ff"
        angle={0.7}
        penumbra={0.7}
        distance={24}
      />

      {/* Dual Team Tinted Point Lights illuminating Minions Swarm */}
      {/* Cyan Light on Left for BLG */}
      <pointLight position={[-4.5, 2.5, -0.5]} intensity={3.5} color="#00f2fe" distance={10} />
      {/* Gold Light on Right for GEN.G */}
      <pointLight position={[4.5, 2.5, -0.5]} intensity={3.5} color="#f59e0b" distance={10} />

      {/* Deep Void Ambient Glow from Center Pit */}
      <pointLight position={[0, 0.4, 0]} intensity={2.0} color="#8b5cf6" distance={7} />
    </group>
  );
};

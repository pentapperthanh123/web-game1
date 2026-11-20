import React from 'react';

export const ArenaEnvironment = React.memo(() => {
  return (
    <group position={[0, -2.1, 0]}>
      {/* Lightweight scene lighting tuned for WebGL meshes without multi-point fragment passes */}
      <ambientLight intensity={1.35} color="#dbeafe" />
      <directionalLight position={[0, 16, 6]} intensity={2.8} color="#f8fafc" />
    </group>
  );
});

ArenaEnvironment.displayName = 'ArenaEnvironment';

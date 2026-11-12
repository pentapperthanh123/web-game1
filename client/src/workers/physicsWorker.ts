import { SAB_FLOATS_PER_MINION, SAB_MAX_MINIONS } from './workerProtocol';

let positionsF32: Float32Array | null = null;
const STRIDE = SAB_FLOATS_PER_MINION;

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'PHYSICS_INIT' && data.buffer) {
    positionsF32 = new Float32Array(data.buffer);
    return;
  }

  if (data.type === 'PHYSICS_TICK' && positionsF32) {
    const delta = Math.min(0.1, data.delta || 0.016);
    const elapsedTime = data.elapsedTime || 0;

    for (let slot = 0; slot < SAB_MAX_MINIONS; slot += 1) {
      const offset = slot * STRIDE;
      if (positionsF32[offset + 9] < 0.5) continue; // Inactive slot

      const curX = positionsF32[offset];
      const curY = positionsF32[offset + 1];
      const curZ = positionsF32[offset + 2];
      const tgtX = positionsF32[offset + 3];
      const tgtY = positionsF32[offset + 4];
      const tgtZ = positionsF32[offset + 5];
      const bobPhase = positionsF32[offset + 6];

      // Lerp movement
      const lerpFactor = Math.min(1.0, delta * 1.2 * 0.75);
      const nextX = curX + (tgtX - curX) * lerpFactor;
      const nextY = curY + (tgtY - curY) * lerpFactor;
      const nextZ = curZ + (tgtZ - curZ) * lerpFactor;

      // Bob amplitude
      const bob = Math.sin(elapsedTime * 2.2 + bobPhase) * 0.045;

      positionsF32[offset] = nextX;
      positionsF32[offset + 1] = nextY + bob;
      positionsF32[offset + 2] = nextZ;
    }
  }
};

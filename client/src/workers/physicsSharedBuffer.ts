import { SAB_FLOATS_PER_MINION, SAB_MAX_MINIONS } from './workerProtocol';

const TOTAL_FLOATS = SAB_MAX_MINIONS * SAB_FLOATS_PER_MINION;

// Hỗ trợ SharedArrayBuffer nếu môi trường trình duyệt cho phép, fallback sang ArrayBuffer thông thường
export const isSabSupported =
  typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined';

export const positionsBuffer = isSabSupported
  ? new SharedArrayBuffer(TOTAL_FLOATS * Float32Array.BYTES_PER_ELEMENT)
  : new ArrayBuffer(TOTAL_FLOATS * Float32Array.BYTES_PER_ELEMENT);

export const positionsF32 = new Float32Array(positionsBuffer);

// Quản lý slot gán cho từng minion: minionId -> slot index [0..9]
export const slotMap = new Map<string, number>();
const freeSlots: number[] = Array.from({ length: SAB_MAX_MINIONS }, (_, i) => SAB_MAX_MINIONS - 1 - i);

export const allocSlot = (minionId: string): number => {
  const existing = slotMap.get(minionId);
  if (existing !== undefined) return existing;

  const slot = freeSlots.pop() ?? 0;
  slotMap.set(minionId, slot);
  positionsF32[slot * SAB_FLOATS_PER_MINION + 9] = 1.0; // slotActive = 1
  return slot;
};

export const freeSlot = (minionId: string): void => {
  const slot = slotMap.get(minionId);
  if (slot === undefined) return;

  positionsF32[slot * SAB_FLOATS_PER_MINION + 9] = 0.0; // slotActive = 0
  freeSlots.push(slot);
  slotMap.delete(minionId);
};

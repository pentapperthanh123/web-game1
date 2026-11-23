const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MIX_MULTIPLIER_A = 0x85ebca6b;
const MIX_MULTIPLIER_B = 0xc2b2ae35;
const MIX_SHIFT_A = 16;
const MIX_SHIFT_B = 13;

/** Bước trộn cuối của MurmurHash3 (fmix32): làm các id chỉ khác chữ số cuối ra hash khác hẳn nhau. */
const mixHash = (input: number): number => {
  let hash = input;
  hash ^= hash >>> MIX_SHIFT_A;
  hash = Math.imul(hash, MIX_MULTIPLIER_A) >>> 0;
  hash ^= hash >>> MIX_SHIFT_B;
  hash = Math.imul(hash, MIX_MULTIPLIER_B) >>> 0;
  hash ^= hash >>> MIX_SHIFT_A;
  return hash >>> 0;
};

/** Băm chuỗi ổn định (FNV-1a 32-bit + fmix32) — dùng để gán màu / giới tính cố định theo id người xem. */
export const hashString = (value: string): number => {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return mixHash(hash);
};

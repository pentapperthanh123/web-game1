// Shared position registry for live moving champion tokens
export const liveMinionPositionMap = new Map<string, [number, number, number]>();
export const liveMinionScreenMap = new Map<string, { x: number; y: number }>();

export const getLiveMinionPosition = (idOrName: string): [number, number, number] | undefined => {
  const norm = idOrName.trim().toLowerCase();
  return liveMinionPositionMap.get(idOrName) || liveMinionPositionMap.get(norm);
};

export const getLiveMinionScreenPos = (idOrName: string): { x: number; y: number } | undefined => {
  const norm = idOrName.trim().toLowerCase();
  return liveMinionScreenMap.get(idOrName) || liveMinionScreenMap.get(norm);
};

export const setLiveMinionPositions = (
  id: string,
  championName: string,
  worldPos: [number, number, number],
  screenPos: { x: number; y: number }
): void => {
  const norm = championName.trim().toLowerCase();
  liveMinionPositionMap.set(id, worldPos);
  liveMinionPositionMap.set(norm, worldPos);
  liveMinionScreenMap.set(id, screenPos);
  liveMinionScreenMap.set(norm, screenPos);
};

export const removeLiveMinionPositions = (id: string, championName?: string): void => {
  liveMinionPositionMap.delete(id);
  liveMinionScreenMap.delete(id);
  if (championName) {
    const norm = championName.trim().toLowerCase();
    liveMinionPositionMap.delete(norm);
    liveMinionScreenMap.delete(norm);
  }
};

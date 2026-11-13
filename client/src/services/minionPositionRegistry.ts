// Shared position registry for live moving champion tokens
export const liveMinionPositionMap = new Map<string, [number, number, number]>();
export const liveMinionScreenMap = new Map<string, { x: number; y: number }>();
/** Screen positions keyed only by minion id (one entry per living champion, no name aliases). */
const liveChampionScreenById = new Map<string, { x: number; y: number }>();

/** Every living champion's current screen position — used to find empty space on screen. */
export const getLiveChampionScreenEntries = (): IterableIterator<[string, { x: number; y: number }]> =>
  liveChampionScreenById.entries();

export const getLiveMinionPosition = (idOrName: string): [number, number, number] | undefined => {
  const norm = idOrName.trim().toLowerCase();
  return liveMinionPositionMap.get(idOrName) || liveMinionPositionMap.get(norm);
};

/** Copy of the live position, for callers that store it (the live tuple is mutated every frame). */
export const getLiveMinionPositionSnapshot = (idOrName: string): [number, number, number] | undefined => {
  const live = getLiveMinionPosition(idOrName);
  if (!live) return undefined;
  return [live[0], live[1], live[2]];
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
  liveChampionScreenById.set(id, screenPos);
};

export const removeLiveMinionPositions = (id: string, championName?: string): void => {
  liveMinionPositionMap.delete(id);
  liveMinionScreenMap.delete(id);
  liveChampionScreenById.delete(id);
  if (championName) {
    const norm = championName.trim().toLowerCase();
    liveMinionPositionMap.delete(norm);
    liveMinionScreenMap.delete(norm);
  }
};

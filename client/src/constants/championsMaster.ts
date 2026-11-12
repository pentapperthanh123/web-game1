import championsMasterRaw from './championsMaster.json';
import { ChampionSkillVFXType } from './game';

export interface ChampionMasterSkillConfig {
  readonly normalSkillName: string;
  readonly normalVfxType: ChampionSkillVFXType;
  readonly ultimateSkillName: string;
  readonly ultimateVfxType: ChampionSkillVFXType;
  readonly glowColor: string;
  readonly coreColor: string;
  readonly attackRangeType: 'MELEE' | 'RANGED';
}

export interface ChampionMasterInfo {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly nameVi: string;
  readonly title: string;
  readonly avatarUrl: string;
  readonly tags: readonly string[];
  readonly roleNameVi: string;
  readonly aliases: readonly string[];
  readonly skill: ChampionMasterSkillConfig;
}

export const ALL_MASTER_CHAMPIONS: ChampionMasterInfo[] =
  championsMasterRaw as unknown as ChampionMasterInfo[];

const CHAMPION_BY_ID_MAP = new Map<string, ChampionMasterInfo>();
interface AliasEntry {
  alias: string;
  champion: ChampionMasterInfo;
}
const ALIAS_LIST: AliasEntry[] = [];

for (const champ of ALL_MASTER_CHAMPIONS) {
  CHAMPION_BY_ID_MAP.set(champ.id.toLowerCase(), champ);
  for (const alias of champ.aliases) {
    ALIAS_LIST.push({ alias: alias.toLowerCase(), champion: champ });
  }
}

// Sort longer aliases first to match multi-word names before single words
ALIAS_LIST.sort((a, b) => b.alias.length - a.alias.length);

export const removeDiacritics = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export const normalizeQuery = (text: string): string =>
  removeDiacritics(text.trim().toLowerCase());

/**
 * Intelligent champion resolver matching all 169 League of Legends champions
 */
export const findMasterChampion = (input: string): ChampionMasterInfo | undefined => {
  if (!input) return undefined;
  const rawNorm = normalizeQuery(input);
  const stripped = rawNorm.replace(/[\s'\.\-]/g, '');

  // 1. Direct ID match
  const direct = CHAMPION_BY_ID_MAP.get(stripped);
  if (direct) return direct;

  // 2. Exact alias match
  for (const item of ALIAS_LIST) {
    if (rawNorm === item.alias || stripped === item.alias) {
      return item.champion;
    }
  }

  // 3. Substring match for comments like "Zed BLG" or "pick Teemo"
  for (const item of ALIAS_LIST) {
    if (item.alias.length >= 3) {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${item.alias}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(rawNorm)) {
        return item.champion;
      }
    }
  }

  return undefined;
};

export const getMasterChampionAvatar = (championName: string, fallbackId = 'Ahri'): string => {
  const champ = findMasterChampion(championName);
  if (champ) return champ.avatarUrl;
  return `https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${fallbackId}.png`;
};

export const getRandomMasterChampion = (): ChampionMasterInfo => {
  return ALL_MASTER_CHAMPIONS[Math.floor(Math.random() * ALL_MASTER_CHAMPIONS.length)];
};

import championsRaw from './championsMaster.json';
import { ChampionSkillVFXType } from './game';

export interface ChampionSkillMeta {
  readonly normalSkillName: string;
  readonly normalVfxType: ChampionSkillVFXType;
  readonly ultimateSkillName: string;
  readonly ultimateVfxType: ChampionSkillVFXType;
  readonly glowColor: string;
  readonly coreColor: string;
  readonly attackRangeType: 'MELEE' | 'RANGED';
}

export interface ChampionInfo {
  id: string;
  key: string;
  name: string;
  nameVi: string;
  title: string;
  avatarUrl: string;
  tags: string[];
  roleNameVi: string;
  aliases: string[];
  skill?: ChampionSkillMeta;
}

export const ALL_CHAMPIONS: ChampionInfo[] = championsRaw as unknown as ChampionInfo[];

const CHAMPION_BY_ID_MAP = new Map<string, ChampionInfo>();

interface AliasEntry {
  alias: string;
  champion: ChampionInfo;
}
const ALIAS_LIST: AliasEntry[] = [];

for (const champ of ALL_CHAMPIONS) {
  CHAMPION_BY_ID_MAP.set(champ.id.toLowerCase(), champ);
  for (const alias of champ.aliases) {
    ALIAS_LIST.push({ alias: alias.toLowerCase(), champion: champ });
  }
}

// Sort longer aliases first to match multi-word names before single words
ALIAS_LIST.sort((a, b) => b.alias.length - a.alias.length);

export const removeDiacritics = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export const normalizeQuery = (text: string): string => {
  return removeDiacritics(text.trim().toLowerCase());
};

/**
 * Intelligent champion resolver matching all 169 League of Legends champions
 */
export const findChampion = (input: string): ChampionInfo | undefined => {
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

export const getChampionAvatar = (championName: string, fallbackId = 'Ahri'): string => {
  const champ = findChampion(championName);
  if (champ) return champ.avatarUrl;
  return `https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${fallbackId}.png`;
};

export const getRandomChampion = (): ChampionInfo => {
  return ALL_CHAMPIONS[Math.floor(Math.random() * ALL_CHAMPIONS.length)];
};

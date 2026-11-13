import {
  COMMUNITY_QUEST_CONSTANTS,
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  QUEST_KIND,
  QuestKind,
  TeamType,
} from '../constants/game';
import { GameState } from '../types/game';
import { activateTeamDamageBuff, recordQuestProgress } from './communityQuestStore';
import { isBattleHalted } from './storeHelpers';

const BOSS_HIT_ORIGIN: [number, number, number] = [0, 0.5, 0.6];
const QUEST_LABEL: Record<QuestKind, string> = {
  [QUEST_KIND.LIKES]: '❤️ Thả tim',
  [QUEST_KIND.SUMMONS]: '⚔️ Triệu hồi',
  [QUEST_KIND.COINS]: '💰 Quà tặng',
};

const rewardFullFury = (get: () => GameState, team: TeamType): void => {
  const roster = get().activeTeams[team]?.roster ?? [];
  roster.forEach((pro) => get().addPlayerFury(pro.id, GAME_CONSTANTS.PRO_FURY.MAX_FURY));
};

const rewardMeteorStrike = (get: () => GameState, team: TeamType, tier: number): void => {
  const damage = COMMUNITY_QUEST_CONSTANTS.METEOR_BASE_DAMAGE * tier;
  get().triggerScreenShake(COMMUNITY_QUEST_CONSTANTS.METEOR_SCREEN_SHAKE);
  get().spawnParticleBurst(BOSS_HIT_ORIGIN, COMMUNITY_QUEST_CONSTANTS.REWARD_FLASH_COLOR, tier + 1);
  get().damageBoss(damage, team, COMMUNITY_QUEST_CONSTANTS.REWARD_ACTOR_NAME, DAMAGE_TYPE.ULTIMATE, {
    excludeFromLeaderboard: true,
  });
};

const REWARD_DESCRIPTION: Record<QuestKind, string> = {
  [QUEST_KIND.LIKES]: 'toàn đội tuyển thủ đầy Nộ',
  [QUEST_KIND.SUMMONS]: `+${Math.round((COMMUNITY_QUEST_CONSTANTS.DAMAGE_BUFF_MULTIPLIER - 1) * 100)}% sát thương ${COMMUNITY_QUEST_CONSTANTS.DAMAGE_BUFF_DURATION_MS / 1000}s`,
  [QUEST_KIND.COINS]: 'mưa thiên thạch giáng xuống Boss',
};

const applyReward = (get: () => GameState, team: TeamType, kind: QuestKind, tier: number): void => {
  const now = Date.now();
  if (kind === QUEST_KIND.LIKES) rewardFullFury(get, team);
  if (kind === QUEST_KIND.SUMMONS) activateTeamDamageBuff(team, now);
  if (kind === QUEST_KIND.COINS) rewardMeteorStrike(get, team, tier);

  get().triggerScreenFlash(COMMUNITY_QUEST_CONSTANTS.REWARD_FLASH_COLOR);
  const teamTag = get().activeTeams[team]?.shortTag ?? team;
  get().addLog('SYSTEM', `🎯 ${teamTag} hoàn thành nhiệm vụ ${QUEST_LABEL[kind]} mốc ${tier}: ${REWARD_DESCRIPTION[kind]}!`, team);
};

/** Records quest progress from a store action and fires the reward of each tier reached. */
export const trackQuestProgress = (
  get: () => GameState,
  team: TeamType,
  kind: QuestKind,
  amount: number
): void => {
  if (isBattleHalted(get())) return;
  const reachedTiers = recordQuestProgress(team, kind, amount);
  reachedTiers.forEach((tier) => applyReward(get, team, kind, tier));
};

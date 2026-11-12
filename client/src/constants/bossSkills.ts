import { BossSkillDefinition, BossSkillConfig } from '../types/bossSkill';
import { GameThemeType, isDragonArchetype } from './game';

export const DEFAULT_BOSS_SKILL_CONFIG: BossSkillConfig = {
  autoAttackEnabled: true,
  intervalMs: 4000,
  damageMultiplier: 1.0,
  mode: 'RANDOM_WEIGHTED',
  randomIntervalEnabled: true,
};

export const BARON_SKILLS: BossSkillDefinition[] = [
  {
    id: 'baron_acid_spit',
    name: 'Acid Spit',
    vietnameseName: 'Axit Hư Không',
    iconName: 'Droplets',
    baseDamage: 20,
    targetCount: 1,
    isUltimate: false,
    color: '#22c55e',
    description: 'Phun axit ăn mòn đơn mục tiêu gây sát thương nhẹ (-20 HP)',
  },
  {
    id: 'baron_void_spikes',
    name: 'Void Spikes',
    vietnameseName: 'Gai Độc Hư Không',
    iconName: 'Zap',
    baseDamage: 40,
    targetCount: 3,
    isUltimate: false,
    color: '#a855f7',
    description: 'Trồi chông gai từ lòng đất tấn công 2-3 tướng (-40 HP)',
  },
  {
    id: 'baron_tail_sweep',
    name: 'Tail Sweep',
    vietnameseName: 'Quét Đuôi Hư Không',
    iconName: 'Wind',
    baseDamage: 65,
    targetCount: 5,
    isUltimate: false,
    color: '#d946ef',
    description: 'Quét đuôi cực mạnh gây sát thương lớn lên 3-5 tướng (-65 HP)',
  },
  {
    id: 'baron_void_cataclysm',
    name: 'Void Cataclysm',
    vietnameseName: 'Đại Địa Chấn Hư Không',
    iconName: 'Skull',
    baseDamage: 95,
    targetCount: 999,
    isUltimate: true,
    color: '#ef4444',
    description: 'Tuyệt kỹ sấm sét Hư Không hủy diệt toàn bộ tướng trên sàn (-95 HP)',
  },
];

export const ELDER_DRAGON_SKILLS: BossSkillDefinition[] = [
  {
    id: 'elder_dragon_breath',
    name: 'Dragon Breath',
    vietnameseName: 'Hơi Thở Rồng CKTG',
    iconName: 'Flame',
    baseDamage: 20,
    targetCount: 1,
    isUltimate: false,
    color: '#06b6d4',
    description: 'Bắn cầu lửa thiên thanh rực sáng đơn mục tiêu (-20 HP)',
  },
  {
    id: 'elder_wing_buffet',
    name: 'Wing Buffet',
    vietnameseName: 'Cơn Bão Cánh Long Thần',
    iconName: 'Wind',
    baseDamage: 40,
    targetCount: 3,
    isUltimate: false,
    color: '#f59e0b',
    description: 'Đập cánh tạo lốc xoáy vàng kim hất tung 2-3 tướng (-40 HP)',
  },
  {
    id: 'elder_meteor_rain',
    name: 'Meteor Rain',
    vietnameseName: 'Mưa Thiên Thạch Cổ Đại',
    iconName: 'Sparkles',
    baseDamage: 65,
    targetCount: 5,
    isUltimate: false,
    color: '#ea580c',
    description: 'Gọi thiên thạch rực lửa từ bầu trời giáng xuống 3-5 tướng (-65 HP)',
  },
  {
    id: 'elder_cataclysmic_burn',
    name: 'Cataclysmic Burn',
    vietnameseName: 'Long Nộ Thiêu Rụi CKTG',
    iconName: 'Skull',
    baseDamage: 95,
    targetCount: 999,
    isUltimate: true,
    color: '#38bdf8',
    description: 'Chiêu tất sát hỏa diệm Long Thần thiêu rụi toàn bộ sàn đấu (-95 HP)',
  },
];

export const getBossSkillsByTheme = (theme: GameThemeType): BossSkillDefinition[] => {
  return isDragonArchetype(theme) ? ELDER_DRAGON_SKILLS : BARON_SKILLS;
};

export const BOSS_SKILL_STORAGE_KEY = 'lol_boss_skill_config_v1';
export const CHAMPION_DEFAULT_MAX_HP = 100;
export const BOSS_ATTACK_BANNER_DURATION_MS = 3500;

export const BOSS_SKILL_MODES = {
  RANDOM_WEIGHTED: 'RANDOM_WEIGHTED',
  RANDOM_EQUAL: 'RANDOM_EQUAL',
  ROTATION: 'ROTATION',
} as const;

export interface BossSkillModeOption {
  mode: 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';
  label: string;
  badge: string;
  description: string;
  odds: number[] | null;
}

export const BOSS_SKILL_MODE_OPTIONS: BossSkillModeOption[] = [
  {
    mode: 'RANDOM_WEIGHTED',
    label: '🎲 Ngẫu nhiên theo tỉ lệ',
    badge: 'Khuyên dùng',
    description: 'Chiêu 1 (40%) • Chiêu 2 (30%) • Chiêu 3 (20%) • Chiêu cuối (10%)',
    odds: [40, 30, 20, 10],
  },
  {
    mode: 'RANDOM_EQUAL',
    label: '⚖️ Ngẫu nhiên đồng đều',
    badge: '25% Mỗi Chiêu',
    description: 'Tất cả 4 chiêu có cơ hội xuất hiện hoàn toàn bằng nhau (25%)',
    odds: [25, 25, 25, 25],
  },
  {
    mode: 'ROTATION',
    label: '🔄 Tuần hoàn thứ tự',
    badge: '1 ➔ 2 ➔ 3 ➔ 4',
    description: 'Tung tuần tự từ Chiêu 1 đến Chiêu 4 rồi lặp lại',
    odds: null,
  },
];

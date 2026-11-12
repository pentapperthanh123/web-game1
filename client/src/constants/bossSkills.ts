import { BossSkillBase, BossSkillDefinition, BossSkillConfig } from '../types/bossSkill';
import { GAME_THEME, GameThemeType } from './game';
import { getBossSkillEffect } from './bossSkillEffects';

export const DEFAULT_BOSS_SKILL_CONFIG: BossSkillConfig = {
  autoAttackEnabled: true,
  intervalMs: 4000,
  damageMultiplier: 1.0,
  mode: 'RANDOM_WEIGHTED',
  randomIntervalEnabled: true,
  phaseLockEnabled: true,
};

export const BARON_SKILLS: BossSkillBase[] = [
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

export const ELDER_DRAGON_SKILLS: BossSkillBase[] = [
  {
    id: 'elder_dragon_breath',
    name: 'Fire Breath',
    vietnameseName: 'Phun Lửa Cổ Đại',
    iconName: 'Flame',
    baseDamage: 25,
    targetCount: 999,
    isUltimate: false,
    color: '#f97316',
    description: 'Phun luồng lửa rồng thiêu đốt toàn bộ vùng mục tiêu (-25 HP & Thiêu Đốt)',
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

export const RIFT_HERALD_SKILLS: BossSkillBase[] = [
  {
    id: 'herald_charge',
    name: 'Herald Charge',
    vietnameseName: 'Cú Húc Sứ Giả',
    iconName: 'Zap',
    baseDamage: 25,
    targetCount: 1,
    isUltimate: false,
    color: '#10b981',
    description: 'Hạ thấp trọng tâm lao thẳng về phía trước húc cực mạnh 1 tướng (-25 HP)',
  },
  {
    id: 'herald_void_cleave',
    name: 'Void Cleave',
    vietnameseName: 'Quét Móng Vuốt',
    iconName: 'Wind',
    baseDamage: 45,
    targetCount: 3,
    isUltimate: false,
    color: '#059669',
    description: 'Vung 2 móng vuốt càn quét gây sát thương diện rộng 2-3 tướng (-45 HP)',
  },
  {
    id: 'herald_eye_gaze',
    name: 'Eye Gaze Burst',
    vietnameseName: 'Tia Sáng Mắt Hư Không',
    iconName: 'Sparkles',
    baseDamage: 70,
    targetCount: 5,
    isUltimate: false,
    color: '#84cc16',
    description: 'Mắt trên mai mở ra phóng chùm tia năng lượng quét 3-5 tướng (-70 HP)',
  },
  {
    id: 'herald_seismic_slam',
    name: 'Rift Cataclysmic Slam',
    vietnameseName: 'Địa Chấn Khe Nứt',
    iconName: 'Skull',
    baseDamage: 95,
    targetCount: 999,
    isUltimate: true,
    color: '#ec4899',
    description: 'Tuyệt kỹ giậm mạnh toàn thân tạo sóng chấn động địa chấn toàn sàn đấu (-95 HP)',
  },
];

export const MOUNTAIN_DRAGON_SKILLS: BossSkillBase[] = [
  {
    id: 'mountain_magma_spit',
    name: 'Magma Fire Breath',
    vietnameseName: 'Phun Lửa Nham Thạch',
    iconName: 'Flame',
    baseDamage: 28,
    targetCount: 999,
    isUltimate: false,
    color: '#ea580c',
    description: 'Phun luồng lửa nham thạch thiêu đốt toàn bộ vùng mục tiêu (-28 HP & Thiêu Đốt)',
  },
  {
    id: 'mountain_rock_slide',
    name: 'Rock Slide',
    vietnameseName: 'Lở Đá Nham Thạch',
    iconName: 'Wind',
    baseDamage: 45,
    targetCount: 3,
    isUltimate: false,
    color: '#c2410c',
    description: 'Làm sụp đổ vách đá ngàn cân đè bẹp 2-3 tướng (-45 HP)',
  },
  {
    id: 'mountain_tectonic_roar',
    name: 'Tectonic Roar',
    vietnameseName: 'Gầm Rú Địa Chấn',
    iconName: 'Zap',
    baseDamage: 65,
    targetCount: 5,
    isUltimate: false,
    color: '#b45309',
    description: 'Tiếng gầm làm nứt toác mặt đất gây chấn động 3-5 tướng (-65 HP)',
  },
  {
    id: 'mountain_volcanic_eruption',
    name: 'Volcanic Eruption',
    vietnameseName: 'Núi Lửa Phun Trào',
    iconName: 'Skull',
    baseDamage: 95,
    targetCount: 999,
    isUltimate: true,
    color: '#dc2626',
    description: 'Tuyệt kỹ phun trào dung nham hủy diệt toàn bộ đấu trường (-95 HP)',
  },
];

export const STORM_DRAGON_SKILLS: BossSkillBase[] = [
  {
    id: 'storm_lightning_spark',
    name: 'Storm Fire Breath',
    vietnameseName: 'Phun Lửa Bão Tố',
    iconName: 'Flame',
    baseDamage: 28,
    targetCount: 999,
    isUltimate: false,
    color: '#f97316',
    description: 'Phun luồng lửa bão tố thiêu đốt toàn bộ vùng mục tiêu (-28 HP & Thiêu Đốt)',
  },
  {
    id: 'storm_wind_vortex',
    name: 'Wind Vortex',
    vietnameseName: 'Lốc Xoáy Bão Sét',
    iconName: 'Wind',
    baseDamage: 45,
    targetCount: 3,
    isUltimate: false,
    color: '#8b5cf6',
    description: 'Triệu hồi cuồng phong sấm sét cuốn phăng 2-3 tướng (-45 HP)',
  },
  {
    id: 'storm_thunder_barrage',
    name: 'Thunder Barrage',
    vietnameseName: 'Oanh Kích Sấm Sét',
    iconName: 'Sparkles',
    baseDamage: 70,
    targetCount: 5,
    isUltimate: false,
    color: '#a855f7',
    description: 'Chuỗi sấm sét liên hoàn giáng xuống 3-5 tướng (-70 HP)',
  },
  {
    id: 'storm_tempest_wrath',
    name: 'Tempest Wrath',
    vietnameseName: 'Cơn Thịnh Nộ Của Bão',
    iconName: 'Skull',
    baseDamage: 95,
    targetCount: 999,
    isUltimate: true,
    color: '#7c3aed',
    description: 'Tuyệt kỹ lôi bão cực đại quét sạch toàn thể đấu trường (-95 HP)',
  },
];

export const VOID_TITAN_SKILLS: BossSkillBase[] = [
  {
    id: 'void_annihilation_beam',
    name: 'Annihilation Beam',
    vietnameseName: 'Tia Hủy Diệt Hư Không',
    iconName: 'Zap',
    baseDamage: 30,
    targetCount: 1,
    isUltimate: false,
    color: '#c084fc',
    description: 'Bắn chùm tia phân rã vật chất cực mạnh vào 1 tướng (-30 HP)',
  },
  {
    id: 'void_singularity_crush',
    name: 'Singularity Crush',
    vietnameseName: 'Nghiền Nát Kỳ Dị',
    iconName: 'Sparkles',
    baseDamage: 55,
    targetCount: 3,
    isUltimate: false,
    color: '#9333ea',
    description: 'Tạo lỗ đen mini hút và nghiền nát 2-3 tướng (-55 HP)',
  },
  {
    id: 'void_rift_collapse',
    name: 'Rift Collapse',
    vietnameseName: 'Sụp Đổ Không Gian',
    iconName: 'Wind',
    baseDamage: 80,
    targetCount: 5,
    isUltimate: false,
    color: '#7e22ce',
    description: 'Bẻ gãy kết cấu không gian gây sát thương chí mạng 3-5 tướng (-80 HP)',
  },
  {
    id: 'void_apocalypse_oblivion',
    name: 'Apocalypse Oblivion',
    vietnameseName: 'Khải Huyền Diệt Vong',
    iconName: 'Skull',
    baseDamage: 110,
    targetCount: 999,
    isUltimate: true,
    color: '#e11d48',
    description: 'Chiêu tất sát nuốt chửng cả vũ trụ vào cõi hư vô tối thượng (-110 HP)',
  },
];

const withEffects = (skills: BossSkillBase[]): BossSkillDefinition[] =>
  skills.map((skill) => ({ ...skill, ...getBossSkillEffect(skill.id) }));

/** Raw data merged once with the VFX / status / phase layer from `bossSkillEffects.ts`. */
export const BOSS_SKILLS_MAP: Record<GameThemeType, BossSkillDefinition[]> = {
  [GAME_THEME.XU_GIA]: withEffects(RIFT_HERALD_SKILLS),
  [GAME_THEME.RONG_NUI]: withEffects(MOUNTAIN_DRAGON_SKILLS),
  [GAME_THEME.RONG_GIA]: withEffects(STORM_DRAGON_SKILLS),
  [GAME_THEME.ELDER_DRAGON]: withEffects(ELDER_DRAGON_SKILLS),
  [GAME_THEME.BARON]: withEffects(BARON_SKILLS),
  [GAME_THEME.VOID_TITAN]: withEffects(VOID_TITAN_SKILLS),
};

export const getBossSkillsByTheme = (theme: GameThemeType): BossSkillDefinition[] => {
  return BOSS_SKILLS_MAP[theme] || BOSS_SKILLS_MAP[GAME_THEME.BARON];
};

export const getBossSkillById = (
  theme: GameThemeType,
  skillId: string
): BossSkillDefinition | undefined => getBossSkillsByTheme(theme).find((skill) => skill.id === skillId);

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

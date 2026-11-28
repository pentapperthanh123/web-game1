import type {
  ActiveDrink,
  BrewStageNumber,
  BrewToolType,
  IceLevel,
  Language,
  RecipeId,
  SugarLevel,
} from './types';

export interface DrinkRecipe {
  id: RecipeId;
  icon: string;
  nameEn: string;
  nameVi: string;
  shortNameEn: string;
  shortNameVi: string;
  menuCommand: string;
  botKeyword: string;
  baseColor: string;
  secondaryColor: string;
  accentColor: string;
  toolType: BrewToolType;
  fruitType: 'leaf' | 'peach' | 'bean' | 'berry' | 'lime' | 'orange';
  keywords: readonly string[];
}

export const RECIPE_LIST: readonly DrinkRecipe[] = [
  {
    id: 'matcha',
    icon: '🍵',
    nameEn: 'Matcha',
    nameVi: 'Matcha',
    shortNameEn: 'Matcha',
    shortNameVi: 'Matcha',
    menuCommand: 'matcha',
    botKeyword: 'matcha',
    baseColor: '#A7D397',
    secondaryColor: '#FFFDF7',
    accentColor: '#7FB86B',
    toolType: 'chasen',
    fruitType: 'leaf',
    keywords: [
      'matcha',
      'tra xanh matcha',
      'trà xanh matcha',
      'matcha latte',
      'tra xanh',
      'trà xanh',
      'green tea',
      'mat cha',
      'mát cha',
      'matxa',
    ],
  },
  {
    id: 'thai_tea',
    icon: '🧋',
    nameEn: 'Milk Tea',
    nameVi: 'Trà Sữa',
    shortNameEn: 'Milk Tea',
    shortNameVi: 'Trà Sữa',
    menuCommand: 'trà sữa',
    botKeyword: 'trà sữa',
    baseColor: '#D89E68',
    secondaryColor: '#FFF8EE',
    accentColor: '#B87842',
    toolType: 'shaker',
    fruitType: 'peach',
    keywords: ['trà sữa', 'tra sua', 'trasua', 'milk tea', 'hong tra', 'hồng trà', 'ts'],
  },
  {
    id: 'peach_tea',
    icon: '🍑',
    nameEn: 'Peach Tea',
    nameVi: 'Trà Đào',
    shortNameEn: 'Peach Tea',
    shortNameVi: 'Trà Đào',
    menuCommand: 'trà đào',
    botKeyword: 'trà đào',
    baseColor: '#FF9D5C',
    secondaryColor: '#FFE5C7',
    accentColor: '#F26D30',
    toolType: 'shaker',
    fruitType: 'peach',
    keywords: [
      'trà đào cam sả',
      'tra dao cam sa',
      'trà đào cam',
      'tra dao cam',
      'tradaocamsa',
      'trà đào',
      'tra dao',
      'tradao',
      'peach tea',
      'peach',
    ],
  },
  {
    id: 'lime_tea',
    icon: '🍋',
    nameEn: 'Lime Tea',
    nameVi: 'Trà Chanh',
    shortNameEn: 'Lime Tea',
    shortNameVi: 'Trà Chanh',
    menuCommand: 'trà chanh',
    botKeyword: 'trà chanh',
    baseColor: '#A4D466',
    secondaryColor: '#EFF9DC',
    accentColor: '#6CA832',
    toolType: 'shaker',
    fruitType: 'lime',
    keywords: [
      'trà chanh giã tay',
      'tra chanh gia tay',
      'trà chanh',
      'tra chanh',
      'trachanh',
      'trà tắc',
      'tra tac',
      'chanh tươi',
      'chanh tuoi',
      'lemon tea',
      'lime',
    ],
  },
  {
    id: 'coffee_milk',
    icon: '☕',
    nameEn: 'Coffee',
    nameVi: 'Cà Phê',
    shortNameEn: 'Coffee',
    shortNameVi: 'Cà Phê',
    menuCommand: 'cà phê, cf',
    botKeyword: 'cà phê',
    baseColor: '#6F4732',
    secondaryColor: '#F7E8D4',
    accentColor: '#9C6644',
    toolType: 'coffee_machine',
    fruitType: 'bean',
    keywords: [
      'cà phê sữa đá',
      'ca phe sua da',
      'cà phê muối',
      'ca phe muoi',
      'cà phê sữa',
      'ca phe sua',
      'cà phê đá',
      'ca phe da',
      'cà phê',
      'ca phe',
      'caphe',
      'cafe',
      'ca fe',
      'cf sua',
      'cf đá',
      'cf da',
      'cf',
      'coffee',
      'espresso',
      'latte',
      'bạc xỉu',
      'bac xiu',
      'bacxiu',
      'nâu đá',
      'nau da',
      'đen đá',
      'den da',
    ],
  },
  {
    id: 'cacao',
    icon: '🍫',
    nameEn: 'Iced Cacao',
    nameVi: 'Cacao Đá',
    shortNameEn: 'Cacao',
    shortNameVi: 'Cacao',
    menuCommand: 'cacao',
    botKeyword: 'cacao',
    baseColor: '#7B462B',
    secondaryColor: '#F3DFCE',
    accentColor: '#4E2918',
    toolType: 'chasen',
    fruitType: 'bean',
    keywords: [
      'cacao sữa đá',
      'ca cao sua da',
      'cacao sữa',
      'ca cao sua',
      'cacao đá',
      'cacao da',
      'cacao',
      'ca cao',
      'cô cao',
      'co cao',
      'cocoa',
      'chocolate',
      'socola',
      'sô cô la',
      'milo',
    ],
  },
  {
    id: 'berry_soda',
    icon: '🥤',
    nameEn: 'Soda',
    nameVi: 'Soda',
    shortNameEn: 'Soda',
    shortNameVi: 'Soda',
    menuCommand: 'soda',
    botKeyword: 'soda',
    baseColor: '#7FC8D9',
    secondaryColor: '#E8F7FA',
    accentColor: '#4EA2B8',
    toolType: 'soda_pour',
    fruitType: 'berry',
    keywords: ['soda dâu', 'soda dau', 'soda việt quất', 'sô đa', 'soda', 'so da', 'sparkling'],
  },
  {
    id: 'blue_citrus',
    icon: '🍊',
    nameEn: 'Fresh Orange Juice',
    nameVi: 'Nước Cam Tươi',
    shortNameEn: 'Orange',
    shortNameVi: 'Nước Cam',
    menuCommand: 'nước cam',
    botKeyword: 'nước cam',
    baseColor: '#FF9526',
    secondaryColor: '#FFF3E0',
    accentColor: '#FF6E14',
    toolType: 'juicer',
    fruitType: 'orange',
    keywords: [
      'nước cam tươi',
      'nuoc cam tuoi',
      'nước ép cam',
      'nuoc ep cam',
      'nước cam',
      'nuoc cam',
      'nuoccam',
      'nước ép',
      'nuoc ep',
      'nuocep',
      'cam ép',
      'cam ep',
      'camep',
      'cam tươi',
      'cam tuoi',
      'cam vắt',
      'cam vat',
      'orange juice',
      'orange',
      'juice',
    ],
  },
] as const;

export const RECIPE_MAP: Record<RecipeId, DrinkRecipe> = {
  matcha: RECIPE_LIST[0],
  thai_tea: RECIPE_LIST[1],
  peach_tea: RECIPE_LIST[2],
  lime_tea: RECIPE_LIST[3],
  coffee_milk: RECIPE_LIST[4],
  cacao: RECIPE_LIST[5],
  berry_soda: RECIPE_LIST[6],
  blue_citrus: RECIPE_LIST[7],
};

/** Active customer-facing menu (8 items: Matcha, Trà Sữa, Trà Đào, Trà Chanh, Cà Phê, Cacao, Soda, Nước Cam) */
export const MENU_RECIPE_LIST: readonly DrinkRecipe[] = RECIPE_LIST;

export type BrewPhaseAction =
  | 'dispense'
  | 'tool_prep'
  | 'add_ice'
  | 'pour_mix'
  | 'topping'
  | 'seal';

export interface BrewStepInfo {
  step: BrewStageNumber;
  action: BrewPhaseAction;
  minProgress: number;
  maxProgress: number;
  labelVi: string;
  labelEn: string;
  shortVi: string;
  shortEn: string;
}

export const RECIPE_BREW_PHASES: Record<RecipeId, readonly BrewStepInfo[]> = {
  matcha: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Lấy cốc, lấy Matcha trên kệ & sữa',
      labelEn: 'Cup, shelf matcha & oat milk',
      shortVi: 'Lấy Matcha',
      shortEn: 'Prep Matcha',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Đánh tơi Matcha tạo bọt mịn',
      labelEn: 'Whisking & frothing matcha',
      shortVi: 'Đánh tơi',
      shortEn: 'Frothing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót sữa Oatside & Matcha vào ly',
      labelEn: 'Pouring milk & matcha layers',
      shortVi: 'Rót vào ly',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  thai_tea: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Lấy cốc, hứng trà & bấm đường',
      labelEn: 'Cup, tea urn & sugar button',
      shortVi: 'Hứng trà',
      shortEn: 'Dispense',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Lắc trà sữa bằng máy lắc đôi',
      labelEn: 'Shaking in shaker machine',
      shortVi: 'Máy lắc',
      shortEn: 'Shaking',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Múc trân châu đen & bỏ đá vào ly',
      labelEn: 'Scooping boba & ice cubes',
      shortVi: 'Trân châu & đá',
      shortEn: 'Boba & Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót trà sữa & trân châu vào ly',
      labelEn: 'Pouring milk tea & boba',
      shortVi: 'Rót vào ly',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  peach_tea: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Lấy cốc, hứng Trà Nền, bơm siro đào & đường',
      labelEn: 'Cup, tea urn, peach syrup & sugar',
      shortVi: 'Hứng trà nền',
      shortEn: 'Tea & Syrup',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Lắc trà đào bằng máy lắc đôi',
      labelEn: 'Shaking peach tea in shaker',
      shortVi: 'Máy lắc',
      shortEn: 'Shaking',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót trà đào & gài lát đào tươi',
      labelEn: 'Pouring peach tea & peach slice',
      shortVi: 'Rót & đào',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  lime_tea: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Lấy cốc, hứng Trà Nền, bơm siro chanh & đường',
      labelEn: 'Cup, tea urn, lime syrup & sugar',
      shortVi: 'Hứng trà nền',
      shortEn: 'Tea & Syrup',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Đánh tơi bọt trà chanh giã tay',
      labelEn: 'Frothing fresh lime tea',
      shortVi: 'Đánh tơi',
      shortEn: 'Frothing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót trà chanh & gài lát chanh tươi',
      labelEn: 'Pouring lime tea & lime wheel',
      shortVi: 'Rót & chanh',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  coffee_milk: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Chiết xuất cà phê & rót sữa vào ca',
      labelEn: 'Extracting espresso & milk',
      shortVi: 'Chiết xuất',
      shortEn: 'Extract',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Đánh tơi kem muối & bọt cà phê',
      labelEn: 'Frothing coffee & salted cream',
      shortVi: 'Đánh tơi',
      shortEn: 'Frothing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót cà phê & phủ lớp kem muối',
      labelEn: 'Pouring coffee & salted cream',
      shortVi: 'Rót & kem',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  cacao: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Rót sữa tươi & xúc bột cacao',
      labelEn: 'Pouring milk & cacao powder',
      shortVi: 'Pha cacao',
      shortEn: 'Mix Cacao',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Đánh bông cacao sệt mịn béo',
      labelEn: 'Whisking rich creamy cacao',
      shortVi: 'Đánh bông',
      shortEn: 'Frothing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót cacao đậm vị & phủ kem sữa',
      labelEn: 'Pouring rich cacao & cream cap',
      shortVi: 'Rót cacao',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  berry_soda: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Nhấn siro dâu & hứng cốt vào ca',
      labelEn: 'Pumping berry syrup to jug',
      shortVi: 'Nhấn siro',
      shortEn: 'Syrup',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Đánh hòa tan cốt dâu tươi',
      labelEn: 'Mixing fresh berry base',
      shortVi: 'Đánh đều',
      shortEn: 'Mixing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót siro & soda sủi bọt vào ly',
      labelEn: 'Pouring syrup & sparkling soda',
      shortVi: 'Rót soda',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  blue_citrus: [
    {
      step: 1,
      action: 'dispense',
      minProgress: 0,
      maxProgress: 20,
      labelVi: 'Bổ cam tươi & hứng cốt vào ca',
      labelEn: 'Prepping fresh orange to jug',
      shortVi: 'Cắt cam',
      shortEn: 'Prep',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 20,
      maxProgress: 42,
      labelVi: 'Vắt ép cam tươi mọng nước',
      labelEn: 'Squeezing fresh orange juice',
      shortVi: 'Ép cam',
      shortEn: 'Juicing',
    },
    {
      step: 3,
      action: 'add_ice',
      minProgress: 42,
      maxProgress: 56,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 4,
      action: 'pour_mix',
      minProgress: 56,
      maxProgress: 84,
      labelVi: 'Rót nước cam tươi & gài lát cam',
      labelEn: 'Pouring fresh orange & garnish',
      shortVi: 'Rót cam',
      shortEn: 'Pouring',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 84,
      maxProgress: 101,
      labelVi: 'Đóng nắp & trả ly',
      labelEn: 'Sealing & serving',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
};

export function getBrewStep(
  progress: number,
  recipeId: RecipeId = 'matcha'
): BrewStepInfo {
  const phases = RECIPE_BREW_PHASES[recipeId] ?? RECIPE_BREW_PHASES.matcha;
  const clamped = Math.max(0, Math.min(100, progress));
  for (const phase of phases) {
    if (clamped >= phase.minProgress && clamped < phase.maxProgress) {
      return phase;
    }
  }
  return phases[phases.length - 1];
}

export interface BrewBadgeDisplay {
  pct: number;
  step: BrewStageNumber;
  stepShort: string;
  pillText: string;
}

/**
 * Single deterministic formatter shared by both HÀNG CHỜ PHA UI and under-cup canvas pill.
 */
export function formatBrewStepBadge(
  drink: ActiveDrink,
  language: Language,
  readyLabel: string,
  dancingPauseLabel?: string
): BrewBadgeDisplay {
  const pct = Math.max(0, Math.min(100, Math.floor(drink.progress)));
  const stepInfo = getBrewStep(pct, drink.recipeId);
  const stepShort = language === 'EN' ? stepInfo.shortEn : stepInfo.shortVi;

  let pillText = `[P${stepInfo.step}] ${stepShort} ${pct}%`;
  if (drink.phase === 'SHOWCASE') {
    pillText = `✨ ${readyLabel}`;
  } else if (dancingPauseLabel) {
    pillText = `${dancingPauseLabel} ${pct}%`;
  }

  return {
    pct,
    step: stepInfo.step,
    stepShort,
    pillText,
  };
}

export const ORDER_TRIGGER_KEYWORDS: readonly string[] = [
  'order',
  'dat',
  'đặt',
  'ly',
  'coc',
  'cốc',
  'drink',
  'uong',
  'uống',
  'cho',
  'mua',
  'me',
  'play',
];

const LESS_SUGAR_KEYWORDS: readonly string[] = ['it duong', 'ít đường', 'less sugar', 'khong duong', 'không đường'];
const SWEET_SUGAR_KEYWORDS: readonly string[] = ['nhieu duong', 'nhiều đường', 'ngot', 'ngọt', 'extra sweet'];
const EXTRA_ICE_KEYWORDS: readonly string[] = ['nhieu da', 'nhiều đá', 'extra ice', 'full da', 'full đá'];
const LESS_ICE_KEYWORDS: readonly string[] = ['it da', 'ít đá', 'less ice'];
const NO_ICE_KEYWORDS: readonly string[] = ['khong da', 'không đá', 'no ice', '0 da'];

export function normalizeChatText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getRecipeLabel(recipeId: RecipeId, language: Language, short = false): string {
  const recipe = RECIPE_MAP[recipeId];
  if (language === 'EN') {
    return short ? recipe.shortNameEn : recipe.nameEn;
  }
  return short ? recipe.shortNameVi : recipe.nameVi;
}

export function pickRandomRecipeId(): RecipeId {
  const index = Math.floor(Math.random() * MENU_RECIPE_LIST.length);
  return MENU_RECIPE_LIST[index].id;
}

export interface ParsedDrinkOrderItem {
  recipeId: RecipeId;
  quantity: number;
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
}

export interface ParsedDrinkChat {
  isOrderIntent: boolean;
  items: ParsedDrinkOrderItem[];
  recipeId?: RecipeId;
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
  hasFlavorModifier: boolean;
}

const MAX_QUANTITY_PER_ITEM = 10;

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CompiledDrinkKeyword {
  normKw: string;
  recipeId: RecipeId;
}

const COMPILED_DRINK_KEYWORDS: readonly CompiledDrinkKeyword[] = (() => {
  const entries: CompiledDrinkKeyword[] = [];
  const seen = new Set<string>();
  for (const recipe of MENU_RECIPE_LIST) {
    for (const kw of recipe.keywords) {
      const normKw = normalizeChatText(kw);
      if (!normKw || seen.has(normKw)) continue;
      seen.add(normKw);
      entries.push({ normKw, recipeId: recipe.id });
    }
  }
  entries.sort((a, b) => b.normKw.length - a.normKw.length);
  return entries;
})();

const KEYWORD_TO_RECIPE_MAP: ReadonlyMap<string, RecipeId> = new Map(
  COMPILED_DRINK_KEYWORDS.map((entry) => [entry.normKw, entry.recipeId])
);

const DRINK_ALTERNATION = COMPILED_DRINK_KEYWORDS.map((e) => escapeRegexLiteral(e.normKw)).join('|');
const DRINK_SCAN_REGEX = new RegExp(`(^|[^a-z])(${DRINK_ALTERNATION})(?=[^a-z]|$)`, 'g');
const SEGMENT_SPLIT_REGEX = new RegExp(
  `[,;+&/\\n]+|\\s+(?:va|voi|cung)\\s+|\\s+(?=\\d{1,2}\\s*(?:ly|coc|tach|chai|phan|suat|cai)?\\s*(?:${DRINK_ALTERNATION})(?:[^a-z]|$))`,
  'gi'
);
const LEADING_QTY_REGEX = /(?:^|[^a-z0-9])(\d{1,2})\s*(?:ly|coc|tach|chai|phan|suat|cai)?\s*$/;
const TRAILING_QTY_REGEX = /^\s*(?:x|\*)\s*(\d{1,2})(?=[^a-z0-9]|$)/;

function matchKeywordToken(normalized: string, rawLower: string, keyword: string): boolean {
  const cleanKw = normalizeChatText(keyword);
  const pattern = new RegExp(`(^|[^a-z])${escapeRegexLiteral(cleanKw)}([^a-z]|$)`, 'i');
  return pattern.test(normalized) || rawLower === keyword.toLowerCase();
}

function matchAnyKeyword(normalized: string, rawLower: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => matchKeywordToken(normalized, rawLower, kw));
}

function parseSegmentModifiers(segmentNorm: string): {
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
} {
  let sugarLevel: SugarLevel | undefined;
  if (matchAnyKeyword(segmentNorm, segmentNorm, LESS_SUGAR_KEYWORDS)) {
    sugarLevel = 'LESS';
  } else if (matchAnyKeyword(segmentNorm, segmentNorm, SWEET_SUGAR_KEYWORDS)) {
    sugarLevel = 'SWEET';
  }

  let iceLevel: IceLevel | undefined;
  if (matchAnyKeyword(segmentNorm, segmentNorm, NO_ICE_KEYWORDS)) {
    iceLevel = 'NONE';
  } else if (matchAnyKeyword(segmentNorm, segmentNorm, EXTRA_ICE_KEYWORDS)) {
    iceLevel = 'EXTRA';
  } else if (matchAnyKeyword(segmentNorm, segmentNorm, LESS_ICE_KEYWORDS)) {
    iceLevel = 'LESS';
  }

  return { sugarLevel, iceLevel };
}

function extractQuantityAroundMatch(beforeText: string, afterText: string): {
  quantity: number;
  hasExplicitQty: boolean;
} {
  const leadMatch = LEADING_QTY_REGEX.exec(beforeText);
  if (leadMatch) {
    const num = Math.max(1, Math.min(MAX_QUANTITY_PER_ITEM, Number(leadMatch[1]) || 1));
    return { quantity: num, hasExplicitQty: true };
  }
  const trailMatch = TRAILING_QTY_REGEX.exec(afterText);
  if (trailMatch) {
    const num = Math.max(1, Math.min(MAX_QUANTITY_PER_ITEM, Number(trailMatch[1]) || 1));
    return { quantity: num, hasExplicitQty: true };
  }
  return { quantity: 1, hasExplicitQty: false };
}

export function parseDrinkChat(text: string): ParsedDrinkChat {
  const rawLower = text.trim().toLowerCase();
  const normalized = normalizeChatText(text);
  const segments = normalized
    .split(SEGMENT_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);

  const items: ParsedDrinkOrderItem[] = [];
  for (const segment of segments) {
    const segModifiers = parseSegmentModifiers(segment);
    const seenRecipeInSegment = new Set<RecipeId>();
    DRINK_SCAN_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null = DRINK_SCAN_REGEX.exec(segment);
    while (match !== null) {
      const matchedKw = match[2];
      const recipeId = KEYWORD_TO_RECIPE_MAP.get(matchedKw);
      if (recipeId) {
        const kwStart = match.index + match[1].length;
        const kwEnd = kwStart + matchedKw.length;
        const beforeText = segment.slice(0, kwStart);
        const afterText = segment.slice(kwEnd);
        const { quantity, hasExplicitQty } = extractQuantityAroundMatch(beforeText, afterText);

        // Collapse redundant alias in the same clause (e.g. "1 cf cà phê" -> 1 Coffee, not 2)
        if (!seenRecipeInSegment.has(recipeId) || hasExplicitQty) {
          seenRecipeInSegment.add(recipeId);
          items.push({
            recipeId,
            quantity,
            sugarLevel: segModifiers.sugarLevel,
            iceLevel: segModifiers.iceLevel,
          });
        }
      }
      match = DRINK_SCAN_REGEX.exec(segment);
    }
  }

  const globalModifiers = parseSegmentModifiers(normalized);
  const firstItem = items[0];
  const matchedRecipe = firstItem?.recipeId;
  const sugarLevel = firstItem?.sugarLevel ?? globalModifiers.sugarLevel;
  const iceLevel = firstItem?.iceLevel ?? globalModifiers.iceLevel;

  const hasOrderWord = matchAnyKeyword(normalized, rawLower, ORDER_TRIGGER_KEYWORDS);
  const hasFlavorModifier = Boolean(matchedRecipe || globalModifiers.sugarLevel || globalModifiers.iceLevel);
  const isOrderIntent = items.length > 0 || hasOrderWord;

  return {
    isOrderIntent,
    items,
    recipeId: matchedRecipe,
    sugarLevel,
    iceLevel,
    hasFlavorModifier,
  };
}

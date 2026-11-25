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
    keywords: ['matcha', 'tra xanh', 'trà xanh', 'green tea', 'mat cha'],
  },
  {
    id: 'thai_tea',
    icon: '🧋',
    nameEn: 'Milk Tea',
    nameVi: 'Trà Sữa',
    shortNameEn: 'Milk Tea',
    shortNameVi: 'Trà Sữa',
    menuCommand: 'tra',
    botKeyword: 'tra',
    baseColor: '#D89E68',
    secondaryColor: '#FFF8EE',
    accentColor: '#B87842',
    toolType: 'shaker',
    fruitType: 'peach',
    keywords: ['tra', 'trà', 'trasua', 'trà sữa', 'tra sua', 'milk tea', 'tea'],
  },
  {
    id: 'coffee_milk',
    icon: '☕',
    nameEn: 'Coffee',
    nameVi: 'Cafe',
    shortNameEn: 'Coffee',
    shortNameVi: 'Cafe',
    menuCommand: 'cafe',
    botKeyword: 'cafe',
    baseColor: '#6F4732',
    secondaryColor: '#F7E8D4',
    accentColor: '#9C6644',
    toolType: 'coffee_machine',
    fruitType: 'bean',
    keywords: ['cafe', 'cà phê', 'ca phe', 'coffee', 'ca fe', 'espresso', 'latte', 'bac xiu'],
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
    keywords: ['soda', 'so da', 'sparkling', 'gas'],
  },
  {
    id: 'blue_citrus',
    icon: '🍊',
    nameEn: 'Fresh Orange Juice',
    nameVi: 'Nước Cam Tươi',
    shortNameEn: 'Orange',
    shortNameVi: 'Nước Cam',
    menuCommand: 'nuocep',
    botKeyword: 'nuocep',
    baseColor: '#FF9526',
    secondaryColor: '#FFF3E0',
    accentColor: '#FF6E14',
    toolType: 'juicer',
    fruitType: 'orange',
    keywords: ['nuocep', 'nước ép', 'nuoc ep', 'ep', 'ép', 'juice', 'cam', 'nước cam', 'orange'],
  },
] as const;

export const RECIPE_MAP: Record<RecipeId, DrinkRecipe> = {
  matcha: RECIPE_LIST[0],
  thai_tea: RECIPE_LIST[1],
  coffee_milk: RECIPE_LIST[2],
  berry_soda: RECIPE_LIST[3],
  blue_citrus: RECIPE_LIST[4],
};

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
  'drink',
  'uong',
  'uống',
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
  const index = Math.floor(Math.random() * RECIPE_LIST.length);
  return RECIPE_LIST[index].id;
}

export interface ParsedDrinkChat {
  isOrderIntent: boolean;
  recipeId?: RecipeId;
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
  hasFlavorModifier: boolean;
}

function matchKeywordToken(normalized: string, rawLower: string, keyword: string): boolean {
  const cleanKw = normalizeChatText(keyword);
  const pattern = new RegExp(`(^|\\s|[.,!?:;/])${cleanKw}(\\s|$|[.,!?:;/])`, 'i');
  return pattern.test(normalized) || rawLower === keyword.toLowerCase();
}

function matchAnyKeyword(normalized: string, rawLower: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => matchKeywordToken(normalized, rawLower, kw));
}

export function parseDrinkChat(text: string): ParsedDrinkChat {
  const rawLower = text.trim().toLowerCase();
  const normalized = normalizeChatText(text);

  let matchedRecipe: RecipeId | undefined;
  for (const recipe of RECIPE_LIST) {
    if (matchAnyKeyword(normalized, rawLower, recipe.keywords)) {
      matchedRecipe = recipe.id;
      break;
    }
  }

  let sugarLevel: SugarLevel | undefined;
  if (matchAnyKeyword(normalized, rawLower, LESS_SUGAR_KEYWORDS)) {
    sugarLevel = 'LESS';
  } else if (matchAnyKeyword(normalized, rawLower, SWEET_SUGAR_KEYWORDS)) {
    sugarLevel = 'SWEET';
  }

  let iceLevel: IceLevel | undefined;
  if (matchAnyKeyword(normalized, rawLower, NO_ICE_KEYWORDS)) {
    iceLevel = 'NONE';
  } else if (matchAnyKeyword(normalized, rawLower, EXTRA_ICE_KEYWORDS)) {
    iceLevel = 'EXTRA';
  } else if (matchAnyKeyword(normalized, rawLower, LESS_ICE_KEYWORDS)) {
    iceLevel = 'LESS';
  }

  const hasOrderWord = matchAnyKeyword(normalized, rawLower, ORDER_TRIGGER_KEYWORDS);
  const hasFlavorModifier = Boolean(matchedRecipe || sugarLevel || iceLevel);
  // Typing a menu drink keyword (matcha, tra, cafe, sua, dau, chanh) OR an order word triggers an order
  const isOrderIntent = Boolean(matchedRecipe || hasOrderWord);

  return {
    isOrderIntent,
    recipeId: matchedRecipe,
    sugarLevel,
    iceLevel,
    hasFlavorModifier,
  };
}

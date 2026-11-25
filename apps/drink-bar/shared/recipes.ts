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
  fruitType: 'leaf' | 'peach' | 'bean' | 'berry' | 'lime';
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
    icon: '🧃',
    nameEn: 'Fruit Juice',
    nameVi: 'Nước Ép',
    shortNameEn: 'Juice',
    shortNameVi: 'Nước Ép',
    menuCommand: 'nuocep',
    botKeyword: 'nuocep',
    baseColor: '#F49E60',
    secondaryColor: '#FFE7C2',
    accentColor: '#E07A3B',
    toolType: 'juicer',
    fruitType: 'lime',
    keywords: ['nuocep', 'nước ép', 'nuoc ep', 'ep', 'ép', 'juice'],
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
      action: 'tool_prep',
      minProgress: 0,
      maxProgress: 25,
      labelVi: 'Đánh Matcha bằng chasen',
      labelEn: 'Whisking matcha with chasen',
      shortVi: 'Đánh Matcha',
      shortEn: 'Whisking',
    },
    {
      step: 2,
      action: 'add_ice',
      minProgress: 25,
      maxProgress: 40,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 3,
      action: 'pour_mix',
      minProgress: 40,
      maxProgress: 75,
      labelVi: 'Rót sữa dưới & matcha trên',
      labelEn: 'Pouring milk & matcha layers',
      shortVi: 'Rót 2 tầng',
      shortEn: 'Pouring',
    },
    {
      step: 4,
      action: 'topping',
      minProgress: 75,
      maxProgress: 90,
      labelVi: 'Thêm bọt kem & topping',
      labelEn: 'Adding foam & toppings',
      shortVi: 'Topping',
      shortEn: 'Toppings',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 90,
      maxProgress: 101,
      labelVi: 'Đóng nắp & hoàn tất',
      labelEn: 'Sealing & ready',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  thai_tea: [
    {
      step: 1,
      action: 'add_ice',
      minProgress: 0,
      maxProgress: 25,
      labelVi: 'Bỏ đá & trân châu vào ly',
      labelEn: 'Adding ice & boba',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 25,
      maxProgress: 50,
      labelVi: 'Lắc đều bình shaker',
      labelEn: 'Shaking milk tea',
      shortVi: 'Lắc bình',
      shortEn: 'Shaking',
    },
    {
      step: 3,
      action: 'pour_mix',
      minProgress: 50,
      maxProgress: 75,
      labelVi: 'Đổ trà sữa ra ly',
      labelEn: 'Pouring milk tea',
      shortVi: 'Đổ trà sữa',
      shortEn: 'Pouring',
    },
    {
      step: 4,
      action: 'topping',
      minProgress: 75,
      maxProgress: 90,
      labelVi: 'Thêm kem / topping',
      labelEn: 'Adding cream & toppings',
      shortVi: 'Topping',
      shortEn: 'Toppings',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 90,
      maxProgress: 101,
      labelVi: 'Đóng nắp & hoàn tất',
      labelEn: 'Sealing & ready',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  coffee_milk: [
    {
      step: 1,
      action: 'tool_prep',
      minProgress: 0,
      maxProgress: 25,
      labelVi: 'Chiết xuất phin / espresso',
      labelEn: 'Brewing espresso shot',
      shortVi: 'Chiết xuất',
      shortEn: 'Brewing',
    },
    {
      step: 2,
      action: 'add_ice',
      minProgress: 25,
      maxProgress: 40,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 3,
      action: 'pour_mix',
      minProgress: 40,
      maxProgress: 75,
      labelVi: 'Rót sữa dưới & cafe trên',
      labelEn: 'Pouring milk & espresso',
      shortVi: 'Rót 2 tầng',
      shortEn: 'Pouring',
    },
    {
      step: 4,
      action: 'topping',
      minProgress: 75,
      maxProgress: 90,
      labelVi: 'Rót kem muối / bọt cafe',
      labelEn: 'Swirling salted cream',
      shortVi: 'Kem muối',
      shortEn: 'Salted Cream',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 90,
      maxProgress: 101,
      labelVi: 'Đóng nắp & hoàn tất',
      labelEn: 'Sealing & ready',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  berry_soda: [
    {
      step: 1,
      action: 'add_ice',
      minProgress: 0,
      maxProgress: 18,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 2,
      action: 'tool_prep',
      minProgress: 18,
      maxProgress: 45,
      labelVi: 'Rót siro berry đáy ly',
      labelEn: 'Pouring berry syrup base',
      shortVi: 'Rót siro',
      shortEn: 'Syrup',
    },
    {
      step: 3,
      action: 'pour_mix',
      minProgress: 45,
      maxProgress: 75,
      labelVi: 'Rót soda sủi bọt ga',
      labelEn: 'Pouring sparkling soda',
      shortVi: 'Rót soda',
      shortEn: 'Fizzing',
    },
    {
      step: 4,
      action: 'topping',
      minProgress: 75,
      maxProgress: 90,
      labelVi: 'Trang trí trái cây & topping',
      labelEn: 'Adding fruit garnish',
      shortVi: 'Topping',
      shortEn: 'Toppings',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 90,
      maxProgress: 101,
      labelVi: 'Đóng nắp & hoàn tất',
      labelEn: 'Sealing & ready',
      shortVi: 'Đóng nắp',
      shortEn: 'Sealing',
    },
  ],
  blue_citrus: [
    {
      step: 1,
      action: 'tool_prep',
      minProgress: 0,
      maxProgress: 30,
      labelVi: 'Ép trái cây tươi',
      labelEn: 'Juicing fresh fruit',
      shortVi: 'Ép trái cây',
      shortEn: 'Juicing',
    },
    {
      step: 2,
      action: 'add_ice',
      minProgress: 30,
      maxProgress: 45,
      labelVi: 'Bỏ đá viên vào ly',
      labelEn: 'Dropping ice cubes',
      shortVi: 'Bỏ đá',
      shortEn: 'Add Ice',
    },
    {
      step: 3,
      action: 'pour_mix',
      minProgress: 45,
      maxProgress: 75,
      labelVi: 'Rót nước ép tươi vào ly',
      labelEn: 'Pouring fresh juice',
      shortVi: 'Rót nước ép',
      shortEn: 'Pouring',
    },
    {
      step: 4,
      action: 'topping',
      minProgress: 75,
      maxProgress: 90,
      labelVi: 'Cài lát cam / chanh tươi',
      labelEn: 'Adding citrus garnish',
      shortVi: 'Topping',
      shortEn: 'Toppings',
    },
    {
      step: 5,
      action: 'seal',
      minProgress: 90,
      maxProgress: 101,
      labelVi: 'Đóng nắp & hoàn tất',
      labelEn: 'Sealing & ready',
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

/**
 * Clash Arena Intro Background Pool & Shuffle-Bag Selector.
 * Provides dynamically rotating esports arena backdrops for the 3.5s cinematic
 * and the pre-round waiting card with non-repeating shuffle bag distribution.
 */

export const INTRO_BACKGROUND_ID = {
  ORIGINAL: 'original',
  FROST_INFERNO: 'frost_inferno',
  HEXTECH_GOLD: 'hextech_gold',
  STORM_LIGHTNING: 'storm_lightning',
  CYBER_LASER: 'cyber_laser',
  JADE_VOLCANO: 'jade_volcano',
} as const;

export type IntroBackgroundId = (typeof INTRO_BACKGROUND_ID)[keyof typeof INTRO_BACKGROUND_ID];

export interface IntroBackgroundItem {
  readonly id: IntroBackgroundId;
  readonly name: string;
  readonly src: string;
  readonly themeTag: string;
}

export const INTRO_BACKGROUND_POOL: readonly IntroBackgroundItem[] = [
  {
    id: INTRO_BACKGROUND_ID.ORIGINAL,
    name: 'Original Esports Arena',
    src: '/images/esports_intro_bg.jpg',
    themeTag: 'classic',
  },
  {
    id: INTRO_BACKGROUND_ID.FROST_INFERNO,
    name: 'Frost vs Inferno Arena',
    src: '/images/esports_intro_bg_frost_inferno.jpg',
    themeTag: 'frost_fire',
  },
  {
    id: INTRO_BACKGROUND_ID.HEXTECH_GOLD,
    name: 'Hextech & Celestial Gold Arena',
    src: '/images/esports_intro_bg_hextech_gold.jpg',
    themeTag: 'hextech',
  },
  {
    id: INTRO_BACKGROUND_ID.STORM_LIGHTNING,
    name: 'Storm Lightning & Solar Flare Arena',
    src: '/images/esports_intro_bg_storm_lightning.jpg',
    themeTag: 'storm',
  },
  {
    id: INTRO_BACKGROUND_ID.CYBER_LASER,
    name: 'Cyberpunk Laser Matrix Arena',
    src: '/images/esports_intro_bg_cyber_laser.jpg',
    themeTag: 'cyber',
  },
  {
    id: INTRO_BACKGROUND_ID.JADE_VOLCANO,
    name: 'Jade Dragon & Volcanic Magma Arena',
    src: '/images/esports_intro_bg_jade_volcano.jpg',
    themeTag: 'jade',
  },
] as const;

export const DEFAULT_INTRO_BACKGROUND = INTRO_BACKGROUND_POOL[0].src;

/**
 * Fisher-Yates Shuffle Bag State.
 * Guarantees every background is seen before any repeats, and avoids
 * identical backgrounds appearing at the junction between two consecutive bags.
 */
let shuffleBag: IntroBackgroundItem[] = [];
let lastPickedId: IntroBackgroundId | null = null;

const refillShuffleBag = (): void => {
  const poolCopy = [...INTRO_BACKGROUND_POOL];
  // Fisher-Yates shuffle
  for (let i = poolCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = poolCopy[i];
    poolCopy[i] = poolCopy[j];
    poolCopy[j] = temp;
  }

  // If the first item of the new bag matches the last picked item of the previous bag,
  // swap it with the last item of the new bag to guarantee no immediate repeats.
  if (poolCopy.length > 1 && lastPickedId !== null && poolCopy[0].id === lastPickedId) {
    const swapTargetIndex = poolCopy.length - 1;
    const temp = poolCopy[0];
    poolCopy[0] = poolCopy[swapTargetIndex];
    poolCopy[swapTargetIndex] = temp;
  }

  shuffleBag = poolCopy;
};

/**
 * Preload an image URL into browser cache for instantaneous zero-latency rendering.
 */
export const preloadIntroBackground = (src: string): void => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  const img = new Image();
  img.src = src;
};

/**
 * Preloads all background images in the pool on game startup.
 */
export const preloadAllIntroBackgrounds = (): void => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  INTRO_BACKGROUND_POOL.forEach((item) => {
    preloadIntroBackground(item.src);
  });
};

/**
 * Draws the next background from the shuffle bag and preloads the subsequent one.
 */
export const pickNextIntroBackground = (): string => {
  if (shuffleBag.length === 0) {
    refillShuffleBag();
  }

  const item = shuffleBag.pop();
  if (!item) {
    return DEFAULT_INTRO_BACKGROUND;
  }

  lastPickedId = item.id;

  // Preload next upcoming background from the bag if available
  const nextUpcoming = shuffleBag[shuffleBag.length - 1];
  if (nextUpcoming) {
    preloadIntroBackground(nextUpcoming.src);
  }

  return item.src;
};

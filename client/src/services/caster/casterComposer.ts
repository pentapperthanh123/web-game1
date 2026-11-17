import i18n from '../../i18n';
import {
  CASTER_DIALOGUE,
  CASTER_EVENT_RULES,
  CASTER_NUMBER,
  CASTER_QUEUE,
  CASTER_SPEAKER,
  CasterSignal,
  CasterSpeaker,
} from '../../constants/caster';

export type CasterSlots = Record<string, string | number>;

/** One turn of a two-caster exchange, as written in i18n under Caster.dialogues.<SIGNAL>[variant][turn]. */
export interface DialogueTurn {
  speaker: CasterSpeaker;
  text: string;
}

const LANG = { VI: 'vi', EN: 'en' } as const;
const UNFILLED_SLOT = /\{\{|\}\}/;
/** Single lines and exchanges of one signal rotate their variants separately. */
const DIALOGUE_KEY_PREFIX = 'dialogue:';
const recentVariantsByKey = new Map<string, number[]>();
const SPEAKERS = new Set<string>(Object.values(CASTER_SPEAKER));

/** Voice language follows the overlay language. */
export const getCasterLang = (): string => (i18n.language?.startsWith(LANG.EN) ? LANG.EN : LANG.VI);

/** A fresh variant index for this key, avoiding the ones used most recently. */
const pickFreshIndex = (key: string, variantCount: number): number => {
  const recent = recentVariantsByKey.get(key) ?? [];
  const avoidCount = Math.min(CASTER_EVENT_RULES.RECENT_VARIANTS_TO_AVOID, variantCount - 1);
  const avoided = new Set(avoidCount > 0 ? recent.slice(-avoidCount) : []);
  const candidates = Array.from({ length: variantCount }, (_, index) => index).filter((index) => !avoided.has(index));
  const index = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
  recentVariantsByKey.set(key, [...recent, index].slice(-CASTER_EVENT_RULES.RECENT_VARIANTS_TO_AVOID));
  return index;
};

const pickVariantIndex = (signal: CasterSignal, variantCount: number): number => pickFreshIndex(signal, variantCount);

const isDialogueTurn = (value: unknown): value is { speaker: string; text: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).speaker === 'string' &&
  typeof (value as Record<string, unknown>).text === 'string';

/** Fills the slots of one written exchange; null when a turn is malformed or a slot stays empty. */
const fillDialogueVariant = (signal: CasterSignal, variantIndex: number, rawTurns: unknown, slots: CasterSlots): DialogueTurn[] | null => {
  if (!Array.isArray(rawTurns) || rawTurns.length === 0 || rawTurns.length > CASTER_DIALOGUE.MAX_TURNS) return null;
  const turns: DialogueTurn[] = [];
  for (let turnIndex = 0; turnIndex < rawTurns.length; turnIndex += 1) {
    const rawTurn = rawTurns[turnIndex];
    if (!isDialogueTurn(rawTurn) || !SPEAKERS.has(rawTurn.speaker)) return null;
    const text = i18n.t(`Caster.dialogues.${signal}.${variantIndex}.${turnIndex}.text`, { ...slots, defaultValue: '' });
    if (!text || UNFILLED_SLOT.test(text)) return null;
    turns.push({ speaker: rawTurn.speaker as CasterSpeaker, text });
  }
  return turns;
};

/**
 * Picks a fresh two-caster exchange of the signal and fills its slots; null when none is written
 * (the caller then says the single line instead).
 */
export const composeCasterDialogue = (signal: CasterSignal, slots: CasterSlots): DialogueTurn[] | null => {
  const variants = i18n.t(`Caster.dialogues.${signal}`, { returnObjects: true, defaultValue: [] });
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const index = pickFreshIndex(`${DIALOGUE_KEY_PREFIX}${signal}`, variants.length);
  return fillDialogueVariant(signal, index, variants[index], slots);
};

/** Every turn of every written exchange of a signal (used to pre-generate predictable voices). */
export const composeAllDialogueTurns = (signal: CasterSignal, slots: CasterSlots): DialogueTurn[] => {
  const variants = i18n.t(`Caster.dialogues.${signal}`, { returnObjects: true, defaultValue: [] });
  if (!Array.isArray(variants)) return [];
  return variants.flatMap((rawTurns, index) => fillDialogueVariant(signal, index, rawTurns, slots) ?? []);
};

/** Picks a fresh variant of the signal's line and fills its slots; null if a slot stays empty. */
export const composeCasterLine = (signal: CasterSignal, slots: CasterSlots): string | null => {
  const variants = i18n.t(`Caster.lines.${signal}`, { returnObjects: true, defaultValue: [] });
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const index = pickVariantIndex(signal, variants.length);
  const text = i18n.t(`Caster.lines.${signal}.${index}`, { ...slots, defaultValue: '' });
  if (!text || UNFILLED_SLOT.test(text)) return null;
  return text;
};

/** "A, B, C và D": how a list of viewer names is read out. */
export const joinSpokenNames = (names: readonly string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  const lastName = names[names.length - 1];
  const leadingNames = names.slice(0, -1).join(CASTER_QUEUE.SPOKEN_NAME_SEPARATOR);
  return `${leadingNames}${i18n.t('Caster.nameJoiner', ' và ')}${lastName}`;
};

/** Every variant of a signal with these slots (used to pre-generate the voice of predictable lines). */
export const composeAllCasterVariants = (signal: CasterSignal, slots: CasterSlots): string[] => {
  const variants = i18n.t(`Caster.lines.${signal}`, { returnObjects: true, defaultValue: [] });
  if (!Array.isArray(variants)) return [];
  return variants
    .map((_, index) => i18n.t(`Caster.lines.${signal}.${index}`, { ...slots, defaultValue: '' }))
    .filter((text) => Boolean(text) && !UNFILLED_SLOT.test(text));
};

const DECIMAL_STEP = 10;

/** One decimal for millions ("1,2 triệu"), dropped when it is zero. */
const formatMillions = (value: number): string => {
  const tenths = Math.floor((value / CASTER_NUMBER.MILLION) * DECIMAL_STEP);
  const whole = Math.floor(tenths / DECIMAL_STEP);
  const decimal = tenths % DECIMAL_STEP;
  const amount = decimal === 0 ? String(whole) : i18n.t('Caster.number.decimal', { whole, decimal, defaultValue: '{{whole}} phẩy {{decimal}}' });
  const isExact = value % CASTER_NUMBER.MILLION === 0 || (value * DECIMAL_STEP) % CASTER_NUMBER.MILLION === 0;
  return i18n.t(isExact ? 'Caster.number.millionsExact' : 'Caster.number.millions', {
    value: amount,
    defaultValue: isExact ? '{{value}} triệu' : 'hơn {{value}} triệu',
  });
};

/**
 * Spoken numbers are rounded (spec 5.1): 12 480 → "hơn 12 nghìn", 1 250 000 → "hơn 1 phẩy 2 triệu".
 * "hơn" ("more than") is only said when something was actually rounded away: 100 000 → "100 nghìn".
 */
export const formatSpeechNumber = (value: number): string => {
  const rounded = Math.max(0, Math.floor(value));
  if (rounded >= CASTER_NUMBER.MILLION) return formatMillions(rounded);
  if (rounded >= CASTER_NUMBER.THOUSAND) {
    const isExact = rounded % CASTER_NUMBER.THOUSAND === 0;
    return i18n.t(isExact ? 'Caster.number.thousandsExact' : 'Caster.number.thousands', {
      value: Math.floor(rounded / CASTER_NUMBER.THOUSAND),
      defaultValue: isExact ? '{{value}} nghìn' : 'hơn {{value}} nghìn',
    });
  }
  return String(rounded);
};

/** Series score as spoken, e.g. "1 - 0". */
export const formatScore = (left: number, right: number): string =>
  i18n.t('Caster.score', { left, right, defaultValue: '{{left}} - {{right}}' });

/** Used when a viewer name may not be spoken (blocked name, kill switch). */
export const getAnonymousName = (teamTag: string): string =>
  i18n.t('Caster.anonymousName', { team: teamTag, defaultValue: 'một chiến binh {{team}}' });

/**
 * Minimal starting blocklist, written to data/moderation.json on first run only.
 * The operator owns the real list and edits it live from the admin portal.
 *
 * Vietnamese words keep their diacritics on purpose: they are matched against accented text,
 * because stripping accents collides with everyday words (e.g. "các", "đi", "buổi").
 * ASCII entries (teencode, English) are also matched after accent stripping and leetspeak folding.
 */
export const MODERATION_SEED_TERMS: readonly string[] = [
  // Vietnamese profanity (accented)
  'địt',
  'đụ',
  'đéo',
  'lồn',
  'cặc',
  'buồi',
  'đĩ',
  'đm',
  'đmm',
  'đcm',
  'đkm',
  'vãi lồn',
  'mẹ mày',
  'bố mày',
  'con mẹ mày',
  'óc chó',
  'thằng chó',
  'con chó',
  'súc vật',
  'khốn nạn',
  // Vietnamese teencode (ASCII)
  'dmm',
  'dcm',
  'dkm',
  'vcl',
  'vkl',
  'clmm',
  'cmm',
  'dit me',
  'du ma',
  // English profanity and slurs
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'pussy',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  // Sexual / gambling / drugs
  'sex',
  'porn',
  'cá độ',
  'nhà cái',
  'ma túy',
  'cần sa',
];

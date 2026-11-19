/**
 * Generated index from server/data/casters.json
 * Maps each eventKey to its variant IDs for VoiceManager.
 */

export interface CasterVariant {
  id: string;
}

export type CastersIndex = Record<string, CasterVariant[]>;

export const CASTERS_INDEX: CastersIndex = {
  round_start: [
    { id: 'round_start_1' },
    { id: 'round_start_2' },
    { id: 'round_start_3' },
    { id: 'round_start_4' },
  ],
  blue_comeback: [
    { id: 'blue_comeback_1' },
    { id: 'blue_comeback_2' },
    { id: 'blue_comeback_3' },
  ],
  red_comeback: [
    { id: 'red_comeback_1' },
    { id: 'red_comeback_2' },
    { id: 'red_comeback_3' },
  ],
  blue_dominating: [
    { id: 'blue_dominating_1' },
    { id: 'blue_dominating_2' },
    { id: 'blue_dominating_3' },
  ],
  red_dominating: [
    { id: 'red_dominating_1' },
    { id: 'red_dominating_2' },
    { id: 'red_dominating_3' },
  ],
  neck_and_neck: [
    { id: 'neck_and_neck_1' },
    { id: 'neck_and_neck_2' },
    { id: 'neck_and_neck_3' },
  ],
  boss_hp_50: [
    { id: 'boss_hp_50_1' },
    { id: 'boss_hp_50_2' },
  ],
  boss_low_hp: [
    { id: 'boss_low_hp_1' },
    { id: 'boss_low_hp_2' },
    { id: 'boss_low_hp_3' },
  ],
  boss_enrage: [
    { id: 'boss_enrage_1' },
    { id: 'boss_enrage_2' },
    { id: 'boss_enrage_3' },
  ],
  shield_up: [
    { id: 'shield_up_1' },
    { id: 'shield_up_2' },
  ],
  shield_broken: [
    { id: 'shield_broken_1' },
    { id: 'shield_broken_2' },
    { id: 'shield_broken_3' },
  ],
  boss_skill: [
    { id: 'boss_skill_1' },
    { id: 'boss_skill_2' },
    { id: 'boss_skill_3' },
  ],
  silver_scrapes_start: [
    { id: 'silver_scrapes_start_1' },
    { id: 'silver_scrapes_start_2' },
    { id: 'silver_scrapes_start_3' },
  ],
  clutch_final_10s: [
    { id: 'clutch_final_10s_1' },
    { id: 'clutch_final_10s_2' },
  ],
  one_sided_final_10s: [
    { id: 'one_sided_final_10s_1' },
    { id: 'one_sided_final_10s_2' },
  ],
  blue_win: [
    { id: 'blue_win_1' },
    { id: 'blue_win_2' },
    { id: 'blue_win_3' },
  ],
  red_win: [
    { id: 'red_win_1' },
    { id: 'red_win_2' },
    { id: 'red_win_3' },
  ],
  donate_react_vip: [
    { id: 'donate_react_vip_1' },
    { id: 'donate_react_vip_2' },
    { id: 'donate_react_vip_3' },
    { id: 'donate_react_vip_4' },
  ],
  room_quiet_cta: [
    { id: 'room_quiet_cta_1' },
    { id: 'room_quiet_cta_2' },
    { id: 'room_quiet_cta_3' },
    { id: 'room_quiet_cta_4' },
  ],
  intro_rules: [
    { id: 'intro_rules_1' },
    { id: 'intro_rules_2' },
  ],
  intro_gifts: [
    { id: 'intro_gifts_1' },
  ],
};

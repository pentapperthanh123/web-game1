import { useCallback, useEffect, useState } from 'react';
import { GIFT_CONFIG_UI, GiftRule } from '../../constants/giftConfig';
import { adminSocket } from '../../services/socket';

export const getGiftRuleKey = (rule: GiftRule): string => rule.giftId || `name:${rule.name.toLowerCase()}`;

export interface GiftConfigDraft {
  rules: GiftRule[];
  isDirty: boolean;
  addRule: (rule: GiftRule) => void;
  updateRule: (ruleKey: string, patch: Partial<GiftRule>) => void;
  removeRule: (ruleKey: string) => void;
  save: () => void;
  discard: () => void;
}

/**
 * Local edit buffer for the gift rules. Follows the server copy until the admin edits something,
 * then keeps the edits until they are saved (the server echoes the saved list back) or discarded.
 */
export const useGiftConfigDraft = (): GiftConfigDraft => {
  const [savedRules, setSavedRules] = useState<GiftRule[]>([]);
  const [draftRules, setDraftRules] = useState<GiftRule[] | null>(null);

  useEffect(
    () =>
      adminSocket.onGiftRules((rules) => {
        setSavedRules(rules);
        setDraftRules(null);
      }),
    []
  );

  const rules = draftRules ?? savedRules;

  const edit = useCallback(
    (change: (current: GiftRule[]) => GiftRule[]) => setDraftRules((current) => change(current ?? savedRules)),
    [savedRules]
  );

  const addRule = useCallback(
    (rule: GiftRule) =>
      edit((current) => {
        const isDuplicate = current.some((existing) => getGiftRuleKey(existing) === getGiftRuleKey(rule));
        if (isDuplicate || current.length >= GIFT_CONFIG_UI.MAX_RULES) return current;
        return [...current, rule];
      }),
    [edit]
  );

  const updateRule = useCallback(
    (ruleKey: string, patch: Partial<GiftRule>) =>
      edit((current) => current.map((rule) => (getGiftRuleKey(rule) === ruleKey ? { ...rule, ...patch } : rule))),
    [edit]
  );

  const removeRule = useCallback(
    (ruleKey: string) => edit((current) => current.filter((rule) => getGiftRuleKey(rule) !== ruleKey)),
    [edit]
  );

  const save = useCallback(() => {
    if (draftRules) adminSocket.emitGiftConfig(draftRules);
  }, [draftRules]);

  const discard = useCallback(() => setDraftRules(null), []);

  return { rules, isDirty: draftRules !== null, addRule, updateRule, removeRule, save, discard };
};

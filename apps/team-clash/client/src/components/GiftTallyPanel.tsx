import React, { useEffect, useMemo } from 'react';
import { GIFT_PANEL_CONFIG } from '../../../shared/constants/clashConfig';
import type { PushTier } from '../../../shared/types/clash';
import { useClashText } from '../i18n/clashText';
import { useClashStore } from '../store/clashStore';
import { useGiftTallyStore, type GiftTallyEntry } from '../store/giftTallyStore';
import {
  GIFT_MENU,
  normalizeGiftName,
  resolveGiftPushPercent,
  resolveGiftTier,
} from '../utils/giftCatalog';

/** Accent per push tier (matches the gift alert card colors). */
const TIER_ACCENT: Record<PushTier, string> = {
  SMALL: '#FACC15',
  MEDIUM: '#22D3EE',
  LARGE: '#FB7185',
};

const MENU_MATCH_NAMES = new Set(GIFT_MENU.map((item) => item.matchName));

interface GiftRowModel {
  rowKey: string;
  icon: string;
  name: string;
  effect: string;
  price: string;
  tier: PushTier;
  entry: GiftTallyEntry | undefined;
}

/**
 * One gift line: icon, name + received count, effect + coin price.
 * Grey until that gift has been received this round; full color afterwards.
 */
const GiftRow: React.FC<{ row: GiftRowModel }> = ({ row }) => {
  const { entry } = row;
  const isReceived = Boolean(entry && entry.count > 0);
  const accent = TIER_ACCENT[row.tier];

  return (
    <div
      className={`relative flex items-center gap-2 h-[36px] pl-1.5 pr-2 rounded-xl border-2 transition-[opacity,filter] duration-300 ${
        isReceived ? '' : 'grayscale opacity-60'
      }`}
      style={{
        borderColor: isReceived ? accent : 'rgba(148, 163, 184, 0.45)',
        background: isReceived
          ? `linear-gradient(90deg, ${accent}55 0%, rgba(6, 8, 20, 0.9) 75%)`
          : 'rgba(30, 41, 59, 0.85)',
      }}
    >
      {/* Keyed by hitSeq: each new gift of this kind replays the hit + floating "+N" */}
      <span
        key={`icon-${entry?.hitSeq ?? 0}`}
        className={`w-7 shrink-0 text-center text-[24px] leading-none inline-block ${
          isReceived ? 'animate-gift-hit' : ''
        }`}
      >
        {row.icon}
      </span>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-[3px]">
        <div className="flex items-center justify-between gap-1">
          <span className={`truncate text-[14px] leading-[1.2] font-black ${isReceived ? 'text-white' : 'text-slate-300'}`}>
            {row.name}
          </span>
          <span
            key={`count-${entry?.hitSeq ?? 0}`}
            className={`shrink-0 text-[14px] leading-none font-black inline-block ${
              isReceived ? 'text-yellow-300 animate-amount-bump' : 'text-slate-400'
            }`}
          >
            ×{entry?.count ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span
            className="truncate text-[11px] leading-none font-extrabold"
            style={{ color: isReceived ? accent : '#94A3B8' }}
          >
            {row.effect}
          </span>
          <span
            className={`shrink-0 px-1.5 py-[1px] rounded-full text-[10px] leading-none font-black ${
              isReceived ? 'bg-yellow-300 text-black' : 'bg-slate-600 text-slate-200'
            }`}
          >
            🪙 {row.price}
          </span>
        </div>
      </div>

      {entry && (
        <span
          key={`float-${entry.hitSeq}`}
          className="absolute -top-3 right-2 text-[16px] font-black italic leading-none pointer-events-none animate-damage-float"
          style={{
            color: accent,
            textShadow: '0 0 2px #000, 0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000',
          }}
        >
          +{entry.lastAdded}
        </span>
      )}
    </div>
  );
};

/** Bottom-right gift menu: what each gift does, its price, and how many were received this round. */
export const GiftTallyPanel: React.FC = () => {
  const text = useClashText();
  const entries = useGiftTallyStore((s) => s.entries);
  const totalGifts = useGiftTallyStore((s) => s.totalGifts);
  const totalSeq = useGiftTallyStore((s) => s.totalSeq);
  const roundNumber = useClashStore((s) => s.roundNumber);
  const pushMultipliers = useClashStore((s) => s.pushMultipliers);

  // Gift totals are per round, like the TOP lists and MVPs.
  useEffect(() => {
    useGiftTallyStore.getState().reset();
  }, [roundNumber]);

  const rows = useMemo<GiftRowModel[]>(() => {
    const byName = new Map<string, GiftTallyEntry>();
    for (const entry of entries) byName.set(normalizeGiftName(entry.giftName), entry);

    const menuRows = GIFT_MENU.map((item) => ({
      rowKey: item.key,
      icon: item.icon,
      name: text.giftNames[item.key],
      effect: text.giftEffect(item.tier, resolveGiftPushPercent(item.coins, pushMultipliers)),
      price: text.coinPrice(item.coins),
      tier: item.tier,
      entry: byName.get(item.matchName),
    }));

    // Other received gifts (not in the menu): latest first, shown with their live name.
    const extraRows = entries
      .filter((entry) => !MENU_MATCH_NAMES.has(normalizeGiftName(entry.giftName)))
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, GIFT_PANEL_CONFIG.MAX_EXTRA_ROWS)
      .map((entry) => {
        const coinsPerGift = Math.max(1, Math.round(entry.coins / Math.max(1, entry.count)));
        const tier = resolveGiftTier(coinsPerGift);
        return {
          rowKey: `extra-${entry.giftName}`,
          icon: entry.icon,
          name: entry.giftName,
          effect: text.giftEffect(tier, resolveGiftPushPercent(coinsPerGift, pushMultipliers)),
          price: text.coinPrice(coinsPerGift),
          tier,
          entry,
        };
      });

    return [...menuRows, ...extraRows];
  }, [entries, text, pushMultipliers]);

  return (
    <div
      className="absolute z-20 pointer-events-none rounded-2xl border-2 border-yellow-300/70 px-1.5 pb-1.5 pt-3 shadow-2xl flex flex-col gap-1"
      style={{
        // Bottom edge pinned at BOTTOM_Y from the top (stable when the stage stretches taller).
        top: GIFT_PANEL_CONFIG.BOTTOM_Y,
        transform: 'translateY(-100%)',
        right: GIFT_PANEL_CONFIG.RIGHT_X,
        width: GIFT_PANEL_CONFIG.WIDTH,
        backgroundColor: 'rgba(6, 8, 20, 0.86)',
      }}
    >
      {/* Title + round total sit on the top border to keep the panel short */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-[3px] rounded-full bg-yellow-300 shadow-md whitespace-nowrap">
        <span className="text-[11px] leading-none font-black tracking-widest text-black">🎁 {text.giftsTitle}</span>
        <span
          key={totalSeq}
          className="text-[13px] leading-none font-black text-black inline-block animate-amount-bump"
        >
          ×{totalGifts}
        </span>
      </div>
      {rows.map((row) => (
        <GiftRow key={row.rowKey} row={row} />
      ))}
    </div>
  );
};

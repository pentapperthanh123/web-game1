import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { SilverScrapesDuelState } from '../../../types/game';
import { DUEL_DRAW, resolveEventText } from './silverScrapesShared';

const EVENT_BORDER_ALPHA = '99';

interface DuelResultBannerProps {
  winner: SilverScrapesDuelState['winner'];
  winnerTag: string | null;
}

const DuelResultBanner = ({ winner, winnerTag }: DuelResultBannerProps) => {
  const { t } = useTranslation();
  const isDraw = winner === DUEL_DRAW;
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-cyan-950/95 border-2 border-amber-400 shadow-[0_0_32px_rgba(245,158,11,0.6)] text-center animate-in zoom-in-95 duration-300">
      <div className="text-amber-300 text-sm font-black uppercase mb-1">
        <span>
          {isDraw
            ? t('SilverScrapes.draw', 'KẾT QUẢ HOÀ CÂN NÃO!')
            : t('SilverScrapes.winnerTitle', '🏆 {{winner}} CHIẾN THẮNG 1V1 SILVER SCRAPES!', { winner: winnerTag })}
        </span>
      </div>
      <p className="text-xs text-slate-200 font-semibold leading-relaxed">
        {isDraw
          ? t('SilverScrapes.drawDesc', 'Hai bên ngang tài ngang sức — Cả 2 đội nhận +10% Sát Thương đầu ván!')
          : t('SilverScrapes.winnerBuffDesc', 'Đoạt Chiến Công Đầu! Toàn đội {{winner}} nhận bùa lợi +20% Sát Thương trong 90s đầu Ván quyết định!', { winner: winnerTag })}
      </p>
    </div>
  );
};

interface DuelEventTickerProps {
  lastEvent: SilverScrapesDuelState['lastEvent'];
  eventColor: string | null;
}

/** Latest contribution, or the idle hint. Text wraps instead of being cut off with "...". */
const DuelEventTicker = ({ lastEvent, eventColor }: DuelEventTickerProps) => {
  const { t } = useTranslation();
  const eventText = lastEvent ? resolveEventText(lastEvent) : null;
  return (
    <div
      style={eventColor ? { borderColor: `${eventColor}${EVENT_BORDER_ALPHA}` } : undefined}
      className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg"
    >
      <Flame className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
      <p className="flex-1 min-w-0 text-xs font-semibold leading-snug text-slate-200 text-pretty break-words">
        {eventText ? (
          <>
            {eventText.donorName && <strong className="text-white">{eventText.donorName} </strong>}
            {eventText.description}
          </>
        ) : (
          <span className="text-slate-300">
            {t('SilverScrapes.idleHint', 'Mọi tương tác Thả Tim, Chat gọi tướng & Tặng Quà đều lập tức nạp năng lượng đẩy lùi đối thủ!')}
          </span>
        )}
      </p>
    </div>
  );
};

interface DuelFooterProps {
  winner: SilverScrapesDuelState['winner'];
  winnerTag: string | null;
  lastEvent: SilverScrapesDuelState['lastEvent'];
  eventColor: string | null;
}

export const DuelFooter = ({ winner, winnerTag, lastEvent, eventColor }: DuelFooterProps) => (
  <div className="relative z-10 w-full max-w-md pb-1">
    {winner !== null ? (
      <DuelResultBanner winner={winner} winnerTag={winnerTag} />
    ) : (
      <DuelEventTicker lastEvent={lastEvent} eventColor={eventColor} />
    )}
  </div>
);

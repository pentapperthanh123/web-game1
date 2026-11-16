import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Trophy } from 'lucide-react';
import { SilverScrapesDuelState } from '../../../types/game';
import { DUEL_DRAW, resolveEventText } from './silverScrapesShared';

const EVENT_BORDER_ALPHA = 'aa';

interface DuelResultBannerProps {
  winner: SilverScrapesDuelState['winner'];
  winnerTag: string | null;
}

const DuelResultBanner: React.FC<DuelResultBannerProps> = React.memo(({ winner, winnerTag }) => {
  const { t } = useTranslation();
  const isDraw = winner === DUEL_DRAW;

  const titleText = isDraw
    ? t('SilverScrapes.draw', 'KẾT QUẢ HOÀ CÂN NÃO!')
    : t('SilverScrapes.winnerTitle', '🏆 {{winner}} CHIẾN THẮNG 1V1 SILVER SCRAPES!', { winner: winnerTag });

  const descText = isDraw
    ? t('SilverScrapes.drawDesc', 'Hai bên ngang tài ngang sức — Cả 2 đội nhận +10% Sát Thương đầu ván!')
    : t(
        'SilverScrapes.winnerBuffDesc',
        'Đoạt Chiến Công Đầu! Toàn đội {{winner}} nhận bùa lợi +20% Sát Thương trong 90s đầu Ván quyết định!',
        { winner: winnerTag }
      );

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-cyan-950/95 border-2 border-amber-400 shadow-[0_0_36px_rgba(245,158,11,0.65)] text-center animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-center gap-1.5 text-amber-300 text-sm sm:text-base font-black uppercase mb-1 drop-shadow">
        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{titleText}</span>
        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
      </div>
      <p className="text-xs text-slate-200 font-semibold leading-relaxed">
        {descText}
      </p>
    </div>
  );
});

DuelResultBanner.displayName = 'DuelResultBanner';

interface DuelEventTickerProps {
  lastEvent: SilverScrapesDuelState['lastEvent'];
  eventColor: string | null;
}

/** Latest contribution or live broadcast hint. */
const DuelEventTicker: React.FC<DuelEventTickerProps> = React.memo(({ lastEvent, eventColor }) => {
  const { t } = useTranslation();
  const eventText = lastEvent ? resolveEventText(lastEvent) : null;

  return (
    <div
      style={eventColor ? { borderColor: `${eventColor}${EVENT_BORDER_ALPHA}` } : undefined}
      className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md"
    >
      <Flame className="w-4 h-4 mt-0.5 text-amber-400 shrink-0 animate-pulse" />
      <p className="flex-1 min-w-0 text-xs font-semibold leading-snug text-slate-200 text-pretty break-words">
        {eventText ? (
          <>
            {eventText.donorName && <strong className="text-white font-black">{eventText.donorName} </strong>}
            <span>{eventText.description}</span>
          </>
        ) : (
          <span className="text-slate-300">
            {t(
              'SilverScrapes.idleHint',
              'Mọi tương tác Thả Tim, Chat gọi tướng & Tặng Quà đều lập tức nạp năng lượng đẩy lùi đối thủ!'
            )}
          </span>
        )}
      </p>
    </div>
  );
});

DuelEventTicker.displayName = 'DuelEventTicker';

interface DuelFooterProps {
  winner: SilverScrapesDuelState['winner'];
  winnerTag: string | null;
  lastEvent: SilverScrapesDuelState['lastEvent'];
  eventColor: string | null;
}

export const DuelFooter: React.FC<DuelFooterProps> = React.memo(
  ({ winner, winnerTag, lastEvent, eventColor }) => {
    return (
      <div className="relative z-10 w-full max-w-lg pb-1">
        {winner !== null ? (
          <DuelResultBanner winner={winner} winnerTag={winnerTag} />
        ) : (
          <DuelEventTicker lastEvent={lastEvent} eventColor={eventColor} />
        )}
      </div>
    );
  }
);

DuelFooter.displayName = 'DuelFooter';


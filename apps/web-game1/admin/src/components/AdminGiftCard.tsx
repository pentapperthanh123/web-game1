import { Crown, Gift, Sparkles } from 'lucide-react';
import { GIFT_PRESETS, GiftPreset } from '../constants/adminPortal';
import { TeamColorPalette, TeamProfile } from '../constants/teams';
import { TeamLogo } from './TeamLogos';

interface AdminGiftCardProps {
  visible: boolean;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  donorName: string;
  giftTeam: 'BLG' | 'GENG';
  selectedGift: GiftPreset;
  onDonorNameChange: (name: string) => void;
  onGiftTeamChange: (team: 'BLG' | 'GENG') => void;
  onSelectGift: (gift: GiftPreset) => void;
  onSendGift: () => void;
}

/**
 * Column 3 of the interaction grid: simulates VIP TikTok gifts for a chosen team.
 */
export function AdminGiftCard({
  visible,
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  donorName,
  giftTeam,
  selectedGift,
  onDonorNameChange,
  onGiftTeamChange,
  onSelectGift,
  onSendGift,
}: AdminGiftCardProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${
        visible ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
        <Gift className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-black uppercase text-white">3. Tặng Quà VIP</h2>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Đại Gia Donate
          </label>
          <input
            type="text"
            value={donorName}
            onChange={(e) => onDonorNameChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Ủng hộ cho phe
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onGiftTeamChange('BLG')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                giftTeam === 'BLG'
                  ? leftTheme.adminActiveBtnClass
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <TeamLogo teamProfile={leftTeam} className="w-4 h-4" />
              <span>{leftTeam.shortTag}</span>
            </button>
            <button
              type="button"
              onClick={() => onGiftTeamChange('GENG')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                giftTeam === 'GENG'
                  ? rightTheme.adminActiveBtnClass
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <TeamLogo teamProfile={rightTeam} className="w-4 h-4" />
              <span>{rightTeam.shortTag}</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Quà Tặng TikTok
          </label>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {GIFT_PRESETS.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => onSelectGift(g)}
                className={`w-full p-1.5 rounded flex items-center justify-between text-[11px] border ${
                  selectedGift.name === g.name
                    ? 'bg-slate-800 border-amber-400 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>{g.name}</span>
                </div>
                <span className="font-mono text-amber-400">{g.coins} xu</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSendGift}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow flex items-center justify-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gửi Quà Tặng Hologram</span>
        </button>
      </div>
    </div>
  );
}

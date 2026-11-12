import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  Swords,
  Gift,
  MessageSquare,
  X,
  Dice5,
  Send,
  Zap,
  Search,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  GUEST_SIMULATION_CONSTANTS,
  TEAM_KEY,
} from '../../constants/game';
import { gameSocket } from '../../services/socket';
import { findChampion } from '../../constants/champions';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';

type GuestDockTab = 'HEART' | 'SUMMON' | 'GIFT' | 'CHAT';

const RANDOM_NAMES = [
  'Gamer_Pro_99',
  'Fan_Faker_VIP',
  'Bin_WarLord',
  'Chovy_God',
  'Knight_Super',
  'Viper_Sniper',
  'On_God',
  'Kiin_TopGod',
  'Canyon_Apex',
  'Ruler_Legend',
  'Duro_Shield',
  'SofM_ChienThan',
  'Top1_ThachDau',
  'Khach_VIP_68',
  'ThanhLong_CKTG',
];

export const GuestSimulationDock: React.FC = () => {
  const { t } = useTranslation();
  const isGuestModeActive = useGameStore((state) => state.isGuestModeActive);
  const setGuestMode = useGameStore((state) => state.setGuestMode);
  const guestTeam = useGameStore((state) => state.guestTeam);
  const setGuestTeam = useGameStore((state) => state.setGuestTeam);
  const guestName = useGameStore((state) => state.guestName);
  const setGuestName = useGameStore((state) => state.setGuestName);

  const addLikes = useGameStore((state) => state.addLikes);
  const summonMinion = useGameStore((state) => state.summonMinion);
  const triggerGiftExplosion = useGameStore((state) => state.triggerGiftExplosion);
  const addChatMessage = useGameStore((state) => state.addChatMessage);

  const [activeTab, setActiveTab] = useState<GuestDockTab>('HEART');
  const [tapStreak, setTapStreak] = useState<number>(0);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [championInput, setChampionInput] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [actionSuccessText, setActionSuccessText] = useState<string | null>(null);

  const streakResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTeams = useGameStore((state) => state.activeTeams);
  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const currentTeamProfile = activeTeams[guestTeam] || leftTeam;
  const currentTeamTheme = getTeamTheme(currentTeamProfile.colorTheme);
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const isBLG = guestTeam === TEAM_KEY.BLG;
  const quickChampions = currentTeamProfile.roster.map((p) => p.signatureChampion).slice(0, 6);
  const dynamicPresetChats = [
    `${currentTeamProfile.shortTag} vô địch CKTG 2026! 🔥`,
    `${currentTeamProfile.roster[2]?.signatureChampion || 'Ahri'} ${currentTeamProfile.shortTag}`,
    `${currentTeamProfile.roster[0]?.name || 'Pro'} gánh team!`,
    `Random ${currentTeamProfile.shortTag}`,
  ];

  const showToastSuccess = useCallback((text: string) => {
    setActionSuccessText(text);
    setTimeout(() => {
      setActionSuccessText((prev) => (prev === text ? null : prev));
    }, 1200);
  }, []);

  const handleRandomizeName = () => {
    const randomPick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const finalName = `${randomPick}_${Math.floor(Math.random() * 90) + 10}`;
    setGuestName(finalName);
  };

  // 1. Thao tác Thả tim (Tap Heart)
  const handleTapHeart = (count = 1) => {
    const now = Date.now();
    addLikes(count, guestTeam, guestName);
    gameSocket.sendLike(count, guestTeam, guestName);

    setLastTapTime(now);
    setTapStreak((prev) => prev + count);

    if (streakResetTimerRef.current) {
      clearTimeout(streakResetTimerRef.current);
    }
    streakResetTimerRef.current = setTimeout(() => {
      setTapStreak(0);
    }, 1800);
  };

  // 2. Thao tác Triệu hồi tướng (Quick Summon)
  const handleSummonChampion = (champName: string) => {
    const cleanName = champName.trim();
    if (!cleanName) return;

    const resolved = findChampion(cleanName);
    const finalChampName = resolved ? resolved.name : cleanName;

    summonMinion(guestName, finalChampName, guestTeam);
    gameSocket.sendSummon(guestName, finalChampName, guestTeam);

    showToastSuccess(`Đã gọi [${finalChampName}] cho ${currentTeamProfile.shortTag}!`);
    setChampionInput('');
  };

  // 3. Thao tác Gửi quà (Gift)
  const handleSendGift = (gift: { name: string; coins: number }) => {
    triggerGiftExplosion(gift.name, guestTeam, guestName, gift.coins);
    gameSocket.sendGift(gift.name, guestTeam, guestName, gift.coins);
    showToastSuccess(`Đã tặng [${gift.name}] (+${(gift.coins * 120).toLocaleString()} ST)!`);
  };

  // 4. Thao tác Gửi bình luận (Chat)
  const handleSendChat = (textToSend?: string) => {
    const msg = (textToSend ?? chatInput).trim();
    if (!msg) return;

    // Check if comment mentions a champion
    const resolvedChamp = findChampion(msg);
    const champName = resolvedChamp ? resolvedChamp.name : undefined;

    addChatMessage(guestName, msg, guestTeam, champName);
    gameSocket.sendChat(guestName, msg, guestTeam, champName);

    if (champName) {
      summonMinion(guestName, champName, guestTeam);
      gameSocket.sendSummon(guestName, champName, guestTeam);
      showToastSuccess(`Nhận diện tướng [${champName}], đã triệu hồi!`);
    } else {
      showToastSuccess('Đã gửi bình luận!');
    }

    setChatInput('');
  };

  if (!isGuestModeActive) return null;

  return (
    <div
      aria-label="Guest Simulation Dock"
      className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-lg z-50 pointer-events-auto select-none animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl bg-slate-950/92 border border-slate-700/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Top Header: Guest identity & Team Switcher */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/70">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider truncate">
              {t('Guest.dockTitle', 'Thao Tác Giả Lập Khách')}
            </span>

            {/* Editable / Randomizable Guest Name */}
            <div className="flex items-center space-x-1 pl-1">
              <span className="text-[10px] font-bold text-cyan-300 truncate max-w-[90px] sm:max-w-[120px]">
                {guestName}
              </span>
              <button
                type="button"
                onClick={handleRandomizeName}
                title={t('Guest.randomName', 'Đổi tên ngẫu nhiên')}
                className="p-1 rounded text-slate-400 hover:text-white transition active:scale-95"
              >
                <Dice5 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Team Selector Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-black">
              <button
                type="button"
                onClick={() => setGuestTeam(TEAM_KEY.BLG)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition ${
                  isBLG ? `${leftTheme.pillButtonClass} border` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TeamLogo teamProfile={leftTeam} className="w-3 h-3" />
                <span>{leftTeam.shortTag}</span>
              </button>
              <button
                type="button"
                onClick={() => setGuestTeam(TEAM_KEY.GENG)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition ${
                  !isBLG ? `${rightTheme.pillButtonClass} border` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TeamLogo teamProfile={rightTeam} className="w-3 h-3" />
                <span>{rightTeam.shortTag}</span>
              </button>
            </div>

            {/* Close Dock Button */}
            <button
              type="button"
              onClick={() => setGuestMode(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="Đóng bảng giả lập khách"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-black">
          <button
            type="button"
            onClick={() => setActiveTab('HEART')}
            className={`py-1.5 flex items-center justify-center space-x-1 transition border-b-2 ${
              activeTab === 'HEART'
                ? isBLG
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3 h-3 fill-current text-rose-400" />
            <span>{t('Guest.tabHeart', 'Thả Tim')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUMMON')}
            className={`py-1.5 flex items-center justify-center space-x-1 transition border-b-2 ${
              activeTab === 'SUMMON'
                ? isBLG
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3 h-3 text-cyan-400" />
            <span>{t('Guest.tabSummon', 'Gọi Tướng')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GIFT')}
            className={`py-1.5 flex items-center justify-center space-x-1 transition border-b-2 ${
              activeTab === 'GIFT'
                ? isBLG
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-3 h-3 text-yellow-400" />
            <span>{t('Guest.tabGift', 'Tặng Quà')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CHAT')}
            className={`py-1.5 flex items-center justify-center space-x-1 transition border-b-2 ${
              activeTab === 'CHAT'
                ? isBLG
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-emerald-400" />
            <span>{t('Guest.tabChat', 'Bình Luận')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-2 sm:p-2.5 min-h-[96px] flex flex-col justify-center">
          {/* Action Success Floating Toast */}
          {actionSuccessText && (
            <div className="text-center text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/60 rounded-md py-0.5 px-2 mb-1.5 animate-in fade-in zoom-in-95 duration-150">
              {actionSuccessText}
            </div>
          )}

          {/* TAB 1: THẢ TIM (HEART) */}
          {activeTab === 'HEART' && (
            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1 text-left">
                <div className="text-[11px] font-black text-white flex items-center space-x-1">
                  <span>{t('Guest.tapToLike', 'Thả Tim cổ vũ')}</span>
                  <span className={currentTeamTheme.textStrongClass}>
                    {currentTeamProfile.shortTag}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 flex items-center space-x-1">
                  <Zap className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                  <span>Tích nộ tuyển thủ & đẩy mốc Đại Hồi Phục</span>
                </div>
                {tapStreak > 1 && (
                  <div className="text-[10px] font-mono font-black text-rose-400 mt-1 animate-pulse">
                    🔥 {t('Guest.tapCombo', 'Nhịp tap')}: x{tapStreak}
                  </div>
                )}
              </div>

              {/* Big Tap Heart Button */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTapHeart(1)}
                  className={`p-3 rounded-2xl border transition active:scale-90 flex items-center justify-center ${
                    isBLG
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  }`}
                  title="Nhấn liên tục để thả tim!"
                >
                  <Heart
                    className={`w-6 h-6 fill-current text-white transition-transform ${
                      Date.now() - lastTapTime < 200 ? 'scale-125' : ''
                    }`}
                  />
                </button>

                {/* Quick Multi-Tap Buttons */}
                <div className="flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={() => handleTapHeart(10)}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-[9px] font-black text-slate-200 transition active:scale-95"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTapHeart(50)}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-[9px] font-black text-amber-300 transition active:scale-95"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GỌI TƯỚNG (SUMMON) */}
          {activeTab === 'SUMMON' && (
            <div className="space-y-1.5">
              {/* Quick Champion Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                  Gợi ý:
                </span>
                {quickChampions.map((champ) => (
                  <button
                    key={champ}
                    type="button"
                    onClick={() => handleSummonChampion(champ)}
                    className={`px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 transition active:scale-95 ${currentTeamTheme.pillButtonClass}`}
                  >
                    {champ}
                  </button>
                ))}
              </div>

              {/* Champion Search Input + Action */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSummonChampion(championInput);
                }}
                className="flex items-center space-x-1.5"
              >
                <div className="relative flex-1">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={championInput}
                    onChange={(e) => setChampionInput(e.target.value)}
                    placeholder={t(
                      'Guest.searchChampPlaceholder',
                      'Nhập tên tướng (VD: Yasuo, Zed)...'
                    )}
                    className="w-full pl-6 pr-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!championInput.trim()}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition active:scale-95 disabled:opacity-40 cursor-pointer ${
                    isBLG
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {t('Guest.summonAction', 'Triệu Hồi')}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: TẶNG QUÀ (GIFT) */}
          {activeTab === 'GIFT' && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {GUEST_SIMULATION_CONSTANTS.GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  type="button"
                  onClick={() => handleSendGift(gift)}
                  className="p-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-600 flex flex-col items-center text-center transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <span className="text-base sm:text-lg leading-none mb-0.5">{gift.icon}</span>
                  <span className="text-[9px] font-black text-slate-200 truncate max-w-full">
                    {gift.name.replace(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/g, '').trim()}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-amber-400">
                    {gift.coins} xu
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 4: BÌNH LUẬN (CHAT) */}
          {activeTab === 'CHAT' && (
            <div className="space-y-1.5">
              {/* Preset Comments */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                  Mẫu:
                </span>
                {dynamicPresetChats.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSendChat(preset)}
                    className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 hover:border-slate-500 text-[9px] font-semibold text-slate-300 shrink-0 transition active:scale-95"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Input + Send Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center space-x-1.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t(
                    'Guest.chatPlaceholder',
                    'Nhập bình luận hoặc [Tên tướng]...'
                  )}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={`p-1.5 rounded-lg text-slate-950 transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center ${
                    isBLG ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-amber-500 hover:bg-amber-400'
                  }`}
                  title={t('Guest.sendChat', 'Gửi Chat')}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

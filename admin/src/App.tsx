import { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Heart,
  MessageSquare,
  Gift,
  Swords,
  Activity,
  RotateCcw,
  Play,
  Square,
  Sparkles,
  Flame,
  ExternalLink,
  Crown,
  Trash2,
  Send,
  Zap,
  MapPin,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { adminSocket } from './services/socket';
import { TeamLogo } from './components/TeamLogos';
import { TeamConfigPanel } from './components/TeamConfigPanel';
import { SilverScrapesControls } from './components/SilverScrapesControls';
import { createDefaultTeamConfig, getTeamTheme, matchCommentTeam, TeamConfigState, ActiveTeamsMap } from './constants/teams';
import { SeriesFormatConfig, DEFAULT_SERIES_CONFIG } from './constants/series';
import { OverlayControls } from './components/OverlayControls';
import { BossSkillControls } from './components/BossSkillControls';
import { AutoProControls } from './components/AutoProControls';
import { AdminTabBar } from './components/AdminTabBar';
import {
  ADMIN_PORTAL_TAB,
  AdminPortalTabId,
  loadStoredAdminTab,
  saveStoredAdminTab,
} from './constants/tabs';
import {
  countVisibleOverlays,
  loadStoredOverlayVisibility,
} from './utils/overlayVisibility';
import { ALL_CHAMPIONS, findChampion, getRandomChampion, normalizeQuery } from './constants/champions';

function getMainGridClassName(activeTab: AdminPortalTabId): string {
  switch (activeTab) {
    case ADMIN_PORTAL_TAB.INTERACTION:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';
    case ADMIN_PORTAL_TAB.BOSS_MAP:
      return 'grid grid-cols-1 gap-5';
    case ADMIN_PORTAL_TAB.ALL:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5';
    default:
      return 'hidden';
  }
}

const ADMIN_APP_TITLE = 'LOL CKTG';

const RANDOM_CHAMPION_LIST = ALL_CHAMPIONS.map((c) => c.name);

const RANDOM_SPECTATOR_NAMES = [
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
  'HuyHuyenThoai',
  'ThanhLong_CKTG',
];

const GIFT_PRESETS = [
  { name: 'Hoa Hồng 🌹', coins: 1, label: 'Thường' },
  { name: 'Bánh Quy 🍪', coins: 10, label: 'Thường' },
  { name: 'Súng Nước 🔫', coins: 50, label: 'Hiếm' },
  { name: 'Trái Tim CKTG 💖', coins: 199, label: 'Hiếm' },
  { name: 'Rồng Thần CKTG 🐉', coins: 1000, label: 'VIP' },
  { name: 'Phượng Hoàng Lửa 🔥', coins: 2500, label: 'VIP' },
  { name: 'Tàu Vũ Trụ TikTok 🚀', coins: 10000, label: 'Huyền Thoại' },
];

const TIKTOK_STATUS_STYLE_MAP: Record<string, { dotClass: string; textClass: string }> = {
  CONNECTED: {
    dotClass: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
    textClass: 'text-emerald-400 font-bold',
  },
  CONNECTING: {
    dotClass: 'bg-yellow-400 animate-ping',
    textClass: 'text-yellow-400 font-bold',
  },
  DISCONNECTED: {
    dotClass: 'bg-rose-500',
    textClass: 'text-slate-400',
  },
};

const getTiktokStatusStyle = (status: string) => {
  return TIKTOK_STATUS_STYLE_MAP[status] || TIKTOK_STATUS_STYLE_MAP.DISCONNECTED;
};

interface LogItem {
  id: string;
  time: string;
  type: string;
  message: string;
  team?: string;
}

export const detectSummonCommand = (
  text: string,
  defaultTeam: 'BLG' | 'GENG' = 'BLG',
  activeTeams?: ActiveTeamsMap
): { championName: string; team: 'BLG' | 'GENG' } | null => {
  if (!text || !text.trim()) return null;

  const upper = text.toUpperCase().trim();

  let team: 'BLG' | 'GENG' | undefined = activeTeams
    ? matchCommentTeam(text, activeTeams)
    : undefined;
  if (!team && !activeTeams) {
    if (upper.includes('BLG')) {
      team = 'BLG';
    } else if (upper.includes('GENG') || upper.includes('GEN.G') || upper.includes('GEN')) {
      team = 'GENG';
    }
  }

  // 1. Check random summon commands
  if (
    upper.includes('RANDOM') ||
    upper.includes('NGAU NHIEN') ||
    upper.includes('NGAUNHIEN')
  ) {
    const randomChamp = getRandomChampion();
    return {
      championName: randomChamp.name,
      team: team || (Math.random() < 0.5 ? 'BLG' : 'GENG'),
    };
  }

  // 2. Intelligent resolution against all 169 official champions
  const matched = findChampion(text);
  if (!matched) return null;

  return {
    championName: matched.name,
    team: team || defaultTeam,
  };
};

export function App() {
  // TikTok Live connection state
  const [tiktokUsername, setTiktokUsername] = useState('sofm_official');
  const [tiktokStatus, setTiktokStatus] = useState<string>('DISCONNECTED');
  const [tiktokRoomId, setTiktokRoomId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Form states
  const [summonerName, setSummonerName] = useState('Gamer_Pro_99');
  const [selectedChampion, setSelectedChampion] = useState('Zed');
  const [selectedTeam, setSelectedTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [donorName, setDonorName] = useState('Đại_Gia_TikTok');
  const [selectedGift, setSelectedGift] = useState(GIFT_PRESETS[4]);
  const [giftTeam, setGiftTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [teamConfig, setTeamConfig] = useState<TeamConfigState>(() => createDefaultTeamConfig());
  const [customComment, setCustomComment] = useState('Vô địch CKTG 2026!');
  const [chatTeam, setChatTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [selectedTheme, setSelectedTheme] = useState<'BARON' | 'ELDER_DRAGON'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lol_game_theme_config');
      if (stored === 'ELDER_DRAGON') return 'ELDER_DRAGON';
    }
    return 'BARON';
  });
  const [bossHp, setBossHp] = useState(100000);
  const [isBotActive, setIsBotActive] = useState(false);
  const [isAutoSummonActive, setIsAutoSummonActive] = useState(false);
  const [autoSummonSpeed, setAutoSummonSpeed] = useState(800);
  const [autoSummonBatchSize, setAutoSummonBatchSize] = useState(2);
  const [autoSummonAlternateTeams, setAutoSummonAlternateTeams] = useState(true);
  const [autoSummonRandomChampions, setAutoSummonRandomChampions] = useState(true);
  const [botSpeed, setBotSpeed] = useState(1200);
  const [bo5Score, setBo5Score] = useState({ BLG: 0, GENG: 0 });
  const [currentRound, setCurrentRound] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminPortalTabId>(loadStoredAdminTab);
  const [activeOverlayCount, setActiveOverlayCount] = useState<number>(() =>
    countVisibleOverlays(loadStoredOverlayVisibility())
  );

  const handleSelectTab = (tabId: AdminPortalTabId) => {
    setActiveTab(tabId);
    saveStoredAdminTab(tabId);
    if (tabId === ADMIN_PORTAL_TAB.OVERLAYS) {
      setTimeout(() => {
        document.getElementById('section-overlays')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === ADMIN_PORTAL_TAB.BOSS_MAP) {
      setTimeout(() => {
        document.getElementById('section-boss-map')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === ADMIN_PORTAL_TAB.LOGS) {
      setTimeout(() => {
        document.getElementById('section-logs')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === ADMIN_PORTAL_TAB.TEAMS) {
      setTimeout(() => {
        document.getElementById('section-teams')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === ADMIN_PORTAL_TAB.SERIES_DUEL) {
      setTimeout(() => {
        document.getElementById('section-series-duel')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (tabId === ADMIN_PORTAL_TAB.INTERACTION) {
      setTimeout(() => {
        document.getElementById('section-interaction')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const [seriesConfig, setSeriesConfig] = useState<SeriesFormatConfig>(DEFAULT_SERIES_CONFIG);

  useEffect(() => {
    const unsub = adminSocket.onSeriesFormat((cfg) => {
      setSeriesConfig(cfg);
      setBo5Score({ BLG: cfg.blgScore, GENG: cfg.gengScore });
      setCurrentRound(cfg.currentRound);
    });
    return () => unsub();
  }, []);

  const leftTeam = teamConfig.activeTeams.BLG;
  const rightTeam = teamConfig.activeTeams.GENG;
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const isAllTab = activeTab === ADMIN_PORTAL_TAB.ALL;
  const shouldShowTeams = isAllTab || activeTab === ADMIN_PORTAL_TAB.TEAMS;
  const shouldShowSeriesDuel = isAllTab || activeTab === ADMIN_PORTAL_TAB.SERIES_DUEL;
  const shouldShowInteraction = isAllTab || activeTab === ADMIN_PORTAL_TAB.INTERACTION;
  const shouldShowBossMap = isAllTab || activeTab === ADMIN_PORTAL_TAB.BOSS_MAP;
  const shouldShowOverlays =
    isAllTab ||
    activeTab === ADMIN_PORTAL_TAB.OVERLAYS ||
    activeTab === ADMIN_PORTAL_TAB.INTERACTION;
  const shouldShowLogs = isAllTab || activeTab === ADMIN_PORTAL_TAB.LOGS;

  const [championSearchFilter, setChampionSearchFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<
    'ALL' | 'Fighter' | 'Mage' | 'Assassin' | 'Marksman' | 'Tank' | 'Support'
  >('ALL');

  const filteredChampions = useMemo(() => {
    let list = ALL_CHAMPIONS;
    if (selectedTagFilter !== 'ALL') {
      list = list.filter((c) => c.tags.includes(selectedTagFilter));
    }
    if (!championSearchFilter.trim()) return list;
    const q = normalizeQuery(championSearchFilter);
    return list.filter(
      (c) =>
        normalizeQuery(c.name).includes(q) ||
        normalizeQuery(c.nameVi).includes(q) ||
        normalizeQuery(c.roleNameVi).includes(q) ||
        c.aliases.some((a) => a.includes(q))
    );
  }, [championSearchFilter, selectedTagFilter]);

  const selectedChampDetail = useMemo(
    () => findChampion(selectedChampion),
    [selectedChampion]
  );

  const [logs, setLogs] = useState<LogItem[]>([]);

  const addLog = (type: string, message: string, team?: string) => {
    const newLog: LogItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      message,
      team,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  const handleBo5Control = (
    action: 'reset' | 'nextRound' | 'setScore',
    blg?: number,
    geng?: number,
    round?: number
  ) => {
    if (action === 'reset') {
      setBo5Score({ BLG: 0, GENG: 0 });
      setCurrentRound(1);
      adminSocket.emit('admin:bo5-control', { action: 'reset' });
      addLog('SYSTEM', `🔄 Đã Reset toàn bộ kết quả trận đấu ${seriesConfig.format} về 0 - 0 (Ván 1)`);
      return;
    }

    if (action === 'nextRound') {
      const nextRound = Math.min(seriesConfig.maxRounds, currentRound + 1);
      setCurrentRound(nextRound);
      adminSocket.emit('admin:bo5-control', { action: 'nextRound' });
      addLog('SYSTEM', `⚔️ Chuyển sang Ván ${nextRound} / ${seriesConfig.format}`);
      return;
    }

    if (action === 'setScore') {
      const nextBlg = Math.max(0, Math.min(seriesConfig.targetWins, blg ?? bo5Score.BLG));
      const nextGeng = Math.max(0, Math.min(seriesConfig.targetWins, geng ?? bo5Score.GENG));
      const nextRound = round ?? Math.min(seriesConfig.maxRounds, nextBlg + nextGeng + 1);
      setBo5Score({ BLG: nextBlg, GENG: nextGeng });
      setCurrentRound(nextRound);
      adminSocket.emit('admin:bo5-control', {
        action: 'setScore',
        blg: nextBlg,
        geng: nextGeng,
        currentRound: nextRound,
      });
      addLog('SYSTEM', `⚙️ Cập nhật điểm ${seriesConfig.format}: ${leftTeam.shortTag} ${nextBlg} - ${nextGeng} ${rightTeam.shortTag} (Ván ${nextRound})`);
    }
  };

  const handleSelectTheme = (theme: 'BARON' | 'ELDER_DRAGON') => {
    setSelectedTheme(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lol_game_theme_config', theme);
      } catch {
        // ignore
      }
    }
    adminSocket.setGameTheme(theme);
    addLog(
      'SYSTEM',
      `🗺️ Đã đổi bản đồ sang: ${theme === 'ELDER_DRAGON' ? 'Hang Rồng Ngàn Tuổi (Elder Dragon)' : 'Hang Baron Hư Không'}`
    );
  };

  useEffect(() => {
    // Set document title strictly to LOL CKTG
    document.title = ADMIN_APP_TITLE;

    const unsubscribeTeams = adminSocket.onTeamConfig((cfg) => {
      setTeamConfig(cfg);
    });

    const unsubscribeTheme = adminSocket.onGameTheme((data) => {
      if (data?.theme) {
        setSelectedTheme(data.theme);
      }
    });

    const unsubscribe = adminSocket.onTiktokStatus((data) => {
      setTiktokStatus(data.status);
      if (data.roomId) setTiktokRoomId(data.roomId);
      if (data.status === 'CONNECTED') {
        addLog('SYSTEM', `Đã kết nối luồng Live TikTok của @${data.username}`);
      } else if (data.status === 'ERROR') {
        addLog('SYSTEM', `Lỗi kết nối: ${data.error || 'Không xác định'}`);
      }
    });
    return () => {
      unsubscribe();
      unsubscribeTheme();
      unsubscribeTeams();
    };
  }, []);

  // Bot simulation runner
  useEffect(() => {
    if (!isBotActive) return;

    const interval = setInterval(() => {
      const champ = getRandomChampion();
      const team = Math.random() > 0.5 ? 'BLG' : 'GENG';
      const user = `Viewer_${Math.floor(Math.random() * 899) + 100}`;

      // Summon or gift
      if (Math.random() < 0.2) {
        adminSocket.emit('admin:gift', {
          giftName: 'Rồng Thần CKTG 🐉',
          team,
          donorName: user,
          coins: 1000,
        });
        addLog('GIFT', `${user} tặng Rồng Thần CKTG phe ${team}!`, team);
      } else {
        adminSocket.emit('admin:summon', {
          summonerName: user,
          championName: champ.name,
          team,
        });
        addLog('SUMMON', `${user} triệu hồi [${champ.name}] phe ${team}`, team);
      }

      // Random like burst
      adminSocket.emit('admin:like', {
        count: Math.floor(Math.random() * 3) + 1,
        team,
        userName: user,
      });
    }, botSpeed);

    return () => clearInterval(interval);
  }, [isBotActive, botSpeed]);

  useEffect(() => {
    if (!isAutoSummonActive) return;

    let currentTeam = selectedTeam;
    const interval = setInterval(() => {
      const championsPerWave = Math.max(1, Math.min(4, autoSummonBatchSize));

      for (let i = 0; i < championsPerWave; i++) {
        let champTeam: 'BLG' | 'GENG' = selectedTeam;
        if (autoSummonAlternateTeams) {
          const isEven = i % 2 === 0;
          const alternateTeam = currentTeam === 'BLG' ? 'GENG' : 'BLG';
          champTeam = isEven ? currentTeam : alternateTeam;
        }

        let targetChampName = selectedChampion;
        if (autoSummonRandomChampions || selectedChampion.includes('Ngẫu Nhiên')) {
          const rawChamp = RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
          const match = rawChamp.match(/\((.*?)\)/);
          targetChampName = match && match[1] ? match[1] : rawChamp;
        } else if (targetChampName.includes('(')) {
          const match = targetChampName.match(/\((.*?)\)/);
          if (match && match[1]) {
            targetChampName = match[1];
          }
        }

        const randomSpectator =
          RANDOM_SPECTATOR_NAMES[Math.floor(Math.random() * RANDOM_SPECTATOR_NAMES.length)];
        const randomNum = Math.floor(Math.random() * 899) + 100;
        const baseName = summonerName.trim() || randomSpectator;
        const user = `${baseName}_${randomNum}`;

        adminSocket.emit('admin:summon', {
          summonerName: user,
          championName: targetChampName,
          team: champTeam,
        });

        adminSocket.emit('admin:chat', {
          userName: user,
          text: `${targetChampName} ${champTeam}`,
          team: champTeam,
          championName: targetChampName,
        });

        addLog(
          'SUMMON',
          `⚡ [Auto] ${user} triệu hồi [${targetChampName}] phe ${champTeam}`,
          champTeam
        );
      }

      if (autoSummonAlternateTeams) {
        currentTeam = currentTeam === 'BLG' ? 'GENG' : 'BLG';
      }
    }, autoSummonSpeed);

    return () => clearInterval(interval);
  }, [
    isAutoSummonActive,
    autoSummonSpeed,
    autoSummonBatchSize,
    autoSummonAlternateTeams,
    autoSummonRandomChampions,
    selectedTeam,
    selectedChampion,
    summonerName,
  ]);

  const handleConnectTiktok = async () => {
    setIsConnecting(true);
    try {
      await adminSocket.connectTiktokRoom(tiktokUsername);
    } catch (err: any) {
      addLog('SYSTEM', `Lỗi: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectTiktok = async () => {
    await adminSocket.disconnectTiktokRoom();
    setTiktokStatus('DISCONNECTED');
    setTiktokRoomId('');
    addLog('SYSTEM', 'Đã ngắt kết nối phòng TikTok Live');
  };

  const handleSummon = () => {
    let finalChamp = selectedChampion;
    if (finalChamp.includes('Ngẫu Nhiên') || finalChamp.includes('Random')) {
      finalChamp = RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
    }
    const user = summonerName.trim() || 'Viewer_Anonym';
    adminSocket.emit('admin:summon', {
      summonerName: user,
      championName: finalChamp,
      team: selectedTeam,
    });
    addLog('SUMMON', `${user} triệu hồi [${finalChamp}] phe ${selectedTeam}`, selectedTeam);
  };

  const handleRandomSummon = (teamOverride?: 'BLG' | 'GENG') => {
    const chosenTeam = teamOverride || selectedTeam;
    const randomChamp = RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
    const randomName = summonerName.trim() || RANDOM_SPECTATOR_NAMES[Math.floor(Math.random() * RANDOM_SPECTATOR_NAMES.length)];

    adminSocket.emit('admin:summon', {
      summonerName: randomName,
      championName: randomChamp,
      team: chosenTeam,
    });
    addLog('SUMMON', `🎲 Triệu hồi ngẫu nhiên: [${randomChamp}] phe ${chosenTeam} bởi ${randomName}`, chosenTeam);
  };

  const handleSwarmSummon = (count = 10) => {
    let team: 'BLG' | 'GENG' = selectedTeam;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        team = i % 2 === 0 ? 'BLG' : 'GENG';
        const rawChamp =
          RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
        const match = rawChamp.match(/\((.*?)\)/);
        const champName = match && match[1] ? match[1] : rawChamp;
        const randomSpectator =
          RANDOM_SPECTATOR_NAMES[Math.floor(Math.random() * RANDOM_SPECTATOR_NAMES.length)];
        const randomNum = Math.floor(Math.random() * 899) + 100;
        const user = `${randomSpectator}_${randomNum}`;

        adminSocket.emit('admin:summon', {
          summonerName: user,
          championName: champName,
          team,
        });

        adminSocket.emit('admin:chat', {
          userName: user,
          text: `${champName} ${team}!`,
          team,
          championName: champName,
        });

        addLog('SUMMON', `🔥 [Quân Đoàn] ${user} triệu hồi [${champName}] phe ${team}`, team);
      }, i * 75);
    }
  };

  const handleSendGift = () => {
    const donor = donorName.trim() || 'Đại Gia Ẩn Danh';
    adminSocket.emit('admin:gift', {
      giftName: selectedGift.name,
      team: giftTeam,
      donorName: donor,
      coins: selectedGift.coins,
    });
    addLog('GIFT', `💎 ${donor} tặng [${selectedGift.name}] (${selectedGift.coins} xu) phe ${giftTeam}!`, giftTeam);
  };

  const handleSendLikes = (count: number, team: 'BLG' | 'GENG') => {
    adminSocket.emit('admin:like', {
      count,
      team,
      userName: summonerName || 'Viewer',
    });
    addLog('LIKE', `❤️ Thả ${count} tim cho phe ${team}!`, team);
  };

  const handleSendCustomChat = () => {
    const trimmed = customComment.trim();
    if (!trimmed) return;

    const user = summonerName.trim() || 'Viewer';
    const summonResult = detectSummonCommand(trimmed, chatTeam, teamConfig.activeTeams);

    if (summonResult) {
      // 1. Emit summon minion event directly
      adminSocket.emit('admin:summon', {
        summonerName: user,
        championName: summonResult.championName,
        team: summonResult.team,
      });

      // 2. Emit chat event with detected champion
      adminSocket.emit('admin:chat', {
        userName: user,
        text: trimmed,
        team: summonResult.team,
        championName: summonResult.championName,
      });

      addLog(
        'SUMMON',
        `💬 [Chat Summon] ${user} triệu hồi [${summonResult.championName}] phe ${summonResult.team}`,
        summonResult.team
      );
    } else {
      // Normal chat broadcast
      adminSocket.emit('admin:chat', {
        userName: user,
        text: trimmed,
        team: chatTeam,
      });
      addLog('CHAT', `[${chatTeam}] ${user}: ${trimmed}`, chatTeam);
    }

    setCustomComment('');
  };

  const handleSetBossHp = (hp: number) => {
    setBossHp(hp);
    adminSocket.emit('admin:boss-control', { action: 'setHp', hp });
    addLog('BOSS', `Chỉnh máu Boss về ${hp.toLocaleString()} HP`);
  };

  const handleResetBoss = () => {
    setBossHp(100000);
    adminSocket.emit('admin:boss-control', { action: 'reset' });
    addLog('BOSS', '🔄 Hồi sinh Boss Baron Nashor về 100,000 HP');
  };

  const tiktokStyle = getTiktokStatusStyle(tiktokStatus);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2.5 sm:p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 sm:pb-5 border-b border-slate-800 gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/80 shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-wide text-white flex items-center flex-wrap gap-2">
                <span>TIKTOK LIVE ADMIN PORTAL</span>
                <span className="shrink-0 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-semibold">
                  PORT 8001
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-snug mt-0.5 truncate">
                Bảng điều khiển độc lập kết nối WebSocket tới Server (Port 4000) & Game View (Port 8000)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto">
            <a
              href="http://localhost:8000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-xs font-bold text-cyan-300 flex items-center space-x-1.5 sm:space-x-2 shadow-lg transition text-center"
            >
              <span>Mở Màn Hình Game OBS (Port 8000)</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            <button
              type="button"
              onClick={handleResetBoss}
              className="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-xs font-bold text-rose-300 flex items-center space-x-1.5 transition shadow"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Hồi Sinh Boss</span>
            </button>
          </div>
        </header>

        {/* Section Navigation Tabs (Top-most & Sticky) */}
        <div className="sticky top-0 sm:top-2 z-40">
          <AdminTabBar
            activeTab={activeTab}
            activeOverlayCount={activeOverlayCount}
            logCount={logs.length}
            onSelectTab={handleSelectTab}
          />
        </div>

        {/* TikTok Live Connection Widget */}
        <section className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto min-w-0">
            <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${tiktokStyle.dotClass}`} />
            <div className="min-w-0">
              <div className="text-xs font-black uppercase text-white flex items-center flex-wrap gap-1.5">
                <span>Trạng thái TikTok Live:</span>
                <span className={tiktokStyle.textClass}>{tiktokStatus}</span>
                {tiktokRoomId && <span className="text-slate-500 text-[10px]">(Room ID: {tiktokRoomId})</span>}
              </div>
              <p className="text-[10px] text-slate-400 truncate">Kết nối trực tiếp tới phòng livestream để bắt chat, gift, like thật</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-2 text-xs text-slate-500">@</span>
              <input
                type="text"
                value={tiktokUsername}
                onChange={(e) => setTiktokUsername(e.target.value)}
                placeholder="username_tiktok"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {tiktokStatus === 'CONNECTED' ? (
              <button
                type="button"
                onClick={handleDisconnectTiktok}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0"
              >
                Ngắt Kết Nối
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectTiktok}
                disabled={isConnecting}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
              >
                {isConnecting ? 'Đang nối...' : 'Kết Nối Live'}
              </button>
            )}
          </div>
        </section>

        {/* Team Configuration Panel */}
        <div id="section-teams" className={`scroll-mt-24 ${shouldShowTeams ? 'block' : 'hidden'}`}>
          <TeamConfigPanel teamConfig={teamConfig} onLog={addLog} />
        </div>

        {/* Section: Series Format (BO1/BO3/BO5) & Silver Scrapes 1v1 */}
        <div id="section-series-duel" className={`scroll-mt-24 ${shouldShowSeriesDuel ? 'block' : 'hidden'}`}>
          <SilverScrapesControls />
        </div>

        {/* Main Section Grid */}
        <div id="section-interaction" className={`scroll-mt-24 ${getMainGridClassName(activeTab)}`}>
          {/* Column 1: Thả Tim & Bình Luận Chat */}
          <div className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${shouldShowInteraction ? '' : 'hidden'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Heart className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-black uppercase text-white">1. Thả Tim & Bình Luận</h2>
            </div>

            {/* Quick Heart Burst */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Giả lập Bão Thả Tim</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleSendLikes(10, 'BLG')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${leftTheme.likeBtnClass}`}
                >
                  <Heart className={`w-3.5 h-3.5 fill-current ${leftTheme.textStrongClass}`} />
                  <span>+10 Tim {leftTeam.shortTag}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLikes(10, 'GENG')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${rightTheme.likeBtnClass}`}
                >
                  <Heart className={`w-3.5 h-3.5 fill-current ${rightTheme.textStrongClass}`} />
                  <span>+10 Tim {rightTeam.shortTag}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendLikes(50, 'BLG')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${leftTheme.likeBurstBtnClass}`}
                >
                  <Zap className={`w-3.5 h-3.5 ${leftTheme.textStrongClass}`} />
                  <span>+50 Tim {leftTeam.shortTag}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLikes(50, 'GENG')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${rightTheme.likeBurstBtnClass}`}
                >
                  <Zap className={`w-3.5 h-3.5 ${rightTheme.textStrongClass}`} />
                  <span>+50 Tim {rightTeam.shortTag}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleSendLikes(200, 'BLG')}
                className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition active:scale-95"
                title="Gửi ngay 200 Tim để kích hoạt Mốc Đại Hồi Phục Toàn Bản Đồ (+100 HP cho tướng)"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                <span>💖 +200 Tim (Test Hồi Máu Toàn Bản Đồ)</span>
              </button>
            </div>

            {/* Custom Live Chat */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 block">Gửi bình luận hiển thị lên Live</label>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setChatTeam('BLG')}
                  className={`flex-1 py-1 rounded text-[10px] font-black ${chatTeam === 'BLG' ? leftTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                    }`}
                >
                  {leftTeam.shortTag}
                </button>
                <button
                  type="button"
                  onClick={() => setChatTeam('GENG')}
                  className={`flex-1 py-1 rounded text-[10px] font-black ${chatTeam === 'GENG' ? rightTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                    }`}
                >
                  {rightTeam.shortTag}
                </button>
              </div>

              <div className="flex space-x-1.5">
                <input
                  type="text"
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomChat()}
                  placeholder="Nhập chat triệu hồi (vd: Knight, Zed, Yasuo GEN)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleSendCustomChat}
                  title="Gửi bình luận & triệu hồi tướng"
                  className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                💡 <span className="text-cyan-400">Chat tên tướng/tuyển thủ</span> (ví dụ: <code className="text-amber-300">Knight</code>, <code className="text-cyan-300">Zed</code>, <code className="text-amber-300">Chovy</code>, <code className="text-cyan-300">random</code>) để triệu hồi trực tiếp!
              </p>
            </div>
          </div>

          {/* Column 2: Triệu Hồi Tướng */}
          <div className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${shouldShowInteraction ? '' : 'hidden'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Swords className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-black uppercase text-white">2. Triệu Hồi Tướng</h2>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nickname người xem</label>
                <input
                  type="text"
                  value={summonerName}
                  onChange={(e) => setSummonerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Chọn Phe</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('BLG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${selectedTeam === 'BLG' ? leftTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    <TeamLogo teamProfile={leftTeam} className="w-4 h-4" />
                    <span>{leftTeam.shortTag}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('GENG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${selectedTeam === 'GENG' ? rightTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    <TeamLogo teamProfile={rightTeam} className="w-4 h-4" />
                    <span>{rightTeam.shortTag}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Kho Tướng LMHT ({filteredChampions.length}/{ALL_CHAMPIONS.length})
                  </label>
                  <span className="text-[9px] font-mono text-cyan-400">
                    Đã chọn: <strong className="text-white">{selectedChampion}</strong>
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={championSearchFilter}
                    onChange={(e) => setChampionSearchFilter(e.target.value)}
                    placeholder={`Tìm trong ${ALL_CHAMPIONS.length} tướng (VD: Lee Sin, Ahri, Yasuo, Mel, Briar...)`}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Role Filter Pills */}
                <div className="flex space-x-1 mb-1.5 overflow-x-auto pb-0.5 text-[9px] font-bold">
                  {[
                    { key: 'ALL', label: `Tất cả (${ALL_CHAMPIONS.length})` },
                    { key: 'Fighter', label: 'Đấu Sĩ' },
                    { key: 'Mage', label: 'Pháp Sư' },
                    { key: 'Assassin', label: 'Sát Thủ' },
                    { key: 'Marksman', label: 'Xạ Thủ' },
                    { key: 'Tank', label: 'Đỡ Đòn' },
                    { key: 'Support', label: 'Hỗ Trợ' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedTagFilter(tab.key as any)}
                      className={`px-1.5 py-0.5 rounded transition whitespace-nowrap ${selectedTagFilter === tab.key
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 169 Champions Grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredChampions.map((c) => {
                    const isSelected = selectedChampion.toLowerCase() === c.name.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedChampion(c.name)}
                        className={`p-1.5 rounded-lg text-left text-[11px] border flex items-center space-x-2 transition ${isSelected
                            ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                      >
                        <img
                          src={c.avatarUrl}
                          alt={c.name}
                          className="w-6 h-6 rounded-md object-cover border border-slate-700 shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-white truncate text-[11px] leading-tight">
                            {c.name}
                          </div>
                          <div className="text-[8px] text-slate-400 truncate leading-none">
                            {c.roleNameVi}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Champion Detail Preview Card */}
                {selectedChampDetail && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)] flex items-center justify-between text-[10px]">
                    <div className="flex items-center space-x-2 min-w-0">
                      <img
                        src={selectedChampDetail.avatarUrl}
                        alt={selectedChampDetail.name}
                        className="w-8 h-8 rounded-lg object-cover border border-cyan-400 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-white text-xs truncate flex items-center space-x-1.5">
                          <span>{selectedChampDetail.name}</span>
                          <span className="text-cyan-400 font-medium text-[10px]">({selectedChampDetail.title})</span>
                        </div>
                        <div className="text-[9px] text-slate-300 truncate mt-0.5">
                          <span className="text-amber-400 font-bold">Q:</span> {selectedChampDetail.skill?.normalSkillName || 'Tấn Công'} • <span className="text-rose-400 font-bold">R:</span> {selectedChampDetail.skill?.ultimateSkillName || 'Tuyệt Kỹ'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono shrink-0 ml-2">
                      {selectedChampDetail.skill?.attackRangeType === 'RANGED' ? '🏹 Đánh Xa' : '🗡️ Cận Chiến'}
                    </span>
                  </div>
                )}
              </div>

              {/* Summon Rule Option B + D Information */}
              <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>Quy Tắc Triệu Hồi (Option B + D):</span>
                </div>
                <div className="text-slate-400 leading-relaxed text-[9px] space-y-0.5">
                  <div>• Mỗi người tối đa <span className="text-white font-bold">1 tướng đang sống</span> trên sàn.</div>
                  <div>• Khi tướng còn sống, tiếp tục chat sẽ <span className="text-emerald-400 font-bold">Tiếp Sức hồi +50 HP</span> và đánh bồi.</div>
                  <div>• Khi tướng chết: Được phép triệu hồi tướng mới ngay lập tức!</div>
                  <div>• <span className="text-amber-400 font-bold">Tặng Quà (Gifts)</span>: Phá giới hạn, triệu hồi Tướng Tinh Anh bổ sung!</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSummon}
                  className="py-2 px-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow flex items-center justify-center space-x-1"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Triệu Hồi Ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomSummon()}
                  className="py-2 px-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wide transition shadow-[0_0_12px_rgba(236,72,153,0.5)] flex items-center justify-center space-x-1"
                  title="Triệu hồi ngay 1 tướng ngẫu nhiên từ danh sách"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>🎲 Tướng Ngẫu Nhiên</span>
                </button>
              </div>

              {/* Swarm Army Burst Button */}
              <button
                type="button"
                onClick={() => handleSwarmSummon(10)}
                className="w-full py-2 px-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider transition shadow-[0_0_16px_rgba(245,158,11,0.5)] flex items-center justify-center space-x-1.5 active:scale-95"
                title="Triệu hồi ngay 10 tướng ngẫu nhiên tấn công ồ ạt"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span>🔥 Bão Quân Đoàn (+10 Tướng)</span>
              </button>

              {/* Auto Summon Continuous Controls */}
              <div className="pt-2.5 border-t border-slate-800 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsAutoSummonActive(!isAutoSummonActive)}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all duration-200 shadow-md ${isAutoSummonActive
                      ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                      : 'bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900/80 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${isAutoSummonActive ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                        }`}
                    />
                    <span>{isAutoSummonActive ? 'DỪNG TỰ ĐỘNG TRIỆU HỒI' : 'BẬT TỰ ĐỘNG TRIỆU HỒI'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs font-mono">
                    {isAutoSummonActive ? (
                      <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                    )}
                  </div>
                </button>

                {/* Auto-Summon Speed Slider & Alternate Toggle */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="text-slate-400">Tốc độ tự động:</span>
                    <span className="font-mono text-cyan-400 font-bold">{autoSummonSpeed} ms / lượt</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={autoSummonSpeed}
                    onChange={(e) => setAutoSummonSpeed(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                  {/* Batch Size Selector */}
                  <div className="flex justify-between items-center text-[11px] font-semibold pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Số tướng mỗi đợt:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 6, 8].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setAutoSummonBatchSize(count)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition ${autoSummonBatchSize === count
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#00f2fe]'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                    <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSummonAlternateTeams}
                        onChange={(e) => setAutoSummonAlternateTeams(e.target.checked)}
                        className="rounded accent-cyan-500 w-3.5 h-3.5"
                      />
                      <span>Luân phiên 2 phe ({leftTeam.shortTag} ⚔️ {rightTeam.shortTag})</span>
                    </label>
                    <span className="text-slate-500 font-mono">
                      {autoSummonAlternateTeams ? 'Cả 2 phe' : `Phe ${selectedTeam}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                    <label className="flex items-center space-x-1.5 text-pink-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSummonRandomChampions}
                        onChange={(e) => setAutoSummonRandomChampions(e.target.checked)}
                        className="rounded accent-pink-500 w-3.5 h-3.5"
                      />
                      <span>🎲 Triệu hồi ngẫu nhiên tất cả tướng ({RANDOM_CHAMPION_LIST.length} tướng)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Donate & Quà Tặng VIP */}
          <div className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${shouldShowInteraction ? '' : 'hidden'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Gift className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase text-white">3. Tặng Quà VIP</h2>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Đại Gia Donate</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Ủng hộ cho phe</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGiftTeam('BLG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${giftTeam === 'BLG' ? leftTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    <TeamLogo teamProfile={leftTeam} className="w-4 h-4" />
                    <span>{leftTeam.shortTag}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftTeam('GENG')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${giftTeam === 'GENG' ? rightTheme.adminActiveBtnClass : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    <TeamLogo teamProfile={rightTeam} className="w-4 h-4" />
                    <span>{rightTeam.shortTag}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Quà Tặng TikTok</label>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {GIFT_PRESETS.map((g) => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setSelectedGift(g)}
                      className={`w-full p-1.5 rounded flex items-center justify-between text-[11px] border ${selectedGift.name === g.name
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
                onClick={handleSendGift}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gửi Quà Tặng Hologram</span>
              </button>
            </div>
          </div>

          {/* Column 4: Boss & Bão Bot */}
          <div className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${shouldShowBossMap ? '' : 'hidden'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-black uppercase text-white">4. Máu Boss & Bão Bot</h2>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-slate-400">Điều chỉnh máu Boss</span>
                  <span className="font-mono text-emerald-400 font-bold">{bossHp.toLocaleString()} HP</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="5000"
                  value={bossHp}
                  onChange={(e) => handleSetBossHp(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(100000)}
                    className="py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(30000)}
                    className="py-1 rounded bg-purple-950 text-[10px] font-bold text-purple-300 hover:text-white"
                  >
                    Cuồng Nộ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBossHp(0)}
                    className="py-1 rounded bg-rose-950 text-[10px] font-bold text-rose-300 hover:text-white"
                  >
                    Hạ Gục
                  </button>
                </div>
              </div>

              {/* BO Series Match State & Controls */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trận Đấu {seriesConfig.format} (Ván {currentRound}/{seriesConfig.maxRounds})</span>
                  </span>
                  <span className="font-mono text-xs font-black text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {leftTeam.shortTag} {bo5Score.BLG} - {bo5Score.GENG} {rightTeam.shortTag}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBo5Control('setScore', bo5Score.BLG + 1, bo5Score.GENG)}
                    className={`py-1 px-2 rounded text-[10px] font-bold transition active:scale-95 ${leftTheme.likeBtnClass}`}
                  >
                    +1 Ván {leftTeam.shortTag}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBo5Control('setScore', bo5Score.BLG, bo5Score.GENG + 1)}
                    className={`py-1 px-2 rounded text-[10px] font-bold transition active:scale-95 ${rightTheme.likeBtnClass}`}
                  >
                    +1 Ván {rightTeam.shortTag}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBo5Control('nextRound')}
                    className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition active:scale-95"
                  >
                    Ván Kế Tiếp ⏩
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBo5Control('reset')}
                    className="py-1 px-2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold transition active:scale-95"
                  >
                    Reset {seriesConfig.format} (0-0)
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Bão Comment Bot</span>
                  <button
                    type="button"
                    onClick={() => setIsBotActive(!isBotActive)}
                    className={`py-1 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 ${isBotActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                  >
                    {isBotActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isBotActive ? 'Dừng Bot' : 'Chạy Bot'}</span>
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Tốc độ: {botSpeed} ms / lượt</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={botSpeed}
                    onChange={(e) => setBotSpeed(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="section-boss-map" className={`scroll-mt-24 ${shouldShowBossMap ? 'space-y-6' : 'hidden'}`}>
          {/* Map / Arena Theme Switcher Section */}
          <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-black uppercase text-white">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>5. Bản Đồ & Theme Trận Đấu (Map / Arena Theme)</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                Đang chọn: {selectedTheme === 'ELDER_DRAGON' ? '🐉 Hang Rồng Ngàn Tuổi' : '🟣 Hang Baron Nashor'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Baron Nashor */}
              <button
                type="button"
                onClick={() => handleSelectTheme('BARON')}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center space-x-3 ${selectedTheme === 'BARON'
                    ? 'bg-purple-950/90 border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.5)] scale-[1.01]'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
              >
                <div className="w-12 h-12 rounded-lg bg-purple-900/60 border border-purple-500/60 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src="/images/boss_baron_2d.png"
                    alt="Baron Nashor"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">Hang Baron Hư Không</span>
                    {selectedTheme === 'BARON' && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                        ĐANG DÙNG
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Quái thú Baron Nashor CKTG • Tông tím Hư Không huyền bí
                  </div>
                </div>
              </button>

              {/* Card 2: Elder Dragon */}
              <button
                type="button"
                onClick={() => handleSelectTheme('ELDER_DRAGON')}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center space-x-3 ${selectedTheme === 'ELDER_DRAGON'
                    ? 'bg-gradient-to-r from-amber-950/90 to-cyan-950/90 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.55)] scale-[1.01]'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
              >
                <div className="w-12 h-12 rounded-lg bg-amber-900/60 border border-amber-500/60 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src="/images/elder_dragon_icon_135001.webp"
                    alt="Elder Dragon"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">Hang Rồng Ngàn Tuổi (Elder)</span>
                    {selectedTheme === 'ELDER_DRAGON' && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-600 text-slate-950">
                        ĐANG DÙNG
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Long Thần Ngàn Tuổi CKTG • Lửa Thiên Thanh & Vàng Kim rực lửa
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* Section 6: Boss Counterattack & 4 Skills Config */}
          <BossSkillControls currentTheme={selectedTheme} />

          {/* Section 6.5: Auto Pro-Player Battle when Idle */}
          <AutoProControls teamConfig={teamConfig} />
        </div>

        {/* Section 7: Section Visibility Controls (Overlay Controls) */}
        <div id="section-overlays" className={`scroll-mt-24 ${shouldShowOverlays ? 'block' : 'hidden'}`}>
          <OverlayControls
            onActiveCountChange={setActiveOverlayCount}
            leftTag={leftTeam.shortTag}
            rightTag={rightTeam.shortTag}
          />
        </div>

        {/* Live Event Logs */}
        <section id="section-logs" className={`scroll-mt-24 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 ${shouldShowLogs ? '' : 'hidden'}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-white">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Nhật Ký Tương Tác Trực Tiếp (Live Feed)</span>
              <span className="text-[10px] font-mono text-slate-400">({logs.length} mục)</span>
            </div>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Log</span>
            </button>
          </div>

          <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs pr-1">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic py-4 text-center">Chưa có sự kiện nào. Hãy click vào các panel phía trên để gửi lệnh thử nghiệm!</p>
            ) : (
              logs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-2 py-1 px-2 rounded bg-slate-950/70 border border-slate-800/60"
                >
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.type === 'GIFT'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : item.type === 'SUMMON'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : item.type === 'LIKE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                      }`}
                  >
                    {item.type}
                  </span>
                  {item.team && (
                    <span className={`text-[9px] font-black ${item.team === 'BLG' ? leftTheme.textStrongClass : rightTheme.textStrongClass}`}>
                      [{item.team === 'BLG' ? leftTeam.shortTag : rightTeam.shortTag}]
                    </span>
                  )}
                  <span className="text-slate-200 truncate">{item.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;


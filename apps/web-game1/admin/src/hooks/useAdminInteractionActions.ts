import { useState } from 'react';
import { adminSocket } from '../services/socket';
import { ActiveTeamsMap } from '../constants/teams';
import {
  GIFT_PRESETS,
  GiftPreset,
  RANDOM_CHAMPION_LIST,
  RANDOM_SPECTATOR_NAMES,
} from '../constants/adminPortal';
import { detectSummonCommand } from '../utils/commentCommand';

type LogHandler = (type: string, message: string, team?: string) => void;

interface UseAdminInteractionActionsParams {
  activeTeams: ActiveTeamsMap;
  onLog: LogHandler;
}

/**
 * Encapsulates manual admin interaction form states and Socket.IO emitters
 * for summoning, gifts, likes, chat commands, and boss HP controls.
 */
export function useAdminInteractionActions({
  activeTeams,
  onLog,
}: UseAdminInteractionActionsParams) {
  const [summonerName, setSummonerName] = useState('Gamer_Pro_99');
  const [selectedChampion, setSelectedChampion] = useState('Zed');
  const [selectedTeam, setSelectedTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [donorName, setDonorName] = useState('Đại_Gia_TikTok');
  const [selectedGift, setSelectedGift] = useState<GiftPreset>(GIFT_PRESETS[4]);
  const [giftTeam, setGiftTeam] = useState<'BLG' | 'GENG'>('BLG');

  const [customComment, setCustomComment] = useState('Vô địch CKTG 2026!');
  const [chatTeam, setChatTeam] = useState<'BLG' | 'GENG'>('BLG');
  const [bossHp, setBossHp] = useState(100000);

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
    onLog('SUMMON', `${user} triệu hồi [${finalChamp}] phe ${selectedTeam}`, selectedTeam);
  };

  const handleRandomSummon = (teamOverride?: 'BLG' | 'GENG') => {
    const chosenTeam = teamOverride || selectedTeam;
    const randomChamp =
      RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
    const randomName =
      summonerName.trim() ||
      RANDOM_SPECTATOR_NAMES[Math.floor(Math.random() * RANDOM_SPECTATOR_NAMES.length)];

    adminSocket.emit('admin:summon', {
      summonerName: randomName,
      championName: randomChamp,
      team: chosenTeam,
    });
    onLog(
      'SUMMON',
      `🎲 Triệu hồi ngẫu nhiên: [${randomChamp}] phe ${chosenTeam} bởi ${randomName}`,
      chosenTeam
    );
  };

  const handleSwarmSummon = (count = 10) => {
    const items = Array.from({ length: count }, (_, i) => {
      const team: 'BLG' | 'GENG' = i % 2 === 0 ? 'BLG' : 'GENG';
      const rawChamp =
        RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
      const match = rawChamp.match(/\((.*?)\)/);
      const champName = match && match[1] ? match[1] : rawChamp;
      const randomSpectator =
        RANDOM_SPECTATOR_NAMES[Math.floor(Math.random() * RANDOM_SPECTATOR_NAMES.length)];
      const randomNum = Math.floor(Math.random() * 899) + 100;
      const user = `${randomSpectator}_${randomNum}`;

      return {
        summonerName: user,
        championName: champName,
        team,
      };
    });

    adminSocket.emit('admin:summon-batch', { items });
    onLog('SUMMON', `🔥 [Bão Quân Đoàn] Tung đồng loạt +${count} tướng ra trận!`, selectedTeam);
  };

  const handleSendGift = () => {
    const donor = donorName.trim() || 'Đại Gia Ẩn Danh';
    adminSocket.emit('admin:gift', {
      giftName: selectedGift.name,
      team: giftTeam,
      donorName: donor,
      coins: selectedGift.coins,
    });
    onLog(
      'GIFT',
      `💎 ${donor} tặng [${selectedGift.name}] (${selectedGift.coins} xu) phe ${giftTeam}!`,
      giftTeam
    );
  };

  const handleSendLikes = (count: number, team: 'BLG' | 'GENG') => {
    adminSocket.emit('admin:like', {
      count,
      team,
      userName: summonerName || 'Viewer',
    });
    onLog('LIKE', `❤️ Thả ${count} tim cho phe ${team}!`, team);
  };

  const handleSendCustomChat = () => {
    const trimmed = customComment.trim();
    if (!trimmed) return;

    const user = summonerName.trim() || 'Viewer';
    const summonResult = detectSummonCommand(trimmed, chatTeam, activeTeams);

    if (summonResult) {
      adminSocket.emit('admin:summon', {
        summonerName: user,
        championName: summonResult.championName,
        team: summonResult.team,
      });

      adminSocket.emit('admin:chat', {
        userName: user,
        text: trimmed,
        team: summonResult.team,
        championName: summonResult.championName,
      });

      onLog(
        'SUMMON',
        `💬 [Chat Summon] ${user} triệu hồi [${summonResult.championName}] phe ${summonResult.team}`,
        summonResult.team
      );
    } else {
      adminSocket.emit('admin:chat', {
        userName: user,
        text: trimmed,
        team: chatTeam,
      });
      onLog('CHAT', `[${chatTeam}] ${user}: ${trimmed}`, chatTeam);
    }

    setCustomComment('');
  };

  const handleSetBossHp = (hp: number) => {
    setBossHp(hp);
    adminSocket.emit('admin:boss-control', { action: 'setHp', hp });
    onLog('BOSS', `Chỉnh máu Boss về ${hp.toLocaleString()} HP`);
  };

  const handleResetBoss = () => {
    setBossHp(100000);
    adminSocket.emit('admin:boss-control', { action: 'reset' });
    onLog('BOSS', '🔄 Hồi sinh Boss Baron Nashor về 100,000 HP');
  };

  return {
    summonerName,
    setSummonerName,
    selectedChampion,
    setSelectedChampion,
    selectedTeam,
    setSelectedTeam,
    donorName,
    setDonorName,
    selectedGift,
    setSelectedGift,
    giftTeam,
    setGiftTeam,
    customComment,
    setCustomComment,
    chatTeam,
    setChatTeam,
    bossHp,
    handleSummon,
    handleRandomSummon,
    handleSwarmSummon,
    handleSendGift,
    handleSendLikes,
    handleSendCustomChat,
    handleSetBossHp,
    handleResetBoss,
  };
}

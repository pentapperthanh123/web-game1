import { useState, useEffect } from 'react';
import { adminSocket } from '../services/socket';
import { getRandomChampion } from '../constants/champions';
import { RANDOM_CHAMPION_LIST, RANDOM_SPECTATOR_NAMES } from '../constants/adminPortal';

type LogHandler = (type: string, message: string, team?: string) => void;

interface UseAutoSummonRunnerParams {
  selectedTeam: 'BLG' | 'GENG';
  selectedChampion: string;
  summonerName: string;
  onLog: LogHandler;
}

/**
 * Manages the interval-based Bot Comment simulation and Continuous Auto-Summon runners
 * with automatic interval cleanup.
 */
export function useAutoSummonRunner({
  selectedTeam,
  selectedChampion,
  summonerName,
  onLog,
}: UseAutoSummonRunnerParams) {
  const [isBotActive, setIsBotActive] = useState(false);
  const [botSpeed, setBotSpeed] = useState(1200);

  const [isAutoSummonActive, setIsAutoSummonActive] = useState(false);
  const [autoSummonSpeed, setAutoSummonSpeed] = useState(800);
  const [autoSummonBatchSize, setAutoSummonBatchSize] = useState(2);
  const [autoSummonAlternateTeams, setAutoSummonAlternateTeams] = useState(true);
  const [autoSummonRandomChampions, setAutoSummonRandomChampions] = useState(true);

  // Bot simulation runner
  useEffect(() => {
    if (!isBotActive) return;

    const interval = setInterval(() => {
      const champ = getRandomChampion();
      const team = Math.random() > 0.5 ? 'BLG' : 'GENG';
      const user = `Viewer_${Math.floor(Math.random() * 899) + 100}`;

      if (Math.random() < 0.2) {
        adminSocket.emit('admin:gift', {
          giftName: 'Rồng Thần CKTG 🐉',
          team,
          donorName: user,
          coins: 1000,
        });
        onLog('GIFT', `${user} tặng Rồng Thần CKTG phe ${team}!`, team);
      } else {
        adminSocket.emit('admin:summon', {
          summonerName: user,
          championName: champ.name,
          team,
        });
        onLog('SUMMON', `${user} triệu hồi [${champ.name}] phe ${team}`, team);
      }

      adminSocket.emit('admin:like', {
        count: Math.floor(Math.random() * 3) + 1,
        team,
        userName: user,
      });
    }, botSpeed);

    return () => clearInterval(interval);
  }, [isBotActive, botSpeed, onLog]);

  // Continuous auto-summon runner
  useEffect(() => {
    if (!isAutoSummonActive) return;

    let currentTeam = selectedTeam;
    const interval = setInterval(() => {
      const championsPerWave = Math.max(1, Math.floor(autoSummonBatchSize));
      const batchItems: Array<{
        summonerName: string;
        championName: string;
        team: 'BLG' | 'GENG';
      }> = [];

      for (let i = 0; i < championsPerWave; i++) {
        let champTeam: 'BLG' | 'GENG' = selectedTeam;
        if (autoSummonAlternateTeams) {
          const isEven = i % 2 === 0;
          const alternateTeam = currentTeam === 'BLG' ? 'GENG' : 'BLG';
          champTeam = isEven ? currentTeam : alternateTeam;
        }

        let targetChampName = selectedChampion;
        if (autoSummonRandomChampions || selectedChampion.includes('Ngẫu Nhiên')) {
          const rawChamp =
            RANDOM_CHAMPION_LIST[Math.floor(Math.random() * RANDOM_CHAMPION_LIST.length)];
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

        batchItems.push({
          summonerName: user,
          championName: targetChampName,
          team: champTeam,
        });
      }

      if (batchItems.length === 1) {
        const single = batchItems[0];
        adminSocket.emit('admin:summon', single);
        onLog(
          'SUMMON',
          `⚡ [Auto] ${single.summonerName} triệu hồi [${single.championName}] phe ${single.team}`,
          single.team
        );
      } else {
        adminSocket.emit('admin:summon-batch', { items: batchItems });
        onLog(
          'SUMMON',
          `⚡ [Auto Batch] Triệu hồi đồng loạt +${batchItems.length} tướng!`,
          currentTeam
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
    onLog,
  ]);

  return {
    isBotActive,
    setIsBotActive,
    botSpeed,
    setBotSpeed,
    isAutoSummonActive,
    setIsAutoSummonActive,
    autoSummonSpeed,
    setAutoSummonSpeed,
    autoSummonBatchSize,
    setAutoSummonBatchSize,
    autoSummonAlternateTeams,
    setAutoSummonAlternateTeams,
    autoSummonRandomChampions,
    setAutoSummonRandomChampions,
  };
}

import { create } from 'zustand';
import {
  GAMEPLAY_CONSTANTS,
  KEYWORD_MAP,
  PERFORMANCE_LIMITS,
} from '@shared/constants/cafeConfig';
import type {
  CafeLiveState,
  ChatBubbleItem,
  LanguageMode,
  LeaderboardEntry,
  PlayerSession,
  QueueEntry,
  ViewerProfile,
} from '@shared/types/cafe';
import { audioManager } from '../services/audioManager';

interface CafeStore extends CafeLiveState {
  sparkTrigger: { x: number; y: number; timestamp: number } | null;
  steamTrigger: { x: number; y: number; timestamp: number } | null;
  lastUserChatTimes: Record<string, number>;
  momTimerAccumulator: number;

  // Actions
  tickSecond: () => void;
  setAutoBot: (enabled: boolean, mode?: 'CHILL' | 'CHAOS' | 'RANK_RUSH') => void;
  processChat: (user: ViewerProfile, text: string) => void;
  processLikes: (count: number, user?: ViewerProfile) => void;
  processGift: (user: ViewerProfile, coinValue: number, giftName?: string) => void;
  triggerMomAlert: (initiatorName?: string) => void;
  triggerBlackout: (vipUser?: ViewerProfile, durationSec?: number) => void;
  buffNoodles: (initiatorName?: string) => void;
  triggerBsod: (initiatorName?: string) => void;
  kickOrRotatePlayer: (reason?: string) => void;
  setLanguage: (lang: LanguageMode) => void;
  setMicMode: (enabled: boolean) => void;
  setVolume: (vol: number) => void;
  updateConfig: (patch: Partial<CafeLiveState>) => void;
}

const INITIAL_STATE: CafeLiveState = {
  currentSession: {
    user: {
      id: 'bot_pro_01',
      nickname: 'Tiểu Bảo 2008',
      uniqueId: 'tieubao_vl',
      avatarUrl: '',
      isVip: false,
    },
    timeRemainingSec: 55,
    totalTimePlayedSec: 15,
    rankScore: 120,
    status: 'PLAYING',
    isNoodleBuffActive: false,
    noodleBuffExpiresAt: 0,
    lastActionTimestamp: Date.now(),
  },
  queue: [
    {
      user: { id: 'bot_02', nickname: 'Anh_Ba_Cày_Net', uniqueId: 'ba_net' },
      joinedAt: Date.now() - 20000,
      isVip: false,
    },
    {
      user: { id: 'bot_03', nickname: 'Dũng_HalfLife_Vip', uniqueId: 'dung_hl', isVip: true },
      joinedAt: Date.now() - 10000,
      isVip: true,
    },
  ],
  leaderboard: [
    { user: { id: 'top_1', nickname: 'Thần_Long_VL1' }, rankScore: 680, rank: 1 },
    { user: { id: 'top_2', nickname: 'Dũng_Headshot' }, rankScore: 450, rank: 2 },
    { user: { id: 'top_3', nickname: 'Công_Tử_Net' }, rankScore: 310, rank: 3 },
  ],
  momEvent: {
    status: 'INACTIVE',
    countdownSec: 0,
    expiresAt: 0,
    initiatorName: undefined,
  },
  blackout: {
    isActive: false,
    expiresAt: 0,
    vipImmuneUser: undefined,
    initiatorName: undefined,
  },
  communityLikes: 25,
  communityLikeGoal: PERFORMANCE_LIMITS.COMMUNITY_LIKE_THRESHOLD,
  language: 'VI',
  autoMomEnabled: true,
  momCycleSec: GAMEPLAY_CONSTANTS.DEFAULT_MOM_CYCLE_SEC,
  defaultSessionTimeSec: GAMEPLAY_CONSTANTS.DEFAULT_SESSION_TIME_SEC,
  micMode: false,
  volume: 0.75,
  chatBubbles: [],
  autoBotEnabled: false,
  autoBotMode: 'CHILL',
};

export const useCafeStore = create<CafeStore>((set, get) => ({
  ...INITIAL_STATE,
  sparkTrigger: null,
  steamTrigger: null,
  lastUserChatTimes: {},
  momTimerAccumulator: 0,

  tickSecond: () => {
    const state = get();
    const now = Date.now();

    // 1. Handle Blackout
    if (state.blackout.isActive) {
      if (now >= state.blackout.expiresAt) {
        set({
          blackout: {
            isActive: false,
            expiresAt: 0,
            vipImmuneUser: undefined,
            initiatorName: undefined,
          },
        });
      }
      return; // During blackout everything is paused
    }

    // 2. Handle Mom Event
    let nextMomEvent = { ...state.momEvent };
    if (nextMomEvent.status === 'WARNING_3S') {
      const remainingSec = Math.max(0, Math.ceil((nextMomEvent.expiresAt - now) / 1000));
      nextMomEvent.countdownSec = remainingSec;

      if (remainingSec <= 0) {
        // Player did NOT núp -> BUSTED!
        nextMomEvent = {
          status: 'BUSTING',
          countdownSec: 0,
          expiresAt: now + GAMEPLAY_CONSTANTS.MOM_BUST_ANIMATION_SEC * 1000,
          initiatorName: nextMomEvent.initiatorName,
        };

        if (state.currentSession) {
          set({
            currentSession: {
              ...state.currentSession,
              status: 'MOM_BUSTED',
            },
          });
        }
        audioManager.play('MOM_BUST');
      }
    } else if (nextMomEvent.status === 'BUSTING') {
      if (now >= nextMomEvent.expiresAt) {
        // Bust animation finished -> kick out of chair
        nextMomEvent = {
          status: 'INACTIVE',
          countdownSec: 0,
          expiresAt: 0,
        };
        get().kickOrRotatePlayer('MOM_BUST');
      }
    } else if (nextMomEvent.status === 'SAFE_PASSED') {
      if (now >= nextMomEvent.expiresAt) {
        // Safe period finished -> return to normal game
        nextMomEvent = {
          status: 'INACTIVE',
          countdownSec: 0,
          expiresAt: 0,
        };
        if (state.currentSession && state.currentSession.status === 'STUDYING_NUP') {
          set({
            currentSession: {
              ...state.currentSession,
              status: 'PLAYING',
            },
          });
        }
      }
    }

    // 3. Handle Auto Mom Cycle
    let nextMomAccumulator = state.momTimerAccumulator + 1;
    if (
      state.autoMomEnabled &&
      state.currentSession &&
      nextMomEvent.status === 'INACTIVE' &&
      state.currentSession.status === 'PLAYING'
    ) {
      if (nextMomAccumulator >= state.momCycleSec) {
        nextMomAccumulator = 0;
        get().triggerMomAlert('Bác Chủ Quán Báo');
      }
    }

    // 4. Handle Player Session Countdown
    let nextSession = state.currentSession ? { ...state.currentSession } : null;
    if (nextSession) {
      // Check Noodle buff expiration
      if (nextSession.isNoodleBuffActive && now >= nextSession.noodleBuffExpiresAt) {
        nextSession.isNoodleBuffActive = false;
      }

      // Check BSOD recovery (reboot after 3s)
      if (nextSession.status === 'BSOD_ERROR') {
        const timeSinceAction = (now - nextSession.lastActionTimestamp) / 1000;
        if (timeSinceAction >= GAMEPLAY_CONSTANTS.BSOD_DURATION_SEC) {
          nextSession.status = 'PLAYING';
        }
      }

      // Tụt 1s mỗi giây nếu đang ngồi máy
      if (nextSession.status === 'PLAYING' || nextSession.status === 'STUDYING_NUP') {
        nextSession.timeRemainingSec = Math.max(0, nextSession.timeRemainingSec - 1);
        nextSession.totalTimePlayedSec += 1;

        if (nextSession.timeRemainingSec <= 0) {
          // Hết giờ -> nhường ghế
          set({ currentSession: nextSession, momEvent: nextMomEvent, momTimerAccumulator: nextMomAccumulator });
          get().kickOrRotatePlayer('OUT_OF_TIME');
          return;
        }
      }
    }

    set({
      currentSession: nextSession,
      momEvent: nextMomEvent,
      momTimerAccumulator: nextMomAccumulator,
      chatBubbles: (state.chatBubbles || []).filter((b) => now - b.timestamp < 4500),
    });

    // 5. Autonomous Auto-Bot Behavior (Runs seamlessly when enabled)
    if (state.autoBotEnabled) {
      const mode = state.autoBotMode || 'CHILL';
      const botPool = [
        'Tiểu_Bảo_2008',
        'Cu_Tí_Võ_Lâm',
        'Hùng_Headshot',
        'Anh_Ba_Cày_Thuê',
        'Bé_Heo_Audition',
        'Phong_Kiếm_Thế',
        'Long_Đột_Kích',
        'Công_Tử_Bạc_Liêu',
      ];

      // A. If chair is empty or session ended, automatically summon bot from queue or spawn new bot
      if (!nextSession || nextSession.status === 'IDLE') {
        const randName = botPool[Math.floor(Math.random() * botPool.length)];
        get().processChat({ id: `autobot_${Date.now()}`, nickname: randName }, 'ngoi');
        return;
      }

      // B. Ensure queue has at least 2-3 bots waiting
      if (state.queue.length < 2) {
        const waitingBot = botPool[Math.floor(Math.random() * botPool.length)];
        get().processChat({ id: `queue_${Date.now()}`, nickname: waitingBot }, 'ngoi');
      }

      // C. Auto Dodge Mom (Núp Mẹ) when Mom Warning is active
      if (nextMomEvent.status === 'WARNING_3S' && nextSession.status === 'PLAYING') {
        const dodgeRate = mode === 'RANK_RUSH' ? 0.95 : mode === 'CHILL' ? 0.85 : 0.40;
        if (Math.random() < dodgeRate) {
          get().processChat(nextSession.user, 'nup');
        }
      }

      // D. Auto Grind / Score when sitting
      if (nextSession.status === 'PLAYING') {
        const grindProb = mode === 'RANK_RUSH' ? 0.90 : mode === 'CHILL' ? 0.70 : 0.50;
        if (Math.random() < grindProb) {
          get().processChat(nextSession.user, 'cay');
        }

        // Auto Likes (Add 3-8 likes occasionally)
        if (Math.random() < 0.45) {
          get().processLikes(Math.floor(Math.random() * 6) + 3);
        }

        // Auto Gifts in Chaos or Rank mode
        if (mode === 'CHAOS' && Math.random() < 0.12) {
          const trollType = Math.random();
          const trollUser = { id: `troll_${Date.now()}`, nickname: botPool[Math.floor(Math.random() * botPool.length)], isVip: true };
          if (trollType < 0.4) {
            get().processGift(trollUser, 10, 'Gọi Mẹ Cầm Chổi');
          } else if (trollType < 0.75) {
            get().processGift(trollUser, 2, 'Reset Wire');
          } else {
            get().processGift(trollUser, 50, 'Cúp Cầu Dao');
          }
        } else if (mode === 'RANK_RUSH' && Math.random() < 0.08) {
          const vipUser = { id: `vip_${Date.now()}`, nickname: 'Đại_Gia_Net', isVip: true };
          get().processGift(vipUser, 1, 'Mì Tôm Trứng');
        }
      }
    }
  },

  processChat: (user: ViewerProfile, text: string) => {
    const state = get();
    const now = Date.now();

    // 1. Anti-spam check per user
    const lastChatTime = state.lastUserChatTimes[user.id] || 0;
    if (now - lastChatTime < PERFORMANCE_LIMITS.CHAT_COOLDOWN_PER_USER_MS) {
      return;
    }

    const nextChatTimes = { ...state.lastUserChatTimes, [user.id]: now };
    const lower = text.trim().toLowerCase();

    const isNupKeyword = KEYWORD_MAP.HIDE_FROM_MOM.some((k) => lower.includes(k));
    const isGrindKeyword = KEYWORD_MAP.GRIND_AND_SCORE.some((k) => lower.includes(k));

    // Record comic chat bubble
    const bubbleType: ChatBubbleItem['type'] = isNupKeyword ? 'NUP' : isGrindKeyword ? 'GRIND' : 'NORMAL';
    const nextBubbles: ChatBubbleItem[] = [
      ...(state.chatBubbles || []).slice(-3),
      {
        id: now + Math.random(),
        userName: user.nickname,
        text,
        timestamp: now,
        type: bubbleType,
      },
    ];

    // 2. Check NÚP from Mom
    if (isNupKeyword && state.momEvent.status === 'WARNING_3S') {
      if (state.currentSession) {
        set({
          lastUserChatTimes: nextChatTimes,
          chatBubbles: nextBubbles,
          currentSession: {
            ...state.currentSession,
            status: 'STUDYING_NUP',
          },
          momEvent: {
            status: 'SAFE_PASSED',
            countdownSec: 0,
            expiresAt: now + GAMEPLAY_CONSTANTS.MOM_SAFE_COOLDOWN_SEC * 1000,
            initiatorName: state.momEvent.initiatorName,
          },
        });
        audioManager.play('SUCCESS_SAFE');
        return;
      }
    }

    // 3. Check CÀY / GRIND (Active Player only)
    if (isGrindKeyword && state.currentSession && state.currentSession.user.id === user.id) {
      const buffMultiplier = state.currentSession.isNoodleBuffActive
        ? GAMEPLAY_CONSTANTS.GRIND_MULTIPLIER_BUFF
        : 1;
      const scoreGain = GAMEPLAY_CONSTANTS.GRIND_BASE_SCORE * buffMultiplier;
      const newScore = state.currentSession.rankScore + scoreGain;
      const newTime = Math.min(
        GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC,
        state.currentSession.timeRemainingSec + GAMEPLAY_CONSTANTS.GRIND_TIME_BONUS_SEC
      );

      // Trigger spark at keyboard
      set({
        lastUserChatTimes: nextChatTimes,
        chatBubbles: nextBubbles,
        sparkTrigger: { x: 360, y: 810, timestamp: now },
        currentSession: {
          ...state.currentSession,
          rankScore: newScore,
          timeRemainingSec: newTime,
          lastActionTimestamp: now,
        },
      });

      audioManager.play('KEY_CLICK');
      return;
    }

    // 4. Check SIT / NGOI / PLAY
    const isSitKeyword = KEYWORD_MAP.SIT_AND_PLAY.some((k) => lower.includes(k));
    if (isSitKeyword) {
      // If nobody is sitting -> take seat immediately
      if (!state.currentSession) {
        const newSession: PlayerSession = {
          user,
          timeRemainingSec: state.defaultSessionTimeSec,
          totalTimePlayedSec: 0,
          rankScore: 0,
          status: 'PLAYING',
          isNoodleBuffActive: false,
          noodleBuffExpiresAt: 0,
          lastActionTimestamp: now,
        };

        set({
          lastUserChatTimes: nextChatTimes,
          chatBubbles: nextBubbles,
          currentSession: newSession,
        });
        audioManager.play('NEW_PLAYER');
        return;
      }

      // If chair is occupied and user not in queue -> add to queue
      const inQueue = state.queue.some((q) => q.user.id === user.id);
      const isCurrent = state.currentSession.user.id === user.id;

      if (!inQueue && !isCurrent && state.queue.length < GAMEPLAY_CONSTANTS.MAX_QUEUE_CAPACITY) {
        const nextQueue = [
          ...state.queue,
          {
            user,
            joinedAt: now,
            isVip: user.isVip || false,
          },
        ];
        set({
          lastUserChatTimes: nextChatTimes,
          chatBubbles: nextBubbles,
          queue: nextQueue,
        });
      }
    } else {
      // Normal chat in room
      set({
        lastUserChatTimes: nextChatTimes,
        chatBubbles: nextBubbles,
      });
    }
  },

  processLikes: (count: number) => {
    const state = get();
    if (!state.currentSession) return;

    const timeToAdd = count * PERFORMANCE_LIMITS.LIKE_TIME_GAIN_SEC;
    const nextTime = Math.min(
      GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC,
      state.currentSession.timeRemainingSec + timeToAdd
    );

    let nextCommunityLikes = state.communityLikes + count;
    let extraBonus = 0;

    if (nextCommunityLikes >= PERFORMANCE_LIMITS.COMMUNITY_LIKE_THRESHOLD) {
      nextCommunityLikes %= PERFORMANCE_LIMITS.COMMUNITY_LIKE_THRESHOLD;
      extraBonus = PERFORMANCE_LIMITS.COMMUNITY_LIKE_BUFF_SEC;
      audioManager.play('SUCCESS_SAFE');
    }

    set({
      communityLikes: nextCommunityLikes,
      currentSession: {
        ...state.currentSession,
        timeRemainingSec: Math.min(
          GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC,
          nextTime + extraBonus
        ),
      },
    });
  },

  processGift: (user: ViewerProfile, coinValue: number, giftName?: string) => {
    const state = get();
    const now = Date.now();

    // Priority 1: Large Gift (30+ coins) -> Cúp Cầu Dao Cả Quán
    if (coinValue >= 30) {
      get().triggerBlackout(user, GAMEPLAY_CONSTANTS.POWER_CUT_DURATION_SEC);
      return;
    }

    // Priority 2: Medium Gift (5-29 coins) -> Gọi Phụ Huynh Cầm Chổi
    if (coinValue >= 5) {
      get().triggerMomAlert(user.nickname);
      audioManager.play('COIN_DROP');
      return;
    }

    // Priority 3: Small Gift (1-4 coins)
    audioManager.play('COIN_DROP');

    // If gifter is in queue, promote directly to top or seat
    const queueIndex = state.queue.findIndex((q) => q.user.id === user.id);
    if (!state.currentSession) {
      // Empty seat -> take seat immediately
      set({
        currentSession: {
          user: { ...user, isVip: true },
          timeRemainingSec: state.defaultSessionTimeSec,
          totalTimePlayedSec: 0,
          rankScore: 50,
          status: 'PLAYING',
          isNoodleBuffActive: true,
          noodleBuffExpiresAt: now + GAMEPLAY_CONSTANTS.NOODLE_BUFF_DURATION_SEC * 1000,
          lastActionTimestamp: now,
        },
      });
      audioManager.play('NEW_PLAYER');
      return;
    }

    if (queueIndex !== -1) {
      // Promote to VIP head of queue
      const updatedQueue = [...state.queue];
      const [promoted] = updatedQueue.splice(queueIndex, 1);
      promoted.isVip = true;
      updatedQueue.unshift(promoted);
      set({ queue: updatedQueue });
      return;
    }

    // If currently playing or gifting to buff/troll
    const isTrollGift = giftName && (giftName.toLowerCase().includes('reset') || giftName.toLowerCase().includes('wire'));
    if (isTrollGift) {
      get().triggerBsod(user.nickname);
    } else {
      get().buffNoodles(user.nickname);
    }
  },

  triggerMomAlert: (initiatorName = 'Hàng Xóm Báo') => {
    const now = Date.now();
    set({
      momEvent: {
        status: 'WARNING_3S',
        countdownSec: GAMEPLAY_CONSTANTS.MOM_WARNING_DURATION_SEC,
        expiresAt: now + GAMEPLAY_CONSTANTS.MOM_WARNING_DURATION_SEC * 1000,
        initiatorName,
      },
    });
    audioManager.play('MOM_ALARM');
  },

  triggerBlackout: (vipUser?: ViewerProfile, durationSec = GAMEPLAY_CONSTANTS.POWER_CUT_DURATION_SEC) => {
    const now = Date.now();
    set({
      blackout: {
        isActive: true,
        expiresAt: now + durationSec * 1000,
        vipImmuneUser: vipUser,
        initiatorName: vipUser?.nickname || 'Ai đó giật cầu dao',
      },
    });
    audioManager.play('POWER_CUT');
  },

  buffNoodles: () => {
    const state = get();
    if (!state.currentSession) return;
    const now = Date.now();

    const newTime = Math.min(
      GAMEPLAY_CONSTANTS.MAX_SESSION_TIME_SEC,
      state.currentSession.timeRemainingSec + GAMEPLAY_CONSTANTS.NOODLE_TIME_BONUS_SEC
    );

    set({
      steamTrigger: { x: 450, y: 760, timestamp: now },
      currentSession: {
        ...state.currentSession,
        timeRemainingSec: newTime,
        isNoodleBuffActive: true,
        noodleBuffExpiresAt: now + GAMEPLAY_CONSTANTS.NOODLE_BUFF_DURATION_SEC * 1000,
      },
    });
    audioManager.play('DRINK_SLURP');
  },

  triggerBsod: () => {
    const state = get();
    if (!state.currentSession) return;
    const now = Date.now();

    const penaltyTime = Math.max(
      5,
      state.currentSession.timeRemainingSec - GAMEPLAY_CONSTANTS.RESET_TIME_PENALTY_SEC
    );

    set({
      currentSession: {
        ...state.currentSession,
        status: 'BSOD_ERROR',
        timeRemainingSec: penaltyTime,
        lastActionTimestamp: now,
      },
    });
    audioManager.play('BSOD_EXPLODE');
  },

  kickOrRotatePlayer: () => {
    const state = get();
    const finishedSession = state.currentSession;
    let nextLeaderboard = [...state.leaderboard];

    // Record score into leaderboard if worthy
    if (finishedSession && finishedSession.rankScore > 0) {
      const existingIdx = nextLeaderboard.findIndex((e) => e.user.id === finishedSession.user.id);
      if (existingIdx !== -1) {
        if (finishedSession.rankScore > nextLeaderboard[existingIdx].rankScore) {
          nextLeaderboard[existingIdx].rankScore = finishedSession.rankScore;
        }
      } else {
        nextLeaderboard.push({
          user: finishedSession.user,
          rankScore: finishedSession.rankScore,
          rank: 0,
        });
      }

      // Sort and take top 5
      nextLeaderboard.sort((a, b) => b.rankScore - a.rankScore);
      nextLeaderboard = nextLeaderboard.slice(0, GAMEPLAY_CONSTANTS.MAX_LEADERBOARD_ENTRIES);
      nextLeaderboard.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });
    }

    // Check queue for next person
    if (state.queue.length > 0) {
      const nextQueue = [...state.queue];
      const nextPlayer = nextQueue.shift()!;

      const newSession: PlayerSession = {
        user: nextPlayer.user,
        timeRemainingSec: state.defaultSessionTimeSec,
        totalTimePlayedSec: 0,
        rankScore: 0,
        status: 'PLAYING',
        isNoodleBuffActive: false,
        noodleBuffExpiresAt: 0,
        lastActionTimestamp: Date.now(),
      };

      set({
        currentSession: newSession,
        queue: nextQueue,
        leaderboard: nextLeaderboard,
      });
      audioManager.play('NEW_PLAYER');
    } else {
      // Empty chair
      set({
        currentSession: null,
        leaderboard: nextLeaderboard,
      });
    }
  },

  setLanguage: (lang: LanguageMode) => set({ language: lang }),

  setMicMode: (enabled: boolean) => {
    audioManager.setMicMode(enabled);
    set({ micMode: enabled });
  },

  setVolume: (vol: number) => {
    audioManager.setVolume(vol);
    set({ volume: vol });
  },

  updateConfig: (patch: Partial<CafeLiveState>) => set(patch),

  setAutoBot: (enabled: boolean, mode?: 'CHILL' | 'CHAOS' | 'RANK_RUSH') => {
    set((state) => ({
      autoBotEnabled: enabled,
      autoBotMode: mode || state.autoBotMode || 'CHILL',
    }));
  },
}));

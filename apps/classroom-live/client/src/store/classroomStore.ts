import { create } from 'zustand';
import type { ClassroomState, DeskSlot, Student, StudentMisbehavior, TeamId } from '../../../shared/types/classroom.js';
import type { QuestionItem } from '../../../shared/types/question.js';
import { CLASSROOM_CONFIG, DEFAULT_TEAMS } from '../../../shared/constants/classroomConfig.js';
import defaultQuestionBank from '../../../shared/data/questionBank.json';
import { checkAnswerMatch } from '../services/textMatcher.js';
import { triggerStudentWalk } from '../services/walkBus.js';
import { readInitialAvatarVisibility } from '../services/viewerOptions.js';
import { STUDENT_VARIANT_COUNT } from '../constants/studentVariants.js';

interface ClassroomActions {
  // Điều phối câu hỏi & Tiết học
  startQuestion: (question: QuestionItem) => void;
  tickTimer: () => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  triggerBreak: () => void;
  unlockHintLetters: (count?: number) => void;

  // Xử lý sự kiện Livestream
  handleJoin: (user: { id: string; nickname: string; avatarUrl?: string }) => void;
  handleLike: (user: { id: string; nickname: string; avatarUrl?: string }, count?: number) => void;
  handleChat: (user: { id: string; nickname: string; avatarUrl?: string }, text: string) => boolean;
  handleGift: (user: { id: string; nickname: string; avatarUrl?: string }, giftName: string, coins: number) => void;

  // Tinh nghịch & Kỷ luật lớp học
  triggerMisbehavior: (slotIndex: number, type: StudentMisbehavior, text?: string) => void;
  clearMisbehavior: (slotIndex: number) => void;
  startTeacherInspection: (targetSlotIndex?: number) => void;
  punishStudent: (slotIndex: number) => void;
  returnTeacherToPodium: () => void;

  // Cấu hình
  setMicMode: (enabled: boolean) => void;
  setLockWhileReading: (enabled: boolean) => void;
  /** Bật/tắt ảnh avatar người xem trên sân khấu (tắt => chỉ hiện tên / chữ cái đầu). */
  setAvatarVisible: (isVisible: boolean) => void;
  setHeartGoal: (goal: number) => void;
  resetClassroom: () => void;
}

// Kiểu nhân vật gán xoay vòng: học sinh mẫu dùng chỉ số 0..N, người xem mới nối tiếp sau hàng chờ mẫu
// => cùng một người luôn cùng một hình, và cả lớp luôn đủ các kiểu.
let appearanceCursor = 0;
const nextAppearanceIndex = (): number => {
  const index = appearanceCursor % STUDENT_VARIANT_COUNT;
  appearanceCursor += 1;
  return index;
};
/** Giữ kiểu cũ nếu người này đang ở hàng chờ (từ hành lang vào lớp không bị đổi hình). */
const resolveAppearanceIndex = (userId: string, waitingQueue: Student[]): number =>
  waitingQueue.find((queued) => queued.id === userId)?.appearanceIndex ?? nextAppearanceIndex();

// Hàng chờ mẫu (nickname kiểu TikTok thật, xen kẽ có / không có avatar để thấy cả fallback)
const MOCK_WAITING_COUNT = 46;
const MOCK_AVATAR_BASE_URL = 'https://api.dicebear.com/7.x/adventurer/svg?seed=';
const MOCK_WAITING_NICKNAMES = [
  'minhthu', 'bé Na 🌸', 'Gia Bảo', 'tuấn.kiệt', 'Mèo Mập', 'linhh_', 'Khánh Vy', 'chu Bin',
  'an nhiên', 'Đức Anh', 'thỏ 7 màu', 'Hà My', 'nam_09', 'Bông', 'Quỳnh ✨', 'Phúc',
  'bánh bao', 'Trâm Anh', 'kenzo', 'Su Su', 'Hoàng', 'mi mi', 'Bảo Ngọc', 'tít',
] as const;

const getMockWaitingNickname = (idx: number): string => {
  const base = MOCK_WAITING_NICKNAMES[idx % MOCK_WAITING_NICKNAMES.length];
  const round = Math.floor(idx / MOCK_WAITING_NICKNAMES.length);
  return round === 0 ? base : `${base} ${round + 1}`;
};

// Học sinh mẫu ban đầu (chỉ MAX_DESKS bạn đầu tiên được xếp ghế)
const SEED_STUDENTS = [
  { nickname: 'ngocanh', score: 3, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ngocanh' },
  { nickname: 'Thị dâu 🍓', score: 1, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=thidau' },
  { nickname: 'NQ', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NQ' },
  { nickname: 'e chi bbi', score: 1, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=echibbi' },
  { nickname: 'ovis', score: 3, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ovis' },
  { nickname: 'nhi 🐶', score: 1, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=nhi' },
  { nickname: 'Leilani', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leilani' },
  { nickname: 'Thùy Lâm.', score: 1, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ThuyLam' },
  { nickname: 'Uyên Nhi', score: 1, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=UyenNhi' },
  { nickname: 'bạn', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ban' },
  { nickname: 'tao là l...', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=taola' },
  { nickname: 'bé Vịt 🐥', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=beVit' },
  { nickname: 'N.', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=N' },
  { nickname: 'SWFACMSTA', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SWF' },
  { nickname: 'huyền ngọc', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=huyenngoc' },
  { nickname: 'dung_6890', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=dung' },
  { nickname: 'CTH', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CTH' },
  { nickname: '$oMaRoMic', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=soma' },
  { nickname: 'Thích muk', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=thichmuk' },
  { nickname: 'Hong Vuy', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=hongvuy' },
  { nickname: '_vtnn_', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=vtnn' },
  { nickname: 'p_thaoo', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=pthao' },
  { nickname: 'ở nhà tên...', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=onhaten' },
  { nickname: 'Kim Anh ♡', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=kimanh' },
  { nickname: 'Kim Toàn', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=kimtoan' },
  { nickname: 'taolaminh', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=taolaminh' },
  { nickname: 'Hu Hi', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=huhi' },
  { nickname: 'tmy', score: 0, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=tmy' },
];

// Khởi tạo MAX_DESKS ghế đơn (lưới 5x5) kèm học sinh ban đầu
const createInitialClassroom = (): { desks: DeskSlot[]; students: Record<string, Student> } => {
  const desks: DeskSlot[] = [];
  const students: Record<string, Student> = {};

  for (let i = 0; i < CLASSROOM_CONFIG.MAX_DESKS; i++) {
    const seed = SEED_STUDENTS[i];
    const studentId = seed ? `student_${i}` : null;

    if (seed && studentId) {
      const teamId = ((i % 4) + 1) as TeamId;
      students[studentId] = {
        id: studentId,
        username: seed.nickname,
        nickname: seed.nickname,
        avatarUrl: seed.avatar,
        teamId,
        appearanceIndex: nextAppearanceIndex(),
        score: seed.score,
        fundsDonated: 0,
        likesSent: 10,
        isHandRaised: false,
        lastActiveAt: Date.now(),
      };
    }

    desks.push({
      slotIndex: i,
      row: Math.floor(i / 5),
      col: i % 5,
      studentId,
    });
  }

  return { desks, students };
};

// Phân tổ ngẫu nhiên 1..4
const pickRandomTeam = (): TeamId => {
  return (Math.floor(Math.random() * 4) + 1) as TeamId;
};

const initialData = createInitialClassroom();

export const useClassroomStore = create<ClassroomState & ClassroomActions & {
  questions: QuestionItem[];
  currentQuestion: QuestionItem | null;
  activeSpeechBubble: string | null;
  isAvatarVisible: boolean;
}>((set, get) => ({
  sessionState: 'ANSWERING',
  currentSubject: 'Vũ trụ',
  currentLessonIndex: 1,
  totalLessons: 7,
  timeRemainingSec: 29,
  totalTimeSec: 30,
  heartCurrent: 2483,
  heartGoal: CLASSROOM_CONFIG.DEFAULT_HEART_GOAL,
  isMicMode: false,
  isAvatarVisible: readInitialAvatarVisibility(),
  isLockWhileReading: true,
  desks: initialData.desks,
  students: initialData.students,
  waitingQueue: Array.from({ length: MOCK_WAITING_COUNT }, (_, idx) => ({
    id: `queue_${idx}`,
    username: getMockWaitingNickname(idx),
    nickname: getMockWaitingNickname(idx),
    avatarUrl: idx % 2 === 0 ? `${MOCK_AVATAR_BASE_URL}${encodeURIComponent(getMockWaitingNickname(idx))}` : undefined,
    appearanceIndex: nextAppearanceIndex(),
    teamId: ((idx % 4) + 1) as TeamId,
    score: 0,
    likesSent: 0,
    fundsDonated: 0,
    isHandRaised: false,
    lastActiveAt: Date.now(),
  })),
  teams: JSON.parse(JSON.stringify(DEFAULT_TEAMS)),
  recentEntries: [
    { id: 'recent_1', nickname: 'tmy', reason: 'vào lớp nhờ thả tim ❤️', timestamp: Date.now() },
  ],
  currentQuestionId: null,
  revealedLetters: [],
  fastestWinnerId: null,
  teacherDutyState: 'PATROL',
  inspectingTargetSlot: null,
  questions: defaultQuestionBank as QuestionItem[],
  currentQuestion: {
    id: 'sample_space_1',
    topic: 'Vũ trụ',
    mode: 'ANAGRAM',
    questionText: 'Một hiện tượng kỳ ảo xuất hiện khi thiên thạch bay vào khí quyển Trái Đất',
    answer: 'SAO BĂNG',
    scrambledLetters: ['H', 'N', 'Ế', 'T', 'T', 'I', 'H', 'Ê'],
    hint: 'Thường thấy vệt sáng dài trên bầu trời đêm',
    timeLimitSec: 30,
  },
  activeSpeechBubble: 'Cô sẽ live dạy học thường xuyên, các trò nhớ ghé lớp nhé ❤️',

  setMicMode: (enabled) => set({ isMicMode: enabled }),
  setLockWhileReading: (enabled) => set({ isLockWhileReading: enabled }),
  setAvatarVisible: (isVisible) => set({ isAvatarVisible: isVisible }),
  setHeartGoal: (goal) => set({ heartGoal: goal }),

  startQuestion: (question) => {
    set({
      currentQuestion: question,
      currentQuestionId: question.id,
      sessionState: 'READING',
      timeRemainingSec: CLASSROOM_CONFIG.READING_COUNTDOWN_SEC,
      totalTimeSec: CLASSROOM_CONFIG.READING_COUNTDOWN_SEC,
      revealedLetters: [],
      fastestWinnerId: null,
      activeSpeechBubble: `Các trò chú ý! Câu hỏi chủ đề [${question.topic}]: Nghe cô đọc đề nè...`,
    });
  },

  tickTimer: () => {
    const { sessionState, timeRemainingSec, currentQuestion } = get();
    if (sessionState === 'IDLE') return;

    // 1. Tự động chuyển câu sau 5 giây vinh danh/công bố đáp án (REVEAL)
    if (sessionState === 'REVEAL') {
      const remainingReveal = (timeRemainingSec || 5) - 1;
      if (remainingReveal <= 0) {
        get().nextQuestion();
      } else {
        set({ timeRemainingSec: remainingReveal });
      }
      return;
    }

    // 2. Đếm ngược Giờ Ra Chơi
    if (sessionState === 'BELL_BREAK') {
      const remainingBreak = timeRemainingSec - 1;
      if (remainingBreak <= 0) {
        get().nextQuestion();
      } else {
        set({ timeRemainingSec: remainingBreak });
      }
      return;
    }

    if (sessionState === 'READING') {
      if (timeRemainingSec <= 1) {
        // Chuyển sang ANSWERING
        const limit = currentQuestion?.timeLimitSec || CLASSROOM_CONFIG.DEFAULT_TIME_LIMIT_SEC;
        set({
          sessionState: 'ANSWERING',
          timeRemainingSec: limit,
          totalTimeSec: limit,
          activeSpeechBubble: 'Đã mở bảng! Mau gõ đáp án vào bình luận để ghi điểm nhé!',
        });
      } else {
        set({ timeRemainingSec: timeRemainingSec - 1 });
      }
      return;
    }

    if (sessionState === 'ANSWERING') {
      if (timeRemainingSec <= 1) {
        // Hết giờ -> Lật đáp án
        get().revealAnswer();
      } else {
        const nextTime = timeRemainingSec - 1;
        // Khi còn 10 giây: Tự động mở gợi ý 1 chữ cái nếu chưa mở
        if (nextTime === 10) {
          get().unlockHintLetters(1);
        }

        // Lâu lâu có học sinh nghịch ngợm (nói chuyện riêng, ngủ gật, ăn vụng)
        if (nextTime % 14 === 0 && get().teacherDutyState === 'PATROL') {
          const { desks } = get();
          const activeDesks = desks.filter((d) => d.studentId);
          if (activeDesks.length > 0) {
            const randomDesk = activeDesks[Math.floor(Math.random() * activeDesks.length)];
            const types: StudentMisbehavior[] = ['TALKING', 'SLEEPING', 'EATING'];
            const chosenType = types[Math.floor(Math.random() * types.length)];
            get().triggerMisbehavior(randomDesk.slotIndex, chosenType);
          }
        }

        // Tự động kiểm tra và đi xuống đánh đòn nếu có học sinh vi phạm
        if (nextTime % 24 === 0 && get().teacherDutyState === 'PATROL') {
          const { desks, students } = get();
          const naughtyDesk = desks.find(
            (d) => d.studentId && students[d.studentId]?.misbehavior && students[d.studentId]?.misbehavior !== 'NONE'
          );
          if (naughtyDesk) {
            get().startTeacherInspection(naughtyDesk.slotIndex);
          }
        }

        set({ timeRemainingSec: nextTime });
      }
    }
  },

  revealAnswer: () => {
    const { currentQuestion } = get();
    set({
      sessionState: 'REVEAL',
      timeRemainingSec: 5,
      activeSpeechBubble: `Hết giờ! Đáp án chính xác là: ${currentQuestion?.answer || ''}!`,
    });
  },

  nextQuestion: () => {
    const { questions, currentLessonIndex, totalLessons } = get();
    const nextIdx = currentLessonIndex + 1;
    const nextQ = questions[(nextIdx - 1) % questions.length];

    if (nextIdx > totalLessons) {
      set({
        sessionState: 'IDLE',
        activeSpeechBubble: 'Tiết học hôm nay kết thúc! Chúc mừng các trò đã xuất sắc hoàn thành!',
      });
      return;
    }

    set({ currentLessonIndex: nextIdx });
    get().startQuestion(nextQ);
  },

  triggerBreak: () => {
    set({
      sessionState: 'BELL_BREAK',
      activeSpeechBubble: '🔔 Tùng tùng tùng! Đến giờ ra chơi rồi! Toàn bộ điểm số x2!',
      timeRemainingSec: 20,
    });
  },

  unlockHintLetters: (count = 1) => {
    const { currentQuestion, revealedLetters } = get();
    if (!currentQuestion) return;

    const cleanAnswer = currentQuestion.answer.replace(/\s+/g, '');
    const unrevealedIndices: number[] = [];
    for (let i = 0; i < cleanAnswer.length; i++) {
      if (!revealedLetters.includes(i)) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) return;

    // Chọn ngẫu nhiên index để lật
    const toReveal: number[] = [...revealedLetters];
    for (let c = 0; c < count && unrevealedIndices.length > 0; c++) {
      const randIdx = Math.floor(Math.random() * unrevealedIndices.length);
      toReveal.push(unrevealedIndices[randIdx]);
      unrevealedIndices.splice(randIdx, 1);
    }

    set({ revealedLetters: toReveal });
  },

  handleJoin: (user) => {
    const { students, desks, waitingQueue, recentEntries } = get();
    // Nếu học sinh đã có trong lớp, cập nhật active
    if (students[user.id]) {
      set({
        students: {
          ...students,
          [user.id]: {
            ...students[user.id],
            lastActiveAt: Date.now(),
          },
        },
      });
      return;
    }

    // Tìm ghế trống
    const emptyDesk = desks.find((d) => d.studentId === null);
    if (emptyDesk) {
      const newStudent: Student = {
        id: user.id,
        username: user.nickname,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        teamId: pickRandomTeam(),
        appearanceIndex: resolveAppearanceIndex(user.id, waitingQueue),
        score: 0,
        fundsDonated: 0,
        likesSent: 0,
        isHandRaised: false,
        lastActiveAt: Date.now(),
      };

      const updatedDesks = desks.map((d) =>
        d.slotIndex === emptyDesk.slotIndex ? { ...d, studentId: user.id } : d
      );

      set({
        students: { ...students, [user.id]: newStudent },
        desks: updatedDesks,
        recentEntries: [
          { id: `re_${Date.now()}`, nickname: user.nickname, reason: 'vừa bước vào lớp ngồi ghế!', timestamp: Date.now() },
          ...recentEntries.slice(0, 4),
        ],
      });
      triggerStudentWalk(newStudent, emptyDesk.slotIndex, false);
    } else {
      // Hết ghế -> đưa vào hàng đợi
      const queuedStudent: Student = {
        id: user.id,
        username: user.nickname,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        teamId: pickRandomTeam(),
        appearanceIndex: nextAppearanceIndex(),
        score: 0,
        likesSent: 0,
        fundsDonated: 0,
        isHandRaised: false,
        lastActiveAt: Date.now(),
      };
      set({
        waitingQueue: [...waitingQueue, queuedStudent],
        recentEntries: [
          { id: `re_${Date.now()}`, nickname: user.nickname, reason: 'đang xếp hàng ngoài hành lang', timestamp: Date.now() },
          ...recentEntries.slice(0, 4),
        ],
      });
    }
  },

  handleLike: (user, count = 1) => {
    const { heartCurrent, heartGoal, students, desks, waitingQueue, sessionState } = get();
    const newHeart = heartCurrent + count;

    // Nếu đạt mục tiêu tim -> Kích hoạt Giờ Ra Chơi
    if (newHeart >= heartGoal && sessionState !== 'BELL_BREAK') {
      get().triggerBreak();
    }

    // Nếu người like chưa có ghế và đang ở hàng đợi, có xác suất 15% bốc thăm vào lớp
    if (!students[user.id] && waitingQueue.some((q) => q.id === user.id)) {
      const emptyDesk = desks.find((d) => d.studentId === null);
      if (emptyDesk) {
        get().handleJoin(user);
      }
    }

    set({ heartCurrent: newHeart });
  },

  handleChat: (user, text) => {
    const { currentQuestion, sessionState, isLockWhileReading, students, teams, fastestWinnerId } = get();

    // 1. Nếu đang đọc đề và khóa chat -> không tính đáp án
    if (sessionState === 'READING' && isLockWhileReading) {
      return false;
    }

    // 2. Kiểm tra xem người chat có trong danh sách học sinh không (nếu chưa, auto-join)
    if (!students[user.id]) {
      get().handleJoin(user);
    }

    // 3. Nếu đang trong phiên trả lời -> So khớp đáp án
    if (sessionState === 'ANSWERING' && currentQuestion) {
      const isCorrect = checkAnswerMatch(text, currentQuestion.answer);

      if (isCorrect) {
        const student = get().students[user.id];
        if (!student) return false;

        const isFirst = fastestWinnerId === null;
        const points = isFirst ? 10 : 5;

        // Cập nhật điểm học sinh
        const updatedStudent: Student = {
          ...student,
          score: student.score + points,
          isHandRaised: true,
          lastActiveAt: Date.now(),
        };

        // Cập nhật điểm Tổ
        const team = teams[student.teamId];
        const teamMultiplier = team.buffExpiresAt > Date.now() ? 2 : 1;
        const updatedTeam = {
          ...team,
          totalScore: team.totalScore + points * teamMultiplier,
        };

        set({
          students: { ...get().students, [user.id]: updatedStudent },
          teams: { ...teams, [student.teamId]: updatedTeam },
          fastestWinnerId: isFirst ? user.id : fastestWinnerId,
          activeSpeechBubble: `Hoan hô ${student.nickname}! Trả lời cực nhanh và chính xác: +${points} điểm! 🎉`,
          // Rút ngắn thời gian còn 3 giây ăn mừng rồi tự động lật đáp án
          timeRemainingSec: Math.min(get().timeRemainingSec, 3),
        });

        // Tự động hạ tay sau 4 giây
        setTimeout(() => {
          const s = get().students[user.id];
          if (s) {
            set({
              students: {
                ...get().students,
                [user.id]: { ...s, isHandRaised: false },
              },
            });
          }
        }, 4000);

        return true;
      }
    }

    return false;
  },

  handleGift: (user, giftName, coins) => {
    const { students, desks, waitingQueue, teams, recentEntries } = get();

    // Ưu tiên vào thẳng ghế ngồi nếu đang ở hàng đợi
    let currentStudent = students[user.id];
    if (!currentStudent) {
      // Tìm ghế trống hoặc thay thế ghế AFK
      const emptyDesk = desks.find((d) => d.studentId === null);
      const targetSlot = emptyDesk
        ? emptyDesk.slotIndex
        : Math.floor(Math.random() * CLASSROOM_CONFIG.MAX_DESKS);

      currentStudent = {
        id: user.id,
        username: user.nickname,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        teamId: pickRandomTeam(),
        appearanceIndex: resolveAppearanceIndex(user.id, waitingQueue),
        score: 0,
        fundsDonated: coins,
        likesSent: 0,
        isHandRaised: false,
        lastActiveAt: Date.now(),
      };

      const updatedDesks = desks.map((d) =>
        d.slotIndex === targetSlot ? { ...d, studentId: user.id } : d
      );

      set({
        students: { ...students, [user.id]: currentStudent },
        desks: updatedDesks,
        waitingQueue: waitingQueue.filter((q) => q.id !== user.id),
      });
      triggerStudentWalk(currentStudent, targetSlot, true);
    } else {
      // Cộng tổng coin đóng góp
      set({
        students: {
          ...students,
          [user.id]: {
            ...currentStudent,
            fundsDonated: currentStudent.fundsDonated + coins,
            lastActiveAt: Date.now(),
          },
        },
      });
    }

    // Hiệu ứng hỗ trợ Tổ theo giá trị quà
    if (coins >= 50 && currentStudent) {
      const team = teams[currentStudent.teamId];
      set({
        teams: {
          ...teams,
          [currentStudent.teamId]: {
            ...team,
            buffExpiresAt: Date.now() + 60000, // x2 trong 60s
          },
        },
        activeSpeechBubble: `Ôi tuyệt quá! ${user.nickname} đóng quỹ [${giftName}] ${coins} xu, kích hoạt x2 điểm cho ${team.name}! ⭐`,
      });
    } else {
      set({
        activeSpeechBubble: `Cảm ơn ${user.nickname} đã ủng hộ [${giftName}] vào Quỹ lớp! ❤️`,
      });
    }

    set({
      recentEntries: [
        { id: `re_${Date.now()}`, nickname: user.nickname, reason: `đã gửi [${giftName}] đóng quỹ lớp!`, timestamp: Date.now() },
        ...recentEntries.slice(0, 4),
      ],
    });
  },

  triggerMisbehavior: (slotIndex, type, text) => {
    const { desks, students } = get();
    const desk = desks[slotIndex];
    if (!desk || !desk.studentId) return;

    const student = students[desk.studentId];
    if (!student) return;

    const defaultTexts: Record<StudentMisbehavior, string> = {
      NONE: '',
      TALKING: 'Tí ra chơi ăn gì m? 😋',
      SLEEPING: 'Zzz... 😴',
      EATING: 'Trà sữa nè 🧋',
    };

    const updatedStudent: Student = {
      ...student,
      misbehavior: type,
      misbehaviorText: text || defaultTexts[type],
    };

    set({
      students: { ...students, [desk.studentId]: updatedStudent },
    });
  },

  clearMisbehavior: (slotIndex) => {
    const { desks, students } = get();
    const desk = desks[slotIndex];
    if (!desk || !desk.studentId) return;

    const student = students[desk.studentId];
    if (!student) return;

    const updatedStudent: Student = {
      ...student,
      misbehavior: 'NONE',
      misbehaviorText: undefined,
      isBeingPunished: false,
    };

    set({
      students: { ...students, [desk.studentId]: updatedStudent },
    });
  },

  startTeacherInspection: (targetSlotIndex) => {
    const { desks, students, teacherDutyState } = get();
    if (teacherDutyState !== 'PATROL') return;

    let targetSlot = targetSlotIndex;
    if (targetSlot === undefined) {
      const naughtyDesk = desks.find(
        (d) => d.studentId && students[d.studentId]?.misbehavior && students[d.studentId]?.misbehavior !== 'NONE'
      );
      if (naughtyDesk) {
        targetSlot = naughtyDesk.slotIndex;
      } else {
        const activeDesks = desks.filter((d) => d.studentId);
        if (activeDesks.length === 0) return;
        const randomDesk = activeDesks[Math.floor(Math.random() * activeDesks.length)];
        targetSlot = randomDesk.slotIndex;
        get().triggerMisbehavior(targetSlot, 'SLEEPING', 'Zzz... khò khò');
      }
    }

    const desk = desks[targetSlot];
    const student = desk?.studentId ? students[desk.studentId] : null;
    const studentName = student ? student.nickname : 'học sinh';

    set({
      inspectingTargetSlot: targetSlot,
      teacherDutyState: 'WALKING_TO_STUDENT',
      activeSpeechBubble: `Cô phát hiện bạn [${studentName}] đang làm việc riêng nhé! Để cô xuống kiểm tra bài! 📏👩‍🏫`,
    });
  },

  punishStudent: (slotIndex) => {
    const { desks, students } = get();
    const desk = desks[slotIndex];
    if (!desk || !desk.studentId) {
      get().returnTeacherToPodium();
      return;
    }

    const student = students[desk.studentId];
    if (!student) {
      get().returnTeacherToPodium();
      return;
    }

    const updatedStudent: Student = {
      ...student,
      isBeingPunished: true,
      score: Math.max(0, student.score - 2),
    };

    set({
      teacherDutyState: 'PUNISHING',
      students: { ...students, [desk.studentId]: updatedStudent },
      activeSpeechBubble: `Em ${student.nickname}! Giờ học phải tập trung nghe giảng và ghi chép bài đầy đủ nhé! 📏✨`,
    });

    setTimeout(() => {
      get().clearMisbehavior(slotIndex);
      get().returnTeacherToPodium();
    }, 2500);
  },

  returnTeacherToPodium: () => {
    set({
      teacherDutyState: 'RETURNING',
      activeSpeechBubble: 'Cả lớp trật tự, tập trung giải câu đố cho cô nào! 📝',
    });
  },

  resetClassroom: () => {
    const fresh = createInitialClassroom();
    set({
      desks: fresh.desks,
      students: fresh.students,
      waitingQueue: [],
      recentEntries: [],
      revealedLetters: [],
      fastestWinnerId: null,
      sessionState: 'IDLE',
      currentLessonIndex: 1,
      heartCurrent: 2483,
    });
  },
}));

import { create } from 'zustand';
import type { QuestionItem, GameModeType } from '../../../shared/types/question.js';
import defaultQuestions from '../../../shared/data/questionBank.json';

interface AdminState {
  questions: QuestionItem[];
  selectedCategory: GameModeType | 'ALL';
  currentQuestionIndex: number;
  isMicMode: boolean;
  isLockWhileReading: boolean;
  /** Hiện ảnh avatar người xem trên màn hình live (tắt để xem riêng hình học sinh). */
  isAvatarVisible: boolean;
  heartGoal: number;
  autoBotActive: boolean;

  // Actions
  setSelectedCategory: (cat: GameModeType | 'ALL') => void;
  setCurrentQuestionIndex: (idx: number) => void;
  toggleMicMode: () => void;
  toggleLockWhileReading: () => void;
  toggleAvatarVisible: () => void;
  setHeartGoal: (goal: number) => void;
  toggleAutoBot: () => void;
  addQuestion: (q: QuestionItem) => void;
  deleteQuestion: (id: string) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  questions: defaultQuestions as QuestionItem[],
  selectedCategory: 'ALL',
  currentQuestionIndex: 0,
  isMicMode: false,
  isLockWhileReading: true,
  isAvatarVisible: true,
  heartGoal: 10_000,
  autoBotActive: false,

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),
  toggleMicMode: () => set((state) => ({ isMicMode: !state.isMicMode })),
  toggleLockWhileReading: () => set((state) => ({ isLockWhileReading: !state.isLockWhileReading })),
  toggleAvatarVisible: () => set((state) => ({ isAvatarVisible: !state.isAvatarVisible })),
  setHeartGoal: (goal) => set({ heartGoal: goal }),
  toggleAutoBot: () => set((state) => ({ autoBotActive: !state.autoBotActive })),
  addQuestion: (q) => set((state) => ({ questions: [q, ...state.questions] })),
  deleteQuestion: (id) => set((state) => ({ questions: state.questions.filter((item) => item.id !== id) })),
}));


export type GameModeType = 'ANAGRAM' | 'QUIZ' | 'ENGLISH';

export interface QuestionItem {
  id: string;
  mode: GameModeType;
  topic: string;
  questionText: string;
  answer: string;           // Đáp án chuẩn (ví dụ "THIÊN THẠCH", "B", "APPLE")
  scrambledLetters?: string[]; // Dành cho ANAGRAM: các ký tự xáo trộn
  options?: string[];       // Dành cho QUIZ: ['A. Mặt Trời', 'B. Sao Hỏa', 'C. Trái Đất', 'D. Sao Thổ']
  hint?: string;            // Gợi ý khi còn 10s hoặc khi có người donate quà
  timeLimitSec?: number;    // Mặc định 25s
}

export interface AnswerSubmission {
  studentId: string;
  studentName: string;
  text: string;
  submittedAt: number;
}


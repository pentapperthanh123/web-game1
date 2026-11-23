export type TeamId = 1 | 2 | 3 | 4;

export type StudentMisbehavior = 'NONE' | 'TALKING' | 'SLEEPING' | 'EATING';

export interface Student {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  teamId: TeamId;
  score: number;
  likesSent: number;
  fundsDonated: number; // Quỹ lớp (xu)
  isHandRaised: boolean;
  handRaisedAt?: number;
  lastActiveAt: number;
  roleBadge?: 'MONITOR' | 'VICE_MONITOR' | 'TREASURER'; // Lớp Trưởng, Lớp Phó, Thủ Quỹ
  misbehavior?: StudentMisbehavior;
  misbehaviorText?: string;
  isBeingPunished?: boolean;
  /** Kiểu nhân vật 2D (chỉ số trong STUDENT_VARIANTS của client), gán xoay vòng khi tạo học sinh. */
  appearanceIndex?: number;
}

export interface DeskSlot {
  slotIndex: number; // 0..24 (25 ghế, lưới 5x5)
  row: number;       // 0..4
  col: number;       // 0..4
  studentId: string | null;
}

export interface TeamGroup {
  id: TeamId;
  name: string;
  color: string;
  lightColor: string;
  totalScore: number;
  buffMultiplier: number; // Mặc định 1, tăng lên 2 khi có quà buff
  buffExpiresAt: number;
}

export type ClassSessionState =
  | 'IDLE'
  | 'READING'
  | 'ANSWERING'
  | 'REVEAL'
  | 'BELL_BREAK';

export type TeacherDutyState =
  | 'PATROL'
  | 'WALKING_TO_STUDENT'
  | 'PUNISHING'
  | 'RETURNING';

export interface ClassroomState {
  sessionState: ClassSessionState;
  currentSubject: string;
  currentLessonIndex: number;
  totalLessons: number;
  timeRemainingSec: number;
  totalTimeSec: number;
  heartCurrent: number;
  heartGoal: number;
  isMicMode: boolean; // Host mở mic thật (tắt TTS đọc đề)
  isLockWhileReading: boolean; // Khóa đáp án khi đang đọc đề
  desks: DeskSlot[];
  students: Record<string, Student>;
  waitingQueue: Student[];
  teams: Record<TeamId, TeamGroup>;
  recentEntries: Array<{ id: string; nickname: string; reason: string; timestamp: number }>;
  currentQuestionId: string | null;
  revealedLetters: number[]; // Index các chữ cái đã được lật mở sớm
  fastestWinnerId: string | null;
  teacherDutyState: TeacherDutyState;
  inspectingTargetSlot: number | null;
}


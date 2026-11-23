import React from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { BOARD_LAYOUT } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { clamp } from '../../utils/clamp';

const RIGHT_COLUMN_WIDTH =
  BOARD_LAYOUT.RIGHT -
  BOARD_LAYOUT.LEFT -
  2 * (BOARD_LAYOUT.FRAME_WIDTH + BOARD_LAYOUT.INNER_PADDING) -
  BOARD_LAYOUT.LEADERBOARD_WIDTH -
  BOARD_LAYOUT.COLUMN_GAP;
const TILE_FONT_RATIO = 0.55;

/** Cỡ ô chữ co lại theo số ký tự để luôn nằm trên 1 hàng, không tràn bảng. */
const getTileSize = (letterCount: number): number => {
  if (letterCount <= 0) return BOARD_LAYOUT.ANAGRAM_TILE_MAX;
  const totalGap = (letterCount - 1) * BOARD_LAYOUT.ANAGRAM_TILE_GAP;
  const fitted = Math.floor((RIGHT_COLUMN_WIDTH - totalGap) / letterCount);
  return clamp(fitted, BOARD_LAYOUT.ANAGRAM_TILE_MIN, BOARD_LAYOUT.ANAGRAM_TILE_MAX);
};

export const AnagramBoard: React.FC = () => {
  const currentQuestion = useClassroomStore((s) => s.currentQuestion);
  const revealedLetters = useClassroomStore((s) => s.revealedLetters);
  const sessionState = useClassroomStore((s) => s.sessionState);
  if (!currentQuestion || currentQuestion.mode !== 'ANAGRAM') return null;

  const scrambled = currentQuestion.scrambledLetters || [];
  const answerLetters = Array.from(currentQuestion.answer.replace(/\s+/g, ''));
  const isReveal = sessionState === 'REVEAL';
  const tileSize = getTileSize(Math.max(scrambled.length, answerLetters.length));
  const tileStyle: React.CSSProperties = {
    width: tileSize,
    height: tileSize,
    fontSize: Math.round(tileSize * TILE_FONT_RATIO),
  };
  const rowStyle: React.CSSProperties = { gap: BOARD_LAYOUT.ANAGRAM_TILE_GAP };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="flex flex-nowrap items-center justify-center" style={rowStyle}>
        {scrambled.map((char, idx) => (
          <div
            key={idx}
            style={tileStyle}
            className="rounded-md bg-[#0a422a] text-white font-black flex items-center justify-center border-2 border-emerald-400/70"
          >
            {char}
          </div>
        ))}
      </div>
      <div className="flex flex-nowrap items-center justify-center" style={rowStyle}>
        {answerLetters.map((char, idx) => {
          const isRevealed = isReveal || revealedLetters.includes(idx);
          return (
            <div
              key={idx}
              style={tileStyle}
              className={`rounded-md border-2 flex items-center justify-center font-black transition-colors duration-300 ${
                isRevealed
                  ? 'bg-emerald-400 text-emerald-950 border-emerald-200'
                  : 'bg-[#08281a]/80 border-dashed border-emerald-400/40 text-transparent'
              }`}
            >
              {isRevealed ? char : '?'}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-emerald-200 font-medium text-center truncate max-w-full">
        {currentQuestion.hint ? `${STAGE_TEXT.ANAGRAM_HINT_PREFIX} ${currentQuestion.hint}` : STAGE_TEXT.ANAGRAM_DEFAULT_HINT}
      </div>
    </div>
  );
};

export default AnagramBoard;

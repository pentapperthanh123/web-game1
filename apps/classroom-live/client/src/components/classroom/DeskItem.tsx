import React, { useEffect, useState } from 'react';
import type { Student } from '../../../../shared/types/classroom';
import { DESK_GRID, STUDENT_FIGURE } from '../../constants/stageLayout';
import { getStudentVariant } from '../../utils/studentAppearance';
import { DEFAULT_BOY_VARIANT } from '../../constants/studentVariants';
import { DeskSurface } from './DeskSurface';
import { StudentBodyFallback } from './StudentFigure';
import { SeatedStudentSprite, useSeatedSpriteSrc } from './SeatedStudentSprite';
import { StudentCard } from './StudentCard';
import { DeskEffects } from './DeskEffects';

const CELEBRATE_DURATION_MS = 2500;

interface DeskItemProps {
  student?: Student;
  isTopOne?: boolean;
  isAvatarVisible: boolean;
}

const useCorrectAnswerFlash = (student?: Student): boolean => {
  const [isCelebrating, setIsCelebrating] = useState<boolean>(false);

  useEffect(() => {
    if (!student?.isHandRaised) return;
    setIsCelebrating(true);
    const timer = setTimeout(() => setIsCelebrating(false), CELEBRATE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [student?.isHandRaised, student?.score]);

  return isCelebrating;
};

/** Bản dự phòng khi chưa có ảnh `student-seated-*.png`: bàn SVG + thân học sinh vẽ CSS, cùng vùng với ảnh. */
const FallbackSeatedStudent: React.FC<{ isGirl: boolean }> = ({ isGirl }) => (
  <>
    <DeskSurface hasStudent />
    <div
      className="absolute left-1/2"
      style={{
        top: DESK_GRID.FALLBACK_BODY_TOP,
        width: STUDENT_FIGURE.WIDTH,
        height: STUDENT_FIGURE.HEIGHT,
        transform: `translateX(-50%) scale(${DESK_GRID.FALLBACK_BODY_SCALE})`,
        transformOrigin: 'top center',
      }}
    >
      <StudentBodyFallback isGirl={isGirl} />
    </div>
  </>
);

/**
 * Một ô bàn 112x113, các lớp không chồng nhau:
 * thẻ người chơi (y 0..34) phía trên, ảnh học sinh ngồi bàn (y 38..113) phía dưới.
 */
export const DeskItem: React.FC<DeskItemProps> = ({ student, isTopOne = false, isAvatarVisible }) => {
  const isCelebrating = useCorrectAnswerFlash(student);
  const variant = student ? getStudentVariant(student) : DEFAULT_BOY_VARIANT;
  const spriteSrc = useSeatedSpriteSrc(variant);

  if (!student) {
    return (
      <div className="relative w-full h-full">
        <DeskSurface hasStudent={false} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {spriteSrc ? <SeatedStudentSprite spriteSrc={spriteSrc} /> : <FallbackSeatedStudent isGirl={variant.isGirl} />}
      <StudentCard student={student} isAvatarVisible={isAvatarVisible} isTopOne={isTopOne} isCelebrating={isCelebrating} />
      <DeskEffects student={student} isCelebrating={isCelebrating} />
    </div>
  );
};

export default DeskItem;

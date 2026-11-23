import React from 'react';
import { Heart, Gift } from 'lucide-react';
import { useClassroomStore } from '../../store/classroomStore';
import { HUD_LAYOUT, STAGE_ASSETS, STAGE_SIZE, STAGE_ZONES } from '../../constants/stageLayout';
import { STAGE_TEXT } from '../../constants/stageText';
import { useAssetAvailable } from '../../services/assetProbe';
import { clamp } from '../../utils/clamp';
import { BannerNotice, useBannerKind } from './BannerNotice';

const PERCENT_MAX = 100;

const ClassSign: React.FC = () => (
  <div
    className="absolute flex items-center gap-1.5 bg-gradient-to-b from-[#f3c88e] via-[#df9f52] to-[#b06a29] border-2 border-[#5c2d0c] rounded-2xl px-3 shadow-lg"
    style={{ left: HUD_LAYOUT.SIDE_PADDING, top: HUD_LAYOUT.ROW_TOP, height: HUD_LAYOUT.ROW_HEIGHT }}
  >
    <span className="text-[13px]">🌿</span>
    <span className="font-black text-[13px] text-[#3b1c06] tracking-wider uppercase whitespace-nowrap">
      {STAGE_TEXT.CLASS_NAME}
    </span>
    <span className="text-[13px]">🌿</span>
  </div>
);

const PortraitFrame: React.FC = () => {
  const hasPortrait = useAssetAvailable(STAGE_ASSETS.PORTRAIT);
  return (
    <div
      className="absolute bg-[#9b1919] border-2 border-[#d9a239] shadow-xl p-0.5 flex items-center justify-center"
      style={{
        left: (STAGE_SIZE.WIDTH - HUD_LAYOUT.PORTRAIT_WIDTH) / 2,
        top: HUD_LAYOUT.PORTRAIT_TOP,
        width: HUD_LAYOUT.PORTRAIT_WIDTH,
        height: HUD_LAYOUT.PORTRAIT_HEIGHT,
      }}
    >
      {hasPortrait ? (
        <img src={STAGE_ASSETS.PORTRAIT} alt={STAGE_TEXT.PORTRAIT_ALT} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[18px] text-yellow-300">★</span>
      )}
    </div>
  );
};

const RoundPill: React.FC = () => {
  const currentLessonIndex = useClassroomStore((s) => s.currentLessonIndex);
  const totalLessons = useClassroomStore((s) => s.totalLessons);
  const perRound = HUD_LAYOUT.QUESTIONS_PER_ROUND;
  const roundNumber = Math.ceil(currentLessonIndex / perRound);
  const questionInRound = currentLessonIndex % perRound || perRound;
  const progressPercent = Math.min(PERCENT_MAX, (questionInRound / perRound) * PERCENT_MAX);

  return (
    <div
      className="absolute bg-[#fff6e6] border-2 border-[#844c1d] rounded-full px-3 shadow-md flex flex-col items-center justify-center"
      style={{
        right: HUD_LAYOUT.SIDE_PADDING,
        top: HUD_LAYOUT.ROW_TOP,
        height: HUD_LAYOUT.ROW_HEIGHT,
        width: HUD_LAYOUT.ROUND_PILL_WIDTH,
      }}
    >
      <span className="text-[12px] font-black text-[#5a2a07] tracking-wide whitespace-nowrap">
        {STAGE_TEXT.ROUND_LABEL} {roundNumber} · {STAGE_TEXT.QUESTION_LABEL} {questionInRound}/{totalLessons}
      </span>
      <div className="w-full h-1 bg-[#d6b793] rounded-full overflow-hidden mt-0.5">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};

const HeartGoalBar: React.FC = () => {
  const heartCurrent = useClassroomStore((s) => s.heartCurrent);
  const heartGoal = useClassroomStore((s) => s.heartGoal);
  const heartPercent = clamp((heartCurrent / heartGoal) * PERCENT_MAX, HUD_LAYOUT.MIN_HEART_PERCENT, PERCENT_MAX);
  const iconOffset = HUD_LAYOUT.HEART_ICON_SIZE / 2;
  const iconTop = HUD_LAYOUT.HEART_BAR_TOP + (HUD_LAYOUT.HEART_BAR_HEIGHT - HUD_LAYOUT.HEART_ICON_SIZE) / 2;

  return (
    <>
      <div
        className="absolute bg-[#fff8ed] border-2 border-[#8c4d1b] rounded-full overflow-hidden p-0.5 shadow-inner flex items-center"
        style={{
          left: HUD_LAYOUT.HEART_BAR_LEFT,
          top: HUD_LAYOUT.HEART_BAR_TOP,
          width: HUD_LAYOUT.HEART_BAR_WIDTH,
          height: HUD_LAYOUT.HEART_BAR_HEIGHT,
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-pink-400 to-rose-400 rounded-full transition-all duration-500"
          style={{ width: `${heartPercent}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-black text-[#421b04] tracking-wider">
          {heartCurrent.toLocaleString()} / {heartGoal.toLocaleString()} {STAGE_TEXT.HEART_UNIT}
        </span>
      </div>
      <div
        className="absolute rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 flex items-center justify-center shadow-lg border-2 border-white animate-heart-beat"
        style={{
          left: HUD_LAYOUT.HEART_BAR_LEFT - iconOffset,
          top: iconTop,
          width: HUD_LAYOUT.HEART_ICON_SIZE,
          height: HUD_LAYOUT.HEART_ICON_SIZE,
        }}
      >
        <Heart className="w-5 h-5 text-white fill-white" />
      </div>
      <div
        className="absolute rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center shadow-lg"
        style={{
          left: HUD_LAYOUT.HEART_BAR_LEFT + HUD_LAYOUT.HEART_BAR_WIDTH - iconOffset,
          top: iconTop,
          width: HUD_LAYOUT.HEART_ICON_SIZE,
          height: HUD_LAYOUT.HEART_ICON_SIZE,
        }}
      >
        <Gift className="w-5 h-5 text-rose-600" />
      </div>
    </>
  );
};

const GiftGoalHint: React.FC = () => {
  const heartGoal = useClassroomStore((s) => s.heartGoal);
  return (
    <div className="h-full flex items-center justify-center gap-1.5 text-[11px] font-black text-[#693915] whitespace-nowrap">
      <Gift className="w-3.5 h-3.5 text-amber-600" />
      <span>{STAGE_TEXT.HEART_GOAL_HINT(heartGoal.toLocaleString())}</span>
    </div>
  );
};

/** Layer 1 — Top HUD, gói gọn trong y 0..125. */
export const TopClassHeader: React.FC = () => {
  const bannerKind = useBannerKind();

  return (
    <div
      className="absolute inset-x-0 top-0 pointer-events-none select-none"
      style={{ height: STAGE_ZONES.HUD.BOTTOM - STAGE_ZONES.HUD.TOP }}
    >
      <ClassSign />
      <PortraitFrame />
      <RoundPill />
      <HeartGoalBar />
      <div
        className="absolute inset-x-0 flex justify-center"
        style={{ top: HUD_LAYOUT.NOTICE_TOP, height: HUD_LAYOUT.NOTICE_HEIGHT }}
      >
        {bannerKind ? <BannerNotice kind={bannerKind} /> : <GiftGoalHint />}
      </div>
    </div>
  );
};

export default TopClassHeader;

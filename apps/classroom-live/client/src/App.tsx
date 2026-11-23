import React, { useEffect, useRef } from 'react';
import { TopClassHeader } from './components/hud/TopClassHeader';
import { BlackboardView } from './components/blackboard/BlackboardView';
import { TeacherActor } from './components/teacher/TeacherActor';
import { TeacherDesk } from './components/teacher/TeacherDesk';
import { ClassroomFloor } from './components/classroom/ClassroomFloor';
import { StudentWalkController } from './components/classroom/StudentWalkController';
import { HallwayView } from './components/hallway/HallwayView';
import { ClassStatusBar } from './components/blackboard/ClassStatusBar';
import { ScaledStage } from './components/stage/ScaledStage';
import { StageLayer } from './components/stage/StageLayer';
import { ClassroomBackdrop } from './components/stage/ClassroomBackdrop';
import { TeacherSpeechBubble } from './components/overlay/TeacherSpeechBubble';
import { STAGE_Z_INDEX } from './constants/stageLayout';
import { useClassroomStore } from './store/classroomStore';
import { CoreReceiver } from './services/coreReceiver';
import { FpsLimiter } from './services/fpsLimiter';
import { startClientSync } from './services/clientSync';

export const App: React.FC = () => {
  const {
    tickTimer,
    handleJoin,
    handleLike,
    handleChat,
    handleGift,
    currentQuestion,
    startQuestion,
  } = useClassroomStore();

  const receiverRef = useRef<CoreReceiver | null>(null);
  const limiterRef = useRef<FpsLimiter | null>(null);
  useEffect(() => {
    // 1. Tự động phát câu hỏi đầu tiên nếu có
    if (currentQuestion) {
      startQuestion(currentQuestion);
    }

    // 2. Bộ đếm ngược 1 giây cho game state machine
    const secondTimer = setInterval(() => {
      tickTimer();
    }, 1000);

    // 3. Khóa cứng render loop ở 30 FPS cho laptop GPU tích hợp
    const limiter = new FpsLimiter(30);
    limiter.start((_deltaTime) => {
      // 30 FPS render tick
    });
    limiterRef.current = limiter;

    // 4. Lắng nghe đồng bộ thời gian thực từ Admin (BroadcastChannel & postMessage)
    const stopSync = startClientSync();

    // 5. Kết nối nhận sự kiện từ Core hoặc Gateway (Port 5000)
    const receiver = new CoreReceiver('http://localhost:5000');
    receiver.connect();
    const unsub = receiver.onEvent((event) => {
      const user = event.user || {
        id: 'anon',
        username: 'Học sinh',
        nickname: 'Học sinh',
      };

      switch (event.type) {
        case 'JOIN':
          handleJoin(user);
          break;
        case 'LIKE':
          handleLike(user, Number(event.count) || 1);
          break;
        case 'CHAT':
          handleChat(user, String(event.text || event.cleanText || ''));
          break;
        case 'GIFT':
          handleGift(user, String(event.giftName || 'Hoa'), Number(event.coinValue) || 1);
          break;
      }
    });
    receiverRef.current = receiver;

    return () => {
      clearInterval(secondTimer);
      limiter.stop();
      stopSync();
      unsub();
      receiver.disconnect();
    };
  }, []);

  return (
    <ScaledStage>
      {/* Layer 0: Nền phòng học trống (bg-classroom.png hoặc CSS) */}
      <StageLayer zIndex={STAGE_Z_INDEX.BACKDROP}>
        <ClassroomBackdrop />
      </StageLayer>

      {/* Layer 1: Top HUD (y 0..125) & Bảng xanh (y 130..356) + thanh sĩ số (y 362..390) */}
      <StageLayer zIndex={STAGE_Z_INDEX.HUD_BOARD}>
        <TopClassHeader />
        <BlackboardView />
        <ClassStatusBar />
      </StageLayer>

      {/* Layer 2 + 3: Cô giáo (bục giảng y 395..510) & lưới 25 bàn (y 515..1080).
          Hai layer dùng chung dải độ sâu theo y chân nên không tạo stacking context riêng. */}
      <StageLayer>
        <TeacherActor />
        <TeacherDesk />
      </StageLayer>
      <StageLayer>
        <ClassroomFloor />
        <StudentWalkController />
      </StageLayer>

      {/* Layer 4: Hàng chờ hành lang 2 rìa */}
      <StageLayer zIndex={STAGE_Z_INDEX.HALLWAY}>
        <HallwayView />
      </StageLayer>

      {/* Layer 5: Bong bóng thoại & hiệu ứng nổi (cao nhất) */}
      <StageLayer zIndex={STAGE_Z_INDEX.OVERLAY}>
        <TeacherSpeechBubble />
      </StageLayer>
    </ScaledStage>
  );
};

export default App;

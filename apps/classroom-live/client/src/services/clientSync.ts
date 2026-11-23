import { useClassroomStore } from '../store/classroomStore';
import { triggerStudentWalk } from './walkBus';
import type { Student } from '../../../shared/types/classroom';

export const startClientSync = () => {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('classroom_live_sync') : null;

  const handleMessage = (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const msg = data as Record<string, unknown>;
    const store = useClassroomStore.getState();

    // 1. Nhận sự kiện tương tác Livestream từ Admin / Simulator
    if (msg.type === 'LIVE_EVENT' && msg.event) {
      const event = msg.event as Record<string, unknown>;
      const user = (event.user as { id: string; nickname: string; avatarUrl?: string }) || {
        id: 'mock_user',
        nickname: 'Học sinh',
      };

      switch (event.type) {
        case 'JOIN':
          store.handleJoin(user);
          break;
        case 'LIKE':
          store.handleLike(user, Number(event.count) || 1);
          break;
        case 'CHAT':
          store.handleChat(user, String(event.text || ''));
          break;
        case 'GIFT':
          store.handleGift(user, String(event.giftName || 'Hoa hồng'), Number(event.coinValue) || 1);
          break;
      }
    }

    // 2. Nhận lệnh điều phối tiết học từ Host
    if (msg.type === 'ADMIN_ACTION') {
      const action = String(msg.action);
      const payload = (msg.payload as Record<string, unknown>) || {};

      switch (action) {
        case 'START_QUESTION':
          if (payload.question) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store.startQuestion(payload.question as any);
          }
          break;
        case 'NEXT_QUESTION':
          store.nextQuestion();
          break;
        case 'UNLOCK_HINT':
          store.unlockHintLetters(1);
          break;
        case 'TRIGGER_BREAK':
          store.triggerBreak();
          break;

        // 4 LỆNH TEST DIỄN HOẠT (ANIMATION TEST SUITE)
        case 'TEST_TEACHER_ACTION': {
          // Chuyển đổi giữa Đi tuần (ANSWERING) và Bật nhảy ăn mừng (REVEAL)
          if (store.sessionState === 'ANSWERING') {
            useClassroomStore.setState({
              sessionState: 'REVEAL',
              fastestWinnerId: 'student_0',
              activeSpeechBubble: 'Tuyệt vời! Cả lớp vỗ tay chúc mừng bạn trả lời đúng nào! 🎉👏',
            });
          } else {
            useClassroomStore.setState({
              sessionState: 'ANSWERING',
              timeRemainingSec: 25,
              activeSpeechBubble: 'Cô đang đi tuần quan sát các trò làm bài nhé! 📝',
            });
          }
          break;
        }

        case 'TEST_WALK_NORMAL': {
          // Thả 3 học sinh thường đi bộ từ cửa vào 3 bàn hàng đầu
          const names = ['Bảo Ngọc', 'Gia Huy', 'Khánh An'];
          names.forEach((name, idx) => {
            setTimeout(() => {
              const testStudent: Student = {
                id: `test_walker_${Date.now()}_${idx}`,
                username: name,
                nickname: name,
                avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
                teamId: ((idx % 4) + 1) as 1 | 2 | 3 | 4,
                score: 0,
                likesSent: 0,
                fundsDonated: 0,
                isHandRaised: false,
                lastActiveAt: Date.now(),
              };
              triggerStudentWalk(testStudent, idx * 2, false);
            }, idx * 400);
          });
          break;
        }

        case 'TEST_WALK_VIP': {
          // 1 Học sinh VIP nạp quỹ lớp chạy nhanh 1.4x với hào quang vàng vào bàn trung tâm
          const vipStudent: Student = {
            id: `vip_${Date.now()}`,
            username: 'Đại Gia Phố Cổ',
            nickname: 'Đại Gia VIP ⭐',
            avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VIP',
            teamId: 1,
            score: 10,
            likesSent: 99,
            fundsDonated: 500,
            isHandRaised: false,
            lastActiveAt: Date.now(),
          };
          triggerStudentWalk(vipStudent, 2, true);
          useClassroomStore.setState({
            activeSpeechBubble: 'Chào mừng Đại Gia VIP vừa đóng Quỹ lớp vào bàn danh dự! 🌟',
          });
          break;
        }

        case 'TEST_STUDENT_HANDS': {
          // 5 học sinh cùng giơ tay bật nhảy ăn mừng +10đ
          const students = { ...store.students };
          const keys = Object.keys(students).slice(0, 5);
          keys.forEach((key) => {
            students[key] = {
              ...students[key],
              isHandRaised: true,
              score: students[key].score + 10,
            };
          });
          useClassroomStore.setState({
            students,
            activeSpeechBubble: 'Hoan hô! Rất nhiều học sinh đã giơ tay trả lời xuất sắc! 🙋✨',
          });

          setTimeout(() => {
            const nextStudents = { ...useClassroomStore.getState().students };
            keys.forEach((k) => {
              if (nextStudents[k]) {
                nextStudents[k] = { ...nextStudents[k], isHandRaised: false };
              }
            });
            useClassroomStore.setState({ students: nextStudents });
          }, 3000);
          break;
        }

        // BỘ TEST TINH NGHỊCH & KỶ LUẬT LỚP HỌC (MISBEHAVIOR & DISCIPLINE)
        case 'TEST_TEACHER_INSPECT': {
          store.startTeacherInspection();
          break;
        }

        case 'TEST_STUDENT_SLEEP': {
          const sleepSlots = [6, 12, 18];
          sleepSlots.forEach((slot) => {
            store.triggerMisbehavior(slot, 'SLEEPING', 'Zzz... 😴');
          });
          useClassroomStore.setState({
            activeSpeechBubble: 'Ơ kìa, mấy bạn dãy bàn giữa ngủ gật hết rồi kìa! 😴',
          });
          break;
        }

        case 'TEST_STUDENT_EAT': {
          const eatSlots = [7, 13, 21];
          const snacks = ['Trà sữa 🧋', 'Bánh tráng 🥢', 'Xoài lắc 🥭'];
          eatSlots.forEach((slot, idx) => {
            store.triggerMisbehavior(slot, 'EATING', snacks[idx]);
          });
          useClassroomStore.setState({
            activeSpeechBubble: 'Mùi trà sữa với bánh tráng trộn ở đâu thơm thế nhỉ? 🧋😋',
          });
          break;
        }

        case 'TEST_STUDENT_TALK': {
          store.triggerMisbehavior(10, 'TALKING', 'Tí ăn gì m? 😋');
          store.triggerMisbehavior(11, 'TALKING', 'Bún chả đi! 🍜');
          useClassroomStore.setState({
            activeSpeechBubble: 'Hai bạn bàn 3 trật tự ngay, đừng để cô xuống tận nơi! 🤫',
          });
          break;
        }
      }
    }

    // 3. Nhận thay đổi cấu hình trực tiếp từ Host
    if (data.type === 'CONFIG_UPDATE' && data.config) {
      const config = data.config as Record<string, unknown>;
      if (typeof config.isMicMode === 'boolean') {
        store.setMicMode(config.isMicMode);
      }
      if (typeof config.isLockWhileReading === 'boolean') {
        store.setLockWhileReading(config.isLockWhileReading);
      }
      if (typeof config.heartGoal === 'number') {
        store.setHeartGoal(config.heartGoal);
      }
      if (typeof config.isAvatarVisible === 'boolean') {
        store.setAvatarVisible(config.isAvatarVisible);
      }
    }
  };

  if (channel) {
    channel.onmessage = (e) => {
      handleMessage(e.data);
    };
  }

  // Backup cho cross-window postMessage nếu chạy trong iframe
  const windowListener = (e: MessageEvent) => {
    handleMessage(e.data);
  };
  window.addEventListener('message', windowListener);

  // Báo cho Admin (hoặc parent window) biết Client đã sẵn sàng nhận lệnh
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLIENT_READY' }, '*');
    }
  } catch {
    // Ignore error
  }

  return () => {
    channel?.close();
    window.removeEventListener('message', windowListener);
  };
};

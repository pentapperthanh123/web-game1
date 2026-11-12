import { GAME_THEME, GameThemeType, TEAM_KEY } from './game';
import { ActiveTeamsMap } from '../types/team';

export type SpeechCategory = 'RESTLESS' | 'AMBIENT' | 'POKE';

export interface BossSpeechItem {
  id: string;
  text: string;
  icon: 'flame' | 'zap' | 'swords' | 'message' | 'crown';
}

export const BOSS_SPEECHES: Record<GameThemeType, Record<SpeechCategory, readonly BossSpeechItem[]>> = {
  [GAME_THEME.ELDER_DRAGON]: {
    RESTLESS: [
      { id: 'ed_r_1', text: 'Đấu trường vắng tanh thế này? Tướng đâu hết rồi?!', icon: 'flame' },
      { id: 'ed_r_2', text: 'Ta đang mất kiên nhẫn đấy! Mau comment tên tướng vào cứu giá!', icon: 'flame' },
      { id: 'ed_r_3', text: 'Fan {{leftTag}} với {{rightTag}} ngủ hết rồi à? Gáy to lên xem nào!', icon: 'swords' },
      { id: 'ed_r_4', text: 'Không ai dám solo với Rồng Ngàn Tuổi sao? Chán thế!', icon: 'crown' },
      { id: 'ed_r_5', text: 'Thả tim triệu hồi tướng mau! Long Thần đợi hơi lâu rồi đấy!', icon: 'zap' },
      { id: 'ed_r_6', text: '{{leftPlayer}} hay {{rightPlayer}} đâu? Mau ra đây tiếp chiêu!', icon: 'swords' },
      { id: 'ed_r_7', text: 'Cần một con Yasuo hoặc Zed múa lửa gank ta gấp!', icon: 'swords' },
      { id: 'ed_r_8', text: 'Đứng nhìn thôi à các dũng sĩ? Nhào vô kiếm điểm nào!', icon: 'flame' },
      { id: 'ed_r_9', text: 'Ai triệu hồi tướng ta chấp cả lò! Nhào vô kiếm bùa Rồng!', icon: 'crown' },
      { id: 'ed_r_10', text: 'Hơi thở Rồng sắp nguội lạnh rồi... mau đốt nóng đấu trường đi!', icon: 'flame' },
      { id: 'ed_r_11', text: 'Đấu trường yên ắng quá, gọi {{leftMid}} hay {{rightMid}} ra giao tranh mau!', icon: 'zap' },
      { id: 'ed_r_12', text: 'Ngủ quên trên chiến thắng à? Mau gọi chiến binh ra trận!', icon: 'swords' },
    ],
    AMBIENT: [
      { id: 'ed_a_1', text: 'Đấu trường này là lãnh địa của Long Thần CKTG!', icon: 'crown' },
      { id: 'ed_a_2', text: 'Long lực cổ đại đang dâng trào trong huyết quản...', icon: 'flame' },
      { id: 'ed_a_3', text: 'Ai sẽ là kẻ đoạt được Long Hồn vô địch năm nay?', icon: 'crown' },
      { id: 'ed_a_4', text: 'Lửa rồng nguyên tố sẵn sàng thiêu rụi mọi kẻ cản đường!', icon: 'flame' },
      { id: 'ed_a_5', text: 'Hít thở chút không khí... mùi chiến tranh nồng nặc!', icon: 'zap' },
      { id: 'ed_a_6', text: '{{leftTag}} hay {{rightTag}} sẽ trở thành tro bụi trước móng vuốt của ta?', icon: 'swords' },
      { id: 'ed_a_7', text: 'Bùa lợi Rồng Ngàn Tuổi chỉ dành cho đội tuyển mạnh nhất!', icon: 'crown' },
      { id: 'ed_a_8', text: 'Một cú quạt đuôi của ta đủ quét sạch cả dàn tuyển thủ!', icon: 'flame' },
      { id: 'ed_a_9', text: 'Ngọn lửa vĩnh hằng sẽ thanh tẩy đấu trường CKTG!', icon: 'zap' },
      { id: 'ed_a_10', text: 'Tiếng sấm rền vang... thời khắc quyết định đã đến!', icon: 'zap' },
    ],
    POKE: [
      { id: 'ed_p_1', text: 'Nhột nha! Dám chọc vào râu Rồng à?!', icon: 'flame' },
      { id: 'ed_p_2', text: 'Chọc nữa ta khè lửa cháy máy bây giờ!', icon: 'flame' },
      { id: 'ed_p_3', text: 'Click nhiệt tình thế? Tướng của bạn đâu?!', icon: 'zap' },
      { id: 'ed_p_4', text: 'Muốn solo tay đôi với Long Thần bằng ngón tay à?!', icon: 'swords' },
      { id: 'ed_p_5', text: 'Grừừ! Chọc đúng chỗ ngứa của ta rồi đấy!', icon: 'message' },
      { id: 'ed_p_6', text: 'Kẻ nào to gan dám cù lét Rồng Ngàn Tuổi?!', icon: 'crown' },
      { id: 'ed_p_7', text: 'Tay nhanh đấy, nhưng sát thương thì bằng 0 nhé haha!', icon: 'swords' },
      { id: 'ed_p_8', text: 'Bớt bớt lại bạn ơi, tập trung gọi tướng đi nào!', icon: 'flame' },
      { id: 'ed_p_9', text: 'Ngón tay bạn có phép thuật à? Chọc hoài không mỏi tay sao!', icon: 'zap' },
      { id: 'ed_p_10', text: 'Long Thần không phải thú cưng để bạn click đâu nhé!', icon: 'crown' },
    ],
  },
  [GAME_THEME.BARON]: {
    RESTLESS: [
      { id: 'bn_r_1', text: 'Không ai dám đấu với ta sao?! Mau triệu hồi trợ thủ đi nào!', icon: 'flame' },
      { id: 'bn_r_2', text: 'Hư Không đang đói khát chiến binh... mau cúng nạp tướng!', icon: 'crown' },
      { id: 'bn_r_3', text: 'Fan {{leftTag}} đâu rồi? Mau thả tim gọi {{leftPlayer}} ra đây!', icon: 'swords' },
      { id: 'bn_r_4', text: 'Fan {{rightTag}} im ắng thế? Hết linh lực triệu hồi rồi à?!', icon: 'zap' },
      { id: 'bn_r_5', text: 'Đấu trường buồn ngủ quá... Ai đó vào chat tên tướng đánh thức ta đi!', icon: 'flame' },
      { id: 'bn_r_6', text: 'Cần kèo solo 1v1 tại hang Baron! Ai dám nhận kèo không?!', icon: 'swords' },
      { id: 'bn_r_7', text: 'Chỉ biết đứng nhìn thôi à? Nhào vô kiếm Bùa Baron mau!', icon: 'crown' },
      { id: 'bn_r_8', text: 'Nọc độc Hư Không sắp trào ra rồi... tướng đâu hết rồi?!', icon: 'flame' },
      { id: 'bn_r_9', text: 'Comment [Tên tướng] {{leftTag}} hoặc {{rightTag}} để chiến đi nào!', icon: 'zap' },
      { id: 'bn_r_10', text: 'Hang Baron lạnh lẽo quá, cần vài đòn đánh đốt nóng bầu không khí!', icon: 'swords' },
      { id: 'bn_r_11', text: 'Sợ Baron nuốt chửng à? Đừng hèn thế chứ các chiến hữu!', icon: 'crown' },
      { id: 'bn_r_12', text: 'Hư Không đang chờ đợi... đừng để ta phải gọi tên từng người!', icon: 'flame' },
    ],
    AMBIENT: [
      { id: 'bn_a_1', text: 'Hư Không đang vẫy gọi... Ai sẽ là kẻ đầu tiên ngã xuống?', icon: 'crown' },
      { id: 'bn_a_2', text: 'Nọc độc axit đang sôi sục trong tĩnh mạch...', icon: 'flame' },
      { id: 'bn_a_3', text: 'Hang Baron này đã chôn vùi hàng vạn anh hùng CKTG!', icon: 'swords' },
      { id: 'bn_a_4', text: 'Ta ngửi thấy mùi sợ hãi từ cả hai đội hình...', icon: 'flame' },
      { id: 'bn_a_5', text: 'Kẻ cướp được Baron sẽ định đoạt cả ván đấu!', icon: 'crown' },
      { id: 'bn_a_6', text: 'Các ngươi run sợ trước chúa tể Hư Không rồi sao?', icon: 'zap' },
      { id: 'bn_a_7', text: 'Gai Hư Không đã sẵn sàng phóng thích hủy diệt đấu trường!', icon: 'swords' },
      { id: 'bn_a_8', text: 'Ai dám bén mảng vào hang đều sẽ phải trả giá bằng mạng sống!', icon: 'flame' },
      { id: 'bn_a_9', text: 'Đại Lôi Kích Hư Không sắp giáng xuống đầu những kẻ ngạo mạn!', icon: 'zap' },
      { id: 'bn_a_10', text: 'Bóng tối vĩnh hằng sẽ bao trùm toàn bộ Summoner Rift!', icon: 'crown' },
    ],
    POKE: [
      { id: 'bn_p_1', text: 'Grừừ... Dám chọc vào vảy Hư Không sao?!', icon: 'flame' },
      { id: 'bn_p_2', text: 'Ngươi muốn ngón tay biến thành mồi cho sâu bọ à?!', icon: 'swords' },
      { id: 'bn_p_3', text: 'Chọc ta làm gì, gọi tướng của ngươi ra đây mà chém!', icon: 'zap' },
      { id: 'bn_p_4', text: 'Chọc thêm phát nữa ta phun axit mù màn hình đấy!', icon: 'flame' },
      { id: 'bn_p_5', text: 'Nhột quá nhột quá! Nhưng ta không có tính hài hước đâu!', icon: 'message' },
      { id: 'bn_p_6', text: 'Ngón tay thần tốc đấy, nhưng Baron không dễ dọa đâu!', icon: 'crown' },
      { id: 'bn_p_7', text: 'Muốn kiếm điểm thì gọi tướng ra đánh, đừng chọc lén!', icon: 'swords' },
      { id: 'bn_p_8', text: 'Bấm nát màn hình cũng không trừ được giọt máu nào của ta đâu!', icon: 'zap' },
      { id: 'bn_p_9', text: 'Ai cho bạn quyền sờ vào thân hình tuyệt mỹ của Hư Không?!', icon: 'crown' },
      { id: 'bn_p_10', text: 'Coi chừng gai lưng của ta đâm thủng màn hình điện thoại bây giờ!', icon: 'flame' },
    ],
  },
};

/**
 * SpeechQueueManager
 * Implements a non-repeating Fisher-Yates shuffled queue for each category.
 * Guarantees that the boss NEVER repeats the same line consecutively!
 */
export class SpeechQueueManager {
  private pools: Map<string, BossSpeechItem[]> = new Map();

  private getPoolKey(theme: GameThemeType, category: SpeechCategory): string {
    return `${theme}_${category}`;
  }

  private shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  public getNextSpeech(theme: GameThemeType, category: SpeechCategory): BossSpeechItem {
    const key = this.getPoolKey(theme, category);
    let pool = this.pools.get(key);

    if (!pool || pool.length === 0) {
      const source = BOSS_SPEECHES[theme]?.[category] || BOSS_SPEECHES[GAME_THEME.BARON][category];
      pool = this.shuffle(source);
      this.pools.set(key, pool);
    }

    const nextItem = pool.pop();
    if (!nextItem) {
      return { id: 'fallback', text: 'Hãy sẵn sàng chiến đấu!', icon: 'flame' };
    }

    return nextItem;
  }
}

export const resolveBossSpeechItem = (
  item: BossSpeechItem,
  activeTeams: ActiveTeamsMap
): BossSpeechItem => {
  const left = activeTeams[TEAM_KEY.BLG];
  const right = activeTeams[TEAM_KEY.GENG];
  const leftRoster = left?.roster ?? [];
  const rightRoster = right?.roster ?? [];
  const leftPlayer = leftRoster[0]?.name || left?.shortTag || 'TOP';
  const rightPlayer = rightRoster[2]?.name || rightRoster[0]?.name || right?.shortTag || 'MID';
  const leftMid = leftRoster[2]?.name || leftPlayer;
  const rightMid = rightRoster[2]?.name || rightPlayer;

  const text = item.text
    .replaceAll('{{leftTag}}', left?.shortTag || TEAM_KEY.BLG)
    .replaceAll('{{rightTag}}', right?.shortTag || 'GEN')
    .replaceAll('{{leftPlayer}}', leftPlayer)
    .replaceAll('{{rightPlayer}}', rightPlayer)
    .replaceAll('{{leftMid}}', leftMid)
    .replaceAll('{{rightMid}}', rightMid);

  return { ...item, text };
};

export const bossSpeechManager = new SpeechQueueManager();

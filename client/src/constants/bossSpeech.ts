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
  [GAME_THEME.XU_GIA]: {
    RESTLESS: [
      { id: 'xg_r_1', text: 'Sứ Giả Khe Nứt đói bụng rồi! Mau gọi tướng ra húc trụ nào!', icon: 'flame' },
      { id: 'xg_r_2', text: 'Đấu trường Ván 1 im ắng thế? Thả tim triệu hồi tướng cứu viện đi!', icon: 'zap' },
      { id: 'xg_r_3', text: '{{leftTag}} hay {{rightTag}} dám bước ra solo với đòn húc đầu tiên?!', icon: 'swords' },
      { id: 'xg_r_4', text: 'Ai cho ta tí sát thương đi! Càng đánh giáp ta càng cứng!', icon: 'crown' },
      { id: 'xg_r_5', text: 'Cần một dũng sĩ chém vào mắt sau lưng ta! Ai dám nhận kèo?!', icon: 'swords' },
      { id: 'xg_r_6', text: 'Mau gọi {{leftPlayer}} hay {{rightPlayer}} ra mở màn BO đi nào!', icon: 'zap' },
    ],
    AMBIENT: [
      { id: 'xg_a_1', text: 'Cua khổng lồ Hư Không sẵn sàng húc đổ mọi chướng ngại vật!', icon: 'crown' },
      { id: 'xg_a_2', text: 'Vỏ giáp ngọc bích tỏa sáng rực rỡ trong hang Khe Nứt!', icon: 'flame' },
      { id: 'xg_a_3', text: 'Ai hạ được Sứ Giả sẽ nắm giữ lợi thế dẫn trước ván đấu!', icon: 'swords' },
      { id: 'xg_a_4', text: 'Bước chân dũng mãnh rung chuyển cả Summoner Rift!', icon: 'zap' },
      { id: 'xg_a_5', text: 'Đòn húc cuồng nộ sẽ san bằng tiền tuyến của kẻ địch!', icon: 'crown' },
    ],
    POKE: [
      { id: 'xg_p_1', text: 'Ái chà! Dám chọc vào mai Sứ Giả à?!', icon: 'flame' },
      { id: 'xg_p_2', text: 'Đừng chọc mắt sau lưng ta, nhột lắm haha!', icon: 'message' },
      { id: 'xg_p_3', text: 'Chọc tay không xi nhê đâu, gọi tướng ra gõ mai ta xem nào!', icon: 'swords' },
      { id: 'xg_p_4', text: 'Chọc nữa ta húc lật màn hình bây giờ đấy!', icon: 'crown' },
      { id: 'xg_p_5', text: 'Tay nhanh thế? Mau dùng tốc độ đó triệu hồi tướng đi!', icon: 'zap' },
    ],
  },
  [GAME_THEME.RONG_NUI]: {
    RESTLESS: [
      { id: 'rn_r_1', text: 'Dung nham đang sôi sục dưới chân! Tướng hai đội đâu hết rồi?!', icon: 'flame' },
      { id: 'rn_r_2', text: 'Rồng Núi Nham Thạch cần đối thủ xứng tầm! Mau gọi tướng vào!', icon: 'crown' },
      { id: 'rn_r_3', text: '{{leftTag}} với {{rightTag}} run rẩy trước địa chấn rồi à?!', icon: 'swords' },
      { id: 'rn_r_4', text: 'Khói lửa bốc lên ngùn ngụt... mau gáy tên tướng đi các bạn!', icon: 'zap' },
      { id: 'rn_r_5', text: 'Thả tim tăng nhiệt độ trận đấu nào các dũng sĩ!', icon: 'flame' },
      { id: 'rn_r_6', text: '{{leftPlayer}} hay {{rightPlayer}} dám vượt qua nham thạch so tài?!', icon: 'swords' },
    ],
    AMBIENT: [
      { id: 'rn_a_1', text: 'Địa chấn rền vang! Lửa nham thạch thiêu rụi kẻ yếu đuối!', icon: 'flame' },
      { id: 'rn_a_2', text: 'Giáp đá nghìn năm bất khả xâm phạm của Rồng Núi!', icon: 'crown' },
      { id: 'rn_a_3', text: 'Hang Rồng Núi nóng bỏng đang chờ đợi chủ nhân mới!', icon: 'swords' },
      { id: 'rn_a_4', text: 'Một cú đập đuôi đủ khiến đất trời rung chuyển!', icon: 'zap' },
      { id: 'rn_a_5', text: 'Long hồn địa chấn sẽ bảo hộ cho đội tuyển mạnh nhất!', icon: 'crown' },
    ],
    POKE: [
      { id: 'rn_p_1', text: 'Chọc vào vảy đá nham thạch coi chừng bỏng tay nhé!', icon: 'flame' },
      { id: 'rn_p_2', text: 'Grừ! Da ta dày gấp mười lần vỏ xe tăng đấy!', icon: 'crown' },
      { id: 'rn_p_3', text: 'Chọc ta làm gì, gọi chiến binh ra ném đá ta xem nào!', icon: 'swords' },
      { id: 'rn_p_4', text: 'Cù lét móng vuốt nham thạch à? Gan to đấy!', icon: 'zap' },
      { id: 'rn_p_5', text: 'Nóng máy chưa? Chọc nhiệt tình lên nào dũng sĩ!', icon: 'message' },
    ],
  },
  [GAME_THEME.RONG_GIA]: {
    RESTLESS: [
      { id: 'rg_r_1', text: 'Sấm sét đang xé toạc bầu trời! Ai dám bước vào tâm bão?!', icon: 'zap' },
      { id: 'rg_r_2', text: 'Rồng Già Bão Tố tích điện xong rồi! Mau triệu hồi tướng ra nghênh chiến!', icon: 'crown' },
      { id: 'rg_r_3', text: 'Fan {{leftTag}} hay {{rightTag}} dám lãnh trọn tia sét thiên hà?!', icon: 'swords' },
      { id: 'rg_r_4', text: 'Đấu trường Ván 3 căng thẳng thế này mà các bạn đứng im à?!', icon: 'flame' },
      { id: 'rg_r_5', text: 'Thả tim tăng điện áp nào! Mau gọi {{leftMid}} hoặc {{rightMid}} ra múa!', icon: 'zap' },
      { id: 'rg_r_6', text: 'Cuồng phong đang gào thét... ai sẽ làm chủ ván đấu bản lề?!', icon: 'crown' },
    ],
    AMBIENT: [
      { id: 'rg_a_1', text: 'Tia sét tím xé toạc màn đêm Summoner Rift!', icon: 'zap' },
      { id: 'rg_a_2', text: 'Bão tố thiên hà sẵn sàng quét sạch mọi ảo tưởng chiến thắng!', icon: 'flame' },
      { id: 'rg_a_3', text: 'Long Thần cổ đại ngự trị đỉnh cao sấm sét!', icon: 'crown' },
      { id: 'rg_a_4', text: 'Ai chiếm được Long Hồn Bão Tố sẽ nắm chắc vé chung kết!', icon: 'swords' },
      { id: 'rg_a_5', text: 'Sấm chớp rền vang báo hiệu thời khắc sinh tử!', icon: 'zap' },
    ],
    POKE: [
      { id: 'rg_p_1', text: 'Tê tay chưa?! Điện áp 500kV của Rồng Già đấy!', icon: 'zap' },
      { id: 'rg_p_2', text: 'Chọc vào móng vuốt sấm sét là giật đùng đùng bây giờ!', icon: 'flame' },
      { id: 'rg_p_3', text: 'Tay nhanh như chớp đấy, nhưng chưa đủ đô đâu!', icon: 'swords' },
      { id: 'rg_p_4', text: 'Điện giật sáng màn hình điện thoại bây giờ, bớt chọc lại!', icon: 'crown' },
      { id: 'rg_p_5', text: 'Haha! Sấm sét làm bạn ngứa tay muốn triệu hồi tướng đúng không?!', icon: 'message' },
    ],
  },
  [GAME_THEME.VOID_TITAN]: {
    RESTLESS: [
      { id: 'vt_r_1', text: 'CÕI HƯ VÔ VĨNH HẰNG ĐÃ MỞ! Mau hiến tế chiến binh của các ngươi!', icon: 'crown' },
      { id: 'vt_r_2', text: 'Ván 5 định mệnh! Ai sẽ sống sót trước Thần Hư Vô Nguyên Thủy?!', icon: 'flame' },
      { id: 'vt_r_3', text: 'Tất cả fan {{leftTag}} và {{rightTag}} mau dồn toàn lực tổng công kích!', icon: 'swords' },
      { id: 'vt_r_4', text: 'Thời không sụp đổ... Không còn đường lui nữa đâu!', icon: 'zap' },
      { id: 'vt_r_5', text: 'Thả tim và chat tên tướng dốc cạn sức lực cho ván đấu quyết định!', icon: 'crown' },
      { id: 'vt_r_6', text: '{{leftPlayer}} và {{rightPlayer}} đâu? Mang tất cả những gì các ngươi có ra đây!', icon: 'swords' },
    ],
    AMBIENT: [
      { id: 'vt_a_1', text: 'Hư Vô nguyên thủy nuốt chửng vạn vật trong vũ trụ!', icon: 'crown' },
      { id: 'vt_a_2', text: 'Ta là khởi đầu và cũng là kết thúc của trận chung kết này!', icon: 'flame' },
      { id: 'vt_a_3', text: 'Bóng tối vĩnh hằng nghiền nát mọi hy vọng nâng cúp!', icon: 'zap' },
      { id: 'vt_a_4', text: 'Sức mạnh Hư Vô vượt qua mọi giới hạn phàm trần!', icon: 'swords' },
      { id: 'vt_a_5', text: 'Chỉ có nhà vô địch đích thực mới có thể tiêu diệt được Thần Hư Vô!', icon: 'crown' },
    ],
    POKE: [
      { id: 'vt_p_1', text: 'Ngươi dám chạm vào Thần Hư Vô sao?! Linh hồn ngươi sắp tan biến!', icon: 'crown' },
      { id: 'vt_p_2', text: 'Chọc vào hố đen vũ trụ à?! Coi chừng bị hút mất máy!', icon: 'zap' },
      { id: 'vt_p_3', text: 'Sức mạnh ngón tay trần tục không thể làm xước chân thân Hư Vô!', icon: 'flame' },
      { id: 'vt_p_4', text: 'Dũng cảm lắm sâu bọ! Nhưng hãy dồn sức vào tướng của ngươi!', icon: 'swords' },
      { id: 'vt_p_5', text: 'Bấm nát màn hình đi! Trận chiến cuối cùng không có chỗ cho sự do dự!', icon: 'crown' },
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

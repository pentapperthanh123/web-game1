# 🎮 LoL CKTG TikTok Live Game

Game tương tác trên **TikTok Live** cho sự kiện Chung Kết Thế Giới (CKTG) Liên Minh Huyền Thoại. Người xem chat, thả tim, follow, share và tặng quà để **triệu hồi tướng** và **cùng hạ boss** cho đội mình ủng hộ. Hai đội đối đầu trong một loạt trận BO1 / BO3 / BO5, đội gây nhiều sát thương hơn thắng ván.

Giao diện là một trang web dọc **9:16** (xem tốt ở khoảng 480×860, OBS dùng 720×1280), đưa vào OBS bằng Browser Source. Toàn bộ hình ảnh là mô hình tương tác tự dựng, **không phát video hay hình ảnh trận đấu gốc**, nên tránh được rủi ro bản quyền phát sóng.

> Số liệu trong tài liệu này lấy từ mã nguồn (chủ yếu [client/src/constants/game.ts](client/src/constants/game.ts)). Mọi thông số cân bằng đều chỉnh được ở đó hoặc trong trang admin.

---

## 1. Người xem chơi như thế nào

### Chat: triệu hồi tướng
| Gõ trong chat | Kết quả |
|---|---|
| Tên tướng (ví dụ `Ahri`) | Triệu hồi tướng đó. Tướng "tủ" của một đội sẽ tự vào đúng đội đó. |
| Tên tướng kèm tên đội (ví dụ `Ahri T1`, `Yone GEN`) | Triệu hồi tướng cho đội chỉ định. |
| Chỉ tên đội (`T1`, `GEN`) | Vào đội đó và nhận một tướng ngẫu nhiên. |
| `RANDOM` / `NGAU NHIEN` | Tướng ngẫu nhiên. |

- Chưa chọn đội: game xếp vào **đội đang có điểm thấp hơn** để hai bên cân nhau.
- Đã vào đội thì **khóa đội** một thời gian (admin bật/tắt được).
- Mỗi người chỉ có **1 tướng sống** trên sàn. Chat tiếp khi tướng còn sống sẽ **tiếp sức**: hồi 50 máu cho tướng và gây thêm 90 sát thương lên boss.
- Chống spam: giới hạn tần suất theo từng người, bộ lọc từ khóa, danh sách từ bị chặn và bí danh tướng chỉnh được trong admin.

### Thả tim, follow, share
| Hành động | Tác dụng |
|---|---|
| **Thả tim** | Mỗi tim gây **5 sát thương** lên boss. Bấm dồn dập tăng tốc độ tích Nộ (tối đa ×3) và tốc độ đánh (tối đa ×1.75) của tướng. Mỗi **200 tim** cả đội được **hồi 100 máu** cho toàn bộ tướng. |
| **Follow** (1 lần / người) | Triệu hồi một tướng và +10 Nộ. |
| **Share** | 500 sát thương lên boss và hồi 50 máu. |

### Tặng quà
Sát thương gốc theo xu (1 xu ≈ 120 sát thương). Một lượt quà **gỡ tối đa 20% máu tối đa của boss** để quà lớn quyết định ván đấu nhưng không xóa boss trong một giây. Phần vượt vẫn tính đủ cho điểm đội và bảng xếp hạng của người tặng.

| Cấp quà | Từ | Hiệu ứng |
|---|---|---|
| Nhỏ | 0 xu | Thiên thạch nhỏ, sát thương |
| Vừa | 10 xu | 5 thiên thạch, chớp sáng, rung nhẹ, banner |
| Lớn | 99 xu | 12 thiên thạch, rung mạnh, banner lớn, **làm boss choáng 2,5 giây** |
| Cực lớn | 1000 xu | 24 thiên thạch, rung rất mạnh, thẻ vinh danh lớn, làm boss choáng |

- Quà vừa trở lên (hoặc cứ vài lượt trong chuỗi quà) **triệu hồi thêm một tướng tinh nhuệ** mang tên người tặng.
- **Chuỗi quà / combo** của đội: COMBO (2–9), GREAT (10–24), SUPER (25–49), HYPER (50+), âm thanh lên tông theo cấp.
- Admin đặt luật riêng cho từng loại quà: hệ số sát thương (0–5×) và một hiệu ứng như triệu hồi tướng, hồi máu đội, làm choáng boss, đầy Nộ tuyển thủ, cuồng nộ chiến đấu, khiên bảo hộ, hoặc ép quà đó cho một đội.

### Nhiệm vụ cộng đồng (mỗi đội, mỗi ván)
| Nhiệm vụ | Mốc | Phần thưởng |
|---|---|---|
| Tim | 300 / 1.000 / 3.000 | Tuyển thủ cả đội đầy Nộ |
| Triệu hồi | 20 / 60 / 150 | +25% sát thương của đội trong 15 giây |
| Xu quà | 500 / 2.000 / 8.000 | Thiên thạch giáng xuống boss |

---

## 2. Một trận đấu diễn ra thế nào

### Cấu trúc loạt trận
- **BO1 / BO3 / BO5** (mặc định BO5, thắng 3 ván). Mỗi ván có **một boss khác nhau** theo loạt trận (xem mục 3).
- Mỗi đội có **5 tuyển thủ** tự đánh và tích Nộ (Bạo Nộ gây sát thương ×3,5). Người xem lo phần dứt điểm và tiếp viện.
- Có sẵn **10 đội** để chọn (BLG, GEN, T1, HLE, TES, AL, DK, GAM, G2, FLY) và danh sách cặp đấu chờ.

### Một ván
1. **Màn mở đầu ván**: ván 1 giới thiệu đầy đủ (đối đầu, luật chơi, quà tặng, khoảng 42 giây), từ ván 2 chỉ còn thẻ đối đầu khoảng 12 giây, kết thúc bằng đếm ngược 5 giây. Host bấm **Bắt đầu** (hoặc Space) để mở ván.
2. **Giao tranh** theo luật dưới đây.
3. **Boss gục** hoặc hết giờ: đội gây **nhiều sát thương hơn thắng ván** (hòa thì đội trái thắng).
4. **Màn chiến thắng** (bục vinh danh, người kết liễu, tỉ số loạt trận), tự chuyển sang ván sau sau **10 giây** (có thể tạm dừng hoặc bấm chuyển ngay).

### Đồng hồ hiệp và hiệp phụ
- Mỗi ván có **đồng hồ 4 phút** (admin chọn: tắt, 3, 4, 5 hoặc 7 phút). Đồng hồ chỉ chạy khi đang đánh thật và chỉ hiện trên màn hình ở **60 giây cuối**.
- Hết giờ mà boss còn sống: **hiệp phụ 45 giây**. Boss nhận thêm **10% sát thương mỗi 5 giây** (tối đa ×1.9) cho cả hai đội, và tuyển thủ được phép hạ boss xuống mức thấp nhất. Màn hình báo "Ai kết liễu?".
- Hết hiệp phụ boss vẫn sống: ván kết thúc, đội dẫn sát thương thắng.
- Phòng vắng người không còn bị kẹt: tuyển thủ giữ boss ở khoảng 15% máu, hiệp phụ sẽ quyết định.

### Ván quyết định: Silver Scrapes
Khi loạt trận hòa ở ván cuối, ván mở đầu bằng **trận kéo co 60 giây** (có thể kéo dài thêm 30 giây). Chat, tim, follow, share và quà đều đẩy thanh kéo co. Đội thắng nhận **+20% sát thương trong 90 giây**.

### Danh hiệu vô địch
Mỗi lần thắng cả loạt trận, đội được cộng một **danh hiệu theo cặp đấu** ("3 🏆 3"). Danh hiệu lưu trong trình duyệt và admin có thể đặt lại từ xa.

### Hết loạt trận thì sao?
- Còn **cặp đấu chờ** trong hàng đợi: chuyển sang cặp đầu tiên (cặp đó được lấy khỏi hàng đợi).
- Hàng đợi **trống**: chạy lại đúng cặp cũ, tỉ số về 0-0.

Dù theo cách nào, ván 1 của loạt mới cũng chờ host bấm **Bắt đầu**.

---

## 3. Boss và kỹ năng

### Sáu boss
| Boss | Độ khó (máu / sát thương kỹ năng) | Xuất hiện |
|---|---|---|
| Sứ Giả Khe Nứt | ×0,5 / ×0,75 | BO3 ván 1, BO5 ván 1 |
| Rồng Núi Nham Thạch | ×0,7 / ×0,9 | BO5 ván 2 |
| Rồng Già Bão Tố | ×0,85 / ×1,0 | BO5 ván 3 |
| Rồng Ngàn Tuổi | ×1,0 / ×1,0 | BO3 ván 2 |
| Baron Nashor | ×1,0 / ×1,0 | BO1, BO3 ván 3, BO5 ván 4 |
| Thần Hư Vô Nguyên Thủy | ×1,3 / ×1,2 | BO5 ván 5 |

Boss có 100.000 máu gốc nhân theo độ khó ở trên. Mỗi boss có nghệ thuật, âm thanh và bộ kỹ năng riêng.

### Cơ chế chiến đấu
- **3 giai đoạn:** còn 65% máu vào giai đoạn 2 (mở tuyệt kỹ), còn 35% vào giai đoạn 3 (sát thương ×1,2, ra chiêu nhanh hơn, tuyệt kỹ thường xuyên hơn).
- **Cuồng nộ** (dưới khoảng 30–40% máu tùy boss): đổi sang hình dạng "nộ", tấn công nhanh hơn và **sát thương ×1,5**.
- **Khiên năng lượng** ở 50% và 22% máu: 6.500 máu khiên trong 12 giây. Phá kịp thì boss nhận thêm 4.000 sát thương; không phá kịp boss **tự hồi 8.000 máu**.
- **Điểm yếu** mở mỗi 14 giây (sừng, ngực hoặc móng) trong 6,5 giây: đòn của tướng đánh trúng nhận **×2 sát thương**.
- **Tung kỹ năng** khoảng mỗi 10 giây (admin chỉnh được) khi có tướng trên sân. Ngoài ra boss còn **gầm đánh trả định kỳ** (khoảng 7,5 giây, nhanh hơn khi nổi điên) kèm rung màn hình và sóng xung kích nhẹ màu theo boss.

### Kỹ năng của boss
Mỗi boss có **4 kỹ năng**: ba chiêu thường (nhẹ, vừa, nặng) và một **tuyệt kỹ**. Sát thương gốc thống nhất cho mọi boss (25 / 45 / 70 / 100); độ khó của boss là thứ duy nhất làm boss này mạnh hơn boss kia. Tướng có 100 máu và hệ số sát thương mặc định của admin là 0,45.

| | Mất bao nhiêu máu (thường → giai đoạn 3 + nổi điên) | Số tướng trúng |
|---|---|---|
| Chiêu nhẹ | khoảng 10–15% → 20–25% | tối thiểu theo chiêu, tăng theo đám đông (5% vùng bị đánh) |
| Chiêu vừa | khoảng 15–25% → 30–40% | 12% vùng bị đánh |
| Chiêu nặng | khoảng 25–35% → 45–60% | 25% vùng bị đánh |
| Tuyệt kỹ | khoảng 35–50% → 70–90% | **toàn bộ tướng trên sân** |

- **Sát thương đúng vùng hiệu ứng:** chiêu một phía chỉ trúng cánh bị tấn công, chiêu "quanh boss" trúng các tướng gần boss nhất (tính cả chiều sâu), tuyệt kỹ trúng cả sân. Sát thương được trừ **đúng lúc hiệu ứng chạm tới tướng**, không phải lúc boss vừa ra chiêu. Tướng mới triệu hồi được miễn sát thương 1 giây.
- **Tia, đạn, sét, gai đất, thiên thạch** đều rơi đúng vào các tướng bị trúng; Tia Phân Rã quét qua đúng nhóm tướng tiền tuyến.
- **Hiệu ứng trạng thái:** thiêu đốt và độc (thêm 40% / 60% / 80% sát thương của đòn, rải đều theo thời gian), choáng (tướng không đánh được), suy yếu (−50% sát thương), và hút máu (boss hồi một phần sát thương gây ra, **tối đa 3% máu boss mỗi lần ra chiêu**).
- **Tuyệt kỹ nhiều lớp** gây sát thương theo từng đợt, khớp từng lớp hình ảnh (đòn chính 40%, các lớp sau chia đều phần còn lại).
- Bảng **"cân bằng chiêu thức"** trong admin cho xem sát thương thật, thiêu đốt/độc và số tướng trúng với 10, 50, 200 tướng.

---

## 4. Bảng xếp hạng và vinh danh

- **TOP PHIÊN LIVE** (góc trái màn hình): cộng dồn sát thương của từng người **suốt buổi live** (tướng, tim, share và quà), không reset giữa các ván, giữ lại khi tải lại OBS. Tự coi là phiên mới sau khoảng 4 giờ không có sát thương, hoặc admin bấm **Bắt đầu phiên mới**. Bot "Tiên Phong" và "Hội Quân" không tham gia xếp hạng.
- **Hệ thống bậc theo phiên**, hiện cạnh tên khi chat, trên nhãn tên tướng và trên banner:

  | Bậc | Điều kiện |
  |---|---|
  | **Thách Đấu** | Top 1 phiên |
  | **Đại Cao Thủ** | Top 2–3 |
  | **Cao Thủ** | Top 4–10 |
  | **Kim Cương** | ≥ 300.000 sát thương |
  | **Lục Bảo** | ≥ 100.000 |
  | **Bạch Kim** | ≥ 30.000 |
  | **Vàng** | ≥ 10.000 |
  | **Bạc** | ≥ 2.000 |

  Ba bậc đỉnh cần thêm tối thiểu 10.000 sát thương. Có thông báo **soán ngôi Thách Đấu** và **thăng hạng** (từ Kim Cương trở lên). Huy hiệu là hình tự vẽ, không dùng tài sản của Riot.
- **Người kết liễu boss** được vinh danh; nếu là người tặng quà sẽ có màn trình diễn riêng.
- **Bục vinh danh cuối ván**: danh hiệu KING / WAR GOD / VALIANT, kèm thẻ bảng xếp hạng tuần.
- **Hồ sơ người chơi** lưu ở server (tổng sát thương, số lần MVP, số ván tham gia) với bảng xếp hạng **tuần, tháng và mọi thời đại**.
- **Kill feed**, bảng chat TikTok, số sát thương nổi trên tướng và trên boss.

---

## 5. Âm thanh, giọng đọc và hiệu ứng

- **Bình luận viên AI** nói tiếng Việt: giới thiệu đối đầu, luật chơi, bình luận thế trận (đổi người dẫn đầu, boss cuồng nộ, tướng gục...), cảm ơn người tặng quà và gọi người xem vào chơi khi sân vắng. Giọng được tạo ở server (Edge TTS, Azure hoặc dự phòng Google), có bộ đệm trên đĩa nên các câu lặp lại phát ngay.
- **Màn "KHAI CHIẾN"** có bộ âm thanh riêng: gió lao vào của hai thẻ, cú đập khi VS xuất hiện, kèn trận và tiếng khán giả.
- Âm thanh và hiệu ứng được thiết kế cho **đám đông 100–300 tướng**: giới hạn số hiệu ứng hiển thị, gộp số sát thương, không cắt hiệu ứng đang chạy.
- Bảng **hướng dẫn tham gia** tự mở mỗi phút và khi sân vắng; nút kêu gọi "chạm 2 lần thả tim" khi chưa có ai chơi.

---

## 6. Quản trị (Admin Portal, cổng 8001)

| Tab | Chức năng |
|---|---|
| **Xem Tất Cả** | Mọi khu vực trên một trang (mặc định) |
| **Đội & Game Thủ** | Danh mục đội và tuyển thủ (nhập/xuất gói đội), chọn hai đội đang đấu, hàng đợi cặp đấu |
| **Thể Thức & 1v1** | Điều khiển trận kéo co Silver Scrapes |
| **Tương Tác & Quà** | Giả lập chat, thả tim, quà; số tướng xuất hiện mỗi lượt, độ trễ giữa các lượt, tốc độ đánh, **thời lượng ván**, hệ số sát thương tướng, ảnh đại diện người xem; **điều khiển trận**: BO1/BO3/BO5, bắt đầu ván, chuyển ván, đặt lại tỉ số, danh hiệu vô địch, **bắt đầu phiên mới** cho bảng xếp hạng |
| **Cấu Hình Quà** | Luật riêng từng loại quà (hệ số sát thương, hiệu ứng, ép đội), lấy danh mục quà từ TikTok |
| **Boss & Bản Đồ** | Chọn boss, chế độ ra chiêu (theo tỉ lệ / đều / tuần tự), chu kỳ, hệ số sát thương, thử từng chiêu, **bảng cân bằng chiêu thức**, hồi máu cứu tướng, tự động đánh của tuyển thủ |
| **Ẩn/Hiện Section (Overlay)** | Bật/tắt từng thành phần trên overlay |
| **Live Ops & Kiểm Duyệt** | Công tắc vận hành, giới hạn chat, từ bị chặn, bí danh tướng, cảnh báo |
| **Nhật Ký Live** | Nhật ký sự kiện đang diễn ra |

Có thể kết nối phòng live TikTok trực tiếp từ admin; server tự kết nối lại khi mất kết nối và báo trạng thái. Truy cập admin yêu cầu mã token.

---

## 7. Kiến trúc kỹ thuật

```
[TikTok Live] ──> [server: Node + Socket.io + tiktok-live-connector]
                        │  lọc, giới hạn tần suất, lưu hồ sơ, giọng đọc, trạng thái loạt trận
          ┌─────────────┴─────────────┐
          ▼                           ▼
   [client: overlay 9:16]      [admin: bảng điều khiển]
   React 19 + three.js + zustand   (không dùng i18n)
```

| Gói | Thư mục | Cổng | Vai trò |
|---|---|---|---|
| **Overlay** | `client/` | 8000 | Đồ họa game cho OBS: React 19, react-three-fiber / three.js, zustand, Tailwind v4, Howler, Vite |
| **Admin** | `admin/` | 8001 | Bảng điều khiển, nói chuyện với server qua socket |
| **Server** | `server/` | 4000 | Express, Socket.io, `tiktok-live-connector`, lưu dữ liệu dạng tệp JSON trong `server/data/` |

Không dùng Redis hay MongoDB. Hồ sơ người chơi, cấu hình hiển thị, định dạng loạt trận và bộ đệm giọng đọc đều lưu trong thư mục `server/data/`. Overlay lưu danh hiệu vô địch, ảnh chụp trận đang đánh (để tải lại OBS không mất ván, hết hạn sau 30 phút) và bảng xếp hạng phiên trong localStorage.

### Bản đồ mã nguồn (overlay)
- Trạng thái: `client/src/store/` (zustand), các lát cắt trong `store/slices/` (chiến đấu, triệu hồi, boss, loạt trận...).
- Hằng số cân bằng: `client/src/constants/game.ts`, kỹ năng boss: `bossSkills.ts`, `bossSkillEffects.ts`, `bossSkillBalance.ts`.
- 3D: `components/canvas/`. Boss 2D và lớp phủ: `components/arena/`. Giao diện: `components/ui/`.
- Chuỗi hiển thị: `client/src/i18n/messages/{vi,en}.json`. Mọi chuỗi giao diện mới phải có ở cả hai.

### Quy tắc hiệu năng (đám đông 100–300 tướng)
Token tướng nhận dữ liệu qua props (không đăng ký store riêng), mã chạy mỗi khung hình không cấp phát bộ nhớ, giới hạn hiệu ứng trên màn hình phải bỏ hiệu ứng mới chứ không cắt hiệu ứng đang chạy, và chỉ animate bằng `transform` / `opacity`.

---

## 8. Vận hành

```powershell
# Cài đặt
pnpm install

# Chạy cả 3 dịch vụ cùng lúc (hoặc nhấp đúp start.bat trên Windows)
pnpm dev:all

# Chạy riêng từng phần
pnpm dev:client
pnpm dev:admin
pnpm dev:server

# Kiểm tra kiểu và build
npx tsc --noEmit -p .      # chạy trong từng gói client / admin / server
npx vite build             # trong client/
pnpm build:all
```

Dự án chưa có bộ kiểm thử tự động; kiểm tra bằng `tsc`, build và chạy thử bằng chế độ mô phỏng trong admin. Khi thử bố cục, dùng khung khoảng 480×860.

### Đưa lên OBS
1. Thêm **Browser Source** trỏ tới `http://localhost:8000`, kích thước 720×1280 (dọc).
2. Mở trang admin `http://localhost:8001`, nhập token, kết nối phòng live TikTok.
3. Trước buổi live thật: bấm **Bắt đầu phiên mới** để xóa tên giả từ lúc thử, kiểm tra âm lượng, và để host bấm **Bắt đầu** ở màn mở đầu ván.

### Tài liệu thêm
- Kế hoạch và quyết định thiết kế: [docs/plans/](docs/plans/), [docs/specs/](docs/specs/).
- Ví dụ gần nhất: [cân bằng và độ chính xác kỹ năng boss](docs/plans/2026-11-17-boss-skill-accuracy-balance.md).

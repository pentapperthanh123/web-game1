import json
import os
import hashlib
import time
import requests
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE_DIR = os.path.join(REPO_ROOT, "server/data/tts-cache")
DEDICATED_DIR = os.path.join(REPO_ROOT, "server/data/viet-tts-audio")
VIET_TTS_URL = "http://localhost:8298/v1/audio/speech"

TAG_MALE = "VIET_TTS:cdteam:vi"
TAG_FEMALE = "VIET_TTS:quynh:vi"

LINES = [
    # --- 1. ROUND INTRO MATCHUP (cdteam - male) ---
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 1: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Sứ Giả Khe Nứt!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 1: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Baron Nashor!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 2: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Rồng Ngàn Tuổi!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 3: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Rồng Già Bão Tố!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 4: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Rồng Ngàn Tuổi!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 5: Gen.G Esports đại chiến G2 Esports. Mục tiêu tiêu diệt Boss Thần Hư Vô Nguyên Thủy!"),

    # Fallback intros for any match / format (cdteam - male)
    ("male", "Đại chiến bùng nổ! Ván 1 chính thức bắt đầu, toàn lực xung trận!"),
    ("male", "Đại chiến bùng nổ! Ván 2 chính thức bắt đầu, toàn lực xung trận!"),
    ("male", "Đại chiến bùng nổ! Ván 3 chính thức bắt đầu, toàn lực xung trận!"),
    ("male", "Đại chiến bùng nổ! Ván 4 chính thức bắt đầu, toàn lực xung trận!"),
    ("male", "Đại chiến bùng nổ! Ván 5 chính thức bắt đầu, toàn lực xung trận!"),

    # --- 2. RULES & GIFTS (quynh - female & cdteam - male) ---
    ("female", "Luật chơi: Khán giả gõ tên tướng kèm tên đội bạn chọn để triệu hồi tướng vào sân. Bấm tim liên tục vào livestream để tăng tốc độ đánh và nạp Nộ kích hoạt Tuyệt Kỹ. Đội nào dồn nhiều sát thương hơn lên Boss sẽ giành chiến thắng ván đấu!"),
    ("female", "Luật chơi: Hai phe chạy đua sát thương! Khán giả gõ tên tướng kèm tên đội bạn chọn để triệu hồi tướng. Đội gây nhiều sát thương hơn lên Boss sẽ giành chiến thắng!"),
    ("male", "Một xu tương ứng một trăm hai mươi sát thương lên Boss. Hãy xem phần quà tặng bên dưới góc phải màn hình để tiếp sức cho tuyển thủ!"),

    # --- 3. ROUND GO & BATTLE CALLS ---
    ("male", "Toàn quân xung trận! San bằng đấu trường, tiêu diệt quái thú!"),
    ("male", "Hồi còi xuất trận đã điểm! Khí thế ngút trời, quyết chiến tới cùng!"),
    ("male", "Gươm giáo sẵn sàng! Toàn quân xuất kích, đoạt lấy vinh quang!"),
    ("female", "Vũ khí đã sẵn sàng, anh em dồn sát thương ngay từ những giây đầu tiên nào!"),
    ("female", "Trận chiến bắt đầu rồi! Gõ tên tướng ngay để đưa chiến binh vào sân!"),

    # --- 4. TWO-CASTER DIALOGUE & BANTER ---
    # Boss Enrage
    ("male", "Cảnh báo! Boss đã nổi điên! Sát thương và tốc đánh tăng vọt!"),
    ("female", "Nổi điên nghĩa là tốc đánh tăng gấp rưỡi đấy. Thả tim liên tục để hồi máu, đừng để tướng gục ngã!"),
    ("male", "Quá dữ dội! Mọi người dồn toàn lực đấm boss nhanh lên!"),
    ("female", "Càng cuồng nộ thì cướp kết liễu càng dễ. Dồn tổng lực sát thương ngay đi, sắp kết thúc rồi!"),
    ("female", "Nói thật thì thấy Bảo còn thịnh nộ hơn cả boss đấy. Bỏ qua Bảo đi mọi người ơi, tập trung đánh boss!"),

    # Phase Two / Ultimate
    ("male", "Boss đã bước vào giai đoạn 2! Chuẩn bị tinh thần đón nhận tuyệt kỹ!"),
    ("female", "Nghiêm túc thế nào? Boss mở tuyệt chiêu, còn anh em ta mở hầu bao… à không, mở bàn phím gõ chat!"),

    # Shield Up & Broken
    ("male", "Khiên năng lượng xuất hiện! Đánh đi, đánh mạnh vào!"),
    ("female", "Phải phá khiên trong mười hai giây, không là boss hồi lại cả tấn máu đấy!"),
    ("male", "Vụn vỡ hoàn toàn! Cái khiên quá mỏng manh!"),
    ("female", "Mỏng manh là vì cả phòng live cùng đấm đấy Bảo ơi. Giữ vững nhịp độ này nhé!"),

    # Low HP & Critical Tension
    ("male", "Boss sắp gục rồi! Chỉ còn chút máu cuối cùng!"),
    ("female", "Gần xong chứ chưa xong hẳn đâu. Đừng ngồi nhìn, gõ ngay tên vị tướng yêu thích đi!"),
    ("male", "Ai sẽ là người tung đòn kết liễu đây?!"),
    ("female", "Khoảnh khắc đắt giá nhất của ván đấu. Muốn tên mình sáng rực trên bảng vàng thì ra tay ngay đi!"),

    # Banter & Guide CTA
    ("male", "Anh em gõ tên tướng kèm tên đội như Azir GEN hoặc Yasuo G2 để triệu hồi tướng nhé!"),
    ("female", "Thả tim liên tục vào màn hình để tăng tốc đánh và nạp Nộ kích hoạt Tuyệt Kỹ nha mọi người!"),
    ("male", "Một xu bằng một trăm hai mươi sát thương lên Boss, hãy tặng quà để bứt phá bảng xếp hạng!"),
    ("female", "Trận đấu quá mãn nhãn! Không khí phòng live đang nóng hơn bao giờ hết!"),

    # Round Win
    ("male", "Chúc mừng đội chiến thắng ván đấu này với lượng sát thương vượt trội!"),
    ("female", "Một ván đấu đỉnh cao! Khán giả hai bên đã thi đấu cực kỳ nhiệt huyết!"),
    ("male", "Đúng thế, ván tiếp theo sẽ còn nóng hơn gấp bội!"),

    # --- 5. BOSS SKILLS ---
    ("male", "Baron Nashor tung Đại Địa Chấn Hư Không!"),
    ("male", "Phun Gai Axít! Cẩn thận sát thương diện rộng!"),
    ("male", "Quét Đuôi Hư Không! Toàn đội lùi lại!"),
    ("male", "Tiếng Gầm Hư Không! Cảnh giác choáng diện rộng!"),
    ("male", "Hơi Thở Thiêu Rụi! Né vùng lửa ngay!"),
    ("male", "Cơn Thịnh Nộ Long Tộc! Sát thương bùng nổ!"),
    ("male", "Sấm Sét Rền Vang! Cẩn thận bão tố!"),
    ("male", "Cú Húc Sứ Giả! Cẩn thận anh em!"),
    ("male", "Né kịp không? Sứ Giả đang lao tới!"),
]

def get_hashes(text, role):
    tag = TAG_FEMALE if role == "female" else TAG_MALE
    exact_key = f"vi|{role}||||{text}"
    male_key = f"vi|male||||{text}"
    female_key = f"vi|female||||{text}"
    neutral_key = f"vi|||||{text}"

    keys = [exact_key, neutral_key]
    if role == "female":
        keys.append(female_key)
    else:
        keys.append(male_key)

    hashes = []
    for k in keys:
        h = hashlib.sha1(f"{tag}|{k}".encode("utf-8")).hexdigest() + ".mp3"
        hashes.append(h)
    return list(set(hashes))

def synthesize(text, voice):
    payload = {
        "model": "tts-1",
        "input": text,
        "voice": voice,
        "response_format": "mp3"
    }
    for attempt in range(3):
        try:
            res = requests.post(VIET_TTS_URL, json=payload, timeout=60)
            if res.status_code == 200 and len(res.content) > 200:
                return res.content
        except Exception as e:
            time.sleep(2.0 + attempt)
    return None

def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(DEDICATED_DIR, exist_ok=True)

    print(f"============================================================")
    print(f"[PureVietTTS] Synthesizing {len(LINES)} canonical lines:")
    print(f"  - Male Voice:   cdteam")
    print(f"  - Female Voice: quynh")
    print(f"  - Viet-TTS URL: {VIET_TTS_URL}")
    print(f"============================================================")

    success = 0
    for idx, (role, text) in enumerate(LINES):
        voice = "quynh" if role == "female" else "cdteam"
        hashes = get_hashes(text, role)

        # Check if primary hash already exists
        primary_path = os.path.join(CACHE_DIR, hashes[0])
        if os.path.exists(primary_path) and os.path.getsize(primary_path) > 1000:
            print(f"[{idx+1}/{len(LINES)}] ALREADY CACHED ({voice}): {text[:45]}...")
            success += 1
            continue

        print(f"[{idx+1}/{len(LINES)}] Synthesizing ({voice}): {text[:45]}...", end=" ", flush=True)
        audio = synthesize(text, voice)
        if audio:
            # Write to all alias hashes
            for h in hashes:
                p = os.path.join(CACHE_DIR, h)
                with open(p, "wb") as fp:
                    fp.write(audio)
            success += 1
            print(f"-> OK! ({len(audio)} bytes)")
        else:
            print(f"-> FAILED!")

        time.sleep(0.5)

    print(f"\n[PureVietTTS] Completed: {success}/{len(LINES)} lines synthesized and cached.")

if __name__ == "__main__":
    main()

import json
import os
import hashlib
import time
import requests
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE_DIR = os.path.join(REPO_ROOT, "server/data/tts-cache")
VIET_TTS_URL = "http://localhost:8298/v1/audio/speech"

TAG_MALE = "VIET_TTS:cdteam:vi"
TAG_FEMALE = "VIET_TTS:quynh:vi"

LINES = [
    # --- 1. ROUND INTROS (cdteam - male) ---
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 1: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Sứ Giả Khe Nứt!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 2: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Baron Nashor!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 2: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Rồng Núi Nham Thạch!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 3: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Rồng Già Bão Tố!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 3: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Baron Nashor!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 4: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Rồng Ngàn Tuổi!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 4: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Rồng Già Bão Tố!"),
    ("male", "Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván 5: Đội Xanh đại chiến Đội Đỏ. Mục tiêu tiêu diệt Boss Thần Hư Vô Nguyên Thủy!"),

    # --- 2. BANTER WITH ĐỘI XANH / ĐỘI ĐỎ ---
    # Lead banter
    ("male", "Đội Xanh đang dẫn đầu cuộc đua sát thương! Fan của Đội Đỏ đang ở nơi đâu rồi?"),
    ("female", "Dẫn trước lúc này chưa nói lên điều gì đâu. Đội Đỏ chỉ cần một đợt triệu hồi là lấy lại thế trận ngay."),
    ("male", "Đội Đỏ đang dẫn đầu cuộc đua sát thương! Fan của Đội Xanh đang ở nơi đâu rồi?"),
    ("female", "Dẫn trước lúc này chưa nói lên điều gì đâu. Đội Xanh chỉ cần một đợt triệu hồi là lấy lại thế trận ngay."),

    # Trail banter
    ("male", "Fan của Đội Đỏ đâu hết rồi? Định để Đội Xanh hạ gục Boss dễ dàng thế sao?"),
    ("female", "Bảo lại khích tướng rồi. Nhưng mà fan Đội Đỏ ơi, hãy vùng lên nào!"),
    ("male", "Fan của Đội Xanh đâu hết rồi? Định để Đội Đỏ hạ gục Boss dễ dàng thế sao?"),
    ("female", "Bảo lại khích tướng rồi. Nhưng mà fan Đội Xanh ơi, hãy vùng lên nào!"),

    ("male", "Đội Xanh đang làm chủ hoàn toàn sàn đấu! Chẳng lẽ Đội Đỏ đã buông xuôi?"),
    ("female", "Không có chuyện buông xuôi đâu. Tôi nghĩ fan Đội Đỏ chỉ đang tích chiêu thôi. Chứng minh cho tôi thấy đi nào!"),
    ("male", "Đội Đỏ đang làm chủ hoàn toàn sàn đấu! Chẳng lẽ Đội Xanh đã buông xuôi?"),
    ("female", "Không có chuyện buông xuôi đâu. Tôi nghĩ fan Đội Xanh chỉ đang tích chiêu thôi. Chứng minh cho tôi thấy đi nào!"),

    # Comeback
    ("male", "LỘI NGƯỢC DÒNG NGOẠN MỤC! Đội Xanh đã vươn lên dẫn trước!"),
    ("female", "Không thể tin được! Đội Đỏ vừa mới nắm giữ thế trận mà giờ đã bị vượt qua rồi!"),
    ("male", "LỘI NGƯỢC DÒNG NGOẠN MỤC! Đội Đỏ đã vươn lên dẫn trước!"),
    ("female", "Không thể tin được! Đội Xanh vừa mới nắm giữ thế trận mà giờ đã bị vượt qua rồi!"),

    # Round Wins
    ("male", "Đội Xanh CHIẾN THẮNG VÁN 1!"),
    ("male", "Đội Xanh CHIẾN THẮNG VÁN 2!"),
    ("male", "Đội Xanh CHIẾN THẮNG VÁN 3!"),
    ("male", "Đội Xanh CHIẾN THẮNG VÁN 4!"),
    ("male", "Đội Xanh CHIẾN THẮNG VÁN 5!"),
    ("male", "Đội Đỏ CHIẾN THẮNG VÁN 1!"),
    ("male", "Đội Đỏ CHIẾN THẮNG VÁN 2!"),
    ("male", "Đội Đỏ CHIẾN THẮNG VÁN 3!"),
    ("male", "Đội Đỏ CHIẾN THẮNG VÁN 4!"),
    ("male", "Đội Đỏ CHIẾN THẮNG VÁN 5!"),
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
    print(f"[EsportsTTS] Synthesizing {len(LINES)} canonical lines...")
    success = 0
    for idx, (role, text) in enumerate(LINES):
        voice = "quynh" if role == "female" else "cdteam"
        hashes = get_hashes(text, role)

        # Check if already cached
        primary_path = os.path.join(CACHE_DIR, hashes[0])
        if os.path.exists(primary_path) and os.path.getsize(primary_path) > 1000:
            print(f"[{idx+1}/{len(LINES)}] ALREADY CACHED ({voice}): {text[:45]}...")
            success += 1
            continue

        print(f"[{idx+1}/{len(LINES)}] Synthesizing ({voice}): {text[:45]}...", end=" ", flush=True)
        audio = synthesize(text, voice)
        if audio:
            for h in hashes:
                p = os.path.join(CACHE_DIR, h)
                with open(p, "wb") as fp:
                    fp.write(audio)
            success += 1
            print(f"-> OK! ({len(audio)} bytes)")
        else:
            print(f"-> FAILED!")
        time.sleep(0.3)

    print(f"\n[EsportsTTS] Done: {success}/{len(LINES)} lines ready.")

if __name__ == "__main__":
    main()

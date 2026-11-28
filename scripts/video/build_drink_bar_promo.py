import os
import shutil
import subprocess
import urllib.parse
import urllib.request
from PIL import Image, ImageDraw, ImageFont

WIDTH = 720
HEIGHT = 1280
FPS = 30

STAGE_URL = "http://localhost:8070"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
RAW_DIR = r"f:\tiktok\scripts\video\drink_bar_raw"
FRAMES_DIR = r"f:\tiktok\scripts\video\drink_bar_frames"
CLIPS_DIR = r"f:\tiktok\scripts\video\drink_bar_clips"
VOICE_DIR = r"f:\tiktok\scripts\video\drink_bar_voices"

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"

SCENES = [
    {
        "id": "scene1_idle",
        "preset": "idle",
        "duration": 4.2,
        "badge": "🧋 QUẦY PHA CHẾ TƯƠNG TÁC TIKTOK LIVE",
        "title": "MENU 7 MÓN • GÕ CHAT LÀ CÓ LY!",
        "subtitle": "Gõ matcha • tra • tradao • trachanh • cafe • soda • nuocep",
        "accent": (244, 139, 163),
        "tts": "Chào mừng cả nhà đến với Quầy Pha Chế tương tác trực tiếp trên TikTok Live! Chỉ cần gõ tên món trong menu vào khung chat là có ngay một ly nước siêu cưng!",
    },
    {
        "id": "scene2_orders",
        "preset": "orders",
        "duration": 4.8,
        "badge": "🙋 KHÁCH CHIBI XẾP HÀNG KÈM AVATAR",
        "title": "ĐÁNH BỌT MATCHA & LẮC TRÀ SỮA",
        "subtitle": "Khách tự xếp hàng trước quầy • Tùy chỉnh ít đá, ít đường",
        "accent": (127, 184, 107),
        "tts": "Khách comment sẽ hiện nhân vật chibi kèm avatar xếp hàng ngay trước quầy! Chủ quán tự động lấy cốc, đánh bọt matcha và lắc trà đào theo đúng yêu cầu!",
    },
    {
        "id": "scene3_pouring",
        "preset": "pouring",
        "duration": 4.5,
        "badge": "❤️ THẢ TIM TĂNG TỐC PHA SIÊU TỐC",
        "title": "RÓT SỮA OATSIDE & PHỦ KEM MUỐI",
        "subtitle": "Hiệu ứng ASMR rót nước phân tầng & đá viên nổi chân thực",
        "accent": (82, 166, 188),
        "tts": "Cả nhà thả tim càng nhiều, tốc độ pha chế càng nhanh! Từng tầng sữa Oatside, đá viên và kem muối được rót mượt mà kèm âm thanh A S M R cực cuốn!",
    },
    {
        "id": "scene4_dance",
        "preset": "dance",
        "duration": 5.0,
        "badge": "👑 DONATE QUÀ • LÊN VIP & NHẢY TIKTOK",
        "title": "3 ĐIỆU NHẢY HOT: BẮN TIM • QUẨY NHIỆT",
        "subtitle": "Tặng Hoa Hồng nhảy Bắn Tim • Quà lớn lên Top 1 VIP + Quẩy Nhiệt",
        "accent": (247, 201, 91),
        "tts": "Đặc biệt khi tặng hoa hồng hoặc quà tặng, bạn sẽ được ưu tiên lên hàng V I P và xem chủ quán cùng mèo thần tài nhảy TikTok Quẩy Nhiệt cực cháy!",
    },
    {
        "id": "scene5_handoff",
        "preset": "handoff",
        "duration": 4.5,
        "badge": "✨ ĐÓNG NẮP CẦU & TRAO TAY MANG VỀ",
        "title": "VÀO PHÒNG LIVE GỌI MÓN NGAY!",
        "subtitle": "Follow kênh & vào phiên Live để chốt đơn ly nước của riêng bạn!",
        "accent": (244, 158, 96),
        "tts": "Đóng nắp cầu, cắm ống hút và trao tận tay khách mang về! Hãy vào phiên Live và gõ tên món yêu thích của bạn ngay hôm nay nhé!",
    },
]


def capture_scene(preset: str, out_path: str, wait_ms: int = 2300) -> None:
    url = f"{STAGE_URL}/?mirror=1&demoScene={preset}"
    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=720,1280",
        f"--virtual-time-budget={wait_ms}",
        f"--screenshot={out_path}",
        url,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Captured {out_path}")


def download_tts(text: str, out_mp3: str) -> bool:
    q = urllib.parse.quote(text)
    url = f"{STAGE_URL}/api/tts?tl=vi&text={q}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            audio_bytes = resp.read()
            if len(audio_bytes) > 200:
                with open(out_mp3, "wb") as f:
                    f.write(audio_bytes)
                print(f"Downloaded TTS: {out_mp3}")
                return True
    except Exception as exc:
        print(f"TTS warning: {exc}")
    return False


def overlay_caption_banner(raw_png: str, scene: dict, out_jpg: str) -> None:
    base = Image.open(raw_png).convert("RGBA").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Bottom TikTok Promo Caption Card in the clean Safe Zone (y: 1005 -> 1185)
    card_x1, card_y1 = 24, 1010
    card_x2, card_y2 = WIDTH - 24, 1178

    # Drop shadow (#3B2820)
    draw.rounded_rectangle(
        [card_x1 + 3, card_y1 + 5, card_x2 + 3, card_y2 + 5],
        radius=22,
        fill=(59, 40, 32, 230),
    )

    # Cream card body (#FFFDF9) with #3B2820 4px border
    draw.rounded_rectangle(
        [card_x1, card_y1, card_x2, card_y2],
        radius=22,
        fill=(255, 253, 249, 248),
        outline=(59, 40, 32, 255),
        width=4,
    )

    # Top accent pill inside card
    accent_r, accent_g, accent_b = scene["accent"]
    draw.rounded_rectangle(
        [card_x1 + 18, card_y1 + 14, card_x2 - 18, card_y1 + 50],
        radius=12,
        fill=(accent_r, accent_g, accent_b, 65),
        outline=(59, 40, 32, 160),
        width=2,
    )

    font_badge = ImageFont.truetype(FONT_BOLD, 17)
    font_title = ImageFont.truetype(FONT_BOLD, 23)
    font_sub = ImageFont.truetype(FONT_BOLD, 15)

    # Centered Badge Text
    badge_txt = scene["badge"]
    b_box = font_badge.getbbox(badge_txt)
    b_w = b_box[2] - b_box[0]
    draw.text(((WIDTH - b_w) // 2, card_y1 + 22), badge_txt, font=font_badge, fill=(59, 40, 32, 255))

    # Centered Main Title
    title_txt = scene["title"]
    t_box = font_title.getbbox(title_txt)
    t_w = t_box[2] - t_box[0]
    draw.text(((WIDTH - t_w) // 2, card_y1 + 66), title_txt, font=font_title, fill=(142, 37, 54, 255))

    # Centered Subtitle
    sub_txt = scene["subtitle"]
    s_box = font_sub.getbbox(sub_txt)
    s_w = s_box[2] - s_box[0]
    draw.text(((WIDTH - s_w) // 2, card_y1 + 114), sub_txt, font=font_sub, fill=(122, 95, 82, 255))

    combined = Image.alpha_composite(base, overlay)
    combined.convert("RGB").save(out_jpg, quality=96)
    print(f"Rendered promo frame: {out_jpg}")


def main() -> None:
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(FRAMES_DIR, exist_ok=True)
    os.makedirs(CLIPS_DIR, exist_ok=True)
    os.makedirs(VOICE_DIR, exist_ok=True)

    clip_files = []
    voice_events = []
    time_cursor = 0.0

    for scene in SCENES:
        sid = scene["id"]
        raw_png = os.path.join(RAW_DIR, f"{sid}.png")
        frame_jpg = os.path.join(FRAMES_DIR, f"{sid}.jpg")
        clip_mp4 = os.path.join(CLIPS_DIR, f"{sid}.mp4")
        voice_mp3 = os.path.join(VOICE_DIR, f"{sid}.mp3")

        capture_scene(scene["preset"], raw_png)
        overlay_caption_banner(raw_png, scene, frame_jpg)

        has_voice = download_tts(scene["tts"], voice_mp3)
        if has_voice:
            voice_events.append({"path": voice_mp3, "start": time_cursor + 0.15})

        dur = scene["duration"]
        total_frames = int(dur * FPS)
        cmd_clip = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            frame_jpg,
            "-vf",
            f"scale=720:1280,zoompan=z='min(zoom+0.00022,1.03)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps={FPS}",
            "-t",
            str(dur),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            clip_mp4,
        ]
        subprocess.run(cmd_clip, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        clip_files.append(clip_mp4)
        time_cursor += dur

    concat_txt = os.path.join(CLIPS_DIR, "concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for c in clip_files:
            f.write(f"file '{os.path.abspath(c).replace(chr(92), '/')}'\n")

    merged_mp4 = os.path.join(CLIPS_DIR, "merged_video.mp4")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_txt,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            merged_mp4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    total_dur = sum(s["duration"] for s in SCENES)
    bgm_path = r"f:\tiktok\apps\drink-bar\client\public\audio\cafe-bgm.mp3"

    audio_inputs = ["-i", bgm_path]
    filter_parts = [
        f"[1:a]volume=0.26,atrim=0:{total_dur},afade=t=out:st={total_dur-1.5}:d=1.5[bgm]"
    ]
    mix_labels = ["[bgm]"]

    idx = 2
    for ev in voice_events:
        audio_inputs.extend(["-i", ev["path"]])
        delay_ms = int(ev["start"] * 1000)
        lbl = f"v{idx}"
        filter_parts.append(
            f"[{idx}:a]atempo=1.22,volume=1.35,adelay={delay_ms}|{delay_ms}[{lbl}]"
        )
        mix_labels.append(f"[{lbl}]")
        idx += 1

    filter_parts.append(
        f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=first:dropout_transition=2[aout]"
    )

    out_public_dir = r"f:\tiktok\apps\drink-bar\client\public\videos"
    os.makedirs(out_public_dir, exist_ok=True)
    out_mp4 = os.path.join(out_public_dir, "drink_bar_tiktok_promo.mp4")
    artifact_dir = r"C:\Users\ADMIN\.gemini\antigravity\brain\6248502d-3b96-4c80-9cfa-95d230c171cf"
    artifact_mp4 = os.path.join(artifact_dir, "drink_bar_tiktok_promo.mp4")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            merged_mp4,
            *audio_inputs,
            "-filter_complex",
            ";".join(filter_parts),
            "-map",
            "0:v",
            "-map",
            "[aout]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            out_mp4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    shutil.copy2(out_mp4, artifact_mp4)
    for scene in SCENES:
        sid = scene["id"]
        shutil.copy2(
            os.path.join(FRAMES_DIR, f"{sid}.jpg"),
            os.path.join(artifact_dir, f"{sid}.jpg"),
        )
    print(f"SUCCESS: Rendered {out_mp4} and copied to {artifact_mp4}")


if __name__ == "__main__":
    main()

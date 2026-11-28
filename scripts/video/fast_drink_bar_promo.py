import os
import shutil
import subprocess
import urllib.parse
import urllib.request
from PIL import Image, ImageDraw, ImageFont

WIDTH = 720
HEIGHT = 1280
FPS = 30

RAW_DIR = r"f:\tiktok\scripts\video\drink_bar_raw"
FRAMES_DIR = r"f:\tiktok\scripts\video\drink_bar_frames"
CLIPS_DIR = r"f:\tiktok\scripts\video\drink_bar_clips"
VOICE_DIR = r"f:\tiktok\scripts\video\drink_bar_voices"
ARTIFACT_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\6248502d-3b96-4c80-9cfa-95d230c171cf"

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"

SCENES = [
    {
        "id": "scene1_idle",
        "src": os.path.join(RAW_DIR, "raw_scene1_idle.png"),
        "duration": 4.0,
        "badge": "🧋 QUẦY PHA CHẾ TƯƠNG TÁC TIKTOK LIVE",
        "title": "MENU 7 MÓN • GÕ CHAT LÀ CÓ LY!",
        "subtitle": "Gõ matcha • tra • tradao • trachanh • cafe • soda • nuocep",
        "accent": (244, 139, 163),
        "tts": "Chào mừng cả nhà đến với Quầy Pha Chế tương tác trực tiếp trên TikTok Live! Chỉ cần gõ tên món trong menu vào khung chat là có ngay một ly nước siêu cưng!",
    },
    {
        "id": "scene2_orders",
        "src": os.path.join(ARTIFACT_DIR, ".user_uploaded", "media_1795783894694_6441d448.jpg"),
        "crop_box": (728, 120, 1084, 752),
        "duration": 4.5,
        "badge": "🙋 KHÁCH CHIBI XẾP HÀNG & ĐÁNH MATCHA",
        "title": "PHA CHẾ TỪNG BƯỚC THEO COMMENT",
        "subtitle": "Khách hiện avatar trước quầy • Đánh bọt Matcha & lắc Trà Đào",
        "accent": (127, 184, 107),
        "tts": "Khách comment sẽ hiện nhân vật chibi kèm avatar xếp hàng ngay trước quầy! Chủ quán tự động lấy cốc, đánh bọt matcha và lắc trà đào theo đúng yêu cầu!",
    },
    {
        "id": "scene3_pouring",
        "src": os.path.join(ARTIFACT_DIR, ".user_uploaded", "media_1795709199341_ebbd4419.png"),
        "full_card": True,
        "duration": 4.2,
        "badge": "❤️ THẢ TIM TĂNG TỐC PHA SIÊU TỐC",
        "title": "RÓT SỮA OATSIDE & PHỦ KEM MUỐI",
        "subtitle": "Hiệu ứng ASMR rót nước phân tầng & đá viên nổi chân thực",
        "accent": (82, 166, 188),
        "tts": "Cả nhà thả tim càng nhiều, tốc độ pha chế càng nhanh! Từng tầng sữa Oatside, đá viên và kem muối được rót mượt mà kèm âm thanh A S M R cực cuốn!",
    },
    {
        "id": "scene4_handoff",
        "src": os.path.join(ARTIFACT_DIR, ".user_uploaded", "media_1795783866941_bab61378.jpg"),
        "duration": 4.5,
        "badge": "👑 DONATE NHẢY TIKTOK & TRAO LY MANG VỀ",
        "title": "3 ĐIỆU NHẢY HOT • VÀO LIVE GỌI MÓN NGAY!",
        "subtitle": "Tặng Hoa Hồng nhảy Bắn Tim • Quà lớn lên Top 1 VIP + Quẩy Nhiệt",
        "accent": (247, 201, 91),
        "tts": "Tặng quà để lên hàng V I P, xem chủ quán nhảy TikTok Quẩy Nhiệt và nhận ly nước trao tận tay! Hãy vào phiên Live và gõ tên món yêu thích ngay nhé!",
    },
]


def draw_cup_icon(draw: ImageDraw.ImageDraw, x: int, y: int, base_rgb: tuple, top_rgb: tuple) -> None:
    # Draw crisp mini cup icon over the broken image placeholder in raw_scene1_idle.png
    draw.rectangle([x - 8, y - 9, x + 8, y + 9], fill=(255, 244, 247, 255))
    draw.polygon([(x - 6, y - 3), (x + 6, y - 3), (x + 5, y + 7), (x - 5, y + 7)], fill=base_rgb, outline=(59, 40, 32, 255))
    draw.chord([x - 6, y - 8, x + 6, y - 1], 180, 360, fill=top_rgb, outline=(59, 40, 32, 255))


def patch_scene1_cup_icons(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    # Patch the 5 PNG placeholders in raw_scene1_idle.png with crisp cup vector icons
    draw_cup_icon(draw, 35, 198, (167, 211, 151, 255), (255, 253, 249, 255))   # matcha
    draw_cup_icon(draw, 111, 198, (216, 158, 104, 255), (255, 248, 238, 255))  # tra
    draw_cup_icon(draw, 37, 260, (111, 71, 50, 255), (247, 232, 212, 255))     # cafe
    draw_cup_icon(draw, 109, 260, (127, 200, 217, 255), (232, 247, 250, 255))  # soda
    draw_cup_icon(draw, 63, 290, (255, 149, 38, 255), (255, 243, 224, 255))    # nuocep


def download_google_tts(text: str, out_mp3: str) -> bool:
    q = urllib.parse.quote(text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q={q}"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://translate.google.com/",
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read()
            if len(data) > 200:
                with open(out_mp3, "wb") as f:
                    f.write(data)
                return True
    except Exception as exc:
        print(f"TTS skip: {exc}")
    return False


def build_frame(scene: dict, out_jpg: str) -> None:
    src = Image.open(scene["src"]).convert("RGBA")
    if "crop_box" in scene:
        src = src.crop(scene["crop_box"])

    if scene.get("full_card"):
        bg = Image.new("RGBA", (WIDTH, HEIGHT), (255, 245, 247, 255))
        base_s1 = Image.open(SCENES[0]["src"]).convert("RGBA").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        patch_scene1_cup_icons(base_s1)
        bg.paste(base_s1, (0, 0))
        ratio = (WIDTH - 48) / src.width
        fg_w = WIDTH - 48
        fg_h = int(src.height * ratio)
        fg = src.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
        draw_bg = ImageDraw.Draw(bg)
        fy = 470
        draw_bg.rounded_rectangle([20, fy - 4, 24 + fg_w + 4, fy + fg_h + 4], radius=20, fill=(255, 253, 249, 255), outline=(59, 40, 32, 255), width=4)
        bg.paste(fg, (24, fy), fg)
        base = bg
    else:
        base = src.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        if scene["id"] == "scene1_idle":
            patch_scene1_cup_icons(base)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    card_x1, card_y1 = 22, 1005
    card_x2, card_y2 = WIDTH - 22, 1175

    draw.rounded_rectangle(
        [card_x1 + 3, card_y1 + 5, card_x2 + 3, card_y2 + 5],
        radius=22,
        fill=(59, 40, 32, 230),
    )
    draw.rounded_rectangle(
        [card_x1, card_y1, card_x2, card_y2],
        radius=22,
        fill=(255, 253, 249, 250),
        outline=(59, 40, 32, 255),
        width=4,
    )

    ar, ag, ab = scene["accent"]
    draw.rounded_rectangle(
        [card_x1 + 16, card_y1 + 14, card_x2 - 16, card_y1 + 50],
        radius=12,
        fill=(ar, ag, ab, 75),
        outline=(59, 40, 32, 180),
        width=2,
    )

    font_badge = ImageFont.truetype(FONT_BOLD, 16)
    font_title = ImageFont.truetype(FONT_BOLD, 22)
    font_sub = ImageFont.truetype(FONT_BOLD, 14)

    for text, font, y_off, color in [
        (scene["badge"], font_badge, 22, (59, 40, 32, 255)),
        (scene["title"], font_title, 66, (142, 37, 54, 255)),
        (scene["subtitle"], font_sub, 114, (122, 95, 82, 255)),
    ]:
        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        draw.text(((WIDTH - tw) // 2, card_y1 + y_off), text, font=font, fill=color)

    final_img = Image.alpha_composite(base, overlay).convert("RGB")
    final_img.save(out_jpg, quality=95)
    print(f"Saved frame: {out_jpg}")


def main() -> None:
    os.makedirs(FRAMES_DIR, exist_ok=True)
    os.makedirs(CLIPS_DIR, exist_ok=True)
    os.makedirs(VOICE_DIR, exist_ok=True)

    clip_files = []
    voice_events = []
    time_cursor = 0.0

    for scene in SCENES:
        sid = scene["id"]
        frame_jpg = os.path.join(FRAMES_DIR, f"{sid}.jpg")
        clip_mp4 = os.path.join(CLIPS_DIR, f"{sid}.mp4")
        voice_mp3 = os.path.join(VOICE_DIR, f"{sid}.mp3")

        build_frame(scene, frame_jpg)
        shutil.copy2(frame_jpg, os.path.join(ARTIFACT_DIR, f"{sid}.jpg"))

        if download_google_tts(scene["tts"], voice_mp3):
            voice_events.append({"path": voice_mp3, "start": time_cursor + 0.1})

        dur = scene["duration"]
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-framerate",
                str(FPS),
                "-t",
                str(dur),
                "-i",
                frame_jpg,
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-pix_fmt",
                "yuv420p",
                clip_mp4,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
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
            "copy",
            merged_mp4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    total_dur = sum(s["duration"] for s in SCENES)
    bgm_path = r"f:\tiktok\apps\drink-bar\admin\public\audio\cafe-bgm.mp3"

    audio_inputs = ["-i", bgm_path]
    filter_parts = [
        f"[1:a]volume=0.25,atrim=0:{total_dur},afade=t=out:st={total_dur-1.2}:d=1.2[bgm]"
    ]
    mix_labels = ["[bgm]"]

    idx = 2
    for ev in voice_events:
        audio_inputs.extend(["-i", ev["path"]])
        delay_ms = int(ev["start"] * 1000)
        lbl = f"v{idx}"
        filter_parts.append(
            f"[{idx}:a]atempo=1.24,volume=1.4,adelay={delay_ms}|{delay_ms}[{lbl}]"
        )
        mix_labels.append(f"[{lbl}]")
        idx += 1

    filter_parts.append(
        f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=first:dropout_transition=2[aout]"
    )

    out_public_dir = r"f:\tiktok\apps\drink-bar\client\public\videos"
    os.makedirs(out_public_dir, exist_ok=True)
    out_mp4 = os.path.join(out_public_dir, "drink_bar_tiktok_promo.mp4")
    artifact_mp4 = os.path.join(ARTIFACT_DIR, "drink_bar_tiktok_promo.mp4")

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
    print(f"DONE: {out_mp4}")


if __name__ == "__main__":
    main()

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 720
HEIGHT = 1280
FPS = 30

FONT_PATH = "C:\\Windows\\Fonts\\arialbd.ttf"
FONT_REGULAR = "C:\\Windows\\Fonts\\arial.ttf"

SCENES = [
    {
        "id": "scene1",
        "image": r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\.system_generated\steps\1131\media_0.png",
        "duration": 4.5,
        "badge": "🔥 ĐẠI CHIẾN TIKTOK LIVE INTERACTIVE 🔥",
        "title": "LOL CKTG 2026: BLG VS G2",
        "subtitle": "Trận chiến đỉnh cao trực tiếp trên livestream TikTok",
        "badge_color": (220, 38, 38),
        "title_color": (253, 224, 71),
        "events": [
            {"time": 0.0, "audio": "client/public/sfx/INTRO_TITLE_HORN.mp3", "vol": 0.8},
            {"time": 1.5, "audio": "client/public/audio/casters/match_start_01.mp3", "vol": 1.0},
        ]
    },
    {
        "id": "scene2",
        "image": r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\.system_generated\steps\1145\media_0.png",
        "duration": 5.0,
        "badge": "⚡ LỐI CHƠI SIÊU TỐC ⚡",
        "title": "GÕ 1 HOẶC 2 ĐỂ TIẾP VIỆN NGAY",
        "subtitle": "Gõ 1 chọn BLG • Gõ 2 chọn G2 • Triệu hồi tướng thần tốc",
        "badge_color": (14, 165, 233),
        "title_color": (103, 232, 249),
        "events": [
            {"time": 0.5, "audio": "client/public/audio/casters/cta_hype_01.mp3", "vol": 1.0},
            {"time": 1.5, "audio": "client/public/sfx/CHAMPION_SUMMON.mp3", "vol": 0.8},
        ]
    },
    {
        "id": "scene3",
        "image": r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\.system_generated\steps\1213\media_0.png",
        "duration": 6.0,
        "badge": "🏆 CƠ CHẾ ĐỘC QUYỀN 🏆",
        "title": "BUFF LỘI NGƯỢC DÒNG +15% & TOP MVP",
        "subtitle": "Kích hoạt lật kèo khi bị dẫn • Vinh danh Top 1 Gánh Team",
        "badge_color": (168, 85, 247),
        "title_color": (216, 180, 254),
        "events": [
            {"time": 0.2, "audio": "client/public/sounds/memes/nhac-lat-keo.mp3", "vol": 0.9},
        ]
    },
    {
        "id": "scene4",
        "image": r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\.system_generated\steps\1219\media_0.png",
        "duration": 6.0,
        "badge": "💥 CAO TRÀO BÙNG NỔ 💥",
        "title": "BOSS CUỒNG NỘ & QUÀ TẶNG CHI VIỆN",
        "subtitle": "Súng Nước, Rồng Thần nổ sát thương triệu điểm phá khiên",
        "badge_color": (234, 88, 12),
        "title_color": (253, 186, 116),
        "events": [
            {"time": 0.3, "audio": "client/public/audio/casters/boss_enrage_01.mp3", "vol": 1.0},
            {"time": 2.2, "audio": "client/public/sfx/GIFT_MEGA.mp3", "vol": 0.85},
        ]
    },
    {
        "id": "scene5",
        "image": r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\.system_generated\steps\1223\media_0.png",
        "duration": 5.5,
        "badge": "👑 VINH QUANG VÔ ĐỊCH 👑",
        "title": "HẠ GỤC MỤC TIÊU • CHIẾN THẮNG BO5!",
        "subtitle": "Tỉ số BO5 cập nhật realtime • Bảng xếp hạng vinh danh người xem",
        "badge_color": (202, 138, 4),
        "title_color": (254, 240, 138),
        "events": [
            {"time": 0.3, "audio": "client/public/audio/casters/boss_killed_01.mp3", "vol": 1.0},
            {"time": 2.0, "audio": "client/public/sfx/VICTORY.mp3", "vol": 0.9},
        ]
    }
]

def render_scene_frame(scene, output_path):
    src_img = Image.open(scene["image"]).convert("RGBA")
    
    # Background: Blur scaled to fill
    bg_ratio = max(WIDTH / src_img.width, HEIGHT / src_img.height)
    bg_w = int(src_img.width * bg_ratio)
    bg_h = int(src_img.height * bg_ratio)
    bg = src_img.resize((bg_w, bg_h), Image.Resampling.LANCZOS)
    
    # Center crop bg
    left = (bg_w - WIDTH) // 2
    top = (bg_h - HEIGHT) // 2
    bg = bg.crop((left, top, left + WIDTH, top + HEIGHT))
    bg = bg.filter(ImageFilter.GaussianBlur(radius=25))
    
    # Dark tint overlay
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (10, 15, 30, 140))
    bg = Image.alpha_composite(bg, tint)
    
    # Foreground: Center screenshot scaled cleanly
    fg_ratio = min((WIDTH - 40) / src_img.width, (HEIGHT - 280) / src_img.height)
    fg_w = int(src_img.width * fg_ratio)
    fg_h = int(src_img.height * fg_ratio)
    fg = src_img.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
    
    fg_x = (WIDTH - fg_w) // 2
    fg_y = 135
    
    # Draw drop shadow behind foreground
    shadow = Image.new("RGBA", (fg_w + 20, fg_h + 20), (0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))
    bg.paste(shadow, (fg_x - 10, fg_y - 5), shadow)
    
    # Border card around foreground
    draw = ImageDraw.Draw(bg)
    border_color = scene.get("title_color", (255, 255, 255))
    draw.rounded_rectangle(
        [fg_x - 3, fg_y - 3, fg_x + fg_w + 3, fg_y + fg_h + 3],
        radius=16,
        outline=border_color,
        width=3
    )
    bg.paste(fg, (fg_x, fg_y), fg)
    
    # Header Overlay Card (Top)
    header_w = WIDTH - 40
    header_h = 105
    header_x = 20
    header_y = 18
    
    header_card = Image.new("RGBA", (header_w, header_h), (15, 23, 42, 235))
    h_draw = ImageDraw.Draw(header_card)
    h_draw.rounded_rectangle([0, 0, header_w, header_h], radius=14, outline=(71, 85, 105, 200), width=2)
    bg.paste(header_card, (header_x, header_y), header_card)
    
    # Header Text
    font_badge = ImageFont.truetype(FONT_PATH, 16)
    font_title = ImageFont.truetype(FONT_PATH, 24)
    font_sub = ImageFont.truetype(FONT_REGULAR, 15)
    
    # Draw Badge
    badge_text = scene["badge"]
    badge_bbox = font_badge.getbbox(badge_text)
    badge_tw = badge_bbox[2] - badge_bbox[0]
    badge_x = (WIDTH - badge_tw) // 2
    draw.text((badge_x, header_y + 12), badge_text, font=font_badge, fill=scene["badge_color"])
    
    # Draw Title
    title_text = scene["title"]
    title_bbox = font_title.getbbox(title_text)
    title_tw = title_bbox[2] - title_bbox[0]
    title_x = (WIDTH - title_tw) // 2
    # Shadow
    draw.text((title_x + 1, header_y + 42), title_text, font=font_title, fill=(0, 0, 0))
    draw.text((title_x, header_y + 40), title_text, font=font_title, fill=scene["title_color"])
    
    # Draw Subtitle Card (Bottom)
    sub_w = WIDTH - 40
    sub_h = 80
    sub_x = 20
    sub_y = HEIGHT - 105
    
    sub_card = Image.new("RGBA", (sub_w, sub_h), (15, 23, 42, 235))
    s_draw = ImageDraw.Draw(sub_card)
    s_draw.rounded_rectangle([0, 0, sub_w, sub_h], radius=14, outline=scene["badge_color"], width=2)
    bg.paste(sub_card, (sub_x, sub_y), sub_card)
    
    sub_text = scene["subtitle"]
    sub_bbox = font_sub.getbbox(sub_text)
    sub_tw = sub_bbox[2] - sub_bbox[0]
    sub_tx = (WIDTH - sub_tw) // 2
    draw.text((sub_tx, sub_y + 28), sub_text, font=font_sub, fill=(241, 245, 249))
    
    # Save final composite image
    bg.convert("RGB").save(output_path, quality=95)
    print(f"Generated frame: {output_path}")

def main():
    os.makedirs("scripts/video/frames", exist_ok=True)
    os.makedirs("scripts/video/clips", exist_ok=True)
    
    clip_files = []
    
    # 1. Render base frame for each scene and create video clip with subtle zoom
    for i, scene in enumerate(SCENES):
        frame_path = f"scripts/video/frames/{scene['id']}.jpg"
        render_scene_frame(scene, frame_path)
        
        clip_path = f"scripts/video/clips/{scene['id']}.mp4"
        duration = scene["duration"]
        
        # FFmpeg zoompan filter to give smooth subtle Ken Burns motion
        # zoom from 1.0 to 1.04 over duration
        total_frames = int(duration * FPS)
        cmd_clip = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", frame_path,
            "-vf", f"scale=720:1280,zoompan=z='min(zoom+0.0003,1.04)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps={FPS}",
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            clip_path
        ]
        subprocess.run(cmd_clip, check=True)
        clip_files.append(clip_path)
    
    # 2. Concat video clips with crossfade (or concat demuxer)
    concat_list_path = "scripts/video/clips/concat_list.txt"
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for clip in clip_files:
            abs_clip = os.path.abspath(clip).replace("\\", "/")
            f.write(f"file '{abs_clip}'\n")
    
    merged_video_path = "scripts/video/merged_video.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        merged_video_path
    ], check=True)
    
    # 3. Audio Mixing: Calculate total duration & assemble audio timeline
    total_duration = sum(s["duration"] for s in SCENES)
    
    audio_inputs = []
    filter_complex_parts = []
    
    # Input 0 is video (has no audio)
    # Input 1: Background Music (SILVER_SCRAPES)
    bgm_path = "client/public/sfx/SILVER_SCRAPES.mp3"
    audio_inputs.extend(["-i", bgm_path])
    filter_complex_parts.append(f"[1:a]volume=0.22,atrim=0:{total_duration},afade=t=out:st={total_duration-1.5}:d=1.5[bgm]")
    
    input_idx = 2
    mix_sources = ["[bgm]"]
    
    current_time_offset = 0.0
    for scene in SCENES:
        for event in scene["events"]:
            a_path = event["audio"]
            if os.path.exists(a_path):
                audio_inputs.extend(["-i", a_path])
                event_time_ms = int((current_time_offset + event["time"]) * 1000)
                vol = event.get("vol", 1.0)
                label = f"a{input_idx}"
                filter_complex_parts.append(
                    f"[{input_idx}:a]volume={vol},adelay={event_time_ms}|{event_time_ms}[{label}]"
                )
                mix_sources.append(f"[{label}]")
                input_idx += 1
        current_time_offset += scene["duration"]
    
    mix_str = "".join(mix_sources)
    filter_complex_parts.append(f"{mix_str}amix=inputs={len(mix_sources)}:duration=first:dropout_transition=2[aout]")
    
    full_filter = ";".join(filter_complex_parts)
    
    output_public = "client/public/videos/lol_live_game_promo.mp4"
    output_artifact = r"C:\Users\ThanhNVQ2\.gemini\antigravity\brain\3eee5d63-633b-44fd-9bf5-3f9bd4dc2e1b\lol_live_game_promo.mp4"
    
    cmd_final = [
        "ffmpeg", "-y",
        "-i", merged_video_path,
        *audio_inputs,
        "-filter_complex", full_filter,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_public
    ]
    
    print("Running final render...")
    subprocess.run(cmd_final, check=True)
    
    # Also copy to artifact directory for easy download
    import shutil
    shutil.copy2(output_public, output_artifact)
    print(f"Video saved to {output_public} and {output_artifact}")

if __name__ == "__main__":
    main()

import json
import os
import re
import hashlib
import asyncio
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, "server/.tts-venv/Lib/site-packages"))
import edge_tts

CACHE_DIR = os.path.join(REPO_ROOT, "server/data/tts-cache")

VOICE_MALE = "vi-VN-NamMinhNeural"
TAG_MALE = "VIET_TTS:cdteam:vi"

def make_speakable(text):
    t = text
    num_map = {
        '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm'
    }
    for digit, word in num_map.items():
        t = re.sub(rf'\b{digit}\b', word, t)
    t = re.sub(r'\bVán\s+', 'Ván đấu ', t)
    t = re.sub(r'[:]', ',', t)
    t = re.sub(r'[!?.]{2,}', '!', t)
    return t

def get_hashes(text):
    tag = TAG_MALE
    exact_key = f"vi|male||||{text}"
    neutral_key = f"vi|||||{text}"
    
    h1 = hashlib.sha1(f"{tag}|{exact_key}".encode("utf-8")).hexdigest() + ".mp3"
    h2 = hashlib.sha1(f"{tag}|{neutral_key}".encode("utf-8")).hexdigest() + ".mp3"
    return list(set([h1, h2]))

async def synthesize_line(text_speak, dest_path):
    comm = edge_tts.Communicate(text_speak, VOICE_MALE)
    data = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    if len(data) > 200:
        with open(dest_path, "wb") as fp:
            fp.write(data)
        return data
    return None

def build_intro_lines():
    pairs = [
        ("Gen.G Esports", "G2 Esports"),
        ("GEN", "G2"),
        ("Bilibili Gaming", "Gen.G Esports"),
        ("BLG", "GEN"),
        ("T1", "Gen.G Esports"),
        ("T1", "GEN"),
        ("T1", "Bilibili Gaming"),
        ("T1", "BLG"),
    ]
    bosses = [
        "Rồng Già Bão Tố",
        "Baron Nashor",
        "Sứ Giả Khe Nứt",
        "Rồng Ngàn Tuổi",
        "Rồng Núi Nham Thạch",
        "Thần Hư Vô Nguyên Thủy"
    ]
    rounds = [1, 2, 3, 4, 5]
    
    lines = []
    
    # 1. speechMatchup
    for left, right in pairs:
        for r in rounds:
            # Match current round 3 boss or general boss
            for boss in bosses:
                # We specifically prioritize round 3 with Rồng Già Bão Tố and round 1 with Baron
                if r == 3 and boss == "Rồng Già Bão Tố":
                    lines.append(f"Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván {r}: {left} đại chiến {right}. Mục tiêu tiêu diệt Boss {boss}!")
                elif r == 1 and boss in ["Baron Nashor", "Sứ Giả Khe Nứt"]:
                    lines.append(f"Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván {r}: {left} đại chiến {right}. Mục tiêu tiêu diệt Boss {boss}!")
                elif r in [2, 4, 5] and boss in ["Rồng Ngàn Tuổi", "Baron Nashor"]:
                    lines.append(f"Chào mừng các bạn đến với Kỳ Chung Kết Thế Giới! Ván {r}: {left} đại chiến {right}. Mục tiêu tiêu diệt Boss {boss}!")
                    
    # 2. speechNewSeriesMatchup
    for left, right in pairs[:4]:
        for boss in bosses[:2]:
            lines.append(f"Chào mừng các bạn đến với Cặp đấu mới giữa {left} và {right}! Ván 1 thể thức BO5. Mục tiêu tiêu diệt Boss {boss}!")
            
    # Remove duplicates
    return list(dict.fromkeys(lines))

async def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    existing_files = set(os.listdir(CACHE_DIR))
    lines = build_intro_lines()
    print(f"Total round intro lines to check: {len(lines)}", flush=True)
    
    needed = []
    for text in lines:
        hashes = get_hashes(text)
        if not any(h in existing_files for h in hashes):
            needed.append((text, hashes))
            
    print(f"Already cached: {len(lines) - len(needed)}, Missing to generate: {len(needed)}", flush=True)
    
    for idx, (text, hashes) in enumerate(needed):
        speakable = make_speakable(text)
        primary_dest = os.path.join(CACHE_DIR, hashes[0])
        print(f"[{idx+1}/{len(needed)}] Generating: {text[:55]}...", flush=True)
        
        retries = 3
        data = None
        while retries > 0 and not data:
            try:
                data = await synthesize_line(speakable, primary_dest)
                if not data:
                    retries -= 1
                    await asyncio.sleep(1.5)
            except Exception as e:
                retries -= 1
                await asyncio.sleep(2.0)
                
        if data:
            for h in hashes[1:]:
                alias_dest = os.path.join(CACHE_DIR, h)
                with open(alias_dest, "wb") as fp:
                    fp.write(data)
                existing_files.add(h)
            existing_files.add(hashes[0])
            print("  -> OK!", flush=True)
        else:
            print("  -> FAILED!", flush=True)
            
        await asyncio.sleep(0.8)
        
    print("Done generating Round Intro voice lines!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

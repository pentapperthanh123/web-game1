import json
import os
import re
import hashlib
import asyncio
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, "server/.tts-venv/Lib/site-packages"))
import edge_tts

VI_JSON_PATH = os.path.join(REPO_ROOT, "client/src/i18n/messages/vi.json")
CACHE_DIR = os.path.join(REPO_ROOT, "server/data/tts-cache")

VOICE_MALE = "vi-VN-NamMinhNeural"
VOICE_FEMALE = "vi-VN-HoaiMyNeural"

TAG_MALE = "VIET_TTS:cdteam:vi"
TAG_FEMALE = "VIET_TTS:quynh:vi"

def make_speakable(text):
    t = text
    num_map = {
        '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm',
        '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín', '10': 'mười'
    }
    for digit, word in num_map.items():
        t = re.sub(rf'\b{digit}\b', word, t)
    t = re.sub(r'\bVán\s+', 'Ván đấu ', t)
    t = re.sub(r'[:]', ',', t)
    t = re.sub(r'[!?.]{2,}', '!', t)
    return t

def get_hashes(text, role):
    tag = TAG_FEMALE if role == "female" else TAG_MALE
    exact_key = f"vi|{role}||||{text}"
    male_key = f"vi|male||||{text}"
    neutral_key = f"vi|||||{text}"
    
    h1 = hashlib.sha1(f"{tag}|{exact_key}".encode("utf-8")).hexdigest() + ".mp3"
    h2 = hashlib.sha1(f"{tag}|{male_key}".encode("utf-8")).hexdigest() + ".mp3"
    h3 = hashlib.sha1(f"{tag}|{neutral_key}".encode("utf-8")).hexdigest() + ".mp3"
    return list(set([h1, h2, h3]))

async def synthesize_line(voice, text_speak, dest_path):
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text_speak, voice)
            data = b""
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    data += chunk["data"]
            if len(data) > 200:
                with open(dest_path, "wb") as fp:
                    fp.write(data)
                return data
        except Exception as e:
            await asyncio.sleep(2.0 + attempt * 1.5)
    return None

def collect_missing():
    with open(VI_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    dialogues = data.get("Caster", {}).get("dialogues", {})
    existing_files = set(os.listdir(CACHE_DIR))
    
    unique_candidates = {}
    
    for signal, variants in dialogues.items():
        for turn_list in variants:
            # Common slot combinations
            combos = [
                {},
                {"boss": "Baron Nashor", "round": 1, "team": "GEN", "teamOther": "G2", "teamA": "GEN", "teamB": "G2", "score": "1 - 0", "format": "BO5", "seconds": 12, "dmg": "4 nghìn", "hp": "8 nghìn", "champion": "Yasuo", "starA": "Chovy", "starB": "Caps", "leadPercent": 25, "count": 500, "name": "Khán giả", "heal": 100},
                {"boss": "Rồng Ngàn Tuổi", "round": 2, "team": "GEN", "teamOther": "G2", "teamA": "GEN", "teamB": "G2", "score": "1 - 1", "format": "BO5", "seconds": 12, "dmg": "4 nghìn", "hp": "8 nghìn", "champion": "Ahri", "starA": "Chovy", "starB": "Caps", "leadPercent": 30, "count": 500, "name": "Khán giả", "heal": 100},
                {"boss": "Rồng Già Bão Tố", "round": 3, "team": "GEN", "teamOther": "G2", "teamA": "GEN", "teamB": "G2", "score": "2 - 1", "format": "BO5", "seconds": 12, "dmg": "4 nghìn", "hp": "8 nghìn", "champion": "Yone", "starA": "Chovy", "starB": "Caps", "leadPercent": 35, "count": 500, "name": "Khán giả", "heal": 100},
            ]
            
            for slots in combos:
                for turn in turn_list:
                    speaker = turn.get("speaker", "A")
                    role = "female" if speaker == "B" else "male"
                    t = turn.get("text", "")
                    for k, v in slots.items():
                        t = t.replace(f"{{{{{k}}}}}", str(v))
                    if "{{" not in t and len(t.strip()) > 0:
                        clean = t.strip()
                        key = f"{role}|{clean}"
                        if key not in unique_candidates:
                            unique_candidates[key] = (role, speaker, clean)
                            
    missing = []
    for role, speaker, clean in unique_candidates.values():
        hashes = get_hashes(clean, role)
        if not any(h in existing_files for h in hashes):
            missing.append((role, speaker, clean, hashes))
            
    return missing

async def main():
    missing = collect_missing()
    print(f"Total missing dialogue lines to synthesize: {len(missing)}", flush=True)
    
    success = 0
    for idx, (role, speaker, text, hashes) in enumerate(missing):
        voice = VOICE_FEMALE if role == "female" else VOICE_MALE
        speakable = make_speakable(text)
        primary_dest = os.path.join(CACHE_DIR, hashes[0])
        print(f"[{idx+1}/{len(missing)}] ({speaker}:{role}) {text[:45]}...", flush=True)
        
        data = await synthesize_line(voice, speakable, primary_dest)
        if data:
            for h in hashes[1:]:
                alias_dest = os.path.join(CACHE_DIR, h)
                with open(alias_dest, "wb") as fp:
                    fp.write(data)
            success += 1
            print("  -> OK!", flush=True)
        else:
            print("  -> FAILED!", flush=True)
            
        await asyncio.sleep(1.2)
        
    print(f"Done! Synthesized {success}/{len(missing)} dialogue lines.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

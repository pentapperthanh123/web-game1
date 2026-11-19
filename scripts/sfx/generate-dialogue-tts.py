import json
import os
import re
import hashlib
import asyncio
import sys
import time

# Ensure we use packages in .tts-venv
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, "server/.tts-venv/Lib/site-packages"))
import edge_tts

VI_JSON_PATH = os.path.join(REPO_ROOT, "client/src/i18n/messages/vi.json")
CACHE_DIR = os.path.join(REPO_ROOT, "server/data/tts-cache")

VOICE_MALE = "vi-VN-NamMinhNeural"
VOICE_FEMALE = "vi-VN-HoaiMyNeural"

TAG_MALE = "VIET_TTS:cdteam:vi"
TAG_FEMALE = "VIET_TTS:quynh:vi"

BOSSES = ["Baron Nashor", "Rồng Ngàn Tuổi", "Sứ Giả Khe Nứt"]
ROUNDS = [1, 2, 3]
TEAMS = ["BLG", "GEN", "T1"]
CHAMPIONS = ["Ahri", "Yasuo", "Lee Sin"]

def interpolate(tmpl, slots):
    result = tmpl
    for k, v in slots.items():
        result = result.replace(f"{{{{{k}}}}}", str(v))
    return result

def make_speakable(text):
    t = text
    # Replace digits so Edge TTS does not glitch
    num_map = {
        '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm',
        '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín', '10': 'mười'
    }
    for digit, word in num_map.items():
        t = re.sub(rf'\b{digit}\b', word, t)
    # Ensure "Ván " is pronounced reliably by female voice as "Ván đấu "
    t = re.sub(r'\bVán\s+', 'Ván đấu ', t)
    # Remove colons and exclamation runs
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

def collect_lines():
    with open(VI_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    dialogues = data.get("Caster", {}).get("dialogues", {})
    
    unique_lines = {} # text -> (role, speaker, text)
    
    for signal, variants in dialogues.items():
        for turn_list in variants:
            perm_slots = []
            if signal in ["BANTER_CTA", "BANTER_HYPE"]:
                perm_slots.append({})
            elif signal == "ROUND_GO":
                for boss in BOSSES:
                    for r in ROUNDS:
                        perm_slots.append({"boss": boss, "round": r})
            elif signal.startswith("BOSS_"):
                for boss in BOSSES:
                    perm_slots.append({
                        "boss": boss,
                        "seconds": 12,
                        "dmg": "4 nghìn",
                        "hp": "8 nghìn",
                        "hpPercent": 20
                    })
            elif signal in ["COMEBACK", "TIGHT_RACE", "DOMINANT_LEAD"]:
                perm_slots.append({"team": "T1", "teamOther": "GEN", "teamA": "T1", "teamB": "GEN", "leadPercent": 30})
                perm_slots.append({"team": "BLG", "teamOther": "GEN", "teamA": "BLG", "teamB": "GEN", "leadPercent": 25})
            elif signal in ["BANTER_GUIDE", "BANTER_EMPTY"]:
                for champ in CHAMPIONS:
                    perm_slots.append({"champion": champ, "teamA": "T1", "teamB": "GEN", "boss": "Baron Nashor"})
            else:
                perm_slots.append({
                    "boss": "Baron Nashor",
                    "round": 1,
                    "team": "T1",
                    "teamOther": "GEN",
                    "score": "1 - 0",
                    "format": "BO5",
                    "count": 500,
                    "heal": 100,
                    "name": "Khán giả",
                    "gift": "Mũ Phù Thủy",
                    "a": "Top 1",
                    "b": "Top 2",
                    "c": "Top 3",
                    "fieldCount": 6,
                    "hpPercent": 50,
                    "teamLeading": "T1",
                    "teamTrailing": "GEN",
                    "starTrailing": "Faker"
                })
            
            for slots in perm_slots:
                for turn in turn_list:
                    speaker = turn.get("speaker", "A")
                    role = "female" if speaker == "B" else "male"
                    t = interpolate(turn.get("text", ""), slots)
                    if "{{" not in t and len(t.strip()) > 0:
                        clean_text = t.strip()
                        key = f"{role}|{clean_text}"
                        if key not in unique_lines:
                            unique_lines[key] = (role, speaker, clean_text)
                            
    return list(unique_lines.values())

async def synthesize_line(voice, text_speak, dest_path):
    comm = edge_tts.Communicate(text_speak, voice)
    data = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    if len(data) > 200:
        with open(dest_path, "wb") as fp:
            fp.write(data)
        return data
    return None

async def run_generation():
    os.makedirs(CACHE_DIR, exist_ok=True)
    existing_files = set(os.listdir(CACHE_DIR))
    lines = collect_lines()
    print(f"Total collected dialogue lines: {len(lines)}", flush=True)
    
    needed = []
    for role, speaker, text in lines:
        hashes = get_hashes(text, role)
        # We only need to generate if none of the candidate hashes exist
        if not any(h in existing_files for h in hashes):
            needed.append((role, speaker, text, hashes))
            
    print(f"Already cached: {len(lines) - len(needed)}, Missing to generate: {len(needed)}", flush=True)
    
    success_count = 0
    
    for idx, (role, speaker, original_text, hashes) in enumerate(needed):
        voice = VOICE_FEMALE if role == "female" else VOICE_MALE
        speakable = make_speakable(original_text)
        primary_dest = os.path.join(CACHE_DIR, hashes[0])
        
        print(f"[{idx+1}/{len(needed)}] ({speaker}:{role}) {original_text[:40]}...", flush=True)
        
        retries = 3
        data = None
        while retries > 0 and not data:
            try:
                data = await synthesize_line(voice, speakable, primary_dest)
                if not data:
                    retries -= 1
                    await asyncio.sleep(1.5)
            except Exception as e:
                retries -= 1
                await asyncio.sleep(2.0)
                
        if data:
            # Copy to all other alias hashes
            for h in hashes[1:]:
                alias_dest = os.path.join(CACHE_DIR, h)
                with open(alias_dest, "wb") as fp:
                    fp.write(data)
                existing_files.add(h)
            existing_files.add(hashes[0])
            success_count += 1
        else:
            print(f"  FAILED: {original_text[:40]}", flush=True)
            
        # Polite throttle to stay well below rate limit
        await asyncio.sleep(0.8)
        
    print(f"Finished! Successfully generated {success_count}/{len(needed)} dialogue lines.", flush=True)

if __name__ == "__main__":
    asyncio.run(run_generation())

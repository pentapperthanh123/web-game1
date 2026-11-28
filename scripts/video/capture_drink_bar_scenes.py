import json
import os
import subprocess
import time
import urllib.request

EMIT_URL = "http://localhost:8070/api/drinkbar-sync/emit"
STAGE_URL = "http://localhost:8070"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FRAMES_DIR = r"f:\tiktok\scripts\video\drink_bar_raw"


def post_sync(payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        EMIT_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=3) as resp:
        resp.read()


def emit_admin_action(action: str, payload: dict | None = None) -> None:
    now = int(time.time() * 1000)
    post_sync(
        {
            "type": "ADMIN_ACTION",
            "eventId": f"act_{now}_{action}",
            "action": action,
            "payload": payload or {},
            "timestamp": now,
        }
    )


def emit_live_chat(user_id: str, nickname: str, text: str) -> None:
    now = int(time.time() * 1000)
    post_sync(
        {
            "type": "LIVE_EVENT",
            "eventId": f"ev_chat_{now}_{user_id}",
            "event": {
                "type": "CHAT",
                "source": "SIMULATOR",
                "timestamp": now,
                "user": {"id": user_id, "nickname": nickname},
                "text": text,
                "cleanText": text,
            },
            "timestamp": now,
        }
    )


def emit_live_gift(user_id: str, nickname: str, gift_name: str, coins: int) -> None:
    now = int(time.time() * 1000)
    post_sync(
        {
            "type": "LIVE_EVENT",
            "eventId": f"ev_gift_{now}_{user_id}",
            "event": {
                "type": "GIFT",
                "source": "SIMULATOR",
                "timestamp": now,
                "user": {"id": user_id, "nickname": nickname},
                "giftName": gift_name,
                "coinValue": coins,
                "repeatCount": 1,
            },
            "timestamp": now,
        }
    )


def emit_live_likes(count: int) -> None:
    now = int(time.time() * 1000)
    post_sync(
        {
            "type": "LIVE_EVENT",
            "eventId": f"ev_like_{now}",
            "event": {
                "type": "LIKE",
                "source": "SIMULATOR",
                "timestamp": now,
                "count": count,
            },
            "timestamp": now,
        }
    )


def capture_stage(filename: str, wait_ms: int = 2400) -> str:
    out_path = os.path.join(FRAMES_DIR, filename)
    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=720,1280",
        f"--virtual-time-budget={wait_ms}",
        f"--screenshot={out_path}",
        f"{STAGE_URL}?mirror=1",
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Captured {out_path}")
    return out_path


def main() -> None:
    os.makedirs(FRAMES_DIR, exist_ok=True)

    # Scene 1: Cozy Idle Shop & New Menu with 7 Drink Cups
    emit_admin_action("RESET_DEFAULT")
    emit_admin_action("SET_LANGUAGE", {"language": "VI"})
    emit_admin_action("SET_UNLIMITED_INVENTORY", {"unlimitedInventory": True})
    time.sleep(0.4)
    capture_stage("raw_scene1_idle.png", 2500)

    # Scene 2: Customers rushing in to order Matcha, Trà Đào, Trà Chanh, Cafe, Soda
    emit_live_chat("u1", "Minh Anh", "matcha")
    time.sleep(0.15)
    emit_live_chat("u2", "Bảo Ngọc", "tradao it da")
    time.sleep(0.15)
    emit_live_chat("u3", "Gia Huy", "cafe")
    time.sleep(0.15)
    emit_live_chat("u4", "Khánh Vy", "trachanh")
    time.sleep(0.15)
    emit_live_chat("u5", "Tuấn Kiệt", "soda")
    time.sleep(0.2)
    emit_admin_action("SET_BREW_PROGRESS", {"progress": 34})
    time.sleep(0.3)
    capture_stage("raw_scene2_orders.png", 2600)

    # Scene 3: Pouring Layers & Like Turbo Boost (P4 - 78%)
    emit_live_likes(25)
    emit_admin_action("SET_BREW_PROGRESS", {"progress": 78})
    time.sleep(0.3)
    capture_stage("raw_scene3_pouring.png", 2600)

    # Scene 4: Donate Gift -> VIP Line Jump & TikTok Party Hype Dance!
    emit_live_gift("u6", "Linh Chi VIP", "Signature Crown", 35)
    emit_admin_action(
        "TRIGGER_TIKTOK_DANCE",
        {"danceTier": "LARGE", "danceStyle": "party_hype"},
    )
    time.sleep(0.35)
    capture_stage("raw_scene4_dance.png", 2600)

    # Scene 5: Sealing Dome Lid & Direct Takeaway Cup Handoff (P5 - 96%)
    emit_admin_action("SET_BREW_PROGRESS", {"progress": 96})
    time.sleep(0.3)
    capture_stage("raw_scene5_handoff.png", 2600)


if __name__ == "__main__":
    main()

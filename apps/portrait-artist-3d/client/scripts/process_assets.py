import json
import os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

RAW_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/assets/raw"))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/assets"))

STAGE_W = 720
STAGE_H = 1280


def cover_resize(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(round(src_w * scale))
    new_h = int(round(src_h * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def detect_white_canvas_box(bg_rgb: np.ndarray) -> dict:
    """
    Scans the center-right studio region for the blank white easel canvas rectangle.
    """
    h, w, _ = bg_rgb.shape
    r = bg_rgb[:, :, 0].astype(np.int32)
    g = bg_rgb[:, :, 1].astype(np.int32)
    b = bg_rgb[:, :, 2].astype(np.int32)

    # White/warm-cream blank canvas mask
    is_bright = (r > 225) & (g > 218) & (b > 195)
    low_sat = (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) < 42
    mask = is_bright & low_sat

    # Restrict search to plausible easel area (x: 25%..90%, y: 20%..80%)
    x0, x1 = int(w * 0.25), int(w * 0.92)
    y0, y1 = int(h * 0.20), int(h * 0.80)
    sub = mask[y0:y1, x0:x1]

    # Find largest connected component via BFS
    visited = np.zeros_like(sub, dtype=bool)
    best_count = 0
    best_bounds = (320, 420, 220, 220)

    sh, sw = sub.shape
    for sy in range(0, sh, 2):
        for sx in range(0, sw, 2):
            if not sub[sy, sx] or visited[sy, sx]:
                continue
            q = deque([(sy, sx)])
            visited[sy, sx] = True
            count = 0
            min_x, max_x = sx, sx
            min_y, max_y = sy, sy
            while q:
                cy, cx = q.popleft()
                count += 1
                if cx < min_x:
                    min_x = cx
                if cx > max_x:
                    max_x = cx
                if cy < min_y:
                    min_y = cy
                if cy > max_y:
                    max_y = cy
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < sh and 0 <= nx < sw and not visited[ny, nx] and sub[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))

            if count > best_count:
                best_count = count
                bw = max_x - min_x + 1
                bh = max_y - min_y + 1
                best_bounds = (x0 + min_x, y0 + min_y, bw, bh)

    bx, by, bw, bh = best_bounds
    return {"x": int(bx), "y": int(by), "width": int(bw), "height": int(bh), "pixelCount": int(best_count)}


def remove_green_screen_bfs(img: Image.Image, target_height: int) -> Image.Image:
    """
    1. Samples background color from the 4 corners.
    2. Runs 4-connected BFS flood-fill from outer edges so interior green details are preserved.
    3. Applies 2px soft edge feathering + green-spill suppression (G <= (R + B) / 2).
    4. Auto-trims transparent margin and resizes to target_height.
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.int32)
    h, w, _ = rgba.shape
    rgb = rgba[:, :, :3]

    # 1. Sample 4 corners (12x12 patches)
    pad = min(12, h // 10, w // 10)
    corners = np.concatenate(
        [
            rgb[:pad, :pad].reshape(-1, 3),
            rgb[:pad, -pad:].reshape(-1, 3),
            rgb[-pad:, :pad].reshape(-1, 3),
            rgb[-pad:, -pad:].reshape(-1, 3),
        ],
        axis=0,
    )
    bg_color = np.median(corners, axis=0)

    # Compute per-pixel color distance to sampled corner background & chroma green dominance
    diff = rgb - bg_color
    dist_sq = np.sum(diff * diff, axis=2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    max_rb = np.maximum(r, b)
    green_excess = g - max_rb

    # Candidate background pixels: close to corner color OR strong chroma green
    is_bg_candidate = (dist_sq < (88 * 88)) | ((g > 95) & (green_excess > 24))

    # 2. BFS Flood-Fill starting from outer border AND pure neon chroma-key pockets (e.g. enclosed gap between legs/arms)
    bg_mask = np.zeros((h, w), dtype=bool)
    q = deque()

    pure_chroma_pocket = (g > 160) & (green_excess > 68) & (r < 115) & (b < 115)
    pocket_ys, pocket_xs = np.where(pure_chroma_pocket)
    for py, px in zip(pocket_ys, pocket_xs):
        bg_mask[py, px] = True
        q.append((int(py), int(px)))

    for x in range(w):
        if is_bg_candidate[0, x] and not bg_mask[0, x]:
            bg_mask[0, x] = True
            q.append((0, x))
        if is_bg_candidate[h - 1, x] and not bg_mask[h - 1, x]:
            bg_mask[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_bg_candidate[y, 0] and not bg_mask[y, 0]:
            bg_mask[y, 0] = True
            q.append((y, 0))
        if is_bg_candidate[y, w - 1] and not bg_mask[y, w - 1]:
            bg_mask[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg_mask[ny, nx] and is_bg_candidate[ny, nx]:
                bg_mask[ny, nx] = True
                q.append((ny, nx))

    # 3. Compute 1-3px boundary zone next to flood-filled background for feathering & despill
    fg_mask = ~bg_mask
    # Dilate bg_mask by 1px, 2px, 3px using boolean shifts
    near_bg_1 = np.zeros_like(bg_mask)
    near_bg_1[1:, :] |= bg_mask[:-1, :]
    near_bg_1[:-1, :] |= bg_mask[1:, :]
    near_bg_1[:, 1:] |= bg_mask[:, :-1]
    near_bg_1[:, :-1] |= bg_mask[:, 1:]
    edge_band_1 = fg_mask & near_bg_1

    near_bg_2 = near_bg_1.copy()
    near_bg_2[1:, :] |= near_bg_1[:-1, :]
    near_bg_2[:-1, :] |= near_bg_1[1:, :]
    near_bg_2[:, 1:] |= near_bg_1[:, :-1]
    near_bg_2[:, :-1] |= near_bg_1[:, 1:]
    edge_band_2 = fg_mask & near_bg_2

    near_bg_3 = near_bg_2.copy()
    near_bg_3[1:, :] |= near_bg_2[:-1, :]
    near_bg_3[:-1, :] |= near_bg_2[1:, :]
    near_bg_3[:, 1:] |= near_bg_2[:, :-1]
    near_bg_3[:, :-1] |= near_bg_2[:, 1:]
    edge_band_3 = fg_mask & near_bg_3

    # Build alpha channel with smooth anti-aliased edge transition
    alpha = np.where(fg_mask, 255, 0).astype(np.float32)

    # On 2px edge band, attenuate alpha proportionally to green spill
    spill_ratio = np.clip((green_excess.astype(np.float32) - 4.0) / 48.0, 0.0, 1.0)
    alpha = np.where(edge_band_2, alpha * (1.0 - spill_ratio * 0.85), alpha)
    alpha = np.where(edge_band_1 & (green_excess > 14), alpha * 0.25, alpha)

    # Smooth alpha slightly with PIL GaussianBlur (radius=0.8) but keep core interior 255
    alpha_img = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), mode="L")
    blurred_alpha = np.array(alpha_img.filter(ImageFilter.GaussianBlur(radius=0.85)), dtype=np.float32)
    core_interior = fg_mask & (~edge_band_2)
    final_alpha = np.where(core_interior, 255.0, blurred_alpha)
    final_alpha = np.where(bg_mask, 0.0, final_alpha)

    # 4. Green Spill Suppression on 3px edge band (clamp G <= (R + B) / 2)
    despill_zone = edge_band_3 | (final_alpha < 250)
    avg_rb = (r + b) // 2
    g_clean = np.where(despill_zone & (g > avg_rb), avg_rb, g)
    # Warm up despilled edge pixels slightly so dark outlines look crisp dark-brown
    r_clean = np.where(despill_zone & (g > avg_rb), np.minimum(255, r + 6), r)

    out_rgba = np.stack(
        [
            np.clip(r_clean, 0, 255).astype(np.uint8),
            np.clip(g_clean, 0, 255).astype(np.uint8),
            np.clip(b, 0, 255).astype(np.uint8),
            np.clip(final_alpha, 0, 255).astype(np.uint8),
        ],
        axis=2,
    )

    # 5. Auto-Trim transparent bounding box
    nonzero_y, nonzero_x = np.where(out_rgba[:, :, 3] > 18)
    if len(nonzero_x) > 0 and len(nonzero_y) > 0:
        min_x = max(0, int(np.min(nonzero_x)) - 2)
        max_x = min(w, int(np.max(nonzero_x)) + 3)
        min_y = max(0, int(np.min(nonzero_y)) - 2)
        max_y = min(h, int(np.max(nonzero_y)) + 3)
        out_rgba = out_rgba[min_y:max_y, min_x:max_x]

    trimmed_img = Image.fromarray(out_rgba, mode="RGBA")
    tw, th = trimmed_img.size
    scale = target_height / max(1, th)
    target_w = max(1, int(round(tw * scale)))
    return trimmed_img.resize((target_w, target_height), Image.Resampling.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    report: dict = {}

    # 1. Process background
    bg_raw_path = os.path.join(RAW_DIR, "bg-studio-raw.png")
    if os.path.exists(bg_raw_path):
        bg_raw = Image.open(bg_raw_path).convert("RGB")
        bg_out = cover_resize(bg_raw, STAGE_W, STAGE_H)
        bg_out_path = os.path.join(OUT_DIR, "bg-studio.png")
        bg_out.save(bg_out_path, format="PNG", optimize=True)
        canvas_box = detect_white_canvas_box(np.array(bg_out))
        report["bg-studio.png"] = {"size": bg_out.size, "detectedCanvasBox": canvas_box}

    # 2. Process character sprites with BFS chroma-key & green despill
    sprites = [
        ("artist-raw.png", "artist.png", 500),
        ("customer-sit-raw.png", "customer-sit.png", 254),
        ("customer-stand-raw.png", "customer-stand.png", 284),
        ("customer-stand-2-raw.png", "customer-stand-2.png", 284),
        ("customer-stand-3-raw.png", "customer-stand-3.png", 284),
    ]

    for raw_name, out_name, target_h in sprites:
        raw_path = os.path.join(RAW_DIR, raw_name)
        if not os.path.exists(raw_path):
            report[out_name] = {"error": f"Missing {raw_path}"}
            continue
        raw_img = Image.open(raw_path)
        clean_img = remove_green_screen_bfs(raw_img, target_h)
        out_path = os.path.join(OUT_DIR, out_name)
        clean_img.save(out_path, format="PNG", optimize=True)
        report[out_name] = {"size": clean_img.size}

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

import math
import os
import numpy as np
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/assets"))


def build_arm_and_body_layers() -> None:
    artist_path = os.path.join(ASSETS_DIR, "artist.png")
    img = Image.open(artist_path).convert("RGBA")
    w, h = img.size
    rgba = np.array(img, dtype=np.uint8)

    # 1. Isolate the bare forearm + hand + paintbrush cleanly along the bottom border of the cream puff-sleeve cuff
    poly_img = Image.new("L", (w, h), 0)
    p_draw = ImageDraw.Draw(poly_img)
    forearm_polygon = [
        (0, 182),
        (87, 182),
        (89, 185),
        (94, 188),
        (100, 190),
        (107, 192),
        (107, 212),
        (96, 222),
        (90, 245),
        (85, 282),
        (0, 282),
    ]
    p_draw.polygon(forearm_polygon, fill=255)
    forearm_mask = (np.array(poly_img) > 128) & (rgba[:, :, 3] > 20)

    # 2. Build artist-body.png with 100% intact cream puff-sleeve cuff and zero stray forearm pixels
    body_rgba = rgba.copy()
    body_rgba[forearm_mask] = [0, 0, 0, 0]
    # Also clear any faint semi-transparent fringe inside the erased forearm bbox
    erased_zone = np.array(poly_img) > 128
    body_rgba[erased_zone] = [0, 0, 0, 0]
    body_pil = Image.fromarray(body_rgba, mode="RGBA")
    body_pil.save(os.path.join(ASSETS_DIR, "artist-body.png"), format="PNG", optimize=True)

    # 3. Build artist-arm.png by extruding the forearm cross-section 14px up-right along the forearm axis
    # into a smooth circular ball joint centered at pivot (98, 189) tucked UNDER the puff-sleeve cuff.
    arm_rgba = np.zeros_like(rgba)
    arm_rgba[forearm_mask] = rgba[forearm_mask]

    pivot_x, pivot_y = 98, 189
    for step in range(1, 15):
        dx = int(round(step * 0.65))
        dy = int(round(-step * 0.76))
        for sy in range(184, 206):
            for sx in range(86, 106):
                if forearm_mask[sy, sx]:
                    tx, ty = sx + dx, sy + dy
                    if 0 <= tx < w and 0 <= ty < h:
                        if math.hypot(tx - pivot_x, ty - pivot_y) <= 9.2 and arm_rgba[ty, tx, 3] == 0:
                            arm_rgba[ty, tx] = rgba[sy, sx]

    raw_arm_pil = Image.fromarray(arm_rgba, mode="RGBA")

    tip_x, tip_y = 4, 267
    dx_tip = tip_x - pivot_x
    dy_tip = tip_y - pivot_y
    rest_angle_deg = math.degrees(math.atan2(dy_tip, dx_tip))
    arm_length = math.hypot(dx_tip, dy_tip)
    align_ccw_deg = -(180.0 - rest_angle_deg)

    arm_canvas_w, arm_canvas_h = 260, 240
    arm_pivot_x, arm_pivot_y = 200, 120

    padded_arm = Image.new("RGBA", (arm_canvas_w, arm_canvas_h), (0, 0, 0, 0))
    padded_arm.alpha_composite(raw_arm_pil, (arm_pivot_x - pivot_x, arm_pivot_y - pivot_y))

    rotated_arm = padded_arm.rotate(
        align_ccw_deg,
        resample=Image.Resampling.BICUBIC,
        center=(arm_pivot_x, arm_pivot_y),
    )
    # Remove any faint bicubic alpha noise (< 25) so there are zero stray specks
    rot_arr = np.array(rotated_arm)
    rot_arr[rot_arr[:, :, 3] < 25] = [0, 0, 0, 0]
    clean_arm = Image.fromarray(rot_arr, mode="RGBA")

    clean_arm.save(os.path.join(ASSETS_DIR, "artist-arm.png"), format="PNG", optimize=True)
    print(f"Saved seamless artist-body.png & artist-arm.png | pivot=({pivot_x},{pivot_y}) | armLength={arm_length:.1f}px")


if __name__ == "__main__":
    build_arm_and_body_layers()

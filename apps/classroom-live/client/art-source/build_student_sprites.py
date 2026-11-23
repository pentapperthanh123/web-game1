"""
Tạo các sprite học sinh ngồi bàn (nhìn từ sau) từ ảnh gốc `student_desk.png` (học sinh nữ 2 bím tóc).
Mọi biến thể dùng chung khung 731x883 (xuất ra cao 240px) nên avatar/tên/hiệu ứng khớp vị trí như nhau.

Các chiều biến đổi (tất cả bằng xử lý ảnh trên cùng một nét vẽ):
  - Kiểu tóc : 2 bím (gốc) | tóc ngắn (bỏ bím + nơ) | búi thấp có dây buộc | tóc ngắn + băng đô | mũ lưỡi trai
  - Màu tóc  : đen | nâu đậm | nâu | nâu đỏ
  - Màu nơ / dây buộc / băng đô / mũ : đỏ | hồng | xanh | vàng
  - Màu da   : sáng | ngăm | nâu
  - Áo       : trắng | xanh nhạt (khăn quàng đỏ giữ nguyên)

Các bước cho mỗi biến thể:
  1. Chọn nền: ảnh gốc (2 bím) hoặc bản đã bỏ bím tóc + nơ.
  2. Vẽ phụ kiện (búi tóc / băng đô) nếu có.
  3. Khôi phục độ đục cho vùng trắng bị xóa nhầm khi tách nền (áo, cổ áo, trang vở).
  4. Đổi màu nơ, tóc, da, áo theo bảng VARIANTS.
  5. Thu nhỏ về cao 240px (≈3x kích thước hiển thị) và lưu vào public/assets/students/<id>.png

Chạy (cần Pillow, numpy, scipy):
  PYTHONUTF8=1 python apps/classroom-live/client/art-source/build_student_sprites.py
Danh sách id phải khớp với STUDENT_VARIANTS trong client/src/constants/studentVariants.ts.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

Color = Tuple[int, int, int]

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'student_desk.png'
OUTPUT_DIR = HERE.parent / 'public' / 'assets' / 'students'
TARGET_HEIGHT = 240

# ---- Toạ độ trên ảnh gốc 731x883 -------------------------------------------------------------
DESK_LINE_Y = 296              # dưới dòng này là bàn/áo
HEAD_SEED = (160, 367)         # (y, x) giữa đầu
PENCIL_CASE_KEEP = (262, 490)  # (y >=, x >=) vùng hộp bút
CASE_X = (490, 665)
CASE_Y = (250, 360)
EAR_Y_RANGE = (170, 290)
BOW_MAX_Y = 200                # nơ + dây ruy băng nằm phía trên dòng này
HAIR_MAX_Y = 312               # tóc (kể cả gáy) nằm phía trên dòng này; bên dưới là cổ áo
HAIR_X_RANGE = (60, 680)
SHIRT_BOX = (318, 530, 205, 530)   # (y0, y1, x0, x1) thân áo + tay áo
NOTEBOOK_EDGE_X = (215, 520)       # trang vở lộ ra ngoài 2 tay (y < 440)
NOTEBOOK_MAX_Y = 440
BODY_ZONE = (190, 510, 180, 560)   # (y0, y1, x0, x1) vùng da hợp lệ (tai, gáy, tay)

# ---- Ngưỡng màu ------------------------------------------------------------------------------
OUTLINE_LUM = 32
HAIR_MAX_LUM = 215
HAIR_MAX_SAT = 45
HEAD_OUTLINE_PX = 7
EAR_KEEP_PX = 4
CASE_EDGE_TOLERANCE = 4
SOLID_ALPHA = 200
RESTORE_FROM_Y = 290
SKIN_MIN_COMPONENT_PX = 40

# ---- Bảng màu --------------------------------------------------------------------------------
HAIR_RAMPS = {  # (màu vùng tối, màu vùng sáng) — giữ nguyên nét viền đen
    'black': None,
    'dark_brown': ((28, 18, 12), (120, 85, 60)),
    'brown': ((45, 26, 14), (175, 120, 75)),
    'chestnut': ((55, 18, 8), (195, 95, 55)),
}
SKIN_TONES = {'light': None, 'tan': (222, 170, 128), 'deep': (160, 108, 72)}
SKIN_BASE = (252, 212, 182)
ACCENT_COLORS = {'red': (222, 38, 48), 'pink': (245, 110, 170), 'blue': (60, 130, 230), 'yellow': (250, 195, 40)}
SHIRT_TINTS = {'white': None, 'blue': (190, 222, 250)}
HAIR_BASE_COLOR = (55, 53, 63)
OUTLINE_COLOR = (18, 14, 16)
HIGHLIGHT_COLOR = (150, 148, 160)

# ---- Hình phụ kiện ---------------------------------------------------------------------------
BUN_CENTER = (367, 236)
BUN_RADII = (78, 62)
BUN_TIE_CENTER = (367, 182)
BUN_TIE_RADII = (46, 16)
LINE_WIDTH = 6
HEADBAND_BOX = (217, 35, 517, 365)   # hình elip chứa cung băng đô
HEADBAND_ARC = (200, 340)            # góc (độ) của cung phía trên đỉnh đầu
HEADBAND_WIDTH = 26
CAP_BOTTOM_Y = 132                  # mép dưới mũ lưỡi trai ở giữa gáy (nhìn từ sau)
CAP_SIDE_DROP = 34                  # mép mũ cong xuống thêm ở 2 bên
CAP_HALF_WIDTH = 165
CAP_OPENING_RADIUS = 28             # khe cài phía sau mũ (lộ tóc)
CAP_STRAP_HEIGHT = 9
CAP_BUTTON_CENTER = (367, 16)
CAP_BUTTON_RADIUS = 10
CAP_SHADE_RANGE = (0.78, 1.18)      # giữ sáng tối của tóc bên dưới cho mũ có khối


@dataclass(frozen=True)
class Variant:
    id: str
    hair_style: str               # 'pigtails' | 'short' | 'bun' | 'headband' | 'cap'
    hair: str = 'black'
    accent: str = 'red'
    skin: str = 'light'
    shirt: str = 'white'


VARIANTS = [
    Variant('girl-pigtails-red', 'pigtails'),
    Variant('girl-pigtails-pink', 'pigtails', hair='dark_brown', accent='pink'),
    Variant('girl-pigtails-blue', 'pigtails', accent='blue', skin='tan'),
    Variant('girl-bun-red', 'bun'),
    Variant('girl-bun-yellow', 'bun', hair='brown', accent='yellow', shirt='blue'),
    Variant('girl-headband-pink', 'headband', accent='pink', skin='tan'),
    Variant('boy-short-black', 'short'),
    Variant('boy-short-brown', 'short', hair='brown'),
    Variant('boy-cap-blue', 'cap', accent='blue', skin='tan'),
    Variant('boy-short-chestnut', 'short', hair='chestnut', shirt='blue'),
    Variant('boy-short-deep', 'short', skin='deep', shirt='blue'),
    Variant('boy-cap-red', 'cap', hair='dark_brown', accent='red', shirt='blue'),
]


# ---- Tiện ích --------------------------------------------------------------------------------
def luminance(rgb: np.ndarray) -> np.ndarray:
    return (rgb[..., 0] * 299 + rgb[..., 1] * 587 + rgb[..., 2] * 114) // 1000


def saturation(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., :3].max(axis=2) - rgb[..., :3].min(axis=2)


def is_red_mask(im: np.ndarray) -> np.ndarray:
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return (r > 140) & (g < 110) & (b < 110) & ((r - g) > 70)


def is_skin_mask(im: np.ndarray) -> np.ndarray:
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    return (r > 200) & (g > 150) & (b > 120) & (r > b + 25) & ~is_red_mask(im) & (a > 128)


def head_interior_mask(im: np.ndarray) -> np.ndarray:
    lum = luminance(im)
    barrier = (im[..., 3] < 128) | is_red_mask(im) | is_skin_mask(im) | (lum < OUTLINE_LUM)
    labels, _ = ndimage.label(~barrier)
    return labels == labels[HEAD_SEED]


def grid(shape):
    return np.mgrid[0:shape[0], 0:shape[1]]


# ---- Bước 1: bỏ bím tóc + nơ -----------------------------------------------------------------
def remove_pigtails(src: np.ndarray) -> np.ndarray:
    im = src.astype(np.int32)
    yy, xx = grid(im.shape)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    lum = luminance(im)
    is_red = is_red_mask(im)
    is_skin = is_skin_mask(im)

    head_interior = head_interior_mask(im)
    head_mask = ndimage.binary_dilation(head_interior, iterations=HEAD_OUTLINE_PX)
    ear_band = (yy >= EAR_Y_RANGE[0]) & (yy <= EAR_Y_RANGE[1])
    ear_mask = ndimage.binary_dilation(is_skin & ear_band, iterations=EAR_KEEP_PX)
    above_desk = yy < DESK_LINE_Y
    pencil_case = (yy >= PENCIL_CASE_KEEP[0]) & (xx >= PENCIL_CASE_KEEP[1])

    out = im.copy()
    out[above_desk & ~head_mask & ~ear_mask & ~pencil_case & (a >= 128), 3] = 0
    hair_color = np.median(im[head_interior & (lum < 90)][:, :3], axis=0).astype(np.int32)
    out[above_desk & head_mask & is_red, :3] = hair_color

    # Mẩu bím tóc đè lên hộp bút: trong thân hộp -> màu hộp, phía trên mép hộp -> trong suốt
    case_zone = (yy >= CASE_Y[0]) & (yy < CASE_Y[1]) & (xx >= CASE_X[0]) & (xx < CASE_X[1])
    case_purple = case_zone & (b > r + 15) & (b > g + 25) & (a > 200)
    case_color = np.median(im[case_purple][:, :3], axis=0).astype(np.int32)
    sat = saturation(im)
    is_hair_like = (lum < 120) & (sat < 40) & (a > 128)
    is_hair_highlight = (lum < 235) & (sat < 40) & (a > 64)
    for x in range(*CASE_X):
        column = np.where(case_purple[:, x])[0]
        if column.size == 0:
            continue
        case_top = int(column.min())
        for y in range(CASE_Y[0], DESK_LINE_Y + CASE_EDGE_TOLERANCE):
            if head_mask[y, x]:
                continue
            if y < case_top - CASE_EDGE_TOLERANCE and is_hair_highlight[y, x]:
                out[y, x, 3] = 0
                continue
            if not is_hair_like[y, x]:
                continue
            if y >= case_top + CASE_EDGE_TOLERANCE:
                out[y, x, :3] = case_color
            elif y < case_top - CASE_EDGE_TOLERANCE:
                out[y, x, 3] = 0
    return out.astype(np.uint8)


# ---- Bước 2: phụ kiện ------------------------------------------------------------------------
def ellipse_box(center, radii):
    (cx, cy), (rx, ry) = center, radii
    return (cx - rx, cy - ry, cx + rx, cy + ry)


def draw_bun(src: np.ndarray, accent: Color) -> np.ndarray:
    """Búi tóc thấp ở gáy (nhìn từ sau) + dây buộc màu phía trên búi."""
    image = Image.fromarray(src, 'RGBA')
    draw = ImageDraw.Draw(image)
    draw.ellipse(ellipse_box(BUN_CENTER, BUN_RADII), fill=HAIR_BASE_COLOR + (255,), outline=OUTLINE_COLOR + (255,), width=LINE_WIDTH)
    cx, cy = BUN_CENTER
    rx, ry = BUN_RADII
    draw.arc((cx - rx + 18, cy - ry + 14, cx + rx - 18, cy + ry - 10), 200, 300, fill=HIGHLIGHT_COLOR + (255,), width=LINE_WIDTH)
    draw.ellipse(ellipse_box(BUN_TIE_CENTER, BUN_TIE_RADII), fill=accent + (255,), outline=OUTLINE_COLOR + (255,), width=LINE_WIDTH - 1)
    return np.array(image)


def draw_headband(src: np.ndarray, accent: Color) -> np.ndarray:
    """Băng đô vắt qua đỉnh đầu, chỉ vẽ trong phạm vi tóc của đầu."""
    layer = Image.new('RGBA', (src.shape[1], src.shape[0]), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.arc(HEADBAND_BOX, *HEADBAND_ARC, fill=OUTLINE_COLOR + (255,), width=HEADBAND_WIDTH + 2 * LINE_WIDTH)
    inner = (HEADBAND_BOX[0] + LINE_WIDTH, HEADBAND_BOX[1] + LINE_WIDTH, HEADBAND_BOX[2] - LINE_WIDTH, HEADBAND_BOX[3] - LINE_WIDTH)
    draw.arc(inner, *HEADBAND_ARC, fill=accent + (255,), width=HEADBAND_WIDTH)
    band = np.array(layer)
    head = ndimage.binary_dilation(head_interior_mask(src.astype(np.int32)), iterations=2)
    out = src.copy()
    paint = head & (band[..., 3] > 0)
    out[paint, :3] = band[paint, :3]
    return out


def draw_cap(src: np.ndarray, accent: Color) -> np.ndarray:
    """Mũ lưỡi trai nhìn từ sau: phủ đỉnh đầu, mép cong xuống 2 bên, nút chóp, khe cài lộ tóc + quai mũ."""
    im = src.astype(np.int32)
    yy, xx = grid(im.shape)
    head = head_interior_mask(im)
    cx = CAP_BUTTON_CENTER[0]
    bottom = CAP_BOTTOM_Y + CAP_SIDE_DROP * ((xx - cx) / CAP_HALF_WIDTH) ** 2
    distance_to_opening = np.sqrt((xx - cx) ** 2 + (yy - CAP_BOTTOM_Y) ** 2)
    opening = distance_to_opening < CAP_OPENING_RADIUS
    cap = head & (yy < bottom) & ~opening

    lum = luminance(im).astype(np.float64)
    low, high = CAP_SHADE_RANGE
    shade = low + (high - low) * np.clip((lum - OUTLINE_LUM) / (HAIR_MAX_LUM - OUTLINE_LUM), 0, 1)
    out = im.astype(np.float64)
    out[cap, :3] = np.array(accent, dtype=np.float64) * shade[cap][:, None]

    half_line = LINE_WIDTH / 2
    strap = opening & head & (yy >= CAP_BOTTOM_Y - CAP_STRAP_HEIGHT) & (yy < CAP_BOTTOM_Y)
    out[strap, :3] = np.array(accent, dtype=np.float64) * low
    rim = head & (np.abs(yy - bottom) < half_line) & ~opening
    opening_rim = head & (np.abs(distance_to_opening - CAP_OPENING_RADIUS) < half_line) & (yy < CAP_BOTTOM_Y)
    out[rim | opening_rim, :3] = OUTLINE_COLOR

    image = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    draw = ImageDraw.Draw(image)
    draw.ellipse(
        ellipse_box(CAP_BUTTON_CENTER, (CAP_BUTTON_RADIUS, CAP_BUTTON_RADIUS)),
        fill=accent + (255,),
        outline=OUTLINE_COLOR + (255,),
        width=LINE_WIDTH - 2,
    )
    return np.array(image)


# ---- Bước 3: khôi phục độ đục ----------------------------------------------------------------
def restore_interior_opacity(src: np.ndarray) -> np.ndarray:
    out = src.copy()
    alpha = out[..., 3]
    inside = ndimage.binary_fill_holes(alpha > SOLID_ALPHA)
    rows = np.arange(out.shape[0])[:, None]
    out[inside & (alpha < 255) & (rows >= RESTORE_FROM_Y), 3] = 255
    return out


# ---- Bước 4: đổi màu -------------------------------------------------------------------------
def build_skin_mask(im: np.ndarray) -> np.ndarray:
    """Da thật (tai, gáy, tay): thành phần màu da trong vùng thân người, loại vân gỗ bàn (kênh B thấp)."""
    candidate = is_skin_mask(im)
    labels, count = ndimage.label(candidate)
    y0, y1, x0, x1 = BODY_ZONE
    mask = np.zeros(candidate.shape, dtype=bool)
    for idx, region in enumerate(ndimage.find_objects(labels), start=1):
        component = labels == idx
        size = int(component.sum())
        if size < SKIN_MIN_COMPONENT_PX:
            continue
        cy = (region[0].start + region[0].stop) / 2
        cx = (region[1].start + region[1].stop) / 2
        if not (y0 <= cy <= y1 and x0 <= cx <= x1):
            continue
        r, g, b = np.median(im[component][:, :3], axis=0)
        is_light_skin = b >= 150
        is_pink_shade = g < 175 and r - g > 60
        if is_light_skin or is_pink_shade:
            mask |= component
    return mask


def build_shirt_mask(im: np.ndarray) -> np.ndarray:
    yy, xx = grid(im.shape)
    y0, y1, x0, x1 = SHIRT_BOX
    in_box = (yy >= y0) & (yy < y1) & (xx >= x0) & (xx < x1)
    notebook = (yy < NOTEBOOK_MAX_Y) & ((xx < NOTEBOOK_EDGE_X[0]) | (xx > NOTEBOOK_EDGE_X[1]))
    light = (luminance(im) > 165) & (saturation(im) < 50) & (im[..., 3] > 128)
    return in_box & ~notebook & light


def build_hair_mask(im: np.ndarray) -> np.ndarray:
    yy, xx = grid(im.shape)
    lum = luminance(im)
    pencil_case = (yy >= PENCIL_CASE_KEEP[0]) & (xx >= PENCIL_CASE_KEEP[1])
    return (
        (yy < HAIR_MAX_Y)
        & (xx >= HAIR_X_RANGE[0]) & (xx < HAIR_X_RANGE[1])
        & (lum >= OUTLINE_LUM) & (lum <= HAIR_MAX_LUM)
        & (saturation(im) < HAIR_MAX_SAT)
        & (im[..., 3] > 128)
        & ~pencil_case
        & ~is_skin_mask(im)
    )


def recolor_hair(im: np.ndarray, ramp) -> np.ndarray:
    if ramp is None:
        return im
    out = im.astype(np.float64)
    mask = build_hair_mask(im.astype(np.int32))
    lum = luminance(im.astype(np.int32)).astype(np.float64)
    t = np.clip((lum - OUTLINE_LUM) / (HAIR_MAX_LUM - OUTLINE_LUM), 0, 1) ** 0.8
    dark, light = np.array(ramp[0], dtype=np.float64), np.array(ramp[1], dtype=np.float64)
    out[mask, :3] = dark + (light - dark) * t[mask][:, None]
    return np.clip(out, 0, 255).astype(np.uint8)


def recolor_accent(im: np.ndarray, color: Color) -> np.ndarray:
    """Đổi màu nơ / ruy băng (pixel đỏ phía trên BOW_MAX_Y), giữ sáng tối."""
    if color == ACCENT_COLORS['red']:
        return im
    yy, _ = grid(im.shape)
    mask = is_red_mask(im.astype(np.int32)) & (yy < BOW_MAX_Y)
    if not mask.any():
        return im
    out = im.astype(np.float64)
    lum = luminance(im.astype(np.int32)).astype(np.float64)
    shade = lum[mask] / np.median(lum[mask])
    out[mask, :3] = np.array(color, dtype=np.float64) * shade[:, None]
    return np.clip(out, 0, 255).astype(np.uint8)


def recolor_by_ratio(im: np.ndarray, mask: np.ndarray, target: Optional[Color], base: Color) -> np.ndarray:
    if target is None:
        return im
    out = im.astype(np.float64)
    out[mask, :3] *= np.array(target, dtype=np.float64) / np.array(base, dtype=np.float64)
    return np.clip(out, 0, 255).astype(np.uint8)


# ---- Xuất ------------------------------------------------------------------------------------
def export(pixels: np.ndarray, path: Path) -> None:
    image = Image.fromarray(pixels, 'RGBA')
    width, height = image.size
    image.resize((round(width * TARGET_HEIGHT / height), TARGET_HEIGHT), Image.LANCZOS).save(path, optimize=True)


def build_variant(variant: Variant, girl: np.ndarray, short_hair: np.ndarray, skin_mask, shirt_mask) -> np.ndarray:
    accent = ACCENT_COLORS[variant.accent]
    base = girl if variant.hair_style == 'pigtails' else short_hair
    if variant.hair_style == 'bun':
        base = draw_bun(base, accent)
    if variant.hair_style == 'headband':
        base = draw_headband(base, accent)
    if variant.hair_style == 'cap':
        base = draw_cap(base, accent)
    pixels = restore_interior_opacity(base)
    if variant.hair_style == 'pigtails':
        pixels = recolor_accent(pixels, accent)
    pixels = recolor_hair(pixels, HAIR_RAMPS[variant.hair])
    pixels = recolor_by_ratio(pixels, skin_mask, SKIN_TONES[variant.skin], SKIN_BASE)
    pixels = recolor_by_ratio(pixels, shirt_mask, SHIRT_TINTS[variant.shirt], (255, 255, 255))
    return pixels


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    girl = np.array(Image.open(SOURCE).convert('RGBA'))
    short_hair = remove_pigtails(girl)
    reference = restore_interior_opacity(girl).astype(np.int32)
    skin_mask = build_skin_mask(reference)
    shirt_mask = build_shirt_mask(reference)
    for variant in VARIANTS:
        export(build_variant(variant, girl, short_hair, skin_mask, shirt_mask), OUTPUT_DIR / f'{variant.id}.png')
        print('exported', variant.id)


if __name__ == '__main__':
    main()

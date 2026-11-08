#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PADRE MX (Key 04: 04_Nhom_Ong_Gia_Trung_Tri_Mexico) — Thumbnail & Green-Screen Cutout Engine (V1.2.1)
-----------------------------------------------------------------------------------------------------
Thực hiện tự động cho mỗi kịch bản thuộc Key 04_Nhom_Ong_Gia_Trung_Tri_Mexico:
1. Tạo ảnh THUMBNAIL.png (1920x1080, RGB):
   - Bố cục 80/20 chuẩn Mexico Padre:
     * 80% bên trái (0..1507px): Nền trắng sạch (#FFFFFF), chữ tiêu đề tiếng Tây Ban Nha IN HOA đậm
       phối 3 cụm màu (Đen #0A0A0A / Xanh Cyan #068C9B / Cam Đậm #E65500) + Thanh Banner Đỏ (#C81010)
       dưới đáy với chữ Vàng (#FFE600) nổi bật.
     * 20% bên phải (1507..1920px): Nền nội thất ấm mờ + Chân dung ông già Mexico khắc khổ (tỉ lệ 1:1 chuẩn, không méo).
2. Tạo ảnh THUMBNAIL-NENXANH.png (1920x1080, RGB):
   - Giữ nguyên 100% chân dung ông già ở cùng vị trí/kích thước như THUMBNAIL.png.
   - Toàn bộ phần nền và 80% bên trái phủ xanh lá thuần #00FF00 (RGB 0, 255, 0), tuyệt đối không có chữ.
   - Đạt chuẩn kiểm định validate_thumbnail_pair.py (pass = True).
3. Tự động quét & cắt gọn ảnh nền xanh (Auto-Scan & Tight Crop):
   - Quét vùng pixel nhân vật không phải #00FF00 trên ảnh nền xanh.
   - Cắt sát khung bao (bounding box) của nhân vật với đầy đủ hai vai tự nhiên và đặt sát đáy (pad_bottom = 0)
     để gắn vào góc dưới bên trái (Bottom-Left: x=16, y=1080-height) của video cho riêng từng kịch bản.
"""

from __future__ import annotations

import os
import re
import sys
import json
import shutil
import hashlib
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ENGINE_DIR = Path(__file__).resolve().parent
APP_ROOT = ENGINE_DIR.parent
SKILL_REF_DIR = (
    APP_ROOT
    / "skills"
    / "skills_12_keys"
    / "04_Nhom_Ong_Gia_Trung_Tri_Mexico"
    / "05_SEO"
    / "references"
)

PURE_GREEN: Tuple[int, int, int] = (0, 255, 0)
CANVAS_W = 1920
CANVAS_H = 1080
SPLIT_X = int(CANVAS_W * 0.785)  # 1507px (đảm bảo vùng trái 78% của validator 100% sạch)


def is_green_screen_pixel(r: int, g: int, b: int) -> bool:
    """Kiểm tra pixel có thuộc nền xanh #00FF00 hoặc viền xanh lá studio không."""
    return g >= 75 and r <= 125 and b <= 125 and (g - max(r, b)) >= 26


def _load_bold_font(size: int) -> ImageFont.FreeTypeFont:
    """Ưu tiên font đậm hỗ trợ đầy đủ dấu tiếng Tây Ban Nha (ÁÉÍÓÚÑ¡¿)."""
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\impact.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\tahomabd.ttf",
        r"C:\Windows\Fonts\verdanab.ttf",
    ]
    for fp in candidates:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def _select_portrait_source(project_dir: Path, project_seed: str) -> Path:
    """
    Chọn ảnh chân dung ông già Mexico nền xanh cho kịch bản:
    1. Ưu tiên custom_green_source.png trong thư mục dự án nếu người dùng đặt riêng.
    2. Tiếp theo xoay vòng/chọn định danh theo project_seed từ bộ chân dung ông già Mexico
       trong references/portraits/padre_mx_*.png.
    3. Fallback về references/example_green_screen.png.
    """
    custom_green = project_dir / "custom_green_source.png"
    if custom_green.exists():
        return custom_green

    portraits_dir = SKILL_REF_DIR / "portraits"
    if portraits_dir.exists():
        candidates = sorted(portraits_dir.glob("padre_mx_*.png"))
        if candidates:
            digest = hashlib.md5((project_seed or "default").encode("utf-8", errors="ignore")).digest()
            idx = digest[0] % len(candidates)
            return candidates[idx]

    fallback = SKILL_REF_DIR / "example_green_screen.png"
    if fallback.exists():
        return fallback
    raise FileNotFoundError(f"Không tìm thấy ảnh nguồn nền xanh tại: {SKILL_REF_DIR}")


def _extract_subject_rgba_from_green_ref(
    green_img_path: Path,
    project_seed: str = "",
) -> Tuple[Image.Image, Image.Image]:
    """
    Tách chủ thể ông già Mexico (RGBA) và tạo nền nội thất ấm mờ bên phải.
    Áp dụng biến thiên nhẹ về sắc độ ấm/tương phản theo từng project_seed để mỗi kịch bản
    có dấu ấn riêng nhưng vẫn giữ chất lượng chân dung thực tế sắc nét.
    """
    im_green = Image.open(green_img_path).convert("RGB")
    gw, gh = im_green.size
    gpx = im_green.load()

    xs: List[int] = []
    ys: List[int] = []
    for y in range(gh):
        for x in range(gw):
            r, g, b = gpx[x, y]
            if not is_green_screen_pixel(r, g, b):
                xs.append(x)
                ys.append(y)

    if not xs or not ys:
        raise RuntimeError(f"Không tìm thấy nhân vật trên ảnh nền xanh: {green_img_path}")

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    crop_box = (min_x, min_y, max_x + 1, max_y + 1)
    subj_rgb = im_green.crop(crop_box)
    sw, sh = subj_rgb.size
    spx = subj_rgb.load()

    subj_rgba = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    rgba_px = subj_rgba.load()

    for y in range(sh):
        for x in range(sw):
            r, g, b = spx[x, y]
            if is_green_screen_pixel(r, g, b):
                rgba_px[x, y] = (0, 0, 0, 0)
            else:
                max_rb = max(r, b)
                if g > max_rb and (g - max_rb) > 15:
                    g_clean = int(max_rb + (g - max_rb) * 0.22)
                else:
                    g_clean = g
                rgba_px[x, y] = (r, g_clean, b, 255)

    if project_seed:
        digest = hashlib.md5(project_seed.encode("utf-8", errors="ignore")).digest()
        contrast_factor = 0.98 + (digest[1] % 7) * 0.01
        brightness_factor = 0.98 + (digest[2] % 6) * 0.01
        color_factor = 0.96 + (digest[3] % 9) * 0.01
        rgb_part = subj_rgba.convert("RGB")
        rgb_part = ImageEnhance.Contrast(rgb_part).enhance(contrast_factor)
        rgb_part = ImageEnhance.Brightness(rgb_part).enhance(brightness_factor)
        rgb_part = ImageEnhance.Color(rgb_part).enhance(color_factor)
        r_ch, g_ch, b_ch = rgb_part.split()
        _, _, _, a_ch = subj_rgba.split()
        subj_rgba = Image.merge("RGBA", (r_ch, g_ch, b_ch, a_ch))

    # Tạo nền nội thất ấm mờ (Warm Mexican Interior Backdrop) cho vùng 20% bên phải của THUMBNAIL.png
    right_w = CANVAS_W - SPLIT_X
    backdrop = Image.new("RGB", (right_w, CANVAS_H), (92, 68, 48))
    bdraw = ImageDraw.Draw(backdrop)
    for y in range(CANVAS_H):
        ratio = y / float(CANVAS_H)
        r_bg = int(135 * (1.0 - ratio * 0.45) + 45 * ratio)
        g_bg = int(98 * (1.0 - ratio * 0.45) + 32 * ratio)
        b_bg = int(66 * (1.0 - ratio * 0.45) + 22 * ratio)
        bdraw.line([(0, y), (right_w, y)], fill=(r_bg, g_bg, b_bg))
    glow = Image.new("RGB", (right_w, CANVAS_H), (0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        [int(right_w * 0.05), int(CANVAS_H * 0.04), int(right_w * 0.95), int(CANVAS_H * 0.65)],
        fill=(75, 52, 30),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=48))
    backdrop = Image.blend(backdrop, glow, alpha=0.35)

    return subj_rgba, backdrop


def _parse_headline_and_kicker_from_seo(
    winner_title: str,
    seo_text: str = "",
) -> Tuple[List[str], str]:
    """
    Trích xuất các dòng chữ lớn (bên trái 80%) và dòng Kicker (thanh đỏ dưới đáy)
    từ STEP6_SEO_PACKAGE.md hoặc tự động chia nhịp từ LOCKED_TITLE tiếng Tây Ban Nha.
    """
    headline_lines: List[str] = []
    kicker_line: str = ""

    if seo_text:
        m_left = re.search(
            r"##\s*TEXTO MINIATURA[^\n]*\n(.*?)(?=\n##|\Z)",
            seo_text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if m_left:
            raw_lines = [
                re.sub(r"^[\-\*\d\.\)\s\"“”']+|[\"“”'\s]+$", "", ln.strip())
                for ln in m_left.group(1).strip().splitlines()
                if ln.strip()
            ]
            headline_lines = [ln.upper() for ln in raw_lines if len(ln) >= 3][:6]

        m_kicker = re.search(
            r"##\s*TEXTO BANNER ROJO[^\n]*\n(.*?)(?=\n##|\Z)",
            seo_text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if m_kicker:
            for ln in m_kicker.group(1).strip().splitlines():
                clean_k = re.sub(r"^[\-\*\d\.\)\s\"“”']+|[\"“”'\s]+$", "", ln.strip())
                if clean_k:
                    kicker_line = clean_k.upper()
                    break

        if not headline_lines:
            m_thumb_sec = re.search(
                r"##\s*Imagen THUMBNAIL\b(?!-NENXANH)(.*?)(?=\n##\s*Imagen THUMBNAIL-NENXANH|\Z)",
                seo_text,
                flags=re.IGNORECASE | re.DOTALL,
            )
            if m_thumb_sec:
                quoted = re.findall(r"[\"“]([^\"”]{8,140})[\"”]", m_thumb_sec.group(1))
                if quoted:
                    main_quote = quoted[0].strip().upper()
                    if len(quoted) >= 2 and not kicker_line:
                        kicker_line = quoted[1].strip().upper()
                    winner_title = main_quote

    clean_title = (winner_title or "").strip()
    clean_title = re.sub(r"\s+", " ", clean_title)

    if not kicker_line:
        parts_by_punct = [p.strip() for p in re.split(r"[\.!\?]+|\s+—\s+|\s+-\s+", clean_title) if p.strip()]
        if len(parts_by_punct) >= 2 and len(parts_by_punct[-1]) <= 46:
            kicker_line = parts_by_punct[-1].upper()
            clean_title = " ".join(parts_by_punct[:-1])
        else:
            kicker_line = "¡ÉL ABRIÓ LA CARPETA Y TODOS CALLARON!"

    if not kicker_line.startswith("¡"):
        kicker_line = "¡" + kicker_line.lstrip("¡!")
    if not kicker_line.endswith("!"):
        kicker_line = kicker_line.rstrip(".?") + "!"

    if not headline_lines:
        words = clean_title.upper().split()
        if len(words) > 20:
            words = words[:20]
        target_lines = 5 if len(words) <= 15 else 6
        avg_words = max(2, int(round(len(words) / float(target_lines))))
        cur: List[str] = []
        for w in words:
            cur.append(w)
            if len(cur) >= avg_words and len(headline_lines) < target_lines - 1:
                headline_lines.append(" ".join(cur))
                cur = []
        if cur:
            headline_lines.append(" ".join(cur))

    return headline_lines[:6], kicker_line


def _draw_headline_80_zone(
    canvas: Image.Image,
    headline_lines: List[str],
    kicker_line: str,
) -> None:
    """
    Vẽ vùng 80% bên trái (0..SPLIT_X) trên THUMBNAIL.png:
    - Nền trắng sạch (#FFFFFF) từ y=0..895
    - Các dòng chữ IN HOA căn giữa theo 3 tầng màu: Đen -> Xanh Cyan -> Cam Đậm
    - Thanh Banner Đỏ (#C81010) ở đáy (y=896..1080) với chữ Vàng (#FFE600)
    """
    draw = ImageDraw.Draw(canvas)
    banner_top = 896
    left_w = SPLIT_X

    draw.rectangle([0, 0, left_w, banner_top], fill=(255, 255, 255))
    draw.line([(left_w - 2, 0), (left_w - 2, banner_top)], fill=(225, 225, 225), width=4)

    n_lines = max(1, len(headline_lines))
    avail_h = banner_top - 44
    line_slot_h = int(avail_h / n_lines)

    def _line_color(idx: int, total: int) -> Tuple[int, int, int]:
        if idx < 2:
            return (12, 12, 12)
        elif idx < max(3, total - 2):
            return (6, 134, 150)
        else:
            return (230, 88, 0)

    max_text_w = left_w - 76
    for i, line_text in enumerate(headline_lines):
        font_size = min(116, int(line_slot_h * 0.76))
        font = _load_bold_font(font_size)
        bbox = draw.textbbox((0, 0), line_text, font=font)
        tw = bbox[2] - bbox[0]
        while tw > max_text_w and font_size > 44:
            font_size -= 4
            font = _load_bold_font(font_size)
            bbox = draw.textbbox((0, 0), line_text, font=font)
            tw = bbox[2] - bbox[0]

        th = bbox[3] - bbox[1]
        tx = int((left_w - tw) / 2)
        ty = 22 + i * line_slot_h + int((line_slot_h - th) / 2) - bbox[1]

        color = _line_color(i, n_lines)
        if color != (12, 12, 12):
            draw.text((tx + 3, ty + 3), line_text, font=font, fill=(25, 25, 25))
        draw.text((tx, ty), line_text, font=font, fill=color)

    draw.rectangle([0, banner_top, left_w, CANVAS_H], fill=(200, 16, 16))
    draw.line([(0, banner_top), (left_w, banner_top)], fill=(150, 0, 0), width=4)

    k_size = 90
    k_font = _load_bold_font(k_size)
    kbbox = draw.textbbox((0, 0), kicker_line, font=k_font)
    kw = kbbox[2] - kbbox[0]
    while kw > (left_w - 64) and k_size > 40:
        k_size -= 4
        k_font = _load_bold_font(k_size)
        kbbox = draw.textbbox((0, 0), kicker_line, font=k_font)
        kw = kbbox[2] - kbbox[0]

    kh = kbbox[3] - kbbox[1]
    kx = int((left_w - kw) / 2)
    ky = banner_top + int(((CANVAS_H - banner_top) - kh) / 2) - kbbox[1]

    for ox, oy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, 4)]:
        draw.text((kx + ox, ky + oy), kicker_line, font=k_font, fill=(15, 5, 5))
    draw.text((kx, ky), kicker_line, font=k_font, fill=(255, 232, 0))


def _scan_and_crop_bottom_left_green_image(
    green_source_img: Image.Image,
    mirror_for_bottom_left: bool = False,
) -> Tuple[Image.Image, Dict[str, Any]]:
    """
    Quét ảnh nền xanh để tìm đúng vùng nhân vật không phải #00FF00,
    cắt gọn khung bao (bounding box) quanh nhân vật và đặt sát đáy (pad_bottom = 0).
    """
    w, h = green_source_img.size
    px = green_source_img.load()

    xs: List[int] = []
    ys: List[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (r, g, b) != PURE_GREEN and not is_green_screen_pixel(r, g, b):
                xs.append(x)
                ys.append(y)

    if not xs or not ys:
        raise RuntimeError("Không tìm thấy vùng nhân vật khi quét ảnh nền xanh")

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    pad_x = 14
    pad_top = 14
    crop_x1 = max(0, min_x - pad_x)
    crop_y1 = max(0, min_y - pad_top)
    crop_x2 = min(w, max_x + 1 + pad_x)
    crop_y2 = min(h, max_y + 1)  # Sát đáy 100% (pad_bottom = 0)

    cropped = green_source_img.crop((crop_x1, crop_y1, crop_x2, crop_y2)).convert("RGB")
    if mirror_for_bottom_left:
        cropped = cropped.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    cw, ch = cropped.size
    cpx = cropped.load()
    for y in range(ch):
        for x in range(cw):
            r, g, b = cpx[x, y]
            if is_green_screen_pixel(r, g, b):
                cpx[x, y] = PURE_GREEN

    # Tọa độ chuẩn ở góc trái bên dưới (Bottom-Left) trên khung video 1920x1080 (kích thước gấp 2 lần: cao 740px)
    target_h = 740
    target_w = max(460, min(680, int(round(target_h * (cw / float(ch))))))
    target_x = 0  # Đặt sát góc trái video
    target_y = CANVAS_H - target_h  # Sát đáy 1080 (y = 340)

    placement_meta = {
        "source_canvas_size": [w, h],
        "scanned_subject_bbox": [min_x, min_y, max_x, max_y],
        "cropped_box": [crop_x1, crop_y1, crop_x2, crop_y2],
        "cropped_size": [cw, ch],
        "mirrored_for_bottom_left": mirror_for_bottom_left,
        "video_canvas_size": [CANVAS_W, CANVAS_H],
        "recommended_placement": {
            "position": "BOTTOM_LEFT",
            "x": target_x,
            "y": target_y,
            "width": target_w,
            "height": target_h,
            "keyColor": "#00FF00",
            "similarity": 0.32,
            "blend": 0.08,
        },
    }
    return cropped, placement_meta


def validate_pair_metrics(thumb_path: Path, green_path: Path) -> Dict[str, Any]:
    """Kiểm định cặp THUMBNAIL.png & THUMBNAIL-NENXANH.png theo đúng tiêu chuẩn validate_thumbnail_pair.py."""
    thumb = Image.open(thumb_path).convert("RGB")
    green = Image.open(green_path).convert("RGB")
    w, h = thumb.size
    size_ok = thumb.size == (CANVAS_W, CANVAS_H) == green.size
    split_x = int(w * 0.78)

    gpx = green.load()
    tpx = thumb.load()

    left_total = split_x * h
    right_total = (w - split_x) * h
    left_exact_key = 0
    right_non_green = 0
    left_white = 0

    for y in range(h):
        for x in range(w):
            r, g, b = gpx[x, y]
            tr, tg, tb = tpx[x, y]
            if x < split_x:
                if (r, g, b) == PURE_GREEN:
                    left_exact_key += 1
                if tr >= 235 and tg >= 235 and tb >= 235:
                    left_white += 1
            else:
                if not is_green_screen_pixel(r, g, b):
                    right_non_green += 1

    left_exact_ratio = round(left_exact_key / max(left_total, 1), 4)
    right_non_green_ratio = round(right_non_green / max(right_total, 1), 4)
    left_white_ratio = round(left_white / max(left_total, 1), 4)

    passed = (
        size_ok
        and left_exact_ratio >= 0.985
        and right_non_green_ratio >= 0.18
        and left_white_ratio >= 0.30
    )
    return {
        "size_ok": size_ok,
        "dimensions": [w, h],
        "left_exact_key_ratio": left_exact_ratio,
        "right_non_green_ratio": right_non_green_ratio,
        "left_white_text_zone_ratio": left_white_ratio,
        "pass": passed,
    }


def generate_padre_mx_thumbnail_pair_and_cropped_green(
    project_id: str,
    project_dir: str | Path,
    winner_title: str = "",
    seo_text: str = "",
    tong_hop_base_name: Optional[str] = None,
    tong_hop_dir: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """
    Hàm chính tạo bộ 3 sản phẩm hình ảnh cho Key 04_Nhom_Ong_Gia_Trung_Tri_Mexico:
      1. THUMBNAIL.png (1920x1080)
      2. THUMBNAIL-NENXANH.png (1920x1080, nền #00FF00 chuẩn chroma key)
      3. GREEN_CUTOUT_BOTTOM_LEFT.png & {TenKichBan}_KB.png / {TenKichBan}.png (ảnh nền xanh đã quét & cắt gọn
         để gắn vào góc trái bên dưới của riêng kịch bản đó).
    """
    p_dir = Path(project_dir)
    p_dir.mkdir(parents=True, exist_ok=True)

    if not winner_title:
        for cand in ["LOCKED_TITLE.txt", "01_title_rewrite.txt"]:
            fp = p_dir / cand
            if fp.exists():
                winner_title = fp.read_text(encoding="utf-8", errors="ignore").strip().splitlines()[0]
                break
    if not seo_text:
        for cand in ["STEP6_SEO_PACKAGE.md", "05_seo_bundle.txt", "FULL_SEO.txt"]:
            fp = p_dir / cand
            if fp.exists():
                seo_text = fp.read_text(encoding="utf-8", errors="ignore")
                break

    project_seed = f"{project_id}:{winner_title}"
    ref_green = _select_portrait_source(p_dir, project_seed)
    subj_rgba, right_backdrop = _extract_subject_rgba_from_green_ref(ref_green, project_seed=project_seed)

    # Giữ nguyên tỉ lệ 1:1 tự nhiên của nhân vật (không bóp ngang!)
    right_zone_w = CANVAS_W - SPLIT_X  # 413px
    target_subj_h = 1020
    scale = target_subj_h / float(subj_rgba.height)
    prop_w = max(right_zone_w, int(round(subj_rgba.width * scale)))
    subj_prop = subj_rgba.resize((prop_w, target_subj_h), Image.Resampling.LANCZOS)

    # Đối với bố cục 80/20 trên THUMBNAIL.png & THUMBNAIL-NENXANH.png:
    # Căn tâm khuôn mặt vào đúng giữa vùng 20% bên phải (413px), đồng thời bo tròn đường bờ vai trái
    # để trên THUMBNAIL-NENXANH.png vai nhân vật cong tự nhiên như ảnh chụp studio.
    if prop_w > right_zone_w:
        crop_left = int((prop_w - right_zone_w) * 0.42)
        subj_for_80_20 = subj_prop.crop((crop_left, 0, crop_left + right_zone_w, target_subj_h)).copy()
        s80_px = subj_for_80_20.load()
        shoulder_start_y = int(target_subj_h * 0.38)
        for y in range(shoulder_start_y, target_subj_h):
            prog = (y - shoulder_start_y) / float(max(1, target_subj_h - shoulder_start_y))
            # Đường cong bờ vai tự nhiên từ cổ/vai xuống cánh tay trái
            curve_cut_x = int(6 + 38 * ((1.0 - prog) ** 1.7))
            for x in range(0, min(curve_cut_x, right_zone_w)):
                s80_px[x, y] = (0, 0, 0, 0)
    else:
        subj_for_80_20 = subj_prop

    paste_x = CANVAS_W - subj_for_80_20.width
    paste_y = CANVAS_H - target_subj_h

    # 1. Dựng THUMBNAIL.png (1920x1080)
    thumb_canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))
    thumb_canvas.paste(right_backdrop, (SPLIT_X, 0))
    thumb_canvas.paste(subj_for_80_20, (paste_x, paste_y), subj_for_80_20)

    headline_lines, kicker_line = _parse_headline_and_kicker_from_seo(winner_title, seo_text)
    _draw_headline_80_zone(thumb_canvas, headline_lines, kicker_line)

    thumb_out_path = p_dir / "THUMBNAIL.png"
    thumb_canvas.save(thumb_out_path, format="PNG", optimize=True)

    # 2. Dựng THUMBNAIL-NENXANH.png (1920x1080) — Cùng nhân vật, cùng tọa độ (paste_x, paste_y), nền #00FF00 100%
    green_canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), PURE_GREEN)
    green_canvas.paste(subj_for_80_20, (paste_x, paste_y), subj_for_80_20)
    gpx = green_canvas.load()
    for y in range(CANVAS_H):
        for x in range(int(CANVAS_W * 0.78)):
            gpx[x, y] = PURE_GREEN

    green_out_path = p_dir / "THUMBNAIL-NENXANH.png"
    green_canvas.save(green_out_path, format="PNG", optimize=True)

    # 3. Kiểm định bằng validate_pair_metrics
    validation = validate_pair_metrics(thumb_out_path, green_out_path)

    # 4. Quét & cắt gọn ảnh nền xanh (với đầy đủ 2 vai tỉ lệ 1:1) để đặt ở góc trái bên dưới video
    full_shoulder_green = Image.new("RGB", (prop_w + 40, CANVAS_H), PURE_GREEN)
    full_shoulder_green.paste(subj_prop, (20, paste_y), subj_prop)
    cropped_green, placement_meta = _scan_and_crop_bottom_left_green_image(
        full_shoulder_green,
        mirror_for_bottom_left=False,
    )
    placement_meta["portrait_source"] = ref_green.name
    placement_meta["thumbnail_80_20_bbox"] = [paste_x, paste_y, CANVAS_W, CANVAS_H]

    cutout_out_path = p_dir / "GREEN_CUTOUT_BOTTOM_LEFT.png"
    cropped_green.save(cutout_out_path, format="PNG", optimize=True)

    meta_out_path = p_dir / "GREEN_PLACEMENT_META.json"
    placement_meta["project_id"] = project_id
    placement_meta["winner_title"] = winner_title
    placement_meta["headline_lines"] = headline_lines
    placement_meta["kicker_line"] = kicker_line
    placement_meta["validation"] = validation
    meta_out_path.write_text(json.dumps(placement_meta, ensure_ascii=False, indent=2), encoding="utf-8")

    exported_files: Dict[str, str] = {
        "thumbnail_path": str(thumb_out_path),
        "green_screen_full_path": str(green_out_path),
        "green_cutout_bottom_left_path": str(cutout_out_path),
        "placement_meta_path": str(meta_out_path),
    }

    # 5. Nếu có thư mục TONG HOP và tên kịch bản gốc (tong_hop_base_name), xuất đồng bộ sang TONG HOP
    if tong_hop_dir and tong_hop_base_name:
        th_dir = Path(tong_hop_dir)
        th_dir.mkdir(parents=True, exist_ok=True)
        clean_base = re.sub(r"_KB$", "", str(tong_hop_base_name).strip(), flags=re.IGNORECASE)

        th_thumb = th_dir / f"{clean_base}_THUMBNAIL.png"
        th_green_full = th_dir / f"{clean_base}_NENXANH.png"
        th_cutout_kb = th_dir / f"{clean_base}_KB.png"
        th_cutout_base = th_dir / f"{clean_base}.png"
        th_meta = th_dir / f"{clean_base}_GREEN_META.json"

        shutil.copy2(thumb_out_path, th_thumb)
        shutil.copy2(green_out_path, th_green_full)
        shutil.copy2(cutout_out_path, th_cutout_kb)
        shutil.copy2(cutout_out_path, th_cutout_base)
        shutil.copy2(meta_out_path, th_meta)

        exported_files.update({
            "tong_hop_thumbnail_path": str(th_thumb),
            "tong_hop_green_full_path": str(th_green_full),
            "tong_hop_green_cutout_kb_path": str(th_cutout_kb),
            "tong_hop_green_cutout_base_path": str(th_cutout_base),
            "tong_hop_meta_path": str(th_meta),
        })

    return {
        "success": True,
        "validation": validation,
        "placement_meta": placement_meta,
        "files": exported_files,
    }


def crop_existing_green_image_for_script(
    source_green_image_path: str | Path,
    output_cropped_path: str | Path,
    mirror_for_bottom_left: bool = False,
) -> Dict[str, Any]:
    """
    Hàm tiện ích cho Bàn #7: nếu người dùng hoặc kịch bản có sẵn 1 ảnh nền xanh 16:9 chưa cắt gọn,
    tự động quét vùng nhân vật, cắt gọn và trả về tọa độ đặt góc trái bên dưới.
    """
    src_path = Path(source_green_image_path)
    out_path = Path(output_cropped_path)
    im = Image.open(src_path).convert("RGB")
    w, h = im.size

    if w < h:
        target_h = 740
        target_w = max(460, min(680, int(round(target_h * (w / float(h))))))
        if src_path.resolve() != out_path.resolve():
            shutil.copy2(src_path, out_path)
        return {
            "success": True,
            "already_cropped": True,
            "cropped_path": str(out_path),
            "cropped_size": [w, h],
            "recommended_placement": {
                "position": "BOTTOM_LEFT",
                "x": 0,
                "y": CANVAS_H - target_h,
                "width": target_w,
                "height": target_h,
                "keyColor": "#00FF00",
                "similarity": 0.32,
                "blend": 0.08,
            },
        }

    px = im.load()
    right_edge_non_green = sum(
        1 for y in range(0, h, 4) if not is_green_screen_pixel(*px[w - 1, y])
    )
    should_mirror = mirror_for_bottom_left or (right_edge_non_green > 40)

    cropped, meta = _scan_and_crop_bottom_left_green_image(im, mirror_for_bottom_left=should_mirror)
    if should_mirror:
        meta["recommended_placement"]["x"] = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path, format="PNG", optimize=True)
    return {
        "success": True,
        "already_cropped": False,
        "cropped_path": str(out_path),
        "cropped_size": meta["cropped_size"],
        "recommended_placement": meta["recommended_placement"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PADRE MX Thumbnail + Green-Screen Generator & Auto-Cropper")
    parser.add_argument("--project-id", default="PADRE_MX_TEST")
    parser.add_argument("--project-dir", required=False, default="")
    parser.add_argument("--title", default="")
    parser.add_argument("--tong-hop-base", default="")
    parser.add_argument("--tong-hop-dir", default="")
    parser.add_argument("--crop-only-src", default="", help="Chỉ quét & cắt gọn 1 file ảnh nền xanh có sẵn")
    parser.add_argument("--crop-only-out", default="", help="Đường dẫn lưu file ảnh nền xanh đã cắt gọn")
    args = parser.parse_args()

    if args.crop_only_src and args.crop_only_out:
        res = crop_existing_green_image_for_script(args.crop_only_src, args.crop_only_out)
        print(json.dumps(res, ensure_ascii=False))
        return 0

    if not args.project_dir:
        print(json.dumps({"success": False, "error": "Missing --project-dir"}, ensure_ascii=False))
        return 1

    res = generate_padre_mx_thumbnail_pair_and_cropped_green(
        project_id=args.project_id,
        project_dir=args.project_dir,
        winner_title=args.title,
        tong_hop_base_name=args.tong_hop_base or None,
        tong_hop_dir=args.tong_hop_dir or None,
    )
    print(json.dumps(res, ensure_ascii=False))
    return 0 if res.get("validation", {}).get("pass", False) else 1


if __name__ == "__main__":
    raise SystemExit(main())

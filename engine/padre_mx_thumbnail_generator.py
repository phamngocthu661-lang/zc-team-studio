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


def _sanitize_raw_thumbnail_prompt(raw_p: str) -> str:
    """
    Làm sạch Prompt Thumbnail / Ảnh nền xanh (học & đồng bộ 100% từ `TOOL_NHAT_DRAMA/backend/adas_script_engine.py` dòng 3149–3221)
    để công cụ tạo ảnh của ChatGPT (`gpt-image-1`) LUÔN hiểu là tạo ảnh mới từ đầu với kích thước hợp lệ `1536x1024`
    (loại bỏ hoàn toàn các từ khóa edit/adjust/reduce/instead/reference, loại bỏ từ khóa trẻ vị thành niên child/teen/kid
    để không bao giờ vướng Content Guardrails của OpenAI).
    """
    txt = raw_p or ""
    txt = re.split(
        r"\n\s*(?:CRITICAL\s+RESTRICTIONS|STRICT\s+DESIGN\s+RULES|MANDATORY|FINAL\s+VISUAL\s+TEST|FINAL\s+QUALITY\s+INSPECTION)\s*[:：]?",
        txt,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]

    txt = re.sub(
        r"\b(?:3840\s*x\s*2160|1920\s*x\s*1080|1536\s*x\s*864|1280\s*x\s*720)\b",
        "1536x1024",
        txt,
        flags=re.IGNORECASE,
    )
    txt = re.sub(r"target\s+1536x1024", "size 1536x1024", txt, flags=re.IGNORECASE)
    txt = re.sub(
        r"\b16\s*:\s*9(?:\s*aspect\s*ratio)?\b",
        "widescreen landscape (1536x1024)",
        txt,
        flags=re.IGNORECASE,
    )

    txt = re.sub(
        r"\b(?:schoolboy|schoolgirl|elementary\s+school\s+student|middle\s+school\s+student|high\s+school\s+student|little\s+boy|little\s+girl|young\s+boy|young\s+girl|teenager|teenagers|teenage|teens|teen|children|child|kids|kid|minor|minors)\b",
        "adult family member (aged 35s)",
        txt,
        flags=re.IGNORECASE,
    )

    forbidden_line_pats = (
        r"reject\s+and\s+regenerate",
        r"final\s+visual\s+test",
        r"final\s+quality\s+inspection",
        r"check\s+the\s+final",
        r"visually\s+count",
        r"count\s+the\s+rendered",
        r"\badjust\b",
        r"\breduce\b",
        r"\bmodify\b",
        r"\breplace\b",
        r"\bedit\b",
        r"\binstead\b",
        r"\breference\b",
        r"\boriginal\s+image\b",
        r"\btarget\s+image\b",
        r"\bexisting\s+image\b",
        r"\bvariation\b",
        r"competitor",
        r"framed\s+photo",
        r"family\s+photograph",
    )
    cleaned_lines: List[str] = []
    for ln in txt.splitlines():
        if any(re.search(fp, ln, flags=re.IGNORECASE) for fp in forbidden_line_pats):
            continue
        ln = re.sub(r"\bOverlay\b", "Include", ln)
        ln = re.sub(r"\boverlay\b", "include", ln)
        ln = re.sub(r"\bPreserve\b", "Show", ln)
        ln = re.sub(r"\bpreserve\b", "show", ln)
        ln = re.sub(r"\bpreserving\b", "showing", ln, flags=re.IGNORECASE)
        ln = re.sub(r"\bKeep\s+the\b", "Make the", ln)
        ln = re.sub(r"\bkeep\s+the\b", "make the", ln)
        ln = re.sub(r"\bremain\b", "appear", ln, flags=re.IGNORECASE)
        cleaned_lines.append(ln)
    return "\n".join(cleaned_lines).strip()


def _normalize_thumbnail_to_16_9_1080p(img_bytes: bytes) -> bytes:
    """
    Chuyển đổi ảnh Thumbnail từ kích thước thô của `gpt-image-1` (`1536x1024` = 3:2)
    về đúng chuẩn YouTube Full HD 16:9 (`1920x1080`).
    """
    try:
        import io
        import numpy as np

        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        w, h = im.size
        if (w, h) == (CANVAS_W, CANVAS_H):
            return img_bytes

        target_h = int(round(w * 9.0 / 16.0))
        if h > target_h:
            arr = np.asarray(im, dtype=np.uint8)
            x1, x2 = int(w * 0.04), int(w * 0.72)
            text_zone = arr[:, x1:x2, :]
            # Phát hiện các hàng có chữ đậm hoặc thanh banner đỏ/vàng để không cắt phạm chữ
            non_white_ratio = np.mean(np.min(text_zone, axis=2) < 210, axis=1)
            active_rows = np.where(non_white_ratio > 0.03)[0]

            total_crop = h - target_h
            if len(active_rows) >= 2:
                y_min = int(active_rows[0])
                y_max = int(active_rows[-1])
                safe_top = max(0, y_min - 20)
                safe_bottom = max(0, (h - 1 - y_max) - 20)
                avail_crop = safe_top + safe_bottom
                if avail_crop >= total_crop and avail_crop > 0:
                    top_crop = int(round(total_crop * (safe_top / avail_crop)))
                    top_crop = min(safe_top, max(0, top_crop))
                    bottom_crop = min(safe_bottom, total_crop - top_crop)
                    im = im.crop((0, top_crop, w, h - bottom_crop))
                elif avail_crop > 0:
                    im = im.crop((0, safe_top, w, h - safe_bottom))
            else:
                top_crop = total_crop // 2
                im = im.crop((0, top_crop, w, top_crop + target_h))

        im_1080p = im.resize((CANVAS_W, CANVAS_H), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        im_1080p.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue()
    except Exception:
        return img_bytes


def _normalize_green_screen_to_16_9_1080p(img_bytes: bytes) -> bytes:
    """
    Chuẩn hóa ảnh `THUMBNAIL-NENXANH.png` do ChatGPT (`gpt-image-1`) vẽ về đúng khung `1920x1080` (16:9)
    với nền xanh lá thuần `#00FF00` (`RGB(0, 255, 0)`):
    - Tự động quét nhân vật ông già trên ảnh ChatGPT vừa vẽ, làm sạch 100% phông xanh lá xung quanh về đúng `PURE_GREEN = (0, 255, 0)`.
    - Đảm bảo nhân vật đứng ở vùng bên phải sát mép dưới (`Y=1080`) và toàn bộ 78% bên trái là màu xanh lá thuần `#00FF00`
      để vừa đạt chuẩn `validate_pair_metrics`, vừa cho phép `_scan_and_crop_bottom_left_green_image` tách gọn nhân vật chuẩn xác 100%!
    """
    import io

    im_raw = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    rw, rh = im_raw.size
    px_raw = im_raw.load()

    def _is_chatgpt_green_bg(r: int, g: int, b: int) -> bool:
        return (
            is_green_screen_pixel(r, g, b)
            or (g >= 110 and (g - max(r, b)) >= 22)
            or (g >= 150 and r <= 145 and b <= 145)
        )

    xs: List[int] = []
    ys: List[int] = []
    for y in range(rh):
        for x in range(rw):
            r, g, b = px_raw[x, y]
            if not _is_chatgpt_green_bg(r, g, b):
                xs.append(x)
                ys.append(y)

    if not xs or not ys:
        im_1080 = im_raw.resize((CANVAS_W, CANVAS_H), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im_1080.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    subj_crop = im_raw.crop((min_x, min_y, max_x + 1, max_y + 1))
    sw, sh = subj_crop.size
    spx = subj_crop.load()

    subj_rgba = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    rgba_px = subj_rgba.load()
    for y in range(sh):
        for x in range(sw):
            r, g, b = spx[x, y]
            if _is_chatgpt_green_bg(r, g, b):
                rgba_px[x, y] = (0, 0, 0, 0)
            else:
                max_rb = max(r, b)
                if g > max_rb and (g - max_rb) > 14:
                    g_clean = int(max_rb + (g - max_rb) * 0.20)
                else:
                    g_clean = g
                rgba_px[x, y] = (r, g_clean, b, 255)

    # Đặt nhân vật cao 980..1020px sát đáy khung 1920x1080, giữ nguyên tỉ lệ tự nhiên
    target_h = 1000
    scale = target_h / float(max(1, sh))
    target_w = max(380, min(720, int(round(sw * scale))))
    subj_resized = subj_rgba.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), PURE_GREEN)
    paste_x = max(int(CANVAS_W * 0.62), CANVAS_W - target_w - 10)
    paste_y = CANVAS_H - target_h
    canvas.paste(subj_resized, (paste_x, paste_y), subj_resized)

    out_buf = io.BytesIO()
    canvas.save(out_buf, format="PNG", optimize=True)
    return out_buf.getvalue()


def _extract_padre_mx_two_image_prompts(
    seo_text: str,
    winner_title: str,
) -> Tuple[str, str, List[str], str]:
    """
    Bóc tách và chuẩn hóa 2 Prompt tạo ảnh độc lập cho `gpt-image-1` trên ChatGPT Web:
    1. `prompt_thumbnail`: Tạo ảnh `THUMBNAIL.png` (bố cục 80/20 chuẩn Mexico Padre: 80% bên trái nền trắng chữ IN HOA
       Đen/Xanh Cyan/Cam + thanh Banner Đỏ dưới đáy chữ Vàng; 20% bên phải là chân dung ông già Mexico khắc khổ).
    2. `prompt_green_screen`: Tạo ảnh `THUMBNAIL-NENXANH.png` (chân dung ông già Mexico khắc khổ từ ngực trở lên với
       đầy đủ 2 vai trên phông nền xanh lá thuần `#00FF00` `RGB(0, 255, 0)`, hoàn toàn không có chữ).
    """
    headline_lines, kicker_line = _parse_headline_and_kicker_from_seo(winner_title, seo_text)
    safe_title_ctx = _sanitize_raw_thumbnail_prompt(winner_title or "")

    raw_thumb_p = ""
    raw_green_p = ""
    if seo_text:
        m_th = re.search(
            r"##\s*Imagen\s+THUMBNAIL\b(?!-NENXANH)([\s\S]*?)(?=\n##\s*Imagen\s+THUMBNAIL-NENXANH|\Z)",
            seo_text,
            flags=re.IGNORECASE,
        )
        if m_th:
            raw_thumb_p = _sanitize_raw_thumbnail_prompt(m_th.group(1).strip())
        m_gr = re.search(
            r"##\s*Imagen\s+THUMBNAIL-NENXANH\b([\s\S]*?)(?=\n##|\Z)",
            seo_text,
            flags=re.IGNORECASE,
        )
        if m_gr:
            raw_green_p = _sanitize_raw_thumbnail_prompt(m_gr.group(1).strip())

    rows_desc = []
    for idx, ln in enumerate(headline_lines, start=1):
        if idx <= 2:
            c_lbl = "Bold Black (#0A0A0A)"
        elif idx <= max(3, len(headline_lines) - 2):
            c_lbl = "Bold Dark Teal-Cyan (#068C9B)"
        else:
            c_lbl = "Bold Deep Orange (#E65500)"
        rows_desc.append(f"Row {idx} ({c_lbl}): {ln}")
    rows_str = "\n".join(rows_desc)

    prompt_thumbnail = (
        "Call the image generation tool immediately to create a brand-new standalone photorealistic horizontal landscape image from scratch "
        "(size 1536x1024) composed for a 16:9 YouTube thumbnail in the Mexican Elder Father Family Justice genre:\n\n"
        f"Story Context: {safe_title_ctx}\n"
        "STRICT 80/20 SPLIT LAYOUT:\n"
        "- LEFT 78% ZONE (Pure solid clean white background #FFFFFF from top down to 83% height): "
        "Display these exact ultra-bold uppercase Spanish headline rows centered in the white zone (huge clean sans-serif Impact/Arial Black typography, no extra words):\n"
        f"{rows_str}\n"
        f"- BOTTOM-LEFT RED BANNER (Solid crimson red bar #C81010 across the bottom 17% of the left zone): "
        f"Display this exact single-line bright yellow (#FFE600) uppercase Spanish text with thick black outline:\n"
        f"{kicker_line}\n"
        "- RIGHT 22% ZONE: Photorealistic chest-up portrait of a dignified 72-year-old Mexican father/grandfather "
        "(silver-white hair, weathered warm skin, neat gray mustache, wearing a modest traditional Mexican guayabera or work shirt, "
        "deeply emotional yet resolute expression looking toward the camera, warm indoor Mexican home background).\n"
        f"{('Additional Scene Detail: ' + raw_thumb_p[:380]) if raw_thumb_p else ''}\n\n"
        "Strict rule: Generate the image directly right now without asking any questions. Do not print 'Row 1..5' labels; render only the exact Spanish text lines above."
    )

    prompt_green_screen = (
        "Call the image generation tool immediately to create a brand-new standalone photorealistic studio chroma-key green screen portrait "
        "from scratch (size 1536x1024, horizontal landscape):\n\n"
        f"Character Context: Dignified 72-year-old Mexican father/grandfather from the story '{safe_title_ctx}'.\n"
        "COMPOSITION & CHROMA KEY #00FF00 RULES:\n"
        "- Subject: Photorealistic chest-up portrait (from mid-torso/chest up to the top of the head, with BOTH left and right shoulders naturally and completely visible, not cropped at the sides) "
        "of the exact same 72-year-old Mexican elderly man (silver-white hair, weathered warm skin, neat gray mustache, wearing a modest light-colored traditional Mexican guayabera or collared shirt, "
        "emotional, dignified, resolute facial expression looking at the camera).\n"
        "- Placement: Position the elderly man on the right half of the frame with his torso touching the bottom edge.\n"
        "- Background: 100% flat, uniform, pure chroma-key neon green background (#00FF00 / RGB 0, 255, 0) filling the entire left side and all background around the man. "
        "Zero shadows on the green wall, zero gradients, zero furniture, zero props, and ABSOLUTELY ZERO TEXT or logos anywhere in the image.\n"
        f"{('Character Detail: ' + raw_green_p[:300]) if raw_green_p else ''}\n\n"
        "Strict rule: Generate the chroma-key #00FF00 green screen portrait image directly right now without asking any questions."
    )

    return prompt_thumbnail, prompt_green_screen, headline_lines, kicker_line


def generate_and_verify_padre_mx_two_images_sync(
    session: Any,
    project_id: str,
    winner_title: str,
    seo_text: str,
    project_dir: Path,
    log_fn: Optional[ Any ] = None,
    should_stop_cb: Optional[ Any ] = None,
) -> Dict[str, Any]:
    """
    Học & áp dụng nguyên cơ chế `generate_and_verify_three_thumbnails_sync` từ `TOOL_NHAT_DRAMA/backend/adas_script_engine.py`:
    Mở đoạn chat ChatGPT mới độc lập (`session.start_fresh_chat`) để gọi `gpt-image-1` vẽ đủ 2 ảnh 16:9:
      1. `THUMBNAIL.png` (Thumbnail 80/20 hoàn chỉnh)
      2. `THUMBNAIL-NENXANH.png` (Ảnh nhân vật ông già nền xanh lá `#00FF00`)
    Nếu thiếu hoặc lỗi/limit thì tự động đánh dấu tạm dừng 30 phút (`mark_account_rate_limited`)
    và chuyển sang tài khoản (nick) ChatGPT khác (`session.switch_to_another_account`) tạo lại cho đến khi đủ cả 2 ảnh!
    """
    import base64
    try:
        from engine.chatgpt_web_client import (
            mark_account_rate_limited,
            ACCOUNT_LIMIT_COOLDOWN_SEC,
        )
    except ImportError:
        from chatgpt_web_client import (
            mark_account_rate_limited,
            ACCOUNT_LIMIT_COOLDOWN_SEC,
        )

    def _emit(msg: str):
        if log_fn:
            try:
                log_fn(project_id, msg)
                return
            except Exception:
                pass
        print(f"[{project_id}] {msg}", flush=True)

    project_dir.mkdir(parents=True, exist_ok=True)
    prompt_thumb, prompt_green, headline_lines, kicker_line = _extract_padre_mx_two_image_prompts(
        seo_text=seo_text,
        winner_title=winner_title,
    )

    thumb_file = project_dir / "THUMBNAIL.png"
    green_file = project_dir / "THUMBNAIL-NENXANH.png"

    tasks = [
        ("THUMBNAIL", thumb_file, prompt_thumb, _normalize_thumbnail_to_16_9_1080p),
        ("THUMBNAIL-NENXANH", green_file, prompt_green, _normalize_green_screen_to_16_9_1080p),
    ]

    tried_accs: set = {getattr(session, "acc_id", "acc_1")}
    saved_paths: Dict[str, str] = {}

    for img_label, target_file, base_prompt, normalizer_fn in tasks:
        if target_file.exists() and target_file.stat().st_size > 25000:
            saved_paths[img_label] = str(target_file)
            _emit(f"♻️ Khôi phục ảnh {img_label} có sẵn trên đĩa ({target_file.name}, {target_file.stat().st_size:,} bytes)...")
            continue

        max_attempts = 5
        for attempt in range(1, max_attempts + 1):
            if should_stop_cb and should_stop_cb():
                raise RuntimeError("Đã dừng theo yêu cầu người dùng.")

            acc_lbl = getattr(session, "cfg", {}).get("label", getattr(session, "acc_id", "Acc #1"))
            _emit(
                f"🎨 [CHATGPT IMAGE - {acc_lbl}] Mở đoạn chat mới tạo ảnh {img_label}.png (Lượt {attempt}/{max_attempts})..."
            )

            session.start_fresh_chat(f"PADRE_MX_{img_label}_TRY_{attempt}")

            prompt_to_send = base_prompt
            if attempt > 1:
                prompt_to_send += (
                    "\n\nIMPORTANT: Draw a brand-new standalone 1536x1024 landscape image from scratch right now using the image generation tool."
                )

            img_res = session.generate_image_and_harvest_base64(
                prompt_to_send,
                step_label=f"{img_label}_TRY_{attempt}",
                timeout_sec=280,
                progress_cb=lambda st, sec, at=attempt, al=acc_lbl, lb=img_label: (
                    _emit(f"🎨 [{al}] ChatGPT đang vẽ {lb}.png (Lượt {at}: {sec}s)...")
                    if sec % 15 == 0
                    else None
                ),
                should_stop_cb=should_stop_cb,
            )

            if not img_res.get("success") or not img_res.get("b64_data"):
                err_txt = str(img_res.get("error", "retry"))
                is_rl = bool(img_res.get("rate_limited"))
                _emit(
                    f"⚠️ Lượt {attempt} ({acc_lbl}): Chưa thu được ảnh {img_label}.png ({err_txt}) -> "
                    f"{'Tài khoản bị Limit 30p, đang đổi sang nick khác...' if is_rl else 'Đang đổi nick / tạo lại...'}"
                )
                if hasattr(session, "switch_to_another_account"):
                    if not is_rl and attempt >= 2:
                        mark_account_rate_limited(
                            session.acc_id,
                            reason=f"Lỗi tạo ảnh {img_label} liên tiếp ({err_txt})",
                            cooldown_sec=ACCOUNT_LIMIT_COOLDOWN_SEC,
                        )
                    switched = session.switch_to_another_account(extra_exclude=tried_accs)
                    if switched:
                        tried_accs.add(session.acc_id)
                        _emit(
                            f"🔄 Đã chuyển sang tài khoản {session.cfg['label']} (Cổng {session.port}) để tạo lại {img_label}.png!"
                        )
                continue

            try:
                raw_img_bytes = base64.b64decode(img_res["b64_data"])
                img_bytes = normalizer_fn(raw_img_bytes)
            except Exception as e_norm:
                _emit(f"⚠️ Lỗi chuẩn hóa ảnh {img_label}.png ({e_norm}) -> Thử lại...")
                continue

            if len(img_bytes) < 20000:
                _emit(f"⚠️ Ảnh {img_label}.png thu về quá nhỏ ({len(img_bytes)} bytes) -> Thử lại...")
                continue

            target_file.write_bytes(img_bytes)
            saved_paths[img_label] = str(target_file)
            _emit(
                f"✅ Đã tạo & tải thành công {target_file.name} trực tiếp từ ChatGPT ({acc_lbl}, nguồn: {img_res.get('source', 'chatgpt')}, {len(img_bytes):,} bytes)!"
            )
            break

    return {
        "both_ready": bool(
            thumb_file.exists()
            and thumb_file.stat().st_size > 20000
            and green_file.exists()
            and green_file.stat().st_size > 20000
        ),
        "saved_paths": saved_paths,
        "headline_lines": headline_lines,
        "kicker_line": kicker_line,
    }


def ensure_padre_mx_thumbnails_with_failover_sync(
    project_id: str,
    project_dir: str | Path,
    winner_title: str = "",
    seo_text: str = "",
    tong_hop_base_name: Optional[str] = None,
    tong_hop_dir: Optional[str | Path] = None,
    preferred_acc_id: Optional[str] = None,
    exclude_accs: Optional[set] = None,
    client: Optional[Any] = None,
    log_fn: Optional[Any] = None,
    force_regenerate_on_chatgpt: bool = False,
) -> Dict[str, Any]:
    """
    Học & áp dụng nguyên cơ chế `ensure_project_thumbnail_with_failover_sync` từ `TOOL_NHAT_DRAMA/backend/adas_script_engine.py`:
    - Đảm bảo 100% dự án `project_id` thuộc Key 4 (`04_Nhom_Ong_Gia_Trung_Tri_Mexico`) có đủ cả 2 ảnh:
      `THUMBNAIL.png` và `THUMBNAIL-NENXANH.png` được vẽ trực tiếp trên ChatGPT Web.
    - Nếu thiếu hoặc tài khoản bị Limit/lỗi: tự động xoay vòng qua tất cả các tài khoản ChatGPT (`acc_1`, `acc_2`, `acc_3`),
      tạm dừng tài khoản bị Limit 30 phút và chuyển sang nick khác tạo ngay cho đến khi đủ cả 2 ảnh.
    - Ngay sau khi có `THUMBNAIL-NENXANH.png`, tự động quét vùng nhân vật ông già không phải `#00FF00`,
      cắt gọn (`GREEN_CUTOUT_BOTTOM_LEFT.png`, `{TenKichBan}_KB.png`, `{TenKichBan}.png`), kiểm tra kỹ tọa độ
      góc trái bên dưới (`X=0, Y=340, H=740`) và đồng bộ sang thư mục `TONG HOP`!
    """
    try:
        from engine.chatgpt_web_client import (
            ChatGPTWebSession,
            ensure_all_saved_chatgpt_accounts_open,
            CHATGPT_ACCOUNTS,
            mark_account_rate_limited,
        )
    except ImportError:
        from chatgpt_web_client import (
            ChatGPTWebSession,
            ensure_all_saved_chatgpt_accounts_open,
            CHATGPT_ACCOUNTS,
            mark_account_rate_limited,
        )

    def _emit(msg: str):
        if log_fn:
            try:
                log_fn(project_id, msg)
                return
            except Exception:
                pass
        print(f"[{project_id}] {msg}", flush=True)

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

    thumb_out_path = p_dir / "THUMBNAIL.png"
    green_out_path = p_dir / "THUMBNAIL-NENXANH.png"
    chatgpt_marker_path = p_dir / ".chatgpt_images_verified.json"

    if force_regenerate_on_chatgpt:
        for fp in (thumb_out_path, green_out_path, chatgpt_marker_path):
            if fp.exists():
                try:
                    fp.unlink()
                except Exception:
                    pass

    already_verified_chatgpt = (
        chatgpt_marker_path.exists()
        and thumb_out_path.exists()
        and thumb_out_path.stat().st_size > 20000
        and green_out_path.exists()
        and green_out_path.stat().st_size > 20000
    )

    headline_lines, kicker_line = _parse_headline_and_kicker_from_seo(winner_title, seo_text)

    if not already_verified_chatgpt:
        # Nếu trước đó có file ảnh tạm chưa qua xác nhận ChatGPT, xóa để vẽ mới trên ChatGPT Web
        if not chatgpt_marker_path.exists():
            for fp in (thumb_out_path, green_out_path):
                if fp.exists():
                    try:
                        fp.unlink()
                    except Exception:
                        pass

        try:
            ensure_all_saved_chatgpt_accounts_open(run_hidden=True)
        except Exception:
            pass

        tried_accs: set = set(exclude_accs or set())
        total_acc_slots = len(CHATGPT_ACCOUNTS) + 1

        for round_idx in range(total_acc_slots):
            if (
                thumb_out_path.exists()
                and thumb_out_path.stat().st_size > 20000
                and green_out_path.exists()
                and green_out_path.stat().st_size > 20000
            ):
                break

            use_exclude = tried_accs if len(tried_accs) < len(CHATGPT_ACCOUNTS) else set()
            sess = ChatGPTWebSession(
                project_id=f"{project_id}_THUMB",
                acc_id=preferred_acc_id if (round_idx == 0 and preferred_acc_id and preferred_acc_id not in use_exclude) else None,
                exclude_accs=use_exclude,
                client=client,
            )
            tried_accs.add(sess.acc_id)
            try:
                _emit(
                    f"🎨 [STEP 7 - TẠO 2 ẢNH TRÊN CHATGPT] Đang mở đoạn chat mới trên {sess.cfg['label']} (Cổng {sess.port}) để vẽ `THUMBNAIL.png` & `THUMBNAIL-NENXANH.png`..."
                )
                if not sess.open_session_tab(force_new_chat=True):
                    mark_account_rate_limited(
                        sess.acc_id,
                        reason="Không mở được tab Chrome tạo Thumbnail & Ảnh nền xanh",
                        cooldown_sec=300,
                    )
                    continue

                gen_res = generate_and_verify_padre_mx_two_images_sync(
                    session=sess,
                    project_id=project_id,
                    winner_title=winner_title,
                    seo_text=seo_text,
                    project_dir=p_dir,
                    log_fn=log_fn,
                )
                if gen_res.get("both_ready"):
                    chatgpt_marker_path.write_text(
                        json.dumps(
                            {
                                "verified_chatgpt_web": True,
                                "account_id": sess.acc_id,
                                "account_label": sess.cfg["label"],
                                "timestamp": os.path.getmtime(thumb_out_path),
                            },
                            ensure_ascii=False,
                            indent=2,
                        ),
                        encoding="utf-8",
                    )
                    _emit(
                        f"✅ [CHATGPT IMAGE PASS] Đã vẽ và tải đủ cả 2 ảnh `THUMBNAIL.png` & `THUMBNAIL-NENXANH.png` trên {sess.cfg['label']}!"
                    )
                    break
            except Exception as e_th_fail:
                _emit(
                    f"⚠️ Lỗi tạo ảnh trên {sess.cfg['label']}: {e_th_fail} -> Tự động đổi sang tài khoản khác!"
                )
            finally:
                try:
                    sess.close_session_tab(keep_open=False)
                except Exception:
                    pass

    # Nếu sau khi thử qua tất cả các tài khoản trên máy mà vẫn thiếu 1 trong 2 ảnh (ví dụ mạng đứt hoặc chưa đăng nhập nick nào),
    # mới dùng bộ dựng dự phòng cho ảnh còn thiếu để không bao giờ gãy luồng dựng video
    if not (thumb_out_path.exists() and thumb_out_path.stat().st_size > 20000 and green_out_path.exists() and green_out_path.stat().st_size > 20000):
        _emit("⚠️ Một trong 2 ảnh chưa tải được từ ChatGPT Web -> Kích hoạt chế độ khôi phục dự phòng...")
        project_seed = f"{project_id}:{winner_title}"
        ref_green = _select_portrait_source(p_dir, project_seed)
        subj_rgba, right_backdrop = _extract_subject_rgba_from_green_ref(ref_green, project_seed=project_seed)
        right_zone_w = CANVAS_W - SPLIT_X
        target_subj_h = 1020
        scale = target_subj_h / float(subj_rgba.height)
        prop_w = max(right_zone_w, int(round(subj_rgba.width * scale)))
        subj_prop = subj_rgba.resize((prop_w, target_subj_h), Image.Resampling.LANCZOS)
        if prop_w > right_zone_w:
            crop_left = int((prop_w - right_zone_w) * 0.42)
            subj_for_80_20 = subj_prop.crop((crop_left, 0, crop_left + right_zone_w, target_subj_h)).copy()
        else:
            subj_for_80_20 = subj_prop
        paste_x = CANVAS_W - subj_for_80_20.width
        paste_y = CANVAS_H - target_subj_h

        if not (thumb_out_path.exists() and thumb_out_path.stat().st_size > 20000):
            thumb_canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))
            thumb_canvas.paste(right_backdrop, (SPLIT_X, 0))
            thumb_canvas.paste(subj_for_80_20, (paste_x, paste_y), subj_for_80_20)
            _draw_headline_80_zone(thumb_canvas, headline_lines, kicker_line)
            thumb_canvas.save(thumb_out_path, format="PNG", optimize=True)

        if not (green_out_path.exists() and green_out_path.stat().st_size > 20000):
            green_canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), PURE_GREEN)
            green_canvas.paste(subj_for_80_20, (paste_x, paste_y), subj_for_80_20)
            green_canvas.save(green_out_path, format="PNG", optimize=True)

    # Kiểm định cặp ảnh và quét cắt gọn trực tiếp từ chính bức ảnh THUMBNAIL-NENXANH.png đã tải về!
    validation = validate_pair_metrics(thumb_out_path, green_out_path)
    green_img_loaded = Image.open(green_out_path).convert("RGB")
    cropped_green, placement_meta = _scan_and_crop_bottom_left_green_image(
        green_img_loaded,
        mirror_for_bottom_left=False,
    )
    placement_meta["portrait_source"] = "CHATGPT_WEB_GPT_IMAGE_1" if chatgpt_marker_path.exists() else "FALLBACK"

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

    if tong_hop_dir and tong_hop_base_name:
        th_dir = Path(tong_hop_dir)
        th_dir.mkdir(parents=True, exist_ok=True)
        clean_base = re.sub(r"_KB$", "", str(tong_hop_base_name).strip(), flags=re.IGNORECASE)

        th_thumb = th_dir / f"{clean_base}_THUMBNAIL.png"
        th_green_full = th_dir / f"{clean_base}_NENXANH.png"
        th_green_full_alt = th_dir / f"{clean_base}_THUMBNAIL-NENXANH.png"
        th_cutout_kb = th_dir / f"{clean_base}_KB.png"
        th_cutout_base = th_dir / f"{clean_base}.png"
        th_meta = th_dir / f"{clean_base}_GREEN_META.json"

        shutil.copy2(thumb_out_path, th_thumb)
        shutil.copy2(green_out_path, th_green_full)
        shutil.copy2(green_out_path, th_green_full_alt)
        shutil.copy2(cutout_out_path, th_cutout_kb)
        shutil.copy2(cutout_out_path, th_cutout_base)
        shutil.copy2(meta_out_path, th_meta)

        exported_files.update({
            "tong_hop_thumbnail_path": str(th_thumb),
            "tong_hop_green_full_path": str(th_green_full),
            "tong_hop_green_full_alt_path": str(th_green_full_alt),
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


def generate_padre_mx_thumbnail_pair_and_cropped_green(
    project_id: str,
    project_dir: str | Path,
    winner_title: str = "",
    seo_text: str = "",
    tong_hop_base_name: Optional[str] = None,
    tong_hop_dir: Optional[str | Path] = None,
    preferred_acc_id: Optional[str] = None,
    client: Optional[Any] = None,
    log_fn: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Hàm chính tạo bộ 3 sản phẩm hình ảnh cho Key 04_Nhom_Ong_Gia_Trung_Tri_Mexico
    (Chuyển sang gọi trực tiếp `ensure_padre_mx_thumbnails_with_failover_sync` trên ChatGPT Web):
      1. THUMBNAIL.png (1920x1080 — vẽ trên đoạn chat mới ChatGPT)
      2. THUMBNAIL-NENXANH.png (1920x1080, nền #00FF00 — vẽ trên đoạn chat mới ChatGPT)
      3. GREEN_CUTOUT_BOTTOM_LEFT.png & {TenKichBan}_KB.png / {TenKichBan}.png (ảnh nền xanh đã quét & cắt gọn
         từ ảnh ChatGPT để gắn vào góc trái bên dưới của riêng kịch bản đó).
    """
    return ensure_padre_mx_thumbnails_with_failover_sync(
        project_id=project_id,
        project_dir=project_dir,
        winner_title=winner_title,
        seo_text=seo_text,
        tong_hop_base_name=tong_hop_base_name,
        tong_hop_dir=tong_hop_dir,
        preferred_acc_id=preferred_acc_id,
        client=client,
        log_fn=log_fn,
    )


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


def _resolve_export_prefix_for_project_dir(project_dir: Path) -> str:
    st_path = project_dir / "STATE.json"
    if st_path.exists():
        try:
            st = json.loads(st_path.read_text(encoding="utf-8", errors="ignore"))
            cname = str(st.get("custom_name") or "").strip()
            if cname:
                return re.sub(r'[\\/:*?"<>|]+', "_", cname).strip(" _")
        except Exception:
            pass
    m = re.match(r"^(\d{3})_([A-Za-z0-9_-]+?)_", project_dir.name)
    if m and "-" in m.group(2):
        return m.group(2)
    m_num = re.match(r"^(\d{3})", project_dir.name)
    if m_num:
        return m_num.group(1)
    return project_dir.name[:24]


def scan_and_generate_missing_thumbnails_for_created_scripts(
    projects_root: Optional[str | Path] = None,
    scan_folder: Optional[str | Path] = None,
    dry_run: bool = False,
    require_chatgpt_verified: bool = False,
    preferred_acc_id: Optional[str] = None,
    client: Optional[Any] = None,
    log_fn: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Quét toàn bộ các kịch bản đã tạo của Key 04 (`04_Nhom_Ong_Gia_Trung_Tri_Mexico`)
    trong `PROJECTS_04_Nhom_Ong_Gia_Trung_Tri_Mexico` và thư mục `TONG HOP` (hoặc `scan_folder` tùy chọn):
      - Kiểm tra xem mỗi kịch bản đã có đủ:
        1) `THUMBNAIL.png` (`{TenKichBan}_THUMBNAIL.png`)
        2) `THUMBNAIL-NENXANH.png` (`{TenKichBan}_NENXANH.png` / `{TenKichBan}_THUMBNAIL-NENXANH.png`)
        3) Ảnh nền xanh đã cắt gọn góc trái dưới (`GREEN_CUTOUT_BOTTOM_LEFT.png` & `{TenKichBan}_KB.png` / `{TenKichBan}.png`)
      - Nếu kịch bản đã tạo chữ (`.txt`) nhưng chưa có Thumbnail hoặc chưa có Ảnh nền xanh / Ảnh cắt gọn
        (hoặc yêu cầu vẽ lại bằng ChatGPT Web khi `require_chatgpt_verified=True`), tự động tiến hành tạo đủ bộ
        và đồng bộ sang `TONG HOP` để phần Render Video (`Bàn #7` / `Tạo Batch Video`) hoạt động ngay lập tức!
    """
    studio_root = Path(__file__).resolve().parent.parent
    default_projects_root = studio_root / "PROJECTS" / "PROJECTS_04_Nhom_Ong_Gia_Trung_Tri_Mexico"
    p_root = Path(projects_root) if projects_root else default_projects_root
    th_dir = Path(scan_folder) if scan_folder else (p_root / "TONG HOP")

    def _emit(pid: str, msg: str):
        if log_fn:
            try:
                log_fn(pid, msg)
                return
            except Exception:
                try:
                    log_fn(f"[{pid}] {msg}")
                    return
                except Exception:
                    pass
        print(f"[SCAN_KEY04][{pid}] {msg}", flush=True)

    discovered_scripts: Dict[str, Dict[str, Any]] = {}

    # 1. Quét các thư mục dự án trong PROJECTS_04_Nhom_Ong_Gia_Trung_Tri_Mexico
    if p_root.exists() and p_root.is_dir():
        for sub in sorted(p_root.iterdir(), key=lambda x: x.name):
            if not sub.is_dir():
                continue
            if sub.name.upper() in ("TONG HOP", "_PADRE_MX_ASSETS", "VIDEOS", "LOGS", "REPORTS"):
                continue
            full_script = sub / "FULL_SCRIPT.txt"
            working_script = sub / "CURRENT_WORKING_SCRIPT.txt"
            has_script_file = (
                (full_script.exists() and full_script.stat().st_size > 300)
                or (working_script.exists() and working_script.stat().st_size > 300)
            )
            if not has_script_file:
                continue

            prefix = _resolve_export_prefix_for_project_dir(sub)
            clean_base = re.sub(r"_KB$", "", prefix, flags=re.IGNORECASE)

            w_title = ""
            st_path = sub / "STATE.json"
            if st_path.exists():
                try:
                    st_obj = json.loads(st_path.read_text(encoding="utf-8", errors="ignore"))
                    w_title = str(st_obj.get("winner_title") or st_obj.get("source_title") or "").strip()
                except Exception:
                    pass
            if not w_title and (sub / "LOCKED_TITLE.txt").exists():
                w_title = (sub / "LOCKED_TITLE.txt").read_text(encoding="utf-8", errors="ignore").strip()
            if not w_title:
                w_title = clean_base.replace("_", " ")

            seo_txt = ""
            for seo_cand in ("FULL_SEO.txt", "STEP6_SEO_PACKAGE.md", "checkpoints/05_SEO_PACKAGE.md"):
                sp = sub / seo_cand
                if sp.exists() and sp.stat().st_size > 100:
                    seo_txt = sp.read_text(encoding="utf-8", errors="ignore")
                    break

            discovered_scripts[clean_base] = {
                "clean_base": clean_base,
                "project_id": sub.name,
                "project_dir": sub,
                "tong_hop_dir": th_dir,
                "script_path": str(full_script if full_script.exists() else working_script),
                "winner_title": w_title,
                "seo_text": seo_txt,
            }

    # 2. Quét các file kịch bản .txt lẻ trong thư mục TONG HOP (hoặc scan_folder người dùng chọn để Render)
    if th_dir.exists() and th_dir.is_dir():
        for f in sorted(th_dir.iterdir(), key=lambda x: x.name):
            if not f.is_file():
                continue
            low_name = f.name.lower()
            if not low_name.endswith(".txt"):
                continue
            if (
                low_name.endswith("_seo.txt")
                or low_name.endswith("_prompt.txt")
                or low_name in ("locked_title.txt", "live_log.txt", "batch-summary.txt")
                or low_name.startswith(".")
            ):
                continue
            if f.stat().st_size < 100:
                continue

            raw_stem = f.stem
            clean_base = re.sub(r"_KB$", "", raw_stem, flags=re.IGNORECASE)
            if clean_base in discovered_scripts:
                discovered_scripts[clean_base]["tong_hop_script_path"] = str(f)
                continue

            # Tìm xem có thư mục con tương ứng trong p_root không
            matched_pdir = None
            if p_root.exists() and p_root.is_dir():
                cand_direct = p_root / clean_base
                if cand_direct.exists() and cand_direct.is_dir():
                    matched_pdir = cand_direct
                else:
                    for sub in p_root.iterdir():
                        if sub.is_dir() and clean_base.lower() in sub.name.lower():
                            matched_pdir = sub
                            break
            if not matched_pdir:
                matched_pdir = th_dir / "_padre_mx_assets" / clean_base

            seo_file_th = th_dir / f"{clean_base}_SEO.txt"
            seo_txt = seo_file_th.read_text(encoding="utf-8", errors="ignore") if seo_file_th.exists() else ""
            w_title = clean_base.replace("_", " ")
            if seo_txt:
                m_t = re.search(r"(?:CURRENT_FINAL_TITLE|LOCKED TITLE|TÍTULO PRINCIPAL)[^:\n]*:\s*\**([^\n*]+)", seo_txt, flags=re.IGNORECASE)
                if m_t:
                    w_title = m_t.group(1).strip()

            discovered_scripts[clean_base] = {
                "clean_base": clean_base,
                "project_id": matched_pdir.name if matched_pdir else clean_base,
                "project_dir": matched_pdir,
                "tong_hop_dir": th_dir,
                "script_path": str(f),
                "tong_hop_script_path": str(f),
                "winner_title": w_title,
                "seo_text": seo_txt,
            }

    missing_items: List[Dict[str, Any]] = []
    ready_items: List[Dict[str, Any]] = []

    for clean_base, info in discovered_scripts.items():
        pdir: Path = info["project_dir"]
        tdir: Path = info["tong_hop_dir"]

        p_thumb = pdir / "THUMBNAIL.png"
        p_green = pdir / "THUMBNAIL-NENXANH.png"
        p_cutout = pdir / "GREEN_CUTOUT_BOTTOM_LEFT.png"
        p_marker = pdir / ".chatgpt_images_verified.json"

        th_thumb = tdir / f"{clean_base}_THUMBNAIL.png"
        th_green1 = tdir / f"{clean_base}_NENXANH.png"
        th_green2 = tdir / f"{clean_base}_THUMBNAIL-NENXANH.png"
        th_cutout_kb = tdir / f"{clean_base}_KB.png"
        th_cutout_base = tdir / f"{clean_base}.png"

        has_thumb = (p_thumb.exists() and p_thumb.stat().st_size > 15000) or (th_thumb.exists() and th_thumb.stat().st_size > 15000)
        has_green = (
            (p_green.exists() and p_green.stat().st_size > 15000)
            or (th_green1.exists() and th_green1.stat().st_size > 15000)
            or (th_green2.exists() and th_green2.stat().st_size > 15000)
        )
        has_cutout = (
            (th_cutout_kb.exists() and th_cutout_kb.stat().st_size > 10000)
            and (th_cutout_base.exists() and th_cutout_base.stat().st_size > 10000)
        )
        has_chatgpt_verified = p_marker.exists()

        missing_reasons = []
        if not has_thumb:
            missing_reasons.append("Thiếu THUMBNAIL.png")
        if not has_green:
            missing_reasons.append("Thiếu THUMBNAIL-NENXANH.png")
        if not has_cutout:
            missing_reasons.append(f"Thiếu ảnh cắt gọn góc trái dưới ({clean_base}_KB.png)")
        if require_chatgpt_verified and not has_chatgpt_verified:
            missing_reasons.append("Chưa vẽ bằng ChatGPT Web (gpt-image-1)")

        item_summary = {
            "clean_base": clean_base,
            "project_id": info["project_id"],
            "project_dir": str(pdir),
            "tong_hop_dir": str(tdir),
            "script_path": info["script_path"],
            "winner_title": info["winner_title"],
            "has_thumb": has_thumb,
            "has_green": has_green,
            "has_cutout": has_cutout,
            "has_chatgpt_verified": has_chatgpt_verified,
            "missing_reasons": missing_reasons,
        }

        if missing_reasons:
            missing_items.append({**info, **item_summary})
        else:
            ready_items.append(item_summary)

    if dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "total_created_scripts": len(discovered_scripts),
            "ready_count": len(ready_items),
            "missing_count": len(missing_items),
            "missing_items": [
                {
                    "clean_base": x["clean_base"],
                    "project_id": x["project_id"],
                    "winner_title": x["winner_title"],
                    "missing_reasons": x["missing_reasons"],
                }
                for x in missing_items
            ],
            "ready_items": ready_items,
        }

    generated_results: List[Dict[str, Any]] = []
    for idx, item in enumerate(missing_items, start=1):
        c_base = item["clean_base"]
        pid = item["project_id"]
        pdir: Path = item["project_dir"]
        tdir: Path = item["tong_hop_dir"]
        reasons_str = ", ".join(item["missing_reasons"])
        _emit(
            pid,
            f"🔍 [{idx}/{len(missing_items)}] Kịch bản [{c_base}] ({reasons_str}) ➔ Đang tiến hành tạo Thumbnail 80/20 + Ảnh nền xanh #00FF00 & cắt gọn góc trái dưới...",
        )

        # Trường hợp đã có sẵn ảnh nền xanh gốc nhưng chỉ thiếu file cắt gọn {clean_base}_KB.png trong TONG HOP
        # (và không ép vẽ lại trên ChatGPT), thì quét cắt gọn & đồng bộ ngay lập tức
        p_thumb = pdir / "THUMBNAIL.png"
        p_green = pdir / "THUMBNAIL-NENXANH.png"
        th_green1 = tdir / f"{c_base}_NENXANH.png"
        th_green2 = tdir / f"{c_base}_THUMBNAIL-NENXANH.png"
        existing_green_src = (
            p_green if (p_green.exists() and p_green.stat().st_size > 15000)
            else (th_green1 if (th_green1.exists() and th_green1.stat().st_size > 15000)
                  else (th_green2 if (th_green2.exists() and th_green2.stat().st_size > 15000) else None))
        )
        existing_thumb_src = (
            p_thumb if (p_thumb.exists() and p_thumb.stat().st_size > 15000)
            else ((tdir / f"{c_base}_THUMBNAIL.png") if (tdir / f"{c_base}_THUMBNAIL.png").exists() else None)
        )

        if (
            not require_chatgpt_verified
            and existing_green_src is not None
            and existing_thumb_src is not None
            and not item["has_cutout"]
        ):
            pdir.mkdir(parents=True, exist_ok=True)
            tdir.mkdir(parents=True, exist_ok=True)
            if existing_thumb_src.resolve() != p_thumb.resolve():
                shutil.copy2(existing_thumb_src, p_thumb)
            if existing_green_src.resolve() != p_green.resolve():
                shutil.copy2(existing_green_src, p_green)
            crop_out = pdir / "GREEN_CUTOUT_BOTTOM_LEFT.png"
            crop_res = crop_existing_green_image_for_script(p_green, crop_out)
            shutil.copy2(p_thumb, tdir / f"{c_base}_THUMBNAIL.png")
            shutil.copy2(p_green, tdir / f"{c_base}_NENXANH.png")
            shutil.copy2(p_green, tdir / f"{c_base}_THUMBNAIL-NENXANH.png")
            shutil.copy2(crop_out, tdir / f"{c_base}_KB.png")
            shutil.copy2(crop_out, tdir / f"{c_base}.png")
            generated_results.append({
                "clean_base": c_base,
                "project_id": pid,
                "mode": "CROPPED_FROM_EXISTING_GREEN",
                "files": {
                    "thumbnail": str(tdir / f"{c_base}_THUMBNAIL.png"),
                    "green_full": str(tdir / f"{c_base}_NENXANH.png"),
                    "green_cutout_kb": str(tdir / f"{c_base}_KB.png"),
                },
                "placement": crop_res.get("recommended_placement"),
            })
            _emit(pid, f"✅ Đã quét & cắt gọn ảnh nền xanh [{c_base}_KB.png] đặt ở góc trái dưới để sẵn sàng Render!")
            continue

        gen_out = ensure_padre_mx_thumbnails_with_failover_sync(
            project_id=pid,
            project_dir=pdir,
            winner_title=item["winner_title"],
            seo_text=item["seo_text"],
            tong_hop_base_name=c_base,
            tong_hop_dir=tdir,
            preferred_acc_id=preferred_acc_id,
            client=client,
            log_fn=log_fn,
            force_regenerate_on_chatgpt=require_chatgpt_verified and not item["has_chatgpt_verified"],
        )

        # Cập nhật STATE.json của dự án nếu có
        st_file = pdir / "STATE.json"
        if st_file.exists():
            try:
                st_data = json.loads(st_file.read_text(encoding="utf-8", errors="ignore"))
                c_steps = st_data.get("completed_steps") or []
                if "STEP_5B_CHATGPT_THUMBNAILS_DONE" not in c_steps:
                    c_steps.append("STEP_5B_CHATGPT_THUMBNAILS_DONE")
                st_data["completed_steps"] = c_steps
                st_data["thumbnail_path"] = str(pdir / "THUMBNAIL.png")
                st_data["green_full_path"] = str(pdir / "THUMBNAIL-NENXANH.png")
                st_data["green_cutout_path"] = str(pdir / "GREEN_CUTOUT_BOTTOM_LEFT.png")
                st_file.write_text(json.dumps(st_data, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception:
                pass

        generated_results.append({
            "clean_base": c_base,
            "project_id": pid,
            "mode": "GENERATED_PAIR_AND_CROPPED",
            "files": gen_out.get("files", {}),
            "placement": (gen_out.get("placement_meta") or {}).get("recommended_placement"),
        })
        _emit(
            pid,
            f"✅ Hoàn tất tạo bộ Thumbnail + Ảnh nền xanh #00FF00 & cắt gọn [{c_base}_KB.png] cho kịch bản [{c_base}]!",
        )

    return {
        "ok": True,
        "dry_run": False,
        "total_created_scripts": len(discovered_scripts),
        "already_ready_count": len(ready_items),
        "generated_count": len(generated_results),
        "generated_results": generated_results,
        "ready_items": ready_items,
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
    parser.add_argument("--scan-only", action="store_true", help="Chỉ quét kiểm tra các kịch bản đã tạo xem kịch bản nào thiếu Thumbnail / Ảnh nền xanh")
    parser.add_argument("--scan-and-generate", action="store_true", help="Quét toàn bộ các kịch bản đã tạo và tự động tạo bù Thumbnail + Ảnh nền xanh nếu thiếu")
    parser.add_argument("--projects-root", default="", help="Thư mục PROJECTS_04_Nhom_Ong_Gia_Trung_Tri_Mexico cần quét")
    parser.add_argument("--scan-folder", default="", help="Thư mục TONG HOP hoặc thư mục chứa kịch bản cần quét")
    parser.add_argument("--require-chatgpt", action="store_true", help="Bắt buộc tạo lại trên ChatGPT Web nếu ảnh cũ chưa có dấu xác nhận ChatGPT")
    args = parser.parse_args()

    if args.scan_only or args.scan_and_generate:
        res = scan_and_generate_missing_thumbnails_for_created_scripts(
            projects_root=args.projects_root or None,
            scan_folder=args.scan_folder or None,
            dry_run=bool(args.scan_only and not args.scan_and_generate),
            require_chatgpt_verified=bool(args.require_chatgpt),
        )
        print(json.dumps(res, ensure_ascii=False))
        return 0

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

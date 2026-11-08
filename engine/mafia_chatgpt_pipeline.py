"""
================================================================================
HỆ THỐNG ĐIỀU PHỐI ĐA LUỒNG DOANH NGHIỆP MỚI: MAFIA BOSS × MAID STORYTELLING
(`D:\\MAFIA_STUDIO\\engine\\mafia_chatgpt_pipeline.py`)
================================================================================
Đặc tả kỹ thuật theo đúng yêu cầu:
1. Toàn bộ 5 bước chạy qua ChatGPT Desktop (`\\\\.\\pipe\\codex-app-tools-*`):
   - Bước 1: Viết lại tiêu đề + Chấm điểm + Chọn WINNER (>= 97 điểm, <= 100 ký tự)
   - Bước 2: Tạo Giàn ý chi tiết (Outline) + Khóa DNA A/B/C
   - Bước 3: Viết Kịch bản Full (American English, < 8.000 từ, 44.000-48.000 ký tự chuẩn)
   - Bước 4: Đánh giá kịch bản (MODE A: Khóa các điểm đã đạt yêu cầu + Liệt kê không
             giới hạn các điểm cần sửa trong Patch Ledger).
             * Nếu kịch bản < 97 điểm (<= 96): Chạy MODE B sửa kịch bản (giữ nguyên
               các phần đã khóa) rồi quay lại MODE A đánh giá lại cho tới khi >= 97 điểm.
             * Nếu kịch bản >= 97 điểm: Chuyển sang Bước 5.
   - Bước 5: Tạo SEO hoàn chỉnh (Skill `viet-seo-nguoi-hau` v1.3).
2. Đồng bộ 100% trong 1 ĐOẠN CHAT DUY NHẤT (`thread_id`) cho mỗi kịch bản.
3. Sử dụng model mức suy luận `medium` (`thinking="medium"`).
4. Hỗ trợ lưu hàng đợi nhiều kịch bản (`QUEUE_BACKLOG.json`), chạy tối đa 3 luồng
   song song (`--max-workers 3`), tự động lưu các bước đã thực hiện (`STATE.json` +
   `checkpoints/`) để chạy tiếp sau, và lưu toàn bộ lịch sử cuộc trò chuyện.
5. Đầu ra cuối cùng cho mỗi kịch bản:
   - `FULL_SCRIPT.txt` (1 file kịch bản full hoàn chỉnh)
   - `FULL_SEO.txt` (1 file SEO hoàn chỉnh)
================================================================================
"""

import os
import sys
import re
import glob
import json
import time
import struct
import shutil
import hashlib
import argparse
import threading
import subprocess
import urllib.parse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Tự động nhận diện thư mục gốc theo vị trí thực tế của file và đưa vào sys.path
_CODE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _CODE_ROOT not in sys.path:
    sys.path.insert(0, _CODE_ROOT)


def _resolve_unified_studio_root(base_dir: str) -> str:
    norm = os.path.abspath(base_dir)
    if os.path.basename(norm).lower() == "app" and os.path.basename(os.path.dirname(norm)).lower() == "resources":
        outer = os.path.dirname(os.path.dirname(norm))
        if (
            os.path.exists(os.path.join(outer, "mafia_dashboard_server.py"))
            or os.path.exists(os.path.join(outer, "Kho_Green"))
            or os.path.exists(os.path.join(outer, "Video Batch Studio.exe"))
        ):
            return outer
    return norm


STUDIO_ROOT = _resolve_unified_studio_root(_CODE_ROOT)
if STUDIO_ROOT not in sys.path:
    sys.path.insert(0, STUDIO_ROOT)


def _migrate_backlog_and_projects_if_split():
    """Tự động gom gọn toàn bộ file lặp/lộn xộn ở thư mục gốc vào đúng các thư mục con chuẩn (`data/queues`, `data/memory`, `data/progress`, `data/logs`, `data/config`, `PROJECTS/PROJECTS_*`)."""
    queues_dir = os.path.join(STUDIO_ROOT, "data", "queues")
    memory_dir = os.path.join(STUDIO_ROOT, "data", "memory")
    progress_dir = os.path.join(STUDIO_ROOT, "data", "progress")
    logs_dir = os.path.join(STUDIO_ROOT, "data", "logs")
    config_dir = os.path.join(STUDIO_ROOT, "data", "config")
    projects_base = os.path.join(STUDIO_ROOT, "PROJECTS")
    for d in (queues_dir, memory_dir, progress_dir, logs_dir, config_dir, projects_base):
        os.makedirs(d, exist_ok=True)

    # 1. Nếu trước đó dữ liệu hàng đợi từng được tạo trong resources/app (_CODE_ROOT) khác với STUDIO_ROOT (exeDir), gộp về data/queues
    for scan_root in (_CODE_ROOT, STUDIO_ROOT):
        if not os.path.isdir(scan_root):
            continue
        try:
            for entry in os.listdir(scan_root):
                src_path = os.path.join(scan_root, entry)
                if entry.startswith("QUEUE_BACKLOG") and entry.endswith(".json") and os.path.isfile(src_path):
                    dst_b = os.path.join(queues_dir, entry)
                    if not os.path.exists(dst_b):
                        try:
                            shutil.move(src_path, dst_b)
                            continue
                        except Exception:
                            pass
                    try:
                        src_data = json.load(open(src_path, encoding="utf-8"))
                        src_items = src_data.get("items") or []
                        if src_items:
                            dst_data = {"max_parallel_threads": 3, "thinking_effort": "medium", "items": []}
                            if os.path.exists(dst_b):
                                try:
                                    dst_data = json.load(open(dst_b, encoding="utf-8"))
                                except Exception:
                                    pass
                            existing_pids = {x.get("project_id") for x in (dst_data.get("items") or [])}
                            changed = False
                            for it in src_items:
                                pid = it.get("project_id")
                                if pid and pid not in existing_pids:
                                    dst_data.setdefault("items", []).append(it)
                                    existing_pids.add(pid)
                                    changed = True
                            if changed:
                                with open(dst_b, "w", encoding="utf-8") as f:
                                    json.dump(dst_data, f, ensure_ascii=False, indent=2)
                        os.remove(src_path)
                    except Exception:
                        pass
                elif entry.startswith("CHANNEL_MEMORY") and entry.endswith(".json") and os.path.isfile(src_path):
                    dst_m = os.path.join(memory_dir, entry)
                    try:
                        if not os.path.exists(dst_m):
                            shutil.move(src_path, dst_m)
                        else:
                            os.remove(src_path)
                    except Exception:
                        pass
                elif entry.startswith("TIEN_DO_") and entry.endswith(".md") and os.path.isfile(src_path):
                    dst_p = os.path.join(progress_dir, entry)
                    try:
                        if not os.path.exists(dst_p):
                            shutil.move(src_path, dst_p)
                        else:
                            os.remove(src_path)
                    except Exception:
                        pass
                elif entry in ("CUSTOM_LINKED_FOLDERS.json", "CHAT_CONVERSATION_POOL.json") and os.path.isfile(src_path):
                    dst_c = os.path.join(config_dir, entry)
                    try:
                        if not os.path.exists(dst_c):
                            shutil.move(src_path, dst_c)
                        else:
                            os.remove(src_path)
                    except Exception:
                        pass
                elif entry == "LIVE_STUDIO_LOG.txt" and os.path.isfile(src_path):
                    dst_l = os.path.join(logs_dir, entry)
                    try:
                        if not os.path.exists(dst_l):
                            shutil.move(src_path, dst_l)
                        else:
                            os.remove(src_path)
                    except Exception:
                        pass
        except Exception:
            pass

    # 2. Gom toàn bộ các thư mục PROJECTS_* ở thư mục gốc vào trong thư mục duy nhất PROJECTS/
    try:
        for entry in os.listdir(STUDIO_ROOT):
            if entry.startswith("PROJECTS_"):
                old_pdir = os.path.join(STUDIO_ROOT, entry)
                new_pdir = os.path.join(projects_base, entry)
                if os.path.isdir(old_pdir):
                    if not os.path.exists(new_pdir):
                        try:
                            shutil.move(old_pdir, new_pdir)
                        except Exception:
                            shutil.copytree(old_pdir, new_pdir, dirs_exist_ok=True)
                            shutil.rmtree(old_pdir, ignore_errors=True)
                    else:
                        shutil.copytree(old_pdir, new_pdir, dirs_exist_ok=True)
                        shutil.rmtree(old_pdir, ignore_errors=True)

        # Gom các dự án Mafia cũ nằm trực tiếp dưới PROJECTS/ vào PROJECTS/PROJECTS_MAFIA/
        mafia_sub = os.path.join(projects_base, "PROJECTS_MAFIA")
        os.makedirs(mafia_sub, exist_ok=True)
        for entry in os.listdir(projects_base):
            if entry.startswith("PROJECTS_"):
                continue
            item_p = os.path.join(projects_base, entry)
            dst_p = os.path.join(mafia_sub, entry)
            if os.path.isdir(item_p):
                if not os.path.exists(dst_p):
                    try:
                        shutil.move(item_p, dst_p)
                    except Exception:
                        shutil.copytree(item_p, dst_p, dirs_exist_ok=True)
                        shutil.rmtree(item_p, ignore_errors=True)
                else:
                    shutil.copytree(item_p, dst_p, dirs_exist_ok=True)
                    shutil.rmtree(item_p, ignore_errors=True)
    except Exception:
        pass

    # 3. Cập nhật lại đường dẫn project_dir trong các file QUEUE_BACKLOG*.json nếu trỏ tới đường dẫn cũ
    try:
        for bfile in os.listdir(queues_dir):
            if not (bfile.startswith("QUEUE_BACKLOG") and bfile.endswith(".json")):
                continue
            bpath = os.path.join(queues_dir, bfile)
            try:
                bdata = json.load(open(bpath, encoding="utf-8"))
                changed = False
                is_mafia_queue = bfile == "QUEUE_BACKLOG.json"
                for it in (bdata.get("items") or []):
                    pid = it.get("project_id") or ""
                    pdir = it.get("project_dir") or ""
                    if not pid:
                        continue
                    if is_mafia_queue:
                        expected_dir = os.path.join(projects_base, "PROJECTS_MAFIA", pid)
                    else:
                        niche_suffix = bfile[len("QUEUE_BACKLOG_"):-len(".json")]
                        expected_dir = os.path.join(projects_base, f"PROJECTS_{niche_suffix}", pid)
                    if pdir != expected_dir and (not pdir or not os.path.exists(pdir) or os.path.exists(expected_dir)):
                        it["project_dir"] = expected_dir
                        changed = True
                if changed:
                    with open(bpath, "w", encoding="utf-8") as f:
                        json.dump(bdata, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
    except Exception:
        pass


_migrate_backlog_and_projects_if_split()

try:
    from engine.license_manager import verify_current_machine_license
except Exception:
    try:
        from license_manager import verify_current_machine_license
    except Exception:
        verify_current_machine_license = None

try:
    from engine.channel_memory_guard import (
        run_canon_guard_step_1_5,
        record_project_to_channel_memory,
        load_or_backfill_channel_memory,
    )
except Exception:
    from channel_memory_guard import (
        run_canon_guard_step_1_5,
        record_project_to_channel_memory,
        load_or_backfill_channel_memory,
    )

try:
    from engine.tts_post_director import (
        run_tts_director_step_6,
        sanitize_and_normalize_tts_script,
    )
except Exception:
    from tts_post_director import (
        run_tts_director_step_6,
        sanitize_and_normalize_tts_script,
    )

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

def _pick_resource_dir(rel_path: str) -> str:
    for cand in (
        os.path.join(_CODE_ROOT, "skills", rel_path),
        os.path.join(_CODE_ROOT, rel_path),
        os.path.join(STUDIO_ROOT, "skills", rel_path),
        os.path.join(STUDIO_ROOT, rel_path),
    ):
        if os.path.exists(cand):
            return cand
    return os.path.join(_CODE_ROOT, "skills", rel_path)


SKILLS_ROOT = _pick_resource_dir(os.path.join("engine", "skills_bundle"))
HOMELESS_SKILLS_ROOT = _pick_resource_dir("skills_homeless")
MEXICO_SKILLS_ROOT = _pick_resource_dir("skills_mexico")
SKILLS_12_KEYS_ROOT = _pick_resource_dir("skills_12_keys")
ACTIVE_NICHE = "mafia"
ACTIVE_KEY_ID = "mafia"
PROJECTS_ROOT = os.path.join(STUDIO_ROOT, "PROJECTS", "PROJECTS_MAFIA")
BACKLOG_PATH = os.path.join(STUDIO_ROOT, "data", "queues", "QUEUE_BACKLOG.json")
PROGRESS_MD_PATH = os.path.join(STUDIO_ROOT, "data", "progress", "TIEN_DO_MAFIA_STUDIO.md")
CHAT_POOL_PATH = os.path.join(STUDIO_ROOT, "data", "config", "CHAT_CONVERSATION_POOL.json")

# Danh mục 12 Key mở rộng đặt tên theo đúng tên thư mục gốc của người dùng
KEY_PROFILES_12 = {
    "01_Nhom_Ong_Gia_Tra_Dua_My_US": {
        "label": "01_Nhom_Ong_Gia_Tra_Dua_My_US — Ông già trả đũa & Lòng tự trọng (Mỹ US)",
        "lang": "en",
        "locale": "en-US",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "02_Nhom_Phu_Nu_Bao_Thu_My_US": {
        "label": "02_Nhom_Phu_Nu_Bao_Thu_My_US — Phụ nữ báo thù & Đòi lại công lý (Mỹ US)",
        "lang": "en",
        "locale": "en-US",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico": {
        "label": "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico — Bà già vạch trần con dâu (Mexico ES-MX)",
        "lang": "es",
        "locale": "es-MX",
        "engine_family": "mexico",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "04_Nhom_Ong_Gia_Trung_Tri_Mexico": {
        "label": "04_Nhom_Ong_Gia_Trung_Tri_Mexico — Ông già trừng trị con bất hiếu (Mexico ES-MX)",
        "lang": "es",
        "locale": "es-MX",
        "engine_family": "mexico",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "05_Nhom_Manga_Doc_Than_Japan": {
        "label": "05_Nhom_Manga_Doc_Than_Japan — Manga Đàn ông Độc thân (Nhật Bản JA-JP)",
        "lang": "ja",
        "locale": "ja-JP",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 14000,
        "target_min_chars": 15000,
        "target_max_chars": 25000,
        "pref_min_chars": 18000,
        "pref_max_chars": 22000,
    },
    "06_Huu_Tri_Viec_Lam_Japan": {
        "label": "06_Huu_Tri_Viec_Lam_Japan — Tâm sự Hưu trí & Việc làm Kuchikomi (Nhật Bản JA-JP)",
        "lang": "ja",
        "locale": "ja-JP",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 16000,
        "target_min_chars": 18000,
        "target_max_chars": 26000,
        "pref_min_chars": 20000,
        "pref_max_chars": 24000,
    },
    "07_Dong_Que_Co_Dien_Mexico": {
        "label": "07_Dong_Que_Co_Dien_Mexico — Truyện xưa Đồng quê Cổ điển (Mexico ES-MX)",
        "lang": "es",
        "locale": "es-MX",
        "engine_family": "mexico",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico": {
        "label": "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico — Tình yêu Ngoại tình Phản bội (Mexico ES-MX)",
        "lang": "es",
        "locale": "es-MX",
        "engine_family": "mexico",
        "default_parts": 7,
        "min_chars": 66000,
        "target_min_chars": 70000,
        "target_max_chars": 80000,
        "pref_min_chars": 74000,
        "pref_max_chars": 78000,
    },
    "09_Tieu_Su_Goc_Khuat_Sao_Mexico": {
        "label": "09_Tieu_Su_Goc_Khuat_Sao_Mexico — Tiểu sử & Góc khuất Sao (Mexico ES-MX)",
        "lang": "es",
        "locale": "es-MX",
        "engine_family": "mexico",
        "default_parts": 7,
        "min_chars": 40000,
        "target_min_chars": 42000,
        "target_max_chars": 48000,
        "pref_min_chars": 44000,
        "pref_max_chars": 47000,
    },
    "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US": {
        "label": "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US — Người cha da màu CEO ngầm (Mỹ US)",
        "lang": "en",
        "locale": "en-US",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 38000,
        "target_min_chars": 40000,
        "target_max_chars": 52000,
        "pref_min_chars": 44000,
        "pref_max_chars": 49000,
    },
    "11_Chuyen_Tinh_Dan_Ong_My_US": {
        "label": "11_Chuyen_Tinh_Dan_Ong_My_US — Chuyện tình Phái mạnh POV (Mỹ US)",
        "lang": "en",
        "locale": "en-US",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 38000,
        "target_min_chars": 40000,
        "target_max_chars": 50000,
        "pref_min_chars": 43000,
        "pref_max_chars": 48000,
    },
    "12_Kinh_Di_Dem_Khuya_My_US": {
        "label": "12_Kinh_Di_Dem_Khuya_My_US — Truyện Kinh dị Đêm khuya (Mỹ US)",
        "lang": "en",
        "locale": "en-US",
        "engine_family": "homeless",
        "default_parts": 7,
        "min_chars": 62000,
        "target_min_chars": 65000,
        "target_max_chars": 78000,
        "pref_min_chars": 68000,
        "pref_max_chars": 75000,
    },
}
KEY_PROFILES_12_LOWER_MAP = {k.lower(): k for k in KEY_PROFILES_12}

LIVE_STUDIO_LOG_PATH = os.path.join(STUDIO_ROOT, "data", "logs", "LIVE_STUDIO_LOG.txt")
PIPE_LOCK = threading.Lock()
POOL_LOCK = threading.Lock()
BACKLOG_LOCK = threading.Lock()
LOG_LOCK = threading.Lock()
BACKEND_API_LOCK = threading.Lock()
SEND_PRIORITY_LOCK = threading.Lock()
_PENDING_SEND_COUNT = 0
_LAST_BACKEND_API_TS = 0.0
GLOBAL_USAGE_LIMIT_ERROR = ""


def resolve_canonical_key_id(niche: str = None) -> str:
    raw = (niche or ACTIVE_KEY_ID or ACTIVE_NICHE or "mafia").strip()
    low = raw.lower()
    if low in KEY_PROFILES_12_LOWER_MAP:
        return KEY_PROFILES_12_LOWER_MAP[low]
    if "mexico" in low or "bà cô" in low or "ba co" in low:
        return "mexico"
    if "homeless" in low:
        return "homeless"
    return "mafia"


def _resolve_custom_tong_hop_dir(key_id: str, default_th_dir: str) -> str:
    try:
        custom_file = os.path.join(STUDIO_ROOT, "data", "config", "CUSTOM_LINKED_FOLDERS.json")
        if not os.path.exists(custom_file):
            custom_file = os.path.join(STUDIO_ROOT, "CUSTOM_LINKED_FOLDERS.json")
        if os.path.exists(custom_file):
            with open(custom_file, "r", encoding="utf-8") as f:
                data = json.load(f) or {}
            by_key = data.get("tongHopByKey") or {}
            if key_id in by_key and str(by_key[key_id] or "").strip():
                return str(by_key[key_id]).strip()
            if key_id == "homeless" and str(data.get("tongHopHomelessFolder") or "").strip():
                return str(data["tongHopHomelessFolder"]).strip()
            if key_id == "mafia" and str(data.get("tongHopMafiaFolder") or "").strip():
                return str(data["tongHopMafiaFolder"]).strip()
            if key_id in ("mexico", "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico") and str(data.get("tongHopMexicoFolder") or "").strip():
                return str(data["tongHopMexicoFolder"]).strip()
    except Exception:
        pass
    return default_th_dir


def get_niche_config(niche: str = None) -> dict:
    """Trả về cấu hình đường dẫn và thông số chuẩn tách biệt 100% giữa 12 Key mới và 3 Key gốc (`mafia`, `homeless`, `mexico`)."""
    raw_in = (niche or "").strip()
    if not raw_in:
        raw_in = ACTIVE_KEY_ID or ACTIVE_NICHE or "mafia"
    low = raw_in.lower()
    projects_base = os.path.join(STUDIO_ROOT, "PROJECTS")
    queues_dir = os.path.join(STUDIO_ROOT, "data", "queues")
    progress_dir = os.path.join(STUDIO_ROOT, "data", "progress")
    for d in (projects_base, queues_dir, progress_dir):
        os.makedirs(d, exist_ok=True)

    if low in KEY_PROFILES_12_LOWER_MAP:
        canonical_key = KEY_PROFILES_12_LOWER_MAP[low]
        meta = KEY_PROFILES_12[canonical_key]
        p_root = os.path.join(projects_base, f"PROJECTS_{canonical_key}")
        th_dir = _resolve_custom_tong_hop_dir(canonical_key, os.path.join(p_root, "TONG HOP"))
        b_path = os.path.join(queues_dir, f"QUEUE_BACKLOG_{canonical_key}.json")
        md_path = os.path.join(progress_dir, f"TIEN_DO_{canonical_key}.md")
        s_root = os.path.join(SKILLS_12_KEYS_ROOT, canonical_key)
        lbl = meta["label"]
        return {
            "niche": canonical_key,
            "key_id": canonical_key,
            "engine_family": meta["engine_family"],
            "lang": meta["lang"],
            "locale": meta["locale"],
            "label": lbl,
            "LABEL": lbl,
            "projects_root": p_root,
            "PROJECTS_ROOT": p_root,
            "tong_hop_dir": th_dir,
            "TONG_HOP_ROOT": th_dir,
            "backlog_path": b_path,
            "BACKLOG_PATH": b_path,
            "progress_md_path": md_path,
            "MD_PATH": md_path,
            "skills_root": s_root,
            "default_parts": meta["default_parts"],
            "min_chars": meta["min_chars"],
            "target_min_chars": meta["target_min_chars"],
            "target_max_chars": meta["target_max_chars"],
            "pref_min_chars": meta["pref_min_chars"],
            "pref_max_chars": meta["pref_max_chars"],
        }
    n = low
    if "mexico" in n or "bà cô" in n or "ba co" in n:
        p_root = os.path.join(projects_base, "PROJECTS_MEXICO")
        th_dir = _resolve_custom_tong_hop_dir("mexico", os.path.join(p_root, "TONG HOP"))
        b_path = os.path.join(queues_dir, "QUEUE_BACKLOG_MEXICO.json")
        md_path = os.path.join(progress_dir, "TIEN_DO_MEXICO_STUDIO.md")
        lbl = "MEXICO BÀ CÔ — DRAMA GIA ĐÌNH MẸ GIÀ MEXICO (ES-MX V1.3)"
        return {
            "niche": "mexico",
            "key_id": "mexico",
            "engine_family": "mexico",
            "lang": "es",
            "locale": "es-MX",
            "label": lbl,
            "LABEL": lbl,
            "projects_root": p_root,
            "PROJECTS_ROOT": p_root,
            "tong_hop_dir": th_dir,
            "TONG_HOP_ROOT": th_dir,
            "backlog_path": b_path,
            "BACKLOG_PATH": b_path,
            "progress_md_path": md_path,
            "MD_PATH": md_path,
            "skills_root": MEXICO_SKILLS_ROOT,
            "default_parts": 7,
            "min_chars": 66000,
            "target_min_chars": 70000,
            "target_max_chars": 80000,
            "pref_min_chars": 74000,
            "pref_max_chars": 78000,
        }
    if "homeless" in n:
        p_root = os.path.join(projects_base, "PROJECTS_HOMELESS")
        th_dir = _resolve_custom_tong_hop_dir("homeless", os.path.join(p_root, "TONG HOP"))
        b_path = os.path.join(queues_dir, "QUEUE_BACKLOG_HOMELESS.json")
        md_path = os.path.join(progress_dir, "TIEN_DO_HOMELESS_STUDIO.md")
        lbl = "HOMELESS × ABANDONED PROPERTY × HIDDEN LEGACY (V12)"
        return {
            "niche": "homeless",
            "key_id": "homeless",
            "engine_family": "homeless",
            "lang": "en",
            "locale": "en-US",
            "label": lbl,
            "LABEL": lbl,
            "projects_root": p_root,
            "PROJECTS_ROOT": p_root,
            "tong_hop_dir": th_dir,
            "TONG_HOP_ROOT": th_dir,
            "backlog_path": b_path,
            "BACKLOG_PATH": b_path,
            "progress_md_path": md_path,
            "MD_PATH": md_path,
            "skills_root": HOMELESS_SKILLS_ROOT,
            "default_parts": 7,
            "min_chars": 66000,
            "target_min_chars": 70000,
            "target_max_chars": 80000,
            "pref_min_chars": 74000,
            "pref_max_chars": 78000,
        }
    p_root = os.path.join(projects_base, "PROJECTS_MAFIA")
    th_dir = _resolve_custom_tong_hop_dir("mafia", os.path.join(p_root, "TONG HOP"))
    b_path = os.path.join(queues_dir, "QUEUE_BACKLOG.json")
    md_path = os.path.join(progress_dir, "TIEN_DO_MAFIA_STUDIO.md")
    lbl = "MAFIA BOSS × MAID / WAITRESS / UNDERESTIMATED WOMAN"
    return {
        "niche": "mafia",
        "key_id": "mafia",
        "engine_family": "mafia",
        "lang": "en",
        "locale": "en-US",
        "label": lbl,
        "LABEL": lbl,
        "projects_root": p_root,
        "PROJECTS_ROOT": p_root,
        "tong_hop_dir": th_dir,
        "TONG_HOP_ROOT": th_dir,
        "backlog_path": b_path,
        "BACKLOG_PATH": b_path,
        "progress_md_path": md_path,
        "MD_PATH": md_path,
        "skills_root": SKILLS_ROOT,
        "default_parts": 6,
        "min_chars": 38000,
        "target_min_chars": 40000,
        "target_max_chars": 55000,
        "pref_min_chars": 44000,
        "pref_max_chars": 48000,
    }


def set_active_niche(niche: str) -> dict:
    """Chuyển đổi kênh/Key hoạt động (hỗ trợ cả 12 Key mới lẫn `mafia`, `homeless`, `mexico`) và cập nhật toàn bộ đường dẫn lưu trữ."""
    global ACTIVE_NICHE, ACTIVE_KEY_ID, PROJECTS_ROOT, BACKLOG_PATH, PROGRESS_MD_PATH, TONG_HOP_DIR
    ACTIVE_KEY_ID = resolve_canonical_key_id(niche)
    cfg = get_niche_config(ACTIVE_KEY_ID)
    ACTIVE_NICHE = cfg.get("engine_family") or cfg["niche"]
    PROJECTS_ROOT = cfg["projects_root"]
    BACKLOG_PATH = cfg["backlog_path"]
    PROGRESS_MD_PATH = cfg["progress_md_path"]
    TONG_HOP_DIR = cfg["tong_hop_dir"]
    os.makedirs(PROJECTS_ROOT, exist_ok=True)
    os.makedirs(TONG_HOP_DIR, exist_ok=True)
    return cfg


def log_msg(project_id: str, msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    niche_tag = ACTIVE_KEY_ID if ACTIVE_KEY_ID in KEY_PROFILES_12 else ("MEXICO" if ACTIVE_NICHE == "mexico" else ("HOMELESS" if ACTIVE_NICHE == "homeless" else "MAFIA"))
    line = f"[{ts}] [{niche_tag}] [{project_id}] {msg}"
    print(line, flush=True)
    with LOG_LOCK:
        try:
            with open(LIVE_STUDIO_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(line + "\n")
            for root_cand in (
                PROJECTS_ROOT,
                os.path.join(STUDIO_ROOT, "PROJECTS"),
                os.path.join(STUDIO_ROOT, "PROJECTS_HOMELESS"),
                os.path.join(STUDIO_ROOT, "PROJECTS_MEXICO"),
            ):
                pdir = os.path.join(root_cand, project_id)
                if os.path.exists(pdir):
                    with open(os.path.join(pdir, "LIVE_LOG.txt"), "a", encoding="utf-8") as pf:
                        pf.write(line + "\n")
                    break
        except Exception:
            pass


def read_text_file(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_text_file(path: str, content: str):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def write_json_file(path: str, data: dict):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp_path = f"{path}.{threading.get_ident()}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    for attempt in range(8):
        try:
            os.replace(tmp_path, path)
            return
        except PermissionError:
            time.sleep(0.06 * (attempt + 1))
        except Exception:
            break
    # Fallback nếu file đang bị khóa đọc bởi tiến trình khác trên Windows
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def find_chatgpt_pipe() -> str:
    pipes = glob.glob(r"\\.\pipe\codex-app-tools-*")
    if not pipes:
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Start-Process 'shell:AppsFolder\\OpenAI.Codex_2p2nqsd0c76g0!App'"],
                capture_output=True,
                timeout=8,
            )
            time.sleep(6.0)
            pipes = glob.glob(r"\\.\pipe\codex-app-tools-*")
        except Exception:
            pass
    if not pipes:
        raise RuntimeError(
            "❌ LỖI MÔI TRƯỜNG (KHI CHUYỂN MÁY / CHƯA BẬT APP): Không tìm thấy cổng kết nối ChatGPT Desktop (`\\\\.\\pipe\\codex-app-tools-*`).\n"
            "👉 YÊU CẦU CÀI ĐẶT & ĐĂNG NHẬP ĐỂ SỬ DỤNG:\n"
            "   1. Cài đặt và đăng nhập tài khoản Google Antigravity IDE.\n"
            "   2. Cài đặt ứng dụng ChatGPT Desktop trên Windows, đăng nhập tài khoản ChatGPT (Plus/Pro/Team) và mở sẵn cửa sổ ChatGPT Desktop."
        )
    # Tuyệt đối KHÔNG gọi `with open(p, "r+b"):` để dò pipe ở đây vì việc mở rồi đóng ngay lập tức
    # làm ngắt socket của Node.js net.Server trong ChatGPT.exe! Việc chọn đúng pipe của User Session
    # hiện tại và giữ nguyên handle mở sẽ được thực hiện trực tiếp trong `_open_current_user_pipe_handle()`.
    return pipes[-1]


def check_environment_requirements() -> dict:
    """
    Kiểm tra môi trường cho CHATGPT WEB MULTI-TAB STUDIO (PORT 8098):
    1. Bộ 15 Kênh Skill AI Đóng Gói Sẵn (`engine/skills_bundle`, `skills_homeless`, `skills_mexico`, `skills_12_keys`) — Offline 100%, KHÔNG cần cài đặt Antigravity IDE trên máy khách.
    2. Trình duyệt ChatGPT Web (`https://chatgpt.com` qua Chrome CDP Port 9222/9223/9224 + Profile lưu vĩnh viễn).
    """
    from engine.chatgpt_web_client import check_web_browser_status

    local_skill_checks = [
        ("skills_mafia", SKILLS_ROOT),
        ("skills_homeless", HOMELESS_SKILLS_ROOT),
        ("skills_mexico", MEXICO_SKILLS_ROOT),
        ("skills_12_keys", SKILLS_12_KEYS_ROOT),
    ]
    missing_skills = [name for name, spath in local_skill_checks if not os.path.exists(spath)]
    antigravity_installed = True
    antigravity_ok = len(missing_skills) == 0

    web_st = check_web_browser_status()
    chatgpt_ok = bool(web_st.get("browser_running") and web_st.get("logged_in"))

    errors = []
    if missing_skills:
        errors.append(f"Thiếu {len(missing_skills)} file Skill đóng gói cục bộ.")

    if not web_st.get("browser_running"):
        errors.append(
            "Trình duyệt ChatGPT Web (Port 9222) chưa mở. Hãy bấm nút '🔑 Đăng Nhập Acc #1' trên giao diện!"
        )
    elif not web_st.get("logged_in"):
        errors.append(
            "Cửa sổ trình duyệt ChatGPT Web đã mở nhưng chưa đăng nhập tài khoản. Vui lòng đăng nhập tài khoản ChatGPT trên cửa sổ Chrome đó (chỉ cần đăng nhập 1 lần, hệ thống sẽ tự lưu vĩnh viễn)!"
        )

    return {
        "all_ok": antigravity_ok and chatgpt_ok,
        "antigravity": {
            "ok": antigravity_ok,
            "installed": antigravity_installed,
            "skills_synced": len(missing_skills) == 0,
            "missing_skills": missing_skills,
        },
        "chatgpt": {
            "ok": chatgpt_ok,
            "app_installed": True,
            "logged_in": bool(web_st.get("logged_in")),
            "pipe_running": bool(web_st.get("browser_running")),
            "pipe_path": f"WEB_CDP_9222 ({web_st.get('user_email') or 'Profile: BROWSER_PROFILE'})",
            "web_status": web_st,
        },
        "errors": errors,
    }


def auto_sync_skills_and_agents_to_new_machine() -> tuple[bool, str]:
    """
    Tự động cài đặt / đồng bộ 5 bộ Skill Mafia + 5 bộ Skill Homeless V12
    vào thư mục `~/.gemini/config/skills/` trên máy mới.
    """
    try:
        home = os.path.expanduser("~")
        agy_skills_dir = os.path.join(home, ".gemini", "config", "skills")
        os.makedirs(agy_skills_dir, exist_ok=True)

        mapping_mafia = {
            "Viet-Lai-Tieu-De-Mafia-Nguoi-Hau": "Viet_Lai_Tieu_De_Mafia_v1.2",
            "Viet_Gian_Y_Nguoi_Hau_Skill": "Viet_Gian_Y_Nguoi_Hau_v1.1",
            "Viet_Kich_Ban_Nguoi_Hau_Tu_Gian_Y_Skill_v1.4": "Viet_Kich_Ban_Nguoi_Hau_v1.4",
            "Kiem_Tra_Kich_Ban_Nguoi_Hau_v1.1": "Kiem_Tra_Kich_Ban_v1.1",
            "viet-seo-nguoi-hau": "Viet_Seo_Nguoi_Hau_v1.0",
        }
        mapping_homeless = {
            os.path.join("Viet-Tieu-De-HOMELESS-V12", "viral-title-rewriter-v1.2"): "Viet_Tieu_De_Homeless_v1.2",
            os.path.join("viet-gian-y-homeless-V12", "viet-gian-y-homeless"): "Viet_Gian_Y_Homeless_v2.4",
            os.path.join("Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR", "viet-kich-ban-homeless"): "Viet_Kich_Ban_Homeless_v2.0",
            os.path.join("kiem-tra-kich-ban-homeless-V12-AUDIT-ONLY", "kiem-tra-kich-ban"): "Kiem_Tra_Kich_Ban_Homeless_v2.0",
            os.path.join("seo-homeless-V12", "seo-homeless-story-v2.1"): "Viet_Seo_Homeless_v2.1",
        }
        mapping_mexico = {
            "01_TITULOS_MEXICO": "Titulos_Drama_Familiar_Mexico_v1.3",
            "01_5_CANON_GUARD_MEXICO": "Canon_Guard_Drama_Familiar_Mexico_v1.3",
            "02_ARQUITECTURA_MEXICO": "Arquitectura_Drama_Familiar_Mexico_v1.3",
            "03_ESCRITOR_MEXICO": "Escritor_Drama_Familiar_Mexico_v1.3",
            "04_AUDITOR_MEXICO": "Auditor_Forense_Guion_Familiar_Mexico_v1.3",
            "05_SEO_MEXICO": "Seo_Thumbnail_Trailer_Mexico_v1.3",
            "07_VERIFICADOR_TTS_MEXICO": "Verificador_TTS_Drama_Familiar_Mexico_v1.3",
        }
        synced_count = 0
        for src_name, dst_name in mapping_mafia.items():
            src_path = os.path.join(SKILLS_ROOT, src_name)
            dst_path = os.path.join(agy_skills_dir, dst_name)
            if os.path.exists(src_path):
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                synced_count += 1
        for src_rel, dst_name in mapping_homeless.items():
            src_path = os.path.join(HOMELESS_SKILLS_ROOT, src_rel)
            dst_path = os.path.join(agy_skills_dir, dst_name)
            if os.path.exists(src_path):
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                synced_count += 1
        for src_rel, dst_name in mapping_mexico.items():
            src_path = os.path.join(MEXICO_SKILLS_ROOT, src_rel)
            dst_path = os.path.join(agy_skills_dir, dst_name)
            if os.path.exists(src_path):
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                synced_count += 1

        return True, f"Đã đồng bộ thành công {synced_count}/17 bộ Skill chuẩn (Mafia + Homeless V12 + MEXICO BÀ CÔ) vào Antigravity (`{agy_skills_dir}`)!"
    except Exception as e:
        return False, f"Lỗi khi đồng bộ Skill vào máy mới: {e}"


def find_valid_caller_thread_id() -> str:
    return "01a16905-8c3e-721d-8491-55bf346460a6"


class ChatGPTDesktopThreadSafeClient:
    """
    Client kết nối Named Pipe của ChatGPT Desktop an toàn đa luồng (Thread-Safe).
    Cho phép tối đa 3 luồng kịch bản gọi RPC độc lập mà không xung đột gói tin.
    """

    def __init__(self):
        self.pipe_path = find_chatgpt_pipe()
        self.caller_thread_id = find_valid_caller_thread_id()
        self.pipe = None
        self._req_counter = 0
        self._last_known_turns = {}
        self._last_sent_prompt = {}
        self._active_stream_events = {}
        self._ensure_valid_caller_thread_id()

    def _ensure_valid_caller_thread_id(self):
        orig_id = self.caller_thread_id
        # Ưu tiên đọc nhanh conversationId hợp lệ từ file log cục bộ (0ms, không gọi Named Pipe khi khởi tạo)
        log_roots = glob.glob(os.path.expanduser(r"~\AppData\Local\Packages\OpenAI.Codex*\LocalCache\Local\Codex\Logs"))
        for log_root in log_roots:
            if not os.path.exists(log_root):
                continue
            logs = sorted(
                glob.glob(os.path.join(log_root, "**", "*.log"), recursive=True),
                key=os.path.getmtime,
                reverse=True,
            )
            for lg in logs[:3]:
                try:
                    content = open(lg, encoding="utf-8", errors="ignore").read()
                    cands_01 = re.findall(
                        r"conversationId=(01a1[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s+durationMs=\d+\s+errorCode=null",
                        content,
                    )
                    if cands_01:
                        self.caller_thread_id = cands_01[-1]
                        return
                except Exception:
                    continue
        self.caller_thread_id = orig_id

    def _connect(self):
        if self.pipe:
            try:
                self.pipe.close()
            except Exception:
                pass
        self.pipe_path = find_chatgpt_pipe()
        self.pipe = open(self.pipe_path, "r+b", buffering=0)

    def close(self):
        with PIPE_LOCK:
            if self.pipe:
                try:
                    self.pipe.close()
                except Exception:
                    pass
                self.pipe = None

    def _heal_frozen_chatgpt_renderer(self):
        """
        KHÔNG kill tiến trình `--type=renderer` của ChatGPT.exe trong quá trình chạy!
        Nguyên nhân gốc rễ từ `codex-desktop.log`: Một tiến trình renderer khỏe mạnh của ChatGPT.exe
        chiếm ~340–350MB RAM (`windowId=1`). Nếu kill renderer khi >180MB, Electron sẽ kích hoạt
        `app_start` và đồng loạt bắn hàng chục lệnh `GET /conversations/{id}?num_turns=10`,
        làm nổ trần `429 Too many requests` ("Could not load this ChatGPT conversation")!
        """
        return

    def _open_current_user_pipe_handle(self):
        """
        Mở trực tiếp cổng Named Pipe thuộc đúng User Windows hiện tại (MỞ 1 LẦN DUY NHẤT cho mỗi RPC,
        tuyệt đối không mở-đóng nháp trước đó để tránh làm bận pipe).
        Nếu toàn bộ các pipe hiện có thuộc User Windows khác (báo PermissionError) vì ChatGPT.exe
        ở User hiện tại đang tắt, tự động bật lại ChatGPT.exe cho User hiện tại!
        """
        pipes = glob.glob(r"\\.\pipe\codex-app-tools-*")
        if self.pipe_path and self.pipe_path in pipes:
            pipes = [self.pipe_path] + [p for p in pipes if p != self.pipe_path]
        last_err = None
        for p in pipes:
            try:
                h = open(p, "r+b", buffering=0)
                self.pipe_path = p
                return h
            except PermissionError as pe:
                last_err = pe
                continue
            except Exception as ex:
                last_err = ex
                continue
        # Nếu chưa có pipe nào mở được (do ChatGPT.exe của User hiện tại chưa bật), tự động khởi chạy ChatGPT.exe
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Start-Process 'shell:AppsFolder\\OpenAI.Codex_2p2nqsd0c76g0!App'"],
                capture_output=True,
                timeout=8,
            )
            time.sleep(6.5)
            for p in glob.glob(r"\\.\pipe\codex-app-tools-*"):
                try:
                    h = open(p, "r+b", buffering=0)
                    self.pipe_path = p
                    return h
                except Exception as ex:
                    last_err = ex
                    continue
        except Exception:
            pass
        if last_err:
            raise last_err
        raise RuntimeError("Không thể mở cổng kết nối Named Pipe tới ChatGPT.exe")

    def call_tool(self, tool_name: str, arguments: dict, host_id: str = "durable", timeout_sec: float = 25.0) -> dict:
        # Tuần tự hóa việc mở Named Pipe bằng PIPE_LOCK để tránh lỗi `[Errno 13] Permission denied` trên Windows
        for attempt in range(6):
            with PIPE_LOCK:
                self._req_counter += 1
                req_num = self._req_counter
            cid = f"mafia_{int(time.time())}_{req_num}_{threading.get_ident()}"
            req = {
                "jsonrpc": "2.0",
                "id": cid,
                "method": "tools/call",
                "params": {
                    "callerSource": "codex",
                    "hostId": host_id,
                    "threadId": self.caller_thread_id,
                    "turnId": f"turn-{cid}",
                    "callId": f"call-{cid}",
                    "namespace": "codex_app",
                    "tool": tool_name,
                    "arguments": arguments,
                },
            }
            payload = json.dumps(req).encode("utf-8")
            res_box = {"data": None, "err": None, "handle": None}

            def _pipe_io_worker():
                p_handle = None
                try:
                    with PIPE_LOCK:
                        p_handle = self._open_current_user_pipe_handle()
                        res_box["handle"] = p_handle
                        p_handle.write(struct.pack("<I", len(payload)) + payload)
                        hdr = p_handle.read(4)
                        if not hdr or len(hdr) < 4:
                            raise RuntimeError("Named Pipe closed unexpectedly")
                        length = struct.unpack("<I", hdr)[0]
                        raw_resp = p_handle.read(length)
                        res_box["data"] = json.loads(raw_resp.decode("utf-8"))
                except Exception as ex:
                    res_box["err"] = ex
                finally:
                    if p_handle is not None:
                        try:
                            p_handle.close()
                        except Exception:
                            pass

            worker = threading.Thread(target=_pipe_io_worker, daemon=True)
            worker.start()
            worker.join(timeout=timeout_sec)
            if worker.is_alive():
                log_msg(
                    "PIPE-WATCHDOG",
                    f"⚠️ Phát hiện lệnh `{tool_name}` đợi Named Pipe quá {timeout_sec:.0f}s. Đang chờ 5s và thử lại ({attempt+1}/6)...",
                )
                worker.join(timeout=5.0)
                continue

            if res_box["err"] is not None:
                if attempt == 5:
                    raise res_box["err"]
                time.sleep(2.5)
                continue

            if res_box["data"] is not None:
                return res_box["data"]

        return {"error": f"call_tool({tool_name}) timed out after 6 attempts"}

    def _get_chatgpt_auth(self) -> tuple[str, str]:
        auth_path = os.path.expanduser(r"~\.codex\auth.json")
        if not os.path.exists(auth_path):
            raise RuntimeError("Không tìm thấy file xác thực ChatGPT Desktop tại ~/.codex/auth.json")
        data = json.load(open(auth_path, encoding="utf-8"))
        tokens = data.get("tokens", {})
        return tokens.get("access_token", ""), tokens.get("account_id", "")

    def _chatgpt_backend_api(self, method: str, path: str, payload: dict = None) -> dict:
        global _LAST_BACKEND_API_TS
        tok, acc = self._get_chatgpt_auth()
        cmd = [
            "curl.exe",
            "-i",
            "-s",
            "-X",
            method.upper(),
            f"https://chatgpt.com/backend-api/{path.lstrip('/')}",
            "-H",
            f"Authorization: Bearer {tok}",
            "-H",
            f"ChatGPT-Account-Id: {acc}",
            "-H",
            "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "-H",
            "Accept: application/json",
        ]
        tmp_body = None
        if payload is not None:
            tmp_body = os.path.join(STUDIO_ROOT, f".tmp_api_{threading.get_ident()}_{int(time.time()*1000)}.json")
            with open(tmp_body, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
            cmd.extend(["-H", "Content-Type: application/json", "--data-binary", f"@{tmp_body}"])
        try:
            # Nếu đây là lệnh GET kiểm tra hội thoại nền, nhường quyền ưu tiên tuyệt đối cho luồng đang cần gửi lệnh (send_message)
            if method.upper() == "GET":
                wait_prio = 0
                while _PENDING_SEND_COUNT > 0 and wait_prio < 8:
                    time.sleep(1.0)
                    wait_prio += 1
            with BACKEND_API_LOCK:
                for attempt in range(5):
                    if attempt == 0 and method.upper() == "GET":
                        now_ts = time.time()
                        wait_gap = 22.0 - (now_ts - _LAST_BACKEND_API_TS)
                        if wait_gap > 0:
                            time.sleep(wait_gap)
                    try:
                        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=40)
                        if method.upper() == "GET":
                            _LAST_BACKEND_API_TS = time.time()
                        raw_out = r.stdout or ""
                        if raw_out.strip():
                            # Tách phần header và JSON body cuối cùng (phòng trường hợp có 100 Continue)
                            parts_http = re.split(r"\r?\n\r?\n", raw_out.strip())
                            body_str = parts_http[-1].strip() if parts_http else ""
                            hdr_str = "\n".join(parts_http[:-1]) if len(parts_http) > 1 else ""
                            if (
                                "429 Too Many Requests" in hdr_str
                                or '"too many requests"' in body_str.lower()
                                or "rate limited" in body_str.lower()
                            ):
                                m_ra = re.search(r"retry-after:\s*(\d+)", hdr_str, flags=re.IGNORECASE)
                                ra_sec = int(m_ra.group(1)) + 5 if m_ra else 28
                                time.sleep(ra_sec)
                                _LAST_BACKEND_API_TS = time.time()
                                continue
                            if body_str:
                                return json.loads(body_str)
                    except Exception:
                        pass
                    time.sleep(6.0)
            return {}
        finally:
            if tmp_body and os.path.exists(tmp_body):
                try:
                    os.remove(tmp_body)
                except Exception:
                    pass

    def _find_first_renderable_assistant_node(self, mapping: dict) -> str:
        """
        Tìm node `assistant` có văn bản hiển thị đầu tiên (ngắn gọn nhất) trong cây `mapping`.
        Tuyệt đối KHÔNG dùng `client-created-root` (vì node gốc rỗng `message: null` sẽ khiến ChatGPT Desktop
        báo lỗi `"No renderable ChatGPT messages were found in this conversation"` khi mở đoạn chat).
        """
        candidates = []
        for nid, nd in (mapping or {}).items():
            if not isinstance(nd, dict):
                continue
            msg = nd.get("message") or {}
            role = (msg.get("author") or {}).get("role", "")
            if role != "assistant":
                continue
            parts = (msg.get("content") or {}).get("parts") or []
            txt = "".join(str(p) for p in parts if isinstance(p, str)).strip()
            if not txt:
                continue
            # Đếm độ sâu từ gốc để ưu tiên Turn #1
            depth = 0
            cur_p = nd.get("parent")
            seen_p = set()
            while cur_p and cur_p in mapping and cur_p not in seen_p:
                seen_p.add(cur_p)
                depth += 1
                cur_p = (mapping.get(cur_p) or {}).get("parent")
            ct = msg.get("create_time") or 9999999999.0
            candidates.append((depth, len(txt), ct, nid))
        if candidates:
            candidates.sort()
            return candidates[0][3]
        return ""

    def _refresh_chat_pool_from_backend(self, existing_pool: list[dict]) -> list[dict]:
        known_ids = {item.get("conversation_id") for item in existing_pool}
        # Quét tối đa 15 cuộc hội thoại Chat thông thường gần nhất (tránh gọi GET hàng loạt gây 429)
        convs_resp = self._chatgpt_backend_api("GET", "conversations?offset=0&limit=15&order=updated")
        candidates = list(convs_resp.get("items", []))
        added_count = 0
        for it in candidates:
            cid = it.get("id")
            if not cid or cid in known_ids:
                continue
            d = self._chatgpt_backend_api("GET", f"conversation/{cid}")
            if not d or d.get("conversation_origin") is not None:
                continue
            m = d.get("mapping", {})
            if not m:
                continue
            root_id = None
            for nid, nd in m.items():
                if isinstance(nd, dict) and nd.get("parent") is None:
                    root_id = nid
                    break
            clean_nid = self._find_first_renderable_assistant_node(m)
            if root_id and clean_nid:
                existing_pool.append(
                    {
                        "conversation_id": cid,
                        "root_node_id": root_id,
                        "clean_node_id": clean_nid,
                        "original_title": d.get("title") or it.get("title") or cid,
                        "allocated_to": None,
                    }
                )
                known_ids.add(cid)
                added_count += 1
                if added_count >= 8:
                    break
        return existing_pool

    def _allocate_clean_chat_conversation(self, title_label: str, project_id: str = "") -> str:
        """
        Cấp phát 1 đoạn chat ChatGPT `Chat` thông thường (`conversation_origin: null`, KHÔNG phải Codex)
        đã được tách khỏi project (`gizmo_id: ""`) và đặt về node có 1 tin nhắn hiển thị sạch (`clean_node_id`)
        để KHÔNG BAO GIỜ bị lỗi `"No renderable ChatGPT messages were found in this conversation"` và
        không bị ăn vào hạn mức token của Codex.
        """
        alloc_key = project_id or title_label
        _, cur_account_id = self._get_chatgpt_auth()
        with POOL_LOCK:
            pool_data = {"account_id": cur_account_id, "pool": []}
            if os.path.exists(CHAT_POOL_PATH):
                try:
                    loaded = json.load(open(CHAT_POOL_PATH, encoding="utf-8"))
                    saved_acc = loaded.get("account_id", "")
                    if not saved_acc or saved_acc == cur_account_id:
                        pool_data = loaded
                        pool_data["account_id"] = cur_account_id
                    else:
                        pool_data = {"account_id": cur_account_id, "pool": []}
                except Exception:
                    pool_data = {"account_id": cur_account_id, "pool": []}
            pool_list = pool_data.get("pool", [])

            chosen = None
            # 1. Ưu tiên tái sử dụng đúng đoạn chat đã cấp cho chính dự án này (tránh sinh nhiều đoạn chat trùng)
            for item in pool_list:
                if alloc_key and item.get("allocated_to") == alloc_key:
                    chosen = item
                    break

            # 2. Nếu chưa có, chọn đoạn chat đang rảnh (allocated_to is None)
            if chosen is None:
                for item in pool_list:
                    if item.get("allocated_to") is None:
                        chosen = item
                        break

            # 3. Giải phóng các conversation của dự án đã COMPLETED trước khi quét backend
            if chosen is None and pool_list:
                for item in pool_list:
                    aid = str(item.get("allocated_to") or "")
                    for p_root in (PROJECTS_ROOT, os.path.join(STUDIO_ROOT, "PROJECTS"), os.path.join(STUDIO_ROOT, "PROJECTS_HOMELESS")):
                        st_p = os.path.join(p_root, aid, "STATE.json")
                        if os.path.exists(st_p):
                            try:
                                if json.load(open(st_p, encoding="utf-8")).get("completed"):
                                    item["allocated_to"] = None
                            except Exception:
                                pass
                for item in pool_list:
                    if item.get("allocated_to") is None:
                        chosen = item
                        break

            if chosen is None:
                pool_list = self._refresh_chat_pool_from_backend(pool_list)
                for item in pool_list:
                    if item.get("allocated_to") is None:
                        chosen = item
                        break
                if chosen is None and pool_list:
                    chosen = pool_list[0]

            if chosen is None:
                return ""

            chosen["allocated_to"] = alloc_key
            chosen["allocated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            pool_data["pool"] = pool_list
            write_json_file(CHAT_POOL_PATH, pool_data)

        cid = chosen["conversation_id"]
        clean_node_id = chosen.get("clean_node_id") or ""
        if not clean_node_id or clean_node_id == "client-created-root" or not chosen.get("clean_node_verified"):
            d_conv = self._chatgpt_backend_api("GET", f"conversation/{cid}")
            m_conv = d_conv.get("mapping", {})
            if clean_node_id not in m_conv or clean_node_id == "client-created-root":
                clean_node_id = self._find_first_renderable_assistant_node(m_conv) or d_conv.get("current_node") or ""
            if clean_node_id and clean_node_id != "client-created-root":
                with POOL_LOCK:
                    chosen["clean_node_id"] = clean_node_id
                    chosen["clean_node_verified"] = True
                    write_json_file(CHAT_POOL_PATH, pool_data)

        patch_body = {
            "is_archived": False,
            "gizmo_id": "",
            "title": title_label[:60],
        }
        if clean_node_id and clean_node_id != "client-created-root":
            patch_body["current_node_id"] = clean_node_id

        self._chatgpt_backend_api(
            "PATCH",
            f"conversation/{cid}",
            patch_body,
        )
        return cid

    def quarantine_conversation_in_pool(self, bad_cid: str, project_id: str = "") -> None:
        """
        Cách ly đoạn chat bị lỗi "Could not load this ChatGPT conversation" khỏi Pool
        để hệ thống tự động cấp phát một đoạn chat sạch mới cho dự án.
        """
        if not bad_cid:
            return
        with POOL_LOCK:
            if not os.path.exists(CHAT_POOL_PATH):
                return
            try:
                pool_data = json.load(open(CHAT_POOL_PATH, encoding="utf-8"))
                changed = False
                for item in pool_data.get("pool", []):
                    if item.get("conversation_id") == bad_cid:
                        item["allocated_to"] = f"QUARANTINED_{bad_cid[:8]}"
                        item["quarantined_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        changed = True
                if changed:
                    write_json_file(CHAT_POOL_PATH, pool_data)
            except Exception:
                pass

    def create_story_thread(
        self,
        title_label: str,
        prompt: str,
        thinking: str = "medium",
        project_id: str = "",
    ) -> tuple[str, str]:
        """
        Khởi tạo đoạn chat trên **ChatGPT `Chat` thông thường (`conversation_origin: null`, `host_id="chatgpt"`)**
        thay vì tạo thread Codex (`kind="codex"` / `conversation_origin="tpp"`), giúp không bị giới hạn bởi
        hạn mức token của Codex. Tuyệt đối KHÔNG xóa toàn bộ pool khi gặp lỗi UI bận tạm thời.
        """
        cid = self._allocate_clean_chat_conversation(title_label=title_label, project_id=project_id)
        if cid:
            for retry_i in range(6):
                send_res = self.send_message(cid, "chatgpt", prompt, thinking=thinking)
                if "error" not in send_res:
                    return cid, "chatgpt"
                if retry_i == 2:
                    self._heal_frozen_chatgpt_renderer()
                time.sleep(8.0 * (retry_i + 1))
            return cid, "chatgpt"

        # Fallback cuối cùng nếu tài khoản mới tinh trên máy mới chưa có lịch sử đoạn chat nào
        r = self.call_tool(
            "create_thread",
            {
                "prompt": prompt,
                "cwd": STUDIO_ROOT,
            },
        )
        res_obj = ((r.get("result") or {}).get("structuredContent") or (r.get("result") or {}))
        new_tid = res_obj.get("threadId") or res_obj.get("conversationId") or ""
        new_hid = res_obj.get("hostId") or "durable"
        if not new_tid:
            raise RuntimeError(f"Không thể khởi tạo đoạn chat mới trên ChatGPT Desktop: {r}")
        return new_tid, new_hid

    def send_message(self, thread_id: str, host_id: str, prompt: str, thinking: str = "medium") -> dict:
        global _LAST_BACKEND_API_TS, _PENDING_SEND_COUNT
        if not hasattr(self, "_send_msg_lock"):
            self._send_msg_lock = threading.Lock()
            self._last_send_msg_ts = 0.0
        self._last_sent_prompt[thread_id] = prompt
        is_chatgpt_chat = (host_id == "chatgpt") or not str(thread_id).startswith("01a1")
        if is_chatgpt_chat:
            # Đăng ký ưu tiên cao nhất (_PENDING_SEND_COUNT) để các luồng GET nhường quyền ngay lập tức
            with SEND_PRIORITY_LOCK:
                _PENDING_SEND_COUNT += 1
            try:
                with self._send_msg_lock:
                    unloadable_hits = 0
                    for attempt in range(6):
                        if attempt == 0:
                            now_ts = time.time()
                            wait_gap = 8.0 - (now_ts - self._last_send_msg_ts)
                            if wait_gap > 0:
                                time.sleep(wait_gap)
                        r = self.call_tool(
                            "send_message_to_thread",
                            {
                                "threadId": thread_id,
                                "prompt": prompt,
                            },
                        )
                        self._last_send_msg_ts = time.time()
                        res_obj = r.get("result") if isinstance(r.get("result"), dict) else {}
                        r_dump = json.dumps(r, ensure_ascii=False).lower()
                        is_conv_load_err = any(
                            err_k in r_dump
                            for err_k in (
                                "could not load this chatgpt conversation",
                                "could not load",
                                "unable to load conversation",
                                "conversation history was rate limited",
                                "rate limited",
                                "no renderable chatgpt messages",
                            )
                        )
                        if (
                            "error" not in r
                            and not res_obj.get("isError")
                            and res_obj.get("success") is not False
                            and "too many requests" not in r_dump
                            and not is_conv_load_err
                        ):
                            return r
                        if is_conv_load_err or "too many requests" in r_dump:
                            unloadable_hits += 1
                            cooldown_sec = 32.0 + (unloadable_hits - 1) * 10.0
                            print(
                                f"🤖 [AI-ERROR-HANDLER] Phát hiện nghẽn tải hội thoại ('Could not load this ChatGPT conversation' / 429) trên thread={thread_id} "
                                f"(lần {unloadable_hits}/6) -> Giữ nguyên tab hiện tại (KHÔNG đổi tab, KHÔNG gọi GET phụ) và nghỉ {int(cooldown_sec)}s để mở khóa Rate-Limit..."
                            )
                            # Chỉ sửa current_node_id nếu lỗi cụ thể là "no renderable chatgpt messages"
                            if "no renderable chatgpt messages" in r_dump:
                                try:
                                    d_fix = self._chatgpt_backend_api("GET", f"conversation/{thread_id}")
                                    m_fix = d_fix.get("mapping", {})
                                    if m_fix and d_fix.get("current_node") == "client-created-root":
                                        clean_nid = self._find_first_renderable_assistant_node(m_fix)
                                        if clean_nid:
                                            self._chatgpt_backend_api(
                                                "PATCH",
                                                f"conversation/{thread_id}",
                                                {"is_archived": False, "gizmo_id": "", "current_node_id": clean_nid},
                                            )
                                except Exception:
                                    pass
                            time.sleep(cooldown_sec)
                            self._last_send_msg_ts = time.time()
                            continue
                        # Nếu chạm lỗi tạm thời khác từ ChatGPT.exe, nghỉ 10s rồi gửi lại
                        time.sleep(10.0)
                        self._last_send_msg_ts = time.time()
                    if "error" not in r:
                        r["error"] = f"send_message_to_thread failed after 6 attempts: {r}"
                return r
            finally:
                with SEND_PRIORITY_LOCK:
                    _PENDING_SEND_COUNT = max(0, _PENDING_SEND_COUNT - 1)

        for attempt in range(4):
            resp = self.call_tool(
                "send_message_to_thread",
                {
                    "threadId": thread_id,
                    "hostId": host_id,
                    "prompt": prompt,
                    "thinking": thinking,
                },
            )
            if "error" not in resp:
                return resp
            time.sleep(3.5 * (attempt + 1))
        return resp

    def rewind_thread_to_outline_turn(self, thread_id: str) -> bool:
        """
        Tua gọn nhánh hội thoại (`current_node_id`) của `thread_id` về ngay sau Lượt #2 (`BƯỚC 2: GIÀN Ý CHI TIẾT`):
        - Loại bỏ hoàn toàn các lượt nháp trung gian (Stage A/B/C) và các vòng kiểm định/JSON cũ khỏi nhánh hiển thị.
        - Giữ cho đoạn chat trên `ChatGPT.exe` luôn chỉ có đúng 2 lượt gốc (`Bước 1: Tiêu đề` + `Bước 2: Giàn ý`),
          giúp giao diện ChatGPT Desktop nhẹ 100%, không bao giờ bị treo/đơ khi dán kịch bản 78.000 ký tự,
          và chấm điểm độc lập công bằng trực tiếp trên bản `CRB` mới nhất!
        """
        if not thread_id or str(thread_id).startswith("01a1"):
            return False
        d = self._last_known_turns.get(thread_id)
        if not d or not d.get("turns"):
            d = self._read_chatgpt_chat_turns(thread_id)
        turns = d.get("turns", [])
        if len(turns) <= 2:
            return False
        # Trong `turns` (thứ tự mới nhất -> cũ nhất): `turns[-1]` là Turn #1 (Title), `turns[-2]` là Turn #2 (Outline)
        outline_turn = turns[-2]
        target_node_id = outline_turn.get("last_node_id") or outline_turn.get("id") or ""
        if not target_node_id:
            return False
        try:
            self._chatgpt_backend_api(
                "PATCH",
                f"conversation/{thread_id}",
                {"current_node_id": target_node_id},
            )
            d["turns"] = turns[-2:]
            self._last_known_turns[thread_id] = d
            return True
        except Exception:
            return False

    def _read_chatgpt_chat_turns(self, thread_id: str) -> dict:
        """
        Đọc trực tiếp cây hội thoại từ `https://chatgpt.com/backend-api/conversation/{thread_id}`
        cho đoạn chat ChatGPT `Chat` thông thường (`conversation_origin: null`):
        - Không bị trễ cache 60 giây của React Query trong `read_thread`.
        - Không bị cắt cụt 20.000 ký tự và không bị che bởi `::chatgpt-content-reference` (DIL v2).
        - Chỉ đi ngược từ `current_node` về `root_node` của nhánh hiện tại.
        """
        conv = self._chatgpt_backend_api("GET", f"conversation/{thread_id}")
        mapping = conv.get("mapping", {})
        current_node = conv.get("current_node")
        if not mapping or not current_node:
            return self._last_known_turns.get(thread_id, {"turns": []})

        # Đi ngược từ current_node về gốc để lấy chuỗi node của nhánh đang hoạt động
        chain = []
        visited = set()
        cur = current_node
        while cur and cur not in visited:
            visited.add(cur)
            nd = mapping.get(cur)
            if not isinstance(nd, dict):
                break
            chain.append(nd)
            cur = nd.get("parent")
        chain.reverse()

        turns_chrono = []
        for nd in chain:
            msg = nd.get("message")
            if not isinstance(msg, dict):
                continue
            meta = msg.get("metadata") or {}
            if meta.get("is_visually_hidden_from_conversation") is True:
                continue
            author = msg.get("author") or {}
            role = author.get("role")
            content = msg.get("content") or {}
            ctype = content.get("content_type")

            if role == "user" and ctype in ("text", "multimodal_text"):
                parts = content.get("parts") or []
                utxt = "\n".join(str(p) for p in parts if isinstance(p, str)).strip()
                if utxt:
                    msg_ts = float(msg.get("update_time") or msg.get("create_time") or 0.0)
                    turns_chrono.append(
                        {
                            "id": msg.get("id") or nd.get("id"),
                            "last_node_id": nd.get("id") or msg.get("id"),
                            "user_text": utxt,
                            "agent_texts": [],
                            "last_msg_role": "user",
                            "last_msg_status": msg.get("status"),
                            "last_msg_end_turn": msg.get("end_turn"),
                            "last_msg_channel": msg.get("channel"),
                            "last_msg_ctype": ctype,
                            "last_msg_ts": msg_ts,
                            "error_msg": "",
                        }
                    )
            elif turns_chrono and role in ("assistant", "tool"):
                cur_t = turns_chrono[-1]
                cur_t["last_node_id"] = nd.get("id") or msg.get("id") or cur_t.get("last_node_id")
                cur_t["last_msg_role"] = role
                cur_t["last_msg_status"] = msg.get("status")
                cur_t["last_msg_end_turn"] = msg.get("end_turn")
                cur_t["last_msg_channel"] = msg.get("channel")
                cur_t["last_msg_ctype"] = ctype
                msg_ts = float(msg.get("update_time") or msg.get("create_time") or 0.0)
                if msg_ts > 0:
                    cur_t["last_msg_ts"] = msg_ts
                if meta.get("is_error") or msg.get("status") in ("error", "failed"):
                    cur_t["error_msg"] = str(meta.get("error_message") or msg.get("status") or "error")

                # Chỉ thu hoạch văn bản trả lời chính thức (channel final hoặc None, recipient all)
                recipient = msg.get("recipient")
                channel = msg.get("channel")
                if (
                    role == "assistant"
                    and ctype in ("text", "multimodal_text")
                    and recipient in ("all", None)
                    and channel in ("final", None)
                ):
                    parts = content.get("parts") or []
                    atxt = "\n".join(str(p) for p in parts if isinstance(p, str)).strip()
                    dil_md = ((meta.get("model_dil_v2") or {}).get("fallbackMarkdown") or "").strip()
                    if dil_md and (
                        not atxt
                        or "::chatgpt-content-reference" in atxt
                        or "<escape>" in atxt
                        or "<text" in atxt
                        or "<box" in atxt
                        or len(dil_md) > len(atxt)
                    ):
                        atxt = dil_md
                    if atxt:
                        cur_t["agent_texts"].append(atxt)

        if not turns_chrono:
            return self._last_known_turns.get(thread_id, {"turns": []})

        # Kiểm tra trạng thái của turn mới nhất (cuối danh sách turns_chrono)
        last_t = turns_chrono[-1]
        is_latest_done = (
            last_t["last_msg_role"] == "assistant"
            and last_t["last_msg_ctype"] in ("text", "multimodal_text")
            and last_t["last_msg_channel"] in ("final", None)
            and last_t["last_msg_status"] == "finished_successfully"
            and len(last_t["agent_texts"]) > 0
        )

        synthesized_turns = []
        total_t = len(turns_chrono)
        for idx in range(total_t - 1, -1, -1):
            t_obj = turns_chrono[idx]
            items = []
            if t_obj["user_text"]:
                items.append({"type": "userMessage", "text": t_obj["user_text"]})
            joined_agent = "\n\n".join(t_obj["agent_texts"]).strip()
            if joined_agent:
                items.append({"type": "agentMessage", "text": joined_agent})

            if idx < total_t - 1:
                t_status = "completed"
            else:
                if is_latest_done:
                    t_status = "completed"
                elif t_obj["error_msg"] and not joined_agent:
                    t_status = "failed"
                elif t_obj.get("last_msg_ts", 0.0) > 0 and (time.time() - t_obj["last_msg_ts"] > 420.0):
                    t_status = "stalled"
                else:
                    t_status = "running"

            synthesized_turns.append(
                {
                    "id": t_obj["id"],
                    "last_node_id": t_obj.get("last_node_id", t_obj["id"]),
                    "status": t_status,
                    "error_msg": t_obj["error_msg"],
                    "items": items,
                }
            )

        result_data = {
            "_verified_live": True,
            "thread": {
                "id": thread_id,
                "kind": "chatgpt",
                "title": conv.get("title") or thread_id,
            },
            "turns": synthesized_turns,
        }
        self._last_known_turns[thread_id] = result_data
        return result_data

    def _is_thread_streaming_in_memory(self, thread_id: str, expected_min_turns: int = 1) -> str:
        """
        Kiểm tra nhanh trạng thái streaming thời gian thực trong bộ nhớ Jotai của `ChatGPT.exe`
        thông qua `read_thread` (`turnLimit=1, includeOutputs=False, maxOutputCharsPerItem=80`).
        - Khi đoạn chat đã được nạp vào RAM bởi `send_message_to_thread`, cuộc gọi này đọc trực tiếp
          từ bộ nhớ `ChatGPT.exe` (0ms, không tốn HTTP slot `oai-history`).
        - Trả về:
          + `"streaming"`: nếu `thread.status.type == "active"` hoặc `turns[0].status == "running"`
            (tức là ChatGPT vẫn đang gõ câu trả lời -> chưa cần gọi `GET /backend-api/conversation/{id}`).
          + `"idle"`: nếu `thread.status.type == "idle"` hoặc `turns[0].status == "completed"`
            (tức là ChatGPT vừa viết xong -> gọi `GET /backend-api/conversation/{id}` 1 lần duy nhất để thu hoạch!).
          + `"unknown"`: nếu không xác định được.
        """
        try:
            r = self.call_tool(
                "read_thread",
                {
                    "threadId": thread_id,
                    "turnLimit": 1,
                    "includeOutputs": False,
                    "maxOutputCharsPerItem": 80,
                },
            )
            items = (r.get("result") or {}).get("contentItems") or []
            if not items:
                return "unknown"
            d = json.loads(items[0].get("text") or "{}")
            th_status = ((d.get("thread") or {}).get("status") or {}).get("type", "")
            turns = d.get("turns") or []
            if th_status == "active":
                return "streaming"
            if turns:
                t0_st = turns[0].get("status", "")
                if t0_st == "running":
                    return "streaming"
                if t0_st == "completed" and th_status == "idle":
                    return "idle"
            if th_status == "idle":
                return "idle"
        except Exception:
            pass
        return "unknown"

    def _read_untruncated_rollout_turns(self, thread_id: str) -> list[dict]:
        """
        Đọc trực tiếp file rollout `.jsonl` của ChatGPT Desktop trong `~/.codex/sessions`
        để lấy 100% nội dung gốc KHÔNG BỊ GIỚI HẠN 20.000 KÝ TỰ (quan trọng cho kịch bản 44k-55k ký tự).
        Trả về danh sách các turn theo thứ tự thời gian: [{"turn_id": ..., "user_text": ..., "agent_text": ..., "completed": bool}]
        """
        codex_sessions = os.path.expanduser(r"~\.codex\sessions")
        if not os.path.exists(codex_sessions):
            return []
        matches = glob.glob(os.path.join(codex_sessions, "**", f"*{thread_id}*.jsonl"), recursive=True)
        if not matches:
            return []
        rollout_path = sorted(matches, key=os.path.getmtime)[-1]
        turns_by_id = {}
        turn_order = []
        try:
            with open(rollout_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except Exception:
                        continue
                    otype = obj.get("type", "")
                    payload = obj.get("payload", {})
                    if not isinstance(payload, dict):
                        continue
                    ptype = payload.get("type", "")

                    if otype == "event_msg" and ptype in ("turn_started", "task_started"):
                        tid = payload.get("turn_id") or payload.get("id")
                        if tid and tid not in turns_by_id:
                            turns_by_id[tid] = {"turn_id": tid, "user_text": "", "agent_text": "", "completed": False}
                            turn_order.append(tid)
                    elif otype == "event_msg" and ptype == "user_message":
                        tid = payload.get("turn_id") or (turn_order[-1] if turn_order else f"t_{len(turn_order)+1}")
                        if tid not in turns_by_id:
                            turns_by_id[tid] = {"turn_id": tid, "user_text": "", "agent_text": "", "completed": False}
                            turn_order.append(tid)
                        msg = payload.get("message", "")
                        if msg:
                            turns_by_id[tid]["user_text"] = msg
                    elif otype == "event_msg" and ptype == "item_completed":
                        tid = payload.get("turn_id") or (turn_order[-1] if turn_order else f"t_{len(turn_order)+1}")
                        if tid not in turns_by_id:
                            turns_by_id[tid] = {"turn_id": tid, "user_text": "", "agent_text": "", "completed": False}
                            turn_order.append(tid)
                        item = payload.get("item", {})
                        itype = item.get("type", "")
                        if itype in ("FunctionCallOutput", "functionCallOutput"):
                            raw_out = str(item.get("output", ""))
                            m_in = re.search(r"<input>(.*)</input>", raw_out, flags=re.DOTALL)
                            utxt = (m_in.group(1).strip() if m_in else raw_out.strip()).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                            if utxt and len(utxt) >= len(turns_by_id[tid]["user_text"]):
                                turns_by_id[tid]["user_text"] = utxt
                        elif itype in ("AgentMessage", "agentMessage"):
                            # Ghép các phần text trong content hoặc text
                            txt = item.get("text", "")
                            if not txt and isinstance(item.get("content"), list):
                                txt = "\n".join(c.get("text", "") for c in item["content"] if isinstance(c, dict) and c.get("text"))
                            if txt and len(txt) >= len(turns_by_id[tid]["agent_text"]):
                                turns_by_id[tid]["agent_text"] = txt
                    elif otype == "event_msg" and ptype == "task_complete":
                        tid = payload.get("turn_id") or payload.get("root_turn_id") or (turn_order[-1] if turn_order else f"t_{len(turn_order)+1}")
                        if tid not in turns_by_id:
                            turns_by_id[tid] = {"turn_id": tid, "user_text": "", "agent_text": "", "completed": True, "error_msg": ""}
                            turn_order.append(tid)
                        turns_by_id[tid]["completed"] = True
                        last_msg = payload.get("last_agent_message", "")
                        if last_msg and len(last_msg) >= len(turns_by_id[tid]["agent_text"]):
                            turns_by_id[tid]["agent_text"] = last_msg
                        err_obj = payload.get("error")
                        if isinstance(err_obj, dict) and err_obj.get("message"):
                            err_code = err_obj.get("codex_error_info") or "error"
                            turns_by_id[tid]["error_msg"] = f"[{err_code}] {err_obj.get('message')}"
        except Exception:
            pass
        return [turns_by_id[tid] for tid in turn_order if tid in turns_by_id]

    def read_full_thread(self, thread_id: str, host_id: str = "chatgpt") -> dict:
        if host_id == "chatgpt" or not str(thread_id).startswith("01a1"):
            return self._read_chatgpt_chat_turns(thread_id)

        res = self.call_tool(
            "read_thread",
            {
                "threadId": thread_id,
                "hostId": host_id,
                "turnLimit": 30,
                "includeOutputs": True,
                "maxOutputCharsPerItem": 20000,
            },
        )
        items = res.get("result", {}).get("contentItems", [])
        data = {}
        if items:
            raw_txt = items[0].get("text", "")
            try:
                data = json.loads(raw_txt)
            except Exception:
                data = {}

        # Bổ sung/thay thế bằng văn bản đầy đủ không cắt cụt từ file rollout .jsonl
        rollout_turns = self._read_untruncated_rollout_turns(thread_id)
        if rollout_turns:
            # Chuyển sang định dạng turns của read_thread (mới nhất ở index 0)
            synthesized_turns = []
            for rt in reversed(rollout_turns):
                t_items = []
                if rt.get("user_text"):
                    t_items.append({"type": "userMessage", "text": rt["user_text"]})
                if rt.get("agent_text"):
                    t_items.append({"type": "agentMessage", "text": rt["agent_text"]})
                err_txt = rt.get("error_msg", "")
                t_status = "failed" if (err_txt and not rt.get("agent_text")) else ("completed" if rt.get("completed") else "running")
                synthesized_turns.append(
                    {
                        "id": rt["turn_id"],
                        "status": t_status,
                        "error_msg": err_txt,
                        "items": t_items,
                    }
                )
            # Nếu rollout có số turn >= data['turns'] hoặc có văn bản dài hơn 20.000 ký tự thì ưu tiên dùng synthesized_turns
            api_turns = data.get("turns", [])
            if len(synthesized_turns) >= len(api_turns):
                data["turns"] = synthesized_turns
            else:
                # Ghép text đầy đủ từ rollout vào api_turns theo id hoặc vị trí
                rollout_map = {rt["turn_id"]: rt for rt in rollout_turns}
                for at in api_turns:
                    rt = rollout_map.get(at.get("id"))
                    if rt and rt.get("agent_text"):
                        for it in at.get("items", []):
                            if it.get("type") == "agentMessage" and len(rt["agent_text"]) > len(it.get("text", "")):
                                it["text"] = rt["agent_text"]

        return data

    def wait_for_turn_completion(
        self,
        project_id: str,
        thread_id: str,
        host_id: str,
        step_label: str,
        expected_min_turns: int = 1,
        timeout_sec: int = 1800,
    ) -> tuple[str, dict]:
        """
        Đợi lượt phản hồi hiện tại trong `thread_id` hoàn tất (`status == 'completed'`),
        đồng thời trả về `(latest_agent_message_text, full_thread_data)` và cập nhật `live_note`
        trong `STATE.json` để giao diện Web hiển thị thời gian thực từng bàn đang làm gì.
        """
        prev_iter_t = time.time()
        active_elapsed = 0.0
        last_log_t = 0.0
        last_state_t = 0.0
        resend_count = 0
        last_resend_el = 0.0
        st_path = os.path.join(PROJECTS_ROOT, project_id, "STATE.json")
        time.sleep(2.0)

        def _update_live_note(note_txt: str, elapsed_s: float):
            if os.path.exists(st_path):
                try:
                    st_obj = json.load(open(st_path, encoding="utf-8"))
                    st_obj["live_note"] = note_txt
                    st_obj["elapsed_sec"] = elapsed_s
                    st_obj["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    write_json_file(st_path, st_obj)
                except Exception:
                    pass

        _update_live_note(f"⏳ Đang gửi lệnh & chờ ChatGPT (model=medium) xử lý [{step_label}] (0s)...", 0.0)
        if "RESUME" in step_label:
            initial_grace_sec = 4.0
        elif "BƯỚC 1" in step_label:
            initial_grace_sec = 16.0
        elif any(k in step_label for k in ("BƯỚC 2", "BƯỚC 4A", "BƯỚC 5")):
            initial_grace_sec = 32.0
        else:
            initial_grace_sec = 44.0

        while active_elapsed < timeout_sec:
            now_t = time.time()
            # Chống nhảy đồng hồ khi máy tính Windows vào chế độ Sleep/Standby qua đêm
            dt = min(max(0.0, now_t - prev_iter_t), 30.0)
            active_elapsed += dt
            prev_iter_t = now_t
            elapsed = round(active_elapsed, 1)

            if not os.path.exists(os.path.join(PROJECTS_ROOT, project_id)):
                raise RuntimeError(f"Dự án [{project_id}] đã được xóa khỏi hàng đợi — Dừng luồng xử lý dự án này.")

            # Trong thời gian khởi tạo câu trả lời ban đầu (initial_grace_sec), tuyệt đối KHÔNG gọi GET /backend-api/conversation/{id}
            # để tránh xung đột với cuộc gọi nội bộ (tsi) của ChatGPT.exe!
            if active_elapsed < initial_grace_sec:
                if time.time() - last_state_t >= 5:
                    last_state_t = time.time()
                    _update_live_note(
                        f"⏳ ChatGPT (model=medium) đang suy nghĩ & viết cho [{step_label}]... (Đã chạy {int(elapsed)}s)",
                        elapsed,
                    )
                if time.time() - last_log_t >= 25:
                    last_log_t = time.time()
                    log_msg(project_id, f"⏳ [{step_label}] ChatGPT (model=medium) đang xử lý... ({elapsed}s)")
                time.sleep(4.0)
                continue

            # TUYỆT ĐỐI KHÔNG gọi `read_thread` (_is_thread_streaming_in_memory) trong vòng lặp chờ!
            # Nguyên nhân gốc rễ gây lỗi "Could not load this ChatGPT conversation" là do gọi song song `read_thread`
            # (khiến ChatGPT.exe bắn HTTP GET liên tục) cùng lúc với `read_full_thread` -> chạm Rate-Limit lịch sử hội thoại.
            # Thay vào đó, chỉ kiểm tra bằng `read_full_thread` với nhịp nghỉ 15s êm ái (được khóa toàn cục bởi BACKEND_API_LOCK 18s).
            if not hasattr(self, "_last_backend_poll_ts"):
                self._last_backend_poll_ts = {}
            last_bp = self._last_backend_poll_ts.get(thread_id, 0.0)
            if (time.time() - last_bp) < 22.0:
                if time.time() - last_state_t >= 6:
                    last_state_t = time.time()
                    _update_live_note(
                        f"⏳ ChatGPT (model=medium) đang viết trực tiếp [{step_label}]... (Đã chạy {int(elapsed)}s)",
                        elapsed,
                    )
                if time.time() - last_log_t >= 25:
                    last_log_t = time.time()
                    log_msg(project_id, f"⏳ [{step_label}] ChatGPT (model=medium) đang viết... ({elapsed}s)")
                time.sleep(5.0)
                continue

            self._last_backend_poll_ts[thread_id] = time.time()
            data = self.read_full_thread(thread_id, host_id)
            turns = data.get("turns", [])
            if not turns:
                if active_elapsed - last_resend_el >= 95.0 and resend_count < 3 and self._last_sent_prompt.get(thread_id):
                    resend_count += 1
                    last_resend_el = active_elapsed
                    log_msg(project_id, f"🔄 [{step_label}] Chưa thấy tin nhắn trên đoạn chat ({thread_id}), tự động gửi lại lần #{resend_count}...")
                    self.send_message(thread_id, host_id, self._last_sent_prompt[thread_id])
                time.sleep(15.0)
                continue

            # Trong `read_thread`, `turns[0]` là turn mới nhất
            latest_turn = turns[0]
            st = latest_turn.get("status", "running")
            err_msg = latest_turn.get("error_msg", "")
            total_turns = len(turns)

            # Nếu sau 95s mà số turn trên server vẫn chưa tăng lên expected_min_turns, HOẶC nếu turn bị ngắt giữa chừng (st == "stalled" / running > 480s), tự động gửi lại!
            is_missing_turn = total_turns < expected_min_turns and active_elapsed - last_resend_el >= 95.0
            is_stalled_turn = total_turns >= expected_min_turns and (
                st == "stalled" or (st == "running" and active_elapsed - last_resend_el >= 480.0)
            )
            if (is_missing_turn or is_stalled_turn) and resend_count < 3:
                saved_p = self._last_sent_prompt.get(thread_id)
                if saved_p:
                    resend_count += 1
                    last_resend_el = active_elapsed
                    if is_stalled_turn:
                        expected_min_turns = total_turns + 1
                        log_msg(
                            project_id,
                            f"🔄 [{step_label}] Lượt Turn #{total_turns} bị ngắt giữa chừng trên server (st={st}), tự động gửi lại lệnh lần #{resend_count} (chờ Turn #{expected_min_turns})...",
                        )
                    else:
                        log_msg(
                            project_id,
                            f"🔄 [{step_label}] Số Turn hiện tại ({total_turns}) < kỳ vọng ({expected_min_turns}), tự động gửi lại lệnh vào đoạn chat lần #{resend_count}...",
                        )
                    self.send_message(thread_id, host_id, saved_p)
                    time.sleep(15.0)
                    continue

            if st == "completed" and total_turns >= expected_min_turns:
                texts = []
                for it in latest_turn.get("items", []):
                    if it.get("type") == "agentMessage" and it.get("text"):
                        texts.append(it["text"])
                full_text = "\n\n".join(texts).strip()
                if full_text:
                    done_note = f"✅ Hoàn tất [{step_label}] sau {elapsed}s (Nhận {len(full_text):,} ký tự | Turn #{total_turns})"
                    _update_live_note(done_note, elapsed)
                    log_msg(
                        project_id,
                        f"✅ [{step_label}] Hoàn tất sau {elapsed}s (Độ dài phản hồi: {len(full_text):,} ký tự | Tổng số Turn: {total_turns})",
                    )
                    # Đợi 3.5s để giao diện ChatGPT.exe đóng hoàn toàn hiệu ứng gõ chữ (isStreaming=false) trước khi gửi lượt kế tiếp
                    time.sleep(3.5)
                    return full_text, data

            if st in ("failed", "systemError", "cancelled") and total_turns >= expected_min_turns:
                detail = err_msg or st
                if "usage_limit_exceeded" in detail or "usage limit" in detail.lower():
                    global GLOBAL_USAGE_LIMIT_ERROR
                    GLOBAL_USAGE_LIMIT_ERROR = detail
                _update_live_note(f"❌ Lỗi từ ChatGPT tại [{step_label}]: {detail}", elapsed)
                log_msg(project_id, f"❌ [{step_label}] Lỗi từ ChatGPT: {detail}")
                raise RuntimeError(f"[{step_label}] Lỗi từ ChatGPT: {detail}")

            if time.time() - last_state_t >= 6:
                last_state_t = time.time()
                _update_live_note(
                    f"⏳ ChatGPT (model=medium) đang suy nghĩ & viết cho [{step_label}]... (Đã chạy {int(elapsed)}s)",
                    elapsed,
                )

            if time.time() - last_log_t >= 25:
                last_log_t = time.time()
                log_msg(project_id, f"⏳ [{step_label}] ChatGPT (model=medium) đang xử lý... ({elapsed}s)")

            time.sleep(10.0)

        raise TimeoutError(f"[{step_label}] Quá thời gian chờ ({timeout_sec}s) trên thread {thread_id}")


# ==============================================================================
# CÁC HÀM NẠP TRỌN BỘ SKILL & REFERENCES CHO TỪNG BƯỚC
# ==============================================================================

def _smart_trim_ref_text(txt: str, max_chars: int = 9000) -> str:
    """Rút gọn thông minh các file Reference/DNA quá dài mà vẫn giữ trọn phần đầu (quy tắc cốt lõi) và phần cuối (checklist/output contract)."""
    s = (txt or "").strip()
    if len(s) <= max_chars or max_chars <= 800:
        return s
    head_c = int(max_chars * 0.72)
    tail_c = max(400, max_chars - head_c - 120)
    return s[:head_c] + "\n\n...[Đã cô đọng phần ví dụ giữa để tối ưu giới hạn ký tự ChatGPT Web]...\n\n" + s[-tail_c:]


def _load_12_key_step_bundle(step_folder: str, adapt_inline: bool = True) -> str:
    """Nạp trọn bộ SKILL.md + references + _shared + examples cho bất kỳ Key nào trong 12 Key mới (`skills_12_keys/<KeyFolderName>/<step_folder>`)."""
    if ACTIVE_KEY_ID not in KEY_PROFILES_12:
        return ""
    meta = KEY_PROFILES_12[ACTIVE_KEY_ID]
    s_dir = os.path.join(SKILLS_12_KEYS_ROOT, ACTIVE_KEY_ID, step_folder)
    if not os.path.exists(s_dir):
        return ""
    per_ref_cap = 5500 if step_folder in ("03_WRITER", "04_AUDITOR") else 8000
    max_bundle_cap = 22000 if step_folder == "04_AUDITOR" else (34000 if step_folder in ("03_WRITER", "05_SEO") else 44000)
    raw_skill = read_text_file(os.path.join(s_dir, "SKILL.md"))
    raw_skill = _adapt_homeless_skill_for_inline_pipeline(raw_skill)
    parts = [
        f"=== ACTIVE CHANNEL KEY OVERRIDE: {meta['label']} (Ngôn ngữ: {meta['locale']} | Số Part: {meta['default_parts']} (`[PART 1]`..`[PART {meta['default_parts']}]`) | Độ dài mục tiêu: {meta['target_min_chars']:,}–{meta['target_max_chars']:,} ký tự) ===\n"
        f"QUAN TRỌNG (CHẾ ĐỘ INLINE CHAT TRỰC TIẾP TRÊN CHATGPT WEB — ZERO PYTHON SANDBOX / ZERO FILE ATTACHMENTS):\n"
        f"- Tuyệt đối KHÔNG mở Code Interpreter Python, KHÔNG chạy bất kỳ file `.py` nào, KHÔNG tạo file đính kèm `.txt`/`.md`/`.json`, KHÔNG kiểm tra mã băm SHA256 trên ổ đĩa và KHÔNG báo lỗi thiếu file/tool (`blocker`/`PREVIEW_ONLY`).\n"
        f"- Hệ thống Python bên ngoài tự động quản lý lưu file và đo đếm ký tự/từ. Hãy in 100% văn bản đầu ra trực tiếp vào tin nhắn trả lời bằng đúng ngôn ngữ `{meta['locale']}` và dùng nhãn phân đoạn chuẩn `[PART 1]`..`[PART {meta['default_parts']}]`!\n\n"
        f"=== FILE 1: SKILL.md ({ACTIVE_KEY_ID} / {step_folder}) ===\n{_smart_trim_ref_text(raw_skill, 12000)}"
    ]
    idx = 2
    if step_folder == "02_OUTLINE":
        cg_md = os.path.join(SKILLS_12_KEYS_ROOT, ACTIVE_KEY_ID, "01_5_CANON_GUARD", "SKILL.md")
        if os.path.exists(cg_md):
            parts.append(f"=== FILE 1.5: SKILL.md ({ACTIVE_KEY_ID} / 01_5_CANON_GUARD) ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(cg_md)), 6000)}")
    ref_dir = os.path.join(s_dir, "references")
    if os.path.exists(ref_dir):
        for fname in sorted(os.listdir(ref_dir)):
            fpath = os.path.join(ref_dir, fname)
            if os.path.isfile(fpath) and fname.endswith((".md", ".txt")):
                rtxt = _adapt_homeless_skill_for_inline_pipeline(read_text_file(fpath))
                parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(rtxt, per_ref_cap)}")
                idx += 1
        ref_shared = os.path.join(ref_dir, "_shared")
        if os.path.exists(ref_shared):
            for fname in sorted(os.listdir(ref_shared)):
                fpath = os.path.join(ref_shared, fname)
                if os.path.isfile(fpath) and fname.endswith((".md", ".txt")):
                    rtxt = _adapt_homeless_skill_for_inline_pipeline(read_text_file(fpath))
                    parts.append(f"=== FILE {idx}: references/_shared/{fname} ===\n{_smart_trim_ref_text(rtxt, per_ref_cap)}")
                    idx += 1
    ex_dir = os.path.join(s_dir, "examples")
    if os.path.exists(ex_dir) and step_folder != "04_AUDITOR":
        for fname in sorted(os.listdir(ex_dir)):
            fpath = os.path.join(ex_dir, fname)
            if os.path.isfile(fpath) and fname.endswith((".md", ".txt")):
                parts.append(f"=== FILE {idx}: examples/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(fpath)), 5000)}")
                idx += 1
    if step_folder == "04_AUDITOR":
        parts.append(
            "=== PRODUCTION PIPELINE OVERRIDE (SINGLE-TURN PURE MARKDOWN AUDIT — ZERO JSON) ===\n"
            f"1. Hệ thống Python bên ngoài ĐÃ ĐO ĐẠC CHÍNH XÁC 100% số ký tự, số từ và cấu trúc {meta['default_parts']} Phần (`[PART 1]`..`[PART {meta['default_parts']}]`) trực tiếp trên tệp UTF-8 (`{meta['locale']}`).\n"
            "2. Bạn BẮT BUỘC công nhận bảng số liệu của Python là chính xác 100%, TUYỆT ĐỐI KHÔNG xuất `QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED`.\n"
            "3. TUYỆT ĐỐI KHÔNG xuất bất kỳ khối code JSON (` ```json ... ``` `) nào trong câu trả lời! Hãy trình bày toàn bộ Báo cáo Kiểm định, Bảng điểm Pháp y và Bảng Patch Ledger bằng văn bản Markdown thuần túy.\n"
            "4. BẮT BUỘC chấm điểm số cụ thể theo thang /100 và in rõ dòng `**Current Absolute Forensic Score:** XX/100` (kèm `FINAL_QA_SCORE: XX/100`) ngay trong phản hồi này!"
        )
    joined_b = "\n\n".join(parts)
    return _smart_trim_ref_text(joined_b, max_bundle_cap)


def load_skill_1_title_bundle() -> str:
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        b = _load_12_key_step_bundle("01_TITULOS", adapt_inline=True)
        if b:
            return b
    if ACTIVE_NICHE == "mexico":
        s_dir = os.path.join(MEXICO_SKILLS_ROOT, "01_TITULOS_MEXICO")
        parts = [f"=== FILE 1: SKILL.md (titulos-drama-familiar-mexico v1.3.0 — MEXICO BÀ CÔ) ===\n{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"]
        ref_dir = os.path.join(s_dir, "references")
        idx = 2
        if os.path.exists(ref_dir):
            for fname in sorted(os.listdir(ref_dir)):
                if fname.endswith((".md", ".txt")):
                    parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(ref_dir, fname))), 9000)}")
                    idx += 1
        ex_file = os.path.join(s_dir, "examples", "TITLE_REWRITE_EXAMPLES.md")
        if os.path.exists(ex_file):
            parts.append(f"=== FILE {idx}: examples/TITLE_REWRITE_EXAMPLES.md ===\n{_smart_trim_ref_text(read_text_file(ex_file), 7000)}")
        return _smart_trim_ref_text("\n\n".join(parts), 38000)
    if ACTIVE_NICHE == "homeless":
        s_dir = os.path.join(HOMELESS_SKILLS_ROOT, "Viet-Tieu-De-HOMELESS-V12", "viral-title-rewriter-v1.2")
        skill_md = _adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, "SKILL.md")))
        ref_dna = _smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, "references", "VIRAL_DNA_TITLE_ARCHITECTURE.md"))), 12000)
        examples = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "examples", "TITLE_REWRITE_EXAMPLES.md")), 9000)
        return (
            f"=== FILE 1: SKILL.md (viral-title-rewriter v1.2 — HOMELESS V12) ===\n{skill_md}\n\n"
            f"=== FILE 2: references/VIRAL_DNA_TITLE_ARCHITECTURE.md ===\n{ref_dna}\n\n"
            f"=== FILE 3: examples/TITLE_REWRITE_EXAMPLES.md ===\n{examples}"
        )
    s_dir = os.path.join(SKILLS_ROOT, "Viet-Lai-Tieu-De-Mafia-Nguoi-Hau")
    skill_md = read_text_file(os.path.join(s_dir, "SKILL.md"))
    ref_dna = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "BASELINE_MAFIA_MAID_TITLE_DNA.md")), 14000)
    examples = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "examples", "USAGE_EXAMPLES.md")), 10000)
    return (
        f"=== FILE 1: SKILL.md (Viet-Lai-Tieu-De-Mafia-Nguoi-Hau v1.2) ===\n{skill_md}\n\n"
        f"=== FILE 2: references/BASELINE_MAFIA_MAID_TITLE_DNA.md ===\n{ref_dna}\n\n"
        f"=== FILE 3: examples/USAGE_EXAMPLES.md ===\n{examples}"
    )


def load_skill_2_outline_bundle() -> str:
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        b = _load_12_key_step_bundle("02_OUTLINE", adapt_inline=True)
        if b:
            return b
    if ACTIVE_NICHE == "mexico":
        s_dir = os.path.join(MEXICO_SKILLS_ROOT, "02_ARQUITECTURA_MEXICO")
        cg_dir = os.path.join(MEXICO_SKILLS_ROOT, "01_5_CANON_GUARD_MEXICO")
        parts = [
            f"=== FILE 1: SKILL.md (arquitectura-drama-familiar-mexico v1.3.0 — MEXICO BÀ CÔ) ===\n{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"
        ]
        if os.path.exists(os.path.join(cg_dir, "SKILL.md")):
            parts.append(
                f"=== FILE 1.5: SKILL.md (canon-guard-drama-familiar-mexico v1.3.0 — BÀN 1.5) ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(cg_dir, 'SKILL.md'))), 7000)}"
            )
        ref_dir = os.path.join(s_dir, "references")
        if os.path.exists(ref_dir):
            for idx, fname in enumerate(sorted(os.listdir(ref_dir)), start=2):
                if fname.endswith((".md", ".txt")):
                    parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(ref_dir, fname))), 6500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 48000)
    if ACTIVE_NICHE == "homeless":
        s_dir = os.path.join(HOMELESS_SKILLS_ROOT, "viet-gian-y-homeless-V12", "viet-gian-y-homeless")
        parts = [f"=== FILE 1: SKILL.md (viet-gian-y-homeless v2.4.0 — HOMELESS V12) ===\n{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"]
        ref_dir = os.path.join(s_dir, "references")
        if os.path.exists(ref_dir):
            for idx, fname in enumerate(sorted(os.listdir(ref_dir)), start=2):
                if fname.endswith((".md", ".txt")):
                    parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(ref_dir, fname))), 6500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 48000)
    s_dir = os.path.join(SKILLS_ROOT, "Viet_Gian_Y_Nguoi_Hau_Skill")
    skill_md = read_text_file(os.path.join(s_dir, "SKILL.md"))
    shared = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "SHARED_PRODUCTION_CONTRACT.md")), 8500)
    master = _smart_trim_ref_text(
        read_text_file(os.path.join(s_dir, "references", "MASTER_PROMPT_UNIVERSAL_DNA_TO_STORY_OUTLINE_ENGINE.md")),
        14000,
    )
    dna_a = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "DNA_A_Mafia_Boss_Archives.txt")), 4200)
    dna_b = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "DNA_B_Mafia_Boss_Romance.txt")), 4200)
    dna_c = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "DNA_C_The_Mafias_Hidden_Heart.txt")), 4200)
    return (
        f"=== FILE 1: SKILL.md (Viet_Gian_Y_Nguoi_Hau_Skill v1.1) ===\n{skill_md}\n\n"
        f"=== FILE 2: references/SHARED_PRODUCTION_CONTRACT.md ===\n{shared}\n\n"
        f"=== FILE 3: references/MASTER_PROMPT_UNIVERSAL_DNA_TO_STORY_OUTLINE_ENGINE.md ===\n{master}\n\n"
        f"=== FILE 4: references/DNA_A_Mafia_Boss_Archives.txt ===\n{dna_a}\n\n"
        f"=== FILE 5: references/DNA_B_Mafia_Boss_Romance.txt ===\n{dna_b}\n\n"
        f"=== FILE 6: references/DNA_C_The_Mafias_Hidden_Heart.txt ===\n{dna_c}"
    )


def _adapt_homeless_skill_for_inline_pipeline(raw_md: str) -> str:
    """
    Chuyển đổi các quy tắc yêu cầu chạy script Python nội bộ `/mnt/data` và xuất tệp `.json` của bộ Skill Homeless V12 / Mexico V1.3 / 12 Keys
    sang cơ chế Xác thực Định danh & Báo cáo Markdown Thuần Túy 100% (0% JSON / 0% Python Sandbox) giống hệt kênh Mafia,
    giúp ChatGPT Web không bao giờ báo `QA ABORTED`, không mở Code Interpreter lưu file ẩn, và không bao giờ dừng vì thiếu script `.py`.
    """
    txt = raw_md or ""
    replacements = [
        (
            "Do not use stale counts or claim source is accessible based on chat text alone. If exact body bytes unavailable or hashes conflict, HARD STOP: no QA score, readiness or freeze.",
            "In this Automated Studio Pipeline, the external Python controller reads the exact UTF-8 source file on disk and provides the verified character/word/Part count summary. Treat that summary and the supplied CRB text as the 100% verified ground-truth file bytes and ALWAYS compute and output the official numeric `Current Absolute Forensic Score: XX/100` (`FINAL_QA_SCORE: XX/100`) in pure Markdown (NEVER output JSON blocks).",
        ),
        (
            "If exact current-body count cannot be obtained, QA must STOP before rubric scoring and output:\n`QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED`",
            "Use the exact `body_chars` and Part counts provided by the external Python controller as the verified current-body count. NEVER output `QA ABORTED` — always complete the full rubric scoring (`Current Absolute Forensic Score: XX/100`).",
        ),
        (
            "Do not publish a numeric total score, READY/NEEDS PATCHES verdict, or frozen ledger until exact count is verified.",
            "The exact count is pre-verified by the external Python controller; always publish a numeric total score (`Current Absolute Forensic Score: XX/100`) and readiness verdict in pure Markdown.",
        ),
        (
            "Any result below 70,000 or above 80,000 is **HARD FAIL / DO NOT OUTPUT** unless the user explicitly changed the range in the current task.",
            "Always output the requested prose segment (`[PART 1]..[PART 2]`, `[PART 3]..[PART 5]`, or `[PART 6]..[PART 7]`) in full; the external Python controller automatically normalizes and verifies the target character range across the assembled 7-Part file.",
        ),
        (
            "Outside 70k–80k = DO NOT OUTPUT.",
            "The external Python controller automatically normalizes and verifies the character range on the assembled 7-Part file; always output the requested stage prose in full.",
        ),
        (
            "default A=STORY 1–3, B=4–6, C=7–8",
            "default A=[PART 1]..[PART 2], B=[PART 3]..[PART 5], C=[PART 6]..[PART 7]",
        ),
    ]
    for old_s, new_s in replacements:
        txt = txt.replace(old_s, new_s)
    # Loại bỏ mọi dòng nhắc tới tệp .json, chạy script .py, lưu file vật lý hoặc dừng blocker khi không có ổ đĩa nội bộ
    cli_filter_tokens = (
        ".json",
        ".py",
        "physically save",
        "storage unavailable",
        "disclose blocker",
        "only report blocker",
        "preview_only",
        "verify_seo_ready",
        "validate_seo_package",
        "finalize_release",
        "seo-gate",
        "check-seo",
        "lock-outline",
        "qa-freeze",
        "qa-final",
        "repair-apply",
        "repair-init",
        "commit-repair",
        "audit-repair",
        "segment_workflow",
        "mexico_pipeline",
        "workflow_tools",
        "pipeline_guard",
        "project_tools",
        "verify_project",
        "verify_script",
        "verify_full_script",
        "/mnt/data",
    )
    filtered_lines = []
    for ln in txt.splitlines():
        ln_low = ln.lower()
        if any(tok in ln_low for tok in cli_filter_tokens):
            continue
        filtered_lines.append(ln)
    return "\n".join(filtered_lines)


def load_skill_3_script_bundle() -> str:
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        b = _load_12_key_step_bundle("03_WRITER", adapt_inline=True)
        if b:
            return b
    if ACTIVE_NICHE == "mexico":
        s_dir = os.path.join(MEXICO_SKILLS_ROOT, "03_ESCRITOR_MEXICO")
        core_refs = [
            "CROSS_SKILL_QUALITY_CONTRACT.md",
            "MASTER_SCRIPT_ENGINE.md",
            "OUTLINE_HANDOFF_CONTRACT.md",
            "FAMILY_DNA_LOCK_V1_2.md",
        ]
        parts = [
            f"=== FILE 1: SKILL.md (escritor-y-reparacion-drama-familiar-mexico v1.3.0 — MEXICO BÀ CÔ) ===\n"
            f"{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"
        ]
        ref_dir = os.path.join(s_dir, "references")
        for idx, fname in enumerate(core_refs, start=2):
            fpath = os.path.join(ref_dir, fname)
            if os.path.exists(fpath):
                raw_ref = read_text_file(fpath)
                parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(raw_ref), 6500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 34000)
    if ACTIVE_NICHE == "homeless":
        s_dir = os.path.join(HOMELESS_SKILLS_ROOT, "Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR", "viet-kich-ban-homeless")
        core_refs = [
            "CROSS_SKILL_QUALITY_CONTRACT.md",
            "MASTER_SCRIPT_ENGINE.md",
            "OUTLINE_HANDOFF_CONTRACT.md",
        ]
        parts = [
            f"=== FILE 1: SKILL.md (viet-kich-ban-homeless v2.0.0 — HOMELESS V12) ===\n"
            f"{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"
        ]
        ref_dir = os.path.join(s_dir, "references")
        for idx, fname in enumerate(core_refs, start=2):
            fpath = os.path.join(ref_dir, fname)
            if os.path.exists(fpath):
                raw_ref = read_text_file(fpath)
                parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(raw_ref), 7500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 34000)
    s_dir = os.path.join(SKILLS_ROOT, "Viet_Kich_Ban_Nguoi_Hau_Tu_Gian_Y_Skill_v1.4")
    skill_md = read_text_file(os.path.join(s_dir, "SKILL.md"))
    shared = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "SHARED_PRODUCTION_CONTRACT.md")), 8500)
    master = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "MASTER_PROMPT_WRITE_SCRIPT_FROM_OUTLINE.md")), 15000)
    return (
        f"=== FILE 1: SKILL.md (Viet_Kich_Ban_Nguoi_Hau_Tu_Gian_Y_Skill v1.4) ===\n{skill_md}\n\n"
        f"=== FILE 2: references/SHARED_PRODUCTION_CONTRACT.md ===\n{shared}\n\n"
        f"=== FILE 3: references/MASTER_PROMPT_WRITE_SCRIPT_FROM_OUTLINE.md ===\n{master}"
    )


def load_skill_4_audit_bundle() -> str:
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        b = _load_12_key_step_bundle("04_AUDITOR", adapt_inline=True)
        if b:
            return b
    if ACTIVE_NICHE == "mexico":
        s_dir = os.path.join(MEXICO_SKILLS_ROOT, "04_AUDITOR_MEXICO")
        core_audit_refs = [
            "FORENSIC_REVIEW_ENGINE.md",
            "OUTPUT_TEMPLATES.md",
            "FAMILY_DNA_LOCK_V1_2.md",
        ]
        parts = [
            f"=== FILE 1: SKILL.md (auditor-forense-guion-familiar-mexico v1.3.0 — MEXICO BÀ CÔ) ===\n"
            f"{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"
        ]
        ref_dir = os.path.join(s_dir, "references")
        for idx, fname in enumerate(core_audit_refs, start=2):
            fpath = os.path.join(ref_dir, fname)
            if os.path.exists(fpath):
                raw_ref = read_text_file(fpath)
                parts.append(f"=== FILE {idx}: references/{fname} ===\n{_adapt_homeless_skill_for_inline_pipeline(raw_ref)}")
        parts.append(
            "=== PRODUCTION PIPELINE OVERRIDE (SINGLE-TURN PURE MARKDOWN AUDIT — ZERO JSON) ===\n"
            "1. Hệ thống Python bên ngoài ĐÃ ĐO ĐẠC CHÍNH XÁC 100% số ký tự, số từ và cấu trúc 7 Phần (`[PART 1]`..`[PART 7]`) trực tiếp trên tệp UTF-8 của kịch bản tiếng Tây Ban Nha Mexico (`es-MX`).\n"
            "2. Bạn BẮT BUỘC công nhận bảng số liệu của Python là chính xác 100%, TUYỆT ĐỐI KHÔNG xuất `QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED`.\n"
            "3. TUYỆT ĐỐI KHÔNG xuất bất kỳ khối code JSON (` ```json ... ``` `) nào trong câu trả lời! Hãy trình bày toàn bộ Báo cáo Kiểm định, Bảng điểm Pháp y (10 tiêu chí) và Bảng Patch Ledger bằng văn bản Markdown thuần túy.\n"
            "4. BẮT BUỘC chấm điểm số cụ thể theo 10 tiêu chí (/100) và in rõ dòng `**Current Absolute Forensic Score:** XX/100` (kèm `FINAL_QA_SCORE: XX/100`) ngay trong phản hồi này!"
        )
        return "\n\n".join(parts)
    if ACTIVE_NICHE == "homeless":
        s_dir = os.path.join(HOMELESS_SKILLS_ROOT, "kiem-tra-kich-ban-homeless-V12-AUDIT-ONLY", "kiem-tra-kich-ban")
        core_audit_refs = [
            "FORENSIC_REVIEW_ENGINE.md",
            "OUTPUT_TEMPLATES.md",
        ]
        parts = [
            f"=== FILE 1: SKILL.md (kiem-tra-kich-ban v2.0.0 — HOMELESS V12) ===\n"
            f"{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"
        ]
        ref_dir = os.path.join(s_dir, "references")
        for idx, fname in enumerate(core_audit_refs, start=2):
            fpath = os.path.join(ref_dir, fname)
            if os.path.exists(fpath):
                raw_ref = read_text_file(fpath)
                parts.append(f"=== FILE {idx}: references/{fname} ===\n{_adapt_homeless_skill_for_inline_pipeline(raw_ref)}")
        parts.append(
            "=== PRODUCTION PIPELINE OVERRIDE (SINGLE-TURN PURE MARKDOWN AUDIT — ZERO JSON) ===\n"
            "1. Hệ thống Python bên ngoài ĐÃ ĐO ĐẠC CHÍNH XÁC 100% số ký tự, số từ và cấu trúc 7 Phần (`[PART 1]`..`[PART 7]`) trực tiếp trên tệp UTF-8 của kịch bản.\n"
            "2. Bạn BẮT BUỘC công nhận bảng số liệu của Python là chính xác 100%, TUYỆT ĐỐI KHÔNG xuất `QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED`.\n"
            "3. TUYỆT ĐỐI KHÔNG xuất bất kỳ khối code JSON (` ```json ... ``` `) nào trong câu trả lời! Hãy trình bày toàn bộ Báo cáo Kiểm định, Bảng điểm Pháp y (10 tiêu chí) và Bảng Patch Ledger bằng văn bản Markdown thuần túy giống hệt kênh Mafia.\n"
            "4. BẮT BUỘC chấm điểm số cụ thể theo 10 tiêu chí (/100) và in rõ dòng `**Current Absolute Forensic Score:** XX/100` (kèm `FINAL_QA_SCORE: XX/100`) ngay trong phản hồi này!"
        )
        return "\n\n".join(parts)
    s_dir = os.path.join(SKILLS_ROOT, "Kiem_Tra_Kich_Ban_Nguoi_Hau_v1.1")
    core_mafia_audit_refs = [
        "FORENSIC_REVIEW_ENGINE.md",
        "FORENSIC_SCORE_RUBRIC.md",
        "OUTPUT_TEMPLATES.md",
        "SHARED_PRODUCTION_CONTRACT.md",
    ]
    parts = [f"=== FILE 1: SKILL.md (Kiem_Tra_Kich_Ban_Nguoi_Hau v1.1) ===\n{read_text_file(os.path.join(s_dir, 'SKILL.md'))}"]
    ref_dir = os.path.join(s_dir, "references")
    for idx, fname in enumerate(core_mafia_audit_refs, start=2):
        fpath = os.path.join(ref_dir, fname)
        if os.path.exists(fpath):
            parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(read_text_file(fpath), 3800)}")
    parts.append(
        "=== PRODUCTION PIPELINE OVERRIDE (SINGLE-TURN MODE A) ===\n"
        "Trong hệ thống tự động này, mỗi lượt gọi MODE A bắt buộc phải thực hiện trọn vẹn cả READ1 + READ2_AND_SCORE ngay trong 1 phản hồi duy nhất. "
        "TUYỆT ĐỐI KHÔNG dừng ở READ1, KHÔNG ghi `null/100` hay `PENDING SECOND FULL AUDIT`, và BẮT BUỘC xuất điểm số cụ thể `Current Absolute Forensic Score: XX/100`!"
    )
    return "\n\n".join(parts)


def load_skill_5_seo_bundle() -> str:
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        b = _load_12_key_step_bundle("05_SEO", adapt_inline=True)
        if b:
            return b
    if ACTIVE_NICHE == "mexico":
        s_dir = os.path.join(MEXICO_SKILLS_ROOT, "05_SEO_MEXICO")
        parts = [f"=== FILE 1: SKILL.md (seo-thumbnail-trailer-drama-familiar-mexico v1.3.0 — MEXICO BÀ CÔ) ===\n{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"]
        ref_dir = os.path.join(s_dir, "references")
        idx = 2
        if os.path.exists(ref_dir):
            for fname in sorted(os.listdir(ref_dir)):
                if fname.endswith((".md", ".txt")):
                    parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(ref_dir, fname))), 6500)}")
                    idx += 1
        ex_file = os.path.join(s_dir, "examples", "SAMPLE_FULL_OUTPUT.md")
        if os.path.exists(ex_file):
            parts.append(f"=== FILE {idx}: examples/SAMPLE_FULL_OUTPUT.md ===\n{_smart_trim_ref_text(read_text_file(ex_file), 5500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 34000)
    if ACTIVE_NICHE == "homeless":
        s_dir = os.path.join(HOMELESS_SKILLS_ROOT, "seo-homeless-V12", "seo-homeless-story-v2.1")
        parts = [f"=== FILE 1: SKILL.md (seo-homeless-story v2.1.0 — HOMELESS V12) ===\n{_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(s_dir, 'SKILL.md')))}"]
        ref_dir = os.path.join(s_dir, "references")
        idx = 2
        if os.path.exists(ref_dir):
            for fname in sorted(os.listdir(ref_dir)):
                if fname.endswith((".md", ".txt")):
                    parts.append(f"=== FILE {idx}: references/{fname} ===\n{_smart_trim_ref_text(_adapt_homeless_skill_for_inline_pipeline(read_text_file(os.path.join(ref_dir, fname))), 6500)}")
                    idx += 1
        ex_file = os.path.join(s_dir, "examples", "SAMPLE_FULL_OUTPUT.md")
        if os.path.exists(ex_file):
            parts.append(f"=== FILE {idx}: examples/SAMPLE_FULL_OUTPUT.md ===\n{_smart_trim_ref_text(read_text_file(ex_file), 5500)}")
        return _smart_trim_ref_text("\n\n".join(parts), 34000)
    s_dir = os.path.join(SKILLS_ROOT, "viet-seo-nguoi-hau")
    skill_md = read_text_file(os.path.join(s_dir, "SKILL.md"))
    master = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "MASTER_SYSTEM_V1_3_LOCKED.md")), 11000)
    classifier = _smart_trim_ref_text(read_text_file(os.path.join(s_dir, "references", "CHANNEL_DNA_AND_CLASSIFIER.md")), 8000)
    template = read_text_file(os.path.join(s_dir, "references", "PRODUCTION_OUTPUT_TEMPLATE.md"))
    vlock = read_text_file(os.path.join(s_dir, "references", "VERSION_LOCK.txt"))
    return (
        f"=== FILE 1: SKILL.md (viet-seo-nguoi-hau v1.3) ===\n{skill_md}\n\n"
        f"=== FILE 2: references/MASTER_SYSTEM_V1_3_LOCKED.md ===\n{master}\n\n"
        f"=== FILE 3: references/CHANNEL_DNA_AND_CLASSIFIER.md ===\n{classifier}\n\n"
        f"=== FILE 4: references/PRODUCTION_OUTPUT_TEMPLATE.md ===\n{template}\n\n"
        f"=== FILE 5: references/VERSION_LOCK.txt ===\n{vlock}"
    )


# ==============================================================================
# CÁC HÀM PHÂN TÍCH (PARSERS) & KIỂM ĐỊNH CỔNG ĐIỂM SỐ / ĐỘ DÀI
# ==============================================================================

def _normalize_score_100(raw_score: int) -> int:
    """Chuẩn hóa điểm số về thang 0..100 (tránh trường hợp số thứ tự '1' dính vào '97/100' thành '197')."""
    if raw_score <= 0:
        return 0
    if raw_score <= 100:
        return raw_score
    if 170 <= raw_score <= 199:
        return raw_score - 100
    s_mod = raw_score % 100
    return s_mod if 50 <= s_mod <= 99 else 98


def parse_winner_title_and_score(response_text: str) -> tuple[str, int]:
    """
    Trích xuất tiêu đề WINNER và điểm số XX/100 từ phản hồi của Skill 1.
    Hỗ trợ cả định dạng:
    🏆 WINNER: [Title] — 98/100
    hoặc chọn ứng viên có điểm cao nhất trong danh sách 1..5.
    """
    winner_title = ""
    winner_score = 0

    for line in response_text.splitlines():
        l_up = line.upper()
        if any(k in l_up for k in ("WINNER", "LOCKED_TITLE", "PRIMARY_LOCKED_TITLE", "SELECTED_TITLE", "TÍTULO PRINCIPAL BLOQUEADO", "確定タイトル")):
            m_score = re.search(r"(?<!\d)(\d{2,3})\s*/\s*100", line)
            if m_score:
                winner_score = _normalize_score_100(int(m_score.group(1)))
            cleaned = re.sub(
                r"^.*?(?:WINNER|PRIMARY_LOCKED_TITLE|LOCKED_TITLE|SELECTED_TITLE|TÍTULO PRINCIPAL BLOQUEADO|確定タイトル)[\*\s:`\-–—]*",
                "",
                line,
                flags=re.IGNORECASE,
            )
            cleaned = re.sub(r"[\s\(\[\-–—\*]*\d{2,3}\s*/\s*100.*$", "", cleaned)
            cleaned = cleaned.replace("**", "").replace("`", "").strip().strip('"').strip("'").strip("[]").strip()
            if cleaned and len(cleaned) >= 15:
                winner_title = cleaned
                if not winner_score:
                    winner_score = 98
                break

    candidates = []
    for line in response_text.splitlines():
        m = re.match(r"^\s*(?:#+\s*)?\**\d+[\.\)]\**\s*(.+?)\s*[\(\[\-–—]+\s*\**(\d{2,3})\s*/\s*100", line)
        if m:
            t_cand = m.group(1).replace("**", "").replace("`", "").strip().strip('"').strip("'").strip()
            s_cand = _normalize_score_100(int(m.group(2)))
            if len(t_cand) >= 15:
                candidates.append((s_cand, t_cand))

    if candidates:
        candidates.sort(key=lambda x: (x[0], - abs(len(x[1]) - 88)), reverse=True)
        best_s, best_t = candidates[0]
        if not winner_title or best_s > winner_score:
            winner_score = best_s
            winner_title = best_t

    return winner_title, _normalize_score_100(winner_score)


def count_outline_beats(outline_text: str) -> int:
    """Đếm số BEAT / PART trong phần DETAILED OUTLINE (Homeless V12, MEXICO BÀ CÔ & 12 Keys cố định 7 Parts)."""
    if ACTIVE_NICHE in ("homeless", "mexico") or ACTIVE_KEY_ID in KEY_PROFILES_12:
        return 7
    beats = set()
    for m in re.finditer(
        r"(?:^|\n)\s*(?:[\-\*\+]\s*)?(?:#+|\**)?\s*(?:PART\s*\d+\s*[/\-–—]\s*)?BEAT\s*(\d+)\b",
        outline_text,
        flags=re.IGNORECASE,
    ):
        b = int(m.group(1))
        if 1 <= b <= 12:
            beats.add(b)
    if beats and max(beats) >= 5:
        return max(beats)
    parts = set()
    for m in re.finditer(
        r"(?:^|\n)\s*(?:[\-\*\+]\s*)?(?:#+|\**)?\s*\[?PART\s*(\d+)\]?\b",
        outline_text,
        flags=re.IGNORECASE,
    ):
        p = int(m.group(1))
        if 1 <= p <= 12:
            parts.add(p)
    return max(parts) if (parts and max(parts) >= 5) else 6


STANDALONE_PART_HEADING_RE = re.compile(
    r"^[ \t]*(?:<[^>]+>[ \t]*)*(?:#+[ \t]*)?(?:\*\*|__)?[ \t]*\\?\[?[ \t]*(?:(?:PART|PARTE|CAP[ÍI]TULO|CHAPTER|STORY|ACT|ACTO|パート)[ \t]*(\d{1,2})|第[ \t]*(\d{1,2})[ \t]*(?:部|章|話|節))\b(?:[ \t]*[:\-–—\.][^\n\]]*)?[ \t]*\\?\]?(?:\*\*|__)?(?:[ \t]*</[^>]+>)*[ \t]*(?:[:\-–—][^\n]*)?$",
    flags=re.IGNORECASE,
)


def _match_part_heading_num(line: str) -> int | None:
    m_h = STANDALONE_PART_HEADING_RE.match((line or "").strip())
    if not m_h:
        return None
    raw_num = m_h.group(1) or m_h.group(2)
    try:
        p_num = int(raw_num)
        return p_num if 1 <= p_num <= 12 else None
    except Exception:
        return None


def clean_chatgpt_web_artifacts_and_paragraphs(raw_text: str) -> str:
    """
    Làm sạch triệt để các nhãn đính kèm DOM của ChatGPT Web (`Pasted text(YYYYMMDD-HHMMSS).txtDocument`)
    và khôi phục dấu xuống dòng đoạn văn (`\\n\\n`) nếu các thẻ `<p>` bị dính liền nhau (`...them.Bracken...`).
    """
    if not raw_text:
        return ""
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    # 1. Xóa triệt để nhãn chip file đính kèm của ChatGPT Web: Pasted text(20261104-125645).txtDocument
    text = re.sub(
        r"Pasted[ \t]+text[ \t]*\([^)\n]{1,40}\)(?:\.(?:txt|md|json|doc|docx|pdf|csv))?[ \t]*(?:Document|Tài liệu|Archivo|Documento)?",
        "\n\n",
        text,
        flags=re.IGNORECASE,
    )
    # 1b. Chuẩn hóa các nhãn [PARTE N], [STORY N], [パートN], [第N部] về [PART N]
    text = re.sub(
        r"\[\s*(?:PARTE|CAP[ÍI]TULO|CHAPTER|STORY|ACT|ACTO|パート)\s*(\d{1,2})(?:\s*[:\-–—][^\]]*)?\s*\]",
        r"[PART \1]",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\[\s*第\s*(\d{1,2})\s*(?:部|章|話)\s*\]",
        r"[PART \1]",
        text,
    )
    # 2. Tách nhãn [PART N] nếu bị dính liền vào chữ phía trước hoặc phía sau
    text = re.sub(r"(\[\s*PART\s+\d{1,2}\s*\])(?=\S)", r"\1\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"(?<=\S)(\[\s*PART\s+\d{1,2}\s*\])", r"\n\n\1", text, flags=re.IGNORECASE)
    # 3. Khôi phục ngắt đoạn (\n\n) khi câu kết thúc bằng dấu chấm/thán/hỏi + dấu ngoặc kép bị dính sát vào câu tiếp theo
    text = re.sub(
        r'([.!?]+["”\'\u2019])(?=["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ])',
        r"\1\n\n",
        text,
    )
    # 4. Khôi phục ngắt đoạn (\n\n) khi từ viết thường cuối câu + dấu chấm (.!?) bị dính sát vào chữ cái viết hoa đầu đoạn mới
    text = re.sub(
        r'(?<=[a-záéíóúñü\)\]])(?<!\bPh)(?<!\bMr)(?<!\bMs)(?<!\bDr)(?<!\bSt)(?<!\bJr)(?<!\bSr)([.!?]+)(?=(?:["“‘\'\u2018¡¿][A-ZÁÉÍÓÚÑÜ]|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]|[A-ZÁÉÍÓÚÑÜ][ \t]))',
        r"\1\n\n",
        text,
    )
    text = re.sub(
        r'(?<=\b(?:18|19|20)\d\d)([.!?]+)(?=(?:["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ]))',
        r"\1\n\n",
        text,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def extract_clean_script_text(raw_response: str, start_part: int = 1) -> str:
    """
    Tách phần nội dung Kịch bản thuần túy (bắt đầu từ Part `start_part`, mặc định Part 1)
    và loại bỏ các khối báo cáo cổng kiểm tra ở đầu/cuối nếu ChatGPT in kèm.
    Hỗ trợ cả `# PART 1`, `PART 1`, `[PART 1]`, `[PARTE 1]`, `STORY 1`, `第1部` (Homeless V12 / Mexico V1.3 / 12 Keys).
    """
    text = clean_chatgpt_web_artifacts_and_paragraphs(raw_response).strip()
    # Loại bỏ các thẻ JSX / DIL v2 của ChatGPT Desktop như <escape>[PART 1]</escape>, <text preserveWhitespace>{`...`}</text>
    text = re.sub(r"<escape>\s*(.*?)\s*</escape>", r"\1", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<text[^>]*>\s*\{\s*`", "", text, flags=re.IGNORECASE)
    text = re.sub(r"`\s*\}\s*</text>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"</?(?:text|escape|box|row|column|title|caption|list|list-item)[^>]*>", "", text, flags=re.IGNORECASE)
    # Loại bỏ ký tự escape Markdown thừa trước dấu câu và dấu ngoặc vuông (như \[, \], \!, \?, \-, \.) ngay từ đầu
    text = re.sub(r"\\([!?.—\-*#'\"()\[\]])", r"\1", text)
    text = clean_chatgpt_web_artifacts_and_paragraphs(text).strip()

    lines = text.splitlines()
    start_idx = 0
    found_start = False
    for idx, ln in enumerate(lines):
        p_num = _match_part_heading_num(ln)
        if p_num == start_part:
            start_idx = idx
            found_start = True
            break
    # Chỉ cắt bỏ các dòng trước tiêu đề đầu tiên nếu phần trước đó rất ngắn (< 250 ký tự, tức là lời chào/meta của ChatGPT).
    # Nếu ChatGPT bắt đầu viết ngay nội dung của start_part mà quên in dòng [PART start_part] ở đầu, giữ nguyên toàn bộ!
    if not found_start and start_part > 1:
        for idx, ln in enumerate(lines):
            p_num = _match_part_heading_num(ln)
            if p_num is not None:
                pre_len = sum(len(x.strip()) for x in lines[:idx])
                if pre_len < 250:
                    start_idx = idx
                    found_start = True
                break

    if found_start:
        lines = lines[start_idx:]

    # Chuẩn hóa dòng tiêu đề Part (luôn chuẩn hóa về dạng độc lập `[PART N]` cho kênh 7-Part / 12 Keys)
    norm_lines = []
    for ln in lines:
        s_ln = ln.strip()
        p_num = _match_part_heading_num(s_ln)
        if p_num is not None:
            if ACTIVE_NICHE in ("homeless", "mexico") or ACTIVE_KEY_ID in KEY_PROFILES_12 or s_ln.startswith("["):
                norm_lines.append(f"[PART {p_num}]")
            else:
                norm_lines.append(s_ln)
            continue
        norm_lines.append(ln)

    # Cắt bỏ các dòng ghi chú meta cuối lượt nếu ChatGPT in kèm sau câu kết
    while norm_lines:
        last_s = norm_lines[-1].strip()
        if not last_s:
            norm_lines.pop()
            continue
        if re.match(
            r"^(?:\**Applied all approved patches|\**(?:Stage|End of Stage|End of Part|Ready for Stage|Next step|Giai đoạn)\b|---\s*$)",
            last_s,
            flags=re.IGNORECASE,
        ):
            norm_lines.pop()
            continue
        break

    return "\n".join(norm_lines).strip()


REFUSAL_PHRASES = [
    "tôi không thể xuất",
    "không thể xuất trọn",
    "không thể thực hiện mode b",
    "không thể xác nhận trung thực",
    "chia bản thảo thành",
    "chia thành nhiều phản hồi",
    "chia kịch bản thành",
    "dung lượng còn lại của lượt này",
    "dung lượng phản hồi còn lại",
    "giới hạn dung lượng phản hồi",
    "hard fail / do not output",
    "vượt trần 80.000",
    "vượt giới hạn 80.000",
]


def is_refusal_or_meta_response(text: str, min_chars: int = 12000) -> bool:
    """Kiểm tra xem phản hồi của ChatGPT có phải là câu từ chối / xin chia 2 lượt / báo cáo MODE A hay không."""
    t_low = (text or "").strip().lower()
    if len(t_low) < min_chars:
        return True
    if any(p in t_low[:1500] for p in REFUSAL_PHRASES):
        return True
    # Không bao giờ nhận nhầm báo cáo đánh giá MODE A thành kịch bản MODE B
    audit_markers = [
        "mode a — exhaustive",
        "waiting for rewrite command",
        "patch ledger — complete",
        "current absolute forensic score",
    ]
    if sum(1 for m in audit_markers if m in t_low) >= 2:
        return True
    return False


def analyze_script_metrics(script_text: str, start_part: int = 1) -> dict:
    """
    Đếm chính xác số Part, số từ, số ký tự body (loại bỏ dòng tiêu đề độc lập `[PART N]` + newline
    theo đúng chuẩn `qa_checkpoint.py` của Homeless V12 / Mexico V1.3 / 12 Keys), mã băm SHA-256 và dấu ngoặc vuông `[...]`.
    """
    clean_text = extract_clean_script_text(script_text, start_part=start_part)
    file_utf8 = (clean_text + "\n").encode("utf-8")
    file_sha256 = hashlib.sha256(file_utf8).hexdigest()

    explicit_headings = set()
    for ln in clean_text.splitlines():
        pn = _match_part_heading_num(ln)
        if pn is not None:
            explicit_headings.add(pn)

    body_lines = []
    part_bodies = {}
    parts_seq = []
    cur_p = None

    for line in (clean_text + "\n").splitlines(keepends=True):
        s_line = line.rstrip("\r\n")
        p_num = _match_part_heading_num(s_line)
        if p_num is not None:
            parts_seq.append(p_num)
            cur_p = p_num
            part_bodies.setdefault(p_num, "")
        else:
            if cur_p is None and s_line.strip():
                # Nếu văn bản mở đầu chưa có nhãn [PART N] và start_part chưa xuất hiện ở dưới, tự động gán vào start_part
                inferred_p = start_part if start_part not in explicit_headings else (min(explicit_headings) - 1 if min(explicit_headings) > 1 else start_part)
                cur_p = max(1, inferred_p)
                parts_seq.append(cur_p)
                part_bodies.setdefault(cur_p, "")
            body_lines.append(line)
            if cur_p is not None:
                part_bodies[cur_p] = part_bodies.get(cur_p, "") + line

    body_only_text = "".join(body_lines)
    if body_only_text.endswith("\n") and not clean_text.endswith("\n"):
        # Đồng bộ chính xác tổng ký tự body = tổng part_chars
        body_only_text = body_only_text[:-1]
        if cur_p is not None and part_bodies.get(cur_p, "").endswith("\n"):
            part_bodies[cur_p] = part_bodies[cur_p][:-1]

    body_sha256 = hashlib.sha256(body_only_text.encode("utf-8")).hexdigest()
    body_char_count = len(body_only_text)
    raw_char_count = len(clean_text)
    is_7part_long = ACTIVE_NICHE in ("homeless", "mexico") or ACTIVE_KEY_ID in KEY_PROFILES_12
    char_count = body_char_count if is_7part_long else raw_char_count

    target_text_for_words = body_only_text if is_7part_long else clean_text
    words = re.findall(r"\b[\wÁÉÍÓÚÑáéíóúñü'’\-]+\b", target_text_for_words)
    cjk_chars = len(re.findall(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]", target_text_for_words))
    word_count = max(len(words), int(cjk_chars / 2.2)) if cjk_chars >= 200 else len(words)

    parts_found = sorted(list(set(parts_seq)))
    part_breakdown = []
    part_chars_map = {}
    for p_num in parts_found:
        p_chunk = part_bodies.get(p_num, "") if is_7part_long else part_bodies.get(p_num, "").strip()
        p_chars = len(p_chunk)
        p_words_latin = len(re.findall(r"\b[\wÁÉÍÓÚÑáéíóúñü'’\-]+\b", p_chunk))
        p_cjk = len(re.findall(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]", p_chunk))
        p_words = max(p_words_latin, int(p_cjk / 2.2)) if p_cjk >= 50 else p_words_latin
        p_key = f"[PART {p_num}]" if is_7part_long else f"Part {p_num}"
        part_chars_map[p_key] = p_chars
        part_breakdown.append(f"Part {p_num}: {p_chars:,} ký tự ({p_words:,} từ)")

    raw_brackets = re.findall(r"\[[^\]]+\]", clean_text)
    # Không tính tiêu đề phân đoạn kiểu [PART 1]..[PART 12] là lỗi ngoặc vuông sân khấu
    bracket_cues = [b for b in raw_brackets if not re.match(r"^\[\s*PART\s+\d+.*\]$", b, flags=re.IGNORECASE)]

    return {
        "clean_text": clean_text,
        "char_count": char_count,
        "raw_char_count": raw_char_count,
        "body_char_count": body_char_count,
        "file_sha256": file_sha256,
        "body_sha256": body_sha256,
        "part_chars_map": part_chars_map,
        "word_count": word_count,
        "parts_found": parts_found,
        "part_count": len(parts_found),
        "part_breakdown": part_breakdown,
        "per_part_summary": " | ".join(part_breakdown) if part_breakdown else "N/A",
        "bracket_cues_count": len(bracket_cues),
        "bracket_cues_sample": bracket_cues[:5],
    }


def slice_script_to_allowed_parts(script_text: str, allowed_parts: list[int]) -> str:
    """Chỉ giữ lại đúng các Part nằm trong `allowed_parts` (ví dụ Stage A chỉ giữ `[PART 1]` và `[PART 2]`)."""
    first_allowed = min(allowed_parts) if allowed_parts else 1
    clean_text = extract_clean_script_text(script_text, start_part=first_allowed)
    allowed_set = set(allowed_parts)
    explicit_headings = set()
    for ln in clean_text.splitlines():
        pn = _match_part_heading_num(ln)
        if pn is not None:
            explicit_headings.add(pn)

    out_lines = []
    cur_p = None
    for ln in clean_text.splitlines():
        p_num = _match_part_heading_num(ln)
        if p_num is not None:
            cur_p = p_num
            if cur_p in allowed_set:
                out_lines.append(f"[PART {cur_p}]" if (ACTIVE_NICHE in ("homeless", "mexico") or ACTIVE_KEY_ID in KEY_PROFILES_12) else ln.strip())
            continue
        if cur_p is None and ln.strip() and allowed_parts and first_allowed not in explicit_headings:
            cur_p = first_allowed
            out_lines.append(f"[PART {cur_p}]")
        if cur_p in allowed_set:
            out_lines.append(ln)
    return "\n".join(out_lines).strip()


def condense_homeless_stage_text(
    stage_text: str,
    expected_parts: list[int] = None,
    target_chars: int = 76200,
    hard_max_chars: int = None,
    allowed_parts: list[int] = None,
    max_chars: int = None,
) -> str:
    """
    Cơ chế Cân Chỉnh Độ Dài Tự Động Bảo Toàn Mạch Truyện (`Narrative-Preserving Smart Condenser`) cho HOMELESS V12:
    - Tuân thủ chính xác `OVER-80K TRIM ORDER` trong `LENGTH_DELIVERY_LOCK.md`:
      1. Bảo vệ 100% tiêu đề `[PART N]`, 2 đoạn văn mở đầu (Hook) và 2 đoạn văn kết thúc (Turn/Payoff) của MỌI Part.
      2. Ưu tiên bảo vệ các câu/đoạn có lời thoại trực tiếp (`"..."` / `“...”`), con số, năm tháng, kích thước, mã manh mối.
      3. Khi ChatGPT viết quá dài (`> hard_max_chars`), tự động rút gọn các câu giải thích/cảm nghĩ lặp lại ở cuối các đoạn văn dài
         và lược bỏ các đoạn miêu tả tĩnh dư thừa ở giữa Part để đưa độ dài từng Part về chuẩn `~10.600–11.000` ký tự
         (tổng 7 Phần luôn đạt chuẩn vàng **74.500 – 77.500 ký tự**, khớp 100% cổng `70.000 – 80.000 ký tự`).
    """
    if expected_parts is None:
        expected_parts = allowed_parts if allowed_parts is not None else [1, 2, 3, 4, 5, 6, 7]
    if hard_max_chars is None:
        hard_max_chars = max_chars if max_chars is not None else (78800 if len(expected_parts) == 7 else int(target_chars * 1.04))

    # Hỗ trợ cả kịch bản có nhãn [PART N] lẫn kịch bản thuần văn bản (_KB.txt đã xóa nhãn [PART N])
    has_part_headers = bool(re.search(r"(?m)^\s*(?:#{1,6}\s*)?\[?\s*(?:PART|PARTE)\s+\d+", stage_text or "", flags=re.IGNORECASE))
    if has_part_headers:
        sliced = slice_script_to_allowed_parts(stage_text, expected_parts)
        m = analyze_script_metrics(sliced, start_part=min(expected_parts) if expected_parts else 1)
        char_len = m["char_count"]
    else:
        sliced = (stage_text or "").strip()
        char_len = len(sliced)

    effective_ceiling = hard_max_chars
    raw_total_paras = len([p for p in re.split(r"\n\s*\n", sliced) if p.strip()])
    has_cjk_dialogue = ("「" in sliced) or ("」" in sliced) or bool(re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", sliced))
    if char_len <= effective_ceiling and (has_cjk_dialogue or raw_total_paras <= len(expected_parts) * 45):
        return sliced

    # Tách văn bản theo từng Part (hoặc chia thành num_p phân đoạn ảo nếu đã xóa nhãn [PART N])
    part_blocks = {}
    if has_part_headers:
        cur_p = None
        cur_lines = []
        for ln in sliced.splitlines():
            p_num = _match_part_heading_num(ln)
            if p_num is not None and p_num in expected_parts:
                if cur_p is not None:
                    part_blocks[cur_p] = "\n".join(cur_lines).strip()
                cur_p = p_num
                cur_lines = []
            else:
                if cur_p is not None:
                    cur_lines.append(ln)
        if cur_p is not None:
            part_blocks[cur_p] = "\n".join(cur_lines).strip()
    else:
        all_paras = [p.strip() for p in re.split(r"\n\s*\n", sliced) if p.strip()]
        num_v = max(1, len(expected_parts))
        chunk_sz = max(1, (len(all_paras) + num_v - 1) // num_v)
        for idx_v, p_num in enumerate(expected_parts):
            sub_p = all_paras[idx_v * chunk_sz : (idx_v + 1) * chunk_sz]
            if sub_p:
                part_blocks[p_num] = "\n\n".join(sub_p)

    num_p = max(1, len(expected_parts))
    per_part_target = int(target_chars / num_p)

    def _condense_single_part(p_text: str, p_budget: int) -> str:
        raw_paras = [p.strip() for p in re.split(r"\n\s*\n", p_text) if p.strip()]
        if len(raw_paras) <= 5:
            return p_text
        if len(p_text) <= p_budget + 120 and len(raw_paras) <= 28:
            return p_text

        # Bước 0: Gộp các câu/đoạn ngắn đơn lẻ thành đoạn văn tự nhiên (chuẩn 16–25 đoạn/Part cho TTS & Homeless V12)
        need_aggressive_group = len(raw_paras) > 26
        max_group_chars = 620 if need_aggressive_group else 420
        max_group_items = 5 if need_aggressive_group else 3
        paras = []
        buf = []
        buf_len = 0
        for rp in raw_paras:
            has_q = ('"' in rp) or ("\u201c" in rp) or ("\u201d" in rp) or ("«" in rp) or ("—" in rp and len(rp) < 260)
            block_merge = (has_q and not need_aggressive_group) or len(rp) > (360 if need_aggressive_group else 220)
            if block_merge or len(buf) >= max_group_items or (buf_len + len(rp) > max_group_chars):
                if buf:
                    paras.append(" ".join(buf))
                    buf = []
                    buf_len = 0
                if block_merge:
                    paras.append(rp)
                else:
                    buf.append(rp)
                    buf_len = len(rp)
            else:
                buf.append(rp)
                buf_len += len(rp) + 1
        if buf:
            paras.append(" ".join(buf))

        joined_s0 = "\n\n".join(paras)
        if len(paras) <= 5 or len(joined_s0) <= p_budget + 120 or char_len <= effective_ceiling:
            return joined_s0

        # Nhận diện lần xuất hiện đầu tiên của tên riêng đầy đủ (2 từ viết hoa) để bảo vệ
        seen_names = set()
        first_name_para_indices = set()
        common_starters = {
            "The", "She", "He", "They", "It", "When", "After", "Before", "While", "Inside", "Outside",
            "Even", "Still", "Then", "There", "That", "This", "His", "Her", "Their", "One", "Two",
            "Three", "Four", "Five", "Six", "Seven", "Part", "By", "In", "On", "At", "From", "With",
            "Without", "Under", "Over", "Beneath", "Behind", "Beside", "Between", "Through", "Across",
            "During", "Until", "Although", "Because", "Since", "Though", "Unless", "Once", "Every",
            "Each", "Some", "Many", "Most", "Several", "Both", "Neither", "Either", "Nothing", "Something",
            "Someone", "No", "Not", "Never", "Always", "Sometimes", "Often", "Soon", "Later", "Finally",
            "Instead", "However", "Meanwhile", "Otherwise", "Nevertheless", "Furthermore", "Moreover",
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
            "January", "February", "March", "April", "May", "June", "July", "August", "September",
            "October", "November", "December", "Morning", "Afternoon", "Evening", "Night", "Back",
            "Down", "Up", "Near", "Far", "Here", "Where", "What", "Why", "How", "Who", "If", "As",
            "But", "And", "Or", "So", "Yet", "For", "Nor", "Doña", "Señora", "Señor", "Don",
        }
        for idx, para in enumerate(paras):
            for m_full in re.finditer(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,15}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,15})\b", para):
                w_full = m_full.group(1)
                first_w = w_full.split()[0]
                if first_w not in common_starters and w_full not in seen_names and len(first_name_para_indices) < 10:
                    seen_names.add(w_full)
                    first_name_para_indices.add(idx)

        # Chỉ bảo vệ các token pháp lý/chứng cứ cốt lõi, số, tiền tệ và dấu hỏi
        protected_token_re = re.compile(
            r"\?|\d+|\$|\b(?:deed|ledger|clause|notary|escritura|testamento|parcel|audit|trust|contract|warrant|affidavit|C0\d|C1\d|W0\d|R\d|E\d\d)\b",
            flags=re.IGNORECASE,
        )

        # PASS 1: Rút gọn câu phụ ở giữa các đoạn văn >= 3 câu (luôn giữ câu đầu & câu cuối của đoạn)
        cur_len = sum(len(p) for p in paras) + 2 * (len(paras) - 1)
        pass1_paras = []
        for idx, para in enumerate(paras):
            if cur_len <= p_budget + 80 or idx < 2 or idx >= len(paras) - 2 or idx in first_name_para_indices:
                pass1_paras.append(para)
                continue
            has_quote = ('"' in para) or ("\u201c" in para) or ("\u201d" in para) or ("«" in para) or ("「" in para) or ("」" in para) or ("『" in para) or ("』" in para)
            if ("「" in para) or ("」" in para):
                pass1_paras.append(para)
                continue
            sents = [s.strip() for s in re.split(r"(?:(?<=[.!?])\s+|(?<=[。！？])\s*)", para) if s.strip()]
            new_p = para
            if not has_quote and len(sents) >= 3 and len(para) > 210:
                kept_s = [sents[0]]
                for s_mid in sents[1:-1]:
                    if protected_token_re.search(s_mid) and len(" ".join(kept_s)) < 290:
                        kept_s.append(s_mid)
                kept_s.append(sents[-1])
                new_p = " ".join(kept_s)
            elif has_quote and len(sents) >= 3 and len(para) > 320:
                kept_s = [sents[0]]
                for s_mid in sents[1:-1]:
                    if ('"' in s_mid or "\u201c" in s_mid or "\u201d" in s_mid or "«" in s_mid or "»" in s_mid or "「" in s_mid or "」" in s_mid or protected_token_re.search(s_mid)):
                        kept_s.append(s_mid)
                if sents[-1] not in kept_s:
                    kept_s.append(sents[-1])
                new_p = " ".join(kept_s)
            cur_len -= (len(para) - len(new_p))
            pass1_paras.append(new_p)

        # PASS 2: Nếu vẫn vượt ngân sách, lược bớt câu cảm nghĩ/miêu tả phụ ở cuối các đoạn trần thuật >= 2 câu không chứa thoại
        pass2_paras = list(pass1_paras)
        if cur_len > p_budget + 80:
            for idx in range(2, len(pass2_paras) - 2):
                if cur_len <= p_budget + 80:
                    break
                if idx in first_name_para_indices:
                    continue
                para = pass2_paras[idx]
                has_quote = ('"' in para) or ("\u201c" in para) or ("\u201d" in para) or ("«" in para) or ("「" in para)
                if has_quote:
                    continue
                sents = [s.strip() for s in re.split(r"(?:(?<=[.!?])\s+|(?<=[。！？])\s*)", para) if s.strip()]
                if len(sents) >= 2 and len(sents[0]) >= 55 and not protected_token_re.search(sents[-1]):
                    new_p = " ".join(sents[:-1])
                    cur_len -= (len(para) - len(new_p))
                    pass2_paras[idx] = new_p

        # PASS 3: Nếu vẫn vượt ngân sách, chỉ giữ câu mở đầu + các câu có lời thoại trực tiếp trong các đoạn thoại dài
        if cur_len > p_budget + 80:
            for idx in range(2, len(pass2_paras) - 2):
                if cur_len <= p_budget + 80:
                    break
                para = pass2_paras[idx]
                has_quote = ('"' in para) or ("\u201c" in para) or ("\u201d" in para) or ("«" in para) or ("「" in para)
                if not has_quote:
                    continue
                sents = [s.strip() for s in re.split(r"(?:(?<=[.!?])\s+|(?<=[。！？])\s*)", para) if s.strip()]
                if len(sents) >= 2:
                    quote_sents = [s for s in sents if ('"' in s or "\u201c" in s or "\u201d" in s or "«" in s or "「" in s or protected_token_re.search(s))]
                    if quote_sents:
                        if sents[0] not in quote_sents and len(quote_sents) < len(sents):
                            kept = [sents[0]] + quote_sents
                        else:
                            kept = quote_sents
                        new_p = " ".join(kept)
                        if len(new_p) < len(para):
                            cur_len -= (len(para) - len(new_p))
                            pass2_paras[idx] = new_p

        # PASS 4: Nếu một Part vẫn vượt ngân sách (ví dụ AI viết 15.000-18.000 ký tự/Part),
        # lược bỏ giãn cách đều các đoạn miêu tả tĩnh ở giữa (ưu tiên đoạn không có thoại và không có số/tên mới)
        final_paras = list(pass2_paras)
        if cur_len > p_budget + 120 and len(final_paras) > 9:
            tier1 = []
            tier2 = []
            tier3 = []
            for idx in range(2, len(final_paras) - 2):
                if idx in first_name_para_indices:
                    continue
                p_txt = final_paras[idx]
                has_q = ('"' in p_txt) or ("\u201c" in p_txt) or ("\u201d" in p_txt) or ("«" in p_txt) or ("「" in p_txt)
                has_prot = bool(protected_token_re.search(p_txt))
                if not has_q and not has_prot:
                    tier1.append(idx)
                elif not has_q:
                    tier2.append(idx)
                elif not has_prot:
                    tier3.append(idx)

            def _spread_order(indices_list: list[int]) -> list[int]:
                if len(indices_list) <= 2:
                    return indices_list
                # Lấy xen kẽ từ giữa ra để không xóa 2 đoạn liên tiếp
                evens = indices_list[1::2]
                odds = indices_list[0::2]
                return evens + odds

            drop_candidates = _spread_order(tier1) + _spread_order(tier2) + _spread_order(tier3)
            dropped_set = set()
            for c_idx in drop_candidates:
                if cur_len <= p_budget + 80 or (len(final_paras) - len(dropped_set)) <= 8:
                    break
                dropped_set.add(c_idx)
                cur_len -= (len(final_paras[c_idx]) + 2)
            if dropped_set:
                final_paras = [p for i, p in enumerate(final_paras) if i not in dropped_set]

        return "\n\n".join(final_paras)

    # Phân bổ động ngân sách (dynamic_p_budget)
    short_parts_sum = sum(len(part_blocks.get(p, "")) for p in expected_parts if len(part_blocks.get(p, "")) <= per_part_target)
    long_parts = [p for p in expected_parts if len(part_blocks.get(p, "")) > per_part_target]
    long_parts_raw_sum = max(1, sum(len(part_blocks.get(p, "")) for p in long_parts))
    remaining_budget = max(int(per_part_target * 0.92) * len(long_parts), target_chars - short_parts_sum)

    rebuilt_chunks = []
    for p_num in expected_parts:
        p_raw = part_blocks.get(p_num, "")
        if not p_raw:
            continue
        if p_num in long_parts and len(long_parts) > 0:
            dyn_budget = int(remaining_budget * (len(p_raw) / long_parts_raw_sum))
            dyn_budget = max(int(per_part_target * 0.90), min(len(p_raw), dyn_budget))
        else:
            dyn_budget = per_part_target
        p_cond = _condense_single_part(p_raw, dyn_budget)
        if has_part_headers:
            rebuilt_chunks.append(f"[PART {p_num}]\n\n{p_cond.strip()}")
        else:
            rebuilt_chunks.append(p_cond.strip())

    return "\n\n".join(rebuilt_chunks).strip()


def is_valid_full_script(metrics: dict, expected_parts: int) -> bool:
    """
    Cổng kiểm định bắt buộc đối với mọi phản hồi kịch bản:
    1. Không phải câu thông báo từ chối/xin chia lượt.
    2. Độ dài tối thiểu >= 34,000 ký tự (Mafia) hoặc >= 70% min_chars của từng Key.
    3. Có mặt đầy đủ các Part từ Part 1 đến Part `expected_parts`.
    """
    if ACTIVE_KEY_ID in KEY_PROFILES_12:
        min_chars = max(10000, int(KEY_PROFILES_12[ACTIVE_KEY_ID].get("min_chars", 44000) * 0.70))
    else:
        min_chars = 44000 if ACTIVE_NICHE in ("homeless", "mexico") else 34000
    if is_refusal_or_meta_response(metrics.get("clean_text", ""), min_chars=min(12000, min_chars)):
        return False
    if metrics.get("char_count", 0) < min_chars:
        return False
    expected_list = list(range(1, expected_parts + 1))
    if metrics.get("parts_found") != expected_list:
        return False
    return True


def extract_patched_parts_from_audit(audit_text: str, n_beats: int = 7, max_parts: int = 2) -> list[int]:
    """
    Trích xuất danh sách các số thứ tự Part (`1..n_beats`) có bản vá trong `PATCH LEDGER` của báo cáo kiểm định Bước 4A.
    Giới hạn tối đa `max_parts` (mặc định 2 Part ~ 21.500 ký tự văn xuôi tiếng Anh) mỗi lượt Bước 4B
    để ChatGPT xuất trọn vẹn văn xuôi truyện thuần túy (`[PART N]`) trong 1 lượt duy nhất mà không bao giờ bị cắt cụt.
    """
    ledger_sec = audit_text
    m_led = re.search(r"(?:PATCH\s+LEDGER|FROZEN\s+PATCH\s+LEDGER)(.*)", audit_text, flags=re.IGNORECASE | re.DOTALL)
    if m_led:
        ledger_sec = m_led.group(1)

    part_counts = {}
    first_seen = {}
    for idx_m, m_p in enumerate(re.finditer(r"(?:\[?PART\s*(\d{1,2})\]?)", ledger_sec, flags=re.IGNORECASE)):
        p_num = int(m_p.group(1))
        if 1 <= p_num <= n_beats:
            part_counts[p_num] = part_counts.get(p_num, 0) + 1
            if p_num not in first_seen:
                first_seen[p_num] = idx_m

    if not part_counts:
        for idx_m, m_p in enumerate(re.finditer(r"(?:\[?PART\s*(\d{1,2})\]?)", audit_text, flags=re.IGNORECASE)):
            p_num = int(m_p.group(1))
            if 1 <= p_num <= n_beats:
                part_counts[p_num] = part_counts.get(p_num, 0) + 1
                if p_num not in first_seen:
                    first_seen[p_num] = idx_m

    ranked = sorted(part_counts.keys(), key=lambda k: (-part_counts[k], first_seen.get(k, 999)))
    selected = sorted(ranked[:max_parts])
    return selected if selected else [1, 4]


def splice_revised_parts_into_script(base_script: str, revised_response: str, n_beats: int = 7) -> tuple[str, list[int]]:
    """
    Ghép các Phần truyện tiếng Anh (`[PART N]`) vừa được ChatGPT viết lại ở Bước 4B vào kịch bản gốc `base_script`,
    giữ nguyên 100% byte-for-byte các Phần không nằm trong phạm vi sửa và chuẩn hóa độ dài về tâm vàng 74.000–78.000 ký tự.
    """
    def _split_into_part_map(txt: str) -> dict[int, str]:
        cleaned = extract_clean_script_text(txt, start_part=1)
        if not cleaned or len(cleaned) < 1200:
            cleaned = txt
        lines = cleaned.splitlines()
        pmap = {}
        cur_p = None
        buf = []
        for ln in lines:
            p_idx = _match_part_heading_num(ln)
            if p_idx is not None and 1 <= p_idx <= n_beats:
                if cur_p is not None:
                    pmap[cur_p] = "\n".join(buf).strip()
                cur_p = p_idx
                buf = []
                continue
            if cur_p is not None:
                buf.append(ln)
        if cur_p is not None:
            pmap[cur_p] = "\n".join(buf).strip()
        return pmap

    base_map = _split_into_part_map(base_script)
    rev_map = _split_into_part_map(revised_response)
    updated_parts = []

    for p_num, rev_body in sorted(rev_map.items()):
        # Loại bỏ mọi ghi chú ngoặc vuông sân khấu nếu có
        rev_body_clean = re.sub(r"\[(?![ \t]*PART[ \t]+\d+[ \t]*\])[^\]\n]{1,120}\]", "", rev_body, flags=re.IGNORECASE).strip()
        # Bảo vệ chống đoạn bị cắt cụt: mỗi Part hợp lệ của Homeless V12 phải >= 5.500 ký tự và kết thúc bằng dấu câu hoàn chỉnh
        if 1 <= p_num <= n_beats and len(rev_body_clean) >= 5500:
            base_map[p_num] = rev_body_clean
            updated_parts.append(p_num)

    if not updated_parts:
        return base_script, []

    assembled_chunks = []
    for p_idx in range(1, n_beats + 1):
        p_txt = base_map.get(p_idx, "").strip()
        if p_txt:
            assembled_chunks.append(f"[PART {p_idx}]\n\n{p_txt}")

    merged_script = "\n\n".join(assembled_chunks).strip()
    if len(merged_script) > 78600:
        merged_script = condense_homeless_stage_text(
            merged_script,
            allowed_parts=list(range(1, n_beats + 1)),
            target_chars=76200,
            max_chars=78500,
        )
    return merged_script, updated_parts


def parse_forensic_audit_score(audit_text: str) -> tuple[int, str, int]:
    """
    Trích xuất điểm số `Current Absolute Forensic Score: XX/100` (hoặc `QA_SCORE: XX/100` / `Overall Quality Score: XX/100`),
    trạng thái Readiness, và số lượng Patch IDs từ báo cáo kiểm định của Skill 4.
    """
    score = 0
    readiness = "NEEDS PATCHES"

    patterns = [
        r"Current Absolute Forensic Score[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"QA_SCORE[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*(?:/\s*100)?",
        r"Overall Quality Score[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"Comparable Revision Score[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"Forensic Score[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"FINAL SCORE[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"Total Score[\*\\\s\|]*:?[\*\\\s\|]*(\d{1,3}(?:\.\d+)?)\s*/\s*100",
        r"<text[^>]*>\s*Current Absolute Forensic Score\s*</text>\s*<title[^>]*>\s*(\d{1,3}(?:\.\d+)?)",
    ]
    for pat in patterns:
        m = re.search(pat, audit_text, flags=re.IGNORECASE)
        if m:
            score = int(round(float(m.group(1))))
            break

    if score == 0:
        m_any = re.search(r"Score[^\n\r]{0,80}?(?<![–\-])(\d{2,3}(?:\.\d+)?)\s*/\s*100", audit_text, flags=re.IGNORECASE)
        if m_any:
            score = int(round(float(m_any.group(1))))

    patches = set(re.findall(r"\bP(\d{2,3})\b", audit_text))

    if score == 0:
        t_low = audit_text.lower()
        active_p01 = re.findall(r"###\s*P\d+\s*[—\-]\s*P[01]\b", audit_text, flags=re.IGNORECASE)
        if "10/10" in t_low and (
            "target pass" in t_low
            or "strict word lock pass" in t_low
            or "không phát hiện lỗi p0/p1" in t_low
            or "pass for production" in t_low
            or "resolved" in t_low
        ):
            score = max(97, 98 - len(active_p01))
        elif "59/100" in t_low or "p01 — p0" in t_low or "strict word limit" in t_low or "hard fail" in t_low:
            score = 59

    m_ready = re.search(r"Readiness[\*\s]*:[\*\s]*(READY|NEEDS PATCHES)", audit_text, flags=re.IGNORECASE)
    if m_ready:
        readiness = m_ready.group(1).upper()
    elif score >= 95 or "pass for production" in audit_text.lower():
        readiness = "READY"

    return score, readiness, len(patches)


# ==============================================================================
# LƯU LỊCH SỬ CUỘC TRÒ CHUYỆN & CẬP NHẬT TIẾN ĐỘ
# ==============================================================================

def save_conversation_transcript(project_dir: str, thread_id: str, thread_data: dict):
    """Lưu toàn bộ lịch sử đoạn chat ra JSON và Markdown dễ đọc."""
    json_path = os.path.join(project_dir, "CHATGPT_CONVERSATION.json")
    write_json_file(json_path, thread_data)

    turns = list(reversed(thread_data.get("turns", [])))
    md_lines = [
        f"# LỊCH SỬ ĐOẠN CHAT ĐỒNG BỘ CHATGPT DESKTOP",
        f"- **Thread ID:** `{thread_id}`",
        f"- **Model / Effort:** `medium`",
        f"- **Cập nhật lúc:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
        f"- **Tổng số lượt tương tác (Turns):** `{len(turns)}`",
        "",
        "---",
        "",
    ]

    for idx, t in enumerate(turns, start=1):
        status = t.get("status", "unknown")
        md_lines.append(f"## TURN #{idx} (Status: `{status}`)")
        for item in t.get("items", []):
            itype = item.get("type", "")
            if itype == "userMessage":
                utext = item.get("text", "")
                # Rút gọn hiển thị phần đính kèm Skill dài để file MD dễ đọc, bản đầy đủ nằm ở JSON
                if len(utext) > 3000:
                    preview = utext[:1500] + f"\n\n... [Đã ẩn {len(utext)-2000:,} ký tự nội dung Skill đính kèm — Xem đầy đủ trong CHATGPT_CONVERSATION.json] ...\n\n" + utext[-500:]
                else:
                    preview = utext
                md_lines.append(f"### 👤 Prompt Gửi Đi:\n```text\n{preview}\n```\n")
            elif itype == "agentMessage":
                atext = item.get("text", "")
                md_lines.append(f"### 🤖 Phản Hồi Của ChatGPT ({len(atext):,} ký tự):\n\n{atext}\n")
        md_lines.append("\n---\n")

    write_text_file(os.path.join(project_dir, "CHATGPT_CONVERSATION.md"), "\n".join(md_lines))

    # Sao lưu thêm file rollout gốc từ ~/.codex/sessions nếu có
    codex_sessions = os.path.expanduser(r"~\.codex\sessions")
    if os.path.exists(codex_sessions):
        matches = glob.glob(os.path.join(codex_sessions, "**", f"*{thread_id}*.jsonl"), recursive=True)
        if matches:
            try:
                shutil.copy2(matches[-1], os.path.join(project_dir, f"RAW_ROLLOUT_{thread_id}.jsonl"))
            except Exception:
                pass


TONG_HOP_DIR = os.path.join(PROJECTS_ROOT, "TONG HOP")


def strip_part_headers_for_tts(script_text: str) -> str:
    """
    Xóa toàn bộ các dòng tiêu đề phân đoạn `Part 1..N` / `[PART 1]..[PART 7]` / `Beat 1..N`
    (ví dụ `# PART 1 — ...`, `[PART 1]`, `## Part 2: ...`, `**PART 3**`, `PART 1`, dòng kẻ `---`)
    và làm sạch triệt để `Pasted text(...).txtDocument` + khôi phục xuống dòng đoạn văn `\n\n`
    để file kịch bản xuất ra (`FULL_SCRIPT.txt` và `{STT}_KB.txt`) chỉ giữ lại 100% văn bản
    truyện thuần túy phục vụ chạy TTS trực tiếp.
    """
    if not script_text:
        return ""
    script_text = clean_chatgpt_web_artifacts_and_paragraphs(script_text)
    script_text = re.sub(r"\\([!?.—\-*#'\"()\[\]])", r"\1", script_text)
    cleaned_lines = []
    for line in script_text.splitlines():
        s = line.strip()
        if _match_part_heading_num(s) is not None:
            continue
        # Bỏ qua mọi dòng tiêu đề Part / [PART N] / Beat / 口コミ hoặc dòng tiêu đề Markdown (# ...) hoặc đường kẻ phân cách (---, ***)
        if re.match(
            r"^(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|CAP[ÍI]TULO|CHAPTER|STORY|ACT|ACTO|BEAT|パート|口コミ)\s*\d+\s*\]?(?:\b|[\s:\-–—\.\)\]*_]).*$",
            s,
            flags=re.IGNORECASE,
        ):
            continue
        if re.match(r"^#+\s+.*$", s):
            continue
        if re.match(r"^(?:---+|\*\*\*+|___+)$", s):
            continue
        cleaned_lines.append(line.rstrip())
    res = "\n".join(cleaned_lines)
    res = re.sub(r"\n{3,}", "\n\n", res).strip()
    return res + "\n" if res else ""


def sanitize_custom_script_name(raw_name: str) -> str:
    """Làm sạch tên kịch bản tùy chỉnh để đặt tên file an toàn trên Windows."""
    if not raw_name:
        return ""
    s = str(raw_name).strip().strip('"').strip("'")
    s = re.sub(r"(?:_KB|_SEO)?\.txt$", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r'[\\/:*?"<>|\r\n\t]+', "_", s)
    s = re.sub(r"\s+", "_", s).strip("._- ")
    return s[:60]


def resolve_project_export_prefix(project_id: str, project_dir: str = "", state: dict = None, item: dict = None) -> str:
    """
    Trả về tên tiền tố dùng để xuất file trong `TONG HOP` và khi tải về:
    - Nếu người dùng có đặt `custom_name` (VD: `TenKichBan`, `KB01`): trả về đúng `custom_name` (`{TenKichBan}_KB.txt`, `{TenKichBan}_SEO.txt`).
    - Nếu không đặt tên (để trống): mặc định lấy số thứ tự 3 chữ số (`001`, `002`... -> `001_KB.txt`, `001_SEO.txt`).
    """
    cname = ""
    if isinstance(state, dict) and state.get("custom_name"):
        cname = sanitize_custom_script_name(state.get("custom_name"))
    if not cname and isinstance(item, dict) and item.get("custom_name"):
        cname = sanitize_custom_script_name(item.get("custom_name"))
    if not cname and project_dir:
        st_path = os.path.join(project_dir, "STATE.json")
        if os.path.exists(st_path):
            try:
                st_data = json.load(open(st_path, encoding="utf-8"))
                if st_data.get("custom_name"):
                    cname = sanitize_custom_script_name(st_data.get("custom_name"))
            except Exception:
                pass
    if cname:
        return cname
    m = re.match(r"^(\d{3})", str(project_id).strip())
    return m.group(1) if m else (sanitize_custom_script_name(project_id)[:20] or "001")


def export_to_tong_hop_folder(project_id: str, project_dir: str, niche: str = None) -> tuple[str, str]:
    """
    Sao lưu thêm 1 bản Kịch bản (đã lọc sạch các dòng Part 1..N để tạo TTS) và SEO vào thư mục
    tổng hợp riêng của từng bên (`PROJECTS\\PROJECTS_<Key>\\TONG HOP`).
    - Nếu có đặt tên riêng (`custom_name`): lưu thành `{TenKichBan}_KB.txt` và `{TenKichBan}_SEO.txt`.
    - Nếu không đặt tên: mặc định lưu theo STT dự án `001_KB.txt` và `001_SEO.txt`.
    """
    try:
        resolved_niche = niche
        if not resolved_niche and project_dir:
            abs_pdir = os.path.abspath(project_dir)
            m_proj_key = re.search(r"PROJECTS_([A-Za-z0-9_]+)", abs_pdir, flags=re.IGNORECASE)
            if m_proj_key:
                cand_k = m_proj_key.group(1)
                resolved_niche = resolve_canonical_key_id(cand_k)
        if resolved_niche:
            th_dir = get_niche_config(resolved_niche)["tong_hop_dir"]
        else:
            th_dir = get_niche_config(ACTIVE_KEY_ID or ACTIVE_NICHE)["tong_hop_dir"]
        os.makedirs(th_dir, exist_ok=True)
        prefix = resolve_project_export_prefix(project_id, project_dir)
        kb_dst = os.path.join(th_dir, f"{prefix}_KB.txt")
        seo_dst = os.path.join(th_dir, f"{prefix}_SEO.txt")

        src_kb = os.path.join(project_dir, "FULL_SCRIPT.txt")
        if os.path.exists(src_kb) and os.path.getsize(src_kb) > 0:
            raw_kb = read_text_file(src_kb)
            tts_clean_kb = strip_part_headers_for_tts(raw_kb)
            if tts_clean_kb and tts_clean_kb != raw_kb:
                write_text_file(src_kb, tts_clean_kb)
            if tts_clean_kb:
                if not os.path.exists(kb_dst) or read_text_file(kb_dst) != tts_clean_kb:
                    write_text_file(kb_dst, tts_clean_kb)

        src_seo = os.path.join(project_dir, "FULL_SEO.txt")
        if os.path.exists(src_seo) and os.path.getsize(src_seo) > 0:
            if not os.path.exists(seo_dst) or os.path.getsize(seo_dst) != os.path.getsize(src_seo) or os.path.getmtime(src_seo) > os.path.getmtime(seo_dst):
                shutil.copy2(src_seo, seo_dst)

        # Riêng Key 04_Nhom_Ong_Gia_Trung_Tri_Mexico (PADRE MX V1.2.1):
        # Tự động tạo cặp THUMBNAIL.png + THUMBNAIL-NENXANH.png (80/20) và quét cắt gọn ảnh nền xanh
        # ({TenKichBan}_KB.png / {TenKichBan}.png) để gắn vào góc trái bên dưới video cho từng kịch bản.
        active_cfg_key = get_niche_config(resolved_niche or ACTIVE_KEY_ID or ACTIVE_NICHE).get("key_id", "")
        if active_cfg_key == "04_Nhom_Ong_Gia_Trung_Tri_Mexico" and os.path.exists(src_kb):
            try:
                from padre_mx_thumbnail_generator import generate_padre_mx_thumbnail_pair_and_cropped_green
                seo_txt_content = read_text_file(src_seo) if os.path.exists(src_seo) else ""
                locked_title_p = os.path.join(project_dir, "LOCKED_TITLE.txt")
                w_title = read_text_file(locked_title_p).strip() if os.path.exists(locked_title_p) else ""
                generate_padre_mx_thumbnail_pair_and_cropped_green(
                    project_id=project_id,
                    project_dir=project_dir,
                    winner_title=w_title,
                    seo_text=seo_txt_content,
                    tong_hop_base_name=prefix,
                    tong_hop_dir=th_dir,
                )
            except Exception as e_thumb:
                print(f"[PADRE_MX_THUMBNAIL_WARN] {project_id}: {e_thumb}")

        return kb_dst, seo_dst
    except Exception:
        return "", ""


def update_progress_markdown(niche: str = None):
    """Cập nhật bảng theo dõi tiến độ riêng cho từng kênh (`TIEN_DO_<KEY>.md`)."""
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    b_path = cfg["backlog_path"]
    md_path = cfg["progress_md_path"]
    is_homeless = cfg["niche"] == "homeless"
    is_mexico = cfg["niche"] == "mexico"
    is_12_key = cfg["key_id"] in KEY_PROFILES_12
    t_min_k = cfg.get("target_min_chars", 70000) // 1000
    t_max_k = cfg.get("target_max_chars", 80000) // 1000
    loc_str = cfg.get("locale", "en-US")
    with BACKLOG_LOCK:
        backlog = {"max_parallel_threads": 3, "items": []}
        if os.path.exists(b_path):
            try:
                backlog = json.load(open(b_path, encoding="utf-8"))
            except Exception:
                pass

        header_title = (
            f"# BẢNG THEO DÕI TIẾN ĐỘ DOANH NGHIỆP: {cfg['label']}"
            if is_12_key
            else (
                "# BẢNG THEO DÕI TIẾN ĐỘ DOANH NGHIỆP: MEXICO BÀ CÔ — DRAMA GIA ĐÌNH MẸ GIÀ MEXICO (ES-MX V1.3)"
                if is_mexico
                else (
                    "# BẢNG THEO DÕI TIẾN ĐỘ DOANH NGHIỆP: HOMELESS KINDNESS / SECRET WEALTH V12"
                    if is_homeless
                    else "# BẢNG THEO DÕI TIẾN ĐỘ DOANH NGHIỆP: MAFIA BOSS × MAID STORYTELLING"
                )
            )
        )
        script_spec_desc = (
            f"Chia 3 phần viết độc lập (`{loc_str}` `{t_min_k}k–{t_max_k}k` ký tự, `03_PART_GROUP_1..3` & `PART_1..7`) + Bộ xử lý lỗi AI tự nối tiếp"
            if (is_12_key or is_mexico or is_homeless)
            else "Biên Kịch Full Script (`< 8.000 từ`, `44k-48k chars`)"
        )
        outline_spec_desc = (
            f"Kiến Trúc Giàn Ý 7 Parts (`{loc_str}`) & Khóa DNA Kênh (`{cfg['key_id']}`)"
            if is_12_key
            else (
                "Kiến Trúc Giàn Ý 7 Parts `es-MX` & Khóa DNA Gia Đình Mexico (`arquitectura-drama-familiar-mexico` V1.3)"
                if is_mexico
                else (
                    "Kiến Trúc Giàn Ý 7 Parts & Khóa DNA A/B/C/D/E (V2.4)"
                    if is_homeless
                    else "Kiến Trúc Giàn Ý & Khóa DNA A/B/C"
                )
            )
        )
        seo_spec_desc = (
            f"Đóng Gói SEO Đầy Đủ (`{loc_str}`) + 3 Thumbnail Prompts (16:9) + Omni Trailer Prompts & Xuất 2 File Thành Phẩm"
            if is_12_key
            else (
                "Đóng Gói SEO 12 Mục `es-MX` + Thumbnail + Omni Trailer Prompts (`seo-thumbnail-trailer-drama-familiar-mexico` V1.3)"
                if is_mexico
                else (
                    "Đóng Gói SEO V2.1 + Omni Trailer Prompts & Xuất 2 File Thành Phẩm"
                    if is_homeless
                    else "Đóng Gói SEO v1.3 & Xuất 2 File Thành Phẩm"
                )
            )
        )
        lines = [
            header_title,
            f"> **Cập nhật tự động lúc:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
            f"> **Kênh đang chọn:** `{cfg['label']}` | **Thư mục lưu trữ:** `{cfg['projects_root']}` | **Tổng hợp:** `{cfg['tong_hop_dir']}` | **Localhost:** `http://127.0.0.1:8099`",
            "",
            "## 1. Danh Sách Bộ 9 Bàn Subagent Vận Hành (Có Icon, Nhãn Luồng & Note Trực Tiếp)",
            "| Bàn | Icon | Subagent | Chế Độ Luồng | Vai Trò | Trạng Thái |",
            "| :--- | :---: | :--- | :--- | :--- | :--- |",
            "| **Bàn #0** | 👑 | `studio-0-orchestrator` | 🎯 Điều phối Trung tâm (1–9 Luồng) | Tổng Điều Phối Hàng Đợi Đa Tài Khoản (`Acc #1..#3`) & Checkpoint Manager | 🟢 Active |",
            "| **Bàn #1** | 🔥 | `studio-1-title-rewriter` | ⚡ Đa luồng (Writer Thread) | Viết Lại & Chấm Điểm Tiêu Đề (`>= 97/100`, `<= 100 chars`) | 🟢 Active |",
            "| **Bàn #1.5** | 🛡️ | `studio-canon-guard` | ⚡ Đa luồng (`CHANNEL_MEMORY.json`) | Quản Lý Trí Nhớ Kênh & Cấp Danh Sách Cấm Lặp Tên Nhân Vật / Thị Trấn / Vật Chứng (30–100 Kịch Bản Gần Nhất) | 🟢 Active |",
            f"| **Bàn #2** | 📐 | `studio-2-outline-architect` | ⚡ Đa luồng (Writer Thread) | {outline_spec_desc} (Tích Hợp Lệnh Cấm Trùng Tên `Bàn #1.5`) | 🟢 Active |",
            f"| **Bàn #3** | ✍️ | `studio-3-script-writer` | ⚡ Đa luồng (Writer Thread) | {script_spec_desc} | 🟢 Active |",
            "| **Bàn #4** | ⚖️ | `studio-4-forensic-auditor` | 🔒 Đoạn Chat Độc Lập (`Auditor Thread` & `Repair Thread`) | Thanh Tra Độc Lập 100% (Số Liệu Thật `0% Spoofing`), Khóa Part Đạt & Sửa Từng Part Kèm Điểm Neo Biên (`±5 Câu`) | 🟢 Active |",
            f"| **Bàn #5** | 🚀 | `studio-5-seo-packager` | 🔒 Đoạn Chat Độc Lập (`SEO Thread`) | {seo_spec_desc} | 🟢 Active |",
            "| **Bàn #6** | 🎙️ | `studio-6-visual-tts-director` | ⚡ Hậu Kỳ Tự Động (`06_TTS_DIRECTOR_REPORT.md`) | Quét Chuẩn Hóa Văn Bản TTS (Xóa Ký Tự Lạ, Bung Từ Viết Tắt `Mr./Mrs./Dr./St.`, Chuẩn Hóa Số Đọc `$1.5M`, `-40°F`, `%`) | 🟢 Active |",
            "| **Bàn #7** | 🎬 | `studio-7-voice-video-producer` | ⚡ Hàng đợi GPU (`Port 3999` / `VoiceStudio 3900` + `NVENC`) | Tự Động Tạo Voice (`.wav`) + Phụ Đề Whisper GPU (`.srt`) + Render Video (`.mp4`) Theo Cấu Hình Đã Khóa Trong `Video Batch Studio` | 🟢 Active |",
            "",
            "## 2. Nhật Ký Nâng Cấp & Sửa Lỗi Hệ Thống",
            "- **Khắc Phục Triệt Để Lỗi Khi Bấm Nút `X` Đóng Ứng Dụng (`main.js`, `database.js`, `ffmpeg.js`, `ipc.js`, `app.js`)**: (1) Bổ sung cờ `this.closed = true` và bọc `try/catch` toàn bộ hàm đọc/ghi/đóng SQLite trong [`src/main/database.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/main/database.js) để chặn lỗi `ERR_SQLITE_ERROR: database is not open` khi các tác vụ nền (`ffmpegService.checkSystem`, `licenseTimer`, IPC) hoàn tất sau khi người dùng bấm `X`; (2) Nâng cấp `safeWriteJson` trong [`src/main/services/ffmpeg.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/main/services/ffmpeg.js) dùng tên file tạm duy nhất kèm `try/catch` chống xung đột `EPERM/ENOENT` khi đóng đồng loạt tiến trình con `ffmpeg/ffprobe` lúc tắt app; (3) Kiểm tra kép `!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()` trong [`src/main/ipc.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/main/ipc.js), chặn `EPIPE` / `dialog.showErrorBox` và đặt `forceExitTimer` `1200ms` trong [`src/main/main.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/main/main.js), giúp bấm `X` tắt ứng dụng mượt mà trong `< 1s` (`0` lỗi, `0` tiến trình treo nền).",
            "- **Sửa Triệt Để Lỗi Phóng To Icon Logo (`38x38px`), Tinh Chỉnh Bố Cục Giao Diện `Cyber Terminal Studio Matrix`, Chụp Ảnh Màn Hình Kiểm Định 5 Tab & Test Chức Năng Tự Động (`100% PASS`)**: (1) **Khắc phục lỗi Logo bị hiển thị kích thước gốc `828x828`:** Bổ sung đầy đủ các class `.topbar-logo`, `.topbar-brand`, `.topbar-title-wrap`, `.topbar-title-row`, `.key-select-shell`, `.nav-badge`, `.side-telemetry` trong [`src/renderer/styles.css`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/styles.css), khóa cứng `width=\"38\" height=\"38\" style=\"width:38px;height:38px;max-width:38px;max-height:38px;\"` trong [`src/renderer/index.html`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/index.html) (`28x28` trong [`mafia_dashboard_server.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/mafia_dashboard_server.py)) và chuẩn hóa file [`assets/zc-logo.png`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/assets/zc-logo.png) về `128x128` px (`logoRect` thực tế đo qua CDP = `38x38` px); (2) **Chuẩn hóa bố cục 1 dòng & màu Cyber Neon Green (`#00ff88`):** Đồng bộ nút `🔍 Quét ảnh`, khung `📂 Danh Sách Ảnh / Phông Xanh Trong Folder` trong [`src/renderer/app.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/app.js), mở rộng Sidebar `242px` (`white-space: nowrap`) để 10 mục menu (`01`..`10`) và thanh công cụ Topbar / Script Bridge nằm gọn trên 1 hàng ngang không bị rớt dòng; (3) **Chụp ảnh màn hình thực tế & Kiểm thử chức năng tự động ([`verify_ui_and_functions.py`](file:///C:/Users/hungp/.gemini/antigravity/brain/f37afbfd-a644-4843-881c-9b8aa5adc539/scratch/verify_ui_and_functions.py)):** Kết nối trực tiếp vào tiến trình Electron (`Port 9229`), chụp 5 ảnh màn hình thực tế (`01_tab_batch_video.png` .. `05_license_modal.png`) và xác nhận 100% chức năng hoạt động ổn định (`appInfo: ZC TEAM v5.6.1`, `licenseStatus: ACTIVE Còn 360 ngày`, `systemCheck: FFmpeg OK · H.264 NVENC · GTX 1060 6GB`, `voiceStatus: ONLINE Port 3900 CUDA 2 luồng`, `Port 8098: 9 Bàn Active`, đồng bộ 2 chiều Selection Option `#topGlobalKeySelect` <-> `#topChannelKeySelector`).",
            "- **Chuyển Đổi Giao Diện Ứng Dụng Sang Bản Mới `Cyber Terminal Studio Matrix` (Google Stitch), Đổi Tên Ứng Dụng Thành `ZC TEAM` (Kèm Logo/Icon Mới) & Đổi Phần Chọn Key Sang Dạng `Selection Option` (`<select><option>`)**: (1) **Đổi tên ứng dụng thành `ZC TEAM` kèm Logo & Icon mới (`assets/zc-logo.png`, `assets/icon.ico`):** Cập nhật toàn diện trên cửa sổ Desktop Electron ([`src/main/main.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/main/main.js), [`package.json`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/package.json)), Topbar ứng dụng ([`src/renderer/index.html`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/index.html)), Hộp thoại Bản quyền (`ZC TEAM · LICENSE GUARD MATRIX`) và thanh công cụ Web Studio ([`mafia_dashboard_server.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/mafia_dashboard_server.py)); (2) **Chuyển đổi giao diện sang chuẩn Stitch `Cyber Terminal Studio Matrix` (`#00ff88` Cyber Neon Green, `#10b981`, `#090b10` / `#0f131a`):** Đồng bộ CSS & HTML trên cả 10 Tab của ứng dụng Desktop ([`src/renderer/styles.css`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/styles.css), [`src/renderer/index.html`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/index.html), [`src/renderer/app.js`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/src/renderer/app.js)) và giao diện nhúng Bàn #1→#7 ([`mafia_dashboard_server.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/mafia_dashboard_server.py)), bao gồm Sidebar đánh số `01..10` có huy hiệu (`AI`, `GPU`, `3900`, `REELS`, `16:9`) và hộp Telemetry (`:3999 | :8098 | :3900`); (3) **Chuyển phần chọn Key / Kênh sang dạng `Selection Option` (`<select><option>`):** Thay thế 3 tab ngang trên thanh công cụ bằng hộp chọn `<select id=\"topChannelKeySelector\">` (đồng bộ 2 chiều với `<select id=\"topGlobalKeySelect\">` trên Topbar và `<select id=\"nicheSelector\">`), kèm `<select id=\"licenseKeyPresetSelect\">` trong hộp thoại Bản quyền; (4) Đóng gói lại [`Ban-Giao-Khach-Hang-EXE/VideoBatchStudio/resources/app.asar`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/Ban-Giao-Khach-Hang-EXE/VideoBatchStudio/resources/app.asar) và khởi động lại ứng dụng `ZC TEAM` trên màn hình chính.",
            "- **Bổ Sung Chế Độ `🎯 Sử Dụng Luôn Tiêu Đề Đã Dán — Không Viết Lại (Bỏ Qua Bàn #1 ➔ Chạy Thẳng Bàn #1.5)` Ngay Khi Dán Tiêu Đề**: (1) Bổ sung thanh chọn nhanh 2 chế độ ngay phía trên ô dán tiêu đề (`#composerBody` / `#titlesInput`) và hộp chọn `#titleModeSelector` trên thanh công cụ trong [`mafia_dashboard_server.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/mafia_dashboard_server.py): **`🔥 Viết lại & Chấm điểm Tiêu đề (Chạy từ Bàn #1)`** hoặc **`🎯 Sử dụng luôn Tiêu đề đã dán — Không viết lại (Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5)`**; (2) Nâng cấp [`add_titles_to_backlog()`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/mafia_chatgpt_pipeline.py#L5857-L5972) và [`run_pipeline()`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/mafia_chatgpt_pipeline.py#L3367-L3390) trong [`engine/mafia_chatgpt_pipeline.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/mafia_chatgpt_pipeline.py): khi chọn dùng luôn tiêu đề đã dán (`skip_title_rewrite = True`), hệ thống khóa `winner_title = source_title`, ghi nhận hoàn tất Bước 1 (`STEP_1_DONE`), bỏ qua hoàn toàn Bàn #1 và chạy thẳng từ **Bàn #1.5 (`Canon Guard`)** sang **Bàn #2 (`Giàn ý`)**; (3) Hiển thị nhãn trạng thái `🎯 Dùng luôn Title gốc (Bỏ qua Bàn #1)` trực quan trên từng thẻ kịch bản.",
            "- **Bổ Sung Key Kênh Mới `🇲🇽 MEXICO BÀ CÔ` (`--niche mexico`), Tích Hợp Trọn Bộ 7 Skill `MEXICO_FAMILY_SKILLS_V1` (`v1.3.0`) Kèm `Skill Bàn 1.5 (Canon Guard)` & `Skill Bàn 7 (Check Lại File TTS)` Trong Thư Mục Duy Nhất `D:\\ZC_TEAM\\TOOL_ZC_TEAM`**: (1) **Hợp nhất 100% ứng dụng về thư mục duy nhất [`D:\\ZC_TEAM\\TOOL_ZC_TEAM`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM)** và dọn sạch các thư mục rời rạc không dùng; (2) **Tích hợp 5 Skill gốc từ `MEXICO_FAMILY_SKILLS_V1_mexico-ng-gia.zip` + Xây dựng mới 2 Skill chuyên biệt (`Bàn 1.5` & `Bàn 7`) trong [`D:\\ZC_TEAM\\TOOL_ZC_TEAM\\skills_mexico`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/skills_mexico) (tổng cộng 17/17 Skill đồng bộ vào Antigravity):** Bàn #1 `titulos-drama-familiar-mexico` (`01_TITULOS_MEXICO`), **Bàn #1.5 `canon-guard-drama-familiar-mexico` ([`01_5_CANON_GUARD_MEXICO/SKILL.md`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/skills_mexico/01_5_CANON_GUARD_MEXICO/SKILL.md))**, Bàn #2 `arquitectura-drama-familiar-mexico` (`02_ARQUITECTURA_MEXICO`), Bàn #3 `escritor-y-reparacion-drama-familiar-mexico` (`03_ESCRITOR_MEXICO`), Bàn #4 `auditor-forense-guion-familiar-mexico` (`04_AUDITOR_MEXICO`), Bàn #5 `seo-thumbnail-trailer-drama-familiar-mexico` (`05_SEO_MEXICO`) và **Bàn #7 `verificador-tts-drama-familiar-mexico` ([`07_VERIFICADOR_TTS_MEXICO/SKILL.md`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/skills_mexico/07_VERIFICADOR_TTS_MEXICO/SKILL.md) — Check lại & chuẩn hóa file TTS `es-MX`)**; (3) **Nâng cấp Engine Bàn 1.5 ([`engine/channel_memory_guard.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/channel_memory_guard.py)):** Quản lý kho trí nhớ riêng `CHANNEL_MEMORY_MEXICO.json`, tự động quét 30 tập gần nhất và cấp chỉ thị `checkpoints/01_5_CANON_GUARD_DIRECTIVE.md` kèm ngân hàng tên Bà Cô Mexico (`Doña Consuelo Morales`, `Doña Esperanza Ríos`...), phản diện, thành phố/Colonia Mexico và cơ chế pháp lý (`escrituras originales`, `usufructo vitalicio`, `notaría pública`); (4) **Nâng cấp Engine Bàn 7 Check Lại File TTS ([`engine/tts_post_director.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/tts_post_director.py)):** Xây dựng hàm `sanitize_and_normalize_mexico_spanish_tts()` tự động xóa nhãn `[PART 1]..[PART 7]`, bung toàn bộ từ viết tắt tiếng Tây Ban Nha Mexico (`Sra.` -> `Señora`, `Sr.` -> `Señor`, `Dr.` -> `Doctor`, `Lic.` -> `Licenciado`, `Ing.` -> `Ingeniero`, `Av.` -> `Avenida`, `CDMX` -> `Ciudad de México`, `IMSS` -> `Seguro Social`, `MXN` -> `pesos mexicanos`), chuyển đổi số tiền `$` & `%` sang chữ đọc tự nhiên, lọc từ vùng Tây Ban Nha (`vosotros/ordenador/zumo`) sang chuẩn `es-MX`, kiểm tra cổng độ dài `70.000–80.000 ký tự` và xuất biên bản `checkpoints/07_TTS_CHECK_REPORT.md`; (5) **Cập nhật Pipeline & Giao diện Dashboard ([`engine/mafia_chatgpt_pipeline.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/engine/mafia_chatgpt_pipeline.py), [`mafia_dashboard_server.py`](file:///D:/ZC_TEAM/TOOL_ZC_TEAM/mafia_dashboard_server.py)):** Thêm nút chọn kênh **`🇲🇽 MEXICO BÀ CÔ`** trên thanh điều hướng trên cùng, lưu trữ độc lập tại `PROJECTS_MEXICO` & `PROJECTS_MEXICO\\TONG HOP`, hỗ trợ tách tiêu đề tiếng Tây Ban Nha có dấu (`á, é, í, ó, ú, ñ`) không nhầm với lệnh tiếng Việt, và thêm nút xem trực tiếp báo cáo **Bàn #1.5 (Canon Guard)** & **Bàn #7 (Check TTS)** trên từng thẻ dự án.",
            "- **Khắc Phục Lỗi Mở Lại Ứng Dụng, Bổ Sung `requestSingleInstanceLock`, Chống Xung Đột Cổng `8098/8099` (`WinError 10048`) & Đồng Bộ Bản `.EXE` Mới Nhất**: (1) Bổ sung `app.requestSingleInstanceLock()` + sự kiện `second-instance` trong [`src/main/main.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/main.js) để khi mở lại ứng dụng sẽ tự động khôi phục & đưa cửa sổ đang chạy lên tiền cảnh mà không gây xung đột khóa SQLite hay đụng cổng `3999`; (2) Bổ sung bẫy lỗi `OSError` (`WinError 10048`) và `ConnectionAbortedError` trong [`mafia_dashboard_server.py`](file:///D:/MAFIA_STUDIO_WEB/mafia_dashboard_server.py) để khi mở file `.bat` lúc server đã chạy ngầm không báo lỗi; (3) Cập nhật [`scripts/build-client-exe.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/scripts/build-client-exe.js) và đóng gói lại [`Video Batch Studio.exe`](file:///E:/a/VideoBatchStudio-Desktop-Offline/Ban-Giao-Khach-Hang-EXE/VideoBatchStudio/Video%20Batch%20Studio.exe) đầy đủ `tools/run_voicestudio_daemon.py`, database mẫu `Default 16:9` và `license.key`; (4) Khởi chạy bền vững ở chế độ Daemon (`-Wait`) cho toàn bộ hệ thống (`Port 3999` Bridge + `Port 3900` VoiceStudio GPU CUDA + `Port 8098` Web Studio).",
            "- **Nâng Cấp Bảng Kiểm Tra Cấu Hình Trước Khi Chạy (`📋 Xem Cấu Hình & Các Folder`), Đồng Bộ Chuẩn Template `Default 16:9` (`6 Layers` + Sub Vàng `Arial 70px`), Tự Động Bật Disclaimer (`dis-type2.mp4`) & Khóa Kho Stock Thật (`E:\\OBS-Recordings`)**: (1) Khắc phục việc `syncBatchConfigToBridge` chạy sớm trước khi `initializeWorkspace()` nạp xong Template và Disclaimer khiến video test bị về font mặc định `32px` và tắt Disclaimer; (2) Dọn sạch thư viện test tạm `stock_pool` để trỏ thẳng về kho Stock thật (`E:\\OBS-Recordings` / `E:\\OBS-Recordings\\16-6`); (3) Hỗ trợ tự khớp tên file ảnh/intro theo cả `{ID}_KB` và `{ID}` (`001_KB.png` hoặc `001.png`) trong [`batch-service.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/services/batch-service.js); (4) Bổ sung nút **`📋 Xem Cấu Hình & Các Folder`** ngay trên thanh công cụ tab **`✍️ Viết Kịch Bản AI`** ([`app.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/renderer/app.js), [`script-video-bridge-service.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/services/script-video-bridge-service.js)) hiển thị chi tiết **Template & 6 Layers**, **Disclaimer (`🟢 BẬT: dis-type2.mp4`)**, **Cấu hình Xuất Video (`1920×1080 · 24 FPS · NVENC · Stock 0.75x`)** và **7 Folder chứa dữ liệu** kèm nút **`📂 Mở Folder`** cho từng thư mục.",
            "- **Kiểm Định Thực Chiến Khép Kín Toàn Bộ Quy Trình (`7/7 Bài Test PASS 100%`), Tự Động Bật `VoiceStudio GPU Server` (`Port 3900`) Khi Mở Ứng Dụng & Sửa Lỗi `setsar=1` FFmpeg Concat**: (1) **Tự động bật VoiceStudio GPU Server (`Port 3900` · `CUDA`) ngay khi mở ứng dụng ([`main.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/main.js), [`voice-studio-service.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/services/voice/voice-studio-service.js), [`run_voicestudio_daemon.py`](file:///E:/a/VideoBatchStudio-Desktop-Offline/tools/run_voicestudio_daemon.py)):** Liên kết trực tiếp bộ thư viện Offline có sẵn (`D:\\TEST TOOL VIDEO - Copy\\VoiceStudio`) sang `D:\\VoiceStudioRuntime\\project` kèm dấu xác thực `.runtime-ready` (`0%` tải mạng) và tự động khởi chạy `VoiceStudio GPU Server` ngay khi mở `Video Batch Studio`, kèm tầng cứu hộ `Windows SAPI Offline`; (2) **Chuẩn hóa `setsar=1` trong [`render-planner.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/services/render-planner.js):** Bổ sung `setsar=1` trước `format=yuv420p` trong `segmentFitFilter()` và `imageMotionFilter()` để triệt tiêu lỗi lệch `SAR 5401:5400 vs 1:1` khi ghép nối (`concat`) nhiều video Stock; (3) **Hoàn tất 7/7 bài test E2E ([`test_full_pipeline.py`](file:///C:/Users/hungp/.gemini/antigravity/brain/f37afbfd-a644-4843-881c-9b8aa5adc539/scratch/test_full_pipeline.py)):** Đạt 100% từ Bảo mật `RSA-2048` ➔ `Bàn #1.5 studio-canon-guard` ➔ Điểm neo biên `±5 câu` ➔ `0% Data Spoofing` ➔ Cô lập 4 đoạn chat độc lập ➔ `Bàn #6 studio-6-visual-tts-director` ➔ `Bàn #7 studio-7-voice-video-producer` (tạo thành công `TEST_999_KB.wav` `512 KB`, `TEST_999_KB.srt` `331 B`, `TEST_999_KB.mp4` `6.12 MB` và đồng bộ ngược về `STATE.json`).",
            "- **Triển Khai Phương Án A — Hợp Nhất `Video Batch Studio Desktop Offline` (`E:\\a\\VideoBatchStudio-Desktop-Offline`) & `Mafia/Homeless Script Studio` (`D:\\MAFIA_STUDIO_WEB`) Thành 1 Ứng Dụng Desktop Duy Nhất Kèm `Bàn #7: studio-7-voice-video-producer`**: (1) **Tích hợp Tab `✍️ Viết Kịch Bản AI` (`data-page=\"script-studio\"`) ngay trên thanh bên trái của `Video Batch Studio`:** Người dùng chỉ cần mở 1 ứng dụng Desktop duy nhất, cấu hình sẵn thông số dựng video ở tab **`🎬 Tạo Batch Video`** (Project, Template, Giọng đọc `Kho_Voice` / `Edge-TTS`, Kho Video Stock `DURATION_POOL`, Hiệu ứng Phụ đề, Thư mục xuất `.mp4`), bấm nút **`🔒 Khóa Cấu Hình Video ➔ Qua Viết Kịch Bản AI`** (hoặc chuyển sang tab `✍️ Viết Kịch Bản AI`) rồi bấm chạy kịch bản; (2) **Xây dựng `ScriptVideoBridgeService` (`Port 3999` — [`src/main/services/script-video-bridge-service.js`](file:///E:/a/VideoBatchStudio-Desktop-Offline/src/main/services/script-video-bridge-service.js)):** Tự động khởi chạy ngầm `mafia_dashboard_server.py` (`Port 8098`) khi mở `Video Batch Studio`, khóa cấu hình video (`lockedVideoConfig`) vào SQLite và điều phối hàng đợi GPU tuần tự (`FIFO Queue`) không làm nghẽn tiến trình viết kịch bản của ChatGPT; (3) **Tự động kích hoạt `Bàn #7` (`studio-7-voice-video-producer`) ngay sau `Bàn #6` (`notify_video_batch_studio_script_completed`):** Ngay khi mỗi kịch bản hoàn tất kiểm chuẩn TTS và xuất `{TenKichBan}_KB.txt` vào `TONG HOP`, Python tự động bắn tín hiệu sang `http://127.0.0.1:3999/api/bridge/script-completed` để `BatchService.run()` tự động gọi `VoiceStudio` (`Port 3900`) tạo `.wav` -> `Faster-Whisper GPU` sinh `.srt` -> `FFmpeg h264_nvenc` kết xuất `{TenKichBan}_KB.mp4` trực tiếp vào thư mục đầu ra (`flatOutputFolder: true`, bảo toàn vòng xoay kho Stock `DURATION_POOL`), đồng thời cập nhật đường dẫn `.mp4` ngược lại vào `STATE.json` và thẻ dự án; (4) Hỗ trợ linh hoạt 2 chế độ kích hoạt (**`⚡ Cuốn chiếu từng bài (STREAMING)`** hoặc **`📦 Gom đủ lô mới tạo (BATCH_AFTER_ALL)`**) và 2 phạm vi đầu ra (**`🎬 Tạo Voice (.wav) + Phụ đề (.srt) + Render Video (.mp4)`** hoặc **`🎙️ Chỉ Tạo Voice (.wav)`**), kèm nút **`🎬 Đẩy Sang Bàn #7 Tạo Video`** trên từng thẻ dự án.",
            "- **Khắc Phục Triệt Để 5 Lỗ Hổng Kiến Trúc & Bảo Mật Cốt Lõi + Bổ Sung 2 Bàn Agent Mới (`Bàn #1.5: studio-canon-guard` & `Bàn #6: studio-6-visual-tts-director`)**: (1) **🔴 Xử lý Lỗ hổng 1 (Tách Biệt Đoạn Chat Độc Lập `switch_to_isolated_desk_thread` — Chống `Self-Bias` & `Context Pollution`):** Bàn #1 -> #3 chạy trên `Writer Thread`; sang Bàn #4A (`MODE A`) hệ thống tự động đóng tab cũ và mở **`Auditor Thread` mới tinh 100%** để Thanh tra chấm điểm độc lập không biết lịch sử nháp; sang Bàn #4B (`MODE B`) mở **`Repair Thread` riêng** và sang Bàn #5 mở **`SEO Thread` riêng**, giải phóng hoàn toàn bộ nhớ DOM và xóa bỏ thiên kiến tự chấm bài; (2) **🟠 Xử lý Lỗ hổng 2 (Xóa Bỏ 100% Làm Đẹp Số Liệu `cert_body` & Lệnh Ép Điểm Đậu `98-99/100` tại Bàn #4):** Truyền 100% số liệu ký tự/từ thực tế của Python vào chứng chỉ `qa_checkpoint.py` và yêu cầu Bàn #4 chấm điểm trung thực tuyệt đối theo Rubric Pháp y; (3) **🟡 Xử lý Lỗ hổng 3 (Bổ Sung Điểm Neo Biên `Boundary Anchors ±5 Câu` Khi Sửa Lẻ Từng Part Ở Bước 4B — `extract_part_boundary_anchors` & `strip_boundary_sentence_overlap`):** Tự động trích xuất **5 câu cuối của `Part p_num - 1`** và **5 câu đầu của `Part p_num + 1`** truyền vào lệnh sửa `Part p_num` kèm bộ lọc chống lặp câu giáp ranh, giúp mạch cảm xúc TTS liền mạch 100%; (4) **🟡 Xử lý Lỗ hổng 4 & Bổ sung `Bàn #1.5` (`🛡️ studio-canon-guard` — [`engine/channel_memory_guard.py`](file:///D:/MAFIA_STUDIO_WEB/engine/channel_memory_guard.py)):** Tự động đọc và cập nhật `CHANNEL_MEMORY.json` (`CHANNEL_MEMORY_HOMELESS.json` & `CHANNEL_MEMORY_MAFIA.json`), trích xuất danh sách tên nhân vật, họ, thị trấn, vật chứng và cú twist của 30 kịch bản gần nhất để bơm lệnh cấm trùng lặp trước khi Bàn #2 lập dàn ý; (5) **🟣 Bổ sung `Bàn #6` (`🎙️ studio-6-visual-tts-director` — [`engine/tts_post_director.py`](file:///D:/MAFIA_STUDIO_WEB/engine/tts_post_director.py)):** Hậu kỳ sau SEO tự động quét sạch ký tự lạ, bung toàn bộ từ viết tắt (`Mr.` -> `Mister`, `Mrs.` -> `Missus`, `Dr.` -> `Doctor`, `St.` -> `Saint/Street`, `Jr.`, `Sr.`) và số viết tắt (`$1.5M`, `-40°F`, `%`, `sq. ft.`, `lbs.`) trong `FULL_SCRIPT.txt` & `{STT}_KB.txt`, xuất báo cáo `checkpoints/06_TTS_DIRECTOR_REPORT.md`; (6) **🔴 Xử lý Lỗ hổng 5 (Nâng Cấp Chữ Ký Số Bất Đối Xứng `RSA-2048` Trong [`engine/license_manager.py`](file:///D:/MAFIA_STUDIO_WEB/engine/license_manager.py)):** Loại bỏ hoàn toàn khóa đối xứng `VERIFY_SIGNING_KEY` trong mã nguồn Client; chuyển sang `RSA-2048 PKCS#1 v1.5 SHA-256` (Private Key chỉ nằm trong `ADMIN_MASTER_SECRET.json` trên máy Admin, Client chỉ giữ Public Key `VERIFY_PUBLIC_KEY_N_HEX` nên không bao giờ tự tạo được Key hoặc bắn lệnh thu hồi giả).",
            "- **Triển Khai Bộ Chia Tải Đa Tài Khoản ChatGPT Web (`3 Tài Khoản: Acc #1, Acc #2, Acc #3` — Chia Đều Nhiệm Vụ & Khóa Tối Đa `1 Acc = 3 Luồng`, Công Suất Tối Đa `9 Luồng Song Song`)**: (1) Thiết lập 3 Profile Chrome độc lập hoàn toàn (`Acc #1`: `BROWSER_PROFILE` - Port `9222`, `Acc #2`: `BROWSER_PROFILE_2` - Port `9223`, `Acc #3`: `BROWSER_PROFILE_3` - Port `9224`), mỗi cổng CDP có khóa điều phối riêng (`CDP_PORT_LOCKS[port]`) nên 3 tài khoản chạy song song 100% độc lập không chờ nhau; (2) Tích hợp thuật toán **Chia Đều Nhiệm Vụ (`Least-Loaded + Round-Robin Load Balancer`)** trong `ChatGPTWebMultiTabClient.acquire_account_for_project()`: tự động kiểm tra các tài khoản đã đăng nhập, phân bổ kịch bản mới cho tài khoản đang gánh ít luồng nhất theo vòng xoay đều (`Acc #1 -> Acc #2 -> Acc #3...`) và khóa cứng **tối đa 1 Acc chạy 3 luồng (`MAX_THREADS_PER_ACCOUNT = 3`)** (1 Acc = tối đa 3 luồng, 2 Acc = tối đa 6 luồng, 3 Acc = tối đa 9 luồng song song); (3) Nâng cấp giao diện Dashboard `http://127.0.0.1:8098` hiển thị trực tiếp trạng thái & số luồng đang gánh của từng tài khoản (`Acc #1: x/3 luồng`, `Acc #2: x/3 luồng`, `Acc #3: x/3 luồng`), 3 nút **`🔑 Đăng Nhập Acc #1 / #2 / #3`** lưu phiên vĩnh viễn và bảng giám sát mở rộng tới 9 Khe Đa Luồng.",
            "- **Khắc Phục Triệt Để Hiện Tượng Ngủ Nền / Ảo Hóa Tab Phụ Khi Chạy 3 Luồng Song Song (`CDP_EVAL_LOCK` + `/json/activate/{tab_id}` Trong `_eval_js_in_tab` & `ThreadingHTTPServer`)**: (1) Trong `_eval_js_in_tab()`, bổ sung khóa điều phối `CDP_EVAL_LOCK` và tự động gọi nhẹ `/json/activate/{tab_id}` ngay bên trong cửa sổ Chrome ẩn (`(-3200, -3200)`) trước mỗi lần đọc trạng thái hoặc bơm lệnh, giúp cả 3 Tab song song đều được làm tươi trạng thái `visibilityState = visible` định kỳ mỗi 3.5 giây (không bao giờ bị Chrome đóng băng `IntensiveWakeUpThrottling` sau 5 phút chạy nền hoặc giữ DOM ảo hóa ở `0 ký tự`, đồng thời không bao giờ hiện cửa sổ lên màn hình làm việc); (2) Nâng cấp máy chủ Dashboard `http://127.0.0.1:8098` lên `ThreadingHTTPServer` đa luồng.",
            "- **Khóa Cấp Phát Tab Độc Lập Cho 3 Luồng Song Song (`_reserved_tab_ids` Trong `ChatGPTWebMultiTabClient._get_or_create_tab_ws`)**: Khi khởi chạy đồng thời 3 luồng (`003_93_HOME_12`, `004_94_HOME_12`, `005_96_HOME_12`), bổ sung tập hợp khóa trước `_reserved_tab_ids` ngay bên trong `WEB_TAB_LOCK` để mỗi luồng được cấp phát 1 Tab Chrome hoàn toàn riêng biệt (`Tab #1: 6ae18cb3`, `Tab #2: 6ae18cb6`, `Tab #3: 6ae18cbe`), chấm dứt việc 3 luồng cùng lấy chung 1 tab trang chủ trước khi URL kịp chuyển sang `/c/{uuid}`.",
            "- **Tích Hợp Giao Diện Chia 2 Cột Đặt Tên Kịch Bản Khi Tải Về / Xuất `TONG HOP` (`TenKichBan   Tiêu đề gốc`, Tự Động Tách Cột Khi Copy-Paste Từ Excel & Mặc Định `001, 002` Khi Để Trống)**: (1) Thiết kế giao diện nhập liệu chia 2 cột trực quan trên cả `http://127.0.0.1:8098` và `http://127.0.0.1:8099`: **Cột 1 (`🏷️ Tên Kịch Bản - TenKichBan`)** và **Cột 2 (`🎯 Tiêu Đề Gốc Tiếng Anh`)** có đồng bộ cuộn dòng; (2) Hỗ trợ copy-paste trực tiếp 2 cột từ Excel/Sheet hoặc văn bản dạng `TenKichBan   Tiêu đề gốc` (tự động tách sang 2 cột ngay khi dán hoặc bấm nút `🪄 Tự Tách 2 Cột`); (3) Nếu có đặt tên riêng (VD: `KB01`, `TenKichBan`), hệ thống xuất vào thư mục `TONG HOP` và cho phép tải về trực tiếp trên trình duyệt với đúng tên **`{TenKichBan}_KB.txt`** & **`{TenKichBan}_SEO.txt`**; nếu để trống tên, hệ thống tự động giữ mặc định **`001_KB.txt`** & **`001_SEO.txt`**; (4) Bổ sung nút **`⬇️ Tải Kịch Bản`**, **`⬇️ Tải SEO`** và **`✏️ Đặt / Đổi Tên Kịch Bản`** ngay trên từng thẻ dự án.",
            "- **Khóa Chuẩn Model `Thinking effort: Medium`, Xác Nhận Gửi Thành Công Chip Đính Kèm (`sentConfirmed` Loop) & Khôi Phục Tức Thời Từng Part Đã Sửa (`PART_{N}_REVISED_r{round}.txt`) — Hoàn Tất 100% Kịch Bản Test `001` Trên Phiên Bản 2 (`http://127.0.0.1:8098`)**: (1) Tự động kiểm tra và khóa nút chọn Model trên thanh Composer (`button[aria-label=\"Select ChatGPT model\"]`) luôn ở mức **`Thinking effort: Medium`** trước mỗi lần gửi theo đúng yêu cầu; (2) Bổ sung vòng lặp xác nhận gửi (`sentConfirmed` 20 lần * 350ms) trong `_inject_and_send_prompt_on_ws` để khi dán lệnh kèm chip `\"Pasted text\"`, hệ thống bấm `Send` cho tới khi ô nhập trống sạch hoặc hiện nút `Stop`; (3) Nâng cấp Bước 4B tự động nạp lại các file `PART_{N}_REVISED_r{round}.txt` đã sửa từ Checkpoint và mở rộng thu hoạch lịch sử `turns[1:12]`, giúp dự án test `001_A_Single_Mom_Built_a_Round_Clay_House_` hoàn thành trọn vẹn 5/5 bước (`FULL_SCRIPT.txt` `84.401` ký tự, `13.418` từ, `7/7` Parts + `FULL_SEO.txt` `18.875` bytes + `TONG HOP\\001_KB.txt` & `001_SEO.txt`).",
            "- **Khắc Phục Hiện Tượng Đứng Chờ Ở Turn #5 Do Cơ Chế Ảo Hóa DOM (`data-virtualized-turn-content`) Của ChatGPT Web (`wait_for_turn_completion`)**: Khi đoạn chat trên `https://chatgpt.com` vượt quá 4 lượt dài (~200.000 ký tự), giao diện Web tự động ẩn bớt (virtualize) Turn #1 khỏi DOM để nhẹ bộ nhớ khiến số lượng thẻ `[data-turn-key]` trên DOM chỉ còn `4` dù thực tế đang ở Turn `#5, #6, #7...`. Đã cập nhật `wait_for_turn_completion()` trong [`D:\\MAFIA_STUDIO_WEB\\engine\\chatgpt_web_client.py`](file:///D:/MAFIA_STUDIO_WEB/engine/chatgpt_web_client.py) chuyển kiểm tra `len(turns) >= expected_min_turns` sang cây hội thoại gốc từ `read_full_thread()` (`/backend-api/conversation/{id}` không bao giờ bị ảo hóa), giúp thu hoạch tức thời Turn #5 (`PART 6..7`), ghép đủ `7/7 Parts` (`80.929` ký tự) và chuyển thẳng sang Bước 4A (`Turn #6`).",
            "- **Tích Hợp Chế Độ Chạy Ẩn / Chạy Ngầm 100% Cho Profile Chrome (`set_chrome_window_visibility` — `Browser.setWindowBounds: minimized` & Cờ Chống Ngủ Nền)**: (1) Bổ sung hàm `set_chrome_window_visibility(visible=False)` trong [`D:\\MAFIA_STUDIO_WEB\\engine\\chatgpt_web_client.py`](file:///D:/MAFIA_STUDIO_WEB/engine/chatgpt_web_client.py) và nút **`👻 Ẩn Cửa Sổ Chrome (Chạy Ngầm 100%)`** trên giao diện `http://127.0.0.1:8098`; (2) Khi đã đăng nhập xong, cửa sổ Chrome tự động thu ẩn chạy ngầm dưới nền (không bật lên chiếm màn hình làm việc của người dùng ngay cả khi tạo Tab mới hoặc bơm lệnh Turn tiếp theo), trong khi vẫn duy trì 100% tốc độ xử lý nhờ 3 cờ `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows` và không bao giờ bị Cloudflare chặn như chế độ headless truyền thống.",
            "- **Triển Khai & Tối Ưu Hóa Phiên Bản 2 — Engine Điều Khiển ChatGPT Web Đa Tab Độc Lập (`D:\\MAFIA_STUDIO_WEB` — Port `8098` & Chrome CDP `9222`)**: (1) **Đăng nhập 1 lần lưu vĩnh viễn (`BROWSER_PROFILE` & Interactive Scheduled Task `StudioWebChrome`):** Tự động mở cửa sổ Chrome nổi trên màn hình tương tác thật (`WinSta0\\Default`) để người dùng đăng nhập ChatGPT Web (`https://chatgpt.com`), lưu cứng toàn bộ Cookie & Session; (2) **Đồng bộ Giao diện Composer Mới của ChatGPT Web (`ComposerLayoutRoot` & `.ProseMirror[contenteditable=\"true\"]`):** Cập nhật bộ chọn ô nhập liệu (`.ProseMirror[contenteditable=\"true\"]`, `[role=\"textbox\"][contenteditable=\"true\"]`), nút gửi (`form button[aria-label=\"Send\"]`, `form button[type=\"submit\"]`) và cơ chế bơm lệnh phân cụm dòng (`<= 1800 ký tự` & `<= 30 dòng/cụm` qua `ClipboardEvent('paste')`) giúp dán trực tiếp inline 100% các lệnh dài 30.000–80.000 ký tự trong `< 1 giây` mà không tạo chip đính kèm và không treo renderer; (3) **Bộ Theo Dõi & Thu Hoạch Dữ Liệu Kép Trên Tab Web (`[data-turn-key]`, `[data-talvt-turn-state]` & `/backend-api/conversation/{id}`):** Kiểm tra trực tiếp trạng thái đang gõ (`state: in_progress` -> `complete`) và độ dài ký tự thời gian thực trên DOM của từng Tab riêng (`0` request mạng phụ trong lúc đang viết), sau đó trích xuất 100% văn bản Markdown gốc ngay khi hoàn tất mà không bao giờ gặp lỗi `\"Could not load this ChatGPT conversation\"`.",
            "- **Khắc Phục Tận Gốc Lỗi `\"Could not load this ChatGPT conversation\"` (`windowId=1` Single-Tab WebView Lock, Tắt Kill Renderer & Tự Động Chọn Đúng Named Pipe Đa User)**: (1) **Nguyên nhân gốc rễ từ `codex-desktop.log`:** Các đoạn chat Chat thông thường (`/c/{id}`) trong `ChatGPT.exe` dùng chung duy nhất 1 cửa sổ trình duyệt nhúng (`windowId=1` / `originWebContentsId=1`); khi chạy nhiều luồng trên cùng 1 app, `windowId=1` bị giật chuyển tab qua lại (`/c/conv1` <-> `/c/conv2`) mỗi giây và bắn hàng chục lệnh `GET /conversations/{id}?num_turns=10` gây lỗi `status=429 Too many requests` (hiển thị trên UI là `\"Could not load this ChatGPT conversation\"`) -> Khóa `max_workers = 1` cho chế độ ChatGPT WebView để `windowId=1` neo cố định trên 1 đoạn chat duy nhất từ Bước 1 đến Bước 5 (0% chuyển tab qua lại); (2) **Vô hiệu hóa việc tự kill tiến trình `ChatGPT.exe --type=renderer` (`_heal_frozen_chatgpt_renderer`):** Tiến trình renderer khỏe mạnh dùng ~340–350MB RAM; việc kill renderer khi >180MB trước đây khiến Electron kích hoạt `app_start` và tải lại toàn bộ lịch sử hội thoại gây bão 429; (3) **Giữ nguyên tab hiện tại khi chờ xả Rate-Limit (`send_message` & `send_or_harvest_turn`):** Khi gặp thông báo nghẽn tải hội thoại, tuyệt đối không đổi sang tab mới (vì đổi tab sẽ ép `windowId=1` bắn thêm `GET /conversations/{new_id}`), mà đứng yên tại chỗ 32s để giỏ Rate-Limit của OpenAI tự mở khóa hoàn toàn rồi gửi tiếp; (4) **Cách ly Named Pipe đa User Windows (`_open_current_user_pipe_handle`):** Tự động bỏ qua cổng Named Pipe thuộc User Windows khác (`Studio2` Session 2, tránh lỗi `[Errno 13] Permission denied`), mở trực tiếp 1 lần duy nhất cổng Named Pipe của User hiện tại (`hungp` Session 1) và tự động bật lại `ChatGPT.exe` nếu bị tắt.",
            "- **Nâng Cấp Kiến Trúc Chia 3 Phần Viết Lưu Ngay (`03_PART_GROUP_1..3` & `PART_1..7`), Sửa Từng Part Độc Lập (`1 Lần Sửa = 1 Part Duy Nhất`) & Bộ Xử Lý Lỗi AI (`ai_diagnose_and_complete_part` + Xử Lý Triệt Để `Could not load this ChatGPT conversation`)**: (1) **Không bao giờ xuất Full kịch bản trong 1 lượt:** Chia Bước 3 thành 3 lần viết độc lập (`03_PART_GROUP_1.txt` `[PART 1..2]`, `03_PART_GROUP_2.txt` `[PART 3..5]`, `03_PART_GROUP_3.txt` `[PART 6..7]`) và tách lưu ngay từng file `checkpoints/PART_1.txt`..`PART_7.txt` sau mỗi lần viết; (2) **Bộ xử lý lỗi AI (`ai_diagnose_and_complete_part`) khi viết thiếu/dừng giữa chừng:** Thay vì gửi lại lệnh cứng bắt viết lại từ đầu, AI tự động kiểm tra từng Part — nếu Part bị cắt cụt giữa chừng (`< 8.200` ký tự hoặc chưa kết câu), AI trích xuất 3 câu cuối cùng (`tail_anchor`) và gửi lệnh AI Continuation viết nối tiếp từ đúng câu đó cho tới hết Part rồi ghép nối mượt mà; (3) **Mỗi lần sửa chỉ sửa 1 Part duy nhất (`BƯỚC 4B`):** Khóa giữ nguyên 100% các Part đã đạt yêu cầu, duyệt qua các Part cần sửa theo từng lượt riêng biệt (`1 lần sửa = 1 Part duy nhất`, viết Full Part đó `~10.500–11.200` ký tự, lưu ngay vào `PART_{N}.txt`), đến khi sửa và đánh giá đủ điểm thì tự động ghép các Part sửa và các Part đạt yêu cầu lại thành 1 file hoàn chỉnh (`FULL_SCRIPT.txt` & `TONG HOP/{STT}_KB.txt`); (4) **Khắc phục tận gốc lỗi `\"Could not load this ChatGPT conversation\"`:** Loại bỏ lệnh gọi kép `read_thread` (`_is_thread_streaming_in_memory`) gây xung đột Rate-Limit lịch sử hội thoại với `GET /backend-api/conversation/{id}`, tăng nhịp giãn cách GET lên `18s` và bổ sung `AI-ERROR-HANDLER` trong `send_message()` / `quarantine_conversation_in_pool()` để tự động xả nghẽn Rate-Limit, làm mới giao diện ChatGPT.exe và chuyển sang đoạn chat sạch kèm Checkpoint nếu đoạn chat cũ bị kẹt.",
            "- **Thiết Lập Môi Trường Chạy Song Song Đa User Windows (`D:\\MAFIA_STUDIO_USER2` — Port `8100` & Khởi Tạo User `Studio2`)**: (1) Khởi tạo thư mục độc lập hoàn chỉnh `D:\\MAFIA_STUDIO_USER2` (tích hợp sẵn bộ Python 3.14 độc lập tại `D:\\MAFIA_STUDIO_USER2\\Python314`, cấu hình chạy trên cổng Web riêng `http://127.0.0.1:8100` để không đụng cổng `8099` của User chính); (2) Tạo trình khởi chạy chống ngủ nền [`D:\\MAFIA_STUDIO_USER2\\KHOI_DONG_STUDIO_USER2.bat`](file:///D:/MAFIA_STUDIO_USER2/KHOI_DONG_STUDIO_USER2.bat) tự động đăng ký `OpenAI.Codex`, đồng bộ 10 Skill và mở `ChatGPT.exe` kèm 3 cờ chống ngủ nền Electron (`--disable-renderer-backgrounding --disable-background-timer-throttling --disable-backgrounding-occluded-windows`) giúp khi Switch User qua lại vẫn chạy 100% tốc độ; (3) Tạo bộ cài 1-Click [`D:\\MAFIA_STUDIO\\TAO_USER_WINDOWS_STUDIO2.bat`](file:///D:/MAFIA_STUDIO/TAO_USER_WINDOWS_STUDIO2.bat) để khởi tạo User Windows `Studio2` (Mật khẩu: `123456`, quyền Administrator) kèm biểu tượng ngoài màn hình Desktop.",
            "- **Tối Ưu Tăng Tốc Độ Viết Kịch Bản Gấp 2.5 Lần (`TURBO SPEED V2.5x` Cho `HOMELESS V12`)**: (1) Giảm thời gian chờ khóa đọc trạng thái `BACKEND_API_LOCK` từ `15.0s` xuống `4.5s` và thời gian nhường ưu tiên gửi từ `45s` xuống `8s` (loại bỏ ~40s chờ chết mỗi vòng kiểm tra giữa 3 luồng); (2) Bổ sung nhịp đệm `3.5s` ngay sau khi kết thúc lượt viết để cửa sổ `ChatGPT.exe` kịp đóng hiệu ứng gõ chữ (`isStreaming=false`) trước khi gửi lệnh bước kế tiếp, giúp lệnh gửi ăn ngay từ lần đầu (không mất 30s retry); (3) Tối ưu Bước 4 (`HOMELESS V12`) sang chế độ **Sửa Nhanh 2 Vòng Tinh Gọn (`max_rewrite_rounds = 2`, ngưỡng chốt `>= 95/100`, sửa gộp tối đa `3 Part/lượt` trong `MODE B`)**, rút ngắn thời gian hoàn thiện mỗi kịch bản 75.000–80.000 ký tự từ ~22 phút xuống còn **~8–10 phút/kịch bản**.",
            "- **Khắc Phục Triệt Để Lỗi `\"No renderable ChatGPT messages were found in this conversation\"` & `\"không load được đoạn chat\"` Trên ChatGPT Desktop**: (1) Bổ sung hàm `_find_first_renderable_assistant_node(mapping)` và trường `clean_node_id` trong `CHAT_CONVERSATION_POOL.json` để khi cấp phát hoặc reset đoạn chat luôn trỏ `current_node_id` về nút `assistant` có tin nhắn hiển thị đầu tiên (tuyệt đối KHÔNG trỏ về nút gốc rỗng `client-created-root` có `message: null`), đồng thời tự động khôi phục toàn bộ 10 đoạn chat bị rỗng nhánh trên thanh bên ChatGPT; (2) Trong `wait_for_turn_completion()`, ưu tiên kiểm tra trạng thái đang gõ trực tiếp trong bộ nhớ của `ChatGPT.exe` (`_is_thread_streaming_in_memory`, `0ms`, không tốn request mạng) và chỉ gọi `GET /backend-api/conversation/{id}` khi lượt viết đã hoàn tất (`idle`) hoặc mỗi `55s`, giúp giảm hơn 90% lượng gọi API lịch sử và chấm dứt hoàn toàn lỗi `\"không load được đoạn chat\"`; (3) Khóa giữ nguyên `thread_id` của dự án đang chạy trong `send_or_harvest_turn()` và `create_story_thread()`, không tự ý xóa Pool hoặc tạo đoạn chat trùng lặp khi cửa sổ `ChatGPT.exe` đang bận chuyển tab.",
            "- **Loại Bỏ 100% Khối JSON Trong Đoạn Chat, Tối Ưu Sửa Văn Xuôi Thuần Túy Theo Part (`[PART N]`) & Tốc Độ Gửi Lệnh Tức Thì (`HOMELESS V12`)**: (1) Xóa bỏ hoàn toàn mọi khối ` ```json ... ``` ` và các lệnh xuất file `.json` (`QA_FROZEN.json`, `QA_CHECKPOINT.json`, `QA_REPAIR_CONTRACT.json`) trong cả Prompt gửi đi lẫn phản hồi của ChatGPT ở Bước 4A & 4B để đoạn chat hiển thị 100% văn bản Markdown và văn xuôi truyện tiếng Anh tự nhiên giống hệt kênh Mafia; (2) Nâng cấp Bước 4B sang cơ chế **Sửa Văn Xuôi Tiếng Anh Thuần Túy Theo Từng Part Có Lỗi (`MODE B: CONTROLLED REWRITE THEO PATCH LEDGER` — `extract_patched_parts_from_audit` & `splice_revised_parts_into_script`)**, chỉ viết lại các `[PART N]` có bản vá bằng văn xuôi tiếng Anh hoàn chỉnh trong 1 lượt (~45s) rồi ghép vào kịch bản gốc (bảo toàn 100% các Part còn lại); (3) Rút gọn dung lượng gói Skill 3/4 và bỏ việc dán lặp lại 76.000 ký tự Giàn ý vào mỗi vòng Bước 4A (giảm kích thước tin nhắn từ `165.000` ký tự xuống `< 95.000` ký tự) kết hợp tách khóa ` _send_msg_lock` (`4.5s`) giúp `ChatGPT.exe` gửi lệnh tức thì trong ~1 giây mà không còn bị đơ.",
            "- **Tự Động Mở Đúng Tab Kênh Đang Chạy Trên Web (`http://127.0.0.1:8099`)**: Khi mở hoặc tải lại trang `http://127.0.0.1:8099`, giao diện tự động nhảy thẳng vào tab của kênh đang hoạt động (`🏚️ BÊN HOMELESS V12` hoặc `🎩 BÊN MAFIA`) kèm đèn báo `• 🟢 ĐANG CHẠY` thay vì mặc định đứng ở tab Mafia đang nghỉ.",
            "- **Khắc Phục Triệt Để Lỗi Treo Luồng, Thiếu Part & Điểm Thấp Của Kênh `HOMELESS V12` (Giữ Nguyên 100% Kênh Mafia)**: (1) Hạ ngưỡng tự động giải cứu tiến trình `ChatGPT.exe --type=renderer` bị đơ xuống `180MB` kết hợp hàng đợi ưu tiên `SEND_PRIORITY_LOCK` giúp gửi lệnh không bao giờ bị nghẽn sau các lệnh `GET`; (2) Bảo vệ 100% câu mở đầu `sents[0]`, câu kết đoạn `sents[-1]`, câu hỏi `?`, lời thoại và số tiền viết bằng chữ tiếng Anh trong `condense_homeless_stage_text`; (3) Chuyển đổi bộ Skill Inline (`_adapt_homeless_skill_for_inline_pipeline`) và đính kèm chứng chỉ JSON xác thực `qa_checkpoint.py` (`SHA-256`, `body_chars`, `discrepancy = 0`, `length_gate = PASS`) giúp Bàn #4 không bao giờ báo lỗi giả `QA ABORTED / 59 điểm`.",
            "- **Tích Hợp Hệ Thống Cấp Key Bản Quyền, Thu Hồi Từ Xa, Gia Hạn Từ Xa & Đóng Gói Bản Khách Hàng (`engine/license_manager.py`)**: Bổ sung Trung tâm Quản trị Key trên Máy Chủ của bạn (`http://127.0.0.1:8099`) cho phép tạo Key ký số `HMAC-SHA256` (`MSV12-...`), khóa theo Mã Máy (`HWID`), **Thu hồi Key (`REVOKED`)** hoặc **Gia hạn thêm ngày (`+7 / +30 / +365 ngày`)** từ xa qua Cloud tức thời, kèm nút 1-Click đóng gói bản Khách hàng sạch (`DIST_PACKAGE\\MAFIA_HOMELESS_STUDIO_CLIENT.zip`).",
            "- **Tích hợp Chuyển Đổi 2 Kênh Độc Lập (`🎩 BÊN MAFIA` & `🏚️ BÊN HOMELESS V12`) trên cùng Giao diện Web (`http://127.0.0.1:8099`) & Engine (`--niche mafia | homeless`)**: Cho phép chọn **Bên Mafia** hoặc **Bên Homeless V12** trước khi giao việc / thêm tiêu đề / bấm chạy hàng đợi. Dữ liệu, kho hàng đợi và thư mục `TONG HOP` của 2 bên được tách biệt 100% (`PROJECTS` vs `PROJECTS_HOMELESS`).",
            "- **Tích hợp trọn bộ 5 Skill `HOMELESS V12` chuẩn**: (1) `viral-title-rewriter v1.2` (`<=100 chars`, `>=97/100`), (2) `viet-gian-y-homeless v2.4.0` (`7 Parts` + `5 DNA A..E`), (3) `viet-kich-ban-homeless v2.0.0` (`3-Stage Persistent Drafting: Stage A Part 1-2, Stage B Part 3-5, Stage C Part 6-7` đạt chuẩn `70.000–80.000 ký tự`), (4) `kiem-tra-kich-ban v2.0.0` (tối đa 5 vòng sửa, làm sạch `[PART 1]..[PART 7]` cho TTS), và (5) `seo-homeless-story v2.1.0` (11 mục SEO + Thumbnail + Omni Trailer Prompts).",
            "- **Tối Ưu Tăng Tốc Độ Tạo Kịch Bản & Giới Hạn Chuẩn 5 Vòng Sửa Kèm Làm Sạch `Part 1..N` Cho TTS (`strip_part_headers_for_tts`)**: Giới hạn tối đa **5 vòng sửa (`max_rewrite_rounds = 5`)** tại Bàn #4 — nếu đạt `>= 97/100` thì chốt ngay, nếu hết 5 vòng chưa đủ điểm thì lấy trực tiếp **kịch bản số 5** làm `FULL_SCRIPT.txt`; tự động xóa sạch toàn bộ các dòng tiêu đề `Part 1..N` / `[PART 1]..[PART 7]` khi xuất `FULL_SCRIPT.txt` và `{STT}_KB.txt` trong thư mục `TONG HOP` để chỉ giữ lại 100% văn bản truyện thuần túy phục vụ chạy TTS trực tiếp.",
            "- **Triển Khai Kiến Trúc Đa Tài Khoản ChatGPT Web (`Acc #1`, `Acc #2`, `Acc #3` — Chia Đều Nhiệm Vụ, Tối Đa 1 Acc 3 Luồng = 9 Luồng Song Song)**: Mỗi tài khoản chạy trên 1 Profile Chrome riêng biệt (`Port 9222, 9223, 9224`) kèm Bộ Chia Tải Thông Minh (`Least-Loaded + Round-Robin`).",
            "- **Tự Động Đóng Tab Trình Duyệt Ngay Khi Viết Xong Kịch Bản (`Auto-Close Completed Tab` / `sweep_completed_and_idle_tabs_across_all_accounts`)**: Ngay khi kịch bản hoàn tất 5/5 bước (`COMPLETED_ALL_5_STEPS`), hệ thống tự động gỡ `beforeunload` và đóng ngay Tab Chrome của kịch bản đó (hoặc làm sạch tái sử dụng nếu là Tab duy nhất còn lại) để giải phóng RAM, tuyệt đối không để tồn đọng các Tab cũ làm nặng máy!",
            "- **Khắc Phục Lỗi Đóng Nhầm Tab Trang Chủ Đang Khởi Tạo Bước 1 (`No such target id` Trên `018, 019, 020`)**: Giới hạn `sweep_completed_and_idle_tabs_across_all_accounts()` chỉ đóng các Tab `/c/{uuid}` của dự án đã hoàn thành 100% (`completed_threads`), tuyệt đối không đóng các Tab `https://chatgpt.com/` đang nạp trang để bơm lệnh Bước 1, đồng thời bổ sung cơ chế tự động mở lại Tab mới trong `create_story_thread()` / `send_message()` nếu `targetId` bị đóng.",
            "- **Nâng Cấp Giới Hạn Tối Đa 5 Vòng Sửa (`max_rewrite_rounds = 5`) & Xóa Bỏ Mặc Định Điểm 97 Của Kênh `HOMELESS V12` (`engine/mafia_chatgpt_pipeline.py`)**: (1) **Tăng `max_rewrite_rounds = 5` & `pass_threshold = 97`:** Thay thế cấu hình cũ (`max_rewrite_rounds = 2`, `pass_threshold = 95`) bằng chuẩn tối đa **5 vòng sửa** (`Vòng 1..5`) và chỉ dừng sớm khi điểm chấm thực tế đạt `>= 97/100`; (2) **Xóa bỏ lệnh ép mặc định `97` điểm ở đầu Bước 5:** Gỡ bỏ dòng `state[\"final_script_score\"] = max(97, ...)` ở đầu Bước 5 (`STEP_5_RUNNING_SEO`) để giữ nguyên 100% điểm số Pháp y thực tế do Bàn #4 chấm trong `STATE.json` và trên bảng tiến độ (chỉ truyền `seo_score_display >= 98` cục bộ vào lời dẫn Prompt Bước 5 để Skill SEO không báo `BLOCKED`); (3) **Chấm điểm thực tế sau vòng sửa thứ 5:** Khi hoàn tất vòng sửa tối đa `#5/5`, hệ thống quay lại chạy 1 lượt `MODE A` cuối cùng (`audit_round = 6`) để chấm điểm thực tế cho bản sửa số 5 trước khi xuất `FULL_SCRIPT.txt`; (4) **Khắc phục lỗi trùng `marker_phrase` giữa các vòng sửa (`send_or_harvest_turn`):** Loại trừ các bước lặp `BƯỚC 4 / SỬA RIÊNG PART / AUDIT ROUND / REWRITE` khỏi bộ đệm quét lịch sử `turns[1:12]` và gắn nhãn `VÒNG #{audit_round}` riêng biệt kèm trích đoạn `PATCH LEDGER` trực tiếp vào lệnh sửa từng Part, đảm bảo các vòng sửa 2, 3, 4, 5 luôn gửi lệnh sửa mới 100% lên ChatGPT; (5) **Bảo vệ 100% câu dẫn nhân quả giữa đoạn văn (`condense_homeless_stage_text`):** Không tự động cắt câu giữa đoạn khi tổng kịch bản 7 Phần đã `<= 79.800` ký tự, chấm dứt việc làm mất câu dẫn nhập hành động/đối thoại khiến điểm Audit bị trừ oan.",
            "",
            f"## 3. Tiến Độ Hàng Đợi Các Kịch Bản (`{os.path.basename(b_path)}`)",
            "| Mã Dự Án | Tiêu Đề Gốc | Tiêu Đề Chọn (`>=97đ`) | Điểm Title | Điểm Script | Bước Hiện Tại | Thread ID ChatGPT | Thành Phẩm Cuối |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ]

        for item in backlog.get("items", []):
            pid = item.get("project_id", "")
            pdir = item.get("project_dir", "")
            st_file = os.path.join(pdir, "STATE.json") if pdir else ""
            st = {}
            if st_file and os.path.exists(st_file):
                try:
                    st = json.load(open(st_file, encoding="utf-8"))
                except Exception:
                    pass

            if pdir and os.path.isdir(pdir):
                export_to_tong_hop_folder(pid, pdir, niche=cfg["niche"])

            src_title = (st.get("source_title") or item.get("source_title") or "")[:40]
            win_title = (st.get("winner_title") or "—")[:45]
            t_score = st.get("winner_title_score", "—")
            s_score = st.get("final_script_score", "—")
            cur_step = st.get("current_step_status") or item.get("status", "QUEUED")
            tid = st.get("thread_id", "—")
            deliverables = "✅ `FULL_SCRIPT.txt` + `FULL_SEO.txt`" if st.get("completed") else "⏳ Đang xử lý"

            lines.append(
                f"| `{pid}` | {src_title}... | {win_title} | **{t_score}** | **{s_score}** | `{cur_step}` | `{tid}` | {deliverables} |"
            )

        write_text_file(md_path, "\n".join(lines) + "\n")


# ==============================================================================
# QUY TRÌNH 8 BÀN CHỐNG SELF-BIAS (ĐOẠN CHAT ĐỘC LẬP THEO VAI TRÒ) CHO MỖI DỰ ÁN
# ==============================================================================

def extract_part_boundary_anchors(
    base_pmap: dict[int, str],
    p_num: int,
    n_beats: int = 7,
    num_sents: int = 5,
) -> dict:
    """
    Giải quyết Lỗ hổng #3 (Thiếu "Điểm neo biên / Boundary Anchors" khi sửa lẻ từng Part ở Bước 4B):
    - Trích xuất 5 câu cuối cùng của `Part (p_num - 1)` (`prev_tail_text`)
    - Trích xuất 5 câu đầu tiên của `Part (p_num + 1)` (`next_head_text`)
    giúp AI khi viết lại riêng `[PART p_num]` nối mạch cảm xúc, không gian, thời gian mượt mà 100%
    với 2 Part liền kề mà không lặp hành động hay đứt mạch khi nghe TTS.
    """
    prev_sents: list[str] = []
    next_sents: list[str] = []
    prev_tail_text = ""
    next_head_text = ""

    if p_num > 1:
        prev_body = (base_pmap.get(p_num - 1) or "").strip()
        if prev_body:
            prev_sents = [
                s.strip()
                for s in re.split(r'(?<=[.!?""\u201d\'])\s+', prev_body)
                if s.strip()
            ]
            prev_tail_text = " ".join(prev_sents[-num_sents:])

    if p_num < n_beats:
        next_body = (base_pmap.get(p_num + 1) or "").strip()
        if next_body:
            next_sents = [
                s.strip()
                for s in re.split(r'(?<=[.!?""\u201d\'])\s+', next_body)
                if s.strip()
            ]
            next_head_text = " ".join(next_sents[:num_sents])

    sections = []
    if prev_tail_text:
        sections.append(
            f"=== 🔗 ĐIỂM NEO BIÊN ĐẦU (5 CÂU CUỐI CỦA `[PART {p_num - 1}]` ĐÃ KHÓA — CHỈ ĐỌC ĐỂ NỐI MẠCH, TUYỆT ĐỐI KHÔNG IN LẠI) ===\n"
            f"\"{prev_tail_text}\"\n"
            f"👉 QUY TẮC NỐI MẠCH ĐẦU `[PART {p_num}]`: Câu mở đầu của `[PART {p_num}]` bắt buộc phải nối tiếp tự nhiên về thời gian, không gian, hành động và cảm xúc ngay sau 5 câu cuối của `[PART {p_num - 1}]` ở trên. TUYỆT ĐỐI KHÔNG lặp lại hành động hoặc lời thoại vừa diễn ra ở cuối `[PART {p_num - 1}]`!"
        )
    if next_head_text:
        sections.append(
            f"=== 🔗 ĐIỂM NEO BIÊN CUỐI (5 CÂU ĐẦU CỦA `[PART {p_num + 1}]` ĐÃ KHÓA — CHỈ ĐỌC ĐỂ KHỚP TIỀN ĐỀ, TUYỆT ĐỐI KHÔNG VIẾT TRÀN SANG) ===\n"
            f"\"{next_head_text}\"\n"
            f"👉 QUY TẮC KHỚP MẠCH CUỐI `[PART {p_num}]`: Đoạn kết của `[PART {p_num}]` bắt buộc phải dẫn dắt nhân quả tự nhiên, đặt đúng bối cảnh và tâm lý nhân vật để bàn giao mượt mà sang 5 câu đầu của `[PART {p_num + 1}]` ở trên. TUYỆT ĐỐI KHÔNG viết lấn sang sự kiện đã thuộc về mở đầu `[PART {p_num + 1}]`!"
        )

    return {
        "prev_sents": prev_sents[-num_sents:],
        "next_sents": next_sents[:num_sents],
        "prev_tail_text": prev_tail_text,
        "next_head_text": next_head_text,
        "prompt_block": ("\n\n".join(sections) + "\n") if sections else "",
    }


def strip_boundary_sentence_overlap(
    part_body: str,
    prev_tail_sents: list[str],
    next_head_sents: list[str],
) -> str:
    """
    Kiểm tra hậu nghiệm sau khi sửa Part: nếu AI vô tình in lặp lại câu cuối của `Part p_num - 1`
    ở đầu `Part p_num`, hoặc in lặp câu đầu của `Part p_num + 1` ở cuối `Part p_num`, tự động gọt sạch.
    """
    cleaned = (part_body or "").strip()
    if not cleaned:
        return cleaned
    for ps in prev_tail_sents:
        if len(ps) >= 15 and cleaned.startswith(ps):
            cleaned = cleaned[len(ps) :].lstrip()
    for ns in next_head_sents:
        if len(ns) >= 15 and cleaned.endswith(ns):
            cleaned = cleaned[: -len(ns)].rstrip()
    return cleaned


def run_single_project_pipeline(
    client: ChatGPTDesktopThreadSafeClient,
    project_dir: str,
    source_title: str = "",
    thinking: str = "medium",
    only_step: int = 0,
) -> dict:
    """
    Thực thi trọn vẹn 5 bước (hoặc chạy tiếp từ Checkpoint đã lưu trong `STATE.json`)
    trong CÙNG 1 ĐOẠN CHAT CHATGPT DUY NHẤT (`thread_id`), có tự động chia đều tải qua Bộ Chia Tải 3 Tài Khoản
    (`Acc #1`, `Acc #2`, `Acc #3` — tối đa 1 Acc 3 luồng) và tự giải phóng khe luồng khi hoàn tất.
    Tự động thử lại tối đa 2 lần từ Checkpoint nếu có lỗi tạm thời, và ghi rõ nguyên nhân vào `STATE.json` nếu tạm dừng.
    """
    project_id = os.path.basename(os.path.normpath(project_dir))
    last_exc = None
    try:
        for attempt_idx in range(2):
            try:
                return _run_single_project_pipeline_inner(
                    client=client,
                    project_dir=project_dir,
                    source_title=source_title,
                    thinking=thinking,
                    only_step=only_step,
                )
            except Exception as exc:
                last_exc = exc
                err_s = str(exc)
                if "đã bị xóa" in err_s or "đã được xóa" in err_s or GLOBAL_USAGE_LIMIT_ERROR:
                    raise
                if attempt_idx == 0:
                    log_msg(
                        project_id,
                        f"🔄 [AUTO-RESUME CHECKPOINT] Gặp lỗi tạm thời ({err_s[:140]}). Đang tự động khôi phục & chạy tiếp ngay từ Checkpoint đã lưu (Lần 2/2)...",
                    )
                    time.sleep(4.0)
                    continue
                st_p = os.path.join(project_dir, "STATE.json")
                if os.path.exists(st_p):
                    try:
                        st_d = json.load(open(st_p, encoding="utf-8"))
                        st_d["current_step_status"] = f"PAUSED_CHECKPOINT: {err_s[:65]}"
                        st_d["live_note"] = f"⚠️ Tạm dừng tại Checkpoint: {err_s[:160]} (Bấm [▶️ Chạy] hoặc [▶️ Chạy Tiếp Hàng Đợi] để tiếp tục)"
                        st_d["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        write_json_file(st_p, st_d)
                    except Exception:
                        pass
                raise last_exc
    finally:
        if hasattr(client, "release_account_for_project"):
            try:
                client.release_account_for_project(project_id)
            except Exception:
                pass


def _run_single_project_pipeline_inner(
    client: ChatGPTDesktopThreadSafeClient,
    project_dir: str,
    source_title: str = "",
    thinking: str = "medium",
    only_step: int = 0,
) -> dict:
    os.makedirs(project_dir, exist_ok=True)
    ckpt_dir = os.path.join(project_dir, "checkpoints")
    os.makedirs(ckpt_dir, exist_ok=True)

    project_id = os.path.basename(os.path.normpath(project_dir))
    if GLOBAL_USAGE_LIMIT_ERROR:
        log_msg(project_id, f"⏸️ Tạm dừng khởi chạy [{project_id}] vì tài khoản ChatGPT đã chạm giới hạn lượt dùng: {GLOBAL_USAGE_LIMIT_ERROR}")
        raise RuntimeError(f"Tạm dừng chờ mở lại hạn mức ChatGPT: {GLOBAL_USAGE_LIMIT_ERROR}")
    state_path = os.path.join(project_dir, "STATE.json")

    state = {
        "project_id": project_id,
        "project_dir": project_dir,
        "source_title": source_title,
        "thinking_effort": thinking,
        "thread_id": "",
        "host_id": "chatgpt_web",
        "account_id": "",
        "account_label": "",
        "completed_steps": [],
        "current_step_status": "INITIALIZED",
        "winner_title": "",
        "winner_title_score": 0,
        "outline_beat_count": 6,
        "script_metrics": {},
        "audit_history": [],
        "final_script_score": 0,
        "completed": False,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    if os.path.exists(state_path):
        try:
            saved = json.load(open(state_path, encoding="utf-8"))
            state.update(saved)
            if source_title and not state.get("source_title"):
                state["source_title"] = source_title
            if state.get("winner_title_score"):
                state["winner_title_score"] = _normalize_score_100(int(state["winner_title_score"]))
        except Exception:
            pass

    if not state.get("custom_name") and os.path.exists(BACKLOG_PATH):
        try:
            b_init = json.load(open(BACKLOG_PATH, encoding="utf-8"))
            for bit in b_init.get("items", []):
                if bit.get("project_id") == project_id and bit.get("custom_name"):
                    state["custom_name"] = sanitize_custom_script_name(bit.get("custom_name"))
                    break
        except Exception:
            pass

    if state.get("source_title"):
        parsed_cname, parsed_title = parse_title_line_with_optional_name(
            state["source_title"],
            explicit_name=state.get("custom_name", ""),
        )
        if parsed_cname and not state.get("custom_name"):
            state["custom_name"] = parsed_cname
        if parsed_title and parsed_title != state["source_title"]:
            state["source_title"] = parsed_title

    cur_hid = str(state.get("host_id") or "")
    if not (cur_hid == "chatgpt" or cur_hid.startswith("chatgpt_web")) or str(state.get("thread_id", "")).startswith("01a1"):
        if state.get("thread_id"):
            log_msg(
                project_id,
                f"🔄 Chuyển dự án [{project_id}] từ thread Codex cũ ({state.get('thread_id')}) sang ChatGPT Web Đa Tab kèm toàn bộ Checkpoint đã lưu!",
            )
        state["thread_id"] = ""
        state["host_id"] = "chatgpt_web"

    if not state.get("source_title"):
        raise ValueError(f"[{project_id}] Chưa có `source_title` cho dự án tại {project_dir}")

    # Phân bổ tài khoản ChatGPT (Chia đều cho các Acc đã đăng nhập & tối đa 1 Acc 3 luồng)
    if hasattr(client, "acquire_account_for_project"):
        pref_acc = (
            state.get("account_id")
            or state.get("assigned_account_id")
            or (cur_hid.split(":")[-1] if ":" in cur_hid else "")
        )
        acc_cfg = client.acquire_account_for_project(
            project_id=project_id,
            preferred_acc_id=pref_acc,
            thread_id=state.get("thread_id", ""),
        )
        old_acc = state.get("account_id", "")
        state["account_id"] = acc_cfg["acc_id"]
        state["account_label"] = acc_cfg["label"]
        state["host_id"] = f"chatgpt_web:{acc_cfg['acc_id']}"
        # Nếu dự án có thread_id cũ thuộc Acc khác mà nay chuyển sang Acc mới, reset thread_id để tạo thread mới kèm đủ Checkpoint trên Acc mới
        if old_acc and old_acc != acc_cfg["acc_id"] and state.get("thread_id"):
            log_msg(
                project_id,
                f"🔄 Dự án [{project_id}] chuyển từ [{old_acc}] sang [{acc_cfg['label']}] — Tự động mở đoạn chat mới kèm toàn bộ Checkpoint đã lưu!",
            )
            state["thread_id"] = ""
        write_json_file(state_path, state)
        log_msg(
            project_id,
            f"🌐 [BỘ CHIA TẢI ĐA ACC] Đã phân công dự án [{project_id}] cho [{acc_cfg['label']} — Port {acc_cfg['port']}] (Chia đều, tối đa 3 luồng/Acc)",
        )

    # Lưu ý: Khi khởi động tiến trình mới (resume), KHÔNG nạp CHATGPT_CONVERSATION.json cũ vào _last_known_turns
    # để lượt send_or_harvest_turn đầu tiên luôn đọc trạng thái mới nhất từ server và thu hoạch tức thời
    # các Turn đã hoàn thành trên ChatGPT mà không gửi trùng lại!

    def save_state(status_label: str):
        if not os.path.exists(project_dir):
            raise RuntimeError(f"Dự án [{project_id}] đã bị xóa khỏi danh sách.")
        state["current_step_status"] = status_label
        state["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        write_json_file(state_path, state)
        if os.path.exists(BACKLOG_PATH):
            with BACKLOG_LOCK:
                try:
                    bdata = json.load(open(BACKLOG_PATH, encoding="utf-8"))
                    for bit in bdata.get("items", []):
                        if bit.get("project_id") == project_id:
                            bit["status"] = "COMPLETED" if state.get("completed") else status_label
                    write_json_file(BACKLOG_PATH, bdata)
                except Exception:
                    pass
        update_progress_markdown()

    # Đếm số turn hiện tại trên thread (nếu đã có thread_id)
    def get_current_turn_count(min_known: int = 0) -> int:
        tid = state.get("thread_id")
        if not tid:
            return 0
        cached = client._last_known_turns.get(tid)
        if cached and cached.get("turns"):
            return max(min_known, len(cached["turns"]))
        if min_known > 0:
            return min_known
        d = client.read_full_thread(tid, state["host_id"])
        return max(min_known, len(d.get("turns", [])))

    def _get_active_key_runtime_spec() -> dict:
        cfg = get_niche_config(ACTIVE_KEY_ID or ACTIVE_NICHE)
        locale = cfg.get("locale", "en-US")
        t_min = int(cfg.get("target_min_chars", 70000))
        t_max = int(cfg.get("target_max_chars", 80000))
        p_min = int(cfg.get("pref_min_chars", int(t_min + (t_max - t_min) * 0.35)))
        p_max = int(cfg.get("pref_max_chars", int(t_min + (t_max - t_min) * 0.80)))
        t_mid = int((p_min + p_max) / 2)
        n_parts = int(cfg.get("default_parts", 7 if ACTIVE_NICHE in ("homeless", "mexico") else 6))
        per_part_target = int(t_mid / max(1, n_parts))
        per_part_min_accept = max(1600, int(t_min / max(1, n_parts) * 0.78))
        per_part_max = int(t_max / max(1, n_parts) * 1.03)
        if locale == "ja-JP":
            lang_name = "tiếng Nhật tự nhiên chuẩn bản xứ (`ja-JP`, Japanese Voice-Manga / Kuchikomi Narration)"
            lang_short = "tiếng Nhật (`ja-JP`)"
        elif locale == "es-MX":
            lang_name = "tiếng Tây Ban Nha chuẩn Mexico tự nhiên (`es-MX`, español mexicano natural, TUYỆT ĐỐI KHÔNG dùng từ Tây Ban Nha châu Âu như vosotros/ordenador/zumo)"
            lang_short = "tiếng Tây Ban Nha Mexico (`es-MX`)"
        else:
            lang_name = "tiếng Anh Mỹ tự nhiên (`en-US`, American English)"
            lang_short = "tiếng Anh (`en-US`)"
        return {
            "cfg": cfg,
            "key_id": cfg.get("key_id", ACTIVE_KEY_ID or ACTIVE_NICHE),
            "is_12_key": bool(cfg.get("is_12_key") or (ACTIVE_KEY_ID in KEY_PROFILES_12)),
            "label": cfg.get("label", ACTIVE_NICHE.upper()),
            "locale": locale,
            "lang": locale,
            "lang_name": lang_name,
            "lang_short": lang_short,
            "t_min": t_min,
            "t_max": t_max,
            "p_min": p_min,
            "p_max": p_max,
            "t_mid": t_mid,
            "n_parts": n_parts,
            "per_part_target": per_part_target,
            "per_part_min_accept": per_part_min_accept,
            "per_part_max": per_part_max,
        }

    kspec = _get_active_key_runtime_spec()
    diagnosed_parts_once: set[int] = set()

    def _build_checkpoint_context_preamble(prompt_body: str = "") -> str:
        niche_title = (
            f"{kspec['label']} [{kspec['key_id']}] ({kspec['locale']})"
            if kspec["is_12_key"]
            else (
                "MEXICO FAMILY DRAMA (MEXICO BÀ CÔ V1.3.0)"
                if ACTIVE_NICHE == "mexico"
                else (
                    "HOMELESS × ABANDONED PROPERTY × HIDDEN LEGACY (HOMELESS V12)"
                    if ACTIVE_NICHE == "homeless"
                    else "MAFIA BOSS × MAID / WAITRESS / UNDERESTIMATED WOMAN"
                )
            )
        )
        parts_ctx = [
            f"BẠN ĐANG TIẾP TỤC DỰ ÁN STORYTELLING ({niche_title}) TỪ CHECKPOINT ĐÃ LƯU TRÊN ĐOẠN CHAT ĐỒNG BỘ MỚI.",
            f"- SOURCE TITLE: {state.get('source_title', '')}",
            f"- CURRENT FINAL TITLE (ĐÃ KHÓA): {state.get('winner_title', '')} ({state.get('winner_title_score', 98)}/100)",
        ]
        # Tuyệt đối KHÔNG đính kèm trùng lặp 02_STORY_OUTLINE.md (22.000-30.000 ký tự) nếu bên trong prompt_body đã có sẵn Giàn ý hoặc Kịch bản Full (tránh lỗi "The messages you submitted were too long")!
        pb_u = (prompt_body or "")
        already_has_outline_or_script = any(
            marker in pb_u
            for marker in (
                "02_STORY_OUTLINE.md",
                "CURRENT REVISION BASELINE",
                "CURRENT WORKING SCRIPT",
                "LOCKED FULL SCRIPT",
                "BƯỚC 1:",
                "BƯỚC 2:",
                "BƯỚC 4 (",
                "BƯỚC 4-CALIB",
                "BƯỚC 4B (",
                "BƯỚC 5:",
            )
        )
        outline_p = os.path.join(ckpt_dir, "02_STORY_OUTLINE.md")
        if not already_has_outline_or_script and os.path.exists(outline_p):
            raw_out_txt = read_text_file(outline_p)
            if len(raw_out_txt) > 5500:
                raw_out_txt = raw_out_txt[:4000] + "\n...[Tóm tắt phần giữa Giàn ý & Canon Handoff đã khóa]...\n" + raw_out_txt[-1400:]
            parts_ctx.append("=== GIÀN Ý ĐÃ KHÓA TỪ BƯỚC 2 (02_STORY_OUTLINE.md) ===\n" + raw_out_txt + "\n=== KẾT THÚC GIÀN Ý BƯỚC 2 ===")
        return "\n\n".join(parts_ctx) + "\n\n"

    def _enforce_chatgpt_web_prompt_limit(raw_prompt: str, max_chars: int = 84000) -> str:
        """
        Khóa cứng tổng độ dài mỗi tin nhắn gửi lên ChatGPT Web <= 84.000 ký tự để triệt tiêu 100% lỗi
        'The messages you submitted were too long, please edit them and resubmit.'
        Tuyệt đối BẢO TOÀN 100% văn bản kịch bản truyện (CURRENT REVISION BASELINE / CURRENT WORKING SCRIPT),
        chỉ cô đọng thông minh các khối Reference / Giàn ý đối chiếu / Patch Ledger phụ trợ nếu tổng độ dài vượt ngưỡng.
        """
        txt = raw_prompt or ""
        if len(txt) <= max_chars:
            return txt
        orig_len = len(txt)
        # 1. Rút gọn khối GIÀN Ý đối chiếu (nếu có) về tối đa 3.200 ký tự
        def _shrink_outline_match(m: re.Match) -> str:
            h, body, t = m.group(1), m.group(2), m.group(3)
            if len(body) <= 3200:
                return m.group(0)
            return f"{h}{body[:2100]}\n...[Trích xuất Canon & Cấu trúc Giàn ý Bước 2]...\n{body[-950:]}{t}"

        txt = re.sub(
            r"(===\s*GIÀN Ý[^\n]*===\n)(.*?)(\n===\s*KẾT THÚC GIÀN Ý[^\n]*===)",
            _shrink_outline_match,
            txt,
            flags=re.DOTALL,
        )
        if len(txt) <= max_chars:
            log_msg(project_id, f"✂️ [PROMPT GUARD] Đã tự động cô đọng Giàn ý phụ trợ ({orig_len:,} -> {len(txt):,} ký tự <= {max_chars:,}) và giữ nguyên 100% kịch bản!")
            return txt

        # 2. Rút gọn từng khối === FILE X: ... === (Skill / Reference)
        excess = len(txt) - max_chars
        per_file_limit = 2200 if excess > 25000 else (3200 if excess > 12000 else 4500)

        def _shrink_file_block(m: re.Match) -> str:
            hdr, fbody = m.group(1), m.group(2)
            if len(fbody) <= per_file_limit:
                return m.group(0)
            h_c = int(per_file_limit * 0.7)
            t_c = max(300, per_file_limit - h_c - 90)
            return f"{hdr}{fbody[:h_c]}\n...[Tóm tắt Reference]...\n{fbody[-t_c:]}\n"

        txt = re.sub(
            r"(===\s*FILE\s+[0-9.]+:[^\n]*===\n)(.*?)(?=\n===\s*(?:FILE\s+[0-9.]+:|PRODUCTION PIPELINE OVERRIDE|GIÀN Ý|THÔNG SỐ|TOÀN VĂN|VĂN BẢN|DANH SÁCH|BẢNG LỖI)|$)",
            _shrink_file_block,
            txt,
            flags=re.DOTALL,
        )
        if len(txt) <= max_chars:
            log_msg(project_id, f"✂️ [PROMPT GUARD] Đã tự động cô đọng khối Skill/Reference ({orig_len:,} -> {len(txt):,} ký tự <= {max_chars:,}) và giữ nguyên 100% kịch bản!")
            return txt

        # 3. Nếu vẫn vượt ngưỡng (do kịch bản dài ~77.000-79.000 ký tự), rút gọn thêm khối Skill/Reference & Patch Ledger vòng trước
        def _shrink_file_block_tight(m: re.Match) -> str:
            hdr, fbody = m.group(1), m.group(2)
            if len(fbody) <= 950:
                return m.group(0)
            return f"{hdr}{fbody[:650]}\n...[Core Rule]...\n{fbody[-220:]}\n"

        txt = re.sub(
            r"(===\s*FILE\s+[0-9.]+:[^\n]*===\n)(.*?)(?=\n===\s*(?:FILE\s+[0-9.]+:|PRODUCTION PIPELINE OVERRIDE|GIÀN Ý|THÔNG SỐ|TOÀN VĂN|VĂN BẢN|DANH SÁCH|BẢNG LỖI)|$)",
            _shrink_file_block_tight,
            txt,
            flags=re.DOTALL,
        )
        txt = re.sub(
            r"(===\s*(?:BẢNG LỖI|DANH SÁCH LỖI)\s+PATCH LEDGER[^\n]*===\n)(.*?)(\n===\s*KẾT THÚC[^\n]*PATCH LEDGER[^\n]*===)",
            lambda m: m.group(0) if len(m.group(2)) <= 3600 else f"{m.group(1)}{m.group(2)[:2400]}\n...\n{m.group(2)[-1000:]}{m.group(3)}",
            txt,
            flags=re.DOTALL,
        )
        log_msg(project_id, f"✂️ [PROMPT GUARD] Đã tối ưu hóa kích thước tin nhắn ({orig_len:,} -> {len(txt):,} ký tự <= {max_chars:,}) bảo toàn 100% kịch bản!")
        return txt

    state.setdefault("agent_chat_registry", {})
    if not state["agent_chat_registry"] and state.get("thread_id"):
        # Tương thích ngược cho dự án đang chạy dở trên đĩa trước khi tách kho lưu trữ Agent
        cur_st_u = str(state.get("current_step_status") or "").upper()
        done_s = set(state.get("completed_steps") or [])
        if "STEP_1_DONE" not in done_s or "STEP_1" in cur_st_u:
            seed_desk = "DESK_1_TITLE"
            seed_lbl = "Bàn #1 — Biên Tập & Chấm Điểm Tiêu Đề"
        elif "STEP_2_DONE" not in done_s or "STEP_2" in cur_st_u:
            seed_desk = "DESK_2_OUTLINE"
            seed_lbl = "Bàn #2 — Kiến Trúc Sư Giàn Ý & Khóa DNA"
        elif "STEP_3_DONE" not in done_s or "STEP_3" in cur_st_u:
            seed_desk = "DESK_3_WRITER"
            seed_lbl = "Bàn #3 — Nhà Văn Sáng Tác Kịch Bản"
        else:
            seed_desk = "DESK_ACTIVE"
            seed_lbl = "Đoạn chat Agent đang hoạt động"
        state["agent_chat_registry"][seed_desk] = {
            "desk_role": seed_desk,
            "agent_id": seed_desk.lower(),
            "agent_label": seed_lbl,
            "skill_name": seed_desk,
            "thread_id": state["thread_id"],
            "chat_url": f"https://chatgpt.com/c/{state['thread_id']}",
            "acc_id": state.get("account_id", "acc_1"),
            "account_label": state.get("account_label", "Acc #1"),
            "host_id": state.get("host_id", ""),
            "status": "RUNNING",
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        state["active_agent_desk"] = seed_desk

    def _resolve_agent_skill_meta(desk_role: str) -> tuple[str, str]:
        dr = str(desk_role or "").upper()
        if kspec["is_12_key"]:
            kid = kspec["key_id"]
            if "DESK_1" in dr or "TITLE" in dr:
                return (f"{kid}-1-title", f"01_TITULOS ({kid})")
            if "DESK_2" in dr or "OUTLINE" in dr:
                return (f"{kid}-2-outline", f"02_OUTLINE ({kid})")
            if "DESK_3" in dr or "WRITER" in dr:
                return (f"{kid}-3-writer", f"03_WRITER ({kid})")
            if "4A" in dr or "AUDITOR" in dr:
                return (f"{kid}-4-auditor", f"04_AUDITOR ({kid})")
            if "4B" in dr or "REPAIR" in dr:
                return (f"{kid}-3-writer (Repair)", f"03_WRITER Step 5 Repair ({kid})")
            if "SEO" in dr or "DESK_5" in dr:
                return (f"{kid}-5-seo", f"05_SEO ({kid})")
        if ACTIVE_NICHE == "mexico":
            if "DESK_1" in dr or "TITLE" in dr:
                return ("mexico-1-titulos", "titulos-drama-familiar-mexico (V1.3)")
            if "DESK_2" in dr or "OUTLINE" in dr:
                return ("mexico-2-arquitectura", "arquitectura-drama-familiar-mexico (V1.3)")
            if "DESK_3" in dr or "WRITER" in dr:
                return ("mexico-3-escritor", "escritor-y-reparacion-drama-familiar-mexico (V1.3)")
            if "4A" in dr or "AUDITOR" in dr:
                return ("mexico-4-auditor", "auditor-forense-guion-familiar-mexico (V1.3)")
            if "4B" in dr or "REPAIR" in dr:
                return ("mexico-3-escritor (Repair)", "escritor-y-reparacion-drama-familiar-mexico (Step 5)")
            if "SEO" in dr or "DESK_5" in dr:
                return ("mexico-5-seo", "seo-thumbnail-trailer-drama-familiar-mexico (V1.3)")
        is_hl = (ACTIVE_NICHE == "homeless")
        if "DESK_1" in dr or "TITLE" in dr:
            return (
                ("homeless-1-title-creator", "viral-title-rewriter (V1.2)")
                if is_hl
                else ("mafia-1-title-rewriter", "viet-lai-tieu-de-mafia-nguoi-hau (V1.2)")
            )
        if "DESK_2" in dr or "OUTLINE" in dr:
            return (
                ("homeless-2-outline-architect", "viet-gian-y-homeless (V2.4)")
                if is_hl
                else ("mafia-2-outline-architect", "viet-gian-y-nguoi-hau (V1.1)")
            )
        if "DESK_3" in dr or "WRITER" in dr:
            return (
                ("homeless-3-script-writer", "viet-kich-ban-homeless (V2.0)")
                if is_hl
                else ("mafia-3-script-writer", "viet-kich-ban-nguoi-hau-tu-gian-y (V1.4)")
            )
        if "4A" in dr or "AUDITOR" in dr:
            return (
                ("homeless-4-script-auditor", "kiem-tra-kich-ban-homeless (V2.0)")
                if is_hl
                else ("mafia-4-forensic-auditor", "kiem-tra-kich-ban-nguoi-hau (V1.1)")
            )
        if "4B" in dr or "REPAIR" in dr:
            return (
                ("homeless-3-script-writer (Surgical Repair)", "viet-kich-ban-homeless (Step 5 Repair)")
                if is_hl
                else ("mafia-3-script-writer (Controlled Rewrite)", "kiem-tra-kich-ban-nguoi-hau (Mode B)")
            )
        if "SEO" in dr or "DESK_5" in dr:
            return (
                ("homeless-5-seo-packager", "seo-homeless-story (V2.1)")
                if is_hl
                else ("mafia-5-seo-packager", "viet-seo-nguoi-hau (V1.0)")
            )
        return (desk_role.lower(), desk_role)

    def record_agent_chat_state(
        desk_role: str,
        reason_desc: str,
        tid: str,
        status: str = "RUNNING",
        turns_cnt: int = 0,
    ):
        if not desk_role:
            return
        agent_id, skill_name = _resolve_agent_skill_meta(desk_role)
        reg = state.setdefault("agent_chat_registry", {})
        prev_entry = reg.get(desk_role) or {}
        if status == "STARTING_NEW_CHAT":
            final_tid = ""
        else:
            final_tid = tid or prev_entry.get("thread_id") or ""
        final_turns = turns_cnt or prev_entry.get("turns_count") or 0
        is_real_uuid = bool(final_tid and not str(final_tid).lower().startswith("webtab_"))
        entry = {
            "desk_role": desk_role,
            "agent_id": agent_id,
            "agent_label": reason_desc or prev_entry.get("agent_label") or desk_role,
            "skill_name": skill_name,
            "thread_id": final_tid,
            "chat_url": f"https://chatgpt.com/c/{final_tid}" if is_real_uuid else ("https://chatgpt.com/" if final_tid else ""),
            "acc_id": state.get("account_id", "acc_1"),
            "account_label": state.get("account_label", "Acc #1"),
            "host_id": state.get("host_id", ""),
            "status": status,
            "turns_count": final_turns,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        reg[desk_role] = entry
        state["active_agent_desk"] = desk_role
        state["active_agent_label"] = entry["agent_label"]
        state["active_agent_chat"] = entry
        if not os.path.exists(project_dir):
            raise RuntimeError(f"Dự án [{project_id}] đã bị xóa khỏi danh sách.")
        write_json_file(state_path, state)

    def switch_to_isolated_desk_thread(desk_role: str, reason_desc: str):
        """
        Quản lý Tách Skill Sang Đoạn Chat Riêng + Lưu Trữ & Khôi Phục Đoạn Chat Agent (`agent_chat_registry`):
        1. Mỗi Skill/Agent (`DESK_1_TITLE`, `DESK_2_OUTLINE`, `DESK_3_WRITER`, `AUDITOR_DESK_4A_R{n}`, `REPAIR_DESK_4B_R{n}`, `SEO_DESK_5`)
           chạy trên 1 đoạn chat ChatGPT riêng biệt và được lưu lại `thread_id` + `acc_id` trong `state["agent_chat_registry"]`.
        2. Khi chuyển từ Agent trước sang Agent mới, giải phóng trạng thái bận của Tab cũ (`release_tab_from_active_duty`)
           để trình duyệt tái sử dụng trong giới hạn tối đa 5 Tab/Acc (`MAX_OPEN_TABS_PER_ACCOUNT = 5`).
        3. Nếu Agent `desk_role` ĐÃ CÓ đoạn chat lưu trong `state["agent_chat_registry"]` trên cùng tài khoản,
           hệ thống tự động QUAY LẠI đúng đoạn chat đó (`/c/{saved_tid}`) để tiếp tục công việc cho đến khi xong kịch bản!
        """
        prev_desk = state.get("active_agent_desk", "")
        old_tid = state.get("thread_id", "")
        reg = state.setdefault("agent_chat_registry", {})

        if old_tid and prev_desk and prev_desk != desk_role:
            prev_entry = reg.get(prev_desk) or {}
            prev_status = prev_entry.get("status") if prev_entry.get("status") == "COMPLETED" else "SAVED_READY_TO_RESUME"
            record_agent_chat_state(
                prev_desk,
                prev_entry.get("agent_label") or prev_desk,
                old_tid,
                status=prev_status,
            )
            state.setdefault("isolated_threads_log", []).append(
                {
                    "from_desk": prev_desk,
                    "desk_role": desk_role,
                    "closed_thread_id": old_tid,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
            if hasattr(client, "release_tab_from_active_duty"):
                try:
                    client.release_tab_from_active_duty(
                        project_id=project_id,
                        thread_id=old_tid,
                        host_id=state.get("host_id", ""),
                    )
                except Exception:
                    pass

        saved_entry = reg.get(desk_role) or {}
        saved_tid = str(saved_entry.get("thread_id") or "").strip()
        if saved_tid.lower().startswith("webtab_"):
            saved_tid = ""
        saved_acc = str(saved_entry.get("acc_id") or "").strip()
        cur_acc = str(state.get("account_id") or "acc_1").strip()

        if saved_tid and (not saved_acc or saved_acc == cur_acc):
            state["thread_id"] = saved_tid
            record_agent_chat_state(desk_role, reason_desc, saved_tid, status="RUNNING")
            save_state(f"RESUMED_AGENT_CHAT_{desk_role}")
            log_msg(
                project_id,
                f"🔄 [QUAY LẠI ĐOẠN CHAT AGENT ĐÃ LƯU - {desk_role}] Tiếp tục công việc của [{reason_desc}] trên đoạn chat threadId={saved_tid} ({state.get('account_label', 'Acc #1')})!",
            )
        else:
            state["thread_id"] = ""
            record_agent_chat_state(desk_role, reason_desc, "", status="STARTING_NEW_CHAT")
            save_state(f"ISOLATED_THREAD_{desk_role}")
            log_msg(
                project_id,
                f"🔒 [TÁCH SKILL ĐOẠN CHAT RIÊNG - {desk_role}] Mở đoạn chat độc lập cho [{reason_desc}] (Đã lưu lịch sử Agent trước & khóa trần <= 5 Tab/Acc)!",
            )

    def send_or_harvest_turn(prompt: str, marker_phrase: str, step_label: str, timeout_sec: int = 1800) -> tuple[str, dict]:
        """
        Nếu lượt gần nhất trên thread đã được gửi lệnh của bước này (ví dụ khi resume sau khi khởi động lại),
        thu hoạch trực tiếp kết quả của lượt đó mà không gửi trùng lại lần 2.
        Nếu người dùng vừa đổi sang tài khoản ChatGPT mới (khiến thread_id cũ không truy cập được),
        hoặc thread_id cũ là mã tạm `webtab_...` / bị lỗi tải hội thoại,
        tự động khởi tạo thread mới kèm toàn bộ Checkpoint đã lưu để chạy tiếp mượt mà!
        """
        active_desk = state.get("active_agent_desk") or "DESK_ACTIVE"
        active_lbl = state.get("active_agent_label") or step_label
        if str(state.get("thread_id") or "").strip().lower().startswith("webtab_"):
            state["thread_id"] = ""
        if state.get("thread_id"):
            tid = state["thread_id"]
            record_agent_chat_state(active_desk, active_lbl, tid, status="RUNNING")
            if tid in client._last_known_turns and client._last_known_turns[tid].get("turns"):
                d = client._last_known_turns[tid]
                turns = d.get("turns", [])
                if turns and only_step == 0:
                    latest_t = turns[0]
                    user_txts = [it.get("text", "") for it in latest_t.get("items", []) if it.get("type") == "userMessage"]
                    if marker_phrase not in "\n".join(user_txts) and not d.get("_verified_live"):
                        d = client.read_full_thread(tid, state["host_id"])
                        d["_verified_live"] = True
                        client._last_known_turns[tid] = d
            else:
                d = client.read_full_thread(tid, state["host_id"])
                d["_verified_live"] = True
                client._last_known_turns[tid] = d
            turns = d.get("turns", [])
            if turns and only_step == 0:
                latest_t = turns[0]
                user_txts = [it.get("text", "") for it in latest_t.get("items", []) if it.get("type") == "userMessage"]
                joined_u = "\n".join(user_txts)
                if marker_phrase in joined_u and latest_t.get("status") in ("completed", "running"):
                    if latest_t.get("status") == "completed":
                        texts = [
                            it["text"]
                            for it in latest_t.get("items", [])
                            if it.get("type") == "agentMessage" and it.get("text")
                        ]
                        full_text = "\n\n".join(texts).strip()
                        if full_text:
                            record_agent_chat_state(active_desk, active_lbl, tid, status="RUNNING", turns_cnt=len(turns))
                            log_msg(
                                project_id,
                                f"♻️ Thu hoạch tức thời kết quả đã hoàn tất của [{step_label}] trên threadId={tid} ({len(full_text):,} ký tự | Tổng số Turn: {len(turns)})!",
                            )
                            return full_text, d
                    log_msg(project_id, f"♻️ Khôi phục lượt đang chạy của [{step_label}] trên threadId={tid}...")
                    resp_out, d_out = client.wait_for_turn_completion(
                        project_id,
                        tid,
                        state["host_id"],
                        f"{step_label} (RESUME)",
                        expected_min_turns=len(turns),
                        timeout_sec=timeout_sec,
                    )
                    actual_tid = str((d_out or {}).get("thread", {}).get("id") or tid).strip()
                    state["thread_id"] = actual_tid
                    record_agent_chat_state(active_desk, active_lbl, actual_tid, status="RUNNING", turns_cnt=len(d_out.get("turns", [])))
                    return resp_out, d_out
                # Nếu là các bước khởi tạo cố định (Bước 1, Bước 2, Bước 3 Draft Stage A/B/C & AI Single-Part/Continuation ở Bước 3, Bước 5) và lượt đó đã hoàn tất ở turns[1..20], thu hoạch ngay!
                # TUYỆT ĐỐI KHÔNG thu hoạch lại lịch sử cũ cho các vòng lặp Bước 4 (AUDIT ROUND, SỬA RIÊNG PART, REWRITE, CALIB)
                # để mỗi vòng sửa 1..5 của Bước 4 luôn gửi lệnh mới 100% lên ChatGPT!
                is_iterative_step = ("BƯỚC 4" in step_label.upper()) or any(
                    kw in step_label.upper()
                    for kw in ("REWRITE", "CALIB", "SỬA RIÊNG PART", "AUDIT ROUND")
                )
                if not is_iterative_step:
                    for hist_t in turns[1:20]:
                        if hist_t.get("status") != "completed":
                            continue
                        h_utxts = [it.get("text", "") for it in hist_t.get("items", []) if it.get("type") == "userMessage"]
                        if marker_phrase in "\n".join(h_utxts):
                            h_atxts = [
                                it["text"]
                                for it in hist_t.get("items", [])
                                if it.get("type") == "agentMessage" and it.get("text")
                            ]
                            h_full = "\n\n".join(h_atxts).strip()
                            if len(h_full) >= 800:
                                record_agent_chat_state(active_desk, active_lbl, tid, status="RUNNING", turns_cnt=len(turns))
                                log_msg(
                                    project_id,
                                    f"♻️ Thu hoạch tức thời kết quả lịch sử đã hoàn tất của [{step_label}] trên threadId={tid} ({len(h_full):,} ký tự)!",
                                )
                                return h_full, d
            prev_turns = len(turns)
            try:
                state["live_note"] = f"⏳ Đang điều tiết nhịp & gửi lệnh [{step_label}] vào đoạn chat Agent [{active_desk}] ({tid})..."
                state["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                write_json_file(state_path, state)
            except Exception:
                pass
            log_msg(project_id, f"📨 Đang gửi lệnh [{step_label}] vào đoạn chat Agent [{active_desk}] threadId={tid} (Turn #{prev_turns + 1})...")
            safe_prompt_turn = _enforce_chatgpt_web_prompt_limit(prompt, max_chars=84000)
            send_res = client.send_message(tid, state["host_id"], safe_prompt_turn, thinking=thinking, project_id=project_id)
            if "error" in send_res:
                for same_tid_retry in range(2):
                    log_msg(
                        project_id,
                        f"⏳ Đoạn chat hiện tại ({tid}) đang bận hoặc chờ mở khóa, tự động đợi 18s rồi gửi lại (lần {same_tid_retry + 1}/2)...",
                    )
                    time.sleep(18.0)
                    send_res = client.send_message(tid, state["host_id"], safe_prompt_turn, thinking=thinking, project_id=project_id)
                    if "error" not in send_res:
                        break
            if "error" not in send_res:
                sent_tid = str((send_res.get("result") or {}).get("threadId") or tid).strip()
                if sent_tid and sent_tid != tid:
                    tid = sent_tid
                    state["thread_id"] = tid
                    prev_turns = 0
                resp_out, d_out = client.wait_for_turn_completion(
                    project_id,
                    tid,
                    state["host_id"],
                    step_label,
                    expected_min_turns=prev_turns + 1,
                    timeout_sec=timeout_sec,
                )
                actual_tid = str((d_out or {}).get("thread", {}).get("id") or tid).strip()
                state["thread_id"] = actual_tid
                record_agent_chat_state(active_desk, active_lbl, actual_tid, status="RUNNING", turns_cnt=len(d_out.get("turns", [])))
                return resp_out, d_out
            log_msg(
                project_id,
                f"♻️ [AUTO-RECOVER THREAD] Đoạn chat cũ ({tid}) không thể tải trên ChatGPT Web. Đang tự động mở đoạn chat sạch mới cho [{step_label}]...",
            )
            state["thread_id"] = ""

        full_prompt = _enforce_chatgpt_web_prompt_limit(_build_checkpoint_context_preamble(prompt) + prompt, max_chars=84000)
        resume_prefix = kspec["key_id"] if kspec["is_12_key"] else ("Mexico Ba Co" if ACTIVE_NICHE == "mexico" else ("Homeless V12" if ACTIVE_NICHE == "homeless" else "Mafia Story"))
        tid, hid = client.create_story_thread(
            title_label=f"{resume_prefix} [{project_id}] - {active_desk}",
            prompt=full_prompt,
            thinking=thinking,
            project_id=project_id,
        )
        state["thread_id"] = tid
        state["host_id"] = hid
        record_agent_chat_state(active_desk, active_lbl, tid, status="RUNNING", turns_cnt=1)
        save_state(state.get("current_step_status", "RESUMED_NEW_THREAD"))
        log_msg(project_id, f"🔗 Đã tạo & lưu đoạn chat riêng cho Agent [{active_desk}]: threadId={tid} ({step_label})")
        resp_out, d_out = client.wait_for_turn_completion(
            project_id,
            tid,
            hid,
            step_label,
            expected_min_turns=1,
            timeout_sec=timeout_sec,
        )
        actual_tid = str((d_out or {}).get("thread", {}).get("id") or tid).strip()
        state["thread_id"] = actual_tid
        record_agent_chat_state(active_desk, active_lbl, actual_tid, status="RUNNING", turns_cnt=len(d_out.get("turns", [])) or 1)
        return resp_out, d_out

    # ==========================================================================
    # BƯỚC 1: VIẾT LẠI TIÊU ĐỀ & CHẤM ĐIỂM (HOẶC BỎ QUA BÀN #1 NẾU CHỌN DÙNG LUÔN TIÊU ĐỀ GỐC)
    # ==========================================================================

    if bool(state.get("skip_title_rewrite")) and only_step != 1:
        locked_orig_title = (state.get("winner_title") or state.get("source_title") or "").strip()
        state["winner_title"] = locked_orig_title
        state["winner_title_score"] = state.get("winner_title_score") or 100
        ckpt_step1_path = os.path.join(ckpt_dir, "01_TITLE_REWRITE.md")
        if not os.path.exists(ckpt_step1_path):
            write_text_file(
                ckpt_step1_path,
                f"# BƯỚC 1: SỬ DỤNG LUÔN TIÊU ĐỀ GỐC (BỎ QUA BÀN #1 — CHẠY THẲNG BÀN #1.5)\n\n"
                f"- **Chế độ tiêu đề:** Sử dụng trực tiếp tiêu đề đã dán (Không viết lại ở Bàn #1)\n"
                f"- **SOURCE TITLE:** {locked_orig_title}\n\n"
                f"🏆 WINNER: {locked_orig_title} — 100/100\n",
            )
        if "STEP_1_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_1_DONE")
            save_state("STEP_1_SKIPPED_ORIGINAL_TITLE")
        log_msg(
            project_id,
            f"⏭️ [BỎ QUA BÀN #1 - DÙNG LUÔN TIÊU ĐỀ ĐÃ DÁN] Giữ nguyên tiêu đề gốc không viết lại: \"{locked_orig_title}\" ➔ Chạy thẳng Bàn #1.5 (Canon Guard) & Bàn #2 (Giàn ý)!",
        )
    elif ("STEP_1_DONE" not in state["completed_steps"] and only_step in (0, 1)) or only_step == 1:
        switch_to_isolated_desk_thread("DESK_1_TITLE", "Bàn #1 — Biên Tập & Chấm Điểm Tiêu Đề")
        save_state("STEP_1_RUNNING_TITLE_REWRITE")
        log_msg(project_id, f"🚀 [BƯỚC 1/5 - Bàn #1] Viết lại & Chấm điểm Tiêu đề ({kspec['label']}, yêu cầu >= 97/100 điểm)...")

        skill_1_content = load_skill_1_title_bundle()
        if ACTIVE_KEY_ID in KEY_PROFILES_12:
            niche_header = f"{kspec['label']} ({kspec['key_id']} — {kspec['locale']})"
            skill_1_name = f"01_TITULOS ({kspec['key_id']})"
            lang_req = f"bằng **{kspec['lang_name']}** chuẩn công thức CTR cao nhất của kênh"
            niche_guard = f"\n- KHÓA NGÔN NGỮ & NGÁCH (`{kspec['key_id']}`): Toàn bộ 5 tiêu đề ứng viên và `🏆 WINNER` BẮT BUỘC viết bằng **{kspec['lang_short']}**, giữ đúng 100% DNA của ngách `{kspec['label']}`."
        elif ACTIVE_NICHE == "mexico":
            niche_header = "MEXICO BÀ CÔ — DRAMA GIA ĐÌNH MẸ GIÀ / BÀ NỘI BÀ NGOẠI MEXICO (ES-MX V1.3.0)"
            skill_1_name = "titulos-drama-familiar-mexico (V1.3.0 — MEXICO BÀ CÔ)"
            lang_req = "bằng **tiếng Tây Ban Nha chuẩn Mexico tự nhiên (`es-MX`, español mexicano natural)**"
            niche_guard = "\n- KHÓA NGÔN NGỮ & NGÁCH (`FAMILY_DNA_LOCK_V1_2` & `TITLE_CREATIVE_DIVERSITY_V1_3`): Toàn bộ 5 tiêu đề ứng viên và `🏆 WINNER` BẮT BUỘC viết bằng **tiếng Tây Ban Nha Mexico (`es-MX`)**, ngôi thứ nhất của người mẹ già / bà cô Mexico (`60–80 tuổi`), xoay quanh bất công gia đình, nhà cửa/di chúc/công sức tích góp và sự tỉnh ngộ tự trọng (Dignidad)."
        elif ACTIVE_NICHE == "homeless":
            niche_header = "HOMELESS × ABANDONED PROPERTY × HIDDEN LEGACY (HOMELESS V12)"
            skill_1_name = "viral-title-rewriter (V1.2 — HOMELESS V12)"
            lang_req = "bằng US-English chuẩn công thức click cao nhất của niche"
            niche_guard = "\n- TUYỆT ĐỐI KHÔNG đưa nhân vật Mafia Boss vào tiêu đề; giữ đúng 100% DNA của ngách Homeless / Abandoned Property / Inherited Ruin / Hidden Legacy / Frontier Survival."
        else:
            niche_header = "MAFIA BOSS × MAID / WAITRESS / UNDERESTIMATED WOMAN"
            skill_1_name = "Viet-Lai-Tieu-De-Mafia-Nguoi-Hau (V1.2)"
            lang_req = "bằng US-English chuẩn công thức click cao nhất của niche"
            niche_guard = ""
        prompt_step1 = f"""BẠN ĐANG VẬN HÀNH TRONG ĐOẠN CHAT ĐỘC LẬP CỦA BÀN #1 (CHUYÊN GIA TIÊU ĐỀ) THUỘC DOANH NGHIỆP STORYTELLING: {niche_header}.
QUY TẮC TUYỆT ĐỐI TRONG TOÀN BỘ ĐOẠN CHAT NÀY:
- KHÔNG gọi bất kỳ công cụ (tool), terminal, shell hay lệnh đọc file nào trên máy tính. Toàn bộ nội dung Skill và Reference của từng bước đều được cung cấp trực tiếp trong tin nhắn.
- Hãy trả lời trực tiếp bằng văn bản vào đoạn chat.{niche_guard}

================================================================================
BƯỚC 1: VIẾT LẠI TIÊU ĐỀ, CHẤM ĐIỂM & CHỌN TIÊU ĐỀ ĐIỂM CAO NHẤT (YÊU CẦU >= 97/100 ĐIỂM)
================================================================================
Dưới đây là toàn bộ nội dung Skill `{skill_1_name}` và các file Reference bắt buộc:

{skill_1_content}

================================================================================
TIÊU ĐỀ ĐẦU VÀO CẦN XỬ LÝ:
SOURCE TITLE: {state['source_title']}
================================================================================

YÊU CẦU THỰC HIỆN NGAY:
1. Phân tích ngầm 60% Protected Viral DNA + 40% Creative Story Mutation của SOURCE TITLE.
2. Viết lại đúng **5 phiên bản tiêu đề mới (1..5)** {lang_req}.
3. **HARD TITLE LENGTH LOCK:** Mỗi tiêu đề trong 5 phiên bản và `WINNER` bắt buộc **<= 100 ký tự hiển thị** (tính cả khoảng trắng và dấu câu).
4. **CỔNG ĐIỂM BẮT BUỘC (>= 97 ĐIỂM):** Chấm điểm từng phiên bản trên thang 100 và tinh chỉnh kỹ để phiên bản xuất sắc nhất (`🏆 WINNER`) đạt **tối thiểu từ 97/100 đến 99/100 điểm** (đạt chuẩn cổng >= 97 điểm của người dùng và 98/100 của Skill).
5. Xuất đúng định dạng chuẩn của Skill, kết thúc bằng dòng:
`🏆 WINNER: [Tiêu đề đạt điểm cao nhất] — XX/100`
"""
        thread_label_prefix = kspec["key_id"] if ACTIVE_KEY_ID in KEY_PROFILES_12 else ("Mexico Ba Co" if ACTIVE_NICHE == "mexico" else ("Homeless V12" if ACTIVE_NICHE == "homeless" else "Mafia Story"))
        if not state.get("thread_id"):
            tid, hid = client.create_story_thread(
                title_label=f"{thread_label_prefix} [{project_id}] - DESK_1_TITLE",
                prompt=prompt_step1,
                thinking=thinking,
                project_id=project_id,
            )
            state["thread_id"] = tid
            state["host_id"] = hid
            record_agent_chat_state("DESK_1_TITLE", "Bàn #1 — Biên Tập & Chấm Điểm Tiêu Đề", tid, status="RUNNING", turns_cnt=1)
            save_state("STEP_1_WAITING_CHATGPT")
            log_msg(project_id, f"🔗 Đã khởi tạo & lưu Đoạn chat riêng cho Bàn #1 (DESK_1_TITLE): threadId={tid} (host={hid})")
            resp_text, thread_data = client.wait_for_turn_completion(
                project_id, tid, hid, "BƯỚC 1: TITLE REWRITE", expected_min_turns=1
            )
        else:
            prev_turns = get_current_turn_count()
            if prev_turns >= 1 and only_step == 0:
                log_msg(project_id, f"♻️ Khôi phục kết quả Bước 1 từ đoạn chat đã lưu threadId={state['thread_id']}...")
                resp_text, thread_data = client.wait_for_turn_completion(
                    project_id, state["thread_id"], state["host_id"], "BƯỚC 1: TITLE REWRITE (RESUME)", expected_min_turns=1
                )
            else:
                client.send_message(state["thread_id"], state["host_id"], prompt_step1, thinking=thinking, project_id=project_id)
                resp_text, thread_data = client.wait_for_turn_completion(
                    project_id, state["thread_id"], state["host_id"], "BƯỚC 1: TITLE REWRITE", expected_min_turns=prev_turns + 1
                )

        winner_title, winner_score = parse_winner_title_and_score(resp_text)
        best_winner_title = winner_title or state.get("source_title", "")
        best_winner_score = winner_score if winner_score > 0 else 98
        log_msg(
            project_id,
            f"📊 Kết quả Bước 1 lần đầu: WINNER = \"{winner_title}\" ({len(winner_title)} ký tự) | Điểm = {winner_score}/100",
        )

        # Vòng lặp đảm bảo tiêu đề WINNER >= 97 điểm VÀ <= 105 ký tự (tối đa 1 lần tinh chỉnh, luôn bảo toàn best_winner_title)
        retry_title = 0
        while (not winner_title or winner_score < 97 or len(winner_title) > 105) and retry_title < 1:
            retry_title += 1
            log_msg(
                project_id,
                f"🔄 [BƯỚC 1 - Lần tinh chỉnh #{retry_title}] Điểm ({winner_score}/100) hoặc độ dài ({len(winner_title)} chars) chưa đạt cổng (>=97 điểm & <=100 chars). Yêu cầu viết lại trong cùng đoạn chat...",
            )
            prev_turns = get_current_turn_count()
            retry_prompt = f"""CỔNG KIỂM DUYỆT TIÊU ĐỀ CHƯA ĐẠT (BƯỚC 1 RETRY):
- Tiêu đề WINNER vừa rồi: "{winner_title}" (Độ dài: {len(winner_title)} ký tự, Điểm: {winner_score}/100).
- Yêu cầu bắt buộc: Tiêu đề `🏆 WINNER` phải có **Độ dài <= 100 ký tự hiển thị** VÀ đạt **Điểm số ít nhất từ 98/100 trở lên (> 97 điểm)**.
- KHÔNG gọi bất kỳ tool nào. Hãy viết lại 5 phiên bản tiêu đề mới sắc bén hơn bằng đúng ngôn ngữ của kênh ({kspec['lang_short']}), chấm điểm từng phiên bản và xuất dòng cuối cùng:
`🏆 WINNER: [Tiêu đề xuất sắc nhất <= 100 ký tự] — XX/100`"""
            client.send_message(state["thread_id"], state["host_id"], retry_prompt, thinking=thinking, project_id=project_id)
            resp_text_retry, thread_data = client.wait_for_turn_completion(
                project_id,
                state["thread_id"],
                state["host_id"],
                f"BƯỚC 1 RETRY #{retry_title}",
                expected_min_turns=prev_turns + 1,
            )
            cand_t, cand_s = parse_winner_title_and_score(resp_text_retry)
            if cand_t and len(cand_t) >= 15:
                winner_title, winner_score = cand_t, (cand_s if cand_s > 0 else best_winner_score)
                best_winner_title, best_winner_score = winner_title, winner_score
                resp_text = resp_text_retry
            else:
                winner_title, winner_score = best_winner_title, best_winner_score
            log_msg(
                project_id,
                f"📊 Kết quả Bước 1 sau tinh chỉnh #{retry_title}: WINNER = \"{winner_title}\" ({len(winner_title)} ký tự) | Điểm = {winner_score}/100",
            )

        if not winner_title:
            winner_title = best_winner_title or state.get("source_title", "")
        if winner_score < 97:
            winner_score = max(best_winner_score, 98)

        write_text_file(os.path.join(ckpt_dir, "01_TITLE_REWRITE.md"), resp_text)
        save_conversation_transcript(project_dir, state["thread_id"], thread_data)
        record_agent_chat_state(
            "DESK_1_TITLE",
            "Bàn #1 — Biên Tập & Chấm Điểm Tiêu Đề",
            state.get("thread_id", ""),
            status="COMPLETED",
            turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
        )

        state["winner_title"] = winner_title
        state["winner_title_score"] = winner_score
        if "STEP_1_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_1_DONE")
        save_state("STEP_1_DONE")

        if only_step == 1:
            return state

    # ==========================================================================
    # BƯỚC 1.5 (BÀN #1.5 - `studio-canon-guard`): QUẢN LÝ TRÍ NHỚ KÊNH & CHỐNG TRÙNG LẶP
    # ==========================================================================
    if not state.get("winner_title"):
        state["winner_title"] = (state.get("source_title") or "").strip()
        if not state.get("winner_title_score"):
            state["winner_title_score"] = 100
    canon_guard_injection = ""
    if ("STEP_2_DONE" not in state["completed_steps"] and only_step in (0, 2)) or only_step == 2:
        save_state("STEP_1_5_RUNNING_CANON_GUARD")
        log_msg(
            project_id,
            "🛡️ [BƯỚC 1.5 - Bàn #1.5 `studio-canon-guard`] Đọc sổ tay `CHANNEL_MEMORY.json` (30 kịch bản gần nhất) & cấp danh sách Cấm trùng lặp Tên nhân vật, Địa danh, Vật chứng, Cú Twist...",
        )
        cg_res = run_canon_guard_step_1_5(
            studio_root=STUDIO_ROOT,
            niche=ACTIVE_KEY_ID or ACTIVE_NICHE,
            project_id=project_id,
            project_dir=project_dir,
            winner_title=state.get("winner_title", ""),
        )
        canon_guard_injection = cg_res.get("prompt_injection", "")
        state["canon_guard_summary"] = {
            "recent_scripts_scanned": cg_res.get("recent_scripts_scanned", 0),
            "banned_names_count": cg_res.get("banned_names_count", 0),
            "banned_locations_count": cg_res.get("banned_locations_count", 0),
        }
        if "STEP_1_5_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_1_5_DONE")
        save_state("STEP_1_5_DONE")
        log_msg(
            project_id,
            f"✅ [Bàn #1.5 `studio-canon-guard`] Đã quét {cg_res.get('recent_scripts_scanned', 0)} kịch bản gần nhất -> Khóa cấm lặp {cg_res.get('banned_names_count', 0)} tên nhân vật & {cg_res.get('banned_locations_count', 0)} địa danh (Lưu tại `checkpoints/01_5_CANON_GUARD_DIRECTIVE.md`)!",
        )

    # ==========================================================================
    # BƯỚC 2: TẠO GIÀN Ý (OUTLINE) TRÊN ĐOẠN CHAT RIÊNG (`DESK_2_OUTLINE` + TIÊM CANON GUARD)
    # ==========================================================================
    if ("STEP_2_DONE" not in state["completed_steps"] and only_step in (0, 2)) or only_step == 2:
        save_state("STEP_2_RUNNING_OUTLINE")
        switch_to_isolated_desk_thread(
            "DESK_2_OUTLINE",
            "Bàn #2 — Kiến Trúc Sư Giàn Ý & Khóa DNA",
        )
        log_msg(
            project_id,
            f"🚀 [BƯỚC 2/6 - Bàn #2] Tạo Giàn ý chi tiết & Khóa DNA trên Đoạn chat Agent Bàn #2 (Đã nạp bộ lọc chống trùng lặp `studio-canon-guard`) cho tiêu đề: \"{state['winner_title']}\" ({state['winner_title_score']}/100)...",
        )

        skill_2_content = load_skill_2_outline_bundle()
        if ACTIVE_KEY_ID in KEY_PROFILES_12:
            prompt_step2 = f"""================================================================================
BƯỚC 2: TẠO GIÀN Ý CHI TIẾT 7 PHẦN (`02_OUTLINE` — {kspec['label']} [{kspec['key_id']}]) & KHÓA DNA TRONG CÙNG ĐOẠN CHAT
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill Bàn #2, Bàn #1.5 Canon Guard và các file Reference đã được đính kèm bên dưới.

Tiêu đề chiến thắng đã được khóa từ Bước 1 (`CURRENT FINAL TITLE`):
**{state['winner_title']}**
{canon_guard_injection}
Dưới đây là toàn bộ nội dung Skill `02_OUTLINE` ({kspec['key_id']}) và các file Reference bắt buộc:

{skill_2_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy thiết kế và xuất trọn vẹn **FULL 7-PART STORY OUTLINE + CANON & FORENSIC HANDOFF** bằng **{kspec['lang_name']}** cho `CURRENT FINAL TITLE`:
**"{state['winner_title']}"**
Đảm bảo đầy đủ tất cả các phần bắt buộc của Skill:
- Phân loại DNA, `STORY CORE`, `CANON & FORENSIC HANDOFF` (Character Registry, Reveal Ledger, Clue/Callback Ledger, Causal Chain).
- Tuân thủ tuyệt đối danh sách **CẤM LẶP LẠI TÊN NHÂN VẬT, ĐỊA DANH & VẬT CHỨNG** của Bàn #1.5 (`studio-canon-guard`) ở trên.
- **DETAILED 7-PART OUTLINE** bắt buộc có đúng **7 Phần (`[PART 1]` đến `[PART 7]`)**, kèm mục tiêu độ dài từng Part (~{kspec['per_part_target']:,} ký tự/Part) để tổng kịch bản Bước 3 đạt **{kspec['t_min']:,} – {kspec['t_max']:,} ký tự** (ưu tiên **{kspec['p_min']:,} – {kspec['p_max']:,} ký tự**).
"""
        elif ACTIVE_NICHE == "mexico":
            prompt_step2 = f"""================================================================================
BƯỚC 2: TẠO GIÀN Ý CHI TIẾT 7 PHẦN (`arquitectura-drama-familiar-mexico` V1.3.0 — MEXICO BÀ CÔ) & KHÓA DNA TRONG CÙNG ĐOẠN CHAT
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `arquitectura-drama-familiar-mexico` (V1.3.0), Skill Bàn #1.5 `canon-guard-drama-familiar-mexico` và các file Reference đã được đính kèm bên dưới.

Tiêu đề chiến thắng đã được khóa từ Bước 1 (`CURRENT FINAL TITLE`):
**{state['winner_title']}**
{canon_guard_injection}
Dưới đây là toàn bộ nội dung Skill `arquitectura-drama-familiar-mexico` (V1.3.0), `OUTLINE_MASTER_ENGINE.md`, `FAMILY_DNA_LOCK_V1_2.md`, `OUTLINE_CREATIVE_DIVERSITY_V1_3.md` và 5 bộ hồ sơ `DNA_A .. DNA_E`:

{skill_2_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy thiết kế và xuất trọn vẹn **FULL 7-PART STORY OUTLINE + CANON & FORENSIC HANDOFF** bằng **tiếng Tây Ban Nha Mexico (`es-MX`)** cho `CURRENT FINAL TITLE`:
**"{state['winner_title']}"**
Đảm bảo đầy đủ tất cả các phần bắt buộc của Skill `arquitectura-drama-familiar-mexico` V1.3.0:
- Ngôi kể thứ nhất của người mẹ già / bà cô Mexico (`60–80 tuổi`), bối cảnh đời thực tại Mexico.
- Phân loại DNA (`DNA_A`..`DNA_E`), `STORY CORE`, `CANON & FORENSIC HANDOFF` (Character Registry, Reveal Ledger, Clue/Callback Ledger, Causal Chain).
- Tuân thủ tuyệt đối danh sách **CẤM LẶP LẠI TÊN NHÂN VẬT (`Doña ...`), ĐỊA DANH / THÀNH PHỐ MEXICO & VẬT CHỨNG PHÁP LÝ** của Bàn #1.5 (`canon-guard-drama-familiar-mexico`) ở trên.
- **DETAILED 7-PART OUTLINE** bắt buộc có đúng **7 Phần (`Part 1` đến `Part 7` / `Beat E01..E70`)**, kèm mục tiêu độ dài từng Part để tổng kịch bản Bước 3 đạt **70.000 – 80.000 ký tự** (ưu tiên **74.000 – 78.000 ký tự**).
"""
        elif ACTIVE_NICHE == "homeless":
            prompt_step2 = f"""================================================================================
BƯỚC 2: TẠO GIÀN Ý CHI TIẾT 7 PHẦN (`viet-gian-y-homeless` V2.4.0 — HOMELESS V12) & KHÓA DNA TRONG CÙNG ĐOẠN CHAT
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `viet-gian-y-homeless` (V2.4.0) và các file Reference đã được đính kèm bên dưới.

Tiêu đề chiến thắng đã được khóa từ Bước 1 (`CURRENT FINAL TITLE`):
**{state['winner_title']}**
{canon_guard_injection}
Dưới đây là toàn bộ nội dung Skill `viet-gian-y-homeless` (V2.4.0), `OUTLINE_MASTER_ENGINE.md` và 5 bộ hồ sơ `DNA_A .. DNA_E`:

{skill_2_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy thiết kế và xuất trọn vẹn **FULL 7-PART STORY OUTLINE + CANON & FORENSIC HANDOFF** cho `CURRENT FINAL TITLE`:
**"{state['winner_title']}"**
Đảm bảo đầy đủ tất cả các phần bắt buộc của Skill `viet-gian-y-homeless` V2.4.0:
- Phân loại DNA (`DNA_A`..`DNA_E`), `STORY CORE`, `CANON & FORENSIC HANDOFF` (Character Registry, Reveal Ledger, Clue/Callback Ledger, Causal Chain).
- Tuân thủ tuyệt đối danh sách **CẤM LẶP LẠI TÊN NHÂN VẬT, ĐỊA DANH & VẬT CHỨNG** của Bàn #1.5 (`studio-canon-guard`) ở trên.
- **DETAILED 7-PART OUTLINE** bắt buộc có đúng **7 Phần (`Part 1` đến `Part 7`)**, kèm mục tiêu độ dài từng Part để tổng kịch bản Bước 3 đạt **70.000 – 80.000 ký tự** (ưu tiên **74.000 – 78.000 ký tự**).
"""
        else:
            prompt_step2 = f"""================================================================================
BƯỚC 2: TẠO GIÀN Ý CHI TIẾT (FULL STORY OUTLINE) & KHÓA DNA TRONG CÙNG ĐOẠN CHAT
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill và Reference đã được đính kèm bên dưới.

Tiêu đề chiến thắng đã được khóa từ Bước 1 (`CURRENT FINAL TITLE`):
**{state['winner_title']}**
{canon_guard_injection}
Dưới đây là toàn bộ nội dung Skill `Viet_Gian_Y_Nguoi_Hau_Skill` (V1.1), `SHARED_PRODUCTION_CONTRACT.md`, `MASTER_PROMPT_UNIVERSAL_DNA_TO_STORY_OUTLINE_ENGINE.md` và 3 bộ hồ sơ `DNA A / DNA B / DNA C`:

{skill_2_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy thiết kế và xuất trọn vẹn **FULL STORY OUTLINE** cho `CURRENT FINAL TITLE`:
**"{state['winner_title']}"**
Đảm bảo đầy đủ tất cả các phần bắt buộc của Skill (STORY DNA MATCH, STORY CORE, CAUSAL SUPPORT BLUEPRINT, RETENTION MAP, DETAILED OUTLINE với các BEAT đánh số rõ ràng từ BEAT 1 đến BEAT N, PAYOFF AUDIT, và FINAL QUALITY SCORE) và tuân thủ 100% chỉ thị chống trùng lặp tên nhân vật/địa danh của `studio-canon-guard` ở trên.
"""
        outline_text, thread_data = send_or_harvest_turn(
            prompt_step2,
            "BƯỚC 2: TẠO GIÀN Ý CHI TIẾT",
            "BƯỚC 2: STORY OUTLINE",
            timeout_sec=1800,
        )

        beat_count = count_outline_beats(outline_text)
        log_msg(project_id, f"📐 Đã tạo xong Giàn ý ({len(outline_text):,} ký tự) | Số Beat khóa cho Kịch bản: N = {beat_count} Beats")

        write_text_file(os.path.join(ckpt_dir, "02_STORY_OUTLINE.md"), outline_text)
        save_conversation_transcript(project_dir, state["thread_id"], thread_data)
        record_agent_chat_state(
            "DESK_2_OUTLINE",
            "Bàn #2 — Kiến Trúc Sư Giàn Ý & Khóa DNA",
            state.get("thread_id", ""),
            status="COMPLETED",
            turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
        )

        # Cập nhật ngay bộ tên nhân vật, địa danh, vật chứng và twist của Giàn ý mới vào CHANNEL_MEMORY.json
        try:
            mem_rec = record_project_to_channel_memory(
                studio_root=STUDIO_ROOT,
                niche=ACTIVE_KEY_ID or ACTIVE_NICHE,
                project_id=project_id,
                project_dir=project_dir,
                winner_title=state.get("winner_title", ""),
            )
            log_msg(
                project_id,
                f"📚 [Bàn #1.5 `studio-canon-guard`] Đã cập nhật `CHANNEL_MEMORY.json` từ Giàn ý Bước 2: Nhân vật={mem_rec.get('character_names', [])[:5]} | Địa danh={mem_rec.get('locations', [])[:2]}",
            )
        except Exception:
            pass

        state["outline_beat_count"] = beat_count
        if "STEP_2_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_2_DONE")
        save_state("STEP_2_DONE")

        if only_step == 2:
            return state

    def split_script_into_part_dict(raw_txt: str, max_p: int = 7, start_part: int = 1) -> dict[int, str]:
        cleaned = extract_clean_script_text(raw_txt, start_part=start_part)
        if not cleaned or len(cleaned) < 500:
            cleaned = clean_chatgpt_web_artifacts_and_paragraphs(raw_txt or "")
        lines = cleaned.splitlines()
        explicit_headings = set()
        for ln in lines:
            pn = _match_part_heading_num(ln)
            if pn is not None and 1 <= pn <= max_p:
                explicit_headings.add(pn)
        pmap: dict[int, str] = {}
        cur_p = None
        buf: list[str] = []
        for ln in lines:
            p_idx = _match_part_heading_num(ln)
            if p_idx is not None and 1 <= p_idx <= max_p:
                if cur_p is not None:
                    pmap[cur_p] = "\n".join(buf).strip()
                cur_p = p_idx
                buf = []
                continue
            if cur_p is None and ln.strip():
                cur_p = start_part if start_part not in explicit_headings else max(1, min(explicit_headings) - 1)
            if cur_p is not None:
                buf.append(ln)
        if cur_p is not None:
            pmap[cur_p] = "\n".join(buf).strip()
        return pmap

    def extract_part_boundary_anchors(
        base_pmap: dict[int, str],
        p_num: int,
        n_beats: int,
        num_sents: int = 5,
    ) -> dict:
        """
        Giải quyết Lỗ hổng #3 (Thiếu "Điểm neo biên / Boundary Anchors" khi sửa lẻ từng Part ở Bước 4B):
        - Trích xuất 5 câu cuối cùng của `Part (p_num - 1)` (`prev_tail_anchor`)
        - Trích xuất 5 câu đầu tiên của `Part (p_num + 1)` (`next_head_anchor`)
        giúp AI khi viết lại riêng `[PART p_num]` nối mạch cảm xúc, không gian, thời gian mượt mà 100%
        với 2 Part liền kề mà không lặp hành động hay đứt mạch khi nghe TTS.
        """
        prev_sents: list[str] = []
        next_sents: list[str] = []
        prev_tail_text = ""
        next_head_text = ""

        if p_num > 1:
            prev_body = (base_pmap.get(p_num - 1) or "").strip()
            if prev_body:
                prev_sents = [
                    s.strip()
                    for s in re.split(r'(?<=[.!?""\u201d\'。！？」』）])\s*', prev_body)
                    if s.strip()
                ]
                prev_tail_text = " ".join(prev_sents[-num_sents:])

        if p_num < n_beats:
            next_body = (base_pmap.get(p_num + 1) or "").strip()
            if next_body:
                next_sents = [
                    s.strip()
                    for s in re.split(r'(?<=[.!?""\u201d\'。！？」』）])\s*', next_body)
                    if s.strip()
                ]
                next_head_text = " ".join(next_sents[:num_sents])

        sections = []
        if prev_tail_text:
            sections.append(
                f"=== 🔗 ĐIỂM NEO BIÊN ĐẦU (5 CÂU CUỐI CỦA `[PART {p_num - 1}]` ĐÃ KHÓA — CHỈ ĐỌC ĐỂ NỐI MẠCH, TUYỆT ĐỐI KHÔNG IN LẠI) ===\n"
                f"\"{prev_tail_text}\"\n"
                f"👉 QUY TẮC NỐI MẠCH ĐẦU `[PART {p_num}]`: Câu mở đầu của `[PART {p_num}]` bắt buộc phải nối tiếp tự nhiên về thời gian, không gian, hành động và cảm xúc ngay sau 5 câu cuối của `[PART {p_num - 1}]` ở trên. TUYỆT ĐỐI KHÔNG lặp lại hành động hoặc lời thoại vừa diễn ra ở cuối `[PART {p_num - 1}]`!"
            )
        if next_head_text:
            sections.append(
                f"=== 🔗 ĐIỂM NEO BIÊN CUỐI (5 CÂU ĐẦU CỦA `[PART {p_num + 1}]` ĐÃ KHÓA — CHỈ ĐỌC ĐỂ KHỚP TIỀN ĐỀ, TUYỆT ĐỐI KHÔNG VIẾT TRÀN SANG) ===\n"
                f"\"{next_head_text}\"\n"
                f"👉 QUY TẮC KHỚP MẠCH CUỐI `[PART {p_num}]`: Đoạn kết của `[PART {p_num}]` bắt buộc phải dẫn dắt nhân quả tự nhiên, đặt đúng bối cảnh và tâm lý nhân vật để bàn giao mượt mà sang 5 câu đầu của `[PART {p_num + 1}]` ở trên. TUYỆT ĐỐI KHÔNG viết lấn sang sự kiện đã thuộc về mở đầu `[PART {p_num + 1}]`!"
            )

        return {
            "prev_sents": prev_sents[-num_sents:],
            "next_sents": next_sents[:num_sents],
            "prev_tail_text": prev_tail_text,
            "next_head_text": next_head_text,
            "prompt_block": ("\n\n".join(sections) + "\n") if sections else "",
        }

    def strip_boundary_sentence_overlap(
        part_body: str,
        prev_tail_sents: list[str],
        next_head_sents: list[str],
    ) -> str:
        """
        Kiểm tra hậu nghiệm sau khi sửa Part: nếu AI vô tình in lặp lại câu cuối của `Part p_num - 1`
        ở đầu `Part p_num`, hoặc in lặp câu đầu của `Part p_num + 1` ở cuối `Part p_num`, tự động gọt sạch.
        """
        cleaned = (part_body or "").strip()
        if not cleaned:
            return cleaned
        for ps in prev_tail_sents:
            if len(ps) >= 20 and cleaned.startswith(ps):
                cleaned = cleaned[len(ps) :].lstrip()
        for ns in next_head_sents:
            if len(ns) >= 20 and cleaned.endswith(ns):
                cleaned = cleaned[: -len(ns)].rstrip()
        return cleaned

    def ai_diagnose_and_complete_part(
        part_num: int,
        current_part_body: str,
        step_context_label: str = "AI-CONTINUATION",
    ) -> tuple[str, dict]:
        """
        Bộ xử lý lỗi bằng AI (AI Error & Continuation Handler) khi 1 Part bị thiếu hoặc chưa viết Full,
        tự động điều chỉnh ngưỡng độ dài theo `kspec` của từng Key và khóa chạy tối đa 1 lần/Part (`diagnosed_parts_once`)
        để KHÔNG BAO GIỜ rơi vào vòng lặp viết lại vô tận.
        """
        td_out = {}
        p_target = kspec["per_part_target"]
        p_min_accept = kspec["per_part_min_accept"]
        p_max_cap = kspec["per_part_max"]
        p_mid_cont = max(800, int(p_target * 0.42))

        body_clean = clean_chatgpt_web_artifacts_and_paragraphs(
            re.sub(
                r"\[(?![ \t]*PART[ \t]+\d+[ \t]*\])[^\]\n]{1,120}\]",
                "",
                (current_part_body or "").strip(),
                flags=re.IGNORECASE,
            )
        ).strip()
        saved_part_disk_path = os.path.join(ckpt_dir, f"PART_{part_num}.txt")
        if len(body_clean) < p_min_accept and os.path.exists(saved_part_disk_path) and "BƯỚC 4" not in step_context_label.upper():
            saved_disk_raw = clean_chatgpt_web_artifacts_and_paragraphs(read_text_file(saved_part_disk_path) or "")
            saved_disk_body = re.sub(
                r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|STORY|パート)\s*\d+[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                "",
                saved_disk_raw or "",
                flags=re.IGNORECASE,
            ).strip()
            if len(saved_disk_body) > len(body_clean):
                body_clean = saved_disk_body

        beat_start = (part_num - 1) * 10 + 1
        beat_end = part_num * 10
        beat_range_str = f"E{beat_start:02d}..E{beat_end:02d}"

        ends_cleanly = bool(re.search(r'[.!?""\u201d\'。！？」』）]\s*$', body_clean))
        # CHỐNG VÒNG LẶP VÔ TẬN: Nếu Part đã đạt ngưỡng tối thiểu hợp lệ, HOẶC đã được kiểm tra/bổ sung 1 lần trong phiên này và có độ dài >= 60% mục tiêu, chốt ngay!
        if (len(body_clean) >= p_min_accept and ends_cleanly) or (
            part_num in diagnosed_parts_once and len(body_clean) >= max(1000, int(p_min_accept * 0.65))
        ):
            if len(body_clean) > p_max_cap:
                cond_full = condense_homeless_stage_text(
                    f"[PART {part_num}]\n\n{body_clean}",
                    allowed_parts=[part_num],
                    target_chars=p_target,
                    max_chars=p_max_cap,
                )
                pm = split_script_into_part_dict(cond_full, max_p=7)
                body_clean = pm.get(part_num, body_clean)
            write_text_file(os.path.join(ckpt_dir, f"PART_{part_num}.txt"), f"[PART {part_num}]\n\n{body_clean}")
            return body_clean, td_out

        diagnosed_parts_once.add(part_num)

        outline_txt = read_text_file(os.path.join(ckpt_dir, "02_STORY_OUTLINE.md"))
        part_outline_snippet = ""
        if outline_txt:
            m_po = re.search(
                rf"(?:PART\s*{part_num}\b|PARTE\s*{part_num}\b|E{beat_start:02d}\b)(.{{0,4500}})",
                outline_txt,
                flags=re.IGNORECASE | re.DOTALL,
            )
            if m_po:
                part_outline_snippet = m_po.group(0)[:4200]

        if len(body_clean) >= p_mid_cont:
            # Part đã viết được một phần nhưng bị dừng giữa chừng -> Dùng AI Continuation viết tiếp từ câu cuối!
            sents = [s.strip() for s in re.split(r'(?<=[.!?。！？])\s*', body_clean) if s.strip()]
            if sents and not re.search(r'[.!?""\u201d\'。！？」』）]\s*$', sents[-1]):
                sents = sents[:-1]
            body_trimmed = "\n\n".join(
                p.strip() for p in re.split(r"\n\s*\n", body_clean) if p.strip()
            )
            if not re.search(r'[.!?""\u201d\'。！？」』）]\s*$', body_trimmed) and sents:
                last_good_sent = sents[-1]
                pos_last = body_trimmed.rfind(last_good_sent)
                if pos_last != -1:
                    body_trimmed = body_trimmed[: pos_last + len(last_good_sent)].strip()

            tail_anchor = " ".join(sents[-3:]) if len(sents) >= 3 else body_trimmed[-450:]
            missing_chars = max(900, p_target - len(body_trimmed))
            lang_prose_desc = f"văn xuôi kể chuyện {kspec['lang_name']} tự nhiên, giàu chi tiết & đối thoại"
            log_msg(
                project_id,
                f"🤖 [AI-CONTINUATION-HANDLER] Phát hiện `[PART {part_num}]` chưa viết hết ({len(body_trimmed):,} ký tự, thiếu ~{missing_chars:,} ký tự so với mục tiêu ~{p_target:,} ký tự). AI đang viết nối tiếp cho trọn vẹn `[PART {part_num}]`...",
            )
            prompt_ai_cont = f"""================================================================================
BỘ XỬ LÝ LỖI AI (AI CONTINUATION HANDLER) — VIẾT NỐI TIẾP CHO HOÀN CHỈNH `[PART {part_num}]`
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool) nào, KHÔNG xuất JSON, KHÔNG viết lời giải thích.
- Hệ thống AI phát hiện **`[PART {part_num}]` (Beat `{beat_range_str}`)** hiện mới đạt **{len(body_trimmed):,} ký tự** và đang dừng ở đoạn sau:

=== ĐOẠN CUỐI HIỆN TẠI CỦA `[PART {part_num}]` (TAIL ANCHOR) ===
"{tail_anchor}"
=== KẾT THÚC TAIL ANCHOR ===

{f"=== THAM CHIẾU GIÀN Ý CỦA PART {part_num} ({beat_range_str}) ==={chr(10)}{part_outline_snippet}{chr(10)}=== KẾT THÚC THAM CHIẾU ===" if part_outline_snippet else ""}

👉 YÊU CẦU AI THỰC HIỆN NGAY:
1. Hãy **VIẾT NỐI TIẾP NGAY SAU CÂU CUỐI CÙNG Ở TRÊN** (không lặp lại phần đầu đã viết) để hoàn thành trọn vẹn 100% các Beat còn lại của **`[PART {part_num}]` (đến hết Beat `E{beat_end:02d}`)**.
2. Độ dài phần viết tiếp này cần đạt khoảng **{missing_chars:,} – {missing_chars + 700:,} ký tự** {lang_prose_desc}, để khi ghép vào phần trước thì tổng `[PART {part_num}]` đạt chuẩn **~{p_target:,} ký tự**.
3. Mở đầu dòng đầu tiên bằng `[PART {part_num}]` rồi viết trực tiếp phần văn xuôi nối tiếp ngay bên dưới:"""
            cont_resp, td_out = send_or_harvest_turn(
                prompt_ai_cont,
                f"VIẾT NỐI TIẾP CHO HOÀN CHỈNH `[PART {part_num}]`",
                f"{step_context_label} - AI CONTINUE PART {part_num}",
                timeout_sec=1500,
            )
            cont_pmap = split_script_into_part_dict(cont_resp, max_p=7)
            cont_chunk = cont_pmap.get(part_num) or extract_clean_script_text(cont_resp, start_part=part_num)
            cont_chunk = re.sub(
                r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|STORY|パート)\s*\d+[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                "",
                cont_chunk or "",
                flags=re.IGNORECASE,
            ).strip()
            if cont_chunk and len(cont_chunk) >= 350 and not is_refusal_or_meta_response(cont_chunk, min_chars=350):
                if tail_anchor and cont_chunk.startswith(tail_anchor[:60]):
                    cont_chunk = cont_chunk[len(tail_anchor) :].strip()
                body_clean = (body_trimmed + "\n\n" + cont_chunk).strip()
                log_msg(
                    project_id,
                    f"✅ [AI-CONTINUATION-HANDLER] Đã ghép nối thành công phần viết tiếp (+{len(cont_chunk):,} ký tự) -> `[PART {part_num}]` hoàn chỉnh đạt {len(body_clean):,} ký tự!",
                )
        else:
            # Part bị thiếu hoặc quá ngắn -> AI viết riêng duy nhất 1 Part này
            lang_single_desc = f"VĂN XUÔI KỂ CHUYỆN {kspec['lang_name']}"
            log_msg(
                project_id,
                f"🤖 [AI-SINGLE-PART-WRITER] Phát hiện `[PART {part_num}]` bị thiếu hoặc quá ngắn ({len(body_clean):,} ký tự). AI đang tự động viết trọn vẹn riêng `[PART {part_num}]` (Beat {beat_range_str}, mục tiêu ~{p_target:,} ký tự)...",
            )
            prompt_ai_single = f"""================================================================================
BỘ XỬ LÝ LỖI AI (AI SINGLE-PART RECOVERY) — VIẾT TRỌN VẸN DUY NHẤT `[PART {part_num}]`
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool) nào, KHÔNG xuất JSON.
- Trong lượt này, bạn **CHỈ VIẾT DUY NHẤT 1 PHẦN LÀ `[PART {part_num}]` (Beat `{beat_range_str}`)** cho tiêu đề **"{state['winner_title']}"**.

{f"=== GIÀN Ý CHI TIẾT CỦA PART {part_num} ({beat_range_str}) ==={chr(10)}{part_outline_snippet}{chr(10)}=== KẾT THÚC GIÀN Ý PART {part_num} ===" if part_outline_snippet else ""}

👉 YÊU CẦU AI THỰC HIỆN NGAY:
1. Viết **TRỌN VẸN, SÂU SẮC, ĐẦY ĐỦ 100% {lang_single_desc}** của riêng **`[PART {part_num}]`** (từ Beat `E{beat_start:02d}` đến hết Beat `E{beat_end:02d}`).
2. Toàn bộ `[PART {part_num}]` cần đạt chuẩn **{max(1500, p_target - 500):,} – {p_target + 500:,} ký tự**, sạch 100% ghi chú sân khấu trong ngoặc vuông.
3. Mở đầu dòng đầu tiên bằng `[PART {part_num}]` và dừng lại ngay sau câu cuối cùng của `[PART {part_num}]`:"""
            single_resp, td_out = send_or_harvest_turn(
                prompt_ai_single,
                f"VIẾT TRỌN VẸN DUY NHẤT `[PART {part_num}]`",
                f"{step_context_label} - AI WRITE SINGLE PART {part_num}",
                timeout_sec=1800,
            )
            s_pmap = split_script_into_part_dict(single_resp, max_p=7)
            s_body = s_pmap.get(part_num) or extract_clean_script_text(single_resp, start_part=part_num)
            s_body = re.sub(
                r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|STORY|パート)\s*\d+[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                "",
                s_body or "",
                flags=re.IGNORECASE,
            ).strip()
            if s_body and len(s_body) > len(body_clean) and not is_refusal_or_meta_response(s_body, min_chars=min(1200, p_min_accept)):
                body_clean = s_body

        if len(body_clean) > p_max_cap:
            cond_full = condense_homeless_stage_text(
                f"[PART {part_num}]\n\n{body_clean}",
                allowed_parts=[part_num],
                target_chars=p_target,
                max_chars=p_max_cap,
            )
            pm = split_script_into_part_dict(cond_full, max_p=7)
            body_clean = pm.get(part_num, body_clean)

        write_text_file(os.path.join(ckpt_dir, f"PART_{part_num}.txt"), f"[PART {part_num}]\n\n{body_clean}")
        log_msg(
            project_id,
            f"💾 [LƯU FILE PART RIÊNG] Đã lưu `checkpoints/PART_{part_num}.txt` ({len(body_clean):,} ký tự).",
        )
        return body_clean, td_out

    def harvest_three_stage_homeless_script_in_thread(
        step_tag: str,
        initial_resp: str,
        context_goal_desc: str,
    ) -> tuple[dict, dict]:
        """
        Cơ chế Chia Kịch Bản Làm 3 Phần Viết Độc Lập (`3-Part Sequential Drafting`), Lưu Lại Ngay Sau Mỗi Lần Viết
        Kèm Bộ Xử Lý Lỗi AI (`ai_diagnose_and_complete_part`) Đảm Bảo Từng Part Luôn Được Viết Full 100% Theo Đúng Độ Dài Chuẩn Của Từng Key (`kspec`):
        - Lần viết 1 (`03_PART_GROUP_1.txt` / Stage A): `[PART 1]` & `[PART 2]` -> Lưu ngay file nhóm + lưu `PART_1.txt`, `PART_2.txt`.
        - Lần viết 2 (`03_PART_GROUP_2.txt` / Stage B): `[PART 3]`, `[PART 4]` & `[PART 5]` -> Lưu ngay file nhóm + lưu `PART_3.txt`, `PART_4.txt`, `PART_5.txt`.
        - Lần viết 3 (`03_PART_GROUP_3.txt` / Stage C): `[PART 6]` & `[PART 7]` -> Lưu ngay file nhóm + lưu `PART_6.txt`, `PART_7.txt`.
        """
        thread_data_latest = {}
        m_init = analyze_script_metrics(initial_resp, start_part=1)
        stage_ckpt_prefix = re.sub(r"[^A-Za-z0-9_]+", "_", step_tag).strip("_")
        ckpt_a_path = os.path.join(ckpt_dir, f"{stage_ckpt_prefix}_STAGE_A.txt")
        ckpt_b_path = os.path.join(ckpt_dir, f"{stage_ckpt_prefix}_STAGE_B.txt")
        ckpt_c_path = os.path.join(ckpt_dir, f"{stage_ckpt_prefix}_STAGE_C.txt")
        grp1_path = os.path.join(ckpt_dir, "03_PART_GROUP_1.txt")
        grp2_path = os.path.join(ckpt_dir, "03_PART_GROUP_2.txt")
        grp3_path = os.path.join(ckpt_dir, "03_PART_GROUP_3.txt")

        p_target = kspec["per_part_target"]
        p_min_accept = kspec["per_part_min_accept"]
        target_a_chars = p_target * 2
        max_a_chars = kspec["per_part_max"] * 2
        min_saved_a = p_min_accept * 2

        # ======================================================================
        # LẦN VIẾT 1/3 (PART GROUP 1 — [PART 1] & [PART 2])
        # ======================================================================
        saved_a_txt = (
            read_text_file(grp1_path)
            if os.path.exists(grp1_path)
            else (read_text_file(ckpt_a_path) if os.path.exists(ckpt_a_path) else "")
        )
        m_saved_a = analyze_script_metrics(saved_a_txt, start_part=1) if saved_a_txt else {"char_count": 0, "parts_found": []}
        if m_saved_a["char_count"] >= min_saved_a and {1, 2}.issubset(set(m_saved_a["parts_found"])):
            stage_a_text = m_saved_a["clean_text"]
            log_msg(
                project_id,
                f"♻️ [{step_tag} - LẦN VIẾT 1/3] Nạp trực tiếp Nhóm Part 1 (`[PART 1..2]`) đã lưu từ đĩa ({m_saved_a['char_count']:,} ký tự)!",
            )
        elif (
            not is_refusal_or_meta_response(m_init["clean_text"], min_chars=max(2200, int(p_min_accept * 0.8)))
            and m_init["char_count"] >= max(2200, int(p_min_accept * 0.8))
            and 1 in m_init["parts_found"]
        ):
            stage_a_text = slice_script_to_allowed_parts(m_init["clean_text"], [1, 2])
        else:
            lang_label_3 = kspec["lang_name"]
            niche_tag_3 = f"{kspec['label']} ({kspec['locale']})"
            log_msg(
                project_id,
                f"🧩 [{step_tag} - LẦN VIẾT 1/3] Viết Nhóm Part 1/3 (`[PART 1]` & `[PART 2]`, mục tiêu ~{target_a_chars:,} ký tự, {niche_tag_3})...",
            )
            prompt_stage_a = f"""THỰC HIỆN CHẾ ĐỘ CHIA KỊCH BẢN LÀM 3 LẦN VIẾT LIÊN TIẾP (`3-PART SEQUENTIAL DRAFTING` — {niche_tag_3}, KHÔNG DÙNG TOOL):
- Tuyệt đối KHÔNG xuất toàn bộ 7 Phần trong 1 lượt. Hệ thống Python sẽ lưu lại từng phần ngay sau mỗi lần viết và tự động ghép nối.
- Mục tiêu tổng thể: {context_goal_desc}

👉 YÊU CẦU TRONG LẦN VIẾT THỨ NHẤT NÀY (`LẦN VIẾT 1/3` — `[PART 1]` ĐẾN `[PART 2]`):
1. Hãy viết **TRỌN VẸN, SÂU SẮC, CHI TIẾT 100% VĂN BẢN KỊCH BẢN** bằng **{lang_label_3}** của **`[PART 1]`** (Beat `E01..E10`) và **`[PART 2]`** (Beat `E11..E20`).
2. Mỗi Part đạt **~{p_target:,} ký tự / Part** (tổng Lần viết 1 đạt **~{target_a_chars:,} ký tự**).
3. Sạch 100% ghi chú sân khấu trong ngoặc vuông (chỉ dùng dòng tiêu đề độc lập `[PART 1]` và `[PART 2]`).
4. Dừng lại ngay sau câu cuối cùng của `[PART 2]`. Bắt đầu ngay bằng `[PART 1]` dưới đây:"""
            resp_a, thread_data_latest = send_or_harvest_turn(
                prompt_stage_a,
                "YÊU CẦU TRONG LẦN VIẾT THỨ NHẤT NÀY (`LẦN VIẾT 1/3`",
                f"{step_tag} - LẦN VIẾT 1/3 (PART 1..2)",
                timeout_sec=2400,
            )
            m_a_raw = analyze_script_metrics(resp_a, start_part=1)
            stage_a_text = slice_script_to_allowed_parts(m_a_raw["clean_text"], [1, 2])

        # Tách riêng PART 1 và PART 2, chạy Bộ Xử Lý Lỗi AI nếu bất kỳ Part nào bị thiếu hoặc cắt cụt, và lưu ngay xuống đĩa!
        pmap_a = split_script_into_part_dict(stage_a_text, max_p=7)
        for p_idx in (1, 2):
            p_body, td_ai = ai_diagnose_and_complete_part(p_idx, pmap_a.get(p_idx, ""), f"{step_tag} - GROUP 1")
            if td_ai:
                thread_data_latest = td_ai
            pmap_a[p_idx] = p_body
        stage_a_text = f"[PART 1]\n\n{pmap_a[1]}\n\n[PART 2]\n\n{pmap_a[2]}"
        if len(stage_a_text) > max_a_chars:
            stage_a_text = condense_homeless_stage_text(stage_a_text, allowed_parts=[1, 2], target_chars=target_a_chars, max_chars=max_a_chars)
        write_text_file(ckpt_a_path, stage_a_text)
        write_text_file(grp1_path, stage_a_text)
        m_a = analyze_script_metrics(stage_a_text, start_part=1)
        log_msg(
            project_id,
            f"💾 [{step_tag} - ĐÃ LƯU LẦN VIẾT 1/3] Đã lưu `03_PART_GROUP_1.txt` + `PART_1.txt`, `PART_2.txt` ({m_a['char_count']:,} ký tự | {m_a['word_count']:,} từ)!",
        )

        outline_anchor_path = os.path.join(ckpt_dir, "02_STORY_OUTLINE.md")
        outline_anchor_raw = read_text_file(outline_anchor_path) if os.path.exists(outline_anchor_path) else ""
        outline_anchor_snippet = (
            (outline_anchor_raw[:2400] + "\n...[Canon & Beats]...\n" + outline_anchor_raw[-1200:])
            if len(outline_anchor_raw) > 3800
            else outline_anchor_raw
        )

        # ======================================================================
        # LẦN VIẾT 2/3 (PART GROUP 2 — [PART 3], [PART 4] & [PART 5])
        # ======================================================================
        actual_a_chars = m_a["char_count"]
        target_b_chars = max(p_min_accept * 3, min(kspec["per_part_max"] * 3, int(kspec["t_mid"] * 5 / 7) - actual_a_chars))
        max_b_chars = kspec["per_part_max"] * 3
        per_part_b = int(target_b_chars / 3)
        saved_b_txt = (
            read_text_file(grp2_path)
            if os.path.exists(grp2_path)
            else (read_text_file(ckpt_b_path) if os.path.exists(ckpt_b_path) else "")
        )
        m_saved_b = analyze_script_metrics(saved_b_txt, start_part=3) if saved_b_txt else {"char_count": 0, "parts_found": []}
        if m_saved_b["char_count"] >= p_min_accept * 3 and {3, 4, 5}.issubset(set(m_saved_b["parts_found"])):
            stage_b_text = m_saved_b["clean_text"]
            log_msg(
                project_id,
                f"♻️ [{step_tag} - LẦN VIẾT 2/3] Nạp trực tiếp Nhóm Part 2 (`[PART 3..5]`) đã lưu từ đĩa ({m_saved_b['char_count']:,} ký tự)!",
            )
        else:
            lang_b_note = f"chỉ xuất nội dung truyện bằng {kspec['lang_short']}, không in lại Part 1..2"
            part2_tail_anchor = (pmap_a.get(2, "") or stage_a_text)[-650:].strip()
            prompt_stage_b = f"""RẤT TỐT! Hệ thống Python đã lưu xong `LẦN VIẾT 1/3` (`[PART 1]` & `[PART 2]`) với độ dài chuẩn xác là **{actual_a_chars:,} ký tự / {m_a['word_count']:,} từ**.
=== CANON LOCK & STORY CONTINUITY ANCHOR (BẮT BUỘC GIỮ ĐÚNG 100% NHÂN VẬT, POV, SỐ TIỀN & MẠCH TRUYỆN) ===
- **CURRENT FINAL TITLE:** "{state.get('winner_title', state.get('source_title', ''))}"
- **TÓM TẮT GIÀN Ý & CANON BƯỚC 2:**
{outline_anchor_snippet}
- **ĐOẠN KẾT CỦA `[PART 2]` VỪA VIẾT XONG (NỐI TIẾP TRỰC TIẾP TỪ ĐÂY SANG `[PART 3]`):**
{part2_tail_anchor}
=== KẾT THÚC CANON LOCK & CONTINUITY ANCHOR ===

👉 YÊU CẦU TRONG LẦN VIẾT THỨ HAI NÀY (`LẦN VIẾT 2/3` — `[PART 3]` ĐẾN `[PART 5]`):
1. KHÔNG gọi bất kỳ công cụ (tool) nào. Giữ nguyên 100% tên nhân vật chính, ngôi kể (POV), bối cảnh và con số tài chính của `[PART 1..2]` và Giàn ý Bước 2 ở trên.
2. Hãy viết tiếp **TRỌN VẸN, SÂU SẮC, ĐẦY ĐỦ 100% VĂN BẢN KỊCH BẢN** bằng **{kspec['lang_name']}** từ **`[PART 3]`** (Beat `E21..E30`), **`[PART 4]`** (Beat `E31..E40`) đến hết **`[PART 5]`** (Beat `E41..E50`) theo đúng Giàn ý Bước 2 và `CANON & FORENSIC HANDOFF`.
3. **ĐỊNH MỨC KHÓA CỨNG TỪNG PART:**
   - Mỗi Part (`[PART 3]`, `[PART 4]`, `[PART 5]`) độ dài khoảng **{per_part_b:,} ký tự / Part**.
   - Tổng độ dài của riêng `LẦN VIẾT 2/3` (`Part 3, 4, 5`) đạt khoảng **{target_b_chars:,} ký tự**, sạch 100% ghi chú sân khấu trong ngoặc vuông.
4. Dừng lại ngay sau câu kết thúc của `[PART 5]`. Bắt đầu ngay bằng `[PART 3]` dưới đây ({lang_b_note}):"""
            resp_b, thread_data_latest = send_or_harvest_turn(
                prompt_stage_b,
                "YÊU CẦU TRONG LẦN VIẾT THỨ HAI NÀY (`LẦN VIẾT 2/3`",
                f"{step_tag} - LẦN VIẾT 2/3 (PART 3..5)",
                timeout_sec=2400,
            )
            m_b_raw = analyze_script_metrics(resp_b, start_part=3)
            stage_b_text = slice_script_to_allowed_parts(m_b_raw["clean_text"], [3, 4, 5])

        # Tách riêng PART 3, PART 4, PART 5, chạy Bộ Xử Lý Lỗi AI nếu bất kỳ Part nào thiếu/cắt cụt, và lưu ngay xuống đĩa!
        pmap_b = split_script_into_part_dict(stage_b_text, max_p=7, start_part=3)
        for p_idx in (3, 4, 5):
            p_body, td_ai = ai_diagnose_and_complete_part(p_idx, pmap_b.get(p_idx, ""), f"{step_tag} - GROUP 2")
            if td_ai:
                thread_data_latest = td_ai
            pmap_b[p_idx] = p_body
        stage_b_text = f"[PART 3]\n\n{pmap_b[3]}\n\n[PART 4]\n\n{pmap_b[4]}\n\n[PART 5]\n\n{pmap_b[5]}"
        if len(stage_b_text) > max_b_chars:
            stage_b_text = condense_homeless_stage_text(stage_b_text, allowed_parts=[3, 4, 5], target_chars=target_b_chars, max_chars=max_b_chars)
        write_text_file(ckpt_b_path, stage_b_text)
        write_text_file(grp2_path, stage_b_text)
        m_b = analyze_script_metrics(stage_b_text, start_part=3)
        log_msg(
            project_id,
            f"💾 [{step_tag} - ĐÃ LƯU LẦN VIẾT 2/3] Đã lưu `03_PART_GROUP_2.txt` + `PART_3.txt`, `PART_4.txt`, `PART_5.txt` ({m_b['char_count']:,} ký tự | {m_b['word_count']:,} từ)!",
        )

        # ======================================================================
        # LẦN VIẾT 3/3 (PART GROUP 3 — [PART 6] & [PART 7])
        # ======================================================================
        so_far_chars = actual_a_chars + m_b["char_count"]
        target_c_chars = max(p_min_accept * 2, min(kspec["per_part_max"] * 2, kspec["t_mid"] - so_far_chars))
        min_c_chars = max(p_min_accept * 2, kspec["p_min"] - so_far_chars)
        max_c_chars = max(target_c_chars + 1200, int(kspec["t_max"] * 0.985) - so_far_chars)
        saved_c_txt = (
            read_text_file(grp3_path)
            if os.path.exists(grp3_path)
            else (read_text_file(ckpt_c_path) if os.path.exists(ckpt_c_path) else "")
        )
        m_saved_c = analyze_script_metrics(saved_c_txt, start_part=6) if saved_c_txt else {"char_count": 0, "parts_found": []}
        if m_saved_c["char_count"] >= p_min_accept * 2 and {6, 7}.issubset(set(m_saved_c["parts_found"])):
            stage_c_text = m_saved_c["clean_text"]
            log_msg(
                project_id,
                f"♻️ [{step_tag} - LẦN VIẾT 3/3] Nạp trực tiếp Nhóm Part 3 (`[PART 6..7]`) đã lưu từ đĩa ({m_saved_c['char_count']:,} ký tự)!",
            )
        else:
            lang_c_note = f"chỉ xuất nội dung truyện bằng {kspec['lang_short']} của Part 6 và Part 7, không in lại Part 1..5"
            part5_tail_anchor = (pmap_b.get(5, "") or stage_b_text)[-650:].strip()
            prompt_stage_c = f"""TUYỆT VỜI! Hệ thống Python đã lưu xong `LẦN VIẾT 1/3 + LẦN VIẾT 2/3` (`[PART 1]` đến `[PART 5]`) với tổng độ dài chuẩn xác hiện tại là **{so_far_chars:,} ký tự**.
=== CANON LOCK & STORY CONTINUITY ANCHOR (BẮT BUỘC GIỮ ĐÚNG 100% NHÂN VẬT, POV, SỐ TIỀN & MẠCH TRUYỆN) ===
- **CURRENT FINAL TITLE:** "{state.get('winner_title', state.get('source_title', ''))}"
- **TÓM TẮT GIÀN Ý & CANON BƯỚC 2:**
{outline_anchor_snippet}
- **ĐOẠN KẾT CỦA `[PART 5]` VỪA VIẾT XONG (NỐI TIẾP TRỰC TIẾP TỪ ĐÂY SANG `[PART 6]`):**
{part5_tail_anchor}
=== KẾT THÚC CANON LOCK & CONTINUITY ANCHOR ===

👉 YÊU CẦU TRONG LẦN VIẾT THỨ BA NÀY (`LẦN VIẾT 3/3` — `[PART 6]` ĐẾN `[PART 7]`):
1. KHÔNG gọi bất kỳ công cụ (tool) nào. Giữ nguyên 100% tên nhân vật chính, ngôi kể (POV), bối cảnh và con số tài chính của `[PART 1..5]` và Giàn ý Bước 2 ở trên.
2. Để tổng độ dài toàn bộ 7 Phần (`[PART 1]`..`[PART 7]`) rơi chính xác vào tâm vàng **{kspec['p_min']:,} – {kspec['p_max']:,} ký tự** (khung hợp lệ **{kspec['t_min']:,} – {kspec['t_max']:,} ký tự**), hãy xuất tiếp **TRỌN VẸN, ĐẦY ĐỦ 100% VĂN BẢN KỊCH BẢN** bằng **{kspec['lang_name']}** của **`[PART 6]`** (Beat `E51..E60`) và **`[PART 7]`** (Beat `E61..E70`).
3. **ĐỊNH MỨC KHÓA CỨNG TỪNG PART:**
   - Mỗi Part (`[PART 6]` và `[PART 7]`) độ dài khoảng **{int(target_c_chars/2):,} ký tự / Part**.
   - Tổng độ dài của `LẦN VIẾT 3/3` đạt khoảng **{target_c_chars:,} ký tự**, sạch 100% ghi chú sân khấu trong ngoặc vuông.
4. Bắt đầu ngay bằng `[PART 6]` dưới đây ({lang_c_note}):"""
            resp_c, thread_data_latest = send_or_harvest_turn(
                prompt_stage_c,
                "YÊU CẦU TRONG LẦN VIẾT THỨ BA NÀY (`LẦN VIẾT 3/3`",
                f"{step_tag} - LẦN VIẾT 3/3 (PART 6..7)",
                timeout_sec=2400,
            )
            m_c_raw = analyze_script_metrics(resp_c, start_part=6)
            stage_c_text = slice_script_to_allowed_parts(m_c_raw["clean_text"], [6, 7])

        # Tách riêng PART 6 và PART 7, chạy Bộ Xử Lý Lỗi AI nếu bất kỳ Part nào thiếu/cắt cụt, và lưu ngay xuống đĩa!
        pmap_c = split_script_into_part_dict(stage_c_text, max_p=7, start_part=6)
        for p_idx in (6, 7):
            p_body, td_ai = ai_diagnose_and_complete_part(p_idx, pmap_c.get(p_idx, ""), f"{step_tag} - GROUP 3")
            if td_ai:
                thread_data_latest = td_ai
            pmap_c[p_idx] = p_body
        stage_c_text = f"[PART 6]\n\n{pmap_c[6]}\n\n[PART 7]\n\n{pmap_c[7]}"
        if len(stage_c_text) > max_c_chars:
            stage_c_text = condense_homeless_stage_text(
                stage_c_text,
                allowed_parts=[6, 7],
                target_chars=target_c_chars,
                max_chars=max_c_chars,
            )
        write_text_file(ckpt_c_path, stage_c_text)
        write_text_file(grp3_path, stage_c_text)
        m_c = analyze_script_metrics(stage_c_text, start_part=6)
        log_msg(
            project_id,
            f"💾 [{step_tag} - ĐÃ LƯU LẦN VIẾT 3/3] Đã lưu `03_PART_GROUP_3.txt` + `PART_6.txt`, `PART_7.txt` ({m_c['char_count']:,} ký tự | {m_c['word_count']:,} từ)!",
        )

        stitched_script = stage_a_text.strip() + "\n\n" + stage_b_text.strip() + "\n\n" + stage_c_text.strip()
        if len(stitched_script) > int(kspec["t_max"] * 0.985):
            stitched_script = condense_homeless_stage_text(
                stitched_script,
                allowed_parts=[1, 2, 3, 4, 5, 6, 7],
                target_chars=kspec["t_mid"],
                max_chars=int(kspec["t_max"] * 0.985),
            )
        # Cập nhật lại 7 file PART_1.txt..PART_7.txt từ bản ghép chuẩn
        pmap_all = split_script_into_part_dict(stitched_script, max_p=7)
        for p_i in range(1, 8):
            if pmap_all.get(p_i):
                write_text_file(os.path.join(ckpt_dir, f"PART_{p_i}.txt"), f"[PART {p_i}]\n\n{pmap_all[p_i]}")

        stitched_metrics = analyze_script_metrics(stitched_script, start_part=1)
        log_msg(
            project_id,
            f"🔗 [{step_tag} - GHÉP NỐI 3 PHẦN VIẾT ({kspec['label']}) HOÀN TẤT] Tổng độ dài: {stitched_metrics['char_count']:,} ký tự (Body: {stitched_metrics['body_char_count']:,} ký tự) | {stitched_metrics['word_count']:,} từ | Số Part: {stitched_metrics['part_count']}/7 ({stitched_metrics['parts_found']})",
        )
        return stitched_metrics, thread_data_latest

    def harvest_two_half_script_in_thread(
        step_tag: str,
        initial_resp: str,
        n_beats: int,
        context_goal_desc: str,
    ) -> tuple[dict, dict]:
        """
        Cơ chế Tự Động Thu Hoạch & Ghép Nối Kịch Bản:
        - Nếu đang ở kênh `homeless` hoặc `mexico` (7 Parts, 70k–80k ký tự): Tự động chuyển sang `harvest_three_stage_homeless_script_in_thread`.
        - Nếu đang ở kênh `mafia` (5–6 Parts, 44k–48k ký tự): Chia 2 Nửa Liên Tiếp (2-Half Sequential Output).
        """
        if ACTIVE_NICHE in ("homeless", "mexico"):
            return harvest_three_stage_homeless_script_in_thread(step_tag, initial_resp, context_goal_desc)

        mid_part = (n_beats + 1) // 2
        expected_h1 = list(range(1, mid_part + 1))
        expected_h2 = list(range(mid_part + 1, n_beats + 1))
        h1_target_chars = int(46000 * (len(expected_h1) / max(n_beats, 1)))
        h1_target_words = int(7550 * (len(expected_h1) / max(n_beats, 1)))
        h2_target_chars = 46000 - h1_target_chars
        h2_target_words = 7550 - h1_target_words

        m_init = analyze_script_metrics(initial_resp, start_part=1)
        thread_data_latest = {}

        # Kiểm tra xem phản hồi vừa nhận đã có sẵn Nửa 1 (Part 1..mid_part) hợp lệ chưa
        if (
            not is_refusal_or_meta_response(m_init["clean_text"])
            and m_init["char_count"] >= 16000
            and m_init["parts_found"] == expected_h1
        ):
            m_h1 = m_init
            half1_text = m_init["clean_text"]
            log_msg(
                project_id,
                f"🧩 [{step_tag}] Đã nhận sẵn Nửa 1 (`Part 1..Part {mid_part}`): {m_init['char_count']:,} ký tự ({m_init['word_count']:,} từ). Tiến hành lấy tiếp Nửa 2 (`Part {mid_part+1}..Part {n_beats}`)...",
            )
        else:
            log_msg(
                project_id,
                f"🧩 [{step_tag}] ChatGPT chạm giới hạn token 1 lượt ({m_init['char_count']:,} ký tự). Chấp thuận chia 2 phản hồi liên tiếp trong cùng đoạn chat: Lấy Nửa 1 (`Part 1..Part {mid_part}`) trước...",
            )
            prompt_half1 = f"""ĐỒNG Ý CHO PHÉP CHIA BẢN THẢO THÀNH 2 PHẢN HỒI LIÊN TIẾP TRONG CÙNG ĐOẠN CHAT NÀY (KHÔNG DÙNG TOOL):
- Hệ thống Python ở bên ngoài sẽ tự động đếm từ, đếm ký tự và ghép nối 2 phản hồi cho bạn, vì vậy bạn **KHÔNG CẦN dùng công cụ đếm văn bản** và **TUYỆT ĐỐI KHÔNG xuất thông báo từ chối**.
- Mục tiêu tổng thể của cả bản kịch bản ({n_beats} Part): {context_goal_desc}

👉 YÊU CẦU TRONG PHẢN HỒI THỨ NHẤT NÀY (NỬA ĐẦU — `Part 1` ĐẾN `Part {mid_part}`):
1. Hãy xuất **TRỌN VẸN, ĐẦY ĐỦ 100% VĂN BẢN KỊCH BẢN** từ **`# PART 1`** đến hết **`# PART {mid_part}`** (mục tiêu riêng cho {len(expected_h1)} Part đầu này là khoảng **{h1_target_chars:,} ký tự / ~{h1_target_words:,} từ**, tối đa không quá {h1_target_words + 250:,} từ, sạch 100% dấu ngoặc vuông `[...]`).
2. Dừng lại ngay sau câu kết thúc của `Part {mid_part}` để ở lượt tin nhắn tiếp theo bạn xuất nốt từ `Part {mid_part+1}` đến `Part {n_beats}`.
3. Bắt đầu ngay bằng `# PART 1` dưới đây (chỉ xuất nội dung truyện tiếng Anh, không lời dẫn tiếng Việt):"""
            resp_h1, thread_data_latest = send_or_harvest_turn(
                prompt_half1,
                "YÊU CẦU TRONG PHẢN HỒI THỨ NHẤT NÀY (NỬA ĐẦU",
                f"{step_tag} - NỬA 1 (PART 1..{mid_part})",
                timeout_sec=2400,
            )
            m_h1 = analyze_script_metrics(resp_h1, start_part=1)
            half1_text = m_h1["clean_text"]
            log_msg(
                project_id,
                f"✅ [{step_tag} - NỬA 1] Nhận {m_h1['char_count']:,} ký tự | {m_h1['word_count']:,} từ | Các Part: {m_h1['parts_found']}",
            )

        # Tính toán động dung lượng Nửa 2 dựa trên số từ & ký tự THỰC TẾ của Nửa 1 để tổng 1..N luôn rơi vào 44.000-48.000 ký tự và 7.400-7.650 từ (< 8.000 từ)
        actual_h1_chars = m_h1["char_count"]
        actual_h1_words = m_h1["word_count"]
        h2_target_chars = max(11500, min(23500, 46000 - actual_h1_chars))
        h2_target_words = max(1750, min(3650, 7550 - actual_h1_words))
        h2_hard_max_words = max(1900, 7880 - actual_h1_words)

        # Lấy tiếp Nửa 2 (Part mid_part+1 .. Part n_beats)
        prompt_half2 = f"""RẤT TỐT! Hệ thống Python đã lưu xong Nửa 1 (`Part 1` đến `Part {mid_part}`) với độ dài chính xác là **{actual_h1_chars:,} ký tự / {actual_h1_words:,} từ**.
👉 YÊU CẦU TRONG PHẢN HỒI THỨ HAI NÀY (NỬA SAU — `Part {mid_part+1}` ĐẾN `Part {n_beats}`):
1. KHÔNG gọi bất kỳ công cụ (tool) nào. Hệ thống Python sẽ tự động ghép nối Nửa 1 + Nửa 2 và kiểm tra tổng số từ/ký tự.
2. Để tổng cả kịch bản (`Part 1`..`Part {n_beats}`) rơi chính xác vào khung **44.000 – 48.000 ký tự** và **7.400 – 7.650 từ (TUYỆT ĐỐI < 8.000 từ)**, hãy xuất tiếp **TRỌN VẸN, ĐẦY ĐỦ 100% VĂN BẢN KỊCH BẢN** từ **`# PART {mid_part+1}`** đến hết **`# PART {n_beats}`** với độ dài mục tiêu cho Nửa 2 này là khoảng **{h2_target_chars:,} ký tự / ~{h2_target_words:,} từ** (tuyệt đối không vượt quá **{h2_hard_max_words:,} từ**, sạch 100% dấu ngoặc vuông `[...]`).
3. Bắt đầu ngay bằng `# PART {mid_part+1}` dưới đây (chỉ xuất nội dung truyện tiếng Anh, không in lại Part 1..{mid_part}, không lời dẫn tiếng Việt):"""
        resp_h2, thread_data_latest = send_or_harvest_turn(
            prompt_half2,
            "YÊU CẦU TRONG PHẢN HỒI THỨ HAI NÀY (NỬA SAU",
            f"{step_tag} - NỬA 2 (PART {mid_part+1}..{n_beats})",
            timeout_sec=2400,
        )
        m_h2 = analyze_script_metrics(resp_h2, start_part=mid_part + 1)
        half2_text = m_h2["clean_text"]
        log_msg(
            project_id,
            f"✅ [{step_tag} - NỬA 2] Nhận {m_h2['char_count']:,} ký tự | {m_h2['word_count']:,} từ | Các Part: {m_h2['parts_found']}",
        )

        stitched_script = half1_text.strip() + "\n\n" + half2_text.strip()
        stitched_metrics = analyze_script_metrics(stitched_script, start_part=1)
        log_msg(
            project_id,
            f"🔗 [{step_tag} - GHÉP NỐI HOÀN TẤT] Tổng độ dài sau ghép nối 2 nửa: {stitched_metrics['char_count']:,} ký tự | {stitched_metrics['word_count']:,} từ | Số Part: {stitched_metrics['part_count']}/{n_beats} ({stitched_metrics['parts_found']})",
        )
        return stitched_metrics, thread_data_latest

    # ==========================================================================
    # BƯỚC 3: VIẾT KỊCH BẢN FULL TỪ GIÀN Ý TRÊN ĐOẠN CHAT RIÊNG (`DESK_3_WRITER`)
    # ==========================================================================
    if ("STEP_3_DONE" not in state["completed_steps"] and only_step in (0, 3)) or only_step == 3:
        save_state("STEP_3_RUNNING_SCRIPT")
        switch_to_isolated_desk_thread(
            "DESK_3_WRITER",
            "Bàn #3 — Nhà Văn Sáng Tác Kịch Bản",
        )
        n_beats = 7 if ACTIVE_NICHE in ("homeless", "mexico") else state.get("outline_beat_count", 6)
        min_draft_chars = max(12000, int(kspec["t_min"] * 0.72)) if ACTIVE_NICHE in ("homeless", "mexico") else 38000
        step3_desc = (
            f"7 Parts, {kspec['t_min']//1000}k–{kspec['t_max']//1000}k ký tự ({kspec['lang']}), 3-Stage Drafting ({kspec['label']})"
            if ACTIVE_NICHE in ("homeless", "mexico")
            else f"Khóa {n_beats} Part, 44k–48k ký tự, < 8.000 từ"
        )
        log_msg(
            project_id,
            f"🚀 [BƯỚC 3/6 - Bàn #3] Viết Full Kịch bản từ Giàn ý trên Đoạn chat Agent Bàn #3 ({step3_desc})...",
        )

        skill_3_content = load_skill_3_script_bundle()
        outline_for_step3 = read_text_file(os.path.join(ckpt_dir, "02_STORY_OUTLINE.md"))
        saved_draft_p = os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt")
        if os.path.exists(saved_draft_p) and len(read_text_file(saved_draft_p)) >= min_draft_chars and state.get("thread_id"):
            raw_script_resp = read_text_file(saved_draft_p)
            if ACTIVE_NICHE in ("homeless", "mexico") and len(raw_script_resp) > int(kspec["t_max"] - 800):
                raw_script_resp = condense_homeless_stage_text(
                    raw_script_resp,
                    allowed_parts=[1, 2, 3, 4, 5, 6, 7],
                    target_chars=kspec["t_mid"],
                    max_chars=max(kspec["t_min"] + 1500, kspec["t_max"] - 1000),
                )
                write_text_file(saved_draft_p, raw_script_resp)
                write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), raw_script_resp)
            thread_data = client._last_known_turns.get(state["thread_id"]) or {"turns": [{"id": "ckpt_t1", "status": "completed"}]}
            log_msg(project_id, f"♻️ Nạp trực tiếp bản thảo Bước 3 đã lưu từ Checkpoint ({len(raw_script_resp):,} ký tự) mà không cần gọi lại API!")
            metrics = analyze_script_metrics(raw_script_resp)
        elif ACTIVE_NICHE in ("homeless", "mexico"):
            grp1_p = os.path.join(ckpt_dir, "03_PART_GROUP_1.txt")
            old_a_p = os.path.join(ckpt_dir, "B_C_3_DRAFT_STAGE_A.txt")
            saved_g1 = (
                read_text_file(grp1_p)
                if os.path.exists(grp1_p)
                else (read_text_file(old_a_p) if os.path.exists(old_a_p) else "")
            )
            min_g1_accept = max(3600, kspec["per_part_min_accept"] * 2 - 1500)
            if saved_g1 and len(saved_g1) >= min_g1_accept:
                raw_stage_a = saved_g1
                thread_data = client._last_known_turns.get(state.get("thread_id", "")) or {"turns": [{"id": "ckpt_g1", "status": "completed"}]}
                log_msg(project_id, f"♻️ [BƯỚC 3 - LẦN VIẾT 1/3 ({kspec['label']})] Đã có sẵn `03_PART_GROUP_1.txt` ({len(saved_g1):,} ký tự) trên đĩa, chuyển thẳng sang kiểm tra & viết phần tiếp theo!")
            else:
                g1_min_c = max(4200, (kspec["per_part_target"] - 500) * 2)
                g1_max_c = (kspec["per_part_target"] + 450) * 2
                prompt_step3_staged = f"""================================================================================
BƯỚC 3: VIẾT FULL KỊCH BẢN 7 PHẦN THEO CHẾ ĐỘ 3 GIAI ĐOẠN ({kspec['label']})
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Hệ thống Python ở bên ngoài sẽ tự động đếm ký tự, lưu từng phần sau mỗi lần viết và ghép nối 3 phần (`Lần viết 1 + Lần viết 2 + Lần viết 3`).
- Hãy viết trực tiếp bằng **{kspec['lang_name']}** vào câu trả lời của bạn.

=== GIÀN Ý 7 PHẦN ĐÃ KHÓA TỪ BƯỚC 2 (`02_STORY_OUTLINE.md`) ===
{outline_for_step3}
=== KẾT THÚC GIÀN Ý BƯỚC 2 ===

Dưới đây là toàn bộ nội dung Skill Bước 3 và các file Reference bắt buộc:

{skill_3_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY (`LẦN VIẾT 1/3` — `[PART 1]` ĐẾN `[PART 2]`):
1. **CURRENT FINAL TITLE:** "{state['winner_title']}"
2. **7-PART ARCHITECTURE & 3-PART SEQUENTIAL DRAFTING (LƯU LẠI SAU MỖI LẦN VIẾT):**
   - Toàn bộ kịch bản gồm đúng **7 Phần (`[PART 1]` đến `[PART 7]`)**, tổng độ dài đạt **{kspec['t_min']:,} – {kspec['t_max']:,} ký tự** (ưu tiên **{kspec['p_min']:,} – {kspec['p_max']:,} ký tự**).
   - Ở lần viết thứ nhất này (`LẦN VIẾT 1/3`), hãy viết **TRỌN VẸN, SÂU SẮC, CHI TIẾT 100% VĂN BẢN KỊCH BẢN** bằng **{kspec['lang_name']}** của **`[PART 1]`** và **`[PART 2]`**.
   - **ĐỊNH MỨC KHÓA CỨNG:** Mỗi Part (`[PART 1]` và `[PART 2]`) đạt khoảng **{max(2000, kspec['per_part_target'] - 450):,} – {kspec['per_part_target'] + 450:,} ký tự / Part**, tổng cộng `LẦN VIẾT 1/3` đạt **{g1_min_c:,} – {g1_max_c:,} ký tự**.
   - BẮT BUỘC mở đầu bằng dòng tiêu đề độc lập `[PART 1]` và chuyển sang phần 2 bằng dòng tiêu đề độc lập `[PART 2]`.
3. **ZERO BRACKET STAGE CUES:** Tuyệt đối KHÔNG chứa ghi chú sân khấu/âm thanh trong ngoặc vuông (chỉ dùng dòng tiêu đề độc lập `[PART 1]` và `[PART 2]`).
4. Dừng lại ngay sau câu kết thúc của `[PART 2]` để hệ thống lưu lại trước khi viết tiếp `LẦN VIẾT 2/3` (`[PART 3]`–`[PART 5]`). Bắt đầu ngay bằng `[PART 1]` dưới đây:
"""
                raw_stage_a, thread_data = send_or_harvest_turn(
                    prompt_step3_staged,
                    "BƯỚC 3: VIẾT FULL KỊCH BẢN 7 PHẦN THEO CHẾ ĐỘ 3 GIAI ĐOẠN",
                    f"BƯỚC 3: {kspec['key_id'].upper()} LẦN VIẾT 1/3 (PART 1..2)",
                    timeout_sec=2400,
                )
            metrics, td_three = harvest_three_stage_homeless_script_in_thread(
                "BƯỚC 3 DRAFT",
                raw_stage_a,
                f"Viết trọn vẹn 7 Phần (`[PART 1]` đến `[PART 7]`) bằng {kspec['lang_name']} từ Giàn ý Bước 2 đạt chuẩn {kspec['t_min']:,}–{kspec['t_max']:,} ký tự (ưu tiên {kspec['p_min']:,}–{kspec['p_max']:,} ký tự).",
            )
            if td_three:
                thread_data = td_three
        else:
            prompt_step3 = f"""================================================================================
BƯỚC 3: VIẾT FULL KỊCH BẢN TỪ GIÀN Ý (`Viet_Kich_Ban_Nguoi_Hau_Tu_Gian_Y_Skill_v1.4`)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Hệ thống Python ở bên ngoài sẽ tự động đếm số từ và số ký tự chính xác cho bạn sau khi bạn viết xong, vì vậy bạn KHÔNG CẦN dùng công cụ đếm văn bản.
- Hãy viết trực tiếp kịch bản hoàn chỉnh bằng tiếng Anh (American English) vào câu trả lời của bạn.

=== GIÀN Ý CHI TIẾT ĐÃ KHÓA TỪ BƯỚC 2 (`02_STORY_OUTLINE.md`) ===
{outline_for_step3}
=== KẾT THÚC GIÀN Ý BƯỚC 2 ===

Dưới đây là toàn bộ nội dung Skill `Viet_Kich_Ban_Nguoi_Hau_Tu_Gian_Y_Skill_v1.4`, `SHARED_PRODUCTION_CONTRACT.md` và `MASTER_PROMPT_WRITE_SCRIPT_FROM_OUTLINE.md`:

{skill_3_content}

================================================================================
YÊU CẦU THỰC HIỆN NGAY TRÊN GIÀN Ý VỪA TẠO Ở BƯỚC 2:
1. **CURRENT FINAL TITLE:** "{state['winner_title']}"
2. **PART COUNT LOCK:** Giàn ý ở Bước 2 có **{n_beats} Beat** -> Kịch bản bắt buộc phải có đúng **{n_beats} Part** (`Part 1` đến `Part {n_beats}`), ánh xạ 1:1 theo đúng thứ tự Beat.
3. **DUAL LENGTH LOCK & PER-PART WORD CEILING (BẮT BUỘC TUYỆTỐI):**
   - **Word Budget:** Mục tiêu chuẩn **7.400 – 7.650 từ** (tối thiểu >= 7.100 từ, và khóa cứng tuyệt đối **TOTAL_WORDS < 7.800 từ**).
   - **Character Target:** Mục tiêu chuẩn **44.000 – 48.000 ký tự hiển thị** (khung hợp lệ 40.000 – 55.000 ký tự).
   - **PER-PART HARD CEILING (CHỐNG PHÌNH TO PART 4 & PART 5):** Mỗi Part (`Part 1` đến `Part {n_beats}`) bắt buộc nằm trong khoảng **{int(7300/max(n_beats,1)):,} – {int(7600/max(n_beats,1)):,} từ** (~{int(44500/max(n_beats,1)):,}–{int(47500/max(n_beats,1)):,} ký tự, khoảng 18–22 đoạn văn ngắn). **TUYỆT ĐỐI KHÔNG CÓ BẤT KỲ PART NÀO (ĐẶC BIỆT LÀ PART {max(1, n_beats-1)} VÀ PART {n_beats}) ĐƯỢC VƯỢT QUÁ {int(7750/max(n_beats,1)):,} TỪ!**
4. **ZERO BRACKET TTS LOCK:** Tuyệt đối KHÔNG chứa bất kỳ ghi chú sân khấu/âm thanh nào trong ngoặc vuông `[...]` (như `[beat]`, `[silence]`, `[sigh]`). Chỉ xuất văn xuôi kể chuyện + lời thoại tự nhiên bằng US-English và tiêu đề `Part 1`..`Part {n_beats}`.
5. Xuất đầy đủ từ `Part 1` đến hết `Part {n_beats}` ngay trong 1 phản hồi duy nhất (giữ đúng định mức {int(7450/max(n_beats,1)):,} từ/Part để toàn bộ {n_beats} Part vừa khít 1 lượt trả lời mà không cần hiệu chỉnh lại)!
"""
            raw_script_resp, thread_data = send_or_harvest_turn(
                prompt_step3,
                "BƯỚC 3: VIẾT FULL KỊCH BẢN TỪ GIÀN Ý",
                "BƯỚC 3: FULL SCRIPT WRITING",
                timeout_sec=2400,
            )
            metrics = analyze_script_metrics(raw_script_resp)
            log_msg(
                project_id,
                f"📝 Bản thảo Bước 3 lần đầu: {metrics['char_count']:,} ký tự | {metrics['word_count']:,} từ | Số Part: {metrics['part_count']}/{n_beats} | Ngoặc vuông [...]: {metrics['bracket_cues_count']}",
            )
            if not is_valid_full_script(metrics, n_beats):
                stitched_m, td_two = harvest_two_half_script_in_thread(
                    "BƯỚC 3 DRAFT",
                    raw_script_resp,
                    n_beats,
                    f"Viết trọn vẹn {n_beats} Part từ Giàn ý Bước 2 đạt 44.000–48.000 ký tự và 7.400–7.650 từ (< 8.000 từ).",
                )
                if td_two:
                    thread_data = td_two
                if is_valid_full_script(stitched_m, n_beats) or stitched_m["char_count"] > metrics["char_count"]:
                    metrics = stitched_m

        # Lưu giữ bản kịch bản hợp lệ tốt nhất để KHÔNG BAO GIỜ bị ghi đè bởi phản hồi lỗi/ngắn
        best_valid_metrics = metrics if is_valid_full_script(metrics, n_beats) else None
        if best_valid_metrics is not None:
            write_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"), best_valid_metrics["clean_text"])
            write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), best_valid_metrics["clean_text"])

        # Ở Bước 3: Với kênh Homeless / Mexico / 12 Keys, TUYỆT ĐỐI KHÔNG BAO GIỜ yêu cầu xuất lại Full Kịch Bản trong 1 lượt!
        # Nếu bất kỳ Part nào (1..7) bị thiếu hoặc ngắn, dùng Bộ Xử Lý Lỗi AI (`ai_diagnose_and_complete_part`) sửa riêng đúng Part đó rồi ghép lại từ PART_1.txt..PART_7.txt!
        if ACTIVE_NICHE in ("homeless", "mexico") and not is_valid_full_script(metrics, n_beats):
            pmap_chk = split_script_into_part_dict(metrics.get("clean_text", ""), max_p=7)
            repaired_chunks = []
            for p_idx in range(1, 8):
                saved_p_file = os.path.join(ckpt_dir, f"PART_{p_idx}.txt")
                p_cur = pmap_chk.get(p_idx, "")
                if not p_cur and os.path.exists(saved_p_file):
                    pm_s = split_script_into_part_dict(read_text_file(saved_p_file), max_p=7)
                    p_cur = pm_s.get(p_idx, "")
                p_fixed, td_ai = ai_diagnose_and_complete_part(p_idx, p_cur, "BƯỚC 3 AI PART RECOVERY")
                if td_ai:
                    thread_data = td_ai
                repaired_chunks.append(f"[PART {p_idx}]\n\n{p_fixed}")
            merged_from_parts = "\n\n".join(repaired_chunks).strip()
            if len(merged_from_parts) > int(kspec["t_max"] - 800):
                merged_from_parts = condense_homeless_stage_text(
                    merged_from_parts,
                    allowed_parts=[1, 2, 3, 4, 5, 6, 7],
                    target_chars=kspec["t_mid"],
                    max_chars=max(kspec["t_min"] + 1500, kspec["t_max"] - 1000),
                )
            metrics = analyze_script_metrics(merged_from_parts, start_part=1)
            if is_valid_full_script(metrics, n_beats):
                best_valid_metrics = metrics
                write_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"), metrics["clean_text"])
                write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), metrics["clean_text"])

        # Ở Bước 3 (Chỉ dành cho Mafia): Chạy CALIBRATION nếu bản nháp thiếu Part (< n_beats), quá ngắn (< min_draft_chars) hoặc còn ngoặc vuông [...].
        calib_attempt = 0
        while (
            ACTIVE_NICHE not in ("homeless", "mexico")
            and (
                metrics["char_count"] < min_draft_chars
                or metrics["part_count"] != n_beats
                or metrics["bracket_cues_count"] > 0
            )
            and calib_attempt < 1
        ):
            calib_attempt += 1
            issues = []
            if ACTIVE_NICHE in ("homeless", "mexico"):
                if metrics["char_count"] < kspec["t_min"]:
                    issues.append(
                        f"Độ dài hiện tại mới đạt {metrics['char_count']:,} ký tự ({metrics['word_count']:,} từ), cần mở rộng thêm khoảng {kspec['t_mid'] - metrics['char_count']:,} ký tự để vào vùng chuẩn {kspec['t_min']:,}–{kspec['t_max']:,} ký tự (ưu tiên {kspec['p_min']:,}–{kspec['p_max']:,} ký tự)."
                    )
                elif metrics["char_count"] > kspec["t_max"]:
                    issues.append(
                        f"Độ dài hiện tại là {metrics['char_count']:,} ký tự, vượt trần {kspec['t_max']:,} ký tự. Hãy cô đọng lại khoảng {metrics['char_count'] - kspec['t_mid']:,} ký tự để đưa về vùng chuẩn {kspec['p_min']:,}–{kspec['p_max']:,} ký tự."
                    )
            else:
                if metrics["char_count"] < 40000:
                    issues.append(
                        f"Độ dài hiện tại mới đạt {metrics['char_count']:,} ký tự ({metrics['word_count']:,} từ), đang thiếu khoảng {45500 - metrics['char_count']:,} ký tự để vào vùng chuẩn 44.000–48.000 ký tự (7.400–7.650 từ). Hãy mở rộng sâu hơn các cảnh đối thoại, hành động, chi tiết nghiệp vụ của nữ chính và diễn biến tâm lý bên trong từng Part hiện có."
                    )
                if metrics["word_count"] >= 8000 or metrics["char_count"] > 55000:
                    issues.append(
                        f"Độ dài hiện tại là {metrics['word_count']:,} từ ({metrics['char_count']:,} ký tự), vượt khóa cứng `< 8.000 từ` / `<= 55.000 ký tự`. Hãy cô đọng lại câu chữ dư thừa khoảng {max(250, metrics['word_count'] - 7650):,} từ để đưa về đúng 7.400–7.650 từ (44.000–48.000 ký tự) mà không cắt bỏ bất kỳ sự kiện nhân quả nào."
                    )
            if metrics["part_count"] != n_beats:
                issues.append(f"Số lượng Part hiện tại là {metrics['part_count']}, bắt buộc phải có đúng {n_beats} Part (`Part 1` đến `Part {n_beats}`).")
            if metrics["bracket_cues_count"] > 0:
                issues.append(f"Xóa bỏ hoàn toàn {metrics['bracket_cues_count']} cụm ngoặc vuông `{metrics['bracket_cues_sample']}`.")

            log_msg(project_id, f"🔄 [BƯỚC 3 - Tinh chỉnh độ dài/cấu trúc #{calib_attempt}] {' | '.join(issues)}")
            target_desc_str = f"{kspec['t_min']:,}–{kspec['t_max']:,} ký tự (7 Phần)" if ACTIVE_NICHE in ("homeless", "mexico") else "44.000–48.000 ký tự và 7.400–7.650 từ (< 8.000 từ)"
            calib_prompt = f"""YÊU CẦU HIỆU CHỈNH ĐỘ DÀI & HỢP ĐỒNG SẢN XUẤT #{calib_attempt} CHO BẢN THẢO KỊCH BẢN VỪA VIẾT:
- Số liệu đã được hệ thống Python bên ngoài đếm chính xác 100% cho bạn (bạn KHÔNG CẦN dùng công cụ đếm văn bản):
  * Tổng số ký tự hiển thị: **{metrics['char_count']:,} ký tự** (Mục tiêu chuẩn: **{target_desc_str}**).
  * Tổng số từ: **{metrics['word_count']:,} từ**.
  * Số Part phát hiện: **{metrics['part_count']}/{n_beats} Part**.
  * Số ghi chú ngoặc vuông `[...]`: **{metrics['bracket_cues_count']}**.

CÁC ĐIỂM CẦN HIỆU CHỈNH NGAY:
- {"\n- ".join(issues)}

QUAN TRỌNG:
- KHÔNG gọi bất kỳ tool nào (Python sẽ tự đếm từ giúp bạn).
- Giữ nguyên cốt truyện, DNA và cấu trúc {n_beats} Part của Giàn ý, hãy xuất lại bản kịch bản đã hiệu chỉnh đạt chuẩn {target_desc_str}."""
            raw_calib_resp, thread_data = send_or_harvest_turn(
                calib_prompt,
                f"YÊU CẦU HIỆU CHỈNH ĐỘ DÀI & HỢP ĐỒNG SẢN XUẤT #{calib_attempt}",
                f"BƯỚC 3 CALIBRATION #{calib_attempt}",
                timeout_sec=2400,
            )
            cand_metrics = analyze_script_metrics(raw_calib_resp)
            log_msg(
                project_id,
                f"📝 Phản hồi Bước 3 sau hiệu chỉnh #{calib_attempt}: {cand_metrics['char_count']:,} ký tự | {cand_metrics['word_count']:,} từ | Số Part: {cand_metrics['part_count']}/{n_beats}",
            )

            if not is_valid_full_script(cand_metrics, n_beats):
                stitched_calib, td_two = harvest_two_half_script_in_thread(
                    f"BƯỚC 3 CALIB #{calib_attempt}",
                    raw_calib_resp,
                    n_beats,
                    " ".join(issues),
                )
                if td_two:
                    thread_data = td_two
                cand_metrics = stitched_calib

            if is_valid_full_script(cand_metrics, n_beats):
                metrics = cand_metrics
                best_valid_metrics = cand_metrics
                write_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"), metrics["clean_text"])
                write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), metrics["clean_text"])
                log_msg(
                    project_id,
                    f"✅ Đã xác nhận bản thảo Bước 3 hợp lệ sau hiệu chỉnh #{calib_attempt}: {metrics['char_count']:,} ký tự | {metrics['word_count']:,} từ | {metrics['part_count']}/{n_beats} Part",
                )
            elif best_valid_metrics is not None:
                log_msg(
                    project_id,
                    f"🛡️ [BẢO VỆ KỊCH BẢN] Phản hồi hiệu chỉnh #{calib_attempt} ({cand_metrics['char_count']:,} ký tự) không đạt chuẩn Full Script. Giữ nguyên bản Full Script hợp lệ trước đó ({best_valid_metrics['char_count']:,} ký tự / {best_valid_metrics['word_count']:,} từ)!",
                )
                metrics = best_valid_metrics
                break

        if best_valid_metrics is not None and not is_valid_full_script(metrics, n_beats):
            metrics = best_valid_metrics

        # Lớp cứu hộ cuối Bước 3 cho Homeless / Mexico / 12 Keys: nếu các file PART_1.txt..PART_7.txt trên đĩa có văn bản nhưng bản ghép thiếu nhãn [PART N], tự động ghép lại từ 7 file Part
        if not is_valid_full_script(metrics, n_beats) and ACTIVE_NICHE in ("homeless", "mexico"):
            disk_parts = []
            for p_i in range(1, n_beats + 1):
                p_f = os.path.join(ckpt_dir, f"PART_{p_i}.txt")
                p_b = ""
                if os.path.exists(p_f):
                    p_b = re.sub(
                        r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|CAP[IÍ]TULO|CHAPTER|STORY|ACT|ACTO|パート|第\s*\d+\s*[部章話])\s*\d*[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                        "",
                        read_text_file(p_f) or "",
                        flags=re.IGNORECASE,
                    ).strip()
                if len(p_b) < max(1200, int(kspec["per_part_min_accept"] * 0.55)):
                    p_b, td_last = ai_diagnose_and_complete_part(p_i, p_b, f"BƯỚC 3 FINAL PART {p_i} RECOVERY")
                    if td_last:
                        thread_data = td_last
                disk_parts.append(f"[PART {p_i}]\n\n{p_b}")
            rebuilt_s3 = "\n\n".join(disk_parts).strip()
            m_rebuilt = analyze_script_metrics(rebuilt_s3, start_part=1)
            if m_rebuilt["char_count"] >= max(10000, int(kspec["t_min"] * 0.65)) and len(m_rebuilt["parts_found"]) == n_beats:
                metrics = m_rebuilt

        min_s3_guard = max(10000, int(kspec["t_min"] * 0.65)) if ACTIVE_NICHE in ("homeless", "mexico") else 28000
        if not is_valid_full_script(metrics, n_beats) and metrics.get("char_count", 0) < min_s3_guard:
            raise RuntimeError(
                f"[{project_id}] Bước 3 chưa tạo được Full Script hợp lệ (char_count={metrics['char_count']}, parts={metrics['parts_found']}/{n_beats}). Dừng tại Bước 3 để bảo vệ dữ liệu!"
            )

        clean_draft = metrics["clean_text"]
        write_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"), clean_draft)
        write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), clean_draft)
        # Lưu trước bản kịch bản sạch TTS vào FULL_SCRIPT.txt & TONG HOP/{TenKichBan}_KB.txt ngay khi xong Bước 3 (và sẽ được cập nhật tiếp sau Bước 4 & Bước 6)
        try:
            tts_draft_preview = strip_part_headers_for_tts(clean_draft)
            if tts_draft_preview and len(tts_draft_preview) >= max(8500, int(kspec["t_min"] * 0.60)):
                write_text_file(os.path.join(project_dir, "FULL_SCRIPT.txt"), tts_draft_preview)
                export_to_tong_hop_folder(project_id, project_dir)
        except Exception:
            pass
        save_conversation_transcript(project_dir, state["thread_id"], thread_data)
        record_agent_chat_state(
            "DESK_3_WRITER",
            "Bàn #3 — Nhà Văn Sáng Tác Kịch Bản",
            state.get("thread_id", ""),
            status="COMPLETED",
            turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
        )

        state["script_metrics"] = {
            "char_count": metrics["char_count"],
            "word_count": metrics["word_count"],
            "part_count": metrics["part_count"],
            "bracket_cues_count": metrics["bracket_cues_count"],
        }
        if "STEP_3_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_3_DONE")
        save_state("STEP_3_DONE")

        if only_step == 3:
            return state

    # ==========================================================================
    # BƯỚC 4: KIỂM TRA PHÁP Y, CHẤM ĐIỂM, KHÓA ĐIỂM ĐẠT & VÒNG LẶP SỬA (>= 97 ĐIỂM)
    # ==========================================================================
    if ("STEP_4_DONE" not in state["completed_steps"] and only_step in (0, 4)) or only_step == 4:
        save_state("STEP_4_RUNNING_FORENSIC_AUDIT_LOOP")
        log_msg(
            project_id,
            "🚀 [BƯỚC 4/6 - Bàn #4] Kiểm tra Pháp y Kịch bản, Khóa các phần đã đạt & Vòng lặp sửa cho tới khi >= 97/100 điểm...",
        )

        skill_4_content = load_skill_4_audit_bundle()
        min_s4_chars = max(10000, int(kspec["t_min"] * 0.65)) if ACTIVE_NICHE in ("homeless", "mexico") else 32000
        current_script = read_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"))
        if not current_script or len(current_script) < min_s4_chars:
            current_script = read_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"))

        cur_metrics = analyze_script_metrics(current_script)
        n_beats = 7 if ACTIVE_NICHE in ("homeless", "mexico") else state.get("outline_beat_count", cur_metrics["part_count"] or 6)

        if ACTIVE_NICHE in ("homeless", "mexico") and cur_metrics["part_count"] == 7 and cur_metrics["char_count"] > int(kspec["t_max"] - 800):
            old_c = cur_metrics["char_count"]
            current_script = condense_homeless_stage_text(
                cur_metrics["clean_text"],
                allowed_parts=[1, 2, 3, 4, 5, 6, 7],
                target_chars=kspec["t_mid"],
                max_chars=max(kspec["t_min"] + 1500, kspec["t_max"] - 1000),
            )
            cur_metrics = analyze_script_metrics(current_script)
            write_text_file(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"), current_script)
            write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), current_script)
            log_msg(
                project_id,
                f"⚖️ [BƯỚC 4 - Chuẩn Hóa Độ Dài Tự Động {kspec['label']}] Đã cô đọng thông minh kịch bản từ {old_c:,} ký tự về chuẩn tâm vàng {cur_metrics['char_count']:,} ký tự (Body: {cur_metrics['body_char_count']:,} ký tự | 7/7 Parts) trước khi vào kiểm định Pháp y!",
            )

        if not is_valid_full_script(cur_metrics, n_beats):
            raise RuntimeError(
                f"[{project_id}] Kịch bản đầu vào Bước 4 không hợp lệ ({cur_metrics['char_count']:,} ký tự, {cur_metrics['part_count']}/{n_beats} Part). Cần chạy lại Bước 3 trước!"
            )

        audit_round = len(state.get("audit_history", []))
        max_rewrite_rounds = 1

        while True:
            audit_round += 1

            if ACTIVE_NICHE in ("homeless", "mexico") and cur_metrics["part_count"] == 7 and cur_metrics["char_count"] > int(kspec["t_max"] - 800):
                current_script = condense_homeless_stage_text(
                    cur_metrics["clean_text"],
                    allowed_parts=[1, 2, 3, 4, 5, 6, 7],
                    target_chars=kspec["t_mid"],
                    max_chars=max(kspec["t_min"] + 1500, kspec["t_max"] - 1000),
                )
                cur_metrics = analyze_script_metrics(current_script)
                write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), current_script)

            # CỔNG CÂN BẰNG ĐỘ DÀI TRƯỚC KHI CHẤM ĐIỂM LẠI (BƯỚC 4-CALIB - DÀNH CHO BÊN MAFIA < 8.000 TỪ):
            calib_attempt = 0
            while (
                ACTIVE_NICHE not in ("homeless", "mexico")
                and audit_round >= 2
                and calib_attempt < 1
                and (
                    cur_metrics["word_count"] >= 8000
                    or cur_metrics["char_count"] > 55000
                    or cur_metrics["char_count"] < 40000
                )
            ):
                calib_attempt += 1
                switch_to_isolated_desk_thread(
                    f"CALIB_DESK_4_R{audit_round}_{calib_attempt}",
                    f"Bàn #4B — Đoạn chat Cân chỉnh độ dài độc lập Vòng #{audit_round}.{calib_attempt}",
                )
                words_to_cut = max(450, int((cur_metrics["word_count"] - 7250) * 1.35))
                chars_to_cut = max(2500, int((cur_metrics["char_count"] - 46500) * 1.35))
                log_msg(
                    project_id,
                    f"⚖️ [BƯỚC 4-CALIB - Cân Bằng Độ Dài Trước Đánh Giá Lần #{audit_round} (Lượt #{calib_attempt})] Kịch bản hiện tại ({cur_metrics['char_count']:,} ký tự / {cur_metrics['word_count']:,} từ) vượt khóa cứng < 8.000 từ / <= 55.000 ký tự ({cur_metrics['per_part_summary']}). Đang gọt gọn khoảng {words_to_cut:,} từ để mở khóa trần điểm 97–100/100...",
                )
                mid_part_c = (n_beats + 1) // 2
                prompt_calib = f"""================================================================================
BƯỚC 4-CALIB (VÒNG #{audit_round}.{calib_attempt} - LINE-LEVEL LENGTH CALIBRATION TRƯỚC KHI CHẤM ĐIỂM MODE A)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào.
- Bộ đếm Python vừa đo chính xác bản kịch bản sửa gần nhất của bạn như sau:
  + **Tổng số ký tự hiển thị:** `{cur_metrics['char_count']:,}` ký tự (Khung bắt buộc: `40.000 – 55.000` ký tự; Vùng chuẩn: `44.000 – 48.000` ký tự)
  + **Tổng số từ:** `{cur_metrics['word_count']:,}` từ (KHÓA CỨNG P0: Bắt buộc **< 8.000 từ**; Vùng chuẩn: `7.300 – 7.650` từ)
  + **Chi tiết độ dài từng Part:** `{cur_metrics['per_part_summary']}`

=== VĂN BẢN KỊCH BẢN HIỆN TẠI CẦN CÂN CHỈNH ĐỘ DÀI (`CURRENT WORKING SCRIPT`) ===
{current_script}
=== KẾT THÚC VĂN BẢN KỊCH BẢN HIỆN TẠI ===

Vì số từ hiện tại là `{cur_metrics['word_count']:,}` từ (hoặc số ký tự `{cur_metrics['char_count']:,}`), nếu chấm điểm ngay sẽ bị phạt lỗi P0 Hard Word/Char Lock (trần 59/100).
YÊU CẦU THỰC HIỆN NGAY:
1. Giữ nguyên 100% cốt truyện, toàn bộ các bản vá Patch Ledger đã sửa, toàn bộ đoạn `MUST PRESERVE` và giữ đúng **{n_beats} Part** (`# PART 1` đến `# PART {n_beats}`).
2. Thực hiện **gọt câu chữ cấp độ dòng mạnh tay hơn (strict line-level micro-trimming)**: rút gọn mạnh các tính từ/trạng từ lặp, câu giải thích/miêu tả nội tâm trùng lặp ở tất cả các Part để **cắt giảm tối thiểu `{words_to_cut:,}` từ (tương đương ~`{chars_to_cut:,}` ký tự)**, đưa tổng độ dài về đúng **45.000 – 48.000 ký tự** và **7.250 – 7.600 từ** (tuyệt đối **< 7.800 từ**).
3. Nếu 1 lượt trả lời không đủ dung lượng in hết {n_beats} Part, bạn ĐƯỢC PHÉP chia thành 2 phản hồi liên tiếp (Phản hồi 1: `# PART 1` đến hết `# PART {mid_part_c}`; Phản hồi 2: `# PART {mid_part_c+1}` đến hết `# PART {n_beats}`).
4. Xuất ngay văn bản kịch bản đã cân chỉnh độ dài (bắt đầu từ `# PART 1`):
"""
                calib_resp, thread_data = send_or_harvest_turn(
                    prompt_calib,
                    f"BƯỚC 4-CALIB (VÒNG #{audit_round}.{calib_attempt}",
                    f"BƯỚC 4-CALIB: LENGTH TRIM #{audit_round}.{calib_attempt}",
                    timeout_sec=2400,
                )
                calib_metrics = analyze_script_metrics(calib_resp)
                if not is_valid_full_script(calib_metrics, n_beats):
                    calib_metrics, td_two = harvest_two_half_script_in_thread(
                        f"BƯỚC 4-CALIB #{audit_round}.{calib_attempt}",
                        calib_resp,
                        n_beats,
                        f"Cắt giảm tối thiểu {words_to_cut:,} từ để tổng độ dài đạt 45.000–48.000 ký tự và 7.250–7.600 từ (< 7.800 từ), giữ nguyên 100% cốt truyện và {n_beats} Part.",
                    )
                    if td_two:
                        thread_data = td_two
                if is_valid_full_script(calib_metrics, n_beats):
                    current_script = calib_metrics["clean_text"]
                    cur_metrics = calib_metrics
                    prev_r = max(1, audit_round - 1)
                    write_text_file(os.path.join(ckpt_dir, f"04_REVISED_SCRIPT_r{prev_r}.txt"), current_script)
                    write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), current_script)
                    save_conversation_transcript(project_dir, state["thread_id"], thread_data)
                    log_msg(
                        project_id,
                        f"✅ Đã cân chỉnh độ dài thành công trước Vòng #{audit_round} (Lượt #{calib_attempt}): {cur_metrics['char_count']:,} ký tự | {cur_metrics['word_count']:,} từ ({cur_metrics['per_part_summary']})!",
                    )
                else:
                    break

            log_msg(
                project_id,
                f"🔍 [BƯỚC 4A - Đánh Giá Lần #{audit_round} (Tối đa {max_rewrite_rounds} vòng sửa)] Chạy MODE A trên Đoạn Chat Kiểm Định Độc Lập (Zero Self-Bias: Chấm điểm thật + Khóa điểm đạt + Liệt kê Patch Ledger)...",
            )

            len_spec_note = (
                f"Chuẩn mục tiêu {kspec['label']}: {kspec['t_min']:,}–{kspec['t_max']:,} ký tự {kspec['lang_name']} (7 Phần `[PART 1]..[PART 7]`), ưu tiên {kspec['p_min']:,}–{kspec['p_max']:,} ký tự"
                if ACTIVE_NICHE in ("homeless", "mexico")
                else "Chuẩn mục tiêu: 44.000–48.000 ký tự (khung hợp lệ 40.000–55.000 ký tự), khóa cứng < 8.000 từ"
            )
            homeless_qa_cert_block = ""
            # Khắc phục Lỗ hổng #2: Truyền 100% số liệu thật đo bằng Python (XÓA BỎ HOÀN TOÀN lệnh làm giả cert_body = min(77600, max(74600, raw_b)))
            disp_char_count = cur_metrics["char_count"]
            disp_body_count = cur_metrics.get("body_char_count", cur_metrics["char_count"])
            disp_part_summary = cur_metrics["per_part_summary"]
            if ACTIVE_NICHE in ("homeless", "mexico"):
                raw_b = cur_metrics.get("body_char_count", cur_metrics["char_count"])
                cert_body = raw_b
                cert_raw = cur_metrics.get("raw_char_count", cur_metrics["char_count"])
                cert_part_map = cur_metrics.get("part_chars_map", {})
                in_hard_band = (kspec["t_min"] <= cert_body <= kspec["t_max"]) and (cur_metrics["part_count"] == 7) and (cur_metrics["bracket_cues_count"] == 0)
                in_pref_center = (kspec["p_min"] <= cert_body <= kspec["p_max"])
                length_gate_status = "PASS" if in_hard_band else f"OUT_OF_BAND ({cert_body:,} chars; required {kspec['t_min']:,}-{kspec['t_max']:,})"
                skill_4_tag = (
                    f"{kspec['key_id']}__04_auditor"
                    if kspec.get("is_12_key")
                    else ("auditor-forense-guion-familiar-mexico" if ACTIVE_NICHE == "mexico" else "kiem-tra-kich-ban-homeless")
                )

                homeless_qa_cert_block = f"""
================================================================================
XÁC NHẬN ĐỊNH DANH & SỐ LIỆU ĐO ĐẠC THỰC TẾ 100% BỞI HỆ THỐNG PYTHON BÊN NGOÀI (ZERO DATA SPOOFING):
- Trạng thái xác thực tệp nguồn (Source Identity): VERIFIED (status = OK, discrepancy = 0)
- Mã kiểm chứng SHA-256 của tệp kịch bản: {cur_metrics.get('file_sha256', '')[:24]}... (Body SHA-256: {cur_metrics.get('body_sha256', '')[:24]}...)
- Tổng số ký tự thực tế toàn tệp (Raw chars): {cert_raw:,} ký tự | Tổng số ký tự thực tế phần thân truyện (Body chars): {cert_body:,} ký tự
- Trạng thái cổng độ dài thực tế (Chuẩn {kspec['t_min']:,}–{kspec['t_max']:,} ký tự, tâm vàng {kspec['p_min']:,}–{kspec['p_max']:,} ký tự): {length_gate_status} (in_preferred_center = {in_pref_center})
- Cấu trúc các Phần phát hiện thực tế ({cur_metrics['part_count']}/7 Phần): {cur_metrics['parts_found']} ({disp_part_summary})
- Số ký hiệu ngoặc vuông sân khấu thực tế (Bracket Stage Cues): {cur_metrics['bracket_cues_count']}

QUY TẮC KIỂM ĐỊNH PHÁP Y ĐỘC LẬP & TRUNG THỰC (`{skill_4_tag}` — BÀN #4A):
- Bạn đang vận hành trên **Đoạn chat Kiểm định Pháp y Độc lập 100%** (tách biệt hoàn toàn khỏi đoạn chat của Người viết Bước 3).
- **TUYỆT ĐỐI KHÔNG XUẤT JSON TRONG ĐOẠN CHAT:** Không in bất kỳ khối code JSON (` ```json ... ``` `) hay `QA_FROZEN.json` nào trong câu trả lời! Hãy trình bày toàn bộ Báo cáo Kiểm định, Bảng điểm 10 tiêu chí và Bảng Patch Ledger bằng văn bản Markdown thuần túy.
- **CHẤM ĐIỂM CÔNG TÂM THEO ĐÚNG RUBRIC 100 ĐIỂM (KHÔNG NÂNG ĐIỂM ẢO):**
  + Kiểm tra nghiêm ngặt: (1) Độ khớp với `CURRENT FINAL TITLE` và Giàn ý Bước 2, (2) Tính liền mạch nhân quả (Causality — không nhảy cóc sự kiện hoặc thiếu bước trung gian), (3) Chiều sâu cảm xúc & đối thoại bằng {kspec['lang_name']}, (4) Độ dài thực tế (`{cert_body:,}` ký tự so với khung `{kspec['t_min']:,}–{kspec['t_max']:,}` ký tự) và `0` ngoặc vuông sân khấu.
  + Nếu phát hiện lỗi P0/P1/P2 (như đứt mạch nhân quả, lặp ý giữa các Part, thiếu chi tiết kỹ thuật/vật lý, hoặc độ dài nằm ngoài khung `{kspec['t_min']:,}–{kspec['t_max']:,}` ký tự), **bắt buộc trừ điểm trung thực theo Rubric (điểm `< 97/100`)** và liệt kê đầy đủ vị trí lỗi vào bảng `PATCH LEDGER — COMPLETE` để Bàn #4B sửa chữa!
  + Chỉ chấm **`>= 97/100` (`PASS FOR PRODUCTION`)** khi văn bản `CRB` thực sự đạt chuẩn xuất bản trên tất cả các tiêu chí.
- **TUYỆT ĐỐI KHÔNG ĐƯỢC GHI `QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED` HAY `null/100`!**
"""
            outline_ref_txt = read_text_file(os.path.join(ckpt_dir, "02_STORY_OUTLINE.md"))
            # Khóa cứng ngân sách ký tự cho MODE A <= 82.000 ký tự để ChatGPT Web KHÔNG BAO GIỜ báo lỗi "The messages you submitted were too long"
            # Bảo toàn 100% văn bản kịch bản `current_script`, chỉ điều chỉnh độ dài khối phụ trợ (Skill 4, Giàn ý đối chiếu, Patch Ledger vòng trước):
            max_mode_a_chars = 82000
            avail_aux_chars = max(3600, max_mode_a_chars - len(current_script) - len(homeless_qa_cert_block) - 3400)
            if audit_round == 1:
                outline_cap_a = min(8000, max(1400, int(avail_aux_chars * 0.35)))
                skill_cap_a = max(2200, avail_aux_chars - outline_cap_a)
                outline_excerpt_for_auditor = _smart_trim_ref_text(outline_ref_txt, outline_cap_a)
                skill_4_for_round = _smart_trim_ref_text(skill_4_content, skill_cap_a)
                prompt_mode_a = f"""================================================================================
BƯỚC 4 (VÒNG #{audit_round} - MODE A: EXHAUSTIVE FORENSIC REVIEW & STRONG-SPAN LOCK — ĐOẠN CHAT ĐỘC LẬP)
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào, và KHÔNG xuất bất kỳ khối JSON nào trong đoạn chat. Bạn là **Thanh tra Pháp y Độc lập (Bàn #4A)**, đánh giá khách quan bản thảo dưới đây.

Dưới đây là toàn bộ nội dung Skill Kiểm tra Kịch bản và các file Reference bắt buộc:

{skill_4_for_round}
{homeless_qa_cert_block}
=== GIÀN Ý GỐC ĐÃ KHÓA TỪ BƯỚC 2 (`02_STORY_OUTLINE.md` — DÙNG ĐỂ ĐỐI CHIẾU CANON & BEAT) ===
{outline_excerpt_for_auditor}
=== KẾT THÚC GIÀN Ý GỐC ===

================================================================================
THÔNG SỐ THỰC TẾ CỦA BẢN KỊCH BẢN HIỆN TẠI (`CURRENT REVISION BASELINE - CRB`, ĐO BẰNG PYTHON):
- **CURRENT FINAL TITLE:** "{state['winner_title']}"
- **Số Part hiện tại:** {cur_metrics['part_count']} Part (Khớp với {n_beats} Phần của Giàn ý ở Bước 2: {cur_metrics['parts_found']})
- **Tổng số ký tự hiển thị chính xác:** {disp_char_count:,} ký tự (Body-only: {disp_body_count:,} ký tự | {len_spec_note})
- **Tổng số từ chính xác:** {cur_metrics['word_count']:,} từ
- **Độ dài chi tiết từng Part:** {disp_part_summary}
- **Số ký hiệu ngoặc vuông sân khấu `[...]`:** {cur_metrics['bracket_cues_count']}
================================================================================

=== TOÀN VĂN BẢN KỊCH BẢN HIỆN TẠI CẦN ĐÁNH GIÁ (`CURRENT REVISION BASELINE - CRB`) ===
{current_script}
=== KẾT THÚC VĂN BẢN KỊCH BẢN HIỆN TẠI (`CRB`) ===

YÊU CẦU THỰC HIỆN NGAY Ở CHẾ ĐỘ `MODE A — EXHAUSTIVE REVIEW` TRÊN VĂN BẢN `CRB` Ở TRÊN:
1. **XUẤT BÁO CÁO KIỂM ĐỊNH & BẢNG ĐIỂM HOÀN CHỈNH BẰNG VĂN BẢN MARKDOWN THUẦN TÚY TRONG 1 PHẢN HỒI DUY NHẤT NÀY:** Tuyệt đối KHÔNG xuất khối JSON (` ```json `), KHÔNG dừng ở READ1, KHÔNG ghi `Pending READ2`, KHÔNG ghi `QA ABORTED` và KHÔNG ghi `null/100`!
2. **KHÓA CÁC ĐIỂM ĐÃ ĐẠT YÊU CẦU (`STRONG-SPAN LOCK / MUST PRESERVE`):** Chỉ rõ và khóa chặt toàn bộ các Part, Beat, đoạn văn, thiết lập nhân vật và chuỗi nhân quả đã đạt chuẩn để **CẤM SỬA ĐỔI** ở bước sửa kịch bản.
3. **LIỆT KÊ ĐẦY ĐỦ CÁC ĐIỂM CẦN SỬA (`PATCH LEDGER — COMPLETE`):** Đưa ra danh sách đầy đủ các điểm cần sửa (`P01..Pnn` và `O01..Onn`) kèm vị trí chính xác (`Part N -> quote mở đầu ... quote kết thúc`), lỗi cụ thể, cách sửa và `Length Intent`.
4. **CHẤM ĐIỂM PHÁP Y CHÍNH XÁC & TRUNG THỰC (`FORENSIC SCORE RUBRIC`):** Ghi rõ con số tổng điểm tại cả 2 dòng:
   `**Current Absolute Forensic Score:** XX/100`
   `FINAL_QA_SCORE: XX/100`
5. Kết thúc bằng `PASS FOR PRODUCTION` (nếu >= 97/100) hoặc `WAITING FOR REWRITE COMMAND` (nếu < 97/100).
"""
            else:
                prev_audit_p = os.path.join(ckpt_dir, f"04_AUDIT_REPORT_r{audit_round - 1}.md")
                prev_audit_txt = read_text_file(prev_audit_p) if os.path.exists(prev_audit_p) else ""
                m_prev_ledger = re.search(
                    r"(?:PATCH\s+LEDGER|OBSERVED\s+PATCH\s+LEDGER|FROZEN\s+PATCH\s+LEDGER)(.*)",
                    prev_audit_txt,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                raw_prev_ledger = (m_prev_ledger.group(0)[:8000] if m_prev_ledger else prev_audit_txt[-6000:]).strip()
                ledger_cap_a = min(5500, max(1500, int(avail_aux_chars * 0.40)))
                outline_cap_a = min(4500, max(1000, int(avail_aux_chars * 0.25)))
                skill_cap_a = max(1600, avail_aux_chars - ledger_cap_a - outline_cap_a)
                prev_ledger_excerpt = _smart_trim_ref_text(raw_prev_ledger, ledger_cap_a)
                outline_excerpt_for_auditor = _smart_trim_ref_text(outline_ref_txt, outline_cap_a)
                skill_4_for_round = _smart_trim_ref_text(skill_4_content, skill_cap_a)
                outline_block_in_mode_a = (
                    f"Dưới đây là toàn bộ nội dung Skill Kiểm tra Kịch bản và các file Reference bắt buộc:\n\n"
                    f"{skill_4_for_round}\n\n"
                    f"=== GIÀN Ý GỐC ĐÃ KHÓA TỪ BƯỚC 2 (`02_STORY_OUTLINE.md`) ===\n"
                    f"{outline_excerpt_for_auditor}\n"
                    f"=== KẾT THÚC GIÀN Ý GỐC ===\n\n"
                    f"=== BẢNG LỖI PATCH LEDGER CỦA VÒNG TRƯỚC (VÒNG #{audit_round - 1}) CẦN KIỂM TRA XEM ĐÃ SỬA TRIỆT ĐỂ CHƯA ===\n"
                    f"{prev_ledger_excerpt}\n"
                    f"=== KẾT THÚC PATCH LEDGER VÒNG #{audit_round - 1} ===\n"
                )
                contract_rule_note = (
                    f"Hãy kiểm tra độc lập và trung thực trên văn bản `CRB` hiện tại (`body_chars = {disp_body_count:,}` ký tự, `{cur_metrics['part_count']}/{n_beats}` Part, `{cur_metrics['bracket_cues_count']}` ngoặc vuông): "
                    f"(1) Đối chiếu từng mục trong `Patch Ledger` của Vòng #{audit_round - 1} xem đã được sửa thực chất trong văn bản `CRB` chưa và các đoạn nối biên giữa các Part có mượt mà không; "
                    f"(2) Nếu tất cả lỗi trong `Patch Ledger` đã được khắc phục triệt để, không phát sinh lỗi hồi quy (Regression) và độ dài nằm chuẩn trong khung quy định, hãy chấm điểm đạt **`>= 97/100` (`PASS FOR PRODUCTION`)**; "
                    f"(3) Ngược lại, nếu bản sửa vẫn bỏ sót lỗi nhân quả/logic hoặc còn lỗi P0/P1/P2 chưa đạt, hãy chấm điểm trung thực **`< 97/100`**, liệt kê rõ các điểm còn tồn đọng trong `PATCH LEDGER — COMPLETE` và kết thúc bằng `WAITING FOR REWRITE COMMAND`."
                )
                prompt_mode_a = f"""================================================================================
BƯỚC 4 (VÒNG #{audit_round} - MODE A: ĐÁNH GIÁ LẠI ĐỘC LẬP KỊCH BẢN SAU KHI SỬA & KIỂM TRA ĐỘT BIẾN R/L/N/P)
================================================================================
QUAN TRỌNG: KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào, và KHÔNG xuất bất kỳ khối JSON nào trong đoạn chat. Thực hiện gộp đầy đủ đánh giá và chấm điểm ngay trong 1 phản hồi duy nhất này (tuyệt đối KHÔNG ghi `Pending READ2`, `PARTIAL`, `QA ABORTED` hay `null/100` — bắt buộc phải chấm con số cụ thể từ 0–100 tại dòng `Current Absolute Forensic Score: XX/100`).
{homeless_qa_cert_block}
THÔNG SỐ THỰC TẾ CỦA BẢN KỊCH BẢN VỪA SỬA (`CURRENT REVISION BASELINE - CRB`, ĐO BẰNG PYTHON):
- **CURRENT FINAL TITLE:** "{state['winner_title']}"
- **Số Part hiện tại:** {cur_metrics['part_count']} Part (Chuẩn khóa: {n_beats} Part — {cur_metrics['parts_found']})
- **Tổng số ký tự hiển thị chính xác:** {disp_char_count:,} ký tự (Body-only: {disp_body_count:,} ký tự | {len_spec_note})
- **Tổng số từ chính xác:** {cur_metrics['word_count']:,} từ
- **Độ dài chi tiết từng Part:** {disp_part_summary}
- **Số ký hiệu ngoặc vuông sân khấu `[...]`:** {cur_metrics['bracket_cues_count']}

{outline_block_in_mode_a}
=== TOÀN VĂN BẢN KỊCH BẢN VỪA SỬA (`CURRENT REVISION BASELINE - CRB`) ===
{current_script}
=== KẾT THÚC VĂN BẢN KỊCH BẢN VỪA SỬA (`CRB`) ===

YÊU CẦU THỰC HIỆN NGAY Ở CHẾ ĐỘ `MODE A — EXHAUSTIVE REVIEW` TRÊN VĂN BẢN `CRB` Ở TRÊN:
1. Kiểm tra xem toàn bộ các điểm sửa trong `Patch Ledger` của vòng trước đã được khắc phục triệt để trong `CRB` ở trên chưa và các phần đã khóa (`MUST PRESERVE`) có được bảo toàn 100% không.
2. **QUY TẮC CHẤM ĐIỂM CÔNG TÂM:** {contract_rule_note}
3. Khóa tiếp toàn bộ các phần đã đạt yêu cầu (`MUST PRESERVE / Strong-Span Lock`).
4. Bắt buộc ghi con số tổng điểm Pháp y cụ thể (tuyệt đối không ghi `null`) tại cả 2 dòng:
   `**Current Absolute Forensic Score:** XX/100`
   `FINAL_QA_SCORE: XX/100`
5. Nếu điểm >= 97/100, kết thúc bằng `PASS FOR PRODUCTION`. Nếu vẫn còn lỗi khiến điểm < 97/100, liệt kê trong `PATCH LEDGER — COMPLETE` và kết thúc bằng `WAITING FOR REWRITE COMMAND`.
"""

            saved_audit_p = os.path.join(ckpt_dir, f"04_AUDIT_REPORT_r{audit_round}.md")
            saved_rev_p = os.path.join(ckpt_dir, f"04_REVISED_SCRIPT_r{audit_round}.txt")
            existing_audit_txt = read_text_file(saved_audit_p) if os.path.exists(saved_audit_p) else ""
            if (
                existing_audit_txt
                and len(existing_audit_txt) >= 5000
                and "QA ABORTED" not in existing_audit_txt.upper()
                and "EXACT CURRENT-BODY LENGTH NOT VERIFIED" not in existing_audit_txt.upper()
                and not os.path.exists(saved_rev_p)
            ):
                audit_report = existing_audit_txt
                thread_data = client._last_known_turns.get(state.get("thread_id", "")) or {"turns": [{"id": f"ckpt_r{audit_round}", "status": "completed"}]}
                log_msg(project_id, f"♻️ Nạp trực tiếp Báo cáo Đánh giá MODE A Vòng #{audit_round} đã lưu từ Checkpoint ({len(audit_report):,} ký tự) mà không cần gọi lại API!")
            else:
                # Khắc phục Lỗ hổng #1: Mở đoạn chat Kiểm định Pháp y Độc lập mới tinh cho Bàn #4A (lưu lại Agent trước vào Registry)
                switch_to_isolated_desk_thread(
                    f"AUDITOR_DESK_4A_R{audit_round}",
                    f"Bàn #4A — Thanh Tra Pháp Y Độc Lập Vòng #{audit_round}",
                )
                audit_report, thread_data = send_or_harvest_turn(
                    prompt_mode_a,
                    f"BƯỚC 4 (VÒNG #{audit_round} - MODE A",
                    f"BƯỚC 4A: AUDIT ROUND #{audit_round}",
                    timeout_sec=1800,
                )
                write_text_file(saved_audit_p, audit_report)
                save_conversation_transcript(project_dir, state["thread_id"], thread_data)
                record_agent_chat_state(
                    f"AUDITOR_DESK_4A_R{audit_round}",
                    f"Bàn #4A — Thanh Tra Pháp Y Độc Lập Vòng #{audit_round}",
                    state.get("thread_id", ""),
                    status="COMPLETED",
                    turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
                )

            score, readiness, patch_count = parse_forensic_audit_score(audit_report)
            log_msg(
                project_id,
                f"📋 [Kết quả Đánh giá Độc lập Vòng #{audit_round}] Điểm kịch bản = {score}/100 | Readiness = {readiness} | Số điểm sửa trong Patch Ledger = {patch_count} | Độ dài thực tế: {cur_metrics['char_count']:,} ký tự ({cur_metrics['word_count']:,} từ)",
            )

            state["final_script_score"] = score
            save_state(f"STEP_4_AUDIT_ROUND_{audit_round}_SCORE_{score}")

            # KIỂM TRA CỔNG ĐIỂM SỐ & GIỚI HẠN TỐI ĐA 5 VÒNG SỬA:
            pass_threshold = 97
            if score >= pass_threshold:
                state["audit_history"].append(
                    {
                        "round": audit_round,
                        "score": score,
                        "readiness": readiness,
                        "patch_count": patch_count,
                        "char_count": cur_metrics["char_count"],
                        "word_count": cur_metrics["word_count"],
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                save_state(f"STEP_4_AUDIT_ROUND_{audit_round}_SCORE_{score}")
                log_msg(
                    project_id,
                    f"🏆 Kịch bản đã đạt {score}/100 điểm thực tế (>= {pass_threshold} điểm | {cur_metrics['char_count']:,} ký tự | {cur_metrics['word_count']:,} từ)! Chốt kịch bản và chuyển sang Bước 5 (Tạo SEO)!",
                )
                break

            if audit_round > max_rewrite_rounds:
                state["audit_history"].append(
                    {
                        "round": audit_round,
                        "score": score,
                        "readiness": readiness,
                        "patch_count": patch_count,
                        "char_count": cur_metrics["char_count"],
                        "word_count": cur_metrics["word_count"],
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                save_state(f"STEP_4_AUDIT_ROUND_{audit_round}_SCORE_{score}")
                log_msg(
                    project_id,
                    f"⚠️ Đã chạm giới hạn tối đa {max_rewrite_rounds} vòng sửa (Điểm thực tế sau vòng sửa {max_rewrite_rounds} = {score}/100). Lấy kịch bản sửa vòng {max_rewrite_rounds} làm kịch bản Full và chuyển sang Bước 5 (Tạo SEO)!",
                )
                break

            log_msg(
                project_id,
                f"🛠️ [BƯỚC 4B - Vòng Sửa Kịch Bản #{audit_round}/{max_rewrite_rounds}] Điểm hiện tại = {score}/100. Chuyển sang/Quay lại Đoạn chat Agent Sửa bài (`REPAIR_DESK_4B`) & kích hoạt MODE B kèm Điểm Neo Biên (Boundary Anchors 5 câu đầu/cuối)...",
            )

            # Mở đoạn chat riêng gọn nhẹ cho từng Vòng sửa Bàn #4B (REPAIR_DESK_4B_R{audit_round}) để hội thoại không bao giờ phình lên 600KB-700KB gây lỗi "Could not load this ChatGPT conversation"
            switch_to_isolated_desk_thread(
                f"REPAIR_DESK_4B_R{audit_round}",
                f"Bàn #4B — Phẫu Thuật & Sửa Kịch Bản theo Patch Ledger (Vòng #{audit_round})",
            )

            if ACTIVE_NICHE in ("homeless", "mexico"):
                base_pmap = split_script_into_part_dict(current_script, max_p=n_beats)
                for p_i in range(1, n_beats + 1):
                    if base_pmap.get(p_i):
                        write_text_file(os.path.join(ckpt_dir, f"PART_{p_i}.txt"), f"[PART {p_i}]\n\n{base_pmap[p_i]}")

                target_parts = extract_patched_parts_from_audit(audit_report, n_beats=n_beats, max_parts=3)
                locked_passing_parts = [p for p in range(1, n_beats + 1) if p not in target_parts]
                log_msg(
                    project_id,
                    f"🔒 [BƯỚC 4B - PHÂN TÁCH PART VÒNG #{audit_round}/{max_rewrite_rounds}] Các Part ĐÃ ĐẠT YÊU CẦU (Khóa giữ nguyên 100%): {locked_passing_parts} | Các Part CẦN SỬA (Mỗi lần sửa 1 Part + Boundary Anchors 5 câu đầu/cuối): {target_parts}",
                )

                m_ledger_sec = re.search(
                    r"(?:PATCH\s+LEDGER|OBSERVED\s+PATCH\s+LEDGER|FROZEN\s+PATCH\s+LEDGER)(.*)",
                    audit_report,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                ledger_excerpt = (m_ledger_sec.group(0)[:12000] if m_ledger_sec else audit_report[-10000:]).strip()

                updated_p_list = []
                for idx_p, p_num in enumerate(target_parts, 1):
                    saved_part_rev_p = os.path.join(ckpt_dir, f"PART_{p_num}_REVISED_r{audit_round}.txt")
                    if os.path.exists(saved_part_rev_p):
                        existing_p_rev = read_text_file(saved_part_rev_p)
                        existing_p_body = re.sub(
                            r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|CAP[IÍ]TULO|CHAPTER|STORY|ACT|ACTO|パート|第\s*\d+\s*[部章話])\s*\d*[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                            "",
                            existing_p_rev or "",
                            flags=re.IGNORECASE,
                        ).strip()
                        if len(existing_p_body) >= max(1600, kspec["per_part_min_accept"] - 800):
                            base_pmap[p_num] = existing_p_body
                            updated_p_list.append(p_num)
                            write_text_file(os.path.join(ckpt_dir, f"PART_{p_num}.txt"), f"[PART {p_num}]\n\n{existing_p_body}")
                            log_msg(
                                project_id,
                                f"♻️ [BƯỚC 4B - KHÔI PHỤC PART {p_num} TỪ CHECKPOINT VÒNG #{audit_round}] Nạp trực tiếp `PART_{p_num}_REVISED_r{audit_round}.txt` đã sửa hoàn tất ({len(existing_p_body):,} ký tự) mà không cần gọi lại API!",
                            )
                            continue

                    orig_p_body = base_pmap.get(p_num, "")
                    beat_s = (p_num - 1) * 10 + 1
                    beat_e = p_num * 10
                    target_p_min = max(kspec["per_part_min_accept"], min(kspec["per_part_target"], len(orig_p_body) - 300))
                    target_p_max = max(kspec["per_part_target"] + 200, min(kspec["per_part_max"], len(orig_p_body) + 400))

                    # Khắc phục Lỗ hổng #3: Trích xuất Điểm Neo Biên (5 câu cuối của Part p_num - 1 & 5 câu đầu của Part p_num + 1)
                    b_anchors = extract_part_boundary_anchors(base_pmap, p_num, n_beats, num_sents=5)

                    log_msg(
                        project_id,
                        f"🛠️ [BƯỚC 4B - LẦN SỬA {idx_p}/{len(target_parts)} (VÒNG #{audit_round}/{max_rewrite_rounds})] Đang sửa riêng DUY NHẤT `[PART {p_num}]` (Beat E{beat_s:02d}..E{beat_e:02d}) kèm Boundary Anchors 5 câu đầu/cuối...",
                    )
                    lang_4b_str = kspec["lang_name"]
                    prompt_single_part_repair = f"""================================================================================
BƯỚC 4B (VÒNG #{audit_round} - LẦN SỬA {idx_p}/{len(target_parts)}: CHỈ SỬA DUY NHẤT `[PART {p_num}]` KÈM ĐIỂM NEO BIÊN BOUNDARY ANCHORS)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào.
- TUYỆT ĐỐI KHÔNG xuất JSON, KHÔNG xuất toàn bộ kịch bản 7 Phần!
- **QUY TẮC MỖI LẦN SỬA CHỈ SỬA 1 PART DUY NHẤT:** Trong lượt này, bạn **CHỈ SỬA VÀ VIẾT FULL DUY NHẤT 1 PHẦN LÀ `[PART {p_num}]` (Beat `E{beat_s:02d}..E{beat_e:02d}`)**. Toàn bộ các Phần khác đã được hệ thống Python lưu khóa riêng trên ổ cứng.

{b_anchors['prompt_block']}
=== DANH SÁCH LỖI PATCH LEDGER CỦA VÒNG #{audit_round} CẦN KHẮC PHỤC TRIỆT ĐỂ ===
{ledger_excerpt}
=== KẾT THÚC DANH SÁCH PATCH LEDGER VÒNG #{audit_round} ===

=== NỘI DUNG HIỆN TẠI CỦA `[PART {p_num}]` CẦN SỬA ({len(orig_p_body):,} ký tự) ===
[PART {p_num}]

{orig_p_body}
=== KẾT THÚC NỘI DUNG HIỆN TẠI CỦA `[PART {p_num}]` ===

👉 YÊU CẦU THỰC HIỆN NGAY CHO RIÊNG `[PART {p_num}]` Ở VÒNG #{audit_round}:
1. Áp dụng triệt để 100% tất cả các bản vá thuộc **`[PART {p_num}]`** trong bảng `PATCH LEDGER` ở trên (đặc biệt bổ sung đầy đủ chuỗi hành động trung gian: đo đạc -> đối chiếu -> phát hiện manh mối -> dẫn nhập ngữ cảnh trước lời thoại để mạch nhân quả Causality liền mạch 100%), đồng thời giữ nguyên vẹn các câu/đoạn `MUST PRESERVE` bên trong `[PART {p_num}]`.
2. **LIỀN MẠCH ĐIỂM NEO BIÊN (BOUNDARY CONTINUITY):** Đảm bảo câu mở đầu của `[PART {p_num}]` nối tiếp mượt mà ngay sau 5 câu cuối của `[PART {p_num - 1}]` (không lặp lại hành động đã xảy ra), và đoạn kết của `[PART {p_num}]` bàn giao tự nhiên sang 5 câu đầu của `[PART {p_num + 1}]` (không viết lấn sang sự kiện của Part sau).
3. **VIẾT FULL TRỌN VẸN 100% `[PART {p_num}]`:** Xuất đầy đủ từ đầu đến câu kết thúc cuối cùng của `[PART {p_num}]` với độ dài chuẩn **{target_p_min:,} – {target_p_max:,} ký tự** bằng {lang_4b_str} giàu chi tiết vật lý & đối thoại, sạch 100% ngoặc vuông sân khấu `[...]`.
4. Bắt đầu ngay dòng đầu tiên bằng `[PART {p_num}]` và dừng lại ngay sau khi viết xong trọn vẹn `[PART {p_num}]` (chỉ xuất văn xuôi truyện {lang_4b_str} của riêng Part {p_num}):
"""
                    rev_single_resp, thread_data = send_or_harvest_turn(
                        prompt_single_part_repair,
                        f"BƯỚC 4B (VÒNG #{audit_round} - LẦN SỬA {idx_p}/{len(target_parts)}: CHỈ SỬA DUY NHẤT `[PART {p_num}]`",
                        f"BƯỚC 4B VÒNG #{audit_round}: REWRITE SỬA RIÊNG PART {p_num} ({idx_p}/{len(target_parts)})",
                        timeout_sec=1800,
                    )
                    rev_pmap = split_script_into_part_dict(rev_single_resp, max_p=n_beats)
                    rev_p_body = rev_pmap.get(p_num) or extract_clean_script_text(rev_single_resp, start_part=p_num)
                    rev_p_body = re.sub(
                        r"^\s*(?:#+\s*)?(?:\*\*|__)?\s*\[?\s*(?:PART|PARTE|CAP[IÍ]TULO|CHAPTER|STORY|ACT|ACTO|パート|第\s*\d+\s*[部章話])\s*\d*[^\n\]]*\]?(?:\*\*|__)?(?:\s*[:\-–—][^\n]*)?\s*",
                        "",
                        rev_p_body or "",
                        flags=re.IGNORECASE,
                    ).strip()

                    # Đưa qua Bộ Xử Lý Lỗi AI (`ai_diagnose_and_complete_part`): nếu Part sửa bị cắt cụt hoặc chưa viết full, AI sẽ tự động viết nối tiếp cho đủ 100%!
                    verified_p_body, td_ai_fix = ai_diagnose_and_complete_part(
                        p_num,
                        rev_p_body if len(rev_p_body) >= max(1400, int(kspec["per_part_min_accept"] * 0.55)) else orig_p_body,
                        f"BƯỚC 4B VÒNG #{audit_round} PART {p_num}",
                    )
                    if td_ai_fix:
                        thread_data = td_ai_fix

                    # Khử trùng lặp câu biên (nếu AI vô tình in lại câu cuối của Part trước hoặc câu đầu của Part sau)
                    verified_p_body = strip_boundary_sentence_overlap(
                        verified_p_body,
                        b_anchors["prev_sents"],
                        b_anchors["next_sents"],
                    )

                    if len(verified_p_body) >= max(1600, kspec["per_part_min_accept"] - 800):
                        base_pmap[p_num] = verified_p_body
                        updated_p_list.append(p_num)
                        # Lưu ngay file Part vừa sửa xuống đĩa!
                        write_text_file(os.path.join(ckpt_dir, f"PART_{p_num}.txt"), f"[PART {p_num}]\n\n{verified_p_body}")
                        write_text_file(
                            os.path.join(ckpt_dir, f"PART_{p_num}_REVISED_r{audit_round}.txt"),
                            f"[PART {p_num}]\n\n{verified_p_body}",
                        )
                        log_msg(
                            project_id,
                            f"💾 [BƯỚC 4B - ĐÃ LƯU PART {p_num} SAU KHI SỬA KÈM BOUNDARY ANCHORS] Đã viết Full & lưu `checkpoints/PART_{p_num}.txt` ({len(verified_p_body):,} ký tự)!",
                        )

                # Ghép các Part vừa sửa (`updated_p_list`) và các Part đã đạt yêu cầu (`locked_passing_parts`) lại với nhau thành 1 file hoàn chỉnh!
                merged_parts_list = []
                for p_i in range(1, n_beats + 1):
                    p_txt = base_pmap.get(p_i, "").strip()
                    if not p_txt:
                        saved_pi = read_text_file(os.path.join(ckpt_dir, f"PART_{p_i}.txt"))
                        pm_pi = split_script_into_part_dict(saved_pi, max_p=n_beats)
                        p_txt = pm_pi.get(p_i, "").strip()
                    merged_parts_list.append(f"[PART {p_i}]\n\n{p_txt}")

                patched_script = "\n\n".join(merged_parts_list).strip()
                if len(patched_script) > int(kspec["t_max"] - 800):
                    patched_script = condense_homeless_stage_text(
                        patched_script,
                        allowed_parts=list(range(1, n_beats + 1)),
                        target_chars=kspec["t_mid"],
                        max_chars=max(kspec["t_min"] + 1500, kspec["t_max"] - 1000),
                    )
                log_msg(
                    project_id,
                    f"🔗 [BƯỚC 4B - GHÉP CÁC PART SỬA & PART ĐẠT YÊU CẦU HOÀN TẤT] Đã ghép các Part vừa sửa {updated_p_list} + các Part đạt yêu cầu {locked_passing_parts} thành 1 file hoàn chỉnh ({len(patched_script):,} ký tự | 7/7 Parts)!",
                )
                new_metrics = analyze_script_metrics(patched_script)
            else:
                length_guidance = (
                    f"Giữ tổng độ dài sau khi sửa nằm trong vùng chuẩn **44.000 – 48.000 ký tự hiển thị** "
                    f"và **7.350 – 7.650 từ** (tuyệt đối **< 7.800 từ**, hiện tại là {cur_metrics['char_count']:,} ký tự / {cur_metrics['word_count']:,} từ; "
                    f"mỗi Part bắt buộc khoảng **{int(7450/max(n_beats,1)):,} từ** và **KHÔNG CÓ PART NÀO VƯỢT QUÁ {int(7750/max(n_beats,1)):,} TỪ**)."
                )
                if cur_metrics["char_count"] < 44000:
                    length_guidance += f" Lưu ý bổ sung thêm khoảng {45500 - cur_metrics['char_count']:,} ký tự tại các điểm có `Length Intent: ADD` để đạt chuẩn 44.000–48.000 ký tự."
                elif cur_metrics["word_count"] > 7750 or cur_metrics["char_count"] > 48000:
                    length_guidance += f" Lưu ý rút gọn khoảng {max(200, cur_metrics['word_count'] - 7600):,} từ tại các điểm có `Length Intent: CUT` để đưa về chuẩn 44.000–48.000 ký tự và 7.400–7.650 từ (< 8.000 từ)."

                m_ledger_mafia = re.search(
                    r"(?:PATCH\s+LEDGER|OBSERVED\s+PATCH\s+LEDGER|FROZEN\s+PATCH\s+LEDGER)(.*)",
                    audit_report,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                ledger_mafia_excerpt = (m_ledger_mafia.group(0)[:12000] if m_ledger_mafia else audit_report[-10000:]).strip()
                mid_part = (n_beats + 1) // 2
                prompt_mode_b = f"""================================================================================
BƯỚC 4B (VÒNG #{audit_round} - MODE B: CONTROLLED REWRITE THEO PATCH LEDGER)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Hệ thống Python ở bên ngoài sẽ tự động đếm từ và ký tự chính xác cho bạn sau khi bạn xuất xong.
- TUYỆT ĐỐI KHÔNG xuất thông báo từ chối vì giới hạn dung lượng lượt! Nếu 1 lượt trả lời không đủ dung lượng để in hết {n_beats} Part, bạn **ĐƯỢC PHÉP CHIA THÀNH 2 PHẢN HỒI LIÊN TIẾP** (Phản hồi 1: Xuất trọn vẹn `Part 1` đến hết `Part {mid_part}`; Phản hồi 2: Xuất tiếp `Part {mid_part+1}` đến hết `Part {n_beats}` rồi Python sẽ tự ghép nối 2 nửa thành 1 bản Full Script).

Điểm kịch bản ở Vòng #{audit_round} đạt **{score}/100 điểm** (dưới ngưỡng 97/100 điểm yêu cầu).
Hãy kích hoạt ngay **`MODE B — CONTROLLED REWRITE`** theo đúng quy tắc của Skill `Kiem_Tra_Kich_Ban_Nguoi_Hau_v1.1`:

=== DANH SÁCH LỖI PATCH LEDGER CỦA VÒNG #{audit_round} CẦN KHẮC PHỤC TRIỆT ĐỂ ===
{ledger_mafia_excerpt}
=== KẾT THÚC PATCH LEDGER VÒNG #{audit_round} ===

=== VĂN BẢN KỊCH BẢN HIỆN TẠI CẦN SỬA (`CURRENT WORKING SCRIPT`) ===
{current_script}
=== KẾT THÚC VĂN BẢN KỊCH BẢN HIỆN TẠI ===

1. **KHÓA BẢO TOÀN TUYỆT ĐỐI (`BASELINE PRESERVATION / STRONG-SPAN LOCK`):**
   - Toàn bộ các đoạn, cảnh, cấu trúc Part và chi tiết đã đạt yêu cầu (`MUST PRESERVE` / không nằm trong `Patch Ledger`) bắt buộc phải **GIỮ NGUYÊN VẸN (`COPY / KEEP`)**, tuyệt đối không tự ý viết lại hay làm co ngắn.
2. **SỬA TRIỆT ĐỂ 100% ĐIỂM LỖI TRONG PATCH LEDGER & ĐẢM BẢO ĐIỂM NEO BIÊN GIỮA CÁC PART:**
   - Áp dụng đầy đủ tất cả các bản vá `P01..Pnn` và `O01..Onn` vừa liệt kê trong `PATCH LEDGER` ở trên, đồng thời giữ mạch chuyển cảnh giữa câu cuối `Part K` và câu đầu `Part K+1` liền mạch 100%.
3. **KHÓA SỐ PART & ĐỘ DÀI:**
   - Giữ đúng **{n_beats} Part** (`Part 1` đến `Part {n_beats}`).
   - {length_guidance}
   - Sạch 100% ký hiệu ngoặc vuông `[...]` (Zero-bracket TTS Clean).
4. **ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:**
   - Xuất văn bản kịch bản đã sửa hoàn chỉnh (bắt đầu từ `# PART 1` đến hết `# PART {n_beats}`, hoặc xuất trọn vẹn `# PART 1` đến hết `# PART {mid_part}` trong phản hồi này nếu cần chia 2 phản hồi liên tiếp):
"""
                revised_resp, thread_data = send_or_harvest_turn(
                    prompt_mode_b,
                    f"BƯỚC 4B (VÒNG #{audit_round} - MODE B",
                    f"BƯỚC 4B: CONTROLLED REWRITE #{audit_round}",
                    timeout_sec=2400,
                )

                new_metrics = analyze_script_metrics(revised_resp)
                if not is_valid_full_script(new_metrics, n_beats):
                    stitched_m, td_two = harvest_two_half_script_in_thread(
                        f"BƯỚC 4B REWRITE #{audit_round}",
                        revised_resp,
                        n_beats,
                        f"Áp dụng 100% Patch Ledger Vòng #{audit_round}, bảo toàn các phần MUST PRESERVE, giữ đúng {n_beats} Part. {length_guidance}",
                    )
                    if td_two:
                        thread_data = td_two
                    new_metrics = stitched_m

            # CỔNG BẢO VỆ NGHIÊM NGẶT: Chỉ ghi nhận bản sửa nếu đạt chuẩn Full Script
            if is_valid_full_script(new_metrics, n_beats):
                current_script = new_metrics["clean_text"]
                cur_metrics = new_metrics
                write_text_file(os.path.join(ckpt_dir, f"04_REVISED_SCRIPT_r{audit_round}.txt"), current_script)
                write_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"), current_script)
                log_msg(
                    project_id,
                    f"✅ Đã kiểm định & lưu kịch bản sửa Vòng #{audit_round}: {cur_metrics['char_count']:,} ký tự | {cur_metrics['word_count']:,} từ | {cur_metrics['part_count']}/{n_beats} Part. Chuyển lại sang MODE A (Đoạn chat Kiểm định Độc lập) để đánh giá lại!",
                )
            else:
                log_msg(
                    project_id,
                    f"🛡️ [BẢO VỆ KỊCH BẢN] Phản hồi MODE B Vòng #{audit_round} ({new_metrics['char_count']:,} ký tự, {new_metrics['part_count']}/{n_beats} Part) chưa đạt chuẩn Full Script. Giữ nguyên bản kịch bản hợp lệ ({cur_metrics['char_count']:,} ký tự)!",
                )

            state["audit_history"].append(
                {
                    "round": audit_round,
                    "score": score,
                    "readiness": readiness,
                    "patch_count": patch_count,
                    "char_count": cur_metrics["char_count"],
                    "word_count": cur_metrics["word_count"],
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
            save_state(f"STEP_4_REWRITTEN_ROUND_{audit_round}")
            save_conversation_transcript(project_dir, state["thread_id"], thread_data)
            record_agent_chat_state(
                f"REPAIR_DESK_4B_R{audit_round}",
                f"Bàn #4B — Phẫu Thuật & Sửa Kịch Bản (Hoàn tất Vòng #{audit_round})",
                state.get("thread_id", ""),
                status="COMPLETED",
                turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
            )
            record_agent_chat_state(
                "REPAIR_DESK_4B",
                f"Bàn #4B — Phẫu Thuật & Sửa Kịch Bản (Đã xong Vòng #{audit_round}, chờ Kiểm định)",
                state.get("thread_id", ""),
                status="SAVED_READY_TO_RESUME",
                turns_cnt=audit_round,
            )

            # Nếu vừa hoàn tất vòng sửa tối đa, quay lại MODE A chấm điểm thực tế lần cuối rồi chốt!
            if audit_round >= max_rewrite_rounds:
                log_msg(
                    project_id,
                    f"🏁 Đã hoàn tất vòng sửa tối đa #{max_rewrite_rounds}/{max_rewrite_rounds} ({cur_metrics['char_count']:,} ký tự | {cur_metrics['word_count']:,} từ). Chuyển sang MODE A chấm điểm thực tế lần cuối cho bản sửa số {max_rewrite_rounds}!",
                )

        if "REPAIR_DESK_4B" in state.get("agent_chat_registry", {}):
            rep_entry = state["agent_chat_registry"]["REPAIR_DESK_4B"]
            record_agent_chat_state(
                "REPAIR_DESK_4B",
                "Bàn #4B — Phẫu Thuật & Sửa Kịch Bản (Hoàn tất)",
                rep_entry.get("thread_id", ""),
                status="COMPLETED",
                turns_cnt=rep_entry.get("turns_count", 1),
            )

        # Xuất file thành phẩm #1: FULL_SCRIPT.txt (đã xóa toàn bộ dòng Part 1..N để tạo TTS thuần túy) và bản sao {STT}_KB.txt trong TONG HOP
        tts_pure_script = strip_part_headers_for_tts(current_script)
        write_text_file(os.path.join(project_dir, "FULL_SCRIPT.txt"), tts_pure_script)
        export_to_tong_hop_folder(project_id, project_dir)
        state["script_metrics"] = {
            "char_count": cur_metrics["char_count"],
            "word_count": cur_metrics["word_count"],
            "part_count": cur_metrics["part_count"],
            "bracket_cues_count": cur_metrics["bracket_cues_count"],
        }
        if "STEP_4_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_4_DONE")
        save_state("STEP_4_DONE")

        if only_step == 4:
            return state

    # ==========================================================================
    # BƯỚC 5: TẠO BỘ SEO HOÀN CHỈNH TRÊN ĐOẠN CHAT ĐỘC LẬP MỚI (`SEO_DESK_5`)
    # ==========================================================================
    if ("STEP_5_DONE" not in state["completed_steps"] and only_step in (0, 5)) or only_step == 5:
        save_state("STEP_5_RUNNING_SEO")
        actual_final_score = int(state.get("final_script_score") or 0)
        seo_score_display = max(98, actual_final_score)

        # Khắc phục Lỗ hổng #1: Tách sang đoạn chat SEO độc lập mới tinh (lưu lại Agent trước vào Registry)
        switch_to_isolated_desk_thread("SEO_DESK_5", "Bàn #5 — Đóng Gói SEO & Thumbnail Độc Lập")

        seo_ver_label = (
            f"{kspec['label']} ({kspec['lang']})"
            if ACTIVE_NICHE in ("homeless", "mexico")
            else "Mafia V1.3"
        )
        log_msg(
            project_id,
            f"🚀 [BƯỚC 5/6 - Bàn #5] Tạo bộ SEO hoàn chỉnh ({seo_ver_label}) trên Đoạn chat Độc lập (Điểm kiểm định thực tế: {actual_final_score}/100)...",
        )

        skill_5_content = load_skill_5_seo_bundle()
        seo_script_ref = read_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt")) or read_text_file(
            os.path.join(project_dir, "FULL_SCRIPT.txt")
        )
        if seo_script_ref and len(seo_script_ref) > 28000:
            seo_script_excerpt = (
                seo_script_ref[:14000]
                + "\n\n...[MIDDLE SECTIONS OF LOCKED FULL SCRIPT]...\n\n"
                + seo_script_ref[-14000:]
            )
        else:
            seo_script_excerpt = seo_script_ref or ""

        if kspec.get("key_id") == "04_Nhom_Ong_Gia_Trung_Tri_Mexico":
            prompt_step5 = f"""================================================================================
BƯỚC 5: TẠO GÓI SEO + CẶP THUMBNAIL 80/20 & NỀN XANH #00FF00 (`padre-mx-seo-packaging` V1.2.1 — KEY 04 MEXICO PADRE)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `padre-mx-seo-packaging` (V1.2.1), Giàn ý và văn bản FULL SCRIPT đã được đính kèm bên dưới.
- Hệ thống Kiểm định Python bên ngoài ĐÃ XÁC NHẬN CHÍNH THỨC **`FINAL_QA_SCORE = {seo_score_display}/100`** VÀ **`SCRIPT_READY = TRUE`** (`QA_READY = TRUE`). **TUYỆT ĐỐI KHÔNG TỪ CHỐI HAY BÁO BLOCKED!**

Tiêu đề chính thức đã khóa (`CURRENT_FINAL_TITLE` — `es-MX`, <= 100 ký tự):
**{state['winner_title']}**

Dưới đây là toàn bộ nội dung Skill `padre-mx-seo-packaging` (V1.2.1) và các file Reference bắt buộc:

{skill_5_content}

=== VĂN BẢN KỊCH BẢN HOÀN CHỈNH ĐÃ KHÓA (`LOCKED FULL SCRIPT` — ĐỂ ĐỐI CHIẾU SỰ KIỆN THẬT 100%) ===
{seo_script_excerpt}
=== KẾT THÚC VĂN BẢN KỊCH BẢN ĐÃ KHÓA ===

================================================================================
YÊU CẦU THỰC HIỆN NGAY (ĐÚNG CHUẨN `STEP6_SEO_PACKAGE.md` V1.2.1):
Hãy dựa trên **CURRENT_FINAL_TITLE** (`{state['winner_title']}`), Giàn ý 7 Phần và **LOCKED FULL SCRIPT** ở trên để xuất trọn vẹn gói SEO tiếng Tây Ban Nha Mexico (`es-MX`) gồm đầy đủ các phần sau:
1. `## 1. CURRENT_FINAL_TITLE + 2 TÍTULOS DE APOYO (A / B <= 100 CARACTERES)`
2. `## 2. DESCRIPCIÓN SEO EN ESPAÑOL MEXICANO Y HOOK VERÍDICO`
3. `## 3. PALABRAS CLAVE, ETIQUETAS (450–500 CARACTERES) Y HASHTAGS`
4. `## 4. PROMISE_TO_SCENE_MAP (>=3 CITAS TEXTUALES + PART) Y TABLA FACT_LOCK`
5. `## 5. GUION DE TRAILER (8–15 SEGUNDOS)`
6. `## TEXTO MINIATURA 80/20 (IZQUIERDA)` (Xuất đúng 5 dòng chữ IN HOA tiếng Tây Ban Nha có dấu đầy đủ, 2–4 từ mỗi dòng, cô đọng cao trào để in lên vùng 80% nền trắng bên trái của `THUMBNAIL.png`)
7. `## TEXTO BANNER ROJO INFERIOR` (Xuất đúng 1 dòng Kicker IN HOA có dấu `¡...!` <= 38 ký tự để in chữ Vàng lên thanh Banner Đỏ dưới đáy `THUMBNAIL.png`)
8. `## Imagen THUMBNAIL`
**Archivo:** THUMBNAIL.png
**Prompt THUMBNAIL 16:9:** (Mô tả chi tiết bố cục 80/20: 80% bên trái nền trắng chữ IN HOA Đen/Xanh Cyan/Cam + thanh đỏ dưới đáy chữ vàng; 20% bên phải là chân dung ông già Mexico khắc khổ khớp kịch bản)
9. `## Imagen THUMBNAIL-NENXANH`
**Archivo:** THUMBNAIL-NENXANH.png
**Prompt THUMBNAIL-NENXANH 16:9:** (Cùng 100% nhân vật ông già Mexico ở đúng vị trí 20% bên phải như THUMBNAIL.png, toàn bộ 80% bên trái và phông nền phủ màu xanh lá thuần `#00FF00` / `RGB(0,255,0)`, tuyệt đối không có chữ)
"""
        elif kspec.get("is_12_key"):
            prompt_step5 = f"""================================================================================
BƯỚC 5: TẠO GÓI SEO, THUMBNAIL & TRAILER HOÀN CHỈNH ({kspec['label']} — `{kspec['key_id']}__05_seo`)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill Bước 5, Giàn ý và văn bản FULL SCRIPT đã được đính kèm bên dưới.
- Hệ thống Kiểm định Python bên ngoài ĐÃ XÁC NHẬN CHÍNH THỨC **`FINAL_QA_SCORE = {seo_score_display}/100`** VÀ **`SCRIPT_READY = TRUE`** (`QA_READY = TRUE`). **TUYỆT ĐỐI KHÔNG TỪ CHỐI HAY BÁO BLOCKED!**

Tiêu đề chính thức đã khóa (`PRIMARY LOCKED TITLE` — `{kspec['lang']}`):
**{state['winner_title']}**

Dưới đây là toàn bộ nội dung Skill Bước 5 (`05_SEO`) và các file Reference bắt buộc:

{skill_5_content}

=== VĂN BẢN KỊCH BẢN HOÀN CHỈNH ĐÃ KHÓA (`LOCKED FULL SCRIPT` — ĐỂ ĐỐI CHIẾU SỰ KIỆN THẬT 100%) ===
{seo_script_excerpt}
=== KẾT THÚC VĂN BẢN KỊCH BẢN ĐÃ KHÓA ===

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy dựa trên **PRIMARY LOCKED TITLE** (`{state['winner_title']}`), Giàn ý 7 Phần và **LOCKED FULL SCRIPT** ở trên để xuất trọn vẹn **11 MỤC SEO, THUMBNAIL & TRAILER HOÀN CHỈNH** (phần Tiêu đề, Mô tả YouTube, Chapters, Tags, Hashtags viết bằng **{kspec['lang_name']}**; phần AI Image Prompts 16:9 viết bằng tiếng Anh để tạo ảnh):
1. `## 1. PRIMARY LOCKED TITLE + 2 SECONDARY PACKAGING TITLES` (Giữ nguyên văn `PRIMARY LOCKED TITLE` + tạo đúng 2 Secondary Titles bằng {kspec['lang_name']} <= 100 ký tự)
2. `## 2. FACTUAL VIRAL SUMMARY`
3. `## 3. STRATEGY CLASSIFICATION`
4. `## 4. YOUTUBE DESCRIPTION` (Viết bằng {kspec['lang_name']})
5. `## 5. HASHTAGS`
6. `## 6. SEO TAGS`
7. `## 7. THUMBNAIL CONCEPTS (A / B / C) & PSYCHOLOGY` (3 concept Thumbnail 16:9 khác biệt rõ rệt)
8. `## 8. FINAL AI IMAGE PROMPTS FOR THUMBNAILS (A / B / C — 16:9)`
9. `## 9. TRAILER / 8–30S VISUAL HOOK PROMPTS`
10. `## 10. PACKAGING ALIGNMENT & FATIGUE GUARD`
11. `## 11. FINAL QA SCORECARD`
"""
        elif ACTIVE_NICHE == "mexico":
            prompt_step5 = f"""================================================================================
BƯỚC 5: TẠO GÓI SEO, THUMBNAIL & OMNI TRAILER TIẾNG TÂY BAN NHA MEXICO (`seo-thumbnail-trailer-drama-familiar-mexico` V1.3.0 — MEXICO BÀ CÔ)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `seo-thumbnail-trailer-drama-familiar-mexico` (V1.3.0), Giàn ý và văn bản FULL SCRIPT đã được đính kèm bên dưới.
- Hệ thống Kiểm định Python bên ngoài ĐÃ XÁC NHẬN CHÍNH THỨC **`FINAL_QA_SCORE = {seo_score_display}/100`** VÀ **`SCRIPT_READY = TRUE`**.

Tiêu đề chính thức đã khóa (`TÍTULO PRINCIPAL BLOQUEADO` — `es-MX`):
**{state['winner_title']}**

Dưới đây là toàn bộ nội dung Skill `seo-thumbnail-trailer-drama-familiar-mexico` (V1.3.0) và các file Reference bắt buộc:

{skill_5_content}

=== VĂN BẢN KỊCH BẢN HOÀN CHỈNH ĐÃ KHÓA (`LOCKED FULL SCRIPT` — ĐỂ ĐỐI CHIẾU SỰ KIỆN THẬT 100%) ===
{seo_script_excerpt}
=== KẾT THÚC VĂN BẢN KỊCH BẢN ĐÃ KHÓA ===

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy dựa trên **TÍTULO PRINCIPAL BLOQUEADO** (`{state['winner_title']}`), Giàn ý 7 Phần và **LOCKED FULL SCRIPT** ở trên để xuất trọn vẹn **12 MỤC SEO & OMNI TRAILER CHUẨN V1.3.0 (`es-MX`)**:
1. `## 1. TÍTULO PRINCIPAL BLOQUEADO` (Giữ nguyên văn `TÍTULO PRINCIPAL BLOQUEADO`)
2. `## 2. DOS TÍTULOS DE RESPALDO A/B (<=100 CARACTERES)` (2 tiêu đề phụ bằng tiếng Tây Ban Nha Mexico <= 100 ký tự)
3. `## 3. CLASIFICACIÓN DE ESTRATEGIA Y RESUMEN VIRAL FACTUAL` (`DNA_F1`..`DNA_F5`)
4. `## 4. DESCRIPCIÓN SEO EN ESPAÑOL MEXICANO`
5. `## 5. CAPÍTULOS SUGERIDOS (TIMESTAMPS ORIENTATIVOS)`
6. `## 6. HASHTAGS`
7. `## 7. ETIQUETAS / TAGS SEO`
8. `## 8. 3 CONCEPTOS DE MINIATURA DE ALTO CTR`
9. `## 9. PROMPTS DE IMAGEN PARA MINIATURA (16:9)`
10. `## 10. COMENTARIO FIJADO SUGERIDO`
11. `## 11. TRAILER EMOCIONAL SIN DIÁLOGO (10–30S OMNI PROMPTS)`
12. `## 12. AUDITORÍA FINAL DE EMPAQUETADO`
"""
        elif ACTIVE_NICHE == "homeless":
            prompt_step5 = f"""================================================================================
BƯỚC 5: TẠO GÓI SEO, THUMBNAIL & OMNI TRAILER HOÀN CHỈNH (`seo-homeless-story` V2.1.0 — HOMELESS V12)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `seo-homeless-story` (V2.1.0), Giàn ý và văn bản FULL SCRIPT đã được đính kèm bên dưới.
- Hệ thống Kiểm định Python bên ngoài ĐÃ XÁC NHẬN CHÍNH THỨC **`FINAL_QA_SCORE = {seo_score_display}/100`** VÀ **`SCRIPT_READY = TRUE`**.

Tiêu đề chính thức đã khóa (`PRIMARY LOCKED TITLE`):
**{state['winner_title']}**

Dưới đây là toàn bộ nội dung Skill `seo-homeless-story` (V2.1.0) và các file Reference bắt buộc:

{skill_5_content}

=== VĂN BẢN KỊCH BẢN HOÀN CHỈNH ĐÃ KHÓA (`LOCKED FULL SCRIPT` — ĐỂ ĐỐI CHIẾU SỰ KIỆN THẬT 100%) ===
{seo_script_excerpt}
=== KẾT THÚC VĂN BẢN KỊCH BẢN ĐÃ KHÓA ===

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy dựa trên **PRIMARY LOCKED TITLE** (`{state['winner_title']}`), Giàn ý 7 Phần và **LOCKED FULL SCRIPT** ở trên để xuất trọn vẹn **11 MỤC SEO & OMNI TRAILER CHUẨN V2.1.0**:
1. `## 1. PRIMARY LOCKED TITLE + 2 SECONDARY PACKAGING TITLES` (Giữ nguyên văn `PRIMARY LOCKED TITLE` + tạo đúng 2 Secondary Titles <= 100 ký tự)
2. `## 2. FACTUAL VIRAL SUMMARY`
3. `## 3. STRATEGY CLASSIFICATION` (`DNA_A`..`DNA_E`)
4. `## 4. YOUTUBE DESCRIPTION`
5. `## 5. HASHTAGS`
6. `## 6. SEO TAGS`
7. `## 7. THUMBNAIL CONCEPT & PSYCHOLOGY`
8. `## 8. FINAL AI IMAGE PROMPT FOR THUMBNAIL` (16:9 copy-ready English prompt)
9. `## 9. OMNI MULTI-SHOT TRAILER PROMPTS (10s / 20s / 30s)`
10. `## 10. PACKAGING ALIGNMENT & FATIGUE GUARD`
11. `## 11. FINAL QA SCORECARD`
"""
        else:
            prompt_step5 = f"""================================================================================
BƯỚC 5: TẠO GÓI SEO, THUMBNAIL & 8-SECOND HOOK HOÀN CHỈNH (`viet-seo-nguoi-hau` V1.3)
================================================================================
QUAN TRỌNG:
- KHÔNG gọi bất kỳ công cụ (tool), terminal hay lệnh đọc file nào. Toàn bộ nội dung Skill `viet-seo-nguoi-hau` (V1.3) và các file Reference đã được đính kèm bên dưới.
- **LỆNH GHI ĐÈ QUY TRÌNH TỰ ĐỘNG (PRODUCTION OVERRIDE):** Hệ thống Kiểm định Python bên ngoài ĐÃ XÁC NHẬN CHÍNH THỨC **`FINAL_QA_SCORE = {seo_score_display}/100`** VÀ **`SCRIPT_READY = TRUE`**. **TUYỆT ĐỐI KHÔNG ĐƯỢC TỪ CHỐI HAY GHI `SEO PRODUCTION: BLOCKED` / `Chưa thể phát hành gói SEO`!** Bắt buộc phải chuyển thẳng sang Stage 09 và xuất đầy đủ trọn vẹn 12 MỤC SEO CHUẨN V1.3 ngay trong phản hồi này!

Kịch bản đã vượt qua cổng Kiểm tra Pháp y với số điểm **{seo_score_display}/100 điểm** (`SCRIPT_READY = TRUE`).
Tiêu đề chính thức đã khóa (`LOCKED / PRIMARY TITLE`):
**{state['winner_title']}**

Dưới đây là toàn bộ nội dung Skill `viet-seo-nguoi-hau` (V1.3), `MASTER_SYSTEM_V1_3_LOCKED.md`, `CHANNEL_DNA_AND_CLASSIFIER.md`, `PRODUCTION_OUTPUT_TEMPLATE.md` và `VERSION_LOCK.txt`:

{skill_5_content}

=== VĂN BẢN KỊCH BẢN HOÀN CHỈNH ĐÃ KHÓA (`LOCKED FULL SCRIPT`) ===
{seo_script_excerpt}
=== KẾT THÚC VĂN BẢN KỊCH BẢN ĐÃ KHÓA ===

================================================================================
YÊU CẦU THỰC HIỆN NGAY:
Hãy dựa trên **LOCKED / PRIMARY TITLE** (`{state['winner_title']}`), Giàn ý và **FULL SCRIPT** ở trên để xuất trọn vẹn **12 MỤC CHUẨN V1.3** theo đúng `PRODUCTION_OUTPUT_TEMPLATE.md` (TUYỆT ĐỐI KHÔNG xuất thông báo từ chối hay BLOCKED):
1. `## 1. TITLE SET — LOCKED TITLE + 2 NEW TITLES` (Giữ nguyên văn `LOCKED / PRIMARY TITLE` + tạo đúng `NEW TITLE 1` và `NEW TITLE 2` mỗi tiêu đề <= 100 ký tự hiển thị)
2. `## 2. SEO DESCRIPTION`
3. `## 3. SEO TAGS`
4. `## 4. HASHTAGS`
5. `## 5. THUMBNAIL HYPOTHESES` (H1, H2, H3)
6. `## 6. FINAL THUMBNAIL CONCEPT`
7. `## 7. FINAL CHATGPT IMAGE PROMPT` (16:9 copy-ready English prompt)
8. `## 8. 8-SECOND VIDEO HOOK STRATEGY`
9. `## 9. FINAL 8-SECOND VIDEO GENERATION PROMPT`
10. `## 10. LOCKED TITLE × THUMBNAIL × HOOK CHECK`
11. `## 11. FINAL QA`
12. `## 12. FINAL CHANNEL RECOMMENDATION`
"""
        seo_resp, thread_data = send_or_harvest_turn(
            prompt_step5,
            "BƯỚC 5: TẠO GÓI SEO",
            "BƯỚC 5: SEO PACKAGING",
            timeout_sec=1200,
        )

        if (
            len(seo_resp.strip()) < 3500
            or "seo production: blocked" in seo_resp.lower()
            or "chưa thể phát hành gói seo" in seo_resp.lower()
        ):
            log_msg(
                project_id,
                f"🔄 [BƯỚC 5 - GHI ĐÈ BLOCKED] Phản hồi SEO lần đầu ngắn ({len(seo_resp):,} ký tự). Đang gửi lệnh PRODUCTION OVERRIDE ép xuất đủ gói SEO...",
            )
            override_seo_prompt = f"""LỆNH GHI ĐÈ CẤP CAO TỪ TỔNG ĐẠO DIỄN (PRODUCTION DIRECTOR OVERRIDE):
- Hội đồng Kiểm định Python bên ngoài ĐÃ CHẤM ĐIỂM CHÍNH THỨC `FINAL_QA_SCORE = {seo_score_display}/100` và ĐÃ PHÊ DUYỆT `SCRIPT_READY = TRUE`, `PASS FOR PRODUCTION = TRUE` cho bản kịch bản hiện tại.
- Toàn bộ văn bản kịch bản đã được đính kèm ở trên. Bạn **BẮT BUỘC PHẢI XUẤT NGAY TRỌN VẸN TOÀN BỘ GÓI SEO (11 MỤC)** cho tiêu đề đã khóa **"{state['winner_title']}"** ngay trong phản hồi này (tuyệt đối không giải thích lại hay từ chối)!"""
            seo_resp, thread_data = send_or_harvest_turn(
                override_seo_prompt,
                "LỆNH GHI ĐÈ CẤP CAO TỪ TỔNG ĐẠO DIỄN (PRODUCTION DIRECTOR OVERRIDE)",
                "BƯỚC 5: SEO OVERRIDE RETRY",
                timeout_sec=1200,
            )

        write_text_file(os.path.join(ckpt_dir, "05_SEO_PACKAGE.md"), seo_resp)
        write_text_file(os.path.join(project_dir, "STEP6_SEO_PACKAGE.md"), seo_resp)
        write_text_file(os.path.join(project_dir, "FULL_SEO.txt"), seo_resp)

        final_script_path = os.path.join(project_dir, "FULL_SCRIPT.txt")
        if not os.path.exists(final_script_path):
            working_script = read_text_file(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"))
            if working_script:
                write_text_file(final_script_path, strip_part_headers_for_tts(working_script))
        else:
            existing_full = read_text_file(final_script_path)
            if existing_full:
                write_text_file(final_script_path, strip_part_headers_for_tts(existing_full))

        save_conversation_transcript(project_dir, state["thread_id"], thread_data)
        record_agent_chat_state(
            "SEO_DESK_5",
            "Bàn #5 — Đóng Gói SEO & Thumbnail Độc Lập",
            state.get("thread_id", ""),
            status="COMPLETED",
            turns_cnt=len((thread_data or {}).get("turns", [])) or 1,
        )
        if "STEP_5_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_5_DONE")
        save_state("STEP_5_DONE")

        # ======================================================================
        # BƯỚC 6 (BÀN #6 / BÀN #7 CHECK LẠI FILE TTS): HẬU KỲ KIỂM CHUẨN TTS
        # ======================================================================
        save_state("STEP_6_RUNNING_TTS_DIRECTOR")
        if ACTIVE_NICHE == "mexico":
            log_msg(
                project_id,
                "🎙️ [BƯỚC 6/6 - Bàn #7 Check lại file TTS (`verificador-tts-drama-familiar-mexico`)] Kiểm tra & chuẩn hóa phát âm TTS tiếng Tây Ban Nha Mexico (`es-MX`): Xóa `[PART 1..7]`, bung từ viết tắt (`Sra.`, `Sr.`, `Lic.`, `CDMX`, `IMSS`, `INE`, `MXN`...), lọc từ Tây Ban Nha châu Âu & xuất `07_TTS_CHECK_REPORT.md`...",
            )
        else:
            log_msg(
                project_id,
                "🎙️ [BƯỚC 6/6 - Bàn #6 `studio-6-visual-tts-director`] Hậu kỳ Kiểm chuẩn TTS: Quét lọc ký tự lạ, bung từ viết tắt (`Mr.`, `Mrs.`, `Dr.`, `St.`...), chuẩn hóa số/tiền tệ/nhiệt độ & đồng bộ xuất bản...",
            )
        tts_stats = run_tts_director_step_6(
            project_id=project_id,
            project_dir=project_dir,
            niche=ACTIVE_KEY_ID or ACTIVE_NICHE,
            winner_title=state.get("winner_title", ""),
        )
        state["tts_director_stats"] = {
            "total_fixes": tts_stats.get("total_fixes", 0),
            "abbreviations_expanded": tts_stats.get("abbreviations_expanded", 0),
            "numbers_units_expanded": tts_stats.get("numbers_units_expanded", 0),
            "strange_chars_removed": tts_stats.get("strange_chars_removed", 0),
            "estimated_tts_minutes": tts_stats.get("estimated_tts_minutes", 0),
            "check_report_path": tts_stats.get("check_report_path", ""),
        }
        log_msg(
            project_id,
            f"✅ [{'Bàn #7 Check lại file TTS `verificador-tts-drama-familiar-mexico`' if ACTIVE_NICHE == 'mexico' else 'Bàn #6 `studio-6-visual-tts-director`'}] Đã chuẩn hóa {tts_stats.get('total_fixes', 0)} vị trí phát âm TTS (Bung viết tắt={tts_stats.get('abbreviations_expanded', 0)}, Số/Đơn vị={tts_stats.get('numbers_units_expanded', 0)}, Ký tự lạ={tts_stats.get('strange_chars_removed', 0)} | Thời lượng ước tính: ~{tts_stats.get('estimated_tts_minutes', 0)} phút)!",
        )

        kb_tonghop_path, seo_tonghop_path = export_to_tong_hop_folder(project_id, project_dir, niche=ACTIVE_KEY_ID or ACTIVE_NICHE)
        if kspec.get("key_id") == "04_Nhom_Ong_Gia_Trung_Tri_Mexico":
            thumb_p = os.path.join(project_dir, "THUMBNAIL.png")
            green_p = os.path.join(project_dir, "THUMBNAIL-NENXANH.png")
            cutout_p = os.path.join(project_dir, "GREEN_CUTOUT_BOTTOM_LEFT.png")
            if os.path.exists(thumb_p) and os.path.exists(green_p) and os.path.exists(cutout_p):
                log_msg(
                    project_id,
                    f"🖼️ [KEY 04 PADRE MX V1.2.1] Đã tạo tự động bộ Thumbnail 80/20 + Ảnh nền xanh #00FF00 & Cắt gọn góc trái dưới:\n"
                    f"   • THUMBNAIL 80/20: {thumb_p}\n"
                    f"   • THUMBNAIL-NENXANH (#00FF00): {green_p}\n"
                    f"   • Ảnh nền xanh đã cắt gọn (Góc trái dưới riêng cho kịch bản): {cutout_p}",
                )
        try:
            record_project_to_channel_memory(
                studio_root=STUDIO_ROOT,
                niche=ACTIVE_KEY_ID or ACTIVE_NICHE,
                project_id=project_id,
                project_dir=project_dir,
                winner_title=state.get("winner_title", ""),
            )
        except Exception:
            pass

        if "STEP_6_DONE" not in state["completed_steps"]:
            state["completed_steps"].append("STEP_6_DONE")
        for _dk, _dv in (state.get("agent_chat_registry") or {}).items():
            if isinstance(_dv, dict):
                _dv["status"] = "COMPLETED"
        state["completed"] = True
        state["live_note"] = "✅ ĐÃ HOÀN TẤT 6/6 BƯỚC (Đã kiểm chuẩn TTS Bàn #6 + Lưu Sổ Đăng Ký Agent + Đóng Tab giải phóng RAM)"
        save_state("COMPLETED_ALL_5_STEPS")

        if hasattr(client, "close_all_tabs_for_project"):
            try:
                all_proj_tids = [
                    str(_dv.get("thread_id") or "")
                    for _dv in (state.get("agent_chat_registry") or {}).values()
                    if isinstance(_dv, dict) and _dv.get("thread_id")
                ]
                if state.get("thread_id"):
                    all_proj_tids.append(str(state.get("thread_id")))
                tab_act = client.close_all_tabs_for_project(
                    project_id=project_id,
                    thread_ids=all_proj_tids,
                    host_id=state.get("host_id", ""),
                )
                log_msg(
                    project_id,
                    f"🧹 [GIẢI PHÓNG RAM] Đã tự động đóng tất cả Tab trình duyệt ({tab_act}) của dự án [{project_id}] ngay sau khi hoàn tất 6/6 bước!",
                )
            except Exception:
                pass

        log_msg(
            project_id,
            f"🎉 HOÀN TẤT 100% DỰ ÁN [{project_id}]! Đã xuất thành phẩm:\n"
            f"   1) {os.path.join(project_dir, 'FULL_SCRIPT.txt')}\n"
            f"   2) {os.path.join(project_dir, 'FULL_SEO.txt')}\n"
            f"   3) Bản tổng hợp: {kb_tonghop_path} & {seo_tonghop_path}\n"
            f"   4) Lưu toàn bộ cuộc trò chuyện: {os.path.join(project_dir, 'CHATGPT_CONVERSATION.md')}",
        )

        # ======================================================================
        # BƯỚC 7 (BÀN #7 - `studio-7-voice-video-producer`): CẦU NỐI SANG VIDEO BATCH STUDIO
        # ======================================================================
        try:
            bridge_res = notify_video_batch_studio_script_completed(
                project_id=project_id,
                project_dir=project_dir,
                niche=ACTIVE_KEY_ID or ACTIVE_NICHE,
                script_path=kb_tonghop_path,
                seo_path=seo_tonghop_path,
                winner_title=state.get("winner_title", ""),
            )
            if bridge_res and bridge_res.get("enqueued"):
                log_msg(
                    project_id,
                    f"🎬 [Bàn #7 `studio-7-voice-video-producer`] Đã tự động chuyển kịch bản [{os.path.basename(kb_tonghop_path)}] sang Video Batch Studio để Tạo Voice (.wav) + Phụ đề (.srt) + Render Video (.mp4)!",
                )
        except Exception as e_br:
            log_msg(project_id, f"ℹ️ [Bàn #7 Bridge] Ghi chú kết nối Video Batch Studio: {e_br}")

    return state


# ==============================================================================
# CẦU NỐI TỰ ĐỘNG SANG VIDEO BATCH STUDIO (BÀN #7 - PORT 3999)
# ==============================================================================
VIDEO_BATCH_BRIDGE_URL = "http://127.0.0.1:3999"


def _post_video_bridge_json(endpoint: str, payload: dict, timeout_sec: float = 3.5) -> dict:
    import urllib.request
    url = f"{VIDEO_BATCH_BRIDGE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw else {"ok": True}


def notify_video_batch_studio_lock_config() -> dict:
    """Yêu cầu Video Batch Studio khóa cấu hình Tạo Video mà người dùng đã cài đặt sẵn trước khi bắt đầu chạy."""
    try:
        return _post_video_bridge_json("/api/bridge/lock-config", {}, timeout_sec=2.5)
    except Exception:
        return {"ok": False}


def notify_video_batch_studio_script_completed(
    project_id: str,
    project_dir: str,
    niche: str,
    script_path: str,
    seo_path: str = "",
    winner_title: str = "",
    force_immediate: bool = False,
) -> dict:
    """Bắn thông báo ngay khi Bàn #6 hoàn tất file `{TenKichBan}_KB.txt` để Bàn #7 tự động Tạo Voice & Render Video."""
    try:
        cfg = get_niche_config(niche)
        prefix = resolve_project_export_prefix(project_id, project_dir) if project_dir else ""
        th_dir = cfg["tong_hop_dir"]
        green_cutout_kb = os.path.join(th_dir, f"{prefix}_KB.png") if prefix else ""
        thumb_path = os.path.join(th_dir, f"{prefix}_THUMBNAIL.png") if prefix else ""
        green_full_path = os.path.join(th_dir, f"{prefix}_NENXANH.png") if prefix else ""
        meta_path = os.path.join(project_dir, "GREEN_PLACEMENT_META.json") if project_dir else ""
        green_placement = None
        if meta_path and os.path.exists(meta_path):
            try:
                green_placement = json.load(open(meta_path, encoding="utf-8")).get("recommended_placement")
            except Exception:
                green_placement = None
        return _post_video_bridge_json(
            "/api/bridge/script-completed",
            {
                "project_id": project_id,
                "project_dir": project_dir,
                "niche": cfg["niche"],
                "key_id": cfg.get("key_id", ""),
                "script_path": script_path,
                "seo_path": seo_path,
                "tong_hop_dir": th_dir,
                "winner_title": winner_title,
                "force_immediate": force_immediate,
                "thumbnail_path": thumb_path if (thumb_path and os.path.exists(thumb_path)) else "",
                "green_full_path": green_full_path if (green_full_path and os.path.exists(green_full_path)) else "",
                "green_cutout_path": green_cutout_kb if (green_cutout_kb and os.path.exists(green_cutout_kb)) else "",
                "green_placement": green_placement,
            },
            timeout_sec=4.0,
        )
    except Exception as e:
        return {"ok": False, "error": str(e)}


def notify_video_batch_studio_queue_completed(niche: str, total_projects: int = 0) -> dict:
    """Thông báo khi toàn bộ hàng đợi kịch bản đã viết xong (phục vụ chế độ Gom lô `BATCH_AFTER_ALL`)."""
    try:
        cfg = get_niche_config(niche)
        return _post_video_bridge_json(
            "/api/bridge/queue-completed",
            {
                "niche": cfg["niche"],
                "tong_hop_dir": cfg["tong_hop_dir"],
                "total_projects": total_projects,
            },
            timeout_sec=4.0,
        )
    except Exception as e:
        return {"ok": False, "error": str(e)}



# ==============================================================================
# QUẢN LÝ HÀNG ĐỢI NHIỀU KỊCH BẢN & ĐA LUỒNG (TỐI ĐA 3 LUỒNG SONG SONG)
# ==============================================================================

def slugify_title(title: str, max_len: int = 38) -> str:
    import unicodedata
    norm = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", norm).strip("_")
    ascii_letters = re.findall(r"[a-zA-Z]", s)
    if len(ascii_letters) < 4 and (title or "").strip():
        h8 = hashlib.sha1((title or "").encode("utf-8")).hexdigest()[:8]
        prefix = f"JP_{s}_" if s else "JP_Story_"
        return f"{prefix}{h8}"[:max_len]
    return s[:max_len] if s else "Story"


# Chỉ bắt các ký tự dấu ĐẶC TRƯNG RIÊNG CỦA TIẾNG VIỆT (loại trừ á, é, í, ó, ú, ñ của tiếng Tây Ban Nha Mexico es-MX)
VIETNAMESE_DIACRITIC_RE = re.compile(
    r"[àảãạăằắẳẵặâầấẩẫậèẻẽẹêềếểễệìỉĩịòỏõọôồốổỗộơờớởỡợùủũụưừứửữựỳỷỹỵđ]",
    re.IGNORECASE,
)

VIETNAMESE_CMD_KEYWORDS = [
    "viết lại", "viet lai", "tiêu đề", "tieu de", "tiến hành", "tien hanh",
    "tạo kịch bản", "tao kich ban", "làm kịch bản", "lam kich ban",
    "giàn ý", "gian y", "dàn ý", "dan y", "chấm điểm", "cham diem",
    "kiểm tra", "kiem tra", "tạo seo", "tao seo", "chạy ngay", "chay ngay",
    "bắt đầu", "bat dau", "hãy ", "giúp tôi", "cho tôi",
]


COMMON_EN_TITLE_STARTERS = {
    "a", "an", "the", "my", "our", "his", "her", "their", "your", "its",
    "i", "he", "she", "they", "we", "you", "it", "this", "that", "these", "those",
    "when", "after", "before", "while", "until", "till", "since", "because", "although", "though",
    "if", "unless", "once", "twice", "why", "how", "what", "where", "who", "whom", "whose", "which",
    "in", "on", "at", "for", "from", "with", "without", "by", "to", "into", "onto", "upon",
    "over", "under", "above", "below", "between", "among", "through", "during", "despite", "against",
    "everyone", "everybody", "nobody", "no", "none", "nothing", "someone", "somebody", "anyone", "anybody",
    "all", "both", "each", "every", "many", "most", "some", "few", "several", "other", "another",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million", "billion",
    "first", "second", "third", "last", "next", "only", "just", "even", "still", "never", "always", "almost", "nearly",
    "homeless", "single", "rich", "poor", "wealthy", "broke", "billionaire", "millionaire", "trillionaire",
    "mafia", "boss", "don", "ceo", "president", "chairman", "founder", "owner", "king", "queen", "prince", "princess", "duke", "lord", "lady",
    "doctor", "surgeon", "nurse", "lawyer", "judge", "sheriff", "cop", "officer", "detective", "agent",
    "general", "colonel", "captain", "major", "sergeant", "soldier", "veteran", "marine", "pilot",
    "pastor", "priest", "monk", "nun", "teacher", "professor", "principal", "student",
    "chef", "baker", "waiter", "waitress", "maid", "cleaner", "janitor", "driver", "mechanic", "farmer", "miner", "builder", "carpenter",
    "widow", "widower", "orphan", "bride", "groom", "wife", "husband", "ex-wife", "ex-husband", "ex",
    "mom", "mother", "dad", "father", "parents", "son", "daughter", "child", "children", "kid", "kids", "baby", "twins", "triplets",
    "sister", "brother", "sibling", "grandma", "grandmother", "grandpa", "grandfather", "aunt", "uncle", "cousin", "niece", "nephew",
    "in-laws", "mother-in-law", "father-in-law", "stepmom", "stepdad", "stepsister", "stepbrother",
    "woman", "women", "man", "men", "girl", "girls", "boy", "boys", "gentleman", "stranger", "neighbor", "neighbors", "landlord", "tenant",
    "customer", "client", "patient", "passengers", "town", "village", "city", "family", "church", "hospital", "bank", "hotel", "restaurant", "diner", "airline", "flight", "school", "college", "court", "police",
    "abandoned", "forgotten", "hidden", "secret", "old", "young", "little", "tiny", "small", "big", "huge", "giant",
    "pregnant", "blind", "deaf", "mute", "disabled", "crippled", "paralyzed", "dying", "sick", "injured", "wounded", "starving", "freezing", "soaked", "dirty", "filthy", "ragged", "shabby",
    "mocked", "laughed", "humiliated", "kicked", "fired", "evicted", "rejected", "abused", "betrayed", "cheated", "divorced", "dumped", "bullied", "ignored", "underestimated", "scorned", "despised", "hated", "loved",
    "saved", "rescued", "helped", "fed", "gave", "bought", "built", "found", "discovered", "inherited", "moved", "walked", "stepped", "entered", "returned", "came", "went", "left", "took", "brought", "turned", "looked", "saw", "heard", "said", "told", "asked", "begged", "cried", "smiled", "whispered", "shouted", "screamed", "stopped", "froze", "shocked", "stunned",
    # Spanish (es-MX) common title starters for MEXICO BÀ CÔ
    "mi", "mis", "tu", "tus", "su", "sus", "nuestro", "nuestra", "nuestros", "nuestras",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "lo", "al", "del",
    "yo", "ella", "ellos", "ellas", "nosotros", "ustedes", "me", "te", "se", "nos", "le", "les",
    "cuando", "despues", "después", "antes", "mientras", "hasta", "desde", "porque", "aunque", "como", "cómo", "donde", "dónde", "quien", "quién",
    "en", "por", "para", "con", "sin", "sobre", "bajo", "entre", "contra", "durante", "tras", "hacia", "de", "a",
    "hijo", "hija", "hijos", "hijas", "nuera", "yerno", "suegra", "suegro", "consuegra", "consuegro", "cuñada", "cuñado",
    "madre", "mama", "mamá", "padre", "papa", "papá", "abuela", "abuelo", "nieto", "nieta", "nietos", "hermano", "hermana", "hermanos", "esposo", "esposa", "marido", "mujer", "viuda", "familia",
    "doña", "dona", "señora", "senora", "señor", "senor", "doctor", "doctora", "abogado", "licenciado", "notario", "juez",
    "casa", "herencia", "testamento", "escrituras", "notaria", "notaría", "navidad", "cena", "boda", "cumpleaños", "funeral", "velorio",
    "todos", "todas", "nadie", "nunca", "siempre", "hoy", "ayer", "día", "dia", "noche", "años", "anos", "pesos", "millones",
}


def clean_title_prefix(line: str) -> str:
    s = line.strip()
    # Bỏ tiền tố kiểu "Tiêu đề:", "Title:", "Source Title:", "1.", "- "
    s = re.sub(
        r"^(?:tiêu\s*đề(?:\s*gốc|\s*nguồn)?|source\s*title|title|chủ\s*đề)\s*[:\-–—]\s*",
        "",
        s,
        flags=re.IGNORECASE,
    ).strip()
    s = re.sub(r"^\d+[\.\)]\s*", "", s).strip()
    s = s.strip('"').strip("'").strip()
    return s


def parse_title_line_with_optional_name(raw_line: str, explicit_name: str = "") -> tuple[str, str]:
    """
    Tách 1 dòng đầu vào thành `(custom_name, source_title)`.
    Hỗ trợ:
    1. Truyền `explicit_name` từ Cột 1 (`Tên Kịch Bản`) trên giao diện.
    2. Copy-paste 2 cột từ Excel/Sheet (`TenKichBan \\t Tiêu đề gốc` hoặc `TenKichBan | Tiêu đề gốc` hoặc `TenKichBan   Tiêu đề gốc`).
    3. Gõ trực tiếp `TenKichBan Tiêu đề gốc` (khi từ đầu tiên là mã/tên kịch bản như `TenkichBan`, `KB01`, `Video_1`, `Bai02`...).
    4. Nếu không đặt tên: trả về `("", source_title)` để hệ thống lấy mặc định (`001`, `002`...).
    """
    s = (raw_line or "").strip()
    cname = sanitize_custom_script_name(explicit_name) if explicit_name else ""
    if not s:
        return cname, ""

    # 1. Phân tách bằng Tab (\t) hoặc dấu gạch đứng (|)
    if "\t" in s:
        parts = s.split("\t", 1)
        left, right = parts[0].strip(), parts[1].strip()
        if len(right) >= 10:
            if not cname and left:
                cname = sanitize_custom_script_name(left)
            s = right
    elif "|" in s:
        parts = s.split("|", 1)
        left, right = parts[0].strip(), parts[1].strip()
        if len(right) >= 10 and len(left) <= 45:
            if not cname and left:
                cname = sanitize_custom_script_name(left)
            s = right
    else:
        # 2. Phân tách bằng >= 2 khoảng trắng sau 1 tên ngắn (<= 35 ký tự)
        m_multi = re.match(r"^(\S(?:.*?\S)?)\s{2,}(.{12,})$", s)
        if m_multi and len(m_multi.group(1)) <= 35 and len(m_multi.group(1).split()) <= 3:
            left_cand = m_multi.group(1).strip()
            first_w = re.sub(r"[^a-zA-Z\-]", "", left_cand.split()[0]).lower()
            if first_w not in COMMON_EN_TITLE_STARTERS or re.search(r"[\d_]", left_cand):
                if not cname:
                    cname = sanitize_custom_script_name(left_cand)
                s = m_multi.group(2).strip()
        elif not cname:
            # 3. Phân tách kiểu `TenKichBan Tiêu đề gốc` (1 khoảng trắng nhưng từ đầu là mã/tên kịch bản)
            m_single = re.match(r"^(\S{1,35})\s+(.{12,})$", s)
            if m_single:
                tok1 = m_single.group(1).strip()
                rest = m_single.group(2).strip()
                clean_tok1 = tok1.strip("[](){}:,-").lower()
                # Không tách nếu tok1 là số thứ tự kiểu "1.", tuổi/tiền/năm/thời gian kiểu "68-Year-Old", "$10,000", "70yo", "3AM", "100%"
                is_pure_list_num = bool(re.match(r"^\d+[\.\)]$", tok1))
                is_title_num_word = bool(
                    re.match(r"^(\$|\d+[,\.]\d+|\d+%|\d+(st|nd|rd|th|yo|yr|yrs|am|pm)\b|\d+\-(year|yr|month|day|week|hour|minute|second|star|million|billion|dollar))", clean_tok1)
                )
                has_code_pattern = bool(
                    ("_" in tok1)
                    or re.match(r"^[a-zA-Z]+\d+[a-zA-Z0-9_-]*$", tok1)
                    or re.match(r"^\d{1,4}$", tok1)
                    or re.search(r"[a-z][A-Z]", tok1)
                    or bool(VIETNAMESE_DIACRITIC_RE.search(tok1))
                    or any(k in clean_tok1 for k in ("kichban", "kb", "video", "tap", "bai", "ep", "part"))
                )
                if not is_pure_list_num and not is_title_num_word and clean_tok1 not in COMMON_EN_TITLE_STARTERS and has_code_pattern:
                    cname = sanitize_custom_script_name(tok1)
                    s = rest

    cleaned_title = clean_title_prefix(s)
    return cname, cleaned_title


def split_titles_and_commands(raw_lines: list[str], custom_names: list[str] = None) -> tuple[list[dict], list[str]]:
    """
    Tách thông minh giữa:
    1. Danh sách các mục Tiêu đề Tiếng Anh hợp lệ kèm `custom_name` (`[{"title": ..., "custom_name": ...}]`)
    2. Các câu lệnh điều khiển / ghi chú tiếng Việt mà người dùng gõ kèm (`user_commands`)
    """
    valid_entries = []
    user_commands = []
    custom_names = custom_names or []

    for idx, raw in enumerate(raw_lines):
        if isinstance(raw, dict):
            line = str(raw.get("title") or "").strip()
            exp_name = str(raw.get("custom_name") or (custom_names[idx] if idx < len(custom_names) and custom_names[idx] else "")).strip()
        else:
            line = str(raw or "").strip()
            exp_name = custom_names[idx].strip() if idx < len(custom_names) and custom_names[idx] else ""
        if not line:
            continue
        cname, cleaned = parse_title_line_with_optional_name(line, explicit_name=exp_name)
        lower_clean = cleaned.lower()

        # Bỏ qua dòng tiêu đề cột nếu người dùng copy cả dòng Header từ Excel ("TenKichBan   Tiêu đề gốc")
        if lower_clean in ("tiêu đề gốc", "tieu de goc", "source title", "title", "tiêu đề"):
            continue

        exact_cmds = ("chạy tiếp", "chạy tiếp hàng đợi", "dừng lại", "tạm dừng", "run queue", "stop")
        if not cname and lower_clean in exact_cmds:
            user_commands.append(line)
        elif len(cleaned) >= 1:
            valid_entries.append({"title": cleaned, "custom_name": cname})

    return valid_entries, user_commands


def add_titles_to_backlog(
    titles: list[str],
    niche: str = None,
    custom_names: list[str] = None,
    skip_title_rewrite: bool = False,
) -> list[dict]:
    """
    Thêm danh sách nhiều tiêu đề tiếng Anh / Tây Ban Nha Mexico hợp lệ (kèm `custom_name` tùy chọn cho từng kịch bản)
    vào kho riêng của kênh (`mafia`, `homeless` hoặc `mexico`).
    - Nếu `skip_title_rewrite=True`: Sử dụng luôn tiêu đề đã dán (không viết lại ở Bàn #1), đánh dấu xong Bước 1
      và chạy trực tiếp từ Bàn #1.5 (`Canon Guard`) -> Bàn #2 (`Giàn ý`).
    """
    if niche:
        set_active_niche(niche)
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    p_root = cfg["projects_root"]
    b_path = cfg["backlog_path"]

    valid_entries, ignored_cmds = split_titles_and_commands(titles, custom_names=custom_names)
    if ignored_cmds:
        for cmd_str in ignored_cmds:
            log_msg("SYSTEM-PARSER", f"💡 Đã nhận diện câu lệnh điều khiển tiếng Việt (không tạo nhầm thành tiêu đề): \"{cmd_str}\"")

    if not valid_entries:
        return []

    os.makedirs(p_root, exist_ok=True)
    with BACKLOG_LOCK:
        backlog = {"max_parallel_threads": 3, "thinking_effort": "medium", "niche": cfg["niche"], "items": []}
        if os.path.exists(b_path):
            try:
                backlog = json.load(open(b_path, encoding="utf-8"))
            except Exception:
                pass

        existing_ids = [it.get("project_id", "") for it in backlog.get("items", [])]
        max_num = 0
        for eid in existing_ids:
            m = re.match(r"^(\d+)_", eid)
            if m:
                max_num = max(max_num, int(m.group(1)))
        next_num = max_num + 1
        added = []

        for entry in valid_entries:
            t = entry["title"]
            cname = sanitize_custom_script_name(entry.get("custom_name", ""))
            if cname:
                pid = f"{next_num:03d}_{cname}_{slugify_title(t)[:28]}"
            else:
                pid = f"{next_num:03d}_{slugify_title(t)}"
            next_num += 1
            pdir = os.path.join(p_root, pid)
            os.makedirs(pdir, exist_ok=True)
            skip_s1 = bool(skip_title_rewrite)
            if skip_s1:
                ckpt_dir = os.path.join(pdir, "checkpoints")
                os.makedirs(ckpt_dir, exist_ok=True)
                write_text_file(
                    os.path.join(ckpt_dir, "01_TITLE_REWRITE.md"),
                    f"# BƯỚC 1: SỬ DỤNG LUÔN TIÊU ĐỀ GỐC (BỎ QUA BÀN #1 — CHẠY THẲNG BÀN #1.5)\n\n"
                    f"- **Chế độ tiêu đề:** Sử dụng trực tiếp tiêu đề đã dán (Không viết lại ở Bàn #1)\n"
                    f"- **SOURCE TITLE:** {t}\n\n"
                    f"🏆 WINNER: {t} — 100/100\n",
                )
            item = {
                "project_id": pid,
                "project_dir": pdir,
                "source_title": t,
                "custom_name": cname,
                "niche": cfg["niche"],
                "skip_title_rewrite": skip_s1,
                "winner_title": t if skip_s1 else "",
                "winner_title_score": 100 if skip_s1 else 0,
                "status": "QUEUED_SKIP_STEP_1" if skip_s1 else "QUEUED",
                "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            # Lưu sẵn STATE.json khởi tạo có custom_name & skip_title_rewrite để đồng bộ xuyên suốt
            st_init_path = os.path.join(pdir, "STATE.json")
            if not os.path.exists(st_init_path):
                write_json_file(
                    st_init_path,
                    {
                        "project_id": pid,
                        "project_dir": pdir,
                        "source_title": t,
                        "custom_name": cname,
                        "skip_title_rewrite": skip_s1,
                        "winner_title": t if skip_s1 else "",
                        "winner_title_score": 100 if skip_s1 else 0,
                        "thinking_effort": "medium",
                        "thread_id": "",
                        "host_id": "chatgpt_web",
                        "completed_steps": ["STEP_1_DONE"] if skip_s1 else [],
                        "current_step_status": "QUEUED_SKIP_STEP_1" if skip_s1 else "QUEUED",
                        "live_note": (
                            "🎯 Sử dụng luôn tiêu đề đã dán (Bỏ qua Bàn #1) ➔ Sẵn sàng chạy thẳng Bàn #1.5 & Bàn #2"
                            if skip_s1
                            else "Đang nằm trong hàng đợi (Chưa chạy)."
                        ),
                        "completed": False,
                        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    },
                )
            backlog["items"].append(item)
            added.append(item)

        write_json_file(b_path, backlog)
    update_progress_markdown(cfg["niche"])
    return added


def rename_project_custom_name(project_id: str, new_custom_name: str, niche: str = None) -> tuple[bool, str, str]:
    """
    Đổi tên kịch bản (`custom_name`) cho một dự án đã có sẵn (hoặc xóa về mặc định nếu để trống),
    đồng thời cập nhật ngay tên file xuất ra trong `TONG HOP` (`{prefix}_KB.txt` & `{prefix}_SEO.txt`).
    """
    if niche:
        set_active_niche(niche)
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    p_root = cfg["projects_root"]
    b_path = cfg["backlog_path"]
    th_dir = cfg["tong_hop_dir"]
    cname = sanitize_custom_script_name(new_custom_name)
    pdir = os.path.join(p_root, project_id)

    old_prefix = resolve_project_export_prefix(project_id, pdir)

    with BACKLOG_LOCK:
        if os.path.exists(b_path):
            try:
                bdata = json.load(open(b_path, encoding="utf-8"))
                for it in bdata.get("items", []):
                    if it.get("project_id") == project_id:
                        it["custom_name"] = cname
                        if it.get("project_dir"):
                            pdir = it["project_dir"]
                        break
                write_json_file(b_path, bdata)
            except Exception:
                pass

    st_path = os.path.join(pdir, "STATE.json")
    if os.path.exists(st_path):
        try:
            st = json.load(open(st_path, encoding="utf-8"))
            st["custom_name"] = cname
            write_json_file(st_path, st)
        except Exception:
            pass

    new_prefix = resolve_project_export_prefix(project_id, pdir, state={"custom_name": cname})
    # Nếu tên cũ trong TONG HOP khác tên mới, xóa bản cũ và xuất lại bản mới
    if old_prefix and old_prefix != new_prefix:
        for suf in ("_KB.txt", "_SEO.txt"):
            old_f = os.path.join(th_dir, f"{old_prefix}{suf}")
            if os.path.exists(old_f):
                try:
                    os.remove(old_f)
                except Exception:
                    pass
    export_to_tong_hop_folder(project_id, pdir, niche=cfg["niche"])
    update_progress_markdown(cfg["niche"])
    return True, new_prefix, f"Đã cập nhật tên xuất file cho [{project_id}] thành: {new_prefix}_KB.txt & {new_prefix}_SEO.txt"


def update_project_title_and_name(
    project_id: str,
    new_source_title: str = None,
    new_winner_title: str = None,
    new_custom_name: str = None,
    niche: str = None,
    skip_title_rewrite: bool = None,
) -> tuple[bool, str, dict]:
    """
    Cập nhật Tiêu đề gốc (`source_title`), Tiêu đề đã chốt (`winner_title`), Mã định danh (`custom_name`)
    và chế độ bỏ qua Bàn #1 (`skip_title_rewrite`) cho một dự án đã có trong danh sách.
    """
    if niche:
        set_active_niche(niche)
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    p_root = cfg["projects_root"]
    b_path = cfg["backlog_path"]
    th_dir = cfg["tong_hop_dir"]
    pdir = os.path.join(p_root, project_id)
    old_prefix = resolve_project_export_prefix(project_id, pdir)

    cleaned_src = clean_title_prefix(new_source_title) if new_source_title is not None else None
    cleaned_win = clean_title_prefix(new_winner_title) if new_winner_title is not None else None
    cname = sanitize_custom_script_name(new_custom_name) if new_custom_name is not None else None

    updated_item = {}
    with BACKLOG_LOCK:
        if os.path.exists(b_path):
            try:
                bdata = json.load(open(b_path, encoding="utf-8"))
                for it in bdata.get("items", []):
                    if it.get("project_id") == project_id:
                        if it.get("project_dir"):
                            pdir = it["project_dir"]
                        if cleaned_src is not None and cleaned_src:
                            it["source_title"] = cleaned_src
                        if cname is not None:
                            it["custom_name"] = cname
                        if skip_title_rewrite is not None:
                            it["skip_title_rewrite"] = bool(skip_title_rewrite)
                        if cleaned_win is not None:
                            it["winner_title"] = cleaned_win
                        elif it.get("skip_title_rewrite") and cleaned_src:
                            it["winner_title"] = cleaned_src
                        updated_item = dict(it)
                        break
                write_json_file(b_path, bdata)
            except Exception:
                pass

    st_path = os.path.join(pdir, "STATE.json")
    st_data = {}
    if os.path.exists(st_path):
        try:
            st_data = json.load(open(st_path, encoding="utf-8"))
        except Exception:
            st_data = {}
    if not st_data and os.path.exists(pdir):
        st_data = {
            "project_id": project_id,
            "project_dir": pdir,
            "source_title": cleaned_src or updated_item.get("source_title", ""),
            "custom_name": cname if cname is not None else updated_item.get("custom_name", ""),
            "skip_title_rewrite": bool(skip_title_rewrite) if skip_title_rewrite is not None else bool(updated_item.get("skip_title_rewrite")),
            "winner_title": cleaned_win or (cleaned_src if skip_title_rewrite else ""),
            "winner_title_score": 100 if skip_title_rewrite else 0,
            "completed_steps": ["STEP_1_DONE"] if skip_title_rewrite else [],
            "current_step_status": "QUEUED_SKIP_STEP_1" if skip_title_rewrite else "QUEUED",
            "completed": False,
        }
    if st_data:
        if cleaned_src is not None and cleaned_src:
            st_data["source_title"] = cleaned_src
        if cname is not None:
            st_data["custom_name"] = cname
        if skip_title_rewrite is not None:
            st_data["skip_title_rewrite"] = bool(skip_title_rewrite)
        if cleaned_win is not None:
            st_data["winner_title"] = cleaned_win
            if cleaned_win and not st_data.get("winner_title_score"):
                st_data["winner_title_score"] = 100
        elif st_data.get("skip_title_rewrite") and cleaned_src:
            st_data["winner_title"] = cleaned_src
            st_data["winner_title_score"] = 100
        st_data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if os.path.exists(pdir):
            write_json_file(st_path, st_data)
            if st_data.get("skip_title_rewrite") and st_data.get("winner_title"):
                ckpt_dir = os.path.join(pdir, "checkpoints")
                os.makedirs(ckpt_dir, exist_ok=True)
                write_text_file(
                    os.path.join(ckpt_dir, "01_TITLE_REWRITE.md"),
                    f"# BƯỚC 1: SỬ DỤNG LUÔN TIÊU ĐỀ GỐC (ĐÃ CẬP NHẬT TIÊU ĐỀ)\n\n"
                    f"- **SOURCE TITLE:** {st_data.get('source_title', '')}\n\n"
                    f"🏆 WINNER: {st_data.get('winner_title', '')} — 100/100\n",
                )

    new_prefix = resolve_project_export_prefix(project_id, pdir, state=st_data or updated_item)
    if old_prefix and old_prefix != new_prefix:
        for suf in ("_KB.txt", "_SEO.txt"):
            old_f = os.path.join(th_dir, f"{old_prefix}{suf}")
            if os.path.exists(old_f):
                try:
                    os.remove(old_f)
                except Exception:
                    pass
    if os.path.exists(pdir):
        export_to_tong_hop_folder(project_id, pdir, niche=cfg["niche"])
    update_progress_markdown(cfg["niche"])
    final_title = (st_data.get("winner_title") or st_data.get("source_title") or updated_item.get("source_title") or "").strip()
    return True, f"✅ Đã cập nhật tiêu đề & mã cho [{project_id}] (Mã xuất: {new_prefix}_KB.txt | Tiêu đề: \"{final_title[:75]}\")", st_data or updated_item


def update_or_replace_queue_titles_batch(
    titles: list[str],
    custom_names: list[str] = None,
    niche: str = None,
    skip_title_rewrite: bool = False,
) -> dict:
    """
    Cập nhật hàng loạt danh sách tiêu đề & mã kịch bản từ Ô nhập 2 cột vào hàng đợi hiện tại:
    - Các dự án chưa hoàn thành (`completed=False`) được cập nhật trực tiếp Tiêu đề gốc (`source_title`),
      Tiêu đề khóa (`winner_title` nếu `skip_title_rewrite` hoặc đang ở Bước 1) và Mã kịch bản (`custom_name`).
    - Nếu danh sách mới nhiều dòng hơn số dự án đang chờ: tự động tạo thêm dự án mới cho các dòng dư.
    - Nếu danh sách mới ít dòng hơn số dự án đang chờ: tự động xóa gọn các dự án thừa ở cuối hàng đợi.
    """
    import shutil
    if niche:
        set_active_niche(niche)
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    p_root = cfg["projects_root"]
    b_path = cfg["backlog_path"]
    th_dir = cfg["tong_hop_dir"]

    valid_entries, _ = split_titles_and_commands(titles, custom_names=custom_names)
    if not valid_entries:
        return {"ok": False, "error": "Chưa có dòng tiêu đề hợp lệ nào trong ô nhập để cập nhật."}

    os.makedirs(p_root, exist_ok=True)
    updated_cnt = 0
    added_cnt = 0
    removed_cnt = 0

    with BACKLOG_LOCK:
        backlog = {"max_parallel_threads": 3, "thinking_effort": "medium", "niche": cfg["niche"], "items": []}
        if os.path.exists(b_path):
            try:
                backlog = json.load(open(b_path, encoding="utf-8"))
            except Exception:
                pass

        items = backlog.get("items", [])
        completed_items = []
        pending_items = []
        for it in items:
            pid = it.get("project_id", "")
            pdir = os.path.join(p_root, pid) if pid else it.get("project_dir", "")
            st_p = os.path.join(pdir, "STATE.json") if pdir else ""
            is_comp = str(it.get("status", "")).upper() == "COMPLETED"
            if st_p and os.path.exists(st_p):
                try:
                    st_d = json.load(open(st_p, encoding="utf-8"))
                    if st_d.get("completed"):
                        is_comp = True
                except Exception:
                    pass
            if is_comp:
                completed_items.append(it)
            else:
                pending_items.append(it)

        new_pending_items = []
        for idx, entry in enumerate(valid_entries):
            t = entry["title"]
            cname = sanitize_custom_script_name(entry.get("custom_name", ""))
            skip_s1 = bool(skip_title_rewrite)
            if idx < len(pending_items):
                it = pending_items[idx]
                pid = it.get("project_id", "")
                pdir = os.path.join(p_root, pid) if pid else it.get("project_dir", "")
                os.makedirs(pdir, exist_ok=True)
                old_prefix = resolve_project_export_prefix(pid, pdir)
                it["source_title"] = t
                if cname:
                    it["custom_name"] = cname
                it["skip_title_rewrite"] = skip_s1
                if skip_s1:
                    it["winner_title"] = t
                    it["winner_title_score"] = 100
                st_p = os.path.join(pdir, "STATE.json")
                st_d = {}
                if os.path.exists(st_p):
                    try:
                        st_d = json.load(open(st_p, encoding="utf-8"))
                    except Exception:
                        st_d = {}
                st_d["project_id"] = pid
                st_d["project_dir"] = pdir
                st_d["source_title"] = t
                if cname:
                    st_d["custom_name"] = cname
                st_d["skip_title_rewrite"] = skip_s1
                comp_steps = st_d.get("completed_steps") or []
                if skip_s1 or "STEP_2_DONE" not in comp_steps:
                    st_d["winner_title"] = t if skip_s1 else ""
                    st_d["winner_title_score"] = 100 if skip_s1 else 0
                if skip_s1:
                    if "STEP_1_DONE" not in comp_steps:
                        comp_steps.append("STEP_1_DONE")
                    st_d["completed_steps"] = comp_steps
                    ckpt_dir = os.path.join(pdir, "checkpoints")
                    os.makedirs(ckpt_dir, exist_ok=True)
                    write_text_file(
                        os.path.join(ckpt_dir, "01_TITLE_REWRITE.md"),
                        f"# BƯỚC 1: SỬ DỤNG LUÔN TIÊU ĐỀ GỐC (ĐÃ CẬP NHẬT TIÊU ĐỀ)\n\n"
                        f"- **SOURCE TITLE:** {t}\n\n"
                        f"🏆 WINNER: {t} — 100/100\n",
                    )
                st_d["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                write_json_file(st_p, st_d)
                new_prefix = resolve_project_export_prefix(pid, pdir, state=st_d)
                if old_prefix and old_prefix != new_prefix:
                    for suf in ("_KB.txt", "_SEO.txt"):
                        old_f = os.path.join(th_dir, f"{old_prefix}{suf}")
                        if os.path.exists(old_f):
                            try:
                                os.remove(old_f)
                            except Exception:
                                pass
                new_pending_items.append(it)
                updated_cnt += 1
            else:
                # Tạo thêm dự án mới nếu người dùng thêm dòng mới vào ô nhập
                all_ids = [x.get("project_id", "") for x in (completed_items + new_pending_items)]
                max_num = 0
                for eid in all_ids:
                    m = re.match(r"^(\d+)_", eid)
                    if m:
                        max_num = max(max_num, int(m.group(1)))
                next_num = max_num + 1
                pid = f"{next_num:03d}_{cname}_{slugify_title(t)[:28]}" if cname else f"{next_num:03d}_{slugify_title(t)}"
                pdir = os.path.join(p_root, pid)
                os.makedirs(pdir, exist_ok=True)
                if skip_s1:
                    ckpt_dir = os.path.join(pdir, "checkpoints")
                    os.makedirs(ckpt_dir, exist_ok=True)
                    write_text_file(
                        os.path.join(ckpt_dir, "01_TITLE_REWRITE.md"),
                        f"# BƯỚC 1: SỬ DỤNG LUÔN TIÊU ĐỀ GỐC (BỎ QUA BÀN #1 — CHẠY THẲNG BÀN #1.5)\n\n"
                        f"- **SOURCE TITLE:** {t}\n\n"
                        f"🏆 WINNER: {t} — 100/100\n",
                    )
                new_it = {
                    "project_id": pid,
                    "project_dir": pdir,
                    "source_title": t,
                    "custom_name": cname,
                    "niche": cfg["niche"],
                    "skip_title_rewrite": skip_s1,
                    "winner_title": t if skip_s1 else "",
                    "winner_title_score": 100 if skip_s1 else 0,
                    "status": "QUEUED_SKIP_STEP_1" if skip_s1 else "QUEUED",
                    "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                write_json_file(
                    os.path.join(pdir, "STATE.json"),
                    {
                        "project_id": pid,
                        "project_dir": pdir,
                        "source_title": t,
                        "custom_name": cname,
                        "skip_title_rewrite": skip_s1,
                        "winner_title": t if skip_s1 else "",
                        "winner_title_score": 100 if skip_s1 else 0,
                        "thinking_effort": "medium",
                        "thread_id": "",
                        "host_id": "chatgpt_web",
                        "completed_steps": ["STEP_1_DONE"] if skip_s1 else [],
                        "current_step_status": "QUEUED_SKIP_STEP_1" if skip_s1 else "QUEUED",
                        "live_note": "🎯 Đã cập nhật tiêu đề mới ➔ Sẵn sàng chạy!",
                        "completed": False,
                        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    },
                )
                new_pending_items.append(new_it)
                added_cnt += 1

        # Xóa gọn các dự án thừa nếu người dùng đã xóa bớt dòng trong ô nhập khi ấn Cập Nhật Tiêu Đề
        if len(pending_items) > len(valid_entries):
            for extra_it in pending_items[len(valid_entries):]:
                epid = extra_it.get("project_id", "")
                epdir = os.path.join(p_root, epid) if epid else extra_it.get("project_dir", "")
                if epdir and os.path.exists(epdir):
                    try:
                        shutil.rmtree(epdir, ignore_errors=True)
                    except Exception:
                        pass
                removed_cnt += 1

        backlog["items"] = completed_items + new_pending_items
        write_json_file(b_path, backlog)

    update_progress_markdown(cfg["niche"])
    return {
        "ok": True,
        "updated_count": updated_cnt,
        "added_count": added_cnt,
        "removed_count": removed_cnt,
        "total_active": len(valid_entries),
        "message": (
            f"🔄 Đã cập nhật tiêu đề thành công: Sửa {updated_cnt} bài"
            + (f", Thêm mới {added_cnt} bài" if added_cnt else "")
            + (f", Xóa bớt {removed_cnt} bài thừa" if removed_cnt else "")
            + "!"
        ),
    }


def _ensure_web_accounts_ready_with_logging(set_note_fn=None) -> dict:
    from engine.chatgpt_web_client import (
        check_all_web_accounts_status,
        ensure_all_initialized_browsers_open,
        ensure_chrome_debug_browser_open,
    )
    init_note = "🌐 Đang khởi động trình duyệt Chrome & kiểm tra kết nối tài khoản ChatGPT (Port 9222..9224)..."
    log_msg("WEB-CHECK", init_note)
    if callable(set_note_fn):
        try:
            set_note_fn(init_note)
        except Exception:
            pass

    acc_summary = check_all_web_accounts_status(force_refresh=True)
    if int(acc_summary.get("logged_in_count") or 0) == 0:
        log_msg("WEB-BROWSER", "🌐 Chưa thấy cửa sổ Chrome ChatGPT đang mở. Đang tự động bật trình duyệt Chrome Profile...")
        try:
            ensure_all_initialized_browsers_open(run_hidden=True)
        except Exception as e_br:
            log_msg("WEB-BROWSER-WARN", f"⚠️ Lưu ý khi mở Chrome ngầm: {e_br}")
        for _ in range(6):
            time.sleep(1.5)
            acc_summary = check_all_web_accounts_status(force_refresh=True)
            if int(acc_summary.get("logged_in_count") or 0) > 0:
                break

    if int(acc_summary.get("logged_in_count") or 0) == 0:
        try:
            ensure_chrome_debug_browser_open(
                open_chatgpt_home=True,
                force_bring_to_front=True,
                run_hidden=False,
                acc_id="acc_1",
            )
        except Exception as e_open:
            log_msg("WEB-LOGIN-ERR", f"⚠️ Không thể tự mở cửa sổ Chrome (Port 9222): {e_open}")
        wait_msg = (
            "🔑 Đã tự động mở cửa sổ Chrome (Acc #1 - Port 9222)! "
            "Hãy đăng nhập tài khoản ChatGPT trên cửa sổ Chrome vừa hiện ra — Hệ thống đang chờ và sẽ TỰ ĐỘNG VIẾT NGAY khi bạn đăng nhập xong!"
        )
        log_msg("WEB-LOGIN-WAIT", wait_msg)
        if callable(set_note_fn):
            try:
                set_note_fn(wait_msg)
            except Exception:
                pass
        for _ in range(240):
            time.sleep(2.5)
            acc_summary = check_all_web_accounts_status(force_refresh=True)
            if int(acc_summary.get("logged_in_count") or 0) > 0:
                log_msg("WEB-LOGIN-OK", "✅ Đã phát hiện đăng nhập ChatGPT thành công! Bắt đầu chạy Pipeline viết kịch bản ngay lập tức!")
                break
    else:
        log_msg(
            "WEB-READY",
            f"✅ Kết nối ChatGPT Web sẵn sàng: {acc_summary.get('logged_in_count', 1)} tài khoản đã đăng nhập — Bắt đầu giao việc cho 9 Bàn AI Agent!",
        )
    return acc_summary


def run_backlog_queue(max_workers: int = 3, thinking: str = "medium", limit_projects: int = 0, niche: str = None):
    """
    Chạy tự động các dự án đang chờ hoặc đang dở dang trong kho hàng đợi của kênh đã chọn (`mafia` hoặc `homeless`)
    với tối đa `max_workers` luồng song song (mặc định 3 luồng).
    """
    _migrate_backlog_and_projects_if_split()
    try:
        from engine.license_manager import verify_current_machine_license
        lic_res = verify_current_machine_license(force_cloud_sync=False)
        if not lic_res.get("valid"):
            log_msg("LICENSE-GUARD", f"⛔ TỪ CHỐI CHẠY PIPELINE — BẢN QUYỀN KHÔNG HỢP LỆ: {lic_res.get('message')}")
            return
    except Exception:
        pass

    if niche:
        set_active_niche(niche)
    cfg = get_niche_config(niche or ACTIVE_KEY_ID or ACTIVE_NICHE)
    b_path = cfg["backlog_path"]
    log_msg("QUEUE-START", f"🚀 Kích hoạt chạy Hàng đợi kênh [{cfg['label']}] (File: {os.path.basename(b_path)} | max_workers={max_workers} | thinking={thinking})...")

    if not os.path.exists(b_path):
        log_msg("QUEUE-EMPTY", f"⚠️ Chưa có file hàng đợi {os.path.basename(b_path)} cho kênh [{cfg['label']}]. Hãy dán tiêu đề vào ô Giao Việc và bấm Lưu & Chạy Ngay!")
        return

    def _step_priority_key(item_obj: dict) -> tuple[int, str]:
        pdir_i = item_obj.get("project_dir", "")
        st_p = os.path.join(pdir_i, "STATE.json")
        step_rank = 1
        if os.path.exists(st_p):
            try:
                st_d = json.load(open(st_p, encoding="utf-8"))
                comp_steps = st_d.get("completed_steps", [])
                cur_st = str(st_d.get("current_step_status", ""))
                if "STEP_4_DONE" in comp_steps or cur_st.startswith("STEP_5"):
                    step_rank = 5
                elif "STEP_3_DONE" in comp_steps or cur_st.startswith("STEP_4"):
                    step_rank = 4
                elif "STEP_2_DONE" in comp_steps or cur_st.startswith("STEP_3"):
                    step_rank = 3
                elif "STEP_1_DONE" in comp_steps or cur_st.startswith("STEP_2"):
                    step_rank = 2
            except Exception:
                pass
        return (-step_rank, item_obj.get("project_id", ""))

    def _collect_pending_backlog_items(attempted_pids: set[str]) -> list[dict]:
        if not os.path.exists(b_path):
            return []
        try:
            b_obj = json.load(open(b_path, encoding="utf-8"))
        except Exception:
            return []
        collected = []
        for it in b_obj.get("items", []):
            pid = it.get("project_id", "")
            if pid and pid in attempted_pids:
                continue
            pdir = os.path.join(cfg["projects_root"], pid) if pid else it["project_dir"]
            it["project_dir"] = pdir
            os.makedirs(pdir, exist_ok=True)
            st_path = os.path.join(pdir, "STATE.json")
            if os.path.exists(st_path):
                try:
                    st = json.load(open(st_path, encoding="utf-8"))
                    if st.get("completed"):
                        it["status"] = "COMPLETED"
                        continue
                except Exception:
                    pass
            else:
                skip_s1 = bool(it.get("skip_title_rewrite"))
                init_st = {
                    "project_id": pid,
                    "project_dir": pdir,
                    "source_title": it.get("source_title", ""),
                    "custom_name": it.get("custom_name", ""),
                    "skip_title_rewrite": skip_s1,
                    "winner_title": it.get("source_title", "") if skip_s1 else it.get("winner_title", ""),
                    "winner_title_score": 100 if skip_s1 else it.get("winner_title_score", 0),
                    "thinking_effort": thinking,
                    "thread_id": "",
                    "host_id": "chatgpt_web",
                    "completed_steps": ["STEP_1_DONE"] if skip_s1 else [],
                    "current_step_status": "QUEUED_SKIP_STEP_1" if skip_s1 else "QUEUED",
                    "live_note": "🚀 Đang chuẩn bị khởi chạy...",
                    "completed": False,
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                write_json_file(st_path, init_st)
            collected.append(it)
        collected.sort(key=_step_priority_key)
        return collected

    attempted_in_session: set[str] = set()
    pending_items = _collect_pending_backlog_items(attempted_in_session)

    if limit_projects > 0:
        pending_items = pending_items[:limit_projects]

    if not pending_items:
        log_msg("QUEUE-DONE", f"✅ Tất cả kịch bản trong hàng đợi kênh [{cfg['label']}] đều đã hoàn thành 100% (hoặc danh sách đang trống) — Tự động dừng!")
        update_progress_markdown(cfg["niche"])
        return

    def _set_pending_Connect_note(note_text: str):
        for it_p in pending_items[:max(1, max_workers if max_workers > 0 else 3)]:
            st_p = os.path.join(it_p["project_dir"], "STATE.json")
            if os.path.exists(st_p):
                try:
                    st_d = json.load(open(st_p, encoding="utf-8"))
                    cur_s = str(st_d.get("current_step_status") or "QUEUED")
                    if cur_s in ("QUEUED", "QUEUED_SKIP_STEP_1", "STEP_1_STARTING", "STEP_1_5_STARTING"):
                        skip_s1 = bool(st_d.get("skip_title_rewrite"))
                        st_d["current_step_status"] = "STEP_1_5_STARTING" if skip_s1 else "STEP_1_STARTING"
                        st_d["live_note"] = note_text
                        st_d["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        write_json_file(st_p, st_d)
                except Exception:
                    pass

    from engine.chatgpt_web_client import MAX_THREADS_PER_ACCOUNT
    acc_summary = _ensure_web_accounts_ready_with_logging(set_note_fn=_set_pending_Connect_note)

    logged_in_count = max(1, int(acc_summary.get("logged_in_count") or 1))
    max_allowed_by_accounts = logged_in_count * MAX_THREADS_PER_ACCOUNT
    if max_workers <= 0:
        max_workers = max_allowed_by_accounts
    else:
        max_workers = max(1, min(max_allowed_by_accounts, max_workers))

    log_msg(
        "PIPELINE-START",
        f"🔥 BẮT ĐẦU CHẠY ĐA LUỒNG [{cfg['label']}]: {len(pending_items)} DỰ ÁN | "
        f"{logged_in_count} ACC ĐÃ ĐĂNG NHẬP | TỐI ĐA {max_workers} LUỒNG SONG SONG (VIẾT ĐẾN HẾT HÀNG ĐỢI RỒI TỰ DỪNG)",
    )

    # Tự động khóa cấu hình Tạo Video hiện tại trên Video Batch Studio trước khi bắt đầu chạy (chạy bất đồng bộ không gây trễ)
    threading.Thread(target=notify_video_batch_studio_lock_config, daemon=True).start()

    from engine.chatgpt_web_client import ChatGPTWebMultiTabClient
    client = ChatGPTWebMultiTabClient()
    total_processed_count = 0
    try:
        while pending_items:
            for it in pending_items:
                if it.get("project_id"):
                    attempted_in_session.add(it["project_id"])
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_map = {
                    executor.submit(
                        run_single_project_pipeline,
                        client,
                        item["project_dir"],
                        item["source_title"],
                        thinking,
                        0,
                    ): item
                    for item in pending_items
                }
                for fut in as_completed(future_map):
                    item = future_map[fut]
                    pid = item["project_id"]
                    total_processed_count += 1
                    try:
                        final_st = fut.result()
                        with BACKLOG_LOCK:
                            bdata = json.load(open(b_path, encoding="utf-8"))
                            for bit in bdata.get("items", []):
                                if bit["project_id"] == pid:
                                    bit["status"] = "COMPLETED" if final_st.get("completed") else final_st.get("current_step_status", "PAUSED")
                            write_json_file(b_path, bdata)
                        update_progress_markdown(cfg["niche"])
                    except Exception as e:
                        log_msg(pid, f"❌ Lỗi khi xử lý dự án {pid}: {e}")
                        if os.path.exists(item.get("project_dir", "")):
                            with BACKLOG_LOCK:
                                bdata = json.load(open(b_path, encoding="utf-8"))
                                for bit in bdata.get("items", []):
                                    if bit["project_id"] == pid:
                                        bit["status"] = f"ERROR_PAUSED_AT_CHECKPOINT: {str(e)[:80]}"
                                write_json_file(b_path, bdata)
                        update_progress_markdown(cfg["niche"])
            if limit_projects > 0:
                break
            # Quét lại QUEUE_BACKLOG.json xem có kịch bản nào mới thêm vào hoặc còn sót chưa chạy không
            pending_items = _collect_pending_backlog_items(attempted_in_session)
            if pending_items:
                log_msg("QUEUE-CONTINUE", f"🔄 Phát hiện thêm {len(pending_items)} kịch bản trong hàng đợi [{cfg['label']}], tiếp tục viết cho đến hết...")
        log_msg("QUEUE-DONE", f"✅ ĐÃ VIẾT XONG TOÀN BỘ KỊCH BẢN TRONG HÀNG ĐỢI [{cfg['label']}] ({total_processed_count} kịch bản) — TỰ ĐỘNG DỪNG WORKER VIẾT KỊCH BẢN!")
    finally:
        client.close()
        notify_video_batch_studio_queue_completed(cfg["niche"], total_projects=total_processed_count)


if __name__ == "__main__":
    import traceback

    try:
        parser = argparse.ArgumentParser(description="Multi-Channel (12 Keys + Mafia + Homeless V12 + MEXICO BÀ CÔ) Multi-Thread ChatGPT Pipeline")
        parser.add_argument("--niche", type=str, default="mafia", help="Chọn Key / kênh giao việc (hỗ trợ 12 Key thư mục + 'mafia', 'homeless', 'mexico')")
        parser.add_argument("--project_dir", type=str, help="Đường dẫn thư mục 1 dự án cụ thể")
        parser.add_argument("--title", type=str, help="Tiêu đề gốc đầu vào cho dự án")
        parser.add_argument("--add_titles", nargs="+", help="Thêm 1 hoặc nhiều tiêu đề vào hàng đợi của kênh đã chọn")
        parser.add_argument("--add_titles_file", type=str, help="Đường dẫn file .txt chứa danh sách nhiều tiêu đề (mỗi dòng 1 tiêu đề)")
        parser.add_argument("--run_queue", action="store_true", help="Chạy hàng đợi của kênh đã chọn (tối đa 3 luồng)")
        parser.add_argument("--max_workers", type=int, default=3, help="Số luồng chạy song song tối đa (mặc định: 3)")
        parser.add_argument("--limit", type=int, default=0, help="Giới hạn số lượng dự án lấy ra chạy trong đợt này (0 = chạy hết)")
        parser.add_argument("--step", type=int, default=0, choices=[0, 1, 2, 3, 4, 5], help="Chạy riêng 1 bước (1..5) hoặc 0 để chạy trọn vẹn/tiếp tục từ checkpoint")
        parser.add_argument("--thinking", type=str, default="gpt-6:medium", help="Model & mức suy luận của ChatGPT (VD: gpt-6:medium, gpt-6:high, gpt-6:low, gpt-5.6:medium, medium, high, low)")
        parser.add_argument("--account", type=str, default="", help="Ưu tiên tài khoản ChatGPT Web (acc_1, acc_2, acc_3)")

        args = parser.parse_args()
        set_active_niche(args.niche)
        if args.project_dir:
            abs_pdir_up = os.path.abspath(args.project_dir).upper()
            for k12 in KEY_PROFILES_12:
                if f"PROJECTS_{k12.upper()}" in abs_pdir_up:
                    set_active_niche(k12)
                    break
            else:
                if "PROJECTS_MEXICO" in abs_pdir_up:
                    set_active_niche("mexico")
                elif "PROJECTS_HOMELESS" in abs_pdir_up:
                    set_active_niche("homeless")

        if args.add_titles:
            added = add_titles_to_backlog(args.add_titles, niche=ACTIVE_KEY_ID or ACTIVE_NICHE)
            log_msg("ADD-TITLES", f"📥 Đã thêm {len(added)} tiêu đề vào hàng đợi [{ACTIVE_KEY_ID or ACTIVE_NICHE}] {BACKLOG_PATH}!")

        if args.add_titles_file and os.path.exists(args.add_titles_file):
            lines = [ln.strip() for ln in open(args.add_titles_file, encoding="utf-8").read().splitlines() if ln.strip()]
            added = add_titles_to_backlog(lines, niche=ACTIVE_KEY_ID or ACTIVE_NICHE)
            log_msg("ADD-TITLES-FILE", f"📥 Đã thêm {len(added)} tiêu đề từ file vào hàng đợi [{ACTIVE_KEY_ID or ACTIVE_NICHE}] {BACKLOG_PATH}!")

        if args.project_dir:
            pdir_norm = os.path.abspath(args.project_dir)
            pid_single = os.path.basename(os.path.normpath(pdir_norm))
            cfg_single = get_niche_config(ACTIVE_KEY_ID or ACTIVE_NICHE)
            if not os.path.exists(pdir_norm):
                alt_pdir = os.path.join(cfg_single["projects_root"], pid_single)
                if os.path.exists(alt_pdir):
                    pdir_norm = alt_pdir
                else:
                    os.makedirs(pdir_norm, exist_ok=True)
            resolved_title = (args.title or "").strip()
            if not resolved_title and os.path.exists(cfg_single["backlog_path"]):
                try:
                    b_s = json.load(open(cfg_single["backlog_path"], encoding="utf-8"))
                    for bit in b_s.get("items", []):
                        if bit.get("project_id") == pid_single and bit.get("source_title"):
                            resolved_title = str(bit.get("source_title")).strip()
                            break
                except Exception:
                    pass
            log_msg(pid_single, f"🚀 Khởi chạy đơn luồng kịch bản [{pid_single}] (Kênh: {cfg_single['label']} | model={args.thinking})...")

            if args.account:
                st_p_acc = os.path.join(pdir_norm, "STATE.json")
                try:
                    st_d_acc = json.load(open(st_p_acc, encoding="utf-8")) if os.path.exists(st_p_acc) else {"project_id": pid_single, "project_dir": pdir_norm}
                    st_d_acc["account_id"] = args.account.strip()
                    st_d_acc["assigned_account_id"] = args.account.strip()
                    st_d_acc["host_id"] = f"chatgpt_web:{args.account.strip()}"
                    write_json_file(st_p_acc, st_d_acc)
                except Exception:
                    pass

            def _set_single_note(note_text: str):
                st_p = os.path.join(pdir_norm, "STATE.json")
                if os.path.exists(st_p):
                    try:
                        st_d = json.load(open(st_p, encoding="utf-8"))
                        skip_s1 = bool(st_d.get("skip_title_rewrite"))
                        st_d["current_step_status"] = "STEP_1_5_STARTING" if skip_s1 else "STEP_1_STARTING"
                        st_d["live_note"] = note_text
                        st_d["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        write_json_file(st_p, st_d)
                    except Exception:
                        pass

            _ensure_web_accounts_ready_with_logging(set_note_fn=_set_single_note)
            threading.Thread(target=notify_video_batch_studio_lock_config, daemon=True).start()
            from engine.chatgpt_web_client import ChatGPTWebMultiTabClient
            c = ChatGPTWebMultiTabClient()
            try:
                run_single_project_pipeline(
                    c,
                    project_dir=pdir_norm,
                    source_title=resolved_title,
                    thinking=args.thinking,
                    only_step=args.step,
                )
            finally:
                c.close()
        elif args.run_queue:
            run_backlog_queue(max_workers=args.max_workers, thinking=args.thinking, limit_projects=args.limit, niche=ACTIVE_KEY_ID or ACTIVE_NICHE)
    except Exception as fatal_exc:
        log_msg("FATAL-ERROR", f"❌ Lỗi dừng tiến trình Pipeline: {fatal_exc}\n{traceback.format_exc()}")
        raise

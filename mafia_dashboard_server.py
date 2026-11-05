"""
================================================================================
VĂN PHÒNG ĐIỀU HÀNH TRỰC QUAN LOCALHOST — MAFIA BOSS × MAID STORYTELLING STUDIO
URL: http://127.0.0.1:8099
================================================================================
Tính năng nâng cấp theo yêu cầu:
1. Sơ đồ 6 Bàn Làm Việc Nhân Viên AI (Bàn #0 -> Bàn #5) có ICON / AVATAR riêng,
   nhãn phân biệt rõ cái nào ĐANG CHẠY vs KHÔNG CHẠY, cái nào ĐIỀU PHỐI ĐƠN LUỒNG
   vs CHẠY ĐA LUỒNG (Tối đa 3 luồng song song), kèm Ô NOTE trực tiếp hiện tại
   bàn đó đang làm gì và đã làm đến đâu rồi.
2. Bảng Giám Sát 3 Khe Luồng Song Song (Luồng #1, Luồng #2, Luồng #3) hiển thị
   tức thời luồng nào đang xử lý dự án nào, ở bàn mấy, bao nhiêu % tiến độ.
3. Bộ Kiểm Tra Hệ Thống & Note Chuyển Máy Mới (Antigravity + ChatGPT Desktop):
   Tự động kiểm tra máy đã cài và đăng nhập tài khoản Antigravity + ChatGPT Desktop
   chưa. Nếu lỗi/thiếu khi đưa sang máy khác sẽ hiện cảnh báo rõ ràng yêu cầu
   cài đặt & đăng nhập, kèm nút 1-Click đồng bộ 5 Skill vào Antigravity máy mới.
================================================================================
"""

import os
import sys
import json
import time
import shutil
import subprocess
import threading
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler

try:
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    elif hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
except Exception:
    try:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass

try:
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")
    elif hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
except Exception:
    try:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")
    except Exception:
        pass

# Tự động nhận diện thư mục gốc theo vị trí thực tế của file (hỗ trợ copy sang bất kỳ ổ đĩa/thư mục nào trên máy mới)
_CODE_ROOT = os.path.dirname(os.path.abspath(__file__))


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
ENGINE_DIR = (
    os.path.join(_CODE_ROOT, "engine")
    if os.path.exists(os.path.join(_CODE_ROOT, "engine", "mafia_chatgpt_pipeline.py"))
    else os.path.join(STUDIO_ROOT, "engine")
)
ENGINE_SCRIPT = os.path.join(ENGINE_DIR, "mafia_chatgpt_pipeline.py")
PROJECTS_ROOT = os.path.join(STUDIO_ROOT, "PROJECTS", "PROJECTS_MAFIA")
BACKLOG_PATH = os.path.join(STUDIO_ROOT, "data", "queues", "QUEUE_BACKLOG.json")
LIVE_LOG_PATH = os.path.join(STUDIO_ROOT, "data", "logs", "LIVE_STUDIO_LOG.txt")
PORT = 8098

for _p in (ENGINE_DIR, _CODE_ROOT, STUDIO_ROOT):
    if _p and _p not in sys.path:
        sys.path.insert(0, _p)

from mafia_chatgpt_pipeline import (
    add_titles_to_backlog,
    split_titles_and_commands,
    check_environment_requirements,
    auto_sync_skills_and_agents_to_new_machine,
    export_to_tong_hop_folder,
    resolve_project_export_prefix,
    rename_project_custom_name,
    update_project_title_and_name,
    update_or_replace_queue_titles_batch,
    strip_part_headers_for_tts,
    get_niche_config,
    set_active_niche,
    update_progress_markdown,
    KEY_PROFILES_12,
    KEY_PROFILES_12_LOWER_MAP,
)
from license_manager import (
    verify_current_machine_license,
    activate_client_license_key,
    admin_create_key,
    admin_revoke_or_restore_key,
    admin_extend_key,
    admin_delete_key,
    build_client_distribution_package,
    publish_admin_registry_to_cloud,
)

# Quản lý tiến trình chạy nền & kênh đang chọn (12 Key mới + Mafia + Homeless V12 + MEXICO BÀ CÔ)
WORKER_LOCK = threading.Lock()
ACTIVE_PROCESS = None
ACTIVE_MODE = "IDLE"
ACTIVE_MAX_WORKERS = 3
SELECTED_NICHE = "mafia"
ACTIVE_WORKER_NICHE = "mafia"


def _norm_niche(raw: str | None, default: str = "mafia") -> str:
    s = str(raw or "").lower().strip()
    if s in KEY_PROFILES_12_LOWER_MAP:
        return KEY_PROFILES_12_LOWER_MAP[s]
    if s in ("mexico", "mexico_ba_co", "mexicobaco") or "mexico" in s or "bà cô" in s or "ba co" in s:
        return "mexico"
    if s == "homeless" or "homeless" in s:
        return "homeless"
    if s == "mafia" or "mafia" in s:
        return "mafia"
    return default


def append_studio_log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [WEB-CONTROL] {msg}\n"
    try:
        with open(LIVE_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def is_worker_running() -> bool:
    global ACTIVE_PROCESS, ACTIVE_MODE
    with WORKER_LOCK:
        if ACTIVE_PROCESS is not None:
            if ACTIVE_PROCESS.poll() is None:
                return True
            else:
                ACTIVE_PROCESS = None
                ACTIVE_MODE = "IDLE"
        return False


def start_worker_command(args_list: list[str], mode_desc: str, max_workers: int = 3, niche: str = "mafia") -> tuple[bool, str]:
    global ACTIVE_PROCESS, ACTIVE_MODE, ACTIVE_MAX_WORKERS, ACTIVE_WORKER_NICHE, SELECTED_NICHE
    lic_check = verify_current_machine_license(force_cloud_check=False)
    if not lic_check.get("valid", False):
        lic_msg = lic_check.get("message") or "Chưa kích hoạt Key bản quyền!"
        append_studio_log(f"⛔ TỪ CHỐI CHẠY DO BẢN QUYỀN: {lic_msg}")
        return False, f"⛔ BẢN QUYỀN CHƯA HỢP LỆ: {lic_msg}"

    niche_key = _norm_niche(niche, default=SELECTED_NICHE)
    if is_worker_running():
        if ACTIVE_WORKER_NICHE != niche_key or "--run_queue" in args_list:
            stop_worker_command()
        else:
            return True, f"Hệ thống đang chạy tiến trình ({ACTIVE_MODE}) — Kịch bản mới đã được nạp vào hàng đợi chạy tiếp!"

    # Khởi động trình duyệt Chrome ChatGPT ngầm ngay lập tức (không chặn việc bật tiến trình Worker!)
    def _bg_ensure_chrome_ready():
        try:
            env_check = check_environment_requirements()
            if not env_check.get("chatgpt", {}).get("ok", False):
                from engine.chatgpt_web_client import (
                    ensure_all_initialized_browsers_open,
                    ensure_chrome_debug_browser_open,
                )
                ensure_all_initialized_browsers_open(run_hidden=True)
                time.sleep(2.0)
                env_check = check_environment_requirements()
                if not env_check.get("chatgpt", {}).get("ok", False):
                    ensure_chrome_debug_browser_open(
                        open_chatgpt_home=True,
                        force_bring_to_front=True,
                        run_hidden=False,
                        acc_id="acc_1",
                    )
        except Exception:
            pass

    threading.Thread(target=_bg_ensure_chrome_ready, daemon=True).start()

    SELECTED_NICHE = niche_key
    ACTIVE_WORKER_NICHE = niche_key
    set_active_niche(niche_key)

    # Cập nhật tức thời trạng thái STATE.json của các kịch bản sắp chạy để giao diện chuyển ngay từ CHỜ CHẠY -> ĐANG KHỞI ĐỘNG
    try:
        cfg_w = get_niche_config(niche_key)
        backlog_w = cfg_w["BACKLOG_PATH"]
        projects_root_w = cfg_w["PROJECTS_ROOT"]
        target_pdir_single = ""
        if "--project_dir" in args_list:
            idx_pd = args_list.index("--project_dir")
            if idx_pd + 1 < len(args_list):
                target_pdir_single = os.path.abspath(args_list[idx_pd + 1])

        if os.path.exists(backlog_w):
            bdata = json.load(open(backlog_w, encoding="utf-8"))
            bitems = bdata.get("items") or []
            eff_lim = max(1, max_workers if max_workers > 0 else 3)
            marked_cnt = 0
            for it_w in bitems:
                if it_w.get("completed"):
                    continue
                pid_w = it_w.get("project_id") or ""
                pdir_w = it_w.get("project_dir") or (os.path.join(projects_root_w, pid_w) if pid_w else "")
                if not pdir_w:
                    continue
                if target_pdir_single and os.path.normcase(os.path.abspath(pdir_w)) != os.path.normcase(target_pdir_single):
                    continue
                os.makedirs(pdir_w, exist_ok=True)
                st_p = os.path.join(pdir_w, "STATE.json")
                st_d = {}
                if os.path.exists(st_p):
                    try:
                        st_d = json.load(open(st_p, encoding="utf-8"))
                    except Exception:
                        st_d = {}
                if not st_d:
                    skip_s1 = bool(it_w.get("skip_title_rewrite", False))
                    st_d = {
                        "project_id": pid_w,
                        "custom_name": it_w.get("custom_name", ""),
                        "export_prefix": it_w.get("export_prefix", pid_w.split("_")[0] if "_" in pid_w else pid_w),
                        "niche": niche_key,
                        "source_title": it_w.get("source_title", ""),
                        "winner_title": it_w.get("source_title", "") if skip_s1 else "",
                        "winner_title_score": 100 if skip_s1 else 0,
                        "skip_title_rewrite": skip_s1,
                        "completed_steps": ["STEP_1_DONE"] if skip_s1 else [],
                        "current_step_status": "STEP_1_5_STARTING" if skip_s1 else "STEP_1_STARTING",
                        "live_note": "🚀 Đang khởi động luồng AI Agent & kết nối trình duyệt ChatGPT...",
                        "updated_at": datetime.now().isoformat(timespec="seconds"),
                    }
                elif st_d.get("current_step_status") in ("QUEUED", "QUEUED_SKIP_STEP_1", None, ""):
                    skip_s1 = bool(st_d.get("skip_title_rewrite") or it_w.get("skip_title_rewrite", False))
                    st_d["current_step_status"] = "STEP_1_5_STARTING" if skip_s1 else "STEP_1_STARTING"
                    st_d["live_note"] = "🚀 Đang khởi động luồng AI Agent & kết nối trình duyệt ChatGPT..."
                    st_d["updated_at"] = datetime.now().isoformat(timespec="seconds")
                with open(st_p, "w", encoding="utf-8") as f_st:
                    json.dump(st_d, f_st, ensure_ascii=False, indent=2)
                marked_cnt += 1
                if not target_pdir_single and marked_cnt >= eff_lim:
                    break
    except Exception as e_st:
        append_studio_log(f"⚠️ Lưu ý cập nhật trạng thái khởi động sớm: {e_st}")

    with WORKER_LOCK:
        cmd = [sys.executable, "-u", ENGINE_SCRIPT, "--niche", niche_key] + args_list
        append_studio_log(f"🚀 Khởi chạy lệnh [{niche_key.upper()}]: {mode_desc} | Python={sys.executable}")
        log_f = open(LIVE_LOG_PATH, "a", encoding="utf-8", buffering=1)
        ACTIVE_PROCESS = subprocess.Popen(
            cmd,
            cwd=STUDIO_ROOT,
            stdout=log_f,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        ACTIVE_MODE = f"[{niche_key.upper()}] {mode_desc}"
        ACTIVE_MAX_WORKERS = max_workers
        return True, f"🚀 Đã khởi chạy [{niche_key.upper()}]: {mode_desc} (PID={ACTIVE_PROCESS.pid})"


def stop_worker_command() -> str:
    global ACTIVE_PROCESS, ACTIVE_MODE
    with WORKER_LOCK:
        if ACTIVE_PROCESS is not None and ACTIVE_PROCESS.poll() is None:
            pid = ACTIVE_PROCESS.pid
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                try:
                    ACTIVE_PROCESS.terminate()
                except Exception:
                    pass
            ACTIVE_PROCESS = None
            ACTIVE_MODE = "IDLE"
            append_studio_log(f"⏹️ Đã dừng tiến trình (PID={pid}). Các bước đã xong đều được lưu tại STATE.json để chạy tiếp sau!")
            return f"Đã dừng tiến trình (PID={pid})."
        ACTIVE_PROCESS = None
        ACTIVE_MODE = "IDLE"
        return "Hiện không có tiến trình nào đang chạy."


def compute_project_progress_pct(completed_steps: list[str], active_stage: int, completed: bool) -> int:
    if completed or "STEP_5_DONE" in completed_steps:
        return 100
    base = len(completed_steps) * 20
    if active_stage > 0:
        base = max(base, (active_stage - 1) * 20 + 10)
    return min(95, base)


def build_desks_and_threads_overview(
    projects: list[dict],
    worker_running: bool,
    max_workers_cfg: int,
    niche: str = "mafia",
    logged_in_accounts_count: int = 1,
) -> tuple[list[dict], list[dict]]:
    """
    Tổng hợp trạng thái trực tiếp của các Bàn Agent (Bàn #0..#7) và các Khe Luồng Song Song
    (Chia đều cho các Acc đã đăng nhập, tối đa 1 Acc = 3 Luồng -> Lên tới 9 Luồng khi có 3 Acc)
    theo đúng kênh đang chọn (Mafia, Homeless V12 hoặc MEXICO BÀ CÔ).
    """
    niche_key = _norm_niche(niche)
    is_homeless = (niche_key == "homeless")
    is_mexico = (niche_key == "mexico")
    worker_on_this_niche = worker_running and (ACTIVE_WORKER_NICHE == niche_key)

    total_projs = len(projects)
    completed_projs = [p for p in projects if p["completed"]]
    running_projs = [p for p in projects if p["active_stage"] > 0 and not p["completed"] and worker_on_this_niche]
    queued_projs = [p for p in projects if not p["completed"] and p not in running_projs]

    max_allowed_by_accs = max(1, logged_in_accounts_count) * 3
    if max_workers_cfg <= 0:
        eff_max_workers = max_allowed_by_accs
    else:
        eff_max_workers = max(1, min(max_allowed_by_accs, max_workers_cfg))

    total_slots_to_show = max(3, max_allowed_by_accs, len(running_projs))
    thread_slots = []
    for slot_idx in range(1, total_slots_to_show + 1):
        enabled = slot_idx <= eff_max_workers
        active_p = running_projs[slot_idx - 1] if slot_idx - 1 < len(running_projs) else None
        default_acc_idx = ((slot_idx - 1) // 3) + 1
        if active_p:
            thread_slots.append({
                "slot": slot_idx,
                "enabled": enabled,
                "status": "RUNNING",
                "project_id": active_p["project_id"],
                "account_label": active_p.get("account_label") or f"Acc #{default_acc_idx}",
                "active_stage": active_p["active_stage"],
                "progress_pct": active_p["progress_pct"],
                "live_note": active_p["live_note"],
                "thread_id": active_p["thread_id"],
            })
        else:
            thread_slots.append({
                "slot": slot_idx,
                "enabled": enabled,
                "status": "IDLE" if enabled else "DISABLED_BY_CONFIG",
                "project_id": "",
                "account_label": f"Acc #{default_acc_idx}",
                "active_stage": 0,
                "progress_pct": 0,
                "live_note": (
                    f"Đang rảnh — Sẵn sàng nhận nhiệm vụ (Tối đa 3 luồng/Acc)"
                    if enabled
                    else f"Đang tắt (Hiện có {logged_in_accounts_count} Acc đăng nhập — tối đa {eff_max_workers} luồng)"
                ),
                "thread_id": "",
            })

    if niche_key in KEY_PROFILES_12:
        kmeta = KEY_PROFILES_12[niche_key]
        kloc = kmeta["locale"]
        kparts = kmeta["default_parts"]
        krange = f"{kmeta['target_min_chars']:,}–{kmeta['target_max_chars']:,}"
        kflag = "🇲🇽" if kmeta["lang"] == "es" else ("🇯🇵" if kmeta["lang"] == "ja" else "🇺🇸")
        desks_meta = [
            {
                "desk_id": 0,
                "icon": kflag,
                "name": f"Bàn #0: Tổng Điều Phối ({niche_key})",
                "agent_code": f"{niche_key}__00_orchestrator",
                "role_desc": f"Quản lý Hàng đợi PROJECTS_{niche_key}, Chia tải Đa Tài Khoản (Acc #1..#3) & Lưu Checkpoint",
                "threading_type": "SINGLE_CONTROLLER",
                "threading_badge": "🎯 ĐIỀU PHỐI TRUNG TÂM (Quản lý 1–9 Luồng)",
            },
            {
                "desk_id": 1,
                "icon": "🔥",
                "name": f"Bàn #1: Chuyên Gia Tiêu Đề ({kloc})",
                "agent_code": f"{niche_key}__01_title",
                "role_desc": f"Viết 5 Tiêu đề ({kloc}) theo bộ Skill {niche_key}/01_TITULOS, Chấm điểm & Chọn Winner (≥97đ, ≤100 ký tự)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 1.5,
                "icon": "🛡️",
                "name": f"Bàn #1.5: Trí Nhớ Kênh & Chống Trùng Lặp ({niche_key})",
                "agent_code": f"{niche_key}__01_5_canon_guard",
                "role_desc": f"Quét CHANNEL_MEMORY_{niche_key.upper()}.json (30–100 bài gần nhất) & Cấp lệnh cấm trùng Tên nhân vật, Địa danh ({kloc}), Vật chứng pháp lý",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": f"🛡️ SKILL BÀN 1.5 (CHANNEL_MEMORY_{niche_key.upper()}.json)",
            },
            {
                "desk_id": 2,
                "icon": "📐",
                "name": f"Bàn #2: Kiến Trúc Dàn Ý {kparts} Phần ({kloc})",
                "agent_code": f"{niche_key}__02_outline",
                "role_desc": f"Thiết kế Dàn ý {kparts} Parts [PART 1]–[PART {kparts}] ({kloc}, Target {krange} ký tự + Khóa Lệnh Cấm Trùng Bàn #1.5)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 3,
                "icon": "✍️",
                "name": f"Bàn #3: Biên Kịch {niche_key} ({kloc}, 3 Giai Đoạn)",
                "agent_code": f"{niche_key}__03_writer",
                "role_desc": f"Viết 3 phần độc lập bằng ngôn ngữ {kloc} ({krange} ký tự, lưu sau mỗi lần viết) + AI tự nối nếu thiếu",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD + AI CONTINUATION",
            },
            {
                "desk_id": 4,
                "icon": "⚖️",
                "name": f"Bàn #4: Thanh Tra Pháp Y Độc Lập & Sửa Lẻ ({kloc})",
                "agent_code": f"{niche_key}__04_auditor",
                "role_desc": f"Mở Đoạn Chat Độc Lập 100% ({niche_key}/04_AUDITOR), chấm điểm Pháp y & sửa từng Part kèm Boundary Anchors (±5 câu)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 AUDITOR & REPAIR THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 5,
                "icon": "🚀",
                "name": f"Bàn #5: Đóng Gói SEO & Thumbnail ({kloc})",
                "agent_code": f"{niche_key}__05_seo",
                "role_desc": f"Mở SEO Thread độc lập ({niche_key}/05_SEO), xuất trọn bộ SEO + Thumbnail + Trailer ({kloc}) & chuyển sang Bàn Check TTS",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": f"🔒 SEO THREAD ĐỘC LẬP ({kloc})",
            },
            {
                "desk_id": 6,
                "icon": "🎙️",
                "name": f"Bàn #6/#7 (Check TTS): Kiểm Tra & Chuẩn Hóa File TTS ({kloc})",
                "agent_code": f"{niche_key}__07_tts_check",
                "role_desc": f"Làm sạch file TTS (FULL_SCRIPT.txt & _KB.txt): xóa [PART 1..{kparts}], bung từ viết tắt ({kloc}) & xuất 07_TTS_CHECK_REPORT.md",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": f"🎙️ CHUẨN HÓA TTS 100% SẠCH ({kloc})",
            },
            {
                "desk_id": 7,
                "icon": "🎬",
                "name": "Bàn #7 (Studio): Phòng Thu Voice AI & Render Video GPU",
                "agent_code": "studio-7-voice-video-producer (v1.0)",
                "role_desc": f"Tự động nhận kịch bản sạch TTS của [{niche_key}] ➔ Tạo Voice (.wav) ➔ Phụ đề Whisper (.srt, lang={kmeta['lang']}) ➔ Render .mp4 GPU NVENC theo Project & Voice cố định của Key",
                "threading_type": "GPU_PIPELINE",
                "threading_badge": "🎬 TỰ ĐỘNG VOICE + SRT + RENDER MP4 (GPU NVENC)",
            },
        ]
    elif is_mexico:
        desks_meta = [
            {
                "desk_id": 0,
                "icon": "🇲🇽",
                "name": "Bàn #0: Tổng Điều Phối (MEXICO BÀ CÔ)",
                "agent_code": "mexico-0-orchestrator",
                "role_desc": "Quản lý Hàng đợi PROJECTS_MEXICO, Chia tải Đa Tài Khoản (Acc #1..#3) & Lưu Checkpoint",
                "threading_type": "SINGLE_CONTROLLER",
                "threading_badge": "🎯 ĐIỀU PHỐI TRUNG TÂM (Quản lý 1–9 Luồng)",
            },
            {
                "desk_id": 1,
                "icon": "🔥",
                "name": "Bàn #1: Tiêu Đề MEXICO BÀ CÔ (es-MX)",
                "agent_code": "titulos-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Viết 5 Tiêu đề Tây Ban Nha Mexico (FAMILY_DNA_LOCK_V1_2 + TITLE_CREATIVE_DIVERSITY_V1_3), Chấm điểm & Chọn Winner (≥98đ, ≤100 ký tự)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 1.5,
                "icon": "🛡️",
                "name": "Bàn #1.5: Trí Nhớ Kênh & Chống Trùng Lặp Mexico",
                "agent_code": "canon-guard-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Quét CHANNEL_MEMORY_MEXICO.json (30–100 bài gần nhất) & Cấp lệnh cấm trùng Tên Bà Cô (Doña...), Con dâu/Con rể, Thành phố/Colonia Mexico, Vật chứng pháp lý",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🛡️ SKILL BÀN 1.5 (CHANNEL_MEMORY_MEXICO.json)",
            },
            {
                "desk_id": 2,
                "icon": "📐",
                "name": "Bàn #2: Dàn Ý 7 Phần MEXICO BÀ CÔ (es-MX)",
                "agent_code": "arquitectura-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Thiết kế Dàn ý 7 Parts [PART 1]–[PART 7] bằng es-MX (Target 70.000–80.000 ký tự + Khóa Lệnh Cấm Trùng Tên Bàn #1.5)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 3,
                "icon": "✍️",
                "name": "Bàn #3: Biên Kịch MEXICO BÀ CÔ (es-MX, 3 Giai Đoạn)",
                "agent_code": "escritor-y-reparacion-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Viết 3 phần độc lập bằng tiếng Tây Ban Nha Mexico (ngôi thứ nhất người mẹ/bà 60–80 tuổi, 70k–80k ký tự) + AI tự nối nếu thiếu",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD + AI CONTINUATION",
            },
            {
                "desk_id": 4,
                "icon": "⚖️",
                "name": "Bàn #4: Thanh Tra Pháp Y & Sửa Lẻ Kèm Điểm Neo Biên",
                "agent_code": "auditor-forense-guion-familiar-mexico (v1.3.0)",
                "role_desc": "Mở Đoạn Chat Độc Lập 100%, chấm điểm Pháp y 10 tiêu chí + lọc từ Tây Ban Nha châu Âu; sửa từng Part kèm Boundary Anchors (±5 câu)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 AUDITOR & REPAIR THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 5,
                "icon": "🚀",
                "name": "Bàn #5: Đóng Gói SEO & Omni Trailer (es-MX)",
                "agent_code": "seo-thumbnail-trailer-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Mở SEO Thread độc lập, xuất 12 mục SEO tiếng Tây Ban Nha Mexico (Title A/B, Descripción, Miniatura, Omni Trailer) & đẩy sang Bàn #7 Check TTS",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 SEO THREAD ĐỘC LẬP (12 MỤC es-MX)",
            },
            {
                "desk_id": 6,
                "icon": "🎙️",
                "name": "Bàn #7 (Check TTS): Kiểm Tra & Chuẩn Hóa File TTS es-MX",
                "agent_code": "verificador-tts-drama-familiar-mexico (v1.3.0)",
                "role_desc": "Check lại file TTS (FULL_SCRIPT.txt & _KB.txt): xóa [PART 1..7], bung viết tắt (Sra./Sr./Dr./Lic./CDMX/IMSS/INE/MXN), lọc từ Spain & xuất 07_TTS_CHECK_REPORT.md",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🎙️ SKILL BÀN 7 CHECK LẠI FILE TTS (es-MX)",
            },
            {
                "desk_id": 7,
                "icon": "🎬",
                "name": "Bàn #7 (Studio): Phòng Thu Voice AI & Render Video GPU",
                "agent_code": "studio-7-voice-video-producer (v1.0)",
                "role_desc": "Tự động nhận kịch bản sạch TTS từ Bàn Check TTS ➔ Tạo Voice (.wav) qua VoiceStudio ➔ Phụ đề Whisper (.srt) ➔ Render .mp4 GPU NVENC",
                "threading_type": "GPU_PIPELINE",
                "threading_badge": "🎬 TỰ ĐỘNG VOICE + SRT + RENDER MP4 (GPU NVENC)",
            },
        ]
    elif is_homeless:
        desks_meta = [
            {
                "desk_id": 0,
                "icon": "🏚️",
                "name": "Bàn #0: Tổng Điều Phối (Homeless V12)",
                "agent_code": "homeless-0-orchestrator",
                "role_desc": "Quản lý Hàng đợi PROJECTS_HOMELESS, Chia tải Đa Tài Khoản (Acc #1..#3) & Lưu Checkpoint",
                "threading_type": "SINGLE_CONTROLLER",
                "threading_badge": "🎯 ĐIỀU PHỐI TRUNG TÂM (Quản lý 1–9 Luồng)",
            },
            {
                "desk_id": 1,
                "icon": "🔥",
                "name": "Bàn #1: Tiêu Đề Homeless V12",
                "agent_code": "tao-tieu-de-homeless (v3.1)",
                "role_desc": "Viết 5 Tiêu đề Homeless Emotional, Chấm điểm & Chọn Winner (≥97đ, ≤100 ký tự)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 1.5,
                "icon": "🛡️",
                "name": "Bàn #1.5: Quản Lý Trí Nhớ Kênh & Chống Trùng Lặp",
                "agent_code": "studio-canon-guard (v1.0)",
                "role_desc": "Đọc CHANNEL_MEMORY.json (30 kịch bản gần nhất) & Cấp danh sách cấm lặp Tên nhân vật, Thị trấn, Vật chứng, Cú twist trước khi lập dàn ý",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🛡️ CHỐNG TRÙNG LẶP KÊNH (CHANNEL_MEMORY.json)",
            },
            {
                "desk_id": 2,
                "icon": "📐",
                "name": "Bàn #2: Dàn Ý 7 Parts Homeless",
                "agent_code": "tao-dan-y-homeless (v3.1)",
                "role_desc": "Thiết kế Dàn ý 7 Parts [PART 1]–[PART 7] (Target 70.000–80.000 ký tự + Khóa Lệnh Cấm Trùng Tên Bàn #1.5)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 3,
                "icon": "✍️",
                "name": "Bàn #3: Biên Kịch Homeless V12 (Chia 3 Phần + AI Tự Nối)",
                "agent_code": "viet-kich-ban-homeless (v3.5)",
                "role_desc": "Chia 3 phần viết độc lập, lưu ngay sau mỗi lần viết (`03_PART_GROUP_1..3` & `PART_1..7`) + Bộ xử lý lỗi AI tự động viết nối tiếp nếu thiếu",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD + AI CONTINUATION",
            },
            {
                "desk_id": 4,
                "icon": "⚖️",
                "name": "Bàn #4: Thanh Tra Pháp Y Độc Lập & Sửa Lẻ Kèm Điểm Neo Biên",
                "agent_code": "kiem-tra-kich-ban-homeless (v3.6)",
                "role_desc": "Mở Đoạn Chat Độc Lập 100% (Chống Self-Bias, 0% Spoofing); khóa Part đạt & sửa từng Part kèm Điểm Neo Biên (±5 câu trước/sau)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 AUDITOR & REPAIR THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 5,
                "icon": "🚀",
                "name": "Bàn #5: Đóng Gói SEO Homeless (Đoạn Chat Riêng)",
                "agent_code": "seo-homeless-story (v2.1)",
                "role_desc": "Mở SEO Thread độc lập, tạo trọn bộ SEO Homeless V12 & chuyển sang Bàn #6 kiểm chuẩn TTS",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 SEO THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 6,
                "icon": "🎙️",
                "name": "Bàn #6: Kiểm Chuẩn Hậu Kỳ TTS (Visual & TTS Director)",
                "agent_code": "studio-6-visual-tts-director (v1.0)",
                "role_desc": "Quét văn bản TTS xóa ký tự lạ, bung từ viết tắt (Mr./Mrs./Dr./St.) & chuẩn hóa số đọc ($1.5M, -40°F, %) trước khi xuất FULL_SCRIPT.txt",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🎙️ CHUẨN HÓA TTS 100% SẠCH",
            },
            {
                "desk_id": 7,
                "icon": "🎬",
                "name": "Bàn #7: Phòng Thu Voice AI & Render Video GPU (Video Batch Studio)",
                "agent_code": "studio-7-voice-video-producer (v1.0)",
                "role_desc": "Tự động nhận kịch bản sạch TTS từ Bàn #6 ➔ Tạo Voice (.wav) qua VoiceStudio ➔ Tạo phụ đề Whisper (.srt) ➔ Ghép Stock/Template & xuất .mp4 GPU NVENC",
                "threading_type": "GPU_PIPELINE",
                "threading_badge": "🎬 TỰ ĐỘNG VOICE + SRT + RENDER MP4 (GPU NVENC)",
            },
        ]
    else:
        desks_meta = [
            {
                "desk_id": 0,
                "icon": "👑",
                "name": "Bàn #0: Tổng Điều Phối (Mafia)",
                "agent_code": "mafia-0-orchestrator",
                "role_desc": "Quản lý Hàng đợi PROJECTS, Chia tải Đa Tài Khoản (Acc #1..#3) & Lưu Checkpoint",
                "threading_type": "SINGLE_CONTROLLER",
                "threading_badge": "🎯 ĐIỀU PHỐI TRUNG TÂM (Quản lý 1–9 Luồng)",
            },
            {
                "desk_id": 1,
                "icon": "🔥",
                "name": "Bàn #1: Chuyên Gia Tiêu Đề",
                "agent_code": "mafia-1-title-rewriter",
                "role_desc": "Viết lại 5 Tiêu đề, Chấm điểm & Chọn Winner (≥97đ, ≤100 ký tự)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 1.5,
                "icon": "🛡️",
                "name": "Bàn #1.5: Quản Lý Trí Nhớ Kênh & Chống Trùng Lặp",
                "agent_code": "studio-canon-guard (v1.0)",
                "role_desc": "Đọc CHANNEL_MEMORY.json (30 kịch bản gần nhất) & Cấp danh sách cấm lặp Tên nhân vật, Địa danh, Vật chứng, Cú twist trước khi lập dàn ý",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🛡️ CHỐNG TRÙNG LẶP KÊNH (CHANNEL_MEMORY.json)",
            },
            {
                "desk_id": 2,
                "icon": "📐",
                "name": "Bàn #2: Kiến Trúc Giàn Ý",
                "agent_code": "mafia-2-outline-architect",
                "role_desc": "Thiết kế Giàn ý Chi tiết (5–6 Beats), Khóa DNA A/B/C & Tuân thủ Lệnh Cấm Trùng Tên Bàn #1.5",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 3,
                "icon": "✍️",
                "name": "Bàn #3: Biên Kịch Mỹ",
                "agent_code": "mafia-3-script-writer",
                "role_desc": "Viết Full Kịch bản US-English (<8.000 từ, 44.000–48.000 ký tự, xóa Part cho TTS)",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "⚡ WRITER THREAD (Đa Luồng Song Song)",
            },
            {
                "desk_id": 4,
                "icon": "⚖️",
                "name": "Bàn #4: Thanh Tra Pháp Y Độc Lập & Sửa Lỗi",
                "agent_code": "mafia-4-forensic-auditor",
                "role_desc": "Mở Đoạn Chat Độc Lập 100% (Chống Self-Bias, 0% Spoofing); chấm điểm Pháp y & sửa tối đa 5 vòng tới khi ≥97/100đ",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 AUDITOR & REPAIR THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 5,
                "icon": "🚀",
                "name": "Bàn #5: Đóng Gói SEO V1.3 (Đoạn Chat Riêng)",
                "agent_code": "mafia-5-seo-packager",
                "role_desc": "Mở SEO Thread độc lập, tạo trọn bộ 12 mục SEO V1.3 & chuyển sang Bàn #6 kiểm chuẩn TTS",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🔒 SEO THREAD ĐỘC LẬP",
            },
            {
                "desk_id": 6,
                "icon": "🎙️",
                "name": "Bàn #6: Kiểm Chuẩn Hậu Kỳ TTS (Visual & TTS Director)",
                "agent_code": "studio-6-visual-tts-director (v1.0)",
                "role_desc": "Quét văn bản TTS xóa ký tự lạ, bung từ viết tắt (Mr./Mrs./Dr./St.) & chuẩn hóa số đọc ($1.5M, -40°F, %) trước khi xuất FULL_SCRIPT.txt",
                "threading_type": "MULTI_THREAD_3",
                "threading_badge": "🎙️ CHUẨN HÓA TTS 100% SẠCH",
            },
            {
                "desk_id": 7,
                "icon": "🎬",
                "name": "Bàn #7: Phòng Thu Voice AI & Render Video GPU (Video Batch Studio)",
                "agent_code": "studio-7-voice-video-producer (v1.0)",
                "role_desc": "Tự động nhận kịch bản sạch TTS từ Bàn #6 ➔ Tạo Voice (.wav) qua VoiceStudio ➔ Tạo phụ đề Whisper (.srt) ➔ Ghép Stock/Template & xuất .mp4 GPU NVENC",
                "threading_type": "GPU_PIPELINE",
                "threading_badge": "🎬 TỰ ĐỘNG VOICE + SRT + RENDER MP4 (GPU NVENC)",
            },
        ]

    desks_out = []
    for d in desks_meta:
        did = d["desk_id"]
        if did == 0:
            is_active = worker_on_this_niche
            active_count = len(running_projs)
            if worker_on_this_niche:
                doing_now = f"Đang điều phối trực tiếp {active_count}/{eff_max_workers} luồng chạy song song trên {logged_in_accounts_count} Acc ({ACTIVE_MODE})."
            else:
                doing_now = f"Không chạy (Sẵn sàng chia đều nhiệm vụ cho {logged_in_accounts_count} Acc — Tối đa {eff_max_workers} luồng)."
            done_so_far = f"Tổng kho: {total_projs} kịch bản | Đã xong 100%: {len(completed_projs)} | Đang chạy: {active_count} | Đang chờ: {len(queued_projs)}"
            desks_out.append({
                **d,
                "is_running": is_active,
                "active_threads_count": active_count,
                "max_threads": eff_max_workers,
                "doing_now_note": doing_now,
                "progress_so_far_note": done_so_far,
            })
        else:
            if did == 1.5:
                done_at_this_desk = [
                    p for p in projects
                    if ("STEP_1_5_DONE" in p["completed_steps"] or "STEP_2_DONE" in p["completed_steps"])
                ]
            elif did == 6:
                done_at_this_desk = [
                    p for p in projects
                    if ("STEP_6_DONE" in p["completed_steps"] or p["completed"])
                ]
            elif did == 7:
                done_at_this_desk = [
                    p for p in projects
                    if p.get("video_bridge_status") == "COMPLETED"
                ]
            else:
                step_key = f"STEP_{did}_DONE"
                done_at_this_desk = [p for p in projects if step_key in p["completed_steps"]]
            if did == 7:
                active_at_this_desk = [p for p in projects if p.get("video_bridge_status") in ("RENDERING", "WAITING_GPU", "WAITING_BATCH")]
            else:
                active_at_this_desk = [p for p in running_projs if p["active_stage"] == did]
            is_active = len(active_at_this_desk) > 0

            if is_active:
                notes = []
                for ap in active_at_this_desk:
                    notes.append(f"[{ap['project_id']}] {ap['live_note']}")
                doing_now = " | ".join(notes)
            else:
                doing_now = "Không chạy (Đang rảnh / Chờ dự án chuyển tới bàn này)."

            if len(done_at_this_desk) > 0:
                last_p = done_at_this_desk[-1]
                if did == 1:
                    if last_p.get("skip_title_rewrite"):
                        detail = f"Gần nhất [{last_p['project_id']}]: 🎯 Dùng luôn Title gốc (Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5)"
                    else:
                        detail = f"Gần nhất [{last_p['project_id']}]: Đạt {last_p['winner_title_score']}/100đ ({len(last_p['winner_title'])} ký tự)"
                elif did == 1.5:
                    detail = f"Gần nhất [{last_p['project_id']}]: Đã cấp danh sách cấm trùng lặp từ CHANNEL_MEMORY.json"
                elif did == 2:
                    detail = f"Gần nhất [{last_p['project_id']}]: Đã khóa {last_p['outline_beat_count']} Parts/Beats"
                elif did == 3:
                    sm = last_p.get("script_metrics") or {}
                    detail = f"Gần nhất [{last_p['project_id']}]: {sm.get('char_count', 0):,} ký tự / {sm.get('word_count', 0):,} từ"
                elif did == 4:
                    rounds = len(last_p.get("audit_history") or [])
                    detail = f"Gần nhất [{last_p['project_id']}]: Đạt {last_p['final_script_score']}/100đ sau {rounds} vòng chấm & sửa"
                elif did == 5:
                    detail = f"Gần nhất [{last_p['project_id']}]: Đã xuất FULL_SEO.txt"
                else:
                    detail = f"Gần nhất [{last_p['project_id']}]: Đã kiểm chuẩn TTS sạch 100% & xuất FULL_SCRIPT.txt"
                done_so_far = f"Đã hoàn thành {len(done_at_this_desk)}/{total_projs} dự án qua Bàn #{did} ({detail})."
            else:
                done_so_far = f"Chưa có dự án nào hoàn thành qua Bàn #{did}."

            desks_out.append({
                **d,
                "is_running": is_active,
                "active_threads_count": len(active_at_this_desk),
                "max_threads": eff_max_workers,
                "doing_now_note": doing_now,
                "progress_so_far_note": done_so_far,
            })

    return desks_out, thread_slots


def _get_channel_quick_counts(niche_key: str) -> dict:
    cfg = get_niche_config(niche_key)
    bpath = cfg["BACKLOG_PATH"]
    proot = cfg["PROJECTS_ROOT"]
    total = 0
    done = 0
    if os.path.exists(bpath):
        try:
            bdata = json.load(open(bpath, encoding="utf-8"))
            items = bdata.get("items", [])
            total = len(items)
            for it in items:
                pid = it.get("project_id", "")
                pdir = os.path.join(proot, pid) if pid else it.get("project_dir", "")
                st_path = os.path.join(pdir, "STATE.json")
                if os.path.exists(st_path):
                    st = json.load(open(st_path, encoding="utf-8"))
                    if st.get("completed"):
                        done += 1
        except Exception:
            pass
    return {"total": total, "done": done}


def get_full_dashboard_status(niche: str | None = None, update_selected: bool = True) -> dict:
    global SELECTED_NICHE
    worker_running = is_worker_running()
    if niche and str(niche).strip():
        niche_key = _norm_niche(niche, default="03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico")
    elif worker_running and ACTIVE_WORKER_NICHE:
        niche_key = _norm_niche(ACTIVE_WORKER_NICHE, default="03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico")
    else:
        niche_key = _norm_niche(SELECTED_NICHE, default="03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico")
    if update_selected:
        SELECTED_NICHE = niche_key

    cfg = get_niche_config(niche_key)
    projects_root = cfg["PROJECTS_ROOT"]
    tong_hop_root = cfg["TONG_HOP_ROOT"]
    backlog_path = cfg["BACKLOG_PATH"]

    os.makedirs(projects_root, exist_ok=True)
    os.makedirs(tong_hop_root, exist_ok=True)
    backlog = {"max_parallel_threads": 3, "thinking_effort": "medium", "items": []}
    if os.path.exists(backlog_path):
        try:
            backlog = json.load(open(backlog_path, encoding="utf-8"))
        except Exception:
            pass

    projects = []
    for item in backlog.get("items", []):
        pid = item.get("project_id", "")
        pdir = os.path.join(projects_root, pid) if pid else item.get("project_dir", "")
        st_path = os.path.join(pdir, "STATE.json")
        state = {}
        if os.path.exists(st_path):
            try:
                state = json.load(open(st_path, encoding="utf-8"))
            except Exception:
                pass

        completed_steps = state.get("completed_steps", [])
        cur_status = state.get("current_step_status") or item.get("status", "QUEUED")
        is_completed = bool(state.get("completed"))

        # Xác định đang ở Bàn mấy (1, 1.5, 2, 3, 4, 5, 6)
        active_stage = 0
        if not is_completed:
            if "STEP_1_5" in cur_status:
                active_stage = 1.5
            elif "STEP_1" in cur_status and "STEP_1_DONE" not in completed_steps:
                active_stage = 1
            elif "STEP_2" in cur_status and "STEP_2_DONE" not in completed_steps:
                active_stage = 2
            elif "STEP_3" in cur_status and "STEP_3_DONE" not in completed_steps:
                active_stage = 3
            elif "STEP_4" in cur_status and "STEP_4_DONE" not in completed_steps:
                active_stage = 4
            elif "STEP_5" in cur_status and "STEP_5_DONE" not in completed_steps:
                active_stage = 5
            elif "STEP_6" in cur_status and "STEP_6_DONE" not in completed_steps:
                active_stage = 6

        has_script = os.path.exists(os.path.join(pdir, "FULL_SCRIPT.txt"))
        has_seo = os.path.exists(os.path.join(pdir, "FULL_SEO.txt"))
        has_conv = os.path.exists(os.path.join(pdir, "CHATGPT_CONVERSATION.md"))

        # Tự động làm sạch Part 1..N (chỉ giữ thuần nội dung TTS) và đồng bộ bản sao {STT}_KB.txt + {STT}_SEO.txt vào TONG HOP của đúng kênh
        if has_script or has_seo:
            try:
                export_to_tong_hop_folder(pid, pdir, niche=niche_key)
            except Exception:
                pass

        progress_pct = compute_project_progress_pct(completed_steps, active_stage, is_completed)
        live_note = state.get("live_note", "")
        if not live_note:
            if is_completed:
                live_note = f"Đã hoàn thành 100% cả 6/6 Bàn (Điểm Title: {state.get('winner_title_score', 0)}/100 | Điểm Script: {state.get('final_script_score', 0)}/100)."
            elif active_stage > 0:
                live_note = f"Đang xử lý tại Bàn #{active_stage} ({cur_status})..."
            else:
                live_note = "Đang nằm trong hàng đợi (Chưa chạy)."

        custom_name = state.get("custom_name") or item.get("custom_name", "")
        export_prefix = resolve_project_export_prefix(pid, pdir, state=state, item=item)

        raw_acc_id = state.get("account_id") or (str(state.get("host_id") or "").split(":")[-1] if ":" in str(state.get("host_id") or "") else "")
        acc_lbl = state.get("account_label") or (f"Acc #{raw_acc_id[-1]}" if raw_acc_id in ("acc_1", "acc_2", "acc_3") else "Acc #1")
        eff_acc_id = raw_acc_id or "acc_1"

        agent_reg = dict(state.get("agent_chat_registry") or {})
        if not agent_reg and (state.get("thread_id") or state.get("isolated_threads_log")):
            is_hl = (niche_key == "homeless")
            is_mx = (niche_key == "mexico")
            cur_tid = state.get("thread_id", "")
            iso_log = state.get("isolated_threads_log") or []
            first_tid = (iso_log[0].get("closed_thread_id") if iso_log else "") or cur_tid
            if "STEP_1_DONE" in completed_steps or active_stage == 1:
                agent_reg["DESK_1_TITLE"] = {
                    "desk_role": "DESK_1_TITLE",
                    "agent_id": "mexico-1-title-creator" if is_mx else ("homeless-1-title-creator" if is_hl else "mafia-1-title-rewriter"),
                    "agent_label": "Bàn #1 — Biên Tập & Đột Biến Tiêu Đề",
                    "skill_name": "titulos-drama-familiar-mexico (V1.3.0)" if is_mx else ("viral-title-rewriter (V1.2)" if is_hl else "viet-lai-tieu-de-mafia-nguoi-hau (V1.2)"),
                    "thread_id": first_tid,
                    "chat_url": f"https://chatgpt.com/c/{first_tid}" if first_tid else "",
                    "acc_id": eff_acc_id,
                    "account_label": acc_lbl,
                    "status": "COMPLETED" if "STEP_1_DONE" in completed_steps else "RUNNING",
                    "updated_at": state.get("updated_at", ""),
                }
            if "STEP_2_DONE" in completed_steps or active_stage == 2:
                agent_reg["DESK_2_OUTLINE"] = {
                    "desk_role": "DESK_2_OUTLINE",
                    "agent_id": "mexico-2-outline-architect" if is_mx else ("homeless-2-outline-architect" if is_hl else "mafia-2-outline-architect"),
                    "agent_label": "Bàn #2 — Kiến Trúc Sư Giàn Ý & Khóa DNA",
                    "skill_name": "arquitectura-drama-familiar-mexico (V1.3.0)" if is_mx else ("viet-gian-y-homeless (V2.4)" if is_hl else "viet-gian-y-nguoi-hau (V1.1)"),
                    "thread_id": first_tid,
                    "chat_url": f"https://chatgpt.com/c/{first_tid}" if first_tid else "",
                    "acc_id": eff_acc_id,
                    "account_label": acc_lbl,
                    "status": "COMPLETED" if "STEP_2_DONE" in completed_steps else "RUNNING",
                    "updated_at": state.get("updated_at", ""),
                }
            if "STEP_3_DONE" in completed_steps or active_stage == 3:
                agent_reg["DESK_3_WRITER"] = {
                    "desk_role": "DESK_3_WRITER",
                    "agent_id": "mexico-3-script-writer" if is_mx else ("homeless-3-script-writer" if is_hl else "mafia-3-script-writer"),
                    "agent_label": "Bàn #3 — Nhà Văn Sáng Tác Kịch Bản",
                    "skill_name": "escritor-y-reparacion-drama-familiar-mexico (V1.3.0)" if is_mx else ("viet-kich-ban-homeless (V2.0)" if is_hl else "viet-kich-ban-nguoi-hau-tu-gian-y (V1.4)"),
                    "thread_id": first_tid,
                    "chat_url": f"https://chatgpt.com/c/{first_tid}" if first_tid else "",
                    "acc_id": eff_acc_id,
                    "account_label": acc_lbl,
                    "status": "COMPLETED" if "STEP_3_DONE" in completed_steps else "RUNNING",
                    "updated_at": state.get("updated_at", ""),
                }
            for idx_iso, iso_it in enumerate(iso_log):
                d_role = iso_it.get("desk_role", "")
                next_tid = iso_log[idx_iso + 1].get("closed_thread_id") if (idx_iso + 1 < len(iso_log)) else cur_tid
                if d_role and next_tid:
                    agent_reg[d_role] = {
                        "desk_role": d_role,
                        "agent_id": ("mexico-5-seo-packager" if is_mx else ("homeless-5-seo-packager" if is_hl else "mafia-5-seo-packager")) if "SEO" in d_role else (("mexico-4-script-auditor" if is_mx else ("homeless-4-script-auditor" if is_hl else "mafia-4-forensic-auditor")) if "4A" in d_role else ("mexico-3-script-writer (Repair)" if is_mx else ("homeless-3-script-writer (Repair)" if is_hl else "mafia-3-script-writer (Repair)"))),
                        "agent_label": "Bàn #5 — Đóng Gói SEO & Thumbnail Độc Lập" if "SEO" in d_role else (f"Bàn #4A — Thanh Tra Pháp Y ({d_role})" if "4A" in d_role else f"Bàn #4B — Sửa Kịch Bản ({d_role})"),
                        "skill_name": ("seo-thumbnail-trailer-drama-familiar-mexico (V1.3.0)" if is_mx else ("seo-homeless-story (V2.1)" if is_hl else "viet-seo-nguoi-hau (V1.0)")) if "SEO" in d_role else ("auditor-forense-guion-familiar-mexico (V1.3.0)" if is_mx else ("kiem-tra-kich-ban-homeless (V2.0)" if is_hl else "kiem-tra-kich-ban-nguoi-hau (V1.1)")),
                        "thread_id": next_tid,
                        "chat_url": f"https://chatgpt.com/c/{next_tid}",
                        "acc_id": eff_acc_id,
                        "account_label": acc_lbl,
                        "status": "COMPLETED" if is_completed else "SAVED_READY_TO_RESUME",
                        "updated_at": iso_it.get("timestamp") or state.get("updated_at", ""),
                    }

        skip_title_rewrite = bool(state.get("skip_title_rewrite") or item.get("skip_title_rewrite", False))
        src_title_val = state.get("source_title") or item.get("source_title", "")
        win_title_val = state.get("winner_title") or (src_title_val if skip_title_rewrite else "")
        raw_win_score = int(state.get("winner_title_score") or (100 if skip_title_rewrite else 0))
        win_score_val = (raw_win_score - 100) if (170 <= raw_win_score <= 199) else ((raw_win_score % 100 or 98) if raw_win_score > 100 else raw_win_score)

        projects.append({
            "project_id": pid,
            "project_dir": pdir,
            "custom_name": custom_name,
            "export_prefix": export_prefix,
            "account_id": eff_acc_id,
            "account_label": acc_lbl,
            "source_title": src_title_val,
            "winner_title": win_title_val,
            "winner_title_score": win_score_val,
            "skip_title_rewrite": skip_title_rewrite,
            "outline_beat_count": state.get("outline_beat_count", 0),
            "script_metrics": state.get("script_metrics", {}),
            "audit_history": state.get("audit_history", []),
            "final_script_score": state.get("final_script_score", 0),
            "thread_id": state.get("thread_id", ""),
            "agent_chat_registry": agent_reg,
            "active_agent_desk": state.get("active_agent_desk", ""),
            "active_agent_label": state.get("active_agent_label", ""),
            "active_agent_chat": state.get("active_agent_chat", {}),
            "completed_steps": completed_steps,
            "current_step_status": cur_status,
            "active_stage": active_stage,
            "progress_pct": progress_pct,
            "live_note": live_note,
            "completed": is_completed,
            "updated_at": state.get("updated_at") or item.get("added_at", ""),
            "has_script": has_script,
            "has_seo": has_seo,
            "has_conv": has_conv,
            "video_bridge_status": state.get("video_bridge_status", ""),
            "video_output_path": state.get("video_output_path", ""),
            "voice_output_path": state.get("voice_output_path", ""),
            "srt_output_path": state.get("srt_output_path", ""),
        })

    now_ts = time.time()
    if not hasattr(get_full_dashboard_status, "_env_cache") or (now_ts - getattr(get_full_dashboard_status, "_env_ts", 0.0) > 6.0):
        get_full_dashboard_status._env_cache = check_environment_requirements()
        get_full_dashboard_status._env_ts = now_ts
    env_status = get_full_dashboard_status._env_cache
    web_st = (env_status.get("chatgpt") or {}).get("web_status") or {}
    logged_in_accs_cnt = max(1, int(web_st.get("logged_in_count") or 1))
    desks, thread_slots = build_desks_and_threads_overview(
        projects,
        worker_running,
        ACTIVE_MAX_WORKERS,
        niche=niche_key,
        logged_in_accounts_count=logged_in_accs_cnt,
    )
    lic_status = verify_current_machine_license(force_cloud_check=False)

    # Nếu đang ở Máy Khách và Key vừa bị Admin thu hồi hoặc hết hạn, dừng tiến trình chạy ngay lập tức!
    if worker_running and not lic_status.get("valid", False):
        stop_worker_command()
        worker_running = False

    # Đọc 150 dòng cuối của LIVE_STUDIO_LOG.txt nhưng CHỈ LỌC ĐÚNG KÊNH ĐANG CHỌN (tuyệt đối không trộn log của kênh khác vào nhau)
    recent_logs = ""
    if os.path.exists(LIVE_LOG_PATH):
        try:
            all_lines = open(LIVE_LOG_PATH, "r", encoding="utf-8", errors="replace").read().splitlines()
            target_tag = f"[{niche_key.upper()}]"
            other_tags = {"[MAFIA]", "[HOMELESS]", "[MEXICO]"}
            for k12_id in KEY_PROFILES_12:
                other_tags.add(f"[{k12_id.upper()}]")
            other_tags.discard(target_tag)
            filtered_lines = []
            for ln in all_lines[-800:]:
                ln_up = ln.upper()
                if target_tag in ln_up:
                    filtered_lines.append(ln)
                elif not any(ot in ln_up for ot in other_tags):
                    filtered_lines.append(ln)
            recent_logs = "\n".join(filtered_lines[-150:])
        except Exception:
            pass

    all_counts = {
        "mafia": _get_channel_quick_counts("mafia"),
        "homeless": _get_channel_quick_counts("homeless"),
        "mexico": _get_channel_quick_counts("mexico"),
    }
    for k12 in KEY_PROFILES_12:
        all_counts[k12] = _get_channel_quick_counts(k12)

    return {
        "selected_niche": niche_key,
        "active_worker_niche": ACTIVE_WORKER_NICHE,
        "niche_label": cfg["LABEL"],
        "projects_root": projects_root,
        "tong_hop_root": tong_hop_root,
        "backlog_path": backlog_path,
        "channel_counts": all_counts,
        "worker_running": worker_running,
        "active_mode": ACTIVE_MODE,
        "active_max_workers": ACTIVE_MAX_WORKERS,
        "server_time": datetime.now().strftime("%H:%M:%S — %d/%m/%Y"),
        "env_status": env_status,
        "license_status": lic_status,
        "desks": desks,
        "thread_slots": thread_slots,
        "projects": projects,
        "recent_logs": recent_logs,
    }


HTML_PAGE = r"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZC TEAM — Cyber Terminal Studio Matrix (Bàn #1 → #7)</title>
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #090b10;
    --card: #0f131a;
    --card2: #131820;
    --border: #1e2631;
    --gold: #00ff88;
    --green: #10b981;
    --blue: #059669;
    --purple: #00ff88;
    --red: #ef4444;
    --text: #e6edf3;
    --muted: #8b949e;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    background:
      radial-gradient(circle at 15% 0%, rgba(0, 255, 136, 0.06), transparent 36%),
      radial-gradient(circle at 85% 0%, rgba(16, 185, 129, 0.05), transparent 32%),
      var(--bg);
    color: var(--text);
    padding: 18px 22px;
    line-height: 1.48;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #0f131a 0%, #090b10 100%);
    border: 1px solid var(--border);
    border-left: 5px solid var(--gold);
    border-radius: 10px;
    padding: 16px 22px;
    margin-bottom: 16px;
  }
  .header h1 { font-size: 19px; color: var(--gold); letter-spacing: 0.4px; font-family: 'Space Grotesk', sans-serif; }
  .header p { font-size: 12.5px; color: var(--muted); margin-top: 4px; }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 15px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
  }
  .status-idle { background: rgba(139,148,158,0.12); color: #cbd5e1; border: 1px solid #262f3d; }
  .status-running {
    background: rgba(0,255,136,0.14);
    color: #00ff88;
    border: 1px solid #00ff88;
    animation: pulseGreen 1.5s infinite;
  }
  @keyframes pulseGreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.45); }
    50% { box-shadow: 0 0 0 8px rgba(0,255,136,0); }
  }
  @keyframes pulseGold {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.45); }
    50% { box-shadow: 0 0 0 9px rgba(0,255,136,0); }
  }

  /* KHỐI KIỂM TRA MÔI TRƯỜNG & NOTE CHUYỂN MÁY MỚI */
  .portability-banner {
    background: #131824;
    border: 1px solid var(--border);
    border-left: 4px solid var(--blue);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .portability-banner.error {
    background: rgba(239, 68, 68, 0.12);
    border-color: var(--red);
    border-left: 5px solid var(--red);
  }
  .env-pills { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .env-pill {
    padding: 5px 11px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--border);
    background: #0d111a;
  }
  .env-pill.ok { border-color: var(--green); color: #6ee7b7; background: rgba(16,185,129,0.1); }
  .env-pill.err { border-color: var(--red); color: #fca5a5; background: rgba(239,68,68,0.18); }

  /* SƠ ĐỒ 6 BÀN LÀM VIỆC NHÂN VIÊN AI (CÓ ICON + NOTE ĐANG LÀM GÌ & LÀM ĐẾN ĐÂU) */
  .section-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .desks-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  @media (min-width: 1750px) {
    .desks-grid { grid-template-columns: repeat(5, 1fr); }
  }
  .desk-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 9px 11px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    position: relative;
    transition: all 0.2s;
  }
  .desk-card.running {
    border: 1.5px solid var(--gold);
    background: linear-gradient(180deg, rgba(0,255,136,0.12) 0%, #131824 100%);
    animation: pulseGold 1.8s infinite;
  }
  .desk-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .desk-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #0c0f17;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .desk-card.running .desk-icon {
    border-color: var(--gold);
    background: rgba(0,255,136,0.18);
  }
  .desk-title-area b {
    font-size: 12px;
    color: #fff;
    display: block;
    line-height: 1.25;
  }
  .desk-title-area code {
    font-size: 10.5px;
    color: var(--gold);
  }
  .desk-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .run-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 10.2px;
    font-weight: 700;
  }
  .run-badge.active { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid var(--green); }
  .run-badge.idle { background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid #334155; }

  .thread-badge {
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 600;
  }
  .thread-badge.multi { background: rgba(139,92,246,0.16); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.4); }
  .thread-badge.single { background: rgba(59,130,246,0.16); color: #93c5fd; border: 1px solid rgba(59,130,246,0.4); }

  /* Ô NOTE HIỆN TẠI ĐANG LÀM GÌ & LÀM ĐẾN ĐÂU TRÊN MỖI BÀN */
  .desk-note-box {
    background: #090c12;
    border: 1px dashed #334155;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 10.8px;
    margin-top: auto;
  }
  .desk-card.running .desk-note-box {
    border: 1px solid var(--gold);
    background: rgba(245,185,66,0.07);
  }
  .note-now {
    color: #fde68a;
    font-weight: 600;
    margin-bottom: 5px;
    word-break: break-word;
  }
  .desk-card:not(.running) .note-now {
    color: #cbd5e1;
    font-weight: 500;
  }
  .note-done {
    color: var(--muted);
    font-size: 11px;
    border-top: 1px solid #1e293b;
    padding-top: 4px;
  }

  /* 3 KHE LUỒNG SONG SONG (SLOT 1, 2, 3) */
  .threads-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .slot-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
  }
  .slot-card.running {
    border-color: var(--green);
    background: rgba(16,185,129,0.08);
  }
  .slot-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .progress-track {
    width: 100%;
    height: 7px;
    background: #090b10;
    border-radius: 99px;
    overflow: hidden;
    margin: 6px 0;
    border: 1px solid #1e293b;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), var(--green));
    transition: width 0.3s;
  }

  .grid-top {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
  }
  .panel-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  textarea {
    width: 100%;
    height: 105px;
    background: #080a0f;
    color: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    resize: vertical;
    outline: none;
  }
  textarea:focus { border-color: var(--gold); }
  .controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    align-items: center;
  }
  select {
    background: #080a0f;
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12.5px;
  }
  .btn {
    cursor: pointer;
    border: none;
    border-radius: 8px;
    padding: 8px 13px;
    font-weight: 600;
    font-size: 12.5px;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
  .btn-gold { background: var(--gold); color: #000; }
  .btn-green { background: var(--green); color: #000; }
  .btn-blue { background: var(--blue); color: #fff; }
  .btn-red { background: var(--red); color: #fff; }
  .btn-dark { background: var(--card2); color: var(--text); border: 1px solid var(--border); }
  .btn-sm { padding: 5px 10px; font-size: 11.5px; }

  .log-box {
    background: #06080c;
    color: #a7f3d0;
    font-family: Consolas, Monaco, monospace;
    font-size: 11.8px;
    height: 185px;
    overflow-y: auto;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #1e293b;
    white-space: pre-wrap;
  }

  .project-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    margin-bottom: 6px;
    overflow: hidden;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .project-card:hover { border-color: #334155; }
  .project-card.running { border-color: var(--gold); box-shadow: 0 0 14px rgba(245,185,66,0.12); }
  .project-card.completed { border-left: 4px solid var(--green); }
  .proj-list-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    background: #0d121d;
  }
  .proj-list-row:hover { background: #131b2b; }
  .proj-list-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .proj-chevron {
    font-size: 11px;
    color: var(--gold);
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }
  .proj-code-pill {
    font-size: 11.5px;
    font-weight: 800;
    color: var(--gold);
    background: rgba(245,185,66,0.13);
    border: 1px solid rgba(245,185,66,0.35);
    border-radius: 6px;
    padding: 2px 7px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .proj-status-pill {
    font-size: 10.8px;
    font-weight: 700;
    border-radius: 5px;
    padding: 2px 7px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .proj-title-compact {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 140px;
    flex: 1;
  }
  .proj-list-right {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .proj-meta-chip {
    font-size: 11px;
    color: #cbd5e1;
    background: #161f30;
    border: 1px solid #26334d;
    border-radius: 5px;
    padding: 2px 7px;
    white-space: nowrap;
  }
  .proj-detail-drawer {
    display: none;
    padding: 14px 16px;
    background: #0a0d14;
    border-top: 1px solid var(--border);
  }
  .proj-detail-drawer.open { display: block; }
  .agent-reg-box {
    margin-top: 10px;
    background: #0d1320;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .agent-reg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
    gap: 8px;
    margin-top: 8px;
  }
  .agent-reg-card {
    background: #090d15;
    border: 1px solid #1e293b;
    border-radius: 7px;
    padding: 8px 10px;
    font-size: 11.2px;
  }
  .agent-reg-card.running { border-color: var(--gold); background: rgba(245,185,66,0.08); }
  .agent-reg-card.done { border-color: rgba(16,185,129,0.45); }
  .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
  }
  .proj-id { font-size: 12.5px; color: var(--gold); font-weight: 700; }
  .proj-title { font-size: 14.5px; font-weight: 700; color: #fff; margin-top: 2px; }
  .proj-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

  .steps-pipeline {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
    gap: 9px;
    margin: 12px 0;
  }
  .step-box {
    background: #0c0f17;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px;
    font-size: 11.5px;
  }
  .step-box.done { background: rgba(16,185,129,0.1); border-color: var(--green); }
  .step-box.active {
    background: rgba(245,185,66,0.16);
    border-color: var(--gold);
    animation: pulseGold 1.5s infinite;
  }
  .step-box .st-name { font-weight: 700; color: #fff; margin-bottom: 3px; display: flex; justify-content: space-between; }
  .step-box .st-desc { color: var(--muted); font-size: 11px; }

  .audit-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .badge {
    background: var(--card2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 9px;
    font-size: 11.5px;
  }
  .badge-pass { background: rgba(16,185,129,0.15); border-color: var(--green); color: #6ee7b7; }
  .badge-warn { background: rgba(245,185,66,0.15); border-color: var(--gold); color: #fde68a; }

  .modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.82);
    z-index: 999;
    justify-content: center;
    align-items: center;
    padding: 26px;
  }
  .modal {
    background: var(--card);
    border: 1px solid var(--gold);
    border-radius: 12px;
    width: 92%;
    max-width: 1100px;
    height: 85vh;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    font-family: Consolas, Monaco, monospace;
    font-size: 12.8px;
    white-space: pre-wrap;
    background: #080a0f;
    color: #e2e8f0;
  }
  /* THANH ĐIỀU HƯỚNG GỌN 1 DÒNG (COMPACT TOP NAVBAR — ZC TEAM CYBER MATRIX) */
  .compact-top-navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: linear-gradient(135deg, #0f131a 0%, #090b10 100%);
    border: 1px solid var(--border);
    border-left: 4px solid var(--gold);
    border-radius: 8px;
    padding: 8px 14px;
    margin-bottom: 10px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.45);
  }
  .nav-left, .nav-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .zc-brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 5px;
    border-radius: 7px;
    background: #090b10;
    border: 1px solid rgba(0,255,136,0.4);
    box-shadow: 0 0 14px rgba(0,255,136,0.12);
  }
  .zc-brand-badge img {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    object-fit: cover;
    border: 1px solid rgba(0,255,136,0.45);
    background: #000;
  }
  .zc-brand-badge b {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13.5px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.05em;
  }
  .key-select-container {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #090b10;
    border: 1.5px solid var(--gold);
    border-radius: 8px;
    padding: 4px 10px;
    box-shadow: 0 0 16px rgba(0,255,136,0.14);
  }
  .key-select-container .key-lbl {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    font-weight: 800;
    color: var(--gold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .key-select-container select {
    background: #0f131a;
    color: #fff;
    border: 1px solid rgba(0,255,136,0.35);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12.8px;
    font-weight: 800;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    cursor: pointer;
    outline: none;
    min-width: 285px;
  }
  .key-select-container select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px rgba(0,255,136,0.2);
  }
  .channel-tab {
    background: #0d121d;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s;
    user-select: none;
  }
  .channel-count-badge {
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    background: rgba(0,255,136,0.12);
    border: 1px solid rgba(0,255,136,0.4);
    color: var(--gold);
    white-space: nowrap;
  }
  .drawer-toggle-btn {
    cursor: pointer;
    background: #131820;
    color: #e6edf3;
    border: 1px solid #262f3d;
    border-radius: 7px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .drawer-toggle-btn:hover { border-color: var(--gold); color: #fff; background: #19212d; }
  .drawer-toggle-btn.active {
    background: rgba(0,255,136,0.16);
    border-color: var(--gold);
    color: var(--gold);
    box-shadow: 0 0 12px rgba(0,255,136,0.18);
  }
  .studio-subtabs-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    background: #0d121a;
    border: 1px solid #1e293b;
    border-left: 3px solid var(--gold);
    border-radius: 9px;
    padding: 6px 10px;
    margin-bottom: 10px;
  }
  .studio-subtabs-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .studio-subtab-btn {
    cursor: pointer;
    background: #131924;
    color: #94a3b8;
    border: 1px solid #263244;
    border-radius: 7px;
    padding: 7px 13px;
    font-size: 12.2px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: all 0.15s ease;
    user-select: none;
  }
  .studio-subtab-btn:hover {
    border-color: #38bdf8;
    color: #f8fafc;
    background: #172030;
  }
  .studio-subtab-btn.active {
    background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(16,185,129,0.12));
    border-color: var(--gold);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(0,255,136,0.2), inset 0 0 0 1px rgba(0,255,136,0.25);
  }
  .studio-subtab-pane {
    display: none;
    animation: fadeInDrawer 0.14s ease;
  }
  .studio-subtab-pane.active {
    display: block;
  }
  body.embedded-electron .studio-subtab-btn,
  body.embedded-electron .zc-brand-badge {
    display: none !important;
  }
  .render-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .render-stat-card {
    background: #0b0f17;
    border: 1px solid #1e293b;
    border-left: 3px solid var(--gold);
    border-radius: 8px;
    padding: 9px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .render-stat-card span {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
  }
  .render-stat-card b {
    font-size: 18px;
    font-family: 'JetBrains Mono', monospace;
    color: #f8fafc;
  }
  .top-drawer {
    display: block;
    margin-bottom: 10px;
    animation: fadeInDrawer 0.15s ease;
  }
  @keyframes fadeInDrawer {
    from { opacity: 0; transform: translateY(-3px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .mini-log-ticker {
    background: #05070b;
    border: 1px solid #1e2631;
    border-radius: 6px;
    padding: 4px 10px;
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    font-size: 11.2px;
    color: #00ff88;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    cursor: pointer;
  }
  .mini-log-ticker:hover { border-color: var(--gold); }
</style>
</head>
<body style="padding: 8px 12px;">

<!-- THANH CÔNG CỤ TRÊN CÙNG GỌN 1 DÒNG + THANH 4 TAB NHỎ TÁCH BIỆT RÕ RÀNG -->
<div class="compact-top-navbar">
  <div class="nav-left">
    <div class="zc-brand-badge" title="ZC TEAM · Cyber Terminal Studio Matrix">
      <img src="/assets/zc-logo.png" alt="ZC TEAM" width="28" height="28" style="width:28px;height:28px;max-width:28px;max-height:28px;object-fit:cover;border-radius:5px;border:1px solid rgba(0,255,136,0.45);background:#000;flex-shrink:0;">
      <b>ZC TEAM</b>
    </div>

    <div class="key-select-container" title="Chọn Key / Kênh Sản Xuất Kịch Bản AI (Selection Option)">
      <span class="key-lbl">🔑 CHỌN KEY:</span>
      <select id="topChannelKeySelector" onchange="switchChannel(this.value)">
        <option id="optKey_01" value="01_Nhom_Ong_Gia_Tra_Dua_My_US">🇺🇸 01_Nhom_Ong_Gia_Tra_Dua_My_US (Ông già trả đũa - Mỹ US)</option>
        <option id="optKey_02" value="02_Nhom_Phu_Nu_Bao_Thu_My_US">🇺🇸 02_Nhom_Phu_Nu_Bao_Thu_My_US (Phụ nữ báo thù - Mỹ US)</option>
        <option id="optKey_03" value="03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico">🇲🇽 03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico (Bà già Drama Gia đình - Mexico)</option>
        <option id="optKey_04" value="04_Nhom_Ong_Gia_Trung_Tri_Mexico">🇲🇽 04_Nhom_Ong_Gia_Trung_Tri_Mexico (Ông già trừng trị con bất hiếu - Mexico)</option>
        <option id="optKey_05" value="05_Nhom_Manga_Doc_Than_Japan">🇯🇵 05_Nhom_Manga_Doc_Than_Japan (Manga Đàn ông Độc thân - Nhật Bản)</option>
        <option id="optKey_06" value="06_Huu_Tri_Viec_Lam_Japan">🇯🇵 06_Huu_Tri_Viec_Lam_Japan (Hưu trí &amp; Việc làm Kuchikomi - Nhật Bản)</option>
        <option id="optKey_07" value="07_Dong_Que_Co_Dien_Mexico">🇲🇽 07_Dong_Que_Co_Dien_Mexico (Truyện xưa Đồng quê Cổ điển - Mexico)</option>
        <option id="optKey_08" value="08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico">🇲🇽 08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico (Tình yêu Ngoại tình Phản bội - Mexico)</option>
        <option id="optKey_09" value="09_Tieu_Su_Goc_Khuat_Sao_Mexico">🇲🇽 09_Tieu_Su_Goc_Khuat_Sao_Mexico (Tiểu sử Góc khuất Sao - Mexico)</option>
        <option id="optKey_10" value="10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US">🇺🇸 10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US (Người cha da màu CEO ngầm - Mỹ US)</option>
        <option id="optKey_11" value="11_Chuyen_Tinh_Dan_Ong_My_US">🇺🇸 11_Chuyen_Tinh_Dan_Ong_My_US (Chuyện tình Đàn ông POV - Mỹ US)</option>
        <option id="optKey_12" value="12_Kinh_Di_Dem_Khuya_My_US">🇺🇸 12_Kinh_Di_Dem_Khuya_My_US (Kinh dị Đêm khuya - Mỹ US)</option>
        <option id="optKeyMexico" value="mexico">🇲🇽 KEY MEXICO BÀ CÔ (0/0)</option>
        <option id="optKeyHomeless" value="homeless">🏚️ KEY BÊN HOMELESS V12 (0/0)</option>
        <option id="optKeyMafia" value="mafia">🎩 KEY BÊN MAFIA (0/0)</option>
      </select>
      <span id="activeChannelCountBadge" class="channel-count-badge" title="Số kịch bản Hoàn tất / Tổng số của Key đang chọn">0/0</span>
    </div>

    <!-- Giữ ẩn các thẻ ID cũ để tương thích 100% với mọi hàm JS -->
    <div style="display:none;">
      <div id="tabMafia" class="channel-tab active-mafia"><span id="badgeCountMafia">0/0</span></div>
      <div id="tabHomeless" class="channel-tab"><span id="badgeCountHomeless">0/0</span></div>
      <div id="tabMexico" class="channel-tab"><span id="badgeCountMexico">0/0</span></div>
    </div>

    <div id="workerBadge" class="status-pill status-idle" style="padding: 5px 12px; font-size: 11.8px;">⚪ ĐANG CHỜ LỆNH (IDLE)</div>
    <span id="serverTime" style="font-size:11px; color:var(--muted); font-family:'JetBrains Mono',monospace;"></span>
  </div>

  <div class="nav-right">
    <button id="btnSubTab_scripts" class="studio-subtab-btn active" onclick="switchStudioSubTab('scripts')" title="Tab 1: Giao việc, nhập Tiêu đề và quản lý Danh sách Kịch bản (Gọn gàng, dễ quan sát)">
      ✍️ 1. Viết Kịch Bản <span id="subtabCountScripts" class="badge" style="padding:1px 6px; font-size:10.5px; color:#00ff88; border-color:rgba(0,255,136,0.4);">0</span>
    </button>
    <button id="btnSubTab_render" class="studio-subtab-btn" onclick="switchStudioSubTab('render')" title="Tab 2: Quan sát tiến độ Tạo Voice (.wav), Phụ đề (.srt) & Render Video GPU (.mp4) + Cấu hình Batch Video">
      🎬 2. Render Video <span id="subtabCountRender" class="badge" style="padding:1px 6px; font-size:10.5px; color:#38bdf8; border-color:rgba(56,189,248,0.4);">Bàn #7</span>
    </button>
    <button id="btnSubTab_logs" class="studio-subtab-btn" onclick="switchStudioSubTab('logs')" title="Tab 3: Màn hình Nhật ký Log hệ thống riêng biệt (Có tìm kiếm, bộ lọc và xem toàn màn hình)">
      📡 3. Nhật Ký Log <span id="subtabLogBadge" class="badge" style="padding:1px 6px; font-size:10.5px; color:#fde68a; border-color:rgba(245,185,66,0.4);">Live</span>
    </button>
    <button id="btnSubTab_agents" class="studio-subtab-btn" onclick="switchStudioSubTab('agents')" title="Tab 4: Đăng nhập 3 Tài khoản ChatGPT Web & Sơ đồ 9 Bàn Nhân Viên Agent AI">
      🤖 4. 9 Agent &amp; 3 Acc <span id="navAccSummary" class="badge" style="padding:1px 6px; font-size:10.5px; color:#00ff88; border-color:rgba(0,255,136,0.4);">Acc #1..#3</span>
    </button>
    <button class="btn btn-gold btn-sm" style="padding:6px 10px; font-size:11.5px; font-weight:800;" onclick="openProjectFolder('TONG_HOP')">📂 Mở TONG HOP</button>
  </div>
</div>

<!-- KHỐI BẢN QUYỀN ĐỒNG BỘ 1 KEY DUY NHẤT (VBSKEY) VỚI VIDEO BATCH STUDIO -->
<div id="clientActivationGate" class="panel" style="display:none; border:2px solid var(--red); background:linear-gradient(135deg, rgba(239,68,68,0.16) 0%, #111520 100%); margin-bottom:10px; padding:12px 16px;">
  <div class="panel-title">
    <span style="color:#fca5a5; font-size:14.5px;">🔐 BẢN QUYỀN HỆ THỐNG ĐANG BỊ KHÓA HOẶC CHƯA KÍCH HOẠT (1 KEY VBSKEY DUY NHẤT)</span>
    <span id="clientGateStatusBadge" class="badge badge-warn">CHƯA KÍCH HOẠT</span>
  </div>
  <div id="clientGateMsg" style="font-size:12.5px; color:#fde68a; margin-bottom:8px; font-weight:600;"></div>
  <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
    <span style="font-size:12px; color:var(--muted);">Mã Máy Thống Nhất (Machine ID):</span>
    <code id="clientHwidText" style="background:#080a0f; border:1px solid var(--gold); color:var(--gold); padding:4px 10px; border-radius:6px; font-weight:700; font-size:12.5px;">Đang lấy...</code>
    <button class="btn btn-dark btn-sm" onclick="copyClientHwid()">📋 Copy Mã Máy</button>
  </div>
  <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
    <input id="clientLicenseKeyInput" type="text" placeholder="Dán mã Key bản quyền thống nhất (VBSKEY....) được cấp từ ứng dụng VBS License Admin vào đây..." style="flex:1; min-width:300px; background:#080a0f; color:#fff; border:1px solid var(--gold); border-radius:8px; padding:8px 12px; font-size:12.5px;" />
    <button class="btn btn-gold btn-sm" onclick="activateClientKey()">🔑 Kích Hoạt Ngay</button>
    <button class="btn btn-dark btn-sm" onclick="forceCheckClientLicense()">🔄 Kiểm Tra Lại</button>
  </div>
</div>

<div id="clientActiveBar" style="display:none !important;"><span id="clientActiveInfo"></span></div>
<div id="adminLicensePanel" style="display:none !important;"><span id="adminKeyCount">0</span><div id="adminKeyManagerBody"></div><div id="adminNewKeyResult"></div><div id="adminKeysTableContainer"></div></div>

<div id="mainStudioWorkspace">

<!-- ======================================================================= -->
<!-- TAB NHỎ 1 (MẶC ĐỊNH): VIẾT KỊCH BẢN & DANH SÁCH TIÊU ĐỀ (GỌN GÀNG 100%) -->
<!-- ======================================================================= -->
<div id="subtabPane_scripts" class="studio-subtab-pane active">
  <!-- KHUNG CHÍNH SỐ 1: GIAO VIỆC & ĐIỀU KHIỂN CHẠY (GỌN GÀNG, CÓ NÚT THU NHỎ Ô NHẬP) -->
  <div class="panel" style="padding:10px 14px; margin-bottom:10px;">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button id="btnToggleComposer" class="btn btn-dark btn-sm" style="border-color:var(--gold); color:var(--gold); font-weight:700;" onclick="toggleComposerBody()" title="Thu gọn hoặc mở rộng khung nhập tiêu đề">
          <span id="composerToggleLabel">🔽 Thu nhỏ ô nhập</span>
        </button>
        <!-- Đã ẩn ô chọn Kênh/Key thứ 2 bị trùng lặp (chỉ chọn 1 lần duy nhất tại thanh 🔑 CHỌN KEY phía trên) -->
        <b style="display:none;">📝 GIAO VIỆC:</b>
        <select id="nicheSelector" onchange="switchChannel(this.value)" style="display:none;">
          <option value="01_Nhom_Ong_Gia_Tra_Dua_My_US">🇺🇸 01_Nhom_Ong_Gia_Tra_Dua_My_US (Ông già trả đũa - Mỹ US)</option>
          <option value="02_Nhom_Phu_Nu_Bao_Thu_My_US">🇺🇸 02_Nhom_Phu_Nu_Bao_Thu_My_US (Phụ nữ báo thù - Mỹ US)</option>
          <option value="03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico">🇲🇽 03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico (Bà già Drama Gia đình - Mexico)</option>
          <option value="04_Nhom_Ong_Gia_Trung_Tri_Mexico">🇲🇽 04_Nhom_Ong_Gia_Trung_Tri_Mexico (Ông già trừng trị con bất hiếu - Mexico)</option>
          <option value="05_Nhom_Manga_Doc_Than_Japan">🇯🇵 05_Nhom_Manga_Doc_Than_Japan (Manga Đàn ông Độc thân - Nhật Bản)</option>
          <option value="06_Huu_Tri_Viec_Lam_Japan">🇯🇵 06_Huu_Tri_Viec_Lam_Japan (Hưu trí &amp; Việc làm Kuchikomi - Nhật Bản)</option>
          <option value="07_Dong_Que_Co_Dien_Mexico">🇲🇽 07_Dong_Que_Co_Dien_Mexico (Truyện xưa Đồng quê Cổ điển - Mexico)</option>
          <option value="08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico">🇲🇽 08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico (Tình yêu Ngoại tình Phản bội - Mexico)</option>
          <option value="09_Tieu_Su_Goc_Khuat_Sao_Mexico">🇲🇽 09_Tieu_Su_Goc_Khuat_Sao_Mexico (Tiểu sử Góc khuất Sao - Mexico)</option>
          <option value="10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US">🇺🇸 10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US (Người cha da màu CEO ngầm - Mỹ US)</option>
          <option value="11_Chuyen_Tinh_Dan_Ong_My_US">🇺🇸 11_Chuyen_Tinh_Dan_Ong_My_US (Chuyện tình Đàn ông POV - Mỹ US)</option>
          <option value="12_Kinh_Di_Dem_Khuya_My_US">🇺🇸 12_Kinh_Di_Dem_Khuya_My_US (Kinh dị Đêm khuya - Mỹ US)</option>
          <option value="mexico">🇲🇽 MEXICO BÀ CÔ (7 Parts, 70k–80k ký tự, es-MX + Bàn 1.5 &amp; Bàn 7 Check TTS)</option>
          <option value="homeless">🏚️ BÊN HOMELESS V12 (7 Parts, 70k–80k ký tự)</option>
          <option value="mafia" selected>🎩 BÊN MAFIA (5–6 Parts, 44k–48k ký tự)</option>
        </select>
        <select id="titleModeSelector" onchange="syncTitleModeSelection(this.value)" style="padding:5px 9px; font-size:11.8px; font-weight:700; color:#fde68a; border-color:var(--gold); background:#0f172a;" title="Chọn chế độ xử lý khi dán Tiêu đề: Viết lại ở Bàn #1 hoặc Dùng luôn Tiêu đề đã dán (Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5)">
          <option value="rewrite" selected>🔥 Chế độ: Viết lại Tiêu đề (Chạy từ Bàn #1)</option>
          <option value="keep_original">🎯 Chế độ: Dùng luôn Tiêu đề đã dán — Không viết lại (Chạy thẳng Bàn #1.5)</option>
        </select>
        <select id="maxWorkers" style="padding:5px 8px; font-size:11.8px;" title="Chế độ chia tải luồng">
          <option value="0" selected>⚡ Tự động (&le;3 KB/Acc)</option>
          <option value="1">1 Luồng</option>
          <option value="2">2 Luồng</option>
          <option value="3">3 Luồng (1 Acc)</option>
          <option value="6">6 Luồng (2 Acc)</option>
          <option value="9">9 Luồng (3 Acc)</option>
        </select>
        <select id="thinkingEffort" style="padding:5px 8px; font-size:11.8px;" title="Độ sâu suy luận ChatGPT">
          <option value="medium" selected>Effort: Medium</option>
          <option value="high">Effort: High</option>
          <option value="low">Effort: Low</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <button class="btn btn-green btn-sm" style="padding:6px 10px; font-size:11.8px; border:1px solid #34d399;" onclick="openChatGPTWebLogin('acc_1')" title="Mở trình duyệt Chrome để đăng nhập tài khoản ChatGPT">🔑 Đăng Nhập ChatGPT</button>
        <button class="btn btn-blue btn-sm" style="padding:6px 10px; font-size:11.8px; font-weight:700;" onclick="addTitlesOnly()">📥 Lưu Tiêu Đề &amp; Mã</button>
        <button id="btnUpdateTitlesMain" class="btn btn-dark btn-sm" style="padding:6px 11px; font-size:11.8px; font-weight:800; border:1px solid #38bdf8; color:#38bdf8; background:rgba(14,165,233,0.14);" onclick="updateTitlesFromComposerNow()" title="Cập nhật lại Tiêu đề & Mã kịch bản cho danh sách hiện tại (Nếu ô nhập đang trống, bấm lần 1 để nạp danh sách Tiêu đề hiện tại lên ô nhập, sửa xong bấm lần 2 để lưu đè!)">🔄 Cập Nhật Tiêu Đề</button>
        <button class="btn btn-gold btn-sm" style="padding:6px 12px; font-size:11.8px; font-weight:800; background:linear-gradient(135deg,#00ff88,#10b981); color:#04130b; border-color:#00ff88;" onclick="addAndRunWithAutoVideoNow()" title="Lưu Tiêu đề + Mã kịch bản, tự động viết kịch bản qua 9 Bàn AI rồi tự động Tạo Voice + Phụ đề + Render Video MP4 luôn!">🎬 Viết Kịch Bản ➔ Làm Video Luôn</button>
        <button class="btn btn-gold btn-sm" style="padding:6px 11px; font-size:11.8px;" onclick="addAndRunNow()">🚀 Lưu &amp; Chạy Ngay</button>
        <button class="btn btn-green btn-sm" style="padding:6px 11px; font-size:11.8px;" onclick="runQueueNow()">▶️ Chạy Tiếp Hàng Đợi</button>
        <button class="btn btn-red btn-sm" style="padding:6px 10px; font-size:11.8px;" onclick="stopWorker()">⏹️ Dừng</button>
      </div>
    </div>

    <!-- KHUNG 2 Ô NHẬP TIÊU ĐỀ (ĐÃ ẨN THANH CHỌN TRÙNG LẶP BÊN TRONG ĐỂ CHỈ CHỌN 1 LẦN Ở TRÊN) -->
    <div id="composerBody" style="margin-top:8px; padding-top:8px; border-top:1px solid #1e293b;">
      <div style="display:none;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:12px; font-weight:700; color:#f8fafc;">⚡ Chế độ Tiêu đề:</span>
          <label id="lblModeRewrite" onclick="syncTitleModeSelection('rewrite')">
            <input type="radio" name="titlePasteModeRadio" id="radioModeRewrite" value="rewrite" checked onchange="syncTitleModeSelection('rewrite')" />
            <span>🔥 Viết lại Tiêu đề (Bàn #1)</span>
          </label>
          <label id="lblModeKeepOriginal" onclick="syncTitleModeSelection('keep_original')">
            <input type="radio" name="titlePasteModeRadio" id="radioModeKeepOriginal" value="keep_original" onchange="syncTitleModeSelection('keep_original')" />
            <span>🎯 Dùng luôn Tiêu đề đã dán (Chạy thẳng Bàn #1.5)</span>
          </label>
        </div>
        <div>
          <select id="embeddedAutoVideoMode" onchange="syncEmbeddedBridgeMode(this.value)">
            <option value="STREAMING_VIDEO" selected>⚡ Viết Kịch Bản Xong ➔ Tạo Voice + Làm Video MP4 Luôn</option>
            <option value="BATCH_VIDEO">📦 Đợi viết xong cả lô ➔ Tạo Voice + Làm Video 1 lượt</option>
            <option value="STREAMING_VOICE">🎙️ Viết Kịch Bản Xong ➔ Chỉ Tạo Voice (.wav)</option>
            <option value="DISABLED">📝 Chỉ Viết Kịch Bản (.txt) — Không tự tạo Video</option>
          </select>
        </div>
        <span id="titleModeHintBadge" style="display:none;">📌 Đang chọn: Viết lại 5 tiêu đề mới tại Bàn #1 (&ge;97đ)</span>
      </div>

      <div style="display:grid; grid-template-columns: 0.28fr 0.72fr; gap:8px;">
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; font-weight:700; color:#38bdf8; margin-bottom:4px;">
            <span>🏷️ TÊN KỊCH BẢN (Tùy chọn)</span>
            <span style="font-size:10.5px; color:var(--muted); font-weight:400;">Trống = 001, 002...</span>
          </div>
          <textarea id="customNamesInput"
            onscroll="syncTwoColScroll(this, 'titlesInput')"
            onpaste="handleSmartTwoColPaste(event)"
            style="height:74px; padding:7px 9px; font-size:12px; border-color:#1e3a5f; color:#fde68a; font-weight:600; font-family:Consolas, monospace; white-space:pre;"
            placeholder="VD:&#10;KB01&#10;KB02"></textarea>
        </div>
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; font-weight:700; color:var(--gold); margin-bottom:4px; gap:6px; flex-wrap:wrap;">
            <span id="titlesInputHeaderLabel">🎯 DANH SÁCH TIÊU ĐỀ GỐC TIẾNG ANH / TÂY BAN NHA MEXICO (Mỗi dòng 1 tiêu đề — Hỗ trợ dán 2 cột từ Excel)</span>
            <div style="display:flex; gap:5px; align-items:center;">
              <button type="button" class="btn btn-dark btn-sm" style="padding:2px 8px; font-size:10.5px; border-color:#38bdf8; color:#38bdf8;" onclick="loadQueueTitlesToComposer()" title="Nạp danh sách Tiêu đề & Mã đang có trong hàng đợi lên 2 ô này để chỉnh sửa rồi bấm Cập Nhật Tiêu Đề">📥 Nạp Tiêu Đề Đang Có Lên Sửa</button>
              <button type="button" class="btn btn-dark btn-sm" style="padding:2px 7px; font-size:10.5px;" onclick="autoSplitMergedInputNow()">🪄 Tự Tách 2 Cột</button>
              <button type="button" class="btn btn-dark btn-sm" style="padding:2px 7px; font-size:10.5px; border-color:rgba(239,68,68,0.5); color:#fca5a5;" onclick="clearComposerInputsNow()" title="Xóa trắng 2 ô nhập Mã & Tiêu đề">🧹 Xóa Ô Nhập</button>
            </div>
          </div>
          <textarea id="titlesInput"
            onscroll="syncTwoColScroll(this, 'customNamesInput')"
            onpaste="handleSmartTwoColPaste(event)"
            style="height:74px; padding:7px 9px; font-size:12px; white-space:pre;"
            placeholder="Dán danh sách Tiêu đề gốc vào đây rồi bấm [📥 Lưu Tiêu Đề & Mã] hoặc [🔄 Cập Nhật Tiêu Đề] hoặc [🎬 Viết Kịch Bản ➔ Làm Video Luôn]..."></textarea>
        </div>
      </div>
    </div>

    <!-- DÒNG THÔNG BÁO NHANH & LOG 1 DÒNG (CLICK ĐỂ SANG TAB LOG RIÊNG) -->
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:6px; flex-wrap:wrap;">
      <div id="actionMsg" style="font-size:11.8px; font-weight:600; color:#34d399;"></div>
      <div id="miniLatestLogLine" class="mini-log-ticker" style="flex:1; min-width:240px;" onclick="switchStudioSubTab('logs')" title="Click vào đây để chuyển sang Tab 📡 Nhật Ký Log Hệ Thống xem chi tiết">
        📡 Log mới nhất: Đang chờ lệnh... (Click để mở Tab Log riêng)
      </div>
    </div>
  </div>

  <!-- KHUNG CHÍNH SỐ 2: DANH SÁCH KỊCH BẢN GỌN GÀNG (HIỂN THỊ NGAY TRƯỚC MẮT KHÔNG CẦN CUỘN QUA LOG HAY AGENT) -->
  <div class="panel" style="padding:10px 14px;">
    <div class="panel-title" style="flex-wrap:wrap; gap:8px; margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <label style="display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:#0d1320; border:1px solid #2b3650; padding:4px 9px; border-radius:6px; font-size:11.8px; color:#e2e8f0; user-select:none;" title="Tích chọn hoặc bỏ chọn tất cả kịch bản đang hiển thị bên dưới">
          <input id="selectAllProjectsCb" type="checkbox" onchange="toggleSelectAllProjects(this.checked)" style="width:14px; height:14px; accent-color:var(--gold); cursor:pointer;" />
          <span>Chọn tất cả</span>
        </label>
        <span style="font-size:13.5px;">📋 DANH SÁCH KỊCH BẢN (<span id="projChannelBadge" style="color:#38bdf8;">🎩 BÊN MAFIA</span>: <span id="projCount">0</span>)</span>
        <button class="btn btn-dark btn-sm" style="padding:4px 10px; font-size:11.5px; border-color:#38bdf8; color:#38bdf8; font-weight:700;" onclick="loadQueueTitlesToComposer()" title="Nạp toàn bộ Tiêu đề & Mã của danh sách bên dưới lên ô nhập phía trên để sửa hàng loạt rồi bấm Cập Nhật Tiêu Đề">
          🔄 Cập Nhật Tiêu Đề Hàng Loạt
        </button>
        <button id="btnBulkDeleteSelected" class="btn btn-dark btn-sm" style="padding:4px 10px; font-size:11.5px; border-color:rgba(239,68,68,0.5); color:#fca5a5;" onclick="bulkDeleteSelectedProjects()" title="Xóa toàn bộ các kịch bản đã tích chọn và xóa vĩnh viễn luôn cả Folder chứa kịch bản + file trong TONG HOP">
          🗑️ Xóa Đã Chọn (<span id="selectedProjCount">0</span>) &amp; Xóa Folder
        </button>
        <button class="btn btn-red btn-sm" style="padding:4px 10px; font-size:11.5px; font-weight:700;" onclick="deleteAllProjectsInChannel()" title="Xóa sạch toàn bộ Tiêu đề & Folder kịch bản đang có trong danh sách của Key này chỉ với 1 click">
          🗑️ Xóa Tất Cả Tiêu Đề
        </button>
        <button id="btnClearSelection" class="btn btn-dark btn-sm" style="display:none; padding:4px 8px; font-size:11px;" onclick="clearSelectedProjects()">✖ Bỏ chọn</button>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
        <input id="projSearchInput" type="text" placeholder="🔍 Tìm STT, tên, tiêu đề..." oninput="fetchStatus()" style="width:185px; padding:4px 8px; font-size:11.5px; border-radius:6px; background:#090d14; border:1px solid var(--border); color:#fff;" />
        <select id="projFilterSelect" onchange="fetchStatus()" style="padding:4px 8px; font-size:11.5px; border-radius:6px; background:#090d14; border:1px solid var(--border); color:#fff;">
          <option value="all">Tất cả trạng thái</option>
          <option value="running">⚡ Đang chạy</option>
          <option value="completed">✅ Đã hoàn tất</option>
          <option value="queued">⏳ Đang chờ</option>
        </select>
        <button class="btn btn-dark btn-sm" style="padding:4px 8px; font-size:11px;" onclick="expandOrCollapseAllProjects(true)">🔽 Mở tất cả</button>
        <button class="btn btn-dark btn-sm" style="padding:4px 8px; font-size:11px;" onclick="expandOrCollapseAllProjects(false)">🔼 Thu gọn tất cả</button>
        <button class="btn btn-dark btn-sm" style="padding:4px 8px; font-size:11px;" onclick="openProjectFolder('')">📂 Thư Mục Gốc</button>
      </div>
    </div>
    <div id="projectsContainer"></div>
  </div>
</div>

<!-- ======================================================================= -->
<!-- TAB NHỎ 2: QUAN SÁT & ĐIỀU KHIỂN RENDER VIDEO (BÀN #7 & BATCH GPU)      -->
<!-- ======================================================================= -->
<div id="subtabPane_render" class="studio-subtab-pane">
  <div class="panel" style="padding:12px 14px; margin-bottom:10px; border:1px solid rgba(0,255,136,0.35);">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
      <div>
        <b style="font-size:14px; color:var(--gold);">🎬 BÀN #7 — TRUNG TÂM QUAN SÁT TIẾN ĐỘ TẠO VOICE (.WAV) &amp; RENDER VIDEO GPU (.MP4)</b>
        <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
          Theo dõi trực tiếp trạng thái xuất kịch bản sạch TTS (<code>_KB.txt</code>), tổng hợp giọng đọc AI (<code>VoiceStudio :3900</code>), phụ đề Whisper GPU (<code>.srt</code>) và ghép Video (<code>.mp4</code>).
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:7px; flex-wrap:wrap;">
        <button class="btn btn-gold btn-sm" style="padding:6px 12px; font-size:11.8px; font-weight:800;" onclick="sendAllReadyProjectsToVideoStudio()">
          🚀 Đẩy Tất Cả Kịch Bản Đã Có KB Sang Render Video
        </button>
        <button class="btn btn-blue btn-sm" style="padding:6px 12px; font-size:11.8px; font-weight:700;" onclick="openFullBatchVideoConfigInParent()">
          🎛️ Mở Cấu Hình &amp; Tiến Độ Batch GPU Chi Tiết
        </button>
        <button class="btn btn-dark btn-sm" style="padding:6px 10px; font-size:11.5px; border-color:var(--gold); color:var(--gold);" onclick="openProjectFolder('TONG_HOP')">
          📂 Mở Folder TONG HOP
        </button>
        <button class="btn btn-dark btn-sm" style="padding:6px 10px; font-size:11.5px;" onclick="switchStudioSubTab('scripts')">
          ✍️ Quay Lại Tab Viết Kịch Bản
        </button>
      </div>
    </div>

    <div class="render-stats-grid">
      <div class="render-stat-card">
        <span>📋 TỔNG KỊCH BẢN TRONG KÊNH</span>
        <b id="renderStatTotal">0</b>
      </div>
      <div class="render-stat-card" style="border-left-color:#38bdf8;">
        <span>📄 ĐÃ CÓ FILE TTS SẠCH (_KB.TXT)</span>
        <b id="renderStatReadyKb" style="color:#38bdf8;">0</b>
      </div>
      <div class="render-stat-card" style="border-left-color:#f59e0b;">
        <span>⚡ ĐANG TẠO VOICE / ĐỢI GPU RENDER</span>
        <b id="renderStatRunning" style="color:#fde68a;">0</b>
      </div>
      <div class="render-stat-card" style="border-left-color:#10b981;">
        <span>✅ ĐÃ XUẤT VIDEO .MP4 HOÀN TẤT</span>
        <b id="renderStatCompleted" style="color:#34d399;">0</b>
      </div>
    </div>

    <div id="renderSubTabProjectsContainer"></div>
  </div>
</div>

<!-- ======================================================================= -->
<!-- TAB NHỎ 3: NHẬT KÝ LOG HỆ THỐNG RIÊNG BIỆT (FULL-HEIGHT, DỄ QUAN SÁT)  -->
<!-- ======================================================================= -->
<div id="subtabPane_logs" class="studio-subtab-pane">
  <div id="drawerLogs" class="top-drawer open" style="margin-bottom:0;">
    <div class="panel" style="padding:12px 14px; margin-bottom:0; border:1px solid rgba(56,189,248,0.4);">
      <div class="panel-title" style="margin-bottom:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="color:#38bdf8; font-size:14px;">📡 NHẬT KÝ TIẾN TRÌNH &amp; TRẠNG THÁI CHẠY TRỰC TIẾP (LIVE CONSOLE LOG)</span>
          <span id="logLineCountBadge" class="badge" style="color:#00ff88; border-color:rgba(0,255,136,0.4);">0 dòng</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <input id="logSearchInput" type="text" placeholder="🔍 Lọc theo Mã kịch bản, Acc #1, Bàn #3, lỗi..." oninput="refreshFilteredLogDisplay()" style="width:230px; padding:5px 9px; font-size:11.5px; border-radius:6px; background:#090d14; border:1px solid #334155; color:#fff;" />
          <select id="logCategorySelect" onchange="refreshFilteredLogDisplay()" style="padding:5px 9px; font-size:11.5px; border-radius:6px; background:#090d14; border:1px solid #334155; color:#e2e8f0;">
            <option value="ALL">📋 Tất cả dòng Log</option>
            <option value="SCRIPT">✍️ Chỉ Log Viết Kịch Bản &amp; Chấm Điểm (Bàn #1 ➔ #6)</option>
            <option value="VIDEO">🎬 Chỉ Log Tạo Voice &amp; Render Video (Bàn #7)</option>
            <option value="ERROR">⚠️ Chỉ Cảnh Báo &amp; Lỗi (Error / Warning)</option>
          </select>
          <label style="display:inline-flex; align-items:center; gap:5px; font-size:11.5px; color:#cbd5e1; cursor:pointer; background:#0d1320; padding:4px 9px; border-radius:6px; border:1px solid #2b3650;">
            <input id="logAutoScrollCb" type="checkbox" checked style="width:14px; height:14px; accent-color:var(--gold); cursor:pointer;" />
            <span>Tự cuộn xuống cuối</span>
          </label>
          <button class="btn btn-dark btn-sm" onclick="copyLiveLogsNow()">📋 Copy Log</button>
          <button class="btn btn-red btn-sm" onclick="clearLogs()">🧹 Xóa bớt Log</button>
          <button class="btn btn-dark btn-sm" onclick="switchStudioSubTab('scripts')">✍️ Về Tab Kịch Bản</button>
        </div>
      </div>
      <div id="liveLogBox" class="log-box" style="height:calc(100vh - 195px); min-height:480px; font-size:12.2px; line-height:1.55;">Đang tải log hệ thống...</div>
    </div>
  </div>
</div>

<!-- ======================================================================= -->
<!-- TAB NHỎ 4: ĐĂNG NHẬP 3 TÀI KHOẢN CHATGPT & SƠ ĐỒ 9 BÀN AGENT AI        -->
<!-- ======================================================================= -->
<div id="subtabPane_agents" class="studio-subtab-pane">
  <div id="drawerAccounts" class="top-drawer open">
    <div id="portabilityBanner" class="portability-banner" style="flex-direction:column; align-items:stretch; gap:8px; margin-bottom:0; padding:10px 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="font-size:12px; color:var(--text);">
          <b style="color:#38bdf8;">🌐 ĐĂNG NHẬP &amp; QUẢN LÝ 3 TÀI KHOẢN CHATGPT WEB (Giới hạn &le; 3 Kịch bản/Acc &amp; &le; 5 Tab/Acc):</b>
          Kho lưu: <b id="activeStorageInfo" style="color:var(--gold);">D:\ZC_TEAM\TOOL_ZC_TEAM\PROJECTS</b>
          <div id="envErrorDetails" style="font-size:11.5px; color:#fca5a5; margin-top:4px; font-weight:600; display:none;"></div>
        </div>
        <div class="env-pills">
          <span id="agyStatusPill" class="env-pill" style="font-size:11px; padding:3px 8px;">✅ 15 Key Skills: SẴN SÀNG</span>
          <span id="chatgptStatusPill" class="env-pill" style="font-size:11px; padding:3px 8px;">🔍 3 Acc ChatGPT...</span>
          <button class="btn btn-green btn-sm" onclick="openChatGPTWebLogin('acc_1')">🔑 Mở Chrome Đăng Nhập Acc #1</button>
          <button class="btn btn-dark btn-sm" onclick="setChromeVisibility(true)" style="border-color:#10b981; color:#34d399;">👁️ Hiện Chrome</button>
          <button class="btn btn-dark btn-sm" onclick="setChromeVisibility(false)" style="border-color:#38bdf8; color:#38bdf8;">👻 Ẩn Tất Cả Chrome</button>
          <button class="btn btn-dark btn-sm" onclick="syncNewMachine()">🔧 Đồng bộ Skill</button>
          <button class="btn btn-dark btn-sm" onclick="switchStudioSubTab('scripts')">✍️ Về Tab Kịch Bản</button>
        </div>
      </div>
      <div id="multiAccountsGrid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding-top:6px; border-top:1px solid var(--border);">
        <div class="slot-card" style="border-color:var(--border); background:#0d111a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <b style="color:var(--gold); font-size:12.8px;">👤 Acc #1 (Port 9222)</b>
            <span style="color:#fde68a; font-weight:700;">⚪ Bấm nút dưới để Đăng nhập</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            <button class="btn btn-green btn-sm" style="padding:5px 10px; font-size:11.5px;" onclick="openChatGPTWebLogin('acc_1')">🔑 Đăng Nhập Acc #1</button>
          </div>
        </div>
        <div class="slot-card" style="border-color:var(--border); background:#0d111a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <b style="color:var(--gold); font-size:12.8px;">👤 Acc #2 (Port 9223)</b>
            <span style="color:#94a3b8;">⚪ Tùy chọn (Chạy 6 luồng)</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            <button class="btn btn-green btn-sm" style="padding:5px 10px; font-size:11.5px;" onclick="openChatGPTWebLogin('acc_2')">🔑 Đăng Nhập Acc #2</button>
          </div>
        </div>
        <div class="slot-card" style="border-color:var(--border); background:#0d111a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <b style="color:var(--gold); font-size:12.8px;">👤 Acc #3 (Port 9224)</b>
            <span style="color:#94a3b8;">⚪ Tùy chọn (Chạy 9 luồng)</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
            <button class="btn btn-green btn-sm" style="padding:5px 10px; font-size:11.5px;" onclick="openChatGPTWebLogin('acc_3')">🔑 Đăng Nhập Acc #3</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="drawerMonitor" class="top-drawer open">
    <div class="panel" style="padding:10px 14px; margin-bottom:0;">
      <div class="section-label" style="margin-bottom:8px;">
        <span>🤖 SƠ ĐỒ 9 BÀN NHÂN VIÊN AGENT AI (<span id="deskChannelLabel">🇲🇽 MEXICO BÀ CÔ</span>) — TỪ BÀN #0 ➔ BÀN #1.5 ➔ BÀN #7 &amp; ⚡ KHE ĐA LUỒNG</span>
        <span id="navMonitorSummary" class="badge" style="color:#00ff88; border-color:rgba(0,255,136,0.4);">9 Agent</span>
      </div>
      <div id="desksContainer" class="desks-grid" style="margin-bottom:8px; gap:8px;"></div>
      <div id="threadsContainer" class="threads-bar" style="margin-bottom:0; gap:8px;"></div>
    </div>
  </div>
</div>

</div><!-- end #mainStudioWorkspace -->

<!-- Modal Xem Nội Dung File -->
<div id="fileModal" class="modal-backdrop" onclick="if(event.target===this) closeModal()">
  <div class="modal">
    <div class="modal-header">
      <b id="modalTitle" style="color:var(--gold); font-size:15px;">Xem tài liệu</b>
      <div>
        <button class="btn btn-gold btn-sm" onclick="copyModalText()">📋 Copy toàn bộ nội dung</button>
        <button class="btn btn-red btn-sm" onclick="closeModal()">✖ Đóng</button>
      </div>
    </div>
    <div id="modalBody" class="modal-body"></div>
  </div>
</div>

<!-- Modal Cập Nhật Tiêu Đề & Mã Kịch Bản (Thay thế hoàn toàn window.prompt / window.confirm bị chặn trong Electron) -->
<div id="editTitleModal" class="modal-backdrop" onclick="if(event.target===this) closeEditTitleModal()">
  <div class="modal" style="max-width:740px; height:auto; max-height:88vh;">
    <div class="modal-header">
      <b id="editTitleModalHeader" style="color:#38bdf8; font-size:15px;">🔄 Cập Nhật Tiêu Đề &amp; Mã Kịch Bản</b>
      <button class="btn btn-red btn-sm" onclick="closeEditTitleModal()">✖ Đóng</button>
    </div>
    <div class="modal-body" style="display:flex; flex-direction:column; gap:12px; font-family:inherit; white-space:normal;">
      <input type="hidden" id="editModalProjectId" value="" />
      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:#38bdf8; margin-bottom:5px;">🏷️ Mã / Tên Kịch Bản Xuất File (Tùy chọn — VD: KB01, Video_01; để trống = lấy mặc định 001, 002...):</label>
        <input type="text" id="editModalCustomName" style="width:100%; padding:8px 11px; border-radius:7px; border:1px solid #334155; background:#090d14; color:#fde68a; font-size:13px; font-weight:700; font-family:Consolas, monospace;" placeholder="VD: KB01" />
      </div>
      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:var(--gold); margin-bottom:5px;">🎯 Tiêu Đề Gốc (Source Title):</label>
        <textarea id="editModalSourceTitle" rows="3" style="width:100%; padding:8px 11px; border-radius:7px; border:1px solid #334155; background:#090d14; color:#f8fafc; font-size:13px; white-space:pre-wrap;" placeholder="Nhập tiêu đề gốc mới..."></textarea>
      </div>
      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:#34d399; margin-bottom:5px;">🏆 Tiêu Đề Chính Thức Đã Chốt (Winner Title — Để trống nếu muốn Bàn #1 tự viết lại):</label>
        <textarea id="editModalWinnerTitle" rows="2" style="width:100%; padding:8px 11px; border-radius:7px; border:1px solid #334155; background:#090d14; color:#6ee7b7; font-size:13px; white-space:pre-wrap;" placeholder="Tiêu đề chính thức dùng cho Giàn ý & SEO..."></textarea>
      </div>
      <div style="display:flex; align-items:center; gap:8px; padding:8px 11px; border-radius:7px; background:rgba(15,23,42,0.85); border:1px solid #334155;">
        <input type="checkbox" id="editModalSkipStep1" style="width:16px; height:16px; accent-color:#10b981; cursor:pointer;" />
        <label for="editModalSkipStep1" style="font-size:12.2px; font-weight:700; color:#e2e8f0; cursor:pointer;">🎯 Dùng luôn Tiêu đề này — Không viết lại ở Bàn #1 (Chạy thẳng Bàn #1.5 &amp; Bàn #2)</label>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:4px; padding-top:10px; border-top:1px solid #1e293b;">
        <button type="button" class="btn btn-red btn-sm" style="padding:7px 13px; font-size:12px; font-weight:700;" onclick="deleteProjectFromEditModal()">🗑️ Xóa Luôn Tiêu Đề Này</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-dark btn-sm" style="padding:7px 14px; font-size:12px;" onclick="closeEditTitleModal()">Hủy</button>
          <button type="button" class="btn btn-blue btn-sm" style="padding:7px 16px; font-size:12.5px; font-weight:800; background:linear-gradient(135deg,#0284c7,#2563eb); color:#fff;" onclick="saveEditProjectTitleModal()">💾 Lưu Cập Nhật Tiêu Đề</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
let CURRENT_NICHE = (new URLSearchParams(window.location.search).get('channel') || '').trim();
let _nicheSwitchSeq = 0;
window.ACTIVE_STUDIO_SUBTAB = 'scripts';
window.COMPOSER_COLLAPSED = false;
window._LAST_RAW_STUDIO_LOGS = '';

function switchStudioSubTab(tabName, opts = {}) {
  const validTabs = ['scripts', 'render', 'logs', 'agents'];
  const nextTab = validTabs.includes(tabName) ? tabName : 'scripts';
  window.ACTIVE_STUDIO_SUBTAB = nextTab;

  for (const t of validTabs) {
    const pane = document.getElementById('subtabPane_' + t);
    const btn = document.getElementById('btnSubTab_' + t);
    if (pane) pane.classList.toggle('active', t === nextTab);
    if (btn) btn.classList.toggle('active', t === nextTab);
  }

  if (nextTab === 'logs') {
    refreshFilteredLogDisplay(true);
  }

  if (opts.notifyParent !== false) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ZC_STUDIO_SUBTAB_CHANGED', subtab: nextTab }, '*');
      }
    } catch (e) {}
  }
}

function openFullBatchVideoConfigInParent() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ZC_OPEN_FULL_BATCH_RENDER_SUBTAB' }, '*');
      return;
    }
  } catch (e) {}
  showMsg('🎬 Bạn đang ở chế độ trình duyệt Web. Hãy xem bảng tiến độ Bàn #7 ngay bên dưới!');
}

async function sendAllReadyProjectsToVideoStudio() {
  const list = (window.LAST_PROJECTS_LIST || []).filter(p => p.has_script);
  if (list.length === 0) {
    showMsg('⚠️ Hiện chưa có kịch bản nào đã xuất xong file _KB.txt để đẩy sang Bàn #7!', true);
    return;
  }
  showMsg(`🚀 Đang đẩy ${list.length} kịch bản đã có file _KB.txt sang Bàn #7 để Tạo Voice & Render Video...`, false);
  let sent = 0;
  for (const p of list) {
    const r = await apiPost('/api/send_to_video_studio', {niche: CURRENT_NICHE, project_id: p.project_id});
    if (r && r.ok) sent++;
  }
  showMsg(`✅ Đã đẩy ${sent}/${list.length} kịch bản sang Bàn #7 (Tạo Voice & Render Video GPU)!`, false);
  await fetchStatus();
}

function copyLiveLogsNow() {
  const lb = document.getElementById('liveLogBox');
  const txt = lb ? lb.innerText : (window._LAST_RAW_STUDIO_LOGS || '');
  navigator.clipboard.writeText(txt || '');
  showMsg('📋 Đã copy nội dung Nhật ký Log vào Clipboard!', false);
}

function refreshFilteredLogDisplay(forceScroll = false) {
  const logBox = document.getElementById('liveLogBox');
  if (!logBox) return;
  const raw = window._LAST_RAW_STUDIO_LOGS || '';
  const allLines = raw ? raw.split(/\r?\n/).filter(Boolean) : [];
  const q = ((document.getElementById('logSearchInput') || {}).value || '').trim().toLowerCase();
  const cat = ((document.getElementById('logCategorySelect') || {}).value || 'ALL');

  const filtered = allLines.filter(line => {
    const low = line.toLowerCase();
    if (cat === 'VIDEO') {
      if (!/(bàn #7|ban #7|voice|video|mp4|wav|srt|whisper|nvenc|render|bridge)/i.test(line)) return false;
    } else if (cat === 'SCRIPT') {
      if (/(bàn #7|ban #7|nvenc)/i.test(line) && !/(bàn #[1-6]|bước [1-6]|step [1-6])/i.test(line)) return false;
    } else if (cat === 'ERROR') {
      if (!/(❌|⚠️|lỗi|error|warn|fail|timeout|refusal)/i.test(line)) return false;
    }
    if (q && !low.includes(q)) return false;
    return true;
  });

  const badge = document.getElementById('logLineCountBadge');
  if (badge) {
    badge.innerText = filtered.length === allLines.length
      ? `${allLines.length} dòng`
      : `${filtered.length}/${allLines.length} dòng`;
  }
  const topLogBadge = document.getElementById('subtabLogBadge');
  if (topLogBadge) {
    topLogBadge.innerText = allLines.length > 0 ? `${allLines.length} dòng` : 'Live';
  }

  const nextText = filtered.length > 0
    ? filtered.join('\n')
    : (allLines.length > 0
        ? '(Không có dòng log nào khớp bộ lọc hiện tại. Hãy xóa từ khóa tìm kiếm hoặc chọn "Tất cả dòng Log".)'
        : 'Chưa có lệnh nào đang chạy. Hãy chọn Key sản xuất và bấm nút chạy ở Tab 1!');

  const prevLen = logBox.innerText.length;
  logBox.innerText = nextText;
  const autoScroll = document.getElementById('logAutoScrollCb')?.checked !== false;
  if (forceScroll || (autoScroll && logBox.innerText.length !== prevLen)) {
    logBox.scrollTop = logBox.scrollHeight;
  }
}

function toggleTopDrawer(name) {
  if (name === 'Logs') switchStudioSubTab('logs');
  else if (name === 'Accounts' || name === 'Monitor') switchStudioSubTab('agents');
  else if (name === 'Render') switchStudioSubTab('render');
  else switchStudioSubTab('scripts');
}

function toggleComposerBody() {
  window.COMPOSER_COLLAPSED = !window.COMPOSER_COLLAPSED;
  const bodyEl = document.getElementById('composerBody');
  const lblEl = document.getElementById('composerToggleLabel');
  if (bodyEl) bodyEl.style.display = window.COMPOSER_COLLAPSED ? 'none' : 'block';
  if (lblEl) lblEl.innerText = window.COMPOSER_COLLAPSED ? '▶️ Mở ô nhập tiêu đề' : '🔽 Thu nhỏ ô nhập';
}

async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload || {})
  });
  return await res.json();
}

function showMsg(txt, isErr=false) {
  const el = document.getElementById('actionMsg');
  el.style.color = isErr ? '#f87171' : '#34d399';
  el.innerText = txt;
}

async function switchChannel(niche, fromParent = false) {
  const nextNiche = String(niche || 'mafia').trim();
  _nicheSwitchSeq += 1;
  const mySeq = _nicheSwitchSeq;
  CURRENT_NICHE = nextNiche;
  if (window.SELECTED_PROJECTS) window.SELECTED_PROJECTS.clear();
  window._lastClickedProjId = null;
  const sel = document.getElementById('nicheSelector');
  if (sel) sel.value = CURRENT_NICHE;
  const topSel = document.getElementById('topChannelKeySelector');
  if (topSel) topSel.value = CURRENT_NICHE;
  if (!fromParent) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ZC_CHANNEL_KEY_CHANGED', channel: CURRENT_NICHE }, '*');
      }
    } catch (e) {}
  }
  const r = await apiPost('/api/select_niche', {niche: CURRENT_NICHE});
  if (mySeq !== _nicheSwitchSeq) return;
  if (r && r.message) showMsg(r.message, false);
  await fetchStatus();
}

window.addEventListener('message', (ev) => {
  if (ev?.data?.type === 'ZC_SWITCH_CHANNEL_KEY' && ev.data.channel) {
    if (ev.data.channel !== CURRENT_NICHE) {
      switchChannel(ev.data.channel, true);
    }
  } else if (ev?.data?.type === 'ZC_SWITCH_STUDIO_SUBTAB' && ev.data.subtab) {
    switchStudioSubTab(ev.data.subtab, { notifyParent: false });
  } else if (ev?.data?.type === 'ZC_TRIGGER_ALL_READY_TO_VIDEO') {
    sendAllReadyProjectsToVideoStudio();
  }
});
try {
  if (window.parent && window.parent !== window) {
    document.body.classList.add('embedded-electron');
  }
} catch (e) {}

function updateChannelTabsUI(data) {
  const niche = data.selected_niche || CURRENT_NICHE || 'mafia';
  CURRENT_NICHE = niche;
  const sel = document.getElementById('nicheSelector');
  if (sel && sel.value !== niche) sel.value = niche;
  const topSel = document.getElementById('topChannelKeySelector');
  if (topSel && topSel.value !== niche) topSel.value = niche;

  const tabMafia = document.getElementById('tabMafia');
  const tabHomeless = document.getElementById('tabHomeless');
  const tabMexico = document.getElementById('tabMexico');
  if (niche === 'mexico') {
    if (tabMafia) tabMafia.className = 'channel-tab';
    if (tabHomeless) tabHomeless.className = 'channel-tab';
    if (tabMexico) tabMexico.className = 'channel-tab active-mexico';
    document.getElementById('deskChannelLabel').innerText = '🇲🇽 MEXICO BÀ CÔ';
    document.getElementById('projChannelBadge').innerText = '🇲🇽 MEXICO BÀ CÔ';
  } else if (niche === 'homeless') {
    if (tabMafia) tabMafia.className = 'channel-tab';
    if (tabHomeless) tabHomeless.className = 'channel-tab active-homeless';
    if (tabMexico) tabMexico.className = 'channel-tab';
    document.getElementById('deskChannelLabel').innerText = '🏚️ BÊN HOMELESS V12';
    document.getElementById('projChannelBadge').innerText = '🏚️ BÊN HOMELESS V12';
  } else if (niche === 'mafia') {
    if (tabMafia) tabMafia.className = 'channel-tab active-mafia';
    if (tabHomeless) tabHomeless.className = 'channel-tab';
    if (tabMexico) tabMexico.className = 'channel-tab';
    document.getElementById('deskChannelLabel').innerText = '🎩 BÊN MAFIA';
    document.getElementById('projChannelBadge').innerText = '🎩 BÊN MAFIA';
  } else {
    document.getElementById('deskChannelLabel').innerText = `🔑 ${niche}`;
    document.getElementById('projChannelBadge').innerText = `🔑 ${niche}`;
  }

  if (data.channel_counts) {
    const mc = data.channel_counts.mafia || {done: 0, total: 0};
    const hc = data.channel_counts.homeless || {done: 0, total: 0};
    const xxc = data.channel_counts.mexico || {done: 0, total: 0};
    const mRun = (data.worker_running && data.active_worker_niche === 'mafia') ? ' 🟢' : '';
    const hRun = (data.worker_running && data.active_worker_niche === 'homeless') ? ' 🟢' : '';
    const xRun = (data.worker_running && data.active_worker_niche === 'mexico') ? ' 🟢' : '';
    const mTxt = `${mc.done}/${mc.total}${mRun}`;
    const hTxt = `${hc.done}/${hc.total}${hRun}`;
    const xTxt = `${xxc.done}/${xxc.total}${xRun}`;
    if (document.getElementById('badgeCountMafia')) document.getElementById('badgeCountMafia').innerText = mTxt;
    if (document.getElementById('badgeCountHomeless')) document.getElementById('badgeCountHomeless').innerText = hTxt;
    if (document.getElementById('badgeCountMexico')) document.getElementById('badgeCountMexico').innerText = xTxt;
    const optM = document.getElementById('optKeyMafia');
    const optH = document.getElementById('optKeyHomeless');
    const optX = document.getElementById('optKeyMexico');
    if (optM) optM.textContent = `🎩 KEY BÊN MAFIA (${mTxt}) — 5–6 Parts, 44k–48k ký tự`;
    if (optH) optH.textContent = `🏚️ KEY BÊN HOMELESS V12 (${hTxt}) — 7 Parts, 70k–80k ký tự`;
    if (optX) optX.textContent = `🇲🇽 KEY MEXICO BÀ CÔ (${xTxt}) — 7 Parts, es-MX + Bàn 1.5 & 7`;
    const curCntObj = data.channel_counts[niche] || {done: 0, total: 0};
    const curRun = (data.worker_running && data.active_worker_niche === niche) ? ' 🟢' : '';
    const curTxt = `${curCntObj.done}/${curCntObj.total}${curRun}`;
    const activeBadge = document.getElementById('activeChannelCountBadge');
    if (activeBadge) {
      activeBadge.innerText = curTxt;
    }
  }
  if (data.projects_root && data.tong_hop_root) {
    document.getElementById('activeStorageInfo').innerText = `${data.projects_root}  |  TONG HOP: ${data.tong_hop_root}`;
  }
}

async function syncNewMachine() {
  const r = await apiPost('/api/sync_new_machine', {});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

async function openChatGPTWebLogin(accId='acc_1') {
  const lbl = accId === 'acc_2' ? 'Acc #2 (Port 9223)' : (accId === 'acc_3' ? 'Acc #3 (Port 9224)' : 'Acc #1 (Port 9222)');
  showMsg(`🌐 Đang mở cửa sổ trình duyệt Chrome riêng cho [${lbl}] (Lưu Profile Vĩnh Viễn)...`);
  const r = await apiPost('/api/open_web_login', {acc_id: accId});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

let _syncingScroll = false;
function syncTwoColScroll(srcEl, targetId) {
  if (_syncingScroll) return;
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;
  _syncingScroll = true;
  targetEl.scrollTop = srcEl.scrollTop;
  setTimeout(() => { _syncingScroll = false; }, 20);
}

const COMMON_EN_STARTERS_JS = new Set([
  'a','an','the','my','our','his','her','their','your','its','i','he','she','they','we','you','it','this','that','these','those',
  'when','after','before','while','until','till','since','because','although','though','if','unless','once','twice','why','how','what','where','who','whom','whose','which',
  'in','on','at','for','from','with','without','by','to','into','onto','upon','over','under','above','below','between','among','through','during','despite','against',
  'everyone','everybody','nobody','no','none','nothing','someone','somebody','anyone','anybody','all','both','each','every','many','most','some','few','several','other','another',
  'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand','million','billion',
  'first','second','third','last','next','only','just','even','still','never','always','almost','nearly',
  'homeless','single','rich','poor','wealthy','broke','billionaire','millionaire','trillionaire','mafia','boss','don','ceo','president','chairman','founder','owner','king','queen','prince','princess','duke','lord','lady',
  'doctor','surgeon','nurse','lawyer','judge','sheriff','cop','officer','detective','agent','general','colonel','captain','major','sergeant','soldier','veteran','marine','pilot',
  'pastor','priest','monk','nun','teacher','professor','principal','student','chef','baker','waiter','waitress','maid','cleaner','janitor','driver','mechanic','farmer','miner','builder','carpenter',
  'widow','widower','orphan','bride','groom','wife','husband','ex-wife','ex-husband','ex','mom','mother','dad','father','parents','son','daughter','child','children','kid','kids','baby','twins','triplets',
  'sister','brother','sibling','grandma','grandmother','grandpa','grandfather','aunt','uncle','cousin','niece','nephew','in-laws','mother-in-law','father-in-law','stepmom','stepdad','stepsister','stepbrother',
  'woman','women','man','men','girl','girls','boy','boys','gentleman','stranger','neighbor','neighbors','landlord','tenant','customer','client','patient','passengers','town','village','city','family','church','hospital','bank','hotel','restaurant','diner','airline','flight','school','college','court','police',
  'abandoned','forgotten','hidden','secret','old','young','little','tiny','small','big','huge','giant','pregnant','blind','deaf','mute','disabled','crippled','paralyzed','dying','sick','injured','wounded','starving','freezing','soaked','dirty','filthy','ragged','shabby',
  'mocked','laughed','humiliated','kicked','fired','evicted','rejected','abused','betrayed','cheated','divorced','dumped','bullied','ignored','underestimated','scorned','despised','hated','loved',
  'saved','rescued','helped','fed','gave','bought','built','found','discovered','inherited','moved','walked','stepped','entered','returned','came','went','left','took','brought','turned','looked','saw','heard','said','told','asked','begged','cried','smiled','whispered','shouted','screamed','stopped','froze','shocked','stunned',
  'mi','mis','tu','tus','su','sus','nuestro','nuestra','el','la','los','las','un','una','unos','unas','lo','al','del','yo','ella','ellos','ellas','nosotros','ustedes','me','te','se','nos','le','les',
  'cuando','despues','después','antes','mientras','hasta','desde','porque','aunque','como','cómo','donde','dónde','quien','quién','en','por','para','con','sin','sobre','bajo','entre','contra','durante','de',
  'hijo','hija','hijos','hijas','nuera','yerno','suegra','suegro','consuegra','madre','mama','mamá','padre','papa','papá','abuela','abuelo','nieto','nieta','hermano','hermana','esposo','esposa','marido','mujer','viuda','familia',
  'doña','dona','señora','senora','señor','senor','doctora','abogado','licenciado','notario','juez','casa','herencia','testamento','escrituras','notaria','notaría','navidad','cena','boda','cumpleaños','funeral','todos','nadie','nunca','siempre','hoy','ayer','día','dia','noche','años','anos','pesos'
]);

function splitSingleRowTwoCol(line) {
  const s = (line || '').trim();
  if (!s) return {name: '', title: ''};
  if (s.includes('\t')) {
    const idx = s.indexOf('\t');
    const left = s.slice(0, idx).trim();
    const right = s.slice(idx + 1).trim();
    if (right.length >= 10) return {name: left, title: right};
  }
  if (s.includes('|')) {
    const idx = s.indexOf('|');
    const left = s.slice(0, idx).trim();
    const right = s.slice(idx + 1).trim();
    if (right.length >= 10 && left.length <= 45) return {name: left, title: right};
  }
  const mMulti = s.match(/^(\S(?:.*?\S)?)\s{2,}(.{12,})$/);
  if (mMulti && mMulti[1].length <= 35 && mMulti[1].split(/\s+/).length <= 3) {
    const firstW = mMulti[1].split(/\s+/)[0].replace(/[^a-zA-Z\-]/g, '').toLowerCase();
    if (!COMMON_EN_STARTERS_JS.has(firstW) || /[\d_]/.test(mMulti[1])) {
      return {name: mMulti[1].trim(), title: mMulti[2].trim()};
    }
  }
  const mSingle = s.match(/^(\S{1,35})\s+(.{12,})$/);
  if (mSingle) {
    const tok1 = mSingle[1].trim();
    const rest = mSingle[2].trim();
    const cleanTok1 = tok1.replace(/^[\[\](){}:,\-]+|[\[\](){}:,\-]+$/g, '').toLowerCase();
    const isListNum = /^\d+[\.\)]$/.test(tok1);
    const isTitleNumWord = /^(\$|\d+[,\.]\d+|\d+%|\d+(st|nd|rd|th|yo|yr|yrs|am|pm)\b|\d+\-(year|yr|month|day|week|hour|minute|second|star|million|billion|dollar))/i.test(cleanTok1);
    const hasCodePattern = tok1.includes('_') || /^[a-zA-Z]+\d+[a-zA-Z0-9_-]*$/.test(tok1) || /^\d{1,4}$/.test(tok1) || /[a-z][A-Z]/.test(tok1) || /(kichban|kb|video|tap|bai|ep|part)/i.test(cleanTok1);
    if (!isListNum && !isTitleNumWord && !COMMON_EN_STARTERS_JS.has(cleanTok1) && hasCodePattern) {
      return {name: tok1, title: rest};
    }
  }
  return {name: '', title: s};
}

function handleSmartTwoColPaste(e) {
  const clip = (e.clipboardData || window.clipboardData).getData('text') || '';
  const rawLines = clip.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (rawLines.length === 0) return;
  let splitCount = 0;
  const parsed = rawLines.map(ln => {
    const r = splitSingleRowTwoCol(ln);
    if (r.name && r.title) splitCount++;
    return r;
  });
  // Nếu dữ liệu dán vào có định dạng 2 cột (TenKichBan + Tiêu đề gốc), tự động chia vào Cột 1 và Cột 2!
  if (splitCount > 0) {
    e.preventDefault();
    const filtered = parsed.filter(r => !['tiêu đề gốc','tieu de goc','source title','title'].includes(r.title.toLowerCase()));
    const nameBox = document.getElementById('customNamesInput');
    const titleBox = document.getElementById('titlesInput');
    const curNames = nameBox.value.trim() ? nameBox.value.replace(/\r?\n$/, '').split(/\r?\n/) : [];
    const curTitles = titleBox.value.trim() ? titleBox.value.replace(/\r?\n$/, '').split(/\r?\n/) : [];
    while (curNames.length < curTitles.length) curNames.push('');
    while (curTitles.length < curNames.length) curTitles.push('');
    for (const item of filtered) {
      curNames.push(item.name || '');
      curTitles.push(item.title || '');
    }
    nameBox.value = curNames.join('\n');
    titleBox.value = curTitles.join('\n');
    showMsg(`🪄 Đã tự động tách ${filtered.length} dòng thành 2 cột: [Cột 1: Tên Kịch Bản] & [Cột 2: Tiêu Đề Gốc]!`);
  }
}

function autoSplitMergedInputNow() {
  const nameBox = document.getElementById('customNamesInput');
  const titleBox = document.getElementById('titlesInput');
  const rawTitles = titleBox.value.split(/\r?\n/);
  const rawNames = nameBox.value.split(/\r?\n/);
  const outNames = [];
  const outTitles = [];
  let changed = 0;
  for (let i = 0; i < rawTitles.length; i++) {
    const ln = (rawTitles[i] || '').trim();
    if (!ln) continue;
    const existingN = (rawNames[i] || '').trim();
    const r = splitSingleRowTwoCol(ln);
    if (r.name && r.title) changed++;
    outNames.push(existingN || r.name || '');
    outTitles.push(r.title || ln);
  }
  if (outTitles.length > 0) {
    nameBox.value = outNames.join('\n');
    titleBox.value = outTitles.join('\n');
    showMsg(`🪄 Đã chuẩn hóa ${outTitles.length} dòng (${changed} dòng tách Tên kịch bản sang Cột 1; dòng để trống sẽ dùng tên mặc định)!`);
  }
}

function collectTitlesAndCustomNamesFromUI() {
  const titleEl = document.getElementById('titlesInput');
  const nameEl = document.getElementById('customNamesInput');
  const rawTitleLines = (titleEl ? titleEl.value : '').split(/\r?\n/);
  const rawNameLines = (nameEl ? nameEl.value : '').split(/\r?\n/);
  const titles = [];
  const custom_names = [];
  for (let i = 0; i < rawTitleLines.length; i++) {
    const t = (rawTitleLines[i] || '').trim();
    if (!t) continue;
    const n = (rawNameLines[i] || '').trim();
    if (!n) {
      const sp = splitSingleRowTwoCol(t);
      if (sp.name && sp.title) {
        titles.push(sp.title);
        custom_names.push(sp.name);
        continue;
      }
    }
    titles.push(t);
    custom_names.push(n);
  }
  // Phòng trường hợp người dùng dán nhầm toàn bộ Tiêu đề vào Cột 1 (customNamesInput) khi Cột 2 đang trống
  if (titles.length === 0) {
    for (let i = 0; i < rawNameLines.length; i++) {
      const ln = (rawNameLines[i] || '').trim();
      if (!ln) continue;
      const sp = splitSingleRowTwoCol(ln);
      if (sp.name && sp.title) {
        titles.push(sp.title);
        custom_names.push(sp.name);
      } else if (ln.length >= 12 && /\s/.test(ln)) {
        titles.push(ln);
        custom_names.push('');
      }
    }
  }
  return {titles, custom_names};
}

function syncTitleModeSelection(modeVal) {
  const mode = (modeVal === 'keep_original') ? 'keep_original' : 'rewrite';
  const sel = document.getElementById('titleModeSelector');
  if (sel && sel.value !== mode) sel.value = mode;
  const rRewrite = document.getElementById('radioModeRewrite');
  const rKeep = document.getElementById('radioModeKeepOriginal');
  if (rRewrite) rRewrite.checked = (mode === 'rewrite');
  if (rKeep) rKeep.checked = (mode === 'keep_original');

  const lblRewrite = document.getElementById('lblModeRewrite');
  const lblKeep = document.getElementById('lblModeKeepOriginal');
  const hintBadge = document.getElementById('titleModeHintBadge');
  const headerLbl = document.getElementById('titlesInputHeaderLabel');
  const titlesInp = document.getElementById('titlesInput');

  if (mode === 'keep_original') {
    if (lblKeep) {
      lblKeep.style.borderColor = '#10b981';
      lblKeep.style.background = 'rgba(16,185,129,0.18)';
      lblKeep.style.color = '#6ee7b7';
    }
    if (lblRewrite) {
      lblRewrite.style.borderColor = '#334155';
      lblRewrite.style.background = '#0f172a';
      lblRewrite.style.color = '#94a3b8';
    }
    if (sel) {
      sel.style.borderColor = '#10b981';
      sel.style.color = '#6ee7b7';
    }
    if (hintBadge) {
      hintBadge.style.color = '#6ee7b7';
      hintBadge.innerHTML = '🎯 Đang chọn: <b>Giữ nguyên Tiêu đề đã dán</b> (Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5 &amp; Bàn #2)';
    }
    if (headerLbl) {
      headerLbl.style.color = '#6ee7b7';
      headerLbl.innerText = '🎯 DANH SÁCH TIÊU ĐỀ SỬ DỤNG LUÔN — KHÔNG VIẾT LẠI (Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5 Canon Guard & Bàn #2 Giàn ý)';
    }
    if (titlesInp) {
      titlesInp.style.borderColor = '#10b981';
      titlesInp.placeholder = 'Dán danh sách Tiêu đề muốn SỬ DỤNG LUÔN (Không viết lại ở Bàn #1, chạy thẳng Bàn #1.5 & Bàn #2)...';
    }
  } else {
    if (lblRewrite) {
      lblRewrite.style.borderColor = 'var(--gold)';
      lblRewrite.style.background = 'rgba(245,185,66,0.18)';
      lblRewrite.style.color = '#fde68a';
    }
    if (lblKeep) {
      lblKeep.style.borderColor = '#334155';
      lblKeep.style.background = '#0f172a';
      lblKeep.style.color = '#94a3b8';
    }
    if (sel) {
      sel.style.borderColor = 'var(--gold)';
      sel.style.color = '#fde68a';
    }
    if (hintBadge) {
      hintBadge.style.color = '#fde68a';
      hintBadge.innerHTML = '📌 Đang chọn: Viết lại 5 tiêu đề mới tại Bàn #1 (&ge;97đ)';
    }
    if (headerLbl) {
      headerLbl.style.color = 'var(--gold)';
      headerLbl.innerText = '🎯 DANH SÁCH TIÊU ĐỀ GỐC TIẾNG ANH / TÂY BAN NHA MEXICO (Mỗi dòng 1 tiêu đề — Hỗ trợ dán 2 cột từ Excel)';
    }
    if (titlesInp) {
      titlesInp.style.borderColor = '';
      titlesInp.placeholder = 'Dán danh sách Tiêu đề gốc (US-English hoặc Español Mexicano es-MX) vào đây rồi bấm [🚀 Lưu & Chạy Ngay]...';
    }
  }
}

function syncEmbeddedBridgeMode(modeVal, silent = false) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ZC_SET_BRIDGE_MODE', mode: modeVal }, '*');
    }
  } catch (e) {}
  if (!silent) {
    showMsg(`🎬 Đã đặt chế độ Bàn #7: ${modeVal === 'STREAMING_VIDEO' ? 'Viết Kịch Bản Xong ➔ Tạo Voice + Làm Video MP4 Luôn!' : modeVal}`);
  }
}

async function addTitlesOnly() {
  const {titles, custom_names} = collectTitlesAndCustomNamesFromUI();
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE || 'mafia';
  CURRENT_NICHE = niche;
  const skip_title_rewrite = (document.getElementById('titleModeSelector')?.value === 'keep_original');
  if (titles.length === 0) { showMsg('⚠️ Vui lòng nhập ít nhất 1 tiêu đề vào Cột 2 (Danh sách Tiêu đề)!', true); return; }
  showMsg(`⏳ Đang lưu ${titles.length} tiêu đề & mã vào hàng đợi (${niche})...`);
  const r = await apiPost('/api/add_titles', {titles, custom_names, run_now: false, niche, skip_title_rewrite});
  showMsg(r.message, !r.ok);
  if (r.ok && Number(r.added_count) > 0) {
    document.getElementById('titlesInput').value = '';
    document.getElementById('customNamesInput').value = '';
  }
  await fetchStatus();
}

async function addAndRunWithAutoVideoNow() {
  const embMode = document.getElementById('embeddedAutoVideoMode');
  if (embMode) embMode.value = 'STREAMING_VIDEO';
  syncEmbeddedBridgeMode('STREAMING_VIDEO', true);
  await addAndRunNow(true);
}

async function addAndRunNow(isAutoVideo = false) {
  const {titles, custom_names} = collectTitlesAndCustomNamesFromUI();
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE || 'mafia';
  CURRENT_NICHE = niche;
  const max_workers = parseInt(document.getElementById('maxWorkers').value || '0');
  const thinking = document.getElementById('thinkingEffort').value || 'medium';
  const skip_title_rewrite = (document.getElementById('titleModeSelector')?.value === 'keep_original');
  // Giữ nguyên Tab Viết Kịch Bản gọn gàng, không tự bung Log đè lên danh sách
  showMsg(
    titles.length > 0
      ? `🚀 Đang lưu ${titles.length} tiêu đề & khởi chạy Pipeline 9 Bàn AI (${niche})${isAutoVideo ? ' ➔ Tự động Làm Video MP4' : ''}...`
      : `🚀 Đang khởi chạy ngay Hàng đợi kịch bản đang chờ (${niche})${isAutoVideo ? ' ➔ Tự động Làm Video MP4' : ''}...`
  );
  let r;
  if (titles.length === 0) {
    r = await apiPost('/api/run_queue', {max_workers, thinking, niche, auto_video: isAutoVideo});
  } else {
    r = await apiPost('/api/add_titles', {titles, custom_names, run_now: true, max_workers, thinking, niche, skip_title_rewrite, auto_video: isAutoVideo});
  }
  showMsg(r.message || (r.ok ? `🚀 Đã kích hoạt chạy kịch bản (${niche})!` : `❌ Không thể khởi chạy kịch bản.`), !r.ok);
  if (Number(r.added_count) > 0 && titles.length > 0) {
    document.getElementById('titlesInput').value = '';
    document.getElementById('customNamesInput').value = '';
  }
  await fetchStatus();
  const lb = document.getElementById('liveLogBox');
  if (lb) lb.scrollTop = lb.scrollHeight;
}

function downloadProjectFile(project_id, file_type) {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  window.location.href = `/api/download_file?niche=${encodeURIComponent(niche)}&project_id=${encodeURIComponent(project_id)}&type=${encodeURIComponent(file_type)}`;
}

function clearComposerInputsNow() {
  const tEl = document.getElementById('titlesInput');
  const cEl = document.getElementById('customNamesInput');
  if (tEl) tEl.value = '';
  if (cEl) cEl.value = '';
  const btnUpd = document.getElementById('btnUpdateTitlesMain');
  if (btnUpd) btnUpd.innerHTML = '🔄 Cập Nhật Tiêu Đề';
  showMsg('🧹 Đã xóa trắng 2 ô nhập Mã & Tiêu đề!', false);
}

function loadQueueTitlesToComposer() {
  const list = (window.LAST_PROJECTS_LIST || []).filter(p => !p.completed);
  const targetList = list.length > 0 ? list : (window.LAST_PROJECTS_LIST || []);
  if (!targetList || targetList.length === 0) {
    showMsg('⚠️ Hiện chưa có tiêu đề nào trong danh sách để nạp lên sửa!', true);
    return;
  }
  if (window.COMPOSER_COLLAPSED) {
    toggleComposerBody();
  }
  const namesArr = [];
  const titlesArr = [];
  for (const p of targetList) {
    const fallbackCode = String(p.project_id || '').split('_')[0] || '';
    namesArr.push(String(p.custom_name || fallbackCode).trim());
    titlesArr.push(String(p.source_title || p.winner_title || '').trim());
  }
  const cEl = document.getElementById('customNamesInput');
  const tEl = document.getElementById('titlesInput');
  if (cEl) cEl.value = namesArr.join('\n');
  if (tEl) {
    tEl.value = titlesArr.join('\n');
    tEl.focus();
  }
  const btnUpd = document.getElementById('btnUpdateTitlesMain');
  if (btnUpd) btnUpd.innerHTML = '💾 Lưu Cập Nhật Tiêu Đề';
  showMsg(`✏️ Đã nạp ${targetList.length} tiêu đề từ danh sách lên ô nhập! Hãy sửa nội dung rồi bấm [💾 Lưu Cập Nhật Tiêu Đề]!`, false);
}

function getSelectedTitlePasteMode() {
  return (document.getElementById('titleModeSelector')?.value === 'keep_original') ? 'keep_original' : 'rewrite';
}
function collectTwoColumnInputs() {
  return collectTitlesAndCustomNamesFromUI();
}
async function updateTitlesFromComposerNow() {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  const skip_title_rewrite = getSelectedTitlePasteMode() === 'keep_original';
  const rawTitles = (document.getElementById('titlesInput')?.value || '').trim();
  if (!rawTitles) {
    // Nếu chỉ tích chọn đúng 1 dự án, mở thẳng bảng sửa chi tiết cho dự án đó; nếu không thì nạp toàn bộ danh sách lên ô nhập
    if (window.SELECTED_PROJECTS && window.SELECTED_PROJECTS.size === 1) {
      const onlyPid = Array.from(window.SELECTED_PROJECTS)[0];
      openEditProjectModal(onlyPid);
      return;
    }
    loadQueueTitlesToComposer();
    return;
  }
  const { titles, custom_names } = collectTwoColumnInputs();
  if (!titles || titles.length === 0) {
    showMsg('⚠️ Không tìm thấy dòng tiêu đề hợp lệ nào để cập nhật!', true);
    return;
  }
  showMsg('🔄 Đang cập nhật danh sách Tiêu đề & Mã kịch bản...', false);
  const r = await apiPost('/api/update_titles_batch', {
    titles,
    custom_names,
    niche,
    skip_title_rewrite
  });
  showMsg(r.message || (r.ok ? '✅ Đã cập nhật tiêu đề thành công!' : (r.error || 'Lỗi cập nhật tiêu đề')), !r.ok);
  if (r && r.ok) {
    document.getElementById('titlesInput').value = '';
    document.getElementById('customNamesInput').value = '';
    const btnUpd = document.getElementById('btnUpdateTitlesMain');
    if (btnUpd) btnUpd.innerHTML = '🔄 Cập Nhật Tiêu Đề';
  }
  await fetchStatus();
}

function openEditProjectModal(project_id) {
  const list = window.LAST_PROJECTS_LIST || [];
  const p = list.find(x => x.project_id === project_id);
  if (!p) {
    showMsg(`⚠️ Không tìm thấy dữ liệu của dự án [${project_id}]`, true);
    return;
  }
  document.getElementById('editModalProjectId').value = p.project_id;
  document.getElementById('editTitleModalHeader').innerText = `🔄 Cập Nhật Tiêu Đề & Mã — [${p.project_id}]`;
  document.getElementById('editModalCustomName').value = p.custom_name || '';
  document.getElementById('editModalSourceTitle').value = p.source_title || '';
  document.getElementById('editModalWinnerTitle').value = p.winner_title || '';
  document.getElementById('editModalSkipStep1').checked = !!p.skip_title_rewrite;
  document.getElementById('editTitleModal').style.display = 'flex';
}

function closeEditTitleModal() {
  const m = document.getElementById('editTitleModal');
  if (m) m.style.display = 'none';
}

async function saveEditProjectTitleModal() {
  const project_id = document.getElementById('editModalProjectId').value;
  if (!project_id) return;
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  const custom_name = (document.getElementById('editModalCustomName').value || '').trim();
  const source_title = (document.getElementById('editModalSourceTitle').value || '').trim();
  const winner_title = (document.getElementById('editModalWinnerTitle').value || '').trim();
  const skip_title_rewrite = !!document.getElementById('editModalSkipStep1').checked;
  if (!source_title) {
    showMsg('⚠️ Tiêu đề gốc không được để trống!', true);
    return;
  }
  const r = await apiPost('/api/update_project_title', {
    project_id,
    niche,
    custom_name,
    source_title,
    winner_title,
    skip_title_rewrite
  });
  closeEditTitleModal();
  showMsg(r.message || '✅ Đã cập nhật tiêu đề!', !r.ok);
  await fetchStatus();
}

async function deleteProjectFromEditModal() {
  const project_id = document.getElementById('editModalProjectId').value;
  closeEditTitleModal();
  if (project_id) {
    await deleteProject(project_id);
  }
}

async function promptRenameProject(project_id, current_name) {
  openEditProjectModal(project_id);
}

async function runQueueNow() {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  const max_workers = parseInt(document.getElementById('maxWorkers').value || '0');
  const thinking = document.getElementById('thinkingEffort').value || 'medium';
  // Giữ nguyên Tab Viết Kịch Bản gọn gàng, không tự bung Log đè lên danh sách
  showMsg(`⏳ Đang kích hoạt chạy Hàng đợi kịch bản (${niche})...`);
  const r = await apiPost('/api/run_queue', {max_workers, thinking, niche});
  showMsg(r.message || (r.ok ? `🚀 Đã kích hoạt chạy Hàng đợi (${niche})!` : `❌ Lỗi khởi chạy Hàng đợi`), !r.ok);
  await fetchStatus();
}

async function runSingleProject(project_dir, project_id = '') {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  const thinking = document.getElementById('thinkingEffort').value || 'medium';
  // Giữ nguyên Tab Viết Kịch Bản gọn gàng, không tự bung Log đè lên danh sách
  showMsg(`⏳ Đang kích hoạt chạy dự án ${project_id || project_dir} (${niche})...`);
  const r = await apiPost('/api/run_single', {project_dir, project_id, thinking, niche});
  showMsg(r.message || (r.ok ? `🚀 Đã kích hoạt chạy dự án ${project_id || project_dir}!` : `❌ Lỗi khởi chạy dự án`), !r.ok);
  await fetchStatus();
}

async function deleteProject(project_id) {
  if (!project_id) return;
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  showMsg(`🗑️ Đang xóa kịch bản [${project_id}] & xóa Folder trên ổ cứng...`, false);
  const r = await apiPost('/api/delete_project', {project_id, niche, delete_folder: true});
  if (window.SELECTED_PROJECTS) window.SELECTED_PROJECTS.delete(project_id);
  showMsg(r.message || `🗑️ Đã xóa kịch bản [${project_id}]!`, !r.ok);
  await fetchStatus();
}

async function deleteAllProjectsInChannel() {
  const allIds = (window.LAST_PROJECTS_LIST || []).map(p => p.project_id).filter(Boolean);
  if (allIds.length === 0) {
    showMsg('ℹ️ Danh sách kịch bản hiện đang trống!', false);
    return;
  }
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  showMsg(`🗑️ Đang xóa toàn bộ ${allIds.length} tiêu đề & folder kịch bản của kênh [${niche.toUpperCase()}]...`, false);
  const r = await apiPost('/api/bulk_delete_projects', {project_ids: allIds, niche, delete_folder: true});
  if (window.SELECTED_PROJECTS) window.SELECTED_PROJECTS.clear();
  window.LAST_CHECKED_PROJECT_ID = '';
  showMsg(r.message || `🗑️ Đã xóa sạch ${allIds.length} tiêu đề!`, !r.ok);
  await fetchStatus();
}

window.SELECTED_PROJECTS = new Set();
window.LAST_CHECKED_PROJECT_ID = '';
window.CURRENT_FILTERED_PROJECT_IDS = [];

function updateBulkDeleteToolbarUI() {
  if (!window.SELECTED_PROJECTS) window.SELECTED_PROJECTS = new Set();
  // Loại bỏ những ID không còn tồn tại trong danh sách tổng
  const existingSet = new Set((window.LAST_PROJECTS_LIST || []).map(p => p.project_id));
  for (const id of Array.from(window.SELECTED_PROJECTS)) {
    if (!existingSet.has(id)) window.SELECTED_PROJECTS.delete(id);
  }
  const cnt = window.SELECTED_PROJECTS.size;
  const cntEl = document.getElementById('selectedProjCount');
  const btnEl = document.getElementById('btnBulkDeleteSelected');
  const clrEl = document.getElementById('btnClearSelection');
  const allCb = document.getElementById('selectAllProjectsCb');
  if (cntEl) cntEl.innerText = cnt;
  if (btnEl) {
    if (cnt > 0) {
      btnEl.className = 'btn btn-red btn-sm';
      btnEl.style.borderColor = '#ef4444';
      btnEl.style.color = '#fff';
    } else {
      btnEl.className = 'btn btn-dark btn-sm';
      btnEl.style.borderColor = 'rgba(239,68,68,0.5)';
      btnEl.style.color = '#fca5a5';
    }
  }
  if (clrEl) clrEl.style.display = cnt > 0 ? 'inline-flex' : 'none';
  if (allCb) {
    const fIds = window.CURRENT_FILTERED_PROJECT_IDS || [];
    allCb.checked = (fIds.length > 0 && fIds.every(id => window.SELECTED_PROJECTS.has(id)));
  }
}

function handleProjectCheckboxClick(e, projectId) {
  e.stopPropagation();
  if (!window.SELECTED_PROJECTS) window.SELECTED_PROJECTS = new Set();
  const checked = e.target.checked;
  const fIds = window.CURRENT_FILTERED_PROJECT_IDS || [];
  if (e.shiftKey && window.LAST_CHECKED_PROJECT_ID && fIds.includes(window.LAST_CHECKED_PROJECT_ID) && fIds.includes(projectId)) {
    const idx1 = fIds.indexOf(window.LAST_CHECKED_PROJECT_ID);
    const idx2 = fIds.indexOf(projectId);
    const start = Math.min(idx1, idx2);
    const end = Math.max(idx1, idx2);
    for (let i = start; i <= end; i++) {
      if (checked) window.SELECTED_PROJECTS.add(fIds[i]);
      else window.SELECTED_PROJECTS.delete(fIds[i]);
    }
  } else {
    if (checked) window.SELECTED_PROJECTS.add(projectId);
    else window.SELECTED_PROJECTS.delete(projectId);
  }
  window.LAST_CHECKED_PROJECT_ID = projectId;
  fetchStatus();
}

function toggleSelectAllProjects(checked) {
  if (!window.SELECTED_PROJECTS) window.SELECTED_PROJECTS = new Set();
  const fIds = window.CURRENT_FILTERED_PROJECT_IDS || [];
  for (const id of fIds) {
    if (checked) window.SELECTED_PROJECTS.add(id);
    else window.SELECTED_PROJECTS.delete(id);
  }
  fetchStatus();
}

function clearSelectedProjects() {
  if (window.SELECTED_PROJECTS) window.SELECTED_PROJECTS.clear();
  window.LAST_CHECKED_PROJECT_ID = '';
  fetchStatus();
}

async function bulkDeleteSelectedProjects() {
  if (!window.SELECTED_PROJECTS || window.SELECTED_PROJECTS.size === 0) {
    showMsg('⚠️ Hãy tích chọn ít nhất 1 kịch bản ở đầu dòng (hoặc bấm nút "🗑️ Xóa Tất Cả Tiêu Đề" bên cạnh)!', true);
    return;
  }
  const ids = Array.from(window.SELECTED_PROJECTS);
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  showMsg(`🗑️ Đang xóa ${ids.length} kịch bản đã chọn & xóa Folder trên ổ cứng...`, false);
  const r = await apiPost('/api/bulk_delete_projects', {project_ids: ids, niche, delete_folder: true});
  if (r && r.ok) {
    window.SELECTED_PROJECTS.clear();
    window.LAST_CHECKED_PROJECT_ID = '';
  }
  showMsg(r.message || `🗑️ Đã xóa ${ids.length} kịch bản và toàn bộ folder chứa kịch bản!`, !r.ok);
  await fetchStatus();
}

async function stopWorker() {
  const r = await apiPost('/api/stop', {});
  showMsg(r.message, false);
  fetchStatus();
}

async function clearLogs() {
  await apiPost('/api/clear_log', {});
  fetchStatus();
}

async function openProjectFolder(project_id) {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  const r = await apiPost('/api/open_folder', {project_id, niche});
  showMsg(r.message, !r.ok);
}

async function viewFile(project_id, rel_path, label) {
  const niche = document.getElementById('nicheSelector').value || CURRENT_NICHE;
  document.getElementById('modalTitle').innerText = `[${niche.toUpperCase()} — ${project_id}] — ${label}`;
  document.getElementById('modalBody').innerText = 'Đang tải nội dung file...';
  document.getElementById('fileModal').style.display = 'flex';
  const res = await fetch(`/api/read_file?niche=${encodeURIComponent(niche)}&project_id=${encodeURIComponent(project_id)}&file=${encodeURIComponent(rel_path)}`);
  const data = await res.json();
  document.getElementById('modalBody').innerText = data.content || '(File trống hoặc chưa được tạo)';
}

function closeModal() {
  document.getElementById('fileModal').style.display = 'none';
}

function copyModalText() {
  const txt = document.getElementById('modalBody').innerText;
  navigator.clipboard.writeText(txt);
  alert('Đã copy toàn bộ nội dung vào Clipboard!');
}

function renderDesks(desks) {
  const container = document.getElementById('desksContainer');
  let html = '';
  for (const d of (desks || [])) {
    const cardCls = d.is_running ? 'desk-card running' : 'desk-card';
    const runBadgeCls = d.is_running ? 'run-badge active' : 'run-badge idle';
    const runText = d.is_running
      ? `🟢 ĐANG CHẠY (${d.active_threads_count}/${d.max_threads} luồng)`
      : `⚪ KHÔNG CHẠY (Đang nghỉ)`;
    const threadCls = d.threading_type === 'MULTI_THREAD_3' ? 'thread-badge multi' : 'thread-badge single';

    html += `
      <div class="${cardCls}">
        <div class="desk-top">
          <div class="desk-icon">${d.icon}</div>
          <div class="desk-title-area">
            <b>${d.name}</b>
            <code>${d.agent_code}</code>
          </div>
        </div>
        <div style="font-size:11.2px; color:var(--muted);">${d.role_desc}</div>
        <div class="desk-badges">
          <div class="${runBadgeCls}"><span>Trạng thái:</span><span>${runText}</span></div>
          <div class="${threadCls}">${d.threading_badge}</div>
        </div>
        <div class="desk-note-box">
          <div class="note-now">📌 <b>Hiện tại đang làm:</b> ${d.doing_now_note}</div>
          <div class="note-done">📊 <b>Đã làm đến đâu:</b> ${d.progress_so_far_note}</div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderThreadSlots(slots) {
  const container = document.getElementById('threadsContainer');
  let html = '';
  for (const s of (slots || [])) {
    const isRun = s.status === 'RUNNING';
    const cls = isRun ? 'slot-card running' : 'slot-card';
    const accTag = s.account_label ? `<span class="badge" style="background:rgba(56,189,248,0.16); border-color:#38bdf8; color:#7dd3fc; padding:2px 7px; font-size:11px; margin-left:6px;">🌐 ${s.account_label}</span>` : '';
    const badge = isRun
      ? `<span style="color:#34d399;">🟢 ĐANG CHẠY — Bàn #${s.active_stage} (${s.progress_pct}%)</span>`
      : (s.enabled ? `<span style="color:#94a3b8;">⚪ KHÔNG CHẠY (Rảnh)</span>` : `<span style="color:#64748b;">🔒 ĐANG TẮT</span>`);
    html += `
      <div class="${cls}">
        <div class="slot-header">
          <span style="color:var(--gold);">⚡ KHE ĐA LUỒNG #${s.slot} ${accTag}</span>
          ${badge}
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${s.progress_pct}%;"></div></div>
        <div style="font-size:11.5px; color:#e2e8f0;">
          ${isRun ? `<b>Dự án:</b> <code>${s.project_id}</code> &nbsp;|&nbsp; <b>Thread ChatGPT:</b> <code>${s.thread_id || 'Đang tạo'}</code>` : `<b>Dự án:</b> Chưa gán`}
        </div>
        <div style="font-size:11.2px; color:var(--muted); margin-top:3px;">
          📌 <b>Note luồng #${s.slot}:</b> ${s.live_note}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderEnvCheck(env) {
  if (!env) return;
  const banner = document.getElementById('portabilityBanner');
  const agyPill = document.getElementById('agyStatusPill');
  const gptPill = document.getElementById('chatgptStatusPill');
  const errBox = document.getElementById('envErrorDetails');
  const accGrid = document.getElementById('multiAccountsGrid');

  if (env.antigravity && env.antigravity.ok) {
    agyPill.className = 'env-pill ok';
    agyPill.innerText = '✅ Bộ 15 Kênh Skill AI Đóng Gói Sẵn (Offline 100% — Không cần Antigravity): SẴN SÀNG';
  } else {
    agyPill.className = 'env-pill err';
    agyPill.innerText = '❌ Bộ Skill AI Nội Bộ: THIẾU (Bấm Đồng bộ)';
  }

  const webSt = (env.chatgpt && env.chatgpt.web_status) ? env.chatgpt.web_status : {};
  const accs = webSt.accounts || [];
  const loggedCnt = webSt.logged_in_count || 0;
  const maxTotalThreads = webSt.max_total_threads || 3;

  const navAccSum = document.getElementById('navAccSummary');
  if (navAccSum) {
    let totalActiveKb = 0;
    let totalOpenTabs = 0;
    for (const a of accs) {
      totalActiveKb += (a.active_threads || 0);
      totalOpenTabs += (a.chatgpt_tabs || 0);
    }
    navAccSum.innerText = `${loggedCnt}/3 Online · ${totalActiveKb} KB · ${totalOpenTabs} Tab`;
    navAccSum.style.color = loggedCnt > 0 ? '#34d399' : '#fca5a5';
  }

  if (env.chatgpt && env.chatgpt.ok) {
    gptPill.className = 'env-pill ok';
    gptPill.innerText = `✅ Đã kết nối ${loggedCnt}/3 Acc ChatGPT — Tối đa ${maxTotalThreads} Luồng Song Song (Chia đều 3 Luồng/Acc)`;
  } else {
    gptPill.className = 'env-pill err';
    gptPill.innerText = '⚠️ Chưa đăng nhập Acc ChatGPT nào (Bấm nút 🔑 Đăng Nhập Acc #1..#3 bên dưới)';
  }

  if (accGrid && accs.length > 0) {
    let accHtml = '';
    for (const a of accs) {
      const isLogged = Boolean(a.logged_in);
      const cardStyle = isLogged
        ? 'border-color:var(--green); background:rgba(16,185,129,0.08);'
        : 'border-color:var(--border); background:#0d111a;';
      const stBadge = isLogged
        ? `<span style="color:#34d399; font-weight:700;">🟢 ĐÃ LƯU (${a.user_email || 'Active'})</span>`
        : (a.browser_running
            ? `<span style="color:#fde68a; font-weight:700;">🟡 ĐANG MỞ — CHỜ ĐĂNG NHẬP</span>`
            : `<span style="color:#94a3b8;">⚪ CHƯA THÊM ACC</span>`);
      const activeProjsStr = (a.active_projects && a.active_projects.length > 0)
        ? a.active_projects.join(', ')
        : 'Đang rảnh (Sẵn sàng nhận việc)';
      accHtml += `
        <div class="slot-card" style="${cardStyle}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; gap:6px; flex-wrap:wrap;">
            <b style="color:var(--gold); font-size:12.8px;">👤 ${a.label} (Port ${a.port})</b>
            ${stBadge}
          </div>
          <div style="font-size:11.5px; color:#e2e8f0; margin-bottom:6px;">
            ⚡ Tải hiện tại: <b style="color:#38bdf8;">${a.active_threads || 0}/${a.max_threads || 3} kịch bản/Acc</b>
            &nbsp;|&nbsp; 🗂️ Tab mở: <b style="color:${(a.chatgpt_tabs || 0) >= (a.max_open_tabs || 5) ? '#f59e0b' : '#34d399'};">${a.chatgpt_tabs || 0}/${a.max_open_tabs || 5} tab</b>
            <div style="font-size:11px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              📌 Đang xử lý: <code>${activeProjsStr}</code>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ${isLogged ? 'btn-dark' : 'btn-green'} btn-sm" style="padding:4px 9px; font-size:11.2px;" onclick="openChatGPTWebLogin('${a.acc_id}')">
              🔑 ${isLogged ? 'Hiện / Đổi ' + a.label : 'Đăng Nhập ' + a.label}
            </button>
            ${a.browser_running ? `<button class="btn btn-dark btn-sm" style="padding:4px 9px; font-size:11.2px; border-color:#38bdf8; color:#38bdf8;" onclick="setSingleAccVisibility('${a.acc_id}', false)">👻 Ẩn ${a.label}</button>` : ''}
          </div>
        </div>
      `;
    }
    accGrid.innerHTML = accHtml;
  }

  if (!env.all_ok && env.errors && env.errors.length > 0) {
    banner.className = 'portability-banner error';
    errBox.style.display = 'block';
    errBox.innerHTML = '⚠️ PHÁT HIỆN LỖI KHI KIỂM TRA MÁY: <br>• ' + env.errors.join('<br>• ');
  } else {
    banner.className = 'portability-banner';
    errBox.style.display = 'none';
  }
}

async function setSingleAccVisibility(accId, visible) {
  const r = await apiPost('/api/web_browser_visibility', {visible, acc_id: accId});
  showMsg(r.message, !r.ok);
}

function renderStepBox(stepNum, icon, title, desc, completedSteps, activeStage) {
  const isDone = completedSteps.includes(`STEP_${stepNum}_DONE`);
  const isActive = (activeStage === stepNum);
  const cls = isDone ? 'step-box done' : (isActive ? 'step-box active' : 'step-box');
  const stIcon = isDone ? '✅ Đã xong' : (isActive ? '🟢 ĐANG CHẠY' : '⚪ Chờ');
  return `
    <div class="${cls}">
      <div class="st-name"><span>${icon} Bàn #${stepNum}: ${title}</span><span>${stIcon}</span></div>
      <div class="st-desc">${desc}</div>
    </div>
  `;
}

function renderVideoStepBox(p, exportPrefix) {
  const vst = String(p.video_bridge_status || '').toUpperCase();
  const isDone = (vst === 'DONE' || (p.completed_steps || []).includes('STEP_7_DONE') || Boolean(p.video_output_path));
  const isActive = (vst === 'RUNNING' || vst === 'QUEUED');
  const cls = isDone ? 'step-box done' : (isActive ? 'step-box active' : 'step-box');
  const stIcon = isDone ? '✅ Đã xong' : (vst === 'RUNNING' ? '🟢 ĐANG RENDER' : (vst === 'QUEUED' ? '⏳ ĐỢI GPU' : (vst === 'FAILED' ? '❌ Lỗi' : '⚪ Tự động')));
  const desc = isDone
    ? `<b>Đã xuất ${exportPrefix}_KB.mp4</b>`
    : (vst === 'RUNNING'
        ? 'Đang tạo Voice + Sub + Video GPU...'
        : (vst === 'QUEUED'
            ? 'Đã vào hàng đợi Bàn #7...'
            : 'Tự động tạo Voice &amp; Video sau Bàn #6'));
  return `
    <div class="${cls}">
      <div class="st-name"><span>🎬 Bàn #7: Voice &amp; Video</span><span>${stIcon}</span></div>
      <div class="st-desc">${desc}</div>
    </div>
  `;
}

async function sendProjectToVideoStudio(project_id) {
  showMsg(`🎬 Đang đẩy kịch bản [${project_id}] sang Bàn #7 (Video Batch Studio)...`);
  const r = await apiPost('/api/send_to_video_studio', {niche: CURRENT_NICHE, project_id});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

let ADMIN_TABLE_VISIBLE = true;
async function setChromeVisibility(visible) {
  const r = await apiPost('/api/web_browser_visibility', {visible});
  showMsg(r.message, !r.ok);
}
function toggleAdminKeyTable() {
  ADMIN_TABLE_VISIBLE = !ADMIN_TABLE_VISIBLE;
  const el = document.getElementById('adminKeyManagerBody');
  if (el) el.style.display = ADMIN_TABLE_VISIBLE ? 'block' : 'none';
}

function copyClientHwid() {
  const txt = document.getElementById('clientHwidText').innerText;
  navigator.clipboard.writeText(txt);
  showMsg('📋 Đã copy Mã Máy (HWID): ' + txt);
}

function copyKeyText(kstr) {
  navigator.clipboard.writeText(kstr);
  showMsg('📋 Đã copy Key bản quyền vào Clipboard! Bạn có thể gửi ngay cho khách.');
}

async function activateClientKey() {
  const key_str = document.getElementById('clientLicenseKeyInput').value.trim();
  if (!key_str) { alert('Vui lòng dán mã Key bản quyền (VBSKEY....) vào ô!'); return; }
  const r = await apiPost('/api/license/activate', {license_key: key_str});
  alert(r.message);
  fetchStatus();
}

async function forceCheckClientLicense() {
  const r = await apiPost('/api/license/check', {});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

async function adminCreateNewKey() {
  const customer_name = document.getElementById('newKeyCustomer').value.trim() || 'Khách hàng';
  const days = parseInt(document.getElementById('newKeyDays').value || '30');
  const hwid_lock = document.getElementById('newKeyHwid').value.trim() || 'ANY';
  const r = await apiPost('/api/admin/create_key', {customer_name, days, hwid_lock});
  showMsg(r.message, !r.ok);
  if (r.ok && r.record) {
    const box = document.getElementById('adminNewKeyResult');
    box.style.display = 'block';
    box.innerHTML = `✅ <b>Đã tạo Key mới [${r.record.key_id}] cho "${r.record.customer_name}" (Hạn: ${r.record.expires_at} | HWID: ${r.record.hwid_lock}):</b><br>` +
      `<code style="display:inline-block; margin-top:5px; padding:6px 10px; background:#05070b; border:1px solid var(--gold); color:var(--gold); border-radius:6px; word-break:break-all;">${r.record.license_key}</code> ` +
      `<button class="btn btn-gold btn-sm" style="margin-left:8px;" onclick="copyKeyText('${r.record.license_key}')">📋 Copy Key Gửi Cho Khách</button>`;
    document.getElementById('newKeyCustomer').value = '';
  }
  fetchStatus();
}

async function adminRevokeKey(key_id, action) {
  const label = (action === 'REVOKE') ? 'THU HỒI (khóa từ xa ngay lập tức)' : 'MỞ KHÓA LẠI';
  if (!confirm(`Bạn có chắc muốn ${label} Key [${key_id}]?`)) return;
  const r = await apiPost('/api/admin/revoke_key', {key_id, action});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

async function adminExtendKey(key_id, add_days) {
  if (!add_days) {
    const inp = prompt(`Nhập số ngày muốn gia hạn thêm cho Key [${key_id}] (VD: 15, 30, 90, 365):`, '30');
    if (!inp) return;
    add_days = parseInt(inp);
  }
  if (!add_days || isNaN(add_days)) return;
  const r = await apiPost('/api/admin/extend_key', {key_id, add_days});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

async function adminDeleteKey(key_id) {
  if (!confirm(`Xóa vĩnh viễn và thu hồi Key [${key_id}] khỏi hệ thống?`)) return;
  const r = await apiPost('/api/admin/delete_key', {key_id});
  showMsg(r.message, !r.ok);
  fetchStatus();
}

async function adminSyncCloudNow() {
  const r = await apiPost('/api/admin/sync_cloud', {});
  showMsg(r.message, !r.ok);
}

async function buildClientPackageZip() {
  showMsg('📦 Đang đóng gói bản Khách Hàng sạch (.ZIP) tách quyền Admin... Vui lòng chờ vài giây...');
  const r = await apiPost('/api/admin/package_client', {});
  showMsg(r.message, !r.ok);
  if (r.ok) alert('✅ ' + r.message);
}

function renderLicenseUI(lic) {
  if (!lic) return;
  const adminPanel = document.getElementById('adminLicensePanel');
  const clientGate = document.getElementById('clientActivationGate');
  const clientBar = document.getElementById('clientActiveBar');
  const workspace = document.getElementById('mainStudioWorkspace');

  if (adminPanel) adminPanel.style.display = 'none';
  if (clientBar) clientBar.style.display = 'none';

  document.getElementById('clientHwidText').innerText = lic.hwid || '';
  document.getElementById('clientGateStatusBadge').innerText = lic.status || 'LOCKED';
  document.getElementById('clientGateMsg').innerText = lic.message || '';

  if (lic.valid) {
    if (clientGate) clientGate.style.display = 'none';
    workspace.style.opacity = '1';
    workspace.style.pointerEvents = 'auto';
  } else {
    if (clientGate) clientGate.style.display = 'block';
    workspace.style.opacity = '0.28';
    workspace.style.pointerEvents = 'none';
  }
}

function renderSubTabVideoProjects(projs) {
  const list = Array.isArray(projs) ? projs : [];
  const total = list.length;
  let readyKb = 0;
  let runningVideo = 0;
  let doneVideo = 0;

  for (const p of list) {
    if (p.has_script) readyKb++;
    const vst = String(p.video_bridge_status || '').toUpperCase();
    const isV7Done = (vst === 'DONE' || (p.completed_steps || []).includes('STEP_7_DONE') || Boolean(p.video_output_path));
    if (isV7Done) doneVideo++;
    else if (vst === 'RUNNING' || vst === 'QUEUED') runningVideo++;
  }

  if (document.getElementById('renderStatTotal')) document.getElementById('renderStatTotal').innerText = total;
  if (document.getElementById('renderStatReadyKb')) document.getElementById('renderStatReadyKb').innerText = readyKb;
  if (document.getElementById('renderStatRunning')) document.getElementById('renderStatRunning').innerText = runningVideo;
  if (document.getElementById('renderStatCompleted')) document.getElementById('renderStatCompleted').innerText = doneVideo;

  const badgeEl = document.getElementById('subtabCountRender');
  if (badgeEl) {
    if (runningVideo > 0) {
      badgeEl.innerText = `🟢 ${runningVideo} đang render · ${doneVideo}/${total} MP4`;
      badgeEl.style.color = '#00ff88';
    } else if (doneVideo > 0 || readyKb > 0) {
      badgeEl.innerText = `${doneVideo}/${readyKb || total} MP4`;
      badgeEl.style.color = '#38bdf8';
    } else {
      badgeEl.innerText = 'Bàn #7';
    }
  }

  const box = document.getElementById('renderSubTabProjectsContainer');
  if (!box) return;
  if (list.length === 0) {
    box.innerHTML = `<div style="padding:24px; text-align:center; color:var(--muted); border:1px dashed #1e293b; border-radius:8px;">Chưa có kịch bản nào trong kênh này. Hãy thêm tiêu đề ở Tab <b>✍️ 1. Viết Kịch Bản</b> trước!</div>`;
    return;
  }

  let html = '';
  for (const p of list) {
    const sttNum = (p.project_id.match(/^(\d+)/) || ['','000'])[1];
    const exportPrefix = p.export_prefix || p.custom_name || sttNum;
    const displayTitle = p.winner_title || p.source_title || p.project_id;
    const sm = p.script_metrics || {};
    const chars = sm.char_count ? sm.char_count.toLocaleString() : '—';
    const vst = String(p.video_bridge_status || '').toUpperCase();
    const isV7Done = (vst === 'DONE' || (p.completed_steps || []).includes('STEP_7_DONE') || Boolean(p.video_output_path));
    const isV7Run = (vst === 'RUNNING' || vst === 'QUEUED');

    let vBadge = '';
    if (isV7Done) {
      vBadge = `<span class="proj-status-pill" style="background:rgba(16,185,129,0.18); border:1px solid #10b981; color:#6ee7b7;">✅ ĐÃ XUẤT MP4</span>`;
    } else if (vst === 'RUNNING') {
      vBadge = `<span class="proj-status-pill" style="background:rgba(56,189,248,0.18); border:1px solid #38bdf8; color:#7dd3fc;">🟢 ĐANG RENDER GPU</span>`;
    } else if (vst === 'QUEUED') {
      vBadge = `<span class="proj-status-pill" style="background:rgba(245,185,66,0.18); border:1px solid var(--gold); color:#fde68a;">⏳ ĐỢI HÀNG ĐỢI BÀN #7</span>`;
    } else if (vst === 'FAILED') {
      vBadge = `<span class="proj-status-pill" style="background:rgba(239,68,68,0.18); border:1px solid #ef4444; color:#fca5a5;">❌ LỖI RENDER</span>`;
    } else if (p.has_script) {
      vBadge = `<span class="proj-status-pill" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.4); color:#93c5fd;">📄 ĐÃ CÓ KB.TXT — SẴN SÀNG LÀM VIDEO</span>`;
    } else {
      vBadge = `<span class="proj-status-pill" style="background:#161f30; border:1px solid #334155; color:#94a3b8;">⏳ ĐANG ĐỢI VIẾT KỊCH BẢN (BÀN #${p.active_stage || 1})</span>`;
    }

    const mp4Info = p.video_output_path
      ? `<div style="font-size:11px; color:#34d399; margin-top:4px; font-family:'JetBrains Mono',monospace;">🎬 File MP4: ${p.video_output_path}</div>`
      : '';

    html += `
      <div class="project-card ${isV7Done ? 'completed' : (isV7Run ? 'running' : '')}" style="margin-bottom:7px; padding:9px 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
            <span class="proj-code-pill">#${exportPrefix}</span>
            ${vBadge}
            <span class="proj-meta-chip">📝 ${chars} ký tự</span>
            <span class="proj-title-compact" style="font-weight:700;">${displayTitle}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${p.has_script ? `<button class="btn btn-gold btn-sm" style="padding:4px 10px; font-size:11.2px; font-weight:800;" onclick="sendProjectToVideoStudio('${p.project_id}')">🎬 Tạo Voice &amp; Render Video Ngay</button>` : `<button class="btn btn-dark btn-sm" style="padding:4px 9px; font-size:11px;" onclick="runSingleProject('${(p.project_dir || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${(p.project_id || '').replace(/'/g, "\\'")}')">▶️ Viết Kịch Bản Trước</button>`}
            ${p.has_script ? `<button class="btn btn-green btn-sm" style="padding:4px 8px; font-size:11px;" onclick="downloadProjectFile('${p.project_id}', 'kb')">⬇️ KB.txt</button>` : ''}
            <button class="btn btn-dark btn-sm" style="padding:4px 8px; font-size:11px; border-color:var(--gold); color:var(--gold);" onclick="openProjectFolder('${p.project_id}')">📂 Folder</button>
          </div>
        </div>
        ${mp4Info}
      </div>
    `;
  }
  box.innerHTML = html;
}

async function fetchStatus() {
  try {
    const reqSeq = _nicheSwitchSeq;
    const res = await fetch(`/api/status?niche=${encodeURIComponent(CURRENT_NICHE)}`);
    const data = await res.json();
    if (reqSeq !== _nicheSwitchSeq) return;

    updateChannelTabsUI(data);
    renderLicenseUI(data.license_status);

    document.getElementById('serverTime').innerText = 'Cập nhật lúc: ' + data.server_time;
    const badge = document.getElementById('workerBadge');
    if (data.worker_running) {
      badge.className = 'status-pill status-running';
      badge.innerText = '🟢 ĐANG CHẠY: ' + data.active_mode;
    } else {
      badge.className = 'status-pill status-idle';
      badge.innerText = '⚪ ĐANG CHỜ LỆNH CỦA BẠN (IDLE)';
    }

    renderEnvCheck(data.env_status);
    renderDesks(data.desks);
    renderThreadSlots(data.thread_slots);

    const navMonSum = document.getElementById('navMonitorSummary');
    if (navMonSum) {
      const totalDesks = (data.desks || []).length || 9;
      const runningDesks = (data.desks || []).filter(d => d.is_running).length;
      const runningSlots = (data.thread_slots || []).filter(s => s.status === 'RUNNING').length;
      navMonSum.innerText = runningSlots > 0 ? `🟢 ${runningSlots} luồng · ${runningDesks}/${totalDesks} Bàn` : `${totalDesks} Agent Sẵn sàng`;
    }

    window._LAST_RAW_STUDIO_LOGS = data.recent_logs || '';
    refreshFilteredLogDisplay(false);

    const miniLog = document.getElementById('miniLatestLogLine');
    if (miniLog) {
      const rawLogLines = (data.recent_logs || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const lastLine = rawLogLines.length > 0 ? rawLogLines[rawLogLines.length - 1] : 'Sẵn sàng nhận lệnh — Click vào đây để mở Tab 📡 Nhật Ký Log riêng biệt';
      miniLog.innerText = '📡 ' + lastLine;
    }

    const projs = data.projects || [];
    window.LAST_PROJECTS_LIST = projs;
    document.getElementById('projCount').innerText = projs.length;
    if (document.getElementById('subtabCountScripts')) {
      document.getElementById('subtabCountScripts').innerText = projs.length;
    }
    renderSubTabVideoProjects(projs);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'ZC_STUDIO_TELEMETRY_SYNC',
          scriptsCount: projs.length,
          renderBadge: document.getElementById('subtabCountRender')?.innerText || 'Bàn #7',
          logBadge: document.getElementById('subtabLogBadge')?.innerText || 'Live',
          agentsBadge: document.getElementById('navAccSummary')?.innerText || '9 Agent',
          currentNiche: CURRENT_NICHE
        }, '*');
      }
    } catch (e) {}
    const container = document.getElementById('projectsContainer');
    const isMexico = (data.selected_niche === 'mexico');
    const isHomeless = (data.selected_niche === 'homeless');
    const chEmptyLabel = isMexico ? '🇲🇽 MEXICO BÀ CÔ' : (isHomeless ? '🏚️ BÊN HOMELESS V12' : '🎩 BÊN MAFIA');

    if (projs.length === 0) {
      window.CURRENT_FILTERED_PROJECT_IDS = [];
      updateBulkDeleteToolbarUI();
      container.innerHTML = `<div style="padding:25px; text-align:center; color:var(--muted);">Hàng đợi của kênh <b>${chEmptyLabel}</b> hiện đang trống. Hãy dán tiêu đề vào ô bên trên để bắt đầu!</div>`;
      return;
    }

    const searchQ = ((document.getElementById('projSearchInput') || {}).value || '').trim().toLowerCase();
    const filterMode = ((document.getElementById('projFilterSelect') || {}).value || 'all');
    const filteredProjs = projs.filter(p => {
      if (filterMode === 'running' && !(p.active_stage > 0 && !p.completed)) return false;
      if (filterMode === 'completed' && !p.completed) return false;
      if (filterMode === 'queued' && (p.completed || p.active_stage > 0)) return false;
      if (searchQ) {
        const hay = `${p.project_id || ''} ${p.custom_name || ''} ${p.export_prefix || ''} ${p.source_title || ''} ${p.winner_title || ''} ${p.account_label || ''}`.toLowerCase();
        if (!hay.includes(searchQ)) return false;
      }
      return true;
    });

    window.CURRENT_FILTERED_PROJECT_IDS = filteredProjs.map(p => p.project_id);
    updateBulkDeleteToolbarUI();

    if (filteredProjs.length === 0) {
      container.innerHTML = `<div style="padding:18px; text-align:center; color:var(--muted);">Không tìm thấy kịch bản nào khớp với bộ lọc hiện tại.</div>`;
      return;
    }

    let html = '';
    for (const p of filteredProjs) {
      const isExpanded = window.EXPANDED_PROJECTS && window.EXPANDED_PROJECTS.has(p.project_id);
      const isSelected = window.SELECTED_PROJECTS && window.SELECTED_PROJECTS.has(p.project_id);
      const cardCls = p.completed ? 'project-card completed' : (p.active_stage > 0 ? 'project-card running' : 'project-card');
      const selectedStyle = isSelected ? 'border-color:#ef4444; box-shadow:0 0 0 1px rgba(239,68,68,0.45); background:rgba(127,29,29,0.12);' : '';
      const sm = p.script_metrics || {};
      const chars = sm.char_count ? sm.char_count.toLocaleString() : '—';
      const words = sm.word_count ? sm.word_count.toLocaleString() : '—';
      const parts = sm.part_count || p.outline_beat_count || '—';
      const sttNum = (p.project_id.match(/^(\d+)/) || ['','000'])[1];
      const exportPrefix = p.export_prefix || p.custom_name || sttNum;
      const displayTitle = p.winner_title || p.source_title || p.project_id;
      const safeTitleAttr = (displayTitle || '').replace(/"/g, '&quot;');

      let statusPill = '';
      if (p.completed) {
        statusPill = `<span class="proj-status-pill" style="background:rgba(16,185,129,0.16); border:1px solid var(--green); color:#6ee7b7;">✅ HOÀN TẤT</span>`;
      } else if (p.active_stage > 0) {
        statusPill = `<span class="proj-status-pill" style="background:rgba(245,185,66,0.18); border:1px solid var(--gold); color:#fde68a;">⚡ BÀN #${p.active_stage} (${p.progress_pct}%)</span>`;
      } else {
        statusPill = `<span class="proj-status-pill" style="background:#161f30; border:1px solid #334155; color:#94a3b8;">⏳ CHỜ CHẠY</span>`;
      }

      const accPill = `<span class="proj-meta-chip" style="border-color:rgba(56,189,248,0.4); color:#7dd3fc;">👤 ${p.account_label || 'Acc #1'}</span>`;

      const agentReg = p.agent_chat_registry || {};
      const regEntries = Object.values(agentReg);
      const activeChat = p.active_agent_chat || {};
      let agentCompactChip = '';
      if (!p.completed && (activeChat.desk_role || p.active_agent_desk)) {
        const shortTid = (activeChat.thread_id || p.thread_id || '').slice(0, 8);
        agentCompactChip = `<span class="proj-meta-chip" style="border-color:var(--gold); color:#fde68a;" title="Agent đang chạy & Đoạn chat đã lưu để tự động quay lại">🤖 ${activeChat.desk_role || p.active_agent_desk}${shortTid ? ' · /c/' + shortTid : ''}</span>`;
      } else if (regEntries.length > 0) {
        agentCompactChip = `<span class="proj-meta-chip" style="color:#a7f3d0; border-color:rgba(16,185,129,0.35);" title="Đã lưu ${regEntries.length} đoạn chat Agent riêng biệt">🗂️ ${regEntries.length} Đoạn Chat Agent</span>`;
      }

      const scoreChip = p.final_script_score
        ? `<span class="proj-meta-chip" style="color:#6ee7b7; border-color:rgba(16,185,129,0.4);">🏆 ${p.final_script_score}/100đ</span>`
        : (p.skip_title_rewrite
            ? `<span class="proj-meta-chip" style="color:#6ee7b7; border-color:rgba(16,185,129,0.45);" title="Sử dụng luôn tiêu đề đã dán — Bỏ qua Bàn #1, chạy thẳng Bàn #1.5">🎯 Dùng luôn Title gốc (Bỏ qua Bàn #1)</span>`
            : (p.winner_title_score ? `<span class="proj-meta-chip">🔥 Title ${p.winner_title_score}đ</span>` : ''));
      const charsChip = sm.char_count
        ? `<span class="proj-meta-chip">📝 ${chars} ký tự</span>`
        : '';

      const customBadge = p.custom_name
        ? `<span class="badge badge-pass" style="margin-left:6px;">🏷️ Tên riêng: ${p.custom_name}</span>`
        : `<span class="badge" style="margin-left:6px; color:#94a3b8;">🏷️ Mã xuất: ${exportPrefix}</span>`;
      const accBadge = `<span class="badge" style="margin-left:6px; background:rgba(56,189,248,0.16); border-color:#38bdf8; color:#7dd3fc;">👤 ${p.account_label || 'Acc #1'}</span>`;

      let auditHtml = '';
      if (p.audit_history && p.audit_history.length > 0) {
        auditHtml = '<div class="audit-badges"><b style="font-size:12px; color:var(--gold); align-self:center;">⚖️ Lịch sử Chấm điểm & Sửa Bàn #4:</b>';
        for (const ah of p.audit_history) {
          const bCls = ah.score >= 97 ? 'badge badge-pass' : 'badge badge-warn';
          auditHtml += `<span class="${bCls}">Vòng #${ah.round}: <b>${ah.score}/100đ</b> (${ah.patch_count} điểm sửa | ${ah.char_count.toLocaleString()} ký tự / ${ah.word_count.toLocaleString()} từ)</span>`;
        }
        auditHtml += '</div>';
      }

      let agentRegHtml = '';
      if (regEntries.length > 0) {
        let cardsHtml = '';
        for (const ag of regEntries) {
          const isAgRun = (ag.status === 'RUNNING' || ag.status === 'STARTING_NEW_CHAT') && !p.completed;
          const isAgDone = (ag.status === 'COMPLETED' || p.completed);
          const agCls = isAgRun ? 'agent-reg-card running' : (isAgDone ? 'agent-reg-card done' : 'agent-reg-card');
          const stText = isAgRun
            ? '<span style="color:#fde68a; font-weight:700;">🟢 ĐANG CHẠY</span>'
            : (isAgDone
                ? '<span style="color:#34d399; font-weight:700;">✅ HOÀN TẤT</span>'
                : '<span style="color:#38bdf8; font-weight:700;">🔄 ĐÃ LƯU — SẴN SÀNG QUAY LẠI</span>');
          const tidStr = ag.thread_id || '';
          cardsHtml += `
            <div class="${agCls}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                <b style="color:var(--gold); font-size:11.5px;">🤖 ${ag.desk_role || 'AGENT'}</b>
                ${stText}
              </div>
              <div style="color:#f1f5f9; font-weight:600; margin-bottom:3px;">${ag.agent_label || ag.agent_id || ''}</div>
              <div style="color:var(--muted); font-size:10.8px; margin-bottom:5px;">
                Skill: <code>${ag.skill_name || '—'}</code> &nbsp;|&nbsp; <b>${ag.account_label || p.account_label || 'Acc #1'}</b>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; border-top:1px solid #1e293b; padding-top:5px;">
                <code style="font-size:10.5px; color:#7dd3fc;">${tidStr ? '/c/' + tidStr.slice(0, 18) + '...' : 'Chưa tạo thread'}</code>
                ${tidStr ? `<button class="btn btn-dark btn-sm" style="padding:2px 7px; font-size:10.5px; border-color:#38bdf8; color:#38bdf8;" onclick="event.stopPropagation(); openSavedAgentChatTab('${ag.acc_id || p.account_id || 'acc_1'}', '${tidStr}', '${p.project_id}', '${ag.desk_role || ''}')">🔗 Quay lại Chat</button>` : ''}
              </div>
            </div>
          `;
        }
        agentRegHtml = `
          <div class="agent-reg-box">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <b style="font-size:12px; color:#38bdf8;">🗂️ SỔ ĐĂNG KÝ AGENT &amp; ĐOẠN CHAT RIÊNG (Tự động lưu &amp; quay lại đúng đoạn chat khi cần — Giới hạn &le; 5 Tab/Acc, &le; 3 Kịch bản/Acc):</b>
              <span style="font-size:11px; color:var(--muted);">Đã lưu <b>${regEntries.length}</b> đoạn chat riêng cho kịch bản này</span>
            </div>
            <div class="agent-reg-grid">${cardsHtml}</div>
          </div>
        `;
      }

      const scriptTargetDesc = isMexico
        ? 'Mục tiêu 70k-80k ký tự es-MX (7 Parts)'
        : (isHomeless ? 'Mục tiêu 70k-80k ký tự (7 Parts)' : 'Mục tiêu 44k-48k ký tự, <8k từ');
      const seoTitleLabel = isMexico ? 'SEO & Trailer V1.3' : (isHomeless ? 'SEO V12' : 'SEO V1.3');
      const projChTag = isMexico ? 'MEXICO BÀ CÔ' : (isHomeless ? 'HOMELESS V12' : 'MAFIA');

      html += `
        <div class="${cardCls}" style="${selectedStyle}">
          <!-- DÒNG DANH SÁCH THU GỌN (CLICK ĐỂ MỞ / ĐÓNG CHI TIẾT) -->
          <div class="proj-list-row" onclick="toggleProjectDetail('${p.project_id}')" title="Click để xem / ẩn chi tiết kịch bản: ${safeTitleAttr}">
            <div class="proj-list-left">
              <input type="checkbox" class="proj-select-cb" ${isSelected ? 'checked' : ''} onclick="handleProjectCheckboxClick(event, '${p.project_id}')" style="width:15px; height:15px; accent-color:#ef4444; cursor:pointer; flex-shrink:0;" title="Tích chọn để xóa kịch bản & xóa luôn Folder (Giữ Shift + Click để chọn nhanh nhiều dòng)" />
              <span class="proj-chevron">${isExpanded ? '▼' : '▶'}</span>
              <span class="proj-code-pill">#${exportPrefix}</span>
              ${statusPill}
              ${accPill}
              <span class="proj-title-compact">${displayTitle}</span>
            </div>
            <div class="proj-list-right" onclick="event.stopPropagation();">
              ${agentCompactChip}
              ${charsChip}
              ${scoreChip}
              ${p.has_script ? `<button class="btn btn-green btn-sm" style="padding:3px 8px; font-size:11px;" onclick="downloadProjectFile('${p.project_id}', 'kb')" title="Tải Kịch bản sạch TTS (${exportPrefix}_KB.txt)">⬇️ KB</button>` : ''}
              ${p.has_seo ? `<button class="btn btn-blue btn-sm" style="padding:3px 8px; font-size:11px;" onclick="downloadProjectFile('${p.project_id}', 'seo')" title="Tải gói SEO (${exportPrefix}_SEO.txt)">⬇️ SEO</button>` : ''}
              ${p.has_script ? `<button class="btn btn-blue btn-sm" style="padding:3px 8px; font-size:11px; background:linear-gradient(135deg,#0284c7,#2563eb); color:#fff;" onclick="sendProjectToVideoStudio('${p.project_id}')" title="Đẩy sang Bàn #7 tạo Voice & Video">🎬 Video</button>` : ''}
              <button class="btn btn-dark btn-sm" style="padding:3px 8px; font-size:11px; border-color:#38bdf8; color:#38bdf8; font-weight:700;" onclick="openEditProjectModal('${p.project_id}')" title="Cập nhật / sửa lại Tiêu đề &amp; Mã kịch bản cho dự án này (${p.project_id})">🔄 Cập Nhật Tiêu Đề</button>
              <button class="btn btn-dark btn-sm" style="padding:3px 7px; font-size:11px; border-color:var(--gold); color:var(--gold);" onclick="openProjectFolder('${p.project_id}')" title="Mở thư mục chứa kịch bản này (${p.project_id})">📂 Folder</button>
              <button class="btn btn-red btn-sm" style="padding:3px 8px; font-size:11px; font-weight:700;" onclick="deleteProject('${p.project_id}')" title="Xóa kịch bản này &amp; xóa luôn Folder chứa kịch bản (${p.project_id})">🗑️ Xóa</button>
              ${!p.completed ? `<button class="btn btn-gold btn-sm" style="padding:3px 8px; font-size:11px;" onclick="runSingleProject('${(p.project_dir || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${(p.project_id || '').replace(/'/g, "\\'")}')">▶️ Chạy</button>` : ''}
              <button class="btn btn-dark btn-sm" style="padding:3px 8px; font-size:11px; border-color:${isExpanded ? 'var(--gold)' : 'var(--border)'}; color:${isExpanded ? 'var(--gold)' : '#cbd5e1'};" onclick="toggleProjectDetail('${p.project_id}')">
                ${isExpanded ? '🔼 Thu gọn' : '🔍 Chi tiết'}
              </button>
            </div>
          </div>

          <!-- NGĂN KÉO CHI TIẾT (CHỈ HIỂN THỊ KHI CLICK VÀO DÒNG KỊCH BẢN) -->
          <div class="proj-detail-drawer ${isExpanded ? 'open' : ''}">
            <div class="proj-header">
              <div>
                <div class="proj-id">
                  📁 DỰ ÁN [${projChTag}]: ${p.project_id} ${customBadge} ${accBadge} &nbsp;|&nbsp;
                  Tiến độ tổng: <b style="color:#34d399">${p.progress_pct}%</b> &nbsp;|&nbsp;
                  Trạng thái: <span style="color:#38bdf8">${p.current_step_status}</span> &nbsp;|&nbsp;
                  Thread hiện tại: <code>${p.thread_id || 'Chưa tạo'}</code>
                </div>
                <div class="proj-title">🎯 Tiêu đề Gốc: ${p.source_title}</div>
                ${p.skip_title_rewrite
                  ? `<div class="proj-sub" style="color:#6ee7b7; font-weight:700;">🎯 Chế độ Tiêu đề: SỬ DỤNG LUÔN TIÊU ĐỀ ĐÃ DÁN — KHÔNG VIẾT LẠI (Đã bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5 Canon Guard &amp; Bàn #2 Giàn ý)</div>`
                  : (p.winner_title ? `<div class="proj-sub" style="color:#fde68a; font-weight:600;">🏆 Tiêu đề WINNER Đã Chọn (${p.winner_title_score}/100 điểm — ${p.winner_title.length} ký tự): "${p.winner_title}"</div>` : '')}
                <div class="proj-sub" style="color:#cbd5e1;">📂 <b>Nơi lưu:</b> <code>${p.project_dir}</code> &amp; File TONG HOP / Tải về: <code style="color:#fde68a; font-weight:700;">${exportPrefix}_KB.txt</code> + <code style="color:#38bdf8; font-weight:700;">${exportPrefix}_SEO.txt</code> (Đã xóa nhãn Part cho TTS)</div>
                ${p.video_output_path ? `<div class="proj-sub" style="color:#34d399; font-weight:700;">🎬 <b>Video hoàn chỉnh (Bàn #7):</b> <code>${p.video_output_path}</code></div>` : ''}
                <div class="proj-sub" style="color:#a7f3d0;">📌 <b>Note hiện tại:</b> ${p.live_note}</div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-dark btn-sm" style="border-color:#38bdf8; color:#38bdf8; font-weight:700;" onclick="openEditProjectModal('${p.project_id}')">🔄 Cập Nhật Tiêu Đề &amp; Mã</button>
                <button class="btn btn-gold btn-sm" onclick="openProjectFolder('${p.project_id}')">📂 Mở Thư Mục Chứa Kịch Bản</button>
                ${p.has_script ? `<button class="btn btn-blue btn-sm" style="background:linear-gradient(135deg,#0284c7,#2563eb); color:#fff; font-weight:700;" onclick="sendProjectToVideoStudio('${p.project_id}')">🎬 Đẩy Sang Bàn #7 Tạo Video</button>` : ''}
                ${!p.completed ? `<button class="btn btn-green btn-sm" onclick="runSingleProject('${(p.project_dir || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${p.project_id}')">▶️ Chạy / Tiếp tục dự án này</button>` : ''}
                <button class="btn btn-red btn-sm" style="font-weight:700;" onclick="deleteProject('${p.project_id}')">🗑️ Xóa Kịch Bản &amp; Xóa Folder</button>
              </div>
            </div>

            <div class="steps-pipeline">
              ${renderStepBox(1, p.skip_title_rewrite ? '🎯' : '🔥', 'Tiêu đề', p.skip_title_rewrite ? '<b>Dùng luôn Title gốc</b> (Bỏ qua Bàn #1 ➔ Bàn #1.5)' : (p.winner_title_score ? `Điểm: <b>${p.winner_title_score}/100</b> (&le;100 chars)` : 'Viết lại & chấm &ge; 98đ'), p.completed_steps, p.active_stage)}
              ${renderStepBox(2, '📐', 'Giàn ý', p.outline_beat_count ? `Đã khóa <b>${p.outline_beat_count} Parts/Beats</b>` : 'Tạo giàn ý & khóa DNA', p.completed_steps, p.active_stage)}
              ${renderStepBox(3, '✍️', 'Kịch bản (TTS)', sm.char_count ? `<b>${chars}</b> ký tự | <b>${words}</b> từ (${parts} Parts)` : scriptTargetDesc, p.completed_steps, p.active_stage)}
              ${renderStepBox(4, '⚖️', 'Chấm & Sửa (Max 5 vòng)', p.final_script_score ? `Điểm cuối: <b>${p.final_script_score}/100</b> (${p.audit_history.length} vòng)` : 'Khóa phần đạt + Sửa tối đa 5 vòng', p.completed_steps, p.active_stage)}
              ${renderStepBox(5, '🚀', seoTitleLabel, p.has_seo ? `<b>Đã xuất ${exportPrefix}_KB.txt + ${exportPrefix}_SEO.txt</b>` : 'Tạo gói SEO & xuất TONG HOP', p.completed_steps, p.active_stage)}
              ${renderVideoStepBox(p, exportPrefix)}
            </div>

            ${agentRegHtml}
            ${auditHtml}

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">
              ${p.has_script ? `<button class="btn btn-blue btn-sm" style="background:linear-gradient(135deg,#0284c7,#2563eb); color:#fff; font-weight:700;" onclick="sendProjectToVideoStudio('${p.project_id}')">🎬 Tạo Voice &amp; Video (Bàn #7)</button>` : ''}
              ${p.has_script ? `<button class="btn btn-green btn-sm" onclick="downloadProjectFile('${p.project_id}', 'kb')">⬇️ Tải Kịch Bản (${exportPrefix}_KB.txt)</button>` : ''}
              ${p.has_seo ? `<button class="btn btn-blue btn-sm" onclick="downloadProjectFile('${p.project_id}', 'seo')">⬇️ Tải SEO (${exportPrefix}_SEO.txt)</button>` : ''}
              ${p.has_script ? `<button class="btn btn-gold btn-sm" onclick="viewFile('${p.project_id}', 'FULL_SCRIPT.txt', 'FILE KỊCH BẢN THUẦN TTS ĐÃ XÓA NHÃN PART (FULL_SCRIPT.txt / ${exportPrefix}_KB.txt)')">📄 Xem FULL_SCRIPT.txt (${chars} ký tự)</button>` : ''}
              ${p.has_seo ? `<button class="btn btn-dark btn-sm" onclick="viewFile('${p.project_id}', 'FULL_SEO.txt', 'FILE SEO HOÀN CHỈNH (FULL_SEO.txt / ${exportPrefix}_SEO.txt)')">📦 Xem FULL_SEO.txt</button>` : ''}
              ${p.has_conv ? `<button class="btn btn-green btn-sm" onclick="viewFile('${p.project_id}', 'CHATGPT_CONVERSATION.md', 'TOÀN BỘ LỊCH SỬ ĐOẠN CHAT ĐỒNG BỘ CHATGPT (TỪ BƯỚC 1 -> BƯỚC 5)')">💬 Xem Lịch Sử Đoạn Chat ChatGPT (Đủ các Turn)</button>` : ''}
              <button class="btn btn-dark btn-sm" onclick="viewFile('${p.project_id}', 'checkpoints/01_TITLE_REWRITE.md', 'Bước 1: Viết lại & Chấm điểm Tiêu đề')">🔍 Xem Bước 1 (Title)</button>
              <button class="btn btn-dark btn-sm" style="border-color:#a78bfa; color:#c4b5fd;" onclick="viewFile('${p.project_id}', 'checkpoints/01_5_CANON_GUARD_DIRECTIVE.md', 'Bàn #1.5: Chỉ thị Chống Trùng Tên / Bối Cảnh / Đạo Cụ (Canon Guard)')">🧠 Xem Bàn #1.5 (Canon Guard)</button>
              <button class="btn btn-dark btn-sm" onclick="viewFile('${p.project_id}', 'checkpoints/02_STORY_OUTLINE.md', 'Bước 2: Giàn Ý Chi Tiết')">🔍 Xem Bước 2 (Outline)</button>
              <button class="btn btn-dark btn-sm" onclick="viewFile('${p.project_id}', 'checkpoints/04_AUDIT_REPORT_r1.md', 'Bước 4: Báo cáo Chấm điểm & Patch Ledger Vòng 1')">🔍 Xem Báo cáo Chấm điểm V1</button>
              ${p.audit_history && p.audit_history.length > 1 ? `<button class="btn btn-dark btn-sm" onclick="viewFile('${p.project_id}', 'checkpoints/04_AUDIT_REPORT_r2.md', 'Bước 4: Báo cáo Chấm điểm Vòng 2')">🔍 Xem Báo cáo Chấm điểm V2</button>` : ''}
              ${p.has_script ? `<button class="btn btn-dark btn-sm" style="border-color:#10b981; color:#6ee7b7;" onclick="viewFile('${p.project_id}', '${isMexico ? 'checkpoints/07_TTS_CHECK_REPORT.md' : 'checkpoints/06_TTS_DIRECTOR_REPORT.md'}', 'Bàn #7: Báo cáo Check lại & Chuẩn hóa File TTS')">🎙️ Xem Báo cáo Check TTS (Bàn #7)</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  } catch (e) {
    console.error(e);
  }
}

window.EXPANDED_PROJECTS = new Set();

function toggleProjectDetail(projectId) {
  if (!window.EXPANDED_PROJECTS) window.EXPANDED_PROJECTS = new Set();
  if (window.EXPANDED_PROJECTS.has(projectId)) {
    window.EXPANDED_PROJECTS.delete(projectId);
  } else {
    window.EXPANDED_PROJECTS.add(projectId);
  }
  fetchStatus();
}

function expandOrCollapseAllProjects(expandAll) {
  if (!window.EXPANDED_PROJECTS) window.EXPANDED_PROJECTS = new Set();
  if (!expandAll) {
    window.EXPANDED_PROJECTS.clear();
  } else {
    for (const p of (window.LAST_PROJECTS_LIST || [])) {
      if (p && p.project_id) window.EXPANDED_PROJECTS.add(p.project_id);
    }
  }
  fetchStatus();
}

async function openSavedAgentChatTab(accId, threadId, projectId, deskRole) {
  const r = await apiPost('/api/open_agent_chat_tab', {
    acc_id: accId,
    thread_id: threadId,
    project_id: projectId,
    desk_role: deskRole,
  });
  showMsg(r.message || 'Đã mở đoạn chat Agent!', !r.ok);
}

if (window.location.search.includes('embedded=1')) {
  document.body.style.padding = '12px 16px';
}

setInterval(fetchStatus, 2000);
fetchStatus();
</script>
</body>
</html>
"""


class MafiaDashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data: dict, status: int = 200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html" or parsed.path.startswith("/?"):
            ext_html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "script_studio_dashboard.html")
            if os.path.isfile(ext_html_path):
                try:
                    with open(ext_html_path, "r", encoding="utf-8", errors="ignore") as _hf:
                        raw = _hf.read().encode("utf-8")
                except Exception:
                    raw = HTML_PAGE.encode("utf-8")
            else:
                raw = HTML_PAGE.encode("utf-8")
            try:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass
        elif parsed.path in ("/assets/zc-logo.png", "/favicon.ico"):
            asset_file = (
                os.path.join(STUDIO_ROOT, "assets", "zc-logo.png")
                if parsed.path.endswith(".png")
                else os.path.join(STUDIO_ROOT, "assets", "icon.ico")
            )
            if os.path.exists(asset_file):
                raw_bytes = open(asset_file, "rb").read()
                ctype = "image/png" if parsed.path.endswith(".png") else "image/x-icon"
                try:
                    self.send_response(200)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Cache-Control", "public, max-age=3600")
                    self.send_header("Content-Length", str(len(raw_bytes)))
                    self.end_headers()
                    self.wfile.write(raw_bytes)
                except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                    pass
            else:
                self.send_error(404)
        elif parsed.path == "/api/status":
            qs = parse_qs(parsed.query)
            niche = qs.get("niche", [SELECTED_NICHE])[0]
            self._send_json(get_full_dashboard_status(niche=niche))
        elif parsed.path == "/api/download_file":
            qs = parse_qs(parsed.query)
            niche = qs.get("niche", [SELECTED_NICHE])[0]
            cfg = get_niche_config(niche)
            pid = qs.get("project_id", [""])[0]
            ftype = qs.get("type", ["kb"])[0].lower().strip()
            pdir = os.path.join(cfg["PROJECTS_ROOT"], pid)
            prefix = resolve_project_export_prefix(pid, pdir)
            if ftype == "seo":
                src_file = os.path.join(pdir, "FULL_SEO.txt")
                dl_name = f"{prefix}_SEO.txt"
            else:
                src_file = os.path.join(pdir, "FULL_SCRIPT.txt")
                dl_name = f"{prefix}_KB.txt"
            if not os.path.exists(src_file):
                self.send_error(404, "File not found")
                return
            raw_bytes = open(src_file, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="{dl_name}"')
            self.send_header("Content-Length", str(len(raw_bytes)))
            self.end_headers()
            self.wfile.write(raw_bytes)
        elif parsed.path == "/api/read_file":
            qs = parse_qs(parsed.query)
            niche = qs.get("niche", [SELECTED_NICHE])[0]
            cfg = get_niche_config(niche)
            pid = qs.get("project_id", [""])[0]
            rel = qs.get("file", [""])[0]
            safe_rel = os.path.normpath(rel).lstrip("\\/")
            target = os.path.join(cfg["PROJECTS_ROOT"], pid, safe_rel)
            content = ""
            if os.path.exists(target) and os.path.isfile(target):
                try:
                    content = open(target, "r", encoding="utf-8", errors="replace").read()
                except Exception as e:
                    content = f"Lỗi đọc file: {e}"
            self._send_json({"ok": True, "content": content})
        elif parsed.path == "/api/is_real_python_server":
            self._send_json({
                "ok": True,
                "engine": "python_real",
                "build_number": 112,
                "studio_root": STUDIO_ROOT,
            })
        else:
            self.send_error(404)

    def do_POST(self):
        global SELECTED_NICHE
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}

        if self.path == "/api/select_niche":
            niche = _norm_niche(body.get("niche", "mafia"))
            SELECTED_NICHE = niche
            cfg = get_niche_config(niche)
            self._send_json({
                "ok": True,
                "niche": niche,
                "message": f"Đã chuyển sang chế độ giao việc & quản lý: {cfg['LABEL']} (Kho lưu: {cfg['PROJECTS_ROOT']})",
            })

        elif self.path == "/api/sync_new_machine":
            ok, msg = auto_sync_skills_and_agents_to_new_machine()
            append_studio_log(f"🔧 {msg}")
            self._send_json({"ok": ok, "message": msg})

        elif self.path == "/api/rename_project":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            pid = str(body.get("project_id", "")).strip()
            cname = str(body.get("custom_name", "")).strip()
            ok, new_prefix, msg = rename_project_custom_name(pid, cname, niche=niche)
            append_studio_log(f"🏷️ [{niche.upper()}] {msg}")
            self._send_json({"ok": ok, "export_prefix": new_prefix, "message": msg})

        elif self.path == "/api/add_titles":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            SELECTED_NICHE = niche
            cfg = get_niche_config(niche)
            raw_lines = [str(t).strip() for t in body.get("titles", []) if str(t).strip()]
            if not raw_lines and body.get("text"):
                raw_lines = [str(t).strip() for t in str(body.get("text") or "").splitlines() if str(t).strip()]
            custom_names = [str(n).strip() for n in body.get("custom_names", [])]
            run_now = bool(body.get("run_now", False))
            max_workers = int(body.get("max_workers", 3))
            thinking = body.get("thinking", "medium")
            skip_title_rewrite = bool(body.get("skip_title_rewrite", False))
            title_mode_tag = (
                " [🎯 Dùng luôn Tiêu đề đã dán — Bỏ qua Bàn #1 ➔ Chạy thẳng Bàn #1.5]"
                if skip_title_rewrite
                else " [🔥 Viết lại Tiêu đề tại Bàn #1]"
            )

            valid_entries, user_commands = split_titles_and_commands(raw_lines, custom_names=custom_names)
            if user_commands:
                append_studio_log(
                    f"💡 [{niche.upper()}] Đã tách riêng câu lệnh điều khiển tiếng Việt (không đưa nhầm vào danh sách Tiêu đề): {user_commands}"
                )

            if valid_entries:
                added = add_titles_to_backlog(
                    raw_lines,
                    niche=niche,
                    custom_names=custom_names,
                    skip_title_rewrite=skip_title_rewrite,
                )
                named_cnt = sum(1 for x in added if x.get("custom_name"))
                append_studio_log(
                    f"📥 [{niche.upper()}]{title_mode_tag} Đã thêm {len(added)} kịch bản mới ({named_cnt} đặt tên riêng, {len(added) - named_cnt} tên mặc định) vào hàng đợi {os.path.basename(cfg['BACKLOG_PATH'])}."
                )
            else:
                added = []

            cmd_note = (
                f" (Đã tự động tách câu lệnh điều khiển tiếng Việt: \"{', '.join(user_commands)}\" — không tạo nhầm thành tiêu đề)"
                if user_commands
                else ""
            )

            if run_now or (user_commands and not valid_entries):
                mode_lbl = (
                    "Tự động chia đều theo số Acc (Tối đa 3 luồng/Acc)"
                    if max_workers <= 0
                    else f"{max_workers} luồng song song (Tối đa 3 luồng/Acc)"
                )
                ok, msg = start_worker_command(
                    ["--run_queue", "--max_workers", str(max_workers), "--thinking", thinking],
                    f"Chạy Hàng đợi ({mode_lbl}, model={thinking})",
                    max_workers=max_workers,
                    niche=niche,
                )
                if ok and added:
                    for it_a in added[:max(1, max_workers if max_workers > 0 else 3)]:
                        st_p = os.path.join(it_a.get("project_dir", ""), "STATE.json")
                        if os.path.exists(st_p):
                            try:
                                st_d = json.load(open(st_p, encoding="utf-8"))
                                if st_d.get("current_step_status") in ("QUEUED", "QUEUED_SKIP_STEP_1", None):
                                    skip_s1 = bool(st_d.get("skip_title_rewrite"))
                                    st_d["current_step_status"] = "STEP_1_5_STARTING" if skip_s1 else "STEP_1_STARTING"
                                    st_d["live_note"] = "🚀 Đang khởi động luồng AI Agent & kết nối trình duyệt ChatGPT..."
                                    with open(st_p, "w", encoding="utf-8") as f_st:
                                        json.dump(st_d, f_st, ensure_ascii=False, indent=2)
                            except Exception:
                                pass
                self._send_json({
                    "ok": ok,
                    "added_count": len(added),
                    "message": (
                        f"[{niche.upper()}]{title_mode_tag} Đã thêm {len(added)} kịch bản{cmd_note}. {msg}"
                        if len(added) > 0
                        else f"[{niche.upper()}] Đang chạy các kịch bản trong Hàng đợi! {msg}"
                    ),
                })
            else:
                if not added and user_commands:
                    self._send_json({
                        "ok": False,
                        "added_count": 0,
                        "message": f"Bạn vừa nhập câu lệnh tiếng Việt (\"{', '.join(user_commands)}\") mà chưa có Tiêu đề Tiếng Anh/Tây Ban Nha nào mới. Hãy dán Tiêu đề hoặc bấm nút '▶️ Chạy tiếp Hàng đợi'!",
                    })
                else:
                    named_list = [f"{it.get('custom_name') or it.get('project_id','')[:3]}_KB.txt" for it in added[:5]]
                    sample_str = f" (File xuất: {', '.join(named_list)}{'...' if len(added) > 5 else ''})" if named_list else ""
                    self._send_json({
                        "ok": True,
                        "added_count": len(added),
                        "message": f"[{niche.upper()}]{title_mode_tag} Đã lưu {len(added)} kịch bản vào Hàng đợi{sample_str}{cmd_note}.",
                    })

        elif self.path == "/api/run_queue":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            SELECTED_NICHE = niche
            max_workers = int(body.get("max_workers", 0))
            thinking = body.get("thinking", "medium")
            mode_lbl = (
                "Tự động chia đều theo số Acc (Tối đa 3 luồng/Acc)"
                if max_workers <= 0
                else f"{max_workers} luồng song song (Tối đa 3 luồng/Acc)"
            )
            ok, msg = start_worker_command(
                ["--run_queue", "--max_workers", str(max_workers), "--thinking", thinking],
                f"Chạy Hàng đợi ({mode_lbl}, model={thinking})",
                max_workers=max_workers,
                niche=niche,
            )
            self._send_json({"ok": ok, "message": msg})

        elif self.path == "/api/run_single":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            SELECTED_NICHE = niche
            cfg = get_niche_config(niche)
            pdir = str(body.get("project_dir", "") or "").strip()
            pid = str(body.get("project_id", "") or "").strip()
            thinking = body.get("thinking", "medium")
            if (not pdir or not os.path.exists(pdir)) and pid:
                pdir = os.path.join(cfg["PROJECTS_ROOT"], pid)
            if pdir and not os.path.exists(pdir):
                try:
                    os.makedirs(pdir, exist_ok=True)
                except Exception:
                    pass
            if not pdir or not os.path.exists(pdir):
                self._send_json({"ok": False, "message": "Thư mục dự án không tồn tại."})
                return
            ok, msg = start_worker_command(
                ["--project_dir", pdir, "--thinking", thinking],
                f"Chạy Đơn Luồng Dự án {os.path.basename(pdir)} (model={thinking})",
                max_workers=1,
                niche=niche,
            )
            self._send_json({"ok": ok, "message": msg})

        elif self.path == "/api/update_project_title":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            SELECTED_NICHE = niche
            pid = str(body.get("project_id", "")).strip()
            if not pid:
                self._send_json({"ok": False, "message": "Thiếu mã dự án (project_id)."})
                return
            new_src = body.get("source_title")
            new_win = body.get("winner_title")
            new_cname = body.get("custom_name")
            skip_s1 = body.get("skip_title_rewrite")
            ok, msg, updated_st = update_project_title_and_name(
                project_id=pid,
                new_source_title=str(new_src).strip() if new_src is not None else None,
                new_winner_title=str(new_win).strip() if new_win is not None else None,
                new_custom_name=str(new_cname).strip() if new_cname is not None else None,
                niche=niche,
                skip_title_rewrite=bool(skip_s1) if skip_s1 is not None else None,
            )
            append_studio_log(f"🔄 [UPDATE-TITLE - {niche.upper()}] {msg}")
            self._send_json({"ok": ok, "message": msg, "state": updated_st})

        elif self.path == "/api/update_titles_batch":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            SELECTED_NICHE = niche
            raw_lines = [str(t).strip() for t in body.get("titles", []) if str(t).strip()]
            custom_names = [str(n).strip() for n in body.get("custom_names", [])]
            skip_title_rewrite = bool(body.get("skip_title_rewrite", False))
            if is_worker_running() and ACTIVE_WORKER_NICHE == niche:
                stop_worker_command()
            res = update_or_replace_queue_titles_batch(
                titles=raw_lines,
                custom_names=custom_names,
                niche=niche,
                skip_title_rewrite=skip_title_rewrite,
            )
            if res.get("ok"):
                append_studio_log(f"🔄 [BATCH-UPDATE-TITLES - {niche.upper()}] {res.get('message', '')}")
            self._send_json(res)

        elif self.path in ("/api/delete_project", "/api/bulk_delete_projects"):
            import stat
            import re as _re

            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            if self.path == "/api/delete_project":
                raw_ids = [body.get("project_id", "")]
            else:
                raw_ids = body.get("project_ids", []) or []

            target_ids = []
            seen_ids = set()
            for x in raw_ids:
                s = str(x or "").strip()
                if s and s not in seen_ids and "/" not in s and "\\" not in s and s not in (".", ".."):
                    seen_ids.add(s)
                    target_ids.append(s)

            if not target_ids:
                self._send_json({"ok": False, "message": "Chưa chọn kịch bản nào để xóa."})
                return

            # Nếu tiến trình Worker đang chạy trên kênh này, dừng ngay trước khi xóa để Worker không ghi đè lại STATE.json
            if is_worker_running() and (not ACTIVE_WORKER_NICHE or ACTIVE_WORKER_NICHE == niche):
                try:
                    stop_worker_command()
                    time.sleep(0.25)
                except Exception:
                    pass

            cfg = get_niche_config(niche)
            backlog_filename = os.path.basename(cfg["BACKLOG_PATH"])
            projects_dirname = os.path.basename(cfg["PROJECTS_ROOT"])

            # Quét tất cả thư mục gốc có thể chứa dự án (STUDIO_ROOT, _CODE_ROOT, D:\ZC_TEAM\TOOL_ZC_TEAM)
            candidate_roots = [STUDIO_ROOT]
            for alt_root in (_CODE_ROOT, r"D:\ZC_TEAM\TOOL_ZC_TEAM"):
                if alt_root and os.path.isdir(alt_root):
                    norm_alt = os.path.normcase(os.path.abspath(alt_root))
                    if all(norm_alt != os.path.normcase(os.path.abspath(r)) for r in candidate_roots):
                        candidate_roots.append(alt_root)

            candidate_pdirs = set()
            export_prefixes = set()

            for pid in target_ids:
                m_stt = _re.match(r"^(\d+)", pid)
                if m_stt:
                    export_prefixes.add(m_stt.group(1))
                candidate_pdirs.add(os.path.abspath(os.path.join(cfg["PROJECTS_ROOT"], pid)))
                for root_dir in candidate_roots:
                    candidate_pdirs.add(os.path.abspath(os.path.join(root_dir, "PROJECTS", projects_dirname, pid)))
                    candidate_pdirs.add(os.path.abspath(os.path.join(root_dir, projects_dirname, pid)))

            # 1. Xóa khỏi QUEUE_BACKLOG*.json trên tất cả các root liên quan & thu thập thêm project_dir/custom_name
            removed_backlog_count = 0
            candidate_bpaths = [cfg["BACKLOG_PATH"]]
            for root_dir in candidate_roots:
                for cand_b in (
                    os.path.join(root_dir, "data", "queues", backlog_filename),
                    os.path.join(root_dir, backlog_filename),
                ):
                    if all(os.path.normcase(os.path.abspath(cand_b)) != os.path.normcase(os.path.abspath(x)) for x in candidate_bpaths):
                        candidate_bpaths.append(cand_b)

            for bpath in candidate_bpaths:
                if os.path.exists(bpath):
                    try:
                        with open(bpath, "r", encoding="utf-8") as f:
                            bdata = json.load(f)
                        old_items = bdata.get("items", [])
                        new_items = []
                        for it in old_items:
                            it_pid = str(it.get("project_id", "")).strip()
                            if it_pid in seen_ids:
                                if os.path.normcase(os.path.abspath(bpath)) == os.path.normcase(os.path.abspath(cfg["BACKLOG_PATH"])):
                                    removed_backlog_count += 1
                                it_pdir = str(it.get("project_dir", "")).strip()
                                if it_pdir:
                                    candidate_pdirs.add(os.path.abspath(it_pdir))
                                cname = str(it.get("custom_name", "")).strip()
                                if cname:
                                    export_prefixes.add(cname)
                            else:
                                new_items.append(it)
                        bdata["items"] = new_items
                        with open(bpath, "w", encoding="utf-8") as f:
                            json.dump(bdata, f, ensure_ascii=False, indent=2)
                    except Exception:
                        pass

            # Thu thập thêm export_prefix từ thư mục dự án trước khi xóa
            for pdir in list(candidate_pdirs):
                if os.path.isdir(pdir):
                    try:
                        pid_base = os.path.basename(pdir)
                        ep = resolve_project_export_prefix(pid_base, pdir)
                        if ep:
                            export_prefixes.add(ep)
                    except Exception:
                        pass

            def _force_remove_readonly(func, path, exc_info):
                try:
                    os.chmod(path, stat.S_IWRITE)
                    func(path)
                except Exception:
                    pass

            # 2. Xóa vĩnh viễn toàn bộ Folder chứa kịch bản trên ổ cứng
            deleted_folders = []
            failed_folders = []
            for pdir in sorted(candidate_pdirs):
                if os.path.exists(pdir) and os.path.isdir(pdir):
                    parent_name = os.path.basename(os.path.dirname(pdir)).upper()
                    if not parent_name.startswith("PROJECTS"):
                        continue
                    try:
                        shutil.rmtree(pdir, onerror=_force_remove_readonly)
                    except Exception:
                        pass
                    if os.path.exists(pdir):
                        try:
                            subprocess.run(
                                ["cmd", "/c", "rmdir", "/s", "/q", pdir],
                                capture_output=True,
                                timeout=6,
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
                            )
                        except Exception:
                            pass
                    if not os.path.exists(pdir):
                        deleted_folders.append(pdir)
                    else:
                        failed_folders.append(pdir)

            # 3. Xóa luôn các file xuất của kịch bản trong thư mục TONG HOP (_KB.txt, _SEO.txt, .wav, .srt, .mp4)
            deleted_tong_hop_files = 0
            candidate_th_dirs = {os.path.abspath(cfg["TONG_HOP_ROOT"])}
            for root_dir in candidate_roots:
                candidate_th_dirs.add(os.path.abspath(os.path.join(root_dir, "PROJECTS", projects_dirname, "TONG HOP")))
                candidate_th_dirs.add(os.path.abspath(os.path.join(root_dir, projects_dirname, "TONG HOP")))
            for th_dir in candidate_th_dirs:
                if os.path.isdir(th_dir):
                    for pref in export_prefixes:
                        if not pref:
                            continue
                        for suffix in ("_KB.txt", "_SEO.txt", "_KB.wav", "_KB.srt", "_KB.mp4"):
                            fpath = os.path.join(th_dir, f"{pref}{suffix}")
                            if os.path.isfile(fpath):
                                try:
                                    os.chmod(fpath, stat.S_IWRITE)
                                    os.remove(fpath)
                                    deleted_tong_hop_files += 1
                                except Exception:
                                    pass

            # 4. Đóng các tab Chrome của dự án đã xóa (chạy ngầm để không làm chậm phản hồi UI)
            def _bg_close_tabs(pids_to_close):
                try:
                    from engine.chatgpt_web_client import close_all_tabs_for_project
                    for _pid in pids_to_close:
                        try:
                            close_all_tabs_for_project(_pid)
                        except Exception:
                            pass
                except Exception:
                    pass

            threading.Thread(target=_bg_close_tabs, args=(list(target_ids),), daemon=True).start()

            update_progress_markdown(niche=niche)
            summary_ids = ", ".join(target_ids[:5]) + (f" (+{len(target_ids) - 5} kịch bản khác)" if len(target_ids) > 5 else "")
            msg = (
                f"🗑️ [{niche.upper()}] Đã xóa vĩnh viễn {len(target_ids)} kịch bản ({summary_ids}) "
                f"& xóa {len(deleted_folders)} Folder kịch bản trên ổ cứng"
                + (f" (+{deleted_tong_hop_files} file TONG HOP)." if deleted_tong_hop_files else ".")
            )
            append_studio_log(msg)
            self._send_json({
                "ok": len(failed_folders) == 0,
                "deleted_count": len(target_ids),
                "deleted_folders_count": len(deleted_folders),
                "deleted_tong_hop_files": deleted_tong_hop_files,
                "failed_folders": failed_folders,
                "message": msg,
            })

        elif self.path == "/api/stop":
            msg = stop_worker_command()
            self._send_json({"ok": True, "message": msg})

        elif self.path == "/api/open_web_login":
            from engine.chatgpt_web_client import ensure_chrome_debug_browser_open
            acc_id = str(body.get("acc_id", "acc_1")).strip() or "acc_1"
            st = ensure_chrome_debug_browser_open(
                open_chatgpt_home=True,
                force_bring_to_front=True,
                run_hidden=False,
                acc_id=acc_id,
            )
            append_studio_log(f"🌐 [WEB-LOGIN - {acc_id.upper()}] {st.get('message', '')}")
            self._send_json({"ok": True, "message": st.get("message", "Đã mở trình duyệt ChatGPT Web!"), "web_status": st})

        elif self.path == "/api/web_browser_visibility":
            from engine.chatgpt_web_client import set_chrome_window_visibility
            vis = bool(body.get("visible", False))
            acc_id = body.get("acc_id")
            res = set_chrome_window_visibility(visible=vis, acc_id=acc_id)
            append_studio_log(f"🌐 [WEB-VISIBILITY] {res.get('message', '')}")
            self._send_json(res)

        elif self.path == "/api/open_agent_chat_tab":
            from engine.chatgpt_web_client import (
                ensure_chrome_debug_browser_open,
                set_chrome_window_visibility,
                get_account_config,
                _cdp_list_targets,
                _cdp_open_new_tab,
                _cdp_eval_js,
                MAX_OPEN_TABS_PER_ACCOUNT,
            )
            acc_id = str(body.get("acc_id", "acc_1")).strip() or "acc_1"
            thread_id = str(body.get("thread_id", "")).strip()
            pid = str(body.get("project_id", "")).strip()
            desk_role = str(body.get("desk_role", "")).strip()
            if not thread_id:
                self._send_json({"ok": False, "message": "Agent này chưa có mã đoạn chat (thread_id)."})
                return
            cfg_acc = get_account_config(acc_id)
            port = cfg_acc["port"]
            ensure_chrome_debug_browser_open(open_chatgpt_home=False, force_bring_to_front=True, run_hidden=False, acc_id=acc_id)
            set_chrome_window_visibility(visible=True, acc_id=acc_id)
            chat_url = f"https://chatgpt.com/c/{thread_id}"
            pages = [
                t for t in _cdp_list_targets(port=port)
                if t.get("type") == "page" and "chatgpt.com" in (t.get("url") or "")
            ]
            matched = next((t for t in pages if f"/c/{thread_id}" in (t.get("url") or "")), None)
            if matched and matched.get("webSocketDebuggerUrl"):
                _cdp_eval_js(matched["webSocketDebuggerUrl"], "window.focus(); true;", timeout=5.0)
            elif len(pages) >= MAX_OPEN_TABS_PER_ACCOUNT and pages[-1].get("webSocketDebuggerUrl"):
                _cdp_eval_js(pages[-1]["webSocketDebuggerUrl"], f"window.location.href = {json.dumps(chat_url)}; true;", timeout=8.0)
            else:
                _cdp_open_new_tab(chat_url, port=port)
            msg = f"🔄 Đã quay lại đoạn chat Agent [{desk_role or 'ChatGPT'}] (/c/{thread_id[:12]}...) của kịch bản [{pid}] trên {cfg_acc['label']} (Giới hạn <= {MAX_OPEN_TABS_PER_ACCOUNT} Tab/Acc)!"
            append_studio_log(msg)
            self._send_json({"ok": True, "message": msg, "chat_url": chat_url})

        elif self.path == "/api/clear_log":
            with open(LIVE_LOG_PATH, "w", encoding="utf-8") as f:
                f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [WEB-CONTROL] Đã làm sạch màn hình log.\n")
            self._send_json({"ok": True})

        elif self.path == "/api/license/activate":
            key_str = str(body.get("license_key", "")).strip()
            ok, msg, st = activate_client_license_key(key_str)
            append_studio_log(f"🔑 [LICENSE-ACTIVATE] {msg}")
            self._send_json({"ok": ok, "message": msg, "license_status": st})

        elif self.path == "/api/license/check":
            st = verify_current_machine_license(force_cloud_check=True)
            self._send_json({"ok": st.get("valid", False), "message": st.get("message", ""), "license_status": st})

        elif self.path == "/api/admin/create_key":
            customer_name = str(body.get("customer_name", "Khách hàng")).strip()
            days = int(body.get("days", 30))
            hwid_lock = str(body.get("hwid_lock", "ANY")).strip() or "ANY"
            rec = admin_create_key(customer_name=customer_name, days=days, hwid_lock=hwid_lock)
            msg = f"Đã cấp Key [{rec['key_id']}] cho \"{rec['customer_name']}\" (Hạn: {rec['expires_at']} | HWID: {rec['hwid_lock']})"
            append_studio_log(f"👑 [ADMIN-KEY] {msg}")
            self._send_json({"ok": True, "message": msg, "record": rec})

        elif self.path == "/api/admin/revoke_key":
            kid = str(body.get("key_id", "")).strip()
            action = str(body.get("action", "REVOKE")).strip()
            ok, msg, rec = admin_revoke_or_restore_key(kid, action=action)
            append_studio_log(f"👑 [ADMIN-KEY] {msg}")
            self._send_json({"ok": ok, "message": msg, "record": rec})

        elif self.path == "/api/admin/extend_key":
            kid = str(body.get("key_id", "")).strip()
            add_days = int(body.get("add_days", 30))
            ok, msg, rec = admin_extend_key(kid, add_days=add_days)
            append_studio_log(f"👑 [ADMIN-KEY] {msg}")
            self._send_json({"ok": ok, "message": msg, "record": rec})

        elif self.path == "/api/admin/delete_key":
            kid = str(body.get("key_id", "")).strip()
            ok, msg = admin_delete_key(kid)
            append_studio_log(f"👑 [ADMIN-KEY] {msg}")
            self._send_json({"ok": ok, "message": msg})

        elif self.path == "/api/admin/sync_cloud":
            ok, msg = publish_admin_registry_to_cloud()
            append_studio_log(f"☁️ [ADMIN-CLOUD] {msg}")
            self._send_json({"ok": ok, "message": msg})

        elif self.path == "/api/admin/package_client":
            ok, msg, zpath = build_client_distribution_package()
            append_studio_log(f"📦 [ADMIN-PACKAGE] {msg}")
            self._send_json({"ok": ok, "message": msg, "zip_path": zpath})

        elif self.path == "/api/send_to_video_studio":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            cfg = get_niche_config(niche)
            pid = str(body.get("project_id", "")).strip()
            pdir = os.path.join(cfg["PROJECTS_ROOT"], pid)
            kb_path, seo_path = export_to_tong_hop_folder(pid, pdir, niche=niche)
            if not kb_path or not os.path.exists(kb_path):
                self._send_json({"ok": False, "message": f"Dự án [{pid}] chưa có file FULL_SCRIPT.txt để chuyển sang tạo Video."})
                return
            from engine.mafia_chatgpt_pipeline import notify_video_batch_studio_script_completed
            res = notify_video_batch_studio_script_completed(
                project_id=pid,
                project_dir=pdir,
                niche=niche,
                script_path=kb_path,
                seo_path=seo_path,
                force_immediate=True,
            )
            if res.get("enqueued"):
                msg = f"🎬 Đã chuyển kịch bản [{os.path.basename(kb_path)}] sang Bàn #7 (Video Batch Studio) để Tạo Voice & Render Video GPU!"
                append_studio_log(msg)
                self._send_json({"ok": True, "message": msg, "bridge": res})
            else:
                self._send_json({"ok": False, "message": f"Không thể kết nối Bàn #7 (Video Batch Studio cổng 3999): {res.get('error') or res.get('reason') or 'Hãy mở Video Batch Studio'}"})

        elif self.path == "/api/open_folder":
            niche = _norm_niche(body.get("niche", SELECTED_NICHE))
            cfg = get_niche_config(niche)
            pid = body.get("project_id", "")
            if pid == "TONG_HOP":
                target_dir = cfg["TONG_HOP_ROOT"]
            elif pid == "DIST_PACKAGE":
                target_dir = os.path.join(STUDIO_ROOT, "DIST_PACKAGE")
            elif pid:
                target_dir = os.path.join(cfg["PROJECTS_ROOT"], pid)
            else:
                target_dir = cfg["PROJECTS_ROOT"]
            target_dir = os.path.normpath(target_dir)
            os.makedirs(target_dir, exist_ok=True)
            if os.path.exists(target_dir):
                opened_ok = False
                # Ưu tiên nhờ cầu nối Video Batch Studio (Port 3999 chạy trên WinSta0\Default) mở trực tiếp cửa sổ Explorer lên trên cùng màn hình
                try:
                    import urllib.request
                    req_bridge = urllib.request.Request(
                        "http://127.0.0.1:3999/api/bridge/open-path",
                        data=json.dumps({"path": target_dir}).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(req_bridge, timeout=6.0) as resp:
                        if resp.status == 200:
                            opened_ok = True
                except Exception:
                    opened_ok = False

                if not opened_ok:
                    try:
                        subprocess.Popen(["explorer.exe", target_dir])
                        opened_ok = True
                    except Exception:
                        try:
                            os.startfile(target_dir)
                            opened_ok = True
                        except Exception as e:
                            self._send_json({"ok": False, "message": f"Không thể mở thư mục: {e}"})
                            return

                self._send_json({"ok": True, "message": f"📂 Đã mở thư mục: {target_dir}"})
            else:
                self._send_json({"ok": False, "message": f"Thư mục chưa tồn tại: {target_dir}"})
        elif self.path == "/api/is_real_python_server":
            self._send_json({
                "ok": True,
                "engine": "python_real",
                "build_number": 112,
                "studio_root": STUDIO_ROOT,
            })
        else:
            self.send_error(404)


def _tong_hop_auto_sync_loop():
    """Tự động đồng bộ liên tục mọi file FULL_SCRIPT.txt -> {STT}_KB.txt và FULL_SEO.txt -> {STT}_SEO.txt vào TONG HOP của các kênh và chỉ dọn Tab thừa khi không có tiến trình Worker đang khởi tạo tab."""
    while True:
        try:
            get_full_dashboard_status(niche=SELECTED_NICHE, update_selected=False)
            if not is_worker_running():
                from engine.chatgpt_web_client import sweep_completed_and_idle_tabs_across_all_accounts
                res_sweep = sweep_completed_and_idle_tabs_across_all_accounts()
                if res_sweep.get("closed_count", 0) > 0:
                    append_studio_log(
                        f"🧹 [AUTO-CLOSE TAB] Đã tự động đóng {res_sweep['closed_count']} Tab trình duyệt của kịch bản đã viết xong để giải phóng RAM ({', '.join(res_sweep.get('details', []))})!"
                    )
        except Exception:
            pass
        time.sleep(5.0)


if __name__ == "__main__":
    for idx, arg in enumerate(sys.argv):
        if arg == "--port" and idx + 1 < len(sys.argv):
            try:
                PORT = int(sys.argv[idx + 1])
            except Exception:
                pass
    print(f"==================================================================")
    print(f"PHIÊN BẢN 2 — CHATGPT WEB MULTI-ACCOUNT & MULTI-TAB STUDIO: http://127.0.0.1:{PORT}")
    print(f"==================================================================")
    server = None
    for attempt in range(6):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", PORT), MafiaDashboardHandler)
            break
        except OSError:
            try:
                import urllib.request
                req_sd = urllib.request.Request(
                    f"http://127.0.0.1:{PORT}/api/shutdown_node_fallback",
                    data=b"{}",
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urllib.request.urlopen(req_sd, timeout=0.6).read()
            except Exception:
                pass
            time.sleep(0.3)
    if server is None:
        print(f"✅ Server Mafia & Homeless Studio (Cổng {PORT}) đã đang hoạt động sẵn sàng!")
        print(f"👉 Giao diện đang mở tại: http://127.0.0.1:{PORT} (hoặc trong Tab Bàn #6 của Video Batch Studio).")
        sys.exit(0)
    def _init_browser_bg():
        try:
            from engine.chatgpt_web_client import ensure_all_initialized_browsers_open
            ensure_all_initialized_browsers_open(run_hidden=True)
        except Exception as e:
            print(f"Lưu ý khởi tạo trình duyệt Web: {e}")
    threading.Thread(target=_init_browser_bg, daemon=True).start()
    threading.Thread(target=_tong_hop_auto_sync_loop, daemon=True).start()
    server.serve_forever()

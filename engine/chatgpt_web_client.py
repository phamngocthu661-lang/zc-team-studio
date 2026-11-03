import os
import sys
import re
import json
import time
import subprocess
import threading
import urllib.request
from datetime import datetime
try:
    import websocket
except Exception:
    websocket = None

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


STUDIO_WEB_ROOT = _resolve_unified_studio_root(_CODE_ROOT)
if STUDIO_WEB_ROOT not in sys.path:
    sys.path.insert(0, STUDIO_WEB_ROOT)

BROWSER_PROFILE_DIR = os.path.join(STUDIO_WEB_ROOT, "BROWSER_PROFILE")
CDP_PORT = 9222
CDP_HOST = f"http://127.0.0.1:{CDP_PORT}"

MAX_THREADS_PER_ACCOUNT = 3
MAX_OPEN_TABS_PER_ACCOUNT = 5

# Cấu hình 3 Tài Khoản ChatGPT Web Độc Lập (Mỗi Acc 1 Profile Chrome riêng + 1 Cổng CDP riêng + Tối đa 3 Kịch bản/Acc & Tối đa 5 Tab/Acc)
WEB_ACCOUNTS_CONFIG = [
    {
        "acc_id": "acc_1",
        "index": 1,
        "label": "Acc #1",
        "port": 9222,
        "profile_dir": os.path.join(STUDIO_WEB_ROOT, "BROWSER_PROFILE"),
        "bat_name": "MO_CUA_SO_DANG_NHAP_CHATGPT_WEB_ACC1.bat",
        "task_name": "StudioWebChromeAcc1",
        "max_threads": MAX_THREADS_PER_ACCOUNT,
        "max_open_tabs": MAX_OPEN_TABS_PER_ACCOUNT,
    },
    {
        "acc_id": "acc_2",
        "index": 2,
        "label": "Acc #2",
        "port": 9223,
        "profile_dir": os.path.join(STUDIO_WEB_ROOT, "BROWSER_PROFILE_2"),
        "bat_name": "MO_CUA_SO_DANG_NHAP_CHATGPT_WEB_ACC2.bat",
        "task_name": "StudioWebChromeAcc2",
        "max_threads": MAX_THREADS_PER_ACCOUNT,
        "max_open_tabs": MAX_OPEN_TABS_PER_ACCOUNT,
    },
    {
        "acc_id": "acc_3",
        "index": 3,
        "label": "Acc #3",
        "port": 9224,
        "profile_dir": os.path.join(STUDIO_WEB_ROOT, "BROWSER_PROFILE_3"),
        "bat_name": "MO_CUA_SO_DANG_NHAP_CHATGPT_WEB_ACC3.bat",
        "task_name": "StudioWebChromeAcc3",
        "max_threads": MAX_THREADS_PER_ACCOUNT,
        "max_open_tabs": MAX_OPEN_TABS_PER_ACCOUNT,
    },
]

WEB_ACCOUNTS_BY_ID = {cfg["acc_id"]: cfg for cfg in WEB_ACCOUNTS_CONFIG}
WEB_ACCOUNTS_BY_PORT = {cfg["port"]: cfg for cfg in WEB_ACCOUNTS_CONFIG}

WEB_TAB_LOCK = threading.Lock()
ACCOUNT_LOAD_LOCK = threading.Lock()
CDP_PORT_LOCKS = {
    9222: threading.Lock(),
    9223: threading.Lock(),
    9224: threading.Lock(),
}

# Bộ nhớ đệm trạng thái 3 tài khoản (TTL 3.5s) để Dashboard tải nhanh tức thì
_STATUS_CACHE_LOCK = threading.Lock()
_STATUS_CACHE_TS = 0.0
_STATUS_CACHE_DATA = None
_LAST_VERIFIED_LOGIN_BY_PORT = {}

# Trạng thái phân tải toàn cục (hiển thị trực tiếp trên Dashboard xem Acc nào đang gánh những kịch bản nào)
GLOBAL_ACTIVE_PROJECTS_BY_ACC = {
    "acc_1": set(),
    "acc_2": set(),
    "acc_3": set(),
}
GLOBAL_PROJECT_TO_ACC = {}
_ROUND_ROBIN_COUNTER = 0


def normalize_acc_id(raw_acc: str) -> str:
    s = str(raw_acc or "").strip().lower()
    if ":" in s:
        s = s.split(":")[-1].strip()
    if s in ("acc_1", "1", "acc1"):
        return "acc_1"
    if s in ("acc_2", "2", "acc2"):
        return "acc_2"
    if s in ("acc_3", "3", "acc3"):
        return "acc_3"
    return "acc_1"


def get_account_config(acc_id: str = "acc_1") -> dict:
    aid = normalize_acc_id(acc_id)
    return WEB_ACCOUNTS_BY_ID.get(aid, WEB_ACCOUNTS_CONFIG[0])


def _has_profile_been_initialized(profile_dir: str) -> bool:
    if not os.path.exists(profile_dir):
        return False
    return (
        os.path.exists(os.path.join(profile_dir, "Local State"))
        or os.path.exists(os.path.join(profile_dir, "Default"))
    )


def _find_browser_exe() -> str:
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise RuntimeError("Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy tính này!")


def _cdp_http_json(path: str, method: str = "GET", timeout: float = 5.0, port: int = CDP_PORT):
    url = f"http://127.0.0.1:{port}/{path.lstrip('/')}"
    req = urllib.request.Request(url, method=method.upper())
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip() else {}


def is_cdp_browser_running(port: int = CDP_PORT) -> bool:
    try:
        ver = _cdp_http_json("/json/version", timeout=0.5, port=port)
        return bool(ver and ver.get("webSocketDebuggerUrl"))
    except Exception:
        return False


def _spawn_on_interactive_desktop(cmd_args: list[str], acc_cfg: dict = None) -> int:
    """
    Khởi chạy tiến trình giao diện (Chrome/Edge) trực tiếp trên màn hình tương tác thật của người dùng (`WinSta0\\Default`)
    thông qua Interactive Scheduled Task (`StudioWebChromeAcc1..3` với cờ `/IT`), đảm bảo 100% cửa sổ Chrome luôn hiện nổi
    trên màn hình chính của người dùng khi cần đăng nhập và không bị đóng khi tiến trình nền kết thúc!
    """
    cfg = acc_cfg or WEB_ACCOUNTS_CONFIG[0]
    port = cfg["port"]
    profile_dir = cfg["profile_dir"]
    bat_path = os.path.join(STUDIO_WEB_ROOT, cfg["bat_name"])
    task_name = cfg["task_name"]

    exe_path = _find_browser_exe()
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(
            f'@echo off\nchcp 65001 >nul\nstart "" "{exe_path}" '
            f'--remote-debugging-port={port} --remote-allow-origins=* '
            f'--user-data-dir="{profile_dir}" --no-first-run --no-default-browser-check '
            f'--disable-background-timer-throttling --disable-renderer-backgrounding '
            f'--disable-backgrounding-occluded-windows --new-window "https://chatgpt.com/"\n'
        )
    try:
        p = subprocess.Popen(cmd_args)
        for _ in range(6):
            time.sleep(0.25)
            if is_cdp_browser_running(port=port):
                return int(p.pid)
    except Exception:
        pass
    try:
        r_create = subprocess.run(
            [
                "schtasks",
                "/Create",
                "/TN",
                task_name,
                "/TR",
                f'"{bat_path}"',
                "/SC",
                "ONCE",
                "/ST",
                "00:00",
                "/IT",
                "/F",
            ],
            capture_output=True,
            timeout=5,
        )
        if r_create.returncode == 0:
            subprocess.run(["schtasks", "/Run", "/TN", task_name], capture_output=True, timeout=5)
        return 1
    except Exception:
        return 0


def _set_single_port_window_visibility(port: int, visible: bool = False, offset_idx: int = 0) -> list[int]:
    changed_wids = []
    try:
        tabs = _cdp_http_json("/json/list", timeout=2.5, port=port)
        page_tabs = [t for t in tabs if t.get("type") == "page" and t.get("webSocketDebuggerUrl")]
        for t in page_tabs:
            ws_url = t.get("webSocketDebuggerUrl")
            if not ws_url:
                continue
            try:
                ws = websocket.create_connection(ws_url, timeout=2.5)
                ws.send(json.dumps({"id": 1, "method": "Browser.getWindowForTarget", "params": {}}))
                r = json.loads(ws.recv())
                wid = (r.get("result") or {}).get("windowId")
                if wid and wid not in changed_wids:
                    if visible:
                        left_pos = 50 + (offset_idx * 45)
                        top_pos = 35 + (offset_idx * 35)
                        ws.send(
                            json.dumps(
                                {
                                    "id": 2,
                                    "method": "Browser.setWindowBounds",
                                    "params": {
                                        "windowId": wid,
                                        "bounds": {
                                            "left": left_pos,
                                            "top": top_pos,
                                            "width": 1150,
                                            "height": 860,
                                            "windowState": "normal",
                                        },
                                    },
                                }
                            )
                        )
                        ws.recv()
                        ws.send(json.dumps({"id": 3, "method": "Page.bringToFront", "params": {}}))
                        ws.recv()
                    else:
                        # Đưa cửa sổ ra tọa độ ẩn ngoài màn hình (-3200, -3200) với windowState='normal'
                        # để vừa 100% không hiện trên màn hình làm việc, vừa KHÔNG bị Windows/Chrome làm chậm bộ đếm thời gian JS!
                        ws.send(
                            json.dumps(
                                {
                                    "id": 2,
                                    "method": "Browser.setWindowBounds",
                                    "params": {
                                        "windowId": wid,
                                        "bounds": {
                                            "left": -3200,
                                            "top": -3200,
                                            "width": 1100,
                                            "height": 850,
                                            "windowState": "normal",
                                        },
                                    },
                                }
                            )
                        )
                        ws.recv()
                    changed_wids.append(wid)
                ws.close()
                if changed_wids:
                    break
            except Exception:
                pass
    except Exception:
        pass
    return changed_wids


def set_chrome_window_visibility(visible: bool = False, acc_id: str = None) -> dict:
    """
    Ẩn hoặc Hiện cửa sổ Chrome của 1 tài khoản cụ thể (`acc_id='acc_1'|'acc_2'|'acc_3'`) hoặc TẤT CẢ các tài khoản đang chạy (`acc_id=None`).
    """
    all_changed = []
    targets = [get_account_config(acc_id)] if acc_id else WEB_ACCOUNTS_CONFIG
    for cfg in targets:
        if is_cdp_browser_running(port=cfg["port"]):
            wids = _set_single_port_window_visibility(cfg["port"], visible=visible, offset_idx=cfg["index"] - 1)
            all_changed.extend(wids)

    target_lbl = get_account_config(acc_id)["label"] if acc_id else "Tất cả các tài khoản (Acc #1..#3)"
    return {
        "ok": True,
        "visible": visible,
        "acc_id": acc_id or "all",
        "window_ids": all_changed,
        "message": (
            f"👁️ Đã hiện lại cửa sổ Chrome của [{target_lbl}] trên màn hình!"
            if visible
            else f"👻 Đã ẩn cửa sổ Chrome của [{target_lbl}] xuống chạy ngầm 100% (Không vướng màn hình làm việc)!"
        ),
    }


def _extract_port_from_ws_url(ws_url: str) -> int:
    m = re.search(r":(\d+)/", str(ws_url or ""))
    if m:
        return int(m.group(1))
    return CDP_PORT


def _eval_js_in_tab(ws_url: str, js_expr: str, await_promise: bool = True, timeout: float = 35.0):
    port = _extract_port_from_ws_url(ws_url)
    port_lock = CDP_PORT_LOCKS.setdefault(port, threading.Lock())
    with port_lock:
        try:
            tab_id = str(ws_url or "").rstrip("/").split("/")[-1]
            if tab_id and len(tab_id) >= 16:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/json/activate/{tab_id}", timeout=2.0).read()
                if await_promise:
                    time.sleep(0.08)
        except Exception:
            pass
        ws = websocket.create_connection(ws_url, timeout=timeout)
        try:
            req = {
                "id": 1,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": js_expr,
                    "awaitPromise": await_promise,
                    "returnByValue": True,
                },
            }
            ws.send(json.dumps(req))
            while True:
                raw = ws.recv()
                msg = json.loads(raw)
                if msg.get("id") == 1:
                    res = (msg.get("result") or {}).get("result") or {}
                    return res.get("value")
        finally:
            try:
                ws.close()
            except Exception:
                pass


def force_close_or_recycle_tab(port: int, tab_id: str, ws_url: str = "", allow_close_last: bool = False) -> str:
    """
    Đóng dứt điểm Tab trình duyệt có ID `tab_id` trên cổng `port` để giải phóng RAM ngay khi không còn điều khiển:
    - Nếu cửa sổ Chrome chỉ còn duy nhất 1 Tab (`len(page_tabs) <= 1`) và `allow_close_last=False`:
      Chuyển hướng Tab duy nhất đó về `about:blank` (~0MB RAM) thay vì đóng tắt hẳn tiến trình Chrome,
      để bước tiếp theo tái sử dụng ngay Tab đó mà không phải mở Tab mới!
    """
    if not tab_id:
        return "ignored"
    try:
        tabs = _cdp_http_json("/json/list", timeout=2.5, port=port)
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        target_tab = next((t for t in page_tabs if t.get("id") == tab_id), None)
        if not target_tab:
            return "already_closed"
        ws_u = ws_url or target_tab.get("webSocketDebuggerUrl") or ""
        cur_u = str(target_tab.get("url") or "").strip()

        if len(page_tabs) <= 1 and not allow_close_last:
            if cur_u.rstrip("/") in ("https://chatgpt.com", "https://chatgpt.com/?model=auto"):
                return "already_standby_home"
            if ws_u:
                try:
                    ws = websocket.create_connection(ws_u, timeout=2.5)
                    ws.send(
                        json.dumps(
                            {
                                "id": 1,
                                "method": "Runtime.evaluate",
                                "params": {
                                    "expression": "window.onbeforeunload = null; window.location.replace('https://chatgpt.com/'); true;",
                                    "awaitPromise": False,
                                },
                            }
                        )
                    )
                    ws.recv()
                    ws.close()
                except Exception:
                    pass
            return "recycled_last_tab"

        if ws_u and cur_u != "about:blank":
            try:
                ws = websocket.create_connection(ws_u, timeout=2.0)
                ws.send(
                    json.dumps(
                        {
                            "id": 1,
                            "method": "Runtime.evaluate",
                            "params": {
                                "expression": "window.onbeforeunload = null; true;",
                                "awaitPromise": False,
                            },
                        }
                    )
                )
                ws.recv()
                ws.close()
            except Exception:
                pass
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/json/close/{tab_id}", timeout=2.5).read()
        except Exception:
            if ws_u:
                try:
                    ws = websocket.create_connection(ws_u, timeout=2.0)
                    ws.send(json.dumps({"id": 2, "method": "Page.close", "params": {}}))
                    ws.close()
                except Exception:
                    pass
        return "closed"
    except Exception:
        return "error"


def sweep_completed_and_idle_tabs_across_all_accounts(projects_root_list: list[str] = None) -> dict:
    """
    Quét toàn bộ các Tab Chrome đang mở trên cả 3 Tài khoản (`Acc #1`, `Acc #2`, `Acc #3`):
    - CHỈ giữ lại các Tab đang thực sự được điều khiển (`active_threads`) và tối đa 1 Tab trang chủ `https://chatgpt.com/` dự phòng.
    - Toàn bộ các Tab `/c/` của dự án đã xong đều được đóng để giải phóng RAM!
    """
    if not projects_root_list:
        projects_root_list = [
            r"D:\KEY NHẬT",
            os.path.join(STUDIO_WEB_ROOT, "PROJECTS"),
            os.path.join(STUDIO_WEB_ROOT, "PROJECTS_HOMELESS"),
            os.path.join(STUDIO_WEB_ROOT, "PROJECTS_MEXICO"),
        ]
        try:
            for entry in os.listdir(STUDIO_WEB_ROOT):
                if entry.startswith("PROJECTS"):
                    full_p = os.path.join(STUDIO_WEB_ROOT, entry)
                    if os.path.isdir(full_p) and full_p not in projects_root_list:
                        projects_root_list.append(full_p)
        except Exception:
            pass

    now = time.time()
    active_threads = set()
    has_recently_starting_project = False
    for r_dir in projects_root_list:
        if not os.path.exists(r_dir):
            continue
        try:
            for d_name in os.listdir(r_dir):
                st_path = os.path.join(r_dir, d_name, "STATE.json")
                if os.path.exists(st_path):
                    try:
                        mtime_age = now - os.path.getmtime(st_path)
                        with open(st_path, "r", encoding="utf-8") as f:
                            st = json.load(f)
                        is_done = bool(
                            st.get("completed")
                            or st.get("current_step") in ("COMPLETED_ALL_5_STEPS", "COMPLETED")
                            or st.get("current_step_status") in ("COMPLETED_ALL_5_STEPS", "COMPLETED")
                            or st.get("current_stage") in ("IDLE", "COMPLETED")
                        )
                        if not is_done and mtime_age < 3600.0:
                            tid = str(st.get("thread_id") or "").strip()
                            if tid:
                                active_threads.add(tid)
                            else:
                                if mtime_age < 180.0:
                                    has_recently_starting_project = True
                            for reg_v in (st.get("agent_chat_registry") or {}).values():
                                if isinstance(reg_v, dict) and reg_v.get("thread_id"):
                                    active_threads.add(str(reg_v["thread_id"]).strip())
                    except Exception:
                        pass
        except Exception:
            pass

    closed_cnt = 0
    recycled_cnt = 0
    details = []

    for cfg in WEB_ACCOUNTS_CONFIG:
        port = cfg["port"]
        label = cfg["label"]
        if not is_cdp_browser_running(port=port):
            continue
        try:
            tabs = _cdp_http_json("/json/list", timeout=2.5, port=port)
            page_tabs = [t for t in tabs if t.get("type") == "page"]
            if not page_tabs:
                continue

            controlled_tabs = []
            uncontrolled_tabs = []
            home_tabs = []
            for t in page_tabs:
                u = str(t.get("url") or "").strip()
                u_clean = u.rstrip("/")
                m = re.search(r"/c/([0-9a-fA-F\-]{16,})", u)
                cid = m.group(1) if m else ""
                is_auth_page = any(k in u.lower() for k in ("auth.openai.com", "login", "auth0", "accounts.google.com"))
                is_home_page = u_clean in ("https://chatgpt.com", "https://chatgpt.com/?model=auto")
                if (cid and cid in active_threads) or is_auth_page or (is_home_page and has_recently_starting_project):
                    controlled_tabs.append(t)
                elif is_home_page:
                    home_tabs.append(t)
                else:
                    uncontrolled_tabs.append(t)

            # Luôn giữ lại tối đa 1 tab trang chủ https://chatgpt.com để sẵn sàng nhận lệnh mới tức thì
            if home_tabs and not controlled_tabs:
                controlled_tabs.append(home_tabs[0])
                uncontrolled_tabs.extend(home_tabs[1:])
            else:
                uncontrolled_tabs.extend(home_tabs)

            if len(controlled_tabs) >= 1:
                for t in uncontrolled_tabs:
                    act = force_close_or_recycle_tab(port, t.get("id"), t.get("webSocketDebuggerUrl") or "", allow_close_last=True)
                    if act == "closed":
                        closed_cnt += 1
                        details.append(f"{label}:closed:{str(t.get('id'))[:6]}")
            else:
                tabs_to_close = uncontrolled_tabs[:-1]
                for t in tabs_to_close:
                    act = force_close_or_recycle_tab(port, t.get("id"), t.get("webSocketDebuggerUrl") or "", allow_close_last=True)
                    if act == "closed":
                        closed_cnt += 1
                        details.append(f"{label}:closed:{str(t.get('id'))[:6]}")
        except Exception:
            pass

    return {"closed_count": closed_cnt, "recycled_count": recycled_cnt, "details": details}


def check_single_account_status(acc_cfg: dict, force_refresh: bool = False) -> dict:
    """
    Kiểm tra trạng thái trình duyệt Chrome và phiên đăng nhập của 1 tài khoản (`Acc #1`, `Acc #2`, hoặc `Acc #3`).
    Hỗ trợ cơ chế Non-Blocking Cache (`_LAST_VERIFIED_LOGIN_BY_PORT`) để khi tài khoản đang bận chạy 3 luồng kịch bản,
    Dashboard vẫn hiển thị tức thì trạng thái Đã Đăng Nhập mà không phải chờ khóa WebSocket!
    """
    acc_id = acc_cfg["acc_id"]
    label = acc_cfg["label"]
    port = acc_cfg["port"]
    profile_dir = acc_cfg["profile_dir"]
    initialized = _has_profile_been_initialized(profile_dir)
    active_projs = sorted(list(GLOBAL_ACTIVE_PROJECTS_BY_ACC.get(acc_id, set())))

    acc_info_file = os.path.join(profile_dir, ".studio_account_info.json")
    saved_disk_info = {}
    if os.path.exists(acc_info_file):
        try:
            with open(acc_info_file, "r", encoding="utf-8") as f:
                saved_disk_info = json.load(f)
        except Exception:
            pass

    if not is_cdp_browser_running(port=port):
        _LAST_VERIFIED_LOGIN_BY_PORT.pop(port, None)
        return {
            "acc_id": acc_id,
            "index": acc_cfg["index"],
            "label": label,
            "port": port,
            "profile_dir": profile_dir,
            "profile_initialized": initialized,
            "browser_running": False,
            "logged_in": False,
            "user_email": "",
            "plan_type": "",
            "chatgpt_tabs": 0,
            "active_threads": len(active_projs),
            "max_threads": acc_cfg["max_threads"],
            "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
            "active_projects": active_projs,
            "message": f"⚪ {label} (Port {port}): Chưa bật/chưa đăng nhập. Bấm '🔑 Đăng Nhập {label}' để thêm tài khoản!",
        }

    cg_tabs_cnt = 0
    has_active_conv_url = False
    try:
        tabs = _cdp_http_json("/json/list", timeout=2.5, port=port)
        cg_tabs = [t for t in tabs if t.get("type") == "page" and "chatgpt.com" in str(t.get("url", ""))]
        cg_tabs_cnt = len(cg_tabs)
        has_active_conv_url = any("/c/" in str(t.get("url", "")) for t in cg_tabs)
        cached_login = _LAST_VERIFIED_LOGIN_BY_PORT.get(port) or saved_disk_info
        if not cg_tabs:
            if cached_login and cached_login.get("logged_in"):
                email = cached_login.get("user_email") or ""
                plan = cached_login.get("plan_type") or ""
                return {
                    "acc_id": acc_id,
                    "index": acc_cfg["index"],
                    "label": label,
                    "port": port,
                    "profile_dir": profile_dir,
                    "profile_initialized": True,
                    "browser_running": True,
                    "logged_in": True,
                    "user_email": email,
                    "plan_type": plan,
                    "chatgpt_tabs": 0,
                    "active_threads": len(active_projs),
                    "max_threads": acc_cfg["max_threads"],
                    "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                    "active_projects": active_projs,
                    "message": f"✅ {label} ({email or 'Đã lưu phiên'}): Đang gánh {len(active_projs)}/{acc_cfg['max_threads']} luồng (Đã tắt hết tab rảnh — Chế độ Nhẹ Máy)",
                }
            return {
                "acc_id": acc_id,
                "index": acc_cfg["index"],
                "label": label,
                "port": port,
                "profile_dir": profile_dir,
                "profile_initialized": True,
                "browser_running": True,
                "logged_in": False,
                "user_email": "",
                "plan_type": "",
                "chatgpt_tabs": 0,
                "active_threads": len(active_projs),
                "max_threads": acc_cfg["max_threads"],
                "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                "active_projects": active_projs,
                "message": f"⚠️ {label} (Port {port}): Đã mở trình duyệt nhưng chưa có tab chatgpt.com.",
            }
        port_lock = CDP_PORT_LOCKS.setdefault(port, threading.Lock())
        # Nếu đang có tab hội thoại /c/ hoạt động hoặc cổng đang bận bơm prompt, trả về ngay từ bộ nhớ đệm không cần chờ WebSocket!
        if cached_login and cached_login.get("logged_in") and (
            has_active_conv_url or port_lock.locked() or (time.time() - cached_login.get("ts", 0)) < 25.0
        ):
            email = cached_login.get("user_email") or ""
            plan = cached_login.get("plan_type") or ""
            return {
                "acc_id": acc_id,
                "index": acc_cfg["index"],
                "label": label,
                "port": port,
                "profile_dir": profile_dir,
                "profile_initialized": True,
                "browser_running": True,
                "logged_in": True,
                "user_email": email,
                "plan_type": plan,
                "chatgpt_tabs": cg_tabs_cnt,
                "active_threads": len(active_projs),
                "max_threads": acc_cfg["max_threads"],
                "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                "active_projects": active_projs,
                "message": f"✅ {label} ({email or 'Đã lưu phiên'}): Đang gánh {len(active_projs)}/{acc_cfg['max_threads']} luồng ({cg_tabs_cnt} tab mở)",
            }
        if not force_refresh and cached_login and not cached_login.get("logged_in") and (time.time() - cached_login.get("ts", 0)) < 6.0:
            return {
                "acc_id": acc_id,
                "index": acc_cfg["index"],
                "label": label,
                "port": port,
                "profile_dir": profile_dir,
                "profile_initialized": initialized,
                "browser_running": True,
                "logged_in": False,
                "user_email": "",
                "plan_type": "",
                "chatgpt_tabs": cg_tabs_cnt,
                "active_threads": len(active_projs),
                "max_threads": acc_cfg["max_threads"],
                "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                "active_projects": active_projs,
                "message": f"⚠️ {label} (Port {port}): Cửa sổ Chrome đang mở nhưng CHƯA ĐĂNG NHẬP.",
            }
        js_check = """
        (async () => {
            try {
                const ctl = new AbortController();
                const timer = setTimeout(() => ctl.abort(), 1100);
                const r = await fetch('/api/auth/session', { credentials: 'include', signal: ctl.signal });
                clearTimeout(timer);
                if (r.ok) {
                    const d = await r.json();
                    const tok = (d && d.accessToken) ? d.accessToken : '';
                    if (tok) window.__studioAccessToken = tok;
                    const u = (d && d.user) ? d.user : {};
                    if (tok || u.email || u.id) {
                        return JSON.stringify({
                            logged_in: true,
                            email: u.email || u.name || '',
                            plan: (d.account && d.account.planType) || ''
                        });
                    }
                }
            } catch (e) {}
            try {
                const hasComposer = Boolean(
                    document.querySelector('#prompt-textarea')
                    || document.querySelector('.ProseMirror[contenteditable="true"]')
                    || document.querySelector('[role="textbox"][contenteditable="true"]')
                );
                const hasLoginBtn = Boolean(
                    document.querySelector('[data-testid="login-button"]')
                    || document.querySelector('[data-testid="welcome-login-button"]')
                    || Array.from(document.querySelectorAll('button, a')).some(el => {
                        const tx = (el.innerText || '').trim().toLowerCase();
                        return tx === 'log in' || tx === 'đăng nhập' || tx === 'sign up' || tx === 'đăng ký';
                    })
                );
                const hasProfileOrConv = Boolean(
                    document.querySelector('[data-testid="profile-button"]')
                    || document.querySelector('[aria-label="Open Profile Menu"]')
                    || document.querySelector('nav a[href*="/c/"]')
                );
                if ((hasComposer && !hasLoginBtn) || hasProfileOrConv) {
                    return JSON.stringify({ logged_in: true, email: '', plan: '' });
                }
            } catch (e2) {}
            return JSON.stringify({ logged_in: false });
        })()
        """
        raw_val = None
        candidate_ws_urls = [t.get("webSocketDebuggerUrl") for t in cg_tabs[:1] if t.get("webSocketDebuggerUrl")]
        if not candidate_ws_urls:
            is_logged = bool(has_active_conv_url or (cached_login and cached_login.get("logged_in")))
            return {
                "acc_id": acc_id,
                "index": acc_cfg["index"],
                "label": label,
                "port": port,
                "profile_dir": profile_dir,
                "profile_initialized": True,
                "browser_running": True,
                "logged_in": is_logged,
                "user_email": (cached_login or {}).get("user_email", ""),
                "plan_type": (cached_login or {}).get("plan_type", ""),
                "chatgpt_tabs": cg_tabs_cnt,
                "active_threads": len(active_projs),
                "max_threads": acc_cfg["max_threads"],
                "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                "active_projects": active_projs,
                "message": f"⏳ {label} (Port {port}): Đang kết nối tới tab ChatGPT Web...",
            }

        for ws_url in candidate_ws_urls:
            ws = None
            try:
                ws = websocket.create_connection(ws_url, timeout=1.5)
                ws.send(
                    json.dumps(
                        {
                            "id": 1,
                            "method": "Runtime.evaluate",
                            "params": {
                                "expression": js_check,
                                "awaitPromise": True,
                                "returnByValue": True,
                            },
                        }
                    )
                )
                while True:
                    msg = json.loads(ws.recv())
                    if msg.get("id") == 1:
                        raw_val = ((msg.get("result") or {}).get("result") or {}).get("value")
                        break
                if raw_val:
                    break
            except Exception:
                continue
            finally:
                if ws is not None:
                    try:
                        ws.close()
                    except Exception:
                        pass

        info = json.loads(raw_val) if isinstance(raw_val, str) and raw_val.strip().startswith("{") else {}
        logged_in = bool(info.get("logged_in") or has_active_conv_url)
        email = info.get("email") or (saved_disk_info.get("user_email") if logged_in else "") or ""
        plan = info.get("plan") or (saved_disk_info.get("plan_type") if logged_in else "") or ""
        if logged_in:
            new_cache = {
                "logged_in": True,
                "user_email": email,
                "plan_type": plan,
                "ts": time.time(),
            }
            _LAST_VERIFIED_LOGIN_BY_PORT[port] = new_cache
            try:
                with open(acc_info_file, "w", encoding="utf-8") as f:
                    json.dump(new_cache, f, ensure_ascii=False)
            except Exception:
                pass
        else:
            _LAST_VERIFIED_LOGIN_BY_PORT[port] = {
                "logged_in": False,
                "user_email": "",
                "plan_type": "",
                "ts": time.time(),
            }
        return {
            "acc_id": acc_id,
            "index": acc_cfg["index"],
            "label": label,
            "port": port,
            "profile_dir": profile_dir,
            "profile_initialized": True,
            "browser_running": True,
            "logged_in": logged_in,
            "user_email": email,
            "plan_type": plan,
            "chatgpt_tabs": cg_tabs_cnt,
            "active_threads": len(active_projs),
            "max_threads": acc_cfg["max_threads"],
            "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
            "active_projects": active_projs,
            "message": (
                f"✅ {label} ({email or 'Đã lưu phiên'}): Đang gánh {len(active_projs)}/{acc_cfg['max_threads']} luồng ({cg_tabs_cnt} tab mở)"
                if logged_in
                else f"⚠️ {label} (Port {port}): Cửa sổ Chrome đang mở nhưng CHƯA ĐĂNG NHẬP. Hãy đăng nhập trên cửa sổ Chrome của {label}!"
            ),
        }
    except Exception as e:
        cached_login = _LAST_VERIFIED_LOGIN_BY_PORT.get(port) or saved_disk_info
        if has_active_conv_url or (cached_login and cached_login.get("logged_in")):
            email = (cached_login or {}).get("user_email") or ""
            plan = (cached_login or {}).get("plan_type") or ""
            return {
                "acc_id": acc_id,
                "index": acc_cfg["index"],
                "label": label,
                "port": port,
                "profile_dir": profile_dir,
                "profile_initialized": True,
                "browser_running": True,
                "logged_in": True,
                "user_email": email,
                "plan_type": plan,
                "chatgpt_tabs": cg_tabs_cnt or len(active_projs) or 1,
                "active_threads": len(active_projs),
                "max_threads": acc_cfg["max_threads"],
                "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
                "active_projects": active_projs,
                "message": f"✅ {label} ({email or 'Đã lưu phiên'}): Đang gánh {len(active_projs)}/{acc_cfg['max_threads']} luồng ({cg_tabs_cnt} tab mở)",
            }
        _LAST_VERIFIED_LOGIN_BY_PORT[port] = {
            "logged_in": False,
            "user_email": "",
            "plan_type": "",
            "ts": time.time(),
        }
        return {
            "acc_id": acc_id,
            "index": acc_cfg["index"],
            "label": label,
            "port": port,
            "profile_dir": profile_dir,
            "profile_initialized": initialized,
            "browser_running": True,
            "logged_in": False,
            "user_email": "",
            "plan_type": "",
            "chatgpt_tabs": cg_tabs_cnt,
            "active_threads": len(active_projs),
            "max_threads": acc_cfg["max_threads"],
            "max_open_tabs": acc_cfg.get("max_open_tabs", MAX_OPEN_TABS_PER_ACCOUNT),
            "active_projects": active_projs,
            "message": f"Đang kiểm tra {label}: {e}",
        }


def ensure_chrome_debug_browser_open(
    open_chatgpt_home: bool = True,
    force_bring_to_front: bool = False,
    run_hidden: bool = True,
    acc_id: str = "acc_1",
) -> dict:
    """
    Khởi chạy trình duyệt Chrome/Edge cho tài khoản chỉ định (`acc_1`, `acc_2`, `acc_3`):
    - Khi bấm nút Đăng nhập (`force_bring_to_front=True`): Tạo thư mục Profile riêng (`BROWSER_PROFILE`, `BROWSER_PROFILE_2`, `BROWSER_PROFILE_3`)
      và hiện cửa sổ Chrome nổi trên màn hình để người dùng đăng nhập.
    - Khi Localhost tự động làm việc (`run_hidden=True` & đã đăng nhập): Tự động ẩn cửa sổ Chrome ra ngoài màn hình (`(-3200, -3200)`)
      để chạy ngầm 100% không làm phiền màn hình của người dùng!
    """
    global _STATUS_CACHE_TS
    cfg = get_account_config(acc_id)
    port = cfg["port"]
    profile_dir = cfg["profile_dir"]
    os.makedirs(profile_dir, exist_ok=True)
    exe_path = _find_browser_exe()
    base_args = [
        exe_path,
        f"--remote-debugging-port={port}",
        "--remote-allow-origins=*",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--new-window",
        "https://chatgpt.com/",
    ]
    if not is_cdp_browser_running(port=port):
        _spawn_on_interactive_desktop(base_args, acc_cfg=cfg)
        for _ in range(12):
            time.sleep(0.5)
            if is_cdp_browser_running(port=port):
                break
        # Nếu vẫn chưa mở được cổng CDP (do có tiến trình Chrome cũ không bật --remote-debugging-port đang khóa profile_dir),
        # tự động đóng tiến trình Chrome đang giữ profile_dir đó và khởi chạy lại kèm --remote-debugging-port!
        if not is_cdp_browser_running(port=port):
            try:
                prof_escaped = profile_dir.replace("'", "''")
                subprocess.run(
                    [
                        "powershell",
                        "-NoProfile",
                        "-WindowStyle",
                        "Hidden",
                        "-Command",
                        f"Get-CimInstance Win32_Process | Where-Object {{ ($_.Name -match 'chrome|msedge') -and ($_.CommandLine -like '*{prof_escaped}*') }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}",
                    ],
                    capture_output=True,
                    timeout=5,
                    creationflags=0x08000000 if os.name == "nt" else 0,
                )
                time.sleep(0.8)
            except Exception:
                pass
            _spawn_on_interactive_desktop(base_args, acc_cfg=cfg)
            for _ in range(16):
                time.sleep(0.5)
                if is_cdp_browser_running(port=port):
                    break
        if run_hidden and not force_bring_to_front:
            time.sleep(1.2)
            st = check_single_account_status(cfg)
            if st.get("logged_in"):
                _set_single_port_window_visibility(port, visible=False, offset_idx=cfg["index"] - 1)
    elif force_bring_to_front:
        _set_single_port_window_visibility(port, visible=True, offset_idx=cfg["index"] - 1)

    if open_chatgpt_home and is_cdp_browser_running(port=port):
        try:
            tabs = _cdp_http_json("/json/list", timeout=3.0, port=port)
            page_tabs = [t for t in tabs if t.get("type") == "page" and "chatgpt.com" in str(t.get("url", ""))]
            if not page_tabs:
                _cdp_http_json("/json/new?https://chatgpt.com/", method="PUT", timeout=4.0, port=port)
            elif force_bring_to_front and page_tabs[0].get("webSocketDebuggerUrl"):
                ws = websocket.create_connection(page_tabs[0]["webSocketDebuggerUrl"], timeout=4.0)
                ws.send(json.dumps({"id": 99, "method": "Page.bringToFront", "params": {}}))
                ws.close()
        except Exception:
            pass

    if force_bring_to_front:
        _LAST_VERIFIED_LOGIN_BY_PORT.pop(port, None)
    _STATUS_CACHE_TS = 0.0
    return check_single_account_status(cfg)


def ensure_all_initialized_browsers_open(run_hidden: bool = True) -> None:
    """
    Tự động bật ngầm tất cả các tài khoản đã từng đăng nhập thành công (`.studio_account_info.json` có `logged_in=True`).
    Luôn đảm bảo ít nhất `Acc #1` được bật sẵn nếu chưa có tài khoản nào đang mở.
    """
    any_running = any(is_cdp_browser_running(port=c["port"]) for c in WEB_ACCOUNTS_CONFIG)
    for cfg in WEB_ACCOUNTS_CONFIG:
        acc_info_file = os.path.join(cfg["profile_dir"], ".studio_account_info.json")
        has_saved_login = False
        if os.path.exists(acc_info_file):
            try:
                has_saved_login = bool(json.load(open(acc_info_file, encoding="utf-8")).get("logged_in"))
            except Exception:
                pass
        should_open = has_saved_login or (cfg["acc_id"] == "acc_1" and not any_running)
        if should_open and not is_cdp_browser_running(port=cfg["port"]):
            try:
                ensure_chrome_debug_browser_open(
                    open_chatgpt_home=True,
                    force_bring_to_front=False,
                    run_hidden=run_hidden,
                    acc_id=cfg["acc_id"],
                )
                any_running = True
            except Exception:
                pass


def check_all_web_accounts_status(force_refresh: bool = False) -> dict:
    """
    Kiểm tra toàn bộ 3 Tài khoản ChatGPT Web (`Acc #1`, `Acc #2`, `Acc #3`), tính toán tổng số Acc đã đăng nhập
    và tổng số luồng tối đa (`logged_in_count * 3`, tối đa 9 luồng song song).
    """
    global _STATUS_CACHE_TS, _STATUS_CACHE_DATA
    now = time.time()
    if not force_refresh and _STATUS_CACHE_DATA is not None and (now - _STATUS_CACHE_TS) < 3.2:
        # Cập nhật nhanh active_projects theo thời gian thực ngay cả khi dùng cache
        cached = dict(_STATUS_CACHE_DATA)
        accs_updated = []
        for a in cached.get("accounts", []):
            aid = a["acc_id"]
            act_p = sorted(list(GLOBAL_ACTIVE_PROJECTS_BY_ACC.get(aid, set())))
            a_copy = dict(a)
            a_copy["active_threads"] = len(act_p)
            a_copy["active_projects"] = act_p
            accs_updated.append(a_copy)
        cached["accounts"] = accs_updated
        return cached

    accounts_status = []
    for cfg in WEB_ACCOUNTS_CONFIG:
        accounts_status.append(check_single_account_status(cfg, force_refresh=force_refresh))

    logged_in_accs = [a for a in accounts_status if a.get("logged_in")]
    running_accs = [a for a in accounts_status if a.get("browser_running")]
    logged_in_count = len(logged_in_accs)
    max_total_threads = max(1, logged_in_count) * MAX_THREADS_PER_ACCOUNT
    total_tabs = sum(int(a.get("chatgpt_tabs") or 0) for a in accounts_status)
    emails = [f"{a['label']}: {a.get('user_email') or 'Đã lưu'}" for a in logged_in_accs]

    if logged_in_count > 0:
        summary_msg = (
            f"✅ Đã kết nối {logged_in_count}/3 Tài khoản ChatGPT Web ({' | '.join(emails)}) "
            f"— Công suất tối đa: {logged_in_count * MAX_THREADS_PER_ACCOUNT} luồng song song (Chia đều tối đa {MAX_THREADS_PER_ACCOUNT} luồng/Acc)!"
        )
    else:
        summary_msg = (
            "⚠️ Chưa có tài khoản ChatGPT Web nào đăng nhập. Hãy bấm '🔑 Đăng Nhập Acc #1' (hoặc Acc #2, Acc #3) trên thanh công cụ!"
        )

    result = {
        "browser_running": len(running_accs) > 0,
        "logged_in": logged_in_count > 0,
        "logged_in_count": logged_in_count,
        "max_threads_per_account": MAX_THREADS_PER_ACCOUNT,
        "max_total_threads": max_total_threads,
        "user_email": ", ".join(a.get("user_email") or a["label"] for a in logged_in_accs),
        "chatgpt_tabs": total_tabs,
        "profile_dir": BROWSER_PROFILE_DIR,
        "accounts": accounts_status,
        "message": summary_msg,
    }
    with _STATUS_CACHE_LOCK:
        _STATUS_CACHE_TS = time.time()
        _STATUS_CACHE_DATA = result
    return result


def check_web_browser_status() -> dict:
    """
    Hàm tương thích ngược: Trả về tổng hợp trạng thái của cả 3 tài khoản (`Acc #1`, `Acc #2`, `Acc #3`)
    kèm danh sách chi tiết `accounts`.
    """
    return check_all_web_accounts_status(force_refresh=False)


class ChatGPTWebMultiTabClient:
    """
    Engine Điều Khiển ChatGPT Web Đa Tài Khoản & Đa Tab (`Acc #1`, `Acc #2`, `Acc #3` qua CDP Ports `9222`, `9223`, `9224`):
    1. Hỗ trợ đồng thời tối đa **3 Tài khoản ChatGPT (`Acc #1`, `Acc #2`, `Acc #3`)**, mỗi tài khoản chạy trong 1 Profile Chrome
       độc lập hoàn toàn (`BROWSER_PROFILE`, `BROWSER_PROFILE_2`, `BROWSER_PROFILE_3`).
    2. **Bộ Chia Tải Thông Minh (Least-Loaded + Round-Robin Load Balancer):**
       - Tự động chia đều nhiệm vụ (kịch bản) cho tất cả các tài khoản đã đăng nhập (`Acc #1 -> Acc #2 -> Acc #3...`).
       - Khóa cứng **tối đa 1 Acc chạy 3 luồng (`MAX_THREADS_PER_ACCOUNT = 3`)** -> 1 Acc = 3 luồng, 2 Acc = 6 luồng, 3 Acc = 9 luồng song song!
    3. Mỗi luồng kịch bản giữ 1 Tab trình duyệt độc lập (`targetId` riêng) trên đúng Acc đã được phân công từ Bước 1 đến Bước 5.
    """

    def __init__(self):
        ensure_all_initialized_browsers_open(run_hidden=True)
        self._thread_to_tab = {"acc_1": {}, "acc_2": {}, "acc_3": {}}
        self._reserved_tab_ids = {"acc_1": set(), "acc_2": set(), "acc_3": set()}
        self._active_busy_tabs = {"acc_1": set(), "acc_2": set(), "acc_3": set()}
        self._tab_last_used_ts = {}
        self._reusable_project_tab = {}
        self._thread_to_acc = {}
        self._project_to_acc = {}
        self._last_known_turns = {}
        self._last_sent_prompt = {}

    def close(self):
        pass

    def _heal_frozen_chatgpt_renderer(self):
        return

    def quarantine_conversation_in_pool(self, bad_cid: str, project_id: str = "") -> None:
        return

    def rewind_thread_to_outline_turn(self, thread_id: str) -> bool:
        return False

    def get_logged_in_accounts(self) -> list[dict]:
        st = check_all_web_accounts_status(force_refresh=False)
        logged = [a for a in st.get("accounts", []) if a.get("logged_in")]
        if not logged:
            st = check_all_web_accounts_status(force_refresh=True)
            logged = [a for a in st.get("accounts", []) if a.get("logged_in")]
        if not logged:
            # Nếu chưa phát hiện, thử bật lại các trình duyệt đã khởi tạo và kiểm tra lần nữa
            ensure_all_initialized_browsers_open(run_hidden=True)
            st = check_all_web_accounts_status(force_refresh=True)
            logged = [a for a in st.get("accounts", []) if a.get("logged_in")]
        if not logged:
            # Fallback về Acc #1
            return [check_single_account_status(WEB_ACCOUNTS_CONFIG[0])]
        return logged

    def acquire_account_for_project(
        self,
        project_id: str,
        preferred_acc_id: str = "",
        thread_id: str = "",
    ) -> dict:
        """
        Phân bổ tài khoản ChatGPT (`Acc #1`, `Acc #2`, `Acc #3`) cho dự án `project_id`:
        - Quy tắc 1: Chia đều nhiệm vụ giữa các tài khoản đã đăng nhập (`Least-Loaded + Round-Robin`), ưu tiên tài khoản
          đang chạy ít luồng nhất.
        - Quy tắc 2: Mỗi tài khoản chạy tối đa `MAX_THREADS_PER_ACCOUNT = 3` luồng. Nếu cả 3 luồng của 1 Acc đã đầy,
          tự động phân sang Acc còn trống tiếp theo (hoặc chờ khe trống nếu tất cả các Acc đều đã chạm trần 3 luồng/Acc).
        - Quy tắc 3: Nếu dự án đang chạy dở (`thread_id` đã có sẵn trên `preferred_acc_id`) và Acc đó đã đăng nhập + còn khe,
          giữ nguyên trên đúng Acc đó để nối tiếp đoạn chat 5 bước không bị đứt mạch!
        """
        global _ROUND_ROBIN_COUNTER
        pref_norm = normalize_acc_id(preferred_acc_id) if preferred_acc_id else ""

        while True:
            logged_accs = self.get_logged_in_accounts()
            logged_map = {a["acc_id"]: a for a in logged_accs}

            with ACCOUNT_LOAD_LOCK:
                # 1. Nếu project_id đã được gán sẵn trong phiên chạy này và Acc đó vẫn hợp lệ
                existing_aid = self._project_to_acc.get(project_id)
                if existing_aid and existing_aid in logged_map:
                    GLOBAL_ACTIVE_PROJECTS_BY_ACC.setdefault(existing_aid, set()).add(project_id)
                    GLOBAL_PROJECT_TO_ACC[project_id] = existing_aid
                    if thread_id:
                        self._thread_to_acc[thread_id] = existing_aid
                    return get_account_config(existing_aid)

                # 2. Nếu dự án resume có sẵn thread_id trên preferred_acc_id và Acc đó chưa vượt quá 3 luồng
                if thread_id and pref_norm and pref_norm in logged_map:
                    act_set = GLOBAL_ACTIVE_PROJECTS_BY_ACC.setdefault(pref_norm, set())
                    if project_id in act_set or len(act_set) < MAX_THREADS_PER_ACCOUNT:
                        act_set.add(project_id)
                        self._project_to_acc[project_id] = pref_norm
                        GLOBAL_PROJECT_TO_ACC[project_id] = pref_norm
                        self._thread_to_acc[thread_id] = pref_norm
                        return get_account_config(pref_norm)

                # 3. Chia đều (Least-Loaded + Round-Robin) giữa tất cả các Acc đã đăng nhập và có số luồng đang chạy < 3
                candidates = []
                n_logged = len(logged_accs)
                for idx, a_info in enumerate(logged_accs):
                    aid = a_info["acc_id"]
                    act_set = GLOBAL_ACTIVE_PROJECTS_BY_ACC.setdefault(aid, set())
                    load_cnt = len(act_set)
                    if load_cnt < MAX_THREADS_PER_ACCOUNT:
                        rr_rank = (idx - (_ROUND_ROBIN_COUNTER % max(1, n_logged))) % max(1, n_logged)
                        candidates.append((load_cnt, rr_rank, aid))

                if candidates:
                    candidates.sort(key=lambda x: (x[0], x[1]))
                    chosen_aid = candidates[0][2]
                    _ROUND_ROBIN_COUNTER += 1
                    GLOBAL_ACTIVE_PROJECTS_BY_ACC.setdefault(chosen_aid, set()).add(project_id)
                    self._project_to_acc[project_id] = chosen_aid
                    GLOBAL_PROJECT_TO_ACC[project_id] = chosen_aid
                    if thread_id:
                        self._thread_to_acc[thread_id] = chosen_aid
                    return get_account_config(chosen_aid)

            # Nếu tất cả các tài khoản đều đang chạy đủ 3/3 luồng, đợi 2s để khe luồng giải phóng
            time.sleep(2.0)

    def release_account_for_project(self, project_id: str) -> None:
        """Giải phóng khe luồng trên tài khoản khi dự án hoàn thành hoặc tạm dừng."""
        if not project_id:
            return
        with ACCOUNT_LOAD_LOCK:
            aid = self._project_to_acc.pop(project_id, None) or GLOBAL_PROJECT_TO_ACC.pop(project_id, None)
            for k_set in GLOBAL_ACTIVE_PROJECTS_BY_ACC.values():
                k_set.discard(project_id)

    def release_tab_from_active_duty(
        self,
        project_id: str = "",
        thread_id: str = "",
        host_id: str = "",
    ) -> None:
        """
        Đóng ngay Tab đang mở `thread_id` khi kịch bản chuyển sang Skill/Agent khác để giải phóng RAM tức thì,
        chỉ giữ lại các Tab đang thực sự được điều khiển!
        """
        try:
            self.close_tab_for_completed_project(project_id="", thread_id=thread_id, host_id=host_id)
        except Exception:
            pass

    def close_all_tabs_for_project(
        self,
        project_id: str = "",
        thread_ids: list[str] = None,
        host_id: str = "",
    ) -> int:
        """Đóng hoặc tái chế toàn bộ các Tab của mọi Agent thuộc dự án `project_id` sau khi kịch bản hoàn thành 100%."""
        closed_or_recycled = 0
        tids = [str(x).strip() for x in (thread_ids or []) if str(x).strip()]
        with WEB_TAB_LOCK:
            if project_id:
                self._reusable_project_tab.pop(project_id, None)
        for tid in tids:
            act = self.close_tab_for_completed_project(project_id="", thread_id=tid, host_id=host_id)
            if act in ("closed", "recycled_last_tab"):
                closed_or_recycled += 1
        if project_id:
            self.release_account_for_project(project_id)
        try:
            sweep_completed_and_idle_tabs_across_all_accounts()
        except Exception:
            pass
        return closed_or_recycled

    def close_tab_for_completed_project(
        self,
        project_id: str = "",
        thread_id: str = "",
        host_id: str = "",
    ) -> str:
        """
        Tự động đóng ngay Tab trình duyệt của dự án sau khi đã viết xong 5/5 bước (`COMPLETED_ALL_5_STEPS`)
        để không để tồn đọng các Tab cũ làm nặng RAM máy tính!
        - Nếu Tab đó là Tab duy nhất còn lại trên cửa sổ Chrome của tài khoản, sẽ tự động làm sạch và chuyển về
          trang chủ gọn nhẹ (`https://chatgpt.com/`) để kịch bản kế tiếp tái sử dụng ngay Tab đó mà không phải mở Tab mới!
        """
        acc_cfg = self._resolve_acc_cfg(thread_id=thread_id, host_id=host_id, project_id=project_id)
        aid = acc_cfg["acc_id"]
        port = acc_cfg["port"]
        action_taken = "none"

        with WEB_TAB_LOCK:
            acc_tab_map = self._thread_to_tab.setdefault(aid, {})
            acc_reserved = self._reserved_tab_ids.setdefault(aid, set())
            acc_busy = self._active_busy_tabs.setdefault(aid, set())
            mapped_tid = acc_tab_map.pop(thread_id, None) if thread_id else None
            if mapped_tid:
                acc_reserved.discard(mapped_tid)
                acc_busy.discard(mapped_tid)
            if thread_id:
                self._thread_to_acc.pop(thread_id, None)
            if project_id:
                self._reusable_project_tab.pop(project_id, None)

            if is_cdp_browser_running(port=port):
                try:
                    tabs = _cdp_http_json("/json/list", timeout=2.5, port=port)
                    page_tabs = [t for t in tabs if t.get("type") == "page"]
                    target_t = None
                    if thread_id:
                        for t in page_tabs:
                            if f"/c/{thread_id}" in str(t.get("url") or ""):
                                target_t = t
                                break
                    if not target_t and mapped_tid:
                        for t in page_tabs:
                            if t.get("id") == mapped_tid:
                                target_t = t
                                break
                    if target_t:
                        tid = target_t.get("id")
                        acc_reserved.discard(tid)
                        acc_busy.discard(tid)
                        action_taken = force_close_or_recycle_tab(
                            port,
                            tid,
                            target_t.get("webSocketDebuggerUrl") or "",
                            allow_close_last=False,
                        )
                except Exception:
                    pass

        if project_id:
            self.release_account_for_project(project_id)

        # Quét dọn luôn các tab đã hoàn thành khác (nếu có) trên toàn bộ các tài khoản
        try:
            sweep_completed_and_idle_tabs_across_all_accounts()
        except Exception:
            pass

        return action_taken

    def _resolve_acc_cfg(self, thread_id: str = "", host_id: str = "", project_id: str = "") -> dict:
        if host_id and ":" in str(host_id):
            return get_account_config(str(host_id).split(":")[-1])
        if thread_id and thread_id in self._thread_to_acc:
            return get_account_config(self._thread_to_acc[thread_id])
        if project_id and project_id in self._project_to_acc:
            return get_account_config(self._project_to_acc[project_id])
        if project_id and project_id in GLOBAL_PROJECT_TO_ACC:
            return get_account_config(GLOBAL_PROJECT_TO_ACC[project_id])
        if host_id and str(host_id).startswith("acc_"):
            return get_account_config(host_id)
        return WEB_ACCOUNTS_CONFIG[0]

    def _get_or_create_tab_ws(
        self,
        thread_id: str = "",
        force_new_chat: bool = False,
        acc_id: str = "acc_1",
        project_id: str = "",
    ) -> tuple[str, str]:
        """
        Trả về `(tab_id, ws_url)` của Tab Chrome trên đúng Tài khoản `acc_id` (`Port 9222 / 9223 / 9224`) dành riêng cho `thread_id`.
        KHÓA CỨNG GIỚI HẠN TỐI ĐA 5 TAB MỞ TRÊN MỖI TÀI KHOẢN (`MAX_OPEN_TABS_PER_ACCOUNT = 5`):
        - Nếu `thread_id` đã có Tab đang mở tại `/c/{thread_id}`, tái sử dụng ngay lập tức (KHÔNG tải lại trang!).
        - Nếu cần mở đoạn chat mới hoặc quay lại 1 `thread_id` đã lưu của Agent trước đó mà tài khoản đã mở đủ 5 Tab:
          Tự động chọn Tab nhàn rỗi (không nằm trong `_active_busy_tabs` đang streaming) và điều hướng Tab đó tới
          `/c/{thread_id}` (hoặc `https://chatgpt.com/` cho chat mới), TUYỆT ĐỐI KHÔNG mở Tab thứ 6!
        """
        cfg = get_account_config(acc_id)
        aid = cfg["acc_id"]
        port = cfg["port"]
        ensure_chrome_debug_browser_open(open_chatgpt_home=False, acc_id=aid)

        with WEB_TAB_LOCK:
            acc_tab_map = self._thread_to_tab.setdefault(aid, {})
            acc_reserved = self._reserved_tab_ids.setdefault(aid, set())
            acc_busy = self._active_busy_tabs.setdefault(aid, set())

            tabs = _cdp_http_json("/json/list", timeout=5.0, port=port)
            page_tabs = [t for t in tabs if t.get("type") == "page" and t.get("webSocketDebuggerUrl")]

            # Nếu trình duyệt đang có nhiều hơn MAX_OPEN_TABS_PER_ACCOUNT (5 Tab), đóng bớt các tab không bận ngay lập tức
            if len(page_tabs) > MAX_OPEN_TABS_PER_ACCOUNT:
                idle_candidates = [t for t in page_tabs if t.get("id") not in acc_busy]
                idle_candidates.sort(key=lambda x: self._tab_last_used_ts.get(x.get("id"), 0.0))
                while len(page_tabs) > MAX_OPEN_TABS_PER_ACCOUNT and idle_candidates:
                    victim = idle_candidates.pop(0)
                    v_id = victim.get("id")
                    act = force_close_or_recycle_tab(port, v_id, victim.get("webSocketDebuggerUrl") or "", allow_close_last=False)
                    if act == "closed":
                        page_tabs = [pt for pt in page_tabs if pt.get("id") != v_id]
                        acc_reserved.discard(v_id)
                        for k_tid, k_tab in list(acc_tab_map.items()):
                            if k_tab == v_id:
                                acc_tab_map.pop(k_tid, None)

            def _pick_reusable_idle_tab() -> dict | None:
                # Ưu tiên 1: Tab vừa được giải phóng của chính project_id này (khi chuyển từ Skill A sang Skill B)
                pref_tab_id = self._reusable_project_tab.get(project_id) if project_id else None
                if pref_tab_id and pref_tab_id not in acc_busy:
                    for t in page_tabs:
                        if t.get("id") == pref_tab_id and t.get("webSocketDebuggerUrl"):
                            return t
                # Ưu tiên 2: Tab không nằm trong acc_busy và ít được dùng gần đây nhất (LRU)
                non_busy = [t for t in page_tabs if t.get("id") not in acc_busy and t.get("webSocketDebuggerUrl")]
                if not non_busy:
                    return None
                non_busy.sort(
                    key=lambda t: (
                        1 if t.get("id") in acc_reserved else 0,
                        self._tab_last_used_ts.get(t.get("id"), 0.0),
                    )
                )
                return non_busy[0]

            def _unbind_old_threads_from_tab(target_tab_id: str, keep_thread_id: str = ""):
                for k_tid, k_tab in list(acc_tab_map.items()):
                    if k_tab == target_tab_id and k_tid != keep_thread_id:
                        acc_tab_map.pop(k_tid, None)

            if thread_id and not force_new_chat:
                # 1. Tìm tab đang mở sẵn đúng URL /c/{thread_id}
                for t in page_tabs:
                    u = str(t.get("url", ""))
                    if f"/c/{thread_id}" in u and t.get("webSocketDebuggerUrl"):
                        acc_tab_map[thread_id] = t["id"]
                        self._thread_to_acc[thread_id] = aid
                        self._tab_last_used_ts[t["id"]] = time.time()
                        return t["id"], t["webSocketDebuggerUrl"]

                # 2. Nếu có tab đã gán cho thread_id này (và không bị luồng khác chiếm), điều hướng tới /c/{thread_id}
                mapped_tab_id = acc_tab_map.get(thread_id)
                if mapped_tab_id and mapped_tab_id not in acc_busy:
                    for t in page_tabs:
                        if t.get("id") == mapped_tab_id and t.get("webSocketDebuggerUrl"):
                            target_url = f"https://chatgpt.com/c/{thread_id}"
                            _eval_js_in_tab(
                                t["webSocketDebuggerUrl"],
                                f"window.location.href = {json.dumps(target_url)}; true;",
                                await_promise=False,
                            )
                            self._tab_last_used_ts[t["id"]] = time.time()
                            time.sleep(4.5)
                            return t["id"], t["webSocketDebuggerUrl"]

                # 3. Nếu có tab đang ở trang chủ https://chatgpt.com/ chưa gắn với hội thoại nào và chưa bận
                used_tab_ids = set(acc_tab_map.values()) | acc_reserved | acc_busy
                for t in page_tabs:
                    u = str(t.get("url", "")).rstrip("/")
                    if (
                        t.get("id") not in used_tab_ids
                        and u in ("https://chatgpt.com", "https://chatgpt.com/?model=auto")
                        and t.get("webSocketDebuggerUrl")
                    ):
                        target_url = f"https://chatgpt.com/c/{thread_id}"
                        acc_reserved.add(t["id"])
                        _unbind_old_threads_from_tab(t["id"], keep_thread_id=thread_id)
                        _eval_js_in_tab(
                            t["webSocketDebuggerUrl"],
                            f"window.location.href = {json.dumps(target_url)}; true;",
                            await_promise=False,
                        )
                        acc_tab_map[thread_id] = t["id"]
                        self._thread_to_acc[thread_id] = aid
                        self._tab_last_used_ts[t["id"]] = time.time()
                        time.sleep(4.5)
                        return t["id"], t["webSocketDebuggerUrl"]

                # 4. Nếu tài khoản ĐÃ MỞ ĐỦ 5 TAB (`len(page_tabs) >= MAX_OPEN_TABS_PER_ACCOUNT`), tái sử dụng Tab nhàn rỗi để quay lại `/c/{thread_id}`!
                if len(page_tabs) >= MAX_OPEN_TABS_PER_ACCOUNT:
                    reused_t = _pick_reusable_idle_tab()
                    if reused_t:
                        r_id = reused_t["id"]
                        target_url = f"https://chatgpt.com/c/{thread_id}"
                        _unbind_old_threads_from_tab(r_id, keep_thread_id=thread_id)
                        acc_reserved.add(r_id)
                        _eval_js_in_tab(
                            reused_t["webSocketDebuggerUrl"],
                            f"window.location.href = {json.dumps(target_url)}; true;",
                            await_promise=False,
                        )
                        acc_tab_map[thread_id] = r_id
                        self._thread_to_acc[thread_id] = aid
                        self._tab_last_used_ts[r_id] = time.time()
                        time.sleep(4.5)
                        return r_id, reused_t["webSocketDebuggerUrl"]

                # 5. Nếu tổng số Tab đang mở < 5 Tab, mở 1 Tab mới cho /c/{thread_id}
                target_url = f"https://chatgpt.com/c/{thread_id}"
                new_t = _cdp_http_json(f"/json/new?{target_url}", method="PUT", timeout=6.0, port=port)
                acc_reserved.add(new_t["id"])
                acc_tab_map[thread_id] = new_t["id"]
                self._thread_to_acc[thread_id] = aid
                self._tab_last_used_ts[new_t["id"]] = time.time()
                time.sleep(5.0)
                return new_t["id"], new_t["webSocketDebuggerUrl"]

            # Trường hợp tạo đoạn chat mới cho Skill/Agent tách riêng (force_new_chat=True hoặc chưa có thread_id):
            used_tab_ids = set(acc_tab_map.values()) | acc_reserved | acc_busy
            for t in page_tabs:
                u = str(t.get("url", "")).rstrip("/")
                is_home_url = (
                    u.startswith("https://chatgpt.com")
                    and "/c/" not in u
                    and "/auth/" not in u
                    and "/g/" not in u
                )
                if (
                    t.get("id") not in used_tab_ids
                    and is_home_url
                    and t.get("webSocketDebuggerUrl")
                ):
                    acc_reserved.add(t["id"])
                    self._tab_last_used_ts[t["id"]] = time.time()
                    return t["id"], t["webSocketDebuggerUrl"]

            for t in page_tabs:
                u = str(t.get("url", "")).strip()
                if t.get("id") not in used_tab_ids and u == "about:blank" and t.get("webSocketDebuggerUrl"):
                    acc_reserved.add(t["id"])
                    _eval_js_in_tab(
                        t["webSocketDebuggerUrl"],
                        "window.onbeforeunload = null; window.location.href = 'https://chatgpt.com/'; true;",
                        await_promise=False,
                    )
                    self._tab_last_used_ts[t["id"]] = time.time()
                    time.sleep(4.2)
                    return t["id"], t["webSocketDebuggerUrl"]

            # Nếu đã đạt giới hạn 5 Tab trên tài khoản (hoặc có Tab của Desk trước vừa giải phóng), tái sử dụng ngay Tab đó thay vì mở Tab mới!
            if len(page_tabs) >= MAX_OPEN_TABS_PER_ACCOUNT or (project_id and project_id in self._reusable_project_tab):
                reused_t = _pick_reusable_idle_tab()
                if reused_t:
                    r_id = reused_t["id"]
                    _unbind_old_threads_from_tab(r_id)
                    acc_reserved.add(r_id)
                    if project_id:
                        self._reusable_project_tab.pop(project_id, None)
                    _eval_js_in_tab(
                        reused_t["webSocketDebuggerUrl"],
                        "window.onbeforeunload = null; window.location.href = 'https://chatgpt.com/'; true;",
                        await_promise=False,
                    )
                    self._tab_last_used_ts[r_id] = time.time()
                    time.sleep(4.2)
                    return r_id, reused_t["webSocketDebuggerUrl"]

            new_t = _cdp_http_json("/json/new?https://chatgpt.com/", method="PUT", timeout=6.0, port=port)
            acc_reserved.add(new_t["id"])
            self._tab_last_used_ts[new_t["id"]] = time.time()
            time.sleep(4.5)
            return new_t["id"], new_t["webSocketDebuggerUrl"]

    def _inject_and_send_prompt_on_ws(self, ws_url: str, prompt: str) -> dict:
        """
        Bơm toàn bộ Prompt (dù dài 80.000 ký tự) vào `.ProseMirror[contenteditable="true"]` / `#prompt-textarea`
        trên Tab Web theo từng cụm dòng mượt mà (không tạo chip đính kèm, không treo renderer) và bấm nút Gửi (`aria-label="Send"`).
        Đợi đến khi URL chuyển thành `/c/{conversation_id}` (nếu là đoạn chat mới) và trả về `{ok, thread_id, url}`.
        """
        js_send = f"""
        (async () => {{
            const promptText = {json.dumps(prompt)};
            function findComposerBox() {{
                return document.querySelector('#prompt-textarea')
                    || document.querySelector('.ProseMirror[contenteditable="true"]')
                    || document.querySelector('[role="textbox"][contenteditable="true"]');
            }}
            function findStopButton() {{
                return document.querySelector('button[data-testid="stop-button"]')
                    || document.querySelector('form button[aria-label*="Stop"]')
                    || document.querySelector('button[aria-label*="Stop streaming"]');
            }}
            function findSendButton() {{
                return document.querySelector('button[data-testid="send-button"]')
                    || document.querySelector('form button[aria-label="Send"]')
                    || document.querySelector('form button[aria-label*="Send prompt"]')
                    || document.querySelector('form button[type="submit"]');
            }}

            // Đợi ô nhập liệu xuất hiện (tối đa 18s)
            let el = null;
            for (let i = 0; i < 36; i++) {{
                el = findComposerBox();
                if (el) break;
                await new Promise(r => setTimeout(r, 500));
            }}
            if (!el) {{
                return JSON.stringify({{ error: 'Không tìm thấy ô nhập liệu (.ProseMirror / #prompt-textarea) trên trang ChatGPT Web (kiểm tra đã đăng nhập chưa)!' }});
            }}

            // Nếu đang còn nút Stop (lượt trước chưa đóng hẳn), đợi tối đa 8s
            for (let i = 0; i < 16; i++) {{
                if (!findStopButton()) break;
                await new Promise(r => setTimeout(r, 500));
            }}

            function focusAndSelectComposer(box) {{
                if (!box) return;
                try {{
                    box.focus();
                    const sel = window.getSelection();
                    if (sel) {{
                        const range = document.createRange();
                        range.selectNodeContents(box);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }}
                }} catch (e) {{}}
            }}

            // Đảm bảo nút chọn mức độ suy nghĩ (Thinking effort / Select ChatGPT model) luôn khóa chuẩn ở Medium
            try {{
                const modelBtn = document.querySelector('button[aria-label="Select ChatGPT model"]');
                if (modelBtn && !(modelBtn.innerText || '').toLowerCase().includes('medium')) {{
                    modelBtn.click();
                    await new Promise(r => setTimeout(r, 250));
                    const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="option"]'));
                    const medItem = items.find(x => (x.innerText || '').toLowerCase().includes('medium'));
                    if (medItem) {{
                        medItem.click();
                        await new Promise(r => setTimeout(r, 200));
                    }} else {{
                        document.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', bubbles: true }}));
                        document.body.click();
                    }}
                }}
            }} catch (e) {{}}

            // Xóa sạch mọi chip đính kèm cũ hoặc chữ nháp còn sót trong ô nhập
            Array.from(document.querySelectorAll('form button')).filter(
                b => (b.getAttribute('aria-label') || '').includes('Remove pasted text')
            ).forEach(b => b.click());
            focusAndSelectComposer(el);
            if ((el.innerText || '').trim().length > 0) {{
                try {{
                    const sel = window.getSelection();
                    if (sel) {{
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }}
                    document.execCommand('delete', false, null);
                }} catch (e) {{}}
                await new Promise(r => setTimeout(r, 120));
            }}

            const prevUrlPath = window.location.pathname;

            if (el.tagName === 'TEXTAREA') {{
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                nativeSetter.call(el, promptText);
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }} else {{
                // Nếu prompt <= 12.000 ký tự: chia cụm dán inline.
                // Nếu prompt > 12.000 ký tự (như Bước 4A): dán trực tiếp 1 lần phần thân + 1 lần dòng tiêu đề đầu.
                focusAndSelectComposer(el);
                if (promptText.length > 12000) {{
                    const headLine = promptText.slice(0, 1200) + '\\n\\n[xem toàn bộ nội dung đính kèm bên dưới]';
                    const dtHead = new DataTransfer();
                    dtHead.setData('text/plain', headLine);
                    el.dispatchEvent(new ClipboardEvent('paste', {{ clipboardData: dtHead, bubbles: true, cancelable: true }}));
                    await new Promise(r => setTimeout(r, 40));
                    const dtFull = new DataTransfer();
                    dtFull.setData('text/plain', promptText);
                    el.dispatchEvent(new ClipboardEvent('paste', {{ clipboardData: dtFull, bubbles: true, cancelable: true }}));
                }} else {{
                    const lines = promptText.split('\\n');
                    const chunks = [];
                    let cur = [];
                    let curLen = 0;
                    for (const ln of lines) {{
                        if (cur.length >= 45 || (curLen + ln.length) > 3200) {{
                            chunks.push(cur.join('\\n') + '\\n');
                            cur = [];
                            curLen = 0;
                        }}
                        cur.push(ln);
                        curLen += ln.length + 1;
                    }}
                    if (cur.length > 0) chunks.push(cur.join('\\n'));
                    for (const ch of chunks) {{
                        const dt = new DataTransfer();
                        dt.setData('text/plain', ch);
                        el.dispatchEvent(new ClipboardEvent('paste', {{ clipboardData: dt, bubbles: true, cancelable: true }}));
                        await new Promise(r => setTimeout(r, 15));
                    }}
                }}

                // Kiểm tra xem chữ/chip đính kèm đã thực sự vào ô nhập chưa (tránh trường hợp cửa sổ Chrome chạy ngầm mất focus khiến paste bị bỏ qua)
                await new Promise(r => setTimeout(r, 90));
                let checkBox = findComposerBox() || el;
                let insertedLen = (checkBox.innerText || '').trim().length;
                let hasAttachNow = Array.from(document.querySelectorAll('form button')).some(
                    b => (b.getAttribute('aria-label') || '').includes('Remove pasted text')
                );
                if (insertedLen < 3 && !hasAttachNow) {{
                    focusAndSelectComposer(checkBox);
                    try {{
                        const stepSize = 4500;
                        for (let pos = 0; pos < promptText.length; pos += stepSize) {{
                            document.execCommand('insertText', false, promptText.slice(pos, pos + stepSize));
                            await new Promise(r => setTimeout(r, 15));
                        }}
                    }} catch (e) {{}}
                    await new Promise(r => setTimeout(r, 90));
                    checkBox = findComposerBox() || el;
                    insertedLen = (checkBox.innerText || '').trim().length;
                }}
                if (insertedLen < 3 && !hasAttachNow) {{
                    try {{
                        focusAndSelectComposer(checkBox);
                        checkBox.innerHTML = '';
                        const pNode = document.createElement('p');
                        pNode.textContent = promptText;
                        checkBox.appendChild(pNode);
                        checkBox.dispatchEvent(new InputEvent('beforeinput', {{ bubbles: true, cancelable: true, inputType: 'insertText', data: promptText }}));
                        checkBox.dispatchEvent(new InputEvent('input', {{ bubbles: true, inputType: 'insertText', data: promptText }}));
                    }} catch (e) {{}}
                    await new Promise(r => setTimeout(r, 100));
                }}
            }}

            // Chờ nút Send kích hoạt và bấm lặp lại cho tới khi ô nhập thực sự gửi đi (ô trống & hết chip đính kèm hoặc hiện nút Stop SAU KHI đã bấm Send)
            let sentConfirmed = false;
            let clickedSendOnce = false;
            for (let s = 0; s < 28; s++) {{
                await new Promise(r => setTimeout(r, 350));
                const stopNow = findStopButton();
                const curBox = findComposerBox();
                const curTextLen = curBox ? (curBox.innerText || '').trim().length : 0;
                const hasAttachment = Array.from(document.querySelectorAll('form button')).some(
                    b => (b.getAttribute('aria-label') || '').includes('Remove pasted text')
                );
                const urlChangedToConv = (window.location.pathname !== prevUrlPath) && window.location.pathname.includes('/c/');
                if (stopNow || urlChangedToConv || (clickedSendOnce && curTextLen === 0 && !hasAttachment)) {{
                    sentConfirmed = true;
                    break;
                }}
                const sendBtn = findSendButton();
                if (sendBtn && !sendBtn.disabled) {{
                    sendBtn.click();
                    clickedSendOnce = true;
                }} else if (s >= 4 && (curTextLen > 0 || hasAttachment)) {{
                    if (curBox) focusAndSelectComposer(curBox);
                    const enterEvt = new KeyboardEvent('keydown', {{
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    }});
                    (curBox || el).dispatchEvent(enterEvt);
                    clickedSendOnce = true;
                }}
            }}
            if (!sentConfirmed) {{
                return JSON.stringify({{ error: 'Nút Send chưa gửi được tin nhắn đi sau 28 lần thử, sẽ tự động thử lại!' }});
            }}

            // Chờ URL cập nhật sang /c/<uuid> (nếu là đoạn chat mới)
            let convId = '';
            for (let w = 0; w < 30; w++) {{
                const m = window.location.pathname.match(/\\/c\\/([0-9a-fA-F\\-]{{20,}})/);
                if (m) {{
                    convId = m[1];
                    break;
                }}
                await new Promise(r => setTimeout(r, 500));
            }}
            return JSON.stringify({{
                ok: true,
                thread_id: convId,
                url: window.location.href
            }});
        }})()
        """
        try:
            raw = _eval_js_in_tab(ws_url, js_send, await_promise=True, timeout=60.0)
        except Exception as e:
            return {"error": f"WebSocket eval error: {e}"}
        if not raw:
            return {"error": "Không nhận được phản hồi từ Tab trình duyệt khi gửi lệnh"}
        try:
            return json.loads(raw)
        except Exception:
            return {"error": str(raw)}

    def create_story_thread(
        self,
        title_label: str,
        prompt: str,
        thinking: str = "medium",
        project_id: str = "",
    ) -> tuple[str, str]:
        """
        Mở 1 Tab mới (hoặc tái sử dụng Tab nhàn rỗi trong giới hạn tối đa 5 Tab/Acc) trên tài khoản ChatGPT đã được phân bổ
        cho `project_id` (`Acc #1`, `Acc #2` hoặc `Acc #3`), gửi Prompt đầu tiên và lấy `conversation_id` (`/c/{uuid}`)!
        """
        acc_cfg = self.acquire_account_for_project(project_id) if project_id else self._resolve_acc_cfg(project_id=project_id)
        aid = acc_cfg["acc_id"]
        tab_id, ws_url = self._get_or_create_tab_ws(thread_id="", force_new_chat=True, acc_id=aid, project_id=project_id)
        res = {}
        for attempt in range(4):
            if attempt > 0:
                with WEB_TAB_LOCK:
                    self._reserved_tab_ids.setdefault(aid, set()).discard(tab_id)
                    self._active_busy_tabs.setdefault(aid, set()).discard(tab_id)
                tab_id, ws_url = self._get_or_create_tab_ws(thread_id="", force_new_chat=True, acc_id=aid, project_id=project_id)
            with WEB_TAB_LOCK:
                self._active_busy_tabs.setdefault(aid, set()).add(tab_id)
                self._tab_last_used_ts[tab_id] = time.time()
            res = self._inject_and_send_prompt_on_ws(ws_url, prompt)
            if "error" not in res and res.get("ok"):
                tid = res.get("thread_id") or f"webtab_{aid}_{tab_id}"
                with WEB_TAB_LOCK:
                    self._thread_to_tab.setdefault(aid, {})[tid] = tab_id
                    self._thread_to_acc[tid] = aid
                    self._tab_last_used_ts[tab_id] = time.time()
                self._last_sent_prompt[tid] = prompt
                return tid, f"chatgpt_web:{aid}"
            with WEB_TAB_LOCK:
                self._active_busy_tabs.setdefault(aid, set()).discard(tab_id)
            time.sleep(3.5)
        raise RuntimeError(
            f"Không thể gửi lệnh trên Tab ChatGPT Web [{acc_cfg['label']} - Port {acc_cfg['port']}] "
            f"(hãy kiểm tra đã đăng nhập {acc_cfg['label']} tại https://chatgpt.com chưa): {res}"
        )

    def send_message(self, thread_id: str, host_id: str, prompt: str, thinking: str = "medium", project_id: str = "") -> dict:
        """
        Gửi tin nhắn tiếp theo ngay trên đúng Tab Chrome của Tài khoản đang giữ `thread_id` (hoặc điều hướng lại từ Kho Agent đã lưu).
        """
        acc_cfg = self._resolve_acc_cfg(thread_id=thread_id, host_id=host_id, project_id=project_id)
        aid = acc_cfg["acc_id"]
        self._last_sent_prompt[thread_id] = prompt
        tab_id, ws_url = self._get_or_create_tab_ws(thread_id=thread_id, force_new_chat=False, acc_id=aid, project_id=project_id)
        res = {}
        for attempt in range(4):
            if attempt > 0:
                with WEB_TAB_LOCK:
                    self._active_busy_tabs.setdefault(aid, set()).discard(tab_id)
                tab_id, ws_url = self._get_or_create_tab_ws(thread_id=thread_id, force_new_chat=False, acc_id=aid, project_id=project_id)
            with WEB_TAB_LOCK:
                self._active_busy_tabs.setdefault(aid, set()).add(tab_id)
                self._tab_last_used_ts[tab_id] = time.time()
            res = self._inject_and_send_prompt_on_ws(ws_url, prompt)
            if "error" not in res and res.get("ok"):
                real_tid = res.get("thread_id") or thread_id
                with WEB_TAB_LOCK:
                    self._thread_to_tab.setdefault(aid, {})[real_tid] = tab_id
                    self._thread_to_acc[real_tid] = aid
                    self._tab_last_used_ts[tab_id] = time.time()
                return {"result": {"success": True, "threadId": real_tid, "accountId": aid}}
            with WEB_TAB_LOCK:
                self._active_busy_tabs.setdefault(aid, set()).discard(tab_id)
            time.sleep(4.5)
        return {"error": f"send_message on ChatGPT Web [{acc_cfg['label']}] tab failed: {res}"}

    def read_full_thread(self, thread_id: str, host_id: str = "chatgpt_web") -> dict:
        """
        Thu hoạch toàn bộ các lượt hội thoại (`turns`) ngay từ Tab trình duyệt của `thread_id` trên đúng Tài khoản (`Acc #1..#3`):
        - Tầng 1: Gọi `/backend-api/conversation/{thread_id}` trực tiếp bên trong ngữ cảnh Tab (có đầy đủ Cookie + Bearer Token)
          để lấy 100% văn bản Markdown gốc chính xác từng ký tự.
        - Tầng 2 (Dự phòng tức thời): Đọc trực tiếp toàn bộ các thẻ `[data-message-author-role]` trên DOM của Tab.
        """
        if not thread_id:
            return {"turns": []}
        acc_cfg = self._resolve_acc_cfg(thread_id=thread_id, host_id=host_id)
        aid = acc_cfg["acc_id"]
        try:
            _, ws_url = self._get_or_create_tab_ws(thread_id=thread_id, force_new_chat=False, acc_id=aid)
        except Exception:
            return self._last_known_turns.get(thread_id, {"turns": []})

        js_harvest = f"""
        (async () => {{
            const targetConvId = {json.dumps(thread_id)};
            const mUrl = window.location.pathname.match(/\\/c\\/([0-9a-fA-F\\-]{{20,}})/);
            const convId = (mUrl && mUrl[1]) ? mUrl[1] : (targetConvId.startsWith('webtab_') ? '' : targetConvId);

            const turnStates = Array.from(document.querySelectorAll('[data-talvt-turn-state]')).map(e => e.getAttribute('data-talvt-turn-state'));
            const hasIncompleteTurn = turnStates.some(s => s && s !== 'complete');
            const isStopBtnVisible = Boolean(
                document.querySelector('button[data-testid="stop-button"]') ||
                document.querySelector('form button[aria-label*="Stop"]') ||
                document.querySelector('button[aria-label*="Stop streaming"]') ||
                document.querySelector('.result-streaming') ||
                hasIncompleteTurn
            );

            // 1. Thử lấy từ /backend-api/conversation/<convId> khi đã dừng streaming (hoặc để đối chiếu đầy đủ)
            if (convId && !isStopBtnVisible) {{
                try {{
                    if (!window.__studioAccessToken) {{
                        const sr = await fetch('/api/auth/session', {{ credentials: 'include' }});
                        if (sr.ok) {{
                            const sd = await sr.json();
                            if (sd && sd.accessToken) window.__studioAccessToken = sd.accessToken;
                        }}
                    }}
                    if (window.__studioAccessToken) {{
                        const cr = await fetch('/backend-api/conversation/' + convId, {{
                            credentials: 'include',
                            headers: {{
                                'Authorization': 'Bearer ' + window.__studioAccessToken,
                                'Accept': 'application/json'
                            }}
                        }});
                        if (cr.ok) {{
                            const conv = await cr.json();
                            const mapping = conv.mapping || {{}};
                            let cur = conv.current_node;
                            const chain = [];
                            const seen = new Set();
                            while (cur && !seen.has(cur) && mapping[cur]) {{
                                seen.add(cur);
                                chain.push(mapping[cur]);
                                cur = mapping[cur].parent;
                            }}
                            chain.reverse();
                            const turnsChrono = [];
                            for (const nd of chain) {{
                                const msg = nd.message;
                                if (!msg || (msg.metadata && msg.metadata.is_visually_hidden_from_conversation)) continue;
                                const role = (msg.author && msg.author.role) || '';
                                const content = msg.content || {{}};
                                const ctype = content.content_type || '';
                                const parts = Array.isArray(content.parts) ? content.parts.filter(p => typeof p === 'string') : [];
                                const txt = parts.join('\\n').trim();
                                if (role === 'user' && (ctype === 'text' || ctype === 'multimodal_text') && txt) {{
                                    turnsChrono.push({{
                                        id: msg.id || nd.id,
                                        user_text: txt,
                                        agent_texts: [],
                                        status: 'completed'
                                    }});
                                }} else if (turnsChrono.length > 0 && role === 'assistant' && (ctype === 'text' || ctype === 'multimodal_text')) {{
                                    const rec = msg.recipient || 'all';
                                    const ch = msg.channel || 'final';
                                    if ((rec === 'all' || !msg.recipient) && (ch === 'final' || !msg.channel) && txt) {{
                                        turnsChrono[turnsChrono.length - 1].agent_texts.push(txt);
                                        if (msg.status && msg.status !== 'finished_successfully') {{
                                            turnsChrono[turnsChrono.length - 1].status = 'running';
                                        }}
                                    }}
                                }}
                            }}
                            if (turnsChrono.length > 0) {{
                                const synth = [];
                                for (let i = turnsChrono.length - 1; i >= 0; i--) {{
                                    const t = turnsChrono[i];
                                    const items = [];
                                    if (t.user_text) items.push({{ type: 'userMessage', text: t.user_text }});
                                    const joinedA = t.agent_texts.join('\\n\\n').trim();
                                    if (joinedA) items.push({{ type: 'agentMessage', text: joinedA }});
                                    synth.push({{
                                        id: t.id,
                                        status: (i === turnsChrono.length - 1 && isStopBtnVisible) ? 'running' : t.status,
                                        items: items
                                    }});
                                }}
                                return JSON.stringify({{ source: 'backend_in_tab', conv_id: convId, turns: synth }});
                            }}
                        }}
                    }}
                }} catch (e) {{}}
            }}

            // 2. Đọc trực tiếp từ DOM của Tab (Nhanh 0ms, không tốn bất kỳ HTTP request nào!)
            function domToMarkdown(root) {{
                if (!root) return '';
                const clone = root.cloneNode(true);
                clone.querySelectorAll('button, svg, style, script').forEach(el => el.remove());
                clone.querySelectorAll('h1').forEach(el => el.replaceWith('\\n# ' + el.innerText.trim() + '\\n'));
                clone.querySelectorAll('h2').forEach(el => el.replaceWith('\\n## ' + el.innerText.trim() + '\\n'));
                clone.querySelectorAll('h3').forEach(el => el.replaceWith('\\n### ' + el.innerText.trim() + '\\n'));
                clone.querySelectorAll('strong, b').forEach(el => el.replaceWith('**' + el.innerText + '**'));
                clone.querySelectorAll('li').forEach(el => el.replaceWith('\\n- ' + el.innerText.trim()));
                return (clone.innerText || '').trim();
            }}

            const turnNodes = Array.from(document.querySelectorAll('[data-turn-key]'));
            const synthDom = [];
            if (turnNodes.length > 0) {{
                for (let i = turnNodes.length - 1; i >= 0; i--) {{
                    const tNode = turnNodes[i];
                    const items = [];
                    const uNode = tNode.querySelector('[data-user-message-bubble="true"], [data-message-author-role="user"]');
                    if (uNode) items.push({{ type: 'userMessage', text: (uNode.innerText || '').trim() }});
                    const cloneT = tNode.cloneNode(true);
                    cloneT.querySelectorAll('[data-user-message-bubble="true"], [data-message-author-role="user"], h4').forEach(e => e.remove());
                    const mdTxt = domToMarkdown(cloneT);
                    if (mdTxt) items.push({{ type: 'agentMessage', text: mdTxt }});
                    const tStateEl = tNode.querySelector('[data-talvt-turn-state]');
                    const tState = tStateEl ? tStateEl.getAttribute('data-talvt-turn-state') : 'complete';
                    const isLast = (i === turnNodes.length - 1);
                    const st = (isLast && (isStopBtnVisible || tState !== 'complete')) ? 'running' : 'completed';
                    synthDom.push({{
                        id: tNode.getAttribute('data-turn-key') || ('dom_turn_' + (i + 1)),
                        status: st,
                        items: items
                    }});
                }}
            }} else {{
                const userEls = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-user-message-bubble="true"]'));
                const asstEls = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], [data-chatgpt-selection-message-id]'));
                const count = Math.max(userEls.length, asstEls.length);
                for (let i = count - 1; i >= 0; i--) {{
                    const items = [];
                    if (userEls[i]) items.push({{ type: 'userMessage', text: (userEls[i].innerText || '').trim() }});
                    if (asstEls[i]) {{
                        const mdNode = asstEls[i].querySelector('.markdown') || asstEls[i];
                        const mdTxt = domToMarkdown(mdNode);
                        if (mdTxt) items.push({{ type: 'agentMessage', text: mdTxt }});
                    }}
                    const isLast = (i === count - 1);
                    const st = (isLast && (isStopBtnVisible || !asstEls[i])) ? 'running' : 'completed';
                    synthDom.push({{
                        id: 'dom_turn_' + (i + 1),
                        status: st,
                        items: items
                    }});
                }}
            }}
            return JSON.stringify({{ source: 'dom_live', conv_id: convId, turns: synthDom }});
        }})()
        """
        try:
            raw = _eval_js_in_tab(ws_url, js_harvest, await_promise=True, timeout=25.0)
            parsed = json.loads(raw) if isinstance(raw, str) and raw.strip().startswith("{") else {"turns": []}
            out = {
                "_verified_live": True,
                "thread": {"id": parsed.get("conv_id") or thread_id, "kind": "chatgpt_web", "account_id": aid},
                "turns": parsed.get("turns") or [],
            }
            if out["turns"]:
                self._last_known_turns[thread_id] = out
            return out
        except Exception:
            return self._last_known_turns.get(thread_id, {"turns": []})

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
        Theo dõi trực tiếp trên Tab trình duyệt Web của đúng Tài khoản (`Acc #1`, `Acc #2`, `Acc #3`):
        - Cứ mỗi 3.5 giây kiểm tra DOM của Tab xem nút `stop-button` đã tắt chưa và độ dài chữ đang gõ là bao nhiêu.
        - Ngay khi `stop-button` biến mất và văn bản ổn định, thu hoạch 100% văn bản Markdown gốc!
        """
        main_mod = sys.modules.get("__main__")
        if main_mod and hasattr(main_mod, "PROJECTS_ROOT") and hasattr(main_mod, "log_msg"):
            PROJECTS_ROOT = getattr(main_mod, "PROJECTS_ROOT")
            write_json_file = getattr(main_mod, "write_json_file")
            log_msg = getattr(main_mod, "log_msg")
        else:
            from engine.mafia_chatgpt_pipeline import PROJECTS_ROOT, write_json_file, log_msg

        acc_cfg = self._resolve_acc_cfg(thread_id=thread_id, host_id=host_id, project_id=project_id)
        aid = acc_cfg["acc_id"]
        acc_label = acc_cfg["label"]

        proj_dir = os.path.join(PROJECTS_ROOT, project_id)
        if not os.path.exists(proj_dir):
            alt_h = os.path.join(STUDIO_WEB_ROOT, "PROJECTS_HOMELESS", project_id)
            alt_m = os.path.join(STUDIO_WEB_ROOT, "PROJECTS", project_id)
            if os.path.exists(alt_h):
                proj_dir = alt_h
            elif os.path.exists(alt_m):
                proj_dir = alt_m

        st_path = os.path.join(proj_dir, "STATE.json")
        start_t = time.time()
        last_log_t = 0.0
        last_state_t = 0.0
        stable_hits = 0
        last_char_len = 0

        def _update_live_note(note_txt: str, elapsed_s: float):
            if os.path.exists(st_path):
                try:
                    st_obj = json.load(open(st_path, encoding="utf-8"))
                    st_obj["account_id"] = aid
                    st_obj["account_label"] = acc_label
                    st_obj["live_note"] = note_txt
                    st_obj["elapsed_sec"] = elapsed_s
                    st_obj["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    write_json_file(st_path, st_obj)
                except Exception:
                    pass

        time.sleep(3.0)
        tab_id, ws_url = self._get_or_create_tab_ws(thread_id=thread_id, force_new_chat=False, acc_id=aid, project_id=project_id)
        with WEB_TAB_LOCK:
            self._active_busy_tabs.setdefault(aid, set()).add(tab_id)
            self._tab_last_used_ts[tab_id] = time.time()

        try:
            while (time.time() - start_t) < timeout_sec:
                elapsed = round(time.time() - start_t, 1)
                if not os.path.exists(proj_dir):
                    raise RuntimeError(f"Dự án [{project_id}] đã bị xóa khỏi hàng đợi.")

                js_quick_status = """
                (() => {
                    try {
                        const scroller = document.querySelector('[class*="react-scroll-to-bottom"], main [class*="overflow-y-auto"]') || document.scrollingElement;
                        if (scroller) scroller.scrollTop = scroller.scrollHeight;
                        window.scrollTo(0, document.body.scrollHeight);
                    } catch (e) {}
                    const turnStates = Array.from(document.querySelectorAll('[data-talvt-turn-state]')).map(e => e.getAttribute('data-talvt-turn-state'));
                    const hasIncompleteTurn = turnStates.some(s => s && s !== 'complete');
                    const stopBtn = Boolean(
                        document.querySelector('button[data-testid="stop-button"]') ||
                        document.querySelector('form button[aria-label*="Stop"]') ||
                        document.querySelector('button[aria-label*="Stop streaming"]') ||
                        document.querySelector('.result-streaming') ||
                        hasIncompleteTurn
                    );
                    const turnNodes = Array.from(document.querySelectorAll('[data-turn-key]'));
                    if (turnNodes.length > 0) {
                        const lastT = turnNodes[turnNodes.length - 1];
                        const asstNodes = lastT.querySelectorAll('[data-message-author-role="assistant"], .markdown, .prose');
                        let charLen = 0;
                        if (asstNodes.length > 0) {
                            asstNodes.forEach(n => { charLen += (n.innerText || n.textContent || '').trim().length; });
                        } else {
                            const uBubble = lastT.querySelector('[data-user-message-bubble="true"], [data-message-author-role="user"]');
                            const uLen = uBubble ? (uBubble.innerText || uBubble.textContent || '').trim().length : 0;
                            const totalLen = (lastT.innerText || lastT.textContent || '').trim().length;
                            charLen = Math.max(0, totalLen - uLen);
                        }
                        const asstCount = charLen > 15 ? turnNodes.length : Math.max(0, turnNodes.length - 1);
                        return JSON.stringify({
                            streaming: stopBtn,
                            asst_count: asstCount,
                            user_count: turnNodes.length,
                            char_len: charLen
                        });
                    }
                    const asstEls = document.querySelectorAll('[data-message-author-role="assistant"], [data-chatgpt-selection-message-id]');
                    const userEls = document.querySelectorAll('[data-message-author-role="user"], [data-user-message-bubble="true"]');
                    const lastAsst = asstEls.length > 0 ? asstEls[asstEls.length - 1] : null;
                    const charLen = lastAsst ? (lastAsst.innerText || lastAsst.textContent || '').trim().length : 0;
                    return JSON.stringify({
                        streaming: stopBtn,
                        asst_count: asstEls.length,
                        user_count: userEls.length,
                        char_len: charLen
                    });
                })()
                """
                try:
                    raw_st = _eval_js_in_tab(ws_url, js_quick_status, await_promise=False, timeout=8.0)
                    dom_st = json.loads(raw_st) if isinstance(raw_st, str) and raw_st.strip().startswith("{") else {}
                except Exception:
                    dom_st = {}

                is_streaming = bool(dom_st.get("streaming"))
                cur_chars = int(dom_st.get("char_len") or 0)
                with WEB_TAB_LOCK:
                    self._tab_last_used_ts[tab_id] = time.time()

                if time.time() - last_state_t >= 4.0:
                    last_state_t = time.time()
                    _update_live_note(
                        f"🌐 [{acc_label} - Tab Web Riêng] ChatGPT đang viết [{step_label}]: đã gõ {cur_chars:,} ký tự ({int(elapsed)}s)...",
                        elapsed,
                    )
                if time.time() - last_log_t >= 25.0:
                    last_log_t = time.time()
                    log_msg(
                        project_id,
                        f"🌐 [{acc_label} | {step_label}] Tab Web đang gõ trực tiếp... ({cur_chars:,} ký tự | {elapsed}s)",
                    )

                if not is_streaming and (cur_chars > 40 or elapsed >= 12.0):
                    if cur_chars == last_char_len:
                        stable_hits += 1
                    else:
                        stable_hits = 1
                        last_char_len = cur_chars

                    if stable_hits >= 2:
                        data = self.read_full_thread(thread_id, host_id)
                        turns = data.get("turns", [])
                        if len(turns) >= expected_min_turns and turns:
                            latest_turn = turns[0]
                            if latest_turn.get("status") != "running":
                                texts = [
                                    it["text"]
                                    for it in latest_turn.get("items", [])
                                    if it.get("type") == "agentMessage" and it.get("text")
                                ]
                                full_text = "\n\n".join(texts).strip()
                                if len(full_text) > 40:
                                    done_note = f"✅ [{acc_label} - Tab Web] Hoàn tất [{step_label}] sau {elapsed}s (Nhận {len(full_text):,} ký tự | Turn #{len(turns)})"
                                    _update_live_note(done_note, elapsed)
                                    log_msg(
                                        project_id,
                                        f"✅ [{acc_label} - {step_label}] Hoàn tất sau {elapsed}s (Độ dài phản hồi: {len(full_text):,} ký tự | Tổng số Turn: {len(turns)})",
                                    )
                                    return full_text, data
                        stable_hits = 0
                else:
                    stable_hits = 0
                    last_char_len = cur_chars

                time.sleep(3.5)

            raise TimeoutError(f"[{project_id}] Quá thời gian chờ ({timeout_sec}s) tại bước [{step_label}] trên Tab ChatGPT Web [{acc_label}]")
        finally:
            with WEB_TAB_LOCK:
                self._active_busy_tabs.setdefault(aid, set()).discard(tab_id)
                self._tab_last_used_ts[tab_id] = time.time()

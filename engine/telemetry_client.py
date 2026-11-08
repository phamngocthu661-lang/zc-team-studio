# -*- coding: utf-8 -*-
"""
================================================================================
📡 ZC TEAM — HỆ THỐNG THU THẬP LOG/LỖI TỪ XA & NHẬN LỆNH ĐIỀU KHIỂN (TELEMETRY CLIENT)
================================================================================
Chức năng chính:
1. Tự động bắt mọi lỗi (Exception, Traceback, ❌, PAUSED_CHECKPOINT, AUTO-HEAL)
   từ Bàn #1 -> Bàn #7 (`mafia_chatgpt_pipeline.py`, `chatgpt_web_client.py`,
   `mafia_dashboard_server.py`) kèm 80 dòng cuối của `LIVE_STUDIO_LOG.txt` và `STATE.json`.
2. Nén dữ liệu (`zlib + base64url`) thành gói `VBSTEL.<payload>` và gửi bất đồng bộ
   về Máy Chủ Admin qua kênh đám mây HTTPS IPv4 (`ntfy.sh`) + Bridge (`Port 3999`).
3. Hỗ trợ đẩy toàn bộ Snapshot Log & Trạng thái Hàng đợi (`upload_full_diagnostics_snapshot`)
   khi Máy Chủ Admin yêu cầu từ xa (`UPLOAD_FULL_DIAGNOSTICS`).
================================================================================
"""

import base64
import hashlib
import json
import os
import platform
import sys
import threading
import time
import traceback
import urllib.request
import zlib
from datetime import datetime

TELEMETRY_REPORT_TOPIC = "vbs_telemetry_err_7c8e07da14a8_v1"
REMOTE_COMMAND_TOPIC = "vbs_remote_cmd_7c8e07da14a8_v1"
BRIDGE_TELEMETRY_URL = "http://127.0.0.1:3999/api/bridge/telemetry-report"

_TELEMETRY_LOCK = threading.RLock()
_RECENT_ERROR_HASHES = {}  # hash -> timestamp (chống gửi trùng cùng 1 lỗi liên tục trong 45s)
_LAST_HEARTBEAT_TS = 0.0


def _resolve_studio_root() -> str:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if os.path.basename(here).lower() == "app" and os.path.basename(os.path.dirname(here)).lower() == "resources":
        outer = os.path.dirname(os.path.dirname(here))
        if (
            os.path.exists(os.path.join(outer, "Video Batch Studio.exe"))
            or os.path.exists(os.path.join(outer, "Kho_Green"))
            or os.path.exists(os.path.join(outer, "data"))
        ):
            return outer
    return here


STUDIO_ROOT = _resolve_studio_root()
CODE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_version_info() -> dict:
    for cand in (
        os.path.join(CODE_ROOT, "version.json"),
        os.path.join(STUDIO_ROOT, "version.json"),
    ):
        if os.path.exists(cand):
            try:
                with open(cand, "r", encoding="utf-8") as f:
                    return json.load(f) or {}
            except Exception:
                pass
    return {"version": "V1.0.22", "build_number": 136}


def get_client_identity() -> dict:
    """Lấy thông tin định danh Máy Khách (Mã Máy, Tên Khách, Key ID, Phiên bản App)."""
    hwid = "UNKNOWN"
    customer = "Khách hàng"
    key_id = ""
    lic_status = "UNKNOWN"
    try:
        eng_dir = os.path.dirname(os.path.abspath(__file__))
        if eng_dir not in sys.path:
            sys.path.insert(0, eng_dir)
        from license_manager import get_machine_hwid, verify_current_machine_license
        hwid = get_machine_hwid()
        lic = verify_current_machine_license(force_cloud_check=False)
        customer = str(lic.get("customer_name") or "Khách hàng").strip()
        key_id = str(lic.get("key_id") or "").strip()
        lic_status = str(lic.get("status") or "ACTIVE").strip()
    except Exception:
        try:
            appdata = os.environ.get("APPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Roaming")
            af = os.path.join(appdata, "VideoBatchStudio-License", "license-active.json")
            if os.path.exists(af):
                d = json.load(open(af, encoding="utf-8"))
                hwid = str(d.get("machineId") or hwid)
                customer = str(d.get("customer") or customer)
                key_id = str(d.get("keyId") or key_id)
        except Exception:
            pass

    ver = _load_version_info()
    return {
        "machine_id": hwid,
        "customer": customer,
        "key_id": key_id,
        "license_status": lic_status,
        "version": str(ver.get("version") or "V1.0.22"),
        "build_number": int(ver.get("build_number") or 136),
        "hostname": platform.node(),
        "os": f"{platform.system()} {platform.release()}",
        "studio_root": STUDIO_ROOT,
    }


def _read_tail_lines(file_path: str, max_lines: int = 80, max_chars: int = 12000) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        tail = "".join(lines[-max_lines:])
        if len(tail) > max_chars:
            tail = tail[-max_chars:]
        return tail.strip()
    except Exception:
        return ""


def _find_project_state(niche: str, project_id: str) -> dict:
    if not project_id or project_id in ("WEB-CONTROL", "QUEUE-START", "PIPELINE-START", "WEB-CHECK", "WEB-READY"):
        return {}
    projects_base = os.path.join(STUDIO_ROOT, "PROJECTS")
    candidates = []
    if niche:
        candidates.append(os.path.join(projects_base, f"PROJECTS_{niche}", project_id, "STATE.json"))
    if os.path.isdir(projects_base):
        try:
            for d in os.listdir(projects_base):
                p = os.path.join(projects_base, d, project_id, "STATE.json")
                if p not in candidates:
                    candidates.append(p)
        except Exception:
            pass
    for c in candidates:
        if os.path.exists(c):
            try:
                st = json.load(open(c, encoding="utf-8"))
                return {
                    "project_id": st.get("project_id") or project_id,
                    "custom_name": st.get("custom_name") or "",
                    "current_step_status": st.get("current_step_status") or "",
                    "completed_steps": st.get("completed_steps") or [],
                    "account_id": st.get("account_id") or "",
                    "account_label": st.get("account_label") or "",
                    "thread_id": st.get("thread_id") or "",
                    "live_note": st.get("live_note") or "",
                    "updated_at": st.get("updated_at") or "",
                }
            except Exception:
                pass
    return {}


def encode_telemetry_packet(payload: dict) -> str:
    raw_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    compressed = zlib.compress(raw_bytes, level=9)
    b64 = base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")
    return f"VBSTEL.{b64}"


def decode_telemetry_packet(packet_str: str) -> dict | None:
    s = (packet_str or "").strip()
    if not s.startswith("VBSTEL."):
        return None
    try:
        b64 = s.split(".", 1)[1]
        pad = "=" * ((4 - len(b64) % 4) % 4)
        comp = base64.urlsafe_b64decode((b64 + pad).encode("ascii"))
        raw = zlib.decompress(comp).decode("utf-8", errors="replace")
        return json.loads(raw)
    except Exception:
        return None


def _send_packet_to_cloud_and_bridge(payload: dict):
    packet = encode_telemetry_packet(payload)
    # 1. Báo về Bridge cục bộ (Port 3999) để lưu bản sao và hiển thị nếu là máy Admin
    try:
        body_bridge = json.dumps({"packet": packet, "payload": payload}, ensure_ascii=False).encode("utf-8")
        req_b = urllib.request.Request(
            BRIDGE_TELEMETRY_URL,
            data=body_bridge,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req_b, timeout=2.0) as r:
            r.read()
    except Exception:
        pass

    # 2. Đẩy thẳng lên kênh Đám mây HTTPS (ntfy.sh) để Máy Chủ Admin nhận tức thì
    try:
        data_bytes = packet.encode("utf-8")
        req_c = urllib.request.Request(
            f"https://ntfy.sh/{TELEMETRY_REPORT_TOPIC}",
            data=data_bytes,
            headers={
                "Cache": "yes",
                "Content-Type": "text/plain; charset=utf-8",
            },
            method="POST",
        )
        with urllib.request.urlopen(req_c, timeout=6.0) as r:
            r.read()
    except Exception:
        pass


def report_telemetry_event(
    event_type: str = "ERROR",
    summary: str = "",
    niche: str = "",
    project_id: str = "",
    traceback_str: str = "",
    extra_data: dict = None,
    include_log_tail: bool = True,
    tail_lines: int = 80,
    sync: bool = False,
):
    """
    Gửi báo cáo Lỗi / Cảnh báo / Heartbeat / Full Log từ máy khách về Máy Chủ Admin.
    Mặc định chạy trên daemon thread để không bao giờ làm trễ luồng viết kịch bản.
    """
    now = time.time()
    dedup_key = hashlib.md5(f"{event_type}|{niche}|{project_id}|{summary[:120]}".encode("utf-8")).hexdigest()
    with _TELEMETRY_LOCK:
        last_ts = _RECENT_ERROR_HASHES.get(dedup_key, 0.0)
        if event_type in ("ERROR", "WARNING") and (now - last_ts) < 45.0:
            return
        _RECENT_ERROR_HASHES[dedup_key] = now

    def _worker():
        try:
            ident = get_client_identity()
            log_path = os.path.join(STUDIO_ROOT, "data", "logs", "LIVE_STUDIO_LOG.txt")
            log_tail = _read_tail_lines(log_path, max_lines=tail_lines) if include_log_tail else ""
            proj_state = _find_project_state(niche, project_id)
            payload = {
                "v": 1,
                "event_id": f"EVT-{int(now * 1000)}-{dedup_key[:6].upper()}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "ts_ms": int(now * 1000),
                "event_type": event_type,
                "source": "python_script_studio",
                "machine_id": ident["machine_id"],
                "customer": ident["customer"],
                "key_id": ident["key_id"],
                "version": ident["version"],
                "build_number": ident["build_number"],
                "hostname": ident["hostname"],
                "os": ident["os"],
                "studio_root": ident["studio_root"],
                "niche": niche or "",
                "project_id": project_id or "",
                "summary": (summary or "")[:500],
                "traceback": (traceback_str or "")[:6000],
                "log_tail": log_tail,
                "project_state": proj_state,
                "extra": extra_data or {},
            }
            _send_packet_to_cloud_and_bridge(payload)
        except Exception:
            pass

    if sync:
        _worker()
    else:
        threading.Thread(target=_worker, daemon=True).start()


def inspect_log_line_and_auto_report(niche: str, project_id: str, msg: str):
    """
    Được gắn trực tiếp vào `log_msg()` của `mafia_chatgpt_pipeline.py`:
    Tự động phát hiện các dòng log báo lỗi/tạm dừng/cứu hộ và gửi ngay về Máy Chủ Admin!
    """
    s = (msg or "").strip()
    if not s:
        return
    is_err = any(
        kw in s
        for kw in (
            "❌",
            "PAUSED_CHECKPOINT",
            "ERROR_PAUSED_AT_CHECKPOINT",
            "Traceback (most recent call last)",
            "[AUTO-HEAL",
            "[FAILOVER NICK CHATGPT]",
            "Chưa có tài khoản ChatGPT",
            "Không thể kết nối",
            "Lỗi khi xử lý dự án",
        )
    )
    if is_err:
        ev_type = "ERROR" if ("❌" in s or "ERROR" in s or "PAUSED" in s or "Traceback" in s) else "WARNING"
        report_telemetry_event(
            event_type=ev_type,
            summary=s,
            niche=niche,
            project_id=project_id,
            include_log_tail=True,
            tail_lines=80,
        )


def upload_full_diagnostics_snapshot(reason: str = "ADMIN_REQUEST", sync: bool = False) -> dict:
    """
    Thu thập toàn bộ `LIVE_STUDIO_LOG.txt` (220 dòng cuối), danh sách hàng đợi `QUEUE_BACKLOG_*.json`
    và các `STATE.json` đang chạy để gửi về Máy Chủ Admin.
    """
    queues_summary = {}
    queues_dir = os.path.join(STUDIO_ROOT, "data", "queues")
    if os.path.isdir(queues_dir):
        try:
            for fn in os.listdir(queues_dir):
                if fn.startswith("QUEUE_BACKLOG") and fn.endswith(".json"):
                    fp = os.path.join(queues_dir, fn)
                    data = json.load(open(fp, encoding="utf-8"))
                    items = data.get("items") or []
                    queues_summary[fn] = {
                        "total": len(items),
                        "completed": sum(1 for x in items if x.get("status") == "COMPLETED" or x.get("completed")),
                        "sample_items": [
                            {
                                "project_id": x.get("project_id"),
                                "status": x.get("status"),
                                "custom_name": x.get("custom_name"),
                            }
                            for x in items[:15]
                        ],
                    }
        except Exception:
            pass

    report_telemetry_event(
        event_type="LOG_SNAPSHOT",
        summary=f"📸 Snapshot Toàn Bộ Log & Hàng Đợi Máy Khách ({reason})",
        niche="ALL",
        project_id="FULL_DIAGNOSTICS",
        extra_data={"reason": reason, "queues_summary": queues_summary},
        include_log_tail=True,
        tail_lines=220,
        sync=sync,
    )
    return {"ok": True, "queues_count": len(queues_summary)}

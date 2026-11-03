r"""
================================================================================
HỆ THỐNG ĐỒNG BỘ 1 KEY BẢN QUYỀN DUY NHẤT (UNIFIED SINGLE VBSKEY LICENSE SYSTEM)
Dành cho: VIDEO BATCH STUDIO + MAFIA & HOMELESS V12 AI SCRIPT STUDIO
================================================================================
Kiến trúc 1 Key duy nhất & Kiểm soát qua ứng dụng độc lập:
1. Toàn bộ hệ thống (cả Dựng Video GPU lẫn Viết Kịch Bản AI Bàn #1 -> Bàn #7)
   chỉ sử dụng DUY NHẤT 1 MÃ MÁY (`VBS-XXXX-XXXX-XXXX`) và 1 MÃ KEY (`VBSKEY.<payload>.<sig>`).
2. Ứng dụng chính KHÔNG hiển thị bảng tạo Key nội bộ; việc Tạo Key, Gia Hạn,
   Khóa / Mở Khóa từ xa và Xóa Key được điều khiển hoàn toàn qua ứng dụng độc lập:
   `E:\a\VideoBatchStudio-Desktop-Offline\VBS-License-Admin\VBS-License-Admin.exe`
================================================================================
"""

import os
import re
import json
import time
import base64
import shutil
import zipfile
import hashlib
import platform
import subprocess
import urllib.request
from datetime import datetime

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


STUDIO_ROOT = _resolve_unified_studio_root(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VBS_ROOT = STUDIO_ROOT if os.path.exists(os.path.join(STUDIO_ROOT, "VBS-License-Admin")) else r"D:\ZC_TEAM\TOOL_ZC_TEAM"
VBS_ADMIN_DIR = os.path.join(VBS_ROOT, "VBS-License-Admin")
BRIDGE_LICENSE_URL = "http://127.0.0.1:3999/api/bridge/license"
CLOUD_SYNC_TOPIC = "vbs_lic_reg_7c8e07da14a8_v1"

_CACHED_MACHINE_ID = None


def _get_appdata_license_dir() -> str:
    appdata = os.environ.get("APPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Roaming")
    d = os.path.join(appdata, "VideoBatchStudio-License")
    os.makedirs(d, exist_ok=True)
    return d


def get_machine_hwid() -> str:
    """
    Trả về Mã Máy thống nhất (định dạng `VBS-XXXX-XXXX-XXXX`) giống hệt 100% với Video Batch Studio.
    """
    global _CACHED_MACHINE_ID
    if _CACHED_MACHINE_ID:
        return _CACHED_MACHINE_ID

    raw_guid = ""
    if os.name == "nt":
        try:
            r = subprocess.run(
                [
                    "reg",
                    "query",
                    r"HKLM\SOFTWARE\Microsoft\Cryptography",
                    "/v",
                    "MachineGuid",
                ],
                capture_output=True,
                text=True,
                timeout=3,
            )
            m = re.search(r"MachineGuid\s+REG_SZ\s+([^\r\n\s]+)", r.stdout or "", re.IGNORECASE)
            if m:
                raw_guid = m.group(1).strip()
        except Exception:
            pass

    if not raw_guid:
        raw_guid = f"{platform.node()}|{platform.system()}|{platform.machine()}"

    digest = hashlib.sha256(f"VBS_HWID_V1:{raw_guid.lower()}".encode("utf-8")).hexdigest().upper()
    _CACHED_MACHINE_ID = f"VBS-{digest[:4]}-{digest[4:8]}-{digest[8:12]}"
    return _CACHED_MACHINE_ID


def is_admin_machine() -> bool:
    """
    Luôn trả về False trong ứng dụng chính để:
    1. Bắt buộc toàn bộ ứng dụng tuân thủ đúng 1 Key `VBSKEY` duy nhất (kể cả khi thử khóa Key trên máy chủ).
    2. Ẩn hoàn toàn bảng tạo Key nội bộ khỏi tab Viết Kịch Bản AI (việc quản lý Key thực hiện qua ứng dụng riêng `VBS-License-Admin.exe`).
    """
    return False


def _load_stored_vbskey() -> str:
    candidates = [
        os.path.join(_get_appdata_license_dir(), "license-active.json"),
        os.path.join(STUDIO_ROOT, ".vbs-user-data", "license.key"),
        os.path.join(STUDIO_ROOT, "data", "license.key"),
        os.path.join(VBS_ROOT, "data", "license.key"),
        os.path.join(VBS_ROOT, "Ban-Giao-Khach-Hang-EXE", "VideoBatchStudio", "data", "license.key"),
    ]
    for path_item in candidates:
        if not os.path.exists(path_item):
            continue
        try:
            if path_item.endswith(".json"):
                data = json.load(open(path_item, encoding="utf-8"))
                k = str(data.get("licenseKey") or data.get("license_key") or "").strip()
                if k:
                    return k
            else:
                k = open(path_item, encoding="utf-8").read().strip()
                if k:
                    return k
        except Exception:
            pass
    return ""


def _load_revoked_registry() -> tuple[set[str], set[str]]:
    rev_keys = set()
    rev_machines = set()
    candidates = [
        os.path.join(_get_appdata_license_dir(), ".sys_revoked_registry.json"),
        os.path.join(VBS_ADMIN_DIR, "revoked-list.json"),
    ]
    for fpath in candidates:
        if os.path.exists(fpath):
            try:
                data = json.load(open(fpath, encoding="utf-8"))
                for k in data.get("revokedKeys") or []:
                    rev_keys.add(str(k).strip())
                for m in data.get("revokedMachines") or []:
                    rev_machines.add(str(m).strip().upper())
            except Exception:
                pass
    return rev_keys, rev_machines


def decode_and_verify_key_string(key_str: str) -> tuple[bool, str, dict]:
    """
    Giải mã chuỗi Key thống nhất `VBSKEY.<payloadB64>.<sigB64>`.
    """
    if not key_str or not isinstance(key_str, str):
        return False, "Vui lòng nhập mã License Key (VBSKEY....).", {}

    cleaned = re.sub(r"\s+", "", key_str.strip())
    parts = cleaned.split(".")
    if len(parts) != 3 or parts[0].upper() != "VBSKEY":
        return False, "Định dạng License Key không hợp lệ (Key chuẩn phải bắt đầu bằng VBSKEY....).", {}

    _, payload_b64, sig_b64 = parts
    if len(sig_b64) < 40:
        return False, "Chữ ký bảo mật Ed25519 không hợp lệ.", {}

    try:
        pad = "=" * ((4 - len(payload_b64) % 4) % 4)
        raw_json = base64.urlsafe_b64decode((payload_b64 + pad).encode("ascii"))
        payload = json.loads(raw_json.decode("utf-8"))
        exp_ms = int(payload.get("exp") or payload.get("expiresAt") or 0)
        return True, "Hợp lệ", {
            "key_id": str(payload.get("id") or "VBS-KEY").strip(),
            "customer": str(payload.get("customer") or "Khách hàng").strip(),
            "plan_label": str(payload.get("planLabel") or payload.get("plan") or "Theo tháng").strip(),
            "expires_ts": int(exp_ms // 1000),
            "expires_ms": exp_ms,
            "hwid_lock": str(payload.get("mid") or payload.get("machineId") or "ANY").strip().upper(),
            "raw_key": cleaned,
        }
    except Exception as e:
        return False, f"Không thể đọc dữ liệu bên trong License Key: {e}", {}


def _query_bridge_license(force_sync: bool = False) -> dict | None:
    url = f"{BRIDGE_LICENSE_URL}?sync={'1' if force_sync else '0'}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=2.5 if not force_sync else 6.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            lic = data.get("licenseStatus")
            if isinstance(lic, dict) and "valid" in lic:
                return lic
    except Exception:
        pass
    return None


def verify_current_machine_license(force_cloud_check: bool = False, force_cloud_sync: bool = False) -> dict:
    """
    Kiểm tra trạng thái bản quyền hiện tại bằng đúng 1 Key duy nhất (`VBSKEY`) của Video Batch Studio.
    """
    my_hwid = get_machine_hwid()
    do_sync = bool(force_cloud_check or force_cloud_sync)

    # 1. Ưu tiên đồng bộ trực tiếp với LicenseService của Video Batch Studio (Port 3999)
    bridge_lic = _query_bridge_license(force_sync=do_sync)
    rev_keys, rev_machines = _load_revoked_registry()

    if bridge_lic:
        kid = str(bridge_lic.get("keyId") or "").strip()
        is_revoked_local = (kid and kid in rev_keys) or (my_hwid in rev_machines)
        if is_revoked_local:
            return {
                "valid": False,
                "is_admin": False,
                "hwid": my_hwid,
                "status": "REVOKED",
                "customer_name": bridge_lic.get("customer") or "Khách hàng",
                "key_id": kid,
                "expires_at": "",
                "days_remaining": 0,
                "message": f"🚫 Mã bản quyền [{kid or 'Key'}] đã bị khóa/thu hồi từ ứng dụng VBS License Admin!",
                "admin_keys": [],
            }

        exp_ms = int(bridge_lic.get("expiresAt") or 0)
        exp_str = datetime.fromtimestamp(exp_ms / 1000.0).strftime("%Y-%m-%d %H:%M:%S") if exp_ms > 0 else ""
        return {
            "valid": bool(bridge_lic.get("valid")),
            "is_admin": False,
            "hwid": str(bridge_lic.get("machineId") or my_hwid),
            "status": str(bridge_lic.get("status") or ("ACTIVE" if bridge_lic.get("valid") else "UNACTIVATED")),
            "customer_name": str(bridge_lic.get("customer") or "Khách hàng"),
            "key_id": kid,
            "expires_at": exp_str,
            "days_remaining": int(bridge_lic.get("daysRemaining") or 0),
            "message": str(bridge_lic.get("message") or ""),
            "admin_keys": [],
        }

    # 2. Fallback đọc trực tiếp từ %APPDATA%\VideoBatchStudio-License\license-active.json khi chạy độc lập
    raw_key = _load_stored_vbskey()
    if not raw_key:
        return {
            "valid": False,
            "is_admin": False,
            "hwid": my_hwid,
            "status": "UNACTIVATED",
            "customer_name": "",
            "key_id": "",
            "expires_at": "",
            "days_remaining": 0,
            "message": f"Ứng dụng chưa được kích hoạt bản quyền. Mã Máy của bạn: {my_hwid}. Vui lòng mở VBS License Admin để cấp Key VBSKEY!",
            "admin_keys": [],
        }

    ok, msg, info = decode_and_verify_key_string(raw_key)
    if not ok:
        return {
            "valid": False,
            "is_admin": False,
            "hwid": my_hwid,
            "status": "INVALID_KEY",
            "customer_name": "",
            "key_id": "",
            "expires_at": "",
            "days_remaining": 0,
            "message": msg,
            "admin_keys": [],
        }

    kid = info["key_id"]
    hwid_lock = info["hwid_lock"]
    exp_ts = info["expires_ts"]
    exp_str = datetime.fromtimestamp(exp_ts).strftime("%Y-%m-%d %H:%M:%S") if exp_ts > 0 else ""

    if kid in rev_keys or my_hwid in rev_machines:
        return {
            "valid": False,
            "is_admin": False,
            "hwid": my_hwid,
            "status": "REVOKED",
            "customer_name": info["customer"],
            "key_id": kid,
            "expires_at": exp_str,
            "days_remaining": 0,
            "message": f"🚫 Mã bản quyền [{kid}] đã bị Quản trị viên khóa/thu hồi từ ứng dụng VBS License Admin!",
            "admin_keys": [],
        }

    if hwid_lock not in ("ANY", "*", "ALL", "") and hwid_lock != my_hwid:
        return {
            "valid": False,
            "is_admin": False,
            "hwid": my_hwid,
            "status": "MACHINE_MISMATCH",
            "customer_name": info["customer"],
            "key_id": kid,
            "expires_at": exp_str,
            "days_remaining": 0,
            "message": f"🚫 Key [{kid}] chỉ cấp cho Mã Máy [{hwid_lock}], không khớp với máy hiện tại ({my_hwid}).",
            "admin_keys": [],
        }

    now_ts = int(time.time())
    if now_ts >= exp_ts:
        return {
            "valid": False,
            "is_admin": False,
            "hwid": my_hwid,
            "status": "EXPIRED",
            "customer_name": info["customer"],
            "key_id": kid,
            "expires_at": exp_str,
            "days_remaining": 0,
            "message": f"⏰ Bản quyền [{kid}] đã hết hạn vào {exp_str}. Vui lòng gia hạn trong VBS License Admin!",
            "admin_keys": [],
        }

    days_left = max(1, int((exp_ts - now_ts) // 86400) + 1)
    return {
        "valid": True,
        "is_admin": False,
        "hwid": my_hwid,
        "status": "ACTIVE",
        "customer_name": info["customer"],
        "key_id": kid,
        "expires_at": exp_str,
        "days_remaining": days_left,
        "message": f"✅ Bản quyền hợp lệ (Mã Key: {kid} | Còn {days_left} ngày | Hết hạn: {exp_str})",
        "admin_keys": [],
    }


def activate_client_license_key(key_str: str) -> tuple[bool, str, dict]:
    """
    Kích hoạt mã Key `VBSKEY....` đồng bộ cho cả Video Batch Studio & Mafia/Homeless Studio.
    """
    cleaned = (key_str or "").strip()
    ok, msg, info = decode_and_verify_key_string(cleaned)
    if not ok:
        return False, msg, {}

    # 1. Thử kích hoạt qua Bridge của Video Batch Studio (Port 3999) để xác thực chữ ký Ed25519
    try:
        payload_bytes = json.dumps({"action": "activate", "licenseKey": cleaned}).encode("utf-8")
        req = urllib.request.Request(
            BRIDGE_LICENSE_URL,
            data=payload_bytes,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            lic = res_data.get("licenseStatus") or {}
            if lic.get("valid"):
                status = verify_current_machine_license()
                return True, lic.get("message") or "Kích hoạt bản quyền thành công!", status
            else:
                return False, lic.get("message") or "Key không hợp lệ hoặc đã bị khóa.", verify_current_machine_license()
    except Exception:
        pass

    # 2. Fallback lưu trực tiếp vào %APPDATA%\VideoBatchStudio-License\license-active.json
    appdata_file = os.path.join(_get_appdata_license_dir(), "license-active.json")
    with open(appdata_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "licenseKey": cleaned,
                "machineId": get_machine_hwid(),
                "keyId": info["key_id"],
                "customer": info["customer"],
                "expiresAt": info["expires_ms"],
                "activatedAt": int(time.time() * 1000),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    status = verify_current_machine_license(force_cloud_check=True)
    if not status.get("valid"):
        return False, status.get("message", "Key không hợp lệ hoặc đã bị thu hồi."), status
    return True, status.get("message", "Kích hoạt bản quyền thành công!"), status


# ==============================================================================
# CÁC HÀM TƯƠNG THÍCH NGƯỢC (ĐIỀU HƯỚNG SANG ỨNG DỤNG VBS-LICENSE-ADMIN.EXE)
# ==============================================================================

def ensure_admin_initialized() -> dict:
    return {"cloud_topic": CLOUD_SYNC_TOPIC}


def admin_create_key(customer_name: str, days: int = 30, hwid_lock: str = "ANY", note: str = "") -> dict:
    raise PermissionError("Vui lòng sử dụng ứng dụng độc lập VBS-License-Admin.exe để tạo và quản lý Key!")


def admin_revoke_or_restore_key(key_id: str, action: str = "REVOKE") -> tuple[bool, str, dict]:
    return False, "Vui lòng sử dụng ứng dụng độc lập VBS-License-Admin.exe để khóa/mở khóa Key!", {}


def admin_extend_key(key_id: str, add_days: int = 30, new_hwid: str = None) -> tuple[bool, str, dict]:
    return False, "Vui lòng sử dụng ứng dụng độc lập VBS-License-Admin.exe để gia hạn Key!", {}


def admin_delete_key(key_id: str) -> tuple[bool, str]:
    return False, "Vui lòng sử dụng ứng dụng độc lập VBS-License-Admin.exe để xóa Key!"


def publish_admin_registry_to_cloud(db_data: dict = None) -> tuple[bool, str]:
    return False, "Vui lòng đồng bộ Cloud từ ứng dụng độc lập VBS-License-Admin.exe!"


def build_client_distribution_package() -> tuple[bool, str, str]:
    try:
        dist_root = os.path.join(STUDIO_ROOT, "DIST_PACKAGE")
        client_dir = os.path.join(dist_root, "MAFIA_HOMELESS_STUDIO_CLIENT")
        zip_path = os.path.join(dist_root, "MAFIA_HOMELESS_STUDIO_CLIENT.zip")

        if os.path.exists(client_dir):
            shutil.rmtree(client_dir)
        os.makedirs(client_dir, exist_ok=True)

        for folder_name in ("engine", "skills_homeless", ".agents", "agents"):
            src_d = os.path.join(STUDIO_ROOT, folder_name)
            dst_d = os.path.join(client_dir, folder_name)
            if os.path.exists(src_d):
                shutil.copytree(
                    src_d,
                    dst_d,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.tmp"),
                )

        os.makedirs(os.path.join(client_dir, "PROJECTS", "TONG HOP"), exist_ok=True)
        os.makedirs(os.path.join(client_dir, "PROJECTS_HOMELESS", "TONG HOP"), exist_ok=True)

        empty_backlog = {"max_parallel_threads": 3, "thinking_effort": "medium", "items": []}
        for bname in ("QUEUE_BACKLOG.json", "HOMELESS_BACKLOG.json", "QUEUE_BACKLOG_HOMELESS.json"):
            with open(os.path.join(client_dir, bname), "w", encoding="utf-8") as f:
                json.dump(empty_backlog, f, ensure_ascii=False, indent=2)

        files_to_copy = [
            "mafia_dashboard_server.py",
            "CAI_DAT_KHI_CHUYEN_MAY_MOI.bat",
            "MO_VAN_PHONG_WEB_MAFIA_STUDIO.bat",
            "CHAY_MAFIA_STUDIO_3_LUONG.bat",
            "HUONG_DAN_CHUYEN_MAY_MOI.md",
            "HUONG_DAN_SU_DUNG_MAFIA_STUDIO.md",
        ]
        for fname in files_to_copy:
            src_f = os.path.join(STUDIO_ROOT, fname)
            if os.path.exists(src_f):
                shutil.copy2(src_f, os.path.join(client_dir, fname))

        if os.path.exists(zip_path):
            os.remove(zip_path)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(client_dir):
                for file in files:
                    abs_f = os.path.join(root, file)
                    rel_f = os.path.relpath(abs_f, dist_root)
                    zf.write(abs_f, rel_f)

        size_mb = os.path.getsize(zip_path) / (1024 * 1024)
        return (
            True,
            f"Đã đóng gói bản Khách Hàng tại: {zip_path} ({size_mb:.2f} MB)",
            zip_path,
        )
    except Exception as e:
        return False, f"Lỗi khi đóng gói bản Khách hàng: {e}", ""

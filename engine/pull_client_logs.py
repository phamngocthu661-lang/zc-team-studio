# -*- coding: utf-8 -*-
r"""
ZC TEAM — CLI & Helper kéo toàn bộ Log/Lỗi từ tất cả máy khách về máy chủ Admin
Lưu trực tiếp vào: D:\ZC_TEAM\TOOL_ZC_TEAM\data\client_logs\{CustomerName}_{MachineId}\
Đồng bộ 100% cấu trúc với VBS-License-Admin/keygen-core.js
"""

import os
import re
import sys
import json
import time
import unicodedata
import urllib.request
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from engine.telemetry_client import (
    TELEMETRY_REPORT_TOPIC,
    decode_telemetry_packet,
)

CLIENT_LOGS_ROOT_DIR = BASE_DIR / "data" / "client_logs"


def _sanitize_customer(text: str) -> str:
    s = unicodedata.normalize("NFD", str(text or "KhachHang"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9_-]", "_", s)[:28]
    return s or "Khach"


def _sanitize_mid(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "_", str(text or "UNKNOWN")) or "UNKNOWN"


def persist_telemetry_event_to_admin_disk(payload: dict) -> dict | None:
    if not isinstance(payload, dict):
        return None
    CLIENT_LOGS_ROOT_DIR.mkdir(parents=True, exist_ok=True)
    safe_mid = _sanitize_mid(payload.get("machine_id"))
    safe_cust = _sanitize_customer(payload.get("customer"))
    folder_name = f"{safe_cust}_{safe_mid}"
    machine_dir = CLIENT_LOGS_ROOT_DIR / folder_name
    machine_dir.mkdir(parents=True, exist_ok=True)

    status_file = machine_dir / "LATEST_STATUS.json"
    prev_status = {}
    if status_file.exists():
        try:
            prev_status = json.loads(status_file.read_text(encoding="utf-8")) or {}
        except Exception:
            prev_status = {}

    ev_type = str(payload.get("event_type") or "HEARTBEAT")
    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    merged_status = {
        **prev_status,
        "machine_id": payload.get("machine_id") or prev_status.get("machine_id") or safe_mid,
        "customer": payload.get("customer") or prev_status.get("customer") or "Khách hàng",
        "key_id": payload.get("key_id") or prev_status.get("key_id") or "",
        "version": payload.get("version") or prev_status.get("version") or "",
        "build_number": payload.get("build_number") or prev_status.get("build_number") or 0,
        "hostname": payload.get("hostname") or prev_status.get("hostname") or "",
        "os": payload.get("os") or prev_status.get("os") or "",
        "studio_root": payload.get("studio_root") or prev_status.get("studio_root") or "",
        "niche": payload.get("niche") or prev_status.get("niche") or "",
        "last_seen_at": payload.get("timestamp") or now_iso,
        "last_seen_ms": int(payload.get("ts_ms") or int(time.time() * 1000)),
        "last_event_type": ev_type,
        "last_summary": payload.get("summary") or "",
        "error_count": int(prev_status.get("error_count") or 0) + (1 if ev_type == "ERROR" else 0),
        "last_error_at": (payload.get("timestamp") or now_iso) if ev_type == "ERROR" else (prev_status.get("last_error_at") or ""),
        "last_error_summary": (payload.get("summary") or "") if ev_type == "ERROR" else (prev_status.get("last_error_summary") or ""),
        "last_error_traceback": (payload.get("traceback") or "") if ev_type == "ERROR" else (prev_status.get("last_error_traceback") or ""),
        "extra": payload.get("extra") or prev_status.get("extra") or {},
    }
    status_file.write_text(json.dumps(merged_status, ensure_ascii=False, indent=2), encoding="utf-8")

    if payload.get("log_tail"):
        (machine_dir / "LIVE_STUDIO_LOG.txt").write_text(str(payload["log_tail"]), encoding="utf-8")

    index_file = CLIENT_LOGS_ROOT_DIR / "TELEMETRY_INDEX.json"
    index_data = {"updatedAt": int(time.time() * 1000), "machines": {}, "recentEvents": []}
    if index_file.exists():
        try:
            index_data = json.loads(index_file.read_text(encoding="utf-8")) or index_data
        except Exception:
            pass

    index_data["updatedAt"] = int(time.time() * 1000)
    if not isinstance(index_data.get("machines"), dict):
        index_data["machines"] = {}
    index_data["machines"][payload.get("machine_id") or safe_mid] = {
        **merged_status,
        "folder_path": str(machine_dir),
    }

    if not isinstance(index_data.get("recentEvents"), list):
        index_data["recentEvents"] = []

    event_id = payload.get("event_id") or f"{safe_mid}_{merged_status['last_seen_ms']}"
    already_seen = any(e.get("event_id") == event_id for e in index_data["recentEvents"] if isinstance(e, dict))
    if not already_seen:
        if ev_type in ("ERROR", "WARNING", "LOG_SNAPSHOT", "CMD_ACK"):
            with open(machine_dir / "ERRORS_HISTORY.jsonl", "a", encoding="utf-8") as hf:
                hf.write(json.dumps(payload, ensure_ascii=False) + "\n")
        index_data["recentEvents"].insert(
            0,
            {
                "event_id": event_id,
                "timestamp": payload.get("timestamp") or now_iso,
                "ts_ms": merged_status["last_seen_ms"],
                "event_type": ev_type,
                "machine_id": merged_status["machine_id"],
                "customer": merged_status["customer"],
                "version": merged_status["version"],
                "build_number": merged_status["build_number"],
                "niche": merged_status["niche"],
                "project_id": payload.get("project_id") or "",
                "summary": payload.get("summary") or "",
                "traceback": payload.get("traceback") or "",
                "log_tail": payload.get("log_tail") or "",
                "folder_path": str(machine_dir),
            },
        )
        index_data["recentEvents"].sort(key=lambda x: int(x.get("ts_ms") or 0), reverse=True)
        index_data["recentEvents"] = index_data["recentEvents"][:150]

    index_file.write_text(json.dumps(index_data, ensure_ascii=False, indent=2), encoding="utf-8")
    return index_data


def pull_all_client_logs(since: str = "all") -> dict:
    url = f"https://ntfy.sh/{TELEMETRY_REPORT_TOPIC}/json?poll=1&since={since}&_t={int(time.time()*1000)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "VBS-Admin-TelemetryPuller/1.0",
            "Cache-Control": "no-cache",
        },
        method="GET",
    )
    total_packets = 0
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_body = resp.read().decode("utf-8", errors="replace")
        for line in raw_body.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except Exception:
                continue
            if item.get("event") == "message" and str(item.get("message") or "").startswith("VBSTEL."):
                decoded = decode_telemetry_packet(item["message"])
                if decoded:
                    total_packets += 1
                    persist_telemetry_event_to_admin_disk(decoded)
    except Exception as e:
        return {"ok": False, "error": str(e), "clientLogsRoot": str(CLIENT_LOGS_ROOT_DIR)}

    index_file = CLIENT_LOGS_ROOT_DIR / "TELEMETRY_INDEX.json"
    index_data = {"machines": {}, "recentEvents": []}
    if index_file.exists():
        try:
            index_data = json.loads(index_file.read_text(encoding="utf-8")) or index_data
        except Exception:
            pass
    machines = sorted(
        list((index_data.get("machines") or {}).values()),
        key=lambda m: int(m.get("last_seen_ms") or 0),
        reverse=True,
    )
    return {
        "ok": True,
        "total_packets_pulled": total_packets,
        "machines_count": len(machines),
        "clientLogsRoot": str(CLIENT_LOGS_ROOT_DIR),
        "machines": machines,
        "recentEventsCount": len(index_data.get("recentEvents") or []),
    }


if __name__ == "__main__":
    res = pull_all_client_logs(since="all")
    print(json.dumps(res, ensure_ascii=False, indent=2))

import os
import sys
import time
from datetime import datetime

STUDIO_WEB_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if STUDIO_WEB_ROOT not in sys.path:
    sys.path.insert(0, STUDIO_WEB_ROOT)

from engine.chatgpt_web_client import (
    STUDIO_WEB_ROOT as RESOLVED_STUDIO_ROOT,
    sweep_completed_and_idle_tabs_across_all_accounts,
)

LIVE_LOG_PATH = os.path.join(RESOLVED_STUDIO_ROOT, "data", "logs", "LIVE_STUDIO_LOG.txt")
os.makedirs(os.path.dirname(LIVE_LOG_PATH), exist_ok=True)


def log_sweeper(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(LIVE_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"[{ts}] [AUTO-TAB-CLEANER] {msg}\n")
    except Exception:
        pass


def main():
    while True:
        try:
            res = sweep_completed_and_idle_tabs_across_all_accounts()
            closed_cnt = int(res.get("closed_count") or 0)
            recycled_cnt = int(res.get("recycled_count") or 0)
            if closed_cnt > 0 or recycled_cnt > 0:
                details = ", ".join(res.get("details") or [])
                log_sweeper(
                    f"🧹 Đã tự động đóng {closed_cnt} Tab (tái chế {recycled_cnt} Tab) của kịch bản đã viết xong để giải phóng RAM ({details})!"
                )
        except Exception:
            pass
        time.sleep(4.0)


if __name__ == "__main__":
    main()

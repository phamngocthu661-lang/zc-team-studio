# -*- coding: utf-8 -*-
"""
================================================================================
🚀 ZC TEAM — CÔNG CỤ ĐẨY BẢN CẬP NHẬT LÊN GITHUB (OTA RELEASE PUBLISHER)
================================================================================
Quy tắc vận hành:
- Chỉ chạy script này khi Chủ Sở Hữu yêu cầu "cập nhật lên github".
- Khi chạy xong, tất cả các máy khách đang mở ZC TEAM (Video Batch Studio)
  sẽ tự động hiện nút "🚀 Có bản cập nhật mới" trên thanh Topbar và khách hàng
  có thể tự chọn "🚀 Cập Nhật Ngay" hoặc "⏳ Để Sau".
================================================================================
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
VERSION_FILE = os.path.join(ROOT_DIR, "version.json")
PACKAGE_FILE = os.path.join(ROOT_DIR, "package.json")


def load_version():
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "app_name": "ZC TEAM — Video Batch Studio Pro",
        "version": "V1.0.0",
        "build_number": 100,
        "release_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "repo": "phamngocthu661-lang/zc-team-studio",
        "branch": "main",
        "changelog": []
    }


def save_version(data):
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # Đồng bộ sang package.json
    if os.path.exists(PACKAGE_FILE):
        try:
            with open(PACKAGE_FILE, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            clean_ver = str(data.get("version", "V1.0.0")).lstrip("vV").strip() or "1.0.0"
            pkg["version"] = clean_ver
            with open(PACKAGE_FILE, "w", encoding="utf-8") as f:
                json.dump(pkg, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[WARN] Không thể đồng bộ package.json: {e}")


def bump_patch_version(ver_str):
    raw = str(ver_str or "V1.0.0").strip().lstrip("vV")
    parts = raw.split(".")
    try:
        while len(parts) < 3:
            parts.append("0")
        major = int(parts[0])
        minor = int(parts[1])
        patch = int(parts[2]) + 1
        return f"V{major}.{minor}.{patch}"
    except Exception:
        return "V1.0.1"


def main():
    parser = argparse.ArgumentParser(description="Đẩy bản cập nhật ZC TEAM lên GitHub OTA")
    parser.add_argument("--version", type=str, default="", help="Phiên bản mới (VD: V1.0.0, V1.0.1)")
    parser.add_argument("--note", type=str, default="", help="Ghi chú nội dung cập nhật (Changelog)")
    parser.add_argument("--keep-version", action="store_true", help="Giữ nguyên số phiên bản & build trong version.json")
    args = parser.parse_args()

    v_data = load_version()
    old_ver = v_data.get("version", "V1.0.0")
    old_build = int(v_data.get("build_number", 100))

    print("=" * 72)
    print("🚀 HỆ THỐNG PHÁT HÀNH BẢN CẬP NHẬT GITHUB OTA — ZC TEAM STUDIO")
    print("=" * 72)
    print(f"📌 Phiên bản hiện tại: {old_ver} (Build #{old_build})")

    if args.keep_version:
        new_ver = old_ver
        new_build = old_build
        note = args.note.strip()
    else:
        suggested_ver = args.version.strip() or bump_patch_version(old_ver)
        if not suggested_ver.upper().startswith("V"):
            suggested_ver = "V" + suggested_ver
        new_ver = suggested_ver
        new_build = old_build + 1
        note = args.note.strip()
        if not note and sys.stdin.isatty():
            try:
                user_ver = input(f"👉 Nhập tên phiên bản mới [Enter = {new_ver}]: ").strip()
                if user_ver:
                    new_ver = user_ver if user_ver.upper().startswith("V") else f"V{user_ver}"
                note = input("👉 Nhập ghi chú cập nhật cho máy khách: ").strip()
            except EOFError:
                pass
        if not note:
            note = f"Cập nhật tính năng và tối ưu hóa hệ thống ({new_ver})."

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    v_data["version"] = new_ver
    v_data["build_number"] = new_build
    v_data["release_date"] = now_str
    v_data["released_at"] = now_str
    if note:
        raw_cl = v_data.get("changelog") or []
        if isinstance(raw_cl, str):
            changelog = [s.strip() for s in raw_cl.splitlines() if s.strip()]
        elif isinstance(raw_cl, list):
            changelog = [str(x).strip() for x in raw_cl if str(x).strip()]
        else:
            changelog = []
        entry = f"[{new_ver} (Build #{new_build}) - {now_str}] {note}"
        if not changelog or changelog[0] != entry:
            changelog.insert(0, entry)
        v_data["changelog"] = changelog[:15]

    save_version(v_data)
    print(f"✅ Đã ghi nhận version.json: {new_ver} (Build #{new_build}) — {now_str}")

    # Đồng bộ sang Ban-Giao-Khach-Hang-EXE nếu tồn tại
    import shutil
    exe_app_dir = os.path.join(ROOT_DIR, "Ban-Giao-Khach-Hang-EXE", "VideoBatchStudio")
    unpacked_dir = os.path.join(exe_app_dir, "resources", "app")
    for dst_base in (exe_app_dir, unpacked_dir):
        if os.path.isdir(dst_base):
            try:
                for root_f in ("version.json", "package.json", "mafia_dashboard_server.py", "GHI_CHU_CAP_NHAT_MEXICO_BA_CO.md"):
                    sf = os.path.join(ROOT_DIR, root_f)
                    if os.path.isfile(sf):
                        shutil.copy2(sf, os.path.join(dst_base, root_f))
                for eng_f in ("mafia_chatgpt_pipeline.py", "chatgpt_web_client.py", "license_manager.py", "channel_memory_guard.py", "tts_post_director.py", "auto_tab_sweeper_daemon.py"):
                    sf = os.path.join(ROOT_DIR, "engine", eng_f)
                    df = os.path.join(dst_base, "engine", eng_f)
                    if os.path.isfile(sf):
                        os.makedirs(os.path.dirname(df), exist_ok=True)
                        shutil.copy2(sf, df)
            except Exception as e:
                print(f"[WARN] Đồng bộ sang {dst_base}: {e}")

    print("\n⏳ Đang đẩy mã nguồn cập nhật lên GitHub...")
    subprocess.run(["git", "add", "-A"], cwd=ROOT_DIR, check=True)
    status = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT_DIR, capture_output=True, text=True)
    if status.stdout.strip():
        commit_msg = f"Release {new_ver} (Build #{new_build}): {note or 'Official Release'}"
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=ROOT_DIR, check=True)
    else:
        print("ℹ️ Không có file thay đổi mới cần commit, tiến hành push nhánh main...")

    subprocess.run(["git", "push", "-u", "origin", "main"], cwd=ROOT_DIR, check=True)

    print("\n" + "=" * 72)
    print(f"🎉 ĐÃ PHÁT HÀNH THÀNH CÔNG PHIÊN BẢN {new_ver} (BUILD #{new_build}) LÊN GITHUB!")
    print(f"🔗 Kho lưu trữ: https://github.com/{v_data.get('repo', 'phamngocthu661-lang/zc-team-studio')}")
    print("💡 Các máy khách đang mở ứng dụng sẽ hiện nút [🚀 Có bản cập nhật mới] và")
    print("   khách hàng có thể chọn [🚀 Cập Nhật Ngay] hoặc [⏳ Để Sau].")
    print("=" * 72)


if __name__ == "__main__":
    main()

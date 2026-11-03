# -*- coding: utf-8 -*-
r"""
Script tự động chuẩn hóa & cài đặt toàn bộ 12 Bộ Key + Skills từ:
C:\Users\hungp\Downloads\drive-download-20261103T081422Z-1-001
vào:
1) D:\ZC_TEAM\TOOL_ZC_TEAM\skills_12_keys\<KeyFolderName>\
   - 01_TITULOS
   - 01_5_CANON_GUARD
   - 02_OUTLINE
   - 03_WRITER
   - 04_AUDITOR
   - 05_SEO
   - 07_TTS_CHECK
2) C:\Users\hungp\.gemini\config\skills\<KeyFolderName>__01_title .. __05_seo
3) Khởi tạo thư mục dự án D:\ZC_TEAM\TOOL_ZC_TEAM\PROJECTS_<KeyFolderName>\ và CHANNEL_MEMORY.json
"""
import os
import shutil
import json
from pathlib import Path

EXTRACTED_ROOT = Path(r"C:\Users\hungp\.gemini\antigravity\brain\f37afbfd-a644-4843-881c-9b8aa5adc539\scratch\all_12_keys_extracted")
STUDIO_ROOT = Path(r"D:\ZC_TEAM\TOOL_ZC_TEAM")
SKILLS_12_ROOT = STUDIO_ROOT / "skills_12_keys"
GEMINI_SKILLS_ROOT = Path(r"C:\Users\hungp\.gemini\config\skills")

# Mapping chính xác 12 Key (đặt tên theo đúng tên thư mục gốc của người dùng)
KEYS_MANIFEST = {
    "01_Nhom_Ong_Gia_Tra_Dua_My_US": {
        "label": "01_Nhom_Ong_Gia_Tra_Dua_My_US (Ông già trả đũa - Mỹ US)",
        "short_label": "01_Nhom_Ong_Gia_Tra_Dua_My_US",
        "lang": "en",
        "locale": "en-US",
        "country": "US",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1",
        "shared_rel": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/_shared",
        "steps": {
            "01_TITULOS": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/SKILLS/01-viet-tieu-de-ong-gia-us",
            "02_OUTLINE": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/SKILLS/02-viet-gian-y-ong-gia-us",
            "03_WRITER": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/SKILLS/03-viet-kich-ban-ong-gia-us",
            "04_AUDITOR": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/SKILLS/04-kiem-tra-kich-ban-ong-gia-us",
            "05_SEO": "ONG_GIA_TRA_DUA_US_SKILLS_V1_1/SKILLS/05-seo-ong-gia-us",
        }
    },
    "02_Nhom_Phu_Nu_Bao_Thu_My_US": {
        "label": "02_Nhom_Phu_Nu_Bao_Thu_My_US (Phụ nữ báo thù - Mỹ US)",
        "short_label": "02_Nhom_Phu_Nu_Bao_Thu_My_US",
        "lang": "en",
        "locale": "en-US",
        "country": "US",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "WRV_US_V1_1",
        "shared_rel": None,
        "steps": {
            "01_TITULOS": "WRV_US_V1_1/Viet-Tieu-De-WOMEN-REVENGE-US-V1/viral-title-rewriter-wrv",
            "02_OUTLINE": "WRV_US_V1_1/viet-gian-y-WOMEN-REVENGE-US-V1/viet-gian-y-wrv",
            "03_WRITER": "WRV_US_V1_1/Viet-kich-ban-WOMEN-REVENGE-US-V1-THREE-STAGE-ONE-REPAIR/viet-kich-ban-wrv",
            "04_AUDITOR": "WRV_US_V1_1/kiem-tra-kich-ban-WOMEN-REVENGE-US-V1-AUDIT-ONLY/kiem-tra-kich-ban-wrv",
            "05_SEO": "WRV_US_V1_1/seo-WOMEN-REVENGE-US-V1/seo-wrv-story",
        }
    },
    "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico": {
        "label": "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico (Bà già Drama Gia đình - Mexico)",
        "short_label": "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico",
        "lang": "es",
        "locale": "es-MX",
        "country": "MX",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1",
        "shared_rel": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/_shared",
        "steps": {
            "01_TITULOS": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/01_Tieu_De_Mexico_Dona_V1",
            "02_OUTLINE": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/02_Gian_Y_Mexico_Dona_V1",
            "03_WRITER": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/03_Viet_Kich_Ban_Mexico_Dona_V1",
            "04_AUDITOR": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/04_QA_Mexico_Dona_V1",
            "05_SEO": "MEXICO_FAMILY_DRAMA_SKILLS_V1_1/05_SEO_Thumbnail_Mexico_Dona_V1",
        }
    },
    "04_Nhom_Ong_Gia_Trung_Tri_Mexico": {
        "label": "04_Nhom_Ong_Gia_Trung_Tri_Mexico (Ông già trừng trị con bất hiếu - Mexico)",
        "short_label": "04_Nhom_Ong_Gia_Trung_Tri_Mexico",
        "lang": "es",
        "locale": "es-MX",
        "country": "MX",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "SKILLS_EXTRACTED",
        "shared_rel": None,
        "steps": {
            "01_TITULOS": "SKILLS_EXTRACTED/Viet-Tieu-De-PADRE-MX-V1_1/Viet-Tieu-De-PADRE-MX-V1/viral-title-rewriter-mx",
            "02_OUTLINE": "SKILLS_EXTRACTED/viet-gian-y-padre-mx-V1_1/viet-gian-y-padre-mx-V1/viet-gian-y-padre-mx",
            "03_WRITER": "SKILLS_EXTRACTED/Viet-kich-ban-padre-mx-V1_1-THREE-STAGE-ONE-REPAIR/Viet-kich-ban-padre-mx-V1-THREE-STAGE-ONE-REPAIR/viet-kich-ban-padre-mx",
            "04_AUDITOR": "SKILLS_EXTRACTED/kiem-tra-kich-ban-padre-mx-V1_1-AUDIT-ONLY/kiem-tra-kich-ban-padre-mx-V1-AUDIT-ONLY/kiem-tra-kich-ban-padre-mx",
            "05_SEO": "SKILLS_EXTRACTED/seo-padre-mx-V1_1/seo-padre-mx-V1/seo-padre-mx-story",
        }
    },
    "05_Nhom_Manga_Doc_Than_Japan": {
        "label": "05_Nhom_Manga_Doc_Than_Japan (Manga Đàn ông Độc thân - Nhật Bản)",
        "short_label": "05_Nhom_Manga_Doc_Than_Japan",
        "lang": "ja",
        "locale": "ja-JP",
        "country": "JP",
        "parts_count": 7,
        "char_min": 15000,
        "char_max": 25000,
        "base_rel": "",
        "shared_rel": "shared",
        "steps": {
            "01_TITULOS": "skills/manga-doc-than-jp-title",
            "02_OUTLINE": "skills/manga-doc-than-jp-outline",
            "03_WRITER": "skills/manga-doc-than-jp-writer",
            "04_AUDITOR": "skills/manga-doc-than-jp-qa",
            "05_SEO": "skills/manga-doc-than-jp-seo",
        }
    },
    "06_Huu_Tri_Viec_Lam_Japan": {
        "label": "06_Huu_Tri_Viec_Lam_Japan (Hưu trí & Việc làm Kuchikomi - Nhật Bản)",
        "short_label": "06_Huu_Tri_Viec_Lam_Japan",
        "lang": "ja",
        "locale": "ja-JP",
        "country": "JP",
        "parts_count": 7,
        "char_min": 18000,
        "char_max": 26000,
        "base_rel": "JAPAN_KUCHIKOMI_SKILLS_V1.1",
        "shared_rel": "JAPAN_KUCHIKOMI_SKILLS_V1.1/_shared",
        "steps": {
            "01_TITULOS": "JAPAN_KUCHIKOMI_SKILLS_V1.1/viet-lai-tieu-de-japan-kuchikomi",
            "02_OUTLINE": "JAPAN_KUCHIKOMI_SKILLS_V1.1/viet-gian-y-japan-kuchikomi",
            "03_WRITER": "JAPAN_KUCHIKOMI_SKILLS_V1.1/viet-kich-ban-japan-kuchikomi",
            "04_AUDITOR": "JAPAN_KUCHIKOMI_SKILLS_V1.1/kiem-tra-kich-ban-japan-kuchikomi",
            "05_SEO": "JAPAN_KUCHIKOMI_SKILLS_V1.1/viet-seo-japan-kuchikomi",
        }
    },
    "07_Dong_Que_Co_Dien_Mexico": {
        "label": "07_Dong_Que_Co_Dien_Mexico (Truyện xưa Đồng quê Cổ điển - Mexico)",
        "short_label": "07_Dong_Que_Co_Dien_Mexico",
        "lang": "es",
        "locale": "es-MX",
        "country": "MX",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "Mexico_Rural_Story_Skills_V1_1",
        "shared_rel": "Mexico_Rural_Story_Skills_V1_1/_shared",
        "steps": {
            "01_TITULOS": "Mexico_Rural_Story_Skills_V1_1/01_viet-lai-tieu-de-mexico",
            "02_OUTLINE": "Mexico_Rural_Story_Skills_V1_1/02_viet-gian-y-mexico",
            "03_WRITER": "Mexico_Rural_Story_Skills_V1_1/03_viet-kich-ban-mexico",
            "04_AUDITOR": "Mexico_Rural_Story_Skills_V1_1/04_kiem-tra-kich-ban-mexico",
            "05_SEO": "Mexico_Rural_Story_Skills_V1_1/05_seo-mexico",
        }
    },
    "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico": {
        "label": "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico (Tình yêu Ngoại tình Phản bội - Mexico)",
        "short_label": "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico",
        "lang": "es",
        "locale": "es-MX",
        "country": "MX",
        "parts_count": 7,
        "char_min": 70000,
        "char_max": 80000,
        "base_rel": "MEXICO_TELENOVELA_SKILLS_V1_1",
        "shared_rel": None,
        "steps": {
            "01_TITULOS": "MEXICO_TELENOVELA_SKILLS_V1_1/Viet-Lai-Tieu-De-Mexico",
            "02_OUTLINE": "MEXICO_TELENOVELA_SKILLS_V1_1/Viet-Gian-Y-Mexico",
            "03_WRITER": "MEXICO_TELENOVELA_SKILLS_V1_1/Viet-Kich-Ban-Mexico",
            "04_AUDITOR": "MEXICO_TELENOVELA_SKILLS_V1_1/Kiem-Tra-Kich-Ban-Mexico",
            "05_SEO": "MEXICO_TELENOVELA_SKILLS_V1_1/Viet-SEO-Mexico",
        }
    },
    "09_Tieu_Su_Goc_Khuat_Sao_Mexico": {
        "label": "09_Tieu_Su_Goc_Khuat_Sao_Mexico (Tiểu sử Góc khuất Sao - Mexico)",
        "short_label": "09_Tieu_Su_Goc_Khuat_Sao_Mexico",
        "lang": "es",
        "locale": "es-MX",
        "country": "MX",
        "parts_count": 7,
        "char_min": 42000,
        "char_max": 48000,
        "base_rel": "",
        "shared_rel": "_shared",
        "steps": {
            "01_TITULOS": "viral-title-rewriter-mexico",
            "02_OUTLINE": "viet-gian-y-mexico",
            "03_WRITER": "viet-kich-ban-mexico",
            "04_AUDITOR": "kiem-tra-kich-ban-mexico",
            "05_SEO": "seo-mexico-celebrity",
        }
    },
    "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US": {
        "label": "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US (Người cha da màu CEO ngầm - Mỹ US)",
        "short_label": "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US",
        "lang": "en",
        "locale": "en-US",
        "country": "US",
        "parts_count": 7,
        "char_min": 40000,
        "char_max": 52000,
        "base_rel": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2",
        "shared_rel": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/00_SHARED_CONTRACT",
        "steps": {
            "01_TITULOS": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/01_viet-lai-tieu-de-black-dad",
            "02_OUTLINE": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/02_viet-gian-y-black-dad",
            "03_WRITER": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/03_viet-kich-ban-black-dad",
            "04_AUDITOR": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/04_kiem-tra-kich-ban-black-dad",
            "05_SEO": "BLACK_DAD_UNDERCOVER_CEO_US_SKILLS_V2/05_viet-seo-black-dad",
        }
    },
    "11_Chuyen_Tinh_Dan_Ong_My_US": {
        "label": "11_Chuyen_Tinh_Dan_Ong_My_US (Chuyện tình Đàn ông POV - Mỹ US)",
        "short_label": "11_Chuyen_Tinh_Dan_Ong_My_US",
        "lang": "en",
        "locale": "en-US",
        "country": "US",
        "parts_count": 7,
        "char_min": 40000,
        "char_max": 50000,
        "base_rel": "US_Male_POV_Romance_Skills_V1",
        "shared_rel": "US_Male_POV_Romance_Skills_V1/_shared",
        "steps": {
            "01_TITULOS": "US_Male_POV_Romance_Skills_V1/01_Title_Rewriter",
            "02_OUTLINE": "US_Male_POV_Romance_Skills_V1/02_Story_Outline",
            "03_WRITER": "US_Male_POV_Romance_Skills_V1/03_Script_Writer",
            "04_AUDITOR": "US_Male_POV_Romance_Skills_V1/04_Script_QA_One_Repair",
            "05_SEO": "US_Male_POV_Romance_Skills_V1/05_SEO_Publish_Pack",
        }
    },
    "12_Kinh_Di_Dem_Khuya_My_US": {
        "label": "12_Kinh_Di_Dem_Khuya_My_US (Kinh dị Đêm khuya - Mỹ US)",
        "short_label": "12_Kinh_Di_Dem_Khuya_My_US",
        "lang": "en",
        "locale": "en-US",
        "country": "US",
        "parts_count": 7,
        "char_min": 65000,
        "char_max": 78000,
        "base_rel": "US_MIDNIGHT_HORROR_V1_1",
        "shared_rel": "US_MIDNIGHT_HORROR_V1_1/00_shared_contracts",
        "steps": {
            "01_TITULOS": "US_MIDNIGHT_HORROR_V1_1/01_title_rewriter",
            "02_OUTLINE": "US_MIDNIGHT_HORROR_V1_1/02_outline_engine",
            "03_WRITER": "US_MIDNIGHT_HORROR_V1_1/03_script_writer",
            "04_AUDITOR": "US_MIDNIGHT_HORROR_V1_1/04_script_auditor",
            "05_SEO": "US_MIDNIGHT_HORROR_V1_1/05_seo_publish",
        }
    },
}


def build_canon_guard_skill_md(key_name: str, meta: dict) -> str:
    return f"""---
name: canon-guard-{key_name.lower()}
description: Bàn #1.5 (Canon Guard — {meta['label']}): Quản lý sổ tay trí nhớ kênh CHANNEL_MEMORY.json (30–100 kịch bản gần nhất của {key_name}), tự động quét và khóa cấm trùng lặp Tên Nhân Vật Chính, Nhân Vật Phản Diện, Địa Danh ({meta['country']}), Nghề Nghiệp và Vật Chứng Pháp Lý trước khi Bàn #2 lập Giàn ý {meta['parts_count']} Phần.
---

# 🛡️ BÀN #1.5: CANON GUARD ({key_name})

## 1. Vai trò
- Kiểm tra lịch sử kịch bản trong `CHANNEL_MEMORY.json` của kênh `{key_name}` ({meta['locale']}).
- Khóa danh sách cấm trùng lặp (Banned Names, Banned Locations, Banned Props/Professions) để Bàn #2 (Outline) và Bàn #3 (Writer) sáng tạo 100% nhân vật và bối cảnh mới.
- Xuất file `checkpoints/01_5_CANON_COLLISION_LOCK.json`.
"""


def build_tts_check_skill_md(key_name: str, meta: dict) -> str:
    return f"""---
name: verificador-tts-{key_name.lower()}
description: Bàn #7 (Check Lại File TTS — {meta['label']}): Kiểm định độc lập, chuẩn hóa phát âm ({meta['locale']}) và làm sạch 100% file kịch bản TTS (FULL_SCRIPT.txt & TONG HOP/{{TenKichBan}}_KB.txt) trước khi đẩy sang dựng Voice/Video. Xóa sạch nhãn [PART 1]..[PART {meta['parts_count']}] & ký tự lạ, bung từ viết tắt ({meta['locale']}), kiểm tra độ dài chuẩn {meta['char_min']:,}–{meta['char_max']:,} ký tự và xuất báo cáo checkpoints/07_TTS_CHECK_REPORT.md.
---

# 🎙️ BÀN #7: KIỂM ĐỊNH & LÀM SẠCH FILE TTS ({key_name} — {meta['locale']})

## 1. Nhiệm vụ bắt buộc
1. Xóa 100% nhãn `[PART 1]`..`[PART {meta['parts_count']}]`, markdown (`#`, `*`, `_`), ghi chú sân khấu.
2. Bung toàn bộ từ viết tắt theo chuẩn ngôn ngữ `{meta['locale']}` để máy đọc TTS không vấp.
3. Kiểm tra tổng độ dài ký tự mục tiêu `{meta['char_min']:,}–{meta['char_max']:,}` ký tự.
4. Xuất bản sạch ra `FULL_SCRIPT.txt` và `TONG HOP/{{TenKichBan}}_KB.txt` kèm báo cáo `checkpoints/07_TTS_CHECK_REPORT.md`.
"""


def copy_tree_clean(src: Path, dst: Path):
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def main():
    SKILLS_12_ROOT.mkdir(parents=True, exist_ok=True)
    GEMINI_SKILLS_ROOT.mkdir(parents=True, exist_ok=True)

    mexico_canon_src = STUDIO_ROOT / "skills_mexico_v1_3" / "01_5_CANON_GUARD_MEXICO"
    mexico_tts_src = STUDIO_ROOT / "skills_mexico_v1_3" / "07_VERIFICADOR_TTS_MEXICO"

    summary_rows = []

    for key_name, meta in KEYS_MANIFEST.items():
        key_src_root = EXTRACTED_ROOT / key_name
        if not key_src_root.exists():
            raise FileNotFoundError(f"Không tìm thấy thư mục giải nén cho {key_name}: {key_src_root}")

        key_dst_root = SKILLS_12_ROOT / key_name
        key_dst_root.mkdir(parents=True, exist_ok=True)

        # Copy _shared nếu có
        if meta.get("shared_rel"):
            shared_src = key_src_root / meta["shared_rel"]
            if shared_src.exists():
                copy_tree_clean(shared_src, key_dst_root / "_shared")

        # Copy README / MASTER_WORKFLOW nếu có ở base_rel
        base_dir = key_src_root / meta["base_rel"] if meta.get("base_rel") else key_src_root
        if base_dir.exists():
            for doc_file in base_dir.glob("*.md"):
                shutil.copy2(doc_file, key_dst_root / doc_file.name)

        # Copy 5 core steps + đồng thời cài vào C:\Users\hungp\.gemini\config\skills\
        step_suffix_map = {
            "01_TITULOS": "01_title",
            "02_OUTLINE": "02_outline",
            "03_WRITER": "03_writer",
            "04_AUDITOR": "04_auditor",
            "05_SEO": "05_seo",
        }
        for step_code, rel_path in meta["steps"].items():
            src_step_dir = key_src_root / rel_path
            if not src_step_dir.exists():
                raise FileNotFoundError(f"Thiếu step {step_code} của {key_name} tại: {src_step_dir}")
            skill_md = src_step_dir / "SKILL.md"
            if not skill_md.exists():
                raise FileNotFoundError(f"Thiếu SKILL.md trong {src_step_dir}")

            # 1) Copy vào D:\ZC_TEAM\TOOL_ZC_TEAM\skills_12_keys\<KeyFolderName>\<step_code>
            dst_step_dir = key_dst_root / step_code
            copy_tree_clean(src_step_dir, dst_step_dir)

            # Nếu có _shared ở gói gốc, chép thêm vào references/_shared trong từng step để load_skill_bundle đọc trọn vẹn
            if meta.get("shared_rel"):
                shared_src = key_src_root / meta["shared_rel"]
                if shared_src.exists():
                    ref_shared_dst = dst_step_dir / "references" / "_shared"
                    copy_tree_clean(shared_src, ref_shared_dst)

            # 2) Copy vào C:\Users\hungp\.gemini\config\skills\<KeyFolderName>__<suffix>
            gemini_skill_dir = GEMINI_SKILLS_ROOT / f"{key_name}__{step_suffix_map[step_code]}"
            copy_tree_clean( dst_step_dir, gemini_skill_dir )

        # Tạo Bàn 1.5 (01_5_CANON_GUARD) & Bàn 7 (07_TTS_CHECK)
        canon_dst = key_dst_root / "01_5_CANON_GUARD"
        tts_dst = key_dst_root / "07_TTS_CHECK"
        if meta["lang"] == "es" and mexico_canon_src.exists() and mexico_tts_src.exists():
            copy_tree_clean(mexico_canon_src, canon_dst)
            copy_tree_clean(mexico_tts_src, tts_dst)
        else:
            canon_dst.mkdir(parents=True, exist_ok=True)
            (canon_dst / "SKILL.md").write_text(build_canon_guard_skill_md(key_name, meta), encoding="utf-8")
            tts_dst.mkdir(parents=True, exist_ok=True)
            (tts_dst / "SKILL.md").write_text(build_tts_check_skill_md(key_name, meta), encoding="utf-8")

        # Tạo thư mục PROJECTS_<KeyFolderName> và CHANNEL_MEMORY.json nếu chưa có
        proj_dir = STUDIO_ROOT / f"PROJECTS_{key_name}"
        proj_dir.mkdir(parents=True, exist_ok=True)
        mem_file = proj_dir / f"CHANNEL_MEMORY_{key_name}.json"
        if not mem_file.exists():
            mem_file.write_text(json.dumps({
                "channel_name": key_name,
                "label": meta["label"],
                "language": meta["locale"],
                "version": "1.0.0",
                "max_history": 100,
                "scripts": []
            }, ensure_ascii=False, indent=2), encoding="utf-8")

        summary_rows.append((key_name, meta["locale"], meta["parts_count"], f"{meta['char_min']}-{meta['char_max']}"))
        print(f"[OK] Đã chuẩn hóa & cài đặt Key: {key_name} ({meta['locale']})")

    # Lưu manifest tổng hợp
    manifest_path = SKILLS_12_ROOT / "KEYS_12_MANIFEST.json"
    manifest_path.write_text(json.dumps(KEYS_MANIFEST, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n=== HOÀN TẤT CÀI ĐẶT {len(summary_rows)} KEY VÀO {SKILLS_12_ROOT} ===")


if __name__ == "__main__":
    main()

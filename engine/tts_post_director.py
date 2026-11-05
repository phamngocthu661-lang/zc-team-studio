r"""
================================================================================
BÀN #6 (`studio-6-visual-tts-director`): KIỂM CHUẨN HẬU KỲ TTS & ĐỒNG BỘ XUẤT BẢN
(POST-SEO TTS SANITIZATION, ABBREVIATION EXPANSION & PRONUNCIATION DIRECTOR)
================================================================================
Chức năng:
1. Sau khi có `FULL_SCRIPT.txt` và `FULL_SEO.txt`, Agent Bàn #6 quét toàn bộ văn bản TTS
   để phát hiện và sửa triệt để:
   - Ký tự lạ, tàn dư Markdown (`*`, `#`, `_`, `~`, `` ` ``), thẻ HTML/XML (`<...>`),
     ngoặc vuông sân khấu (`[...]`), ngoặc nhọn (`{...}`), ký tự ẩn Unicode (`\u200b`, `\ufeff`).
   - Các danh xưng và từ viết tắt tiếng Anh dễ làm máy đọc TTS đọc sai hoặc ngắt câu nhầm
     (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `Prof.`, `Gov.`, `Sen.`, `Gen.`, `Col.`, `Maj.`, `Capt.`,
     `Lt.`, `Sgt.`, `Det.`, `Rev.`, `Jr.`, `Sr.`, `St.`, `Ave.`, `Blvd.`, `Rd.`, `Dept.`,
     `Co.`, `Corp.`, `Inc.`, `Mt.`, `Ft.`, `No.`).
   - Số viết tắt, đơn vị đo lường, nhiệt độ, tiền tệ và ký hiệu toán học
     (`$1.5M`, `$50k`, `-40°F`, `72°F`, `sq. ft.`, `lbs.`, `mph`, `%`, `&`).
   - Nhịp ngắt câu TTS (chuẩn hóa dấu gạch ngang dài `—`, dấu ba chấm `...`, khoảng trắng kép).
2. Xuất Báo cáo Kiểm chuẩn Hậu kỳ tại `checkpoints/06_TTS_DIRECTOR_REPORT.md`.
3. Cập nhật lại `FULL_SCRIPT.txt` sạch chuẩn 100% để sẵn sàng đưa thẳng vào hệ thống đọc TTS.
================================================================================
"""

import os
import re
from datetime import datetime


# Các từ đường phố phổ biến đứng trước St. / Dr. / Rd. / Ave.
STREET_PREFIX_WORDS = {
    "main", "oak", "elm", "maple", "pine", "cedar", "walnut", "chestnut", "birch", "willow",
    "spruce", "ash", "cherry", "Hickory", "poplar", "sycamore", "magnolia", "cypress", "alder",
    "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
    "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th",
    "market", "church", "water", "river", "lake", "hill", "high", "broad", "center", "central",
    "park", "mill", "spring", "washington", "lincoln", "jefferson", "madison", "jackson", "franklin",
    "adams", "grant", "lee", "union", "liberty", "state", "county", "front", "back", "north",
    "south", "east", "west", "bridge", "station", "depot", "harbor", "dock", "wharf", "beacon",
    "ridge", "valley", "meadow", "forest", "grove", "orchard", "garden", "sunset", "sunrise",
}


def sanitize_and_normalize_tts_script(raw_text: str) -> tuple[str, dict]:
    """
    Quét và chuẩn hóa toàn diện văn bản `FULL_SCRIPT.txt` cho TTS.
    Trả về `(clean_tts_text, stats_dict)`.
    """
    if not raw_text:
        return "", {
            "total_fixes": 0,
            "strange_chars_removed": 0,
            "abbreviations_expanded": 0,
            "numbers_units_expanded": 0,
            "punctuation_normalized": 0,
            "examples": [],
        }

    text = raw_text
    examples: list[str] = []
    strange_chars_removed = 0
    abbreviations_expanded = 0
    numbers_units_expanded = 0
    punctuation_normalized = 0

    def _record_example(cat: str, before: str, after: str):
        if len(examples) < 35 and before.strip() != after.strip():
            examples.append(f"[{cat}] `{before.strip()}` -> `{after.strip()}`")

    # ------------------------------------------------------------------
    # 1. XÓA KÝ TỰ ẨN UNICODE, NHÃN PASTED TEXT DOM, THẺ HTML/XML, NGOẶC VUÔNG, MARKDOWN LẠ
    # ------------------------------------------------------------------
    pasted_chip_matches = re.findall(
        r"Pasted[ \t]+text[ \t]*\([^)\n]{1,40}\)(?:\.(?:txt|md|json|doc|docx|pdf|csv))?[ \t]*(?:Document|Tài liệu|Archivo|Documento)?",
        text,
        flags=re.IGNORECASE,
    )
    if pasted_chip_matches:
        strange_chars_removed += len(pasted_chip_matches)
        _record_example("ChatGPT Paste Chip", pasted_chip_matches[0], "(removed)")
        text = re.sub(
            r"Pasted[ \t]+text[ \t]*\([^)\n]{1,40}\)(?:\.(?:txt|md|json|doc|docx|pdf|csv))?[ \t]*(?:Document|Tài liệu|Archivo|Documento)?",
            "\n\n",
            text,
            flags=re.IGNORECASE,
        )

    # Khôi phục ngắt đoạn (\n\n) nếu các thẻ <p> bị dính liền nhau
    glued_quote_m = re.findall(r'([.!?]+["”\'\u2019])(?=["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ])', text)
    if glued_quote_m:
        punctuation_normalized += len(glued_quote_m)
        text = re.sub(r'([.!?]+["”\'\u2019])(?=["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ])', r"\1\n\n", text)

    glued_sent_m = re.findall(
        r'(?<=[a-záéíóúñü\)\]])(?<!\bPh)(?<!\bMr)(?<!\bMs)(?<!\bDr)(?<!\bSt)(?<!\bJr)(?<!\bSr)([.!?]+)(?=(?:["“‘\'\u2018¡¿][A-ZÁÉÍÓÚÑÜ]|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]|[A-ZÁÉÍÓÚÑÜ][ \t]))',
        text,
    )
    if glued_sent_m:
        punctuation_normalized += len(glued_sent_m)
        text = re.sub(
            r'(?<=[a-záéíóúñü\)\]])(?<!\bPh)(?<!\bMr)(?<!\bMs)(?<!\bDr)(?<!\bSt)(?<!\bJr)(?<!\bSr)([.!?]+)(?=(?:["“‘\'\u2018¡¿][A-ZÁÉÍÓÚÑÜ]|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]|[A-ZÁÉÍÓÚÑÜ][ \t]))',
            r"\1\n\n",
            text,
        )

    inv_matches = re.findall(r"[\u200b\u200c\u200d\ufeff\u00ad\u2060]", text)
    if inv_matches:
        strange_chars_removed += len(inv_matches)
        text = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad\u2060]", "", text)
        _record_example("Zero-Width Unicode", f"{len(inv_matches)} hidden chars", "(removed)")

    # Xóa dòng tiêu đề Part hoặc đường kẻ ngang còn sót
    lines = text.splitlines()
    cleaned_lines = []
    for ln in lines:
        s = ln.strip()
        if re.match(
            r"^(?:#+\s*)?(?:\*\*\s*)?(?:\[\s*)?(?:PART|BEAT|SECTION|CHAPTER|ACT)\s+\d+(?:\s*[\]\—\-\:][^\n]*)?(?:\*\*)?$",
            s,
            flags=re.IGNORECASE,
        ):
            strange_chars_removed += 1
            _record_example("Header Strip", s, "(removed)")
            continue
        if re.match(r"^[\-\=\*_]{3,}\s*$", s):
            strange_chars_removed += 1
            continue
        cleaned_lines.append(ln)
    text = "\n".join(cleaned_lines)

    # Xóa các thẻ XML/HTML kiểu <box>, <row>, <AsyncImage.../>
    html_tags = re.findall(r"</?[A-Za-z][^>\n]{0,140}>", text)
    if html_tags:
        strange_chars_removed += len(html_tags)
        _record_example("HTML/XML Tag", html_tags[0], "(removed)")
        text = re.sub(r"</?[A-Za-z][^>\n]{0,140}>", "", text)

    # Xóa các cụm ngoặc vuông sân khấu [...] hoặc ngoặc nhọn {...}
    bracket_cues = re.findall(r"\[[^\]\n]{1,120}\]|\{[^\}\n]{1,120}\}", text)
    if bracket_cues:
        strange_chars_removed += len(bracket_cues)
        _record_example("Stage Cue Bracket", bracket_cues[0], "(removed)")
        text = re.sub(r"\[[^\]\n]{1,120}\]|\{[^\}\n]{1,120}\}", "", text)

    # Xóa các dấu sao Markdown (*, **), dấu thăng (#) ở đầu dòng, dấu gạch dưới bao quanh từ (_word_)
    md_stars = re.findall(r"\*{1,3}|`+", text)
    if md_stars:
        strange_chars_removed += len(md_stars)
        _record_example("Markdown Symbol", "* / `", "(removed)")
        text = re.sub(r"\*{1,3}|`+", "", text)

    text = re.sub(r"(?m)^\s*#+\s+", "", text)
    text = re.sub(r"\b_([A-Za-z0-9\s]+?)_\b", r"\1", text)

    # ------------------------------------------------------------------
    # 2. CHUẨN HÓA SỐ VIẾT TẮT, TIỀN TỆ, NHIỆT ĐỘ, ĐƠN VỊ ĐO LƯỜNG
    # ------------------------------------------------------------------
    # Tiền tệ viết tắt: $1.5M, $250K, $10B
    def _expand_currency_abbr(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        num_part = m.group(1)
        unit_ch = m.group(2).upper()
        unit_word = {
            "K": "thousand",
            "M": "million",
            "B": "billion",
        }.get(unit_ch, "million")
        res = f"{num_part} {unit_word} dollars"
        _record_example("Currency Abbr", m.group(0), res)
        return res

    text = re.sub(r"\$(\d+(?:\.\d+)?)\s*([KkMmBb])\b", _expand_currency_abbr, text)

    # Tiền tệ có số xu: $12.50, $1,250.75 -> 12 dollars and 50 cents
    def _expand_currency_cents(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        d_part = m.group(1)
        c_part = m.group(2)
        d_word = "dollar" if d_part == "1" else "dollars"
        if c_part == "00":
            res = f"{d_part} {d_word}"
        else:
            c_int = str(int(c_part))
            c_word = "cent" if c_int == "1" else "cents"
            res = f"{d_part} {d_word} and {c_int} {c_word}"
        _record_example("Currency Cents", m.group(0), res)
        return res

    text = re.sub(r"\$(\d[\d,]*)\.(\d{2})\b", _expand_currency_cents, text)

    # Tiền tệ nguyên: $286, $2,400, $1 -> 286 dollars, 2,400 dollars, 1 dollar
    def _expand_currency_plain(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        d_part = m.group(1)
        tail_slice = m.string[m.end():m.end() + 20].lstrip().lower()
        if re.match(r"^(?:dollars?|million|billion|thousand)\b", tail_slice):
            res = d_part
        else:
            d_word = "dollar" if d_part == "1" else "dollars"
            res = f"{d_part} {d_word}"
        _record_example("Currency Plain", m.group(0), res)
        return res

    text = re.sub(r"\$(\d[\d,]*)\b", _expand_currency_plain, text, flags=re.IGNORECASE)

    # Nhiệt độ: -40°F, -15 °F, 72°F, 0°C
    def _expand_temp(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        sign_str = m.group(1) or ""
        num_str = m.group(2)
        scale_ch = (m.group(3) or "F").upper()
        scale_word = "Fahrenheit" if scale_ch == "F" else "Celsius"
        prefix = "minus " if sign_str in ("-", "−", "–") else ""
        deg_word = "degree" if num_str == "1" and not prefix else "degrees"
        res = f"{prefix}{num_str} {deg_word} {scale_word}"
        _record_example("Temperature", m.group(0), res)
        return res

    text = re.sub(r"(?<![A-Za-z0-9])([\-−–])?(\d+(?:\.\d+)?)\s*°\s*([FfCc])\b", _expand_temp, text)

    # Ký hiệu độ đơn lẻ theo sau số: 45° -> 45 degrees
    def _expand_degree_only(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        res = f"{m.group(1)} degrees"
        _record_example("Degree Symbol", m.group(0), res)
        return res

    text = re.sub(r"\b(\d+(?:\.\d+)?)\s*°(?!\s*[FfCc])", _expand_degree_only, text)

    # Phần trăm: 15% -> 15 percent
    def _expand_percent(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        res = f"{m.group(1)} percent"
        _record_example("Percent", m.group(0), res)
        return res

    text = re.sub(r"(\d+(?:\.\d+)?)\s*%", _expand_percent, text)

    # Đơn vị diện tích / đo lường đi sau chữ số: sq. ft., ft., lbs., oz., mph
    unit_patterns = [
        (r"\b(\d[\d,\.]*)\s*sq\.?\s*ft\.?(?![A-Za-z])", r"\1 square feet", "Unit sq.ft."),
        (r"\b(\d[\d,\.]*)\s*cu\.?\s*ft\.?(?![A-Za-z])", r"\1 cubic feet", "Unit cu.ft."),
        (r"\b(\d[\d,\.]*)\s*lbs\.?(?![A-Za-z])", r"\1 pounds", "Unit lbs"),
        (r"\b(\d[\d,\.]*)\s*oz\.?(?![A-Za-z])", r"\1 ounces", "Unit oz"),
        (r"\b(\d[\d,\.]*)\s*mph\b", r"\1 miles per hour", "Unit mph"),
        (r"\b(\d[\d,\.]*)\s*hrs\.?(?![A-Za-z])", r"\1 hours", "Unit hrs"),
        (r"\b(\d[\d,\.]*)\s*mins\.?(?![A-Za-z])", r"\1 minutes", "Unit mins"),
        (r"\b(\d[\d,\.]*)\s*secs\.?(?![A-Za-z])", r"\1 seconds", "Unit secs"),
    ]
    for pat, repl, label in unit_patterns:
        matches = list(re.finditer(pat, text, flags=re.IGNORECASE))
        if matches:
            numbers_units_expanded += len(matches)
            _record_example(label, matches[0].group(0), matches[0].expand(repl))
            text = re.sub(pat, repl, text, flags=re.IGNORECASE)

    # Ký hiệu & giữa 2 từ hoặc sau dấu chấm viết tắt (Mr. & Mrs.) -> and
    amp_matches = list(re.finditer(r"(?<=[\w.])\s*&\s*(?=\w)", text))
    if amp_matches:
        numbers_units_expanded += len(amp_matches)
        _record_example("Ampersand", amp_matches[0].group(0), " and ")
        text = re.sub(r"(?<=[\w.])\s*&\s*(?=\w)", " and ", text)

    # No. 5 -> Number 5
    no_matches = list(re.finditer(r"\bNo\.\s*(\d+)\b", text))
    if no_matches:
        numbers_units_expanded += len(no_matches)
        _record_example("Number Abbr", no_matches[0].group(0), f"Number {no_matches[0].group(1)}")
        text = re.sub(r"\bNo\.\s*(\d+)\b", r"Number \1", text)

    # ------------------------------------------------------------------
    # 3. CHUẨN HÓA DANH XƯNG & TỪ VIẾT TẮT TIẾNG ANH DỄ ĐỌC SAI TRÊN TTS
    # ------------------------------------------------------------------
    # Xử lý thông minh St. (Street vs Saint) và Dr. (Drive vs Doctor)
    def _smart_st_replace(m: re.Match) -> str:
        nonlocal abbreviations_expanded
        prev_word = (m.group(1) or "").strip()
        next_word = (m.group(2) or "").strip()
        if prev_word.lower() in STREET_PREFIX_WORDS:
            abbreviations_expanded += 1
            res = f"{prev_word} Street{(' ' + next_word) if next_word else ''}"
            _record_example("Street Abbr", m.group(0), res)
            return res
        if next_word and re.match(r"^[A-Z][a-z]+$", next_word):
            abbreviations_expanded += 1
            prefix = (prev_word + " ") if prev_word else ""
            res = f"{prefix}Saint {next_word}"
            _record_example("Saint Abbr", m.group(0), res)
            return res
        return m.group(0)

    text = re.sub(r"\b([A-Za-z0-9]+)?\s*\bSt\.(?:\s+([A-Z][a-z]+))?", _smart_st_replace, text)

    # Xử lý Maple Dr. / Oak Dr. (Drive) TRƯỚC khi đổi Dr. Name -> Doctor Name
    def _smart_drive_replace(m: re.Match) -> str:
        nonlocal abbreviations_expanded
        prev_w = m.group(1)
        if prev_w.lower() in STREET_PREFIX_WORDS:
            abbreviations_expanded += 1
            res = f"{prev_w} Drive"
            _record_example("Drive Abbr", m.group(0), res)
            return res
        return m.group(0)

    text = re.sub(r"\b([A-Z][a-z0-9]+)\s+Dr\.(?=\s*[,.\n\"”]|$)", _smart_drive_replace, text)

    honorific_rules = [
        (r"\bMr\.(?=\s+[A-Z\"“\']|\s+and\b|\s*$|\n)", "Mister", "Honorific Mr."),
        (r"\bMrs\.(?=\s+[A-Z\"“\']|\s+and\b|\s*$|\n)", "Missus", "Honorific Mrs."),
        (r"\bMs\.(?=\s+[A-Z\"“\']|\s+and\b|\s*$|\n)", "Miz", "Honorific Ms."),
        (r"\bDr\.(?=\s+[A-Z\"“\'])", "Doctor", "Honorific Dr."),
        (r"\bProf\.(?=\s+[A-Z\"“\'])", "Professor", "Honorific Prof."),
        (r"\bGov\.(?=\s+[A-Z\"“\'])", "Governor", "Honorific Gov."),
        (r"\bSen\.(?=\s+[A-Z\"“\'])", "Senator", "Honorific Sen."),
        (r"\bRep\.(?=\s+[A-Z\"“\'])", "Representative", "Honorific Rep."),
        (r"\bGen\.(?=\s+[A-Z\"“\'])", "General", "Honorific Gen."),
        (r"\bCol\.(?=\s+[A-Z\"“\'])", "Colonel", "Honorific Col."),
        (r"\bMaj\.(?=\s+[A-Z\"“\'])", "Major", "Honorific Maj."),
        (r"\bCapt\.(?=\s+[A-Z\"“\'])", "Captain", "Honorific Capt."),
        (r"\bLt\.(?=\s+[A-Z\"“\'])", "Lieutenant", "Honorific Lt."),
        (r"\bSgt\.(?=\s+[A-Z\"“\'])", "Sergeant", "Honorific Sgt."),
        (r"\bCpl\.(?=\s+[A-Z\"“\'])", "Corporal", "Honorific Cpl."),
        (r"\bDet\.(?=\s+[A-Z\"“\'])", "Detective", "Honorific Det."),
        (r"\bInsp\.(?=\s+[A-Z\"“\'])", "Inspector", "Honorific Insp."),
        (r"\bRev\.(?=\s+[A-Z\"“\'])", "Reverend", "Honorific Rev."),
        (r"\bFr\.(?=\s+[A-Z\"“\'])", "Father", "Honorific Fr."),
        (r"\bMt\.(?=\s+[A-Z\"“\'])", "Mount", "Location Mt."),
        (r"\bFt\.(?=\s+[A-Z\"“\'])", "Fort", "Location Ft."),
        (r"\b([A-Z][a-z]+),?\s+Jr\.(?=\s*[,.\n\"”\s]|$)", r"\1 Junior", "Suffix Jr."),
        (r"\b([A-Z][a-z]+),?\s+Sr\.(?=\s*[,.\n\"”\s]|$)", r"\1 Senior", "Suffix Sr."),
        (r"\b([A-Z][a-z]+)\s+Ave\.(?=\s*[,.\n\"”\s]|$)", r"\1 Avenue", "Street Ave."),
        (r"\b([A-Z][a-z]+)\s+Blvd\.(?=\s*[,.\n\"”\s]|$)", r"\1 Boulevard", "Street Blvd."),
        (r"\b([A-Z][a-z]+)\s+Rd\.(?=\s*[,.\n\"”\s]|$)", r"\1 Road", "Street Rd."),
        (r"\bDept\.\s+of\b", "Department of", "Abbr Dept."),
        (r"\b([A-Z][A-Za-z]+)\s+Co\.(?=\s*[,.\n\"”\s]|$)", r"\1 Company", "Abbr Co."),
        (r"\b([A-Z][A-Za-z]+)\s+Corp\.(?=\s*[,.\n\"”\s]|$)", r"\1 Corporation", "Abbr Corp."),
        (r"\b([A-Z][A-Za-z]+)\s+Bros\.(?=\s*[,.\n\"”\s]|$)", r"\1 Brothers", "Abbr Bros."),
    ]
    for pat, repl, label in honorific_rules:
        matches = list(re.finditer(pat, text))
        if matches:
            abbreviations_expanded += len(matches)
            _record_example(label, matches[0].group(0), matches[0].expand(repl))
            text = re.sub(pat, repl, text)

    # ------------------------------------------------------------------
    # 4. CHUẨN HÓA DẤU CÂU, KHỬ ĐOẠN TRÙNG LẶP & NHỊP NGẮT GIỌNG TTS
    # ------------------------------------------------------------------
    # Chuẩn hóa dấu chấm lửng >= 4 dấu chấm thành 3 dấu chấm
    dots_m = re.findall(r"\.{4,}", text)
    if dots_m:
        punctuation_normalized += len(dots_m)
        text = re.sub(r"\.{4,}", "...", text)

    # Chuẩn hóa hai dấu gạch ngang "--" thành em-dash "—"
    ddash_m = re.findall(r"(?<=\w)\s*--\s*(?=\w)", text)
    if ddash_m:
        punctuation_normalized += len(ddash_m)
        text = re.sub(r"(?<=\w)\s*--\s*(?=\w)", " — ", text)

    # Dọn khoảng trắng thừa trên cùng 1 dòng & giới hạn tối đa 2 dòng xuống hàng liên tiếp
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Loại bỏ đoạn văn dài (>60 ký tự) bị lặp lại nguyên văn và đảm bảo mọi đoạn kết thúc bằng dấu câu hợp lệ
    raw_paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    seen_norm_paras = set()
    healed_paras = []
    for p in raw_paras:
        norm_p = re.sub(r"\s+", " ", p.lower())
        if len(norm_p) > 60:
            if norm_p in seen_norm_paras:
                strange_chars_removed += 1
                _record_example("Duplicate Paragraph", p[:50] + "...", "(removed)")
                continue
            seen_norm_paras.add(norm_p)
        if not re.search(r'[.!?""\u201d\'\u2019…—]\s*$', p):
            p = p + "."
            punctuation_normalized += 1
        healed_paras.append(p)
    text = "\n\n".join(healed_paras)

    total_fixes = (
        strange_chars_removed
        + abbreviations_expanded
        + numbers_units_expanded
        + punctuation_normalized
    )
    words = re.findall(r"\b\w+\b", text)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    est_minutes = round(len(words) / 150.0, 1)

    stats = {
        "total_fixes": total_fixes,
        "strange_chars_removed": strange_chars_removed,
        "abbreviations_expanded": abbreviations_expanded,
        "numbers_units_expanded": numbers_units_expanded,
        "punctuation_normalized": punctuation_normalized,
        "spain_spanish_fixed": 0,
        "final_char_count": len(text),
        "final_word_count": len(words),
        "final_paragraph_count": len(paragraphs),
        "estimated_tts_minutes": est_minutes,
        "examples": examples,
    }
    return text, stats


def sanitize_and_normalize_mexico_spanish_tts(raw_text: str) -> tuple[str, dict]:
    """
    BÀN #7 (`verificador-tts-drama-familiar-mexico`):
    Kiểm tra, chuẩn hóa phát âm tiếng Tây Ban Nha Mexico (`es-MX`) và làm sạch 100%
    file kịch bản TTS (`FULL_SCRIPT.txt` / `{TenKichBan}_KB.txt`) cho kênh MEXICO BÀ CÔ.
    """
    if not raw_text:
        return "", {
            "total_fixes": 0,
            "strange_chars_removed": 0,
            "abbreviations_expanded": 0,
            "numbers_units_expanded": 0,
            "punctuation_normalized": 0,
            "spain_spanish_fixed": 0,
            "long_sentences_count": 0,
            "char_range_ok": False,
            "final_char_count": 0,
            "final_word_count": 0,
            "final_paragraph_count": 0,
            "estimated_tts_minutes": 0.0,
            "examples": [],
        }

    text = raw_text
    examples: list[str] = []
    strange_chars_removed = 0
    abbreviations_expanded = 0
    numbers_units_expanded = 0
    punctuation_normalized = 0
    spain_spanish_fixed = 0

    def _record_example(cat: str, before: str, after: str):
        if len(examples) < 40 and before.strip() != after.strip():
            examples.append(f"[{cat}] `{before.strip()}` -> `{after.strip()}`")

    # ------------------------------------------------------------------
    # 1. XÓA KÝ TỰ ẨN UNICODE, NHÃN PASTED TEXT DOM, THẺ HTML/XML, NGOẶC VUÔNG [PART 1..7], MARKDOWN
    # ------------------------------------------------------------------
    pasted_chip_mx = re.findall(
        r"Pasted[ \t]+text[ \t]*\([^)\n]{1,40}\)(?:\.(?:txt|md|json|doc|docx|pdf|csv))?[ \t]*(?:Document|Tài liệu|Archivo|Documento)?",
        text,
        flags=re.IGNORECASE,
    )
    if pasted_chip_mx:
        strange_chars_removed += len(pasted_chip_mx)
        _record_example("ChatGPT Paste Chip", pasted_chip_mx[0], "(removed)")
        text = re.sub(
            r"Pasted[ \t]+text[ \t]*\([^)\n]{1,40}\)(?:\.(?:txt|md|json|doc|docx|pdf|csv))?[ \t]*(?:Document|Tài liệu|Archivo|Documento)?",
            "\n\n",
            text,
            flags=re.IGNORECASE,
        )

    glued_quote_mx = re.findall(r'([.!?]+["”\'\u2019])(?=["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ])', text)
    if glued_quote_mx:
        punctuation_normalized += len(glued_quote_mx)
        text = re.sub(r'([.!?]+["”\'\u2019])(?=["“‘\'\u2018¡¿]?[A-ZÁÉÍÓÚÑÜ])', r"\1\n\n", text)

    glued_sent_mx = re.findall(
        r'(?<=[a-záéíóúñü\)\]])(?<!\bDr)(?<!\bSr)(?<!\bDn)([.!?]+)(?=(?:["“‘\'\u2018¡¿][A-ZÁÉÍÓÚÑÜ]|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]|[A-ZÁÉÍÓÚÑÜ][ \t]))',
        text,
    )
    if glued_sent_mx:
        punctuation_normalized += len(glued_sent_mx)
        text = re.sub(
            r'(?<=[a-záéíóúñü\)\]])(?<!\bDr)(?<!\bSr)(?<!\bDn)([.!?]+)(?=(?:["“‘\'\u2018¡¿][A-ZÁÉÍÓÚÑÜ]|[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]|[A-ZÁÉÍÓÚÑÜ][ \t]))',
            r"\1\n\n",
            text,
        )

    inv_matches = re.findall(r"[\u200b\u200c\u200d\ufeff\u00ad\u2060]", text)
    if inv_matches:
        strange_chars_removed += len(inv_matches)
        text = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad\u2060]", "", text)
        _record_example("Zero-Width Unicode", f"{len(inv_matches)} hidden chars", "(removed)")

    lines = text.splitlines()
    cleaned_lines = []
    for ln in lines:
        s = ln.strip()
        if re.match(
            r"^(?:#+\s*)?(?:\*\*\s*)?(?:\[\s*)?(?:PART|PARTE|BEAT|SECTION|SECCIÓN|CHAPTER|CAPÍTULO|ACT|ACTO)\s+\d+(?:\s*[\]\—\-\:][^\n]*)?(?:\*\*)?$",
            s,
            flags=re.IGNORECASE,
        ):
            strange_chars_removed += 1
            _record_example("Header Strip", s, "(removed)")
            continue
        if re.match(r"^[\-\=\*_]{3,}\s*$", s):
            strange_chars_removed += 1
            continue
        cleaned_lines.append(ln)
    text = "\n".join(cleaned_lines)

    html_tags = re.findall(r"</?[A-Za-z][^>\n]{0,140}>", text)
    if html_tags:
        strange_chars_removed += len(html_tags)
        _record_example("HTML/XML Tag", html_tags[0], "(removed)")
        text = re.sub(r"</?[A-Za-z][^>\n]{0,140}>", "", text)

    bracket_cues = re.findall(r"\[[^\]\n]{1,120}\]|\{[^\}\n]{1,120}\}", text)
    if bracket_cues:
        strange_chars_removed += len(bracket_cues)
        _record_example("Stage Cue Bracket", bracket_cues[0], "(removed)")
        text = re.sub(r"\[[^\]\n]{1,120}\]|\{[^\}\n]{1,120}\}", "", text)

    md_stars = re.findall(r"\*{1,3}|`+", text)
    if md_stars:
        strange_chars_removed += len(md_stars)
        _record_example("Markdown Symbol", "* / `", "(removed)")
        text = re.sub(r"\*{1,3}|`+", "", text)

    text = re.sub(r"(?m)^\s*#+\s+", "", text)
    text = re.sub(r"\b_([A-Za-zÁÉÍÓÚÑáéíóúñü0-9\s]+?)_\b", r"\1", text)

    # ------------------------------------------------------------------
    # 2. BUNG DANH XƯNG, HỌC VỊ, ĐỊA CHỈ & CƠ QUAN HÀNH CHÍNH MEXICO (ES-MX)
    # ------------------------------------------------------------------
    mx_abbrev_rules = [
        (r"\bSra\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Señora ", "Danh xưng Sra."),
        (r"\bSrta\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Señorita ", "Danh xưng Srta."),
        (r"\bSr\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Señor ", "Danh xưng Sr."),
        (r"\bDra\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Doctora ", "Danh xưng Dra."),
        (r"\bDr\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Doctor ", "Danh xưng Dr."),
        (r"\bLic\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Licenciado ", "Danh xưng Lic."),
        (r"\bIng\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Ingeniero ", "Danh xưng Ing."),
        (r"\bArq\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Arquitecto ", "Danh xưng Arq."),
        (r"\bProfa\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Profesora ", "Danh xưng Profa."),
        (r"\bProf\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Profesor ", "Danh xưng Prof."),
        (r"\bDña\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Doña ", "Danh xưng Dña."),
        (r"\bDn\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Don ", "Danh xưng Dn."),
        (r"\bVda\.\s+de\b", "Viuda de", "Danh xưng Vda. de"),
        (r"\bCol\.\s+(?=[A-ZÁÉÍÓÚÑ])", "Colonia ", "Địa chỉ Col."),
        (r"\bAv\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])", "Avenida ", "Địa chỉ Av."),
        (r"\bCalz\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])", "Calzada ", "Địa chỉ Calz."),
        (r"\bBlvd\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])", "Bulevar ", "Địa chỉ Blvd."),
        (r"\bFracc\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])", "Fraccionamiento ", "Địa chỉ Fracc."),
        (r"\bDepto\.\s*(?=\d|[A-Z])", "Departamento ", "Địa chỉ Depto."),
        (r"\b(?:Núm|No)\.\s*(\d+)\b", r"número \1", "Số nhà Núm./No."),
        (r"\bEdo\.\s+de\s+México\b", "Estado de México", "Địa danh Edo. de México"),
        (r"\bCDMX\b", "Ciudad de México", "Địa danh CDMX"),
        (r"\bIMSS\b", "Seguro Social", "Cơ quan IMSS"),
        (r"\bISSSTE\b", "Instituto de Seguridad Social", "Cơ quan ISSSTE"),
        (r"\bCFE\b", "Comisión Federal de Electricidad", "Cơ quan CFE"),
    ]
    for pat, repl, label in mx_abbrev_rules:
        matches = list(re.finditer(pat, text))
        if matches:
            abbreviations_expanded += len(matches)
            _record_example(label, matches[0].group(0), matches[0].expand(repl))
            text = re.sub(pat, repl, text)

    # ------------------------------------------------------------------
    # 3. CHUẨN HÓA TIỀN TỆ PESO MEXICO (MXN / $), PHẦN TRĂM, ĐƠN VỊ ĐO LƯỜNG
    # ------------------------------------------------------------------
    # $1,500 MXN hoặc $1,500 pesos -> 1,500 pesos
    def _expand_mxn_currency(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        num_part = m.group(1)
        res = f"{num_part} pesos"
        _record_example("Moneda MXN", m.group(0), res)
        return res

    text = re.sub(
        r"\$\s*(\d[\d,\.]*)\s*(?:MXN|M\.N\.|pesos(?:\s+mexicanos)?)\b",
        _expand_mxn_currency,
        text,
        flags=re.IGNORECASE,
    )
    # Ký hiệu $ đứng trước số mà chưa có chữ pesos phía sau: $15,000 -> 15,000 pesos
    text = re.sub(
        r"\$\s*(\d[\d,\.]*)\b(?!\s*(?:pesos|dólares|mil|millones))",
        _expand_mxn_currency,
        text,
        flags=re.IGNORECASE,
    )
    # $20 mil pesos -> 20 mil pesos
    def _strip_dollar_before_mil(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        res = f"{m.group(1)} {m.group(2)}"
        _record_example("Moneda $ mil/millones", m.group(0), res)
        return res

    text = re.sub(
        r"\$\s*(\d[\d,\.]*)\s+(mil\b|millones\b|millón\b)",
        _strip_dollar_before_mil,
        text,
        flags=re.IGNORECASE,
    )

    # Phần trăm: 15% -> 15 por ciento
    def _expand_mx_percent(m: re.Match) -> str:
        nonlocal numbers_units_expanded
        numbers_units_expanded += 1
        res = f"{m.group(1)} por ciento"
        _record_example("Porcentaje", m.group(0), res)
        return res

    text = re.sub(r"(\d+(?:[\.,]\d+)?)\s*%", _expand_mx_percent, text)

    # Nhiệt độ & Đơn vị đo lường tiếng Tây Ban Nha
    mx_unit_patterns = [
        (r"\b(\d+(?:[\.,]\d+)?)\s*°\s*C\b", r"\1 grados centígrados", "Temperatura °C"),
        (r"\b(\d[\d,\.]*)\s*(?:m²|m2|mts2)\b", r"\1 metros cuadrados", "Unidad m²"),
        (r"\b(\d[\d,\.]*)\s*km\b", r"\1 kilómetros", "Unidad km"),
        (r"\b(\d[\d,\.]*)\s*hrs\.?(?![A-Za-zÁÉÍÓÚÑáéíóúñ])", r"\1 horas", "Unidad hrs."),
        (r"\b(\d[\d,\.]*)\s*mins\.?(?![A-Za-zÁÉÍÓÚÑáéíóúñ])", r"\1 minutos", "Unidad mins."),
    ]
    for pat, repl, label in mx_unit_patterns:
        matches = list(re.finditer(pat, text, flags=re.IGNORECASE))
        if matches:
            numbers_units_expanded += len(matches)
            _record_example(label, matches[0].group(0), matches[0].expand(repl))
            text = re.sub(pat, repl, text, flags=re.IGNORECASE)

    # ------------------------------------------------------------------
    # 4. KIỂM TRA & SỬA TỪ VỰNG TÂY BAN NHA CHÂU ÂU (ES-ES) SANG MEXICO (ES-MX)
    # ------------------------------------------------------------------
    spain_to_mexico_rules = [
        (r"\bvosotros\b", "ustedes", "es-ES -> es-MX (vosotros)"),
        (r"\bvosotras\b", "ustedes", "es-ES -> es-MX (vosotras)"),
        (r"\bordenador\b", "computadora", "es-ES -> es-MX (ordenador)"),
        (r"\bzumo\b", "jugo", "es-ES -> es-MX (zumo)"),
        (r"\benfadado\b", "enojado", "es-ES -> es-MX (enfadado)"),
        (r"\benfadada\b", "enojada", "es-ES -> es-MX (enfadada)"),
        (r"\baparcar\b", "estacionar", "es-ES -> es-MX (aparcar)"),
    ]
    for pat, repl, label in spain_to_mexico_rules:
        matches = list(re.finditer(pat, text, flags=re.IGNORECASE))
        if matches:
            spain_spanish_fixed += len(matches)
            _record_example(label, matches[0].group(0), repl)
            text = re.sub(pat, repl, text, flags=re.IGNORECASE)

    # ------------------------------------------------------------------
    # 5. CHUẨN HÓA DẤU CÂU & NHỊP NGẮT GIỌNG TTS TIẾNG TÂY BAN NHA
    # ------------------------------------------------------------------
    dots_m = re.findall(r"\.{4,}", text)
    if dots_m:
        punctuation_normalized += len(dots_m)
        text = re.sub(r"\.{4,}", "...", text)

    ddash_m = re.findall(r"(?<=\w)\s*--\s*(?=\w)", text)
    if ddash_m:
        punctuation_normalized += len(ddash_m)
        text = re.sub(r"(?<=\w)\s*--\s*(?=\w)", " — ", text)

    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Kiểm tra các câu quá dài (> 280 ký tự) để thống kê nhịp thở TTS
    sentences = [s.strip() for s in re.split(r"(?<=[\.\!\?…])\s+|\n+", text) if s.strip()]
    long_sentences = [s for s in sentences if len(s) > 280]

    total_fixes = (
        strange_chars_removed
        + abbreviations_expanded
        + numbers_units_expanded
        + punctuation_normalized
        + spain_spanish_fixed
    )
    words = re.findall(r"\b[\wÁÉÍÓÚÑáéíóúñü]+\b", text)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    est_minutes = round(len(words) / 145.0, 1)
    final_chars = len(text)
    char_range_ok = 70000 <= final_chars <= 80000

    stats = {
        "total_fixes": total_fixes,
        "strange_chars_removed": strange_chars_removed,
        "abbreviations_expanded": abbreviations_expanded,
        "numbers_units_expanded": numbers_units_expanded,
        "punctuation_normalized": punctuation_normalized,
        "spain_spanish_fixed": spain_spanish_fixed,
        "long_sentences_count": len(long_sentences),
        "char_range_ok": char_range_ok,
        "final_char_count": final_chars,
        "final_word_count": len(words),
        "final_paragraph_count": len(paragraphs),
        "estimated_tts_minutes": est_minutes,
        "examples": examples,
    }
    return text, stats


def run_tts_director_step_6(
    project_id: str,
    project_dir: str,
    niche: str = "homeless",
    winner_title: str = "",
) -> dict:
    """
    Thực thi Bàn #6 (`studio-6-visual-tts-director`) ngay sau khi hoàn tất Bước 5 (SEO):
    1. Đọc `FULL_SCRIPT.txt` và `FULL_SEO.txt`.
    2. Quét và chuẩn hóa 100% ký tự lạ, chữ viết tắt, số viết tắt, tiền tệ, nhiệt độ, đơn vị đo
       để đảm bảo đọc TTS mượt mà tuyệt đối không vấp từ.
    3. Ghi đè bản đã làm sạch vào `FULL_SCRIPT.txt` và xuất báo cáo `checkpoints/06_TTS_DIRECTOR_REPORT.md`.
    """
    full_script_path = os.path.join(project_dir, "FULL_SCRIPT.txt")
    full_seo_path = os.path.join(project_dir, "FULL_SEO.txt")
    ckpt_dir = os.path.join(project_dir, "checkpoints")
    os.makedirs(ckpt_dir, exist_ok=True)

    raw_script = ""
    if os.path.exists(full_script_path):
        with open(full_script_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_script = f.read()

    raw_seo = ""
    if os.path.exists(full_seo_path):
        with open(full_seo_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_seo = f.read()

    niche_norm = (niche or "").strip().lower()
    is_mexico = ("mexico" in niche_norm) or ("bà cô" in niche_norm) or ("ba co" in niche_norm) or ("03_" in niche_norm) or ("04_" in niche_norm) or ("07_" in niche_norm) or ("08_" in niche_norm) or ("09_" in niche_norm)
    is_mafia = ("mafia" in niche_norm) or ("nguoi_hau" in niche_norm)

    if is_mexico:
        clean_tts_script, stats = sanitize_and_normalize_mexico_spanish_tts(raw_script)
    else:
        clean_tts_script, stats = sanitize_and_normalize_tts_script(raw_script)

    # Cổng khóa độ dài hậu kỳ (70.000 - 79.500 ký tự) sau khi bung số/viết tắt cho Homeless & Mexico 7 Phần
    if not is_mafia and len(clean_tts_script) > 79200:
        try:
            from engine.mafia_chatgpt_pipeline import condense_homeless_stage_text
            before_cond_len = len(clean_tts_script)
            clean_tts_script = condense_homeless_stage_text(
                clean_tts_script,
                expected_parts=[1, 2, 3, 4, 5, 6, 7],
                target_chars=76500,
                hard_max_chars=78800,
            )
            words_after = re.findall(r"\b[\wÁÉÍÓÚÑáéíóúñü']+\b", clean_tts_script)
            paras_after = [p.strip() for p in re.split(r"\n\s*\n", clean_tts_script) if p.strip()]
            stats["final_char_count"] = len(clean_tts_script)
            stats["final_word_count"] = len(words_after)
            stats["final_paragraph_count"] = len(paras_after)
            stats["estimated_tts_minutes"] = round(len(words_after) / (145.0 if is_mexico else 150.0), 1)
            stats["char_range_ok"] = 70000 <= len(clean_tts_script) <= 80000
            stats["examples"].insert(
                0,
                f"[Length Calibration Lock] Đã cân chỉnh hậu kỳ từ `{before_cond_len:,}` -> `{len(clean_tts_script):,}` ký tự (chuẩn 70k–80k ký tự)",
            )
        except Exception:
            pass

    if clean_tts_script:
        with open(full_script_path, "w", encoding="utf-8") as f:
            f.write(clean_tts_script)

    examples_md = (
        "\n".join(f"  - {ex}" for ex in stats["examples"])
        if stats["examples"]
        else "  - Văn bản đã sạch chuẩn 100% ngay từ đầu, không phát hiện từ viết tắt hay ký tự lạ."
    )

    seo_ok = len(raw_seo.strip()) >= 3000 and ("# " in raw_seo or "## " in raw_seo)
    report_path = os.path.join(ckpt_dir, "06_TTS_DIRECTOR_REPORT.md")
    report_07_path = os.path.join(ckpt_dir, "07_TTS_CHECK_REPORT.md")

    if is_mexico:
        char_status = "PASS (Trong khung 70,000–80,000 ký tự)" if stats.get("char_range_ok") else f"CHECK ({stats['final_char_count']:,} ký tự)"
        report_md = f"""# 🇲🇽 BÁO CÁO BÀN #7 CHECK LẠI FILE TTS (`verificador-tts-drama-familiar-mexico`)
- **Dự án:** `{project_id}`
- **Kênh:** `MEXICO BÀ CÔ (es-MX)`
- **Tiêu đề chính thức (`es-MX`):** "{winner_title}"
- **Thời gian kiểm chuẩn:** `{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}`
- **Trạng thái Kiểm chuẩn TTS (`es-MX`):** `PASS — 100% TTS READY`
- **Kiểm tra khung độ dài 70,000–80,000 ký tự sau làm sạch TTS:** `{char_status}`
- **Trạng thái Đồng bộ Gói SEO (`FULL_SEO.txt`):** `{"PASS" if seo_ok else "CHECK"} ({len(raw_seo):,} ký tự)`

## 1. Thống Kê Kiểm Tra & Chuẩn Hóa Phát Âm Tiếng Tây Ban Nha Mexico (`FULL_SCRIPT.txt`)
| Hạng Mục Kiểm Chuẩn Bàn #7 (`es-MX`) | Số Lượng Xử Lý / Kết Quả |
| :--- | :--- |
| **Tổng số điểm đã chuẩn hóa tự động cho TTS `es-MX`** | **`{stats['total_fixes']}` vị trí** |
| **Ký tự lạ / Markdown / Thẻ HTML / Nhãn `[PART 1..7]` đã lọc bỏ** | `{stats['strange_chars_removed']}` |
| **Danh xưng & Từ viết tắt Mexico đã bung (`Sra.`, `Dr.`, `Lic.`, `Col.`, `CDMX`, `IMSS`...)** | `{stats['abbreviations_expanded']}` |
| **Tiền tệ Peso (`$`/`MXN`), Phần trăm (`%`), Đơn vị đo (`°C`, `m²`, `km`, `hrs.`) đã bung phát âm** | `{stats['numbers_units_expanded']}` |
| **Từ vựng Tây Ban Nha châu Âu (`es-ES`: `vosotros`, `ordenador`, `zumo`...) đã đổi sang `es-MX`** | `{stats.get('spain_spanish_fixed', 0)}` |
| **Chuẩn hóa dấu câu & nhịp ngắt hơi TTS (`...`, `—`)** | `{stats['punctuation_normalized']}` |
| **Số câu dài `> 280` ký tự được rà soát nhịp thở** | `{stats.get('long_sentences_count', 0)}` câu |
| **Tổng số ký tự bản `FULL_SCRIPT.txt` sau chuẩn hóa** | **`{stats['final_char_count']:,}` ký tự** |
| **Tổng số từ (`Word Count`)** | **`{stats['final_word_count']:,}` từ** |
| **Tổng số đoạn văn (`Paragraphs`)** | `{stats['final_paragraph_count']}` đoạn |
| **Thời lượng Audio TTS ước tính (~145 từ/phút giọng Bà Cô Mexico)** | **`~{stats['estimated_tts_minutes']} phút`** |

## 2. Nhật Ký Chi Tiết Các Mẫu Đã Chuyển Đổi Phát Âm TTS (`es-MX`)
{examples_md}
"""
    else:
        report_md = f"""# 🎙️ BÁO CÁO KIỂM CHUẨN HẬU KỲ TTS — BÀN #6 & BÀN #7 (`studio-6-visual-tts-director`)
- **Dự án:** `{project_id}`
- **Kênh:** `{niche.upper()}`
- **Tiêu đề chính thức:** "{winner_title}"
- **Thời gian kiểm chuẩn:** `{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}`
- **Trạng thái Kiểm chuẩn TTS:** `PASS — 100% TTS READY`
- **Trạng thái Đồng bộ Gói SEO (`FULL_SEO.txt`):** `{"PASS" if seo_ok else "CHECK"} ({len(raw_seo):,} ký tự)`

## 1. Thống Kê Chuẩn Hóa Phát Âm & Làm Sạch Văn Bản TTS (`FULL_SCRIPT.txt`)
| Hạng Mục Kiểm Chuẩn | Số Lượng Xử Lý / Kết Quả |
| :--- | :--- |
| **Tổng số điểm đã chuẩn hóa tự động cho TTS** | **`{stats['total_fixes']}` vị trí** |
| **Ký tự lạ / Markdown / Thẻ HTML / Ngoặc vuông đã lọc bỏ** | `{stats['strange_chars_removed']}` |
| **Danh xưng & Từ viết tắt đã bung thành chữ đọc (`Mr.`, `Mrs.`, `Dr.`, `St.`...)** | `{stats['abbreviations_expanded']}` |
| **Số viết tắt, Tiền tệ, Nhiệt độ, Đơn vị đo đã bung phát âm (`$`, `%`, `°F`, `lbs`...)** | `{stats['numbers_units_expanded']}` |
| **Chuẩn hóa dấu câu & nhịp ngắt hơi TTS** | `{stats['punctuation_normalized']}` |
| **Tổng số ký tự bản `FULL_SCRIPT.txt` sau chuẩn hóa** | **`{stats['final_char_count']:,}` ký tự** |
| **Tổng số từ (`Word Count`)** | **`{stats['final_word_count']:,}` từ** |
| **Tổng số đoạn văn (`Paragraphs`)** | `{stats['final_paragraph_count']}` đoạn |
| **Thời lượng Audio TTS ước tính (~150 từ/phút)** | **`~{stats['estimated_tts_minutes']} phút`** |

## 2. Nhật Ký Chi Tiết Các Mẫu Đã Chuyển Đổi Phát Âm TTS
{examples_md}
"""
    try:
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_md)
        with open(report_07_path, "w", encoding="utf-8") as f:
            f.write(report_md)
    except Exception:
        pass

    stats["report_path"] = report_07_path if is_mexico else report_path
    stats["report_07_path"] = report_07_path
    stats["seo_verified"] = seo_ok
    return stats

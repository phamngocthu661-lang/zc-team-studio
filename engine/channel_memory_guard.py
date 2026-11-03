r"""
================================================================================
BÀN #1.5 (`studio-canon-guard`): QUẢN LÝ TRÍ NHỚ KÊNH & CHỐNG TRÙNG LẶP TOÀN KÊNH
(CROSS-STORY CLICHÉ, CHARACTER NAME, LOCATION, PROP & TWIST GUARD)
================================================================================
Giải quyết Lỗ hổng #4:
- Tự động đọc và cập nhật sổ tay `CHANNEL_MEMORY.json` (cùng `CHANNEL_MEMORY_HOMELESS.json`
  và `CHANNEL_MEMORY_MAFIA.json`), lưu trữ tối đa 30–100 kịch bản gần nhất của từng kênh.
- Tự động quét (Auto-Backfill) các kịch bản đã sản xuất trong `PROJECTS` và `PROJECTS_HOMELESS`
  để trích xuất:
  1. Tên nhân vật chính / phản diện / nhân vật phụ (`character_names`)
  2. Tên thị trấn / bang / dinh thự / bất động sản (`locations`)
  3. Vật chứng / giấy tờ / di chúc / vị trí giấu đồ (`signature_props`)
  4. Cú Twist / Bí mật cốt lõi (`twist_summary`)
- Trước khi Bàn #2 lập Giàn ý, `studio-canon-guard` xuất biên bản
  `checkpoints/01_5_CANON_GUARD_DIRECTIVE.md` và cấp danh sách
  "Từ khóa / Tên nhân vật / Địa danh / Mô-típ vật chứng CẤM LẶP LẠI" kèm gợi ý biến số mới
  để đảm bảo 100 kịch bản trên kênh có 100 bộ nhân vật và tình tiết mới mẻ 100%.
================================================================================
"""

import os
import re
import json
import threading
from datetime import datetime

MEMORY_LOCK = threading.Lock()
MAX_MEMORY_RECORDS = 100
RECENT_WINDOW_FOR_PROMPT = 30

# Các từ tiếng Anh viết hoa thông thường KHÔNG phải là tên riêng nhân vật
NON_NAME_STOPWORDS = {
    "The", "And", "But", "For", "Nor", "Or", "Yet", "So", "In", "On", "At", "To", "From",
    "By", "With", "About", "Against", "Between", "Into", "Through", "During", "Before",
    "After", "Above", "Below", "Under", "Over", "Again", "Further", "Then", "Once", "Here",
    "There", "When", "Where", "Why", "How", "All", "Any", "Both", "Each", "Few", "More",
    "Most", "Other", "Some", "Such", "No", "Nor", "Not", "Only", "Own", "Same", "Than",
    "Too", "Very", "Can", "Will", "Just", "Should", "Now", "Part", "Beat", "Act", "Scene",
    "Chapter", "Section", "Stage", "Mode", "Step", "Story", "Core", "Title", "Locked",
    "Final", "Primary", "Secondary", "Outline", "Script", "Draft", "Revision", "Audit",
    "Report", "Score", "Pass", "Fail", "True", "False", "None", "Null", "Yes", "No",
    "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Last", "Next",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December", "Spring", "Summer", "Autumn", "Fall", "Winter",
    "North", "South", "East", "West", "Northern", "Southern", "Eastern", "Western", "Central",
    "Street", "Road", "Avenue", "Boulevard", "Lane", "Drive", "Court", "Place", "Square",
    "County", "State", "City", "Town", "Village", "Valley", "Creek", "River", "Lake",
    "Mountain", "Ridge", "Hill", "Hills", "Woods", "Forest", "Meadow", "Prairie", "Plains",
    "Manor", "Estate", "Villa", "Mansion", "Cabin", "Cottage", "House", "Home", "Ranch",
    "Farm", "Barn", "Shed", "Cellar", "Attic", "Hall", "Room", "Kitchen", "Office",
    "Hospital", "Church", "School", "Bank", "Hotel", "Diner", "Restaurant", "Station",
    "Sheriff", "Deputy", "Officer", "Detective", "Judge", "Lawyer", "Doctor", "Nurse",
    "Pastor", "Father", "Mother", "Sister", "Brother", "Uncle", "Aunt", "Grandma", "Grandpa",
    "Grandmother", "Grandfather", "Husband", "Wife", "Widow", "Widower", "Son", "Daughter",
    "Boss", "Don", "Capo", "Consigliere", "Mafia", "Cartel", "Syndicate", "Family",
    "Homeless", "Abandoned", "Forgotten", "Hidden", "Secret", "Legacy", " Billionaire",
    "Millionaire", "Waitress", "Maid", "Cleaner", "Single", "Mom", "Woman", "Man", "Girl",
    "Boy", "Child", "Kids", "People", "Everyone", "Nobody", "Someone", "Anyone",
    "American", "English", "Italian", "Russian", "Irish", "New", "Old", "Young", "Little",
    "Great", "Good", "Bad", "High", "Low", "Long", "Short", "Big", "Small", "Black", "White",
    "Red", "Blue", "Green", "Golden", "Silver", "Iron", "Stone", "Clay", "Wood", "Timber",
    "Protagonist", "Antagonist", "Skeptic", "Mentor", "Helper", "Witness", "Neighbor",
    "Contractor", "Inspector", "Director", "Manager", "Owner", "Founder", "Chairman",
    "United", "States", "America", "York", "Chicago", "Boston", "Miami", "Vegas", " Angeles",
    "Montana", "Nebraska", "Wyoming", "Idaho", "Colorado", "Dakota", "Alaska", "Maine",
    "Vermont", "Appalachian", "Ozark", "Texas", "Kentucky", "Tennessee", "Virginia",
    "Oregon", "Washington", "Michigan", "Wisconsin", "Minnesota", "Iowa", "Kansas",
    "Ohio", "Pennsylvania", "New York", "New Jersey", "New Mexico", "New Hampshire",
    "North Carolina", "South Carolina", "North Dakota", "South Dakota", "West Virginia",
    "Rhode Island", "San Francisco", "Los Angeles", "Las Vegas", "New Orleans",
    "Grand Reveal", "True Emotional", "Emotional Promise", "One Sentence", "Story Core",
    "Canon Family", "Hard Realism", "Resolution Mode", "Shared Theme", "Discovery Causality",
    "Primary Mystery", "Deeper Mystery", "Current Condition", "Legal Status", "Former Purpose",
    "Property Name", "Property Type", "Land Area", "Approximate Age", "Character Agency",
    "Practical Competence", "Moral Strength", "Emotional Wound", "Starting Belief",
}

# Kho gợi ý tên mới đa dạng để hỗ trợ Bàn #2 chọn biến số không trùng lặp
FRESH_PROTAGONIST_NAMES_POOL = [
    "Clara Hendry", "Tessa Marlowe", "Lydia Vance", "Hannah Sterling", "Miriam Keaton",
    "Nadia Callahan", "Evelyn Prescott", "Rachel Mercer", "Joanna Lindqvist", "Valerie Sutter",
    "Audrey Halstead", "Beatrice Crandall", "Camille Renfro", "Diana Thornburn", "Eliza Gentry",
    "Fiona Carmichael", "Grace Alderman", "Helena Redfield", "Iris Penniman", "Juliet Braddock",
    "Katherine Dunsmore", "Laura Ashworth", "Madeline Stanhope", "Nora Fenwick", "Olive Winslow",
    "Phoebe Taggart", "Quinn Ellery", "Rosalind Vance", "Sylvia Holbrook", "Theresa Baines",
    "jonah Kessler", "Caleb Rutledge", "Gideon Vance", "Eliot Bramwell", "Nathaniel Cross",
    "Samuel Bridger", "Isaac Thorne", "Lucas Hensley", "Micah Aldridge", "Rowan Sturgis",
]

FRESH_ANTAGONIST_NAMES_POOL = [
    "Victor Castellano", "Dario Lombardo", "Matteo Bellini", "Lorenzo DeLuca", "Enzo Santoro",
    "Gavin Pritchard", "Harlan Vance", "Boyd McAllister", "Preston Gable", "Warren Keefe",
    "Garrett Langdon", "Mitchell Driscoll", "Vernon Slade", "Clifford Baines", "Raymond Harker",
    "Brenda Holloway", "Cynthia Sterling", "Monica Albright", "Patricia Vance", "Deborah Kulkarni",
    "Corinne Hargrove", "Vanessa Mallory", "Judith Vance", "Sheila Drummond", "Lorraine Pruitt",
]

FRESH_LOCATIONS_POOL_HOMELESS = [
    "Bitterroot Valley (Idaho)", "Clearwater County (Montana)", "Sawtooth Ridge (Wyoming)",
    "Ironwood Creek (Upper Peninsula, Michigan)", "Pinehollow Township (Maine)",
    "Coldwater Basin (Eastern Oregon)", "Alder Creek (Northern Minnesota)",
    "limestone Bluffs (Ozark Highlands, Missouri)", "Redstone Gulch (Colorado)",
    "Whitefish Coulee (North Dakota)", "Tamarack Flats (Washington)", "Driftwood Hollow (West Virginia)",
    "Cinder Hill (New Hampshire)", "Brimstone Gap (Eastern Kentucky)", "Silverthorn Ridge (Vermont)",
]

FRESH_LOCATIONS_POOL_MAFIA = [
    "Beacon Hill & Charlestown Docks (Boston)", "Gold Coast & West Loop (Chicago)",
    "Rittenhouse Square & South Philly Pier (Philadelphia)", "Coral Gables & Brickell Bay (Miami)",
    "Nob Hill & Embarcadero Vaults (San Francisco)", "Upper East Side & Red Hook (New York)",
    "Garden District & French Quarter (New Orleans)", "Georgetown & Potomac Estates (D.C.)",
    "Highland Park & Trinity Industrial (Dallas)", "Buckhead & Peachtree Suites (Atlanta)",
]

FRESH_PROPS_AND_MECHANISMS_POOL = [
    "sổ cái đóng gáy da cừu chống ẩm đặt trong ống đồng hàn kín dưới bậc đá tam cấp",
    "bản đồ khảo sát địa chất năm 1938 vẽ bằng mực sắt-gall khâu lót trong áo khoác dạ cũ",
    "chứng thư quyền nguồn nước suối khoáng (Mineral & Water Rights Deed) cất trong hộp đạn kẽm",
    "bộ khuôn đúc chì và nhật ký kỹ thuật của người thợ mỏ/thợ rèn lưu trong hốc thông gió lò sưởi",
    "hợp đồng tín thác đường sắt cổ (Railroad Right-of-Way Trust) niêm phong bằng sáp ong",
    "bản vẽ kết cấu hầm tránh bão kết hợp mạch nước ngầm tự chảy (Gravity-Fed Cistern Blueprint)",
    "hộp nhạc cơ khí khắc mã số két sắt ngân hàng bang kèm biên lai nộp thuế đất 40 năm",
    "nhật ký y tế & danh sách cứu trợ trận lũ năm 1964 giấu sau tấm ván tuyết tùng",
]

# Kho gợi ý biến số mới sạch 100% cho kênh MEXICO BÀ CÔ (es-MX Family Drama)
FRESH_PROTAGONIST_NAMES_POOL_MEXICO = [
    "Doña Amalia Cárdenas", "Doña Consuelo Ríos", "Doña Socorro Treviño", "Doña Esperanza Villaseñor",
    "Doña Remedios Elizondo", "Doña Margarita Orozco", "Doña Josefina Zambrano", "Doña Celia Mondragón",
    "Doña Ofelia Santillán", "Doña Beatriz Valenzuela", "Doña Graciela Cisneros", "Doña Aurora Peñaloza",
    "Doña Irma Galindo", "Doña Lidia Saucedo", "Doña Eugenia Montemayor", "Doña Herminia Covarrubias",
    "Doña Catalina Salgado", "Doña Matilde Pineda", "Doña Raquel Alcántara", "Doña Estela Solís",
]

FRESH_ANTAGONIST_NAMES_POOL_MEXICO = [
    "Mauricio Cárdenas (hijo) & Lorena Ibáñez (nuera)",
    "Arturo Ríos (hijo) & Fabiola Quintero (nuera)",
    "Gerardo Treviño (yerno) & Adriana Villaseñor (hija)",
    "Héctor Orozco (hijo) & Vanessa Gallardo (nuera)",
    "Braulio Zambrano (hijo) & Doña Prudencia (consuegra)",
    "Ramiro Mondragón (yerno) & Miriam (hija)",
    "Octavio Santillán (hijo) & Claudia Lomelí (nuera)",
    "Rubén Valenzuela (hijo) & Marisol (nuera)",
    "Víctor Cisneros (hijo) & Karina (nuera)",
    "Gustavo Peñaloza (yerno) & Leticia (hija)",
]

FRESH_LOCATIONS_POOL_MEXICO = [
    "Cholula & Colonia La Paz (Puebla)",
    "Tlaquepaque & Colonia Americana (Guadalajara, Jalisco)",
    "Barrio Antiguo & San Nicolás (Monterrey, Nuevo León)",
    "Centro Histórico & Juriquilla (Querétaro)",
    "Barrio de Santiago & Paseo de Montejo (Mérida, Yucatán)",
    "Barrio de Jalatlaco & Centro (Oaxaca)",
    "Colonia Chapultepec & Centro (Morelia, Michoacán)",
    "Coyoacán & Colonia Del Valle (Ciudad de México)",
    "Metepec & Centro (Toluca, Estado de México)",
    "Colonia Andrade & Zona Piel (León, Guanajuato)",
    "Boca del Río & Centro (Veracruz)",
    "Barrio de San Marcos (Aguascalientes)",
    "Tequisquiapan & Centro (San Luis Potosí)",
    "Colonia Vista Hermosa (Cuernavaca, Morelos)",
]

FRESH_PROPS_AND_MECHANISMS_POOL_MEXICO = [
    "escrituras originales con cláusula de usufructo vitalicio resguardadas en la notaría pública (Fonda tradicional)",
    "carpeta de transferencias y estados de cuenta sellados por el contador + revocación de poder notarial (Panadería de barrio)",
    "contrato de donación condicionada con cláusula de reversión por ingratitud + pagarés vencidos (Taller de costura)",
    "título de propiedad del local comercial del mercado y recibos de predial de 30 años a nombre de la madre (Puesto de tamales y atole)",
    "testamento público abierto actualizado y bloqueo de cuentas mancomunadas ante el banco (Maestra jubilada)",
    "acta constitutiva de la tortillería familiar y grabaciones de seguridad del patio que prueban el despojo",
]


KNOWN_12_FOLDER_KEYS = {
    "01_nhom_ong_gia_tra_dua_my_us": "01_Nhom_Ong_Gia_Tra_Dua_My_US",
    "02_nhom_phu_nu_bao_thu_my_us": "02_Nhom_Phu_Nu_Bao_Thu_My_US",
    "03_nhom_ba_gia_drama_gia_dinh_mexico": "03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico",
    "04_nhom_ong_gia_trung_tri_mexico": "04_Nhom_Ong_Gia_Trung_Tri_Mexico",
    "05_nhom_manga_doc_than_japan": "05_Nhom_Manga_Doc_Than_Japan",
    "06_huu_tri_viec_lam_japan": "06_Huu_Tri_Viec_Lam_Japan",
    "07_dong_que_co_dien_mexico": "07_Dong_Que_Co_Dien_Mexico",
    "08_tinh_yeu_ngoai_tinh_phan_boi_mexico": "08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico",
    "09_tieu_su_goc_khuat_sao_mexico": "09_Tieu_Su_Goc_Khuat_Sao_Mexico",
    "10_nguoi_cha_da_mau_ceo_ngam_my_us": "10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US",
    "11_chuyen_tinh_dan_ong_my_us": "11_Chuyen_Tinh_Dan_Ong_My_US",
    "12_kinh_di_dem_khuya_my_us": "12_Kinh_Di_Dem_Khuya_My_US",
}


def _normalize_niche_key(niche: str) -> str:
    s = str(niche or "").lower().strip()
    if s in KNOWN_12_FOLDER_KEYS:
        return KNOWN_12_FOLDER_KEYS[s]
    if "mexico" in s:
        return "mexico"
    if "homeless" in s:
        return "homeless"
    return "mafia"


def _get_memory_file_paths(studio_root: str, niche: str) -> tuple[str, str]:
    niche_clean = _normalize_niche_key(niche)
    niche_path = os.path.join(studio_root, f"CHANNEL_MEMORY_{niche_clean.upper()}.json")
    shared_path = os.path.join(studio_root, "CHANNEL_MEMORY.json")
    return niche_path, shared_path


def _read_text_safe(path: str) -> str:
    if not path or not os.path.exists(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""


def _write_json_safe(path: str, data: dict):
    try:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def _is_valid_person_name(cand: str) -> bool:
    if not cand or len(cand) < 4 or len(cand) > 40:
        return False
    parts = [p.strip() for p in cand.split() if p.strip()]
    if len(parts) < 1 or len(parts) > 4:
        return False
    for p in parts:
        if p in NON_NAME_STOPWORDS:
            return False
        if p in ("Doña", "Don", "Señora", "Señor", "Licenciado", "Licenciada", "Doctora", "Doctor"):
            continue
        if not re.match(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,18}$", p):
            return False
    if cand in NON_NAME_STOPWORDS:
        return False
    return True


def extract_story_metadata_from_project(project_dir: str, project_id: str = "", winner_title: str = "") -> dict:
    """
    Trích xuất tự động:
    - character_names (Họ tên nhân vật chính, phản diện, nhân vật phụ — hỗ trợ cả tiếng Anh và tiếng Tây Ban Nha Mexico)
    - locations (Thị trấn, bang, colonia, thành phố Mexico, tên thửa đất/dinh thự)
    - signature_props (Vật chứng, giấy tờ, escrituras, fonda, công trình, kỷ vật)
    - twist_summary (Cú twist / bí mật cốt lõi / Reversal)
    từ `checkpoints/02_STORY_OUTLINE.md` và `FULL_SCRIPT.txt` / `CURRENT_WORKING_SCRIPT.txt`.
    """
    ckpt_dir = os.path.join(project_dir, "checkpoints")
    outline_txt = _read_text_safe(os.path.join(ckpt_dir, "02_STORY_OUTLINE.md"))
    script_txt = (
        _read_text_safe(os.path.join(project_dir, "FULL_SCRIPT.txt"))
        or _read_text_safe(os.path.join(project_dir, "CURRENT_WORKING_SCRIPT.txt"))
        or _read_text_safe(os.path.join(ckpt_dir, "03_DRAFT_SCRIPT_v1.txt"))
    )
    state_path = os.path.join(project_dir, "STATE.json")
    if not winner_title and os.path.exists(state_path):
        try:
            st = json.load(open(state_path, encoding="utf-8"))
            winner_title = st.get("winner_title") or st.get("source_title") or ""
        except Exception:
            pass

    char_names = []
    locations = []
    props = []
    twist_summary = ""

    # 1. Trích xuất từ bảng Character Registry / Protagonist Engine trong Outline
    if outline_txt:
        for m_title in re.finditer(r"<title[^>]*>([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+)</title>", outline_txt):
            nm = m_title.group(1).strip()
            if _is_valid_person_name(nm) and nm not in char_names:
                char_names.append(nm)

        # Tìm Doña / Don + Tên trong Outline tiếng Tây Ban Nha Mexico
        for m_dona in re.finditer(r"\b((?:Doña|Don)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15})?)\b", outline_txt):
            nm = m_dona.group(1).strip()
            if _is_valid_person_name(nm) and nm not in char_names:
                char_names.append(nm)

        # Tìm trong bảng Markdown: | Mara Bennett | 39 | ... hoặc | Doña Carmen Morales | 68 |
        for m_row in re.finditer(
            r"^\|\s*\*{0,2}((?:Doña\s+|Don\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}){1,2})\*{0,2}\s*\|",
            outline_txt,
            flags=re.MULTILINE,
        ):
            nm = m_row.group(1).strip()
            if _is_valid_person_name(nm) and nm not in char_names:
                char_names.append(nm)

        # Tìm các dòng **Protagonist:** / **Antagonist:** / **Madre:** / **Hijo:** / **Nuera:** / **Yerno:** / **Consuegra:**
        for m_role in re.finditer(
            r"(?:Protagonist|Protagonista|Madre|Abuela|Antagonist|Antagonista|Hijo|Hija|Nuera|Yerno|Consuegra|Skeptic|Female\s+Lead|Male\s+Lead|Mafia\s+Boss|Heroine|Hero)\s*[:\-–]\s*\*{0,2}((?:Doña\s+|Don\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}){0,2})",
            outline_txt,
            flags=re.IGNORECASE,
        ):
            nm = m_role.group(1).strip()
            if _is_valid_person_name(nm) and nm not in char_names:
                char_names.append(nm)

        # Địa danh & Tên bất động sản (tiếng Anh + tiếng Tây Ban Nha Mexico)
        for m_loc in re.finditer(
            r"\*\*(?:LOCATION|UBICACI[ÓO]N|CIUDAD|COLONIA|ESCENARIO|PROPERTY\s+NAME|SETTING|CITY|TOWN)\s*:\*\*\s*([^\n\r]{3,90})",
            outline_txt,
            flags=re.IGNORECASE,
        ):
            val = re.sub(r"[*_`#]+", "", m_loc.group(1)).strip().rstrip(".")
            if val and val not in locations:
                locations.append(val[:85])

        # Quét tên thành phố Mexico phổ biến nếu xuất hiện trong Outline
        for m_mx_city in re.finditer(
            r"\b(Puebla|Guadalajara|Monterrey|Querétaro|Mérida|Oaxaca|Morelia|Toluca|León|Veracruz|Cuernavaca|Aguascalientes|San\s+Luis\s+Potosí|Coyoacán|Tlaquepaque|Cholula|Zapopan|Guanajuato)\b",
            outline_txt,
        ):
            c_mx = m_mx_city.group(1).strip()
            if c_mx and c_mx not in locations:
                locations.append(c_mx)

        # Vật chứng / Clue Chain (C01..C10)
        for m_clue in re.finditer(r"^\|\s*C0[1-6]\s*\|\s*([^|\n]{4,75})\s*\|", outline_txt, flags=re.MULTILINE):
            c_val = m_clue.group(1).strip()
            if c_val and c_val not in props:
                props.append(c_val)

        # Cú Twist / Grand Reveal / One-Sentence Premise / Reversal
        for pat in (
            r"\*\*Grand\s+Reveal\s*:\*\*\s*([^\n\r]{15,260})",
            r"\*\*TRUE\s+EMOTIONAL\s+REVEAL\s*:\*\*\s*([^\n\r]{15,260})",
            r"\*\*One-Sentence\s+Premise\s*:\*\*\s*\n*\s*([^\n\r]{15,260})",
            r"\*\*CORE\s+STORY\s+CONTRACT\s*:\*\*\s*([^\n\r]{15,260})",
            r"\*\*(?:REVERSAL|GIRO|PREMISA\s+CENTRAL)\s*:\*\*\s*([^\n\r]{15,260})",
        ):
            m_tw = re.search(pat, outline_txt, flags=re.IGNORECASE)
            if m_tw:
                twist_summary = re.sub(r"\s+", " ", m_tw.group(1)).strip()[:240]
                break

    # 2. Quét bổ sung từ Script (tìm Doña/Don + Tên hoặc Họ Tên 2 từ xuất hiện >= 2 lần)
    if script_txt and len(char_names) < 6:
        freq_full: dict[str, int] = {}
        for m_dona_s in re.finditer(r"\b((?:Doña|Don)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,15})?)\b", script_txt):
            cand = m_dona_s.group(1).strip()
            if _is_valid_person_name(cand):
                freq_full[cand] = freq_full.get(cand, 0) + 2
        for m_en in re.finditer(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,14}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,14})\b", script_txt):
            cand = m_en.group(1).strip()
            if _is_valid_person_name(cand):
                freq_full[cand] = freq_full.get(cand, 0) + 1
        sorted_cands = sorted(freq_full.items(), key=lambda x: x[1], reverse=True)
        for cand, cnt in sorted_cands:
            if cnt >= 2 and cand not in char_names:
                char_names.append(cand)
                if len(char_names) >= 10:
                    break

    return {
        "project_id": project_id or os.path.basename(project_dir),
        "winner_title": winner_title,
        "character_names": char_names[:12],
        "locations": locations[:6],
        "signature_props": props[:6],
        "twist_summary": twist_summary or winner_title,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _get_projects_dir_for_niche(studio_root: str, niche_clean: str) -> str:
    if niche_clean.lower() in KNOWN_12_FOLDER_KEYS:
        return os.path.join(studio_root, f"PROJECTS_{KNOWN_12_FOLDER_KEYS[niche_clean.lower()]}")
    if niche_clean == "mexico":
        return os.path.join(studio_root, "PROJECTS_MEXICO")
    if niche_clean == "homeless":
        return os.path.join(studio_root, "PROJECTS_HOMELESS")
    return os.path.join(studio_root, "PROJECTS")


def load_or_backfill_channel_memory(studio_root: str, niche: str, exclude_project_id: str = "") -> dict:
    """
    Đọc `CHANNEL_MEMORY_{NICHE}.json`. Nếu có các dự án trong `PROJECTS` / `PROJECTS_HOMELESS` / `PROJECTS_MEXICO`
    đã qua Bước 2 nhưng chưa có trong sổ tay, tự động quét và bổ sung (Auto-Backfill).
    """
    niche_clean = _normalize_niche_key(niche)
    niche_mem_path, shared_mem_path = _get_memory_file_paths(studio_root, niche_clean)
    projects_dir = _get_projects_dir_for_niche(studio_root, niche_clean)

    with MEMORY_LOCK:
        mem_data = {
            "niche": niche_clean,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_recorded": 0,
            "stories": [],
        }
        if os.path.exists(niche_mem_path):
            try:
                loaded = json.load(open(niche_mem_path, encoding="utf-8"))
                if isinstance(loaded, dict) and isinstance(loaded.get("stories"), list):
                    mem_data = loaded
            except Exception:
                pass

        known_Map = {it.get("project_id"): it for it in mem_data.get("stories", []) if it.get("project_id")}
        changed = False

        if os.path.exists(projects_dir):
            for entry in sorted(os.listdir(projects_dir)):
                if entry.upper() == "TONG HOP":
                    continue
                p_dir = os.path.join(projects_dir, entry)
                if not os.path.isdir(p_dir):
                    continue
                if exclude_project_id and entry == exclude_project_id:
                    continue
                outline_p = os.path.join(p_dir, "checkpoints", "02_STORY_OUTLINE.md")
                script_p = os.path.join(p_dir, "FULL_SCRIPT.txt")
                if not os.path.exists(outline_p) and not os.path.exists(script_p):
                    continue
                existing_rec = known_Map.get(entry)
                if not existing_rec or not existing_rec.get("character_names"):
                    extracted = extract_story_metadata_from_project(p_dir, project_id=entry)
                    if extracted["character_names"] or extracted["locations"] or extracted["winner_title"]:
                        known_Map[entry] = extracted
                        changed = True

        stories_sorted = [known_Map[k] for k in sorted(known_Map.keys())]
        if len(stories_sorted) > MAX_MEMORY_RECORDS:
            stories_sorted = stories_sorted[-MAX_MEMORY_RECORDS:]

        mem_data["stories"] = stories_sorted
        mem_data["total_recorded"] = len(stories_sorted)
        mem_data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if changed or not os.path.exists(niche_mem_path) or not os.path.exists(shared_mem_path):
            _write_json_safe(niche_mem_path, mem_data)
            _write_json_safe(shared_mem_path, mem_data)

        return mem_data


def record_project_to_channel_memory(
    studio_root: str,
    niche: str,
    project_id: str,
    project_dir: str,
    winner_title: str = "",
) -> dict:
    """
    Cập nhật ngay thông tin nhân vật, bối cảnh, vật chứng và cú twist của dự án vừa lập dàn ý / viết kịch bản
    vào `CHANNEL_MEMORY.json` (và `CHANNEL_MEMORY_{NICHE}.json`).
    """
    niche_clean = _normalize_niche_key(niche)
    niche_mem_path, shared_mem_path = _get_memory_file_paths(studio_root, niche_clean)
    extracted = extract_story_metadata_from_project(project_dir, project_id=project_id, winner_title=winner_title)

    with MEMORY_LOCK:
        mem_data = {
            "niche": niche_clean,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_recorded": 0,
            "stories": [],
        }
        if os.path.exists(niche_mem_path):
            try:
                loaded = json.load(open(niche_mem_path, encoding="utf-8"))
                if isinstance(loaded, dict) and isinstance(loaded.get("stories"), list):
                    mem_data = loaded
            except Exception:
                pass

        stories = [it for it in mem_data.get("stories", []) if it.get("project_id") != project_id]
        stories.append(extracted)
        stories = sorted(stories, key=lambda x: x.get("project_id", ""))
        if len(stories) > MAX_MEMORY_RECORDS:
            stories = stories[-MAX_MEMORY_RECORDS:]

        mem_data["stories"] = stories
        mem_data["total_recorded"] = len(stories)
        mem_data["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        _write_json_safe(niche_mem_path, mem_data)
        _write_json_safe(shared_mem_path, mem_data)

    return extracted


def run_canon_guard_step_1_5(
    studio_root: str,
    niche: str,
    project_id: str,
    project_dir: str,
    winner_title: str,
) -> dict:
    """
    Thực thi Bàn #1.5 (`studio-canon-guard` / `canon-guard-drama-familiar-mexico`) ngay trước khi Bàn #2 lập Giàn ý:
    1. Đọc 30 kịch bản gần nhất từ `CHANNEL_MEMORY_{NICHE}.json`.
    2. Tổng hợp danh sách Tên nhân vật, Họ nhân vật, Địa danh/Thị trấn/Colonia, Vật chứng và Cú twist đã dùng.
    3. Chọn lọc bộ gợi ý Tên nhân vật & Bối cảnh mới hoàn toàn chưa từng xuất hiện.
    4. Xuất biên bản `checkpoints/01_5_CANON_GUARD_DIRECTIVE.md` và trả về khối `prompt_injection`
       để bơm thẳng vào lệnh lập Giàn ý của Bàn #2.
    """
    niche_clean = _normalize_niche_key(niche)
    mem_data = load_or_backfill_channel_memory(studio_root, niche_clean, exclude_project_id=project_id)
    recent_stories = [
        s for s in mem_data.get("stories", []) if s.get("project_id") != project_id
    ][-RECENT_WINDOW_FOR_PROMPT:]

    banned_full_names = []
    banned_first_names = []
    banned_last_names = []
    banned_locations = []
    banned_props = []
    recent_twists = []

    for st in recent_stories:
        for nm in st.get("character_names", []):
            if nm not in banned_full_names:
                banned_full_names.append(nm)
            parts = [p for p in nm.split() if p not in ("Doña", "Don", "Señora", "Señor")]
            if parts:
                fn = parts[0].strip()
                if len(fn) >= 3 and fn not in banned_first_names:
                    banned_first_names.append(fn)
            if len(parts) >= 2:
                ln = parts[-1].strip()
                if len(ln) >= 3 and ln not in banned_last_names:
                    banned_last_names.append(ln)
        for loc in st.get("locations", []):
            if loc not in banned_locations:
                banned_locations.append(loc)
        for pr in st.get("signature_props", []):
            if pr not in banned_props:
                banned_props.append(pr)
        tw = st.get("twist_summary", "")
        if tw:
            recent_twists.append(f"- `{st.get('project_id')}`: {tw[:160]}")

    banned_fn_lower = {x.lower() for x in banned_first_names}
    banned_ln_lower = {x.lower() for x in banned_last_names}

    is_mx_lang = ("mexico" in niche_clean.lower())
    protag_pool = FRESH_PROTAGONIST_NAMES_POOL_MEXICO if is_mx_lang else FRESH_PROTAGONIST_NAMES_POOL
    antag_pool = FRESH_ANTAGONIST_NAMES_POOL_MEXICO if is_mx_lang else FRESH_ANTAGONIST_NAMES_POOL
    loc_pool = (
        FRESH_LOCATIONS_POOL_MEXICO
        if is_mx_lang
        else (FRESH_LOCATIONS_POOL_HOMELESS if niche_clean == "homeless" else FRESH_LOCATIONS_POOL_MAFIA)
    )
    props_pool = FRESH_PROPS_AND_MECHANISMS_POOL_MEXICO if is_mx_lang else FRESH_PROPS_AND_MECHANISMS_POOL

    fresh_protagonists = []
    for cand in protag_pool:
        p = [w for w in cand.split() if w not in ("Doña", "Don")]
        if p and p[0].lower() not in banned_fn_lower and p[-1].lower() not in banned_ln_lower:
            fresh_protagonists.append(cand)
        if len(fresh_protagonists) >= 8:
            break

    fresh_antagonists = []
    for cand in antag_pool:
        p = [w for w in re.sub(r"\([^)]*\)", "", cand).split() if len(w) >= 3]
        if p and p[0].lower() not in banned_fn_lower:
            fresh_antagonists.append(cand)
        if len(fresh_antagonists) >= 6:
            break

    banned_loc_joined = " ".join(banned_locations).lower()
    fresh_locations = [l for l in loc_pool if l.split("(")[0].strip().lower() not in banned_loc_joined][:6]

    banned_names_str = ", ".join(banned_full_names[:45]) if banned_full_names else "(Chưa có kịch bản trước — Tự do sáng tạo)"
    banned_first_str = ", ".join(banned_first_names[:40]) if banned_first_names else "(Trống)"
    banned_last_str = ", ".join(banned_last_names[:40]) if banned_last_names else "(Trống)"
    banned_locs_str = " | ".join(banned_locations[:20]) if banned_locations else "(Chưa có — Tự do chọn địa danh mới)"
    banned_props_str = " | ".join(banned_props[:18]) if banned_props else "(Chưa có)"
    recent_twists_str = "\n".join(recent_twists[-10:]) if recent_twists else "- (Chưa có kịch bản trước)"

    if is_mx_lang:
        prompt_injection = f"""
================================================================================
🛡️ CHỈ THỊ BẮT BUỘC TỪ BÀN #1.5 (`canon-guard-drama-familiar-mexico` — SỔ CÁI `CHANNEL_MEMORY_MEXICO.json`)
(KHÓA CHỐNG TRÙNG LẶP TÊN BÀ CÔ, TÊN CON DÂU/CON RỂ/THÔNG GIA, THÀNH PHỐ MEXICO & VẬT CHỨNG PHÁP LÝ GIỮA {len(recent_stories)} KỊCH BẢN GẦN NHẤT)
================================================================================
Hệ thống Bàn #1.5 (`canon-guard-drama-familiar-mexico`) đã quét {len(recent_stories)} kịch bản gần nhất của kênh **MEXICO BÀ CÔ**.
Khi thiết kế Giàn ý 7 Phần (`[PART 1]`..`[PART 7]`) bằng tiếng Tây Ban Nha Mexico (`es-MX`) ở Bước 2 này, bạn **BẮT BUỘC TUÂN THỦ CÁC KHÓA CHỐNG TRÙNG LẶP SAU**:

1. **🚫 CẤM LẶP LẠI TÊN BÀ CÔ (NGƯỜI MẸ GIÀ) & TÊN GIA ĐÌNH PHẢN DIỆN ĐÃ DÙNG ({len(banned_full_names)} tên đã khóa):**
   - **Danh sách Họ Tên đầy đủ CẤM DÙNG LẠI:** {banned_names_str}
   - **Danh sách Tên gọi (Nombres) CẤM DÙNG LẠI:** {banned_first_str}
   - **Danh sách Họ (Apellidos) CẤM DÙNG LẠI:** {banned_last_str}
   - *(Lưu ý: Tuyệt đối tránh các tên AI hay lặp mặc định như: Doña Elena, Doña Carmen, Doña Rosa, Roberto, Carlos, Sofía, Valeria, Mendoza, Morales nếu đã xuất hiện ở trên).*

2. **🚫 CẤM LẶP LẠI THÀNH PHỐ / BANG / COLONIA TẠI MEXICO ĐÃ DÙNG:**
   - **Địa danh Mexico đã dùng ở các tập trước (CẤM LẶP):** {banned_locs_str}

3. **🚫 CẤM LẶP LẠI NGHỀ NGHIỆP TÍCH GÓP & VẬT CHỨNG PHÁP LÝ CŨ:**
   - **Vật chứng / Nghề nghiệp đã dùng gần đây:** {banned_props_str}
   - **Tóm tắt các kịch bản gần nhất để tránh trùng mô-típ phản bội:**
{recent_twists_str}

4. **✅ GỢI Ý BIẾN SỐ MỚI SẠCH 100% CHO KÊNH `MEXICO BÀ CÔ` (CHƯA TỪNG XUẤT HIỆN TRONG `CHANNEL_MEMORY_MEXICO.json`):**
   - **Gợi ý Tên Bà Cô / Người Mẹ Già (60–80 tuổi, ngôi kể `Yo`):** `{", ".join(fresh_protagonists)}`
   - **Gợi ý Tên Con Trai / Con Gái / Con Dâu (`nuera`) / Con Rể (`yerno`) / Bà Thông Gia (`consuegra`):** `{", ".join(fresh_antagonists)}`
   - **Gợi ý Thành phố & Colonia tại Mexico:** `{", ".join(fresh_locations)}`
   - **Gợi ý Nghề nghiệp tích góp & Cơ chế vật chứng pháp lý (`escrituras / notaría / banco`):** `{"; ".join(props_pool[:4])}`
================================================================================
"""
    else:
        prompt_injection = f"""
================================================================================
🛡️ CHỈ THỊ BẮT BUỘC TỪ BÀN #1.5 (`studio-canon-guard` — SỔ TAY TRÍ NHỚ KÊNH `CHANNEL_MEMORY.json`)
(CHỐNG TRÙNG LẶP TÊN NHÂN VẬT, ĐỊA DANH, VẬT CHỨNG & MÔ-TÍP GIỮA {len(recent_stories)} KỊCH BẢN GẦN NHẤT)
================================================================================
Hệ thống `studio-canon-guard` đã quét {len(recent_stories)} kịch bản gần nhất trong `CHANNEL_MEMORY.json`.
Khi thiết kế Giàn ý và `Character Registry` ở Bước 2 này, bạn **BẮT BUỘC TUÂN THỦ CÁC KHÓA CHỐNG TRÙNG LẶP SAU**:

1. **🚫 CẤM LẶP LẠI TÊN & HỌ NHÂN VẬT ĐÃ DÙNG ({len(banned_full_names)} tên đã khóa):**
   - **Danh sách Họ Tên đầy đủ CẤM DÙNG LẠI:** {banned_names_str}
   - **Danh sách Tên gọi (First Names) CẤM DÙNG LẠI cho nhân vật chính/phản diện:** {banned_first_str}
   - **Danh sách Họ (Last Names) CẤM DÙNG LẠI:** {banned_last_str}
   - *(Lưu ý: Ngoài danh sách trên, tuyệt đối tránh các tên AI hay lặp mặc định như: Elena, Clara, Mara, Arthur, Julian, Eleanor, Caleb, Victor, Dante, Vance, Moretti, Sterling, Reed, Bennett, Hayes, Whitcomb nếu đã xuất hiện ở trên).*

2. **🚫 CẤM LẶP LẠI TÊN THỊ TRẤN / THỬA ĐẤT / DINH THỰ ĐÃ DÙNG:**
   - **Địa danh & Bất động sản đã dùng ở các tập trước (CẤM LẶP):** {banned_locs_str}

3. **🚫 CẤM LẶP LẠI VẬT CHỨNG & VỊ TRÍ GIẤU ĐỒ CŨ:**
   - **Vật chứng/Manh mối đã dùng gần đây (CẤM SAO CHÉP MÔ-TÍP):** {banned_props_str}
   - **Tóm tắt các kịch bản gần nhất để tránh trùng cốt truyện:**
{recent_twists_str}

4. **✅ GỢI Ý BIẾN SỐ MỚI SẠCH 100% (CHƯA TỪNG XUẤT HIỆN TRONG `CHANNEL_MEMORY.json`):**
   - **Gợi ý Tên Nhân vật Chính mới (hoặc tự đặt tên mới hoàn toàn không nằm trong danh sách cấm):** `{", ".join(fresh_protagonists)}`
   - **Gợi ý Tên Nhân vật Đối trọng / Phản diện mới:** `{", ".join(fresh_antagonists)}`
   - **Gợi ý Bối cảnh / Địa danh mới:** `{", ".join(fresh_locations)}`
   - **Gợi ý Cơ chế Vật chứng / Manh mối vật lý mới:** `{"; ".join(props_pool[:4])}`
================================================================================
"""

    directive_md = f"""# 🛡️ BIÊN BẢN KIỂM DỊCH CHỐNG TRÙNG LẶP KÊNH — BÀN #1.5 (`{"canon-guard-drama-familiar-mexico" if niche_clean == "mexico" else "studio-canon-guard"}`)
- **Dự án:** `{project_id}`
- **Kênh:** `{niche_clean.upper()}`
- **Tiêu đề đã khóa (Bước 1):** "{winner_title}"
- **Thời gian kiểm dịch:** `{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}`
- **Số kịch bản gần nhất đã quét trong `CHANNEL_MEMORY_{niche_clean.upper()}.json`:** `{len(recent_stories)}` kịch bản
- **Tổng số tên nhân vật đã khóa cấm trùng:** `{len(banned_full_names)}` tên (`{len(banned_first_names)}` First Names / `{len(banned_last_names)}` Last Names)
- **Tổng số địa danh đã khóa cấm trùng:** `{len(banned_locations)}` địa danh

{prompt_injection}
"""
    ckpt_dir = os.path.join(project_dir, "checkpoints")
    os.makedirs(ckpt_dir, exist_ok=True)
    directive_path = os.path.join(ckpt_dir, "01_5_CANON_GUARD_DIRECTIVE.md")
    try:
        with open(directive_path, "w", encoding="utf-8") as f:
            f.write(directive_md)
    except Exception:
        pass

    return {
        "prompt_injection": prompt_injection,
        "directive_path": directive_path,
        "recent_scripts_scanned": len(recent_stories),
        "banned_names_count": len(banned_full_names),
        "banned_locations_count": len(banned_locations),
        "fresh_protagonists": fresh_protagonists,
        "fresh_locations": fresh_locations,
    }

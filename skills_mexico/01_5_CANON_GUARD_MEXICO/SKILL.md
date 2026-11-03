---
name: canon-guard-drama-familiar-mexico
description: "Bàn #1.5 (Canon Guard Mexico Bà Cô — v1.3.0): Quản lý sổ tay trí nhớ kênh CHANNEL_MEMORY_MEXICO.json (30–100 kịch bản gần nhất của kênh MEXICO BÀ CÔ), tự động quét và khóa cấm trùng lặp Tên Bà Cô (Doña/Señora), Tên con trai/con gái/con dâu (nuera)/con rể (yerno)/bà thông gia (consuegra), Địa danh/Thành phố/Colonia tại Mexico, Nghề nghiệp tích góp và Vật chứng pháp lý trước khi Bàn #2 lập Giàn ý 7 Phần."
version: "1.3.0"
---

# BÀN #1.5: CANON GUARD MEXICO BÀ CÔ (`canon-guard-drama-familiar-mexico` V1.3.0)

## 1. Vai Trò Trong Chuỗi Sản Xuất Kênh `MEXICO BÀ CÔ`
- **Vị trí kích hoạt**: Chạy tự động ở **Bước 1.5 (Bàn #1.5)** ngay sau khi **Bàn #1 (`titulos-drama-familiar-mexico`)** chốt `CURRENT FINAL TITLE` (Tiêu đề chiến thắng `es-MX` ≤ 100 ký tự) và ngay trước khi **Bàn #2 (`arquitectura-drama-familiar-mexico`)** thiết kế Giàn ý 7 Phần (`[PART 1]`..`[PART 7]`).
- **Mục tiêu cốt lõi**: Đảm bảo 100 kịch bản liên tiếp trên kênh **MEXICO BÀ CÔ** có **100 bộ tên nhân vật, 100 bối cảnh thành phố/khu phố Mexico, 100 nghề nghiệp/tài sản tích góp và 100 cơ chế lật kèo pháp lý/gia đình hoàn toàn mới**, tuyệt đối không bị lặp tên mặc định của AI (như lặp đi lặp lại *Doña Elena, Doña Carmen, Roberto, Sofía, Valeria*).

## 2. Cơ Chế Quét & Lưu Trữ Sổ Cái (`CHANNEL_MEMORY_MEXICO.json`)
1. **Đọc & Tự động Backfill**:
   - Đọc tệp `D:\ZC_TEAM\TOOL_ZC_TEAM\CHANNEL_MEMORY_MEXICO.json` (lưu tối đa 100 kịch bản gần nhất của kênh `mexico`, lấy cửa sổ 30 kịch bản gần nhất để bơm vào lệnh cấm của Bàn #2).
   - Tự động quét thư mục `D:\ZC_TEAM\TOOL_ZC_TEAM\PROJECTS_MEXICO` để trích xuất từ `checkpoints/02_STORY_OUTLINE.md` và `FULL_SCRIPT.txt`:
     - `character_names`: Tên Bà Cô / người mẹ già 60–80 tuổi (`Doña ...`, `Señora ...`) và tên các thành viên gia đình (`hijo`, `hija`, `nuera`, `yerno`, `consuegra`, `nieto`, `nieta`, `hermano`, `notario`, `abogado`).
     - `locations`: Thành phố, bang và khu dân cư (`colonia`, `barrio`, `municipio`) tại Mexico.
     - `signature_props`: Tài sản tích góp cả đời của người mẹ và vật chứng/giấy tờ pháp lý (`escrituras`, `testamento`, `poder notarial`, `pagaré`, `recibos`, `cuenta bancaria`, `fonda`, `taller de costura`, `panadería`).
     - `twist_summary`: Cơ chế phản bội gia đình và cú lật ngược thế cờ (`Reversal Mechanism`).

## 3. Các Khóa Chống Trùng Lặp Bắt Buộc Truyền Sang Bàn #2 (`02_ARQUITECTURA_MEXICO`)
1. **🚫 Khóa Cấm Lặp Tên Nhân Vật (`BANNED CHARACTER NAMES`)**:
   - Cấm dùng lại toàn bộ Họ & Tên đầy đủ và Tên gọi (First Names) đã xuất hiện trong 30 kịch bản gần nhất.
   - Cấm các tên AI hay tự sinh lặp lại nếu đã có trong sổ cái: *Elena, Carmen, Rosa, María, Guadalupe, Martha, Roberto, Carlos, Alejandro, Fernando, Sofía, Valeria, Gabriela, Lucía, Mendoza, Morales, Garza, Herrera, Navarro*.
2. **🚫 Khóa Cấm Lặp Địa Danh & Colonia (`BANNED MEXICAN LOCATIONS`)**:
   - Không lặp lại cùng một thành phố/khu phố (`Colonia Roma`, `Coyoacán`, `San Pedro Garza García`, `Puebla`, `Guadalajara`, `Querétaro`, `Mérida`, `Oaxaca`, `Morelia`, `Toluca`, `León`, `Veracruz`, `Cuernavaca`, `Guanajuato`, `Aguascalientes`) của các tập liền kề trước đó.
3. **🚫 Khóa Cấm Lặp Nghề Nghiệp & Đạo Cụ Pháp Lý (`BANNED PROPS & OCCUPATION PATTERNS`)**:
   - Bắt buộc xoay vòng nghề nghiệp/sinh kế của người mẹ già (ví dụ: *fonda tradicional, taller de costura y bordado, panadería de barrio, puesto de tamales y atole, papelería y mercería, tortillería familiar, florería del mercado, pensión de maestra jubilada, enfermera retirada, huerta de aguacates/limones*).
   - Bắt buộc xoay vòng vật chứng lật kèo (không lặp lại cùng một chiêu đọc di chúc hay cùng một kiểu giấy tờ ở 2 tập liên tiếp).

## 4. Đầu Ra Của Bàn #1.5
- Xuất biên bản kiểm dịch tại: `checkpoints/01_5_CANON_GUARD_DIRECTIVE.md`.
- Tạo khối chỉ thị `prompt_injection` bơm trực tiếp vào đầu lệnh lập Giàn ý Bước 2 (`02_ARQUITECTURA_MEXICO`).
- Ngay sau khi Bước 2 hoàn tất Giàn ý mới, tự động trích xuất nhân vật/địa danh/vật chứng mới cập nhật ngược lại vào `CHANNEL_MEMORY_MEXICO.json`.

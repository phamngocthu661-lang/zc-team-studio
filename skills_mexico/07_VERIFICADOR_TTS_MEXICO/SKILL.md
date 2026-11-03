---
name: verificador-tts-drama-familiar-mexico
description: "Bàn #7 (Check Lại File TTS Mexico Bà Cô — v1.3.0): Kiểm định độc lập, chuẩn hóa phát âm tiếng Tây Ban Nha Mexico (es-MX) và làm sạch 100% file kịch bản TTS (FULL_SCRIPT.txt & TONG HOP/{TenKichBan}_KB.txt) trước khi đẩy sang dựng Voice/Video. Xóa sạch nhãn [PART 1]..[PART 7] & ký tự lạ, bung toàn bộ từ viết tắt tiếng Tây Ban Nha (Sra., Sr., Dr., Lic., Ing., Col., Av., CDMX, IMSS, INE, CFE, MXN...), lọc sạch từ vựng Tây Ban Nha châu Âu (vosotros/ordenador/zumo), kiểm tra độ dài chuẩn 70.000–80.000 ký tự và xuất báo cáo checkpoints/07_TTS_CHECK_REPORT.md."
version: "1.3.0"
---

# BÀN #7: CHECK LẠI FILE TTS & CHUẨN HÓA PHÁT ÂM `ES-MX` (`verificador-tts-drama-familiar-mexico` V1.3.0)

## 1. Vai Trò & Vị Trí Trong Hệ Thống `MEXICO BÀ CÔ`
- **Vị trí kích hoạt**: Chạy tự động ngay sau khi hoàn tất Kịch bản & Gói SEO (trước khi xuất bản cuối cùng ra `FULL_SCRIPT.txt`, `TONG HOP/{TenKichBan}_KB.txt` và trước khi đẩy sang Engine tạo Voice `.wav` + Phụ đề `.srt` + Render Video `.mp4`).
- **Mục tiêu cốt lõi**: Đảm bảo file kịch bản tiếng Tây Ban Nha Mexico (`es-MX`) đạt độ sạch **100% TTS-Ready** cho giọng đọc người mẹ/bà lớn tuổi (`60–80` tuổi), không bao giờ bị máy đọc TTS đọc vấp từ viết tắt, đọc nhầm ký hiệu tiền tệ, đọc lọt nhãn `[PART N]` hay phát âm sai phương ngữ Tây Ban Nha.

## 2. 6 Lớp Kiểm Định & Chuẩn Hóa Tự Động File TTS (`es-MX`)

### Lớp 1: Xóa Triệt Để Nhãn Cấu Trúc, Chỉ Dẫn Sân Khấu & Ký Tự Lạ
- Xóa 100% các dòng tiêu đề phân đoạn: `[PART 1]` đến `[PART 7]`, `# PART N`, `PARTE N`, `BEAT N`, đường kẻ phân cách `---`, `***`, `___`.
- Xóa 100% các cụm ngoặc vuông chỉ dẫn sân khấu/âm thanh nếu sót: `[PAUSA]`, `[SUSPIRO]`, `[LLANTO]`, `[SILENCIO]`, `[MÚSICA]`, `[VOZ QUEBRADA]`, `{...}`.
- Xóa 100% ký tự Markdown (`*`, `**`, `#`, `` ` ``, `_`), thẻ HTML/XML (`<...>`) và ký tự ẩn Unicode (`\u200b`, `\u200c`, `\u200d`, `\ufeff`, `\u00ad`).

### Lớp 2: Bung Toàn Bộ Danh Xưng & Từ Viết Tắt Tiếng Tây Ban Nha Mexico (`es-MX`)
Máy đọc TTS rất dễ ngắt câu sai hoặc đọc đánh vần khi gặp dấu chấm sau từ viết tắt tiếng Tây Ban Nha. Bàn #7 tự động bung thành chữ đọc đầy đủ:
- **Danh xưng & Học vị**:
  - `Sra.` -> `Señora` | `Sras.` -> `Señoras`
  - `Sr.` -> `Señor` | `Sres.` -> `Señores`
  - `Srta.` -> `Señorita`
  - `Dña.` -> `Doña` | `Dn.` -> `Don`
  - `Dra.` -> `Doctora` | `Dr.` -> `Doctor`
  - `Lic.` -> `Licenciado` (hoặc `Licenciada` theo ngữ cảnh nữ)
  - `Ing.` -> `Ingeniero` | `Arq.` -> `Arquitecto`
  - `Profa.` -> `Profesora` | `Prof.` -> `Profesor`
  - `C.P.` (trước tên riêng) -> `Contador Público`
  - `Vda. de` -> `Viuda de`
- **Địa chỉ & Đơn vị hành chính tại Mexico**:
  - `Col.` -> `Colonia`
  - `Av.` -> `Avenida`
  - `Calz.` -> `Calzada`
  - `Blvd.` -> `Bulevar`
  - `Fracc.` -> `Fraccionamiento`
  - `Depto.` / `Dpto.` -> `Departamento`
  - `Núm.` / `No.` -> `número`
  - `Edo. de México` -> `Estado de México`
  - `CDMX` -> `Ciudad de México`
- **Cơ quan & Giấy tờ quen thuộc trong đời sống gia đình Mexico**:
  - `IMSS` -> `Seguro Social`
  - `ISSSTE` -> `Instituto de Seguridad Social`
  - `INE` -> `credencial para votar`
  - `CFE` -> `Comisión Federal de Electricidad`
  - `SAT` -> `Hacienda`
  - `DIF` -> `Desarrollo Integral de la Familia`
  - `MP` -> `Ministerio Público`

### Lớp 3: Chuẩn Hóa Tiền Tệ (`Pesos Mexicanos`), Con Số & Đơn Vị Đo Lường
- `$1,500 MXN` / `$20,000 M.N.` -> `1,500 pesos` / `20,000 pesos`
- `$50 mil pesos` / `$2 millones` -> chuẩn hóa bỏ ký hiệu `$` thừa khi đã có chữ `pesos` để TTS không đọc lặp `dólares ... pesos`.
- `$1,200` (đứng độc lập trong văn bản `es-MX` không có chữ `pesos` theo sau) -> `1,200 pesos`.
- `15%` -> `15 por ciento`
- `25°C` -> `25 grados centígrados`
- `120 m²` / `120 m2` -> `120 metros cuadrados`
- `50 km` -> `50 kilómetros`
- `24 hrs.` / `24 hrs` -> `24 horas`

### Lớp 4: Quét & Sửa Từ Vựng Tây Ban Nha Châu Âu (`es-ES` Leak Guard) Sang Chuẩn Mexico (`es-MX`)
- Tự động phát hiện và chuyển đổi các từ `es-ES` bị cấm trong `SHARED_CROSS_SKILL_CONTRACT_V1.md`:
  - `vosotros` / `vosotras` -> `ustedes`
  - `vuestro` / `vuestra` -> `su` | `vuestros` / `vuestras` -> `sus`
  - `ordenador` -> `computadora`
  - `zumo` -> `jugo`
  - `enfadado` -> `enojado` | `enfadada` -> `enojada`
  - `aparcar` -> `estacionar`
  - `móvil` (khi dùng theo nghĩa điện thoại) -> `celular`

### Lớp 5: Kiểm Định Nhịp Ngắt Câu, Dấu Câu `¿?` / `¡!` & Độ Dài Chuẩn `70.000–80.000` Ký Tự
- Chuẩn hóa dấu chấm lửng `....` -> `...`, dấu gạch ngang kép `--` -> `—`, khoảng trắng kép.
- Kiểm tra tổng số ký tự Unicode sạch (`final_char_count`), tổng số từ (`final_word_count`), tổng số đoạn văn và số câu quá dài (`> 280` ký tự).
- Đối chiếu cổng độ dài `70.000–80.000` ký tự của kênh `MEXICO BÀ CÔ`.

### Lớp 6: Xuất Biên Bản Kiểm Định File TTS & Đồng Bộ Xuất Bản
- Ghi đè văn bản đã làm sạch 100% vào `FULL_SCRIPT.txt` và `PROJECTS_MEXICO\TONG HOP\{TenKichBan}_KB.txt`.
- Xuất báo cáo chi tiết tại `checkpoints/07_TTS_CHECK_REPORT.md` (đồng bộ cùng `checkpoints/06_TTS_DIRECTOR_REPORT.md`).

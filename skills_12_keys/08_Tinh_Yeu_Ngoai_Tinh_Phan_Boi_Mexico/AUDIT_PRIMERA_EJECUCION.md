# KIỂM ĐỊNH LẦN CHẠY ĐẦU — MESA DE LAUREL (01/11/2026)

## Phạm vi và kết luận
- Nguồn: `8-Mesa_de_Laurel_TAT_CA_STEPS.zip`, 26 tệp; kiểm tra thư mục giải nén **nguyên trạng**, không sửa kịch bản hoặc thay báo cáo QA cũ.
- Tiêu đề khóa: `Mi esposo presentó a su amante como dueña de nuestro restaurante, pero olvidó un contrato`.
- KẾT LUẬN: **PASS kỹ thuật đầu-cuối; CHƯA ĐỦ CƠ SỞ XÁC NHẬN QA 98/100/PUBLISH READY ở cấp biên tập.** Phát hiện lỗi bị lọt qua lần sửa duy nhất. Bộ Skill phải được nâng cấp để tránh lặp lại.
- Đây là bản rà soát độc lập bằng đọc nội dung và công cụ kiểm chứng; không phải chứng nhận ngữ pháp của biên tập viên bản ngữ hay tư vấn luật Mexico.

## Đối chiếu định lượng và integrity
| Chỉ tiêu | Số liệu kiểm thực | Đánh giá |
|---|---:|---|
| Số tệp trong ZIP chạy lần đầu | 26 | PASS |
| Script Parts | 7 (1→7) | PASS |
| `FULL_SCRIPT_REVISED.txt` số từ được đọc theo tokenizer V1 | 12.588 | PASS trong 12.500–14.500 |
| Nội dung ký tự (không tính PART headings) | 77.448 | PASS trong 75.000–100.000 |
| `FULL_SCRIPT_REVISED.txt` SHA-256 | `fe6844b47d6ff5a05ffd81bcca169a2e7c796a994a9b47e4d44ac97180bf6e01` | Trùng QA và SEO |
| Source assembly A+B+C | khớp chính xác `FULL_SCRIPT.txt` | PASS |
| QA frozen → sửa → `REPAIR_PROOF` → file cuối | 2/2 thay thế, ngoài phạm vi 0 | PASS |
| `ONE_REPAIR_USED` | 1 lần | PASS |
| Lượt kiểm lại trong `QA_FINAL.json` | tuyên bố READY / 98 | **Không đủ để chứng nhận chất lượng** |
| Thumbnail/voice/video | mới có prompts và TTS text | Không được gọi là đã render |

## Các vấn đề nội dung bị bỏ sót

### QA-MX-001 — thời gian nhân chứng Inés (P1/P6)
- PART 1 kể rằng sau lời công bố của Ricardo và sau khi Valeria đã đi vào bếp, **`Inés llegó unos minutos después`**, nhưng ngay sau đó Inés nói đã nghe những lời Ricardo nói ngay từ cửa.
- PART 6: **`Inés habló primero. Dijo que, al llegar a la segunda sede, había escuchado a Ricardo presentar a Camila como «nueva dueña»`**.
- Có thể cứu bằng cách nói rõ Inés **đã đến cửa vào đúng lúc phát biểu, sau đó mới gặp Valeria**, hoặc nói nhân chứng nghe lại bản ghi. Như hiện tại thứ tự kể gây thiếu nhất quán và chưa có chứng minh về khả năng nghe trực tiếp. QA cuối không nhận diện tình tiết này mà chấm timeline 20/20.
- **Ưu tiên:** P2 hoặc P1 nếu toàn bộ sức nặng pháp lý của lời khai phụ thuộc vào sự có mặt của cô; yêu cầu xét mốc thời gian trước khi chốt READY.

### QA-MX-002 — diễn đạt trùng không tự nhiên (P1)
- Nguyên văn: **`sin copiar las modas de moda`**. Lặp `modas...moda`, tự nhiên hơn `sin seguir las tendencias pasajeras` hoặc `sin copiar las modas del momento`.
- Lỗi P2 diễn đạt/chính tả phong cách được thấy trong text hoàn chỉnh nhưng không nằm trong QA findings. Báo cáo sau sửa lại chấm mục es-MX 20/20.

### QA-MX-003 — đại từ tham chiếu không rõ (P1)
- Sau câu `No sabía que también era la amante de mi marido. Todavía no.` tiếp theo là **`La supe reconocer en la manera en que él le acomodó un mechón de cabello...`**. Đối tượng của `la` mơ hồ giữa người phụ nữ và mối quan hệ, gây gượng trong lời kể.
- Hướng khắc phục cho **kịch bản tương lai**: `Reconocí aquella intimidad por la forma en que él le acomodó el cabello` hoặc cách diễn đạt tự nhiên tương ứng với ngữ cảnh.

### QA-MX-004 — tên gọi địa điểm dễ hiểu lầm (P1/P2)
- Kịch bản khai báo **hai cơ sở tất cả**, nhưng lặp `segunda sucursal`, cách nói có thể khiến người nghe nghĩ là chi nhánh thứ hai ngoài trụ sở gốc (ba cơ sở).
- Chuẩn hóa danh mục `sede original` + `nueva sucursal` / `segunda sede` ngay từ giàn ý.

### QA-MX-005 — kiểm soát chấm điểm thiếu chứng cứ đọc đủ bảy phần
- `QA_FINAL.json` có boolean `complete_full_read=true` và `logic_sweep_done=true`, nhưng không có chứng cứ trích dẫn đối chiếu từng PART đủ để người sau kiểm chứng kết luận 20/20 về timeline + es-MX.
- Cần bắt buộc bảng bằng chứng 7 PART, chứng kiến tại chỗ/gián tiếp, timeline, sự thật mới và hệ quả nhân vật. Cờ `true` là khai báo của người kiểm định, **không phải chứng cứ độc lập của phần mềm**.

### QA-MX-006 — năng lực vận hành qua máy/thư mục khác
- `SCRIPT_MANIFEST.json` của V1 dùng đường dẫn tuyệt đối dạng `/mnt/data/mexico_workflow/.../SCRIPT_A.txt` cho A/B/C. Sau khi xuất ZIP và chuyển chỗ, việc dựng lại/đối chiếu có thể phụ thuộc đường dẫn gốc không còn tồn tại.
- V1.1 ghi đường dẫn tương đối khi tệp nằm trong run và tự khôi phục manifest cũ dựa vào basename + hash; không chấp nhận file local có hash sai.

### QA-MX-007 — xác thực SEO từng bước
- Cổng `seo-gate` V1 kiểm tra các cờ `QA_FINAL` + SHA của tệp cuối, **nhưng không kiểm toàn bộ liên kết** giữa stage manifest, outline lock, frozen contract và marker sửa một lần.
- V1.1 thêm `audit-run` và strict `seo-gate --workdir` kiểm chứng liên kết trước khi cho phép xuất bản; kết quả công cụ vẫn chỉ là kiểm chứng cơ học.

### QA-MX-008 — tính hấp dẫn và retention
- Hook P1 có tình huống phản bội cụ thể, đúng lời hứa; nhân vật chính có hành động hợp lý, tránh phép màu pháp lý. Đây là điểm mạnh.
- Tuy vậy, một số phần giữa dành nhiều thời gian cho kế toán, tư vấn, hợp đồng và lặp lời nhắc “chưa có chữ ký/chưa giải ngân”. Nhịp xung đột tình cảm vì thế có nguy cơ kém mạnh so với mô-típ kênh tham chiếu. Đây là **nhận xét biên tập**, không phải lỗi logic P2 bắt buộc sửa.
- V1.1 bổ sung bản đồ biến đổi tình cảm theo 7 PART, mỗi 8–12 phút phải có chuyển trạng thái thực, không được kéo dài bằng giải thích cùng một chứng cứ.

### QA-MX-009 — ledger chống trùng toàn kênh chưa có bằng chứng
- Trong 26 tệp ZIP đầu ra không có snapshot chứng minh đã ghi tiêu đề vào `TITLE_HISTORY_LEDGER.csv`. Bản ledger mẫu trong bộ Skill V1 chỉ là header. Không kết luận hệ thống ngoài ZIP không cập nhật, nhưng chưa thể xác nhận chống trùng xuyên các video.
- V1.1 yêu cầu S1 tạo bằng chứng ghi ledger hoặc nói rõ khi không có quyền ghi.

## Phán quyết STEP
| Step | Phán quyết |
|---|---|
| S1 title | Cấu trúc PASS; chưa chứng minh ledger toàn kênh |
| S2 outline | Cấu trúc và canon PASS; witness preflight cần nâng cấp |
| S3 writer | Độ dài/ghép/hash PASS; còn vài câu es-MX cần biên tập |
| S4 initial QA | PASS về quy trình freeze; **MISS** về đọc sâu witness + es-MX |
| S5 repair | PASS chính xác, 1 lượt sửa; **không được thực hiện lượt sửa 2** |
| S4B final QA | Hash/diff PASS; **chưa công nhận READY nội dung** do baseline misses |
| S6 SEO | File/prompt PASS; chưa có ảnh, thời lượng hay CTR đo được |

## Quy tắc với kịch bản đã chạy
KHÔNG sửa lại `FULL_SCRIPT_REVISED.txt` trong cùng vòng tự động vì `ONE_REPAIR_USED.json` đã tiêu thụ lượt sửa duy nhất. Nếu muốn sửa câu chuyện cũ, đó phải là **quyết định biên tập thủ công tạo version/run mới**, sau đó QA độc lập lại; không lấy QA 98 của bản cũ gán cho script mới. Gói nâng cấp tác động tới các video **chạy tiếp theo**, không hồi tố kết quả cũ.

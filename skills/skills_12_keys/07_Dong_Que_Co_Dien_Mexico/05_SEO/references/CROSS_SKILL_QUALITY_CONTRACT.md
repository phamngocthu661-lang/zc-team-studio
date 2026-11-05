# MEXICO RURAL V1.1 — SHARED CROSS-SKILL CONTRACT (NORMATIVE)

`contract_version: MEX-RURAL-1.1.0` | Lớp điều khiển Việt; toàn bộ title/script/SEO xuất bản mặc định `es-MX`.

## 1. Channel lock

- `CHANNEL_KEY=MEXICO_RURAL_CLASSIC`; niche: **relatos emotivos de haciendas y ranchos mexicanos, 1910–1970**, ưu tiên 1920–1960; hư cấu lấy cảm hứng từ đời sống, không tuyên bố “câu chuyện có thật” nếu không có chứng cứ.
- Cốt lõi: nghèo khó nhưng phẩm giá, người góa/cha mẹ đơn thân/trẻ em/công nhân nông trại, bất công giai cấp hoặc trong gia đình, nghĩa tình, lời hứa, tài sản/giấy tờ khi cần, lựa chọn đạo đức có giá phải trả, tình thương chữa lành.
- Không bê DNA Mafia (tội phạm, tình dục hóa, alpha-billionaire), không biến mọi cốt truyện thành HOMELESS hidden-door/treasure, không chuyển thành western Mỹ có sheriff/saloon như mặc định.
- Mỗi video cần một điểm mới: *người gặp nạn* × *thử thách đạo đức* × *vật chứng hoặc lời hứa* × *quan hệ* × *payoff*. Hành động của người nghèo phải có vai trò quyết định.
- Các chi tiết y tế, pháp luật, kế thừa, đất đai, tín dụng, đường sắt, điện thoại, phương tiện, địa danh phải hợp bối cảnh năm/tiểu bang; không tự tạo luật chắc chắn khi thiếu chứng cứ.

## 2. Ownership / đúng 6 lệnh step

| Command | Skill chủ sở hữu | Quyền hạn | Cấm |
|---|---|---|---|
| `step1` | `01_viet-lai-tieu-de-mexico` | Nghiên cứu mẫu, 5 tiêu đề gốc, chọn/khóa winner | Viết plot/kịch bản hoàn chỉnh, SEO cuối |
| `step2` | `02_viet-gian-y-mexico` | 7-Part outline, beat map, canon, timeline và setup/payoff | Đổi title đã khóa, tuyên bố QA PASS |
| `step3` | `03_viet-kich-ban-mexico` `DRAFT` | Viết 3 stage A/B/C cho full 7-Part, lưu file | Chấm điểm QA, tự sửa sau QA |
| `step4` | `04_kiem-tra-kich-ban-mexico` `AUDIT_ONLY` | Một QA gốc + tối đa một QA xác nhận sau sửa; ledger lỗi | Tự viết lại kịch bản hoặc lén sửa file |
| `step5` | `03_viet-kich-ban-mexico` `ONE_REPAIR` | Một lần chỉnh sửa có kiểm soát theo đúng ledger | Tái sửa lần 2 hoặc đổi phần tốt tùy tiện |
| `step6` | `05_seo-mexico` | SEO / image prompts / trailer sau READY | Đổi canon hoặc tiết lộ twist chưa có trong script |

**ONE-REPAIR HARD LOCK:** Với mỗi `video_id`, tối đa 01 `step5` thay đổi kịch bản. Sau đó `step4` là *verification*, không thể cấp vòng `step5` thứ hai. Nếu còn lỗi nghiêm trọng: `MANUAL_REVIEW_REQUIRED`, không có tự động “repair until pass”. Người dùng sửa thủ công hoặc bắt đầu phiên bản mới có chủ ý; không reset `repair_count` để lách.

## 3. Cross-step source of truth

- `FINAL_TITLE.txt`: đúng một dòng Spanish title được khóa tại step1. Tên và chữ hoa/Unicode không được đổi khi handoff.
- `FINAL_OUTLINE.md`: 7 Part, CANON, nhân vật, thiết lập thời gian, cơ chế xung đột, 7 chapter arcs, beat map, setup/payoff ledger.
- `FULL_SCRIPT.txt`: bản thảo TTS-ready tiếng Tây Ban Nha Mexico, bảy marker `[PARTE 1]` đến `[PARTE 7]`, theo thứ tự và chỉ có 1 bản mỗi marker; không có hướng dẫn AI/cảnh/quy trình ở body.
- `FULL_SCRIPT_REVISED.txt`: bản cuối được sửa một lần, nếu có; luôn giữ file gốc.
- `QA_REPORT.json` và `QA_REPORT.md`: đánh giá độc lập; JSON chứa `video_id`,`script_sha256`,`score`,`hard_fails`,`status`,`findings[]`,`phase` (`INITIAL`/`VERIFY`).
- `SEO_PACKAGE.md`: bao gồm title gốc nguyên vẹn + 2 supporting titles (không đổi title khóa), description, tags, hashtags, thumbnails A/B/C và trailer.
- `WORKFLOW_STATE.json`: file trạng thái kỹ thuật lưu `repair_count`, hash title/outline/script và kết luận QA; không sinh trạng thái PASS nếu chưa kiểm chứng.

**Identity:** `title_sha12 = sha256(raw_utf8(FINAL_TITLE.txt.strip_newline))[:12]`; `outline_sha256 = sha256(exact bytes(FINAL_OUTLINE.md))`; `video_id = sha256(title + "\n" + outline_sha256)[:16]`. State, QA và SEO phải khớp `video_id` và script hash hiện thời; không dùng QA của script trước khi sửa.

## 4. Length & delivery

- Dữ liệu mẫu có 78 video, trung vị ~88.75 phút, tiêu chuẩn khai thác: `TARGET_DURATION=85–100 phút`; kịch bản default **11,500–13,500 từ Tây Ban Nha thực** ở tốc độ thuyết minh 135 từ/phút (ước lượng, kiểm tra TTS thật trước xuất bản). Không khóa 70–80k ký tự tiếng Anh của HOMELESS.
- Writer lưu 3 segment: A `[PARTE 1]`–`[PARTE 2]`; B `[PARTE 3]`–`[PARTE 5]`; C `[PARTE 6]`–`[PARTE 7]`. Đây là *ba lần giao bản thảo ban đầu*, KHÔNG phải ba lần chỉnh sửa. Ghép nguyên văn, kiểm tra mỗi Part đầy đủ; không dùng placeholder, không fake word count.
- Khi giới hạn đầu ra không đủ, tiếp tục hoàn thành chính stage đang dở với file thực đã lưu; không giả vờ đã hoàn thành toàn bộ.

## 5. QA readiness / chỉ 1 lượt sửa

- Điểm mục tiêu `>=97/100`, các trục: **logic nhân quả, timeline/canon, quan hệ/tri thức nhân vật, chính tả–ngữ pháp es-MX**, lời hứa tiêu đề, hoàn cảnh lịch sử, ngữ điệu kể, độ dài và cấu trúc.
- `hard_fails=0` bắt buộc; có thể cho PASS với cảnh báo *minor* không cần sửa, vì vậy điểm 97–99 có nghĩa logic (khắc phục mâu thuẫn ngưỡng 98 nhưng zero defect trong HOMELESS V12).
- QA lần đầu: nếu PASS → bỏ qua `step5`; nếu NOT_READY → ledger vị trí, trích câu hiện tại, lỗi, lý do, cách sửa, acceptance test. Tập trung lỗi **logic và chính tả**; các chỉnh sửa văn phong tùy chọn không phải lý do để rewrite cả Part.
- `step5`: một lần sửa tất cả findings đã duyệt trong một batch duy nhất; preserve tốt, log trước/sau. Chỉ phục hồi điểm sau khi kiểm tra lại.
- QA xác nhận `phase=VERIFY`: so sánh trước/sau, kiểm tất cả findings và regression; PASS → step6; NOT_READY → `MANUAL_REVIEW_REQUIRED`, không step5 nữa.

## 6. SEO truth lock

- Spanish Mexico first (title/description/hashtags/tags), cú pháp tự nhiên, không keyword stuffing; kênh tham chiếu không phải tên kênh của người dùng.
- Ba phương án thumbnail A/B/C tương ứng **ba cảnh khác nhau hoặc ba góc của một tình huống** nhưng mỗi ảnh **một khung hình duy nhất, không collage**, 16:9, thumbnail scenario phải xuất hiện trong script.
- Trailer/visual hooks chỉ dùng nhân vật/vật/địa điểm đã thực sự có; không hứa phát hiện tài sản hoặc cảnh có con nếu script không có.

## 7. No counterfeit evidence

- Điểm 98/100 của tiêu đề/outline là **điểm rubric nội bộ**, không phải cam kết 98% viral, CTR hay AVD.
- Không tuyên bố đã đọc transcript TOP1: archive cung cấp MP4, mô tả, thumbnail và metadata, nhưng không cung cấp phụ đề/transcript kênh.
- Không bịa đã chạy công cụ, lưu file hay render ảnh. Nếu môi trường không hỗ trợ lưu thực tế, hiển thị trạng thái `BLOCKED/NEEDS_SAVE`, tuyệt đối không báo đã ghi hash.


## 8. V1.1 CORRECTIVE ADDENDUM — gates verified on first full run

- **Spanish placeholder false-positive fixed:** match only actual uppercase control tokens `TODO`, `TBD`, `LOREM IPSUM`, `CONTINUE HERE`, `YOUR SCRIPT`; ordinary es-MX `todo`, `toda`, and sentence-initial `Todo` are legal narrative words. Still reject genuinely unfinished scripts.
- **QA frozen evidence:** each `QA_REPORT.json` finding anchor MUST occur verbatim in the named Part. `check-qa INITIAL` records the exact QA-report SHA256 and frozen findings in the shared state; cannot silently replace a frozen report at equal score.
- **Repair scope proof:** `commit-repair` must compare initial and edited script by paragraph, allowing only passages near frozen anchors, max 25% changed text/paragraphs. Multi-Part causal repairs must declare `related_anchors: [{"part":7,"anchor":"exact existing phrase"}]` in INITIAL QA; a repair cannot add such permissions afterwards. This is a mechanical boundary, not a semantic correctness guarantee. If a major repair cannot fit authorized windows, stop for manual decision; never reset `repair_count`.
- **QA statuses:** unresolved current findings use `OPEN`/`WARNING`. Don't list a resolved MAJOR inside current findings with `status=FIXED` to bypass readiness; report it in `resolved_initial_findings` on VERIFY. `READY` still means score ≥97, zero HARD and zero unresolved MAJOR; a genuinely nonblocking MINOR warning can remain.
- **SEO gate vs final SEO:** successful `check-qa` or `ready` means `seo_gate_ready=true`, **not** SEO package completion. `seo_ready=true` only after successful `check-seo` on the actual 11-section `SEO_PACKAGE.md`, approved script, and frozen QA report; the validator counts real comma-separated tags ≤500 characters and checks A/B/C and 10/20/30s prompts. Marketing performance requires real YouTube analytics.
- **Files portability:** state references script basename, not an original sandbox-absolute file path; always keep one `WORKFLOW_STATE.json` per video ID in a persistent workspace. Any copied/migrated state from V1 must preserve repair_count and script hashes, never re-initialize to obtain a second repair.
- **Script completeness:** all 7 ordered Part headings, each ≥1,000 narrative words in longform mode and total 11,500–13,500 words. Body only, without markdown directions or AI/meta instructions. Word count remains a heuristic for narration duration; listen to actual TTS before claiming 85–100 min.

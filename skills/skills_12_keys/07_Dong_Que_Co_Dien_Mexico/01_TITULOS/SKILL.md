---
name: viet-lai-tieu-de-mexico
version: 1.1.0
description: "Step1 for Mexico rural hacienda long-form Spanish storytelling: analyze reference titles, produce original 60/40 rewrites, score 5 candidates, reject same-premise duplicates, and lock one Spanish winner for the 7-Part pipeline."
---

# STEP1 — VIRAL TITLE REWRITER · MÉXICO RURAL CLÁSICO V1.1

**SINGLE RESPONSIBILITY:** chỉ tìm ý tưởng/viết lại tiêu đề/chấm, KHÔNG triển khai giàn ý hoặc script. Luôn đọc `references/CROSS_SKILL_QUALITY_CONTRACT.md` và `references/TITLE_DNA_AND_RUBRIC.md`.

## 1. Preconditions

Input có thể là: (i) title video tham khảo; (ii) chủ đề/nhân vật/vật chứng; (iii) yêu cầu tìm N tiêu đề; (iv) danh sách 78 video mẫu. Nếu có ledger tiêu đề cũ, đọc trước. Nếu chưa có ledger, ghi `DUPLICATE_LEDGER_STATUS=NOT_SUPPLIED`, không nói đã dò lịch sử toàn kênh.

- `LANGUAGE_LOCK=es-MX`, mọi tiêu đề cuối là Spanish, *không* xuất title tiếng Anh theo sample CSV dịch.
- `SETTING_LOCK=historias de haciendas y ranchos mexicanos 1910–1970` với lựa chọn bối cảnh cụ thể khi cần.
- Primary title ≤110 ký tự (khuyến nghị 75–105), dài hơn phải sửa gọn; số ký tự bao gồm dấu cách, dấu câu Unicode.
- Title phải nêu rõ **người bị tổn thương hoặc người hành động**, **cú ngoặt/đạo đức**, **một câu hỏi bỏ ngỏ hợp lý**. Không tiết lộ đáp án. Chủ động luân phiên protagonist: viuda, jornalero, criada, huérfano, padre viudo, anciana, hija desterrada, maestro rural, campesina.

## 2. DNA 60/40 có kiểm chứng

Giữ khoảng 60% **công thức tâm lý** của kênh mẫu (bất công → người lạ tử tế / cảnh tưởng đơn giản → lời hứa sâu / giai cấp bị đảo ngược / trẻ em cảm hóa), sáng tạo ít nhất 40% **sự kiện cụ thể** (nhân vật, cách xử lý, vật chứng, địa danh, trở ngại, cách cứu, payoff). 60/40 là heuristic về cấu trúc, **không phải** được phép sao chép 60% câu chữ nguyên bản.

Phân loại một trong 6 mô hình (có thể hybrid nhưng phải chọn 1 chính):
1. `A_BRIEF_KINDNESS`: nghèo cho đi vật cuối cùng → đối phương trở lại/giúp bằng lựa chọn có giá.
2. `B_WIDOW_FOUND_FAMILY`: mẹ góa/chồng góa + con + căn nhà thiếu vắng → gia đình được xây bằng trách nhiệm.
3. `C_INVISIBLE_WITNESS`: người hầu/tá điền bị xem thường là người duy nhất chứng kiến hoặc ở lại → công lý hợp lý.
4. `D_TEST_OF_CHARACTER`: hacendado giấu danh phận/tài sản → lòng tin và hậu quả khi nói dối.
5. `E_RANCH_RESTORATION`: thừa kế hoặc cứu nông trại nghèo khó → lao động, lựa chọn, lịch sử đất.
6. `F_FAMILY_TRUTH`: lời hứa cũ/giấy tờ/người thân thất lạc → chuỗi bằng chứng xác thực, không deus ex machina.

## 3. Steps

1. Trích mẫu: archetype, starting wound, promised revelation, emotional contrast, 2–3 keyword hooks. Nếu mẫu có view, ghi nguồn là supplied dataset (không coi view cao chứng minh chất lượng của một cụm từ).
2. Sinh đúng **5 tiêu đề A–E** nếu không có chỉ thị số lượng khác. Mỗi title là premise khác nhau, không chỉ đổi tên người/một từ.
3. Với mỗi title: một câu premise, DNA, audience question, 1 thế mạnh, 1 nguy cơ ngôn ngữ/trùng lặp.
4. Tính điểm rubric 100 có chứng cứ. Gate đề cử `>=98/100` (heuristic nội bộ; phải giải trình điểm), không tự cho 100 mặc định. Nếu không đạt, tạo thêm 5 candidate mới; không “tăng điểm cho đủ”.
5. So sánh ledger: exact normalized text và near-premise fingerprint (protagonist, injustice, twist mechanism, payoff). Nếu giống ngữ nghĩa dù title khác → REJECT; không tái xuất bản bằng thay một địa danh.
6. Khóa `CURRENT_FINAL_TITLE`, xuất file `FINAL_TITLE.txt` đúng 1 dòng, `TITLE_REPORT.md`; có thể dùng `scripts/title_registry.py` để kiểm thêm trùng lặp, nhưng công cụ chỉ hỗ trợ, không chứng minh trùng ngữ nghĩa hoàn toàn.

## 4. Prohibited title traps

- Không sử dụng `Mafia`, `billionaire`, `CEO`, `sheriff`, `homeless inheritance secret bunker` nếu không có lý do Mexico thiết thực; tránh ảnh hưởng DNA của niche khác.
- Không khẳng định “lo que pasó dejó a todos llorando” nếu không có sự kiện xây được.
- Không ghi “historia real/verdadera” khi là hư cấu; không kỳ thị người nghèo, người khuyết tật hay phụ nữ hiếm muộn; sự khác biệt của người yếu thế không phải trò gây sốc.
- Không hứa “hóa ra là chủ nhân của tất cả” liên tục. Đảo ngược vì **đạo đức và hành động**, không chỉ tiền thưởng.
- Không dùng tên kênh tham khảo trong tiêu đề.

## 5. Output contract

```
CHANNEL_KEY: MEXICO_RURAL_CLASSIC
STEP: 1
TARGET_LANGUAGE: es-MX
SOURCE_SIGNAL: [có hoặc không có dataset]
CANDIDATES: A..E (title / DNA / original premise / SCORE / risk)
WINNER_SCORE: nn/100 (căn cứ từng nhóm)
DUPLICATE_LEDGER_STATUS: CHECKED | NOT_SUPPLIED
CURRENT_FINAL_TITLE: <exact Spanish text>
TITLE_LOCK: TRUE | FALSE
NEXT: step2 (chỉ nếu đã khóa)
```

Tạo thực file nếu môi trường cho phép. Sau khi khóa, title sẽ không tự động thay trong Step2–6; mọi thay đổi chủ đích cần restart identity.


## V1.1 — Better title test, keep exact pipeline output

- Candidate score ≥98 is an **internal selection rubric**, not a measured CTR guarantee. Don't claim title is novel when duplicate ledger is missing. Use `DUPLICATE_LEDGER_STATUS=NOT_SUPPLIED` and mark `PUBLISH_HISTORY_CHECK=PENDING` in TITLE_REPORT; keep the user-selected title lock unchanged.
- Each candidate must have a distinct **observable causal situation**: vulnerable protagonist's risky action → social/material cost → withheld choice/secret. Reject generic curiosity phrases and artificial billionaire/treasure pivots. Use real rural emotional stakes (employment, shelter, kinship, honor, wages) rather than copied reference headlines.
- Before lock, check the click promise can be literally shown in P1 and paid off in P4–P7, and that image prompt would show ONE dramatic instant without invented contents of a document. Once locked, `FINAL_TITLE.txt` never changes silently, even after QA repair.

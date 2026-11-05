---
name: viet-kich-ban-mexico
version: 1.1.0
description: "Mexico Rural long-form Spanish script writer for Step3 three-stage 7-Part drafting, and Step5 strictly one authorized repair batch correcting logic/continuity/spelling only; writer never self-audits or self-passes."
---

# STEP3 DRAFT + STEP5 ONE REPAIR — MEXICO RURAL SCRIPT WRITER V1.1

**Hai chế độ không thể lẫn:** `WRITER_MODE=DRAFT` chỉ Step3; `WRITER_MODE=ONE_REPAIR` chỉ Step5. Đọc `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/SCRIPT_ENGINE.md`, `references/CANON_STATE_MATRIX.md`, `references/HOOK_AND_PAYOFF_EXAMPLES.md`. Không tạo score hoặc `SCRIPT_READY` — QA Step4 sở hữu quyền này.

## STEP3 — FULL SCRIPT / A-B-C PERSIST

### 1. Inputs (mandatory)

- Title khóa `FINAL_TITLE.txt` (same exact string).
- Outline đầy đủ `FINAL_OUTLINE.md` 7 Part + canon, knowledge states, timeline, setup/payoff.
- `TARGET_LANGUAGE=es-MX`; văn phong kể chuyện tối ưu TTS, third-person close, câu tiếng Tây Ban Nha trơn tru; không gán tiền tố `@speaker` hay máy quay vào body.
- Target 11.500–13.500 words counted from narrative only, khoảng 85–100 phút với tốc độ thuyết minh dự kiến 135 words/min; thông số dự kiến, không đảm bảo thời lượng thực tế.

### 2. 3-stage call contract

- **A:** Part 1–2, khoảng 2.900–3.400 words. Ghi `SCRIPT_A.txt` nguyên văn, đầy đủ opening hook. Chốt state C01..C10 cuối P2.
- **B:** Part 3–5, khoảng 5.000–5.700 words. Bắt buộc mở lại A và canon trước khi viết; không kể lại A, không thay A. Ghi `SCRIPT_B.txt`, cập nhật C-state.
- **C:** Part 6–7, khoảng 3.600–4.400 words. Mở lại A/B và các dangling setups, resolve. Ghi `SCRIPT_C.txt`, ghép `FULL_SCRIPT.txt` bằng `A + "\n\n" + B + "\n\n" + C` đúng thứ tự, không para intro/outro thừa.

Các mức word-stage là dải định hướng; tổng full script quyết định tính hợp lệ. Nếu một stage chưa đủ từ/Part, tiếp tục hoàn thiện **stage đó** và cập nhật file thực; đây là hoàn thiện bản thảo, không phải `step5` repair. Khi môi trường không lưu file, dừng báo `STAGE_INCOMPLETE`; không gắn READY giả.

### 3. Narrative engineering (must obey)

1. `[PARTE 1]` bắt đầu bằng **giây phút đảo chiều**: 140–210 words đầu tiên có hành động nhân quả và một chi tiết gợi tiêu đề. Không mở bằng `Hace muchos años...` dài dòng.
2. Mọi Part phải có cảnh diễn ra chứ không chỉ tường thuật suy nghĩ. Giữ tỷ lệ hành động/đối thoại/tường thuật cân đối; nhân vật có giọng và thói quen nói khác nhau.
3. Thuyết phục qua hành động: người hùng kiếm công/đỡ người/giữ lời hứa rồi mới có sự công nhận; sự giàu sang không phải phép màu.
4. Chuyển cảnh với time/setting anchor: `A la mañana siguiente`, `Tres días después`, `En la cocina de...`; chuyển cảnh trên timeline có thể theo dõi.
5. **Visible rural texture:** mùi ngô nướng từ comal, đất bám ủng, tóc ướt sau cơn mưa, tiếng ngựa, tấm rebozo; 1–2 chi tiết có chức năng trong cảnh, không liệt kê du lịch.
6. Mỗi 6–9 phút tương đương 800–1.150 words có một beat biến đổi (information, stakes, decision, tenderness). Không bịa hành động dồn dập liên tục; dùng khoảnh khắc ấm áp để người xem thở.
7. Mọi cliffhanger đều dựa sự kiện có thể giải, không lặp nguyên mẫu `pero nadie sabía que todo estaba a punto de cambiar`.
8. Kết: giải việc đất đai/quan hệ/tin đồn/đức tin/chuỗi chứng cứ; một quyết định nhỏ chứng minh character growth và ending image gợi opening prop. Không đẩy toàn bộ kết thúc sang hậu truyện.

### 4. Source preservation and preflight

- Headings body chỉ `[PARTE 1]` ... `[PARTE 7]`; không thêm footnote lẫn vào TTS.
- Preserve locked title/canon identity, spelling of names, age/family table, property ledger, plot payoff. Kịch bản thoại nhân vật không thêm đạo diễn trong ngoặc.
- Chạy `python scripts/mexico_pipeline.py assemble ...` và `check-script` để kiểm 7 Part, word count, empty part, hash. Đây là check cấu trúc, **không** tuyên bố QA văn học.
- `FULL_SCRIPT.txt` sạch, dùng UTF-8 LF; phụ lục kỹ thuật lưu tách ngoài file.

### 5. Step3 output

```
WRITER_MODE: DRAFT
STAGE: A | B | C
STAGE_PARTS: 1–2 | 3–5 | 6–7
TITLE_LOCK_MATCH: TRUE
SEGMENT_FILE: SCRIPT_A.txt / SCRIPT_B.txt / SCRIPT_C.txt
FULL_SCRIPT_FILE: FULL_SCRIPT.txt (only after C)
SCRIPT_WORDS: measured_or_unverified
VERIFICATION: PASS | BLOCKED
NEXT: step3 (next stage) / step4 (after complete)
```

## STEP5 — EXACTLY ONE REPAIR BATCH

### 1. Eligibility hard gate

- Must have actual `QA_REPORT.json phase=INITIAL status=NOT_READY`, frozen source hash matches current `FULL_SCRIPT.txt`, `findings[]` with anchors and severity.
- `WORKFLOW_STATE.json repair_count == 0`. If already 1, **STOP** `MANUAL_REVIEW_REQUIRED`; do not sneak second repair via “redo”, “regenerate” or switching filename.
- `step5` explicit invocation means approval to repair exact frozen ledger, not approval to revise otherwise good prose. If user gives narrow scope, respect it, and warn unresolved items may prevent READY.

### 2. One-pass repair action

Read **entire** source once to understand continuity; group all findings into ONE plan and execute in ONE revision. Prioritize:
1. `L` — causal/chronology/physical/legal plausibility contradictions.
2. `C` — canon/identity/knowledge/ages/prop provenance & setup/payoff.
3. `S` — ortografía: spelling, accents, tilde, gender/number agreement, punctuation `¿? ¡!`, wrong `tú/tu`, `él/el`, homophones, repeated words, speaker/dialogue confusion.
4. `P` — title promise / continuity errors directly caused by L/C, not stylistic tinkering.

Constrain change to minimum affected paragraphs and dependent sentence links; **protect good scenes**, opening hook, high-performing emotional beats, spoken style. For every change record `finding_id`, `part`, 1–2 source anchors, old text excerpt, new excerpt, test/result. If a logic error requires two remote sentences (setup and payoff), fix both in same authorized batch and list both.

Avoid modifying plot twists/character relationships unless directly required for an identified hard fail. Preserve full 7 Part headings, es-MX language, duration band; do not reset title, outline, `video_id`.

### 3. Outputs and lock

- Write `FULL_SCRIPT_REVISED.txt` and `REPAIR_LOG.md`, do not overwrite `FULL_SCRIPT.txt`.
- Run `python scripts/mexico_pipeline.py commit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --state WORKFLOW_STATE.json` **once**. `repair_count` increments permanently to 1 for this video.
- **Never** declare QA PASS or auto-trigger more repair. Handoff `step4 phase=VERIFY` to independent QA. If verification still fails, next status is manual-review-only.

```
WRITER_MODE: ONE_REPAIR
SOURCE_SHA256: <measured>
FINDINGS_ADDRESSED: <IDs>
REVISED_SHA256: <measured>
REPAIR_COUNT: 1
REPAIR_COMPLETED: TRUE
QA_STATUS: PENDING_VERIFY
NEXT: step4 (VERIFY ONLY)
```


## V1.1 — Draft rhythm + technically limited ONE_REPAIR

- Preserve 3 stage A/B/C and full 7-Part script; default 11,500–13,500 narrated Spanish words, each Part ≥1,000. Avoid repeated abstract moral explanations after every paragraph. A stretch of two consecutive scenes explaining accounts/document pages **must be interrupted by a real decision, confrontation, kindness or material consequence** before further exposition. No new evidence or magical helper without outline provenance.
- Run the V1.1 `mexico_pipeline.py` directly; ordinary Spanish words `todo`, `toda`, `Todo` are NOT placeholders. Only uppercase `TODO`/`TBD` etc. trigger the unfinished-text block.
- ONE_REPAIR must cite real INITIAL QA findings with verbatim unique-enough anchor in target Part. For dependent adjustments in another Part, QA INITIAL must predeclare `related_anchors` including exact source phrase/Part; the Writer may not add post-hoc permission.
- Before commit, execute `audit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --initial-report QA_REPORT_INITIAL.json`; then `commit-repair` performs the same mandatory scope checks against the frozen state. Scope applies to paragraphs near QA anchors (±1 paragraph) with 25% total change ceiling; unexpected broad changes STOP for manual editor, never auto-raise the ceiling. Do not overwrite original.
- NEVER mark repair passed from the repair log itself: QA VERIFY must independently read revised script, record current report digest and review regressions. One revision only, one verification only.

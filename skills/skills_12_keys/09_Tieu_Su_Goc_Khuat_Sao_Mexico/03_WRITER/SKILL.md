---
name: viet-kich-ban-mexico-celebrity
version: "1.1.0"
language: vi
script_language: es-MX
description: "STEP3 Writer 3-stage A/B/C + STEP5 one-shot surgical repair; true-life Spanish Mexico documentary, 7 parts, exact source provenance."
---
# SKILL — VIẾT KỊCH BẢN TIỂU SỬ SAO MEXICO

**V1.1 bắt buộc:** Đọc `references/V11_UPGRADE_NOTES.md` và shared contract trước khi chạy. Phát hiện RUN đầu Pedro Infante là bộ test regression bắt buộc, nhưng không phải dữ liệu sự thật cho các tập sau.

## 0. Ownership and required reads
Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/NARRATION_STYLE_RETENTION.md`, `references/WRITER_PATCH_ONCE.md`. Script writer owns only STEP3 A/B/C and STEP5 patch, distinct modes. Never audit your own draft as independent QA.

## 1. Input contract
Require source-verifiable Step2 outline file with exact locked title, full 7-part plan, Sxx claims and Cxx source ledger, timeline, canon and prohibited unsupported statements. If no credible evidence for central allegations, reject unsupported angle rather than fictionalize the biography. Preserve names, dates, relationship status, exact event outcome and explicitly attributed denials.

## 2. STEP3 DRAFT mode — 3 explicit calls
- Stage A: FULL narrative prose PART 1–2, target ~14k Spanish Unicode characters. Create exact file `MEX_<title_sha12>_SCRIPT_A.txt`, save manifest with locked title + outline SHA + video ID. No later segments in this call.
- Stage B: reopen actual A and identical outline, verify title+outline identity; write only FULL narrative PART 3–5 target ~18k characters. Do not rewrite A. Exact file `_SCRIPT_B.txt`.
- Stage C: reopen A/B and same outline; write full PART 6–7 target ~14k chars, exact file `_SCRIPT_C.txt`. Assemble exact concatenation A+B+C into `FULL_SCRIPT.txt`; verify seven ordered headings, exact body length 40,000–49,000 characters, target 42k–48k, coherent source anchors/chronology.
- If executor cannot persist/reopen files or generation output truncates, label `PARTIAL_NOT_RELEASED`. No fake scripts or invented counts. A/B/C contain complete prose (not placeholders); one call writes one stage.

## 3. Spanish VO standard
Narrative in native **Mexican Spanish**, empathetic, nuanced, suspenseful but verifiable. TTS-clean: only `PARTE 1`...`PARTE 7` headings, coherent paragraphs and narration; no bracketed production commands, markdown links, narrator labels or citations inside spoken body. Keep source IDs in external `FACT_MAP.md` or outline/QA ledger; a production documentary can put genuine sources in video description/credits. Do not use "todos sabían" or private invented talk.

Opening: 140–200 spoken Spanish words over 60–90 seconds at an estimated 135–160wpm, one documented public event, one contrast, one specific honest question. Long form: mix scene-setting described from facts, concrete record, human stakes, analysis, and counterpoint. Every major revelation includes earlier public setup and later source-supported consequence. Chapter break after a substantive resolution, not endless cliffhanger filler. When source state is uncertain say "según...", "de acuerdo con...", "no está confirmado" and present meaningful response where available.

## 4. Character and budget lock
7 chapters in order. Suggested weights P1 14%, P2 16%, P3 13%, P4 13%, P5 13%, P6 15%, P7 16%, adjust to researched content. Hard full script body characters 40,000–49,000; preferred 42k–48k. Word target ~6.8k–8k guides TTS; no arbitrary word/char equivalence. Check exact Python `len(text)` on Unicode normalized LF source files; avoid counting external research metadata. A ~14k + B ~18k + C ~14k = ~46k. Do NOT pad with repeated biographies or fictitious paragraphs to force length; if insufficient sources, mark blocked.

## 5. STEP5 ONE_REPAIR_ONLY mode
Needs `QA_REPORT.md` + `QA_PATCHES.json` frozen against exact baseline `FULL_SCRIPT.txt`, approved Step5 user request; execute exactly ONE batch of all accepted issues, emphasizing logic, chronology, source accuracy, Spanish spelling/accents, typos, agreements, punctuation and accidental repeated wording. DO NOT introduce new sensational allegation, additional life event, scene, source or subplot for drama. Minor stylistic preferences are out of scope.

Apply byte-scoped patches with `scripts/mexico_tools.py repair-init` then `repair-apply` (see reference). Every change must be covered by exactly one cited QA issue. Verify provenance, original unchanged spans, Part order and length. Dùng `repair-verify-portable --dir <output>` để replay bản vá từ nguồn gốc và hoạt động sau khi di chuyển thư mục. Report `repair_used=true`. No second `step5` in same episode/run; if still blocked, report `BLOCKED_AFTER_ONE_REPAIR`, don't patch again. STEP4 can perform **read-only** final verification after edit, without another rewrite cycle. STEP6 only if last QA status READY on exact revised hash.

## 6. Output
Stage A/B/C: provide only that stage's actual text/file and real counts plus manifest identity; future stage suggestions per controller. At C, include `FULL_SCRIPT.txt`, `SCRIPT_MANIFEST.json`, `FACT_MAP.md`. At Step5, output `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json`, issue resolution summary, `repair_used=true`; no fake score or READY claim by Writer.

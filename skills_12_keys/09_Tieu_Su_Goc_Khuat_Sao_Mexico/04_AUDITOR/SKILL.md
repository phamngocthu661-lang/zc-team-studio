---
name: kiem-tra-kich-ban-mexico-celebrity
version: "1.1.0"
language: vi
review_language: es-MX
description: "STEP4 independent QA exactly once per baseline + one postrepair READ-ONLY verification; prioritizes factual logic, event chronology, spelling/accents and grammar."
---
# SKILL — QA KỊCH BẢN SAO MEXICO (ONE-SHOT)

**V1.1 bắt buộc:** Đọc `references/V11_UPGRADE_NOTES.md` và shared contract trước khi chạy. Phát hiện RUN đầu Pedro Infante là bộ test regression bắt buộc, nhưng không phải dữ liệu sự thật cho các tập sau.

## 0. Exclusive scope and references
Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/LOGIC_SPELLING_FACT_QA.md`, `references/QA_OUTPUT_AND_SCORE.md`. Review source only. Writer executes Step5 ONE time; QA NEVER authors replacement draft and cannot secretly revise. No open-ended review cycles.

## 1. STEP4 one full review
Require actual `FULL_SCRIPT.txt`, locked title, outline, source register/claim ledger. Record file SHA256/Unicode count/Part order with tool when available, else mark unverified. Perform two reading modes IN THE SAME REVIEW (not 2 rewrite rounds):
- Read 1: chronological fact logic, event chain, year/age/relationship, correct person and works, differences in allegations/reports/conclusions, title/script alignment, 7 chapters, honest retention.
- Read 2: line-by-line Mexican Spanish spelling, accents, pronouns, agreements, punctuation, grammar, names, date formatting, accidental repetitions, chapter continuity. Also check any quote attributions, source IDs, unsupported sensitive allegations, legal status, cause-of-death phrasing.
- Reverse-check end against title and earlier source evidence; explicitly list omissions where a claim cannot be corroborated. If available, use authoritative external lookup or user-supplied original sources for every consequential controversy.

## 2. Single frozen repair ledger
Record all actionable findings in ONE `QA_REPORT.md` and `QA_PATCHES.json`, with issue_id P01..., severity CRITICAL/MAJOR/MINOR, anchor original exact text, issue type FACT/LOGIC/SPELLING/GRAMMAR/CONTINUITY, evidence Sxx, minimal correction, expected acceptance. For source gaps with no defensible correction, mark `BLOCKED_RESEARCH_REQUIRED`; never 'fix' by fabricating names/dates. QA may propose replacement wording, but Step5 Writer authors/applies actual patches only on explicit request.

## 3. Status and score
Score /100: source/factual integrity 35, timeline/causal logic 30, native Spanish orthography+grammar 25, title/structural fidelity 10. Record deductions *reasoned and evidence-based*, no automatic 'all issues=100' arithmetic. Hard BLOCK for unsupported serious claim, material source contradiction, invented quote, major unresolved chronology, wrong person or unauthorized source. `PASS_READY` only >=97, no remaining CRITICAL/MAJOR defects; material orthography errors must be corrected. If original passes, skip Step5 directly to Step6.

## 4. After Step5 (read-only verify, not iterative rewrite)
Reopen `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json`, prior QA ledger, exact baseline; ensure every authorized patch applied, no other text changed, no new contradictions introduced in adjacent sentences, 7 Part headings stable, spelling/logic check resolved. Create `QA_FINAL.json` bằng lệnh `qa-seal` từ một `QA_VERDICT_INPUT.json` đã đánh giá thực chất; tuyệt đối không gõ tay số lượng ký tự hay trạng thái with `status=PASS_READY` or `BLOCKED_AFTER_ONE_REPAIR`, `repair_used=true`. If blocked, do not send another repair request. One final verification is permitted; it is **not a second editing pass**.

## 5. Output
Vietnamese report: exact baseline ID/hash if verified; source coverage list; chronology table; top logical faults; list of Spanish typos with original/correct; fatal evidence gaps; one complete patch ledger; readiness and justified score; recommendation Step5 ONLY if editable within one pass. Never claim actual full forensic read from partial snippets. Do not recommend repetitive `step4→step5→step4` cycles.

> V1.1 ACTIVE — replacement package; read V1_1_UPGRADE_GUIDE.md. Original V1 controller interfaces retained.

# MEXICO CELEBRITY — STEP CONTROLLER V1 (SIX COMMANDS, 5 SKILLS)

Use only the corresponding task named `step1`, `step2`, `step3`, `step4`, `step5`, `step6` or explicit Vietnamese equivalents. `next` can be interpreted **only if user clearly has a verified prior state**; default explicit commands avoid ambiguity. No automatic steps. No cross-genre settings from Mafia or HOMELESS. Publishing language es-MX, operational language Vietnamese.

| Command | Owning install ZIP | Duty | Artifact |
|---|---|---|---|
| step1 | Viet-Tieu-De-Mexico-V1.zip | source-based title rewriting/score/LOCK | TITLE_LOCK.md, FACT_LEDGER_DRAFT.md |
| step2 | viet-gian-y-mexico-V1.zip | 7-Part documentary architecture/source canon | OUTLINE.md, SOURCES/CLAIMS |
| step3 (A,B,C separately) | Viet-kich-ban-mexico-V1.zip | 3-stage TTS Spanish doc script from verified sources | SCRIPT_A/B/C.txt, FULL_SCRIPT.txt, manifest |
| step4 | kiem-tra-kich-ban-mexico-V1.zip | single independent QA for logic/facts/spelling, then read-only final verification after repair | QA_REPORT.md, QA_PATCHES.json, QA_FINAL.json |
| step5 | Viet-kich-ban-mexico-V1.zip | **ONE** surgical repair batch, all approved QA findings, never second rewrite | FULL_SCRIPT_REVISED.txt, REPAIR_PROOF.json |
| step6 | seo-mexico-V1.zip | locked title/source-safe SEO+thumbnail+8s hook | SEO_PACK.md |

## One-repair maximum: your new customized rule
- If Step4 baseline READY: go straight Step6, no Step5.
- If Step4 produces fixable report: user says Step5 once, Writer applies ONE batch covering all documented logic/orthography/factual-attribution fixes. State `repair_used=true` must persist; run read-only Step4 final VERIFY exactly once (it does not issue another patch list).
- If final QA still has CRITICAL/MAJOR defects, label `BLOCKED_AFTER_ONE_REPAIR` and do NOT re-enter Step5 within same episode/run. Extra source collection or a distinct new version requires a new explicit user decision. **No 2nd/3rd iterative rewriting**.
- No real-world fact claims solely from competitor title/description. Research gating comes BEFORE writing.

## Identity and handoff
`title_sha12=sha256(UTF8 exact LOCKED_TITLE)[:12]`, `outline_sha256=sha256(actual outline bytes)`, `video_id=sha256(UTF8(title+"\n"+outline_sha256))[:16]`. Actual file/hash only. Source register Sxx, claim ledger Cxx travel across all steps; no invented sources. `FULL_SCRIPT.txt` must be exact A+B+C bytes (canonical `\n` joining rules in script below).

## Success suggestions
- Step1 success: **Gợi ý bước tiếp theo:** Gõ `step2` để tạo giàn ý tiểu sử 7 Part.
- Step2 verified success: **Gợi ý bước tiếp theo:** Gõ `step3` để viết Part A (Part 1–2).
- Step3 A: **Gợi ý bước tiếp theo:** Gõ `step3` để viết Part B (Part 3–5).
- Step3 B: **Gợi ý bước tiếp theo:** Gõ `step3` để viết Part C (Part 6–7) và ghép script.
- Step3 C verified: **Gợi ý bước tiếp theo:** Gõ `step4` để kiểm tra logic và tiếng Tây Ban Nha.
- Step4 READY initial: **Gợi ý bước tiếp theo:** Gõ `step6` để làm SEO.
- Step4 fixable NOT READY: **Gợi ý bước tiếp theo:** Gõ `step5` để sửa đúng MỘT lần theo QA.
- Step5 completed: **Gợi ý bước tiếp theo:** Gõ `step4 final verify` để kiểm tra bản sửa không chỉnh lại.
- Step4 final READY: **Gợi ý bước tiếp theo:** Gõ `step6` để làm SEO.
- Step4 final BLOCKED or research missing: no success suggestion. Step6: no suggestion.

## Operational cautions
The `mexico_tools.py` CLI verifies Unicode lengths, identity, byte-accurate patch scopes and SHA agreement, not whether an allegation is real or Spanish grammatical correctness. QA must actually review sources/prose. A publication deadline never overrides truth gate or repair-one limit.

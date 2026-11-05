---
name: kiem-tra-kich-ban-ong-gia-us
description: "Step4 DADUS read-only QA: verify seven-part father-revenge logic, continuity, American English spelling; freeze one consolidated patch contract before at most one Writer repair."
---
# SKILL 4 — INDEPENDENT QA + FROZEN PATCH LEDGER
Read controller/shared contract and `references/QA_LOGIC_SPELLING_CHECKLIST.md`, `references/QA_SCORE_AND_OUTPUT.md`. Step4 ONLY, no narrative rewriting.

## Priority order (requested by user)
1. LOGIC CAUSALITY: title promise, proof chain, timeline, who knows what and when, reason earlier choices were/weren't possible, consequences of every action.
2. FINANCES/LEGAL/ACCESS: who owns property, signatures, wills/trusts, account authorization, job/board powers, realistic time for steps, professionally plausible behavior. No fabricated citations to state laws.
3. CONTINUITY: names, ages, relations, dates, geography, money and object position remain consistent across 7 Parts.
4. SPELLING/GRAMMAR/TTS: American English typos, duplicate/broken words, malformed dialogue quotes, name variations, subject/pronoun mismatches, punctuation that would mislead narration, residual metadata or transcript errors.
5. SECONDARY QUALITY: hook/retention, prose cliches, emotional credibility, soft landing; do NOT inflate edits for taste or rewrite entire story.

## Auditing procedure
1. Verify original or revised real full file, locked title, outline SHA/video_id, 7 Parts, UTF-8 LF, exact body length using locked profile.
2. `qa_checkpoint.py init ...` and read original start-to-end, then proof/continuity pass, then end-to-start checks. Fill evidence-driven 7×14 coverage cells, stage evidence, hard gates, rubric, and specific anchored Pxx findings. Use `SPELLING`/`GRAMMAR` classification for real errors.
3. If score ≥98, all hard gates PASS and zero remaining actionable defect => `READY` (98/99 possible when separately documented non-actionable deductions; never fake 100). Else `NOT READY`.
4. If original NOT READY, make ONE consolidated prioritized patch list; for every Pxx record exact quote, root cause, viewer impact, acceptance test, rubric category, severity and one or more exact byte zones in `QA_ZONE_SPEC.json`; freeze through `freeze_repair_contract.py`. DO NOT compose replacement prose or approve automatically.
5. If evaluating revised script after Step5, require existing ONE_REPAIR_LOCK and independently re-audit. If NOT READY, publish honest blockers and STOP automatic rewrite flow; do not freeze a second contract.
6. Human review of content is essential; scripts verify file/structure/hashes/checkpoint completeness, not subjective writing quality.

Output format: `QA_SCORE`, `READY/NOT READY`, `EXACT_BODY_CHARS`, `SOURCE_SHA256`, `LOGIC_DEFECTS` (IDs+excerpt), `SPELLING_DEFECTS` (IDs+excerpt), factual/access checks, hard gates, frozen spec path if baseline NOT READY, `REPAIR_COUNT` (0 or 1), `NEXT_ALLOWED_STEP`.

## V1.1 — INDEPENDENT CREATIVE READOUT (non-patch)
Read `references/CREATIVE_READOUT_V1_1.md`; report a small `CREATIVE_READOUT` separately from official QA_SCORE and Pxx. Use `narrative_diagnostics.py` from Writer scripts to inspect chapter balance, literal repetition and city anchors without changing manuscript. Subjective hook/pacing/justice intensity is editorial advice for future outlines; it does NOT authorize Step5. Only objective defects under the existing rubric may enter the ONE frozen repair contract. No rework loop after Step5.

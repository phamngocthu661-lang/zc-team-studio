---
name: kiem-tra-kich-ban-mexico
version: "1.1.0"
language: "vi"
description: "S4 độc lập kiểm logic, quan hệ, timeline, tiền/tài sản và chính tả/ngữ pháp es-MX; cấp hợp đồng chỉnh sửa duy nhất. S4B kiểm lại bản sửa một lần rồi READY hoặc BLOCKED, tuyệt đối không tự sửa."
---
# S4 + S4B — MEXICO INDEPENDENT STORY QA (LOGIC & ES-MX PRIORITY)

## 0. Read these first
`references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/MEXICO_MARKET_DNA.md`, `references/LOGIC_AND_SPELLING_MATRIX.md`, `references/QA_SCORE_RUBRIC.md`, `references/QA_REPORT_AND_JSON.md`, `references/REPAIR_SCOPE_AND_REGRESSION.md`. Full outline/canon and actual full script. QA ONLY; no rewriting author prose. Do not score from synopsis or earlier chat snippets.

## 1. TWO MODES — one full audit before and one verification after
`INITIAL_AUDIT` = S4: independent source read, detect actionable errors, score, issue exact source anchors, freeze authorized edit windows. If no actionable issues and >=97/100 with all gates PASS, immediately set final READY with `repair_count=0` and script baseline SHA, without S5. Otherwise freeze findings and authorize one repair batch.
`POST_REPAIR_VERIFY` = S4B: read revised file and verify proof of one repair, re-read entire 7-Part manuscript focusing on previous defects, side effects, logic and spelling. Produce final score and `QA_FINAL.json` with actual revised SHA, `repair_count=1`. If P0/P1 survives, required counts fail, or critical contradictions appear -> `BLOCKED_MANUAL_DECISION`; do **not** request automatic S5 again.

## 2. INITIAL_AUDIT input validity gate
- `TITLE_LOCK.json`, exact `CURRENT_FINAL_TITLE.txt`, `FINAL_OUTLINE.md` + hash, verified `FULL_SCRIPT.txt` and manifest / 7 Parts / length.
- Check actual title/outline hash and script bytes. If incomplete/short or placeholder, mark `BLOCKED_INVALID_SCRIPT` without fake score.
- Use source SHA in `QA_FINDINGS.json`. Non-unique anchors are not safe; include a larger *exact* phrase so edit span unique or return to QA diagnosis.

## 3. Read #1: human reading, title + emotional logic
Read the entire script start to end, no excerpts. Is title event seen in first 90s? Woman acts rather than being moved by random saviors? Are betrayal, choice, evidence and outcome coherent? Are different family members psychologically plausible? Does 95–110m narrative keep moving rather than recycling the same humiliation? Identify 3–6 actual high-quality quotes to PROTECT for S5, ensuring protected quotes never cover edit windows.

## 4. Read #2: forensic continuity sweep (MOST IMPORTANT)
For each of 7 Parts, check scene-level:
- Timeline/durations/timezones: dates, pregnancy, ages, birth, work shifts, travel city, elapsed marriage/divorce.
- Identities: exact names/nicknames, relationship labels, family links, ages and who fathered whom if relevant.
- Knowledge causality: who learned which secret from whom and when; POV may not know private thoughts unless later corroborated.
- Money/assets: amounts in MXN, currency shifts, owners, signatures, accounts, access, legal status and process duration, evidence of transactions.
- Evidence/objects: who owns original/copies, proof source, when document appears, tampering, witness access, photos and recordings.
- Professional/logistical/medical: real-looking hospital practices, business authorities, realistic delivery/flight times, working hours; identify specific implausibility without inventing Mexican law.
- Emotional/incentive logic: every escalation has a motive and cost; heroine's exit and later reveal arise from decisions seeded earlier.
- Correct interpretation of public proof: a gala host's announcement alone doesn't immediately confer legal rights or directorship.
- Ending reverse check: for every climax proof/court/board action, identify earlier setup scene and necessary intermediate action.

## 5. Read #3: language/spelling sweep (MOST IMPORTANT)
Check actual es-MX text, paragraph-by-paragraph: accent marks, inverted interrogatives, gender/number agreement, verb tense/conjugation, pronoun referents, punctuation near quotes, common homophones (si/sí, el/él, tu/tú), accents in names, dialogue intelligibility, unnatural English calques, run-on or artificially chopped sentences, repeat text. Distinguish objective errors from dialectal alternatives; do not overcorrect a native Mexican expression because it differs from Spain Spanish.

## 6. QA triage — only repair real faults
`P0 BLOCKER`: title contradicted, wrong person/scene, impossible child age, irreparable identity, wrong ending.
`P1 MAJOR`: knowledge leak, evidence sourced after use, impossible money/control/legal/medical action, unexplained teleportation, missing cause, severe grammatical ambiguity.
`P2 MINOR ACTIONABLE`: misspelled character/place, incorrect accented meaning, agreement error, punctuation that changes question/dialogue meaning, minor timeline/amount inconsistency, clear repeat/typo.
`P3 ADVISORY`: debatable style, optional imagery, subtle rhythms; do NOT expand edit windows solely for P3.
Every Pxx has `part`, exact unique `old_text` anchor, category, severity, why inconsistent, root cause, replacement acceptance condition, dependency and whether neighboring protected prose must be left intact. Group all actionable P0–P2 into ONE frozen batch; if there are omissions not covered by safe windows, block until contract complete BEFORE S5.

## 7. Conservative QA score and hard gates
Use **100-point** rubric in `QA_SCORE_RUBRIC.md`; record real evidence and deductions. `>=97` alone never ensures READY: no remaining P0/P1, no unaddressed objective P2 that interferes with comprehension, 7 Parts, target body length, exact source/hash, correct es-MX, title promise, ethical/credibility hard gates must pass. If not, NOT READY even at 99. Do not invent 100 because document has headings.

## 8. Exact repair contract freeze
Save `QA_INITIAL_REPORT.md` and `QA_FINDINGS.json` using `references/QA_REPORT_AND_JSON.md`; issues list **all actionable** errors and exact `old_text` uniquely present in source; protected spans from unaffected story sections only. Compute baseline SHA from real full script, not copy a title string into hash field. Execute:
`python scripts/workflow_tools.py qa-freeze --baseline FULL_SCRIPT.txt --findings QA_FINDINGS.json --out QA_FROZEN.json`.
The utility rejects missing, ambiguous, overlapping, protected-window intersections. If any failure, fix the QA specification before S5; QA must never invent edit authorization by editing narrative.

## 9. S4B postrepair (one time only)
- Inputs: original baseline, frozen QA, `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json`, title and outline.
- Execute `python scripts/workflow_tools.py repair-verify --baseline FULL_SCRIPT.txt --frozen QA_FROZEN.json --revised FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json`.
- Read revised narrative **in full**; explicitly test every original issue's acceptance criterion, true new regressions, old omissions, relationships, money, time and all es-MX accent/name corrections. Do not blindly assume proof PASS means story logic PASS.
- `FIXED`: original objective fault gone; `STILL_PRESENT`: report; `REGRESSION`: new defect caused by patch; `BASELINE_MISS`: existed before and missed. Score with unchanged rubric; never hide an issue.
- Save `QA_FINAL_REPORT.md` and `QA_FINAL.json` with exact final script SHA, title SHA, numeric score, status `READY` or `BLOCKED_MANUAL_DECISION`, blocking issue IDs, `repair_count=1`, checklist completion. Verify final binding before S6 with `python scripts/workflow_tools.py seo-gate --title-file CURRENT_FINAL_TITLE.txt --script FULL_SCRIPT_REVISED.txt --qa-final QA_FINAL.json`.
- **ONE REPAIR RULE**: if status BLOCKED, STOP. Do not freeze another patch or ask Writer to do a second repair as a normal auto-loop. Explicit new human-led revision cycle may be planned separately, but is not part of S4B.

## 10. Handoff
If S4 produces READY without changes, final file = `FULL_SCRIPT.txt`, `repair_count=0`, and S6. If S4 finds defects, hand QA frozen contract to S5 only after precise freeze. S5 returns repair proof, then S4B, then S6 only when READY. State exact blockers; no false passes or fabricated files.

## V1.1 mandatory first-run hardening
Read `references/WITNESS_ESMX_FIRST_RUN_AUDIT_V1_1.md` before executing this Skill. This supplemental reference is normative and takes precedence over conflicting older creative guidance while preserving existing filenames, commands and A/B/C stage contracts.

`READY` is forbidden if witness chronology or a clear lexical/grammar anomaly is unaccounted for. After one consumed repair, new missed baseline issues lead to `BLOCKED_MANUAL_DECISION` and an honest report, not another automatic S5.

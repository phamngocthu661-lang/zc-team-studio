---
name: us-midnight-script-auditor
version: 1.1.0
description: Independent evidence-based plot logic, US spelling and ONE final read-only verification
---
# STEP 4 — INDEPENDENT QA / FINAL READ ONLY (V1.1)

Load root shared contract and references `QA_MATRIX.md`. **Auditor may NOT edit story text**, not even typos. Initial Step4 and final Step4 (only if Step5 ran) are separate modes.

## Initial audit — score and freeze issues
1. Read ALL actual `FULL_SCRIPT.txt`, `TITLE_LOCK`, `OUTLINE.md`, `CANON.json`, manifest and 3 stage source files. Run `python tools/verify_project.py PROJECT_DIR` first. Do not mark mechanical PASS if tool failed or file access unavailable.
2. Story-by-story audit: physical layout, entrances/exits, sight lines, elapsed time, signal and device state, narrator knowledge chain, why protagonist stays/leaves, threat feasibility, contradictory witness claims, evidence actually visible before reveal, police/medical procedural realism, plausible US idiom and spelling. Distinguish facts from narrator hypotheses and unresolved story ambiguity. QA must also compare overuse of the same antagonist setup, police arrival, hook or closing moral across anthology. Check that title accurately covers all N stories. Specifically tally police/deputy/trooper-centered closures; flag repetitive resolution if more than three of eight stories use it as the main payoff (unless user's brief demands law-enforcement anthology).
3. Record every actual defect with **verbatim unique quote** in the correct STORY; test its location and uniqueness against bytes. Severity rubric: CRITICAL (breaks causal premise/unsafe impossible claim), MAJOR (material contradiction/missing necessary evidence that undermines reveal), MINOR (localized language error, plausible but weak linkage), NOTE (optional preference). A omitted optional canon object is NOT MAJOR unless causal payoff depends on it; no artificial issues just to force a repair.
4. Score qualitatively 45 logical/physical +20 continuity +20 spelling/grammar +10 retention/voice +5 packaging. Do not automatically give 10/10 or 20/20 without a credible check. Include both per-story notes and overall editorial concerns. Output `QA_REPORT.md` and `QA_ISSUES.json` bound to `video_id`, exact baseline SHA and `repair_count:0`. JSON `issues` array may be empty.
5. If no actionable defects, hard integrity passes, score>=95 and no material language/logic defects, generate **`FINAL_QA_GATE.json`** for original SHA, `repair_count:0`, `verified_issue_ids:[]`, zero blockers, READY. Otherwise `NEEDS_ONE_REPAIR` only if precise localized repairs can resolve defects; if issue requires huge structural rewrite, declare BLOCK rather than promise a surgical fix.

## After Step5 — read-only final verification, never second rewrite
1. Read original + exact revised script, ledger, replacements, repair proof and fresh revised manifest. Run `python tools/verify_project.py PROJECT_DIR --revised`. Refuse to sign gate if stale count, unauthorized edit, SHA mismatch, extra repair or mechanical errors. Do NOT rerun Step5.
2. Re-read revised passages in context and check each original issue acceptance test. Also inspect adjacent paragraphs for introduced contradictions or typos and compare all story headings intact. If original critical flaw cannot be corrected within the one sanctioned repair, **BLOCK_RELEASE** with evidence; never hide it under a high score.
3. Write `FINAL_QA_REPORT.md` with actual source SHA, current counts and status. Write `FINAL_QA_GATE.json` with `video_id`, `current_script_sha256`, `repair_count:1`, integer `score`, `unresolved_critical_or_major`, `material_language_issues`, `verified_issue_ids` (exactly every repaired QA issue when all passed), `final_qa_ready` boolean and `release_gate` `READY|BLOCK_RELEASE`. This must refer to actual current script hash and never to baseline hash after repair.
4. Run `python tools/verify_project.py PROJECT_DIR --revised --release`. Only PASS permits SEO; never declare READY from the Markdown report alone. If both input and final output are already sealed and pass, report status, do not modify.

## Important limitation
Mechanical source integrity is testable; literary quality scores and comprehensiveness of an editorial read are human/model judgments. Do not imply that a 98 score is mathematically proven. If not all source is actually inspected, state partial audit and block publish certification.

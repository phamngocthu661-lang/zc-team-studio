---
name: kiem-tra-kich-ban-mexico
version: 1.1.0
description: "Independent read-only Step4 forensic QA for Mexican Spanish 7-Part scripts; prioritize logic, continuity and es-MX spelling, issue a single frozen repair plan, and verify once after writer repair without authorizing a second revision."
---

# STEP4 — INDEPENDENT LOGIC + SPELLING QA (NO REWRITE) V1.1

**AUDIT_ONLY:** đọc và đánh giá, không thay dù 1 ký tự trong manuscript, không tạo lời văn thay thế. Read `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/QA_RUBRIC_AND_LOGIC.md`, `references/QA_REPORT_TEMPLATE.md`.

## 1. Input source verification

- `CURRENT_FINAL_TITLE`, `FINAL_OUTLINE.md`, `FULL_SCRIPT.txt` **or** `FULL_SCRIPT_REVISED.txt` (never summary). `WORKFLOW_STATE.json` / `video_id` / hashes if available.
- `phase=INITIAL` if `repair_count=0`, `phase=VERIFY` if `repair_count=1`; never let model arbitrarily switch phase to evade lock.
- Confirm headings `[PARTE 1]..[PARTE 7]`, true body words 11,500–13,500 (unless user explicitly changed target), script exact hash, es-MX.

## 2. Two genuine reading passes + reverse dependency

**Pass 1 / WHOLE:** Read every Part for title promise, storyline, emotional/relationship evolution, truth and payoff. Make timeline and motive graphs. Note dense boring patches but do **not** repair generic style as a primary goal.

**Pass 2 / FORENSIC:** Read line-by-line checking each point where date/age/number/medicine/property/transport/knowledge/physically held object changes, then spellcheck Spanish dialogue/narration. Distinguish dialect from mistake. On reverse pass verify every P7 payoff has planted supporting E##; any blind sudden rescue = major logic fail.

**Pass 3 / LIGHT REGRESSION (VERIFY only):** Compare original `FULL_SCRIPT.txt` and revised, confirm every frozen finding resolved and no fresh contradiction, unjustified jump, new spelling error, or title drift. QA VERIFY is the **last automatic QA**; never create a second repair plan.

## 3. Severity and focus

- `L` severe causal timeline, geography, physical plausibility / historical institution → priority 1.
- `C` canon, relationships, knowledge, objects, debt/inventory, hidden truth provenance → priority 1.
- `S` grammar, orthography, accents, Mexican Spanish punctuation, gender/number, missing negation, wrong proper name → priority 2.
- `P` title promise, narrative clarity, TTS readability directly impacted → priority 3.

Findings recorded precisely: `id` (L01,C01,S01...), `severity` (`HARD|MAJOR|MINOR`), `part`, `anchor` (verbatim ≤160 chars), `problem`, `root_cause`, `recommended_action` (guidance only, NO replacement prose), `acceptance_test`, `status`. Do not call every stylistic preference “spelling” to force repair.

## 4. Scoring out of 100 (independent)

- Plot causality, believable decisions, timing: **30**.
- Canon / relations / knowledge / objects / land: **22**.
- Spanish es-MX spelling, accents, grammar, syntax: **22**.
- Title promise, closure, no unsupported reveal: **12**.
- Historical/cultural plausibility: **8**.
- Structural/completeness/TTS continuity: **6**.

`score = sum(earned per category)`; show per-category earned and caps, list defects with deductions. `READY` iff score >= 97, no `HARD` and no unresolved `MAJOR` in L/C/S. Trivial `MINOR` may remain as editorial warnings; explains how 97–99 READY is consistent. If script is incomplete, `BLOCKED`, not fabricated score.

## 5. One repair logic

### INITIAL

- If READY: `SCRIPT_READY=TRUE`, `PASS_FOR_PRODUCTION=TRUE`, no repair.
- If NOT_READY: freeze **one** complete prioritized plan `REPAIR_PLAN.md` listing all identified L/C/S/P issues and exact anchors for a **single batch Step5**. Do not request “3 vòng 4B”, “sửa Part 1 trước rồi tiếp tục”.
- If unknown/insufficient coverage, `AUDIT_INCOMPLETE` and request actual missing source; do not freeze invented score.

### VERIFY

- Evaluate new current file using same rubric without artificially carrying previous points.
- If READY: `SCRIPT_READY=TRUE`, allow Step6.
- If NOT_READY: status **`MANUAL_REVIEW_REQUIRED`**, list residual defects and corrective recommendations for a human editor. `REPAIR_PLAN_FOR_AUTOMATION=NONE`. **NEVER** recommend Step5 again.

## 6. Output artifacts

- `QA_REPORT.md`: evidence table by Part, category score, headline issues, protected strengths, verdict.
- `QA_REPORT.json`: schema below, same exact script hash/identity. If NOT_READY INITIAL, `REPAIR_PLAN.md`; VERIFY never creates actionable automatic plan.

```json
{
  "video_id": "exact-id-from-state",
  "script_sha256": "actual-hex-digest",
  "phase": "INITIAL",
  "status": "NOT_READY",
  "score": 93,
  "hard_fails": 0,
  "category_scores": {"logic": 26, "canon": 21, "spanish": 21, "title_payoff": 12, "historical": 8, "technical": 5},
  "findings": [
    {"id": "L01", "severity": "MAJOR", "part": 4,
     "anchor": "source-excerpt", "problem": "causal flaw", "root_cause": "unearned knowledge",
     "recommended_action": "make evidence traceable", "acceptance_test": "viewer knows how the letter reached X"}
  ]
}
```

Example above is **schema illustration only**; never reuse score/claims without real QA. `phase=VERIFY` output must refer actual revised hash and read complete manuscript.


## V1.1 — Evidence-based QA, no author-written re-review

- Required read: all seven entire Parts plus `FINAL_OUTLINE.md` as independent source; construct checks for time/number/ages/family/objects/payment/work/housing, exact title promise and es-MX grammar. Score 97–99 is acceptable only for **nonblocking** documented minor issues; any MAJOR or HARD unresolved blocks.
- Each current finding needs an exact verbatim `anchor` in the declared Part; include `related_anchors` ONLY when fixing a dependent sentence in a different Part is essential. These must be frozen during INITIAL and are checked mechanically before ONE_REPAIR. Use distinct anchors for each defect rather than repeating a generic token such as `la casa`.
- At INITIAL explicitly separate: **must-fix factual logic/canon/language** from nonblocking pacing suggestions; do not force story-wide restyling for one accent or weak metaphor. Preserve any unresolved P/TTS minor as a warning (can score 99 and READY).
- On VERIFY, compare original and revised **paragraph by paragraph**, confirm every initial acceptance_test, list resolved initial IDs, check no regressions, check original book/document or person custody and major timeline. Do not report earlier MAJOR as `FIXED` in the current `findings[]`; use `resolved_initial_findings` and include only residual findings in current list.
- Full-script editorial score is a documented rubric judgement, **not** objective proof of listener retention or automatically verified narrative truth. Technical hash checks only validate provenance and basic consistency.

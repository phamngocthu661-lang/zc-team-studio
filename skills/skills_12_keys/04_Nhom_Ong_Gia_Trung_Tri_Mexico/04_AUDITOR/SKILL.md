---
name: padre-mx-independent-qa
version: 1.1.0
description: "Step4 read-only independent exhaustive QA for Mexican Spanish elder-father stories, logic/continuity/legal reality and orthography only; freeze one-time repair scope; postrepair audit never permits second rewrite."
---
# PADRE MX — QA AUDIT ONLY (STEP4 BEFORE/AFTER ONE REPAIR)

Read shared contract, `references/MEXICO_CHANNEL_DNA.md`, `references/QA_SCOPE_AND_FORMS.md`, actual final script, outline, canon and any repair proof. QA NEVER composes replacement story prose. Inspect all 7 Parts and focus on **logic + orthography/es-MX** (user's explicit priority). Do not introduce taste edits as actionable findings or inflate score to 98.

## Read 3 passes
**Pass 1**: uninterrupted reading as audience member — opening title promise, evolving logic, emotional agency, real ending, plot rather than summary.
**Pass 2**: forensic logic — chronological table, exact age/person/relative names, money and rights, property and permissions, location, medical needs, who knows what, witness/time conditions, what can be done under Mexican legal procedures, every reveal seed/payoff, all 7 parts.
**Pass 3**: es-MX orthography/grammar — accents (sí/si, él/el, tú/tu, qué/que, aún/aun), punctuations ¿? ¡!, dialogues, consistent usted/tú for persons, punctuation in TTS, wrong gender/number, time tense, random English/Spain terms. Catch only real errors, not stylistic alternatives.

## 100-point frozen rubric
Hook/title 10; causality/motivation 20; timeline/name/money/evidence/ownership 20; Mexican law/medicine/physics 15; Spanish Mexico orthography/grammar/TTS 15; father character/agency 10; emotion/retention/closure 10. READY needs >=98 + 7-Part and hard gates PASS + ZERO open actionable findings. If fail for issues not correctable within narrow windows, report `BLOCKED_NEEDS_NEW_VERSION` instead of authorizing a covert story rewrite.

## Source-bound output
Reviewer writes `QA_REVIEW.json` with `repair_round` 0 for original or 1 for revised, `score`, `hard_gate_pass=true`, `independent_full_read_confirmed=true` only if truly done, `findings[]`, `strong_span_ledger[]`, `reviewer_evidence[]`. Each finding:
```
{"id":"P01","part":"Part 3","classification":"TIMELINE","anchor":"exact source quote",
 "problem":"specific contradiction", "acceptance_tests":["verify event happens after document is signed"],
 "length_intent":"KEEP", "severity":"P2", "root_cause":"...", "viewer_impact":"..."}
```
Only the 14 permitted logic/orthography classes. Freeze real QA verdict using `scripts/freeze_qa.py` with `--script`, `--title`, `--outline-file`, `--review`, `--out`; for postrepair add `--repair-proof`, `--baseline`, `--contract`, `--baseline-frozen`. This tool validates structure and SHA but does not independently assess story quality. Store source hash, reviewer quotes, defects and evidence.

**Baseline**: if output `NOT_READY_REPAIR_ELIGIBLE`, author `QA_ZONE_SPEC.json` holding precise half-open UTF-8 byte windows (`Z001`, etc), each with `patch_ids`. Run `scripts/freeze_repair_contract.py` with exact baseline/QA/outline/zone inputs. Its added protection checks for **ANY intersection of bytes** between zone and protected quote (fixing Homeless V12's earlier full-quote-only mistake). If no valid zones can cover every defect, do not authorize repair. Writer owns Step5.

**Postrepair**: `repair_round=1` review revised exact text and repair proof. If still has any actionable issue, status `BLOCKED_FINAL_NO_MORE_REPAIRS`; NO Step5/contract/secondary patch. If >=98 and no errors, READY. If insufficient evidence or review incomplete, return checkpoint/blocker rather than fake frozen score.

## Issue scope
Catch: wrongly spelled character names; incompatible parent ages; hospital discharge within impossible time; money paid twice; document appearing before discovered; contradictory motive; invalid ownership/permission; point of view claims otherwise unknown knowledge; unnatural Mexico Spanish; accent and sentence level grammar. All optional enhancements (stronger hook, fresh subplot, more tears, bigger betrayal, alternative ending) are **not** actionable repair items and belong in a future new-version Title/Outline/Draft, not this single repair.

## V1.1 QA required before freeze
Use `references/QA_REVIEW_V11_SCHEMA.json`. For every Part cite an exact >=18-character text anchor from that Part, independently inspect it for chronology, money, character knowledge, document provenance, motivation, es-MX and TTS. The full seven-category rubric values MUST add to `score`. Provide structured `chronology` with ages and dated birth/pregnancy/flashback events; `narrative_consistency.py` will flag risky later-year pregnancy references. Run the actual `freeze_qa.py`; do not assert READY from a reported score, old QA JSON, or partial read. When risk is not rectifiable within a narrow one-time repair, BLOCK the current version. Creative quality review is distinct; avoid approving merely because no mechanical error was found.

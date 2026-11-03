---
name: kiem-tra-kich-ban-mexico-dona
version: "1.1.0"
language: "vi"
display_name: "Independent QA — logic/spelling first; audit only"
description: "Mexico Doña family drama: Independent QA — logic/spelling first; audit only. Part of five-skill six-step locked production workflow; uses es-MX content and single repair batch."
---

# MEXICO SCRIPT QA — STEP4 ONLY (PRE- & POST-REPAIR)

## Read order
SKILL.md, shared contract, MEXICO_DONA_STORY_DNA, QA_ENGINE, exactly locked outline/title, exact actual manuscript and optional repair proof. Never author prose.

**Independent QA:** 40 logic + 25 continuity + 20 spelling/grammar + 10 TTS + 5 artifact = 100. Narrative fulfillment is mandatory separate gate. Read ALL Parts; first holistic, then line-by-line, then backward from reveal. No fabricated score/evidence.

### Pre-repair
- `python scripts/mexico_pipeline.py verify --script FULL_SCRIPT.txt [--manifest ...]`.
- Inspect and record **all** issues in one frozen batch (P0..P3) in `QA_ISSUES.json` (schema examples in `examples/QA_SCHEMAS.md`); each source byte window with validated SHA and concrete acceptance test.
- `python scripts/mexico_pipeline.py qa-freeze --script FULL_SCRIPT.txt --issues QA_ISSUES.json --out QA_FROZEN_LEDGER.json`.
- If no issues and editorial evidence supports READY, issue `QA_FINAL_INPUT.json` (includes `story_quality_pass=true` and `localization_pass=true`) and `qa-final` directly, with no repair.

### After exactly ONE batch writer repair
- Reopen FULL_SCRIPT_REVISED.txt independently and proof; run all logic/spelling/continuity checks again. Use `qa-final` with SHA-bound `QA_FINAL_INPUT.json` (includes `story_quality_pass=true` and `localization_pass=true`), report score and leftover/new issues. READY requires >=98, empty unresolved and all gates. If NOT_READY, STOP: no Step5 again. State needs human/editorial escalation outside this locked run.
- `python scripts/mexico_pipeline.py qa-final --script FULL_SCRIPT_REVISED.txt --report QA_FINAL_INPUT.json --repair-proof REPAIR_PROOF.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --out QA_FINAL.json`.

**No second repair round, no QA-authored script edits, no extrapolated excerpts or auto-perfect scores.**

## V1.1 POST-REPAIR EVIDENCE GATE (REQUIRED)
This section supersedes any earlier bare `qa-final` command. On the EXACT final manuscript re-extract **21+ real scene anchors**, with dates/times, quoted evidence, character fact-first-known and all revelations, and one context review per frozen patch. Write `QA_EDITORIAL_EVIDENCE.json` as specified in `examples/EDITORIAL_EVIDENCE_TEMPLATE.json` and `references/QA_ENGINE.md`.

Run `review-evidence --script FULL_SCRIPT_REVISED.txt --evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json`. Then run `qa-final --script FULL_SCRIPT_REVISED.txt --report QA_FINAL_INPUT.json --editorial-evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --out QA_FINAL.json`. If no repair was used, omit `--repair-proof` and use the original script. V1.1 refuses missing evidence; timeline/knowledge/patch findings force NOT_READY even when score=98. No second repair.

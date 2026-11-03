---
name: viet-kich-ban-mexico-dona
version: "1.1.0"
language: "vi"
display_name: "Writer — 3-stage draft and single surgical repair"
description: "Mexico Doña family drama: Writer — 3-stage draft and single surgical repair. Part of five-skill six-step locked production workflow; uses es-MX content and single repair batch."
---

# MEXICO SCRIPT WRITER — STEP3 DRAFT / STEP5 ONE REPAIR

## Read order
SKILL.md → shared contract → MEXICO_DONA_STORY_DNA → WRITER_ENGINE → locked title and outline. For STEP5 also read independent QA frozen ledger and original exact full manuscript.

## Modes (exclusive)
`STEP3 DRAFT_THREE_STAGE`: A Part1–2, B Part3–5, C Part6–7; one stage per user invocation. Real UTF8+LF files; no fake progress statuses. Start title + actual outline. Use actual source manifest and previous segments; title and outline both bind video_id. Do not copy old Parts from your chat memory.

`STEP5 QA_ONE_BATCH_REPAIR`: Exactly **ONE** editable batch, ONLY the QA-frozen byte windows with user approval; no second rewrite or new scenes outside approved zones. Repair logic first, orthography second, consistent natural es-MX third. Save revised separate from original and repair proof; return to STEP4 final independent verification. Repair count used = 1 forever for the run.

## Running stage tool
Files in work folder use `MXF_<sha12>_SCRIPT_A.txt`, `_B.txt`, `_C.txt` where sha12 is SHA-256 of exact title UTF-8 first 12 hex. After writing `A` run:
`python scripts/mexico_pipeline.py stage --title-lock TITLE_LOCK.json --outline-file CURRENT_FINAL_OUTLINE.txt --directory . --segment A`
Repeat with B then C after reading prior persisted scripts. Tool checks artifact identity, exact concatenation, full count 70–80k. File `MXF_<sha12>_FULL_SCRIPT.txt` only after C PASS.

## ONE repair tool usage
QA must produce `QA_FROZEN_LEDGER.json` with exact windows. Writer saves `REPLACEMENTS.json` keyed by issue IDs. Run:
`python scripts/mexico_pipeline.py repair --script FULL_SCRIPT.txt --qa-ledger QA_FROZEN_LEDGER.json --replacements REPLACEMENTS.json --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json --user-approved`
Exact output filenames may include locked title prefix. If a proof or revised file already exists, stop. Do NOT overwrite baseline. Never claim QA READY from Writer.

## Live self-checks
- Most scenes include a specific action, cost, clue, realistic response or dialogue.
- TTS: emotional Spanish that reads aloud naturally; native accents; not all-caps; no repetitive narrator moralizing.
- Internal checks: 7 ordered parts, escalating real action, honest memory access, property/legal/money continuity. Writer's checks are preliminary only and never replace independent QA.

**V1.1 mandatory:** Maintain persistent Scene State Ledger across A/B/C; preview knowledge/date impacts across adjacent scenes BEFORE using single patch. `REPAIR_PROOF.json` now records revised byte offsets, allowing QA to check actual source and nearby context. No extra repair. `references/WRITER_ENGINE.md` is normative.

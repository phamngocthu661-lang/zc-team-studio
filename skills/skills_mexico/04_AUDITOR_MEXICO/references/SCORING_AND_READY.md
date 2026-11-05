# QA SCORECARD /100 (matches qa_checkpoint.py RUBRIC keys)

- Title Fulfillment + Hook — 10
- Causality / Discovery / Why-now — 15
- Timeline / Money / State / Knowledge — 15
- Legal / Historical / Authority / Professional — 10
- Physical / Mechanical — 10
- Mystery / Clue / Reveal — 10
- Retention / Pressure / Pacing — 10
- Character Agency / Competence / Human Behavior — 8
- Prosa humana / diálogo / MX45+ / TTS / plataforma — 7
- Emotional Payoff / Ending-by-Action — 5

Scoring subtracts per-Pxx actionable `deduction` PLUS up to 2 total non-actionable minor-observation deductions; each deduction must map exactly to its category. Other hard failure gates override score, including source mismatch, length out of range, unsupported legal claim and weak factual conclusion. READY requires score >=98 AND no Pxx AND all hard gates PASS; NOT READY otherwise.

**Important:** A score of 98 or 99 with minor cosmetic residue is now representable in the QA tool without inventing a Pxx. Each `minor_observations` item has `{part,anchor,observation,evidence,rubric_category,deduction}`; exactly sourced, no need for a repair. A misleading or repairable issue cannot be marked minor to game threshold. Source QA reports must be falsifiable.

## Severity
P0: severe violation (source length/structure, impossible legal core, dangerous factual assertion, unusable opening), immediate block. P1: material continuity or missing title-level payoff, block. P2: repeated ambiguity or pacing failure, block until approved fix. P3: minor but actionable coherence/grammar issue (still block under zero unresolved actionable). Truly non-actionable light polish may be documented as minor observation rather than Pxx, max 2 points.

## Publication gate arithmetic
If score 100 and Pxx empty => may READY if hard gates pass. If score 98 with two evidenced 1-point nonactionable notes => READY possible. If score 99 with a 1-point actionable defect => NOT READY even though score meets 98. Score 97 => NOT READY regardless of zero actionable defects. If RUBRIC deductions do not match ledger => schema/tool reject.

## V1.1 quality prerequisite (no schema change)
Manual `AUDIENCE_COMPETITIVENESS` from new reference must PASS before editorial READY. A merely technically valid score 98–100 may still be **EDITORIALLY NOT READY** if hook/parity, physical reversal, nonrepetitive conflict or costly ending fails; log actual Pxx and rubric deductions within EXISTING keys, let tool freeze NOT READY. User's reviewer feedback is advisory, not an empirically proven CTR score.

## V1.2 MANUAL FAMILY DNA QUALIFICATION (ADDITIVE ONLY)
Before any editorial READY require `FAMILY_DNA_QA:PASS`, with evidence from P1/P3/P6/P7; a woman's family agency and literal specific headline reversal are mandatory. Lack of first-person older-mother POV or directly culpable relatives is an actionable defect mapped into existing categories, NOT a tiny nonactionable observation. Maintain exact source body count 70–80k, never equate this to a promised 30–45min runtime.

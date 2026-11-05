---
name: auditor-forense-guion-familiar-mexico
version: "1.3.0"
language: "vi"
description: "STEP 4 — independent READ-ONLY 7-Part Spanish Mexico family-drama forensic audit, 3 reads ×24 dimensions, evidence checkpoints, 98+ publishing gate, frozen QA and exact-byte repair windows without rewriting prose."
---
> **V1.3 FIRST PRIORITY (includes V1.2):** Load `references/FAMILY_DNA_LOCK_V1_2.md` before creative generation, enforce first-person older Mexican mother/grandmother, direct family betrayal, her consequential decision, and 7-Part 70k–80k-character manuscript. Follow V1.2 supplemental reference(s) below; do not override user-locked titles.

# SKILL 4 — AUDITOR INDEPENDIENTE / 98+ GATE / ES-MX

## Read-only authority
Own STEP4 ONLY, before publication AND after any Step5 repair. This SKILL must never invent narrative replacement text, insert dialogue, rewrite files, auto-correct typos or self-publish. QA inspects Writer's **actual persisted file**, not an earlier chat paraphrase. Read bundled `references/SHARED_CROSS_SKILL_CONTRACT_V1.md`, controller and all `references/` in this folder (`FORENSIC_AUDIT_PROTOCOL.md`, `SCORING_AND_READY.md`, `QA_OUTPUT_TEMPLATES.md`, `QA_ZONE_SPEC_GUIDE.md`). `scripts/qa_checkpoint.py` validates evidentiary checkpoint completeness but does **not** itself assess literary quality; reviewer must read and reason independently.

## Inputs / immutability
Require LOCKED_TITLE, exact `OUTLINE.txt`, verified Full Script 7-part UTF-8 LF file, Writer manifest/proof if available. Source identity: file SHA256, body SHA256, title_sha12, outline SHA256 and video_id. If source file changes in audit, invalidate checkpoint and restart. A repaired script needs entirely NEW audit linked to its new SHA; prior source proof is not reusable.

## Mandatory three read passes
**READ #1 — Immersive linear listening:** read P1→P7 to find the audience's emotional chain. In first 5k characters confirm direct title contact, real proof, stakes, two micro-payoffs and no opening reset. Track when questions arise and how they resolve. Mark overwritten/missing emotional promises.

**READ #2 — Forensic line-by-line:** reread all Parts, fill 7×24 matrix with exact anchor quotation/evidence for every dimension, even PASS. Check name, age, family relation, speaker, tú/usted, property title, cash and ownership, timeline, physical access, chronology, actual bank and notarial permissions, law/state assumptions, provenance of evidence, Spanish Mexico idiom, TTS punctuation, platform and end conditions. Locate every occurrence of significant contradiction.

**READ #3 — Reverse dependency:** work P7→P1 on reveal/promise/evidence: what allows P6 to happen? what must be present by P3? was it planted earlier? who could have known and how? Trace money and property rights backward, track character motivations, ask whether simple earlier action would have prevented all plot. Include omission sweep and replacement simulation.

**SATURATION:** finish with full zero-new-defect sweep of entire manuscript. If new Pxx found, repeat complete sweep until last `new_defect_ids: []` with source body SHA and evidence. Strong spans anchored to actual source protect lines that should survive repairs.

## 24-dimension coverage
Use the exact dimension keys exposed by `qa_checkpoint.py` so 168 cells fill successfully. When a dimension is clean, `status: PASS` with specific manuscript evidence; if faulty, `status: PATCH` plus valid actionable Pxx. No placeholder filler evidence (`fine`, `ok`, `read`) accepted as a genuine reviewer; tooling alone cannot disprove poor review. First-pass impression does not replace per-cell evidence.

## Diagnostics for every actionable Pxx
- Unique `P01`, `P02`, etc; Part, exact excerpt/anchor, every occurrence; category and severity P0/P1/P2/P3; associated rubric category and numeric deduction; concrete wrong fact and logical root cause, effect on listener; owning upstream skill; objective acceptance tests; replacement objective and length intent (`KEEP/ADD/CUT/REDISTRIBUTE`).
- Decide the **smallest sufficient original UTF-8 byte window** to repair all occurrences without breaking earlier setup or future callback. A vague "rewrite PART 3" is not acceptable. Keep protected strong spans.
- If QA identifies a title/outline impossibility that cannot be corrected in any window without invalidating the locked premise, block with escalation, do NOT conceal via manuscript patch.

## Hard gates / READY
- all 7 headings, 70,000–80,000 *actual* body codepoints, source identity verified, no structural error.
- Spanish Mexico natural and audience-plausible; no undocumented property transfer, illegal bank magic, false court authority, unexplained evidence, impossible chronology or misleading real-story claim.
- title satisfied, complete opening gates, material decision/pressure in each Part, credible document/cash timeline, strong emotional earned ending.
- Numeric score ≥98/100, all 10 hard gates PASS, complete 3 reads/168-cell evidence/saturation, **zero unresolved actionable Pxx**.
- Important V1 fix: `minor_observations` with exact Part/anchor, category, evidence and deduction may explain up to TWO residual score points for **truly non-actionable polish**. If actual change required, it is Pxx and READY is blocked. This avoids forcing score 100 when policy says 98+.

## Runtime procedure
```
python scripts/verify_full_script.py [available in Writer] FULL_SCRIPT.txt
python scripts/qa_checkpoint.py init FULL_SCRIPT.txt --title "$LOCKED_TITLE" --outline-file OUTLINE.txt --out QA_CHECKPOINT.json
# reviewer manually fills ALL evidence in checkpoint JSON after real reads
python scripts/qa_checkpoint.py inspect QA_CHECKPOINT.json
python scripts/qa_checkpoint.py freeze QA_CHECKPOINT.json --out QA_FROZEN.json
```
If `freeze` yields NOT READY with actionable Pxx, QA separately authors exact zone offsets JSON and runs:
```
python scripts/freeze_repair_contract.py --baseline FULL_SCRIPT.txt --frozen QA_FROZEN.json --zones QA_ZONES.json --outline-file OUTLINE.txt --out QA_REPAIR_CONTRACT.json
```
This freezes **edit permissions only**, NOT replacement paragraphs. When incomplete, output checkpoint/pending items, no frozen-ready verdict. Never pretend Python's 168-cell format validator read the literature.

## Output
Real input SHA, full codepoint count, score/rubric, 24×7 evidence, 10 hard gates, strong spans, each Pxx root cause and acceptance test, READY or NOT READY, frozen hash and zone spec if warranted. Vietnamese editorial report, quote Spanish only for exact source anchors. Source path and zone file must be actual. End with Step4's exact controller success suggestion only if frozen READY or valid frozen NOT READY repair contract was verified.

## V1.1 independent hook-to-payoff / audience gate
Mandatory reading: **`references/AUDIENCE_COMPETITIVENESS_GATE_V1_1.md`**. During all three reads separately compare source opening mechanics, family humiliation specificity, elder's costly choices, P3–P5 originality of conflicts, P6's title-clause payoff, and P7 emotional aftershock. Provide manual `AUDIENCE_COMPETITIVENESS: PASS / NOT_READY / UNVERIFIED` anchored to actual Spanish spans. A source with weak emotional escalation MUST receive a real actionable defect and `NOT READY`, even if `qa_checkpoint.py` would otherwise structurally freeze 98+. Map findings onto existing rubric keys; do not add schema fields to `QA_CHECKPOINT.json` or modify scripts. If missing title/outline files or unable to read actual script, mark UNVERIFIED and block claim of editor-approved final story.

## V1.2 — ZERO-TOLERANCE FAMILY DNA / POV AUDIT
Mandatory `references/FAMILY_DNA_INDEPENDENT_QA_V1_2.md` + prior V1.1 competitiveness reference; report `FAMILY_DNA_QA: PASS/NOT_READY/UNVERIFIED` separately from technical `QA_READY`. A script fails even at 100 technical points if it centers a child/male millionaire, substitutes an unrelated public cruelty/rescue plot for relative betrayal, breaks older woman's first-person perspective, or fails concrete title reversal. Create evidence-backed actionable Pxx in EXISTING rubric categories (no new QA script fields) and block Step6 until repaired and reaudited. 70–80k body still authoritative, 30–45min duration is NOT confirmed by character count.

## V1.3 — DRAMA QUALITY MUST PASS SEPARATELY (MANDATORY)
Read `references/DRAMA_COMPETITIVENESS_AND_REPETITION_V1_3.md` and perform six sourced review questions plus seven Part state deltas. Report separate `TECHNICAL_QA` and `DRAMA_QUALITY_V1_3` with anchors from actual full script; `FAMILY_DNA_QA` still applies. Failing anti-repetition, earned payoff or emotional price is a MATERIAL actionable defect, NOT an optional polish observation: create Pxx mapped into existing rubric keys, NOT_READY, authorize smallest patch and re-audit revised SHA. Do not change QA frozen JSON schema/scripts. Never imply successful tests certify a script's audience retention. No content/full read => UNVERIFIED and no editorial READY recommendation.

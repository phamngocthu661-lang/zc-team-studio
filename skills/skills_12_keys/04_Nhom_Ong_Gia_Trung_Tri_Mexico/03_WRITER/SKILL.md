---
name: padre-mx-script-writer
version: 1.2.0
description: "Step3 3-stage FULL 70k–80k with mandatory per-stage count gates es-MX seven-Part script writing; Step5 EXACTLY ONE authorized minimal logic/spelling repair with byte preservation. Writer never issues final QA verdict."
---
# PADRE MX — SCRIPT WRITER (STEP3 DRAFT / STEP5 ONE REPAIR)

Always read `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/MEXICO_CHANNEL_DNA.md`, `references/WRITING_AND_ONE_REPAIR.md`. Mode determined solely by explicit requested step; do not run both. Required input: exact locked title, persisted 7-Part outline SHA, canon. Voice: first-person older Mexican father; es-MX conversational but polished literary TTS-ready prose; not a screenplay, not Mexican slang salad. Emotion rooted in actions, not abstract moral slogans.

## Step3 DRAFT — 3 explicit user turns, 7 Parts
**Stage A:** write `[PART 1]` and `[PART 2]`; aim enough body for total target (e.g. 20–24k Unicode chars for A, hard gate); verify opening is a real scene with non-stock humiliation and a hard choice. Save actual LF file `PMX_<sha12>_SCRIPT_A.txt`.
**Stage B:** reopen actual A and canon, draft `[PART 3]` `[PART 4]` `[PART 5]` (30–35k chars, hard gate); no accidental repeated sentence/exposition, evidence availability according to canon. Save B.
**Stage C:** reopen actual A/B and canon; draft `[PART 6]` `[PART 7]` (20–25k chars for C) to bring total 70k–80k, preferred 74k–78k; payoff must be earned and end with meaningful act. Save C, stage and assemble exact A+B+C; verify read-back body count SHA.

Stage tool commands (run in `scripts/` or direct path):
```
python segment_workflow.py stage --title "CURRENT_FINAL_TITLE" --directory OUTPUT_DIR --outline-file CURRENT_FINAL_OUTLINE.txt --segment A --file OUTPUT_DIR/PMX_<title_sha12>_SCRIPT_A.txt
python segment_workflow.py stage --title "CURRENT_FINAL_TITLE" --directory OUTPUT_DIR --outline-file CURRENT_FINAL_OUTLINE.txt --segment B --file OUTPUT_DIR/PMX_<title_sha12>_SCRIPT_B.txt
python segment_workflow.py stage --title "CURRENT_FINAL_TITLE" --directory OUTPUT_DIR --outline-file CURRENT_FINAL_OUTLINE.txt --segment C --file OUTPUT_DIR/PMX_<title_sha12>_SCRIPT_C.txt
python segment_workflow.py assemble --title "CURRENT_FINAL_TITLE" --directory OUTPUT_DIR --outline-file CURRENT_FINAL_OUTLINE.txt
python verify_full_script.py OUTPUT_DIR/PMX_<title_sha12>_FULL_SCRIPT.txt
```
No `step3` one-shot, no memory reconstruction, no false claims of text being saved. Verify stage identity and file content. If scripts cannot execute, only report what exists and why proof is blocked; never fake SUCCESS.

## Craft checklist (during drafting, NOT repair)
- Open with concrete injustice, first-person sensory behavior, specific vulnerability, no 800-word setup explanation.
- Give antagonist an understandable but still accountable motive; no endless caricatured insults; true conflict can involve love and betrayal simultaneously.
- Every scene changes relationship, access, power or cost; plot earns a document/witness; all high-impact events are causally prior-seeded.
- Write all numbers and dates consistently, always know whether person 'sabe' or 'no sabe' each fact; verify mother-in-law/nuera/yerno/nieto relations.
- Mexican geography, currency, proper accents, credible interactions; avoid Spanish vosotros, quedarse sin 'euros', generic courtroom miracles.
- Twist must honor exact title but not resolve at Part2; end must not require all villains to kneel and beg. Balance heat and humanity.
- No filler/meta sections to hit char target, no repetitions/overlong characters monologues, no fake 'history true' assertion.

## Step5 ONE-REPAIR ONLY
Only if user invoked step5 once for this exact video_id AND `PADRE_MX_QA_FROZEN_V1` baseline round 0 and contract frozen for this exact baseline are present. Read protected spans and `QA_FROZEN` issues; write `REPLACEMENTS.json` with a replacement text for EACH authorized zone, preserving person, tone, intentional callbacks, length, title promise. Fix only `LOGIC|TIMELINE|MONEY|MOTIVATION|KNOWLEDGE|ACCESS|LEGAL|PHYSICAL|NAME|CONTINUITY|ORTHOGRAPHY|GRAMMAR|PUNCTUATION|ES_MX`; no plot retcon, no arbitrary creative flourish, no whole-Part rewrite. Apply once:
```
python apply_authorized_patches.py --baseline FULL_SCRIPT.txt --frozen QA_FROZEN_BASELINE.json --contract REPAIR_CONTRACT.json --replacements REPLACEMENTS.json --outline-file CURRENT_FINAL_OUTLINE.txt --user-approved --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json
```
If patch fails or resulting text incomplete, report BLOCK; never auto-rewrite new zones. Step5 does NOT score or mark READY. After valid one-shot revision, suggest `step4` to re-audit. Even a single spelling-only correction after Step5 is a prohibited second repair: STOP, version a fresh production if needed.

## V1.1 Writer prevent-before-repair gate
Before drafting each A/B/C, read and calculate each family member birth-year range from the locked canon and scene year. When writing flashbacks explicitly disambiguate years, particularly conception/birth before a business founded later. After each stage, scan chronology and canonical character names across the actual persisted text, and do not pad to 70–80k with duplicate reflection paragraphs. At least one consequence observable in action must occur per Part, not only an explanation of the old paperwork. The one-repair rule remains ABSOLUTE, with no grammar pass after Step5.

## V1.2 MANDATORY anti-half-length completion protocol
The user-reported defect was a manuscript produced at roughly half the requested length. NEVER solve this by silently changing the requirement from 70–80k to 35–40k.
1. Plan unique scenes and real action for each of seven Parts, aiming for 10.5–11.5k per Part with natural scene-dependent variance; avoid looping internal monologues to reach count.
2. Stage A MUST total 20,000–24,000 body characters for Parts 1–2, Stage B MUST total 30,000–35,000 for Parts 3–5, Stage C MUST total 20,000–25,000 for Parts 6–7. Each Part MUST be at least 8,500. Stage and QA scripts enforce this on actual files.
3. Build long segments progressively inside the same authorized Step3 stage using contiguous source paragraphs. After each internal chunk, re-open and count actual persisted bytes, read back last paragraphs to ensure no duplication/truncation. Finalize once only when the stage passes. Do not invent a stage file if an environment cannot persist one.
4. If response limits stop the stage early, report `DRAFT_INCOMPLETE: stage X, actual measured chars, remaining chars` and ask for another invocation of the SAME stage; do not call it completed or advance to the next stage. Reopen actual source and continue from last complete paragraph instead of repeating it.
5. On Stage C assemble exact A+B+C. Only a 70,000–80,000 Unicode-body-character verified manuscript with all seven parts, none under 8,500, may advance to Step4. No false PASS; never count outline, headings or meta instructions as body prose.

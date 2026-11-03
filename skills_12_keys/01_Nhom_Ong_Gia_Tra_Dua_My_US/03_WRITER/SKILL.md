---
name: viet-kich-ban-ong-gia-us
description: "Step3 DADUS persistent seven-part American father-revenge script in A/B/C, and Step5 single approved patch-only repair. Writer never self-scores QA."
---
# SKILL 3 — WRITER DRAFT + ONE REPAIR (MUTUALLY EXCLUSIVE MODES)
Read controller/shared contract and `references/WRITER_NARRATIVE_ENGINE.md`, `references/THREE_STAGE_HANDOFF.md`, `references/ONE_REPAIR_ONLY.md` and locked actual outline. `step3` or `step5` only, never both in a single response.

## Step3 persistent A/B/C
- A: Write fully developed `[PART 1]` and `[PART 2]` in American English natural spoken prose, then physically save `DADUS_<title_sha12>_SCRIPT_A.txt`. Inspect/stage with `segment_workflow.py stage`. One instruction `step3` = A ONLY.
- B: Reopen and read A and original outline; write `[PART 3]`, `[PART 4]`, `[PART 5]` in `..._SCRIPT_B.txt`; stage B; do not change A.
- C: Reopen A, B, manifest and outline; write `[PART 6]`, `[PART 7]` in `..._SCRIPT_C.txt`; stage C; assemble **exact byte concatenation** A+B+C with `segment_workflow.py assemble`, verify body count and hashes with `verify_full_script.py` using outline profile. Never silently summarize unfinished Part or claim length without running a tool.
- Default LONG_V12 length 70k–80k, target 74k–78k; optional locked COMPETITOR_CUT 30k–45k target 34k–40k, 7 Parts and same three stages. In either mode, make every Part scene-driven. No placeholder repetition to hit length.

## Style and anti-competitor-copy
Old male first-person narrator, concrete blue-collar/professional details and ordinary U.S. language, grounded locales; 1–3 sentence dialogue exchanges; specific sounds, silent reactions, precise objects and truthful actions. A father has shame, restraint, mistakes and meaningful stakes. No cardboard evil children. A deliberate choice is worth more than a magical fortune reveal. Preserve first-person POV: never narrate secret room dialogue as firsthand unless later explained. Close open loops at earned intervals.

## Step5 SINGLE repair transaction
- Must receive frozen original QA NOT READY, exact QA approved `QA_ZONE_SPEC` + `QA_REPAIR_CONTRACT`, user explicit `step5`, actual original full script and locked outline. All errors from entire QA are consolidated into this one repair; PRIORITIZE logic, timeline, ownership, names, grammar, typos, TTS punctuation.
- Writer drafts `REPLACEMENTS.json` exactly one replacement `text` per authorized zone; do not modify other bytes or add hooks/twists for personal taste; do not touch Part headings.
- Execute `apply_authorized_patches.py --user-approved` to create revised TXT, `REPAIR_PROOF.json` and persistent `DADUS_<video_id>_ONE_REPAIR_LOCK.json`; if lock already exists or baseline is revised, REFUSE another repair.
- Writer never declares READY or issues score. Suggest `step4` once for final independent QA. If postrepair QA NOT READY, only report remaining issues; NO second automatic Step5, no loop, no self-rewrite.

## V1.1 — READ-ALONG STORYTELLING (DRAFT MODE ONLY)
Read `references/SCENE_RETENTION_WRITER_V1_1.md` in Stage A/B/C. Make each purposeful scene change evidence, power, personal cost or relationships; reduce repetitive explanations and delay only full earned consequences, not basic facts. Observe the seven-Part soft distribution; Stage C should have a physical or relational payoff, not a purely offscreen procedural win. Before each stage is persisted, self-check its NEW prose; never silently change persisted previous segment or outline. Run `scripts/narrative_diagnostics.py` after assembling as a read-only prompt; interpret its flags manually.

**FIREWALL:** In Step5 REPAIR MODE, ignore optional creative-readout suggestions. Only fix frozen factual logic/continuity/US spelling/grammar/TTS errors in ONE authorized transaction. Do not repair pacing/style merely to boost a score; no second pass.

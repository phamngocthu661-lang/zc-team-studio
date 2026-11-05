---
name: wrv-us-script-writer-three-stage-one-repair
version: 1.1.0
description: "Step3 three saved parts A/B/C of 7-Part 70–80k female revenge narrative; Step5 one tightly scoped authorized repair pass ONLY. Never self-score."
---
# STEP 3 A/B/C + STEP 5 ONE-SHOT REPAIR — WRITER

Read `references/WRITER_STORY_ENGINE.md`, `references/THREE_STAGE_PERSIST_PROTOCOL.md`, `references/ONE_REPAIR_PROTOCOL.md`, cross-skill contract. Lock primary DNA from outline. Produce original vivid US English first-person **female** narration, 7 Parts, strong agency, real evidence and lawful resolution. No QA verdict from Writer.

## Mode DRAFT / Step3
- Run **one segment per explicit user `step3` call**: A = `[PART 1]` + `[PART 2]`; B = 3/4/5; C = 6/7. Must genuinely write fully formed prose, not summaries or padding; files must be persisted and re-read prior to progressing.
- Narrative first paragraph begins mid-betrayal rather than `My name is...`. Natural original American idiom, paced dialogue, short grounded inner thoughts, details with utility, not repetitive AI filler. Favor dialogue/decision/action/evidence over circular outrage.
- Stage A lays promise, proximity to danger, relationship and early evidence; B brings first wins, costs, reverse and sharper villain counter; C proves final chain and gives believable consequences and emotional choice. Every Part has meaningful state change and closed loop.
- Text file LF/UTF-8, exact headings ONLY `[PART 1]` ... `[PART 7]`, no metadata inserted into story body. Body target 74–78k chars, hard 70–80k inclusive. No invented exact length without validator.
- Use `scripts/segment_workflow.py stage --title ... --outline-file CURRENT_FINAL_OUTLINE.txt --directory ... --segment A --file A_SOURCE.txt` (similarly B/C). For C run `assemble`, then `scripts/verify_full_script.py`.
- No auto-writing additional calls and no patching past stage without explicit authorized correction. If verification fails, resume incomplete same stage with verifiable source; never quietly manufacture a complete 75k script.

## Mode REPAIR / Step5
- Allowed **once per video_id** only if earlier Step4 independently froze actual actionable defects and exact authorized byte windows and user now explicitly calls `step5`. Make scoped corrections for timeline, continuity, title promise, logic, factual/procedural contradictions, US spelling/grammar, character naming and self-contradictory dialogue.
- Do NOT rewrite strong passages or improve style merely because it could be better. Preserve baseline outside windows byte-identical. No wholesale Part rewriting. Preserve length gate and headings.
- Create `REPLACEMENTS.json` with `schema=WRV_REPAIR_REPLACEMENTS_V1` and one `zone_id`/`text` per frozen zone. Run `scripts/apply_authorized_patches.py` with exact `--baseline --frozen --contract --replacements --outline-file --user-approved --out --proof`.
- The script creates `WRV_<video_id>_REPAIR_USED.json` in canonical original baseline folder and refuses reuse / a second pass even if the final QA is NOT READY. Never remove or overwrite the marker.
- After applying, Writer outputs only revised source + byte preservation proof and recommends independent final Step4. Writer cannot self-judge READY or run Step6.

If user wants 1 repair round, that is **one editing operation**; Step4 before and after is read-only and not counted as second repair.

## V1.1 mandatory narrative discipline
Read `references/DENSITY_SCENE_EXECUTION_V11.md`. Before drafting Stage A, inspect the immutable Step2 promise-owner and `STORY_PREFLIGHT_V11.json` if present; missing quality contract in V1.1 projects -> return to Step2 before writing, never manufacture a PASS. Check scene-level state change and independent female agency at every Part; eliminate repeated recaps. Do NOT change the writer scripts, 70–80k character hard gate, segment boundaries or the `ONE-REPAIR` rule. Step5 remains dedicated to one authorized logic/spelling correction; cannot be used to reshape the plot for CTR.

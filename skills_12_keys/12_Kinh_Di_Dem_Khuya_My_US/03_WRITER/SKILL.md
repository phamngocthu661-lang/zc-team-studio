---
name: us-midnight-script-writer
version: 1.1.0
description: Persistent American-night-horror A/B/C draft and exactly one scoped, verified repair
---
# STEP 3 DRAFT / STEP 5 ONE_PASS_REPAIR — WRITER V1.1

Read root `SHARED_CROSS_SKILL_CONTRACT_V1.md`, controller, `references/WRITER_STYLE.md`, `TITLE_LOCK.txt`, saved `OUTLINE.md`, `CANON.json`, `IDENTITY.json`. Modes are separate; never turn drafting into an audit or make unapproved changes. Preserve 5-Skill architecture: this ONE folder owns both commands.

## STEP 3 — DRAFT MODE
1. Check title and outline hashes match identity; stop if mismatch. Calculate stage map for N; default A=STORY 1–3, B=4–6, C=7–8. Each step3 invocation writes EXACTLY the next stage. Before B reread saved A plus canon; before C reread A+B plus canon. Do not regenerate existing stages, change locked title, or pretend truncated stages are complete.
2. Full narrative English US, first-person lived-in voice, distinct speaker backgrounds, concrete ordinary routine. Start each story with credible unease within 30–80 SPOKEN words, place narrator in spatially consistent scene, reveal clues with progressive proof and uncertainty, make characters take intelligent steps to protect themselves. Aim for one meaningful reversal and one forced trade-off. End with a story-specific lasting consequence, not a repeated generic `I never go there now` moral.
3. Each story must **actually satisfy its outline stakes**; do not summarize 7 beats into 2 paragraphs. Maintain consistent geography, dates, season/weather, night shift procedures and narrator source of knowledge; do not insert technical/legal claims without checking. Dialogue is natural and brief, no headings for beats or director directions. Keep each story original; reference video descriptions are topic inspiration only.
4. Persist stage `SCRIPT_A.txt` or B/C, exactly one trailing LF. On C, assemble `FULL_SCRIPT.txt` using stage A bytes + one `\n` + B bytes + one `\n` + C bytes. Never silently reconstruct a missing stage from conversation memory.
5. Reopen persisted full script; run `python tools/verify_script.py FULL_SCRIPT.txt --count 8` (adjust N), then compute fresh `SCRIPT_MANIFEST.json` including identity, `source_sha256`, `source_file`, `repair_count:0`, stage exact hashes, `story_count`, per-story `story_lengths` chars/words, `story_body_chars`, `spoken_words_estimate` and assumption WPM. Verify end-to-end via `python tools/verify_project.py PROJECT_DIR`; a failing report means Step3 NOT COMPLETE. Warnings about soft lengths require editorial review; hard length fails require further work in current DRAFT stage before sealing, not Step5.

## STEP 5 — EXACTLY ONE REPAIR MODE
1. Allowed only if initial Step4 `QA_REPORT.md` and `QA_ISSUES.json` exist and are SHA-bound to the exact saved `FULL_SCRIPT.txt`, and baseline integrity passes. Check `REPAIR_LOCK.json`, `REPAIR_PROOF.json`, `FULL_SCRIPT_REVISED.txt` and `SCRIPT_MANIFEST_REVISED.json`: if ANY already exists, REFUSE this video identity; no 2nd repair.
2. Prioritize errors in causality, sightline/distance, chronology, witness knowledge, names/props, American spelling/typos and grammar. Only adjust exact QA-authorized anchor text. Keep all other bytes unchanged; avoid unrequested prose polishing, changing endings or increasing dramatic content in existing good scenes. Do not rework all eight stories to boost a score.
3. Prepare `QA_REPLACEMENTS.json` dictionary mapping EVERY issue ID to the minimum acceptable replacement string. Anchors must occur exactly once and be within the declared STORY. Test no overlaps. A repair must not change STORY headings or add a scene; if fixes require broader narrative restructuring, BLOCK and request a new project version rather than conducting a covert second draft.
4. Execute `python tools/apply_one_pass_repair.py FULL_SCRIPT.txt QA_ISSUES.json QA_REPLACEMENTS.json PROJECT_DIR`. The tool reserves the sole attempt in `REPAIR_LOCK.json`, writes `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json` AND fully recalculated `SCRIPT_MANIFEST_REVISED.json`. Preserve immutable baseline. **Do NOT manually copy old `story_body_chars`, `story_lengths` or words into revised manifest.**
5. Run `python tools/verify_project.py PROJECT_DIR --revised`. If failure, BLOCK: no fake READY, no second repair by changing output directory. Send the result to Step4 final **read-only** recheck. The revised manuscript is never self-certified as ready by its writer.

### Integrity and safety
A local identity lock is limited to this project's filesystem; backups/copies should be governed by the host workflow. The tool intentionally stops after a partial failure instead of silently allowing another editing execution. Persistent source files and machine verification are REQUIRED for a verified production PASS.

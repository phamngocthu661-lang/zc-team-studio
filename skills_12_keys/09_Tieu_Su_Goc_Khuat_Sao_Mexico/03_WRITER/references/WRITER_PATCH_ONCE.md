# ONE-SHOT PATCH PROTOCOL — NO ITERATIVE REWRITING

## Boundaries
Only one edit batch after exactly one frozen independent QA per run. This differs deliberately from HOMELESS V12's iterative QA-Step5-Step4 cycles. A batch can include many small accepted defects (logic, event-date, pronouns, accents, Spanish spelling) and is still counted as ONE revision.

## Steps
1. Reopen original `FULL_SCRIPT.txt` and compare SHA256 with frozen QA baseline. Freeze `QA_PATCHES.json` array containing `issue_id`, `start_byte`, `end_byte`, `replacement`, `reason`. Offsets are UTF-8 bytes; non-overlap, ascending. Include original source excerpt if helpful. Do not invent offsets.
2. Run `python scripts/mexico_tools.py repair-init --source FULL_SCRIPT.txt --state REPAIR_STATE.json` and then `python scripts/mexico_tools.py repair-apply --source FULL_SCRIPT.txt --state REPAIR_STATE.json --patches QA_PATCHES.json --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json`.
3. Tool enforces SHA match, no overlap, byte-range validity, one-batch counter and no edits outside approved spans; verifies stable 7 headings and Unicode/body length if requested. Review all revised changes once (read-only regression check), issue final report.
4. If resulting script lacks facts/sources and cannot pass, declare `BLOCKED_AFTER_ONE_REPAIR`; a completely fresh production run/research plan would require a new explicit user instruction, not covertly extending this run.

## Edit prohibitions
Don't wholesale reword for style, add scenes, restore old allegations, overwrite strong paragraphs outside authorized ranges, mutate the locked title, retcon publicly documented chronology, or re-run `repair-init` to reset a consumed state. Production stores original state as durable artifact. A malicious operator could delete state manually, so provenance depends on persistent real files and audit practices.

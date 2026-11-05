# QA CHECKPOINT / RESUME PROTOCOL — V12

## Purpose and authority

An **execution-reliability layer**, not permission to weaken any v1.8.0 forensic or publication standard. This document is **mandatory for MODE A** and is deliberately READ-ONLY with respect to manuscript prose. `EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md` and the existing fixed rubric/patch protocols remain authoritative.

The old failure mode was: after a successful technical preflight and a partial content review, the assistant stopped with neither a finished ledger nor a verifiable record of what it had actually inspected. v1.8.1 gives the operator a durable, resume-safe checkpoint and a deterministic **completeness validator**. Neither the validator nor a checkpoint **performs** the story audit. Human/editorial reasoning must still establish all findings, evidence and scores.

## A. Begin with proof, not claimed coverage

1. Confirm same video/title and full current script file; prefer the verified `HML_<title_sha12>_FULL_SCRIPT.txt` artifact or exact user-specified revised script. Do not create or reconstruct missing manuscript bytes from a synopsis.
2. Use `scripts/qa_checkpoint.py init /mnt/data/HML_..._FULL_SCRIPT.txt --title "EXACT LOCKED TITLE" --outline-file /mnt/data/FINAL_OUTLINE.txt --out /mnt/data/HML_<title_sha12>_QA_CHECKPOINT.json`.
3. The program independently decodes UTF-8, checks seven ordered `[PART N]` headings, removes only standalone part-heading lines including their newline for **body character count** and body SHA-256, and records exact file SHA, characters, words and per-part lengths. The full script is never edited.
4. If source is inaccessible or current body cannot be counted, HARD STOP, no provisional QA score, no Frozen Patch Ledger. If count exists but is out of range, continue a diagnostic audit with explicit P0 length normalization; never announce READY.

## B. Real audit, part-by-part, with checkpoints

The reviewer must **actually read** the entire script across all required passes:

- Whole-story Read #1; line-by-line Read #2; Part 7→1 reverse-dependency Read #3.
- State maps: character, time/age, money, objects, locations, knowledge, authority, clues/open loops, causal dependencies, strong spans and protection zones.
- Every Part × all 24 coverage dimensions, using literal source-supported evidence and exact quote anchors when defects are involved.
- Omission, exact-number, hook/retention, forensic/professional/legal, platform/prose, repair-simulation and dependency sweeps.
- Full-script saturation sweeps **until a fully completed final sweep discovers zero new actionable defects**. If a sweep discovers a new issue, add it to candidates, rerun repair simulation for related dependencies, then perform another **complete** sweep.

After completing a genuine review unit, persist the evidence to checkpoint JSON **before** moving on. A checkpoint initialized with empty entries is NOT an audit. For each inspected Part × dimension:

```
"Part 3": {
  "Physical/Mechanical": {
    "status":"PASS",
    "evidence":"Concrete source-backed observation and location; why mechanics passes",
    "patch_ids":[]
  }
}
```

For an actionable defect, use `status:"PATCH"` and cite the corresponding Pxx, plus a concrete reason in `evidence`. Never mark an unexamined cell PASS to get a certificate. Do not substitute a vague line such as `checked` for source-grounded evidence.

`stages` values must be `{"done":true,"evidence":"specific pass scope and findings or checked locations"}` only **after** that pass actually happened. Save incrementally, not just when finished.

## C. Patch candidates and locked score

For each actionable Pxx, supply in `defects`:

```
{
  "id":"P01", "severity":"P1", "part":"Part 2",
  "anchor":"a literal unique-enough snippet of the source text",
  "zone":"Part 2 → scene/beat → opening/closing quotes or exact offsets",
  "problem":"precise real defect", "repair":"concrete authorized repair",
  "dependencies":["enumerated downstream callbacks or object/knowledge state; empty if none"],
  "length_intent":"KEEP", "rubric_category":"Causality / Discovery / Why-now",
  "deduction":1, "occurrences":[]
}
```

Do not write the above example as an actual defect unless the manuscript contains it. Repeated issues must enumerate each actionable occurrence with exact anchors and specific actions. Strong spans should be recorded with exact source text anchors and preservation instructions. Frozen scorecard uses the unchanged 10-category /100 rubric; the sum of all assigned Pxx deductions must match the category deductions and total. Do not chase 98 points or silently alter original weights. For an out-of-range manuscript add a real P0 ADD/CUT plan addressing length.

`hard_gates` stores each relevant gate with PASS/FAIL **and evidence** (not default PASS). Script length is independently machine-checked, never set by reviewer.

## D. Saturation: a completion condition, not an infinite loop

Record each **actually completed** saturation sweep in `saturation_passes`, each with `complete:true`, `body_sha256` matching the frozen exact body, `evidence` summarizing full 7-Part scope, and `new_defect_ids` listing newly discovered Pxx from that sweep. **Freeze only when the most recent complete sweep records `new_defect_ids:[]`.**

Do not cap the number of defects. Do not declare a zero-new sweep without doing it. If an execution window ends mid-sweep, save the coverage and candidates; **do not record a completed full sweep** for that partial work.

A real content review may require more than one invocation due to resource limits. `step4` should try to finish in the current invocation; if genuinely blocked, it must retain the incomplete checkpoint, describe exact pending work and provide its file link. Never claim that a future model invocation will continue on its own. The user can issue `step4` again to **resume the same checkpoint** (this is not moving to another step).

## E. Resume safeguards

On any `step4` continuation:

1. Open the saved checkpoint and confirm the exact file still exists.
2. Run `python scripts/qa_checkpoint.py inspect /mnt/data/..._QA_CHECKPOINT.json`; the tool rehashes the **current** file and compares with frozen `file_sha256`, `body_sha256`, `body_chars`, headings and count convention.
3. If hashes mismatch, **STOP** and ask which version is current. Never apply a previous coverage/patch ledger to a different script; starting fresh is allowed only after explicit version resolution.
4. Reuse authentic completed evidence; inspect pending cells, unfinished stages and incomplete saturation cycles. Do not reread every completed section blindly unless new findings require a dependency check.
5. Update and persist the JSON again. Checkpoint data is **INTERNAL/PROVISIONAL**, not the official Frozen Patch Ledger or official QA score.

The file path and hash must correspond to the exact ongoing video. Do not load or mix checkpoint records for another video.

## F. Freeze gate and deliverable

After real work is complete:

```
python scripts/qa_checkpoint.py inspect /mnt/data/HML_<title_sha12>_QA_CHECKPOINT.json
python scripts/qa_checkpoint.py freeze /mnt/data/HML_<title_sha12>_QA_CHECKPOINT.json --out /mnt/data/HML_<title_sha12>_QA_FROZEN.json
```

`freeze` refuses to finalize if source changed; an audit stage, coverage cell, hard gate or rubric value remains unverified; a patch anchor is missing; saturation is absent/incomplete/has new findings; or score deductions are inconsistent. The tool emits a structured frozen proof / patch ledger and SHA-256 manifest. **The machine checks structural completeness and internal consistency, not whether literary judgments are correct.** Final QA report still requires an independently written, source-backed forensic review and coverage certification under the existing `OUTPUT_TEMPLATES.md`.

READY requires simultaneously: **numeric score ≥98**, all required hard gates PASS, valid length and structure, and **zero remaining actionable defects**. If score is <98, any Pxx remains or any hard gate fails, report `NOT READY` with real Frozen Patch Ledger. After only a valid completed freeze with real patches may user call `step5`. If completed READY, suggest `step6`.

## G. V12 QA-only repair handoff

Completed and honest Step4 may freeze exact QA-owned edit windows using `scripts/freeze_repair_contract.py`, which validates the baseline SHA, frozen QA evidence, per-Pxx anchor, Part boundary, protected Sxx spans and outline/video identity. Do not author replacement prose. The user's subsequent `step5` is routed ONLY to Writer; Writer's deterministic composer must preserve all immutable bytes. Another independent `step4` on that revised exact source is obligatory before SEO.

## H. Honest chat endings (no workflow status block)

- **Audit finished, score ≥98 and READY:** one final sentence suggesting `step6`.
- **Audit finished but needs fixes, valid frozen ledger:** one final sentence suggesting `step5`.
- **Audit incomplete:** explain remaining pending coverage/saturation, supply actual checkpoint link and say **`step4` can resume it**; do not suggest `step5` or `step6`, and do not invent a QA score, ledger or proof.
- Do not display `WORKFLOW_STATUS` or automatically run any other step.

# STEP CONTROLLER — STATE TRANSITIONS AND RESUME

| Step | Entry | Produced output | Must verify to proceed |
|---|---|---|---|
| S1 TITLE | source title / channel data | `CURRENT_FINAL_TITLE.txt`, `TITLE_CANDIDATES.md`, `TITLE_LOCK.json` | Winner <=100 Unicode chars, 5 scored candidates, not competitor duplicate; video id |
| S2 OUTLINE | title lock | `FINAL_OUTLINE.md`, `OUTLINE_LOCK.json` | same title, 7 Parts, causal ledger, ending earned, target length |
| S3 DRAFT | title + outline actual files | `FULL_SCRIPT.txt` + manifest, optional A/B/C | title/outline hashes, exactly 7 Parts, length, count, exact file exists |
| S4 INITIAL | exact full script | report, `QA_FINDINGS.json`, frozen `QA_FROZEN.json` | first source SHA; issue anchors unique; freeze completed |
| S5 ONE REPAIR | source + frozen issues | `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json` | repair_count=1, full list applied exactly once, no unrelated changed bytes |
| S4B VERIFY | final script + proof | `QA_FINAL_REPORT.md`, `QA_FINAL.json` | audit spelling & logic on entire final, final SHA, READY/BLOCKED |
| S6 SEO | READY final | SEO package, A/B/C prompts, trailer | title SHA + final script SHA match, all claims in script |

## Controller decision rules
- If missing file, invalid hash, or incomplete S3, return `BLOCKED_MISSING_SOURCE` and specify missing artifact, do not guess.
- If S4 already READY with no actionable issues, skip S5 and emit QA_FINAL referencing the unmodified file with `repair_count=0`.
- After S5, call S4B exactly once; if remaining defect, mark `BLOCKED_MANUAL_DECISION`. No recursive/implicit second repair.
- `next` only advances a valid expected stage; `status` never alters state; `redo` versions artifacts and invalidates derived hashes.
- If title source is ambiguous, proceed with supplied title under mode `TITLE_ONLY`; no false claim of competitor views.
- After SEO, append exact canonical normalized title and premise fingerprint into project ledger as `PUBLISHED` when user confirms publication; title should already be reserved as `LOCKED` at S1.

## Minimal JSON manifests
`TITLE_LOCK.json`: `{"niche_id":"MEX_INFIDELIDAD_V1","title":"...","title_sha256":"sha256 exact title bytes","video_id":"first12","score":98,"language":"es-MX"}`.
`OUTLINE_LOCK.json`: `{"niche_id":"MEX_INFIDELIDAD_V1","title_sha256":"...","outline_sha256":"...","parts":7}`.
`QA_FINAL.json`: `{"niche_id":"MEX_INFIDELIDAD_V1","title_sha256":"...","script_sha256":"...","status":"READY","repair_count":1,"qa_score":97,"blocking_issues":[]}` (all values must be real and source verified; this is a template, not a report of a real video).

## V1.1 prepublish acceptance
At S4 and S4B include seven-part source quotation trace and eyewitness arrival/speech timing checks; DO NOT equate a checked boolean with a full editorial read. After S5 only one repair is allowed. If `BASELINE_MISS` or serious unresolved issue remains after the sole repair, S4B=`BLOCKED_MANUAL_DECISION` (not another write loop). Run `audit-run --workdir runs/<id> --require-seo` to verify archived output, and strict `seo-gate --workdir runs/<id>` before release. Both only attest file mechanics, not creative quality. New stage file paths are portable.

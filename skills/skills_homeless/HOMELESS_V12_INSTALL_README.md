# HOMELESS V12 — INSTALL / CHANGEOVER / RECOVERY

## Deliverables

- `Viet-Tieu-De-HOMELESS-V12.zip` — title v1.2
- `viet-gian-y-homeless-V12.zip` — outline v2.4.0
- `Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR.zip` — Writer v2.0.0 owns BOTH Step3 Draft and Step5 Surgical Repair
- `kiem-tra-kich-ban-homeless-V12-AUDIT-ONLY.zip` — QA v2.0.0 owns Step4 read-only, frozen diagnostics and QA-scoped byte windows
- `seo-homeless-V12.zip` — SEO v2.1.0 requires exact QA READY on current script
- `HOMELESS_STEP_CONTROLLER_V12.md`, `HOMELESS_INSTRUCTION_DIEU_PHOI_SKILL_STEP1_STEP6_V12.md`, `HOMELESS_PROJECT_INSTRUCTIONS_V12_COPY_PASTE.md`.

## Installation

1. Back up every active V11 ZIP, controller, instruction and script/QA artifact as read-only archives. **Do not overwrite saved video files.**
2. Remove/archive V11 ZIPs and V11 controller/instruction from active Project Sources, so V11 and V12 cannot be selected simultaneously. Upload the five V12 ZIPs and two V12 controller/instruction docs.
3. Replace Project custom instructions with the full text of `HOMELESS_PROJECT_INSTRUCTIONS_V12_COPY_PASTE.md`.
4. Use the six familiar commands. Step3 must be called THREE times; Step5 uses WRITER ZIP (not QA). Keep artifacts accessible across turns.
5. If old V11 `SCRIPT_MANIFEST` is present, V12 `segment_workflow.py` refuses it (schema 1 vs 2) because previous manifests don't bind outline SHA/video_id. Continue old episode under V11 archived environment or explicitly migrate after verifying immutable A/B/C and exact outline; do not silently start A over the old file.
6. V12 QA tool intentionally retains `HOMELESS_QA_FROZEN_V1.8.1` and checkpoint schema labels for interoperability, but NEW outline/video_id fields and diagnostic fields are mandatory when an actionable defect is frozen.

## Important limits

- New scripts validate provenance and structure/diff, **not** prose-generation or story quality.
- A QA zone spec is authored by actual reviewer from exact original file and source quote anchors; automated program validates it, cannot determine the literary repair window on its own.
- QA contract `FROZEN_UNAPPROVED` only becomes executable after a real user Step5 approval; `--user-approved` is an operator claim, not a cryptographic user authorization token.
- `QA_LESSON_CANDIDATES.json` proposals do NOT automatically retrain Writer or edit the ZIP. A person must review and approve a versioned ruleset.
- Revised script remains NOT READY until the following independent Step4 confirms READY on its exact file hash. Only after that may Step6 run.

## Quick operational commands

```
step1: [source title]
step2
step3              # A
step3              # B
step3              # C / full verified
step4              # source audit, QA_FROZEN + contract if needed
step5              # WRITER repair ONLY when exact QA frozen contract exists
step4              # independent source-matched postrepair QA
step6              # exact-script QA READY only
```

## Integrity testing

See `HOMELESS_V12_TEST_REPORT.md` for actual syntax, packaging and synthetic source test results. Synthetic text is a parser-integrity fixture, never a real HOMELESS narrative, scored script or QA READY proof.

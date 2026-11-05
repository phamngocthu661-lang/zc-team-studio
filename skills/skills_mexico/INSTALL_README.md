# INSTALL — MEXICO FAMILY V1.2.0 (folder/API backward-compatible)

## File map and correct scope
- Five individually installable ZIP skill folders: `01_TITULOS_MEXICO`, `02_ARQUITECTURA_MEXICO`, `03_ESCRITOR_MEXICO`, `04_AUDITOR_MEXICO`, `05_SEO_MEXICO`. Each contains a `SKILL.md`, `VERSION.txt`, `references/`, and scripts for technical steps.
- The master ZIP contains the same five complete folders, `MEXICO_FAMILY_STEP_CONTROLLER_V1.md`, `SHARED_CROSS_SKILL_CONTRACT_V1.md`, `MEXICO_FAMILY_PROJECT_INSTRUCTIONS_COPY_PASTE.md`, `SOURCE_RESEARCH_REPORT.md`, example and self-test.
- Do not load old Homeless title/outline/QA controllers in the same project. These tools intentionally retain V12-style CLI interfaces, but their schema prefix is `MEXICO_FAMILY` and their segment filename prefix is `MXF_`.

## Setup
1. Create a dedicated ChatGPT project for Mexican family drama.
2. Install/attach the five skill ZIPs (or extract five folders and load via supported Skills mechanism).
3. Put the controller + shared contract in project references and copy PROJECT_INSTRUCTIONS text into project instructions.
4. Keep output artifacts in one dedicated folder per video. Never reuse same-title files for a new outline.
5. Verify `python test_v1_tools.py` in the unpacked **master root**. The script creates only synthetic test prose, not an actual story. `22/22` checks indicate integrity mechanics only.
6. Trigger `step1` (or paste `LOCKED_TITLE` and trigger `step2`) and continue one step per user request.

## No-tools mode
When no persistent filesystem, code runner or SKILL installation feature is available, document this explicitly: the model may draft text but MUST NOT claim hash, full body count, full QA or publish READY. Move completed files into persistent environment and run verifiers before promotion. Video-generation and artwork require separate tools; SEO skill outputs production-ready prompts, not automatically rendered image/video assets.

## Release compatibility
This package is an independent Mexico V1 branch, NOT an upgrade of the original Homeless or Mafia skill names. It does not mutate old skill folders. It preserves the 5-SKILL/6-STEP split and writer/QA separation. A full realistic writing QA must be conducted on real story data; synthetic tests only cover technical integrity.

## V1.1 upgrade-in-place / rollback
- The full bundle is `MEXICO_FAMILY_SKILLS_V1_1_FULL.zip` but its **internal installed folder names remain unchanged**: `01_TITULOS_MEXICO` through `05_SEO_MEXICO`. Existing `step1..step6` routing, `title_sha12`, `video_id`, `OUTLINE.txt`, manifest fields, `QA_CHECKPOINT.json` schema, Python CLIs and zone repairs are **unchanged**.
- To upgrade existing installation, BACK UP V1.0, then replace each of the five SKILL folders with the corresponding V1.1 installable ZIP. Do not mix new title reference with old Title `SKILL.md`. The shared contract/controller is copied into each folder's references so ZIPs remain standalone.
- New title helper `scripts/title_quality_gate.py` is OPTIONAL; it validates title counts/scoring packet, not actual CTR. See `references/TITLE_GATE_INPUT_SCHEMA.md`.
- New editorial references: Title benchmark/scorecard/red-team; Outline hook-to-payoff; Writer emotional retention; Auditor audience competitiveness; SEO promise integrity. If no persisted source or verification tool, report `UNVERIFIED`, not PASS.
- Scripts copied from validated V1 remain byte-for-byte unchanged. This upgrade changes **editorial instructions and an additive optional title validator**, not legacy script schemas. Run `TEST_REPORT_V1_1.json` checks before production; do a real 7-Part pilot and independent listener review before scaling.

## V1.2 INSTALL / MIGRATION — DO NOT MIX SKILL VERSIONS
1. BACK UP V1.1 before installing. Replace ALL five existing skill folders together with corresponding V1.2 standalone ZIPs; internal folder names and `SKILL.md` locations remain identical. ZIPs **install inside ChatGPT only when the product/workflow supports the skill attachment format**. Otherwise extract the folders and load their files as project references.
2. Keep `MEXICO_FAMILY_STEP_CONTROLLER_V1.md`, `SHARED_CROSS_SKILL_CONTRACT_V1.md`, and `MEXICO_FAMILY_PROJECT_INSTRUCTIONS_COPY_PASTE.md` from THIS package. `VERSION.txt` at root and all five folders says 1.2.0. Existing `step1...step6` command names and A/B/C segments unchanged.
3. STEP1: run BOTH `python 01_TITULOS_MEXICO/scripts/title_quality_gate.py TITLE_GATE_INPUT.json` and `python 01_TITULOS_MEXICO/scripts/title_niche_gate_v12.py TITLE_GATE_INPUT.json`; mandatory extra `niche_lock` fields are in `references/TITLE_NICHE_GATE_SCHEMA_V1_2.md`. BOTH must pass, and a real editor still checks whether metadata matches the actual title. Old JSON without `niche_lock` is readable by score validator but **not qualified to issue V1.2 winner**.
4. In master root run `python test_v1_tools.py`, `python test_title_quality_gate.py`, `python test_minor_score_gate.py`, `python test_family_niche_v12.py`, `python test_v12_cross_gate.py`. Technical tests use synthetic data and don't evaluate any finished creative screenplay.
5. V1.2 strictly means older mother/grandmother, first-person, direct FAMILY betrayal, her own consequence/choice. User may lock a different genre/title; preserve title verbatim and flag SCOPE_EXCEPTION, never silently modify. To run a distinct niche, request explicit scope change.
6. Full manuscript budget stays 70,000–80,000 Unicode codepoints across seven Parts; a generic 30–45-minute video is **not equivalent**. Actual video/audio runtime must be observed or separately calculated using stated TTS rate.
7. Keep a distinct folder/output ID per video; backup all hash bound files. For rollback restore all five backed-up V1.1 folders AND the matching controller/shared instructions, never mix.


## V1.3 Upgrade
See `INSTALL_V1_3.md` and `V1_3_UPGRADE_NOTES.md` for required new creative title gate and editorial review. Existing 5 SKILL names and all step commands unchanged.

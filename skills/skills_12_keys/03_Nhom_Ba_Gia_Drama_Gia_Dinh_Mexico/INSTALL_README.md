# MEXICO FAMILY DRAMA SKILLS — V1.1.0 UPGRADE

**What it is:** Five compatible skill folders, six-step controller, es-MX 7-Part narration, exact SHA identity/length/one repair, NEW scene/fact editorial proof, QA recheck and clean TTS. This is an upgrade to the V1 bundle, NOT a new niche, different 5-Skill count or a second repair loop.

## Installing into the existing system
1. Back up your current five V1 Skills. Remove/replace ALL five together; never leave a V1 Writer or SEO mixed with V1.1 QA. The folder and internal Skill *names* are deliberately UNCHANGED (`01_Tieu_De_Mexico_Dona_V1` ... `05_SEO_Thumbnail_Mexico_Dona_V1`) to preserve existing routing. Internal `VERSION.txt` and SKILL.md are now `1.1.0`.
2. Use the five ZIPs under `INSTALL_ZIPS/`, one per existing Skill slot, OR extract this master ZIP and copy the five full folders into the original Skills location. Each standalone ZIP contains exactly one root Skill and corresponding `SKILL.md`/`references`/`scripts`.
3. Replace the V1 controller's text with `MEXICO_STEP_CONTROLLER_V1.md` (file name kept for compatibility, contents updated to V1.1). Replace the old Project Instructions with `PROJECT_INSTRUCTIONS_COPY_PASTE.md`.
4. Python 3.9+ is required for actual gates. Run `python tools/test_mexico_pipeline.py` from the master root (all tests synthetic, no external libraries).
5. Your existing video workspaces remain readable. However, **a V1 READY QA JSON is intentionally not accepted by V1.1 SEO**. Rerun independent QA on the exact manuscript and create genuine `QA_EDITORIAL_EVIDENCE.json` before publishing. Do not patch an already repaired V1 run a second time.
6. Do not import the ZIP of the whole system as a single Skill if your loader expects a `SKILL.md` at the single ZIP root. Import individual install ZIPs in that case.

## Workflow
`step1` title → `step2` original 7-Part outline → `step3 A/B/C` real segments → `step4 INITIAL` independent QA → optional `step5` one patch → `step4 FINAL` full postrepair evidence review → `step6` if READY and make metadata/TTS.

## What changed vs V1.0
- Strong scene event chronology, first-known fact and flashback preflight in outline and Writer.
- Postrepair byte-offset proof + before/after citations to test patches against surrounding context.
- Independently populated full-script `QA_EDITORIAL_EVIDENCE.json` required in final QA and SEO; technical and editorial booleans separated.
- Structured detections for missing timeline flashback signals, repeat revelations to an already-knowing character, unchecked patch contexts; no score-only approval.
- Scene density/Part 5-6 transition and repetitive moral-monologue improvements.
- `tts-export` produces heading-free output without rewriting prose. Thumbnail mobile-review and provenance checklist.

## Limits of verification
Automated tests certify file/hash, evidence structure and simulated known-error rejection ONLY. They do NOT certify story quality, native-speaker voice, Mexican law, competitor script comprehension or future YouTube performance. The original competitor bundle supplied title/view/thumbnail snapshots with no SRT transcripts; original videos were not transcribed or copied.

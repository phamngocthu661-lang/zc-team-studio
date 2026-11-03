# INSTALL — US MIDNIGHT HORROR V1.1 (UPGRADE FROM V1)

1. Install `01_title_rewriter`, `02_outline_engine`, `03_script_writer`, `04_script_auditor`, `05_seo_publish` as the same five Skill folders as before. `03_script_writer` owns BOTH Step3 and Step5. Do not add a 6th Skill or change command names.
2. Keep root files `US_MIDNIGHT_STEP_CONTROLLER_V1.md` and `SHARED_CROSS_SKILL_CONTRACT_V1.md` under the SAME stable filenames. They contain V1.1 rules but use V1 filenames for backward compatibility.
3. Load `PROJECT_INSTRUCTIONS_COPY_PASTE.md` in your project and ensure Python 3.9+ filesystem access to `tools/`. No new third-party Python packages needed.
4. Typical run: `step1`, `step2`, `step3` x3, `step4`, `step5` if needed once, `step4` final verification, `step6`.
5. Step3 gate: `python tools/verify_project.py /path/to/video_dir`.
6. Step5: `python tools/apply_one_pass_repair.py /path/to/video_dir/FULL_SCRIPT.txt /path/to/video_dir/QA_ISSUES.json /path/to/video_dir/QA_REPLACEMENTS.json /path/to/video_dir`; the tool recalculates `SCRIPT_MANIFEST_REVISED.json` automatically and keeps `REPAIR_LOCK.json`.
7. Step4 final: create `FINAL_QA_GATE.json` bound to current SHA, then `python tools/verify_project.py /path/to/video_dir --revised --release`. Do NOT take any new Step5 pass on old outputs.
8. Step6 final: `python tools/finalize_release.py /path/to/video_dir --seo`.
9. Run `python tools/smoke_test.py` and `python -m unittest discover -s tests -v`. Inspect `AUDIT_FIRST_RUN.md` for actual findings on the user's initial Highway Rest Stop production.
10. **Old V1 production pack is NOT automatically re-certified.** V1.1 deliberately rejects its stale revised manifest and missing FINAL_QA_GATE.json. You may independently fix stale metadata to match verified historical bytes and perform read-only QA to supply a new gate; never repeat the one allowed script rewrite.

Compatibility: filenames, top-level Skills folders, commands, JSON core fields and stage A/B/C are maintained; V1.1 adds stricter machine guards and one mandatory JSON QA signoff. This is a validation/schema upgrade, not full binary compatibility with past unverified V1 releases.

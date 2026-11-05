# INSTALL — US MALE POV ROMANCE SKILLS V1.1

**Five Skill directories are unchanged from V1.0; existing step aliases stay stable.** This ZIP is an upgrade, not a new workflow. To install, back up your V1.0 bundle and replace files in the matching US Male Romance package only. Do not overwrite Mafia or Homeless Skills. Preserve sibling directory `00_SHARED` and original relative paths `../00_SHARED/...`.

## Contents
- `01_Title_Rewriter`, `02_Story_Outline`, `03_Script_Writer`, `04_Script_QA_One_Repair`, `05_SEO_Publish_Pack` — Step 1–5.
- `00_SHARED` — shared contract and user research DNA.
- `US_MALE_ROMANCE_STEP_CONTROLLER.md` — states, `NEXT` and title/handoff locks.
- `scripts/verify_script.py` — SINGLE whitespace word-count method and clean TTS gate.
- `scripts/verify_one_repair.py` — accepts both the V1.0 test run excerpt ledger and the byte-offset contract; 1 repair max.
- `scripts/verify_bundle.py` — tests final manuscript, 7 Part files, title, hashes, SEO metadata.
- `tests/test_verifiers.py` — local deterministic regression tests (no external dependencies).
- `UPGRADE_NOTES_V1_1.md` and `AUDIT_USM_002.md` — exact fixes and evaluation of first run.

## Production commands
```
python scripts/verify_script.py /path/to/run/final_script.txt
python scripts/verify_one_repair.py /path/to/run/final_script_draft.txt /path/to/run/patch_ledger.json /path/to/run/final_script.txt /path/to/run/repair_check.json
python scripts/verify_bundle.py /path/to/run --report /path/to/run/release_check.json
python -m unittest discover -s tests -v
```
No external Python dependencies. On Windows use `py` in place of `python` as appropriate; use properly quoted file paths.

## Release rule
`SEO_READY` / publish-ready can only be trusted after the SHA, one-repair, length, TTS and Part synchronization checks all PASS, plus genuine independent editorial approval for storyline/spelling and thumbnail/image QA. Programmatic checks do not certify emotional quality. If any release check fails, do not spend the single revision round again just to regenerate derived `partN.txt` from already verified final text.

## Source limitation
User supplied one reference channel, 12 titles/descriptions/views and 12 thumbnail images but no verified script transcripts. Narrative-craft rules are proposals, not measured competitor patterns or watch-time data.

## Upgrade archive root
The downloadable archive is named `US_Male_POV_Romance_Skills_V1_1.zip`, but deliberately retains internal top directory `US_Male_POV_Romance_Skills_V1/` to keep existing controller root paths intact. After backup, unzip and merge files into that existing top-level package. No separate V1.1 root installation is required.

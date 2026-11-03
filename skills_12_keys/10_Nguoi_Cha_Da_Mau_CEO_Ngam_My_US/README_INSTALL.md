# BLACK DAD × UNDERCOVER CEO US — SKILLS PACK V2.0

V2 upgrades first-run weakness (unmet first-90-second outline promise, premature undercover-CEO reveal and unsupported QA 98), while preserving five Skill directories, `SKILL.md` entrypoints, controller file name, steps, and existing output file formats. No second repair; QA only verifies after one Writer edit.

## Folder map (same installed names)
- `01_viet-lai-tieu-de-black-dad/SKILL.md`
- `02_viet-gian-y-black-dad/SKILL.md`
- `03_viet-kich-ban-black-dad/SKILL.md` (S3 DRAFT + S5 SINGLE_REPAIR)
- `04_kiem-tra-kich-ban-black-dad/SKILL.md` (S4 initial + final verification)
- `05_viet-seo-black-dad/SKILL.md`
- `SHARED_PRODUCTION_CONTRACT.md`, `HOME_CONTROLLER_V1.md` (stable filename, V2 content), `PROJECT_INSTRUCTIONS_COPY_PASTE.md`
- Skill-local `references/SHARED_PRODUCTION_CONTRACT.md` (identical copies so each Skill imports alone)
- `scripts/verify_artifacts.py` (old command retained) and **NEW** `scripts/validate_production.py`
- `tests/test_validator.py`, `AUDIT_FIRST_RUN.md`, `UPGRADE_NOTES_V2.md`.

## Installation/update
1. Keep a backup of installed V1. Replace each previous named Skill directory with the **identically named** V2 directory, keeping its own `references` folder intact. Do NOT install the archive ZIP itself as one Skill if host expects one folder per Skill.
2. Replace project instructions text and controller contents from this ZIP. Controller filename intentionally remains `HOME_CONTROLLER_V1.md` for compatibility.
3. Existing `video_id` data files need not be renamed. Historical V1 runs should be audited, not silently modified or relabeled V2-approved. `02_hook_contract.json` (S2 frozen) and `04_hook_proof.json` (S4 final, anchored against actual final text) are required for new V2 publish-ready runs.
4. In runtime: `python scripts/verify_artifacts.py path/to/03_draft.txt` (same as V1). Before SEO run `python scripts/validate_production.py path/to/video_id_output_directory --phase pre-seo` and after exporting SEO run `python scripts/validate_production.py path/to/video_id_output_directory`. Exit 0 means file-integrity gates passed, **not** semantic narrative certification.
5. For old V1 data inspect with `python scripts/validate_production.py path/to/old_run --legacy`. This skips the new hook-proof file requirement but does not represent an approval under V2.
6. Smoke test: `python -m unittest discover -s tests -v` from package root. For Windows: `py -3 scripts\validate_production.py <output_folder>`.

## ONE repair rule
Draft → QA issues → freeze all scoped changes → Writer applies only once → Final QA checks only, no second writing. Any remaining critical/major fault moves to `NEEDS_HUMAN_REVIEW`. Existing V1 run already has 1/1 revisions; never edit it automatically under V2.

## Research limitations
Ratings and views in historical CSV reflect a snapshot, not controlled CTR/retention evidence. Reference videos/titles inspire patterns only. Technical validation does not measure emotional impact or audience retention; editorial QA must be independent and honest.

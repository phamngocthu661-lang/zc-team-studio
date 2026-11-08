# PADRE MX V1.2 — CHANGELOG
Date: 2026-11-07

## Bug fix: script delivered at half-length
- Retain full 70,000–80,000 Unicode character target; preferred 74k–78k. No lowering requirement to 35k–40k.
- Stage A 20,000–24,000 chars, Stage B 30,000–35,000, Stage C 20,000–25,000. Minimum per Part 8,500.
- Validator `segment_workflow.py` rejects insufficient/overlong segments at each stage; `verify_full_script.py` adds per-Part min.
- Writer must persist and verify actual text and explicitly report DRAFT_INCOMPLETE if bounded output limits interrupt a stage.

## Step6 two actual matched images
- Replace three A/B/C image alternatives with exactly two finished deliverables: `THUMBNAIL.png` and `THUMBNAIL-NENXANH.png`.
- Same 16:9 canvas; same portrait layer/crop/position/person; full #00FF00 green background and no words in the keying version.
- Added user example references `example_thumbnail.jpg` and `example_green_screen.png` inside SEO Skill.
- SEO metadata validator now requires two paired image prompts instead of three alternatives.
- Added `validate_thumbnail_pair.py` for output file existence, dimensions, name, keying color and right-side portrait presence; manual identity/text/edges review still mandatory.

Historical V1.1 tests/QA remain archived; regression test results in TEST_REPORT_V1_2.md correspond to this new revision.

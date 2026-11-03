# TEST REPORT — V1.1.0

## Checked in the actual RUN1 episode
- 19 machine-readable release checks passed with zero data-integrity errors.
- Verified 7 ordered parts; 14,554 spoken codepoints; 204 lines; 54-char locked title; SEO 442-character tags; 3 thumbnails 1920×1080.
- Stage concatenation, locked title and outline, script SHA, QA proof, one frozen patch transaction and exact final TTS content all passed.
- `release_gate.py --project-dir RUN1` returned `TECHNICAL_PASS_PUBLISH_REVIEW_REQUIRED` (correct: no proof of independent creative and visual review).
- `release_gate.py --project-dir RUN1 --strict-publish` returned nonzero `BLOCKED` due to both `visual_review_attestation_missing` and `creative_editorial_review_missing`.

## Regression tests
- Original `test_tools.py`: **6/6 PASS**, including second-repair refusal and tamper checks.
- ZIPs: **6/6 CRC PASS** (master + five individual install ZIPs).
- Skill metadata and referenced files: five skill slugs, five `SKILL.md`, five `VERSION.txt` = `1.1.0`, new shared creative contract included.
- Additional negative tests: unauthorized edits to final TTS and corrupted thumbnail PNG are rejected by release gate.

## Test boundaries
The structural tests are deterministic; they do not prove story retention, native Japanese editorial quality, real thumbnail CTR, or TTS runtime. Visual attestations must be based on actually viewing the image and comparing to the script, not automatically auto-passed by JSON presence.

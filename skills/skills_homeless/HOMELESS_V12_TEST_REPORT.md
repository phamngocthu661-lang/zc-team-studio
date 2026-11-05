# HOMELESS V12 — TEST & PACKAGING REPORT

Release date: 2026-10-27

## Actual test run

- Synthetic integrity tests: **22 calls PASSED**.
- Synthetic body length used: **74547 Unicode characters**, within 70,000–80,000.
- Source manifest: verifies Stage A/B/C, requires matching outline SHA and video_id, assembles exact bytes.
- Frozen patch QA: detects invalid anchor, mismatched source QA hash and wrong video outline, disallows heading/strong-span overlap.
- Writer repair: blocks missing user approval, wrong outline, source hash mutation and length overflow; outputs unchanged byte intervals exactly.
- QA checkpoint: initialized-but-unread checkpoint cannot be inspected/frozen as a completed audit.
- SEO: refuses source without matching frozen QA READY; verifies hash-bound source on synthetic fixtures.
- All Python scripts compiled, packaged file CRC checked, all SKILL-linked mandatory reference paths exist.

## Included skills

| Skill | Version | Files | Executable scripts |
|---|---|---:|---:|
| Title | 1.2 | 7 | 0 |
| Outline | 2.4.0 | 12 | 0 |
| Writer | 2.0.0 | 17 | 3 |
| QA | 2.0.0 | 19 | 3 |
| SEO | 2.1.0 | 12 | 1 |

## Limits of testing

- The script under test is **synthetic parser fixture text**, not a genuine completed narrative. No user video has been re-audited or scored.
- Structural tools are not independent script-quality critics and cannot ensure factual/cinematic quality or retention.
- QA SOURCE identity and provenance require exact bytes and saved outline. A V11 artifact not containing this identity cannot bypass V12 gates.
- `QA_LESSON_CANDIDATES` contains proposals only. Promotion to durable rules needs human validation and new versioned ZIP.

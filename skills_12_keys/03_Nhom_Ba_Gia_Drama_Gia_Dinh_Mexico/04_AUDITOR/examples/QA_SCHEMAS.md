# V1.1 JSON ARTIFACT CONTRACTS — NOT DEFAULT APPROVALS

All JSON examples are only field explanations, NOT usable as proof for a real video. `qa-final` requires independent examination of the current full script and an exact `QA_EDITORIAL_EVIDENCE.json` whose hash is also bound into final QA and SEO. The evidence template intentionally has only ONE example scene; in production include 21+ independent meaningful scene anchors across all 7 Parts.

## QA_ISSUES.json — pre-repair
`full_read_complete`, `logic_checked`, `spelling_checked_es_mx` true only when actually checked; `issues` each have `id=P01..`, `severity=P0..P3`, `category`, UTF8 `start_byte`/`end_byte` exclusive, `expected_sha256` of exact original window, `evidence`, `reason`, `acceptance_test`. Include ALL fixable issues in one batch. Use `qa-freeze`; no second issue addition after repair.

## REPLACEMENTS.json — Step5
`{"replacements":{"P01":"Actual newly written es-MX prose that repairs the entire frozen issue"}}`, exactly one key per frozen defect and nothing else. Use `repair --user-approved`. In V1.1 REPAIR_PROOF includes each patch's new exact byte offsets, so the final reviewer can audit the surrounding prose.

## QA_EDITORIAL_EVIDENCE.json — mandatory in Step4 FINAL
Read `EDITORIAL_EVIDENCE_TEMPLATE.json`. `scenes` in actual manuscript order (at least 21, spanning all 7 Parts); IDs unique; each has `part`, `start_byte`, `end_byte`, literal `anchor_quote` present in that byte window, `story_date` ISO, `time_of_day` one of morning/afternoon/evening/night/unknown, `causal_change`, `known_to_narrator_after` list. For flashbacks, `flashback_explicitly_signaled=true` AND an actual `flashback_signal_quote` in that same scene. IDs must describe true narrative scenes, not arbitrary subdivisions made solely to pass the technical threshold.

Each major `knowledge_facts` element has `fact_id`, `character`, `first_known_scene_id`, `source`. Each `revelations` element references `fact_id` and `scene_id`, names the same relevant `character`, and sets `perceived_as_new_by_character` only if the narrator/character is presented as genuinely discovering it. Repeat disclosures to different people must be called out as such; avoid double counting known confessions.

`orthography_review` includes `es_mx_full_pass` and comments. `story_retention_review` includes `non_repetitive_revelations_pass` and notes. Post-repair `patch_reviews` is mandatory, one entry per patched issue, with literal `before_quote`, `after_quote` within 3,000 bytes of patch, plus booleans `timeline_consistent`, `knowledge_consistent`, `adjacent_scenes_checked`, `spelling_consistent`. These booleans only report editorial assertions; actual reading is essential.

## QA_FINAL_INPUT.json — Step4 after reread
```
{
  "full_read_complete": true,
  "logic_checked": true,
  "spelling_checked_es_mx": true,
  "continuity_checked": true,
  "title_promise_checked": true,
  "story_quality_pass": true,
  "localization_pass": true,
  "human_editor_reviewed": false,
  "current_script_sha256": "ACTUAL_SHA",
  "score": 97,
  "unresolved_issues": [{"id":"P12","severity":"P1","reason":"example unresolved timeline conflict"}]
}
```
`human_editor_reviewed` MUST be false if only an AI model reviewed. No generated script can automatically certify an independent human reviewed it. The example deliberately scores 97 and is NOT_READY. No manufactured perfect scores.

## Final verification command
`python scripts/mexico_pipeline.py qa-final --script FULL_SCRIPT_REVISED.txt --report QA_FINAL_INPUT.json --editorial-evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --out QA_FINAL.json`
If there was no repair, omit `--repair-proof` and audit the original full file. The CLI reports structured timeline/knowledge/patch failures, but **never claims that lack of findings proves perfect literary/linguistic reasoning**. No second repair after `NOT_READY` post-repair.

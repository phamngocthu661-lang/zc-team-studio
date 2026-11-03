# S4 FILE TEMPLATES — TRUE DATA ONLY

## QA_INITIAL_REPORT.md
- Run identity, exact title, baseline filename, title SHA, script SHA, outline SHA, count (words, chars, parts), timestamp.
- Initial 7-category score table, whether hard gates pass.
- Strong story spans S01–S06 (exact quoted anchors).
- Full 7-Part logic map (timeline/family/evidence/money/knowledge/access) and es-MX proofreading findings.
- Issues P01... with `part`, exact anchor `old_text`, concrete bug, root cause, viewer impact, desired correction, acceptance test, interactions and severity.
- Hard gates, `PUBLICATION_READY?`, next step. When issues present = `NOT_READY_ONE_REPAIR_ALLOWED`.

## QA_FINDINGS.json (before freeze)
Schema example with DUMMY TEXT; replace with actual content and real SHA. Save UTF-8:
```json
{
  "niche_id": "MEX_INFIDELIDAD_V1",
  "source_sha256": "ACTUAL_FULL_SCRIPT_SHA256",
  "issues": [
    {
      "id": "P01",
      "part": 3,
      "category": "timeline",
      "severity": "P1",
      "old_text": "A unique exact sentence or paragraph copied from the full script.",
      "root_cause": "What causality is broken",
      "acceptance_test": "Correct chronology while preserving evidence and relationship state"
    }
  ],
  "protected_spans": [
    {"id":"S01","text":"An exact unique strong passage from a DIFFERENT non-overlapping source location"}
  ]
}
```
`old_text` must occur exactly ONCE in the real source and lie in the declared `[PART N]`. A second occurrence requires a larger unique anchor or separate exact location. `protected_spans` MUST NOT touch edit windows (not even one byte). All actionable issues must be included BEFORE the Writer S5 begins; tool only checks exact text integrity and overlaps, not human completeness.

## QA_FINAL.json (for publishing)
```json
{
  "niche_id":"MEX_INFIDELIDAD_V1",
  "title_sha256":"ACTUAL_SHA256_OF_EXACT_LOCKED_TITLE",
  "outline_sha256":"ACTUAL_SHA256_OF_LOCKED_OUTLINE",
  "script_sha256":"ACTUAL_SHA256_OF_EXACT_FINAL_SCRIPT_FILE",
  "status":"READY",
  "repair_count":1,
  "qa_score":97,
  "blocking_issues":[],
  "complete_full_read":true,
  "logic_sweep_done":true,
  "orthography_sweep_done":true,
  "all_original_issues_checked":true
}
```
When S4 passes without S5: `repair_count=0`, SHA of original baseline, still a complete independent QA and no outstanding issues. On BLOCKED use `status=BLOCKED_MANUAL_DECISION` with real blocker IDs, no SEO gate.

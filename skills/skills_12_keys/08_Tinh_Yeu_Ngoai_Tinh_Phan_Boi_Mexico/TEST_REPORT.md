# TEST REPORT — MEXICO TELENOVELA SKILLS V1.0.0

## Date / scope
Created for user-supplied 215-video Mexico betrayal channel reference archive (November 2026). Technical checks test artifact storage, SHA and repair contracts using **synthetic filler stories**; these checks do not evaluate literary quality, real Mexican-law accuracy, TTS playback duration or actual YouTube performance.

## Tests run
- Python compilation: `workflow_tools.py` PASS.
- Unit test suite: 13/13 PASS (`tests/test_workflow.py`).
- CLI integration test: 11 expected outcomes PASS/BLOCK as designed (`tests/integration_smoke_test.py`): A/B/C stage; assembly with length gate; count; QA freeze; one repair; proof verification; second repair with renamed outputs intentionally BLOCKED; SEO gate READY; post-QA script mutation intentionally BLOCKED.
- Synthetic assembled test: 7 Parts, ~13,037 spoken word tokens, ~84,749 Unicode body chars, both inside default bounds. No claim that the repeated test paragraphs constitute a human-readable story.
- All 5 Skills have frontmatter YAML and local required reference paths, independently packaged with necessary shared docs. Title skill contains a compact 215-row catalog.

## What still needs production-level evaluation
1. Actual generated Spanish narration quality and native es-MX proofreading by a competent reviewer.
2. Complete 95–110 minute original script produced by chosen model with enough context/response capacity or staged file persistence.
3. Actual TTS voice playback length, audience retention, YouTube CTR, A/B thumbnail results.
4. QA of Mexico-specific medical/legal facts against reliable jurisdiction-specific sources when plot turns on the rule.
5. Media generation of A/B/C thumbnail images if requested. Prompts alone are not actual images.

## One-pass guard
`ONE_REPAIR_USED.json` is created in the same run directory as frozen QA. This prevents additional automatic S5 even if output filenames are changed. Protect this marker as part of the run record. For an explicitly approved new editorial cycle, start a **new versioned run directory** with new frozen QA; do not delete the marker to disguise the previous cycle.

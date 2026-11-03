# QA MATRIX, SEVERITY, AND MACHINE GATE — V1.1

| Weight | Questions |
|---|---|
| 45 Logic/causality | When/where can everybody physically be? How did evidence become available? Can antagonist know this? Is rescue/escape credible? Does last reveal follow prior checkpoints? |
| 20 Continuity | names, vehicle, props, passage of time, ownership, knowledge limits, evidence chain, canon consistency |
| 20 American English | true spelling, awkward collocations, punctuation, pronouns, run-on text, misquoted dialogue, TTS readability |
| 10 Tension/uniqueness | 8 distinct hooks, protagonist agency, setup-payoff timing, story voices and endings; no repeated stock twist |
| 5 Packaging | exact title, N STORY headings, UTF-8 LF, per-stage and full-script SHA/count manifest, runtime estimate labeled |

### Audit severity (severity must change outcome)
CRITICAL = impossible timeline/geometry or fundamentally broken causal premise.
MAJOR = evidence needed for climax absent/contradictory, source-of-knowledge impossible, material continuity conflict.
MINOR = local grammar, unsupported but non-central assumption, small fixable inconsistency.
NOTE = style request, non-essential optional detail; do NOT consume a one-pass repair just because of NOTE.

### Initial issues ledger (exact keys)
```json
{"source_sha256":"<source sha>","video_id":"<identity>","repair_count":0,"issues":[{"id":"H001","severity":"MAJOR","story":4,"anchor":"exact unique quote from source","problem":"why it matters","change_scope":"minimal replacement only","acceptance_test":"observation needed after replacement"}]}
```
Anchor must be a unique substring in source and inside specified story. Do not cite a paraphrase as anchor. Avoid repairing passages marked only NOTE without permission.

### Required final machine gate
```json
{"video_id":"<identity>","current_script_sha256":"<exact SHA of approved current script>","repair_count":1,"score":98,"unresolved_critical_or_major":0,"material_language_issues":0,"verified_issue_ids":["H001"],"final_qa_ready":true,"release_gate":"READY"}
```
No-repair baseline gate uses repair_count 0 and empty verified IDs. Postrepair must contain every issue ID from baseline ledger, if acceptance tests pass; any failed acceptance -> `BLOCK_RELEASE`, not a second repair. A final score is qualitative review, not proof of literary success.

Recommended report: identity; source and checked SHA; mechanical counts; eight story rows with specific quote/evidence and local defect severity; issue list; 5 weighted score reasons; original vs revised scope diff proof; final state; caveats of unverified subjective detail. Run verifier every time instead of copying old counts.

# QA REPORT TEMPLATE

```
# MEXICO SCRIPT QA — INITIAL or VERIFY
CHANNEL_KEY: MEXICO_RURAL_CLASSIC
VIDEO_ID: <...>
FINAL_TITLE: <...>
SOURCE_SCRIPT: <...>
SCRIPT_SHA256: <...>
WORDS_BODY: <actual>
PARTS_FOUND: 1..7
PHASE: INITIAL | VERIFY
REPAIR_COUNT: 0 | 1

SCORECARD:
- Logic: earned/30
- Canon/Continuity: earned/22
- Spanish Orthography: earned/22
- Title/Payoff: earned/12
- Historical: earned/8
- Technical: earned/6
FINAL_QA_SCORE: xx/100

STRENGTHS_TO_PRESERVE: [scene anchors]
FINDINGS: ID | sev | part | exact quote | cause | proposed action | acceptance test
SPELLING_REPORT: typos grouped by Part, accent/agreement/punctuation
LOGIC_GRAPH_NOTES: timeline + known secrets + evidence chain
REGRESSION (VERIFY only): list fixed / introduced / unchanged
SCRIPT_READY: TRUE/FALSE
PASS_FOR_PRODUCTION: TRUE/FALSE
NEXT: step5 ONE_REPAIR (INITIAL not ready) | step6 (READY) | MANUAL_REVIEW_REQUIRED (VERIFY not ready)
```

JSON report mirrors these values; `script_sha256` is exact byte hash, `phase` matches state, and score reconciles with six categories. QA excludes stylistic beautification not tied to errors from automatic repair ledger.

V1.1: `QA_REPORT.json` INITIAL must preserve exact current-script anchor in each finding. If one causal fix needs a second paragraph in another Part, include optional `related_anchors: [{"part": n, "anchor": "exact existing source phrase"}]` inside INITIAL finding before `check-qa`. VERIFY READY must include `resolved_initial_findings: ["L01", "S01", ...]` containing all frozen INITIAL finding IDs, and any residual current findings must remain `OPEN` or `WARNING`, not `FIXED`. The model does not perform any story rewrite in QA.

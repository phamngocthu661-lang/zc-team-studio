# QA OUTPUTS / JSON CHECKPOINT SCHEMA GUIDANCE

## Report outline
`VIDEO_ID`, `LOCKED_TITLE`, outline SHA, source path + file/body SHA, heading sequence, exact body chars + range gate, `3-PASS REVIEW STATUS`, 7×24 coverage count, `EARLY RETENTION` char markers, `CHARACTER/PROPERTY/MONEY/KNOWLEDGE` forensic notes, `SCORING 10 CATEGORIES`, `ACTIONABLE PXX`, `NON_ACTIONABLE MINOR`, `STRONG SPANS`, `HARD GATES`, `SATURATION`, `PUBLICATION_READINESS`, `QA_FROZEN hash` / `REPAIR CONTRACT hash`.

## qa_checkpoint JSON facts
`qa_checkpoint.py init` writes comprehensive checkpoint with `stages`, `coverage`, `defects`, `strong_spans`, `minor_observations`, `saturation_passes`, `rubric`, `hard_gates`. Reviewer must fill source-based details, not merely execute tool.

Each `stages[stage]` requires `{done:true,evidence:"actual span/what was examined"}`. Each of 168 `coverage["Part N"][dimension]` requires `{status:"PASS"|"PATCH",evidence:"specific observation",patch_ids:[]}`; on PATCH include frozen Pxx IDs.

Sample Pxx structure (use real source anchor):
```
{"id":"P01","severity":"P1","part":"Part 4","anchor":"<EXACT QUOTED PROSE>",
 "problem":"narrrator claims ownership before acquiring evidence",
 "repair":"show dated deed access and notarial source without invented immediate ruling",
 "zone":"scene 4b speech and immediate reaction","length_intent":"KEEP",
 "rubric_category":"Legal / Historical / Authority / Professional","deduction":2,
 "root_cause":"author conflated payment with ownership","viewer_impact":"breaks credibility",
 "classification":"LEGAL","owning_step":"Writer",
 "acceptance_tests":["must show how official copy is lawfully requested","no instant eviction"],
 "dependencies":[],"occurrences":[{"anchor":"<EXACT QUOTED PROSE>","action":"replace this claim"}]}
```
Do not use the literal placeholder snippet in real checkpoint. Hard gates need `PASS|FAIL` and authentic evidence. Saturation pass needs current body SHA, `complete:true`, nonempty credible evidence, `new_defect_ids:[]` for last run.

## Ready vs blocked
If audit incomplete: output checkpoint path + remaining cells, NOT a fake numeric READY. If audit complete but Pxx remains: freeze NOT READY, then optionally freeze QA zones, request step5. If complete and no Pxx and score>=98: frozen READY and request step6. QA is READ ONLY; it does not write patches.

## V1.3 EDITORIAL SIDECAR (NOT IN FROZEN QA JSON)
Report `TECHNICAL_QA`, `DRAMA_QUALITY_V1_3` and `FAMILY_DNA_QA` separately, with actual source SHA, 7 Part state deltas, 2 antagonist counter-moves, 3 distinct pressures, repeated-scenes audit, es-MX oral problems, earned P6 and P7 costs and Pxx anchors. Required editorial failures generate Pxx in preexisting categories and block READY; do not claim structural `qa_checkpoint.py` has performed literary review. Sidecar is a distinct markdown report.

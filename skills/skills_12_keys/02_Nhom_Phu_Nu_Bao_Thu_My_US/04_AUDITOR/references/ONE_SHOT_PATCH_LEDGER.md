# FROZEN QA → ONE-SHOT PATCH CONTRACT

QA produces actual persisted checkpoint/freeze, not a hypothetical table. Each defect requires exact original substring anchor in specific Part, severity P0..P3, actionable explanation, `owning_step`, `root_cause`, `viewer_impact`, one or more `acceptance_tests`, and categorized point deductions. Strong spans are protected.

`QA_ZONE_SPEC.json` exact:
```
{"zones":[{"zone_id":"Z001","start_byte":1234,"end_byte":1379,"patch_ids":["P01"]}]}
```
Offsets are half-open over **actual baseline UTF-8 bytes**; calculate from file rather than approximate with character indices. One zone cannot cross a Part heading. Must contain exact quoted QA anchor and avoid strong spans. One `REPAIR_CONTRACT.json` frozen on that baseline hash; one `REPLACEMENTS.json` from Writer Step5; one `WRV_<video_id>_REPAIR_USED.json` marker. Regenerate neither freeze nor contract from a different baseline to create a second pass.

QA command examples:
```
python scripts/qa_checkpoint.py init WORKDIR/FULL.txt --title 'LOCKED TITLE' --outline-file WORKDIR/CURRENT_FINAL_OUTLINE.txt --out WORKDIR/QA_CHECKPOINT.json
python scripts/qa_checkpoint.py inspect WORKDIR/QA_CHECKPOINT.json
python scripts/qa_checkpoint.py freeze WORKDIR/QA_CHECKPOINT.json --out WORKDIR/QA_FROZEN.json
python scripts/freeze_repair_contract.py --baseline WORKDIR/FULL.txt --frozen WORKDIR/QA_FROZEN.json --zones WORKDIR/QA_ZONE_SPEC.json --outline-file WORKDIR/CURRENT_FINAL_OUTLINE.txt --out WORKDIR/REPAIR_CONTRACT.json
```
These commands validate evidence structure/provenance, not story correctness; reviewer fills actual source-backed fields.

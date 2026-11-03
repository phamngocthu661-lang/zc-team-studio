# QA REVIEW FORMS / ONE-REPAIR POLICY

## Minimal valid baseline review JSON
```
{
 "repair_round":0,
 "score":96,
 "hard_gate_pass":true,
 "independent_full_read_confirmed":true,
 "findings":[{"id":"P01","part":"Part 2","classification":"NAME","anchor":"Luis abrió la carta.","problem":"Character Luis is later called Lucho without established nickname","acceptance_tests":["same full name across all scenes"],"length_intent":"KEEP"}],
 "strong_span_ledger":[{"anchor":"Nunca me dio miedo envejecer. Me dio miedo que mi hijo lo celebrara."}],
 "reviewer_evidence":[{"part":"Part 1","logic":"...","es_mx":"..."}]
}
```
Sample is syntactic illustration only; all anchors MUST exist verbatim in actual script. If no defects, findings=[] and a source-backed score may pass; success isn't automatic.

## QA zone spec JSON
`{"zones":[{"zone_id":"Z001","start_byte":1234,"end_byte":1260,"patch_ids":["P01"]}]}`. Byte offsets are from ORIGINAL UTF-8 source, not Python character indices. Zone must include exact anchor substring; scopes may not cross `[PART N]` heading boundaries or protected strong spans. Every Pxx must be covered. Zone creation is an editorial action; a tool can verify offsets but cannot infer ideal boundaries.

## After Step5
Postrepair review includes `repair_round:1`. Run `python freeze_qa.py --script FULL_SCRIPT_REVISED.txt --outline-file CURRENT_FINAL_OUTLINE.txt --title "..." --review REVIEW_AFTER.json --repair-proof REPAIR_PROOF.json --baseline ORIGINAL_FULL_SCRIPT.txt --contract REPAIR_CONTRACT.json --baseline-frozen QA_FROZEN_BASELINE.json --out QA_FROZEN_AFTER.json`.
No next Step5 if it fails. Mark source as needing a new VIDEO VERSION. Be transparent that one correction cannot guarantee zero errors.

## Extra adversarial checks
Watch for source es-ES leakage: `vosotros`, `os habéis`, `euro`, `la Primitiva`, `Burgos`, `Salamanca`, `mesón`, non-local medical/payment assumptions. Do not blanket-ban a Spanish city if a character plausibly traveled there; inspect each context. Test family's legal access and rights, and that retaliation is proportionate and non-abusive. For legal specifics require research with sources before stating hard certainty.


## V1.1: Schema changes (MANDATORY for new QA)
See `QA_REVIEW_V11_SCHEMA.json` in this same directory. New checks are evidence anchors in each Part, full numerical rubric matching sum and ages/flashback ledgers. A legacy review will be rejected rather than silently grandfathered into READY. Use real source quotations, do not use example text.

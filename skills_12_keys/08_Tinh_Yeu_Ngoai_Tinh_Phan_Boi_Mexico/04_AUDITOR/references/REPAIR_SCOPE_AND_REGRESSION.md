# ONE-CYCLE AUDIT / REPAIR SCOPE / REGRESSION

## QA -> Writer immutable contract
Each frozen issue targets one byte interval `[start,end)` from original UTF-8 baseline. The `old_text` is copied exactly from that interval, unique and anchored under stated `[PART N]`. No protected span may intersect, fully or partially, with any edit interval. Overlap test: intervals [a,b), [c,d) overlap iff `max(a,c) < min(b,d)`. Two edit intervals must also be disjoint. Tool computes intervals, SHA of baseline, old anchors and protected spans.

Writer must create exactly one replacement per issue and apply in ONE atomic invocation. Utility must verify source SHA; error if second apply attempt using same proof/output, and never patch any other bytes. For accents/typos, short edit interval is ideal; for logic, include adjacent sentence(s) only when necessary.

## S4B real verification
1. `repair-verify` checks source/proof hash and recalculates exact revised bytes from frozen intervals + replacement text.
2. Independently reread revised full story and verify every Pxx in original frozen list; compare canon, names, ages, money, evidence, time, emotional POV.
3. Scan newly edited transitions for artifacts, duplicated sentence, missing space/punctuation and introduced knowledge leak.
4. Report baseline miss and regression truthfully; do NOT authorize auto S5 second time.

## Status states
- `READY` if original source READY no patch (`repair_count=0`) or final revised READY after 1 pass.
- `BLOCKED_MANUAL_DECISION` if still broken; user must decide separately whether to accept an explicitly new editorial version or change scope, not implicit loops.
- `INVALID_PROOF` if bytes differ, source missing, protected span edited, script length fails or QA source hash mismatch. Cannot SEO.

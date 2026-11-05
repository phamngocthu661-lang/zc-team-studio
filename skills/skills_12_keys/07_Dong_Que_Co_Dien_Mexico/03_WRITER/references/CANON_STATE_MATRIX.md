# CANON_STATE_MATRIX — handoff A→B→C and repair

Create one sidecar record `CANON_STATE.md` after each stage. Do not embed in spoken manuscript.

| Variable | Initial | End P2 (A) | End P5 (B) | End P7 (C) |
|---|---|---|---|---|
| Main character physical condition | ... | ... | ... | ... |
| Child roster / care arrangements | ... | ... | ... | ... |
| Land/debt/document ownership | ... | ... | ... | ... |
| Money / food / water stocks | ... | ... | ... | ... |
| Trust / promises | ... | ... | ... | ... |
| Villain motive and current plan | ... | ... | ... | ... |
| Secret knowledge by character | ... | ... | ... | ... |
| Object chain of custody | ... | ... | ... | ... |
| Elapsed days / season | ... | ... | ... | ... |
| Planted evidence / payoff open | ... | ... | ... | ... |

Every scene should be expressible as a **state transition**: `before → event → after`. If the script has an unexplained state jump, correct during draft before saving final; after QA, only ONE authorized repair batch permitted.

## Repair log template

```
VIDEO_ID: ...
SOURCE_SHA256: ...
REVISED_SHA256: ...
REPAIR_COUNT: 1
SCOPE: Logic, canon, spelling and linked local transitions only
FINDING L01: Part X, exact anchor ..., original excerpt ..., revised excerpt ..., acceptance PASS
FINDING S02: Part Y, spelling ..., corrected ..., acceptance PASS
REGRESSION_PREVENTION: no other scenes changed / list all dependent spans changed
```

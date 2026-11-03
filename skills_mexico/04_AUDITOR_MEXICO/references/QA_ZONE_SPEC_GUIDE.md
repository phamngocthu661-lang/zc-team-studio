# QA-OWNED BYTE ZONES / REPAIR CONTRACT

Only for frozen NOT READY with actionable Pxx. Editor identifies exact `start_byte` inclusive, `end_byte` exclusive on the **baseline UTF-8 bytes**; boundaries must not split a multi-byte accent character. Zones must be nonoverlapping, correspond to exact problematic spans and include only text that must change. Never include `[PART N]` headings or protected strong-span anchors.

`QA_ZONES.json`:
```
{"zones":[
 {"zone_id":"Z001","patch_ids":["P01"],"start_byte":12345,"end_byte":12678}
]}
```
Example byte numbers are illustrative only and MUST be replaced by real offsets from source. `freeze_repair_contract.py --baseline ... --frozen ... --zones ... --outline-file ... --out ...` verifies frozen source, identity, UTF-8, permissions and full coverage of patches. It must run before Step5. User approval of frozen ledger comes next. No source editing or replacement prose in QA.

A Pxx that affects two noncontiguous occurrences may use multiple zones with same patch_id, but the contract must account for all frozen IDs. A proposed fix requiring changing 80% of the script should be escalated to outline/title rather than hidden as one giant zone. Never guess offsets from character positions: byte offsets differ for accented Spanish Unicode.

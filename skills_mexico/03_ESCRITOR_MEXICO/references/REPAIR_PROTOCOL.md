# STEP5 — WRITER QA-SCOPED REPAIR

Precondition: exact baseline full UTF-8 file; QA frozen `NOT READY`; QA-owned `QA_REPAIR_CONTRACT` with `zones` byte coordinates, linked `Pxx` and protected anchors; same locked title/outline; explicit user approval for entire frozen Pxx list. If user approves subset or asks broad rewrite, return QA for new scoped contract, not a freestyle edit.

1. Load source and exact zone originals; understand root cause, impacted occurrences and objective acceptance tests.
2. Draft each replacement in *es-MX literary prose* preserving characters, pronouns and temporal/financial logic. It may bridge a gap but not remove protected setup outside authorized zones.
3. Create `REPLACEMENTS.json` with schema `MEXICO_FAMILY_REPAIR_REPLACEMENTS_V12` and `replacements:[{"zone_id":"Z001","text":"..."}]`; all and only zones, no omissions/duplication.
4. Run `apply_authorized_patches.py --baseline BASELINE --frozen QA_FROZEN --contract QA_REPAIR_CONTRACT --outline-file OUTLINE --replacements REPLACEMENTS --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json --user-approved`.
5. Examine exit JSON for `untouched_spans_byte_exact:true` and full 70k–80k proof, stable heading sequence and new SHA. Each revision should be a new version, not overwrite original full script.
6. Writer can assert script technically valid, never QA score. Require a NEW Step4 on exact revision bytes. The old READY or old frozen cannot bless a later revision.

Scope notes: changes to an exact byte zone might shift later byte offsets; tool applies windows safely against original bytes. Never manually edit through word processor that rewrites line endings or normalizes accents. A script tool proof establishes byte preservation, not grammar or emotional quality of replacements.

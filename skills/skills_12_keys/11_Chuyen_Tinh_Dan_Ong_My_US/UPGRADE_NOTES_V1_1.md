# CHANGELOG V1.0 → V1.1 — US MALE POV MATURE ROMANCE

## Compatible, no step renumbering
Same FIVE `SKILL.md` folders; all original controller/handoff aliases stay intact. Update version number in each skill; replace shared contract and controller together to avoid mixed policies. Previously generated scripts/Step 1 titles are not silently modified.

## Core changes prompted by actual USM-002 test
1. Fix **broken QA verifier ↔ ledger schema mismatch**: supports `source_excerpt` OR UTF-8 byte-offset patch; fails closed on ambiguous excerpts and unauthorized edits, enforces 0-or-1 rounds and exact source SHA.
2. Fix **canonical word-count drift**: every Step now uses `len(text.split())`, same as test-run handoff; `verify_script.py` reports explicit method and real file SHA.
3. Fix **stale final Part artifact risk**: Step 4 must create final `part1..7.txt` AFTER applying approved repair; Step 5 release gate blocks if any differ from final manuscript.
4. Add **bundle verifier**: checks hashes, complete titles/aliases, 7-part byte reconstruction, metadata, QA, two support titles, basic SEO and generated script integrity.
5. Add **retention/chemistry upgrades**: specific romantic tension and visible behavior, differentiated dialogue, emotional risk, less moral-summary padding and therapist-like interactions; still grounded mature adult romance and one coherent POV.
6. Clarify **part word limits are SOFT** vs overall hard length. Report overruns as warnings rather than invented gate PASS/FAIL.
7. QA report must contain literal `LOCKED_TITLE` and patch ledger must be valid even if no edits.
8. Preserve **MAX_REPAIR_ROUNDS=1**, no hidden second patch or automatic version reset.
9. Require each SEO thumbnail concept to include scene evidence (Part/scene, exact place/props/action), catching the USM-002 secondary-prompt Colorado/New Mexico mismatch.

## Breaking behavior by design
Old run packages with draft `partN.txt`, missing QA literal title or unverified byte ledgers now FAIL release gate. This is a **validation improvement**, not a backward-incompatible folder rename. Canonical published script text stays untouched during verification.

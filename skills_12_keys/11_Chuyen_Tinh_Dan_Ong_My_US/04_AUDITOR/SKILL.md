---
name: us-male-romance-script-qa-one-repair
version: "1.1"
language: "vi"
description: "STEP 4: forensic logic/US spelling audit with one consolidated repair and strict byte/part synchronization verification."
---
# STEP 4 — ONE QA REVIEW, AT MOST ONE EDITING ROUND
Read `../00_SHARED/SHARED_PRODUCTION_CONTRACT.md`, `references/ONE_PASS_AUDIT.md`.

Input the ACTUAL `final_script_draft.txt`, lock title and outline, part boundaries and SHA. Never audit from summary. First pass: full-story causality, maps, chronology, character ages and history, work safety, consent, title payoff. Second pass: US spelling, punctuation, grammar, TTS, dialogue speaker confusion, unsupported objects/locations and natural idiom. Detect repetitive didactic passages that threaten romance, but do NOT spend user's one correction round polishing subjective style at expense of concrete defects. Log exact source snippets and all dependent edits before applying anything.

**ONE-ROUND HARD RULE:** If no errors, use source verbatim and `REPAIR_ROUNDS_USED=0`; else build one batch of one or more non-overlapping patches and apply ONCE, `REPAIR_ROUNDS_USED=1`. All edits must be in `patch_ledger.json` with original source SHA, exact source_excerpt (one unique occurrence) OR byte start/end/original, replacement, severity, reason; verify on real bytes with `scripts/verify_one_repair.py`. Do not re-run editor/auto-rewrite after the verified candidate. If verifier fails due to ledger mechanics, fix ledger metadata/offsets WITHOUT editing script again; if candidate itself fails, status QA_FAIL_NEEDS_HUMAN, no second rewrite.

Read-only final verification: no P0/P1/unambiguous P2 left, global length gate with `verify_script.py`, accurate names/ages/time/payoff, objective diff gate and romance credibility. Then reconstruct `manuscript_with_parts.txt` and all `partN.txt` from **FINAL** using locked draft Part boundaries adjusted for the patch; verify exact concatenation and part agreement using `verify_bundle.py` after Step5 artifacts exist. If patch crosses a boundary, redefine derived boundaries deterministically without changing final narrative. Original `partN_draft.txt` may remain as archival draft, never presented as final.

Score subjective 35 logic +25 language +15 agency +15 alignment +10 TTS (>=97 AND all material defects closed); do not claim '98 = proven retention'. If tools unavailable set `QA_PENDING_VERIFICATION`; don't claim hash/word counts/unauthorized_diffs verified. `STEP5_HANDOFF` only when actual final passes. Output `qa_report.md` (include verbatim locked title), `patch_ledger.json`, `final_script.txt`, final 7-part manuscript and seven `partN.txt`, `REPAIR_ROUNDS_USED`, final SHA/word method and `QA_STATUS`. No second edit round and no automatic version reset.

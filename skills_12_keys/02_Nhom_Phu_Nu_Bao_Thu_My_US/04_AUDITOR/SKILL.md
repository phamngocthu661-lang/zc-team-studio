---
name: wrv-us-forensic-qa-audit-only
version: 1.1.0
description: "Independent Step4 audit and final postrepair audit; prioritizes story logic, timeline, military/financial plausibility, spelling; freezes one repair contract; never changes script."
---
# STEP 4 — QA ONLY (FIRST AUDIT / FINAL VERDICT)

Read `references/QA_LOGIC_SPELLING_PROTOCOL.md`, `references/ONE_SHOT_PATCH_LEDGER.md`, cross-skill contract. Do not write/rewrite story passages, even if user asks to 'check then fix' in one step. One repair is owned by Writer Step5, not QA. The QA tool confirms provenance and evidence fields but cannot itself judge story quality. Reviewer must genuinely read all seven Parts.

1. Verify exact FULL script, original outline, title, DNA, headings, 70–80k character body, actual SHA and identity; create checkpoint with `scripts/qa_checkpoint.py init FULL_SCRIPT.txt --outline-file CURRENT_FINAL_OUTLINE.txt --title 'LOCKED TITLE' --out QA_CHECKPOINT.json`.
2. **Pass #1** whole-story logic: causality, villain motive, narratorial knowledge, choice/consequence. **Pass #2** exact line-by-line: timeline, numbers, money, legal authority, rank/command, legal asset control, continuity, names/pronouns, spelling/US English, punctuation, repeated/garbled lines. **Pass #3** reverse end→begin to verify every evidence reveal existed and every protagonist action within power. Track concrete citations/quote anchor for every issue.
3. Complete all 7×24 matrix cells with source-tied evidence; final zero-new finding saturation and rubric. Prioritize LOGIC and TYPO rather than literary polish. Tag P0 fatal, P1 high, P2 correctable, P3 minor. If factual issue is uncertain, mark CHECK/NOT READY; do not invent legal certainty.
4. Final score 100 rubric includes causality, timeline, legal/finance/command/physical, clue setup/payoff, retention, prose/TTS, spelling, emotional ending. `READY`: ≥98, hard gates all PASS, valid length, zero unresolved actionable defects. Non-actionable polish notes may account for at most 2 points (98/99 READY), with exact source anchor and a reason why no repair is needed; real logic/typo defects must remain actionable Pxx. Score and proof are from full actual audit, never assumed.
5. Initial NOT READY: freeze `QA_FROZEN.json` and human-authored exact `QA_ZONE_SPEC.json`, generate `REPAIR_CONTRACT.json` by `scripts/freeze_repair_contract.py`. Zones must be small, anchored and nonoverlapping; don't edit headings/protected strong quotes. Return prioritized Pxx ledger with exact error quote, causal impact and fix acceptance test, **not** rewritten paragraphs.
6. After successful **one Step5**, final Step4 is read-only verdict on exact revised script hash. If NOT READY after repair, BLOCK SEO and never offer a second repair. If READY, permit Step6 with most recent frozen QA. Both are valid QA outcomes.

No fictitious `FINAL_SCORE`, no pretending machine checking equates to substantive review. Validate spelling and language style using human review, not a hash tool.

## V1.1 extra independent evaluation (no additional repair)
Read `references/INDEPENDENT_EDITORIAL_SIGNAL_V11.md` and `references/US_SOURCE_BACKED_REALISM_V11.md`. Keep QA frozen JSON schema, scoring and one-round lock unchanged. Include a separate `STORY_EFFECTIVENESS_SIGNAL.md` with source-anchored editorial findings; do not fold it into the numeric forensic score, promise audience metrics, or permit another rewrite. Verify the outcome-determining legal remedy and named evidence owner, prioritizing real logic, identity/timeline and spelling errors.

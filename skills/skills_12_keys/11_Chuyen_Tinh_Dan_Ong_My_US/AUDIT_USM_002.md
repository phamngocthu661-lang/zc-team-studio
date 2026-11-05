# AUDIT OF FIRST PRODUCTION RUN: USM-002 (as uploaded 2026-11-01)

## Overall decision
**RELEASE GATE: FAIL** because `part3.txt` remained the pre-edit draft and `qa_report.md` does not contain the literal locked title required for complete cross-step audit; QA's claim of an executable diff check was unsupported by original V1.0 verifier. Core final narration itself is complete; no evidence of unauthorized draft-to-final text changes after independent V1.1 reconstruction. The user's ZIP is NOT modified by this Skill upgrade.

## Objective checks from real uploaded files
- Project ID `USM-002`; locked title `My Flight Was Canceled—Then She Said, “There's One Seat Left in My Car.”` in Step 1, Step 2, JSON handoff and SEO. QA report contains only project ID, not verbatim title.
- `final_script.txt`: **8,061** English whitespace tokens, **46,231 bytes**, SHA-256 `fcf6a28e1fbef855698e6534e1741894c643dce818ae3a0300b5373f796e23a1`. Actual TTS file has no Part headings/bracket cues.
- Old V1.0 `verify_script.py` returned 8,073 words because regex differs from stated whitespace count; V1.1 returns canonical 8,061 and clean TTS gate PASS.
- V1.0 `verify_one_repair.py` crashed with `KeyError: 'start'` on actual `patch_ledger.json`. V1.1 verified ONE exact P2 patch, source SHA `2da1a69165e7ff22ff4d3c75e4ebddd17b1042fa6580bfe9c53751119542341f`, candidate SHA matches final, **zero unauthorized differences**. Byte range 16475–16598 in original UTF-8 source was replaced with 120 bytes.
- `manuscript_with_parts.txt` reconstructs final script exactly, all seven part markers present. But `part3.txt` retains old 'toll-free visitor desk' sentence; its body does NOT match manuscript Part 3. Six other part files match.
- Actual 7 Part draft word counts: [936,1059,1209,1344,1113,1029,1372], sum 8062. The overall global target (6,700–8,100) is met; outline's SOFT per-Part target was exceeded in 3, 4, 7. Mark Part-budget warnings, not global failure.
- Step 4 snapshot metrics say SEO `NOT_READY`, final handoff says SEO `SEO_READY`—normal if the file is labeled a Step 4 snapshot; add a stage timestamp/label in future to avoid confusion.

## Editorial assessment (qualitative, not an automated score)
- Strengths: title quote paid off in early scene; coherent Denver–Santa Fe road journey; distinct work/family commitments; female lead has independent ambitions; later work cancellation creates earned consequence; mature consent and honest apologies; ending echoes the initial empty seat.
- Risks: the center spends substantial time on deliberate dialogue about budgets, listening, support and responsibility. Romance/chemistry is credible but occasionally less emotionally magnetic than stronger curiosity-driven story hooks. Repetitive reflective takeaways weaken late retention. This does not, by itself, make the plot invalid. No source transcripts or audience retention metrics exist to confirm viral parity.
- QA score **98/100** is the run's editorial self-rating; it is not independently measurable from metadata alone. One patch does not establish zero possible stylistic defects. Recheck editorially before publication and do not conflate with CTR.
- SEO metadata includes two supporting titles, 7 hashtags, 20 tags, three thumbnail options, an adult/grounded primary image and an 8-second hook. **Additional manual SEO mismatch:** `thumbnail_prompts.txt` describes THUMBNAIL B at a "New Mexico afternoon" rest stop, while the corresponding picnic-table rehearsal occurs just before Trinidad in Colorado. This candidate needs location correction before use; SELECTED THUMBNAIL A still matches the title. Final render must undergo image QA.

## V1.1 fixes
(1) Unified whitespace counter; (2) compatible excerpt/byte-ledger one-round verifier; (3) entire bundle consistency gate and explicit derived-part sync requirement; (4) mandatory title in QA report; (5) easier-to-follow editorial hook/romantic tension requirements while preserving adult agency; (6) soft-versus-hard budget distinction; (7) actual SHA/word/SEO-ready release gate; (8) automated regression suite.

## Re-run recommendation
For next production: use V1.1 five steps. For THIS run, do not re-edit the script just to repair packaging: update derived `part3.txt` from verified `manuscript_with_parts.txt` and append locked title to QA report; rerun `verify_bundle.py` and obtain a separate human narrative review before declaring fully publish-ready. Since the story's verified final text remains unchanged, repair-round count stays **1**; syncing packaging is not another script revision.

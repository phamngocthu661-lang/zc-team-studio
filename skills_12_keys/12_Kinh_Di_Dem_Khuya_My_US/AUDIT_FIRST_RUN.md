# FIRST-RUN INDEPENDENT AUDIT — HIGHWAY REST STOP — 2026-11-01

**Input:** `12-Highway_Rest_Stop_All_STEPS.zip` (25 files). **Compared to:** `US_MIDNIGHT_HORROR_V1_FULL_BUNDLE.zip`. **Finding:** Conditional narrative acceptability; NOT VERIFIED for production release under the upgraded integrity gate. DO NOT execute STEP5 for this same video again.

## Mechanical checks actually performed on stored bytes

| Check | Actual evidence | Finding |
|---|---|---|
| Number of chapters | STORY 1..STORY 8 in correct order in original/revised | PASS |
| Narrative scope | 8 different roles/regions (PA, OH, NE, TN, OR, NM, VA, ME); multiple DNA modes | PASS structure; quality subjective |
| Original SHA | `e9d0e3e9f057580af10ecab2219a0b047161463e028bbaf44865c819cf1b1bc8` | MATCH |
| Revised SHA | `3f58cac9c1d842f5b76e10ca14d46f90139ca2696c65cbb50c69ba05a2f47cd8` | MATCH |
| Title/outline/video ID | Title SHA cfc2475e648a; outline SHA 90b8c01f...; video ID 4cf547a03148d17a | MATCH |
| Stage A+B+C merge | Exact stage bytes merged with one `\n` separator | PASS |
| Original BODY | 77,803 codepoints and 14,298 whitespace-split words | PASS |
| Revised BODY | **78,006 codepoints, 14,340 words** | PASS hard 60k–83k; soft target >78,000 by 6 chars |
| V1 revised manifest | Still 77,803 chars / 14,298 words and old story breakdown | **FAIL — STALE revised metadata** |
| ONE-PASS repair | 3 approved exact replacements in STORIES 4 and 7, source outside spans preserved | PASS proof by reconstruction |
| Audit-to-release gate | Human readable FINAL_QA_REPORT.md claims 98/100 READY, but no machine-readable FINAL_QA_GATE.json | **FAIL — insufficient current-SHA attestation under V1.1** |
| Runtime | 14,340 / 145 = 98.9 minutes | Plausible mathematical estimate, NOT audio-rendered runtime |
| SEO/thumbnail | Current SHA in SEO, 3 visual options, original-fiction notice, no made-up chapter timestamps | PASS document presence/source alignment; SEO effectiveness unmeasured |

Story body lengths after revision: S1 10,703; S2 9,101; S3 9,286; S4 9,779; S5 9,264; S6 9,445; S7 9,384; S8 11,044. Stories 1 and 8 exceed the soft 10,500/story preference, not the hard 5,000 min. Targets are editorial, not absolute if pacing benefits.

## Editorial findings from comparison and structured reading

- **Strengths:** A readable anthology title and substantial original English narration; credible, distinct US locations and first-person POVs; stage and baseline hashes consistent; one scoped repair respected. The story mechanics are grounded (duplicate plate, restroom impostor, freight lot, covert note, service access, weather risk, targeted photo, winter guestbook); scripts avoid presenting fiction as verified reports.
- **Pacing/variety risk (MODERATE):** Authority response/police/dispatch dominates or appears in all eight story wrap-ups. This is realistic for safety but risks a repeated reveal/aftermath shape in a long audio anthology. Explicitly diversify story closing payoff and agency in future outlines; never make characters refuse realistic help only to satisfy this rule.
- **First QA severity risk (MODERATE):** Original report calls missing medical wristband and family-context details MAJOR because of canon. Both could be major if they are causally needed for the reveal; absence of a nonessential optional prop alone does not prove a narrative contradiction. V1.1 now requires editorial severity justification based on reader consequence. The third issue, unsupported car defroster explanation, is a clear local plausibility fix.
- **Step1 formatting risk (MINOR):** Title evaluation Markdown table embeds an unescaped `|` in candidate titles, resulting in incorrectly divided table cells. V1.1 title Skill now requires escaping the pipe or a non-table format.
- **QA score caveat:** V1 report says 94/100 baseline, 98/100 final; these are editorial scores, not independent measurable results. The source evidence confirms specific edits and integrity properties but cannot prove that all possible style/logic errors were caught.

## Why V1 declared READY prematurely
`SCRIPT_MANIFEST_REVISED.json` was a copy of the baseline count payload and did not update the source-specific `story_body_chars`, `spoken_words_estimate` and `story_lengths`. V1 `verify_script.py` exited nonzero only on STORY heading errors, so other hard discrepancies were not fatal. V1 repair helper did not itself regenerate the revised manifest. The final human-readable approval text was not bound to a machine-readable gate, making SEO possible despite inconsistent structured data.

## V1.1 controls and demonstrated tests
1. Actual source-bound project verifier checks identity, stage merge, body lengths and BOTH manifests; stale revised counts now produce clear hard FAIL.
2. One-pass repair tool reserves a per-project identity lock, validates source + story anchors, writes original-preserving patch proof and **recalculates** revised counts and per-story entries. Second invocation is rejected.
3. Final read-only QA must write `FINAL_QA_GATE.json` tied to latest SHA; SEO/release must run hard gate before publishing.
4. Smoke test and six independent fixture tests PASS. Replay of the original three QA replacements in a temporary copy of the first-run baseline produced the **exact same revised TXT SHA** while correctly generating 78,006/14,340 revised manifest. This confirms correction to future tooling; it does **not** constitute a second edit on the existing production video.

## Instructions for original Highway Rest Stop project
Do not run another STEP5. If needing to certify this original video using the new V1.1 schema, independently recalculate ONLY its existing `SCRIPT_MANIFEST_REVISED.json` counts from the already saved `FULL_SCRIPT_REVISED.txt`, preserve all script bytes, and perform a new READ-ONLY editorial final check. A validated read-only QA signoff can create the source-locked `FINAL_QA_GATE.json`; a historian may need to explicitly document legacy absence of `REPAIR_LOCK.json` rather than fabricate historical execution. Easiest safe path: leave this run archived as V1 with known metadata defect and use V1.1 for all new production videos. Never claim a V1.1 release PASS without fulfilling the new gate.

**Audit boundaries:** no YouTube audio render, CTR test, competitor transcript comparison, or verified fact check of each fictional detail. Source was the supplied output package; issues reported above are supported by its stored artifacts.

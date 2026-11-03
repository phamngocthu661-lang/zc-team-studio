# EXACT BODY COUNT + ARTIFACT PROOF LOCK — V1.0

This reference is a HARD ENFORCEMENT layer shared by Script and QA. It exists because a previous workflow allowed a long script to pass without counting the exact current body. That failure must never recur.

## 0A. V1.6.9 USER-APPROVED THREE-STAGE PERSIST-FIRST

The user-facing `step3` workflow comprises **three successive invocations of the same `step3` command**. Save/verifiably hash TXT segments A (Parts 1–2), B (3–5) and C (6–7), in `HML_<title_sha12>_SCRIPT_[ABC].txt`. Segments are PARTIAL DRAFTS and may have segment-specific measured counts; they are not obliged individually to pass the 70k–80k FULL SCRIPT length gate. After C, byte-concatenate the three hash-locked files into the complete UTF-8 manuscript, then verify **the actual full file** against exact 70k–80k body characters. Heading lines and line endings are removed for the body count and SHA-256; all other whitespace remains. Do not reuse old One-Shot or chat-only text as file proof.

## 1. EXACT BODY DEFINITION
The count target is the exact delivered UTF-8 TXT script body being audited, including spaces, punctuation and line breaks, excluding only agreed metadata outside the script body such as the writing-block fence/title metadata. `[PART X]` headings are excluded only if the current shared contract explicitly excludes them; the same rule must be applied consistently at creation and QA.

## 2. NO ESTIMATE / NO INHERITED COUNT
Forbidden:
- reusing a count from an older draft;
- estimating from word count;
- estimating from token count;
- inferring that a micro-patch kept the script in range;
- saying `approximately`, `about`, `likely`, `should still be`, or `unverified` and then continuing to PASS/READY;
- counting a summary, excerpt, patch list, or reconstructed memory instead of the exact current full body.

## 3. REQUIRED COUNT PROOF RECORD
Every full-script creation/revision must produce an internal `COUNT PROOF RECORD` immediately before final output:
- `ARTIFACT_ID` or stable current-body identifier;
- `BODY_SHA256`;
- `EXACT_CHAR_COUNT`;
- `EXACT_WORD_COUNT` telemetry;
- `COUNT_RULE`;
- `RANGE_TARGET`;
- `LENGTH_GATE = PASS/FAIL`;
- timestamp/version if available.

The SHA-256 must be calculated from the exact same normalized body used for the character count. Never hash/count one representation and output another.

## 4. SCRIPT OUTPUT BLOCKER
For the assembled final complete script (only after C and verified full-file materialization):
- `<70,000` => BLOCK FINAL/READY CLAIM;
- `70,000–80,000` inclusive => eligible to continue gates;
- `>80,000` => BLOCK FINAL/READY CLAIM.

If count proof cannot be produced, the COMPLETE script must not be presented as `FINAL SCRIPT`, `CURRENT FINAL SCRIPT`, `READY`, or equivalent. An incomplete/failed draft may not be labeled final; legitimate A/B/C segment handoff is permitted only with persisted verified segment files and manifest.

## 5. QA ENTRY BLOCKER
QA MUST begin by independently counting the exact current script artifact/body and verifying the body hash against the current baseline artifact when one exists.

If exact current-body count cannot be obtained, QA must STOP before rubric scoring and output:
`QA ABORTED — EXACT CURRENT-BODY LENGTH NOT VERIFIED`

Do not publish a numeric total score, READY/NEEDS PATCHES verdict, or frozen ledger until exact count is verified. This is the only exception to the general rule that QA normally always shows a numeric score: an unverifiable input is not a completed audit.

If the exact count is out of range, QA may continue diagnostic category analysis only after declaring `LENGTH HARD FAIL`, but:
- `PUBLICATION READINESS = FAIL`;
- the report must prominently show exact count and over/under amount;
- no wording may imply near-ready status;
- any revision ledger must include mandatory P0 length normalization.

## 6. QA HASH RULE
If a prior `CURRENT FINAL SCRIPT` artifact record exists:
- QA must audit the exact same body/hash;
- if hash differs, create a new baseline snapshot and count the new body before review;
- never attach an old count to a new body.

## 7. REVISION COMPARATOR
After revision:
1. construct exact revised full body;
2. compare immutable spans against baseline;
3. calculate new SHA-256;
4. exact-count revised body;
5. verify 70k–80k;
6. only then run final regression score/readiness.

## 8. USER-VISIBLE COUNT CERTIFICATE
For every full-script final delivery and every full-script QA result, include a compact certificate:
- `Exact characters: N`
- `Allowed range: 70,000–80,000`
- `Length gate: PASS/FAIL`
- `Body hash: <first 12 hex chars>`

Do not claim `exact` unless produced from the exact delivered/audited body.

## 9. FAIL-CLOSED PRINCIPLE
When evidence is missing, FAIL CLOSED.

**NO EXACT COUNT PROOF = NO FINAL SCRIPT.**
**NO EXACT CURRENT-BODY COUNT = NO QA SCORE.**
**OLD COUNT + NEW BODY = INVALID AUDIT.**

## 10. STAGED SEGMENT + FULL FILE CERTIFICATES

Each A/B/C certificate is tied to its own actual file SHA-256; these are PARTIAL and cannot be treated as full body proofs. The final full source is the **byte-level assembled** and read-back `HML_<title_sha12>_FULL_SCRIPT.txt`, certified by `scripts/verify_full_script.py` with the exact count and SHA-256; any subsequent modification invalidates proof. File integrity alone does not imply independent QA READY; that belongs to step4.

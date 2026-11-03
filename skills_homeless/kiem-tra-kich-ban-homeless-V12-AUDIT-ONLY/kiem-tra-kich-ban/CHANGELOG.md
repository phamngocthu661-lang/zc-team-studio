## v2.0.0 — HOMELESS V12 QA ONLY

- Removed QA MODE B authoring of script prose, transferred Step5 to Writer.
- Added detailed root cause/viewer impact/acceptance-test diagnosis, exact QA-owned byte-zone freeze utility, source hashes, and separated proposed learning feedback.
- Preserved evidence-first checkpoint, 7x24 matrix, reverse read, zero-new-defect saturation, fixed 100-point rubric and independent re-audit.
- Retained qa_checkpoint.py frozen artifact schema v1.8.1 for source-level interoperability; skill release version is v2.0.0.

---

## 1.8.1 — CHECKPOINT / RESUME (2026-10-21)

- MODE A: evidence-first persisted checkpoint, 7×24 coverage matrix, stage records, source-bound saturation sweeps.
- Bổ sung `scripts/qa_checkpoint.py` (init/inspect/freeze): independently count/hash current full script, validate frozen-source matches, missing evidence, patch anchors, deduction/rubric reconciliation, final zero-new-defect full saturation before freeze.
- QA chưa hoàn thành: lưu file checkpoint thật, tiếp tục bằng chính `step4` khi user yêu cầu; không có numeric score/READY/Frozen Patch Ledger tạm thời.
- Không thay đổi 100-point rubric, threshold ≥98/100, length 70–80k, immutable pass spans, MODE B approval gate, hoặc quy tắc all-hard-gates PASS.

# CHANGELOG

## 1.8.0 — EXACT-LENGTH FAIL-CLOSED ENFORCEMENT
- Added mandatory `EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`.
- QA must machine-count and hash the exact CURRENT FINAL SCRIPT before Read #1 or rubric scoring.
- Removed valid `LENGTH UNVERIFIED` completed-audit state. No exact current-body count = QA ABORTED, no numeric score, no ledger freeze.
- Old draft counts may never be inherited by a newer body.
- Out-of-range exact body = mandatory LENGTH HARD FAIL + P0 length normalization + Publication Readiness FAIL.
- Added user-visible count certificate requirement.

## 1.7.0
- Added One-Sweep Finality Lock and mandatory reverse dependency read.
- Added Coverage Matrix with zero blank-cell requirement.
- Added Zero-New-Defect Saturation Pass; ledger/score cannot freeze until a complete sweep finds zero new actionable defects.
- Closed moving-goalpost loophole: later pre-existing misses are Audit Integrity Misses and cannot cancel recovered patch points in the same cycle.
- Strengthened deterministic exact-copy revision and full-script consolidation.
- No automatic new patch cycle after regression re-audit.

# 1.6.0 — STRICT PATCH PRESERVATION + SCORE TRANSPARENCY

- Replaced internal LFxx late-fix expansion with a hard `IMMUTABLE PASS ZONE`: all baseline text outside user-approved Pxx/Oxx + pre-authorized dependencies must remain textually identical.
- Post-revision blind re-audit may discover new baseline defects, but they become report-only `NQxx`; they are scored and shown, not silently edited.
- TRUE REGRESSION may be repaired only as `REG(Pxx)` inside the originating approved scope; otherwise redesign/revert the patch.
- Added Exact Untouched-Span Comparator before delivery.
- Separated `PATCH EXECUTION` from `PUBLICATION READINESS`.
- Numeric baseline and post-revision scores are mandatory even when low or any hard gate fails.
- READY remains >=98 + all hard gates PASS; the skill may not chase 98 by changing unapproved text.
- Shared contract upgraded to V1.3 and synchronized with Outline V2.3.1 + Script V1.6.1.
- Added frozen `SCORE DEDUCTION LEDGER`: same unchanged defect keeps the same category/deduction across re-audits.
- Added `AUDIT_CORRECTED_BASELINE_SCORE` and `PATCH-CAUSED SCORE DELTA` so newly discovered old defects cannot create a false impression that the approved revision lowered quality.
- Hard-gate failure never suppresses numeric scoring; even a low/failing script must show its full score.

# 1.5.0 — RETENTION + LENGTH ARCHITECTURE UPDATE

- HARD FAIL outside 70k–80k; baseline normalization now expands undersized scripts functionally or compresses oversized scripts; added exact early-retention audit positions and retention-desert gate.
- Shared contract upgraded to V1.2.
- Older changelog length values below are historical only and are not current rules.

# V1.4.1 — AUTHORIZED LATE-FIX + READY STATUS SYNC
- Upgraded shared contract to V1.1.
- Resolved Authorized Diff vs mandatory blind-repair conflict with narrow internal `LFxx` authorization for PRE-EXISTING QA MISS / PATCH-EXPOSED defects and `REG(Pxx)` for true patch regressions.
- `LFxx` requires exact location, classification, minimal repair radius, dependencies, State Delta and Length Intent; it cannot authorize creative polish/rewrite.
- Fixed Mode A terminal status: READY + empty ledger now outputs `NO REWRITE REQUIRED`; only NEEDS PATCHES waits for rewrite.

# V1.4.0 — CROSS-SKILL SYNC + SCORE STABILITY
- Added identical CROSS_SKILL_QUALITY_CONTRACT used by Outline V2.2 and Script V1.5.
- Fixed QA rubric/weights across a script lineage using the original Script V1.4 story-quality weights unchanged; threshold remains >=98 and is not lowered.
- Added default <55k chars + <8k words delivery contract to match creation skills.
- Added KNOWN DEFECT UNIVERSE freeze and PRE-EXISTING QA MISS / PATCH-EXPOSED / TRUE REGRESSION classification.
- Added State Delta gate for money/animals/objects/legal status.
- Added Patch-Artifact gate to remove editor-facing meta/anachronistic repair residue.
- Revision may not output while score <98 or any actionable defect/hard gate remains.
- Added Monotonic Revision Delivery: revision output score must be >= max(98, frozen baseline score); audit misses are corrected as QA omissions, not blamed on revision.
- Strong-span preservation and one-shot exhaustive audit remain mandatory.

# CHANGELOG

## 1.3.0 — 2026-08-23
- Added MASTER BASELINE snapshot with exact character counts per Part and total before review/rewrite.
- Added `BASELINE_PRESERVATION_ONE_SHOT_PROTOCOL.md`.
- Added hard revision length stability: default 98–102% per unchanged Part and 99–101% total when no net cut is authorized, while respecting source hard caps.
- Added Authorized Diff Gate: every changed span must map to Pxx/Oxx or required dependency; otherwise revert.
- Surgical patch is now mandatory default; full-Part regeneration from memory is prohibited.
- `compress/tighten/reduce AI prose` is local-only unless every global occurrence is explicitly enumerated.
- Entire-Part rewrites must use scaffold reconstruction with MUST PRESERVE spans and a character-count target.
- Added patch repair-simulation/dependency closure before ledger freeze so the first review plans downstream effects in advance.
- Added Length Intent to Patch Ledger.
- Added one-shot finalizer: patch completeness → diff → length → dependency → logic → hook/retention/prose/YouTube → two blind reads before final output.
- Final blind audit findings must be repaired internally rather than deferred into repeated user-facing QA/rewrite cycles.

## 1.2.0 — 2026-08-23
- Added `REWRITE ENTIRE PART — REQUIRED` when local patches cannot fix structural logic/retention/voice problems.
- Added MUST PRESERVE strong-span/beat ledger so large rewrites cannot cut strong material.
- Added pre-rewrite Character Lock, Canon Lock, Voice/Audience Lock, Platform Lock, Strong-Span Lock and Hook Lock.
- Added spelling, grammar, punctuation, American-English consistency and proper-name sweep.
- Added default voice target: mature U.S. 40+ legendary/heritage storytelling, grounded rather than faux-archaic or trend-slang.
- Added dedicated hook audit as highest-priority retention zone.
- Added YouTube Community/advertiser-readiness layer; context-aware, no invented static banned-word list.
- Added post-rewrite publication sweep covering hook, retention, character consistency, language, audience fit and YouTube risk.


## 1.1.0 — 2026-08-23
- Mandatory two complete reads before publishing any review.
- Removed all arbitrary issue-count limits and “few but important patches” philosophy.
- P3 micro-fixes are now included when a careful human editor would actually change them.
- Added `DOUBLE_READ_EXHAUSTIVE_PROTOCOL.md`.
- Added occurrence enumeration: recurring issues must list every location requiring an edit.
- Root-cause grouping can no longer hide local edit locations.
- Added exact-detail omission sweep for ages, dates, prices, distances, times, labels, and callbacks.
- Rewrite mode must apply every approved occurrence, not just each root Patch ID.
- Revised script must undergo two full blind re-reads and continue repairing until no known actionable defect remains.
- Removed fixed internal full re-audit count.

## 1.0.0 — 2026-08-23
- Initial forensic review + frozen patch ledger + targeted rewrite + regression gate architecture.
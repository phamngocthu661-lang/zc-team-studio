---
name: kiem-tra-kich-ban-homeless
version: "2.0.0"
language: "vi"
display_name: "HOMELESS Independent Script QA — AUDIT ONLY"
description: "Step4 evidence-first independent seven-Part story forensic review, complete score/diagnostic, frozen patch ledger, exact QA-owned edit scopes, and post-repair independent QA. NEVER creates or edits manuscript prose."
---

# HOMELESS INDEPENDENT QA V12 / V2.0.0 — STEP4 ONLY

## 0. Scope — independent auditor, not story writer

**THIS SKILL MAY NOT AUTHOR, REPLACE, REWRITE OR EDIT ANY BYTE OF A STORY SCRIPT.** It may read, annotate evidence, measure, score, classify, freeze defective zones, export QA reports, record checkpoints, and propose lessons. It is **NOT** the owner of `step5`. Step5 is routed to `viet-kich-ban-homeless` Writer in `QA_SCOPED_REPAIR` mode.

Read `VERSION.txt`, this file and ALL mandatory:

- `references/CROSS_SKILL_QUALITY_CONTRACT.md` (V12 normative roles/rubric/length/identity);
- `references/QA_CHECKPOINT_RESUME_PROTOCOL.md`;
- `references/EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`;
- `references/DOUBLE_READ_EXHAUSTIVE_PROTOCOL.md`;
- `references/FORENSIC_REVIEW_ENGINE.md`;
- `references/LOGIC_CHECKLIST.md`;
- `references/HUMAN_PROSE_CHECKLIST.md`;
- `references/YOUTUBE_AUDIENCE_READINESS.md`;
- `references/PATCH_LEDGER_PROTOCOL.md`;
- `references/OUTPUT_TEMPLATES.md`;
- `references/QA_DIAGNOSTIC_REPORT_V12.md`;
- `references/QA_LESSON_PROMOTION_GUIDE_V12.md` when recording or incorporating lessons.

Old references about QA authoring MODE B revised prose are **removed from the active V12 QA ZIP**. Narrative replacement logic is deliberately owned by Writer; no routing path may make QA a repair author.

## 1. Input and preflight

Required: exact current 7-Part `FULL_SCRIPT.txt` OR exact verified `FULL_SCRIPT_REVISED.txt`; locked title; locked outline/canon of **same** video if available; provenance file(s) from Writer's stage manifest and/or repair proof. Re-audits require previous QA frozen ledger, baseline score deduction history, and revision proof to distinguish old versus newly caused defects. User may invoke `step4` again to resume an incomplete audit of exactly the same file SHA.

**Always begin with source bytes:** read full UTF-8, verify same title, source SHA-256, body SHA-256, exact Unicode code point body characters (remove ONLY `[PART N]` standalone heading lines and their newline), ordered headings 1–7, nonempty Parts, word telemetry, logical part boundaries. Do not use stale counts or claim source is accessible based on chat text alone. If exact body bytes unavailable or hashes conflict, HARD STOP: no QA score, readiness or freeze. If exact length outside 70k–80k, log P0 functional normalization and `NOT READY` even if content review continues.

Use `python scripts/qa_checkpoint.py init FULL_SCRIPT.txt --title '<exact locked title>' --outline-file FINAL_OUTLINE.txt --out QA_CHECKPOINT.json` before any first-run audit, then fill evidence incrementally.

## 2. Full independent audit plan (write evidence as you go)

### Read #1 — holistic story and title promise

Read ALL seven Parts, not a summary; map timeline, major beats, family relationships, titles/ages, protagonist vulnerability/agency, core mysterious object/property, access authority, money/legal stakes, payoff pathway, tone and retention journey. Identify viewer contract and opening promise. Mark every strong span worth protecting with actual quote anchor and Part.

### Read #2 — forensic per Part and per scene

Re-read ALL prose, line by line, for state changes, exact dates, age, cost, currency, inventory, location/transit, ownership/permissions, what each person knows at each scene, object state and evidence chain, historical/document provenance, reasonable human/professional behavior, physical construction/repair/transport, naming and logic of each clue. Distinguish impossible from simply underexplained. Report defects at actionable exact quotes.

### Read #3 — reverse setup/dependency

From Part 7 back to Part 1, verify each resolved loop had planted evidence and a believable intermediate chain. Check early reveals against original plans, proof custody, knowledge leakage, time windows, causal dependencies and what would break if a scene were removed. Classify `why not earlier`, `why now`, and what is required to repair each dependency without inventing major new plot.

### Specialized sweeps

Perform and actually document the following, not merely tick checkboxes: early 5-min promise survival; retention deserts/progress rewards; villain/family motives; legal/period/professional/physics plausibility; state delta across Part boundaries; American English/TTS humane cadence and low artificial staccato; spelling/pronouns/names; YouTube sensitive content/platform restrictions; ending-by-action and earned moral consequence; exact-number consistency; omission sweep; repair simulation for all candidate Pxx; full seven-Part saturation sweep repeatedly until final complete sweep finds **ZERO newly actionable defects**.

### 7×24 evidence matrix

For each of 7 Parts and all 24 dimensions, record `PASS` with source-specific evidence, or `PATCH` with valid Pxx and evidence. No blank/PENDING cell may be frozen. The dimensions are exactly those from `scripts/qa_checkpoint.py`: Title/Hook, Timeline, Age, Money, Knowledge, Location/Access, Object/Inventory, Naming, Exact Numbers, Clue Setup/Payoff, Open Loops, Causality, Why-not-earlier, Legal/Authority, Historical/Period, Physical/Mechanical, Professional Behavior, Human Incentives, Retention, Prose/TTS, Spelling/US English, Platform, Ending, Length. Marking every cell PASS mechanically without reading is evidence fraud.

## 3. Defect diagnostics — more important than number of checkboxes

Record every actionable defect (unlimited occurrences), with these REQUIRED elements in the checkpoint and user-facing detailed report:

- `Pxx`, `severity P0..P3`, `part`, `anchor` exact quote, exact scene/occurrence, `zone` locator;
- objective problem plus **root cause** (failed causal mechanism, outline vs writing vs QA origin);
- why a real viewer would notice or misunderstand; distinguish logic/canon vs retention/cadence vs optional style;
- `classification`, `viewer_impact`, `owning_step`, `confidence` and supporting source quote;
- what Writer must achieve (`repair`) without authoring its final replacement prose;
- all occurrences Oxx and dependencies that may need preauthorization; protect already excellent Sxx quotes;
- `length_intent KEEP|ADD|CUT|REDISTRIBUTE`, potential ripple effects, delta-state/canonical constraints;
- **objective acceptance tests**, both changed-zone criteria and whole-script regression checks;
- `rubric_category` and fixed `deduction`; numerical score reconciles with exact fixed 100-point rubric;
- an optional `prevention_candidate` proposed to the correct skill for future work, not automatically accepted as training.

Optional taste-based polishing stays in advisory notes; never increase edit scope just to improve already-acceptable wording. Character/dialogue improvements must identify genuine audience impact and preserve strengths. QA may recommend a rewrite of an entire Part only with exact multiple editable windows preserving all Sxx spans; broad “rewrite Part 5” alone does not authorize any bytes.

## 4. Rubric / scoring / readiness

Use the V12 fixed 10-category `/100` rubric in `CROSS_SKILL_QUALITY_CONTRACT.md`, unchanged across baseline and revisions. Every deduction must map to a genuine defect and reconcile with score categories exactly (the checkpoint tool verifies structural consistency). Always report score if and only if a complete audit is frozen, even when score low. Length, legality, causality, premise, retention and other hard gates do not become point buckets; failure of any hard gate keeps `NOT READY` regardless of score.

`PUBLICATION_READINESS=READY` iff simultaneously `QA_SCORE>=98`, all required hard gates PASS, exact full body 70k–80k, all Part and evidence coverage complete, final zero-new-defect saturation sweep, **no unresolved actionable findings**. A score of 98 while a real Pxx remains is NOT READY.

`qa_checkpoint.py` validates coverage, source integrity, score arithmetic and presence of anchor evidence; **it is not a story understanding engine**. Do not claim that it certifies legal facts, retention forecasts, creative quality or lack of missed defects. Editorial judgment must be real and documented.

## 5. Checkpoint / freezing / artifact handoff

1. After each genuine QA work unit, persist checkpoint `QA_CHECKPOINT.json` with actual descriptions and exact source anchors. If unfinished due to resource limits, report pending sections and invite another `step4` call to resume; never claim a frozen report.
2. When genuinely exhaustive, run `scripts/qa_checkpoint.py inspect QA_CHECKPOINT.json` and `... freeze QA_CHECKPOINT.json --out QA_FROZEN.json`. Both must PASS. Keep evidence and source bytes accessible, not constructed from memory.
3. If frozen source `READY`, offer `step6` only; DO NOT create repair contract.
4. If frozen source `NOT READY` and actionable Pxx exist, QA must **also create an authorized zone boundary specification** with deterministic exact UTF-8 byte offsets `[start,end)`, linked Pxx and verified exact anchors. Prepare a `QA_ZONE_SPEC.json` and run:

   `python scripts/freeze_repair_contract.py --baseline FULL_SCRIPT.txt --frozen QA_FROZEN.json --zones QA_ZONE_SPEC.json --outline-file FINAL_OUTLINE.txt --out QA_REPAIR_CONTRACT.json`

   Proof must PASS; if zones cannot be safely located or strong quotes are inseparable, **do not suggest successful Step5 yet**. Escalate to a new editorial scope decision and add disjoint, anchored zones.
5. The output `QA_REPAIR_CONTRACT.json` is `FROZEN_UNAPPROVED`; QA does not claim user approved changes. User's next explicit `step5` call on that frozen ledger authorizes Writer to execute exactly it, barring subset restrictions. Do not author replacement text. Provide paths/hash for QA frozen file, zone spec and repair contract.

**Do not silently approve, modify or rewrite anything in the baseline.** A patch ledger is a work order, not a replacement manuscript.

## 6. Step4 after Step5 — mandatory independent re-audit

Use EXACT revised file and Writer `REPAIR_PROOF.json`, original frozen QA, exact locked title/outline. Independently verify proof hashes, changed zones and untouched baselines. Read entire revised manuscript again; conduct all required evidence sweeps, not merely changed paragraphs. Create a NEW checkpoint and frozen QA with source SHA equal to actual revised bytes.

Classify findings:

- `FIX VERIFIED`: actual approved defect eliminated; its frozen deduction may be recovered.
- `TRUE REGRESSION`: change within approved area created a new real defect; document and deduct openly. Do not secretly rewrite or enlarge approved scope.
- `PRE-EXISTING QA MISS`: existed in untouched baseline, missed previously; expose corrected baseline score and new absolute score so patch effect is not misrepresented.
- `PATCH-EXPOSED`: previously existing defect became apparent after editing; report and score honestly, protect untouched baseline from same-cycle unauthorized edits.

Frozen prior rubric and score ledger are stable across revisions; report historical baseline, audit-corrected baseline if needed, current absolute score and genuine patch-caused delta. **Do not shield revised score from real defects merely because Writer followed the scope contract.** If unrecoverable/need new scope, freeze a NEW evidence-backed ledger and new repair contract only after new complete QA.

## 7. Lessons / long-term quality feedback

After a verified postrepair QA, run `scripts/record_qa_lessons.py` against exact baseline QA, postrepair QA and repair proof to produce `QA_LESSON_CANDIDATES.json`. These are only PROPOSED. Verify root cause, repeated relevance, prevention acceptance test, correct owner (Title/Outline/Writer/QA/SEO), and skill version; editor must explicitly approve before any `VERIFIED` skill rule changes. One unverified or story-specific anomaly must not become a universal policy. Future Writer uses only stored approved lessons it actually reads. Do not claim this process automatically retrains model weights.

## 8. Default report and failure handling

Use `references/OUTPUT_TEMPLATES.md` for a detailed diagnostic output: baseline source/count/hash; title/canon fit; score per 10 categories; key strengths; risks by severity; all exact Pxx/Oxx with root cause, viewer impact, dependencies, acceptance tests; 7×24 evidence coverage; hard gates; final saturation certificate; protection Sxx; frozen record; if needed precise QA repair contract and open edit windows; readiness. If the QA is incomplete, report it as incomplete with checkpoint evidence and no score/ledger freeze. If readiness is READY suggest only `step6`; if NOT READY and zones proven suggest only `step5`; on blocked conditions report blockers without a success suggestion.

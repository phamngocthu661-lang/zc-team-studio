# QA ONE PASS — EVIDENCE FIRST, SCOPED LEDGER, FINAL READ ONLY

## Audit phases
**Q1 — Lock:** read full `FULL_SCRIPT.txt`, `TITLE_LOCK.json`, `OUTLINE_LOCK.json`, outline and all speaker lines, no stale memory. Record actual SHA256 and readable character count via `project_tools.py`.

**Q2 — Logic map:** for each Part note start/end states, time, object possession, money, trust, authority, evidence, woman agency, narrator knowledge, setup/payoff, resolution. Emphasize time gaps, travel, employment and miraculous special access. Verify title promise is satisfied by causal action.

**Q3 — Japanese correction pass:** read all dialogue, check names/roles and grammar; report exact quoted defect spans only. Mark uncertainty if dependent on dialect or TTS conventions.

**Q4 — Classification:** each defect gets stable ID `P01` etc, `severity`, `Part`, `line_hint`, `quote_original`, `why_wrong`, `smallest_fix_intent`, `before/after narrative constraints`, source of truth. Reject fixes that alter entire Part without evidentiary need.

**Q5 — Freeze:** produce JSON `FROZEN_QA_LEDGER.json` with `baseline_sha256`, `patches:[{id,start_byte,end_byte,reason,evidence,severity,before_sha256}]` for P0/P1/P2. Compute byte positions from file, not from line number estimation; windows cannot overlap. If no patches, READY may be issued directly after independent review. If severe defects outside short repair window, status `BLOCKED_TOO_COMPLEX_FOR_ONE_PASS`, not automatic rewrite.

**Q6 — After Step5:** verify exact `REPAIR_PROOF.json`, approved changes only, full storyline and Japanese consistency, count, continuity; score again and either pass or fail. Do not edit and do not freeze another ledger. Completion even if not passing; no false force to >=98.

## Evidence matrix per Part
```
PART | LOCATION/TIME | HERO GOAL | HEROINE GOAL | REVEALED FACTS | OBJECTS
     | WHY ACTION POSSIBLE | TRUST DELTA | OPPOSITION | SETUP/PAYOFF
     | LANGUAGE/HONORIFICS | DEFECT IDS
```

## Pre/post length and identity
Original draft or revised script MUST contain exactly headings PART 1..7 in order, nonempty speech lines. Readable Japanese 13,900–16,300 target. If user asks different runtime, adjust explicit configuration and clearly version. Stage/QA figures must reflect actual stored data.

## Japanese proofreading taxonomy
KANA, KANJI, PARTICLE, INFLECTION, HOMONYM, HONORIFIC, REGISTER, PROPER_NAME, AGE, TENSE, TEMPORAL_CONNECTOR, TTS_PRONUNCIATION, DUPLICATION, PUNCTUATION, OTHER. Never blanket auto-replace a homophone without checking context. Correct `わたし/俺` voice consistency, special treatment of `さん/様/部長`, narration and quotation endings.

## Scoring evidence
For each deduction include `criterion, points_lost, issue_ids, exact quote`, sum must equal 100-final score. `98+` aspirational not compelled. Unresolved severity P0/P1 => BLOCK regardless numeric score.

## One pass exhausted
If revised script is worse or still has P0/P1, output `BLOCKED_ONE_PASS_EXHAUSTED`, catalog remaining defects, suggest human editorial decisions or an explicitly new authorized project/version; do not produce revision 2 under current workflow.


## V1.1 independent quality dimensions
Keep the fixed 100-point **logic/continuity/Japanese** rubric; report Creative Story Gate as **separate PASS/WATCH/BLOCKED** with 8 evidence-backed criteria. Do not add broad creative revisions to Step5 ledger: one repair edits only identified logic and Japanese spelling/grammar/meaning errors. If creative gate BLOCKED, fail publish and explain how to redesign the next story upstream (or request separately authorized fresh version). After repair final verification remains READ ONLY; no attempt #2.
At the last step invoke `python scripts/release_gate.py --project-dir <dir>` to validate file links/PNG size/SEO identity, then `--strict-publish` only when actual visual inspection and `CREATIVE_GATE_REPORT.json` exist. `READY_FINAL` != `PUBLISH_GATE_PASS`.

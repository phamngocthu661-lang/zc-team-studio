# MEXICO DOÑA QA ENGINE V1.1 — EDITORIAL PROOF, ONE REPAIR ONLY

## Why V1.1 exists
Independent review of MX_CUARTO Test 1 showed technical correctness (7 Parts, hashes, one scoped patch) but two editorial P1 defects survived the so-called 98/100 READY: a Thursday-night-to-Thursday-afternoon backwards jump in Part 4 and a confession first heard Wednesday (revisited as a new discovery Thursday). The QA gate was trusting booleans instead of forcing scene-level evidence. V1.1 fixes the process, without pretending a script can algorithmically understand every plot hole.

## Ownership and immutable rule
- STEP 4 belongs to the independent QA reviewer. QA MUST NOT author new story prose or edit it.
- STEP 5 belongs to Writer, only after a frozen issue batch and explicit user approval; **MAX_REPAIR_ROUNDS = 1** across the full production run.
- STEP 4 FINAL means *verification only*. If NOT_READY after that single batch, CLOSE the run as NOT_READY. Escalate to a new explicitly versioned editorial project; do not silently make a second patch.
- The artifact SHA chain protects provenance, not truthfulness or literary quality. `TECH_PASS` and `EDITORIAL_PASS` are separate. A high score and empty issue list cannot bypass the evidence gate.

## Weighting / fail conditions
Logic, causality, access, legal/property realism = 40; date/time/knowledge/money/relationship continuity = 25; spelling/grammar/accents/punctuation in es-MX = 20; narrative repetition / TTS = 10; structure/integrity = 5. In addition, a separately documented narrative-engagement gate must pass (actual title promise; credible turn/reversal; distinctive new consequences; earned close). A P0/P1, a failed post-repair context check, an unsupported script SHA, or missing evidence always blocks READY, irrespective of numerical score.

## Mandatory reading sequence
1. Re-open exact `TITLE_LOCK.json`, actual locked outline, verified manuscript (all 7 Part sections) and original/revised repair proof if any. Do not rely on chat excerpts.
2. Read front to back for cause/effect, each scene for chronology and knowledge, then walk backward from the ending to the first planted causal clue.
3. Rebuild `Scene Timeline` (story date AND time of day), `Character Knowledge Ledger` (who learned what from whom, when), ownership/money/legal steps, and unresolved story promises **from the actual final manuscript**, not by copying the preliminary outline.
4. For every scene, capture original text byte anchors, an actual quotation from that window, `story_date`, `time_of_day`, a concrete causal change, and what the narrator knows. Cover **at least 21 true scenes**, spanning all 7 parts. Do not pad with artificial scenes. If the script cannot be meaningfully divided, fail the editorial gate and note the structural defect.
5. For each chronology regression (including *within one day* night→afternoon), require a readable flashback signal actually present within the specific scene (`flashback_signal_quote`) and judge whether subsequent narration restores temporal clarity. Flag unmarked regressions as P1.
6. For each critical claim, record a stable `fact_id`, the `first_known_scene_id`, character, source, and all later revelation scenes. If a character already knew a fact on Wednesday, do not let Thursday stage it as a first confession. Distinguish **new evidence, new corroboration, new audience awareness, or new admission to another person** from rediscovery by the same character.
7. Orthography: comprehensive es-MX accent, `ñ`, punctuation, correct `tú/usted` and temporal tense, spelling of Mexican names/places, native grammar; do not let automated autocorrect destroy conditional `si` or names.
8. Retention review: every meaningful scene must create new action, choice, evidence, consequence or shifting alliance. Critique repeating the same ethical lesson or repeating preparations for one family meeting across 2–3 Parts. Verify each midpoint/Part exit adds **new stakes**, not just another promise of a meeting.

## Pre-repair — one frozen batch
All P0/P1/P2 errors that can realistically be repaired must be gathered BEFORE the only repair. Each `QA_ISSUES.json` entry has exact `start_byte`, exclusive `end_byte`, baseline slice SHA, evidence, root cause, acceptance test and a note describing affected adjacent scenes/knowledge facts. Avoid narrow patch windows if the defect spans a whole scene; request appropriately scoped windows but never take the whole script casually. Run `qa-freeze` after all issues are collected; never freeze a partial list and add patches later.

## Post-repair — mandatory evidence artifact
Create `QA_EDITORIAL_EVIDENCE.json` for the exact **revised** manuscript; new `schema: MXF_EDITORIAL_EVIDENCE_V1_1`; `script_sha256` of that file; `scenes` 21+ items in manuscript order; `knowledge_facts`, `revelations`, `orthography_review`, `story_retention_review`; and `patch_reviews` for each changed region in `REPAIR_PROOF.json`.

Each `patch_review` MUST give real `before_quote` and `after_quote` situated within **3,000 UTF-8 bytes** of the changed region; explicitly re-read the two adjacent scenes (or nearest available scenes) and evaluate `timeline_consistent`, `knowledge_consistent`, `adjacent_scenes_checked`, `spelling_consistent`. Never set all flags true without rereading the cited passages. `repair` produces final byte locations for each patch to anchor this check.

Run `python scripts/mexico_pipeline.py review-evidence --script FULL_SCRIPT_REVISED.txt --evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json`. This does **structured checks only**: event order, typed anchors, fact/reveal chronology, patch context consistency flags. It cannot prove the content of reviewers' descriptions true. Independently assess all detected flags and unresolved free-text issues.

Then run `qa-final` with `--editorial-evidence QA_EDITORIAL_EVIDENCE.json` in addition to the existing arguments. READY requires all former gates + evidence validation returning zero structured findings, score>=98 and `unresolved_issues=[]`. `QA_FINAL.json` contains `TECH_PASS`, `EDITORIAL_PASS`, evidence SHA; it does NOT falsely claim a human independently verified the prose unless explicitly recorded by an actual editor.

### Difference between a legitimate flashback and a timeline error
A scene placed later in the manuscript but earlier on the calendar CAN be correct when marked with a concrete textual flashback signal, e.g. `Aquella tarde del miércoles...`, and when the later scene distinguishes existing knowledge from new corroboration. Merely setting a flag true without an actual anchor quote fails schema validation. A flashback is still NOT a justification to relabel an old revelation as brand new.

## Editorial evidence minimal shape
See `examples/EDITORIAL_EVIDENCE_TEMPLATE.json` for field names. That template is NOT usable as a production QA and its values must be replaced by evidence anchored in each real manuscript. In `revelations`, set `perceived_as_new_by_character=true` ONLY when the named person is treated as first discovering the fact, and keep its source in `knowledge_facts`. Distinguish retrospective narrator from scene-time narrator.

## Escalation states
- `READY`: 98+, all issues cleared, 21+ meaningful anchored scenes, passing semantic-context evidence.
- `NOT_READY_P1`: chronology / knowledge / causality defect; NO SEO, no second repair.
- `NOT_READY_PACING`: story formally coherent but repetitive/flat; no shortcuts to auto-score 98.
- `BLOCKED_EVIDENCE`: cannot verify full script or missing/rejected SHA-bound scene evidence. Resolve evidence COLLECTION without editing the story; if content defect, close run rather than beginning another repair.

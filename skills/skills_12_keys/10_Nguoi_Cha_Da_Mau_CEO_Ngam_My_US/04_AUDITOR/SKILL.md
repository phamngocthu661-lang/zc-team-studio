---
name: kiem-tra-kich-ban-black-dad
description: Independent full-script forensic QA focused on logic, continuity, en-US spelling, timed hook proof, and exactly one authorized writer repair.
---
# SKILL 4 — INDEPENDENT QA V2 (S4 INITIAL + S4 FINAL)

READ/AUDIT ONLY. Never write story sentences, modify script, or initiate second revision. Read title, full outline, full actual TXT, manifest and `references/QA_LOGIC_SPELLING.md`, `references/HOOK_TIMING_PROOF.md` AND frozen S2 `02_hook_contract.json`. Check all 7 part trajectories even though TTS text has no headings. Evidence anchors are exact source strings, not invented snippets.

## Read plan
1. File truth: actual word count/hash, UTF-8 body complete, 6.5–8k by default, no TTS headings. Authoritative metadata cannot contradict actual files.
2. Hook: map actual 0-based word offsets for `cost`, `clue`, `question` and every extra outline-locked <=90-second event. At 150 WPM ~225 words. Show actual second estimate, not storyboard's wish. A locked 60–90-sec event at 4 minutes is HIGH and QA FAIL irrespective of score.
3. Narrative reveal: compare audience knowledge (omniscient spoilers) vs father's knowledge, secret CEO boundary, title's literal outcome and authority. Track every evidence object from custody/setup to verdict and downstream response.
4. Global logic: named characters/age/childcare, location, calendar weekday vs date, commute/shift, money, nonprofit vs corporate power, legal/employment/medical/technical procedures, different motivations and cause→effect, ethics/privacy. Check ending backward against every setup.
5. Full American-English proofread: spelling, grammar, names, tense, punctuation, duplicate words, phrasing, unnatural literal translation, referents. Do not strip authentic dialect or rewrite voice for preference.
6. Emotion/retention: first irreversible choice and empathy, scene change purpose, repeated procedural exposition, 4–7-min turns, midpoint true new hypothesis, emotional climax and believable aftereffects. Record deficits without automatically rebuilding unbroken prose.

## Scoring and gate
Logic 30; continuity 20; US grammar 20; realism 10; title 10; emotion 5; pacing 5. PASS requires >=97 PLUS zero CRITICAL/HIGH PLUS HOOK_GATE PASS PLUS no title/authority contradiction PLUS valid manifests and lineage. A 98 assigned despite an unmet 90s hook is INVALID as an approval. Score justified by evidence per category; never award perfect score just for resolved isolated patches.

## INITIAL audit output
`04_qa_initial.md`: script SHA, actual words/WPM, precise timestamped hook table, audience-hidden-identity review, title-authority distinction, logic and proofreading findings, rubric, severity, PASS/FAIL, action. When FAIL, freeze `04_repair_contract.json` listing every related exact unique before/after span (including downstream dependencies), change scope, impact and expected result. Must decide whether an issue is repairable in single pass; major plot retelling → `NEEDS_HUMAN_REVIEW`, no automatic micro-patch claim.

## FINAL verify after single writer revision
Reread whole `05_revised.txt`; verify frozen `before → after` once and byte-for-byte unaffected regions. Review final hook and spelling, timeline, intro spoiler, title proof. Write `04_qa_final.md` with audit evidence and `04_hook_proof.json` referencing FINAL script SHA and every S2 required event with identical max_seconds/WPM. Run `scripts/validate_production.py` to check deterministic gates (or mark UNVERIFIED if unavailable). Set `PASS_PUBLISH_READY` or `NEEDS_HUMAN_REVIEW`. No second repair instructions. If initial script passes without edits, `04_qa_initial.md` is final editorial approval and hook proof points to draft.

**Deterministic validator ≠ editorial quality review.** Anchor offsets can be checked by Python, but AI must honestly judge whether the text depicts a true clue, rather than inserting an unrelated token early to game the requirement.

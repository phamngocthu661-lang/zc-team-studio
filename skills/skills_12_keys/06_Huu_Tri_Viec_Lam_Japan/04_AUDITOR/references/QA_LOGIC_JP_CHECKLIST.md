# Exhaustive checklist — every `口コミNN`

## Internal logic (critical)
- Age at retirement vs elapsed years, who is already 65 vs 70, precise time order day/week/year.
- Work contract full/part-time, shift lengths, commute, actual duties, supervisor role, title, reemployment status and pay grade consistent.
- Pension monthly/yearly and income gross/net, living costs, savings drawdown, yen amounts add correctly. Don't confuse 国民年金, 老齢基礎年金, 厚生年金, 在職老齢年金.
- Public housing: application/income/city differences not asserted as nationwide rule; rent, deposit, renewal, accessibility not fabricated as universal.
- Legal/medical/financial rules only verified official source/date; distinguish personal anecdote from fact.
- Action/reaction believable: why person makes decision, what evidence they had and could have known at that point.
- Reuse the same yen detail only if intentional; no two characters with accidental identical fingerprint.

## Japanese proofread (critical)
- 誤字・脱字・誤変換・送り仮名・助詞・敬語・句読点; natural read-out and Japanese numeral consistency.
- Same proper noun spelled once (シルバー人材センター not シルバー人材セーター; ハローワーク not ハロワーク unless conversational quote).
- No broken line splitting compound words, English machine-translated phrasing, unexplained Latin acronyms or unnatural high-register clichés.
- Make every 口コミ header NN sequential, no duplicate #, missing #, wrong title source.
- No leading English instructions/markdown in Japanese narrated body.

## Source authenticity & copyright
- Synthetic stories explicitly labeled creative recreations somewhere meaningful; don't claim personal 30 interview recordings.
- Don't copy competitor direct quotes, don't pretend SEO prompts are source evidence.
- Review 30 stories are unique perspective, real consequence, varied emotional outcome and no hateful scapegoating.

## A/B/C check
- Story 01–08 in Part1–2, 09–20 in Part3–5, 21–30 in Part6–7.
- Body count 10.5k–13.5k unless explicit user override; validation uses voiced char count not raw file size.

## V1.1 — mandatory evidence and 30-review editorial signoff
For each `口コミNN`, record: `CANON` age/occupation/gender/family/time, verbatim quoted passage (at least 10 Japanese characters as evidence), material cause → consequence, proofread outcome, and `ending_mechanism`. Check motifs repeated across adjacent reviews and across 30 even if every single review is logical. Distinguish: (a) blocking causal/spelling error, (b) major creative repetition, (c) optional polish. Do not inflate a random/subjective 98/100. All blockers + chosen major editorial defects belong in the single initial frozen patch ledger, not discoveries invented after repair. Post-QA explicitly checks exact patch provenance and possible new introduced mistakes; if any blocker remains, mark BLOCKED, **no second auto-repair**.

New QA guard instructions: run `editorial-diagnostics --script OUTPUT/FULL_SCRIPT.txt --output OUTPUT/EDITORIAL_DIAGNOSTICS.json`, review flagged patterns; it does not certify language or story quality. Freeze patch entries with integer `review_id` 1..30; patch guard rejects wrong-review changes. `qa-preflight` = technical only.

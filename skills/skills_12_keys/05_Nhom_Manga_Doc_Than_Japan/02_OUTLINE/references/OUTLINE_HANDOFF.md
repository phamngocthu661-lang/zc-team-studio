# SEVEN-PART OUTLINE TEMPLATE & CANON SPECIFICATION

## Handoff header
```
TITLE_SHA256:
CURRENT_FINAL_TITLE:
DNA_FAMILY_MAIN:
DNA_FAMILY_SECONDARY:
VIDEO_ID: SHA256(exact title bytes + "\n" + exact outline file SHA)[:16]
TARGET: 7 PARTS; 13,900–16,300 read chars; target 14,500–15,500
```

## Seven part budget (approx read chars)
- PART1 1,900: sticky incident, no >300 chars background before it.
- PART2 2,150: character core/believable constraint, respectful romance.
- PART3 2,200: first consequence and obstacle; end with new choice.
- PART4 2,300: visual midpoint reveal and causally linked new problem.
- PART5 2,150: most important loss/trust dispute, woman acts autonomously.
- PART6 2,250: irreversible action, evidence, earned reversal.
- PART7 1,900: realistic resolution and image/action callback.
Centers sum 14,850; improve plot without filler if count off. Different scene lengths allowed if total within hard lock.

## Per-Part required fields
1. `OBJECTIVE` (what protagonist wants in this Part)
2. `START_STATE` (knowledge and emotional/social condition)
3. `SCENES` (location/time/characters + actions + irreversible consequence)
4. `TRUST_DELTA` (who trusts whom, and on what evidence)
5. `OPEN_LOOP` or `PAYOFF` (at least one change)
6. `END_STATE` (money/relationship/evidence/access)
7. `LENGTH_BUDGET` and 1 supporting voice comic frame prompt.

## Canon state ledgers
- Identity: exact kanji/name/age/job/title/pronouns/speech hierarchy.
- Timeline: YYYY-MM-DD or relative day and elapsed time, travel delays, probation, weekends/holidays.
- Money: rent/loans/salary/repair or restaurant prices and who can pay what.
- Workplace: hiring/firing powers, managerial authority, NDA, safety requirements; no instant corporate succession from one speech.
- Medicine & accidents: appropriate emergency services (119), reason an action is possible, no miraculous cures.
- Objects: phones, keys, letters, invoices, contracts, schedules, who has each at each Part.
- Knowledge: who saw/heard what and when; secrets cannot be discovered without cause.
- Place: prefecture or travel plausibility; Japanese right-hand-drive.
- Relationship: consent, marital status, children/guardian context, mutually changing boundaries.

## Anti-repetition and originality
For every set-up: what is known by audience at Part 1, what is withheld, what verified detail is visible, what later modifies its meaning. Red flag if opening contains every twist, if every Part ends with `まさか`, if heroine is rescued over and over with no agency, if sole twist is rich CEO, or if the same conversation repeats 3 times.

## TTS roster
Use `@ore` as first-person male, `@heroine`, `@narrator` (optional) and named stable speaker IDs. Narration grounded in first person; descriptions that must be spoken are written as spoken Japanese, not [camera instructions]. Changes in point of view must be declared, or stay in 俺 perspective.


## V1.1 mandatory story architecture ledger (before outline lock)
For EACH Part, append `NEW_STAKE`, `REVERSIBLE?`, `HEROINE_DECISION`, `ROMANCE_ACTION` (or justified absence), `IMAGE_FRAME_1/2`, `ADMIN_EXPOSITION_CONSECUTIVE`, `CAUSAL_TRIGGER` and `END_CHOICE`. Build exact mapping `TITLE_SECRET -> EARLIER_CLUE -> P4 REFRAME -> P5 CHOICE -> P7 PAYOFF`. An outline that merely goes `school closing -> site survey -> school closing -> plan -> meetings -> approval -> opening` FAILS retention gate: personal conflict/action/cost must alter at least P2, P3, P5. A filmable dilemma and changed relationship must coexist with responsible administrative facts. Output `CREATIVE_PREFLIGHT_PASS: TRUE/FALSE`, never lock outline if FALSE.

# TITLE SCORECARD V1.1 — THREE GATES, TWO SCORES, ZERO FAKE CTR

This is an editorial rubric, NOT predicted views/CTR. A high score requires **visible specific text evidence**. All 5 receive separate component scores and one explicit deduction per lost point group. An empty flattering explanation invalidates the score. Scores do not have to lie between 90–100; 60–80 is common for attractive but incomplete titles.

## A. CLICK_HOOK_STRENGTH /100 (PRIMARY selection criterion)
- **20 — INJUSTICE MADE VISIBLE:** distinct family culprit, concrete humiliating action or quote. Deduct 5–12 for generic exclusion or 'disrespect'; 10–20 if user cannot tell what happened.
- **15 — REAL STAKES:** concrete relationship/house/money/family milestone, not abstract revenge. Deduct 5–10 if consequences are imperceptible.
- **15 — EMOTIONAL CONTRAST:** whose place was taken by whom, or disrespect ↔ dependence, sacrifice ↔ betrayal. Deduct 5–10 when contrast is absent.
- **20 — REVERSAL / HEROINE AGENCY:** protagonist's meaningful action or immediate credible counterreaction. A discovered message/receipt WITHOUT next action generally earns **≤8/20**. Pure `les hice una pregunta` generally ≤6/20 absent a decisive answer/act.
- **15 — CONSEQUENTIAL OPEN LOOP:** viewer wonders what the family must face after action. Weak `nadie lo creyó` or proof-only closure **≤5/15**.
- **10 — SCROLL CLARITY:** instantly comprehensible actor/action/reversal on mobile, ideally first 60–75 chars; deduct for overstuffed subordinate clauses.
- **5 — EMOTIONAL / LANGUAGE PRECISION:** memorable believable phrase and native es-MX, not generic scream/caps.
TOTAL 100. No mathematical score is a performance forecast.

## B. STORY_FEASIBILITY /100 (ELIGIBILITY, NOT WINNER OVERRIDE)
- 25 — literal title promise fulfillable in 7 connected Parts without moving goalposts.
- 20 — credible causality/timing of protagonist's action and antagonist's reaction.
- 15 — lawful/obtainable evidence and access.
- 15 — lead's earned competence, limits, and costly choices.
- 15 — durable escalation material to sustain 70–80k codepoints without repeating the same quarrel.
- 10 — Mexican kinship, economic, geographical and procedural plausibility.
TOTAL 100.

## C. HARD GUARDS
`ORIGINALITY_GUARD`, `LEGAL_MX_GUARD`, `DELIVERABILITY_GUARD`: each `PASS` or `FAIL`. FAIL if near-copy, impossible legal/financial power, story cannot honestly deliver the exact title, inaccurate family term or false real-life claim. Failed candidate cannot win regardless of scores.

## D. CALIBRATED WINNER RULES
- `CLICK >=85` and `STORY >=80` and three PASS guards.
- `REVERSAL >=13/20` AND `OPEN_LOOP >=10/15` (no evidence-only payoff winner).
- Competitor benchmark `STRONG` or `PARITY` with at least one close comparison. If insufficient source matches, mark `DATA_LIMITED`; no assertion of superiority.
- `COMPOSITE = round(0.75*CLICK + 0.25*STORY)`. Display it only as secondary information, choose by hook + head-to-head. Difference <5 CLICK points is a close editorial race; discuss risks, not fake certainty.
- At least ONE concrete weakness/deduction for EVERY title, even if score 95; use contrastive justification; don't assign 94–96 to all five without distinct observable reasons.
- If no winner meets all criteria: revise complete five internally up to three rounds; still failing => show five drafts `NOT READY`, `SUGGESTED_WINNER: NONE`, explain missing hook and ask user to choose constraints only if essential.

## E. BENCHMARK IS NOT AN ORACLE
Competitor views are snapshots collected by the user, not current CTR or a causal experiment. Judge title components, **not view count as a title score**. For each candidate compare ≥3 sourced anchors (same DNA where possible). If source set lacks three same-DNA examples, label adjacent and gap, never invent a comparison. Narrative feasibility and predicted click are DIFFERENT claims.

## V1.2 PRE-SCORING DNA GATE (NOT POINTS)
`NICHE_FIT = PASS` only if (1) older Mexican mother/grandmother is lead (2) first-person preferred voice (3) concrete betrayal from identified family member (4) heroine makes/owns a meaningful decision (5) title tail contains specific human/financial consequence (6) original, legal, 7-Part 70–80k deliverable. **Any FAIL is NOT eligible**, even CLICK 100/100; do not use CLICK score to soften this. Run `title_niche_gate_v12.py` on V1.2 JSON; human must check semantic truth. For source comparison prefer user-provided E01/E02/S01 but don't copy judge twist; scored labels still hypotheses, not CTR. The winner with strongest hook and no niche drift is the only possible recommendation; if none, NONE.

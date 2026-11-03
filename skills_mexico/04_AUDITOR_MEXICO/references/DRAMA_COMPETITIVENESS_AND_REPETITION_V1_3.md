# QA V1.3 — EDITORIAL RED-TEAM FOR DRAMA QUALITY, NO FALSE READY

READ after V1.1 AUDIENCE_COMPETITIVENESS_GATE and V1.2 FAMILY_DNA_INDEPENDENT_QA. This is an **additional manual editorial check**; DO NOT alter `qa_checkpoint.py` frozen JSON schema, scoring categories, SHA proof, 3-pass 168-cell requirement, 98+ score or byte repair windows.

## Two independent publication statuses
`TECHNICAL_QA` = script persisted, actual 7 Parts/70k–80k codepoints, canonical SHA and checkpoint format passed.
`DRAMA_QUALITY_V1_3` = external/independent reader has examined real text and can anchor the observed dramatic claims to exact Part+excerpt. Both must PASS to advise publication. Do not claim 98/100 literary quality based on a synthetic format test.

## Six compulsory review questions with sourced excerpts
1. `TITLE_TO_LIVE_PAYOFF`: concrete injustice, named relative, heroine's counter-decision, P6 outcome physically seen? A "someone told me later" climax fails if title promised a confrontation.
2. `MOTHER_AGENCY`: does heroine take action in P1, P3, P5, P6? Does at least one choice hurt her too? Remove convenient rescuer/autonomous notary plot.
3. `SCENE_NONINTERCHANGEABILITY`: for each Part list one scene that materially changes the future; give 3 examples of deletable/repeated scenes if any. If P3–P5 can be reordered with no loss, fail.
4. `ESCALATION_VARIETY`: identify >=3 distinct real pressures and at least 2 family adaptations to mother's changing strategy; not just five repeated insults; distinguish material vs psychological.
5. `EMOTIONAL_TRUTH`: prove antagonist motivation, regret or hardening through *actions*, and 1 narrator blind spot; is private cost still felt after victory?
6. `ES_MX_ORAL_QUALITY`: audit realistic kinship, regionally neutral Mexican Spanish, differentiated dialogue, consistent tú/usted, no robotic repeated metaphor or TTS-unfriendly noise.

## Hard disqualifiers
Weak title-level reversal; repeated conflict disguised with new locations; arbitrary title-killing legal power; formula "they all cried", sudden revenge jackpot, narrator relegated to spectator, mechanical ending without emotional price. Editorial must mark `DRAMA_QUALITY_V1_3: NOT_READY` for these even if format checker says PASS. Open actionable Pxx mapped to EXISTING rubric keys (mostly Retention/Pressure/Pacing, Causality, Agency, Emotional Payoff); zero-open-defects rule remains. Describe actual source anchors and smallest repair windows. Never use "minor observations" for dramatic core defects.

## Review report sidecar (outside frozen JSON)
```
DRAMA_QUALITY_V1_3: PASS | NOT_READY | UNVERIFIED
TECHNICAL_QA: PASS | FAIL | UNVERIFIED
FAMILY_DNA_QA: PASS | NOT_READY | UNVERIFIED
TITLE_PAYOFF_P1_P6: [source anchor]
PART_DELTA_P1_TO_P7: [7 concrete state transitions]
DUPLICATE_SCENES: [IDs and matching function, or evidence none]
ANTAGONIST_COUNTERMOVES: [at least 2 grounded moments]
ES_MX_READ_ALOUD_ISSUES: [specific quotes]
EMOTIONAL_COST_P7: [action]
ACTIONABLE_DEFECT_IDS: [Pxx]
EDITOR_RECOMMENDATION: READY | NOT_READY
```
Never claim this sidecar was generated/read when the complete script is unavailable. It is a manual evidence record, NOT a second score inflation system. Compare competitor *mechanics* not stolen plot, and do not claim CTR superiority without live analytics.

## Outcome
READY requires original QA frozen READY and this editorial PASS on the SAME current SHA. A missing sidecar means `UNVERIFIED`, block recommended production, but no alteration to frozen proof contract. Repair needs Step5 authorization and full subsequent Step4 re-audit on revised SHA.

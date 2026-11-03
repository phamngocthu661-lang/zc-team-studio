# CREATIVE STORY GATES — V1.1 (NORMATIVE)

## Why this gate exists
Run1 schoolyard script had valid 7 Parts, 14,554 readable Japanese characters and 1 legitimate repair, but long administrative sequences, delayed modest revelation and limited couple-specific emotional decisions. Structural/linguistic QA 98 is not an estimate of emotional retention or thumbnail CTR. **Do not reclassify a good civic procedural as high-tension late-bloom romance solely due to formal pass.**

## User-facing niche
An adult Japanese single man with relatable ordinary concerns (work, isolation, pride) and a woman 40–60+ with her own plan and agency, concrete reciprocal adult choices. A community restoration premise is only a vehicle, not the emotional destination. No forced villain, obscene humiliation, arbitrary CEO reveal, or plagiarized reference title.

## 8 creative gates; specific evidence required
1. **HOOK:** 0–160 spoken characters introduce a present-tense actionable contradiction and emotional cost; <=300 characters of exposition before it. The opening picture must be drawable.
2. **EMPATHY:** male protagonist risks losing something personally tangible, not only an institution; show loneliness by a concrete scene, not age-only label.
3. **ESCALATION:** every Part introduces *new cost, decision or irreversible condition*. If two Parts can swap with little effect or simply repeat a committee objection, preflight FAIL.
4. **REVEAL/PAYOFF:** the promised secret in the Title must reframe at least one earlier clue and trigger an immediate character choice. A routine plan with no new consequence is a weak reveal; improve premise/outline **BEFORE writing**, not after QA.
5. **HEROINE AGENCY:** heroine leads consequential decisions in at least 3 different Parts; she must have an independent want, cost and boundary.
6. **MATURE ROMANCE:** two adults share >=3 distinct *action-based* relationship beats (risk, disagreement, help given both ways, boundary, vulnerability, mutual decision), not merely polite administrative meetings. Age-consistent physical appearance, consent and honorifics.
7. **VISUALITY:** every Part has >=2 specific manga-drawable actions/props with distinct emotional face reactions. If 70% of passages are procedural explanation, pause and redesign beats before draft.
8. **FINAL CALLBACK:** ending changes opening action/object's meaning and completes BOTH the practical cost and the relationship decision without instant policy/legal magic.

For each of 8 gates record `PASS/FAIL`, 1–2 exact prospective scene actions at outline time or actual script lines at QA time, and the risk if ignored. **No arbitrary 98**: report a separate `CREATIVE_EDITORIAL_STATUS` (PASS, WATCH, BLOCKED), with evidence. This is not a predictive retention score.

## Pacing: target, not invented universal metrics
- Suggested 7-Part curve: Part1 problem/first choice; P2 reciprocal bond and new threat; P3 loss or exposed limitation; P4 recontextualizing reveal; P5 personal break and costly decision; P6 earned active reversal; P7 consequence and free mutual choice.
- Each Part needs at least one *choice/action* beat and one scene change, not only dialogue explaining rules.
- Limit consecutive institutional or cost/exposition exchanges (meetings, permits, quotes, budget) to <=2 scenes without a concrete, personal event changing stakes. Make safety/authority legible in 1–2 precise details; don't repeat it as filler.
- In manga/TTS voice style, target spoken-line rhythm and varied speakers; compare `@ore` share (run1 = 70.4% of readable chars) to actual imagery and action, but **do not use a rigid narrator quota**. More spoken heroine lines won't rescue weak conflict by themselves.

## Workflow ownership, without second revision
**Step1:** reject titles with no significant visual scene and an insufficient payoff promise.
**Step2:** include 8-gate evidence map, hook, personal cost, irreversible P3/P5 stakes and a reveal that changes behaviour; if weak, improve outline *before locking*.
**Step3:** draft A/B/C once. Verify each stage against locked outline and gate evidence before accepting/storing; a draft-stage correction is only allowed before `FULL_SCRIPT.txt` baseline is frozen, and does NOT invent an additional post-QA repair.
**Step4:** review all 8 gates read-only in addition to language/logic; creative BLOCKED cannot be masked by 98/100 logic score. Technical byte repair ledger may include ONLY evidence-backed P0/P1/P2 logic/typo/grammar, not wholesale creative replot.
**Step5:** one frozen scope transaction, no second pass.
**Step6:** thumbnail visual checks and publish gate demand scene fidelity; do not fix content through clickbait image.

## Independent creative result schema (optional until strict release)
Create `CREATIVE_GATE_REPORT.json` tied to SHA of final exact script:
```
{"script_sha256":"<actual 64-char sha256>","checks":{
  "hook":{"pass":true,"script_evidence":"<real full line or exact quote>"},
  "niche_empathy":{"pass":true,"script_evidence":"<...>"},
  "conflict_escalation":{"pass":true,"script_evidence":"<...>"},
  "reveal_payoff":{"pass":true,"script_evidence":"<...>"},
  "heroine_agency":{"pass":true,"script_evidence":"<...>"},
  "mature_romance":{"pass":true,"script_evidence":"<...>"},
  "scene_visuality":{"pass":true,"script_evidence":"<...>"},
  "ending_payoff":{"pass":true,"script_evidence":"<...>"}}}
```
All quotations must be from the actually read final script; an attestation cannot substitute for a real editorial inspection.

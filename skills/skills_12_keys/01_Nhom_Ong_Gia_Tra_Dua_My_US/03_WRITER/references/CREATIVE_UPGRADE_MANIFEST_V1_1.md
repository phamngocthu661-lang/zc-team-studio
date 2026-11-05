# DADUS V1.1 — NARRATIVE QUALITY UPGRADE MANIFEST

**Compatibility contract is unchanged.** The installed Skill identifiers and folder names remain identical to V1.0; there are still 5 Skills / 6 routed Steps and exactly 1 possible Step5 correction for a video_id. Existing `CURRENT_FINAL_OUTLINE.txt`, A/B/C stages, QA schemas, hashes, length profiles, and SEO verifier remain supported without conversion. Do not restart an active video or edit existing locked artifacts just because this bundle is installed.

## Why V1.1 exists — independent review of bakery production example
The uploaded production `FULL_SCRIPT_REVISED.txt` (Daniel Mercer, Columbus) showed believable family conflict and realistic lease/asset mechanics, but a **creative** issue independent of the QA 99 report: the critical lease distinction is effectively known very early, an extended legal discussion competes with action scenes, and the dramatic public/relational impact of the final choice is gentler than the title expectation. The bakery's bell is an excellent recurring image; preserve such setup/payoff work. These are editorial observations, not measured viewer-retention or CTR data and not retroactive faults requiring another Step5.

## Six upgrades, owning stages
| Priority | New requirement | Owner | Implementation |
|---|---|---|---|
| 1 | TITLE PROMISE / DELIVERY MAP | Step1 → Step2 | distinguish early premise vs irreversible, emotionally visible full payoff |
| 2 | SCENE STATE-CHANGE GRID | Step2 | 3–5 scene units per Part with objective, obstacle, agency, new fact, cost and physical result |
| 3 | RETENTION / PRESSURE DESIGN | Step2 → Step3 | timely complications and partial irreversible payoffs; avoid legal/exposition stagnation |
| 4 | REPETITION BUDGET | Step2 → Step3 | one full technical/legal explanation; later revisits must have new evidence/consequence |
| 5 | US LOCAL ANCHORS | Step2 → Step3 | 2–4 verifiable, non-gimmicky locally meaningful details actually used in scenes |
| 6 | FINALE / COST / PAYOFF | Step2 → Step3 → Step6 | credible consequence on antagonist, protagonist's moral cost, visible aftershock, honest thumbnail |

## QA boundary (non-negotiable)
Step4's P0–P3 defects remain factual **logic, timeline, property, knowledge, continuity, grammar, typos, TTS intelligibility**, or an unfulfilled title *event* (causal/story contradiction). Pacing preferences, thumbnail guesses, cliffhanger intensity and taste judgments are reported as `CREATIVE_READOUT` separate from patch zones. Step5 is NEVER authorized to rewrite for stylistic taste. No second automatic repair if creative score is low. Creative problems are addressed before the original script is locked, or in a separately versioned future video/outline, not by bypassing ONE_REPAIR_LOCK.

## Optional read-only diagnosis tool
`python SKILLS/03-viet-kich-ban-ong-gia-us/scripts/narrative_diagnostics.py FULL_SCRIPT.txt --expected-location 'Columbus' --expected-location 'Ohio' --out RETENTION_DIAGNOSTICS.json`
Reports observable chapter balance, word counts, first 150 words, repeated exact sentences, and literal local-anchor mentions. Does not change source, fabricate audience metrics, test originality or automatically score story quality. For earlier scripts, run it as **diagnosis only**, without modifying SHA-bound drafts.

## Scope of automated regression
V1.0 structural tests must continue to pass. Added V1.1 tests verify diagnostics is read-only, reports actual 7-Part length/missing anchors, flags exact repeated sentences, and maintains unchanged one-repair semantics. Quality must still be evaluated by reading a real draft and actual video analytics after publication.

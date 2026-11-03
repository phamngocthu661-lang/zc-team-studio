# INDEPENDENT QA V1.1 — WITNESS / LANGUAGE / STORY DENSITY

## Mandatory full-read evidence
Provide a **7-PART QA trace**: for each PART, one concrete source quote, event time, who was present, who knew what then, evidence object, one direct emotional consequence and at least one tested claim. A checkbox `complete_full_read=true` WITHOUT part-specific evidence is not proof of actual independent inspection.

## High-risk witness check
For every purported eye/ear-witness compare actual entrance, departure, line of sight, time of speech, possible live audio/video playback and how they knew the quote. Classify hearsay vs direct hearing. A line like “Inés llegó unos minutos después” and later “al llegar había escuchado a Ricardo presentar...” requires clarification, not an automatic timeline PASS. Examine all seven PARTs, not just title and climax.

## Spanish es-MX proofreading
Inspect article/preposition duplication, singular/plural tautology, malformed conjugations, missing accents, wrong punctuation, quoted speech, pronoun reference and unnatural calques. Record unique exact anchors for `modas de moda`, ambiguous `La supe reconocer` or similar constructions. An editorially debatable rephrase can remain P3; a clear stilted/ambiguous expression affecting understanding is actionable P2.

## Calibrating confidence
- SHA, word counts and fixed edit scope can PASS mechanically; mechanical validators do NOT prove prose quality or that a full reading occurred.
- Do not give full 20/20 Spanish or 20/20 timeline when specific unreviewed anomalies are visible in the full script.
- Score 97+ is an editorial assessment only; hard unresolved P0/P1 and material objective P2 always block READY even when sum is 98.
- During S4, freeze ALL actionable issues in the same batch; S5 changes narrative only once. During S4B, classify omissions `BASELINE_MISS`, missed fixes and regressions. Do not quietly edit again or fabricate a new `READY`.

## Mandatory first-run sign-off table
| Check | Evidence from real text | PASS / ISSUE / UNCERTAIN |
|---|---|---|
| Title promise first 90s | exact first-90s passage | |
| Witness chronology | arrival/speech/statement anchors | |
| Seven-part event continuity | 7 excerpts with event days | |
| Character knowledge | source chain | |
| Money, ownership & assets | ledger vs story amounts | |
| Native es-MX spelling & phrasing | exact quoted anomalies or sample per PART | |
| Repetition & dramatic progression | new consequence each PART | |
| SEO scene/source audit | no invented render or facts | |

## Tool use
Run `python scripts/workflow_tools.py audit-run --workdir runs/<id>` for deterministic cross-step checks and `--require-seo` if S6 exists. Machine output MUST be described as `MECHANICAL_PASS_EDITORIAL_REVIEW_REQUIRED`; the final independent QA must additionally justify its own narrative verdict. `seo-gate --workdir runs/<id>` invokes this strict chain before publication. Legacy basic `seo-gate` without `--workdir` cannot confirm manifest/repair dependencies.

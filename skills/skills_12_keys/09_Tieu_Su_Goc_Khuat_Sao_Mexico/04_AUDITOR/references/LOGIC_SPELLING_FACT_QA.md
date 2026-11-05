# QA priority: 80% effort logic/facts/Spanish language; 20% structure/packaging

## LOGIC (primary)
- WHO: never exchange spouses, daughters, artist aliases, co-performers or disputed identities.
- WHEN: birth/death dates, year of career start, date of work release, wedding/divorce, published statement, illness/record; arithmetic conflicts; event date ≠ report date.
- WHAT: court allegation and finding not equated; no claim acquittal or conviction without reliable evidence; do not use rumor as documentary disclosure.
- WHY/HOW: causality must be shown; avoid "because" when only chronology supports "after". A career decline is not evidence of moral punishment.
- SOURCES: all allegations attributed and contextualized; counterclaims included and recognized as disputed; source independence checked.
- HUMAN: no suggestive medical/morality judgment, especially tragedy, death, illness or disability; no private house, child identifiers.
- TITLE: promised event actually documented in chapters, no invented receipts/screenshots/recordings.

## ORTHOGRAPHY (primary)
- Missing/incorrect accents and Spanish question marks, accents in proper nouns, grammatical gender/number agreement, tense mismatch, sentence fragments accidentally caused by translation, inconsistent "usted/tú", dates and numbers, foreign-language artifacts in Spanish, repeated words, comma splices, malformed quotations and punctuation.
- Judge native es-MX (not arbitrary Spanish regional preference). Fix clear objective errors only, do not globally change voice.

## One patch ledger
`P01 | severity | Part | exact original anchor | UTF8 window | replacement intent | source_id | acceptance test`. Group neighboring typos into one window if adjacent; patches must be non-overlapping; preserve all other bytes. Require one frozen defect list before Step5; nothing is added after repair to justify another writing round.

## Diagnostic examples (hypothetical, not real allegations)
- LOGIC: "El álbum salió en 1980" while sourced discography says 1982 => correct with source, or remove date if unresolved.
- ATTRIBUTION: "X engañó a Y" on a tabloid allegation only => replace with truthful, sourced description of who made what allegation and how the other party responded; if evidence insufficient remove claim.
- SPELLING: "Como pudo pasar?" => "¿Cómo pudo pasar?" when interrogative.
- CAUSAL: "La entrevista causó el divorcio" with no proof => "La entrevista ocurrió antes de la separación" if dates verified, without assumed causation.

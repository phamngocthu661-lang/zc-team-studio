# Spanish Mexico title system — deterministic hard checks + editorial scoring

## Hard gates (reject before scoring)
- exact title codepoint length ≤100; person and story angle actually supported; no invented accusation, date, quote, marriage, child, private medical detail; no defamatory label/insult unsupported by reputable sources; Spanish grammatical and idiomatic; answerable/documentable opening hook; not materially duplicated production premise.
- Do not present rumour as a firm statement; use attribution *only* when a reputable report genuinely makes that claim, and do not imply a claim is verified by merely including "según".

## Score /100 (editorial, no fake prediction)
- Accurate event/person/source faithfulness 25
- Immediate recognizable person/topic 15
- Concrete conflict or turning point 15
- Curiosity gap with answer in researched script 15
- Emotional stakes / narrative complexity 10
- Originality vs competitor and user's history 10
- Natural Spanish Mexico + rhythm 5
- Thumbnail feasibility without fabricated evidence 5

## Rewrite patterns to adapt only to grounded events
1. `[Nombre]: la decisión que cambió su carrera… y la consecuencia que pocos recuerdan`
2. `[Nombre] y [Nombre]: qué ocurrió realmente tras [evento documentado]`
3. `[Nombre]: del éxito de [obra] a [giro público verificable]`
4. `La historia detrás de [obra/imagen pública]: el dilema de [Nombre]`
5. `[Nombre]: los hechos que marcaron [periodo de carrera] y su legado`

Bad: sweeping "mintió toda su vida", "criminal", "sádico", "culpa de su enfermedad" without trustworthy documentation. Good: precise, documented, human and interesting, not sterilized into list of dates. Avoid simply replacing a harsh slur with a question mark; insinuation can still harm.

## Duplicate control
Two titles clash if identical person AND same career turning-point/conflict, even with different adjectives, punctuation or wording. Ledger recommended JSONL: `{video_id, person, premise_key, locked_title, published_url, status}`. New channel can initialize an empty ledger; do not say a missing ledger was checked.

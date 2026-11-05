# TTS-CLEAN ES-MX STYLE CHECKLIST

## Script body formatting
Use only `[PART 1]` ... `[PART 7]` section headers and continuous Spanish narrative paragraphs. No `@speaker`, `NARRATOR:`, `[pause]`, music cues, timer or camera instructions in the TTS text. Each paragraph ~50–180 spoken words where plausible, with some shorter dialogue exchanges. Output plain UTF-8; avoid markdown formatting in actual script.

## Accents and lexical normalization
Correct: *él* (pronoun) vs *el* (article), *sí* vs *si*, *aún* vs *aun* in relevant contexts, *tu* vs *tú*, *más* vs *mas*, *cómo/como*, *qué/que*, *dónde/donde*, *sólo/solo* per modern RAE context. Inverted punctuation in Spanish questions/exclamations (¿...? ¡...!). Avoid mixing English framing.

## es-MX plausibility examples
Use `departamento`, `celular`, `licenciado/licenciada` when natural, `pesos`, `Ciudad de México`, `Monterrey`, `Guadalajara`, `Puebla`, `Querétaro` appropriately; no forced slang, stereotypes or excessive "órale/ándale". Corporate terms: `consejo de administración`, `acciones`, `contrato`, `firma`, `comprobante`. Know which character is lawyer/doctor/accountant; don't use unverified legal rules as authoritative narration.

## Spoken word counter
Technical gate uses Unicode-aware lexical matches incl. accented letters; counts not authoritative for TTS minutes. For approximate runtime, duration_min = spoken_words / measured TTS words_per_min; configure with actual voice sample (do not assume universal speed).

## Editing error tiers
P0 structural contradiction/title falsity; P1 major causal/medical/legal/custody impossibility; P2 spelling, repeated names, agreement, unsupported minor logistics; P3 optional tone polish. Frozen repair targets all actionable P0-P2; do not change P3 stylistic preferences in the one repair pass unless they obstruct comprehension.

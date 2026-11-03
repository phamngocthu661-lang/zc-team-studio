# V1.2 EDITORIAL NICHE GATE — ADDITIVE JSON CONTRACT

After V1.1 `title_quality_gate.py`, run `python scripts/title_niche_gate_v12.py TITLE_GATE_INPUT.json --output NICHE_GATE_REPORT.json`. Both must return PASS for winner recommendation. This extension keeps EVERY existing V1.1 JSON field unchanged; add `niche_lock` to each candidate. The V1.1 validator ignores unrecognized extra fields, so older packets remain readable, but **V1.2 recommendations MUST NOT bypass the new gate**. Plain-text Step1 still must be manually reviewed against `FAMILY_DNA_LOCK_V1_2.md` and must say `NICHE_GATE_UNVERIFIED` if the script was not run.

```json
{
 "niche_lock": {
  "lead_role":"madre", "lead_age":73, "lead_gender":"mujer",
  "narrative_pov":"primera_persona",
  "family_culprit":"mis hijos", "culprit_title_span":"Mis hijos",
  "family_betrayal_title_span":"me dejaron en la terminal de Puebla",
  "reversal_title_span":"me suplicaron una firma",
  "mother_decision":"Ella puede negarse a firmar tras revisar por qué la necesitan.",
  "decision_cost":"Arriesga perder el vínculo con los hijos que la abandonaron.",
  "seven_part_payoff":"La petición se prepara con acciones y documentos previos, se confronta en P6 y se resuelve con su decisión en P7.",
  "reversal_lever":"Su firma válida solo para un asunto definido por un documento existente y legalmente plausible.",
  "lead_agency":true,"family_betrayal":true,"no_outsider_savior":true,"no_magic_reveal":true,
  "length_contract":"70k-80k-7part"
 }
}
```

Quoted `*_title_span` fields must actually be exact consecutive spans of title, validated after NFC/casefold. `culprit_title_span` must visibly identify a RELATIVE, not `me echaron` or `unos señores`. `family_culprit` is the relationship label for editorial inspection. `reversal_title_span` cannot merely say everyone cried, heard a phone call, or discovered a secret. `mother_decision`, `decision_cost`, `seven_part_payoff`, `reversal_lever` must articulate coherent causality (length minimum is a structural check only). A parser **cannot certify** the metadata is truthful, kinship is real, or a promise is legally plausible. EDITORIAL SEMANTIC GATE is compulsory before any winner.

Any third-person or non-elder user-locked title must be preserved verbatim but labeled `SCOPE_EXCEPTION / NOT_AUTO_ADVANCE` pending an explicit instruction to change the project DNA. Never rewrite a locked title without user direction.

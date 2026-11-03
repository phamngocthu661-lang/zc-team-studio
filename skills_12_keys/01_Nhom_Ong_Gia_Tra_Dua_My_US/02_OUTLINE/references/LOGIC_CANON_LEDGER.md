# Mandatory persistent outline fields
```
LOCKED_TITLE: <exact title>
LENGTH_PROFILE: LONG_V12 | COMPETITOR_CUT
MAIN_DNA: <family ID>
SECONDARY_DNA: <family ID>
POV: first-person narrator, age, past vs present
SETTING: State/city, geography, calendar dates/season
FAMILY_GRAPH: father + son/daughter + in-laws + spouse + witnesses
CANON_TIMELINE: date, who, location, duration, knowledge state
ASSET_AND_AUTHORITY: owned by whom, legal instrument, proof, limitations
CLUE_LEDGER: setup-Part, witness, proof location, payoff-Part, limits
SECRECY_AND_KNOWLEDGE: who knew what, at which Part, how legitimately learned
FATHER_LIMITATIONS: what he cannot do / what he risks / what he gets wrong
PROMISE_TO_PAYOFF: title hook, action resolving exact claim in title
ENDING_ACTION: boundary/mercy/consequence confirmed by observable behavior
[PART 1]
<outline ...>
...
[PART 7]
<outline ...>
```

Need separate saved outline vs script formats. Writer script MUST have only seven standalone `[PART N]` headings; the outline may contain extra headers/ledgers. SHA source is full saved outline exact UTF-8 bytes. If changing any canon after Stage A, explicitly restart under new outline identity; do not continue old manifest.

## V1.1 additional outline fields
Preserve all canonical keys above and add `TITLE_EVENT`, `PROMISE_PAYOFF_EVENT`, `OUTCOME_PROOF`, `MORAL_COST`, `EXPLAINED_ONCE_IN`, `US_LOCAL_ANCHORS`, `SCENE_STATE_CHANGE_GRID`, `PRE_WRITE_GATES` as described in `RETENTION_ARCHITECTURE_V1_1.md`. Existing outline SHA is content-addressed, so never append fields to a locked old outline in place.

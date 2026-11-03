# EXACT HOOK PROOF V2 — JSON FORMAT AND INSTRUCTIONS

At S2 freeze `02_hook_contract.json` declaring every required timed event, its maximum seconds, chosen WPM, and literal title. Example: `{"video_id":"...","locked_title":"...","narration_wpm":150,"required_events":[{"id":"cost","description":"visible loss","max_seconds":90},{"id":"clue","description":"visible clue","max_seconds":90},{"id":"question","description":"father chooses to investigate","max_seconds":90},{"id":"outline_promise","description":"if outline promises actual receipt name by 90s","max_seconds":90}],"identity_policy":"concealed_until_midpoint"}`. This is a template, NEVER a factual measured report. At final QA save `04_hook_proof.json` next to TXT; it MUST include every S2 required ID and unchanged deadline. `anchor` must be a **unique exact literal substring** of the FINAL TXT. The validator calculates start-word and time from the actual matched location. `word_start` is a 0-based integer, `estimated_start_seconds` can be floating point rounded to ~2 decimals; validator tolerates only <=0.51 sec difference. `max_seconds` is contractually locked (normally 90; for outline-specific 60 use 60). At least `cost`, `clue`, and `question` IDs required. Other outline-locked early promises MUST be included as additional event IDs, and their semantic relevance must be checked by QA.

```json
{
  "video_id": "BDUK-2026-...",
  "script_sha256": "<actual final script sha256>",
  "narration_wpm": 150,
  "events": [
    {"id":"cost", "anchor":"<unique quoted passage depicting cost>", "word_start":0, "estimated_start_seconds":0.0, "max_seconds":90},
    {"id":"clue", "anchor":"<unique passage showing an actual clue>", "word_start":130, "estimated_start_seconds":52.0, "max_seconds":90},
    {"id":"question", "anchor":"<unique audience question or father choice>", "word_start":195, "estimated_start_seconds":78.0, "max_seconds":90}
  ]
}
```

These are schema examples, not factual offsets. Never copy them into actual report without computing. `max_seconds` cannot exceed 90 for required three events. If script has the correct title payoff later but the outline promises it at <=90 seconds, also add event `outline_promise` with its declared maximum; do not silently rewrite outline time requirement.

The validator **proves only position**, not that the passage truly expresses the claim. QA must reread quoted surrounding paragraphs. For a user supplied TTS speed, document measured WPM; do not back-solve an unrealistic fast WPM to force PASS.

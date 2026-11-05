# EXACTLY ONE REPAIR — LOGIC & JAPANESE TYPO FIRST

## Contract
Source is `FULL_SCRIPT.txt` frozen by QA. One pass is **one application transaction covering all authorized spans**. No P0/P1 left unresolved after the single pass may be claimed as READY. If QA finds new major errors afterwards, report `BLOCKED_ONE_PASS_EXHAUSTED` and do not produce a second revised version in this workflow.

## Priority ordering
- P0: facts make plot impossible (age contradictions, impossible travel/location, illegal authority as causal foundation, important reveal never established).
- P1: objects/evidence appear from nowhere, character impossible knowledge, timeline/financial contradiction, radical name/role inconsistency, important language mistake reversing meaning.
- P2: wrong kana/kanji, repeated particles (はは, をを), honorific drift, sentence fragments, unnatural Japanese, unstable narrator voice.
- P3: optional voice rhythm polish, punctuation; do not expand repair scope to style alone.

## QA ledger schema
```
{
  "baseline_sha256": "64 hex lowercase sha of exact FULL_SCRIPT.txt bytes",
  "patches": [
    {"id": "P01", "start_byte": 123, "end_byte": 279, "reason": "...", "evidence": "...", "severity": "P1", "before_sha256": "64 hex of baseline bytes[start:end]"}
  ]
}
```
Offsets are **UTF-8 bytes**, not Python Unicode codepoints. Windows non-overlapping and sorted. Include complete speaker lines to maintain syntax. Frozen QA ledger must never contain the replacement prose.

## Writer replacement file (step5 only)
```
{"baseline_sha256":"...", "replacements":[{"id":"P01","replacement":"@ore: ...\n"}]}
```
Every ledger patch has exactly one replacement; no extra edits. Writer may only replace original approved spans. Tool applies byte slices, writes new file and proof, checks no outside changes, refuses reuse. Do not edit original baseline.

## Guardrails
- Correct typo by local edit, not rewriting whole emotional passages.
- Verify modified paragraph transitions: read 5 dialogue turns before/after each patch.
- No moving scene chronology unless ledger explicitly authorizes that exact span and outline permits it.
- If issue cannot fit short precise windows, mark BLOCKED rather than expanding unapproved scope.

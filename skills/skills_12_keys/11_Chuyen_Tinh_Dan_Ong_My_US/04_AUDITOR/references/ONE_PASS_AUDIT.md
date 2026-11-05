# ONE PASS FORENSIC QA V1.1 — REPAIR ONCE, VERIFY READ ONLY

## TWO READS BEFORE EDITING
**Read A global**: storyline timeline by day/month; POV; adult ages/relations; characters' knowledge; locations/time-to-travel; job duties, health/safety and money; promises/setup/payoff; title line accurately honored; narrator's change visible; woman chooses independently; chemistry genuinely mutual. Flag factual 'last night' / 'tomorrow' mismatches and accidental inconsistent day/time.
**Read B detail**: spelling (American variants), names/pronouns/dialogue attribution, punctuation, repeated/fragmented sentences, implausible American idioms, invented roles/objects, quotation marks, clean TTS. Also audit repetitiveness (same lesson verbalized in >2 scenes) as a retention WARN unless it materially derails story.

P0 = impossible/unethical critical; P1 = wrong causal decision/timeline/person or broken emotional payoff; P2 = definite typos/grammar/idiom or specific referent inconsistency; P3 = taste-only (leave alone). Build exact change list ONCE. If the script is already sound, zero patches is valid.

## AUTHORITATIVE PATCH LEDGER — TWO SUPPORTED FORMS
String-based if source excerpt UNIQUE:
```
{
 "source_sha256":"<actual sha256>","max_repair_rounds":1,"repair_rounds_used":1,
 "patches":[{"id":"P2-001","severity":"P2","source_excerpt":"exact old sentence","replacement":"exact new sentence","why":"specific defect","patch_occurrences":1}]
}
```
Byte-offset form: same fields except `start` and `end` are integer offsets into UTF-8 SOURCE bytes and `original` is the exact original text at that range. `source_excerpt`/`original` must not be a loose paraphrase. Duplicate source excerpts FAIL; use offsets. Spans cannot overlap. For zero patches, `repair_rounds_used=0`, `patches=[]`, candidate must be byte-identical to source.

`python scripts/verify_one_repair.py final_script_draft.txt patch_ledger.json final_script.txt verify_result.json` MUST return `authorized_diff=true` and zero unauthorized diffs. This is objective permission checking, not a literary score. Do not claim `UNAUTHORIZED_DIFFS=0` based only on a manual diff.

## PART OUTPUT MUST FOLLOW FINAL AFTER PATCH
Save seven PART bodies matching final candidate, `manuscript_with_parts.txt` (lines `PART 1` through `PART 7`), `part1.txt`...`part7.txt`. Rebuild final as `\n\n`.join(all stripped part bodies) + final newline, exact bytes must equal `final_script.txt`. The USM-002 test exposed `part3.txt` from DRAFT while final script was PATCHED: **this is a release blocker**. Keep archival drafts under `_draft`, never merge them with final production files.

## FINAL QA STATUS
`QA_PASS` only if score >=97 AND no unresolved material errors AND actual word count, patch verifier, Part agreement pass. `QA_PENDING_VERIFICATION` if cannot run mechanics. `QA_FAIL_NEEDS_HUMAN` if substantive defect remains after single edit. No self-triggered rewrite or second repair. Make a single report including title, project id, both hashes, verified count method, all patch ids, exact gate results, remaining risks, and handoff.

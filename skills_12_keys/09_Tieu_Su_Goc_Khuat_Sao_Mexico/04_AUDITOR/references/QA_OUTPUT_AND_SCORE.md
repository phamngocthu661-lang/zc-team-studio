# QA outputs and release gate

`QA_REPORT.md` must include: SOURCE_FILE hash, LOCKED_TITLE SHA12, FULL_SCRIPT characters/word counts, summary of verified Sxx, READ_1_LOGIC_FINDINGS, READ_2_ORTHOGRAPHY_FINDINGS, source-claim matrix, ordered unique Pxx ledger, score breakdown (35/30/25/10), blockers, recommendation.

`QA_PATCHES.json` expected format:
```
[
  {"issue_id":"P01","start_byte":1204,"end_byte":1224,
   "replacement":"corrected UTF-8 Spanish text","reason":"typo or logic correction"}
]
```
Byte positions must be calculated from the REAL UTF8 baseline script. Empty list means no edits, not a pretext to fabricate a script. Issue IDs must match report. Replacements can change lengths; after repair, source comparison and hashes used. A QA assessment does not run a spellchecker automatically unless one actually exists; human/AI must read Spanish text.

`QA_FINAL.json` release example (field values illustrative, must be genuinely measured):
```
{"status":"PASS_READY", "score":98,
 "script_sha256":"<real SHA256>", "repair_used":true,
 "blocking_issues":[], "qa_report":"QA_REPORT.md",
 "source_register":"SOURCE_REGISTER.md",
 "title_sha12":"<real SHA12>"}
```
For initial no-repair READY, `repair_used=false` and script SHA refers to original. `PASS_READY` must mean actual same-file independent review and source gate; never merely content of JSON without QA work.

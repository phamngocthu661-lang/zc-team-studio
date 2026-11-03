# HOMELESS V12 — WRITER-OWNED SURGICAL REPAIR IMPLEMENTATION

## Mission separation

This reference is mandatory ONLY for `step5`. The QA skill owns findings, classification, frozen baseline, exact authorized windows and all subsequent independent assessments; **the Writer alone authors replacement story prose**. QA does not supply replacement prose and Writer does not change the frozen evidence, verdict or rubric.

## Exact edit format

QA zone-spec input (before QA freezes scope):

```json
{"zones":[
  {"zone_id":"Z001","patch_ids":["P01"],"start_byte":1234,"end_byte":1456},
  {"zone_id":"Z002","patch_ids":["P02"],"start_byte":28344,"end_byte":28600}
]}
```

Byte offsets are zero-indexed half-open in **exact UTF-8 source file**. They must be determined from real bytes and quote anchors, never estimated from rendered chat or Python Unicode character indices. QA creates the immutable frozen `REPAIR_CONTRACT.json` using `freeze_repair_contract.py`. This tool validates the actual frozen QA source, scope anchors, patch ID-to-Part membership, spans not crossing headings, no protected quote in editable source window, no overlap, exact expected SHA for each window and `video_id`. An intended edit of interstitial whitespace/punctuation must be included expressly in the QA-owned window.

Writer replacement payload after actual explicit user `step5` approval:

```json
{
  "schema":"HOMELESS_REPAIR_REPLACEMENTS_V12",
  "replacements":[
    {"zone_id":"Z001","text":"Exact newly authored story prose and delimiters here."},
    {"zone_id":"Z002","text":"Exact second approved repair here."}
  ]
}
```

Do not treat sample JSON as factual QA, story evidence, approval or a real patch. Every zone must have one and only one string. Writer must review the actual baseline before writing the replacements. Use `apply_authorized_patches.py` to byte splice and return a `REPAIR_PROOF.json` with source/frozen/contract/revised file SHA and per-zone changed evidence. Do not manually save a file with a near-identical name and bypass the proof utility. Composer refuses broken UTF-8 boundaries and hard length/heading failures; never declare a rejected preview as verified revision.

## Writer repair checklist

1. Trace each Pxx to original exact quote, root cause, intended correction, earlier setup, later payoff, state delta and dependencies.
2. Preserve already-successful character agency/competence/voice, cold-open/title promise, cliffhanger timing, money and legal logic, object inventories, chronology and relationship arcs.
3. For each replacement, show an editorial reason privately: what changed, why viewer logic now holds, and how first-person knowledge or narrator perspective remains legal.
4. Prevent patch artifacts: awkward transitions at zone boundaries, sudden pronoun reference failure, summarized scenes, duplicate reveal, robotic micro-sentences, injected QA terminology.
5. Inspect effects on all seven Parts WITHOUT editing outside windows. A new uncovered defect outside scope is an `AUDIT MISS`/new scope request to QA, not permission to change it.
6. Apply the strict byte composer, inspect proof, independently re-open/recount revised file and ensure `current QA READY = UNDETERMINED` until next completed Step4.
7. If changed data introduces `TRUE REGRESSION`, fix inside already-authorized windows or fail and seek new authorization; do not silently expand the edit scope.
8. Include exact revised full text artifact and hash, but do not print 70–80k chars unless the user specifically wants it.

## Multi-round protection

New Step4 on revised script produces a new QA frozen source snapshot. The original baseline and old contract remain archived; neither is overwritten. A second Step5 requires a brand-new QA scope contract referencing the new exact baseline hash. Never chain unknown patches from separate revisions without their own hash-bound ledger and approval.

## Lessons and limits

The Writer may record a proposed prevention check associated with a Pxx. Only a subsequent independent QA with genuine outcomes can validate the fix. Lessons are suggestions, not autonomous modification of these ZIP skills. Both manual editorial tests and machine byte diff tests are required for safe and high-quality repair.

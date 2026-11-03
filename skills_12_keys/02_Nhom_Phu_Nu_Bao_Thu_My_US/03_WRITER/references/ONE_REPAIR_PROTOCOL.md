# MANDATORY ONE-REPAIR POLICY (CHANGE FROM HOMELESS V12)

- Review = Step4, read-only; one author repair = Step5, once; final audit = Step4, read-only. There is **no Step5 #2** under any score, pressure, new discoveries or broken grammar.
- Step4 first identifies only actionable issues: actual continuity/canon error, unreasonable causality, jurisdiction/finance/military/legal flaw, English spelling and pronoun/name mistakes. Avoid subjective style rewrites where baseline strong.
- Freeze `QA_FROZEN.json` + `QA_ZONE_SPEC.json` + `REPAIR_CONTRACT.json` with exact `start_byte/end_byte` boundaries anchored in source; scopes as small as possible, ideally one sentence/paragraph. Must not swallow whole Part/strong spans.
- Writer Step5 prepares all replacements in one unified `REPLACEMENTS.json`, before writing any new full script; one `apply_authorized_patches.py` invocation makes revised file and proof. After success, marker `WRV_<video_id>_REPAIR_USED.json` locks it permanently in workdir.
- On error BEFORE successful application: correct the invalid spec/input and retry same never-applied attempt; once successful, no second application. Fail-closed on missing proofs, SHA mismatch or marker.
- QA final after Step5 checks entire revised script and publishes either READY or NOT READY. If NOT READY, do not revise same `video_id`; report blockers/possible new project. SEO runs only after READY same exact source hash.

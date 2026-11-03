# US MALE ROMANCE CONTROLLER V1.1 — BACKWARD-COMPATIBLE FIVE STEP ORCHESTRATION

COMMANDS: `STEP 1`, `STEP 2`, `STEP 3`, `STEP 4`, `STEP 5`, `NEXT`, `STATUS`, `REDO STEP n` (only with explicit user request). Never auto-run other projects. Keep folder names & old handoff aliases verbatim.

STATE FLOW:
`TITLE_READY` → `OUTLINE_READY` → `SCRIPT_DRAFT` → `QA_PASS` → `SEO_READY`.
Stop states: `OUTLINE_FAIL`, `SCRIPT_INCOMPLETE`, `QA_FAIL_NEEDS_HUMAN`, `QA_PENDING_VERIFICATION`, `SEO_BLOCKED`. `NEXT` advances only when preceding gate is actually passed. `REDO STEP 4` is NOT an automatic bypass of MAX_REPAIR_ROUNDS=1; user must explicitly authorize a new audit attempt on a stated script version.

SOURCE OF TRUTH: real saved `final_script.txt` and verified SHA-256. A chat assertion, handoff label, or claimed editorial score does not prove tests ran. Step 4 one aggregate repair + read-only final check, Step 5 only verified final. Any missing stale final parts or inconsistency => block release and sync DERIVED parts only, without editing final story.

HANDOFF FIELDS: `PROJECT_ID`, `CONTENT_FAMILY`, `CURRENT FINAL TITLE`, `LOCKED_TITLE`, `PRIMARY_DNA`, `OUTLINE_ID`, `FULL STORY OUTLINE`, `FULL SCRIPT`, `QA FINAL SCRIPT`, `SCRIPT_SHA256`, `FINAL_WORDS`, `WORD_COUNT_METHOD`, `QA_STATUS`, `REPAIR_ROUNDS_USED`, `SEO_PACK`, `SEO_STATUS`, `STEPS_COMPLETED`. Use `UNVERIFIED` rather than invent SHA/counters.

INSTALL note: Skills and shared contract are siblings in this ZIP. Controller may map existing Step identifiers to these roles. Do not overwrite other niches' instructions or rename aliases.

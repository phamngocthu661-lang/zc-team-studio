---
name: us-male-romance-script-writer
version: "1.1"
language: "vi"
description: "STEP 3: first-person US romance script, seven-part scene control and accurate file/count handoff."
---
# STEP 3 — WRITE FULL SCRIPT (DRAFT ONLY)
Read `../00_SHARED/SHARED_PRODUCTION_CONTRACT.md`, `../00_SHARED/CHANNEL_DNA.md`, `references/SCRIPT_ENGINE.md`.

Lock title, 7-part approved outline, scene IDs, ages, relationship history and major decisions. One adult male narrator speaking first-person in believable American English. Hook must deliver specific title incident early, typically first 80–150 words. Create attraction via action, timing, voice, and mutually risky choices, not continuous declarations or a tutorial about healthy relationships. Make female co-lead an active participant with humor, constraints and independent outcomes. Use lively colloquial speech with individualized voices (avoid every character sounding like a therapist). Keep grounded US details, dialogue attribution, chronology, weather/routes and job schedules. No fabricated fact/true-story claim, no overwritten title.

Use approved SOFT part budgets, but honor HARD overall 6,700–8,100 whitespace-delimited words unless user overrides; prefer 7,300–7,700 and leave 100-word repair buffer. If any Part overruns plan, record `PART_BUDGET_WARN` with reason; don't quietly change outline facts to pad. Save all seven draft part texts and optionally draft manuscript, then join **exactly** with `\n\n` and final LF into `final_script_draft.txt` (clean TTS: no Part/scene headers, markdown, cues). `WORD_COUNT_METHOD=Python str.split on UTF-8`; `verify_script.py` can check draft; hash actual saved draft only. Do NOT use regex count in handoff. If output is truncated or no actual file, status SCRIPT_INCOMPLETE or UNVERIFIED; never self-approve QA.

Output `STEP3_handoff.md`, `final_script_draft.txt`, optional `partN_draft.txt`, `OUTLINE_ID`, `SCRIPT_SHA256` DRAFT, actual words, per-part words, `STEP4_HANDOFF`. **Important:** final `partN.txt` files are not to be used until Step 4 creates them from final patched manuscript.

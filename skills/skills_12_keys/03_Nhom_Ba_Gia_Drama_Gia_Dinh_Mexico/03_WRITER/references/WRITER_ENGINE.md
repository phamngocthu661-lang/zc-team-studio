# WRITER ENGINE V1.1 — 3 STAGES / CAUSALITY / SINGLE REPAIR

## STEP 3 DRAFT (A / B / C)
Write first-person mature female es-MX testimony with credible local details (Puebla, colonia, escritorio, recibos, tarjeta, consuegra); varied spoken cadence suitable for TTS. Let adult relatives have independent motives, including inconvenient sympathy, and let mother make costly choices. The dominant sound is human anecdote, not an English-language moral essay mechanically translated to Spanish.

**A = Parts1–2:** begin with the actual offense the locked title promises, then narrator's specific response. Prefer 20,400–22,000 body characters, but NEVER pad solely for length. **B = Parts3–5:** escalate through evidence, counteraction and real cost; 30,600–33,000. **C = Parts6–7:** credible confrontation, one irreversible decision, concise aftermath; approx 21,600–23,600. Full must pass 70,000–80,000; preferred 74,000–78,000. Stage tool stores actual A/B/C and assembles EXACT concatenation, no retroactive regenerations from chat memory.

### Scene State Lock — mandatory BEFORE and AFTER every scene
Maintain a Writer `SCENE_STATE_LEDGER` tied to the locked outline:
- `scene_id`, `part`, `story_date`, `time_of_day`, `narrative_order`, `flashback_signal_exact_text` if time moves backward;
- each principal's `location`, `health`, `money`, `access_to_house`, `document_possession`, `relationships` before and after;
- `known_fact_ids_by_character` before and after; source and date of every newly known fact;
- a single real `cause -> choice -> cost/changed state`, unique relative to neighboring scenes.

Do NOT set a narrator's information back to unknown because the prose revisits an earlier day. First-person retrospection still needs clear distinction between *she learned that day* and *I later found out*.

### A/B/C handoff
At every segment boundary reread the persisted previous segment and its state ledger. Recalculate exact count, verify locked title/outline/hash, list unresolved obligations and facts already known. BEFORE writing B: confirm events in A and their chronology. BEFORE writing C: confirm no duplicated revelation and no third consecutive preparation for the same meeting. Never fabricate or backdate a diary/document as needed by plot.

### Make 70k–80k INTERESTING, not repetitive
- Concrete actions over theme slogans; advance a distinct stake at least once every 5–8 minutes. Avoid three consecutive introspective paragraphs restating boundaries, dignity, or the same insult.
- Two or three earned reversals with costs (e.g. a witness changes allegiance; document invalidates a claim; child's independent choice), not disconnected shocks.
- At beginning of Part5 and Part6, there must be a new obstacle or decision, not just re-exposition of the promised Part4 meeting.
- Part7 must show real aftermath but avoid reopening resolved arguments for an extended lecture.
- At every scene exit ask: What is now impossible that was possible before? If nothing, compress or combine scenes.
- Proof chain: valid access to messages, recordings, ownership docs, receipts; do not invent instant eviction, sale, court verdict or bank authority.

## STEP 5 — ONE FROZEN BATCH ONLY
- Must have original untouched full script, independent `QA_FROZEN_LEDGER.json`, user-approved windows and no prior proof/lock. DO NOT infer approval from QA's existence.
- Before generating `REPLACEMENTS.json`, create a **PATCH IMPACT MAP** per issue: scene before, scene containing patch, scene after, all impacted facts, times, ownership and pronouns. Anticipate day/night reversal; if intended change spans those scenes, QA must have frozen all necessary windows in the first batch. Writer CANNOT freely broaden them later.
- Only ONE batch. Each replacement must be meaningful, orthographically correct, and preserve real-world causal links. Keep all text outside frozen windows exactly intact, regardless of stylistic improvement ideas.
- Run `repair --user-approved`; obtain `FULL_SCRIPT_REVISED.txt`, immutable `REPAIR_PROOF.json` containing revised byte offsets per issue; leave baseline untouched. No further Writer editing after this call. Return Step4 FINAL for independent rereread of entire revised manuscript.
- If requested fix requires another window and the single frozen batch can't handle it, STOP, report BLOCKED and do not burn or simulate a repair with knowingly defective content.

### Automated checks are limited
`verify`, `stage`, `repair` and hashes prove artifact integrity and scope. They CANNOT judge emotional honesty, Mexican orthography or time consistency from prose alone. Never claim that script automatically passes its own editorial audit.

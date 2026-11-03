> V12 BOUNDARY: This reference is retained for **read-only QA diagnosis and re-audit**. Any legacy command to rewrite script prose is superseded; Step5 Writer owns every replacement.

# FORENSIC REVIEW ENGINE V1.7.0

## PURPOSE
Run silently before publishing the Patch Ledger. The audit must be exhaustive on **all actionable defects**, including small ones. The visible explanation for each item can be concise; the item count must not be artificially limited.

Mandatory companion protocols: `CROSS_SKILL_QUALITY_CONTRACT.md`, `DOUBLE_READ_EXHAUSTIVE_PROTOCOL.md`, `YOUTUBE_AUDIENCE_READINESS.md`, and `QA_DIAGNOSTIC_REPORT_V12.md`.

## PASS 0A — RUBRIC + DELIVERY FREEZE
Freeze the shared fixed 100-point rubric, hard gates, hard 70k–80k character range and current user overrides before issue finding. These may not change in later re-audits of the same lineage.

Also open a `SCORE DEDUCTION LEDGER`. Every actionable defect that enters the first Patch Ledger must receive one fixed deduction in exactly one primary rubric category. Freeze that deduction before publishing the baseline score; later re-audits may not silently reweight the same unchanged defect.

## PASS 0 — BASELINE + REVISION RISK
Before criticism, record exact characters per Part and total, hard caps/target if known, and strong spans. Identify whether each likely repair is local, chain-level, or entire-Part. Never let a global compression instruction emerge from a local problem.

# MANDATORY READ 1 — WHOLE STORY
Read the full script first for comprehension and build the silent maps. Do not finalize a ledger before reaching the end.

## PASS A — STORY CONTRACT
- What does the title promise?
- What is the central dramatic question?
- What is the protagonist's material/emotional need?
- What is the grand reveal?
- What must remain true for the ending to land?

## PASS B — CANON / CONTINUITY
Build tables internally for:
- characters, ages, roles, relationships;
- dates, time spans, travel windows;
- money, property, jobs, contracts, debts;
- objects, keys, documents, phones, vehicles, tools;
- locations/access/permissions;
- injuries/weather/physical states.

Flag contradictions and smaller continuity slips a careful viewer/editor could notice.

## PASS C — KNOWLEDGE FORENSICS
For every important line/decision ask:
- How does this person know this?
- When did they learn it?
- Was the source reliable?
- Are they speaking a hypothesis as if it were fact?
- Has narrator knowledge leaked into character knowledge?

## PASS D — CAUSALITY
For every discovery/reveal:
CAUSE → ACTION → EVIDENCE → INTERPRETATION → NEXT ACTION.

Reject chains that are actually:
COINCIDENCE → LUCK → PERFECT CLUE → PERFECT SOLUTION.

## PASS E — WHY-NOT-EARLIER
For hidden rooms, documents, inheritances, bodies, machinery, old secrets, buried objects:
- why did it survive?
- why did nobody find it?
- what changed now?
- why this protagonist?

Use stacked reasons for large/old secrets.

## PASS F — REAL-WORLD MECHANICS
Check:
- mass/weight/leverage/load;
- rust/corrosion/settlement;
- wood swelling/shrinkage;
- paper/leather/textile aging;
- electricity/battery/fuel;
- travel/speed/weather;
- architectural scale/spatial volume;
- tools appropriate to task;
- fragile artifact handling;
- measurement/scale conversions;
- construction sequence and access.

## PASS G — INSTITUTION / PROFESSION
A competent institution should behave competently unless story explains failure.
Check:
- lawyers/title review;
- developers/due diligence;
- banks/loans;
- police/evidence;
- hospitals/records;
- museums/conservation;
- government/permits;
- contractors/engineering;
- employers/HR/contracts;
- job titles/credentials/authority.

## PASS H — HUMAN INCENTIVES
Ask:
- What does each character risk losing?
- Would a financially desperate person really reject this offer immediately?
- Does antagonist gain something concrete?
- Does witness have reason to speak/silence?
- Are decisions mixed/practical enough to feel human?
- Are reactions proportional to stakes and information available?

## PASS I — EVIDENCE STANDARD
Major claims should not rest on one convenient source.
When stakes are high, seek triangulation:
physical evidence + primary record + independent corroboration/expert interpretation.

## PASS J — HOOK + RETENTION — HARD EARLY SURVIVAL AUDIT
Run a dedicated opening audit before general prose polish.
- Title promise by ~200 chars?
- Physical/verifiable proof by ~400?
- Stakes by ~650?
- Micro-Payoff #1 by ~1,100?
- Bigger question + protagonist next action by ~2,000?
- Micro-Payoff #2 / functional clue by ~5,000?
- Any Hook Reset / biography dump before first payoff?
- Any >~500-char uninterrupted early exposition block inside first ~2,000 chars?
- After ~5,000 chars, any ~6,500-char retention desert?
- Does each later 5–10% change information, leverage, pressure, consequence, decision or emotion?
- Any dead document block?
- Any reveal too early/late?
- Any loop dormant too long?
- Difficult choice real?
- Consequence proportional?
- Ending closes the right emotional and factual loops?

A hook that only raises questions and withholds all proof/progress is a structural fail.

## PASS K — CHARACTER / AUDIENCE / LANGUAGE / PLATFORM
Run `YOUTUBE_AUDIENCE_READINESS.md`:
- character voice/canon consistency;
- mature American 40+ legendary/heritage voice fit;
- spelling/grammar/punctuation/American-English consistency;
- YouTube platform and advertiser-sensitivity risk;
- strong-span identification before recommending large rewrites.

## PASS L — AI-PROSE / HUMAN FEEL
Scan every Part for:
- repetitive micro-paragraphs;
- too many fragments;
- repeated `Not X. Not Y. Z.`;
- repeated sentence openings/cadence;
- generic wisdom;
- narrator re-explains what action showed;
- exact theme quote coincidences;
- every character speaking with same polished intelligence;
- protagonist always having the perfect line;
- every scene ending in a quotable line;
- clues/evidence too perfectly curated;
- repeated punchlines/motifs;
- redundant emotional explanation;
- unnatural exposition disguised as dialogue;
- overly symmetrical scene construction;
- phrases that sound templated or AI-cinematic.

## PASS M — EXACT DETAIL SWEEP
Inspect every:
- age;
- date;
- time;
- duration;
- price;
- salary;
- distance;
- room/object number;
- quantity;
- historical year;
- legal/professional label.

Each exact detail must be consistent, plausible, and worth its precision.

# MANDATORY READ 2 — LINE-BY-LINE ADVERSARIAL READ
Read the entire script again from beginning to end.
Do not merely revisit known problem scenes.
During this second full read, capture every additional actionable defect, however small.
Use `DOUBLE_READ_EXHAUSTIVE_PROTOCOL.md`.

## PASS N — OCCURRENCE ENUMERATION
For recurring problems, enumerate every location that needs an edit.
Do not replace 30 local fixes with a vague instruction like “reduce staccato globally.”
A root patch may have O01...O30.

## PASS O — DEPENDENCY + REPAIR SIMULATION
For every candidate patch, inspect:
- earlier setup;
- later callback/payoff;
- object/knowledge state;
- timeline;
- motive;
- legal consequence;
- ending reference.

Ensure the proposed repair will not create a new contradiction. Also predict whether it would change Part length, touch protected strong spans, or require updates outside the immediate scene. Record those dependencies in the same Patch ID before ledger freeze.

## PASS P — OMISSION SWEEP / SECOND OPINION / LEDGER SATURATION
Before publishing ledger, ask internally:
“If I receive this same script tomorrow, what actionable issue would I regret not mentioning today?”
Then spot-check all numbers, callbacks, documents, repeated phrases, and patch dependencies one more time.

## COMPLETION RULE
The audit is not complete until:
- two full reads are complete;
- every actionable issue found in either read is represented;
- every repeated actionable occurrence is enumerated;
- no arbitrary issue cap has been applied;
- pure taste preferences have been excluded;
- baseline length has been recorded;
- each significant patch has Length Intent;
- repair simulation/dependency closure is complete;
- every proposed entire-Part rewrite has MUST PRESERVE spans and target length;
- no vague global compression instruction can spill into passed material;
- every Pxx/Oxx family has a frozen primary rubric category + fixed score deduction;
- `SCORE DEDUCTION LEDGER` total reconciles exactly to the visible numeric baseline score;
- no score is hidden merely because the script is below 98 or fails a hard gate.


## STATE DELTA SWEEP — V1.4
Audit all mutable states: cash, animal/herd count, horses/vehicles, objects, injuries, knowledge, access, legal status. Every downstream state requires a visible or ledger-established transition.

## PATCH-ARTIFACT SWEEP — V1.4
Flag editor-facing/meta residue introduced by prior repairs, especially modern comparisons in historical prose, `story/narrator/cut/patch` language, and unnecessary legal disclaimers.


# PASS Z — COVERAGE + SATURATION FREEZE — V1.7.0 HARD GATE
Before publishing the first QA:
1. build a Part × Audit-Dimension matrix;
2. every cell must be PASS or mapped to Pxx/Oxx;
3. run reverse dependency read Part 7→1;
4. run one complete final saturation pass;
5. if saturation finds any new actionable defect, add it, update score/dependencies, and repeat saturation;
6. only freeze when the latest full saturation pass finds **0 new actionable defects**.

Do not publish a provisional score/ledger. The first visible score is the saturated frozen baseline.

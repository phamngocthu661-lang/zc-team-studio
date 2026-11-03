# CANON STATE MATRIX — V1.6.1
## MANDATORY PRE-DRAFT + PRE-OUTPUT STATE CONTROL

This reference is mandatory for every script run. `SKILL.md` wins if anything conflicts.

## 1. PURPOSE

Long-form scripts usually fail above the prose layer. The common defects are state drift:
- $23 becomes $11 after an untracked purchase;
- a father is 17 in a year that makes parenthood impossible;
- narrator uses a ranch name before the protagonist names it;
- a company lawyer sounds like protagonist's counsel;
- a cold-open discovery is rediscovered after the flashback;
- Part 6 reaches spring and Part 7 starts winter again;
- a character knows an exact hidden location before any transfer of knowledge.

V1.6.1 treats the script as a state machine.

## 2. PRE-DRAFT MATRIX

Build internally before prose:

### A. EVENT / TIMELINE
`EVENT ID | DATE/SEASON/YEAR | ELAPSED | PART | LOCATION | STATE CHANGE`

### B. AGE
`CHARACTER | BIRTH YEAR/AGE | EVENT YEAR | AGE AT EVENT`

### C. MONEY
`TX ID | BEFORE | CHANGE | AFTER | EVENT | WHY`

### D. OBJECT
`OBJECT | HOLDER | LOCATION | PHYSICAL STATE | ACCESS | LAST CHANGE`

### E. KNOWLEDGE
`FACT/CLUE | PROTAGONIST | ANTAGONIST | SUPPORT | INSTITUTION | LEARNED AT EVENT`

### F. ACCESS / AUTHORITY / ROLE
`ACTOR | ROLE | REPRESENTS | MAY DO | MAY NOT DO | CURRENT ORDER/CLAIM`

### G. NAMING
`NAME/TERM | FIRST VALID INTRO EVENT | SOURCE/PERSON | NARRATOR MAY USE AFTER`

### H. EXACT NUMBER
`NUMBER | TYPE STATE/CHEKHOV | CURRENT VALUE OR PAYOFF | SOURCE | PART`

### I. COLD OPEN
`EVENT ID | KNOWLEDGE STATE | FLASHBACK START | RETURN POINT | NO-REDISCOVERY ITEM`

### J. RESOLUTION MODE
`IMMEDIATE or PROCEDURAL | PART 6 STOPPING POINT | PART 7 CONTINUATION`

### K. STATE DELTA / ANIMAL-INVENTORY
`STATE | BEFORE | CHANGE EVENT | AFTER | NEXT DEPENDENCY`
Track cattle/herd count, horses/vehicles, injuries, inventory, legal filing status and any other mutable state that could otherwise appear suddenly in a later Part.

## 3. STATE MUTATION PROTOCOL

Before each scene:
1. load current state;
2. identify what changes;
3. write scene;
4. update state;
5. never reuse a stale value after mutation.

Example:
`Cash 23 → wire -2 → 21 → filing -12 → 9`.
Later prose must use 9 until another transaction changes it.

## 4. STATE NUMBER VS CHEKHOV NUMBER

### STATE NUMBER
Changes through action.
Examples: cash, debt, cattle count, days remaining, age, inventory.
Rule: RECOMPUTE.

### CHEKHOV NUMBER
Stable clue/verification detail.
Examples: 3–17, survey bearing, serial, construction date.
Rule: PAY OFF / VERIFY / CONSTRAIN or remove emphasis.

Never treat a state number as static memory.

## 5. COLD OPEN EVENT LOCK

If Part 1 uses `cold open → flashback → return`:
- assign one Event ID;
- freeze protagonist knowledge at that event;
- specify exact frame/physical action where narrative returns;
- do not stage the same discovery later as new;
- if the cold open occurs later in chronology, protagonist must retain all knowledge already acquired by then.

ONE DISCOVERY = ONE DISCOVERY.

## 6. NAMING INTRODUCTION LOCK

Narrator may use a story-specific proper name only after:
- protagonist/supporting character names it; or
- an existing sign/map/deed/record introduces it.

Track this for ranches, houses, rooms, tunnels, mechanisms, projects and nicknames.

## 7. ACCESS / AUTHORITY LOCK

Before an actor exercises power, check the matrix.

Examples:
- sheriff enforces an order but does not create property law;
- company counsel represents company interests;
- clerk explains filing but does not award final title;
- surveyor establishes bearings/location, not legal ownership;
- conservator protects artifacts but does not decide criminal liability.

If wording makes the role ambiguous, rewrite the wording, not the plot.

## 8. PERIOD LANGUAGE GATE

For historical stories, exact institutional/legal/professional language is itself a factual claim.

For any period-sensitive:
- office title;
- statute/procedure;
- filing name;
- litigation term;
- professional instrument;
- credential/title;

Use this rule:
1. verify from authoritative source if available and material;
2. if not confident, GENERALIZE;
3. never insert a modern term merely because it sounds professional.

Example principle:
prefer `the records each side would have to rely on` over an unverified modern procedural phrase.

## 9. PROCEDURAL RESOLUTION MODE

When outline selects PROCEDURAL:
- Part 6 ends with evidence threshold + immediate consequence + provisional standstill/changed leverage;
- Part 7 carries explicit time markers through winter/spring/months later;
- settlement/review may remain limited/provisional;
- no instant magical legal victory;
- no silent seasonal reset.

## 10. BLIND STATE AUDIT

After complete draft, ignore style and inspect only matrix transitions:
- Does every money transaction balance?
- Does every age work?
- Does every time jump have a marker?
- Is every object where it should be?
- Does every character know only what they earned?
- Is every authority action within role?
- Was every name introduced before use?
- Does every state number reflect latest mutation?
- Is cold-open discovery singular?
- Does Part 6→7 move forward in time?

Any failure requires repair and a full recheck.


## 11. NO NEW STATE WITHOUT TRANSITION — V1.6.1 HARD GATE
A new animal/object/payment/receipt/vehicle/legal status appearing in prose must have either:
- a pre-existing state established earlier; or
- an explicit acquisition/change event in the State Delta ledger.
Epilogue time jumps do not waive this rule.

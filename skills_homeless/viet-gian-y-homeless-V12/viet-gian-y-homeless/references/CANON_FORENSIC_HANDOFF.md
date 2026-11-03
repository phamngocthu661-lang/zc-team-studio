# CANON + FORENSIC HANDOFF PROTOCOL — V2.3.1

This reference is mandatory for every outline run. `SKILL.md` wins if anything conflicts.

## PURPOSE

The outline must not only describe a good story. It must hand the Script Writer a **state-safe executable blueprint**.

The most common long-form failures are cross-Part state drift:
- money recalled instead of recalculated;
- age/date arithmetic breaking after a historical reveal;
- cold open replayed as a second discovery;
- property name used before anyone names it;
- actor exercises authority they do not have;
- Part 6 crosses winter/spring and Part 7 silently resets to winter;
- antagonist knows a fact before a knowledge-transfer event;
- exact number changes because prose memory drifts.

V2.3.1 prevents these by converting continuity from a list into ledgers.

## 1. MASTER TIMELINE LEDGER — HARD GATE

For every story-changing event create:

`EVENT ID | ABSOLUTE DATE / SEASON / YEAR | ELAPSED SINCE PRIOR EVENT | PART | CHARACTER AGE | LOCATION | STATE CHANGE`

Rules:
- use absolute year/season where historical chronology matters;
- calculate ages from birth year / story year;
- every time jump must have an explicit marker;
- chronology must move one direction unless a flashback is explicitly marked;
- Part 6→7 must not silently reset season/year;
- if exact date is unnecessary, use stable relative timing such as `late June`, `three weeks later`, `by September` rather than invented calendar precision.

## 2. MONEY LEDGER — HARD GATE

Every monetary state change uses:

`TX ID | BEFORE | CHANGE | AFTER | EVENT/PART | REASON`

Rules:
- STATE NUMBERS MUST BE RECOMPUTED, NOT RECALLED;
- after a $2 purchase from $23, current cash is $21 until another transaction changes it;
- later prose callbacks must use the CURRENT state, not the original number;
- if exact cash is not story-relevant, generalize rather than create a fragile state variable.

## 3. AGE / HISTORICAL EVENT LEDGER — HARD GATE

For every important historical date:

`CHARACTER | STORY AGE | STORY YEAR | HISTORICAL YEAR | AGE AT HISTORICAL EVENT | RELATIONSHIP IMPLICATION`

Reject impossible parent/child or career chronology before output.

## 4. OBJECT STATE LEDGER

`OBJECT | LOCATION | HOLDER | PHYSICAL STATE | ACCESS RESTRICTION | LAST CHANGE EVENT | NEXT PAYOFF`

Track:
- notebook;
- key/tool;
- sealed tube/box;
- vehicle;
- weapon if title-relevant;
- symbolic ending object;
- critical documents.

No object may teleport or recover from damage without an event.

## 5. KNOWLEDGE LEDGER — HARD GATE

`FACT/CLUE | PROTAGONIST | ANTAGONIST | SUPPORTING ACTORS | PUBLIC/INSTITUTION | LEARNED AT EVENT`

Before every pressure beat ask:
- how did this person learn this?
- could they know the general location but not the exact entrance?
- did a filing reveal a parcel but not a hidden access route?

No character may act on information they have not received.

## 6. ACCESS / AUTHORITY / LEGAL ROLE MATRIX — HARD GATE

`ACTOR | ROLE | REPRESENTS | AUTHORITY | LIMITS | CURRENT ORDER/CLAIM STATUS`

Examples:
- sheriff may serve/enforce an order but does not invent civil property rights;
- company counsel negotiates for the company, not secretly for protagonist;
- clerk explains filing procedure but cannot grant final ownership by conversation;
- surveyor verifies location/bearings but does not decide law.

Every scene involving government, lawyers, police, banks, developers, courts, preservation authorities, hospitals or licensed professionals must stay inside this matrix.

## 7. NAMING / TERMINOLOGY INTRODUCTION LOCK — HARD GATE

For every important story-specific name:

`NAME/TERM | FIRST VALID INTRODUCTION EVENT | WHO NAMES/RECORDS IT | NARRATOR MAY USE AFTER`

Applies to:
- property name;
- hidden room;
- historical mechanism;
- local nickname;
- project/company name when not already public.

A property cannot become `Bellhaven` in narration before a naming event or an existing record establishes that name.

## 8. EXACT-NUMBER LEDGER

Classify every emphasized number:

### STATE NUMBER
Changes over time and must be recalculated.
Examples: cash, debt, cattle count, age, remaining days, inventory.

### CHEKHOV NUMBER
Exists to verify, constrain or pay off.
Examples: `3–17`, `42`, exact bearing, serial number, construction date.

`NUMBER | TYPE | SOURCE | UPDATE/PAYOFF RULE | PART`

Never treat a STATE NUMBER like a static clue.
Never emphasize a CHEKHOV NUMBER with no payoff.

## 9. COLD-OPEN CONTINUITY LOCK — HARD GATE

If the story uses a flashback cold open, record:

`COLD OPEN EVENT ID | DATE/SEASON | LOCATION | CHARACTER KNOWLEDGE STATE | FLASHBACK START | EXACT RETURN POINT | WHAT MAY NOT BE RE-DISCOVERED`

Rules:
- ONE DISCOVERY = ONE DISCOVERY;
- cold open may start or preview an event, but the post-flashback return must resume the same event rather than recreate it as new information;
- protagonist knowledge at cold open must match chronology;
- if cold open happens months later, she cannot react as if she has not learned facts acquired in the intervening months.

## 10. RESOLUTION MODE — HARD GATE

Choose one before Part architecture is finalized.

### MODE A — IMMEDIATE / PRIVATE
Use when the main external problem can plausibly be resolved near the grand reveal without months of procedure.

### MODE B — PROCEDURAL / MULTI-SEASON
Use for court, title chain, water rights, probate, government review, archival verification, survey, preservation designation, institutional investigations.

MODE B contract:
- Part 6 = reveal + evidence threshold + immediate leverage change + provisional standstill/consequence;
- Part 7 = explicit time progression + longer-term review/negotiation/provisional or final outcome + healing;
- do not force a miraculous Part 6 legal victory;
- do not let Part 6 cross winter/spring and Part 7 reset to winter.

## 11. COLD-OPEN / TITLE CONTRACT CROSS-CHECK

If title says:
- `at gunpoint` → a weapon must literally be pointed/threatened, not merely holstered;
- `they couldn't find` → there must be a meaningful period where exact location/access remains undiscovered;
- `sealed room` → physical sealed-room payoff must occur;
- exact price/age/location → preserve or consciously generalize only if title is being changed elsewhere.

## 12. PRE-HANDOFF RED TEAM

Before output imagine a skeptical Script Writer/QA asking:
- What exact day/season is this?
- How much money is left right now?
- How old was the father in 1874?
- Who named this place?
- Why does this lawyer have that role?
- How did Wade know the term but not the entrance?
- Did this discovery already happen in the cold open?
- Did winter already happen?
- Is this number a clue or a changing state?

If any answer requires guessing, the outline handoff is incomplete.

## 13. ACCEPTANCE

An outline is not ready because it is emotionally strong. It is ready only when:
- FINAL SCORE >=98/100;
- every hard ledger balances;
- no role/authority ambiguity remains;
- no unmarked time reversal remains;
- no state number is stale;
- the Script Writer can draft without inventing missing continuity logic.


## 11. STATE DELTA + ANIMAL/INVENTORY LOCK — V2.3.1

In addition to object state, track living/inventory states that can mutate:
`STATE | BEFORE | CHANGE EVENT | AFTER | NEXT DEPENDENCY`

Mandatory when relevant for cattle/herd count, horses/vehicles, injuries, tools/inventory, cash, filing status and occupancy status.
No downstream animal/object/legal state may appear without a transition or established pre-existing state.

## 12. LENGTH BUDGET HANDOFF — V2.3.1

Handoff must include Part targets compatible with `CROSS_SKILL_QUALITY_CONTRACT.md`: **HARD total 70k–80k characters inclusive**, preferred 74k–78k; word count is diagnostic unless user separately constrains it.
Do not pass an outline unless its beat density can naturally sustain **70,000–80,000 script characters**. Underbuilt outlines that would force filler below 70k are NOT READY; overbuilt outlines that require >80k must be normalized before handoff.

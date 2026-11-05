# CONTINUITY / LOGIC LEDGERS FOR MEXICO TELENOVELA

## Mandatory canonical tables in outline
`TIMELINE` columns: event_id, date/day, time, city, participant, duration/travel, prerequisite, output state.
`RELATIONSHIP` columns: name, age, role, ties, living arrangement, knowledge timeline.
`MONEY` columns: event, source, account/owner, amount MXN, who may authorize, when, bank/document evidence, final state.
`EVIDENCE` columns: item, produced_by, orig_location, copies, custody at each scene, authentication, shown to who and when.
`KNOWLEDGE` columns: person, scene learned, source, belief before, knowledge after, what they may truthfully say.
`ACCESS` columns: person, place/record/property, right at time, lawful channel, obstacle, proof.
`EXACT_NUMBERS` columns: item, canonical value, initial scene, last scene, consistency check.
`OPEN_LOOPS` columns: loop, seed, first partial reward, final reveal, closure action, no spoiler.

## Common contradictions to prevent
1. Wife discovers affair on Tuesday but says she confronted lover a week earlier without explanation.
2. CEO's wife is made legal majority owner merely because a friend sends an email.
3. Woman produces hospital confidential records without legal access; doctor discusses her file with ex.
4. Child born months before pregnancy timeline allows; newborn travels without logistics.
5. Only one witness to gala insult but all executives suddenly know and applaud her.
6. Divorce filed vs finalized vs property partition are confused as same instant event.
7. Her inheritance or intellectual property appears in final act with no setup.
8. Villain knows evidence found in her private home before anyone informs him.
9. She uses her husband's card to block everyone's accounts without authorization.
10. Nationality/language/city shifts (CDMX vs Monterrey) without travel/transport.

## Scope for QA edits
Protect the most effective original paragraphs as `strong_spans` via exact quotes; when one sentence needs a grammatical correction, protect adjacent context, not the sentence itself. QA windows must be disjoint and must NEVER overlap any protected span even partly. A typo appears across dozens of lines? Group bounded exact-text windows as separate issue IDs within the *same single repair batch*.

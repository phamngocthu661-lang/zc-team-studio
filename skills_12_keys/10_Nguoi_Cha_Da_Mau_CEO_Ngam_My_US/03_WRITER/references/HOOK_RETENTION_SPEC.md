# HOOK / RETENTION CONTRACT V2

Narration timing uses actual words, not paragraphs. Default 150 WPM => 2.5 words/sec, 225 words/90s. Users can choose WPM 125–180 to match voice; store exact value in QA proof. Do not count voice pauses as free time. Review a real TTS sample if exact timing matters.

Opening must contain: (1) consequence that changes the Black dad's life or a dependent person's plan, (2) one observable mystery / credible overlooked clue, (3) an unresolved question caused by father's choice. The "mystery" is not a generic narrator boast. Use <=225 words for these three at 150 WPM. Title's *final* twist can be delayed if the outline says so; never falsely claim early twist is in the first 90s.

Long-form 7-part arc with variation: rupture → parenting responsibility → antagonist pressure + hero competence → evidence hypothesis shifts → tangible setback / ethical choice → independently checked reveal → consequences and changed family behavior. Additional mini-turns need not all be money or secret CEOs. Every 4–7 minutes change goal/cost/knowledge, not merely introduce more official paperwork.

Example anti-pattern from real V1 test: outline assigned `Graham Vale` receiving-slip name to 60–90 sec, but final script first shows it around word 605 (≈242 sec at 150 WPM). This is a **FAIL** even when QA reports 98/100. Another failure: narrator says by word ~230 that 'Viv ran the company,' eliminating viewer surprise while protagonists still don't know.

At S4 mark evidence offsets in text before claiming a time. Distinguish start-word index 0-based vs end. `04_hook_proof.json` final anchors must match exactly once; if duplicated quote use a longer unique substring. Verify math with validator.

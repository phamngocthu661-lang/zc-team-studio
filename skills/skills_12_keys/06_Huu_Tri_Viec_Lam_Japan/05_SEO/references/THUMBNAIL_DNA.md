# Thumbnail DNA — from 54 JPG in dataset

Observed: 16:9 720x404 previews; top LARGE yellow headline on black, bottom red/white huge text with thick black/white stroke, 2–5 scenes and reaction face (elderly person or original cartoon anchor). Success unknown because supplied impressions/CTR absent. Use for layout hypothesis not as a mask to copy.

For new creations: 16:9 1280×720 or higher, mobile-first. Prefer only two large textual levels and max ~16–22 total large glyphs. Elderly subject dignified, 2–3 telling details, legibility without peeking; the visual must correspond to **actual** scripted anecdote. Three options must be **three separate image files**, not three frames in one image.

A. `費用の落とし穴`: top yellow *price/hope*, bottom red *unexpected cost*, documents/rent ticket and contrasting elderly emotion.
B. `仕事と尊厳`: top yellow normal work expectation, bottom white/red dissonant human moment, e.g. nameplate/shift timetable only if script includes it.
C. `選択の比較`: symmetrical two decisions and two consequences grounded in two different reviews; not fabricate income statistics.

Prompt should instruct model to reproduce exact Japanese characters. In a real image render, proofread kanji, truncation, spaces, crop safe zone. If text quality poor, provide a separate overlay layout recommendation without pretending flawless generation.

## V1.1 visual post-render gates
Based on first-run three thumbnails: A/B had high-impact two-line overlays and clear 2-subject scenes; C became overly busy with mini checklist and labels. For C create a genuinely different clean comparison, with only 2 text zones; remove small labels/checklists. At output, inspect each 1280x720 asset at native scale AND at ~320x180; verify exact Japanese overlay characters with the approved text, safe-zone, no cut-off, expression, visual-script link, no repeated mascot. Reject a visually appealing image if wording is wrong. Report per-image `TEXT_QA`, `MOBILE_QA`, `SCRIPT_TRUTH`; SHA/dimensions do not imply these PASS. Prefer single large older person + specific prop over crowded 4-figure images. Keep three separate image files for A/B/C when actual rendering is requested.

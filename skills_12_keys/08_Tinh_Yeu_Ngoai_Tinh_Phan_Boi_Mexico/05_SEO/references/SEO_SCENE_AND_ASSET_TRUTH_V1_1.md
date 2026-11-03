# SEO VISUAL AND AUDIO HONESTY GATE — V1.1

## Three concept sources
For thumbnail A/B/C and trailer, list each concept's **real PART, exact event and characters, evidence object, moment and emotional state**. A still depicting a dramatically re-created scene not literally in the text must be marked `PROMOTIONAL_RECONSTRUCTION`, not “escena exacta del guion”. Never show signed paperwork to another character if script explicitly has them refuse to look at it.

## Text safety
- Text overlay cannot promise instant divorce, arrest, forced sale or investment transfer if final script does not establish it.
- If the story says only a conditional letter of intent, do not call it a sale or a capital deposit.
- Copy should be readable on mobile; specify text in 2–3 horizontal lines where possible, verify special characters (Ñ, á, é, ¿), no random logo/watermark.
- Actual 16:9 thumbnails A/B/C must be rendered and inspected before `THUMBNAILS_RENDERED=TRUE`; prompt files alone are NOT images.
- YouTube chapters only numeric after TTS timestamps exist; retain `TBD` for unknown durations.

## Publishing gate
Run strict `seo-gate --title-file ... --script ... --qa-final ... --workdir <actual run folder>`. If it responds `PASS_STRICT_MECHANICAL_ONLY`, the operator must still read narrative QA evidence; do not imply the tool validates actual retention, natural dialogue or legal accuracy. Check video headline vs exact locked title; two extra titles are experiments and never overwrite the primary title.

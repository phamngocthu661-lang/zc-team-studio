# CHANGELOG — V1.1

## Requested change
SEO must follow the title already produced by the Title Rewrite skill or a title explicitly attached by the user.
The SEO skill must not generate or evaluate a replacement title.

## Behavioral delta from V1.0
- Added Locked Title Protocol and source priority.
- Removed internal 12-title generation.
- Removed Top 3 Titles output.
- Removed Final Title selection.
- Removed title scoring/ranking/revision from Final QA.
- Disabled competitor-title similarity guard in default production.
- Removed locked-title quality/fatigue scoring from default production; only package assets are scored.
- Kept locked title as a fixed anchor for Description, Thumbnail and 8-second Hook coordination.
- Added TITLE-SCRIPT CONFLICT handling without rewriting the title.
- Updated default production template from 20 sections to 19 sections.

## Unchanged
- A/B/C DNA definitions.
- Classifier weights and gates.
- Confidence thresholds.
- MARKET-NATIVE fallback.
- SEO Description engine.
- Tag/hashtag engine.
- Thumbnail scoring/selection.
- Image prompt rules.
- 8-second hook timeline and scoring.
- Story accuracy, originality, spoiler and integrity rules.

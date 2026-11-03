# USAGE EXAMPLES

## 1. Default — one source title
User sends:

The Mafia Boss Followed His Maid at Night—What She Did With Her Pay Left Him Speechless

Default response:
- exactly 5 rewritten versions
- each version has a /100 score
- one highest-scoring WINNER is selected automatically

## 2. Default — batch
If user sends 10 source titles, return 10 title blocks.
Each block contains exactly 5 rewritten options + scores + 1 winner.
Preserve source order.

## 3. Analysis mode
User says:

PHÂN TÍCH
[source title list]

Return source keywords, content family, protected 60% DNA, 40% mutation zone, 5 candidates, detailed scores, and winner rationale.

## 4. Winner-only mode
User says:

CHỈ WINNER
[source title list]

Return only one winning rewritten title per source line.

## 5. Calibration with channel data
User can paste:
- channel name
- channel description
- tags
- highest-view video metadata
- title + views + age

The skill must calibrate first and use winners more heavily than weak titles.

## 6. Hard length lock
Every displayed rewritten candidate and the WINNER must be **≤100 visible characters**, including spaces and punctuation. A draft over 100 characters is regenerated before scoring/output.

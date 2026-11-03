# CHANGELOG — V1.2

## Title-set policy
- Preserves V1.1 PRIMARY TITLE lock: the already-finalized title remains verbatim and authoritative.
- Adds exactly 2 new SUPPORTING TITLES to every full SEO production run.
- SEO output now has exactly 3 titles total: 1 PRIMARY + 2 SUPPORTING.
- Each supporting title has a hard ≤100 visible-character gate and normal 72–98 target.
- Supporting titles must be story-faithful, meaningfully distinct, and cannot invent unsupported facts.
- Supporting titles are A/B packaging alternatives and never auto-rebase CURRENT FINAL TITLE.
- Supporting titles are not ranked/scored unless user explicitly asks.

## QA/package integration
- Added Supporting Title Set Compliance gate.
- Added hard fail for >100-character or materially fabricated supporting titles.
- Package-coherence scoring remains anchored to PRIMARY TITLE unless a supporting title is explicitly selected for a separate test.

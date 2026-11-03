# Step6 output template
```
PRIMARY_LOCKED_TITLE: <unmodified>
SECONDARY_TITLE_A: <<=100 chars>
SECONDARY_TITLE_B: <<=100 chars>
PRIMARY_KEYWORD: ...
SUPPORTING_KEYWORDS: ...
DESCRIPTION_SHORT: <Japanese, no meaningless emoji tags>
DESCRIPTION_FULL: ...
TAGS: ... (<500 combined characters)
HASHTAGS: #... #... #...
SOURCE_DISCLOSURE: 口コミ形式の創作・再構成したエピソードです。 (when synthetic)
CHAPTERS: 口コミ01..30; time=TBD unless real audio timestamps
THUMBNAIL_A: proof_review_number, text, image prompt 16:9, hypothesis
THUMBNAIL_B: ...
THUMBNAIL_C: ...
COLD_HOOK_8_12_SEC: verbatim script-grounded line or faithful excerpt
ASSET_STATUS: A/B/C each rendered (exact paths) OR PROMPTS_ONLY
PUBLISH_GATE: QA_FINAL SHA + TITLE SHA + OUTLINE SHA + guard PASS
```

No self-affirmed unsupported CTR claims, no replacing the title without Step1 re-lock and subsequent rebase.

## V1.1 publishing gate additions
Add a 3-row `THUMBNAIL_VISUAL_QA` block: file name, exact overlay text, linked 口コミ, TEXT_QA (Japanese orthography + text fit), MOBILE_QA (legibility 320px), SCRIPT_TRUTH (no invented consequence), verdict. Use a concise 8–12-second **conflict hook**, not a bland convenience sentence; use verbatim or clearly labeled script-derived hook, keep the story promise honest and disclose fictional case format in the early narration. SEO is `PUBLISH_READY` only if audio-timestamps are verified when chapters are published and chosen thumbnail visual-QA passes; `SEO_GATE=PASS` by itself certifies only script/hash QA, not production readiness. Keep timestamps TBD before audio.

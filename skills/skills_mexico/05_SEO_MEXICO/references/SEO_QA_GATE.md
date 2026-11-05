# SEO FACT LOCK / PREPUBLICATION CHECK

`python scripts/verify_seo_ready.py --script FULL_SCRIPT.txt --qa-frozen QA_FROZEN.json --title "$LOCKED_TITLE" --outline-file OUTLINE.txt`

Tool confirms source identity and frozen READY with score≥98, no actionable patches, outline/video identity, exact file hash. Controller also checks frozen QA is the most recent valid QA for that video/version; **verifier alone cannot determine chronological latest version or read the full story**.

Before publishing manually check:
- Primary title identical byte-for-byte to locked title, no accidental diacritic or punctuation drift.
- Exactly 2 secondary titles ≤100 characters; separate not replacements.
- Description/three thumbnail prompts/trailer use only story events physically in supplied QA-READY source; editor notes Part/scenes used.
- Spanish-Mexican idiom, kinship terms, names and gender concordance correct.
- Tags ≤500 Unicode codepoints, comma-separated; no hashtags in tag string. Prefer 480–500 when naturally possible.
- Three thumbnail prompts 16:9 separate distinct images; no actual images claimed. Genuine rendered image text may still need overlay proofreading.
- No "historias reales" label, fake bank/legal decision, spoiler or invented testimony.
- CTA non-aggressive, end trailer open loop genuine and short.

On any failure, BLOCK and state required correction; don't bypass QA-READY by using only user's manually stated PASS.

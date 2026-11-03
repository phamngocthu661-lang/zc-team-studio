# STEP 5 OUTPUT SCHEMA V1.1
1. `PROJECT_ID` / `PRIMARY_DNA` / `QA_STATUS` / actual FINAL sha.
2. `PRIMARY_TITLE_LOCKED` = verbatim LOCKED_TITLE.
3. `SUPPORTING_TITLE_A`, `SUPPORTING_TITLE_B`, exactly 2, Unicode length <=100.
4. `DESCRIPTION_US_ENGLISH` 250–450 words in 2 paragraphs; first ~160 chars hook, organic narrator and genre descriptors.
5. `HASHTAGS` 5–8, `TAGS` 15–25, one `PINNED_COMMENT`.
6. `THUMBNAIL_A`, `_B`, `_C`: three different scenes taken from script, each with `SCENE_EVIDENCE` (Part/scene, place, prop, narrative action), one visual proof and emotional hypothesis (not predicted CTR).
7. `SELECTED_THUMBNAIL`, `FULL_IMAGE_PROMPT_16_9`, `NEGATIVE_IMAGE_PROMPT`.
8. `VIDEO_HOOK_8_SEC`: 0–2, 2–5, 5–8 seconds; may show phone/prop only if present in story.
9. `PUBLISHING_QA_CHECKLIST`: title literal, verified SHA, synced 7 parts, no false story events, only adults, no spam/copyright/true-story claims.
10. `FINAL_HANDOFF.json` fields + `RELEASE_GATE` and `WORD_COUNT_METHOD`.

Authoring guard: never refer to a real channel's view count as expected performance. If bundle verifier FAIL, `SEO_BLOCKED` and list failing exact file(s), not READY. If dry-run with only outline, `PREVIEW_ONLY`, never pretend 5 Steps completed.

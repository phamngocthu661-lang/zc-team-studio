---
name: us-midnight-seo-publish
version: 1.1.0
description: Source-bound US horror YouTube SEO, thumbnail and trailer after hard release gate
---
# STEP 6 — RELEASE & SEO PACK (V1.1)

Read root contract, saved TITLE_LOCK, current final manuscript, `FINAL_QA_GATE.json`, `references/SEO_AND_THUMBNAIL.md`. **Before writing metadata, execute** `python tools/verify_project.py PROJECT_DIR --revised --release` if revised exists, otherwise without `--revised`. A failed gate (including stale revised counts, missing QA JSON, wrong SHA, unauthorized changes) blocks SEO. A human-readable `FINAL_QA_REPORT.md` is not sufficient.

## Accurate packaging
- `SEO.txt`: exact PRIMARY LOCKED TITLE verbatim; `video_id`, script filename and exact `source_sha256`, estimated narrator runtime from current body words with stated WPM; natural 180–300-word English video description with engaging two-line opener; short spoiler-light snapshots of each of N real script stories; original-fiction statement (not verified personal testimony); 2 secondary title alternatives clearly labeled **not replacing lock**; 5–8 hashtags; tags <=500 characters; optional chapters by story title **without fake timestamps**; pinned comment and source notes.
- `THUMBNAIL_PROMPTS.txt`: 3 visual concept options based on actual story elements; each 16:9 single cinematic scene, grounded object or human clue, original photography style, strong focal point, phone-screen legibility, 8% safe edges, no watermark or stolen logo. Thumbnail copy 1–4 strong words, distinct A/B/C options. Don't depict ghosts/murder/arson if actual draft contains no such claim.
- `TRAILER.txt`: original 12–20 sec narrated teaser, precisely previews at least one actual clue, non-misleading CTA; TTS-clean, no fake news or misleading real crime claim.
- Never invent a numerical CTR boost, YouTube traffic claim, exact audio time, external channel approval or case record.

## Final validation
1. Ensure metadata mentions only real events from the CURRENT final script. Distinguish hypothetical teaser atmosphere from objective claims.
2. Save the files; execute `python tools/finalize_release.py PROJECT_DIR --seo`. This recomputes body lengths from disk truth and writes `FINAL_RELEASE_MANIFEST.json` only on full PASS.
3. Report exact filename, SHA, gate PASS and any non-blocking story-length warnings; don't claim publish-ready if finalization fails.

# Persistence & ONE REPAIR

- Preflight locked title and `OUTLINE.md`. Run `outline-lock` before stage generation.
- Persist UTF-8 Stage A/B/C separately; no markdown code fences inside `.txt` scripts.
- Standard chapters `## PART N`; exact review headings `口コミNN：...` with NN=01–30.
- Assembly is raw bytes `A+B+C`, no inserted newlines; thus A/B/C each end newline and C ends newline.
- `assemble` measures shape/body, writes immutable manifest. No QA/editorial score by writer.
- Frozen QA `authorized_patches` items: `{ "patch_id":"J001", "category":"logic|spelling|fact", "old_text":"EXACT ORIGINAL SHORT SPAN", "reason":"..." }`. Keep only actionable edits; no generic rewrite mandates.
- Repair input JSON `{ "patches": [{"patch_id":"J001", "new_text":"EXACT REPLACEMENT"}] }` matches each frozen id; original excerpt must occur exactly once, cannot span review headings/Part headers. Tool checks exact 1 round, SHA, review counts, char limits and unchanged reviewer-protected remainder by construction.
- Post-check is independent read, not writer's assertion; if any remaining blocker, mark BLOCKED and request manual/new version. Never trigger repair again for same baseline.

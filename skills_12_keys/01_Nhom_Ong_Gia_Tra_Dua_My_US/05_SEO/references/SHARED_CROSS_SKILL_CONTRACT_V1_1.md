# DADUS V1.1 SHARED CROSS-SKILL CONTRACT — NORMATIVE

## Scope
US Father Revenge / Family Justice audio stories. Narrator: older American father or grandfather (typically 55–75), mostly first-person past tense. Variants: quiet dignity, secret skill/status, abusive in-laws, wronged daughter/son, deceptive spouse, inheritance and company control, protective investigation. Always original plots, names, quotes.

## Mandatory contract
- `LOCKED_TITLE` is unchanged through outline, full script, QA, SEO (SEO may suggest exactly two secondary title options, NOT replace primary).
- `CURRENT_FINAL_OUTLINE.txt` is stored with seven Part contracts, canonical fact ledger, ownership + document ledger, timeline, access/knowledge ledger, how reveals are legitimately proved, ending moral action and `video_id`. `video_id=SHA256(title + LF + SHA256(outline_bytes))[:16]`.
- SCRIPT A Part1–2, B Part3–5, C Part6–7, ordered headings exactly `[PART 1]` ... `[PART 7]`, all material US English prose. No meta notes inside script, except headings; UTF-8 LF; assemble exactly A+B+C.
- Length standard LONG_V12 70k–80k codepoints excluding standalone PART heading lines, favor 74k–78k; min Part size 200 codepoints, but content targets per part in Writer. A/B partial exempt.
- QA owns score/defects/authorization; Writer owns prose; deterministic Python scripts own hash/length/storage and byte preservation. No invented validations.
- QA hard gates: story logic, timeline/age, finances/ownership, evidence and authority, character knowledge/access, exact numbers, grammar/spelling/US idiom, title promise/ending, length and platform. Non-actionable 1–2 point polish limitations may coexist with READY ≥98 only when explicitly evidenced and separately accounted; actionable defects must be zero.
- One repair, period. After single Step5, Step4 final re-audit. If NOT READY, stop and ask for user-directed manual resolution outside automated repair loop. Do not reset the guard by changing script name or reopening another workspace for same video.
- SEO uses only exactly QA-READY script SHA; cannot treat repair proof as literary QA. Three thumbnails are prompts, not rendered image files unless the user explicitly requests image generation and a rendering tool is available.

## Evidence hierarchy
1. Actual archive row/transcript for channel insights; 2. user's explicit locked decision; 3. hash-bound outline and script; 4. separate QA evidence. Never claim public view counts are current; snapshot in uploaded archive. Do not plagiarize transcript text or imitate private individuals. 

## US legal/financial realism
No unilateral voiding of a deed or marriage, instant fund withdrawal from another adult's separate property, unexplained CEO access at check-in, magically public criminal databases, unlawful wiretaps, evidence without chain of custody, immediate foreclosure/eviction without notice, overnight probate reversal. Identify jurisdiction/state, legal ownership, signature authority, board votes, trust provisions, proof and feasible timetable. When uncertain choose modest credible procedure and avoid naming invented laws. Justice may be withholding voluntary gifts, rejecting demands, verifying ownership, handing evidence to attorney, contacting correct authority, serving formal notice or publicly revealing truthful records; not omnipotence or vigilante violence.

## Narrative realism
High view snapshots are associative, not causal proof of CTR. Every humiliating line must matter personally; every reversal planted beforehand; vulnerable relatives retain agency; an elder man can be wrong and apologize; ending should resolve dignity and relationship boundaries rather than only triumphal net worth.

## V1.1 creative extension (normative only for NEW STEP1/STEP2/STEP3 drafts)
The 6 creative improvements in `CREATIVE_UPGRADE_MANIFEST_V1_1.md` are a **pre-writing/planning gate**, not a post-READY automated rewrite right. All provenance, Step5 `ONE_REPAIR_MAX=1`, locked title, A/B/C byte-assembly, 7-Part headings, 98-point official QA rules and length profiles remain unchanged. Legacy source artifacts are not migrated or edited automatically. Human editorial checks are distinct from deterministic verifiers.

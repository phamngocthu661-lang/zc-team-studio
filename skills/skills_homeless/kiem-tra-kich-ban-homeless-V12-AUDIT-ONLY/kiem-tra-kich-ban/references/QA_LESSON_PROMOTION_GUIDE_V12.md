# HOMELESS V12 — REUSABLE QA LEARNING WITHOUT FALSE SELF-TRAINING

## Goal

Prevent a well-evidenced mistake from recurring in future independently authored videos. A “lesson” is an explicit saved rule and associated test that must be **read again by the future skill**; it is not automatic tuning of model weights, hidden long-term memory, or authorization to alter previous scripts.

## Candidate → verified → released sequence

1. Baseline QA freezes a real Pxx with exact quote, root cause, class, impact, acceptance test, and a proposed owner: Title, Outline, Writer, QA, or SEO. A Pxx that is merely optional taste-based polishing is not an automatic candidate.
2. Writer makes a scoped, approved Step5 repair, materializes revised full script and integrity proof; Writer does not announce QA PASS.
3. Independent Step4 QA reads the revised full script, identifies whether the original defect is FIX VERIFIED, still OPEN, or a TRUE REGRESSION; freezes post-repair QA on actual revised SHA and scores honestly.
4. `scripts/record_qa_lessons.py` binds baseline QA + after QA + Writer proof by hash and outputs `QA_LESSON_CANDIDATES.json` with status `PROPOSED`, `human_approved=false`. The script **never sets VERIFIED automatically**.
5. Editor manually reviews each candidate, rejects one-off story circumstances, groups recurrent root causes, tests whether a prevention check would catch a known failure WITHOUT rejecting good manuscripts, and explicitly authorizes publication into an approved lessons library.
6. New library entry should include rule ID, version, owner skill/version, exact evidence Pxx and script SHA, negative example, positive outcome test, exceptions, confidence, approval identity/date when available, and expiry/review date. Store a SHA-256 of the saved approved library artifact.
7. The next relevant skill must actually open/read this approved library and record `lesson_library_sha256` in its handoff if applied. A library file merely existing in Sources does not make the skill retroactively use it.
8. Update a ZIP only through an intentional skill release with changelog, version bump and tests. Do not silently rewrite current project Sources or assume an instruction change is persistent without saving the new ZIP.

## Example (hypothetical, not an actual audited video)

- Symptom: protagonist uses an heirship document before the scene where it was found.
- Root cause: Writer's scene-level Knowledge Ledger not compared to outline Event IDs.
- Candidate owner: Writer (or Outline if its blueprint was contradictory).
- Prevention test: at each scene verify `knowledge_available(character, evidence, event_id)` is true before any dialogue/action using that evidence. Protect plausible partial knowledge and flashbacks; do not ban suspense devices broadly.
- Acceptance: corrected script no longer includes the premature-use quote, resolves clue timing, and independent QA verifies no new clue contradiction.

A single successful example is not statistical proof of better future video retention. Track repeated error frequency, severity at first full audit, scoped edit count, total revision rounds, regressions, structural failures and available published-video performance separately.

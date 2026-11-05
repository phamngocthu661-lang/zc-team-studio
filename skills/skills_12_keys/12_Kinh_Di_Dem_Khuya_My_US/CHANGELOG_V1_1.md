# V1.1 CHANGELOG (from original V1.0)

- Fixed core design bug: Step5 MUST recalculate every revised story's body characters, word counts, runtime estimate and source SHA. Cannot reuse original counts.
- Added project-wide validator for title/outline/video identity, A/B/C byte-exact merger, story ordering, hard length, manifest body/per-story counts and repair outside-span protection.
- Added final source-locked QA JSON gate, which blocks Step6 when absent/stale; plain Markdown QA claims alone are no longer accepted.
- Added single-use per-video repair lock inside project folder; second invocation prohibited and changing output folder rejected.
- Added deterministic release finalizer that uses disk counts, exact final SHA and SEO binding.
- Corrected title-suggestion Markdown pipe formatting guidance, avoiding broken candidate score tables.
- Tightened editorial priority to causality, US English spelling and continuity, only one repair, without stylistic rewrites of good sections.
- Added evidence-tier severity to avoid over-labeling optional canon details MAJOR. Strengthened varied endings and sensible authority interaction.
- Kept 5 Skill folders, 6 command routes, writer shared Step3/Step5, A/B/C stages and stable original root controller/contract filenames. For N=8 stage map unchanged. Nondefault N=3..12 now has explicit stage derivation.
- Added executable smoke and 6 self-contained integration tests, including stale-count rejection, prior-patch tamper detection and no second repair.

NOTE: upgrade is NOT automatically schema-compatible with preexisting V1 outputs lacking newly required verification metadata. Do not bypass the gate by fabricating old repair history. Use new version for new videos; archive old first run or re-certify READ-ONLY with documented legacy provenance if necessary.

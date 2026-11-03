# WOMEN REVENGE US — CONTROLLER / SIX COMMANDS

**Activation:** Choose this controller instead of HOMELESS/Mafia; preserve the recognizable V12 command structure. Each user request runs exactly one step, no auto-jump and no `next` guessing. Before a step load SHARED_CROSS_SKILL_CONTRACT_WRV_V1.md, the target SKILL.md, and mandatory references.

| command | owner | Input | Output | Allowed next |
|---|---|---|---|---|
| step1 | title ZIP | user seed, benchmark DNA | five title candidates, ranked, one locked <=100 chars | step2 |
| step2 | outline ZIP | exact title + DNA | persistent 7-Part outline, canon/ledger, title/outline hash | step3 |
| step3 A | writer ZIP | outline | Parts 1–2 / immutable segment A | step3 B |
| step3 B | writer ZIP | verified A | Parts 3–5 / immutable B | step3 C |
| step3 C | writer ZIP | A+B + outline | Parts 6–7 / immutable C + verified FULL | step4 |
| step4 baseline | QA ZIP | exact FULL + canon | independent read-only forensic score, READY or frozen patch ledger, byte windows | READY: step6; else step5 |
| step5 **ONCE** | writer ZIP | baseline, frozen QA, approved zones | one byte-exact revised TXT + repair proof + repair-used marker | step4 verdict |
| step4 final | QA ZIP | revised TXT | final independent QA READY/NOT READY | READY: step6; else BLOCK |
| step6 | SEO ZIP | latest READY QA tied to exact FULL/revised file | title, description, tags, thumbnail A/B/C concepts + prompts, trailer | end |

## Core runtime invariants
- Keep project work files outside install ZIP. Every operation explicitly targets original persistent files, not reproduced chat snippets.
- Lock title + outline hash + video ID before writing. `scripts/segment_workflow.py` stage/inspect/assemble enforces lineage.
- Stage3 must be three separate user-triggered writing calls. Script target 70–80k exact body codepoints, in 7 Part headings; prefer 74–78k. No fake count.
- After QA defect freeze, QA owns finding IDs, exact anchors and byte-window spec. Writer Step5 edits ONLY these windows with explicit authorization; no changing protected strong spans. All immutable bytes must compare equal. This is the **one and only repair** for that video ID.
- Reviewer cannot repair and Writer cannot self-declare READY; independent final Step4. Even after one repair, if final QA still finds issue, report it and block Step6 — do NOT offer Step5 again.
- At Step6, run `verify_seo_ready.py` on exact current script, latest frozen QA, locked outline/title. No speculative claims or implied rendering of images/videos.

## SUCCESS handoff sentences
- Step1: `Gợi ý bước tiếp theo: Gõ step2 để lập giàn ý 7 Part.`
- Step2: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 1–2 (A).`
- A: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 3–5 (B).`
- B: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 6–7 (C) và ghép kịch bản.`
- C: `Gợi ý bước tiếp theo: Gõ step4 để kiểm tra độc lập.`
- Initial QA READY or final QA READY: `Gợi ý bước tiếp theo: Gõ step6 để làm SEO.`
- Initial QA NOT READY with valid frozen contract: `Gợi ý bước tiếp theo: Gõ step5 để sửa kịch bản đúng MỘT LẦN.`
- Step5 verified: `Gợi ý bước tiếp theo: Gõ step4 để QA kiểm tra bản sửa lần cuối.`
- Final QA NOT READY: `BLOCKED — không sửa vòng 2. Cần xét lại đầu vào/định hướng như một dự án mới.`
- Step6: no next-step suggestion.

## Error behavior
On missing original file, hash drift, absent QA proof, missing approved zones, length fail, incomplete A/B/C, or repair-used marker: STOP, report blocker; no invented success or phantom artifacts.

## V1.1 PRE-WRITE QUALITY HANDOFF — SAME COMMANDS
- `step1`: create title promise-owner evidence contract (required).
- `step2`: include `STORY_PREFLIGHT_V11.json` with seven unique causal Part scene groups, agent actions, source-backed legal questions and concrete title payoff. Run `scripts/story_preflight_v11.py` before lock. FAIL -> `REPLAN_BEFORE_WRITING`, no Step3 and no locked outline hash. Keep canonical outline file name unchanged.
- `step3 A/B/C`: draft density-controlled causally progressive scenes; preserve scripts and 3 calls.
- `step4 initial/final`: forensic QA frozen score plus *separate advisory* story-effectiveness signal (not a second QA score). `step5`: remains single precise correction, only if the first QA freezes actual faults.
- `step6`: three distinct thumbnails A/B/C with overlays separated from no-text photorealistic image prompts, fact and mobile checks; no changes to output identifiers or existing verification entrypoint.

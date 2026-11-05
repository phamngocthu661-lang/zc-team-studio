> V1.1 ACTIVE — replacement package; read V1_1_UPGRADE_GUIDE.md. Original V1 controller interfaces retained.

# MEXICO CELEBRITY V1.0 — INSTALL / RUN

## Package structure
Five individually installable Skill ZIPs mirror the 5-Skill architecture used in the older channels: Title, Outline, Writer, QA, SEO. Like HOMELESS, Writer owns both Step3 and Step5. Use 6 step commands, but unlike HOMELESS, **STEP5 is single-use** and QA has read-only final verification. Every ZIP contains a `SKILL.md`, `VERSION.txt`, `README.md`, `CHANGELOG.md`, shared contract and genre-specific `references/`; applicable ZIPs contain `scripts/mexico_tools.py`.

## Installation
1. Store old Mafia/HOMELESS ZIPs separately. Do NOT mix active instructions between genres; old skills still work unmodified.
2. Upload 5 newly supplied Mexico ZIPs into your Mexico project/skill platform. A platform that imports a folder rather than ZIP should use each ZIP's top-level folder with its `SKILL.md`.
3. Upload `MEXICO_STEP_CONTROLLER_V1.md`, `SHARED_CROSS_SKILL_CONTRACT_MEXICO_V1.md`; paste `MEXICO_PROJECT_INSTRUCTIONS_V1_COPY_PASTE.md` into project instructions.
4. Keep researched article URLs/source texts and outline files accessible between calls; the 137 competitor metadata rows are not factual source proof.
5. `step1` a source title + documented public facts -> `step2` verified outline -> `step3` A -> `step3` B -> `step3` C -> `step4` -> optional ONE `step5` -> read-only `step4 final verify` -> `step6`.

## Reality checks / limitations
- The competitive reference included 137 video rows and 137 thumbnails and 1 sample MP4 without subtitles. Historical views are not predictive; no full transcript was provided.
- The CLI checks file hash, heading order, source byte integrity, one repair; it cannot independently verify public allegations, external evidence, grammar or audio narration speed.
- Thumbnail prompts are design instructions, NOT actual images. Source/visual copyright and publicity-rights clearance remain the channel producer's responsibility.
- Fictional Mafia/HomeLESS script rules must never automatically rewrite real-person biographies.

## Quick prompts
```
step1: [Tên nghệ sĩ] — [1-3 sự kiện công khai có nguồn] — [link nguồn]
step2: [LOCKED_TITLE + Step1 source data]
step3: [A]
step3: [B]
step3: [C]
step4: [FULL_SCRIPT + verified source register]
step5: [QA_PATCHES + baseline + request one repair]
step4 final verify: [FULL_SCRIPT_REVISED + REPAIR_PROOF]
step6: [QA_FINAL PASS_READY + full final script]
```

## CLI
From appropriate Skill root:
`python scripts/mexico_tools.py count --file FULL_SCRIPT.txt`
`python scripts/mexico_tools.py verify-script --file FULL_SCRIPT.txt --min-chars 40000 --max-chars 49000`
`python scripts/mexico_tools.py repair-init --source FULL_SCRIPT.txt --state REPAIR_STATE.json`
`python scripts/mexico_tools.py repair-apply --source FULL_SCRIPT.txt --state REPAIR_STATE.json --patches QA_PATCHES.json --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json`
`python scripts/mexico_tools.py seo-check --qa QA_FINAL.json --script FULL_SCRIPT_REVISED.txt`
See `TEST_REPORT.md` for locally executed smoke tests with synthetic content; test fixtures are NOT real scripts or real-source QA.

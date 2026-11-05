# WRITER: SCENE, CHARACTER, PACING, THREE STAGES

## Structure: first-person Japanese manga voice comic
Write each line as `@ore:` or another stable actor label; do not use Markdown bullets inside transcript. Keep characters named and internally consistent. Example:
```
[PART 1]
@ore: [serious] 五十三歳の俺は、あの日だけは時計を見なかった。
@heroine: 「今すぐ返事をしろ」とは言っていません。
@ore: 彼女は封筒をテーブルに置き、黙って席を立った。
```
Story content is entirely Japanese except metadata labels. Japanese text in `@ore` narration is spoken. Emotion markers optional; avoid robotic overuse. Stage metadata and checking summaries belong outside the `PARTS_X.txt` script files.

## Beat/retention self-check (not independent QA)
1. Hook within first 120–160 spoken chars: show precise crisis and someone acting.
2. Introduce concrete dilemma within first ~45 seconds, explain protagonist's age and loneliness naturally.
3. Give heroine one action before treating her as romantically important.
4. Every Part ends on an *earned* next question, not a copy-paste cliffhanger.
5. When money, profession, housing or law matters, give necessary lead time and authority.
6. Add sensory/scene details that can become illustrative manga frames, but don't script fake images.
7. Midpoint changes interpretation; climax resolves established cost; finale shows relational action.

## Three-stage length approximation
Stage A P1-2 ≈4,050 chars; Stage B P3-5 ≈6,650; Stage C P6-7 ≈4,150; total ≈14,850. Working individual Part centers P1 1900, P2 2150, P3 2200, P4 2300, P5 2150, P6 2250, P7 1900. Do not output all three stages in one tool call if user invoked only one.

## Prohibitions
- No repeated “俺は驚いた / 信じられなかった” as plot substitute.
- No 6-page wall of exposition before incident; no 20-minute detour into unrelated company finances.
- No new cousin/CEO/lawyer at climax without earlier setup; no sudden estate/big wealth solely to force fantasy.
- No Japanese text that reads translated from English (`彼女は私の心を所有した` etc.).
- No sexualized humiliating scenarios as a reward; focus adult consensual relationship and vulnerability treated respectfully.
- Every speaker has stable address forms (俺/私, 君/あなた, 姓+さん/役職) consistent with relationship stage.

## Project file states
`TITLE_LOCK.json`, `OUTLINE_LOCK.json`, `CURRENT_FINAL_OUTLINE.txt`, `PARTS_A.txt`, `PARTS_B.txt`, `PARTS_C.txt`, `FULL_SCRIPT.txt`, `DRAFT_PROOF.json`. The accompanying scripts can manage these if file execution is available; prose-only answers cannot assert that scripts ran.


## V1.1 single-draft retention gate
Before each stage is saved, compare scenes against prelocked 8-gate Part map; distinguish decisions from explanations. If >=2 consecutive administrative scenes have no changed relationship or cost, redesign uncommitted scene BEFORE freezing draft (never use QA edit budget for a broad replot). At every Part end, audience must ask a new question that matters personally. Retain coherent legal/administrative safeguards, but compress procedural repetition into a few grounded sentences. Dialogue conveys changing intent; not merely a narrator summarizing meetings. For manga visual production, list 2 authentic illustration beats per Part in the SEPARATE storyboard handoff (not inside TTS lines). Never claim TTS audio runtime from character count alone.

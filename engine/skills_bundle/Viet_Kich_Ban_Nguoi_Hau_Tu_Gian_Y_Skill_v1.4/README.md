# Viết Kịch Bản Người Hầu Từ Giàn Ý — v1.4

## Mục đích

Skill này dùng SAU skill **Viết Giàn Ý Người Hầu**.

Workflow:

1. Dùng **Viết Giàn Ý Người Hầu** với một title mới.
2. Lấy toàn bộ output outline, đặc biệt phần `DETAILED OUTLINE`.
3. Mở skill **Viết Kịch Bản Người Hầu Từ Giàn Ý**.
4. Dán full outline.
5. Skill viết toàn bộ kịch bản trong một response.

## Tương thích cấu trúc

Skill không hard-code số Part.

`N = số BEAT/PART-BEAT trong DETAILED OUTLINE`

Script luôn giữ 1:1:

`Beat 1 → Part 1 ... Beat N → Part N`

Vì vậy outline 5, 6, 7, 8 hoặc số Part khác đều không bị ép về một cấu trúc cố định.

## Hard limits

- American English.
- Third-person past tense, cinematic near-omniscient theo DNA/outline.
- Standard production target: 44.000–48.000 ký tự.
- Recovery hard envelope: 40.000–55.000 ký tự; ngoài 44k–48k là TARGET MISS nếu user không override.
- Hard max: 55.000 ký tự.
- Primary drafting throttle: 7.400–7.650 từ.
- Soft word ceiling 7.750; **strict word lock: tổng từ phải <8.000** (7.999 tối đa hợp lệ; đúng 8.000 = FAIL).
- Mỗi Part có `PART_WORD_BUDGET` theo đúng tỷ trọng Beat + hard stop-writing gate.
- Nếu môi trường có Python/code/text counter, bắt buộc exact-count trước release.
- Final output chỉ được phép khi LENGTH_STATUS = PASS.
- TTS clean: không bracket cue, SFX, camera/editing/production direction.
- Toàn bộ Part viết trong một lần.
- Không dùng `continue`.
- Không tự thêm/bớt/gộp/tách Part.
- Character/timeline/evidence/injury continuity bắt buộc.
- Causality và physical logic bắt buộc.
- YouTube-safe fictional dramatization.

## Những phần cốt lõi từ prompt gốc được giữ

- Mafia Boss × underestimated working woman / maid / waitress / hidden expert.
- Heroine agency.
- Multi-step competence display.
- Dual-pressure physical + technical crisis.
- Believable antagonist motives.
- Dark protection without male-on-female violence/roughness.
- Adrenaline crash after action.
- Tactical/technical credibility.
- Reveal rhythm.
- Short, directive Mafia Boss dialogue.
- No deus ex machina.
- Romantic/power payoff when promised by title/outline.

## Thay đổi để tương thích với skill giàn ý

- `STORY IDEA` → `FULL OUTLINE`.
- Fixed 8-Part Map → dynamic Outline-Locked Part Map.
- Fixed per-Part word ranges → proportional dual budget (word-first + character guide).
- `continue` workflow → full single-response workflow.
- Old continuation note → internal one-pass continuity ledger.
- Profession/threat fallback rules cannot override facts already chosen by the outline.
- Added explicit YouTube-safety guardrails.
- Added 40k–55k hard total with 55k ceiling.



## v1.4 synchronized production contract

- Added mandatory `SHARED_PRODUCTION_CONTRACT.md`.
- Standard word target synchronized to **7,400–7,650**; soft caution **7,750**; strict `<8,000`.
- Standard release character target synchronized to **44,000–48,000**; 40k–55k is recovery envelope, not default target.
- Latest explicit user constraints now sit above title/outline only when they are true hard constraints for the current run.
- TTS remains zero-bracket-cue.
- Raw/historical DNA cannot override operational story, consent, safety, or output rules.

## v1.3 strict under-8k lock

- Không thay đổi story core hoặc prose engine.
- Thêm một hard gate độc lập: **`TOTAL_WORDS < 8.000`**.
- 7.999 từ là mức tối đa hợp lệ; **đúng 8.000 từ cũng FAIL**.
- Exact Count Tool Gate đổi từ `words >8.000` thành `words >=8.000`.
- Final `WORD_STATUS` chỉ PASS khi tổng từ nhỏ hơn 8.000.
- Character contract 40.000–55.000 và toàn bộ DNA/Part/continuity/causality/style/TTS/YouTube-safe rules được giữ nguyên.

## v1.2 length-control hardening

- Không thay đổi story core, DNA, Content Family, Part map, style engine, continuity, causality, heroine agency, antagonist logic, climax hay payoff.
- Sửa nguyên nhân gốc của overrun: không còn dựa vào self-estimated character count khi drafting.
- Word-first throttle: target 7.400–7.650 từ, soft 7.750, absolute 8.000.
- Character contract vẫn giữ nguyên 40.000–55.000; operational target lùi về 44.000–48.000 để có headroom.
- Part stop gate bắt đầu từ 80–85% word budget; 100% budget phải đóng Beat hoặc compress prose trong chính Beat.
- Exact Count Tool Gate: nếu có tool đếm đáng tin cậy thì bắt buộc dùng trước khi release.
- Draft **>=8.000 từ** hoặc >55.000 exact characters = INVALID và bị block trước output.


## v1.1 reliability upgrade

- Length-first priority: giới hạn ký tự thắng prose expansion.
- Pre-draft target + proportional Part budgets.
- Part stop-writing gate để chặn scene/dialogue tự phình.
- Soft ceiling 52k và absolute invalid ceiling 55k.
- Mandatory recount/revision loop trước output.
- Anti-expansion rules rõ ràng.
- TTS Clean Script Lock; loại bỏ rule cũ từng yêu cầu bracketed sound/physical cues.

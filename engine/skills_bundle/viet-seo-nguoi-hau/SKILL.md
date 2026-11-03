---
name: viet-seo-nguoi-hau
version: "1.3"
language: "vi"
description: >
  Skill "Viết-Seo-Người-Hầu" dùng cho niche Mafia Romance / Mafia Emotional Storytelling.
  Nhận PRIMARY TITLE + PREMISE/OUTLINE/FULL SCRIPT và chạy MASTER YOUTUBE SEO,
  PACKAGING & 8-SECOND HOOK SYSTEM V1.3 để phân loại A/B/C hoặc MARKET-NATIVE,
  tạo SEO description, tags, hashtags, 3 thumbnail hypotheses, Final Thumbnail Concept,
  ChatGPT Image prompt, 8-second video hook prompt, packaging/fatigue guard và Final QA.
  PRIMARY TITLE là input đã chốt và phải giữ nguyên văn; ngoài PRIMARY TITLE, SEO bắt buộc
  tạo đúng 2 SUPPORTING TITLES mới, story-faithful, ≤100 ký tự mỗi title, để package có tổng 3 title.
  Hai supporting titles không thay thế CURRENT FINAL TITLE và không được tự động rebase title chính.
---

# Viết-Seo-Người-Hầu

## Mục tiêu
Biến một video idea/outline/script thuộc niche Mafia Romance / Mafia Emotional Storytelling thành một gói SEO + Packaging + 8-second hook có thể đưa vào production, **bám theo TITLE đã được chốt từ trước**.

Đây là **OPERATING SYSTEM**, không phải báo cáo competitor và không phải skill viết lại title.

## Trạng thái hệ thống
- VERSION: V1.3
- STATUS: LOCKED FOR PRODUCTION
- TITLE POLICY: LOCKED PRIMARY TITLE + EXACTLY 2 SUPPORTING TITLES
- Không nghiên cứu lại competitor ở mỗi video mới.
- Không tự thay đổi DNA, classifier weights, gates, thresholds, thumbnail rules, hook rules hoặc QA rules.
- Không rewrite/polish/rank/score PRIMARY TITLE. Chỉ được sinh đúng 2 SUPPORTING TITLES theo Supporting Title Protocol.
- Chỉ thay đổi hệ thống khi user yêu cầu update/build version mới.

## Nguồn nội bộ phải đọc
Trước khi xử lý production, đọc:
1. `references/MASTER_SYSTEM_V1_3_LOCKED.md`
2. `references/CHANNEL_DNA_AND_CLASSIFIER.md`
3. `references/PRODUCTION_OUTPUT_TEMPLATE.md`
4. `references/VERSION_LOCK.txt`

`references/COMPETITOR_TITLE_CORPUS.txt` chỉ là archive lịch sử. **Không đọc/không dùng trong production mặc định để đánh giá title.** Chỉ dùng nếu user yêu cầu riêng audit similarity của title.

Chỉ cần đọc `references/SOURCE_SPEC_ORIGINAL.txt` khi cần kiểm tra yêu cầu gốc lịch sử của project.

## Primary + Supporting Title Protocol
Mọi production run phải resolve một **PRIMARY TITLE đã chốt** trước tiên, sau đó tạo **đúng 2 SUPPORTING TITLES mới**.

### Primary title source priority
1. **TITLE mới user gắn trực tiếp trong request hiện tại** — ưu tiên cao nhất.
2. Nếu request hiện tại không có title → dùng **CURRENT FINAL TITLE** mới nhất do Skill Viết Lại Tiêu Đề đã chốt trong conversation/project.
3. Nếu không có CURRENT FINAL TITLE nhưng outline/script có một title header duy nhất, rõ ràng → dùng title đó.
4. Nếu không resolve được title → dừng và trả chính xác: `REQUIRED TITLE NOT PROVIDED`.

### Absolute PRIMARY TITLE lock
Sau khi resolve:
- dùng PRIMARY TITLE nguyên văn;
- không sửa grammar/case/punctuation;
- không chấm điểm/rank/reject/rewrite PRIMARY TITLE;
- PRIMARY TITLE vẫn là `CURRENT FINAL TITLE` authoritative cho production;
- supporting title không được tự động thay thế hoặc rebase PRIMARY TITLE.

Nếu title mới user gắn vào khác CURRENT FINAL TITLE cũ, **title mới thắng** và trở thành PRIMARY TITLE của run đó.

### Supporting Title Protocol — EXACTLY 2
Sau khi đã hiểu title + premise/outline/script, tạo **đúng 2 title mới**:
- `SUPPORTING TITLE 1`
- `SUPPORTING TITLE 2`

Hard rules:
- mỗi supporting title phải **≤100 visible characters**, tính cả spaces và punctuation;
- target thông thường 72–98 characters; 99–100 vẫn hợp lệ;
- >100 = HARD REJECT, phải regenerate trước output;
- giữ cùng story promise, protagonist/role, Mafia anchor và payoff direction;
- không bịa major event, skill, pregnancy, family relation, identity, quote, object, threat hoặc ending không có trong evidence;
- hai supporting titles phải khác nhau có ý nghĩa về click angle/wording, không phải synonym-only variants;
- không copy gần nguyên PRIMARY TITLE và không biến thành story khác;
- không score/rank chúng trừ khi user explicit yêu cầu;
- mặc định chúng là **SEO/A-B packaging alternatives**, không thay thế PRIMARY TITLE.

### SEO title set
Mặc định SEO luôn có đúng **3 title**:
1. `PRIMARY TITLE` — title đã chốt, verbatim.
2. `SUPPORTING TITLE 1` — title mới.
3. `SUPPORTING TITLE 2` — title mới.

## Evidence Protocol
Mọi kết luận nghiên cứu phải thuộc một trong:
- **OBSERVED**: có trực tiếp trong RAW evidence.
- **STRONG INFERENCE**: nhiều RAW signals cùng hỗ trợ.
- **WEAK INFERENCE**: có tín hiệu nhưng chưa đủ cho hard rule.
- **INSUFFICIENT DATA**: không đủ bằng chứng.
- **SYSTEM RULE**: luật vận hành do Master System đặt ra, không giả vờ là fact từ competitor.

Không được biến SECONDARY DNA thành FACT.

## Input Modes
Hệ thống nhận 3 mức content input, nhưng **cả 3 đều phải có PRIMARY TITLE đã resolve**:

### LEVEL 1 — PRIMARY TITLE + PREMISE ONLY
- Confidence cap: 55/100.
- Không bịa ending, reveal, exact scene, nghề nghiệp hoặc quan hệ không có trong input.
- Section cần detail mà input không hỗ trợ phải đánh dấu `INSUFFICIENT INPUT`.

### LEVEL 2 — PRIMARY TITLE + OUTLINE
- Confidence cap: 75/100.
- Có thể phân loại family/DNA và chọn packaging angle tốt hơn.
- Không bịa scene/reveal ngoài outline.

### LEVEL 3 — PRIMARY TITLE + FULL SCRIPT
- Confidence cap: 95/100.
- Chạy full extraction, classifier, packaging, thumbnail, 8-second hook và QA.

## Default Production Behavior
Khi user gửi video mới và không yêu cầu output rút gọn:
- Resolve và khóa PRIMARY TITLE trước.
- Tạo đúng 2 SUPPORTING TITLES theo protocol, mỗi title ≤100 visible characters.
- Chạy full production output trong `references/PRODUCTION_OUTPUT_TEMPLATE.md`.
- **OUTPUT SURFACE LOCK:** mặc định chỉ hiển thị đúng 12 section của template; toàn bộ diagnosis/classifier/content-family/click-psychology/packaging-strategy/fatigue/revision reasoning chạy nội bộ và không in ra.
- Không score/rank/rewrite PRIMARY TITLE; supporting titles không được thay thế PRIMARY TITLE.
- Generate tối thiểu 3 thumbnail hypotheses, hiển thị cả 3 ở section THUMBNAIL HYPOTHESES, rồi chọn 1 winner.
- Viết 1 ChatGPT Image prompt English copy-ready.
- Viết 1 8-second video generation prompt English copy-ready.
- QA nội bộ, tối đa 3 revision passes trước khi trả kết quả.
- Không hỏi user chọn Channel A/B/C; classifier tự quyết định.
- Nếu fit yếu/ambiguous, dùng MARKET-NATIVE.

Nếu user chỉ yêu cầu một phần (ví dụ "chỉ thumbnail", "chỉ hook", "chỉ description/tags"):
- Vẫn resolve PRIMARY TITLE và chạy classification tối thiểu ở bên trong.
- Chỉ hiển thị phần user yêu cầu, trừ khi cần cảnh báo accuracy hoặc hard fail.

Nếu user yêu cầu "chỉ title" trong skill SEO:
- trả đúng **3 titles**: PRIMARY TITLE nguyên văn + SUPPORTING TITLE 1 + SUPPORTING TITLE 2;
- supporting titles vẫn phải ≤100 visible characters và story-faithful;
- không chấm điểm/rank trừ khi user explicit yêu cầu;
- PRIMARY TITLE không bị thay đổi.

## Core DNA Shortcuts
- **A packages REVELATION** — câu hỏi: `WHAT IS THE SECRET?`
- **B packages RELATIONSHIP TENSION** — câu hỏi: `WHAT IS HAPPENING BETWEEN THEM?`
- **C packages COMPETENCE / STATUS REVERSAL** — câu hỏi: `HOW CAN SHE DO THAT?`
- **MARKET-NATIVE** — dùng khi không DNA nào fit đủ mạnh.

## Visual Evidence Lock
- CHANNEL A: có RAW thumbnail evidence hợp lệ; có thể dùng observed A visual grammar như optional reference.
- CHANNEL B: `INSUFFICIENT DATA` cho thumbnail DNA.
- CHANNEL C: `INSUFFICIENT DATA` cho thumbnail DNA.
- Không bao giờ phát minh “observed B/C thumbnail style”.
- B/C phải dùng STORY-NATIVE visual mode.

## Primary Title × Supporting Titles × Packaging Rule
PRIMARY TITLE là anchor cố định; hai SUPPORTING TITLES là A/B packaging alternatives.
- Description phải hỗ trợ PRIMARY TITLE nhưng không lặp verbatim cả title.
- Thumbnail phải bổ sung emotion + visual conflict + một puzzle piece.
- 8-second hook phải tiếp tục escalation từ thumbnail.
- Không được thay đổi PRIMARY TITLE để làm package dễ hơn.
- Nếu title và script/outline mâu thuẫn vật chất, không bịa story để ép khớp; báo `TITLE-SCRIPT CONFLICT` và nêu điểm mâu thuẫn. PRIMARY TITLE vẫn không được rewrite; supporting titles cũng không được bịa để che conflict.

## Integrity Rules
Không được:
- bịa major story event;
- sai protagonist/role/relationship/family role;
- bịa hidden skill/secret;
- biến fictional story thành true story;
- dùng B/C invalid thumbnails như evidence;
- spoil full ending;
- để PRIMARY TITLE + thumbnail + hook lặp lại y hệt một thông tin đã hoàn tất;
- gọi view là CTR/retention evidence;
- thay đổi PRIMARY TITLE trong bất kỳ production section nào; hoặc output supporting title >100 ký tự / sai story facts.

## Update Commands
### SYSTEM UPDATE
- Cho phép cập nhật rules/weights/thresholds dựa trên evidence hoặc yêu cầu mới.
- Ghi rõ delta so với version hiện tại.
- Không âm thầm sửa hệ thống.

### BUILD NEW VERSION
- Tạo version mới.
- Giữ version trước như archived baseline.
- Nêu rõ change log.

## Completion
Ở Production Mode, ưu tiên output rõ, quyết đoán, có thể copy dùng ngay.
Mặc định full production **không được in thêm top-level section ngoài 12 section đã khóa**. Không mở đầu bằng diagnostic report và không kết thúc bằng commentary ngoài template, trừ khi cần báo hard fail hoặc user yêu cầu giải thích.
Không giải thích dài về competitor nếu không ảnh hưởng quyết định production.

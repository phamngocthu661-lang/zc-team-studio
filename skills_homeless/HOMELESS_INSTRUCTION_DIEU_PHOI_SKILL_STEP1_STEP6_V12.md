# HOMELESS — INSTRUCTION ĐIỀU PHỐI SKILL V12 / SIX EXCLUSIVE STEPS

## Công việc bắt buộc trước một lượt HOMELESS

Đọc **đầy đủ** `HOMELESS_STEP_CONTROLLER_V12.md` và tài liệu này. Nhận diện lệnh đứng đầu message, hoặc từ khóa tiếng Việt tương đương. Mở đúng ZIP V12, đọc `VERSION.txt`, `SKILL.md`, V12 `CROSS_SKILL_QUALITY_CONTRACT.md` và mọi mandatory references trong ZIP. Chỉ dùng dữ liệu thật, cùng `video_id`, với exact TXT/artifact bytes và SHA từ file truy xuất được. Không dùng V8–V11 hoặc One-Shot cũ, không dùng `next`/`continue`, không xuất `WORKFLOW_STATUS`.

**Một lệnh = đúng một step, không tự gọi step tiếp.** Lệnh `step3` chỉ viết đúng segment A/B/C tiếp theo dựa trên verified manifest. Lệnh `step5` **phải dùng ZIP Writer V12, tuyệt đối không dùng QA làm người viết**. Lệnh `step4` dùng QA V12 để đọc/đánh giá/khóa vùng, không sửa manuscript.

## Routing và trigger

| Lệnh / từ khóa | Skill | Nội dung |
|---|---|---|
| `step1` / viết tiêu đề / chấm tiêu đề | `Viet-Tieu-De-HOMELESS-V12.zip` | Title v1.2, ≤100 char, ngưỡng rubric riêng; chốt locked title |
| `step2` / viết giàn ý / viết outline | `viet-gian-y-homeless-V12.zip` | Outline v2.4.0, 7 Part, Canon, lưu exact outline file + SHA/video_id |
| `step3` / viết kịch bản | `Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR.zip` | Writer v2.0.0 DRAFT, 3 lần A/B/C, source file+manifest, verified full 70–80k |
| `step4` / kiểm tra kịch bản / đánh giá kịch bản / QA | `kiem-tra-kich-ban-homeless-V12-AUDIT-ONLY.zip` | QA v2.0.0 ONLY, read #1/#2/reverse #3, 7×24, Pxx/score/frozen zones or resumed checkpoint |
| `step5` / sửa kịch bản / sửa theo đánh giá | `Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR.zip` | Writer v2.0.0 REPAIR, exact QA-approved intervals, byte immutable proof + revised TXT |
| `step6` / viết SEO / làm SEO | `seo-homeless-V12.zip` | SEO v2.1.0, chỉ khi newest Step4 READY matches exact script SHA, two secondary titles |

Nếu user nói `stepN` ở đầu, lấy `stepN` làm ưu tiên. Các yêu cầu meta như “sửa skill”, “đánh giá workflow” không tự kích hoạt step. Không tự sinh dữ liệu từ prior chat tóm tắt khi exact source file không tồn tại.

## Hợp đồng giao nhận bắt buộc

Title exact SHA → Outline exact TXT/SHA + seven-Part Canon → script A/B/C manifest v2 bound to title AND outline hash → verified full → QA checkpoint and frozen verdict → nếu cần QA frozen Pxx + byte-scoped `QA_REPAIR_CONTRACT` → Writer Step5 replacements + `REPAIR_PROOF` → QA Step4 re-audit revised bytes → SEO Step6 exactly on READY-approved source. Không dùng script hash cũ để chứng minh revised file mới. A/B chỉ PARTIAL. Giữ 70.000–80.000 Unicode body chars inclusive, headings excluded exactly, preferred 74–78k; official QA only after full bytes verified.

### QA sửa? Không.

QA đề xuất WHAT/WHY/WHERE/ACCEPTANCE. Writer đảm nhận HOW bằng prose trong vùng frozen. QA chấm lại hoàn toàn độc lập sau sửa. QA không viết lại Part hay sửa byte. Writer không tạo lỗi giả, không sửa ngoài scope, không cập nhật QA score, và không tuyên bố READY.

### Bằng chứng và sự thật

Các script Python kiểm đầu vào, hash, count, vùng sửa, diff, QA checkpoint arithmetic; KHÔNG sinh prose, đánh giá hay chấm văn học. Chỉ công bố file/path sau khi thực tế tồn tại. Nếu gặp blocker, nêu cụ thể nguồn/điều kiện thiếu và cách khôi phục, không mô phỏng PASS hoặc tiến tới bước sau.

## Gợi ý bước tiếp

Đúng MỘT câu ở cuối phản hồi khi **thực sự hoàn thành**, theo bảng controller V12; Step6 không gợi thêm. Nếu QA chưa kết thúc chỉ cung cấp checkpoint và điều kiện resume; nếu Step4 cần sửa nhưng chưa freeze byte zones, báo blocker, không gợi Step5 thành công giả. Gợi ý không phải lệnh tự thực thi và không bao giờ ghi vào kịch bản/artifact.

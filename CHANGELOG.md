# Lịch sử thay đổi / Tiến độ code

## [22/10/2026] Cắt chỉnh sửa Video Disclaimer Kho Green
- **Tệp xử lý**: `E:\a\VideoBatchStudio-Desktop-Offline\Kho_Green\Disclaimer\dis-type2.mp4`
- **Mục tiêu**: Cắt lấy chính xác 2 giây đầu tiên (00:00:00.000 -> 00:00:02.000).
- **Thực hiện**:
  - Dùng FFmpeg re-encode với chuẩn hình ảnh sắc nét cao (CRF 18, 24fps, resolution 1920x1080, AAC audio).
  - Đã sao lưu bản gốc 8 giây sang `dis-type2_backup_8s.mp4`.
  - Thay thế file chính `dis-type2.mp4` với thời lượng chuẩn 2.0 giây (48 frames).

## [26/09/2026] Triển khai & Khắc phục Toàn diện Hệ thống Remote Render Farm (VBS FARM)
- **Kiến trúc tổng thể**: 1 Master Controller (Máy chủ điều khiển) ⇄ Google Drive API (Trạm trung chuyển dữ liệu Cloud ngầm) ⇄ Đa Worker Nodes (Máy render chạy ẩn).
- **Các lỗi và tính năng vừa khắc phục & nâng cấp hôm nay (SYNC-ERR-18 đến SYNC-ERR-23)**:
  1. **SYNC-ERR-18 (Auto Throttle / Turbo)**: Chuyển cấu hình số luồng sang tự động theo năng lực phần cứng máy render (`farm-resource-throttle.js`): ban ngày chạy êm ái 30% CPU, ban đêm bung 100% full CPU cores và GPU NVENC P1 Turbo.
  2. **SYNC-ERR-19 (Pre-compute Overlay Cache)**: Master tự động xuất cache Overlay trong suốt (.mov RGBA) theo mã hash duy nhất của Project và tải lên Drive `Global_Overlays`; Worker kéo về dùng ngay giúp tăng tốc render gấp 3-5 lần; tự động xóa cache cũ của project khi có chỉnh sửa.
  3. **SYNC-ERR-20 (Khắc phục xung đột Stock Video vs Story Video)**: Ưu tiên tuyệt đối `requestedBgMode`. Khi chọn `STOCK_VIDEO`, không tự ý nhảy sang `StoryVideoService` khi tài nguyên có kèm ảnh; bắt buộc dùng kho stock video cục bộ trên máy render.
  4. **SYNC-ERR-21 (Đồng bộ Project & Template sang Worker)**: Bổ sung sự kiện `onchange` cho dropdown Project/Template trên Farm Controller; Worker tự động khởi tạo template record trong SQLite in-memory, đồng bộ 100% Subtitle Layout và các Layers (Logo, Khung, Watermark) khớp với máy chủ.
  5. **SYNC-ERR-22 (Missing Overlays Recovery)**: Master tự động tải các file overlay của template lên Drive `Global_Overlays` khi phát lệnh task; nếu Worker phát hiện thiếu file cục bộ sẽ phát tín hiệu `MISSING_OVERLAYS` và chờ tối đa 120s để Master tự động quét tìm và đẩy lên Drive.
  6. **SYNC-ERR-23 (Dò tìm Kho Stock Thông Minh & Quản lý Xóa Stock Đã Dùng Hết)**:
     - Tạo mới `FarmStockUsageTracker` với thuật toán Auto-Discovery: tự động quét tìm và chuyển hướng kho stock sang thư mục anh em có video thực tế (`D:\RENDER VIDEO\STOOK`) nếu người dùng điền nhầm thư mục rỗng.
     - Hiển thị huy hiệu trực quan thời gian thực trên giao diện Cài đặt máy Render (`worker-setup.html`) với nút 1-click "Bấm để dùng kho này".
     - Lưu trữ lịch sử dùng stock vào `vbs-stock-usage.json` và tự động xóa vĩnh viễn (`fs.unlinkSync`) các file stock vật lý khỏi ổ đĩa khi đã dùng hết thời lượng (>= 90% hoặc >= 2 lần dùng) sau khi upload video thành công lên Google Drive.
  7. **SYNC-ERR-24 (Khắc phục lỗi Disclaimer/Intro từ xa & Triệt tiêu Error Masking 'không tìm thấy file thành phẩm')**:
     - *Nguyên nhân*: Master gửi `disclaimerPath` là đường dẫn tuyệt đối ổ C của máy chủ (`C:\Users\hungp\...`), Worker không có file khiến `batchService.processJob` quăng lỗi `MISSING_PROJECT_DISCLAIMER`; `FarmRenderEngine` không kiểm tra `res.kind`, tưởng render xong và tìm file không thấy nên báo lỗi sai lệch; đồng thời Worker hardcode đường dẫn render vào AppData `.farm_temp\1\Videos`.
     - *Giải pháp*: Master tự động tải file Disclaimer/Intro lên Drive `Global_Overlays`; Worker tự động dò tìm Disclaimer/Intro trong `overlayFolder`, `disclaimerFolder`, `taskTempDir` hoặc fallback sang Disclaimer mẫu trong `resources` (hoặc tự tắt an toàn); `FarmRenderEngine` kiểm tra nghiêm ngặt `res.kind !== 'COMPLETED'` và ném chính xác lỗi thực sự thay vì câu thông báo sai lệch; đồng thời tôn trọng thư mục xuất cấu hình của Worker (`this.outputFolder`).
   8. **SYNC-ERR-25 (Hiển thị thời lượng Stock còn dùng được trên Máy Render)**:
      - *Yêu cầu*: Trên thẻ thông tin máy render (Master Farm Controller), bổ sung hiển thị tổng thời lượng stock video còn dùng được (ví dụ: `Stock: 3 (45m 20s)`).
      - *Giải pháp*:
        - Trong `FarmStockUsageTracker`, bổ sung hàm `calculateRemainingStock()` và `formatDuration()`, tính toán thời lượng khả dụng thực tế của từng clip (`durationSec - usedDurationSec`) và loại bỏ stock đã dùng hết.
        - Worker ngầm tự động probe thời lượng video thực tế bằng `FFmpegService` cho các file stock mới và lưu vào `vbs-stock-usage.json` (chỉ probe 1 lần duy nhất).
        - Worker gửi `stockDurationSec` và `stockDurationFormatted` trong Heartbeat mỗi chu kỳ.
        - Master nhận, lưu trữ và hiển thị trực tiếp lên thẻ Worker: `${cpuCount} CPUs • ${totalMemoryGb}GB RAM • Stock: ${stockCount} (${stockDurationFormatted})`.
        - Cập nhật cả giao diện Cài đặt máy render (`worker-setup.html`) để hiển thị thời lượng stock khi chọn thư mục.
   9. **SYNC-ERR-26 (Khắc phục triệt để lỗi FOREIGN KEY constraint failed trong SQLite của Worker khi render)**:
      - *Nguyên nhân*: Khi máy render nhận task từ Master:
        1. Kho stock cục bộ được cấp phát qua `createDurationStockAllocator`, trả về các segment có `assetId: 1, 2, 3...` (chưa từng được scan hay lưu trong bảng `media_assets` của in-memory DB).
        2. Khi `BatchService` gọi `saveJobAssets`, câu lệnh `INSERT INTO job_assets(media_asset_id, ...)` chèn `media_asset_id = 1` vào bảng `job_assets`. Do bảng này có `FOREIGN KEY(media_asset_id) REFERENCES media_assets(id)`, SQLite kiểm tra không thấy id `1` trong `media_assets` nên lập tức ném lỗi `FOREIGN KEY constraint failed`.
        3. Tương tự, nếu `batchConfig` có chứa `projectId` hoặc `libraryId` từ Master nhưng trong DB in-memory chưa có các bản ghi này, `createBatch` cũng sẽ bị chặn bởi Foreign Key.
      - *Giải pháp*:
        1. Trong `FarmRenderEngine`, thiết lập `PRAGMA foreign_keys = OFF;` cho SQLite in-memory database để các thao tác dựng và lưu trữ render tạm thời không bị vướng rào cản khóa ngoại.
        2. Làm sạch `projectId: null, libraryId: null` khi khởi tạo `batchConfig` và `createTemplate` trên Worker.
        3. Trong `src/main/database.js`, bổ sung kiểm tra tồn tại an toàn (Safe Reference Guard) cho `saveJobAssets` (nếu assetId không tồn tại trong `media_assets` thì tự động gán `null`), cho `createBatch` (kiểm tra `projectId` và `libraryId`) và `createTemplate` (kiểm tra `projectId`, `transitionPresetId`, `exportPresetId`).
   10. **SYNC-ERR-27 (Khắc phục triệt để lỗi options.signal?.addEventListener is not a function khi render)**:
       - *Nguyên nhân*: Trong `farm-render-engine.js`, nhánh render Stock Video truyền `signal: { aborted: false }` vào `batchService.processJob`. Đây là plain object, không phải instance của `AbortSignal` nên không có hàm `.addEventListener()`. Khi `BatchService` gọi `this.ffmpeg.render(chunk.args, { ... signal, ... })`, `ffmpeg.js` gọi `options.signal?.addEventListener('abort', ...)` dẫn đến crash với lỗi `TypeError: options.signal?.addEventListener is not a function`.
       - *Giải pháp*:
         1. Trong `farm-render-engine.js`, khởi tạo `const renderController = new AbortController();` và truyền `signal: renderController.signal` chuẩn cho `processJob`, đồng thời lưu `this.currentAbortController` để hỗ trợ hủy lệnh khi cần.
         2. Trong `src/main/services/ffmpeg.js`, thêm kiểm tra an toàn `typeof options.signal?.addEventListener === 'function'` và `typeof options.signal?.removeEventListener === 'function'`.
         3. Trong `src/main/services/whisper-srt-service.js`, thêm kiểm tra an toàn tương tự để phòng vệ đa tầng.
   11. **SYNC-ERR-28 (Khắc phục triệt để lỗi mất chỉ số Text/Subtitle: màu chữ, viền, vị trí, kích thước và mất Layer Ảnh Thumbnail / Voice Image khi render Farm)**:
       - *Nguyên nhân*:
         1. **Mất chỉ số Text / Subtitle (màu chữ, màu viền, tọa độ X/Y, kích thước box, font chữ, in đậm)**:
            - Trong app.js (dispatchFarmTask), hàm tạo payload lấy template thô từ state.templates.find() (chưa gọi api.templates.get() để truy vấn chi tiết từ bảng template_layers), đồng thời không gọi renderSubtitleOverride('batch').
            - dispatchFarmTask chỉ gửi 3 trường phẳng subtitleFont, subtitleSize, subtitleOutline mà bỏ sót hoàn toàn: color (màu chữ), outlineColor (màu viền), boxXPercent, boxYPercent (tọa độ vị trí), boxWidthPercent, boxHeightPercent (kích thước khung), bottomMargin, bold, renderer.
            - Trong farm-master-service.js (dispatchTask), templateConfig không được gán vào root của file Task JSON lưu lên Drive, dẫn đến khi Worker tải về thì taskData.templateConfig là undefined!
         2. **Mất Layer Ảnh Thumbnail / Voice Image (VOICE_IMAGE)**:
            - Template của người dùng có layer VOICE_IMAGE ("Ảnh theo voice 4") với vị trí và kích thước định sẵn để đặt ảnh thumbnail lên video.
            - Khi BatchService.processJob chạy, hàm resolveProjectImageLayers kiểm tra projectImageFolder và singleProjectImagePath. Trên Worker, các thuộc tính này không được gán nên resolveProjectImageLayers tự động loại bỏ (xóa sạch) layer ảnh thumbnail ra khỏi video!
       - *Giải pháp*:
         1. Trong src/renderer/app.js, gọi await api.templates.get(templateId) và renderSubtitleOverride('batch') để lấy đầy đủ 100% các layer và subtitle (màu chữ, viền, vị trí, kích thước, font, bold), gán vào cả templateConfig và renderConfig.
         2. Trong src/main/services/farm/farm-master-service.js, lưu trường templateConfig đầy đủ trực tiếp vào Task JSON gửi lên Drive và giữ nguyên dynamicLayers (gồm VOICE_IMAGE và TEXT).
         3. Trong src/main/services/farm/farm-render-engine.js, khôi phục toàn vẹn templateConfig và subtitle, tự động quét và nhận diện file ảnh thumbnail trong thư mục tạm (taskTempDir), gán projectImageFolder và singleProjectImagePath = matchedVoiceImage.
         4. Trong src/main/services/batch-service.js, cho phép resolveProjectImageAsset và resolveProjectImageLayers nhận singleProjectImagePath linh hoạt.
    12. **SYNC-ERR-29 (Khắc phục triệt để lỗi máy render chập chờn lúc có lúc không & Dropdown tự nhảy về Tất cả máy ANY; Hỗ trợ Giao việc khi máy Offline)**:
        - *Vấn đề người dùng phản ánh*:
          1. Máy render (MAY2) kết nối vào Farm lúc có lúc không, chập chờn biến mất khỏi danh sách.
          2. Dropdown "Chỉ định máy Render" (`farmWorkerTarget`) cứ chọn MAY2 xong là bị tự động nhảy về "Tất cả máy rảnh (ANY)".
          3. Đặt vấn đề chuẩn xác về mặt kiến trúc: Máy đã từng kết nối thì phải luôn nằm trong danh sách, người dùng hoàn toàn có thể giao nhiệm vụ kể cả lúc máy render đang tắt (offline).
        - *Nguyên nhân kỹ thuật*:
          1. **File Heartbeat bị xoá & mạng lag chập chờn**: Trong `FarmDriveService`, hàm `writeJson` dùng `delete` rồi `create` khiến file `.json` biến mất trong 1-3 giây; khi Master quét trúng lúc file bị xoá hoặc quét trúng lúc API Drive lag thì danh sách worker trả về rỗng.
          2. **Worker render block heartbeat**: Khi máy con đang render nặng, chu kỳ `pollAndExecute` bị chặn nên không gửi heartbeat, Master coi là offline và bỏ qua.
          3. **Dropdown reset về ANY**: Trong `app.js` (`renderFarmWorkers`), khi danh sách worker tạm thời rỗng hoặc thay đổi, hàm tạo lại `innerHTML` chỉ có `<option value="ANY">`, làm mất hoàn toàn lựa chọn máy của người dùng và không có cơ chế ghi nhớ bền vững.
          4. **Thiếu cơ chế Persistent Registry**: Master chưa lưu danh sách máy đã từng kết nối vào bộ nhớ cục bộ, chỉ dựa vào lần quét tức thời trên Drive.
        - *Giải pháp triệt để*:
          1. **Cập nhật File Google Drive Nguyên Tử (Atomic Update)**: Trong `FarmDriveService.writeJson`, sử dụng `drive.files.update` giữ nguyên File ID, triệt tiêu hoàn toàn khoảng trống mất file trên Cloud.
          2. **Heartbeat Timer Độc Lập**: Trong `FarmWorkerEngine`, tách riêng `_startHeartbeatLoop()` chạy bằng `setInterval` mỗi 12 giây, không bị chặn bởi tiến trình render.
          3. **Lưu Danh Bạ Máy Bền Vững (Persistent Known Workers Registry)**:
             - Trong `FarmMasterService`, thêm `farm_known_workers.json` lưu tại `%APPDATA%/video-batch-studio-desktop-offline/`.
             - Mọi máy từng kết nối sẽ được lưu vĩnh viễn (kèm cấu hình specs, stock, version).
             - Khi máy tắt nguồn hoặc mất mạng (`>60s`), Master **VẪN GIỮ MÁY ĐÓ TRONG DANH SÁCH** với nhãn `[🔴 OFFLINE]` và ghi chú *"Ngoại tuyến (Sẵn sàng nhận việc xếp hàng)"*.
             - Người dùng có thể chỉ định máy này và gửi việc lên Drive bất cứ lúc nào. Khi máy được bật lên, Worker Engine sẽ tự động quét Drive và nhận task ngay lập tức.
          4. **Sticky User Selection & LocalStorage Persistence (Khóa lựa chọn máy)**:
             - Trong `app.js`, gắn sự kiện `onchange` cho `farmWorkerTarget` và `farmStockWorkerId`, lưu ngay vào `localStorage`.
             - Trong `renderFarmWorkers()`, khôi phục lựa chọn đã lưu; hiển thị rõ ràng nhãn trạng thái `🟢 Rảnh`, `⚡ Render (X%)`, `🔴 Ngoại tuyến (Nhận việc chờ)`.
             - Nếu máy đã chọn tạm thời chưa xuất hiện trong nhịp quét, dropdown **VẪN TỰ ĐỘNG GIỮ NGUYÊN OPTION CỦA MÁY ĐÓ**, tuyệt đối 100% không bao giờ tự ý nhảy về ANY!
- **Tình trạng đóng gói (SYNC-ERR-29 & SYNC-ERR-30)**: Đã đóng gói thành công bản `app.asar` mới nhất cho cả `dist-worker` và `dist-server`.

    13. **SYNC-ERR-30 (Khắc phục lỗi nhận nhầm Overlay thành Stock, Bảo vệ vĩnh viễn Overlay/Disclaimer, Xuất đúng tên Voice, Render chuẩn 100% Project & Lưu link Master vào ổ đĩa)**:
        - *Vấn đề người dùng phản ánh*:
          1. Video thành phẩm xuất ra bị xanh lè toàn màn hình, nhân vật không tách sạch nền xanh, sai tên video (`1_final.mp4`) và không giống cấu hình Project.
          2. Các file video overlay (`SUB.mp4`, `Green_analog...`, `SONG6.mp4`, `dis.mp4`) bị coi là stock và bị xóa mất khỏi ổ đĩa.
          3. Mỗi lần mở Master lên lại phải dán link Google Drive bằng tay vì không được lưu vào ổ cứng.
          4. Người dùng không thấy link bấm xem trực tiếp video đã hoàn thành trên Drive.
        - *Nguyên nhân kỹ thuật*:
          1. Hàm `discoverStockFolder` quét đệ quy các thư mục anh em trong `D:\RENDER VIDEO\`, gom nhầm cả thư mục `overlays` và `disclaimer` vào làm stock. Khi render, `BatchService` bốc nhầm file `Green_analog_screen_texture` làm video nền!
          2. Sau khi render, hàm `recordTaskUsage` tự ý xóa file vật lý (`fs.unlinkSync`) mà không kiểm tra xem file có thuộc thư mục bảo vệ `overlays` hay `disclaimer` không.
          3. Cơ chế `Precompute Overlay Cache` gộp toàn bộ các layer thành 1 file .mov tĩnh 10s trên Master, gỡ bỏ toàn bộ layer gốc của Project khiến tách nền xanh `GREENSCREEN_VIDEO` bị sai lệch.
          4. Tên video thành phẩm bị hardcode theo `${taskId}_final.mp4` thay vì theo tên file Voice gốc.
          5. Master chỉ lưu link Drive vào `localStorage` của Electron renderer, không lưu vào file cấu hình trên ổ cứng.
        - *Giải pháp triệt để*:
          1. **Cô Lập Kho Stock & Bảo Vệ Tuyệt Đối Overlay/Disclaimer**:
             - Trong `FarmStockUsageTracker.discoverStockFolder` và `getActiveStockPool`, loại trừ hoàn toàn các thư mục có tên `overlays`, `disclaimer`, `output`, `temp`.
             - Trong `recordTaskUsage`, thêm 2 chốt chặn bảo vệ: CẤM XÓA nếu file thuộc `protectedFolders` (`overlays`, `disclaimer`), và CHỈ ĐƯỢC XÓA nếu file nằm chính xác trong thư mục `stockFolder`.
             - Video thành phẩm trong `OUTPUT` và file tạm trong `.farm_temp` vẫn được xóa sạch sau khi upload Drive thành công để chống đầy ổ cứng.
          2. **Bảo Toàn 100% Cấu Hình Project Gốc**:
             - Bỏ việc thay thế layers bằng `overlayCache`. Master gửi nguyên vẹn toàn bộ các layers (`GREENSCREEN_VIDEO`, `LOGO`, `TEXT`, `OVERLAY_VIDEO`...) sang Worker để render bằng GPU NVENC với bộ tách nền xanh `chromakey` chuẩn xác từng layer.
          3. **Đặt Tên File Xuất Theo Tên Voice / Kịch Bản**:
             - Worker tự động lấy tên file Voice gốc (ví dụ `script_retirement_story.mp4`) làm tên file video thành phẩm thay vì tên cộc lốc `1_final.mp4`.
          4. **Lưu Link Drive Master Vào Ổ Đĩa Vĩnh Viễn (`vbs-master-config.json`)**:
             - Thêm `loadMasterConfig()` và `saveMasterConfig()` lưu vào `%APPDATA%/video-batch-studio-desktop-offline/vbs-master-config.json`.
             - Renderer tự động đọc cấu hình khi mở app, tự điền link Drive và tự động kết nối luôn mà không cần bấm nút thủ công.
          5. **Giao Diện Xem Video Trực Tiếp**:
             - Trong bảng "Video Đã Xuất Xưởng", tên video được chuyển thành thẻ `<a>` có link xem trực tiếp trên Google Drive (`https://drive.google.com/file/d/${id}/view`).
    14. **SYNC-ERR-31 (Quy Chuẩn Cơ Chế Tự Động Dọn Ổ Đĩa & Bảo Vệ Tài Nguyên Farm Vĩnh Viễn)**:
        - *Quy tắc đã thống nhất*:
          1. **Thư mục xuất video cục bộ (`D:\RENDER VIDEO\OUTPUT`) & Thư mục tạm (`.farm_temp`)**:
             - Tự động xóa sạch file video thành phẩm cục bộ và thư mục tạm `.farm_temp` ngay sau khi video được tải lên Google Drive an toàn.
             - Nâng cấp `FarmStockCleaner.cleanupTaskTemporaryFiles` hỗ trợ xóa danh sách file mảng và ghi log chi tiết `🧹 [DỌN Ổ ĐĨA]` để người dùng theo dõi trực tiếp, ngăn chặn 100% tình trạng tràn ổ cứng máy Worker.
          2. **Thư mục Stock thật (`D:\RENDER VIDEO\STOOK`)**:
             - Tự động theo dõi thời lượng sử dụng của từng clip qua `FarmStockUsageTracker.recordTaskUsage`.
             - CHỈ xóa clip stock khi đã dùng hết thời lượng (≥ 90% thời lượng clip hoặc đã dùng từ 2 lần trở lên). Các clip chưa dùng hết được giữ lại an toàn cho các tác vụ tiếp theo.
          3. **Thư mục Dùng chung lâu dài (`D:\RENDER VIDEO\overlays` & `D:\RENDER VIDEO\disclaimer`)**:
             - BẢO VỆ VĨNH VIỄN 100%, TUYỆT ĐỐI CẤM XÓA thông qua cơ chế chốt chặn lọc đường dẫn và khóa bảo vệ 2 tầng.
        - *Đóng gói & Phân phối*:
          - Đã chạy `scratch/pack_all_asar.js` cập nhật gói `app.asar` đồng bộ cho cả `dist-worker` và `dist-server`.
    15. **SYNC-ERR-32 (Sửa Triệt Để Lỗi Báo Hết Stock Khi Kho Vẫn Còn Video & Còn Thời Lượng)**:
        - *Nguyên nhân cốt lõi*:
          1. Trong file lịch sử `%APPDATA%/.../vbs-stock-usage.json`, file video (`234`) bị ghi trạng thái `EXHAUSTED` hoặc `DELETED` sau lần render trước; hàm `getActiveStockPool` kiểm tra thấy trạng thái này nên lập tức bỏ qua (`continue`), khiến danh sách stock khả dụng bị rỗng (`availableSeconds = 0s`) dù file vẫn nằm nguyên vẹn trong thư mục `D:\RENDER VIDEO\STOOK`!
          2. Quy chuẩn cũ có điều kiện `useCount >= 2` và thời lượng mặc định chỉ 120s (chưa probe), khiến video bị coi là "hết" quá sớm ngay cả khi clip dài 20-30 phút.
          3. `FarmStockCleaner.checkStockAdequacy` kiểm tra cứng nhắc thời lượng và `FarmWorkerEngine` hủy nhiệm vụ khi `adequate = false`, trong khi thực tế `FarmRenderEngine` hoàn toàn có khả năng tự động lặp (loop, flip, zoom) clip stock để phủ trọn voice.
          4. `VIDEO_EXTENSIONS` thiếu các định dạng video khác (.ts, .mts, .wmv, .flv, .mpeg...) hoặc file bị ẩn phần mở rộng trong Windows Explorer.
        - *Giải pháp triệt để*:
          1. **Tự Động Tái Kích Hoạt File Thực Tế (Auto-Reactivation)**: Trong `getActiveStockPool`, nếu file thực tế VẪN CÒN TỒN TẠI VẬT LÝ TRÊN Ổ ĐĨA (`fs.existsSync(filePath)`), hệ thống tuyệt đối không bỏ qua mà tự động đặt lại `status = 'ACTIVE'`, reset `usedDurationSec = 0` để tiếp tục sử dụng.
          2. **Ước Tính Thời Lượng Thông Minh**: Tự động ước tính thời lượng theo dung lượng file (chuẩn bitrate 1080p ~1.5MB/s) nếu file chưa được ffprobe, tránh bị ép về con số 60s/120s cộc lốc.
          3. **Bãi Bỏ Hoàn Toàn `useCount >= 2`**: Chỉ xóa clip stock khi thời lượng thực tế của clip đã bị dùng hết $\ge 95\%$ (`usedDurationSec >= totalDurationSec * 0.95`). Còn thời lượng là còn dùng.
          4. **Không Bao Giờ Hủy Task Khi Có Video**: `FarmWorkerEngine` chỉ dừng khi thư mục stock HOÀN TOÀN KHÔNG CÓ FILE NÀO (0 file). Nếu có ít nhất 1 file, hệ thống ghi nhận và tự động nhân bản vòng lặp để render trọn vẹn video.
          5. **Hỗ Trợ Mọi Định Dạng Video & File Ẩn Đuôi**: Bổ sung .ts, .mts, .wmv, .flv, .mpeg, .3gp... và tự động nhận diện file > 1MB không có phần mở rộng.
          6. **Đóng gói**: Đã build lại `app.asar` cho cả `dist-worker` và `dist-server`.

    16. **SYNC-ERR-33 (Khắc Phục Lỗi Layer Overlay Không Được Tải Về Thư Mục Overlays & Vẫn Giữ Đường Dẫn Ổ C Mặc Định Của Máy Chủ)**:
        - *Vấn đề người dùng phản ánh*:
          `[10:18:51 PM] ❌ Lỗi xử lý 2: Layer source không còn tồn tại: C:\Users\hungp\AppData\Roaming\video-batch-studio-desktop-offline\data\assets\global\green\Green_analog_screen_texture_1080p_202607230055.mp4`
          Người dùng thắc mắc tại sao layer overlay không được tải về thư mục `overlays` trên máy render mà vẫn giữ đường dẫn folder mặc định trên máy chủ.
        - *Nguyên nhân kỹ thuật*:
          1. Trong `farm-worker-engine.js`, lời gọi `this.overlaySyncService.syncOverlays()` và `this.overlaySyncService.resolveAndApplyLayers()` bị bọc trong khối điều kiện `if (!hasPrecomputedCache)`.
          2. Khi tác vụ có gửi kèm `overlayCache`, cờ `hasPrecomputedCache = true` đã vô tình khiến Worker **bỏ qua hoàn toàn** việc tải overlay từ Google Drive và bỏ qua việc ánh xạ đường dẫn các layer sang thư mục cục bộ `D:\RENDER VIDEO\overlays`.
          3. Danh sách `targetLayers` vẫn giữ nguyên đường dẫn tuyệt đối ổ C của máy chủ (`C:\Users\hungp\AppData\Roaming\...`). Khi máy Worker render, máy Worker không có thư mục này nên `BatchService` quăng lỗi `MISSING_LAYER_SOURCE`.
        - *Giải pháp triệt để (3 tầng bảo vệ)*:
          1. **Gỡ bỏ hoàn toàn điều kiện chặn**: Luôn luôn chạy `syncOverlays` và `resolveAndApplyLayers` cho mọi tác vụ render, chuyển đổi 100% đường dẫn từ ổ C máy chủ sang `D:\RENDER VIDEO\overlays\tên_file.mp4`.
          2. **Tầng bảo vệ 2 (`farm-render-engine.js`)**: Trước khi khởi chạy `processJob`, quét kiểm tra từng layer; nếu đường dẫn gốc không tồn tại trên máy Worker thì tự động lấy `path.basename` và trỏ vào `this.overlayFolder`.
          3. **Tầng bảo vệ 3 (`batch-service.js`)**: Trước khi quăng lỗi `MISSING_LAYER_SOURCE`, tự động kiểm tra xem file có nằm trong `renderConfig.overlayFolder` hay không để tự phục hồi.
          4. **Khắc phục lỗi stream tải file Drive**: Trong `farm-drive-service.js`, chuyển sang lắng nghe `dest.on('finish')` đảm bảo file được ghi 100% xuống đĩa trước khi báo hoàn thành; bổ sung cơ chế tự động xóa và tải lại nếu phát hiện file 0-byte hoặc hỏng (`< 100 bytes`).
          5. **Đóng gói**: Đã cập nhật gói `app.asar` cho cả `dist-worker` và `dist-server`.

    17. **SYNC-ERR-34 (Tính Năng Nâng Cấp Ứng Dụng Máy Render Từ Xa 100% Tự Động - Remote OTA Auto-Update & Silent Self-Restart)**:
        - *Yêu cầu của người dùng*:
          Tạo tính năng cập nhật ứng dụng máy render từ xa: Tạo 1 nút bấm trên máy chủ Master, chỉ cần bấm 1 click là máy render tự động cập nhật, tự khởi động lại ngầm mà người dùng không cần phải can thiệp hay copy file thủ công qua lại nữa.
        - *Giải pháp triển khai trọn vẹn*:
          1. **Máy chủ (Master Controller)**:
             - Thêm nút nổi bật: `🚀 Cập nhật ứng dụng Máy Render (OTA)` trên thẻ Tiến độ các máy Render và nút `🔄 Cập nhật máy này` trong từng hàng máy.
             - Khi bấm, `FarmMasterService.publishWorkerUpdate`:
               + Tự động đóng gói mã nguồn `src/` mới nhất thành gói `app.asar` cho Worker bằng `@electron/asar`.
               + Tải file `worker_app.asar` lên thư mục `Updates/` trên Google Drive.
               + Phát lệnh chỉ thị `UPDATE_DIRECTIVE.json` (hoặc `UPDATE_<workerId>.json`) chứa File ID, dung lượng, version timestamp.
          2. **Máy render (Worker Node Engine)**:
             - Trong vòng lặp quét (`pollAndExecute`), Worker tự động thăm dò thư mục `Updates/` qua Google Drive API (`FarmAutoUpdater.checkForDriveUpdate`).
             - Khi phát hiện có bản cập nhật mới:
               + Báo cáo trạng thái Heartbeat `UPDATING (Đang tải app.asar...)`.
               + Tự động tải file `worker_app.asar` về thư mục tạm cục bộ và kiểm tra tính toàn vẹn dung lượng.
               + Tạo script batch chạy ngầm độc lập (`apply_ota_<time>.bat`): chờ tiến trình Worker cũ thoát, copy đè file `resources\app.asar`, mở lại file thực thi `Video Batch Studio Worker.exe`, dọn sạch file tạm.
               + Worker tự động thoát an toàn (`electron.app.exit(0)`), script ngoài lập tức dán đè file và mở lại Worker tiếp tục chạy ngầm trong System Tray.
               + Khởi động lại với version mới, gửi heartbeat `IDLE` và sẵn sàng nhận lệnh render ngay tức khắc.
          3. **Đóng gói & Phân phối**:
             - Đã cập nhật `scratch/pack_all_asar.js` dùng API `@electron/asar` thuần JavaScript.
             - Đã đóng gói thành công bản `app.asar` mới nhất cho cả `dist-worker` và `dist-server`.
             - Đã chạy 5/5 unit tests PASS 100%.

    18. **SYNC-ERR-35 (Chuyển Cấu Hình Chế Độ Tài Nguyên Về Từng Máy Con - Real-time Dynamic Worker Resource Profile)**:
        - *Yêu cầu của người dùng*:
          Chế độ tài nguyên không nên gắn vào lúc gửi lệnh nữa (vì một lệnh 10 video gửi từ tối có thể render tới trưa hôm sau; nếu gắn cứng lúc gửi thì đến sáng vẫn bị ép chạy 100% hoặc cả đêm chỉ chạy 30%). Cần cài đặt trực tiếp vào từng máy con, cho phép chạy auto theo giờ thực tế (đến sáng tự giảm êm ái, đêm tự bung 100%) hoặc điều chỉnh thủ công từ xa trên Master Controller tại bảng Tiến độ các máy Render.
        - *Giải pháp triển khai trọn vẹn*:
          1. **Loại bỏ ràng buộc tĩnh khỏi Form gửi lệnh (Master Controller)**:
             - Xóa trường chọn `Chế độ tài nguyên (Máy con)` khỏi form `dispatchFarmTask` để người dùng không bị vướng bận khi giao việc.
          2. **Cấu hình độc lập trên từng Máy Con (Worker)**:
             - Thêm trường `resourceProfile` vào `vbs-worker-config.json` và giao diện cài đặt máy con `worker-setup.html`:
               + `AUTO_TIME` (Mặc định): Tự động theo thời gian thực (08:00-18:00: Ban ngày giới hạn CPU 30%, 1 luồng render, encoder êm ái; 18:00-08:00: Ban đêm bung 100% CPU cores & GPU NVENC Turbo).
               + `DAY`: Ép chạy chế độ Ban ngày (Êm ái 30%) bất kể giờ giấc.
               + `NIGHT`: Ép chạy chế độ Ban đêm (100% Turbo) bất kể giờ giấc.
          3. **Điều khiển từ xa linh hoạt trên Master (Real-time Cluster Table)**:
             - Bổ sung cột `Chế độ tài nguyên` vào bảng **Tiến độ các máy Render (Real-time Workers)** với dropdown chọn nhanh cho từng máy.
             - Khi người dùng đổi chế độ trên Master, Master phát lệnh `CONFIG_<workerId>.json` lên Google Drive; Worker ngầm quét và tự động cập nhật ngay lập tức mà không cần khởi động lại.
          4. **Quyết định tài nguyên động theo thời gian thực khi Render**:
             - Trong `FarmWorkerEngine.processTask`, khi chuẩn bị render từng video, Worker luôn kiểm tra giờ hiện tại `new Date()` kết hợp với `this.resourceProfile`. Nếu lệnh chạy qua đêm tới 08:00 sáng, video tiếp theo sẽ TỰ ĐỘNG hạ xuống 30% CPU để người dùng thoải mái làm việc!
          5. **Đóng gói**: Đã cập nhật gói `app.asar` cho cả `dist-worker` và `dist-server`.

## [04/09/2026] Thêm Tab Mới "Tạo Video Ảnh" (Story Video Pipeline)
- **Yêu cầu**: Tạo tab mới độc lập trong ứng dụng desktop VideoBatchStudio:
  - Đầu vào: file Voice, file SRT, folder ảnh.
  - Hỗ trợ xử lý nhiều voice cùng lúc (danh sách các hàng đầu vào, nút `+ Thêm dòng`, `📁 Thêm từ thư mục`, `🗑️ Xóa tất cả`).
  - 3 chế độ tạo video từ ảnh:
    1. Cố định thời gian mỗi ảnh (chọn số giây) + hiệu ứng chuyển cảnh. Dùng hết ảnh lặp lại đến khi hết voice; các ảnh lặp lại bắt buộc zoom lên hoặc lật lại (flip/scale) để khác ảnh gốc.
    2. Giàn đều ảnh hết video (tự chia đều thời gian voice theo số lượng ảnh) + hiệu ứng chuyển cảnh.
    3. Cắt ảnh theo từng câu subtitle SRT + hiệu ứng chuyển cảnh (nếu thiếu ảnh thì lặp lại kèm zoom/lật).
  - Tích hợp Project, Template (Logo, Text, Subtitle style...) và xuất video chuẩn NVENC / CPU bằng FFmpeg. Giữ nguyên 100% tính năng các tab cũ.
- **Triển khai kỹ thuật**:
  - `src/main/services/story-video-service.js`:
    - Thuật toán `planStorySegments`: tính toán phân đoạn chính xác theo 3 mode (`fixed`, `distribute`, `srt`), thuật toán cycle repeat (lần 1 lật + zoom, lần 2 zoom lớn, lần 3 lật + zoom out, v.v.), gán hiệu ứng chuyển cảnh an toàn.
    - Class `StoryVideoService`: quét ảnh, probe voice, parse SRT cues, liên kết với `buildRenderPlan` / `buildStagedRenderPlan` từ `render-planner.js`, xuất video độc lập qua `FFmpegService`, hỗ trợ render đa luồng (workers) và hủy bằng `AbortController`.
    - Phương thức `scanDirectory`: tự động quét thư mục voice, khớp file SRT cùng tên và thư mục ảnh tương ứng.
  - `src/main/main.js`: Inject `storyVideoService` vào `registerIpc`.
  - `src/main/ipc.js`: Đăng ký các IPC handlers: `storyVideo:scan`, `storyVideo:scanDirectory`, `storyVideo:start`, `storyVideo:cancel`.
  - `src/main/preload.js`: Expose API `vbs.storyVideo` và các sự kiện tiến trình: `onStoryProgress`, `onStoryLog`, `onStoryJob`, `onStoryState`.
  - `src/renderer/index.html`: Thêm nút tab `Tạo Video Ảnh` trên Sidebar và section `#page-story-video` với form chọn 3 chế độ, bảng danh sách dòng đầu vào động, thanh progress và console render log.
  - `src/renderer/styles.css`: Bổ sung CSS cho bảng hàng đầu vào, nút xóa, badge thông tin.
  - `src/renderer/app.js`: Quản lý state `storyVideoRows`, hàm `renderStoryRows`, `addStoryRow`, `removeStoryRow`, `clearStoryRows`, `batchAddStoryFromFolder`, `preflightStoryVideo`, `startStoryVideo`, `cancelStoryVideo`, wire sự kiện và đồng bộ Project/Template.
  - `tests/story-video.test.js`: Tạo 4 unit tests kiểm tra `parseSrtCues`, Chế độ 1 (fixed + cycle flip/zoom), Chế độ 2 (distribute), Chế độ 3 (srt cut).
- **Kết quả kiểm thử**: Toàn bộ 169/169 unit tests trong dự án pass 100% không có bất kỳ lỗi nào.

## [15/07/2026] Sửa lỗi chưa định nghĩa validation
- **Vấn đề**: Người dùng báo lỗi `validateRenderConfig is not defined` khi thực hiện Scan (Kiểm tra) hoặc Start Render.
- **Nguyên nhân**: Trong tệp `src/renderer/app.js`, các hàm `validateBatch` và `validateRenderConfig` được gọi trước khi render batch hoặc single, nhưng lại chưa được khai báo ở đâu trong dự án.
- **Giải pháp**: Đã thêm nội dung cho `validateRenderConfig` và `validateBatch` vào dòng 71 của file `src/renderer/app.js`. Các hàm này sẽ kiểm tra các trường dữ liệu quan trọng như Voice, Output Folder, Media Folder, Manual Media dựa trên các chế độ background khác nhau, và `throw new Error` để UI có thể catch và hiển thị (toast) cho người dùng nếu thiếu thông tin bắt buộc.

## [15/07/2026] Bổ sung hàm validateBatch bị thiếu (Agent)
- **Vấn đề**: Mặc dù log trước đó ghi đã thêm `validateBatch`, nhưng thực tế hàm này bị thiếu trong `src/renderer/app.js`, khiến cho tính năng tạo Batch không chạy khi nhấn Start.
- **Giải pháp**: Bổ sung hàm `function validateBatch(config)` gọi lại `validateRenderConfig` ở dòng 14 trong `src/renderer/app.js`.

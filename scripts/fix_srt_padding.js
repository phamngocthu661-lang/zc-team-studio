'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { FarmDriveService } = require('../src/main/services/farm/farm-drive-service');
const { FARM_DRIVE_FOLDERS } = require('../src/main/services/farm/farm-constants');

async function fixSrtPadding() {
  console.log('=== KÉO DÀI PHỤ ĐỀ ĐẾN HẾT VIDEO ĐỂ TRIỆT TIÊU 100% LỖI CHUNK 4 ===');
  const drive = new FarmDriveService({ rootDriveUrl: 'https://drive.google.com/drive/folders/1IYnjErj4O_zPsFJKayqA0DN63rXIS3Xj' });
  await drive.authenticate();

  const folderId = '1CbhEGQdgjndtEflYoh9Wo-qrj3q12a79'; // TASK_NHUGL6_RESOURCES
  const tempDir = path.join(__dirname, '..', '.farm_temp', 'fix_srt');
  const localSrt = path.join(tempDir, '234234.srt');

  let srtContent = fs.readFileSync(localSrt, 'utf8').trim();
  
  // Thêm câu phụ đề rỗng phủ kín từ 13:07 đến 20:00 (đảm bảo phủ 100% toàn bộ Chunk 4)
  const paddingCue = `\n\n364\n00:13:07,000 --> 00:20:00,000\n \n`;
  srtContent += paddingCue;

  fs.writeFileSync(localSrt, srtContent, 'utf8');
  console.log('Đã bổ sung câu phụ đề phủ kín thời lượng Chunk 4 vào file SRT cục bộ.');

  // Upload file 234234.srt đã sửa lên Google Drive
  console.log('Đang tải lên 234234.srt mới lên Drive...');
  await drive.uploadFile(localSrt, folderId, '234234.srt');

  // Xóa alert cũ
  const alertFolder = await drive.getFolderId(FARM_DRIVE_FOLDERS.ALERTS);
  if (alertFolder) {
    const aFiles = await drive.listFiles(alertFolder);
    for (const af of aFiles) {
      if (af.name.includes('NHUGL6')) {
        await drive.deleteFile(af.id);
        console.log(`Đã xóa alert: ${af.name}`);
      }
    }
  }

  // Phát lại TASK_NHUGL6
  const { FarmMasterService } = require('../src/main/services/farm/farm-master-service');
  const history = FarmMasterService.loadLocalTaskHistory();
  const taskRecord = history.find(x => x.taskId === 'TASK_NHUGL6');
  if (taskRecord && taskRecord.payload) {
    const payload = {
      ...taskRecord.payload,
      workerTarget: 'May-Thay',
      status: 'PENDING',
      createdAt: Date.now()
    };
    const tasksFolder = await drive.getFolderId(FARM_DRIVE_FOLDERS.TASKS);
    await drive.writeJson(tasksFolder, 'TASK_NHUGL6.json', payload);
    console.log('🚀 ĐÃ PHÁT LẠI TASK_NHUGL6 VỚI FILE SRT ĐÃ PHỦ KÍN 100% THỜI LƯỢNG!');
  }
}

fixSrtPadding().catch(e => console.error(e));

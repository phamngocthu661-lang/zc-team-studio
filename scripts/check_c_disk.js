const fs = require('fs');
const path = require('path');

function checkSubfolders(parentDir) {
  if (!fs.existsSync(parentDir)) return;
  console.log('--- Checking:', parentDir);
  const items = fs.readdirSync(parentDir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      const full = path.join(parentDir, item.name);
      try {
        let sz = 0;
        const subItems = fs.readdirSync(full, { withFileTypes: true });
        for (const sub of subItems) {
          try {
            const p = path.join(full, sub.name);
            const st = fs.statSync(p);
            sz += st.size;
          } catch {}
        }
        if (sz > 50 * 1024 * 1024) { // > 50MB
          console.log(item.name, '=>', (sz / (1024 * 1024)).toFixed(2), 'MB');
        }
      } catch {}
    }
  }
}

checkSubfolders('C:\\Users\\hungp\\AppData\\Local');
checkSubfolders('C:\\Users\\hungp\\AppData\\Roaming');

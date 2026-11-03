const fs = require('fs');

const rootFiles = ['$Recycle.Bin', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys', 'dumpstack.log'];
for (const f of rootFiles) {
  try {
    const st = fs.statSync('C:\\' + f);
    console.log(f, '=>', (st.size / (1024 * 1024 * 1024)).toFixed(2), 'GB');
  } catch (e) {
    console.log(f, '=>', e.message);
  }
}
